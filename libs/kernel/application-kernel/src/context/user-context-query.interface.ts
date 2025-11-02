/**
 * @fileoverview 用户上下文查询接口
 * @description 定义从用户信息查询租户上下文的接口
 */

/**
 * 用户租户上下文信息
 * @description 用户所属的租户、组织、部门信息和权限
 */
export interface UserTenantContext {
  /** 租户ID（必需） */
  tenantId: string;
  /** 组织ID（可选） */
  organizationId?: string;
  /** 部门ID（可选） */
  departmentId?: string;
  /** 权限列表（可选） */
  permissions?: string[];
  /** 是否允许跨租户访问（可选，默认false） */
  isCrossTenant?: boolean;
}

/**
 * 用户上下文查询接口
 * @description 提供根据用户ID查询租户上下文的能力
 * @note 此接口应由应用层或领域层的用户服务实现
 */
export interface IUserContextQuery {
  /**
   * 根据用户ID查询租户上下文信息
   * @param userId 用户ID（字符串格式的UUID）
   * @returns 用户租户上下文信息，如果用户不存在或查询失败则返回null
   * @throws {Error} 当查询过程中发生错误时抛出异常
   */
  queryUserTenantContext(userId: string): Promise<UserTenantContext | null>;
}
