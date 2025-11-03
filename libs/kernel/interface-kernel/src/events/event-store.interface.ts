/**
 * @fileoverview 事件存储接口
 * @description 定义事件存储的稳定契约，支持事件溯源模式
 */

import type { EntityId } from "../index.js";
import type { DomainEvent } from "./domain-event.js";

/**
 * 事件存储接口
 * @description 提供事件存储的核心功能，支持事件溯源和事件重放
 */
export interface IEventStore {
  /**
   * 保存事件
   * @description 追加事件到存储，支持乐观并发控制
   * @param aggregateId 聚合根ID
   * @param events 事件列表
   * @param expectedVersion 期望版本号，用于乐观并发控制
   * @returns 保存结果
   * @throws {DomainException} 当版本冲突或存储失败时抛出
   */
  saveEvents(
    aggregateId: EntityId,
    events: DomainEvent[],
    expectedVersion: number,
  ): Promise<EventStoreResult>;

  /**
   * 获取聚合根的所有事件
   * @description 按时间顺序返回聚合根的所有事件
   * @param aggregateId 聚合根ID
   * @returns 事件列表
   * @throws {DomainException} 当获取失败时抛出
   */
  getEventsForAggregate(aggregateId: EntityId): Promise<DomainEvent[]>;
}

/**
 * 事件存储结果
 */
export interface EventStoreResult {
  /** 是否成功 */
  success: boolean;
  /** 保存后的事件版本号 */
  version?: number;
  /** 错误消息（失败时） */
  error?: string;
}
