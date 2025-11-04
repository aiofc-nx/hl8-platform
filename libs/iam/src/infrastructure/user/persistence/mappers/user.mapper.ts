/**
 * @fileoverview 用户实体映射器
 * @description 在领域实体User和持久化实体UserPersistenceEntity之间进行转换
 */

import { EntityId } from "@hl8/domain-kernel";
import { User } from "../../../../domain/user/aggregates/user.aggregate.js";
import { EmailValueObject } from "../../../../domain/user/value-objects/email.value-object.js";
import { PhoneNumberValueObject } from "../../../../domain/user/value-objects/phone-number.value-object.js";
import { UserNameValueObject } from "../../../../domain/user/value-objects/user-name.value-object.js";
import { PasswordHashValueObject } from "../../../../domain/user/value-objects/password-hash.value-object.js";
import { UserStatus } from "../../../../domain/user/events/user-status-changed.event.js";
import {
  UserPersistenceEntity,
  UserStatusEnum,
} from "../entities/user.persistence-entity.js";
// import { VerificationCodeEntity } from "../../../domain/user/entities/verification-code.entity.js"; // 暂时未使用，保留注释以备将来需要

/**
 * 用户实体映射器
 * @description 负责领域实体和持久化实体之间的双向转换
 */
export class UserMapper {
  /**
   * 将领域实体转换为持久化实体
   * @param domainEntity 领域实体（User聚合根）
   * @param persistenceEntity 持久化实体（可选，如果提供则更新，否则创建新实例）
   * @returns 持久化实体
   */
  public static toPersistence(
    domainEntity: User,
    persistenceEntity?: UserPersistenceEntity,
  ): UserPersistenceEntity {
    const entity = persistenceEntity || new UserPersistenceEntity();

    entity.id = domainEntity.id.value;
    entity.email = domainEntity.email.value;
    entity.phoneNumber = domainEntity.phoneNumber.value;
    entity.name = domainEntity.name.value;
    entity.passwordHash = domainEntity.passwordHash.value;
    entity.emailVerified = domainEntity.emailVerified;
    entity.phoneVerified = domainEntity.phoneVerified;
    entity.status = this.mapStatusToPersistence(domainEntity.status);
    entity.registeredAt = domainEntity.registeredAt;
    entity.version = domainEntity.version;

    // 注意：验证码实体作为内部实体，通常不直接持久化
    // 如果需要持久化验证码，可以创建单独的验证码表
    // 这里暂时不处理验证码的持久化

    return entity;
  }

  /**
   * 将持久化实体转换为领域实体
   * @param persistenceEntity 持久化实体
   * @returns 领域实体（User聚合根）
   */
  public static toDomain(persistenceEntity: UserPersistenceEntity): User {
    // 创建值对象
    const email = new EmailValueObject(persistenceEntity.email);
    const phoneNumber = new PhoneNumberValueObject(
      persistenceEntity.phoneNumber,
    );
    const name = new UserNameValueObject(persistenceEntity.name);
    const passwordHash = new PasswordHashValueObject(
      persistenceEntity.passwordHash,
    );

    // 使用User的fromPersistence静态方法重建实例
    const userId = EntityId.fromString(persistenceEntity.id);

    const user = User.fromPersistence(
      userId,
      email,
      phoneNumber,
      name,
      passwordHash,
      persistenceEntity.emailVerified,
      persistenceEntity.phoneVerified,
      this.mapStatusFromPersistence(persistenceEntity.status),
      persistenceEntity.registeredAt,
      persistenceEntity.version,
    );

    return user;
  }

  /**
   * 将领域状态映射到持久化状态
   * @param domainStatus 领域状态
   * @returns 持久化状态
   */
  private static mapStatusToPersistence(
    domainStatus: UserStatus,
  ): UserStatusEnum {
    switch (domainStatus) {
      case UserStatus.UNVERIFIED:
        return UserStatusEnum.UNVERIFIED;
      case UserStatus.VERIFIED:
        return UserStatusEnum.VERIFIED;
      case UserStatus.ACTIVE:
        return UserStatusEnum.ACTIVE;
      case UserStatus.DISABLED:
        return UserStatusEnum.DISABLED;
      default:
        return UserStatusEnum.UNVERIFIED;
    }
  }

  /**
   * 将持久化状态映射到领域状态
   * @param persistenceStatus 持久化状态
   * @returns 领域状态
   */
  private static mapStatusFromPersistence(
    persistenceStatus: UserStatusEnum,
  ): UserStatus {
    switch (persistenceStatus) {
      case UserStatusEnum.UNVERIFIED:
        return UserStatus.UNVERIFIED;
      case UserStatusEnum.VERIFIED:
        return UserStatus.VERIFIED;
      case UserStatusEnum.ACTIVE:
        return UserStatus.ACTIVE;
      case UserStatusEnum.DISABLED:
        return UserStatus.DISABLED;
      default:
        return UserStatus.UNVERIFIED;
    }
  }
}
