/**
 * @fileoverview 投影器基类
 * @description 提供事件投影器的基础功能和生命周期管理
 */

import { Logger } from "@hl8/logger";
import { DomainEvent } from "@hl8/domain-kernel";
import { EntityId } from "@hl8/domain-kernel";

/**
 * 投影器状态
 * @description 投影器的运行状态
 */
export enum ProjectorStatus {
  /** 未初始化 */
  UNINITIALIZED = "uninitialized",
  /** 已初始化 */
  INITIALIZED = "initialized",
  /** 运行中 */
  RUNNING = "running",
  /** 已停止 */
  STOPPED = "stopped",
  /** 错误状态 */
  ERROR = "error",
}

/**
 * 投影器配置
 * @description 投影器的配置选项
 */
export interface ProjectorConfig {
  /** 投影器名称 */
  name: string;
  /** 投影器描述 */
  description?: string;
  /** 投影器版本 */
  version?: string;
  /** 是否启用 */
  enabled?: boolean;
  /** 批处理大小 */
  batchSize?: number;
  /** 重试配置 */
  retry?: {
    maxAttempts: number;
    backoffMs: number;
    maxBackoffMs: number;
  };
  /** 性能配置 */
  performance?: {
    maxConcurrency: number;
    timeout: number;
  };
}

/**
 * 投影器统计信息
 * @description 投影器的运行统计
 */
export interface ProjectorStatistics {
  /** 投影器名称 */
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
  /** 状态 */
  status: ProjectorStatus;
}

/**
 * 投影器基类
 * @description 提供事件投影器的基础功能
 */
export abstract class Projector<TReadModel = unknown> {
  protected readonly logger: Logger;
  protected readonly config: ProjectorConfig;
  protected status: ProjectorStatus = ProjectorStatus.UNINITIALIZED;
  protected statistics: ProjectorStatistics;
  protected lastProcessedEventId?: EntityId;
  protected lastProcessedEventVersion?: number;

  constructor(logger: Logger, config: ProjectorConfig) {
    this.logger = logger;
    this.config = {
      enabled: true,
      batchSize: 100,
      retry: {
        maxAttempts: 3,
        backoffMs: 1000,
        maxBackoffMs: 10000,
      },
      performance: {
        maxConcurrency: 10,
        timeout: 30000,
      },
      ...config,
    };

    this.statistics = {
      name: this.config.name,
      totalEventsProcessed: 0,
      successfulEvents: 0,
      failedEvents: 0,
      averageProcessingTime: 0,
      status: this.status,
    };
  }

  /**
   * 获取投影器名称
   * @returns 投影器名称
   */
  public getName(): string {
    return this.config.name;
  }

  /**
   * 获取投影器描述
   * @returns 投影器描述
   */
  public getDescription(): string {
    return this.config.description || "";
  }

  /**
   * 获取投影器版本
   * @returns 投影器版本
   */
  public getVersion(): string {
    return this.config.version || "1.0.0";
  }

  /**
   * 获取投影器状态
   * @returns 当前状态
   */
  public getStatus(): ProjectorStatus {
    return this.status;
  }

  /**
   * 获取投影器统计信息
   * @returns 统计信息
   */
  public getStatistics(): ProjectorStatistics {
    return { ...this.statistics };
  }

  /**
   * 检查投影器是否启用
   * @returns 是否启用
   */
  public isEnabled(): boolean {
    return this.config.enabled === true;
  }

  /**
   * 初始化投影器
   * @description 子类可以重写此方法进行初始化
   */
  public async initialize(): Promise<void> {
    if (this.status !== ProjectorStatus.UNINITIALIZED) {
      throw new Error(`投影器 ${this.config.name} 已经初始化`);
    }

    try {
      this.logger.debug(`初始化投影器: ${this.config.name}`);
      await this.onInitialize();
      this.status = ProjectorStatus.INITIALIZED;
      this.statistics.status = this.status;
      this.logger.debug(`投影器 ${this.config.name} 初始化成功`);
    } catch (error) {
      this.status = ProjectorStatus.ERROR;
      this.statistics.status = this.status;
      this.logger.error(`投影器 ${this.config.name} 初始化失败`, {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * 启动投影器
   * @description 开始处理事件
   */
  public async start(): Promise<void> {
    if (this.status !== ProjectorStatus.INITIALIZED) {
      throw new Error(`投影器 ${this.config.name} 未初始化`);
    }

    if (!this.isEnabled()) {
      this.logger.warn(`投影器 ${this.config.name} 已禁用，跳过启动`);
      return;
    }

    try {
      this.logger.debug(`启动投影器: ${this.config.name}`);
      await this.onStart();
      this.status = ProjectorStatus.RUNNING;
      this.statistics.status = this.status;
      this.logger.debug(`投影器 ${this.config.name} 启动成功`);
    } catch (error) {
      this.status = ProjectorStatus.ERROR;
      this.statistics.status = this.status;
      this.logger.error(`投影器 ${this.config.name} 启动失败`, {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * 停止投影器
   * @description 停止处理事件
   */
  public async stop(): Promise<void> {
    if (this.status !== ProjectorStatus.RUNNING) {
      this.logger.warn(`投影器 ${this.config.name} 未运行，跳过停止`);
      return;
    }

    try {
      this.logger.debug(`停止投影器: ${this.config.name}`);
      await this.onStop();
      this.status = ProjectorStatus.STOPPED;
      this.statistics.status = this.status;
      this.logger.debug(`投影器 ${this.config.name} 停止成功`);
    } catch (error) {
      this.status = ProjectorStatus.ERROR;
      this.statistics.status = this.status;
      this.logger.error(`投影器 ${this.config.name} 停止失败`, {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * 处理事件
   * @param event 领域事件
   * @description 处理单个事件
   */
  public async processEvent(event: DomainEvent): Promise<void> {
    if (this.status !== ProjectorStatus.RUNNING) {
      throw new Error(`投影器 ${this.config.name} 未运行`);
    }

    if (!this.isEnabled()) {
      this.logger.debug(`投影器 ${this.config.name} 已禁用，跳过事件处理`);
      return;
    }

    const startTime = Date.now();
    this.statistics.totalEventsProcessed++;

    try {
      this.logger.debug(`处理事件: ${event.eventType}`, {
        eventId: event.eventId.toString(),
        aggregateId: event.aggregateRootId?.toString(),
        version: event.version,
      });

      await this.onProcessEvent(event);
      this.updateLastProcessedEvent(event);
      this.updateStatistics(true, Date.now() - startTime);
      this.logger.debug(`事件处理成功: ${event.eventType}`);
    } catch (error) {
      this.updateStatistics(false, Date.now() - startTime, error);
      this.logger.error(`事件处理失败: ${event.eventType}`, {
        eventId: event.eventId.toString(),
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * 批量处理事件
   * @param events 事件列表
   * @description 批量处理多个事件
   */
  public async processEvents(events: DomainEvent[]): Promise<void> {
    if (this.status !== ProjectorStatus.RUNNING) {
      throw new Error(`投影器 ${this.config.name} 未运行`);
    }

    if (!this.isEnabled()) {
      this.logger.debug(`投影器 ${this.config.name} 已禁用，跳过批量事件处理`);
      return;
    }

    if (events.length === 0) {
      return;
    }

    const startTime = Date.now();
    this.logger.debug(`批量处理事件: ${events.length} 个事件`);

    try {
      await this.onProcessEvents(events);

      // 更新最后处理的事件
      const lastEvent = events[events.length - 1];
      this.updateLastProcessedEvent(lastEvent);

      // 更新统计信息
      this.statistics.totalEventsProcessed += events.length;
      this.statistics.successfulEvents += events.length;
      this.updateAverageProcessingTime(Date.now() - startTime);

      this.logger.debug(`批量事件处理成功: ${events.length} 个事件`);
    } catch (error) {
      this.statistics.failedEvents += events.length;
      this.updateStatistics(false, Date.now() - startTime, error);
      this.logger.error(`批量事件处理失败`, {
        eventCount: events.length,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * 重置投影器
   * @description 重置投影器状态和统计信息
   */
  public async reset(): Promise<void> {
    try {
      this.logger.debug(`重置投影器: ${this.config.name}`);
      await this.onReset();

      this.status = ProjectorStatus.UNINITIALIZED;
      this.statistics = {
        name: this.config.name,
        totalEventsProcessed: 0,
        successfulEvents: 0,
        failedEvents: 0,
        averageProcessingTime: 0,
        status: this.status,
      };
      this.lastProcessedEventId = undefined;
      this.lastProcessedEventVersion = undefined;

      this.logger.debug(`投影器 ${this.config.name} 重置成功`);
    } catch (error) {
      this.logger.error(`投影器 ${this.config.name} 重置失败`, {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * 获取最后处理的事件ID
   * @returns 最后处理的事件ID
   */
  public getLastProcessedEventId(): EntityId | undefined {
    return this.lastProcessedEventId;
  }

  /**
   * 获取最后处理的事件版本
   * @returns 最后处理的事件版本
   */
  public getLastProcessedEventVersion(): number | undefined {
    return this.lastProcessedEventVersion;
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
   * 获取读模型
   * @returns 读模型数据
   */
  public abstract getReadModel(): Promise<TReadModel>;

  /**
   * 更新读模型
   * @param readModel 读模型数据
   * @description 更新读模型数据
   */
  public abstract updateReadModel(readModel: TReadModel): Promise<void>;

  // 生命周期钩子方法，子类可以重写

  /**
   * 初始化钩子
   * @description 子类可以重写此方法进行初始化
   */
  protected async onInitialize(): Promise<void> {
    // 默认实现为空
  }

  /**
   * 启动钩子
   * @description 子类可以重写此方法进行启动处理
   */
  protected async onStart(): Promise<void> {
    // 默认实现为空
  }

  /**
   * 停止钩子
   * @description 子类可以重写此方法进行停止处理
   */
  protected async onStop(): Promise<void> {
    // 默认实现为空
  }

  /**
   * 重置钩子
   * @description 子类可以重写此方法进行重置处理
   */
  protected async onReset(): Promise<void> {
    // 默认实现为空
  }

  /**
   * 处理单个事件钩子
   * @param event 领域事件
   * @description 子类必须实现此方法
   */
  protected abstract onProcessEvent(event: DomainEvent): Promise<void>;

  /**
   * 批量处理事件钩子
   * @param events 事件列表
   * @description 子类可以重写此方法进行批量处理优化
   */
  protected async onProcessEvents(events: DomainEvent[]): Promise<void> {
    // 默认实现：逐个处理事件
    for (const event of events) {
      await this.onProcessEvent(event);
    }
  }

  // 私有辅助方法

  /**
   * 更新最后处理的事件信息
   * @param event 领域事件
   */
  private updateLastProcessedEvent(event: DomainEvent): void {
    this.lastProcessedEventId = event.eventId;
    this.lastProcessedEventVersion = event.version;
  }

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
