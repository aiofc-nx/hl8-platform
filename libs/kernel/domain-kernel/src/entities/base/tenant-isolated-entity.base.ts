/**
 * @fileoverview 租户隔离实体基类
 * @description 支持租户隔离的实体基类，扩展自 Entity 基类
 */

import { Entity } from "./entity.base.js";
import { TenantId } from "../../identifiers/tenant-id.js";
import { OrganizationId } from "../../identifiers/organization-id.js";
import { DepartmentId } from "../../identifiers/department-id.js";
import { EntityId } from "../../identifiers/entity-id.js";
import { AuditInfo } from "../../audit/audit-info.js";
import { EntityLifecycle } from "./entity-lifecycle.enum.js";
import { TenantContext } from "../../context/tenant-context.js";

/**
 * 租户隔离实体基类
 * @description 提供租户、组织和部门级别的数据隔离能力
 */
export abstract class TenantIsolatedEntity extends Entity {
  protected readonly _tenantId: TenantId;
  protected readonly _organizationId?: OrganizationId;
  protected readonly _departmentId?: DepartmentId;

  /**
   * 创建租户隔离实体
   * @param tenantId 所属租户ID（必需）
   * @param organizationId 所属组织ID（可选）
   * @param departmentId 所属部门ID（可选）
   * @param id 实体标识符，如果未提供则自动生成
   * @param auditInfo 审计信息
   * @param lifecycleState 生命周期状态，默认为CREATED
   * @param version 版本号，默认为1
   * @param deletedAt 删除时间（软删除时设置）
   * @param deletedBy 删除者ID（软删除时设置）
   * @throws {Error} 当租户隔离规则验证失败时抛出异常
   */
  constructor(
    tenantId: TenantId,
    organizationId?: OrganizationId,
    departmentId?: DepartmentId,
    id?: EntityId,
    auditInfo?: AuditInfo,
    lifecycleState: EntityLifecycle = EntityLifecycle.CREATED,
    version: number = 1,
    deletedAt?: Date,
    deletedBy?: EntityId,
  ) {
    super(id, auditInfo, lifecycleState, version, deletedAt, deletedBy);

    if (!tenantId) {
      throw new Error("租户ID不能为空");
    }

    if (!tenantId.isValid()) {
      throw new Error("租户ID无效");
    }

    this._tenantId = tenantId;
    this._organizationId = organizationId;
    this._departmentId = departmentId;

    // 验证租户隔离层级一致性
    this.validateTenantIsolationHierarchy();
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
   * 检查是否属于指定租户
   * @param tenantId 租户标识符
   * @returns 是否属于该租户
   */
  public belongsToTenant(tenantId: TenantId): boolean {
    return this._tenantId.equals(tenantId);
  }

  /**
   * 检查是否属于指定组织
   * @param orgId 组织标识符
   * @returns 是否属于该组织
   */
  public belongsToOrganization(orgId: OrganizationId): boolean {
    if (!this._organizationId) {
      return false;
    }

    return this._organizationId.equals(orgId);
  }

  /**
   * 检查是否属于指定部门
   * @param deptId 部门标识符
   * @returns 是否属于该部门
   */
  public belongsToDepartment(deptId: DepartmentId): boolean {
    if (!this._departmentId) {
      return false;
    }

    return this._departmentId.equals(deptId);
  }

  /**
   * 验证租户隔离规则
   * @param context 租户上下文，可选
   * @returns 是否符合隔离规则
   */
  public validateTenantIsolation(context?: TenantContext): boolean {
    try {
      this.validateTenantIsolationHierarchy();

      // 如果提供了上下文，验证上下文与实体的匹配性
      if (context) {
        if (!this.belongsToTenant(context.tenantId)) {
          return false;
        }

        if (
          this._organizationId &&
          !context.canAccessOrganization(this._organizationId)
        ) {
          return false;
        }

        if (
          this._departmentId &&
          !context.canAccessDepartment(this._departmentId)
        ) {
          return false;
        }
      }

      return true;
    } catch {
      return false;
    }
  }

  /**
   * 验证租户隔离层级一致性
   * @private
   * @throws {Error} 当层级关系不一致时抛出异常
   */
  private validateTenantIsolationHierarchy(): void {
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
   * 转换为JSON表示
   * @returns JSON对象
   */
  public override toJSON(): object {
    const baseJson = super.toJSON();

    return {
      ...baseJson,
      tenantId: this._tenantId.toJSON(),
      organizationId: this._organizationId?.toJSON(),
      departmentId: this._departmentId?.toJSON(),
    };
  }

  /**
   * 比较两个实体是否相等（包含租户隔离信息）
   * @param other 要比较的另一个实体
   * @returns 是否相等
   */
  public override equals(other: Entity | null | undefined): boolean {
    if (!super.equals(other)) {
      return false;
    }

    if (!(other instanceof TenantIsolatedEntity)) {
      return false;
    }

    // 比较租户隔离属性
    if (!this._tenantId.equals(other._tenantId)) {
      return false;
    }

    if (this._organizationId && other._organizationId) {
      if (!this._organizationId.equals(other._organizationId)) {
        return false;
      }
    } else if (this._organizationId || other._organizationId) {
      return false;
    }

    if (this._departmentId && other._departmentId) {
      if (!this._departmentId.equals(other._departmentId)) {
        return false;
      }
    } else if (this._departmentId || other._departmentId) {
      return false;
    }

    return true;
  }
}
