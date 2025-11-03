/**
 * @fileoverview 租户创建事件
 * @description 当租户创建时触发的事件
 */

import { DomainEvent, EntityId, TenantId } from "@hl8/domain-kernel";

/**
 * 租户创建事件数据
 */
export interface TenantCreatedEventData {
  /** 租户ID */
  tenantId: TenantId;
  /** 租户代码 */
  code: string;
  /** 租户名称 */
  name: string;
  /** 租户域名 */
  domain: string;
  /** 租户类型 */
  type: string;
  /** 创建者用户ID */
  createdBy: EntityId;
  /** 创建时间 */
  createdAt: Date;
}

/**
 * 租户创建事件
 * @description 当租户创建时触发，包含租户基本信息
 * @example
 * ```typescript
 * const event = new TenantCreatedEvent(
 *   tenantId,
 *   {
 *     tenantId,
 *     code: "acme-corp",
 *     name: "Acme Corporation",
 *     domain: "acme.example.com",
 *     type: "FREE",
 *     createdBy: userId,
 *     createdAt: new Date()
 *   }
 * );
 * ```
 */
export class TenantCreatedEvent extends DomainEvent {
  /**
   * 创建租户创建事件
   * @param aggregateRootId 聚合根ID（租户ID）
   * @param data 事件数据
   * @param metadata 事件元数据，可选
   */
  constructor(
    aggregateRootId: EntityId,
    data: TenantCreatedEventData,
    metadata: Record<string, unknown> = {},
  ) {
    super(
      aggregateRootId,
      "TenantCreated",
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
  get eventData(): TenantCreatedEventData {
    return this.data as TenantCreatedEventData;
  }

  /**
   * 验证事件
   * @throws {Error} 当事件无效时抛出异常
   */
  protected validateEvent(): void {
    const eventData = this.data as TenantCreatedEventData;
    if (!eventData.tenantId) {
      throw new Error("租户ID不能为空");
    }
    if (!eventData.code) {
      throw new Error("租户代码不能为空");
    }
    if (!eventData.name) {
      throw new Error("租户名称不能为空");
    }
    if (!eventData.createdBy) {
      throw new Error("创建者ID不能为空");
    }
  }

  /**
   * 克隆事件
   * @returns 新的事件实例
   */
  public clone(): TenantCreatedEvent {
    return new TenantCreatedEvent(
      this.aggregateRootId,
      this.eventData,
      this.metadata,
    );
  }
}
