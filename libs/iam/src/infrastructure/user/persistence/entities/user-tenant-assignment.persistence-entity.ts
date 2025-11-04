/**
 * @fileoverview 用户租户分配持久化实体
 * @description 用户到租户的分配关系的数据库持久化表示
 */

import { Entity, Property, ManyToOne } from "@mikro-orm/core";
import { BaseEntity } from "@hl8/infrastructure-kernel";
import { UserAssignmentPersistenceEntity } from "./user-assignment.persistence-entity.js";

/**
 * 用户租户分配持久化实体
 * @description 用户到租户的分配关系的持久化表示
 */
@Entity({ tableName: "iam_user_tenant_assignments" })
export class UserTenantAssignmentPersistenceEntity extends BaseEntity {
  /**
   * 用户分配（多对一）
   */
  @ManyToOne(() => UserAssignmentPersistenceEntity)
  userAssignment!: UserAssignmentPersistenceEntity;

  /**
   * 租户ID（外键关联到租户表）
   */
  @Property({ type: "uuid" })
  tenantId!: string;

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
