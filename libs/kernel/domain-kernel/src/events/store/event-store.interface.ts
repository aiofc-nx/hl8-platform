/**
 * @fileoverview 事件存储接口
 * @description 定义事件存储的接口，支持事件存储模式
 */

import { DomainEvent } from "../base/domain-event.base.js";
import { EntityId } from "../../identifiers/entity-id.js";

/**
 * 事件存储接口
 * @description 定义事件存储的接口，支持追加写入和事件重放
 */
export interface IEventStore {
  /**
   * 追加事件到存储
   * @param events 要存储的事件数组
   * @returns Promise<void>
   * @throws {Error} 当存储失败时抛出异常
   */
  appendEvents(events: DomainEvent[]): Promise<void>;

  /**
   * 获取聚合根的所有事件
   * @param aggregateRootId 聚合根标识符
   * @returns Promise<DomainEvent[]> 事件数组
   * @throws {Error} 当获取失败时抛出异常
   */
  getEvents(aggregateRootId: EntityId): Promise<DomainEvent[]>;

  /**
   * 获取聚合根的事件（从指定版本开始）
   * @param aggregateRootId 聚合根标识符
   * @param fromVersion 起始版本号
   * @returns Promise<DomainEvent[]> 事件数组
   * @throws {Error} 当获取失败时抛出异常
   */
  getEventsFromVersion(
    aggregateRootId: EntityId,
    fromVersion: number,
  ): Promise<DomainEvent[]>;

  /**
   * 获取聚合根的事件（在指定时间范围内）
   * @param aggregateRootId 聚合根标识符
   * @param fromDate 开始时间
   * @param toDate 结束时间
   * @returns Promise<DomainEvent[]> 事件数组
   * @throws {Error} 当获取失败时抛出异常
   */
  getEventsInTimeRange(
    aggregateRootId: EntityId,
    fromDate: Date,
    toDate: Date,
  ): Promise<DomainEvent[]>;

  /**
   * 获取所有事件（按时间顺序）
   * @param limit 限制数量，可选
   * @param offset 偏移量，可选
   * @returns Promise<DomainEvent[]> 事件数组
   * @throws {Error} 当获取失败时抛出异常
   */
  getAllEvents(limit?: number, offset?: number): Promise<DomainEvent[]>;

  /**
   * 获取指定类型的事件
   * @param eventType 事件类型
   * @param limit 限制数量，可选
   * @param offset 偏移量，可选
   * @returns Promise<DomainEvent[]> 事件数组
   * @throws {Error} 当获取失败时抛出异常
   */
  getEventsByType(
    eventType: string,
    limit?: number,
    offset?: number,
  ): Promise<DomainEvent[]>;

  /**
   * 获取聚合根的最新版本号
   * @param aggregateRootId 聚合根标识符
   * @returns Promise<number> 最新版本号
   * @throws {Error} 当获取失败时抛出异常
   */
  getLatestVersion(aggregateRootId: EntityId): Promise<number>;

  /**
   * 检查事件是否存在
   * @param eventId 事件标识符
   * @returns Promise<boolean> 是否存在
   * @throws {Error} 当检查失败时抛出异常
   */
  eventExists(eventId: EntityId): Promise<boolean>;

  /**
   * 删除聚合根的所有事件
   * @param aggregateRootId 聚合根标识符
   * @returns Promise<void>
   * @throws {Error} 当删除失败时抛出异常
   */
  deleteEvents(aggregateRootId: EntityId): Promise<void>;

  /**
   * 清空所有事件
   * @returns Promise<void>
   * @throws {Error} 当清空失败时抛出异常
   */
  clearAllEvents(): Promise<void>;

  /**
   * 获取事件存储统计信息
   * @returns Promise<EventStoreStats> 统计信息
   * @throws {Error} 当获取失败时抛出异常
   */
  getStats(): Promise<EventStoreStats>;
}

/**
 * 事件存储统计信息
 * @description 事件存储的统计信息
 */
export interface EventStoreStats {
  /** 总事件数量 */
  totalEvents: number;
  /** 聚合根数量 */
  aggregateRootCount: number;
  /** 事件类型数量 */
  eventTypeCount: number;
  /** 最早事件时间 */
  earliestEventTime: Date | null;
  /** 最新事件时间 */
  latestEventTime: Date | null;
  /** 存储大小（字节） */
  storageSize: number;
}

/**
 * 事件存储配置
 * @description 事件存储的配置选项
 */
export interface EventStoreConfig {
  /** 最大事件数量 */
  maxEvents?: number;
  /** 事件保留时间（毫秒） */
  retentionTime?: number;
  /** 是否启用压缩 */
  enableCompression?: boolean;
  /** 是否启用加密 */
  enableEncryption?: boolean;
  /** 批处理大小 */
  batchSize?: number;
}

/**
 * 事件存储异常
 * @description 事件存储相关的异常
 */
export class EventStoreException extends Error {
  public readonly code: string;
  public readonly details?: unknown;

  constructor(message: string, code: string, details?: unknown) {
    super(message);
    this.name = "EventStoreException";
    this.code = code;
    this.details = details;
  }
}

/**
 * 事件存储工厂接口
 * @description 创建事件存储实例的工厂接口
 */
export interface IEventStoreFactory {
  /**
   * 创建事件存储实例
   * @param config 配置选项
   * @returns IEventStore 事件存储实例
   */
  createEventStore(config?: EventStoreConfig): IEventStore;
}
