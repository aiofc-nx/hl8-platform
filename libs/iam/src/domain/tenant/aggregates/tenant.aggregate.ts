/**
 * @fileoverview 租户聚合根
 * @description 租户聚合根，管理租户信息和配置
 */

import { AggregateRoot, EntityId, TenantId } from "@hl8/domain-kernel";
import { TenantCodeValueObject } from "../value-objects/tenant-code.value-object.js";
import { TenantNameValueObject } from "../value-objects/tenant-name.value-object.js";
import { TenantDomainValueObject } from "../value-objects/tenant-domain.value-object.js";
import { TenantType } from "../value-objects/tenant-type.enum.js";
import { TenantStatus } from "../value-objects/tenant-status.enum.js";
import { TenantConfigurationEntity } from "../entities/tenant-configuration.entity.js";
import { TenantCreatedEvent } from "../events/tenant-created.event.js";
import { TenantStatusChangedEvent } from "../events/tenant-status-changed.event.js";

/**
 * 隔离策略枚举
 * @description 定义租户数据隔离策略
 */
export enum IsolationStrategy {
  /**
   * 行级安全
   * @description 使用数据库行级安全策略进行数据隔离
   */
  ROW_LEVEL_SECURITY = "ROW_LEVEL_SECURITY",
}

/**
 * 租户聚合根
 * @description 管理租户信息、配置和状态
 * @example
 * ```typescript
 * const tenant = Tenant.create(
 *   code,
 *   name,
 *   domain,
 *   TenantType.TRIAL,
 *   createdBy
 * );
 * ```
 */
export class Tenant extends AggregateRoot {
  private _tenantId: TenantId;
  private _code: TenantCodeValueObject;
  private _name: TenantNameValueObject;
  private _domain: TenantDomainValueObject;
  private _type: TenantType;
  private _status: TenantStatus;
  private _isolationStrategy: IsolationStrategy;
  private _createdBy: EntityId;
  private _trialEndsAt: Date | null;

  /**
   * 设置租户状态（用于从持久化重建）
   * @param status 租户状态
   */
  public setStatus(status: TenantStatus): void {
    this._status = status;
  }

  /**
   * 设置试用期结束时间（用于从持久化重建）
   * @param trialEndsAt 试用期结束时间
   */
  public setTrialEndsAt(trialEndsAt: Date | null): void {
    this._trialEndsAt = trialEndsAt ? new Date(trialEndsAt.getTime()) : null;
  }

  /**
   * 创建租户聚合根（私有构造函数，使用静态工厂方法）
   * @param tenantId 租户ID
   * @param code 租户代码
   * @param name 租户名称
   * @param domain 租户域名
   * @param type 租户类型
   * @param createdBy 创建者用户ID
   */
  private constructor(
    tenantId: TenantId,
    code: TenantCodeValueObject,
    name: TenantNameValueObject,
    domain: TenantDomainValueObject,
    type: TenantType,
    createdBy: EntityId,
  ) {
    // 使用 TenantId 的值作为 EntityId
    super(EntityId.fromString(tenantId.value));
    this._tenantId = tenantId;
    this._code = code;
    this._name = name;
    this._domain = domain;
    this._type = type;
    this._status = TenantStatus.TRIAL;
    this._isolationStrategy = IsolationStrategy.ROW_LEVEL_SECURITY;
    this._createdBy = createdBy;
    // 试用期默认30天
    this._trialEndsAt = new Date(
      this.createdAt.getTime() + 30 * 24 * 60 * 60 * 1000,
    );
  }

  /**
   * 创建新租户（工厂方法）
   * @param code 租户代码
   * @param name 租户名称
   * @param domain 租户域名
   * @param type 租户类型
   * @param createdBy 创建者用户ID
   * @returns 租户聚合根
   */
  public static create(
    code: TenantCodeValueObject,
    name: TenantNameValueObject,
    domain: TenantDomainValueObject,
    type: TenantType,
    createdBy: EntityId,
  ): Tenant {
    const tenantId = new TenantId();
    const tenant = new Tenant(tenantId, code, name, domain, type, createdBy);

    // 创建默认配置
    const configuration = new TenantConfigurationEntity(
      EntityId.fromString(tenantId.value),
      {
        settings: {},
        updatedAt: new Date(),
      },
    );
    tenant.addInternalEntity(configuration);

    // 发布租户创建事件
    const createdEvent = new TenantCreatedEvent(
      EntityId.fromString(tenantId.value),
      {
        tenantId,
        code: code.value,
        name: name.value,
        domain: domain.value,
        type,
        createdBy,
        createdAt: tenant.createdAt,
      },
    );

    tenant.addDomainEvent({
      type: "TenantCreated",
      aggregateRootId: EntityId.fromString(tenantId.value),
      timestamp: createdEvent.timestamp,
      data: createdEvent.eventData,
    });

    return tenant;
  }

  /**
   * 从持久化数据重建租户聚合根（工厂方法）
   * @param tenantId 租户ID
   * @param code 租户代码
   * @param name 租户名称
   * @param domain 租户域名
   * @param type 租户类型
   * @param status 租户状态
   * @param createdBy 创建者用户ID
   * @param createdAt 创建时间
   * @param trialEndsAt 试用期结束时间
   * @param version 版本号
   * @returns 租户聚合根
   */
  public static fromPersistence(
    tenantId: TenantId,
    code: TenantCodeValueObject,
    name: TenantNameValueObject,
    domain: TenantDomainValueObject,
    type: TenantType,
    status: TenantStatus,
    createdBy: EntityId,
    createdAt: Date,
    trialEndsAt: Date | null,
    _version: number,
  ): Tenant {
    const tenant = new Tenant(tenantId, code, name, domain, type, createdBy);
    tenant.setStatus(status);
    tenant.setTrialEndsAt(trialEndsAt);
    // 注意：createdAt 由基类管理，版本号由AggregateRoot基类管理，这里不需要手动设置
    return tenant;
  }

  /**
   * 获取租户ID
   * @returns 租户ID值对象
   */
  public get tenantId(): TenantId {
    return this._tenantId;
  }

  /**
   * 获取租户代码
   * @returns 租户代码值对象
   */
  public get code(): TenantCodeValueObject {
    return this._code.clone() as TenantCodeValueObject;
  }

  /**
   * 获取租户名称
   * @returns 租户名称值对象
   */
  public get name(): TenantNameValueObject {
    return this._name.clone() as TenantNameValueObject;
  }

  /**
   * 获取租户域名
   * @returns 租户域名值对象
   */
  public get domain(): TenantDomainValueObject {
    return this._domain.clone() as TenantDomainValueObject;
  }

  /**
   * 获取租户类型
   * @returns 租户类型
   */
  public get type(): TenantType {
    return this._type;
  }

  /**
   * 获取租户状态
   * @returns 租户状态
   */
  public get status(): TenantStatus {
    return this._status;
  }

  /**
   * 获取隔离策略
   * @returns 隔离策略
   */
  public get isolationStrategy(): IsolationStrategy {
    return this._isolationStrategy;
  }

  /**
   * 获取创建者用户ID
   * @returns 创建者用户ID
   */
  public get createdBy(): EntityId {
    return this._createdBy.clone();
  }

  /**
   * 获取试用期结束时间
   * @returns 试用期结束时间，如果未设置则返回null
   */
  public get trialEndsAt(): Date | null {
    return this._trialEndsAt ? new Date(this._trialEndsAt.getTime()) : null;
  }

  /**
   * 更改租户状态
   * @param newStatus 新状态
   * @param changedBy 变更者用户ID
   * @param reason 变更原因，可选
   */
  public changeStatus(
    newStatus: TenantStatus,
    changedBy: EntityId,
    reason?: string,
  ): void {
    if (this._status === newStatus) {
      return;
    }

    // 验证状态转换规则
    this.validateStatusTransition(this._status, newStatus);

    const oldStatus = this._status;
    this._status = newStatus;

    // 发布状态变更事件
    const statusChangedEvent = new TenantStatusChangedEvent(
      EntityId.fromString(this._tenantId.value),
      {
        tenantId: this._tenantId,
        oldStatus,
        newStatus,
        reason,
        changedAt: new Date(),
        changedBy,
      },
    );

    this.addDomainEvent({
      type: "TenantStatusChanged",
      aggregateRootId: EntityId.fromString(this._tenantId.value),
      timestamp: statusChangedEvent.timestamp,
      data: statusChangedEvent.eventData,
    });
  }

  /**
   * 验证状态转换规则
   * @param oldStatus 旧状态
   * @param newStatus 新状态
   * @throws {Error} 当状态转换无效时抛出异常
   */
  private validateStatusTransition(
    oldStatus: TenantStatus,
    newStatus: TenantStatus,
  ): void {
    // DELETED 状态不能转换到其他状态
    if (oldStatus === TenantStatus.DELETED) {
      throw new Error("已删除的租户不能转换状态");
    }

    // 不能转换到 DELETED 状态（通过软删除方法处理）
    if (newStatus === TenantStatus.DELETED) {
      throw new Error("不能直接转换到 DELETED 状态，请使用软删除方法");
    }

    // 定义允许的状态转换
    const allowedTransitions: Record<TenantStatus, TenantStatus[]> = {
      [TenantStatus.TRIAL]: [TenantStatus.ACTIVE, TenantStatus.EXPIRED],
      [TenantStatus.ACTIVE]: [TenantStatus.SUSPENDED],
      [TenantStatus.SUSPENDED]: [TenantStatus.ACTIVE],
      [TenantStatus.EXPIRED]: [],
      [TenantStatus.DISABLED]: [TenantStatus.ACTIVE],
      [TenantStatus.DELETED]: [],
    };

    const allowed = allowedTransitions[oldStatus];
    if (!allowed || !allowed.includes(newStatus)) {
      throw new Error(`不允许从 ${oldStatus} 转换到 ${newStatus} 状态`);
    }
  }

  /**
   * 获取租户配置
   * @returns 租户配置实体，如果不存在则返回null
   */
  public getConfiguration(): TenantConfigurationEntity | null {
    const entities = Array.from(this.internalEntities.values());
    const configuration = entities.find(
      (entity) => entity instanceof TenantConfigurationEntity,
    ) as TenantConfigurationEntity | undefined;
    return configuration || null;
  }

  /**
   * 更新配置项
   * @param key 配置键
   * @param value 配置值
   */
  public updateConfiguration(key: string, value: unknown): void {
    const configuration = this.getConfiguration();
    if (!configuration) {
      throw new Error("租户配置不存在");
    }
    configuration.updateSetting(key, value);
  }

  /**
   * 批量更新配置项
   * @param settings 配置项（键值对）
   */
  public updateConfigurationSettings(settings: Record<string, unknown>): void {
    const configuration = this.getConfiguration();
    if (!configuration) {
      throw new Error("租户配置不存在");
    }
    configuration.updateSettings(settings);
  }

  /**
   * 执行协调操作
   * @param operation 操作名称
   * @param params 操作参数
   * @returns 操作结果
   */
  protected performCoordination(operation: string, params: unknown): unknown {
    switch (operation) {
      case "changeStatus": {
        const p = params as {
          newStatus: TenantStatus;
          changedBy: EntityId;
          reason?: string;
        };
        this.changeStatus(p.newStatus, p.changedBy, p.reason);
        return { success: true };
      }
      case "updateConfiguration": {
        const p = params as { key: string; value: unknown };
        this.updateConfiguration(p.key, p.value);
        return { success: true };
      }
      case "updateConfigurationSettings": {
        const p = params as { settings: Record<string, unknown> };
        this.updateConfigurationSettings(p.settings);
        return { success: true };
      }
      default:
        throw new Error(`未知操作: ${operation}`);
    }
  }

  /**
   * 执行业务不变量验证
   * @returns 是否通过验证
   * @throws {Error} 当不变量被破坏时抛出
   */
  protected performBusinessInvariantValidation(): boolean {
    // 值对象在构造时已经验证，这里只需要检查状态
    if (!Object.values(TenantType).includes(this._type)) {
      throw new Error("租户类型无效");
    }
    if (!Object.values(TenantStatus).includes(this._status)) {
      throw new Error("租户状态无效");
    }
    return true;
  }

  /**
   * 克隆聚合根
   * @returns 新的聚合根实例
   */
  public clone(): AggregateRoot {
    const cloned = new Tenant(
      this._tenantId,
      this._code.clone() as TenantCodeValueObject,
      this._name.clone() as TenantNameValueObject,
      this._domain.clone() as TenantDomainValueObject,
      this._type,
      this._createdBy,
    );
    cloned.setStatus(this._status);
    cloned.setTrialEndsAt(this._trialEndsAt);

    // 克隆内部实体
    for (const entity of this.internalEntities.values()) {
      const clonedEntity = entity.clone();
      if (clonedEntity instanceof TenantConfigurationEntity) {
        cloned.addInternalEntity(clonedEntity);
      }
    }

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
    // 例如：if (operation === 'changeStatus') { this.changeStatus(params); }
    return { operation, params, executed: true };
  }
}
