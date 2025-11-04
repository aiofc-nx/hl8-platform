/**
 * @fileoverview 组织聚合根
 * @description 组织聚合根，管理组织信息
 */

import {
  AggregateRoot,
  EntityId,
  OrganizationId,
  TenantId,
} from "@hl8/domain-kernel";
import { OrganizationNameValueObject } from "../value-objects/organization-name.value-object.js";
import { OrganizationType } from "../value-objects/organization-type.enum.js";
import { OrganizationCreatedEvent } from "../events/organization-created.event.js";

/**
 * 组织聚合根
 * @description 管理组织信息
 * @example
 * ```typescript
 * const organization = Organization.create(
 *   tenantId,
 *   name,
 *   description,
 *   type,
 *   isDefault
 * );
 * ```
 */
export class Organization extends AggregateRoot {
  private _organizationId: OrganizationId;
  private _tenantId: TenantId;
  private _name: OrganizationNameValueObject;
  private _description: string | null;
  private _type: OrganizationType;
  private _isDefault: boolean;

  /**
   * 设置组织描述（用于从持久化重建）
   * @param description 组织描述
   */
  public setDescription(description: string | null): void {
    this._description = description;
  }

  /**
   * 设置组织类型（用于从持久化重建）
   * @param type 组织类型
   */
  public setType(type: OrganizationType): void {
    this._type = type;
  }

  /**
   * 设置是否为默认组织（用于从持久化重建）
   * @param isDefault 是否默认组织
   */
  public setIsDefault(isDefault: boolean): void {
    this._isDefault = isDefault;
  }

  /**
   * 创建组织聚合根（私有构造函数，使用静态工厂方法）
   * @param organizationId 组织ID
   * @param tenantId 租户ID
   * @param name 组织名称
   * @param description 组织描述
   * @param type 组织类型
   * @param isDefault 是否默认组织
   */
  private constructor(
    organizationId: OrganizationId,
    tenantId: TenantId,
    name: OrganizationNameValueObject,
    description: string | null,
    type: OrganizationType,
    isDefault: boolean,
  ) {
    // 使用 OrganizationId 的值作为 EntityId
    super(EntityId.fromString(organizationId.value));
    this._organizationId = organizationId;
    this._tenantId = tenantId;
    this._name = name;
    this._description = description;
    this._type = type;
    this._isDefault = isDefault;
  }

  /**
   * 创建新组织（工厂方法）
   * @param tenantId 租户ID
   * @param name 组织名称
   * @param description 组织描述，可选
   * @param type 组织类型，默认为 OTHER
   * @param isDefault 是否默认组织，默认为 false
   * @returns 组织聚合根
   */
  public static create(
    tenantId: TenantId,
    name: OrganizationNameValueObject,
    description?: string | null,
    type: OrganizationType = OrganizationType.OTHER,
    isDefault: boolean = false,
  ): Organization {
    const organizationId = new OrganizationId(tenantId);
    const organization = new Organization(
      organizationId,
      tenantId,
      name,
      description || null,
      type,
      isDefault,
    );

    // 发布组织创建事件
    const createdEvent = new OrganizationCreatedEvent(
      EntityId.fromString(organizationId.value),
      {
        organizationId,
        tenantId,
        name: name.value,
        description: organization._description,
        isDefault: organization._isDefault,
        createdAt: organization.createdAt,
      },
    );

    organization.addDomainEvent({
      type: "OrganizationCreated",
      aggregateRootId: EntityId.fromString(organizationId.value),
      timestamp: createdEvent.timestamp,
      data: createdEvent.eventData,
    });

    return organization;
  }

  /**
   * 从持久化数据重建组织聚合根（工厂方法）
   * @param organizationId 组织ID
   * @param tenantId 租户ID
   * @param name 组织名称
   * @param description 组织描述
   * @param type 组织类型
   * @param isDefault 是否默认组织
   * @param createdAt 创建时间
   * @param version 版本号
   * @returns 组织聚合根
   */
  public static fromPersistence(
    organizationId: OrganizationId,
    tenantId: TenantId,
    name: OrganizationNameValueObject,
    description: string | null,
    type: OrganizationType,
    isDefault: boolean,
    _createdAt: Date,
    _version: number,
  ): Organization {
    const organization = new Organization(
      organizationId,
      tenantId,
      name,
      description,
      type,
      isDefault,
    );
    // 注意：createdAt 由基类管理，版本号由AggregateRoot基类管理，这里不需要手动设置
    return organization;
  }

  /**
   * 获取组织ID
   * @returns 组织ID值对象
   */
  public get organizationId(): OrganizationId {
    return this._organizationId;
  }

  /**
   * 获取租户ID
   * @returns 租户ID值对象
   */
  public get tenantId(): TenantId {
    return this._tenantId;
  }

  /**
   * 获取组织名称
   * @returns 组织名称值对象
   */
  public get name(): OrganizationNameValueObject {
    return this._name.clone() as OrganizationNameValueObject;
  }

  /**
   * 获取组织描述
   * @returns 组织描述
   */
  public get description(): string | null {
    return this._description;
  }

  /**
   * 获取组织类型
   * @returns 组织类型
   */
  public get type(): OrganizationType {
    return this._type;
  }

  /**
   * 是否默认组织
   * @returns 是否默认组织
   */
  public get isDefault(): boolean {
    return this._isDefault;
  }

  /**
   * 执行协调操作
   * @param operation 操作名称
   * @param _params 操作参数（目前未使用）
   * @returns 操作结果
   */
  protected performCoordination(operation: string, _params: unknown): unknown {
    // Organization 目前没有需要协调的操作
    // 未来可以添加如更新描述、更改类型等操作
    throw new Error(`未知操作: ${operation}`);
  }

  /**
   * 执行业务不变量验证
   * @returns 是否通过验证
   * @throws {Error} 当不变量被破坏时抛出
   */
  protected performBusinessInvariantValidation(): boolean {
    // 值对象在构造时已经验证，这里只需要检查类型
    if (!Object.values(OrganizationType).includes(this._type)) {
      throw new Error("组织类型无效");
    }
    return true;
  }

  /**
   * 克隆聚合根
   * @returns 新的聚合根实例
   */
  public clone(): AggregateRoot {
    const cloned = new Organization(
      this._organizationId,
      this._tenantId,
      this._name.clone() as OrganizationNameValueObject,
      this._description,
      this._type,
      this._isDefault,
    );
    return cloned;
  }

  /**
   * 验证业务规则
   * @returns 是否通过验证
   */
  public validateBusinessRules(): boolean {
    return this.performBusinessInvariantValidation();
  }

  /**
   * 执行业务逻辑
   * @param operation 操作名称
   * @param params 参数
   * @returns 结果
   */
  public executeBusinessLogic(operation: string, params: unknown): unknown {
    // 这里可以根据operation调用不同的业务方法
    return { operation, params, executed: true };
  }
}
