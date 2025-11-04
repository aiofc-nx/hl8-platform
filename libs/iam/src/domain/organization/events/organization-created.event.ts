/**
 * @fileoverview 组织创建事件
 * @description 当组织创建时触发的事件
 */

import {
  DomainEvent,
  EntityId,
  OrganizationId,
  TenantId,
} from "@hl8/domain-kernel";

/**
 * 组织创建事件数据
 */
export interface OrganizationCreatedEventData {
  /** 组织ID */
  organizationId: OrganizationId;
  /** 租户ID */
  tenantId: TenantId;
  /** 组织名称 */
  name: string;
  /** 组织描述 */
  description?: string;
  /** 是否默认组织 */
  isDefault: boolean;
  /** 创建时间 */
  createdAt: Date;
}

/**
 * 组织创建事件
 * @description 当组织创建时触发，包含组织基本信息
 * @example
 * ```typescript
 * const event = new OrganizationCreatedEvent(
 *   organizationId,
 *   {
 *     organizationId,
 *     tenantId,
 *     name: "技术部",
 *     description: "技术研发部门",
 *     isDefault: false,
 *     createdAt: new Date()
 *   }
 * );
 * ```
 */
export class OrganizationCreatedEvent extends DomainEvent {
  /**
   * 创建组织创建事件
   * @param aggregateRootId 聚合根ID（组织ID）
   * @param data 事件数据
   * @param metadata 事件元数据，可选
   */
  constructor(
    aggregateRootId: EntityId,
    data: OrganizationCreatedEventData,
    metadata: Record<string, unknown> = {},
  ) {
    super(
      aggregateRootId,
      "OrganizationCreated",
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
  get eventData(): OrganizationCreatedEventData {
    return this.data as OrganizationCreatedEventData;
  }

  /**
   * 验证事件
   * @throws {Error} 当事件无效时抛出异常
   */
  protected validateEvent(): void {
    const eventData = this.data as OrganizationCreatedEventData;
    if (!eventData.organizationId) {
      throw new Error("组织ID不能为空");
    }
    if (!eventData.tenantId) {
      throw new Error("租户ID不能为空");
    }
    if (!eventData.name) {
      throw new Error("组织名称不能为空");
    }
  }

  /**
   * 克隆事件
   * @returns 新的事件实例
   */
  public clone(): OrganizationCreatedEvent {
    return new OrganizationCreatedEvent(
      this.aggregateRootId,
      this.eventData,
      this.metadata,
    );
  }
}
