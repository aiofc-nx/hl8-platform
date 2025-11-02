/**
 * @fileoverview 事件持久化实体
 * @description 用于在数据库中存储领域事件的持久化实体
 */

import { Entity, Property, Index } from "@mikro-orm/core";
import { BaseEntity } from "../entities/base/base-entity.js";

/**
 * 事件持久化实体
 * @description 存储领域事件的持久化实体，支持PostgreSQL和MongoDB
 */
@Entity({ tableName: "event_store" })
@Index({ properties: ["aggregateId"] })
@Index({ properties: ["aggregateId", "eventVersion"] })
@Index({ properties: ["eventType"] })
@Index({ properties: ["timestamp"] })
export class EventEntity extends BaseEntity {
  /**
   * 聚合根ID
   * @description 事件所属的聚合根标识符
   */
  @Property({ type: "uuid" })
  aggregateId!: string;

  /**
   * 事件版本号
   * @description 事件的版本号，用于乐观并发控制和事件排序
   */
  @Property({ type: "integer", fieldName: "event_version" })
  eventVersion!: number;

  /**
   * 事件类型
   * @description 事件的类型标识符
   */
  @Property({ type: "string", length: 255 })
  eventType!: string;

  /**
   * 事件数据
   * @description 事件的JSON数据
   */
  @Property({ type: "json" })
  data!: Record<string, unknown>;

  /**
   * 事件元数据
   * @description 事件的元数据信息
   */
  @Property({ type: "json", nullable: true })
  metadata?: Record<string, unknown>;

  /**
   * 事件ID
   * @description 事件的唯一标识符
   */
  @Property({ type: "uuid", unique: true })
  eventId!: string;

  /**
   * 事件时间戳
   * @description 事件发生的时间戳
   */
  @Property({ type: "timestamp", defaultRaw: "CURRENT_TIMESTAMP" })
  timestamp!: Date;

  /**
   * 聚合类型
   * @description 聚合根的类型
   */
  @Property({ type: "string", length: 255, nullable: true })
  aggregateType?: string;

  /**
   * 事务ID
   * @description 关联的事务标识符（用于事件追踪）
   */
  @Property({ type: "uuid", nullable: true })
  transactionId?: string;
}
