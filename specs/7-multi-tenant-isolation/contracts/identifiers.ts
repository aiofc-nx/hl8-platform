/**
 * @fileoverview 多租户和多层级隔离标识符接口定义
 * @description 定义租户、组织、部门标识符的 TypeScript 接口
 */

/**
 * 租户标识符接口
 * @description 封装租户的唯一标识符，使用 UUID v4 格式
 */
export interface ITenantId {
  /**
   * 获取标识符值
   * @returns UUID v4 字符串
   */
  readonly value: string;

  /**
   * 比较两个租户标识符是否相等
   * @param other 要比较的另一个租户标识符
   * @returns 是否相等
   */
  equals(other: ITenantId | null | undefined): boolean;

  /**
   * 验证标识符是否有效
   * @returns 是否有效（UUID v4格式）
   */
  isValid(): boolean;

  /**
   * 创建标识符副本
   * @returns 新的标识符实例
   */
  clone(): ITenantId;

  /**
   * 转换为字符串
   * @returns UUID字符串
   */
  toString(): string;

  /**
   * 序列化为JSON
   * @returns UUID字符串
   */
  toJSON(): string;
}

/**
 * 组织标识符接口
 * @description 封装租户内组织的唯一标识符，支持多层级组织结构
 */
export interface IOrganizationId {
  /**
   * 获取标识符值
   * @returns UUID v4 字符串
   */
  readonly value: string;

  /**
   * 获取所属租户ID
   * @returns 租户标识符
   */
  readonly tenantId: ITenantId;

  /**
   * 获取父组织ID（如果存在）
   * @returns 父组织标识符或undefined
   */
  readonly parentId?: IOrganizationId;

  /**
   * 比较两个组织标识符是否相等
   * @param other 要比较的另一个组织标识符
   * @returns 是否相等
   */
  equals(other: IOrganizationId | null | undefined): boolean;

  /**
   * 检查是否属于指定租户
   * @param tenantId 租户标识符
   * @returns 是否属于该租户
   */
  belongsTo(tenantId: ITenantId): boolean;

  /**
   * 检查是否为指定组织的祖先
   * @param other 要检查的组织标识符
   * @returns 是否为祖先
   */
  isAncestorOf(other: IOrganizationId): boolean;

  /**
   * 检查是否为指定组织的后代
   * @param other 要检查的组织标识符
   * @returns 是否为后代
   */
  isDescendantOf(other: IOrganizationId): boolean;

  /**
   * 创建标识符副本
   * @returns 新的标识符实例
   */
  clone(): IOrganizationId;
}

/**
 * 部门标识符接口
 * @description 封装组织内部门的唯一标识符，支持多层级部门结构
 */
export interface IDepartmentId {
  /**
   * 获取标识符值
   * @returns UUID v4 字符串
   */
  readonly value: string;

  /**
   * 获取所属组织ID
   * @returns 组织标识符
   */
  readonly organizationId: IOrganizationId;

  /**
   * 获取父部门ID（如果存在）
   * @returns 父部门标识符或undefined
   */
  readonly parentId?: IDepartmentId;

  /**
   * 比较两个部门标识符是否相等
   * @param other 要比较的另一个部门标识符
   * @returns 是否相等
   */
  equals(other: IDepartmentId | null | undefined): boolean;

  /**
   * 检查是否属于指定组织
   * @param organizationId 组织标识符
   * @returns 是否属于该组织
   */
  belongsTo(organizationId: IOrganizationId): boolean;

  /**
   * 检查是否属于指定租户
   * @param tenantId 租户标识符
   * @returns 是否属于该租户（通过组织关联）
   */
  belongsToTenant(tenantId: ITenantId): boolean;

  /**
   * 检查是否为指定部门的祖先
   * @param other 要检查的部门标识符
   * @returns 是否为祖先
   */
  isAncestorOf(other: IDepartmentId): boolean;

  /**
   * 检查是否为指定部门的后代
   * @param other 要检查的部门标识符
   * @returns 是否为后代
   */
  isDescendantOf(other: IDepartmentId): boolean;

  /**
   * 创建标识符副本
   * @returns 新的标识符实例
   */
  clone(): IDepartmentId;
}
