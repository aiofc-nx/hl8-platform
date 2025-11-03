/**
 * @fileoverview 租户上下文中间件接口定义
 * @description 定义租户上下文提取器和中间件的接口
 */

import { ITenantContext } from "./context.js";

/**
 * 租户上下文提取器接口
 * @description 定义从各种来源提取租户上下文的接口
 */
export interface ITenantContextExtractor {
  /**
   * 从HTTP请求中提取租户上下文
   * @param request HTTP请求对象
   * @returns 租户上下文或null（如果提取失败）
   */
  extractFromRequest(request: unknown): Promise<ITenantContext | null>;

  /**
   * 从JWT Token中提取租户上下文
   * @param token JWT Token字符串
   * @returns 租户上下文或null（如果提取失败）
   */
  extractFromToken(token: string): Promise<ITenantContext | null>;

  /**
   * 从用户信息中提取租户上下文
   * @param userId 用户ID
   * @returns 租户上下文或null（如果提取失败）
   */
  extractFromUser(userId: string): Promise<ITenantContext | null>;

  /**
   * 从HTTP请求头中提取租户上下文
   * @param headers HTTP请求头对象
   * @returns 租户上下文或null（如果提取失败）
   */
  extractFromHeader(
    headers: Record<string, string>,
  ): Promise<ITenantContext | null>;
}

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
    context: ITenantContext,
    tenantId: import("./identifiers.js").ITenantId,
  ): Promise<boolean>;

  /**
   * 验证组织访问权限
   * @param context 租户上下文
   * @param orgId 要访问的组织ID
   * @returns 是否允许访问
   */
  validateOrganizationAccess(
    context: ITenantContext,
    orgId: import("./identifiers.js").IOrganizationId,
  ): Promise<boolean>;

  /**
   * 验证部门访问权限
   * @param context 租户上下文
   * @param deptId 要访问的部门ID
   * @returns 是否允许访问
   */
  validateDepartmentAccess(
    context: ITenantContext,
    deptId: import("./identifiers.js").IDepartmentId,
  ): Promise<boolean>;

  /**
   * 验证跨租户访问权限
   * @param context 租户上下文
   * @returns 是否允许跨租户访问
   */
  validateCrossTenantAccess(context: ITenantContext): Promise<boolean>;

  /**
   * 验证指定权限
   * @param context 租户上下文
   * @param permission 权限名称
   * @returns 是否拥有该权限
   */
  validatePermission(
    context: ITenantContext,
    permission: string,
  ): Promise<boolean>;
}
