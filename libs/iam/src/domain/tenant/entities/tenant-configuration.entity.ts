/**
 * @fileoverview 租户配置实体
 * @description 租户配置内部实体，用于存储租户的配置信息
 */

import {
  InternalEntity,
  EntityId,
  AuditInfo,
  EntityLifecycle,
} from "@hl8/domain-kernel";

/**
 * 租户配置状态
 */
export interface TenantConfigurationState {
  /** 配置项（键值对） */
  settings: Record<string, unknown>;
  /** 更新时间 */
  updatedAt: Date;
}

/**
 * 租户配置实体
 * @description 租户配置内部实体，用于存储租户的配置信息
 * @example
 * ```typescript
 * const configuration = new TenantConfigurationEntity(
 *   tenantId,
 *   {
 *     settings: { maxUsers: 100, maxOrganizations: 10 },
 *     updatedAt: new Date()
 *   }
 * );
 * ```
 */
export class TenantConfigurationEntity extends InternalEntity {
  private _settings: Record<string, unknown>;

  /**
   * 创建租户配置实体
   * @param aggregateRootId 所属聚合根ID（租户ID）
   * @param state 配置状态
   * @param id 实体标识符，可选
   * @param auditInfo 审计信息，可选
   * @param lifecycleState 生命周期状态，默认为CREATED
   * @param version 版本号，默认为1
   */
  constructor(
    aggregateRootId: EntityId,
    state: TenantConfigurationState,
    id?: EntityId,
    auditInfo?: AuditInfo,
    lifecycleState: EntityLifecycle = EntityLifecycle.CREATED,
    version: number = 1,
  ) {
    super(aggregateRootId, id, auditInfo, lifecycleState, version);
    this._settings = { ...state.settings };
    this.performBusinessRuleValidation();
  }

  /**
   * 获取配置项
   * @returns 配置项（键值对）
   */
  public get settings(): Record<string, unknown> {
    return { ...this._settings };
  }

  /**
   * 获取更新时间
   * @returns 更新时间（使用基类的 updatedAt）
   */
  public get updatedAt(): Date {
    return super.updatedAt;
  }

  /**
   * 更新配置项
   * @param key 配置键
   * @param value 配置值
   */
  public updateSetting(key: string, value: unknown): void {
    this._settings[key] = value;
    this.updateEntity(this.aggregateRootId);
  }

  /**
   * 批量更新配置项
   * @param settings 配置项（键值对）
   */
  public updateSettings(settings: Record<string, unknown>): void {
    this._settings = { ...this._settings, ...settings };
    this.updateEntity(this.aggregateRootId);
  }

  /**
   * 获取配置值
   * @param key 配置键
   * @returns 配置值，如果不存在则返回undefined
   */
  public getSetting(key: string): unknown {
    return this._settings[key];
  }

  /**
   * 获取业务状态
   * @returns 配置状态
   */
  public getBusinessState(): TenantConfigurationState {
    return {
      settings: { ...this._settings },
      updatedAt: this.updatedAt,
    };
  }

  /**
   * 设置业务状态
   * @param state 配置状态
   */
  public setBusinessState(state: unknown): void {
    const newState = state as TenantConfigurationState;
    this._settings = { ...newState.settings };
    // updatedAt 由基类管理，不需要手动设置
    this.performBusinessRuleValidation();
  }

  /**
   * 执行业务操作
   * @param params 业务参数
   * @returns 业务结果
   */
  protected performBusinessOperation(params: unknown): unknown {
    // 租户配置实体的业务操作主要是更新配置
    return params;
  }

  /**
   * 执行业务规则验证
   * @returns 是否通过验证
   * @throws {Error} 当业务规则被违反时抛出异常
   */
  protected performBusinessRuleValidation(): boolean {
    if (!this._settings || typeof this._settings !== "object") {
      throw new Error("配置项必须是一个对象");
    }
    if (!this._updatedAt || !(this._updatedAt instanceof Date)) {
      throw new Error("更新时间必须是一个有效的日期");
    }
    return true;
  }

  /**
   * 执行状态更新
   * @param newState 新状态
   */
  protected performStateUpdate(newState: unknown): void {
    this.setBusinessState(newState);
  }

  /**
   * 执行通知
   * @param _event 领域事件
   */
  protected performNotification(_event: unknown): void {
    // 租户配置实体可以通知聚合根关于配置变更
    // 具体实现由聚合根处理
  }

  /**
   * 克隆实体
   * @returns 新的实体实例
   */
  public clone(): InternalEntity {
    return new TenantConfigurationEntity(
      this.aggregateRootId,
      this.getBusinessState() as TenantConfigurationState,
      this.id,
      this.auditInfo,
      this.lifecycleState,
      this.version,
    );
  }

  /**
   * 验证业务规则
   * @returns 是否通过验证
   */
  public validateBusinessRules(): boolean {
    return this.performBusinessRuleValidation();
  }

  /**
   * 执行业务逻辑
   * @param params 参数（包含 operation 和其他参数）
   * @returns 结果
   */
  public executeBusinessLogic(params: unknown): unknown {
    const p = params as { operation?: string; [key: string]: unknown };
    if (p.operation === "updateSetting") {
      const { key, value } = p as { key: string; value: unknown };
      this.updateSetting(key, value);
      return { success: true };
    }
    if (p.operation === "updateSettings") {
      const { settings } = p as { settings: Record<string, unknown> };
      this.updateSettings(settings);
      return { success: true };
    }
    return this.performBusinessOperation(params);
  }
}
