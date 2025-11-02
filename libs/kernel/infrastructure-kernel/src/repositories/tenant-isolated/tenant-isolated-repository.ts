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
  ITenantIsolatedRepository,
  TenantIsolatedEntity,
} from "@hl8/domain-kernel";
import { MikroORMRepository } from "../base/repository.base.js";
import { TenantIsolatedPersistenceEntity } from "../../entities/base/tenant-isolated-persistence-entity.js";

/**
 * MikroORM租户隔离仓储实现
 * @description 正式实现 ITenantIsolatedRepository 接口，提供租户隔离仓储功能
 * @template T 实体类型，必须继承TenantIsolatedPersistenceEntity
 * @note 此实现适配基础设施层的持久化实体，而非领域实体。
 * 通过类型适配，将持久化实体适配为领域实体类型以满足接口约束。
 * 实际使用中，需要通过实体映射器在领域实体和持久化实体之间转换。
 * @implements {ITenantIsolatedRepository<TDomain>} 其中 TDomain 为对应的领域实体类型
 */
export class MikroORMTenantIsolatedRepository<
  T extends TenantIsolatedPersistenceEntity,
  TDomain extends TenantIsolatedEntity = TenantIsolatedEntity,
> extends MikroORMRepository<T> {
  // 注意：此类型实现了 ITenantIsolatedRepository<TDomain> 接口的所有方法
  // 但由于 TypeScript 类型系统限制（父类方法返回类型不能改变），
  // 我们通过类型适配而不是直接的 implements 关键字来确保接口兼容性。
  // 所有 ITenantIsolatedRepository 的方法签名均已实现并匹配接口定义。
  /**
   * 创建租户隔离仓储实例
   * @param em - MikroORM EntityManager实例
   * @param entityName - 实体类名称
   */
  constructor(em: EntityManager, entityName: string) {
    super(em, entityName);
  }

  // 注意：findById, save, delete, exists 方法继承自父类 MikroORMRepository<T>
  // 这些方法在接口 ITenantIsolatedRepository<TDomain> 中期望返回 TDomain 类型。
  // 由于 TypeScript 类型系统限制，我们不能通过重写来改变返回类型。
  // 在实际使用中，这些方法会返回持久化实体 T，需要通过实体映射器转换为领域实体 TDomain。
  // 对于接口兼容性，我们在使用处通过类型断言来适配类型。

  /**
   * 删除实体（继承父类实现）
   * @description 删除实体，继承自父类实现
   * @param id - 实体标识符
   * @returns Promise<void>
   * @throws {RepositoryOperationFailedException} 当删除失败时抛出
   */
  // 继承父类的 delete 方法，类型兼容

  /**
   * 检查实体是否存在（继承父类实现）
   * @description 检查实体是否存在，继承自父类实现
   * @param id - 实体标识符
   * @returns 是否存在
   * @throws {RepositoryOperationFailedException} 当检查失败时抛出
   */
  // 继承父类的 exists 方法，类型兼容

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
  ): Promise<TDomain | null> {
    try {
      // 使用父类方法获取持久化实体以验证访问权限
      const entity = await super.findById(id);
      if (!entity) {
        return null;
      }
      // 验证租户访问权限
      this.validateTenantAccess(entity, context);

      // 类型断言：持久化实体适配为领域实体
      // TODO: User Story 2 中将通过实体映射器进行实际转换
      return entity as unknown as TDomain;
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
  async findAllByContext(context: TenantContext): Promise<TDomain[]> {
    try {
      const filters = this.buildTenantFilters(context);
      const entities = await this.em.find(this.entityName, filters);
      // 类型断言：持久化实体适配为领域实体
      // TODO: User Story 2 中将通过实体映射器进行实际转换
      return entities as unknown as TDomain[];
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
  async findByTenant(
    tenantId: TenantId,
    context: TenantContext,
  ): Promise<TDomain[]> {
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
      // 类型断言：持久化实体适配为领域实体
      // TODO: User Story 2 中将通过实体映射器进行实际转换
      return entities as unknown as TDomain[];
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
  ): Promise<TDomain[]> {
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
      // 类型断言：持久化实体适配为领域实体
      // TODO: User Story 2 中将通过实体映射器进行实际转换
      return entities as unknown as TDomain[];
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
  ): Promise<TDomain[]> {
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
      // 类型断言：持久化实体适配为领域实体
      // TODO: User Story 2 中将通过实体映射器进行实际转换
      return entities as unknown as TDomain[];
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
      // 使用父类方法获取持久化实体以访问属性
      const entity = await super.findById(id);
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
      // 使用父类方法获取持久化实体以访问属性
      const entity = await super.findById(id);
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
      // 使用父类方法获取持久化实体以访问属性
      const entity = await super.findById(id);
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
  ): Promise<TDomain | null> {
    // 验证是否允许跨租户访问
    if (!context.isCrossTenant) {
      throw new BusinessException(
        "不允许跨租户访问，需要管理员权限",
        "CROSS_TENANT_ACCESS_DENIED",
      );
    }

    try {
      // 使用父类方法获取持久化实体
      const entity = await super.findById(id);
      // 类型断言：持久化实体适配为领域实体
      // TODO: User Story 2 中将通过实体映射器进行实际转换
      return entity ? (entity as unknown as TDomain) : null;
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

/**
 * 将 MikroORMTenantIsolatedRepository 转换为 ITenantIsolatedRepository 接口类型
 * @description 提供类型安全的接口转换。由于类型系统限制，此函数提供类型断言以适配接口
 * @param repository 仓储实例
 * @returns 接口类型的仓储实例
 */
export function asITenantIsolatedRepository<
  T extends TenantIsolatedPersistenceEntity,
  TDomain extends TenantIsolatedEntity,
>(
  repository: MikroORMTenantIsolatedRepository<T, TDomain>,
): ITenantIsolatedRepository<TDomain> {
  return repository as unknown as ITenantIsolatedRepository<TDomain>;
}
