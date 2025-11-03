/**
 * @fileoverview 验证码实体
 * @description 用户验证码内部实体，用于邮箱和手机验证
 */

import { InternalEntity, EntityId } from "@hl8/domain-kernel";

/**
 * 验证码类型
 */
export enum VerificationCodeType {
  /** 邮箱验证 */
  EMAIL = "EMAIL",
  /** 手机验证 */
  PHONE = "PHONE",
}

/**
 * 验证码业务状态
 */
export interface VerificationCodeState {
  /** 验证码 */
  code: string;
  /** 验证类型 */
  type: VerificationCodeType;
  /** 过期时间 */
  expiresAt: Date;
  /** 是否已验证 */
  verified: boolean;
  /** 验证时间 */
  verifiedAt?: Date;
}

/**
 * 验证码实体
 * @description 用户验证码内部实体，用于邮箱和手机验证
 * @example
 * ```typescript
 * const verificationCode = new VerificationCodeEntity(
 *   userId,
 *   {
 *     code: "123456",
 *     type: VerificationCodeType.EMAIL,
 *     expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10分钟后过期
 *     verified: false
 *   }
 * );
 * ```
 */
export class VerificationCodeEntity extends InternalEntity {
  private _code: string;
  private _type: VerificationCodeType;
  private _expiresAt: Date;
  private _verified: boolean;
  private _verifiedAt?: Date;

  /**
   * 创建验证码实体
   * @param aggregateRootId 所属聚合根ID（用户ID）
   * @param state 验证码状态
   * @param id 实体标识符，可选
   */
  constructor(
    aggregateRootId: EntityId,
    state: VerificationCodeState,
    id?: EntityId,
  ) {
    super(aggregateRootId, id);
    this._code = state.code;
    this._type = state.type;
    this._expiresAt = new Date(state.expiresAt.getTime());
    this._verified = state.verified;
    this._verifiedAt = state.verifiedAt
      ? new Date(state.verifiedAt.getTime())
      : undefined;
  }

  /**
   * 获取验证码
   * @returns 验证码
   */
  public get code(): string {
    return this._code;
  }

  /**
   * 获取验证类型
   * @returns 验证类型
   */
  public get type(): VerificationCodeType {
    return this._type;
  }

  /**
   * 获取过期时间
   * @returns 过期时间
   */
  public get expiresAt(): Date {
    return new Date(this._expiresAt.getTime());
  }

  /**
   * 是否已验证
   * @returns 是否已验证
   */
  public get verified(): boolean {
    return this._verified;
  }

  /**
   * 获取验证时间
   * @returns 验证时间
   */
  public get verifiedAt(): Date | undefined {
    return this._verifiedAt ? new Date(this._verifiedAt.getTime()) : undefined;
  }

  /**
   * 验证验证码
   * @param code 输入的验证码
   * @returns 是否验证成功
   */
  public verify(code: string): boolean {
    if (this._verified) {
      throw new Error("验证码已使用");
    }

    if (this.isExpired()) {
      throw new Error("验证码已过期");
    }

    if (this._code !== code) {
      return false;
    }

    this._verified = true;
    this._verifiedAt = new Date();
    return true;
  }

  /**
   * 检查验证码是否过期
   * @returns 是否过期
   */
  public isExpired(): boolean {
    return new Date() > this._expiresAt;
  }

  /**
   * 获取业务状态
   * @returns 业务状态
   */
  public getBusinessState(): VerificationCodeState {
    return {
      code: this._code,
      type: this._type,
      expiresAt: new Date(this._expiresAt.getTime()),
      verified: this._verified,
      verifiedAt: this._verifiedAt
        ? new Date(this._verifiedAt.getTime())
        : undefined,
    };
  }

  /**
   * 设置业务状态
   * @param state 业务状态
   */
  public setBusinessState(state: unknown): void {
    const codeState = state as VerificationCodeState;
    this._code = codeState.code;
    this._type = codeState.type;
    this._expiresAt = new Date(codeState.expiresAt.getTime());
    this._verified = codeState.verified;
    this._verifiedAt = codeState.verifiedAt
      ? new Date(codeState.verifiedAt.getTime())
      : undefined;
  }

  /**
   * 执行业务操作
   * @param params 操作参数
   * @returns 操作结果
   */
  protected performBusinessOperation(params: unknown): unknown {
    const operation = params as { action: string; code?: string };
    if (operation.action === "verify") {
      return this.verify(operation.code || "");
    }
    if (operation.action === "checkExpired") {
      return this.isExpired();
    }
    throw new Error(`未知操作: ${operation.action}`);
  }

  /**
   * 执行业务规则验证
   * @returns 是否通过验证
   */
  protected performBusinessRuleValidation(): boolean {
    if (!this._code || this._code.length === 0) {
      return false;
    }
    if (!Object.values(VerificationCodeType).includes(this._type)) {
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
    // 验证码实体可以通知聚合根验证状态变更
    // 具体实现由聚合根处理
  }

  /**
   * 克隆实体
   * @returns 克隆的实体
   */
  public clone(): VerificationCodeEntity {
    const cloned = new VerificationCodeEntity(
      this.aggregateRootId,
      this.getBusinessState(),
      this.id,
    );
    return cloned;
  }
}
