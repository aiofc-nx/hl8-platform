/**
 * @fileoverview 事件存储接口
 * @description 定义事件存储的核心接口，支持混合存储策略
 */

import { EntityId } from "@hl8/domain-kernel";
import { DomainEvent } from "../types/domain-event.js";

/**
 * 事件存储接口
 * @description 提供事件存储的核心功能，支持混合存储策略（PostgreSQL + MongoDB）
 */
export interface IEventStore {
  /**
   * 保存事件
   * @param aggregateId 聚合根ID
   * @param events 事件列表
   * @param expectedVersion 期望版本号，用于乐观并发控制
   * @returns 保存结果
   */
  saveEvents(
    aggregateId: EntityId,
    events: DomainEvent[],
    expectedVersion: number,
  ): Promise<EventStoreResult>;

  /**
   * 获取聚合根的所有事件
   * @param aggregateId 聚合根ID
   * @param fromVersion 起始版本号，可选
   * @param toVersion 结束版本号，可选
   * @returns 事件列表
   */
  getEvents(
    aggregateId: EntityId,
    fromVersion?: number,
    toVersion?: number,
  ): Promise<DomainEvent[]>;

  /**
   * 获取聚合根的事件流
   * @param aggregateId 聚合根ID
   * @param fromVersion 起始版本号，可选
   * @param toVersion 结束版本号，可选
   * @returns 事件流
   */
  getEventStream(
    aggregateId: EntityId,
    fromVersion?: number,
    toVersion?: number,
  ): Promise<EventStream>;

  /**
   * 获取所有事件
   * @param fromTimestamp 起始时间戳，可选
   * @param toTimestamp 结束时间戳，可选
   * @param limit 限制数量，可选
   * @returns 事件列表
   */
  getAllEvents(
    fromTimestamp?: Date,
    toTimestamp?: Date,
    limit?: number,
  ): Promise<DomainEvent[]>;

  /**
   * 获取事件快照
   * @param aggregateId 聚合根ID
   * @param version 版本号，可选，默认最新版本
   * @returns 事件快照
   */
  getSnapshot(
    aggregateId: EntityId,
    version?: number,
  ): Promise<EventSnapshot | null>;

  /**
   * 保存事件快照
   * @param snapshot 事件快照
   * @returns 保存结果
   */
  saveSnapshot(snapshot: EventSnapshot): Promise<EventStoreResult>;

  /**
   * 删除事件快照
   * @param aggregateId 聚合根ID
   * @param version 版本号，可选，默认删除所有版本
   * @returns 删除结果
   */
  deleteSnapshot(
    aggregateId: EntityId,
    version?: number,
  ): Promise<EventStoreResult>;

  /**
   * 获取聚合根的当前版本
   * @param aggregateId 聚合根ID
   * @returns 当前版本号
   */
  getCurrentVersion(aggregateId: EntityId): Promise<number>;

  /**
   * 检查聚合根是否存在
   * @param aggregateId 聚合根ID
   * @returns 是否存在
   */
  exists(aggregateId: EntityId): Promise<boolean>;

  /**
   * 获取事件统计信息
   * @param aggregateId 聚合根ID，可选
   * @returns 统计信息
   */
  getStatistics(aggregateId?: EntityId): Promise<EventStoreStatistics>;
}

/**
 * 事件存储结果
 * @description 事件存储操作的结果
 */
export interface EventStoreResult {
  /** 是否成功 */
  success: boolean;
  /** 错误信息 */
  error?: string;
  /** 保存的事件数量 */
  eventsCount: number;
  /** 新版本号 */
  newVersion: number;
  /** 操作时间戳 */
  timestamp: Date;
}

/**
 * 事件流
 * @description 包含事件列表和元数据的事件流
 */
export interface EventStream {
  /** 聚合根ID */
  aggregateId: EntityId;
  /** 事件列表 */
  events: DomainEvent[];
  /** 起始版本号 */
  fromVersion: number;
  /** 结束版本号 */
  toVersion: number;
  /** 总事件数量 */
  totalEvents: number;
  /** 是否有更多事件 */
  hasMore: boolean;
}

/**
 * 事件快照
 * @description 用于优化事件重放性能的快照
 */
export interface EventSnapshot {
  /** 聚合根ID */
  aggregateId: EntityId;
  /** 版本号 */
  version: number;
  /** 快照数据 */
  data: Record<string, unknown>;
  /** 创建时间戳 */
  timestamp: Date;
  /** 快照类型 */
  type: string;
  /** 元数据 */
  metadata: Record<string, unknown>;
}

/**
 * 事件存储统计信息
 * @description 事件存储的统计信息
 */
export interface EventStoreStatistics {
  /** 总事件数量 */
  totalEvents: number;
  /** 聚合根数量 */
  aggregateCount: number;
  /** 快照数量 */
  snapshotCount: number;
  /** 存储大小（字节） */
  storageSize: number;
  /** 最后更新时间 */
  lastUpdated: Date;
  /** 按类型分组的统计 */
  byType: Record<string, number>;
  /** 按聚合根分组的统计 */
  byAggregate: Record<string, number>;
}
