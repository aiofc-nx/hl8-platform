/**
 * @fileoverview 组织标识符值对象
 * @description 封装租户内组织的唯一标识符，支持多层级组织结构
 */

import { UuidGenerator } from "./uuid-generator.js";
import { TenantId } from "./tenant-id.js";

/**
 * 组织标识符值对象
 * @description 封装组织的唯一标识符，包含租户关联和层级关系
 */
export class OrganizationId {
  private readonly _value: string;
  private readonly _tenantId: TenantId;
  private readonly _parentId?: OrganizationId;

  /**
   * 创建组织标识符
   * @param tenantId 所属租户ID（必需）
   * @param value UUID v4字符串，如果未提供则自动生成
   * @param parentId 父组织ID（可选）
   * @throws {Error} 当提供的值不是有效的UUID v4时抛出异常
   * @throws {Error} 当父组织不属于同一租户时抛出异常
   */
  constructor(tenantId: TenantId, value?: string, parentId?: OrganizationId) {
    if (!tenantId) {
      throw new Error("租户ID不能为空");
    }

    if (!tenantId.isValid()) {
      throw new Error("租户ID无效");
    }

    // 验证父组织
    if (parentId) {
      if (!parentId.belongsTo(tenantId)) {
        throw new Error("父组织必须属于同一租户");
      }
      this._parentId = parentId;
    }

    if (value !== undefined && value !== null) {
      if (!UuidGenerator.validate(value)) {
        throw new Error(`无效的组织标识符格式: ${value}`);
      }
      this._value = value;
    } else {
      this._value = UuidGenerator.generate();
    }

    this._tenantId = tenantId;
  }

  /**
   * 获取标识符值
   * @returns UUID字符串
   */
  public get value(): string {
    return this._value;
  }

  /**
   * 获取所属租户ID
   * @returns 租户标识符
   */
  public get tenantId(): TenantId {
    return this._tenantId;
  }

  /**
   * 获取父组织ID
   * @returns 父组织标识符或undefined
   */
  public get parentId(): OrganizationId | undefined {
    return this._parentId;
  }

  /**
   * 比较两个组织标识符是否相等
   * @param other 要比较的另一个组织标识符
   * @returns 是否相等
   */
  public equals(other: OrganizationId | null | undefined): boolean {
    if (!other) {
      return false;
    }

    if (!(other instanceof OrganizationId)) {
      return false;
    }

    return (
      this._value === other._value && this._tenantId.equals(other._tenantId)
    );
  }

  /**
   * 检查是否属于指定租户
   * @param tenantId 租户标识符
   * @returns 是否属于该租户
   */
  public belongsTo(tenantId: TenantId): boolean {
    return this._tenantId.equals(tenantId);
  }

  /**
   * 检查是否为指定组织的祖先
   * @param other 要检查的组织标识符
   * @returns 是否为祖先
   */
  public isAncestorOf(other: OrganizationId): boolean {
    if (!other) {
      return false;
    }

    let current: OrganizationId | undefined = other;
    while (current && current.parentId) {
      if (current.parentId.equals(this)) {
        return true;
      }
      current = current.parentId;
    }

    return false;
  }

  /**
   * 检查是否为指定组织的后代
   * @param other 要检查的组织标识符
   * @returns 是否为后代
   */
  public isDescendantOf(other: OrganizationId): boolean {
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
      tenantId: this._tenantId.toJSON(),
      parentId: this._parentId?.toJSON(),
    };
  }

  /**
   * 验证标识符是否有效
   * @returns 是否有效
   */
  public isValid(): boolean {
    return UuidGenerator.validate(this._value) && this._tenantId.isValid();
  }

  /**
   * 创建组织标识符的副本
   * @returns 新的组织标识符实例
   */
  public clone(): OrganizationId {
    return new OrganizationId(this._tenantId, this._value, this._parentId);
  }

  /**
   * 从字符串创建组织标识符
   * @param tenantId 租户标识符
   * @param value UUID字符串
   * @param parentId 父组织ID（可选）
   * @returns 组织标识符实例
   * @throws {Error} 当字符串不是有效的UUID时抛出异常
   */
  public static fromString(
    tenantId: TenantId,
    value: string,
    parentId?: OrganizationId,
  ): OrganizationId {
    return new OrganizationId(tenantId, value, parentId);
  }

  /**
   * 生成新的组织标识符
   * @param tenantId 租户标识符
   * @param parentId 父组织ID（可选）
   * @returns 新的组织标识符实例
   */
  public static generate(
    tenantId: TenantId,
    parentId?: OrganizationId,
  ): OrganizationId {
    return new OrganizationId(tenantId, undefined, parentId);
  }
}
