/**
 * @fileoverview 部门标识符值对象
 * @description 封装组织内部门的唯一标识符，支持多层级部门结构
 */

import { UuidGenerator } from "./uuid-generator.js";
import { OrganizationId } from "./organization-id.js";
import { TenantId } from "./tenant-id.js";

/**
 * 部门标识符值对象
 * @description 封装部门的唯一标识符，包含组织关联和层级关系
 */
export class DepartmentId {
  private readonly _value: string;
  private readonly _organizationId: OrganizationId;
  private readonly _parentId?: DepartmentId;

  /**
   * 创建部门标识符
   * @param organizationId 所属组织ID（必需）
   * @param value UUID v4字符串，如果未提供则自动生成
   * @param parentId 父部门ID（可选）
   * @throws {Error} 当提供的值不是有效的UUID v4时抛出异常
   * @throws {Error} 当父部门不属于同一组织时抛出异常
   */
  constructor(
    organizationId: OrganizationId,
    value?: string,
    parentId?: DepartmentId,
  ) {
    if (!organizationId) {
      throw new Error("组织ID不能为空");
    }

    if (!organizationId.isValid()) {
      throw new Error("组织ID无效");
    }

    // 验证父部门
    if (parentId) {
      if (!parentId.belongsTo(organizationId)) {
        throw new Error("父部门必须属于同一组织");
      }
      this._parentId = parentId;
    }

    if (value !== undefined && value !== null) {
      if (!UuidGenerator.validate(value)) {
        throw new Error(`无效的部门标识符格式: ${value}`);
      }
      this._value = value;
    } else {
      this._value = UuidGenerator.generate();
    }

    this._organizationId = organizationId;
  }

  /**
   * 获取标识符值
   * @returns UUID字符串
   */
  public get value(): string {
    return this._value;
  }

  /**
   * 获取所属组织ID
   * @returns 组织标识符
   */
  public get organizationId(): OrganizationId {
    return this._organizationId;
  }

  /**
   * 获取父部门ID
   * @returns 父部门标识符或undefined
   */
  public get parentId(): DepartmentId | undefined {
    return this._parentId;
  }

  /**
   * 比较两个部门标识符是否相等
   * @param other 要比较的另一个部门标识符
   * @returns 是否相等
   */
  public equals(other: DepartmentId | null | undefined): boolean {
    if (!other) {
      return false;
    }

    if (!(other instanceof DepartmentId)) {
      return false;
    }

    return (
      this._value === other._value &&
      this._organizationId.equals(other._organizationId)
    );
  }

  /**
   * 检查是否属于指定组织
   * @param organizationId 组织标识符
   * @returns 是否属于该组织
   */
  public belongsTo(organizationId: OrganizationId): boolean {
    return this._organizationId.equals(organizationId);
  }

  /**
   * 检查是否属于指定租户
   * @param tenantId 租户标识符
   * @returns 是否属于该租户（通过组织关联）
   */
  public belongsToTenant(tenantId: TenantId): boolean {
    return this._organizationId.belongsTo(tenantId);
  }

  /**
   * 检查是否为指定部门的祖先
   * @param other 要检查的部门标识符
   * @returns 是否为祖先
   */
  public isAncestorOf(other: DepartmentId): boolean {
    if (!other) {
      return false;
    }

    let current: DepartmentId | undefined = other;
    while (current && current.parentId) {
      if (current.parentId.equals(this)) {
        return true;
      }
      current = current.parentId;
    }

    return false;
  }

  /**
   * 检查是否为指定部门的后代
   * @param other 要检查的部门标识符
   * @returns 是否为后代
   */
  public isDescendantOf(other: DepartmentId): boolean {
    if (!other) {
      return false;
    }

    return other.isAncestorOf(this);
  }

  /**
   * 转换为字符串表示
   * @returns UUID字符串
   */
  public toString(): string {
    return this._value;
  }

  /**
   * 转换为JSON表示
   * @returns JSON对象
   */
  public toJSON(): object {
    return {
      value: this._value,
      organizationId: this._organizationId.toJSON(),
      parentId: this._parentId?.toJSON(),
    };
  }

  /**
   * 验证标识符是否有效
   * @returns 是否有效
   */
  public isValid(): boolean {
    return (
      UuidGenerator.validate(this._value) && this._organizationId.isValid()
    );
  }

  /**
   * 创建部门标识符的副本
   * @returns 新的部门标识符实例
   */
  public clone(): DepartmentId {
    return new DepartmentId(this._organizationId, this._value, this._parentId);
  }

  /**
   * 从字符串创建部门标识符
   * @param organizationId 组织标识符
   * @param value UUID字符串
   * @param parentId 父部门ID（可选）
   * @returns 部门标识符实例
   * @throws {Error} 当字符串不是有效的UUID时抛出异常
   */
  public static fromString(
    organizationId: OrganizationId,
    value: string,
    parentId?: DepartmentId,
  ): DepartmentId {
    return new DepartmentId(organizationId, value, parentId);
  }

  /**
   * 生成新的部门标识符
   * @param organizationId 组织标识符
   * @param parentId 父部门ID（可选）
   * @returns 新的部门标识符实例
   */
  public static generate(
    organizationId: OrganizationId,
    parentId?: DepartmentId,
  ): DepartmentId {
    return new DepartmentId(organizationId, undefined, parentId);
  }
}
