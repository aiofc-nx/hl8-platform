/**
 * @fileoverview 事件处理器类
 * @description 负责处理领域事件，查找并调用相应的事件处理器
 */

import { DomainEvent } from "./base/domain-event.base.js";
import {
  IDomainEventHandler,
  EventProcessingResult,
  EventHandlerResult,
  EventHandlerContext,
} from "./domain-event-handler.interface.js";
import { EventRegistry } from "./event-registry.js";
import { EventProcessingException } from "./event-processing-exceptions.js";

/**
 * 事件处理配置
 * @description 配置事件处理的行为
 */
export interface EventProcessingConfig {
  /** 是否在出错时继续处理其他处理器 */
  continueOnError: boolean;
  /** 是否按优先级顺序处理 */
  processByPriority: boolean;
  /** 默认超时时间（毫秒） */
  defaultTimeout: number;
  /** 是否启用重试 */
  enableRetry: boolean;
  /** 最大重试次数 */
  maxRetries: number;
  /** 重试延迟（毫秒） */
  retryDelay: number;
}

/**
 * 事件处理器类
 * @description 负责处理领域事件，查找并调用相应的事件处理器
 */
export class EventProcessor {
  private readonly _registry: EventRegistry;
  private readonly _config: EventProcessingConfig;
  private readonly _processingHistory: Map<string, EventProcessingResult[]> =
    new Map();

  /**
   * 创建事件处理器
   * @param registry 事件注册表
   * @param config 处理配置，可选
   */
  constructor(
    registry: EventRegistry,
    config?: Partial<EventProcessingConfig>,
  ) {
    this._registry = registry;
    this._config = {
      continueOnError: config?.continueOnError ?? false,
      processByPriority: config?.processByPriority ?? true,
      defaultTimeout: config?.defaultTimeout ?? 30000,
      enableRetry: config?.enableRetry ?? false,
      maxRetries: config?.maxRetries ?? 3,
      retryDelay: config?.retryDelay ?? 1000,
    };
  }

  /**
   * 获取注册表
   * @returns 事件注册表
   */
  public get registry(): EventRegistry {
    return this._registry;
  }

  /**
   * 获取配置
   * @returns 处理配置
   */
  public get config(): Readonly<EventProcessingConfig> {
    return { ...this._config };
  }

  /**
   * 处理单个领域事件
   * @param event 领域事件
   * @returns Promise<EventProcessingResult[]> 所有处理器的处理结果
   * @throws {EventProcessingException} 当处理过程中发生错误时抛出异常
   */
  public async processEvent(
    event: DomainEvent,
  ): Promise<EventProcessingResult[]> {
    const startTime = new Date();
    const handlers = this._registry.getHandlersForEvent(event.eventType);

    if (handlers.length === 0) {
      // 没有处理器注册，返回空结果
      return [];
    }

    // 如果启用优先级排序，则按优先级排序
    const sortedHandlers = this._config.processByPriority
      ? [...handlers].sort(
          (a, b) => a.getMetadata().priority - b.getMetadata().priority,
        )
      : handlers;

    const results: EventProcessingResult[] = [];

    for (const handler of sortedHandlers) {
      try {
        const result = await this.processWithHandler(event, handler);

        // 如果需要重试，根据配置决定是否重试
        if (
          result.shouldRetry &&
          this._config.enableRetry &&
          this.shouldRetry(result, handler)
        ) {
          const retryResult = await this.retryProcessing(
            event,
            handler,
            result,
          );
          results.push(result); // 保留原始结果
          results.push(retryResult);

          // 如果重试后仍然失败且不允许继续，则停止处理
          if (
            !retryResult.success &&
            !this._config.continueOnError &&
            retryResult.result !== EventHandlerResult.SKIPPED
          ) {
            throw new EventProcessingException(
              `处理事件时发生错误: ${retryResult.error?.message || "处理失败"}`,
              event.eventId.value,
              event.eventType,
              retryResult.error,
            );
          }
        } else {
          results.push(result);

          // 如果处理失败且不允许继续，则停止处理
          if (
            !result.success &&
            !this._config.continueOnError &&
            result.result !== EventHandlerResult.SKIPPED
          ) {
            throw new EventProcessingException(
              `处理事件时发生错误: ${result.error?.message || "处理失败"}`,
              event.eventId.value,
              event.eventType,
              result.error,
            );
          }
        }
      } catch (error) {
        const errorResult = this.createErrorResult(
          event,
          handler,
          error as Error,
          startTime,
        );
        results.push(errorResult);

        if (!this._config.continueOnError) {
          throw new EventProcessingException(
            `处理事件时发生错误: ${(error as Error).message}`,
            event.eventId.value,
            event.eventType,
            error as Error,
          );
        }
      }
    }

    // 记录处理历史
    this.recordProcessingHistory(event.eventId.value, results);

    return results;
  }

  /**
   * 批量处理领域事件
   * @param events 领域事件数组
   * @returns Promise<Map<string, EventProcessingResult[]>> 每个事件的处理结果映射
   * @throws {EventProcessingException} 当处理过程中发生错误时抛出异常
   */
  public async processEvents(
    events: DomainEvent[],
  ): Promise<Map<string, EventProcessingResult[]>> {
    const results = new Map<string, EventProcessingResult[]>();

    for (const event of events) {
      try {
        const eventResults = await this.processEvent(event);
        results.set(event.eventId.value, eventResults);
      } catch (error) {
        // 如果单个事件处理失败，记录错误但继续处理其他事件
        const errorResults: EventProcessingResult[] = [
          {
            success: false,
            result: EventHandlerResult.FAILURE,
            duration: 0,
            context: {
              eventId: event.eventId.value,
              eventType: event.eventType,
              aggregateRootId: event.aggregateRootId.value,
              startTime: new Date(),
              handlerId: "system",
            },
            error: error as Error,
            shouldRetry: false,
          },
        ];
        results.set(event.eventId.value, errorResults);
      }
    }

    return results;
  }

  /**
   * 使用指定处理器处理事件
   * @param event 领域事件
   * @param handler 事件处理器
   * @returns Promise<EventProcessingResult> 处理结果
   */
  private async processWithHandler(
    event: DomainEvent,
    handler: IDomainEventHandler,
  ): Promise<EventProcessingResult> {
    const startTime = new Date();
    const metadata = handler.getMetadata();

    // 验证事件
    if (!handler.validateEvent(event)) {
      return {
        success: true,
        result: EventHandlerResult.SKIPPED,
        duration: 0,
        context: {
          eventId: event.eventId.value,
          eventType: event.eventType,
          aggregateRootId: event.aggregateRootId.value,
          startTime,
          handlerId: metadata.handlerId,
          result: EventHandlerResult.SKIPPED,
        },
        shouldRetry: false,
      };
    }

    // 创建处理上下文
    const context: Partial<EventHandlerContext> = {
      eventId: event.eventId.value,
      eventType: event.eventType,
      aggregateRootId: event.aggregateRootId.value,
      startTime,
      handlerId: metadata.handlerId,
    };

    // 执行处理（带超时控制）
    const processingPromise = handler.handle(event, context);
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(
        () => reject(new Error("处理超时")),
        this._config.defaultTimeout,
      );
    });

    try {
      const result = await Promise.race([processingPromise, timeoutPromise]);

      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      result.context.endTime = endTime;
      result.context.duration = duration;
      result.duration = duration;

      return result;
    } catch (error) {
      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      return {
        success: false,
        result: EventHandlerResult.FAILURE,
        duration,
        context: {
          ...context,
          endTime,
          duration,
          result: EventHandlerResult.FAILURE,
          error: error as Error,
        } as EventHandlerContext,
        error: error as Error,
        shouldRetry: this._config.enableRetry,
        retryDelay: this._config.retryDelay,
      };
    }
  }

  /**
   * 重试处理
   * @param event 领域事件
   * @param handler 事件处理器
   * @param previousResult 上次处理结果
   * @returns Promise<EventProcessingResult> 重试结果
   */
  private async retryProcessing(
    event: DomainEvent,
    handler: IDomainEventHandler,
    previousResult: EventProcessingResult,
  ): Promise<EventProcessingResult> {
    const retryCount = (previousResult.context.data?.retryCount as number) || 0;

    if (retryCount >= this._config.maxRetries) {
      return {
        ...previousResult,
        success: false,
        result: EventHandlerResult.FAILURE,
        shouldRetry: false,
      };
    }

    // 等待重试延迟
    await new Promise((resolve) =>
      setTimeout(resolve, previousResult.retryDelay || this._config.retryDelay),
    );

    // 更新重试计数
    const updatedContext: Partial<EventHandlerContext> = {
      ...previousResult.context,
      data: {
        ...previousResult.context.data,
        retryCount: retryCount + 1,
      },
    };

    const retryResult = await this.processWithHandler(event, handler);
    retryResult.context.data = updatedContext.data;

    return retryResult;
  }

  /**
   * 判断是否应该重试
   * @param result 处理结果
   * @param _handler 事件处理器
   * @returns 是否应该重试
   */
  private shouldRetry(
    result: EventProcessingResult,
    _handler: IDomainEventHandler,
  ): boolean {
    if (!result.shouldRetry) {
      return false;
    }

    const retryCount = (result.context.data?.retryCount as number) || 0;
    return retryCount < this._config.maxRetries;
  }

  /**
   * 创建错误结果
   * @param event 领域事件
   * @param handler 事件处理器
   * @param error 错误对象
   * @param startTime 开始时间
   * @returns 错误处理结果
   */
  private createErrorResult(
    event: DomainEvent,
    handler: IDomainEventHandler,
    error: Error,
    startTime: Date,
  ): EventProcessingResult {
    const endTime = new Date();
    const duration = endTime.getTime() - startTime.getTime();
    const metadata = handler.getMetadata();

    return {
      success: false,
      result: EventHandlerResult.FAILURE,
      duration,
      context: {
        eventId: event.eventId.value,
        eventType: event.eventType,
        aggregateRootId: event.aggregateRootId.value,
        startTime,
        endTime,
        duration,
        handlerId: metadata.handlerId,
        result: EventHandlerResult.FAILURE,
        error,
      },
      error,
      shouldRetry: this._config.enableRetry,
      retryDelay: this._config.retryDelay,
    };
  }

  /**
   * 记录处理历史
   * @param eventId 事件标识符
   * @param results 处理结果列表
   */
  private recordProcessingHistory(
    eventId: string,
    results: EventProcessingResult[],
  ): void {
    this._processingHistory.set(eventId, results);
  }

  /**
   * 获取事件的处理历史
   * @param eventId 事件标识符
   * @returns 处理结果列表，如果不存在则返回空数组
   */
  public getProcessingHistory(eventId: string): EventProcessingResult[] {
    return this._processingHistory.get(eventId) || [];
  }

  /**
   * 清除处理历史
   * @param eventId 事件标识符，可选，如果不提供则清除所有历史
   */
  public clearProcessingHistory(eventId?: string): void {
    if (eventId) {
      this._processingHistory.delete(eventId);
    } else {
      this._processingHistory.clear();
    }
  }

  /**
   * 获取所有处理历史
   * @returns 所有事件的处理历史映射
   */
  public getAllProcessingHistory(): Map<string, EventProcessingResult[]> {
    return new Map(this._processingHistory);
  }
}
