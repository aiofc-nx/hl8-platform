/**
 * @fileoverview 事件处理管道
 * @description 提供事件处理管道功能，支持批量处理和错误恢复
 */

import { Logger } from "@hl8/logger";
import { DomainEvent } from "@hl8/domain-kernel";
import { ProjectorRegistry } from "../registry/projector-registry.js";
import { ProjectorStatus } from "../base/projector.base.js";

/**
 * 事件处理管道配置
 * @description 事件处理管道的配置选项
 */
export interface EventProcessingPipelineConfig {
  /** 批处理大小 */
  batchSize?: number;
  /** 最大并发数 */
  maxConcurrency?: number;
  /** 处理超时时间（毫秒） */
  timeout?: number;
  /** 重试配置 */
  retry?: {
    maxAttempts: number;
    backoffMs: number;
    maxBackoffMs: number;
  };
  /** 错误处理配置 */
  errorHandling?: {
    continueOnError: boolean;
    deadLetterQueue: boolean;
  };
}

/**
 * 事件处理结果
 * @description 事件处理的结果信息
 */
export interface EventProcessingResult {
  /** 处理的事件总数 */
  totalEvents: number;
  /** 成功处理的事件数 */
  successfulEvents: number;
  /** 失败的事件数 */
  failedEvents: number;
  /** 处理时间（毫秒） */
  processingTime: number;
  /** 错误信息 */
  errors: Array<{
    eventId: string;
    error: string;
    timestamp: Date;
  }>;
}

/**
 * 事件处理管道
 * @description 提供事件处理管道功能
 */
export class EventProcessingPipeline {
  private readonly logger: Logger;
  private readonly registry: ProjectorRegistry;
  private readonly config: EventProcessingPipelineConfig;
  private isProcessing: boolean = false;

  constructor(
    logger: Logger,
    registry: ProjectorRegistry,
    config: EventProcessingPipelineConfig = {},
  ) {
    this.logger = logger;
    this.registry = registry;
    this.config = {
      batchSize: 100,
      maxConcurrency: 10,
      timeout: 30000,
      retry: {
        maxAttempts: 3,
        backoffMs: 1000,
        maxBackoffMs: 10000,
      },
      errorHandling: {
        continueOnError: true,
        deadLetterQueue: true,
      },
      ...config,
    };
  }

  /**
   * 处理单个事件
   * @param event 领域事件
   * @returns 处理结果
   */
  public async processEvent(
    event: DomainEvent,
  ): Promise<EventProcessingResult> {
    const startTime = Date.now();
    const result: EventProcessingResult = {
      totalEvents: 1,
      successfulEvents: 0,
      failedEvents: 0,
      processingTime: 0,
      errors: [],
    };

    try {
      this.logger.debug(`开始处理事件: ${event.eventType}`, {
        eventId: event.eventId.toString(),
        aggregateId: event.aggregateRootId?.toString(),
        version: event.version,
      });

      // 获取支持该事件类型的投影器
      const projectors = this.registry.getProjectorsForEventType(
        event.eventType,
      );
      const enabledProjectors = projectors.filter(
        (registration) => registration.enabled,
      );

      if (enabledProjectors.length === 0) {
        this.logger.warn(`没有找到支持事件类型 ${event.eventType} 的投影器`);
        result.successfulEvents = 1; // 没有投影器处理也算成功
      } else {
        // 处理每个投影器
        for (const registration of enabledProjectors) {
          try {
            await this.processEventWithProjector(event, registration.projector);
            result.successfulEvents++;
          } catch (error) {
            result.failedEvents++;
            result.errors.push({
              eventId: event.eventId.toString(),
              error: error instanceof Error ? error.message : String(error),
              timestamp: new Date(),
            });

            if (this.config.errorHandling?.continueOnError) {
              this.logger.error(
                `投影器 ${registration.metadata.name} 处理事件失败，继续处理其他投影器`,
                {
                  eventId: event.eventId.toString(),
                  error: error instanceof Error ? error.message : String(error),
                },
              );
            } else {
              throw error;
            }
          }
        }
      }

      result.processingTime = Date.now() - startTime;
      this.logger.debug(`事件处理完成: ${event.eventType}`, {
        eventId: event.eventId.toString(),
        processingTime: result.processingTime,
        successfulProjectors: result.successfulEvents,
        failedProjectors: result.failedEvents,
      });

      return result;
    } catch (error) {
      result.failedEvents = 1;
      result.processingTime = Date.now() - startTime;
      result.errors.push({
        eventId: event.eventId.toString(),
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date(),
      });

      this.logger.error(`事件处理失败: ${event.eventType}`, {
        eventId: event.eventId.toString(),
        error: error instanceof Error ? error.message : String(error),
      });

      return result;
    }
  }

  /**
   * 批量处理事件
   * @param events 事件列表
   * @returns 处理结果
   */
  public async processEvents(
    events: DomainEvent[],
  ): Promise<EventProcessingResult> {
    if (events.length === 0) {
      return {
        totalEvents: 0,
        successfulEvents: 0,
        failedEvents: 0,
        processingTime: 0,
        errors: [],
      };
    }

    const startTime = Date.now();
    const result: EventProcessingResult = {
      totalEvents: events.length,
      successfulEvents: 0,
      failedEvents: 0,
      processingTime: 0,
      errors: [],
    };

    try {
      this.logger.debug(`开始批量处理事件: ${events.length} 个事件`);

      // 按事件类型分组
      const eventsByType = this.groupEventsByType(events);

      // 处理每种事件类型
      for (const [eventType, typeEvents] of eventsByType) {
        const typeResult = await this.processEventsByType(
          eventType,
          typeEvents,
        );
        result.successfulEvents += typeResult.successfulEvents;
        result.failedEvents += typeResult.failedEvents;
        result.errors.push(...typeResult.errors);
      }

      result.processingTime = Date.now() - startTime;
      this.logger.debug(`批量事件处理完成`, {
        totalEvents: result.totalEvents,
        successfulEvents: result.successfulEvents,
        failedEvents: result.failedEvents,
        processingTime: result.processingTime,
      });

      return result;
    } catch (error) {
      result.failedEvents = events.length;
      result.processingTime = Date.now() - startTime;
      result.errors.push({
        eventId: "batch",
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date(),
      });

      this.logger.error(`批量事件处理失败`, {
        eventCount: events.length,
        error: error instanceof Error ? error.message : String(error),
      });

      return result;
    }
  }

  /**
   * 处理特定类型的事件
   * @param eventType 事件类型
   * @param events 事件列表
   * @returns 处理结果
   */
  private async processEventsByType(
    eventType: string,
    events: DomainEvent[],
  ): Promise<EventProcessingResult> {
    const result: EventProcessingResult = {
      totalEvents: events.length,
      successfulEvents: 0,
      failedEvents: 0,
      processingTime: 0,
      errors: [],
    };

    const startTime = Date.now();

    try {
      // 获取支持该事件类型的投影器
      const projectors = this.registry.getProjectorsForEventType(eventType);
      const enabledProjectors = projectors.filter(
        (registration) => registration.enabled,
      );

      if (enabledProjectors.length === 0) {
        this.logger.warn(`没有找到支持事件类型 ${eventType} 的投影器`);
        result.successfulEvents = events.length;
      } else {
        // 处理每个投影器
        for (const registration of enabledProjectors) {
          try {
            await this.processEventsWithProjector(
              events,
              registration.projector,
            );
            result.successfulEvents += events.length;
          } catch (error) {
            result.failedEvents += events.length;
            result.errors.push({
              eventId: `batch-${eventType}`,
              error: error instanceof Error ? error.message : String(error),
              timestamp: new Date(),
            });

            if (this.config.errorHandling?.continueOnError) {
              this.logger.error(
                `投影器 ${registration.metadata.name} 批量处理事件失败，继续处理其他投影器`,
                {
                  eventType,
                  eventCount: events.length,
                  error: error instanceof Error ? error.message : String(error),
                },
              );
            } else {
              throw error;
            }
          }
        }
      }

      result.processingTime = Date.now() - startTime;
      return result;
    } catch (error) {
      result.failedEvents = events.length;
      result.processingTime = Date.now() - startTime;
      result.errors.push({
        eventId: `batch-${eventType}`,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date(),
      });

      return result;
    }
  }

  /**
   * 使用投影器处理单个事件
   * @param event 领域事件
   * @param projector 投影器
   */
  private async processEventWithProjector(
    event: DomainEvent,
    projector: {
      processEvent: (event: DomainEvent) => Promise<void>;
      getName: () => string;
      getStatus: () => string;
    },
  ): Promise<void> {
    if (projector.getStatus() !== ProjectorStatus.RUNNING) {
      throw new Error(`投影器 ${projector.getName()} 未运行`);
    }

    await projector.processEvent(event);
  }

  /**
   * 使用投影器批量处理事件
   * @param events 事件列表
   * @param projector 投影器
   */
  private async processEventsWithProjector(
    events: DomainEvent[],
    projector: {
      processEvents: (events: DomainEvent[]) => Promise<void>;
      getName: () => string;
      getStatus: () => string;
    },
  ): Promise<void> {
    if (projector.getStatus() !== ProjectorStatus.RUNNING) {
      throw new Error(`投影器 ${projector.getName()} 未运行`);
    }

    await projector.processEvents(events);
  }

  /**
   * 按事件类型分组事件
   * @param events 事件列表
   * @returns 按事件类型分组的事件映射
   */
  private groupEventsByType(events: DomainEvent[]): Map<string, DomainEvent[]> {
    const grouped = new Map<string, DomainEvent[]>();

    for (const event of events) {
      const eventType = event.eventType;
      if (!grouped.has(eventType)) {
        grouped.set(eventType, []);
      }
      grouped.get(eventType)!.push(event);
    }

    return grouped;
  }

  /**
   * 检查管道是否正在处理
   * @returns 是否正在处理
   */
  public isProcessingEvents(): boolean {
    return this.isProcessing;
  }

  /**
   * 获取管道配置
   * @returns 管道配置
   */
  public getConfig(): EventProcessingPipelineConfig {
    return { ...this.config };
  }

  /**
   * 更新管道配置
   * @param config 新的配置
   */
  public updateConfig(config: Partial<EventProcessingPipelineConfig>): void {
    Object.assign(this.config, config);
    this.logger.debug("事件处理管道配置已更新", { config });
  }
}
