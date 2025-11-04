/**
 * @fileoverview 租户状态变更事件
 * @description 当租户状态发生变化时触发的事件
 */

import { DomainEvent, EntityId, TenantId } from "@hl8/domain-kernel";
import { TenantStatus } from "../value-objects/tenant-status.enum.js";

/**
 * 租户状态变更事件数据
 */
export interface TenantStatusChangedEventData {
  /** 租户ID */
  tenantId: TenantId;
  /** 旧状态 */
  oldStatus: TenantStatus;
  /** 新状态 */
  newStatus: TenantStatus;
  /** 变更原因 */
  reason?: string;
  /** 变更时间 */
  changedAt: Date;
  /** 变更者用户ID */
  changedBy?: EntityId;
}

/**
 * 租户状态变更事件
 * @description 当租户状态发生变化时触发
 * @example
 * ```typescript
 * const event = new TenantStatusChangedEvent(
 *   tenantId,
 *   {
 *     tenantId,
 *     oldStatus: TenantStatus.TRIAL,
 *     newStatus: TenantStatus.ACTIVE,
 *     reason: "用户激活租户",
 *     changedAt: new Date(),
 *     changedBy: userId
 *   }
 * );
 * ```
 */
export class TenantStatusChangedEvent extends DomainEvent {
  /**
   * 创建租户状态变更事件
   * @param aggregateRootId 聚合根ID（租户ID）
   * @param data 事件数据
   * @param metadata 事件元数据，可选
   */
  constructor(
    aggregateRootId: EntityId,
    data: TenantStatusChangedEventData,
    metadata: Record<string, unknown> = {},
  ) {
    super(
      aggregateRootId,
      "TenantStatusChanged",
      data,
      metadata,
      undefined,
      undefined,
      1,
    );
  }

  /**
   * 获取事件数据
   * @returns 事件数据
   */
  get eventData(): TenantStatusChangedEventData {
    return this.data as TenantStatusChangedEventData;
  }

  /**
   * 验证事件
   * @throws {Error} 当事件无效时抛出异常
   */
  protected validateEvent(): void {
    const eventData = this.data as TenantStatusChangedEventData;
    if (!eventData.tenantId) {
      throw new Error("租户ID不能为空");
    }
    if (!eventData.oldStatus || !eventData.newStatus) {
      throw new Error("租户状态不能为空");
    }
    if (!Object.values(TenantStatus).includes(eventData.oldStatus)) {
      throw new Error("旧状态无效");
    }
    if (!Object.values(TenantStatus).includes(eventData.newStatus)) {
      throw new Error("新状态无效");
    }
  }

  /**
   * 克隆事件
   * @returns 新的事件实例
   */
  public clone(): TenantStatusChangedEvent {
    return new TenantStatusChangedEvent(
      this.aggregateRootId,
      this.eventData,
      this.metadata,
    );
  }
}
