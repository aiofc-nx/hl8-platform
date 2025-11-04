/**
 * @fileoverview 用户分配聚合根
 * @description 管理用户到租户、组织、部门的分配关系
 */

import {
  TenantIsolatedAggregateRoot,
  EntityId,
  TenantId,
  OrganizationId,
  DepartmentId,
  InternalEntity,
} from "@hl8/domain-kernel";
import { UserTenantAssignmentEntity } from "../entities/user-tenant-assignment.entity.js";
import { UserOrganizationAssignmentEntity } from "../entities/user-organization-assignment.entity.js";
import { UserDepartmentAssignmentEntity } from "../entities/user-department-assignment.entity.js";
import {
  InvitationEntity,
  InvitationStatus,
} from "../entities/invitation.entity.js";

/**
 * 用户分配聚合根
 * @description 管理用户到租户、组织、部门的分配关系
 * @note 用户分配是租户隔离的聚合根，继承 TenantIsolatedAggregateRoot
 * @example
 * ```typescript
 * const assignment = UserAssignment.create(
 *   userId,
 *   tenantId
 * );
 * ```
 */
export class UserAssignment extends TenantIsolatedAggregateRoot {
  private _userId: EntityId;

  /**
   * 设置用户ID（用于从持久化重建）
   * @param userId 用户ID
   */
  public setUserId(userId: EntityId): void {
    this._userId = userId;
  }

  /**
   * 创建用户分配聚合根（私有构造函数，使用静态工厂方法）
   * @param assignmentId 分配ID
   * @param userId 用户ID
   * @param tenantId 租户ID
   */
  private constructor(
    assignmentId: EntityId,
    userId: EntityId,
    tenantId: TenantId,
  ) {
    // UserAssignment 是租户隔离的聚合根
    super(tenantId, undefined, undefined, assignmentId);
    this._userId = userId;
  }

  /**
   * 创建新用户分配（工厂方法）
   * @param userId 用户ID
   * @param tenantId 租户ID
   * @returns 用户分配聚合根
   */
  public static create(userId: EntityId, tenantId: TenantId): UserAssignment {
    const assignmentId = EntityId.generate();
    const assignment = new UserAssignment(assignmentId, userId, tenantId);

    // 发布用户分配创建事件
    assignment.addDomainEvent({
      type: "UserAssignmentCreated",
      aggregateRootId: assignmentId,
      timestamp: new Date(),
      data: {
        assignmentId: assignmentId.value,
        userId: userId.value,
        tenantId: tenantId.value,
        createdAt: assignment.createdAt,
      },
    });

    return assignment;
  }

  /**
   * 从持久化数据重建用户分配聚合根（工厂方法）
   * @param assignmentId 分配ID
   * @param userId 用户ID
   * @param tenantId 租户ID
   * @param createdAt 创建时间
   * @param version 版本号
   * @returns 用户分配聚合根
   */
  public static fromPersistence(
    assignmentId: EntityId,
    userId: EntityId,
    tenantId: TenantId,
    _createdAt: Date,
    _version: number,
  ): UserAssignment {
    const assignment = new UserAssignment(assignmentId, userId, tenantId);
    // 注意：createdAt 和 version 由基类管理，这里不需要手动设置
    return assignment;
  }

  /**
   * 获取分配ID
   * @returns 分配ID（聚合根ID）
   */
  public get assignmentId(): EntityId {
    return this.id.clone();
  }

  /**
   * 获取用户ID
   * @returns 用户ID
   */
  public get userId(): EntityId {
    return this._userId.clone();
  }

  /**
   * 添加租户分配
   * @param tenantId 租户ID
   * @param roleId 角色ID，可选
   * @throws {Error} 当租户分配已存在时抛出异常
   */
  public addTenantAssignment(tenantId: TenantId, roleId?: EntityId): void {
    // 验证租户ID是否匹配
    if (!tenantId.equals(this.tenantId)) {
      throw new Error("租户ID必须匹配聚合根的租户ID");
    }

    // 检查是否已存在租户分配
    const existingAssignment = this.getTenantAssignment();
    if (existingAssignment) {
      throw new Error("租户分配已存在");
    }

    const assignment = new UserTenantAssignmentEntity(this.id, {
      tenantId,
      roleId,
      assignedAt: new Date(),
    });

    this.addInternalEntity(assignment);
  }

  /**
   * 获取租户分配
   * @returns 租户分配实体，如果不存在则返回null
   */
  public getTenantAssignment(): UserTenantAssignmentEntity | null {
    const entities = Array.from(this.internalEntities.values());
    const assignment = entities.find(
      (entity) => entity instanceof UserTenantAssignmentEntity,
    ) as UserTenantAssignmentEntity | undefined;
    return assignment || null;
  }

  /**
   * 添加组织分配
   * @param organizationId 组织ID
   * @param roleId 角色ID，可选
   * @throws {Error} 当组织分配已存在时抛出异常
   */
  public addOrganizationAssignment(
    organizationId: OrganizationId,
    roleId?: EntityId,
  ): void {
    // 验证组织是否属于当前租户
    if (!organizationId.belongsTo(this.tenantId)) {
      throw new Error("组织必须属于当前租户");
    }

    // 检查是否已存在该组织分配
    const existingAssignment = this.getOrganizationAssignment(organizationId);
    if (existingAssignment) {
      throw new Error("组织分配已存在");
    }

    const assignment = new UserOrganizationAssignmentEntity(this.id, {
      organizationId,
      roleId,
      assignedAt: new Date(),
    });

    this.addInternalEntity(assignment);
  }

  /**
   * 获取组织分配
   * @param organizationId 组织ID
   * @returns 组织分配实体，如果不存在则返回null
   */
  public getOrganizationAssignment(
    organizationId: OrganizationId,
  ): UserOrganizationAssignmentEntity | null {
    const entities = Array.from(this.internalEntities.values());
    const assignment = entities.find(
      (entity) =>
        entity instanceof UserOrganizationAssignmentEntity &&
        entity.organizationId.equals(organizationId),
    ) as UserOrganizationAssignmentEntity | undefined;
    return assignment || null;
  }

  /**
   * 获取所有组织分配
   * @returns 组织分配实体数组
   */
  public getAllOrganizationAssignments(): UserOrganizationAssignmentEntity[] {
    const entities = Array.from(this.internalEntities.values());
    return entities.filter(
      (entity) => entity instanceof UserOrganizationAssignmentEntity,
    ) as UserOrganizationAssignmentEntity[];
  }

  /**
   * 添加部门分配
   * @param departmentId 部门ID
   * @param roleId 角色ID，可选
   * @throws {Error} 当部门分配已存在或违反业务规则时抛出异常
   */
  public addDepartmentAssignment(
    departmentId: DepartmentId,
    roleId?: EntityId,
  ): void {
    // 验证部门是否属于当前租户
    const organizationId = departmentId.organizationId;
    if (!organizationId.belongsTo(this.tenantId)) {
      throw new Error("部门必须属于当前租户");
    }

    // 业务规则：同一组织内用户只能属于一个部门
    const orgAssignments = this.getAllOrganizationAssignments();
    const hasOrgAssignment = orgAssignments.some((assignment) =>
      assignment.organizationId.equals(organizationId),
    );

    if (!hasOrgAssignment) {
      throw new Error("用户必须先分配到组织，才能分配到部门");
    }

    // 检查该组织内是否已有部门分配
    const existingDeptAssignments = this.getAllDepartmentAssignments();
    const existingInSameOrg = existingDeptAssignments.find((assignment) =>
      assignment.departmentId.organizationId.equals(organizationId),
    );

    if (existingInSameOrg) {
      throw new Error("同一组织内用户只能属于一个部门");
    }

    // 检查是否已存在该部门分配
    const existingAssignment = this.getDepartmentAssignment(departmentId);
    if (existingAssignment) {
      throw new Error("部门分配已存在");
    }

    const assignment = new UserDepartmentAssignmentEntity(this.id, {
      departmentId,
      roleId,
      assignedAt: new Date(),
    });

    this.addInternalEntity(assignment);
  }

  /**
   * 获取部门分配
   * @param departmentId 部门ID
   * @returns 部门分配实体，如果不存在则返回null
   */
  public getDepartmentAssignment(
    departmentId: DepartmentId,
  ): UserDepartmentAssignmentEntity | null {
    const entities = Array.from(this.internalEntities.values());
    const assignment = entities.find(
      (entity) =>
        entity instanceof UserDepartmentAssignmentEntity &&
        entity.departmentId.equals(departmentId),
    ) as UserDepartmentAssignmentEntity | undefined;
    return assignment || null;
  }

  /**
   * 获取所有部门分配
   * @returns 部门分配实体数组
   */
  public getAllDepartmentAssignments(): UserDepartmentAssignmentEntity[] {
    const entities = Array.from(this.internalEntities.values());
    return entities.filter(
      (entity) => entity instanceof UserDepartmentAssignmentEntity,
    ) as UserDepartmentAssignmentEntity[];
  }

  /**
   * 创建邀请
   * @param email 被邀请用户邮箱
   * @param invitedBy 邀请者用户ID
   * @param invitationCode 邀请码
   * @returns 邀请实体
   * @throws {Error} 当邀请已存在时抛出异常
   */
  public createInvitation(
    email: string,
    invitedBy: EntityId,
    invitationCode: string,
  ): InvitationEntity {
    // 检查是否已存在待处理的邀请
    const existingInvitation = this.getPendingInvitation(email);
    if (existingInvitation) {
      throw new Error("该邮箱的邀请已存在");
    }

    // 创建邀请（7天后过期）
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const invitation = new InvitationEntity(this.id, {
      email,
      status: InvitationStatus.PENDING,
      expiresAt,
      invitedBy,
      invitationCode,
    });

    this.addInternalEntity(invitation);

    // 发布邀请创建事件
    this.addDomainEvent({
      type: "InvitationCreated",
      aggregateRootId: this.id,
      timestamp: new Date(),
      data: {
        assignmentId: this.id.value,
        email,
        invitationCode,
        expiresAt,
        invitedBy: invitedBy.value,
      },
    });

    return invitation;
  }

  /**
   * 获取待处理的邀请
   * @param email 邮箱
   * @returns 邀请实体，如果不存在则返回null
   */
  public getPendingInvitation(email: string): InvitationEntity | null {
    const entities = Array.from(this.internalEntities.values());
    const invitation = entities.find(
      (entity) =>
        entity instanceof InvitationEntity &&
        entity.email === email &&
        entity.status === InvitationStatus.PENDING,
    ) as InvitationEntity | undefined;
    return invitation || null;
  }

  /**
   * 获取所有邀请
   * @returns 邀请实体数组
   */
  public getAllInvitations(): InvitationEntity[] {
    const entities = Array.from(this.internalEntities.values());
    return entities.filter(
      (entity) => entity instanceof InvitationEntity,
    ) as InvitationEntity[];
  }

  /**
   * 接受邀请
   * @param email 被邀请用户邮箱
   * @param code 邀请码
   * @throws {Error} 当邀请不存在、已过期或邀请码不匹配时抛出异常
   */
  public acceptInvitation(email: string, code: string): void {
    const invitation = this.getPendingInvitation(email);
    if (!invitation) {
      throw new Error("邀请不存在或已被处理");
    }

    invitation.accept(code);

    // 发布邀请接受事件
    this.addDomainEvent({
      type: "InvitationAccepted",
      aggregateRootId: this.id,
      timestamp: new Date(),
      data: {
        assignmentId: this.id.value,
        email,
        acceptedAt: invitation.acceptedAt,
      },
    });
  }

  /**
   * 移除组织分配
   * @param organizationId 组织ID
   * @throws {Error} 当组织分配不存在时抛出异常
   */
  public removeOrganizationAssignment(organizationId: OrganizationId): void {
    const assignment = this.getOrganizationAssignment(organizationId);
    if (!assignment) {
      throw new Error("组织分配不存在");
    }

    // 如果移除了组织分配，需要同时移除该组织下的所有部门分配
    const deptAssignments = this.getAllDepartmentAssignments();
    const deptAssignmentsInOrg = deptAssignments.filter((assignment) =>
      assignment.departmentId.organizationId.equals(organizationId),
    );

    for (const deptAssignment of deptAssignmentsInOrg) {
      this.removeInternalEntity(deptAssignment.id);
    }

    this.removeInternalEntity(assignment.id);
  }

  /**
   * 移除部门分配
   * @param departmentId 部门ID
   * @throws {Error} 当部门分配不存在时抛出异常
   */
  public removeDepartmentAssignment(departmentId: DepartmentId): void {
    const assignment = this.getDepartmentAssignment(departmentId);
    if (!assignment) {
      throw new Error("部门分配不存在");
    }

    this.removeInternalEntity(assignment.id);
  }

  /**
   * 执行协调操作
   * @param operation 操作名称
   * @param _params 操作参数
   * @returns 操作结果
   */
  protected performCoordination(operation: string, _params: unknown): unknown {
    // UserAssignment 的协调操作由具体方法实现
    // 这里可以根据 operation 调用不同的业务方法
    throw new Error(`未知操作: ${operation}`);
  }

  /**
   * 执行业务不变量验证
   * @returns 是否通过验证
   * @throws {Error} 当不变量被破坏时抛出
   */
  protected performBusinessInvariantValidation(): boolean {
    // 验证用户ID
    if (!this._userId || !this._userId.isValid()) {
      throw new Error("用户ID无效");
    }

    // 验证租户ID
    if (!this.tenantId.isValid()) {
      throw new Error("租户ID无效");
    }

    // 验证业务规则：同一组织内用户只能属于一个部门
    const orgAssignments = this.getAllOrganizationAssignments();
    const deptAssignments = this.getAllDepartmentAssignments();

    for (const orgAssignment of orgAssignments) {
      const orgId = orgAssignment.organizationId;
      const deptInSameOrg = deptAssignments.filter((dept) =>
        dept.departmentId.organizationId.equals(orgId),
      );

      if (deptInSameOrg.length > 1) {
        throw new Error(
          `组织 ${orgId.value} 内用户只能属于一个部门，但发现 ${deptInSameOrg.length} 个部门分配`,
        );
      }
    }

    return true;
  }

  /**
   * 克隆聚合根
   * @returns 新的聚合根实例
   */
  public clone(): TenantIsolatedAggregateRoot {
    const cloned = new UserAssignment(
      this.id.clone(),
      this._userId.clone(),
      this.tenantId,
    );

    // 克隆内部实体
    for (const entity of this.internalEntities.values()) {
      const clonedEntity = entity.clone();
      // 类型断言：我们知道内部实体克隆后仍然是 InternalEntity
      cloned.addInternalEntity(clonedEntity as InternalEntity);
    }

    return cloned;
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
   * @param params 参数
   * @returns 结果
   */
  public executeBusinessLogic(operation: string, params: unknown): unknown {
    return this.performCoordination(operation, params);
  }
}
