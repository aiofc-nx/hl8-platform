/**
 * @fileoverview 事件总线接口
 * @description 定义事件总线的核心接口，支持事件的发布、订阅、路由和异步处理
 */

import { DomainEvent } from "../types/domain-event.js";
import { IntegrationEvent } from "../types/integration-event.js";

/**
 * 事件总线接口
 * @description 提供事件发布、订阅、路由和异步处理的核心功能
 */
export interface IEventBus {
  /**
   * 发布领域事件
   * @param event 领域事件
   * @returns 发布结果
   */
  publishDomainEvent(event: DomainEvent): Promise<EventPublishResult>;

  /**
   * 发布集成事件
   * @param event 集成事件
   * @returns 发布结果
   */
  publishIntegrationEvent(event: IntegrationEvent): Promise<EventPublishResult>;

  /**
   * 批量发布事件
   * @param events 事件列表
   * @returns 发布结果
   */
  publishEvents(
    events: (DomainEvent | IntegrationEvent)[],
  ): Promise<EventPublishResult[]>;

  /**
   * 订阅领域事件
   * @param eventType 事件类型
   * @param handler 事件处理器
   * @returns 订阅ID
   */
  subscribeToDomainEvent(
    eventType: string,
    handler: EventHandler<DomainEvent>,
  ): Promise<string>;

  /**
   * 订阅集成事件
   * @param eventType 事件类型
   * @param handler 事件处理器
   * @returns 订阅ID
   */
  subscribeToIntegrationEvent(
    eventType: string,
    handler: EventHandler<IntegrationEvent>,
  ): Promise<string>;

  /**
   * 取消订阅
   * @param subscriptionId 订阅ID
   * @returns 取消结果
   */
  unsubscribe(subscriptionId: string): Promise<boolean>;

  /**
   * 获取所有订阅
   * @returns 订阅列表
   */
  getSubscriptions(): Promise<EventSubscription[]>;

  /**
   * 获取事件统计信息
   * @returns 统计信息
   */
  getStatistics(): Promise<EventBusStatistics>;

  /**
   * 启动事件总线
   * @returns 启动结果
   */
  start(): Promise<void>;

  /**
   * 停止事件总线
   * @returns 停止结果
   */
  stop(): Promise<void>;

  /**
   * 检查事件总线是否运行中
   * @returns 是否运行中
   */
  isRunning(): boolean;
}

/**
 * 事件处理器接口
 * @template TEvent 事件类型
 */
export interface EventHandler<TEvent = DomainEvent | IntegrationEvent> {
  /**
   * 处理事件
   * @param event 事件
   * @returns 处理结果
   */
  handle(event: TEvent): Promise<EventHandlerResult>;

  /**
   * 获取处理器名称
   * @returns 处理器名称
   */
  getHandlerName(): string;

  /**
   * 获取处理器描述
   * @returns 处理器描述
   */
  getDescription(): string;

  /**
   * 获取处理器版本
   * @returns 处理器版本
   */
  getVersion(): string;

  /**
   * 检查处理器是否可用
   * @returns 是否可用
   */
  isAvailable(): boolean;
}

/**
 * 事件发布结果
 * @description 事件发布操作的结果
 */
export interface EventPublishResult {
  /** 是否成功 */
  success: boolean;
  /** 错误信息 */
  error?: string;
  /** 事件ID */
  eventId: string;
  /** 发布时间戳 */
  timestamp: Date;
  /** 处理时间（毫秒） */
  processingTime: number;
  /** 订阅者数量 */
  subscriberCount: number;
  /** 成功处理的订阅者数量 */
  successCount: number;
  /** 失败的订阅者数量 */
  failureCount: number;
}

/**
 * 事件处理器结果
 * @description 事件处理器执行的结果
 */
export interface EventHandlerResult {
  /** 是否成功 */
  success: boolean;
  /** 错误信息 */
  error?: string;
  /** 处理时间（毫秒） */
  processingTime: number;
  /** 处理器名称 */
  handlerName: string;
  /** 结果数据 */
  data?: unknown;
}

/**
 * 事件订阅
 * @description 事件订阅的信息
 */
export interface EventSubscription {
  /** 订阅ID */
  id: string;
  /** 事件类型 */
  eventType: string;
  /** 订阅类型 */
  subscriptionType: "domain" | "integration";
  /** 处理器名称 */
  handlerName: string;
  /** 创建时间 */
  createdAt: Date;
  /** 是否活跃 */
  active: boolean;
  /** 处理次数 */
  processCount: number;
  /** 成功次数 */
  successCount: number;
  /** 失败次数 */
  failureCount: number;
}

/**
 * 事件总线统计信息
 * @description 事件总线的统计信息
 */
export interface EventBusStatistics {
  /** 总发布事件数 */
  totalPublished: number;
  /** 总处理事件数 */
  totalProcessed: number;
  /** 总订阅数 */
  totalSubscriptions: number;
  /** 活跃订阅数 */
  activeSubscriptions: number;
  /** 平均处理时间（毫秒） */
  averageProcessingTime: number;
  /** 成功率 */
  successRate: number;
  /** 按事件类型分组的统计 */
  byEventType: Record<string, EventTypeStatistics>;
  /** 按处理器分组的统计 */
  byHandler: Record<string, HandlerStatistics>;
  /** 最后更新时间 */
  lastUpdated: Date;
}

/**
 * 事件类型统计
 * @description 特定事件类型的统计信息
 */
export interface EventTypeStatistics {
  /** 发布次数 */
  published: number;
  /** 处理次数 */
  processed: number;
  /** 成功次数 */
  success: number;
  /** 失败次数 */
  failure: number;
  /** 平均处理时间 */
  averageProcessingTime: number;
}

/**
 * 处理器统计
 * @description 特定处理器的统计信息
 */
export interface HandlerStatistics {
  /** 处理次数 */
  processed: number;
  /** 成功次数 */
  success: number;
  /** 失败次数 */
  failure: number;
  /** 平均处理时间 */
  averageProcessingTime: number;
  /** 最后处理时间 */
  lastProcessed?: Date;
}

/**
 * 事件总线配置
 * @description 事件总线的配置选项
 */
export interface EventBusConfig {
  /** 最大重试次数 */
  maxRetries: number;
  /** 重试延迟（毫秒） */
  retryDelay: number;
  /** 最大并发处理数 */
  maxConcurrency: number;
  /** 处理超时时间（毫秒） */
  processingTimeout: number;
  /** 是否启用死信队列 */
  enableDeadLetterQueue: boolean;
  /** 死信队列最大大小 */
  deadLetterQueueMaxSize: number;
  /** 是否启用性能监控 */
  enablePerformanceMonitoring: boolean;
  /** 性能监控采样率 */
  performanceMonitoringSamplingRate: number;
}
