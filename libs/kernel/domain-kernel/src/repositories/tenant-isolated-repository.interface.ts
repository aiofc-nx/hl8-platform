/**
 * @fileoverview 租户隔离仓储接口定义
 * @description 定义支持租户隔离的仓储接口，扩展标准仓储接口
 */

import { IRepository } from "./repository.interface.js";
import { TenantId } from "../identifiers/tenant-id.js";
import { OrganizationId } from "../identifiers/organization-id.js";
import { DepartmentId } from "../identifiers/department-id.js";
import { TenantContext } from "../context/tenant-context.js";
import { TenantIsolatedEntity } from "../entities/base/tenant-isolated-entity.base.js";
import { EntityId } from "../identifiers/entity-id.js";

/**
 * 租户隔离仓储接口
 * @description 支持租户隔离的仓储接口，扩展标准仓储接口
 * @template T 实体类型，必须继承 TenantIsolatedEntity
 */
export interface ITenantIsolatedRepository<T extends TenantIsolatedEntity>
  extends IRepository<T> {
  /**
   * 根据ID和租户上下文查找实体
   * @description 自动应用租户隔离过滤，确保只能访问当前租户的数据
   * @param id 实体标识符
   * @param context 租户上下文
   * @returns 实体实例或null
   * @throws {RepositoryException} 当查找失败时抛出
   */
  findByIdWithContext(id: EntityId, context: TenantContext): Promise<T | null>;

  /**
   * 根据租户上下文查找所有实体
   * @description 根据上下文中的租户、组织、部门信息查找所有符合条件的实体
   * @param context 租户上下文
   * @returns 实体数组
   * @throws {RepositoryException} 当查询失败时抛出
   */
  findAllByContext(context: TenantContext): Promise<T[]>;

  /**
   * 根据租户查找所有实体
   * @description 查找指定租户下的所有实体
   * @param tenantId 租户标识符
   * @param context 租户上下文（用于权限验证）
   * @returns 实体数组
   * @throws {RepositoryException} 当查询失败时抛出
   */
  findByTenant(tenantId: TenantId, context: TenantContext): Promise<T[]>;

  /**
   * 根据组织查找所有实体
   * @description 查找指定组织下的所有实体，使用严格匹配（不包含子组织）
   * @param orgId 组织标识符
   * @param context 租户上下文（用于权限验证）
   * @returns 实体数组
   * @throws {RepositoryException} 当查询失败时抛出
   */
  findByOrganization(
    orgId: OrganizationId,
    context: TenantContext,
  ): Promise<T[]>;

  /**
   * 根据部门查找所有实体
   * @description 查找指定部门下的所有实体，使用严格匹配（不包含子部门）
   * @param deptId 部门标识符
   * @param context 租户上下文（用于权限验证）
   * @returns 实体数组
   * @throws {RepositoryException} 当查询失败时抛出
   */
  findByDepartment(deptId: DepartmentId, context: TenantContext): Promise<T[]>;

  /**
   * 检查实体是否属于指定租户
   * @description 验证实体的租户ID是否匹配
   * @param id 实体标识符
   * @param tenantId 租户标识符
   * @returns 是否属于该租户
   * @throws {RepositoryException} 当检查失败时抛出
   */
  belongsToTenant(id: EntityId, tenantId: TenantId): Promise<boolean>;

  /**
   * 检查实体是否属于指定组织
   * @description 验证实体的组织ID是否匹配
   * @param id 实体标识符
   * @param orgId 组织标识符
   * @returns 是否属于该组织
   * @throws {RepositoryException} 当检查失败时抛出
   */
  belongsToOrganization(id: EntityId, orgId: OrganizationId): Promise<boolean>;

  /**
   * 检查实体是否属于指定部门
   * @description 验证实体的部门ID是否匹配
   * @param id 实体标识符
   * @param deptId 部门标识符
   * @returns 是否属于该部门
   * @throws {RepositoryException} 当检查失败时抛出
   */
  belongsToDepartment(id: EntityId, deptId: DepartmentId): Promise<boolean>;

  /**
   * 跨租户查询（需要管理员权限）
   * @description 允许跨租户访问，需要上下文包含跨租户权限
   * @param id 实体标识符
   * @param context 租户上下文（必须包含跨租户权限）
   * @returns 实体实例或null
   * @throws {RepositoryException} 当查询失败或权限不足时抛出
   */
  findByIdCrossTenant(id: EntityId, context: TenantContext): Promise<T | null>;

  /**
   * 统计租户下的实体数量
   * @description 统计指定租户下的实体总数
   * @param tenantId 租户标识符
   * @param context 租户上下文
   * @returns 实体数量
   * @throws {RepositoryException} 当统计失败时抛出
   */
  countByTenant(tenantId: TenantId, context: TenantContext): Promise<number>;

  /**
   * 统计组织下的实体数量
   * @description 统计指定组织下的实体总数
   * @param orgId 组织标识符
   * @param context 租户上下文
   * @returns 实体数量
   * @throws {RepositoryException} 当统计失败时抛出
   */
  countByOrganization(
    orgId: OrganizationId,
    context: TenantContext,
  ): Promise<number>;

  /**
   * 统计部门下的实体数量
   * @description 统计指定部门下的实体总数
   * @param deptId 部门标识符
   * @param context 租户上下文
   * @returns 实体数量
   * @throws {RepositoryException} 当统计失败时抛出
   */
  countByDepartment(
    deptId: DepartmentId,
    context: TenantContext,
  ): Promise<number>;
}
