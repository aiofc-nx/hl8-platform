/**
 * @fileoverview 部门仓储接口
 * @description 定义部门聚合根的数据访问接口
 */

import { IRepository } from "@hl8/domain-kernel";
import { Department } from "../aggregates/department.aggregate.js";
import { DepartmentNameValueObject } from "../value-objects/department-name.value-object.js";
import { DepartmentId, OrganizationId } from "@hl8/domain-kernel";

/**
 * 部门仓储接口
 * @description 提供部门聚合根的数据访问抽象，支持标准CRUD和业务查询
 */
export interface IDepartmentRepository extends IRepository<Department> {
  /**
   * 根据部门ID查找部门
   * @param departmentId 部门ID
   * @returns 部门聚合根或null
   * @throws {RepositoryException} 当查找失败时抛出
   */
  findByDepartmentId(departmentId: DepartmentId): Promise<Department | null>;

  /**
   * 根据组织ID和部门名称查找部门
   * @param organizationId 组织ID
   * @param name 部门名称值对象
   * @returns 部门聚合根或null
   * @throws {RepositoryException} 当查找失败时抛出
   */
  findByOrganizationIdAndName(
    organizationId: OrganizationId,
    name: DepartmentNameValueObject,
  ): Promise<Department | null>;

  /**
   * 根据组织ID查找所有部门
   * @param organizationId 组织ID
   * @returns 部门聚合根数组
   * @throws {RepositoryException} 当查找失败时抛出
   */
  findByOrganizationId(organizationId: OrganizationId): Promise<Department[]>;

  /**
   * 根据组织ID查找根部门
   * @param organizationId 组织ID
   * @returns 根部门聚合根或null
   * @throws {RepositoryException} 当查找失败时抛出
   */
  findRootByOrganizationId(
    organizationId: OrganizationId,
  ): Promise<Department | null>;

  /**
   * 检查部门名称在组织内是否已存在
   * @param organizationId 组织ID
   * @param name 部门名称值对象
   * @returns 是否存在
   * @throws {RepositoryException} 当检查失败时抛出
   */
  existsByOrganizationIdAndName(
    organizationId: OrganizationId,
    name: DepartmentNameValueObject,
  ): Promise<boolean>;
}
