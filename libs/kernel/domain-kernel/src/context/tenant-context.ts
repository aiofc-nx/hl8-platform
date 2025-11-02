/**
 * @fileoverview 租户上下文值对象
 * @description 封装当前请求的租户和多层级隔离信息，在整个请求生命周期中传递
 */

import { TenantId } from "../identifiers/tenant-id.js";
import { OrganizationId } from "../identifiers/organization-id.js";
import { DepartmentId } from "../identifiers/department-id.js";
import { EntityId } from "../identifiers/entity-id.js";

/**
 * 租户上下文选项
 * @description 创建租户上下文时的配置选项
 */
export interface TenantContextOptions {
  /** 组织ID（可选） */
  organizationId?: OrganizationId;
  /** 部门ID（可选） */
  departmentId?: DepartmentId;
  /** 是否允许跨租户访问（默认false） */
  isCrossTenant?: boolean;
  /** 权限列表 */
  permissions?: string[];
  /** 用户ID（可选） */
  userId?: EntityId | string;
}

/**
 * 租户上下文值对象
 * @description 封装当前请求的租户和多层级隔离信息
 */
export class TenantContext {
  private readonly _tenantId: TenantId;
  private readonly _organizationId?: OrganizationId;
  private readonly _departmentId?: DepartmentId;
  private readonly _isCrossTenant: boolean;
  private readonly _permissions: string[];
  private readonly _userId?: EntityId;
  private readonly _extractedAt: Date;

  /**
   * 创建租户上下文
   * @param tenantId 租户标识符（必需）
   * @param options 上下文选项
   * @throws {Error} 当上下文层级关系不一致时抛出异常
   */
  constructor(tenantId: TenantId, options?: TenantContextOptions) {
    if (!tenantId) {
      throw new Error("租户ID不能为空");
    }

    if (!tenantId.isValid()) {
      throw new Error("租户ID无效");
    }

    this._tenantId = tenantId;
    this._organizationId = options?.organizationId;
    this._departmentId = options?.departmentId;
    this._isCrossTenant = options?.isCrossTenant ?? false;
    this._permissions = options?.permissions ?? [];

    // 处理用户ID
    if (options?.userId) {
      if (typeof options.userId === "string") {
        this._userId = EntityId.fromString(options.userId);
      } else {
        this._userId = options.userId;
      }
    }

    this._extractedAt = new Date();

    // 验证层级一致性
    this.validateHierarchy();
  }

  /**
   * 获取租户ID
   * @returns 租户标识符
   */
  public get tenantId(): TenantId {
    return this._tenantId;
  }

  /**
   * 获取组织ID
   * @returns 组织标识符或undefined
   */
  public get organizationId(): OrganizationId | undefined {
    return this._organizationId;
  }

  /**
   * 获取部门ID
   * @returns 部门标识符或undefined
   */
  public get departmentId(): DepartmentId | undefined {
    return this._departmentId;
  }

  /**
   * 是否允许跨租户访问
   * @returns 是否允许跨租户访问
   */
  public get isCrossTenant(): boolean {
    return this._isCrossTenant;
  }

  /**
   * 获取权限列表
   * @returns 权限字符串数组的副本
   */
  public get permissions(): string[] {
    return [...this._permissions];
  }

  /**
   * 获取用户ID
   * @returns 用户标识符或undefined
   */
  public get userId(): EntityId | undefined {
    return this._userId;
  }

  /**
   * 获取上下文提取时间
   * @returns 提取时间
   */
  public get extractedAt(): Date {
    return new Date(this._extractedAt.getTime());
  }

  /**
   * 检查是否拥有指定权限
   * @param permission 权限名称
   * @returns 是否拥有该权限
   */
  public hasPermission(permission: string): boolean {
    return this._permissions.includes(permission);
  }

  /**
   * 检查是否可以访问指定租户
   * @param tenantId 租户标识符
   * @returns 是否可以访问
   */
  public canAccessTenant(tenantId: TenantId): boolean {
    // 如果允许跨租户访问，则允许访问任何租户
    if (this._isCrossTenant) {
      return true;
    }

    // 否则只能访问自己的租户
    return this._tenantId.equals(tenantId);
  }

  /**
   * 检查是否可以访问指定组织
   * @param orgId 组织标识符
   * @returns 是否可以访问
   */
  public canAccessOrganization(orgId: OrganizationId): boolean {
    // 如果允许跨租户访问，则允许访问任何组织
    if (this._isCrossTenant) {
      return true;
    }

    // 检查组织是否属于当前租户
    if (!orgId.belongsTo(this._tenantId)) {
      return false;
    }

    // 如果当前上下文中没有指定组织，则可以访问任何属于该租户的组织
    if (!this._organizationId) {
      return true;
    }

    // 如果指定了组织，则只能访问该组织及其祖先或后代
    return (
      this._organizationId.equals(orgId) ||
      this._organizationId.isAncestorOf(orgId) ||
      this._organizationId.isDescendantOf(orgId)
    );
  }

  /**
   * 检查是否可以访问指定部门
   * @param deptId 部门标识符
   * @returns 是否可以访问
   */
  public canAccessDepartment(deptId: DepartmentId): boolean {
    // 如果允许跨租户访问，则允许访问任何部门
    if (this._isCrossTenant) {
      return true;
    }

    // 检查部门是否属于当前租户
    if (!deptId.belongsToTenant(this._tenantId)) {
      return false;
    }

    // 如果指定了组织，检查部门是否属于该组织或其相关组织
    if (this._organizationId) {
      if (!deptId.belongsTo(this._organizationId)) {
        return false;
      }
    }

    // 如果指定了部门，则只能访问该部门及其祖先或后代
    if (this._departmentId) {
      return (
        this._departmentId.equals(deptId) ||
        this._departmentId.isAncestorOf(deptId) ||
        this._departmentId.isDescendantOf(deptId)
      );
    }

    // 没有指定部门，可以访问所有属于当前组织的部门
    return true;
  }

  /**
   * 验证上下文有效性
   * @returns 是否有效
   */
  public validate(): boolean {
    try {
      this.validateHierarchy();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 验证层级一致性
   * @private
   * @throws {Error} 当层级关系不一致时抛出异常
   */
  private validateHierarchy(): void {
    // 如果指定了部门，必须指定组织
    if (this._departmentId && !this._organizationId) {
      throw new Error("指定部门时必须同时指定组织");
    }

    // 如果指定了组织，组织必须属于租户
    if (
      this._organizationId &&
      !this._organizationId.belongsTo(this._tenantId)
    ) {
      throw new Error("组织必须属于指定租户");
    }

    // 如果指定了部门，部门必须属于组织
    if (this._departmentId && this._organizationId) {
      if (!this._departmentId.belongsTo(this._organizationId)) {
        throw new Error("部门必须属于指定组织");
      }
    }
  }

  /**
   * 创建上下文副本
   * @returns 新的上下文实例
   */
  public clone(): TenantContext {
    return new TenantContext(this._tenantId, {
      organizationId: this._organizationId,
      departmentId: this._departmentId,
      isCrossTenant: this._isCrossTenant,
      permissions: this._permissions,
      userId: this._userId,
    });
  }

  /**
   * 序列化为JSON
   * @returns JSON对象
   */
  public toJSON(): object {
    return {
      tenantId: this._tenantId.toJSON(),
      organizationId: this._organizationId?.toJSON(),
      departmentId: this._departmentId?.toJSON(),
      isCrossTenant: this._isCrossTenant,
      permissions: this._permissions,
      userId: this._userId?.toJSON(),
      extractedAt: this._extractedAt.toISOString(),
    };
  }

  /**
   * 比较两个上下文是否相等
   * @param other 另一个上下文
   * @returns 是否相等
   */
  public equals(other: TenantContext | null | undefined): boolean {
    if (!other) {
      return false;
    }

    if (!(other instanceof TenantContext)) {
      return false;
    }

    // 比较基本属性
    if (!this._tenantId.equals(other._tenantId)) {
      return false;
    }

    if (this._isCrossTenant !== other._isCrossTenant) {
      return false;
    }

    // 比较组织ID
    if (this._organizationId && other._organizationId) {
      if (!this._organizationId.equals(other._organizationId)) {
        return false;
      }
    } else if (this._organizationId || other._organizationId) {
      return false;
    }

    // 比较部门ID
    if (this._departmentId && other._departmentId) {
      if (!this._departmentId.equals(other._departmentId)) {
        return false;
      }
    } else if (this._departmentId || other._departmentId) {
      return false;
    }

    // 比较权限列表
    if (this._permissions.length !== other._permissions.length) {
      return false;
    }

    for (const permission of this._permissions) {
      if (!other._permissions.includes(permission)) {
        return false;
      }
    }

    // 比较用户ID
    if (this._userId && other._userId) {
      if (!this._userId.equals(other._userId)) {
        return false;
      }
    } else if (this._userId || other._userId) {
      return false;
    }

    return true;
  }
}
