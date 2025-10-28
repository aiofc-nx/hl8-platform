/**
 * @fileoverview 投影器处理器基类
 * @description 提供事件投影器处理器的基础功能
 */

import { Logger } from "@hl8/logger";
import { DomainEvent } from "@hl8/domain-kernel";
// EntityId 暂时未使用，但保留导入以备将来使用

/**
 * 投影器处理器配置
 * @description 投影器处理器的配置选项
 */
export interface ProjectorHandlerConfig {
  /** 处理器名称 */
  name: string;
  /** 处理器描述 */
  description?: string;
  /** 处理器版本 */
  version?: string;
  /** 是否启用 */
  enabled?: boolean;
  /** 优先级 */
  priority?: number;
  /** 重试配置 */
  retry?: {
    maxAttempts: number;
    backoffMs: number;
    maxBackoffMs: number;
  };
}

/**
 * 投影器处理器统计信息
 * @description 投影器处理器的运行统计
 */
export interface ProjectorHandlerStatistics {
  /** 处理器名称 */
  name: string;
  /** 处理的事件总数 */
  totalEventsProcessed: number;
  /** 成功处理的事件数 */
  successfulEvents: number;
  /** 失败的事件数 */
  failedEvents: number;
  /** 最后处理的事件时间 */
  lastProcessedAt?: Date;
  /** 最后错误时间 */
  lastErrorAt?: Date;
  /** 最后错误信息 */
  lastError?: string;
  /** 平均处理时间（毫秒） */
  averageProcessingTime: number;
}

/**
 * 投影器处理器基类
 * @description 提供事件投影器处理器的基础功能
 */
export abstract class ProjectorHandler<
  TEvent extends DomainEvent = DomainEvent,
  TReadModel = unknown,
> {
  protected readonly logger: Logger;
  protected readonly config: ProjectorHandlerConfig;
  protected statistics: ProjectorHandlerStatistics;

  constructor(logger: Logger, config: ProjectorHandlerConfig) {
    this.logger = logger;
    this.config = {
      enabled: true,
      priority: 0,
      retry: {
        maxAttempts: 3,
        backoffMs: 1000,
        maxBackoffMs: 10000,
      },
      ...config,
    };

    this.statistics = {
      name: this.config.name,
      totalEventsProcessed: 0,
      successfulEvents: 0,
      failedEvents: 0,
      averageProcessingTime: 0,
    };
  }

  /**
   * 获取处理器名称
   * @returns 处理器名称
   */
  public getName(): string {
    return this.config.name;
  }

  /**
   * 获取处理器描述
   * @returns 处理器描述
   */
  public getDescription(): string {
    return this.config.description || "";
  }

  /**
   * 获取处理器版本
   * @returns 处理器版本
   */
  public getVersion(): string {
    return this.config.version || "1.0.0";
  }

  /**
   * 获取处理器优先级
   * @returns 优先级
   */
  public getPriority(): number {
    return this.config.priority || 0;
  }

  /**
   * 获取处理器统计信息
   * @returns 统计信息
   */
  public getStatistics(): ProjectorHandlerStatistics {
    return { ...this.statistics };
  }

  /**
   * 检查处理器是否启用
   * @returns 是否启用
   */
  public isEnabled(): boolean {
    return this.config.enabled === true;
  }

  /**
   * 处理事件
   * @param event 领域事件
   * @param readModel 读模型
   * @description 处理单个事件并更新读模型
   */
  public async handleEvent(
    event: TEvent,
    readModel: TReadModel,
  ): Promise<TReadModel> {
    if (!this.isEnabled()) {
      this.logger.debug(`处理器 ${this.config.name} 已禁用，跳过事件处理`);
      return readModel;
    }

    const startTime = Date.now();
    this.statistics.totalEventsProcessed++;

    try {
      this.logger.debug(`处理事件: ${event.eventType}`, {
        eventId: event.eventId.toString(),
        aggregateId: event.aggregateRootId?.toString(),
        version: event.version,
        handler: this.config.name,
      });

      const updatedReadModel = await this.processEvent(event, readModel);
      this.updateStatistics(true, Date.now() - startTime);

      this.logger.debug(`事件处理成功: ${event.eventType}`, {
        handler: this.config.name,
      });

      return updatedReadModel;
    } catch (error) {
      this.updateStatistics(false, Date.now() - startTime, error);
      this.logger.error(`事件处理失败: ${event.eventType}`, {
        eventId: event.eventId.toString(),
        handler: this.config.name,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * 批量处理事件
   * @param events 事件列表
   * @param readModel 读模型
   * @description 批量处理多个事件并更新读模型
   */
  public async handleEvents(
    events: TEvent[],
    readModel: TReadModel,
  ): Promise<TReadModel> {
    if (!this.isEnabled()) {
      this.logger.debug(`处理器 ${this.config.name} 已禁用，跳过批量事件处理`);
      return readModel;
    }

    if (events.length === 0) {
      return readModel;
    }

    const startTime = Date.now();
    this.logger.debug(`批量处理事件: ${events.length} 个事件`, {
      handler: this.config.name,
    });

    try {
      const updatedReadModel = await this.processEvents(events, readModel);
      this.updateBatchStatistics(events.length, Date.now() - startTime);

      this.logger.debug(`批量事件处理成功: ${events.length} 个事件`, {
        handler: this.config.name,
      });

      return updatedReadModel;
    } catch (error) {
      this.statistics.failedEvents += events.length;
      this.updateStatistics(false, Date.now() - startTime, error);
      this.logger.error(`批量事件处理失败`, {
        eventCount: events.length,
        handler: this.config.name,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * 检查是否支持事件类型
   * @param eventType 事件类型
   * @returns 是否支持
   */
  public abstract supportsEventType(eventType: string): boolean;

  /**
   * 获取支持的事件类型列表
   * @returns 支持的事件类型列表
   */
  public abstract getSupportedEventTypes(): string[];

  /**
   * 处理单个事件
   * @param event 领域事件
   * @param readModel 读模型
   * @returns 更新后的读模型
   * @description 子类必须实现此方法
   */
  protected abstract processEvent(
    event: TEvent,
    readModel: TReadModel,
  ): Promise<TReadModel>;

  /**
   * 批量处理事件
   * @param events 事件列表
   * @param readModel 读模型
   * @returns 更新后的读模型
   * @description 子类可以重写此方法进行批量处理优化
   */
  protected async processEvents(
    events: TEvent[],
    readModel: TReadModel,
  ): Promise<TReadModel> {
    // 默认实现：逐个处理事件
    let currentReadModel = readModel;
    for (const event of events) {
      currentReadModel = await this.processEvent(event, currentReadModel);
    }
    return currentReadModel;
  }

  /**
   * 验证事件
   * @param event 领域事件
   * @description 子类可以重写此方法进行事件验证
   */
  protected async validateEvent(event: TEvent): Promise<void> {
    // 默认实现：基本验证
    if (!event.eventId) {
      throw new Error("事件ID不能为空");
    }
    if (!event.aggregateRootId) {
      throw new Error("聚合根ID不能为空");
    }
    if (!event.eventType) {
      throw new Error("事件类型不能为空");
    }
    if (!event.timestamp) {
      throw new Error("事件时间戳不能为空");
    }
  }

  /**
   * 处理事件前钩子
   * @param event 领域事件
   * @param readModel 读模型
   * @description 子类可以重写此方法进行预处理
   */
  protected async beforeProcessEvent(
    event: TEvent,
    _readModel: TReadModel,
  ): Promise<void> {
    await this.validateEvent(event);
  }

  /**
   * 处理事件后钩子
   * @param event 领域事件
   * @param readModel 读模型
   * @description 子类可以重写此方法进行后处理
   */
  protected async afterProcessEvent(
    _event: TEvent,
    _readModel: TReadModel,
  ): Promise<void> {
    // 默认实现为空
  }

  /**
   * 处理错误
   * @param event 领域事件
   * @param error 错误
   * @param readModel 读模型
   * @returns 是否应该重试
   * @description 子类可以重写此方法进行错误处理
   */
  protected async handleError(
    event: TEvent,
    error: unknown,
    _readModel: TReadModel,
  ): Promise<boolean> {
    this.logger.error(`处理器 ${this.config.name} 处理事件失败`, {
      eventId: event.eventId.toString(),
      eventType: event.eventType,
      error: error instanceof Error ? error.message : String(error),
    });
    return false; // 默认不重试
  }

  // 私有辅助方法

  /**
   * 更新统计信息
   * @param success 是否成功
   * @param processingTime 处理时间
   * @param error 错误信息
   */
  private updateStatistics(
    success: boolean,
    processingTime: number,
    error?: unknown,
  ): void {
    if (success) {
      this.statistics.successfulEvents++;
    } else {
      this.statistics.failedEvents++;
      this.statistics.lastErrorAt = new Date();
      this.statistics.lastError =
        error instanceof Error ? error.message : String(error);
    }

    this.statistics.lastProcessedAt = new Date();
    this.updateAverageProcessingTime(processingTime);
  }

  /**
   * 更新批量处理统计信息
   * @param eventCount 事件数量
   * @param processingTime 处理时间
   */
  private updateBatchStatistics(
    eventCount: number,
    processingTime: number,
  ): void {
    this.statistics.totalEventsProcessed += eventCount;
    this.statistics.successfulEvents += eventCount;
    this.statistics.lastProcessedAt = new Date();
    this.updateAverageProcessingTime(processingTime);
  }

  /**
   * 更新平均处理时间
   * @param processingTime 处理时间
   */
  private updateAverageProcessingTime(processingTime: number): void {
    const totalProcessed =
      this.statistics.successfulEvents + this.statistics.failedEvents;
    if (totalProcessed > 0) {
      this.statistics.averageProcessingTime =
        (this.statistics.averageProcessingTime * (totalProcessed - 1) +
          processingTime) /
        totalProcessed;
    }
  }
}
