/**
 * @fileoverview 租户权限验证器接口
 * @description 定义租户权限验证的接口
 */

import type {
  TenantContext,
  TenantId,
  OrganizationId,
  DepartmentId,
} from "@hl8/domain-kernel";

/**
 * 租户权限验证器接口
 * @description 定义租户权限验证的接口
 */
export interface ITenantPermissionValidator {
  /**
   * 验证租户访问权限
   * @param context 租户上下文
   * @param tenantId 要访问的租户ID
   * @returns 是否允许访问
   */
  validateTenantAccess(
    context: TenantContext,
    tenantId: TenantId,
  ): Promise<boolean>;

  /**
   * 验证组织访问权限
   * @param context 租户上下文
   * @param orgId 要访问的组织ID
   * @returns 是否允许访问
   */
  validateOrganizationAccess(
    context: TenantContext,
    orgId: OrganizationId,
  ): Promise<boolean>;

  /**
   * 验证部门访问权限
   * @param context 租户上下文
   * @param deptId 要访问的部门ID
   * @returns 是否允许访问
   */
  validateDepartmentAccess(
    context: TenantContext,
    deptId: DepartmentId,
  ): Promise<boolean>;

  /**
   * 验证跨租户访问权限
   * @param context 租户上下文
   * @returns 是否允许跨租户访问
   */
  validateCrossTenantAccess(context: TenantContext): Promise<boolean>;

  /**
   * 验证指定权限
   * @param context 租户上下文
   * @param permission 权限名称
   * @returns 是否拥有该权限
   */
  validatePermission(
    context: TenantContext,
    permission: string,
  ): Promise<boolean>;
}
