/**
 * @fileoverview 租户隔离持久化实体基类
 * @description 提供租户、组织、部门级别的数据隔离能力，继承自BaseEntity
 */

import { Entity, Index, Property, OptionalProps } from "@mikro-orm/core";
import { BaseEntity } from "./base-entity.js";
import { TenantId } from "@hl8/domain-kernel";
import { OrganizationId } from "@hl8/domain-kernel";
import { DepartmentId } from "@hl8/domain-kernel";

/**
 * 租户隔离持久化实体基类
 * @description 为所有需要租户隔离的持久化实体提供多层级数据隔离
 */
@Entity({ abstract: true })
export abstract class TenantIsolatedPersistenceEntity extends BaseEntity {
  /**
   * 实体可选属性
   * @description MikroORM的hook机制，用于优化查询性能
   */
  [OptionalProps]?: "createdAt" | "updatedAt" | "deletedAt" | "version";

  /**
   * 租户ID（必需）
   * @description 用于多租户数据隔离，所有实体必须属于某个租户
   */
  @Index()
  @Property({ type: "uuid" })
  tenantId!: string;

  /**
   * 组织ID（可选）
   * @description 用于组织级数据隔离，组织必须属于租户
   */
  @Index()
  @Property({ type: "uuid", nullable: true })
  organizationId?: string | null;

  /**
   * 部门ID（可选）
   * @description 用于部门级数据隔离，部门必须属于组织
   */
  @Index()
  @Property({ type: "uuid", nullable: true })
  departmentId?: string | null;

  /**
   * 转换为领域层TenantId
   * @description 将MikroORM字符串ID转换为领域层的TenantId值对象
   * @returns 租户标识符
   */
  public toTenantId(): TenantId {
    return new TenantId(this.tenantId);
  }

  /**
   * 设置租户ID
   * @param tenantId 租户标识符
   * @throws {Error} 当租户ID无效时抛出异常
   */
  public setTenantId(tenantId: TenantId): void {
    if (!tenantId || !tenantId.isValid()) {
      throw new Error("租户ID无效");
    }
    this.tenantId = tenantId.value;
  }

  /**
   * 设置组织ID
   * @param organizationId 组织标识符
   * @throws {Error} 当租户ID未设置时抛出异常
   */
  public setOrganizationId(organizationId: OrganizationId | undefined): void {
    if (!this.tenantId) {
      throw new Error("必须先设置租户ID");
    }

    if (!organizationId) {
      this.organizationId = null;
      return;
    }

    if (!organizationId.isValid()) {
      throw new Error("组织ID无效");
    }

    this.organizationId = organizationId.value;
  }

  /**
   * 设置部门ID
   * @param departmentId 部门标识符
   * @throws {Error} 当组织ID未设置时抛出异常
   */
  public setDepartmentId(departmentId: DepartmentId | undefined): void {
    if (!this.tenantId) {
      throw new Error("必须先设置租户ID");
    }

    if (!departmentId) {
      this.departmentId = null;
      return;
    }

    if (!departmentId.isValid()) {
      throw new Error("部门ID无效");
    }

    // 部门必须属于某个组织
    if (!this.organizationId) {
      throw new Error("部门必须属于某个组织");
    }

    this.departmentId = departmentId.value;
  }

  /**
   * 验证租户隔离层级一致性
   * @throws {Error} 当层级关系不合法时抛出异常
   */
  public validateTenantIsolation(): void {
    if (!this.tenantId) {
      throw new Error("租户ID不能为空");
    }

    // 如果设置了部门ID，必须设置组织ID
    if (this.departmentId && !this.organizationId) {
      throw new Error("设置部门ID时必须同时设置组织ID");
    }
  }

  /**
   * 重写validate方法，添加租户隔离验证
   * @throws {Error} 当实体数据不完整或租户隔离规则不满足时抛出异常
   */
  public override validate(): void {
    super.validate();
    this.validateTenantIsolation();
  }
}
