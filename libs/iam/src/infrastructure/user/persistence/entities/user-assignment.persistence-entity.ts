/**
 * @fileoverview 用户分配持久化实体
 * @description 用户分配聚合根的数据库持久化表示
 */

import { Entity, Property, Index, OneToMany } from "@mikro-orm/core";
import { TenantIsolatedPersistenceEntity } from "@hl8/infrastructure-kernel";
import { UserTenantAssignmentPersistenceEntity } from "./user-tenant-assignment.persistence-entity.js";
import { UserOrganizationAssignmentPersistenceEntity } from "./user-organization-assignment.persistence-entity.js";
import { UserDepartmentAssignmentPersistenceEntity } from "./user-department-assignment.persistence-entity.js";
import { InvitationPersistenceEntity } from "./invitation.persistence-entity.js";

/**
 * 用户分配持久化实体
 * @description 用户分配聚合根在数据库中的持久化表示
 * @note 用户分配是租户隔离的实体，继承 TenantIsolatedPersistenceEntity
 */
@Entity({ tableName: "iam_user_assignments" })
export class UserAssignmentPersistenceEntity extends TenantIsolatedPersistenceEntity {
  /**
   * 用户ID（外键关联到用户表）
   */
  @Index()
  @Property({ type: "uuid" })
  userId!: string;

  /**
   * 租户分配（一对多）
   * @description 用户到租户的分配关系
   */
  @OneToMany(
    () => UserTenantAssignmentPersistenceEntity,
    (assignment) => assignment.userAssignment,
    { orphanRemoval: true },
  )
  tenantAssignments = new Array<UserTenantAssignmentPersistenceEntity>();

  /**
   * 组织分配（一对多）
   * @description 用户到组织的分配关系
   */
  @OneToMany(
    () => UserOrganizationAssignmentPersistenceEntity,
    (assignment) => assignment.userAssignment,
    { orphanRemoval: true },
  )
  organizationAssignments =
    new Array<UserOrganizationAssignmentPersistenceEntity>();

  /**
   * 部门分配（一对多）
   * @description 用户到部门的分配关系
   */
  @OneToMany(
    () => UserDepartmentAssignmentPersistenceEntity,
    (assignment) => assignment.userAssignment,
    { orphanRemoval: true },
  )
  departmentAssignments =
    new Array<UserDepartmentAssignmentPersistenceEntity>();

  /**
   * 邀请（一对多）
   * @description 用户邀请记录
   */
  @OneToMany(
    () => InvitationPersistenceEntity,
    (invitation) => invitation.userAssignment,
    { orphanRemoval: true },
  )
  invitations = new Array<InvitationPersistenceEntity>();
}
