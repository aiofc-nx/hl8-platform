/**
 * @fileoverview 领域事件类型
 * @description 基于@hl8/domain-kernel的DomainEvent基类实现
 */

import { DomainEvent as BaseDomainEvent } from "@hl8/domain-kernel";
import { EntityId } from "@hl8/domain-kernel";

/**
 * 领域事件类
 * @description 基于@hl8/domain-kernel的DomainEvent基类实现
 */
export class DomainEvent extends BaseDomainEvent {
  /**
   * 验证事件
   * @throws {Error} 当事件无效时抛出异常
   */
  protected validateEvent(): void {
    if (!this.eventType) {
      throw new Error("事件类型不能为空");
    }
    if (!this.aggregateRootId || !this.aggregateRootId.isValid()) {
      throw new Error("聚合根标识符不能为空");
    }
  }
  /**
   * 创建领域事件
   * @param aggregateRootId 聚合根ID
   * @param eventType 事件类型
   * @param data 事件数据
   * @param metadata 事件元数据
   * @param eventId 事件ID，可选，默认自动生成
   * @param timestamp 事件时间戳，可选，默认为当前时间
   * @param version 事件版本，默认为1
   */
  constructor(
    aggregateRootId: EntityId,
    eventType: string,
    data: unknown,
    metadata: Record<string, unknown> = {},
    eventId?: EntityId,
    timestamp?: Date,
    version: number = 1,
  ) {
    super(
      aggregateRootId,
      eventType,
      data,
      metadata,
      eventId,
      timestamp,
      version,
    );
  }

  /**
   * 序列化事件数据
   * @returns 序列化后的数据
   */
  public toJSON(): Record<string, unknown> {
    return {
      eventId: this.eventId.toString(),
      aggregateRootId: this.aggregateRootId.toString(),
      timestamp: this.timestamp.toISOString(),
      version: this.version,
      eventType: this.eventType,
      data: this.data,
      metadata: this.metadata,
    };
  }

  /**
   * 克隆事件对象
   * @returns 新的事件对象实例
   */
  public clone(): DomainEvent {
    return new DomainEvent(
      this.aggregateRootId,
      this.eventType,
      this.data,
      { ...this.metadata },
      this.eventId,
    );
  }
}
