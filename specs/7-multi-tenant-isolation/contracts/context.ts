/**
 * @fileoverview 租户上下文接口定义
 * @description 定义租户上下文的 TypeScript 接口和选项
 */

import { ITenantId } from "./identifiers.js";
import { IOrganizationId } from "./identifiers.js";
import { IDepartmentId } from "./identifiers.js";

/**
 * 租户上下文选项
 * @description 创建租户上下文时的配置选项
 */
export interface TenantContextOptions {
  /** 组织ID（可选） */
  organizationId?: IOrganizationId;
  /** 部门ID（可选） */
  departmentId?: IDepartmentId;
  /** 是否允许跨租户访问（默认false） */
  isCrossTenant?: boolean;
  /** 权限列表 */
  permissions?: string[];
  /** 用户ID（可选） */
  userId?: string;
}

/**
 * 租户上下文接口
 * @description 封装当前请求的租户和多层级隔离信息
 */
export interface ITenantContext {
  /**
   * 获取租户ID
   * @returns 租户标识符
   */
  readonly tenantId: ITenantId;

  /**
   * 获取组织ID
   * @returns 组织标识符或undefined
   */
  readonly organizationId?: IOrganizationId;

  /**
   * 获取部门ID
   * @returns 部门标识符或undefined
   */
  readonly departmentId?: IDepartmentId;

  /**
   * 是否允许跨租户访问
   * @returns 是否允许跨租户访问
   */
  readonly isCrossTenant: boolean;

  /**
   * 获取权限列表
   * @returns 权限字符串数组
   */
  readonly permissions: string[];

  /**
   * 检查是否拥有指定权限
   * @param permission 权限名称
   * @returns 是否拥有该权限
   */
  hasPermission(permission: string): boolean;

  /**
   * 检查是否可以访问指定租户
   * @param tenantId 租户标识符
   * @returns 是否可以访问
   */
  canAccessTenant(tenantId: ITenantId): boolean;

  /**
   * 检查是否可以访问指定组织
   * @param orgId 组织标识符
   * @returns 是否可以访问
   */
  canAccessOrganization(orgId: IOrganizationId): boolean;

  /**
   * 检查是否可以访问指定部门
   * @param deptId 部门标识符
   * @returns 是否可以访问
   */
  canAccessDepartment(deptId: IDepartmentId): boolean;

  /**
   * 验证上下文有效性
   * @returns 是否有效
   */
  validate(): boolean;

  /**
   * 创建上下文副本
   * @returns 新的上下文实例
   */
  clone(): ITenantContext;

  /**
   * 序列化为JSON
   * @returns JSON对象
   */
  toJSON(): object;
}
