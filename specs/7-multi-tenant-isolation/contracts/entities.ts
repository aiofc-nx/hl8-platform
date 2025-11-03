/**
 * @fileoverview 租户隔离实体接口定义
 * @description 定义支持租户隔离的实体和聚合根接口
 */

import { ITenantId } from "./identifiers.js";
import { IOrganizationId } from "./identifiers.js";
import { IDepartmentId } from "./identifiers.js";
import { ITenantContext } from "./context.js";

/**
 * 租户隔离实体接口
 * @description 支持租户隔离的实体基类接口
 * @template T 实体类型（通常继承自 Entity）
 */
export interface ITenantIsolatedEntity<T = unknown> {
  /**
   * 获取租户ID
   * @returns 租户标识符
   */
  readonly tenantId: ITenantId;

  /**
   * 获取组织ID
   * @returns 组织标识符或undefined
   */
  readonly organizationId?: IOrganizationId;

  /**
   * 获取部门ID
   * @returns 部门标识符或undefined
   */
  readonly departmentId?: IDepartmentId;

  /**
   * 检查是否属于指定租户
   * @param tenantId 租户标识符
   * @returns 是否属于该租户
   */
  belongsToTenant(tenantId: ITenantId): boolean;

  /**
   * 检查是否属于指定组织
   * @param orgId 组织标识符
   * @returns 是否属于该组织
   */
  belongsToOrganization(orgId: IOrganizationId): boolean;

  /**
   * 检查是否属于指定部门
   * @param deptId 部门标识符
   * @returns 是否属于该部门
   */
  belongsToDepartment(deptId: IDepartmentId): boolean;

  /**
   * 验证租户隔离规则
   * @param context 租户上下文
   * @returns 是否符合隔离规则
   */
  validateTenantIsolation(context: ITenantContext): boolean;
}

/**
 * 租户隔离聚合根接口
 * @description 支持租户隔离的聚合根基类接口
 * @template T 聚合根类型（通常继承自 AggregateRoot）
 */
export interface ITenantIsolatedAggregateRoot<T = unknown>
  extends ITenantIsolatedEntity<T> {
  /**
   * 添加领域事件（自动包含租户信息）
   * @param event 领域事件对象
   */
  addDomainEventWithTenant(event: {
    type: string;
    aggregateRootId: string;
    timestamp: Date;
    data: unknown;
  }): void;
}
