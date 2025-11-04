/**
 * @fileoverview 用户组织分配持久化实体
 * @description 用户到组织的分配关系的数据库持久化表示
 */

import { Entity, Property, ManyToOne, Index, Unique } from "@mikro-orm/core";
import { BaseEntity } from "@hl8/infrastructure-kernel";
import { UserAssignmentPersistenceEntity } from "./user-assignment.persistence-entity.js";

/**
 * 用户组织分配持久化实体
 * @description 用户到组织的分配关系的持久化表示
 */
@Entity({ tableName: "iam_user_organization_assignments" })
@Unique({ properties: ["userAssignment", "organizationId"] })
export class UserOrganizationAssignmentPersistenceEntity extends BaseEntity {
  /**
   * 用户分配（多对一）
   */
  @ManyToOne(() => UserAssignmentPersistenceEntity)
  userAssignment!: UserAssignmentPersistenceEntity;

  /**
   * 组织ID（外键关联到组织表）
   */
  @Property({ type: "uuid" })
  organizationId!: string;

  /**
   * 角色ID（可选，未来扩展）
   */
  @Property({ type: "uuid", nullable: true })
  roleId?: string;

  /**
   * 分配时间
   */
  @Property({ type: "timestamp" })
  assignedAt!: Date;
}
