/**
 * @fileoverview MikroORM租户隔离仓储实现
 * @description 提供支持租户、组织、部门级别数据隔离的仓储实现
 */

import { EntityManager } from "@mikro-orm/core";
import {
  TenantContext,
  TenantId,
  OrganizationId,
  DepartmentId,
  EntityId,
  RepositoryOperationFailedException,
  BusinessException,
} from "@hl8/domain-kernel";
import { MikroORMRepository } from "../base/repository.base.js";
import { TenantIsolatedPersistenceEntity } from "../../entities/base/tenant-isolated-persistence-entity.js";

/**
 * MikroORM租户隔离仓储实现
 * @description 扩展MikroORMRepository，提供租户隔离仓储功能
 * @template T 实体类型，必须继承TenantIsolatedPersistenceEntity
 * @note 此实现适配基础设施层的持久化实体，而非领域实体
 * 注意：为避免类型约束冲突，暂时不直接实现ITenantIsolatedRepository接口
 */
export class MikroORMTenantIsolatedRepository<
  T extends TenantIsolatedPersistenceEntity,
> extends MikroORMRepository<T> {
  /**
   * 创建租户隔离仓储实例
   * @param em - MikroORM EntityManager实例
   * @param entityName - 实体类名称
   */
  constructor(em: EntityManager, entityName: string) {
    super(em, entityName);
  }

  /**
   * 根据ID和租户上下文查找实体
   * @description 自动应用租户隔离过滤，确保只能访问当前租户的数据
   * @param id - 实体标识符
   * @param context - 租户上下文
   * @returns 实体实例或null
   * @throws {RepositoryOperationFailedException} 当查找失败时抛出
   * @throws {UnauthorizedAccessException} 当跨租户访问时抛出
   */
  async findByIdWithContext(
    id: EntityId,
    context: TenantContext,
  ): Promise<T | null> {
    try {
      // 先查找实体
      const entity = await this.findById(id);
      if (!entity) {
        return null;
      }

      // 验证租户访问权限
      this.validateTenantAccess(entity, context);

      return entity;
    } catch (error) {
      if (error instanceof BusinessException) {
        throw error;
      }
      throw new RepositoryOperationFailedException(
        "findByIdWithContext",
        this.entityName,
        id.value,
        error instanceof Error ? error : undefined,
      );
    }
  }

  /**
   * 根据租户上下文查找所有实体
   * @description 根据上下文中的租户、组织、部门信息查找所有符合条件的实体
   * @param context - 租户上下文
   * @returns 实体数组
   * @throws {RepositoryOperationFailedException} 当查询失败时抛出
   */
  async findAllByContext(context: TenantContext): Promise<T[]> {
    try {
      const filters = this.buildTenantFilters(context);
      const entities = await this.em.find(this.entityName, filters);
      return entities as T[];
    } catch (error) {
      throw new RepositoryOperationFailedException(
        "findAllByContext",
        this.entityName,
        undefined,
        error instanceof Error ? error : undefined,
      );
    }
  }

  /**
   * 根据租户查找所有实体
   * @description 查找指定租户下的所有实体
   * @param tenantId - 租户标识符
   * @param context - 租户上下文（用于权限验证）
   * @returns 实体数组
   * @throws {RepositoryOperationFailedException} 当查询失败时抛出
   * @throws {UnauthorizedAccessException} 当权限不足时抛出
   */
  async findByTenant(tenantId: TenantId, context: TenantContext): Promise<T[]> {
    // 验证是否有权限访问该租户
    if (!context.canAccessTenant(tenantId)) {
      throw new BusinessException(
        `无权访问租户: ${tenantId.value}`,
        "UNAUTHORIZED_TENANT_ACCESS",
      );
    }

    try {
      const filters: any = { tenantId: tenantId.value };
      const entities = await this.em.find(this.entityName, filters);
      return entities as T[];
    } catch (error) {
      throw new RepositoryOperationFailedException(
        "findByTenant",
        this.entityName,
        undefined,
        error instanceof Error ? error : undefined,
      );
    }
  }

  /**
   * 根据组织查找所有实体
   * @description 查找指定组织下的所有实体，使用严格匹配（不包含子组织）
   * @param orgId - 组织标识符
   * @param context - 租户上下文（用于权限验证）
   * @returns 实体数组
   * @throws {RepositoryOperationFailedException} 当查询失败时抛出
   * @throws {UnauthorizedAccessException} 当权限不足时抛出
   */
  async findByOrganization(
    orgId: OrganizationId,
    context: TenantContext,
  ): Promise<T[]> {
    // 验证是否有权限访问该组织
    if (!context.canAccessOrganization(orgId)) {
      throw new BusinessException(
        `无权访问组织: ${orgId.value}`,
        "UNAUTHORIZED_ORGANIZATION_ACCESS",
      );
    }

    try {
      const filters: any = {
        tenantId: orgId.tenantId.value,
        organizationId: orgId.value,
      };
      const entities = await this.em.find(this.entityName, filters);
      return entities as T[];
    } catch (error) {
      throw new RepositoryOperationFailedException(
        "findByOrganization",
        this.entityName,
        undefined,
        error instanceof Error ? error : undefined,
      );
    }
  }

  /**
   * 根据部门查找所有实体
   * @description 查找指定部门下的所有实体，使用严格匹配（不包含子部门）
   * @param deptId - 部门标识符
   * @param context - 租户上下文（用于权限验证）
   * @returns 实体数组
   * @throws {RepositoryOperationFailedException} 当查询失败时抛出
   * @throws {UnauthorizedAccessException} 当权限不足时抛出
   */
  async findByDepartment(
    deptId: DepartmentId,
    context: TenantContext,
  ): Promise<T[]> {
    // 验证是否有权限访问该部门
    if (!context.canAccessDepartment(deptId)) {
      throw new BusinessException(
        `无权访问部门: ${deptId.value}`,
        "UNAUTHORIZED_DEPARTMENT_ACCESS",
      );
    }

    try {
      const filters: any = {
        tenantId: deptId.organizationId.tenantId.value,
        organizationId: deptId.organizationId.value,
        departmentId: deptId.value,
      };
      const entities = await this.em.find(this.entityName, filters);
      return entities as T[];
    } catch (error) {
      throw new RepositoryOperationFailedException(
        "findByDepartment",
        this.entityName,
        undefined,
        error instanceof Error ? error : undefined,
      );
    }
  }

  /**
   * 检查实体是否属于指定租户
   * @description 验证实体的租户ID是否匹配
   * @param id - 实体标识符
   * @param tenantId - 租户标识符
   * @returns 是否属于该租户
   * @throws {RepositoryOperationFailedException} 当检查失败时抛出
   */
  async belongsToTenant(id: EntityId, tenantId: TenantId): Promise<boolean> {
    try {
      const entity = await this.findById(id);
      if (!entity) {
        return false;
      }
      return entity.tenantId === tenantId.value;
    } catch (error) {
      throw new RepositoryOperationFailedException(
        "belongsToTenant",
        this.entityName,
        id.value,
        error instanceof Error ? error : undefined,
      );
    }
  }

  /**
   * 检查实体是否属于指定组织
   * @description 验证实体的组织ID是否匹配
   * @param id - 实体标识符
   * @param orgId - 组织标识符
   * @returns 是否属于该组织
   * @throws {RepositoryOperationFailedException} 当检查失败时抛出
   */
  async belongsToOrganization(
    id: EntityId,
    orgId: OrganizationId,
  ): Promise<boolean> {
    try {
      const entity = await this.findById(id);
      if (!entity) {
        return false;
      }
      return (
        entity.tenantId === orgId.tenantId.value &&
        entity.organizationId === orgId.value
      );
    } catch (error) {
      throw new RepositoryOperationFailedException(
        "belongsToOrganization",
        this.entityName,
        id.value,
        error instanceof Error ? error : undefined,
      );
    }
  }

  /**
   * 检查实体是否属于指定部门
   * @description 验证实体的部门ID是否匹配
   * @param id - 实体标识符
   * @param deptId - 部门标识符
   * @returns 是否属于该部门
   * @throws {RepositoryOperationFailedException} 当检查失败时抛出
   */
  async belongsToDepartment(
    id: EntityId,
    deptId: DepartmentId,
  ): Promise<boolean> {
    try {
      const entity = await this.findById(id);
      if (!entity) {
        return false;
      }
      return (
        entity.tenantId === deptId.organizationId.tenantId.value &&
        entity.organizationId === deptId.organizationId.value &&
        entity.departmentId === deptId.value
      );
    } catch (error) {
      throw new RepositoryOperationFailedException(
        "belongsToDepartment",
        this.entityName,
        id.value,
        error instanceof Error ? error : undefined,
      );
    }
  }

  /**
   * 跨租户查询（需要管理员权限）
   * @description 允许跨租户访问，需要上下文包含跨租户权限
   * @param id - 实体标识符
   * @param context - 租户上下文（必须包含跨租户权限）
   * @returns 实体实例或null
   * @throws {RepositoryOperationFailedException} 当查询失败或权限不足时抛出
   * @throws {UnauthorizedAccessException} 当权限不足时抛出
   */
  async findByIdCrossTenant(
    id: EntityId,
    context: TenantContext,
  ): Promise<T | null> {
    // 验证是否允许跨租户访问
    if (!context.isCrossTenant) {
      throw new BusinessException(
        "不允许跨租户访问，需要管理员权限",
        "CROSS_TENANT_ACCESS_DENIED",
      );
    }

    try {
      return await this.findById(id);
    } catch (error) {
      if (error instanceof BusinessException) {
        throw error;
      }
      throw new RepositoryOperationFailedException(
        "findByIdCrossTenant",
        this.entityName,
        id.value,
        error instanceof Error ? error : undefined,
      );
    }
  }

  /**
   * 统计租户下的实体数量
   * @description 统计指定租户下的实体总数
   * @param tenantId - 租户标识符
   * @param context - 租户上下文
   * @returns 实体数量
   * @throws {RepositoryOperationFailedException} 当统计失败时抛出
   * @throws {UnauthorizedAccessException} 当权限不足时抛出
   */
  async countByTenant(
    tenantId: TenantId,
    context: TenantContext,
  ): Promise<number> {
    // 验证是否有权限访问该租户
    if (!context.canAccessTenant(tenantId)) {
      throw new BusinessException(
        `无权访问租户: ${tenantId.value}`,
        "UNAUTHORIZED_TENANT_ACCESS",
      );
    }

    try {
      const filters = { tenantId: tenantId.value };
      const count = await this.em.count(this.entityName, filters);
      return count;
    } catch (error) {
      throw new RepositoryOperationFailedException(
        "countByTenant",
        this.entityName,
        undefined,
        error instanceof Error ? error : undefined,
      );
    }
  }

  /**
   * 统计组织下的实体数量
   * @description 统计指定组织下的实体总数
   * @param orgId - 组织标识符
   * @param context - 租户上下文
   * @returns 实体数量
   * @throws {RepositoryOperationFailedException} 当统计失败时抛出
   * @throws {UnauthorizedAccessException} 当权限不足时抛出
   */
  async countByOrganization(
    orgId: OrganizationId,
    context: TenantContext,
  ): Promise<number> {
    // 验证是否有权限访问该组织
    if (!context.canAccessOrganization(orgId)) {
      throw new BusinessException(
        `无权访问组织: ${orgId.value}`,
        "UNAUTHORIZED_ORGANIZATION_ACCESS",
      );
    }

    try {
      const filters: any = {
        tenantId: orgId.tenantId.value,
        organizationId: orgId.value,
      };
      const count = await this.em.count(this.entityName, filters);
      return count;
    } catch (error) {
      throw new RepositoryOperationFailedException(
        "countByOrganization",
        this.entityName,
        undefined,
        error instanceof Error ? error : undefined,
      );
    }
  }

  /**
   * 统计部门下的实体数量
   * @description 统计指定部门下的实体总数
   * @param deptId - 部门标识符
   * @param context - 租户上下文
   * @returns 实体数量
   * @throws {RepositoryOperationFailedException} 当统计失败时抛出
   * @throws {UnauthorizedAccessException} 当权限不足时抛出
   */
  async countByDepartment(
    deptId: DepartmentId,
    context: TenantContext,
  ): Promise<number> {
    // 验证是否有权限访问该部门
    if (!context.canAccessDepartment(deptId)) {
      throw new BusinessException(
        `无权访问部门: ${deptId.value}`,
        "UNAUTHORIZED_DEPARTMENT_ACCESS",
      );
    }

    try {
      const filters: any = {
        tenantId: deptId.organizationId.tenantId.value,
        organizationId: deptId.organizationId.value,
        departmentId: deptId.value,
      };
      const count = await this.em.count(this.entityName, filters);
      return count;
    } catch (error) {
      throw new RepositoryOperationFailedException(
        "countByDepartment",
        this.entityName,
        undefined,
        error instanceof Error ? error : undefined,
      );
    }
  }

  /**
   * 构建租户过滤条件
   * @description 根据TenantContext构建MikroORM查询过滤条件
   * @param context - 租户上下文
   * @returns 过滤条件对象
   */
  private buildTenantFilters(context: TenantContext): Record<string, any> {
    const filters: any = { tenantId: context.tenantId.value };

    if (context.organizationId) {
      filters.organizationId = context.organizationId.value;
    }

    if (context.departmentId) {
      filters.departmentId = context.departmentId.value;
    }

    return filters;
  }

  /**
   * 验证租户访问权限
   * @description 检查实体是否属于当前租户上下文
   * @param entity - 实体实例
   * @param context - 租户上下文
   * @throws {UnauthorizedAccessException} 当访问越界时抛出
   */
  private validateTenantAccess(entity: T, context: TenantContext): void {
    // 检查跨租户访问权限
    if (context.isCrossTenant) {
      return;
    }

    // 验证租户ID匹配
    if (entity.tenantId !== context.tenantId.value) {
      throw new BusinessException(
        `无权访问实体: 实体不属于租户 ${context.tenantId.value}`,
        "UNAUTHORIZED_ENTITY_ACCESS",
      );
    }

    // 如果上下文有组织ID，验证组织匹配
    if (context.organizationId) {
      if (entity.organizationId !== context.organizationId.value) {
        throw new BusinessException(
          `无权访问实体: 实体不属于组织 ${context.organizationId.value}`,
          "UNAUTHORIZED_ENTITY_ACCESS",
        );
      }
    }

    // 如果上下文有部门ID，验证部门匹配
    if (context.departmentId) {
      if (entity.departmentId !== context.departmentId.value) {
        throw new BusinessException(
          `无权访问实体: 实体不属于部门 ${context.departmentId.value}`,
          "UNAUTHORIZED_ENTITY_ACCESS",
        );
      }
    }
  }
}
