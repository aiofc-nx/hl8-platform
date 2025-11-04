/**
 * @fileoverview 租户仓储接口
 * @description 定义租户聚合根的数据访问接口
 */

import { IRepository } from "@hl8/domain-kernel";
import { Tenant } from "../aggregates/tenant.aggregate.js";
import { TenantCodeValueObject } from "../value-objects/tenant-code.value-object.js";
import { TenantDomainValueObject } from "../value-objects/tenant-domain.value-object.js";
import { TenantId } from "@hl8/domain-kernel";

/**
 * 租户仓储接口
 * @description 提供租户聚合根的数据访问抽象，支持标准CRUD和业务查询
 */
export interface ITenantRepository extends IRepository<Tenant> {
  /**
   * 根据租户代码查找租户
   * @param code 租户代码值对象
   * @returns 租户聚合根或null
   * @throws {RepositoryException} 当查找失败时抛出
   */
  findByCode(code: TenantCodeValueObject): Promise<Tenant | null>;

  /**
   * 根据租户域名查找租户
   * @param domain 租户域名值对象
   * @returns 租户聚合根或null
   * @throws {RepositoryException} 当查找失败时抛出
   */
  findByDomain(domain: TenantDomainValueObject): Promise<Tenant | null>;

  /**
   * 根据租户ID查找租户
   * @param tenantId 租户ID
   * @returns 租户聚合根或null
   * @throws {RepositoryException} 当查找失败时抛出
   */
  findByTenantId(tenantId: TenantId): Promise<Tenant | null>;

  /**
   * 检查租户代码是否已存在
   * @param code 租户代码值对象
   * @returns 是否存在
   * @throws {RepositoryException} 当检查失败时抛出
   */
  existsByCode(code: TenantCodeValueObject): Promise<boolean>;

  /**
   * 检查租户域名是否已存在
   * @param domain 租户域名值对象
   * @returns 是否存在
   * @throws {RepositoryException} 当检查失败时抛出
   */
  existsByDomain(domain: TenantDomainValueObject): Promise<boolean>;
}
