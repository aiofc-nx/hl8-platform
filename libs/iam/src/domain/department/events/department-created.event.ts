/**
 * @fileoverview 部门创建事件
 * @description 当部门创建时触发的事件
 */

import {
  DomainEvent,
  EntityId,
  DepartmentId,
  OrganizationId,
} from "@hl8/domain-kernel";

/**
 * 部门创建事件数据
 */
export interface DepartmentCreatedEventData {
  /** 部门ID */
  departmentId: DepartmentId;
  /** 组织ID */
  organizationId: OrganizationId;
  /** 父部门ID */
  parentDepartmentId?: DepartmentId | null;
  /** 部门名称 */
  name: string;
  /** 层级深度 */
  level: number;
  /** 是否根部门 */
  isRoot: boolean;
  /** 创建时间 */
  createdAt: Date;
}

/**
 * 部门创建事件
 * @description 当部门创建时触发，包含部门基本信息
 * @example
 * ```typescript
 * const event = new DepartmentCreatedEvent(
 *   departmentId,
 *   {
 *     departmentId,
 *     organizationId,
 *     parentDepartmentId: null,
 *     name: "研发部",
 *     level: 1,
 *     isRoot: true,
 *     createdAt: new Date()
 *   }
 * );
 * ```
 */
export class DepartmentCreatedEvent extends DomainEvent {
  /**
   * 创建部门创建事件
   * @param aggregateRootId 聚合根ID（部门ID）
   * @param data 事件数据
   * @param metadata 事件元数据，可选
   */
  constructor(
    aggregateRootId: EntityId,
    data: DepartmentCreatedEventData,
    metadata: Record<string, unknown> = {},
  ) {
    super(
      aggregateRootId,
      "DepartmentCreated",
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
  get eventData(): DepartmentCreatedEventData {
    return this.data as DepartmentCreatedEventData;
  }

  /**
   * 验证事件
   * @throws {Error} 当事件无效时抛出异常
   */
  protected validateEvent(): void {
    const eventData = this.data as DepartmentCreatedEventData;
    if (!eventData.departmentId) {
      throw new Error("部门ID不能为空");
    }
    if (!eventData.organizationId) {
      throw new Error("组织ID不能为空");
    }
    if (!eventData.name) {
      throw new Error("部门名称不能为空");
    }
    if (eventData.level < 1) {
      throw new Error("部门层级深度必须大于0");
    }
  }

  /**
   * 克隆事件
   * @returns 新的事件实例
   */
  public clone(): DepartmentCreatedEvent {
    return new DepartmentCreatedEvent(
      this.aggregateRootId,
      this.eventData,
      this.metadata,
    );
  }
}
