/**
 * @fileoverview 租户权限验证器实现
 * @description 实现租户权限验证逻辑
 */

import { Injectable } from "@nestjs/common";
import type {
  TenantContext,
  TenantId,
  OrganizationId,
  DepartmentId,
} from "@hl8/domain-kernel";
import type { ITenantPermissionValidator } from "./tenant-permission-validator.interface.js";

/**
 * 租户权限验证器实现
 * @description 实现租户访问权限验证逻辑
 */
@Injectable()
export class TenantPermissionValidatorImpl
  implements ITenantPermissionValidator
{
  /**
   * 验证租户访问权限
   * @param context 租户上下文
   * @param tenantId 要访问的租户ID
   * @returns 是否允许访问
   */
  async validateTenantAccess(
    context: TenantContext,
    tenantId: TenantId,
  ): Promise<boolean> {
    // 使用TenantContext的内置方法进行验证
    return context.canAccessTenant(tenantId);
  }

  /**
   * 验证组织访问权限
   * @param context 租户上下文
   * @param orgId 要访问的组织ID
   * @returns 是否允许访问
   */
  async validateOrganizationAccess(
    context: TenantContext,
    orgId: OrganizationId,
  ): Promise<boolean> {
    return context.canAccessOrganization(orgId);
  }

  /**
   * 验证部门访问权限
   * @param context 租户上下文
   * @param deptId 要访问的部门ID
   * @returns 是否允许访问
   */
  async validateDepartmentAccess(
    context: TenantContext,
    deptId: DepartmentId,
  ): Promise<boolean> {
    return context.canAccessDepartment(deptId);
  }

  /**
   * 验证跨租户访问权限
   * @param context 租户上下文
   * @returns 是否允许跨租户访问
   */
  async validateCrossTenantAccess(context: TenantContext): Promise<boolean> {
    return context.isCrossTenant;
  }

  /**
   * 验证指定权限
   * @param context 租户上下文
   * @param permission 权限名称
   * @returns 是否拥有该权限
   */
  async validatePermission(
    context: TenantContext,
    permission: string,
  ): Promise<boolean> {
    return context.hasPermission(permission);
  }
}
