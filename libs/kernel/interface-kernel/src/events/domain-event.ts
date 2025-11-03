/**
 * @fileoverview 领域事件类型定义
 * @description 定义领域事件的稳定契约
 */

import type { EntityId } from "../index.js";

/**
 * 领域事件接口
 * @description 表示领域层中发生的事件，用于事件溯源和事件驱动架构
 */
export interface DomainEvent {
  /** 事件类型 */
  type: string;

  /** 事件ID */
  eventId?: EntityId;

  /** 聚合根ID */
  aggregateRootId: EntityId;

  /** 事件时间戳 */
  timestamp: Date;

  /** 事件版本 */
  version: number;

  /** 事件数据 */
  data: unknown;

  /** 事件元数据 */
  metadata?: Record<string, unknown>;
}
