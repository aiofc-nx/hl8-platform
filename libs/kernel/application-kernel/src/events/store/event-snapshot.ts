/**
 * @fileoverview 事件快照类
 * @description 用于优化事件重放性能的快照实现
 */

import { EntityId } from "@hl8/domain-kernel";
import { EventSnapshot as IEventSnapshot } from "./event-store.interface.js";

/**
 * 事件快照类
 * @description 用于优化事件重放性能的快照实现
 */
export class EventSnapshot implements IEventSnapshot {
  public readonly aggregateId: EntityId;
  public readonly version: number;
  public readonly data: Record<string, unknown>;
  public readonly timestamp: Date;
  public readonly type: string;
  public readonly metadata: Record<string, unknown>;

  /**
   * 创建事件快照
   * @param aggregateId 聚合根ID
   * @param version 版本号
   * @param data 快照数据
   * @param type 快照类型
   * @param metadata 元数据，可选
   * @param timestamp 时间戳，可选，默认当前时间
   */
  constructor(
    aggregateId: EntityId,
    version: number,
    data: Record<string, unknown>,
    type: string,
    metadata: Record<string, unknown> = {},
    timestamp?: Date,
  ) {
    this.aggregateId = aggregateId;
    this.version = version;
    this.data = { ...data };
    this.type = type;
    this.metadata = { ...metadata };
    this.timestamp = timestamp || new Date();
  }

  /**
   * 克隆快照
   * @returns 新的快照实例
   */
  public clone(): EventSnapshot {
    return new EventSnapshot(
      this.aggregateId,
      this.version,
      this.data,
      this.type,
      this.metadata,
      this.timestamp,
    );
  }

  /**
   * 更新快照数据
   * @param data 新的快照数据
   * @returns 新的快照实例
   */
  public updateData(data: Record<string, unknown>): EventSnapshot {
    return new EventSnapshot(
      this.aggregateId,
      this.version,
      data,
      this.type,
      this.metadata,
      this.timestamp,
    );
  }

  /**
   * 更新元数据
   * @param metadata 新的元数据
   * @returns 新的快照实例
   */
  public updateMetadata(metadata: Record<string, unknown>): EventSnapshot {
    return new EventSnapshot(
      this.aggregateId,
      this.version,
      this.data,
      this.type,
      metadata,
      this.timestamp,
    );
  }

  /**
   * 序列化为JSON
   * @returns JSON对象
   */
  public toJSON(): Record<string, unknown> {
    return {
      aggregateId: this.aggregateId.toString(),
      version: this.version,
      data: this.data,
      type: this.type,
      metadata: this.metadata,
      timestamp: this.timestamp.toISOString(),
    };
  }

  /**
   * 从JSON创建快照
   * @param json JSON对象
   * @returns 快照实例
   */
  public static fromJSON(json: Record<string, unknown>): EventSnapshot {
    return new EventSnapshot(
      new EntityId(json.aggregateId as string),
      json.version as number,
      json.data as Record<string, unknown>,
      json.type as string,
      json.metadata as Record<string, unknown>,
      new Date(json.timestamp as string),
    );
  }

  /**
   * 验证快照数据
   * @returns 是否有效
   */
  public validate(): boolean {
    return (
      this.aggregateId instanceof EntityId &&
      typeof this.version === "number" &&
      this.version >= 0 &&
      typeof this.data === "object" &&
      this.data !== null &&
      typeof this.type === "string" &&
      this.type.length > 0 &&
      typeof this.metadata === "object" &&
      this.metadata !== null &&
      this.timestamp instanceof Date &&
      !isNaN(this.timestamp.getTime())
    );
  }

  /**
   * 获取快照大小（字节）
   * @returns 快照大小
   */
  public getSize(): number {
    return JSON.stringify(this.toJSON()).length;
  }

  /**
   * 检查快照是否过期
   * @param maxAge 最大年龄（毫秒）
   * @returns 是否过期
   */
  public isExpired(maxAge: number): boolean {
    return Date.now() - this.timestamp.getTime() > maxAge;
  }

  /**
   * 获取快照摘要
   * @returns 快照摘要
   */
  public getSummary(): string {
    return `Snapshot[${this.type}] v${this.version} for ${this.aggregateId.toString()} (${this.getSize()} bytes)`;
  }
}
