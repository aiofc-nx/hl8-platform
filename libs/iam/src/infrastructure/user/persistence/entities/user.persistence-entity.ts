/**
 * @fileoverview 用户持久化实体
 * @description 用户聚合根的数据库持久化表示
 */

import { Entity, Property, Index, Unique } from "@mikro-orm/core";
import { BaseEntity } from "@hl8/infrastructure-kernel";

/**
 * 用户状态枚举（持久化层）
 */
export enum UserStatusEnum {
  UNVERIFIED = "UNVERIFIED",
  VERIFIED = "VERIFIED",
  ACTIVE = "ACTIVE",
  DISABLED = "DISABLED",
}

/**
 * 用户持久化实体
 * @description 用户聚合根在数据库中的持久化表示
 * @note 用户不是租户隔离实体，因为用户是平台级别的
 */
@Entity({ tableName: "users", collection: "users" })
export class UserPersistenceEntity extends BaseEntity {
  /**
   * 邮箱地址（唯一索引）
   */
  @Index()
  @Unique()
  @Property({ type: "string", length: 255 })
  email!: string;

  /**
   * 手机号（唯一索引）
   */
  @Index()
  @Unique()
  @Property({ type: "string", length: 20 })
  phoneNumber!: string;

  /**
   * 姓名
   */
  @Property({ type: "string", length: 50 })
  name!: string;

  /**
   * 密码哈希
   */
  @Property({ type: "text" })
  passwordHash!: string;

  /**
   * 邮箱验证状态
   */
  @Property({ type: "boolean", default: false })
  emailVerified = false;

  /**
   * 手机验证状态
   */
  @Property({ type: "boolean", default: false })
  phoneVerified = false;

  /**
   * 用户状态
   */
  @Index()
  @Property({
    type: "string",
    default: UserStatusEnum.UNVERIFIED,
  })
  status: UserStatusEnum = UserStatusEnum.UNVERIFIED;

  /**
   * 注册时间
   */
  @Property({ type: "date" })
  registeredAt = new Date();
}
