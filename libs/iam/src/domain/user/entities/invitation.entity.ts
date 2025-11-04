/**
 * @fileoverview 邀请实体
 * @description 用户邀请内部实体，包含过期逻辑
 */

import { InternalEntity, EntityId } from "@hl8/domain-kernel";

/**
 * 邀请状态枚举
 */
export enum InvitationStatus {
  /** 待接受 */
  PENDING = "PENDING",
  /** 已接受 */
  ACCEPTED = "ACCEPTED",
  /** 已过期 */
  EXPIRED = "EXPIRED",
  /** 已撤销 */
  REVOKED = "REVOKED",
}

/**
 * 邀请业务状态
 */
export interface InvitationState {
  /** 被邀请用户邮箱 */
  email: string;
  /** 邀请状态 */
  status: InvitationStatus;
  /** 过期时间（7天后） */
  expiresAt: Date;
  /** 接受时间 */
  acceptedAt?: Date;
  /** 撤销时间 */
  revokedAt?: Date;
  /** 邀请者用户ID */
  invitedBy: EntityId;
  /** 邀请码（用于接受邀请） */
  invitationCode: string;
}

/**
 * 邀请实体
 * @description 用户邀请内部实体，属于 UserAssignment 聚合根
 * @note 邀请7天后自动过期
 */
export class InvitationEntity extends InternalEntity {
  private _email: string;
  private _status: InvitationStatus;
  private _expiresAt: Date;
  private _acceptedAt?: Date;
  private _revokedAt?: Date;
  private _invitedBy: EntityId;
  private _invitationCode: string;

  /**
   * 创建邀请实体
   * @param aggregateRootId 所属聚合根ID（UserAssignment ID）
   * @param state 邀请状态
   * @param id 实体标识符，可选
   */
  constructor(
    aggregateRootId: EntityId,
    state: InvitationState,
    id?: EntityId,
  ) {
    super(aggregateRootId, id);
    this._email = state.email;
    this._status = state.status;
    this._expiresAt = new Date(state.expiresAt.getTime());
    this._acceptedAt = state.acceptedAt
      ? new Date(state.acceptedAt.getTime())
      : undefined;
    this._revokedAt = state.revokedAt
      ? new Date(state.revokedAt.getTime())
      : undefined;
    this._invitedBy = state.invitedBy;
    this._invitationCode = state.invitationCode;
  }

  /**
   * 获取被邀请用户邮箱
   * @returns 邮箱
   */
  public get email(): string {
    return this._email;
  }

  /**
   * 获取邀请状态
   * @returns 邀请状态
   */
  public get status(): InvitationStatus {
    return this._status;
  }

  /**
   * 获取过期时间
   * @returns 过期时间
   */
  public get expiresAt(): Date {
    return new Date(this._expiresAt.getTime());
  }

  /**
   * 获取接受时间
   * @returns 接受时间，如果未接受则返回undefined
   */
  public get acceptedAt(): Date | undefined {
    return this._acceptedAt ? new Date(this._acceptedAt.getTime()) : undefined;
  }

  /**
   * 获取撤销时间
   * @returns 撤销时间，如果未撤销则返回undefined
   */
  public get revokedAt(): Date | undefined {
    return this._revokedAt ? new Date(this._revokedAt.getTime()) : undefined;
  }

  /**
   * 获取邀请者用户ID
   * @returns 邀请者用户ID
   */
  public get invitedBy(): EntityId {
    return this._invitedBy.clone();
  }

  /**
   * 获取邀请码
   * @returns 邀请码
   */
  public get invitationCode(): string {
    return this._invitationCode;
  }

  /**
   * 接受邀请
   * @param code 邀请码
   * @throws {Error} 当邀请码不匹配、已过期或已接受时抛出异常
   */
  public accept(code: string): void {
    if (this._status !== InvitationStatus.PENDING) {
      throw new Error("邀请状态不允许接受");
    }

    if (this.isExpired()) {
      this._status = InvitationStatus.EXPIRED;
      throw new Error("邀请已过期");
    }

    if (this._invitationCode !== code) {
      throw new Error("邀请码不匹配");
    }

    this._status = InvitationStatus.ACCEPTED;
    this._acceptedAt = new Date();
  }

  /**
   * 撤销邀请
   */
  public revoke(): void {
    if (
      this._status === InvitationStatus.ACCEPTED ||
      this._status === InvitationStatus.EXPIRED
    ) {
      throw new Error("已接受或已过期的邀请不能撤销");
    }

    this._status = InvitationStatus.REVOKED;
    this._revokedAt = new Date();
  }

  /**
   * 检查邀请是否过期
   * @returns 是否过期
   */
  public isExpired(): boolean {
    return new Date() > this._expiresAt;
  }

  /**
   * 检查并更新过期状态
   * @description 如果已过期但状态未更新，则更新状态
   */
  public checkAndUpdateExpiration(): void {
    if (this._status === InvitationStatus.PENDING && this.isExpired()) {
      this._status = InvitationStatus.EXPIRED;
    }
  }

  /**
   * 获取业务状态
   * @returns 业务状态
   */
  public getBusinessState(): InvitationState {
    return {
      email: this._email,
      status: this._status,
      expiresAt: new Date(this._expiresAt.getTime()),
      acceptedAt: this._acceptedAt
        ? new Date(this._acceptedAt.getTime())
        : undefined,
      revokedAt: this._revokedAt
        ? new Date(this._revokedAt.getTime())
        : undefined,
      invitedBy: this._invitedBy.clone(),
      invitationCode: this._invitationCode,
    };
  }

  /**
   * 设置业务状态
   * @param state 业务状态
   */
  public setBusinessState(state: unknown): void {
    const invitationState = state as InvitationState;
    this._email = invitationState.email;
    this._status = invitationState.status;
    this._expiresAt = new Date(invitationState.expiresAt.getTime());
    this._acceptedAt = invitationState.acceptedAt
      ? new Date(invitationState.acceptedAt.getTime())
      : undefined;
    this._revokedAt = invitationState.revokedAt
      ? new Date(invitationState.revokedAt.getTime())
      : undefined;
    this._invitedBy = invitationState.invitedBy.clone();
    this._invitationCode = invitationState.invitationCode;
  }

  /**
   * 执行具体的业务操作
   * @param params 操作参数
   * @returns 操作结果
   */
  protected performBusinessOperation(params: unknown): unknown {
    const operation = params as { action: string; code?: string };
    if (operation.action === "accept") {
      this.accept(operation.code || "");
      return { success: true };
    }
    if (operation.action === "revoke") {
      this.revoke();
      return { success: true };
    }
    if (operation.action === "checkExpiration") {
      this.checkAndUpdateExpiration();
      return { expired: this.isExpired(), status: this._status };
    }
    throw new Error(`未知操作: ${operation.action}`);
  }

  /**
   * 执行具体的业务规则验证
   * @returns 是否通过验证
   */
  protected performBusinessRuleValidation(): boolean {
    if (!this._email || this._email.length === 0) {
      return false;
    }
    if (!Object.values(InvitationStatus).includes(this._status)) {
      return false;
    }
    if (!this._invitationCode || this._invitationCode.length === 0) {
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
    // 邀请实体可以通知聚合根邀请状态变更
    // 具体实现由聚合根处理
  }

  /**
   * 克隆实体
   * @returns 克隆的实体
   */
  public clone(): InvitationEntity {
    return new InvitationEntity(
      this.aggregateRootId,
      this.getBusinessState(),
      this.id,
    );
  }
}
