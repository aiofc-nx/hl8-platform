/**
 * @fileoverview 事件快照持久化实体
 * @description 用于在数据库中存储事件快照的持久化实体
 */

import { Entity, Property, Index, Unique } from "@mikro-orm/core";
import { BaseEntity } from "../entities/base/base-entity.js";

/**
 * 事件快照持久化实体
 * @description 存储事件快照的持久化实体，用于优化事件重放性能
 */
@Entity({ tableName: "event_snapshots" })
@Index({ properties: ["aggregateId"] })
@Index({ properties: ["aggregateId", "snapshotVersion"] })
@Unique({ properties: ["aggregateId", "snapshotVersion"] })
export class EventSnapshotEntity extends BaseEntity {
  /**
   * 聚合根ID
   * @description 快照所属的聚合根标识符
   */
  @Property({ type: "uuid" })
  aggregateId!: string;

  /**
   * 版本号
   * @description 快照对应的版本号
   */
  @Property({ type: "integer", fieldName: "snapshot_version" })
  snapshotVersion!: number;

  /**
   * 快照数据
   * @description 快照的JSON数据
   */
  @Property({ type: "json" })
  data!: Record<string, unknown>;

  /**
   * 快照类型
   * @description 快照的类型标识符
   */
  @Property({ type: "string", length: 255 })
  snapshotType!: string;

  /**
   * 快照元数据
   * @description 快照的元数据信息
   */
  @Property({ type: "json", nullable: true })
  metadata?: Record<string, unknown>;

  /**
   * 快照时间戳
   * @description 快照创建的时间戳
   */
  @Property({ type: "timestamp", defaultRaw: "CURRENT_TIMESTAMP" })
  timestamp!: Date;
}
