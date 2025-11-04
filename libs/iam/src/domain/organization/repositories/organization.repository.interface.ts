/**
 * @fileoverview 组织仓储接口
 * @description 定义组织聚合根的数据访问接口
 */

import { IRepository } from "@hl8/domain-kernel";
import { Organization } from "../aggregates/organization.aggregate.js";
import { OrganizationNameValueObject } from "../value-objects/organization-name.value-object.js";
import { OrganizationId, TenantId } from "@hl8/domain-kernel";

/**
 * 组织仓储接口
 * @description 提供组织聚合根的数据访问抽象，支持标准CRUD和业务查询
 */
export interface IOrganizationRepository extends IRepository<Organization> {
  /**
   * 根据组织ID查找组织
   * @param organizationId 组织ID
   * @returns 组织聚合根或null
   * @throws {RepositoryException} 当查找失败时抛出
   */
  findByOrganizationId(
    organizationId: OrganizationId,
  ): Promise<Organization | null>;

  /**
   * 根据租户ID和组织名称查找组织
   * @param tenantId 租户ID
   * @param name 组织名称值对象
   * @returns 组织聚合根或null
   * @throws {RepositoryException} 当查找失败时抛出
   */
  findByTenantIdAndName(
    tenantId: TenantId,
    name: OrganizationNameValueObject,
  ): Promise<Organization | null>;

  /**
   * 根据租户ID查找所有组织
   * @param tenantId 租户ID
   * @returns 组织聚合根数组
   * @throws {RepositoryException} 当查找失败时抛出
   */
  findByTenantId(tenantId: TenantId): Promise<Organization[]>;

  /**
   * 检查组织名称在租户内是否已存在
   * @param tenantId 租户ID
   * @param name 组织名称值对象
   * @returns 是否存在
   * @throws {RepositoryException} 当检查失败时抛出
   */
  existsByTenantIdAndName(
    tenantId: TenantId,
    name: OrganizationNameValueObject,
  ): Promise<boolean>;

  /**
   * 统计租户内的组织数量
   * @param tenantId 租户ID
   * @returns 组织数量
   * @throws {RepositoryException} 当统计失败时抛出
   */
  countByTenantId(tenantId: TenantId): Promise<number>;
}
