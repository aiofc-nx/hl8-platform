/**
 * @fileoverview 用户部门分配持久化实体
 * @description 用户到部门的分配关系的数据库持久化表示
 */

import { Entity, Property, ManyToOne, Index, Unique } from "@mikro-orm/core";
import { BaseEntity } from "@hl8/infrastructure-kernel";
import { UserAssignmentPersistenceEntity } from "./user-assignment.persistence-entity.js";

/**
 * 用户部门分配持久化实体
 * @description 用户到部门的分配关系的持久化表示
 * @note 业务规则：同一组织内用户只能属于一个部门（通过唯一索引保证）
 */
@Entity({ tableName: "iam_user_department_assignments" })
@Unique({ properties: ["userAssignment", "departmentId"] })
export class UserDepartmentAssignmentPersistenceEntity extends BaseEntity {
  /**
   * 用户分配（多对一）
   */
  @ManyToOne(() => UserAssignmentPersistenceEntity)
  userAssignment!: UserAssignmentPersistenceEntity;

  /**
   * 部门ID（外键关联到部门表）
   */
  @Property({ type: "uuid" })
  departmentId!: string;

  /**
   * 组织ID（冗余字段，用于快速查询和验证）
   */
  @Index()
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
