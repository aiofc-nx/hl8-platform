/**
 * @fileoverview 邀请持久化实体
 * @description 用户邀请的数据库持久化表示
 */

import { Entity, Property, ManyToOne, Index } from "@mikro-orm/core";
import { BaseEntity } from "@hl8/infrastructure-kernel";
import { UserAssignmentPersistenceEntity } from "./user-assignment.persistence-entity.js";

/**
 * 邀请状态枚举（持久化层）
 */
export enum InvitationStatusEnum {
  PENDING = "PENDING",
  ACCEPTED = "ACCEPTED",
  EXPIRED = "EXPIRED",
  REVOKED = "REVOKED",
}

/**
 * 邀请持久化实体
 * @description 用户邀请的持久化表示
 * @note 邀请7天后自动过期
 */
@Entity({ tableName: "iam_invitations" })
@Index({ properties: ["userAssignment", "email", "status"] })
export class InvitationPersistenceEntity extends BaseEntity {
  /**
   * 用户分配（多对一）
   */
  @ManyToOne(() => UserAssignmentPersistenceEntity)
  userAssignment!: UserAssignmentPersistenceEntity;

  /**
   * 被邀请用户邮箱
   */
  @Property({ type: "string", length: 255 })
  email!: string;

  /**
   * 邀请状态
   */
  @Index()
  @Property({
    type: "string",
    default: InvitationStatusEnum.PENDING,
  })
  status: InvitationStatusEnum = InvitationStatusEnum.PENDING;

  /**
   * 过期时间（7天后）
   */
  @Index()
  @Property({ type: "timestamp" })
  expiresAt!: Date;

  /**
   * 接受时间
   */
  @Property({ type: "timestamp", nullable: true })
  acceptedAt?: Date;

  /**
   * 撤销时间
   */
  @Property({ type: "timestamp", nullable: true })
  revokedAt?: Date;

  /**
   * 邀请者用户ID
   */
  @Property({ type: "uuid" })
  invitedBy!: string;

  /**
   * 邀请码（用于接受邀请）
   */
  @Index()
  @Property({ type: "string", length: 64 })
  invitationCode!: string;
}
