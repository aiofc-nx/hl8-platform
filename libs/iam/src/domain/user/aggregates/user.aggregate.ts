/**
 * @fileoverview 用户聚合根
 * @description 用户聚合根，管理用户信息和验证码
 */

import { AggregateRoot, EntityId } from "@hl8/domain-kernel";
import { EmailValueObject } from "../value-objects/email.value-object.js";
import { PhoneNumberValueObject } from "../value-objects/phone-number.value-object.js";
import { UserNameValueObject } from "../value-objects/user-name.value-object.js";
import { PasswordHashValueObject } from "../value-objects/password-hash.value-object.js";
import {
  VerificationCodeEntity,
  VerificationCodeType,
} from "../entities/verification-code.entity.js";
import { UserRegisteredEvent } from "../events/user-registered.event.js";
import { UserVerifiedEvent } from "../events/user-verified.event.js";
import {
  UserStatusChangedEvent,
  UserStatus,
} from "../events/user-status-changed.event.js";

/**
 * 用户聚合根
 * @description 管理用户信息、验证码和用户状态
 * @example
 * ```typescript
 * const user = User.register(
 *   email,
 *   phoneNumber,
 *   name,
 *   passwordHash
 * );
 * ```
 */
export class User extends AggregateRoot {
  private _email: EmailValueObject;
  private _phoneNumber: PhoneNumberValueObject;
  private _name: UserNameValueObject;
  private _passwordHash: PasswordHashValueObject;
  private _emailVerified: boolean;
  private _phoneVerified: boolean;
  private _status: UserStatus;
  private _registeredAt: Date;

  /**
   * 设置邮箱验证状态（用于从持久化重建）
   * @param verified 验证状态
   */
  public setEmailVerified(verified: boolean): void {
    this._emailVerified = verified;
  }

  /**
   * 设置手机验证状态（用于从持久化重建）
   * @param verified 验证状态
   */
  public setPhoneVerified(verified: boolean): void {
    this._phoneVerified = verified;
  }

  /**
   * 设置用户状态（用于从持久化重建）
   * @param status 用户状态
   */
  public setStatus(status: UserStatus): void {
    this._status = status;
  }

  /**
   * 设置注册时间（用于从持久化重建）
   * @param registeredAt 注册时间
   */
  public setRegisteredAt(registeredAt: Date): void {
    this._registeredAt = new Date(registeredAt.getTime());
  }

  /**
   * 创建用户聚合根（私有构造函数，使用静态工厂方法）
   * @param id 用户ID
   * @param email 邮箱
   * @param phoneNumber 手机号
   * @param name 姓名
   * @param passwordHash 密码哈希
   */
  private constructor(
    id: EntityId,
    email: EmailValueObject,
    phoneNumber: PhoneNumberValueObject,
    name: UserNameValueObject,
    passwordHash: PasswordHashValueObject,
  ) {
    super(id);
    this._email = email;
    this._phoneNumber = phoneNumber;
    this._name = name;
    this._passwordHash = passwordHash;
    this._emailVerified = false;
    this._phoneVerified = false;
    this._status = UserStatus.UNVERIFIED;
    this._registeredAt = new Date();
  }

  /**
   * 注册新用户（工厂方法）
   * @param email 邮箱
   * @param phoneNumber 手机号
   * @param name 姓名
   * @param passwordHash 密码哈希
   * @returns 用户聚合根
   */
  public static register(
    email: EmailValueObject,
    phoneNumber: PhoneNumberValueObject,
    name: UserNameValueObject,
    passwordHash: PasswordHashValueObject,
  ): User {
    const userId = EntityId.generate();
    const user = new User(userId, email, phoneNumber, name, passwordHash);

    // 发布用户注册事件
    const registeredEvent = new UserRegisteredEvent(userId, {
      userId,
      email: email.value,
      phoneNumber: phoneNumber.value,
      name: name.value,
      registeredAt: user._registeredAt,
    });

    // 将领域事件类转换为聚合根基类期望的格式
    user.addDomainEvent({
      type: "UserRegistered",
      aggregateRootId: userId,
      timestamp: registeredEvent.timestamp,
      data: registeredEvent.eventData,
    });

    return user;
  }

  /**
   * 从持久化数据重建用户聚合根（工厂方法）
   * @param id 用户ID
   * @param email 邮箱
   * @param phoneNumber 手机号
   * @param name 姓名
   * @param passwordHash 密码哈希
   * @param emailVerified 邮箱验证状态
   * @param phoneVerified 手机验证状态
   * @param status 用户状态
   * @param registeredAt 注册时间
   * @param version 版本号
   * @returns 用户聚合根
   */
  public static fromPersistence(
    id: EntityId,
    email: EmailValueObject,
    phoneNumber: PhoneNumberValueObject,
    name: UserNameValueObject,
    passwordHash: PasswordHashValueObject,
    emailVerified: boolean,
    phoneVerified: boolean,
    status: UserStatus,
    registeredAt: Date,
    _version: number,
  ): User {
    const user = new User(id, email, phoneNumber, name, passwordHash);
    user.setEmailVerified(emailVerified);
    user.setPhoneVerified(phoneVerified);
    user.setStatus(status);
    user.setRegisteredAt(registeredAt);
    // 注意：版本号由AggregateRoot基类管理，这里不需要手动设置
    return user;
  }

  /**
   * 获取邮箱
   * @returns 邮箱值对象
   */
  public get email(): EmailValueObject {
    return this._email.clone() as EmailValueObject;
  }

  /**
   * 获取手机号
   * @returns 手机号值对象
   */
  public get phoneNumber(): PhoneNumberValueObject {
    return this._phoneNumber.clone() as PhoneNumberValueObject;
  }

  /**
   * 获取姓名
   * @returns 姓名值对象
   */
  public get name(): UserNameValueObject {
    return this._name.clone() as UserNameValueObject;
  }

  /**
   * 获取密码哈希
   * @returns 密码哈希值对象
   */
  public get passwordHash(): PasswordHashValueObject {
    return this._passwordHash.clone() as PasswordHashValueObject;
  }

  /**
   * 邮箱是否已验证
   * @returns 是否已验证
   */
  public get emailVerified(): boolean {
    return this._emailVerified;
  }

  /**
   * 手机是否已验证
   * @returns 是否已验证
   */
  public get phoneVerified(): boolean {
    return this._phoneVerified;
  }

  /**
   * 获取用户状态
   * @returns 用户状态
   */
  public get status(): UserStatus {
    return this._status;
  }

  /**
   * 获取注册时间
   * @returns 注册时间
   */
  public get registeredAt(): Date {
    return new Date(this._registeredAt.getTime());
  }

  /**
   * 创建验证码
   * @param type 验证类型
   * @param code 验证码
   * @param expiresAt 过期时间
   * @returns 验证码实体
   */
  public createVerificationCode(
    type: "EMAIL" | "PHONE",
    code: string,
    expiresAt: Date,
  ): VerificationCodeEntity {
    const verificationCode = new VerificationCodeEntity(this.id, {
      code,
      type:
        type === "EMAIL"
          ? VerificationCodeType.EMAIL
          : VerificationCodeType.PHONE,
      expiresAt,
      verified: false,
    });

    this.addInternalEntity(verificationCode);
    return verificationCode;
  }

  /**
   * 验证邮箱
   * @param code 验证码
   * @returns 是否验证成功
   */
  public verifyEmail(code: string): boolean {
    if (this._emailVerified) {
      throw new Error("邮箱已验证");
    }

    // 查找邮箱验证码
    const verificationCodes = Array.from(this.internalEntities.values()).filter(
      (entity) =>
        entity instanceof VerificationCodeEntity &&
        entity.type === VerificationCodeType.EMAIL &&
        !entity.verified,
    ) as VerificationCodeEntity[];

    if (verificationCodes.length === 0) {
      throw new Error("未找到邮箱验证码");
    }

    // 使用最新的验证码
    const verificationCode = verificationCodes[verificationCodes.length - 1];
    const verified = verificationCode.verify(code);

    if (verified) {
      this._emailVerified = true;
      this.updateStatusIfNeeded();

      // 发布邮箱验证事件
      const verifiedEvent = new UserVerifiedEvent(this.id, {
        userId: this.id,
        verificationType: "EMAIL",
        verifiedAt: new Date(),
        emailVerified: this._emailVerified,
        phoneVerified: this._phoneVerified,
      });

      this.addDomainEvent({
        type: "UserVerified",
        aggregateRootId: this.id,
        timestamp: verifiedEvent.timestamp,
        data: verifiedEvent.eventData,
      });
    }

    return verified;
  }

  /**
   * 验证手机
   * @param code 验证码
   * @returns 是否验证成功
   */
  public verifyPhone(code: string): boolean {
    if (this._phoneVerified) {
      throw new Error("手机已验证");
    }

    // 查找手机验证码
    const verificationCodes = Array.from(this.internalEntities.values()).filter(
      (entity) =>
        entity instanceof VerificationCodeEntity &&
        entity.type === VerificationCodeType.PHONE &&
        !entity.verified,
    ) as VerificationCodeEntity[];

    if (verificationCodes.length === 0) {
      throw new Error("未找到手机验证码");
    }

    // 使用最新的验证码
    const verificationCode = verificationCodes[verificationCodes.length - 1];
    const verified = verificationCode.verify(code);

    if (verified) {
      this._phoneVerified = true;
      this.updateStatusIfNeeded();

      // 发布手机验证事件
      const verifiedEvent = new UserVerifiedEvent(this.id, {
        userId: this.id,
        verificationType: "PHONE",
        verifiedAt: new Date(),
        emailVerified: this._emailVerified,
        phoneVerified: this._phoneVerified,
      });

      this.addDomainEvent({
        type: "UserVerified",
        aggregateRootId: this.id,
        timestamp: verifiedEvent.timestamp,
        data: verifiedEvent.eventData,
      });
    }

    return verified;
  }

  /**
   * 更新状态（如果需要）
   */
  private updateStatusIfNeeded(): void {
    if (
      this._status === UserStatus.UNVERIFIED &&
      this._emailVerified &&
      this._phoneVerified
    ) {
      const oldStatus = this._status;
      this._status = UserStatus.VERIFIED;

      // 发布状态变更事件
      const statusChangedEvent = new UserStatusChangedEvent(this.id, {
        userId: this.id,
        oldStatus,
        newStatus: this._status,
        changedAt: new Date(),
      });

      this.addDomainEvent({
        type: "UserStatusChanged",
        aggregateRootId: this.id,
        timestamp: statusChangedEvent.timestamp,
        data: statusChangedEvent.eventData,
      });
    }
  }

  /**
   * 执行协调操作
   * @param operation 操作名称
   * @param params 操作参数
   * @returns 操作结果
   */
  protected performCoordination(operation: string, params: unknown): unknown {
    switch (operation) {
      case "verifyEmail":
        return this.verifyEmail((params as { code: string }).code);
      case "verifyPhone":
        return this.verifyPhone((params as { code: string }).code);
      case "createVerificationCode": {
        const p = params as {
          type: "EMAIL" | "PHONE";
          code: string;
          expiresAt: Date;
        };
        return this.createVerificationCode(p.type, p.code, p.expiresAt);
      }
      default:
        throw new Error(`未知操作: ${operation}`);
    }
  }

  /**
   * 执行业务不变量验证
   * @returns 是否满足业务不变量
   */
  protected performBusinessInvariantValidation(): boolean {
    // 邮箱和手机号不能为空
    if (!this._email || !this._phoneNumber) {
      return false;
    }

    // 密码哈希不能为空
    if (!this._passwordHash) {
      return false;
    }

    // 如果邮箱和手机都已验证，状态应该是VERIFIED或ACTIVE
    if (this._emailVerified && this._phoneVerified) {
      if (
        this._status !== UserStatus.VERIFIED &&
        this._status !== UserStatus.ACTIVE
      ) {
        return false;
      }
    }

    return true;
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
   * @param params 操作参数
   * @returns 操作结果
   */
  public executeBusinessLogic(operation: string, params: unknown): unknown {
    return this.coordinateBusinessOperation(operation, params);
  }

  /**
   * 克隆聚合根
   * @returns 克隆的聚合根
   */
  public clone(): AggregateRoot {
    const cloned = new User(
      this.id,
      this._email.clone() as EmailValueObject,
      this._phoneNumber.clone() as PhoneNumberValueObject,
      this._name.clone() as UserNameValueObject,
      this._passwordHash.clone() as PasswordHashValueObject,
    );

    cloned._emailVerified = this._emailVerified;
    cloned._phoneVerified = this._phoneVerified;
    cloned._status = this._status;
    cloned._registeredAt = new Date(this._registeredAt.getTime());

    // 克隆内部实体
    for (const entity of this.internalEntities.values()) {
      if (entity instanceof VerificationCodeEntity) {
        cloned.addInternalEntity(entity.clone());
      }
    }

    return cloned;
  }
}
