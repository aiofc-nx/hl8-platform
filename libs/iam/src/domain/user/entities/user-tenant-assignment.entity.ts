/**
 * @fileoverview 用户租户分配实体
 * @description 用户到租户的分配内部实体
 */

import { InternalEntity, EntityId, TenantId } from "@hl8/domain-kernel";

/**
 * 用户租户分配业务状态
 */
export interface UserTenantAssignmentState {
  /** 租户ID */
  tenantId: TenantId;
  /** 角色ID（可选，未来扩展） */
  roleId?: EntityId;
  /** 分配时间 */
  assignedAt: Date;
}

/**
 * 用户租户分配实体
 * @description 用户到租户的分配内部实体，属于 UserAssignment 聚合根
 */
export class UserTenantAssignmentEntity extends InternalEntity {
  private _tenantId: TenantId;
  private _roleId?: EntityId;
  private _assignedAt: Date;

  /**
   * 创建用户租户分配实体
   * @param aggregateRootId 所属聚合根ID（UserAssignment ID）
   * @param state 分配状态
   * @param id 实体标识符，可选
   */
  constructor(
    aggregateRootId: EntityId,
    state: UserTenantAssignmentState,
    id?: EntityId,
  ) {
    super(aggregateRootId, id);
    this._tenantId = state.tenantId;
    this._roleId = state.roleId;
    this._assignedAt = new Date(state.assignedAt.getTime());
  }

  /**
   * 获取租户ID
   * @returns 租户ID
   */
  public get tenantId(): TenantId {
    return this._tenantId;
  }

  /**
   * 获取角色ID
   * @returns 角色ID，如果未设置则返回undefined
   */
  public get roleId(): EntityId | undefined {
    return this._roleId ? this._roleId.clone() : undefined;
  }

  /**
   * 获取分配时间
   * @returns 分配时间
   */
  public get assignedAt(): Date {
    return new Date(this._assignedAt.getTime());
  }

  /**
   * 获取业务状态
   * @returns 业务状态
   */
  public getBusinessState(): UserTenantAssignmentState {
    return {
      tenantId: this._tenantId,
      roleId: this._roleId ? this._roleId.clone() : undefined,
      assignedAt: new Date(this._assignedAt.getTime()),
    };
  }

  /**
   * 设置业务状态
   * @param state 业务状态
   */
  public setBusinessState(state: unknown): void {
    const assignmentState = state as UserTenantAssignmentState;
    this._tenantId = assignmentState.tenantId;
    this._roleId = assignmentState.roleId
      ? assignmentState.roleId.clone()
      : undefined;
    this._assignedAt = new Date(assignmentState.assignedAt.getTime());
  }

  /**
   * 执行具体的业务操作
   * @param _params 操作参数
   * @returns 操作结果
   */
  protected performBusinessOperation(_params: unknown): unknown {
    // 用户租户分配实体目前没有需要执行的业务操作
    // 未来可以添加如更新角色等操作
    throw new Error("未实现的业务操作");
  }

  /**
   * 执行具体的业务规则验证
   * @returns 是否通过验证
   */
  protected performBusinessRuleValidation(): boolean {
    if (!this._tenantId || !this._tenantId.isValid()) {
      return false;
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
   * 执行通知操作
   * @param _event 事件
   */
  protected performNotification(_event: unknown): void {
    // 用户租户分配实体可以通知聚合根分配状态变更
    // 具体实现由聚合根处理
  }

  /**
   * 克隆实体
   * @returns 克隆的实体
   */
  public clone(): UserTenantAssignmentEntity {
    return new UserTenantAssignmentEntity(
      this.aggregateRootId,
      this.getBusinessState(),
      this.id,
    );
  }
}
