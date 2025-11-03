/**
 * @fileoverview 租户隔离仓储接口定义
 * @description 定义支持租户隔离的仓储接口
 */

import { ITenantId } from "./identifiers.js";
import { IOrganizationId } from "./identifiers.js";
import { IDepartmentId } from "./identifiers.js";
import { ITenantContext } from "./context.js";
import { ITenantIsolatedEntity } from "./entities.js";

/**
 * 实体标识符接口（占位符，实际应使用项目中的 EntityId）
 */
export interface IEntityId {
  readonly value: string;
  equals(other: IEntityId | null | undefined): boolean;
  isValid(): boolean;
  clone(): IEntityId;
}

/**
 * 租户隔离仓储接口
 * @description 支持租户隔离的仓储接口，扩展标准仓储接口
 * @template T 实体类型，必须实现 ITenantIsolatedEntity
 */
export interface ITenantIsolatedRepository<T extends ITenantIsolatedEntity> {
  /**
   * 根据ID查找实体（自动应用租户过滤）
   * @param id 实体标识符
   * @returns 实体实例或null
   */
  findById(id: IEntityId): Promise<T | null>;

  /**
   * 根据ID和租户上下文查找实体
   * @param id 实体标识符
   * @param context 租户上下文
   * @returns 实体实例或null
   */
  findByIdWithContext(
    id: IEntityId,
    context: ITenantContext,
  ): Promise<T | null>;

  /**
   * 根据租户上下文查找所有实体
   * @param context 租户上下文
   * @returns 实体数组
   */
  findAllByContext(context: ITenantContext): Promise<T[]>;

  /**
   * 根据租户查找所有实体
   * @param tenantId 租户标识符
   * @param context 租户上下文（用于权限验证）
   * @returns 实体数组
   */
  findByTenant(tenantId: ITenantId, context: ITenantContext): Promise<T[]>;

  /**
   * 根据组织查找所有实体
   * @param orgId 组织标识符
   * @param context 租户上下文（用于权限验证）
   * @returns 实体数组
   */
  findByOrganization(
    orgId: IOrganizationId,
    context: ITenantContext,
  ): Promise<T[]>;

  /**
   * 根据部门查找所有实体
   * @param deptId 部门标识符
   * @param context 租户上下文（用于权限验证）
   * @returns 实体数组
   */
  findByDepartment(
    deptId: IDepartmentId,
    context: ITenantContext,
  ): Promise<T[]>;

  /**
   * 保存实体（自动验证租户隔离）
   * @param entity 实体实例
   */
  save(entity: T): Promise<void>;

  /**
   * 删除实体（自动验证租户隔离）
   * @param id 实体标识符
   */
  delete(id: IEntityId): Promise<void>;

  /**
   * 检查实体是否存在（自动应用租户过滤）
   * @param id 实体标识符
   * @returns 是否存在
   */
  exists(id: IEntityId): Promise<boolean>;

  /**
   * 检查实体是否属于指定租户
   * @param id 实体标识符
   * @param tenantId 租户标识符
   * @returns 是否属于该租户
   */
  belongsToTenant(id: IEntityId, tenantId: ITenantId): Promise<boolean>;

  /**
   * 检查实体是否属于指定组织
   * @param id 实体标识符
   * @param orgId 组织标识符
   * @returns 是否属于该组织
   */
  belongsToOrganization(
    id: IEntityId,
    orgId: IOrganizationId,
  ): Promise<boolean>;

  /**
   * 检查实体是否属于指定部门
   * @param id 实体标识符
   * @param deptId 部门标识符
   * @returns 是否属于该部门
   */
  belongsToDepartment(id: IEntityId, deptId: IDepartmentId): Promise<boolean>;

  /**
   * 跨租户查询（需要管理员权限）
   * @param id 实体标识符
   * @param context 租户上下文（必须包含跨租户权限）
   * @returns 实体实例或null
   */
  findByIdCrossTenant(
    id: IEntityId,
    context: ITenantContext,
  ): Promise<T | null>;

  /**
   * 统计租户下的实体数量
   * @param tenantId 租户标识符
   * @param context 租户上下文
   * @returns 实体数量
   */
  countByTenant(tenantId: ITenantId, context: ITenantContext): Promise<number>;

  /**
   * 统计组织下的实体数量
   * @param orgId 组织标识符
   * @param context 租户上下文
   * @returns 实体数量
   */
  countByOrganization(
    orgId: IOrganizationId,
    context: ITenantContext,
  ): Promise<number>;

  /**
   * 统计部门下的实体数量
   * @param deptId 部门标识符
   * @param context 租户上下文
   * @returns 实体数量
   */
  countByDepartment(
    deptId: IDepartmentId,
    context: ITenantContext,
  ): Promise<number>;
}
