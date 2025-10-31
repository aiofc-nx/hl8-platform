/**
 * @fileoverview 领域事件处理器接口定义
 * @description 定义领域事件处理器的接口，支持领域层内的事件处理
 */

import { DomainEvent } from "./base/domain-event.base.js";

/**
 * 事件处理结果
 * @description 描述事件处理的结果状态
 */
export enum EventHandlerResult {
  /** 处理成功 */
  SUCCESS = "success",
  /** 处理失败 */
  FAILURE = "failure",
  /** 处理被跳过 */
  SKIPPED = "skipped",
  /** 处理需要重试 */
  RETRY = "retry",
}

/**
 * 事件处理器元数据
 * @description 描述事件处理器的元数据信息
 */
export interface EventHandlerMetadata {
  /** 处理器标识符 */
  handlerId: string;
  /** 处理器名称 */
  handlerName: string;
  /** 处理器描述 */
  description?: string;
  /** 支持的事件类型列表 */
  supportedEventTypes: string[];
  /** 处理器优先级（数字越小优先级越高） */
  priority: number;
  /** 是否启用 */
  enabled: boolean;
  /** 处理器版本 */
  version: string;
  /** 处理器创建的元数据 */
  metadata?: Record<string, unknown>;
}

/**
 * 事件处理上下文
 * @description 提供事件处理时的上下文信息
 */
export interface EventHandlerContext {
  /** 事件标识符 */
  eventId: string;
  /** 事件类型 */
  eventType: string;
  /** 聚合根标识符 */
  aggregateRootId: string;
  /** 处理开始时间 */
  startTime: Date;
  /** 处理结束时间 */
  endTime?: Date;
  /** 处理耗时（毫秒） */
  duration?: number;
  /** 处理器标识符 */
  handlerId: string;
  /** 处理结果 */
  result?: EventHandlerResult;
  /** 错误信息 */
  error?: Error;
  /** 上下文数据 */
  data?: Record<string, unknown>;
}

/**
 * 事件处理结果
 * @description 描述事件处理的详细结果
 */
export interface EventProcessingResult {
  /** 处理是否成功 */
  success: boolean;
  /** 处理结果状态 */
  result: EventHandlerResult;
  /** 处理耗时（毫秒） */
  duration: number;
  /** 处理上下文 */
  context: EventHandlerContext;
  /** 错误信息（如果处理失败） */
  error?: Error;
  /** 处理后的数据（如果有） */
  data?: unknown;
  /** 是否需要重试 */
  shouldRetry: boolean;
  /** 重试延迟（毫秒） */
  retryDelay?: number;
}

/**
 * 领域事件处理器接口
 * @description 定义领域事件处理器的核心行为
 * @template TEvent 事件类型，必须是 DomainEvent 的子类
 */
export interface IDomainEventHandler<TEvent extends DomainEvent = DomainEvent> {
  /**
   * 获取处理器元数据
   * @returns 处理器元数据
   */
  getMetadata(): EventHandlerMetadata;

  /**
   * 检查是否支持指定类型的事件
   * @param eventType 事件类型
   * @returns 是否支持
   */
  canHandle(eventType: string): boolean;

  /**
   * 处理领域事件
   * @param event 领域事件
   * @param context 处理上下文，可选
   * @returns Promise<EventProcessingResult> 处理结果
   * @throws {Error} 当处理过程中发生错误时抛出异常
   */
  handle(
    event: TEvent,
    context?: Partial<EventHandlerContext>,
  ): Promise<EventProcessingResult>;

  /**
   * 验证事件是否可以被处理
   * @param event 领域事件
   * @returns 是否可以处理
   */
  validateEvent(event: TEvent): boolean;

  /**
   * 获取处理器的依赖项
   * @returns 依赖的服务标识符列表
   */
  getDependencies(): string[];

  /**
   * 初始化处理器
   * @returns Promise<void>
   * @throws {Error} 当初始化失败时抛出异常
   */
  initialize?(): Promise<void>;

  /**
   * 销毁处理器
   * @returns Promise<void>
   * @throws {Error} 当销毁失败时抛出异常
   */
  dispose?(): Promise<void>;
}
