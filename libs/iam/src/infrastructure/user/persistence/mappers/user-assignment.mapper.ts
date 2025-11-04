/**
 * @fileoverview 用户分配实体映射器
 * @description 在领域实体UserAssignment和持久化实体UserAssignmentPersistenceEntity之间进行转换
 */

import { EntityId, TenantId } from "@hl8/domain-kernel";
import { UserAssignment } from "../../../../domain/user/aggregates/user-assignment.aggregate.js";
import { UserTenantAssignmentEntity } from "../../../../domain/user/entities/user-tenant-assignment.entity.js";
import { UserOrganizationAssignmentEntity } from "../../../../domain/user/entities/user-organization-assignment.entity.js";
import { UserDepartmentAssignmentEntity } from "../../../../domain/user/entities/user-department-assignment.entity.js";
import {
  InvitationEntity,
  InvitationStatus,
} from "../../../../domain/user/entities/invitation.entity.js";
import { UserAssignmentPersistenceEntity } from "../entities/user-assignment.persistence-entity.js";
import { UserTenantAssignmentPersistenceEntity } from "../entities/user-tenant-assignment.persistence-entity.js";
import { UserOrganizationAssignmentPersistenceEntity } from "../entities/user-organization-assignment.persistence-entity.js";
import { UserDepartmentAssignmentPersistenceEntity } from "../entities/user-department-assignment.persistence-entity.js";
import {
  InvitationPersistenceEntity,
  InvitationStatusEnum,
} from "../entities/invitation.persistence-entity.js";
import { OrganizationId } from "@hl8/domain-kernel";
import { DepartmentId } from "@hl8/domain-kernel";

/**
 * 用户分配实体映射器
 * @description 负责领域实体和持久化实体之间的双向转换
 */
export class UserAssignmentMapper {
  /**
   * 将领域实体转换为持久化实体
   * @param domainEntity 领域实体（UserAssignment聚合根）
   * @param persistenceEntity 持久化实体（可选，如果提供则更新，否则创建新实例）
   * @returns 持久化实体
   */
  public static toPersistence(
    domainEntity: UserAssignment,
    persistenceEntity?: UserAssignmentPersistenceEntity,
  ): UserAssignmentPersistenceEntity {
    const entity = persistenceEntity || new UserAssignmentPersistenceEntity();

    entity.id = domainEntity.id.value;
    entity.tenantId = domainEntity.tenantId.value;
    entity.userId = domainEntity.userId.value;
    entity.createdAt = domainEntity.createdAt;
    entity.updatedAt = domainEntity.updatedAt;
    entity.version = domainEntity.version;

    // 转换租户分配
    const tenantAssignment = domainEntity.getTenantAssignment();
    if (tenantAssignment) {
      const tenantAssignmentEntity =
        new UserTenantAssignmentPersistenceEntity();
      tenantAssignmentEntity.id = tenantAssignment.id.value;
      tenantAssignmentEntity.userAssignment = entity;
      tenantAssignmentEntity.tenantId = tenantAssignment.tenantId.value;
      tenantAssignmentEntity.roleId = tenantAssignment.roleId?.value;
      tenantAssignmentEntity.assignedAt = tenantAssignment.assignedAt;
      entity.tenantAssignments = [tenantAssignmentEntity];
    }

    // 转换组织分配
    const orgAssignments = domainEntity.getAllOrganizationAssignments();
    entity.organizationAssignments = orgAssignments.map((assignment) => {
      const orgAssignmentEntity =
        new UserOrganizationAssignmentPersistenceEntity();
      orgAssignmentEntity.id = assignment.id.value;
      orgAssignmentEntity.userAssignment = entity;
      orgAssignmentEntity.organizationId = assignment.organizationId.value;
      orgAssignmentEntity.roleId = assignment.roleId?.value;
      orgAssignmentEntity.assignedAt = assignment.assignedAt;
      return orgAssignmentEntity;
    });

    // 转换部门分配
    const deptAssignments = domainEntity.getAllDepartmentAssignments();
    entity.departmentAssignments = deptAssignments.map((assignment) => {
      const deptAssignmentEntity =
        new UserDepartmentAssignmentPersistenceEntity();
      deptAssignmentEntity.id = assignment.id.value;
      deptAssignmentEntity.userAssignment = entity;
      deptAssignmentEntity.departmentId = assignment.departmentId.value;
      deptAssignmentEntity.organizationId =
        assignment.departmentId.organizationId.value;
      deptAssignmentEntity.roleId = assignment.roleId?.value;
      deptAssignmentEntity.assignedAt = assignment.assignedAt;
      return deptAssignmentEntity;
    });

    // 转换邀请
    const invitations = domainEntity.getAllInvitations();
    entity.invitations = invitations.map((invitation) => {
      const invitationEntity = new InvitationPersistenceEntity();
      invitationEntity.id = invitation.id.value;
      invitationEntity.userAssignment = entity;
      invitationEntity.email = invitation.email;
      invitationEntity.status = this.mapInvitationStatusToPersistence(
        invitation.status,
      );
      invitationEntity.expiresAt = invitation.expiresAt;
      invitationEntity.acceptedAt = invitation.acceptedAt;
      invitationEntity.revokedAt = invitation.revokedAt;
      invitationEntity.invitedBy = invitation.invitedBy.value;
      invitationEntity.invitationCode = invitation.invitationCode;
      return invitationEntity;
    });

    return entity;
  }

  /**
   * 将持久化实体转换为领域实体
   * @param persistenceEntity 持久化实体
   * @returns 领域实体（UserAssignment聚合根）
   */
  public static toDomain(
    persistenceEntity: UserAssignmentPersistenceEntity,
  ): UserAssignment {
    const assignmentId = EntityId.fromString(persistenceEntity.id);
    const userId = EntityId.fromString(persistenceEntity.userId);
    const tenantId = TenantId.fromString(persistenceEntity.tenantId);

    // 使用UserAssignment的fromPersistence静态方法重建实例
    const assignment = UserAssignment.fromPersistence(
      assignmentId,
      userId,
      tenantId,
      persistenceEntity.createdAt,
      persistenceEntity.version,
    );

    // 重建租户分配
    if (
      persistenceEntity.tenantAssignments &&
      persistenceEntity.tenantAssignments.length > 0
    ) {
      const tenantAssignmentEntity = persistenceEntity.tenantAssignments[0];
      const tenantIdVO = TenantId.fromString(tenantAssignmentEntity.tenantId);
      const roleId = tenantAssignmentEntity.roleId
        ? EntityId.fromString(tenantAssignmentEntity.roleId)
        : undefined;
      const tenantAssignment = new UserTenantAssignmentEntity(
        assignmentId,
        {
          tenantId: tenantIdVO,
          roleId,
          assignedAt: tenantAssignmentEntity.assignedAt,
        },
        EntityId.fromString(tenantAssignmentEntity.id),
      );
      assignment.addInternalEntity(tenantAssignment);
    }

    // 重建组织分配
    if (persistenceEntity.organizationAssignments) {
      for (const orgAssignmentEntity of persistenceEntity.organizationAssignments) {
        const orgId = OrganizationId.fromString(
          tenantId,
          orgAssignmentEntity.organizationId,
        );
        const roleId = orgAssignmentEntity.roleId
          ? EntityId.fromString(orgAssignmentEntity.roleId)
          : undefined;
        const orgAssignment = new UserOrganizationAssignmentEntity(
          assignmentId,
          {
            organizationId: orgId,
            roleId,
            assignedAt: orgAssignmentEntity.assignedAt,
          },
          EntityId.fromString(orgAssignmentEntity.id),
        );
        assignment.addInternalEntity(orgAssignment);
      }
    }

    // 重建部门分配
    if (persistenceEntity.departmentAssignments) {
      for (const deptAssignmentEntity of persistenceEntity.departmentAssignments) {
        const orgId = OrganizationId.fromString(
          tenantId,
          deptAssignmentEntity.organizationId,
        );
        const deptId = DepartmentId.fromString(
          orgId,
          deptAssignmentEntity.departmentId,
        );
        const roleId = deptAssignmentEntity.roleId
          ? EntityId.fromString(deptAssignmentEntity.roleId)
          : undefined;
        const deptAssignment = new UserDepartmentAssignmentEntity(
          assignmentId,
          {
            departmentId: deptId,
            roleId,
            assignedAt: deptAssignmentEntity.assignedAt,
          },
          EntityId.fromString(deptAssignmentEntity.id),
        );
        assignment.addInternalEntity(deptAssignment);
      }
    }

    // 重建邀请
    if (persistenceEntity.invitations) {
      for (const invitationEntity of persistenceEntity.invitations) {
        const invitedBy = EntityId.fromString(invitationEntity.invitedBy);
        const invitation = new InvitationEntity(
          assignmentId,
          {
            email: invitationEntity.email,
            status: this.mapInvitationStatusFromPersistence(
              invitationEntity.status,
            ),
            expiresAt: invitationEntity.expiresAt,
            acceptedAt: invitationEntity.acceptedAt,
            revokedAt: invitationEntity.revokedAt,
            invitedBy,
            invitationCode: invitationEntity.invitationCode,
          },
          EntityId.fromString(invitationEntity.id),
        );
        assignment.addInternalEntity(invitation);
      }
    }

    return assignment;
  }

  /**
   * 将领域邀请状态映射到持久化状态
   * @param domainStatus 领域状态
   * @returns 持久化状态
   */
  private static mapInvitationStatusToPersistence(
    domainStatus: InvitationStatus,
  ): InvitationStatusEnum {
    switch (domainStatus) {
      case InvitationStatus.PENDING:
        return InvitationStatusEnum.PENDING;
      case InvitationStatus.ACCEPTED:
        return InvitationStatusEnum.ACCEPTED;
      case InvitationStatus.EXPIRED:
        return InvitationStatusEnum.EXPIRED;
      case InvitationStatus.REVOKED:
        return InvitationStatusEnum.REVOKED;
      default:
        return InvitationStatusEnum.PENDING;
    }
  }

  /**
   * 将持久化邀请状态映射到领域状态
   * @param persistenceStatus 持久化状态
   * @returns 领域状态
   */
  private static mapInvitationStatusFromPersistence(
    persistenceStatus: InvitationStatusEnum,
  ): InvitationStatus {
    switch (persistenceStatus) {
      case InvitationStatusEnum.PENDING:
        return InvitationStatus.PENDING;
      case InvitationStatusEnum.ACCEPTED:
        return InvitationStatus.ACCEPTED;
      case InvitationStatusEnum.EXPIRED:
        return InvitationStatus.EXPIRED;
      case InvitationStatusEnum.REVOKED:
        return InvitationStatus.REVOKED;
      default:
        return InvitationStatus.PENDING;
    }
  }
}
