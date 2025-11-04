/**
 * @fileoverview 创建用户分配用例
 * @description 创建用户到组织或部门的分配的核心业务逻辑
 */

import { Injectable } from "@nestjs/common";
import { UseCase, UseCaseInput, UseCaseOutput } from "@hl8/application-kernel";
import type { Logger } from "@hl8/logger";
import {
  EntityId,
  TenantId,
  OrganizationId,
  DepartmentId,
} from "@hl8/domain-kernel";
import { UserAssignment } from "../../../domain/user/aggregates/user-assignment.aggregate.js";
import type { IUserAssignmentRepository } from "../../../domain/user/repositories/user-assignment.repository.interface.js";
import type { IUserRepository } from "../../../domain/user/repositories/user.repository.interface.js";
import type { ITenantRepository } from "../../../domain/tenant/repositories/tenant.repository.interface.js";
import type { IOrganizationRepository } from "../../../domain/organization/repositories/organization.repository.interface.js";
import type { IDepartmentRepository } from "../../../domain/department/repositories/department.repository.interface.js";

/**
 * 创建用户分配用例输入
 */
export class CreateUserAssignmentUseCaseInput extends UseCaseInput {
  /** 租户ID */
  public readonly tenantId: string;
  /** 被分配用户ID */
  public readonly assignedUserId: string;
  /** 组织ID（可选） */
  public readonly organizationId?: string;
  /** 部门ID（可选） */
  public readonly departmentId?: string;
  /** 角色ID（可选） */
  public readonly roleId?: string;

  constructor(
    tenantId: string,
    assignedUserId: string,
    options?: {
      organizationId?: string;
      departmentId?: string;
      roleId?: string;
      correlationId?: string;
      timestamp?: Date;
    },
  ) {
    super();
    this.tenantId = tenantId;
    this.assignedUserId = assignedUserId;
    this.organizationId = options?.organizationId;
    this.departmentId = options?.departmentId;
    this.roleId = options?.roleId;
    if (options) {
      this.correlationId = options.correlationId;
      if (options.timestamp) {
        this.timestamp = options.timestamp;
      }
    }
  }

  /**
   * 克隆输入对象
   * @returns 新的输入对象实例
   */
  public clone(): CreateUserAssignmentUseCaseInput {
    return new CreateUserAssignmentUseCaseInput(
      this.tenantId,
      this.assignedUserId,
      {
        organizationId: this.organizationId,
        departmentId: this.departmentId,
        roleId: this.roleId,
        correlationId: this.correlationId,
        timestamp: this.timestamp,
      },
    );
  }
}

/**
 * 创建用户分配用例输出
 */
export class CreateUserAssignmentUseCaseOutput extends UseCaseOutput {
  /** 分配ID */
  public readonly assignmentId: string;
  /** 租户ID */
  public readonly tenantId: string;
  /** 用户ID */
  public readonly userId: string;
  /** 组织ID（如果已分配） */
  public readonly organizationId?: string;
  /** 部门ID（如果已分配） */
  public readonly departmentId?: string;

  constructor(
    assignmentId: string,
    tenantId: string,
    userId: string,
    organizationId?: string,
    departmentId?: string,
  ) {
    super();
    this.assignmentId = assignmentId;
    this.tenantId = tenantId;
    this.userId = userId;
    this.organizationId = organizationId;
    this.departmentId = departmentId;
  }

  /**
   * 克隆输出对象
   * @returns 新的输出对象实例
   */
  public clone(): CreateUserAssignmentUseCaseOutput {
    return new CreateUserAssignmentUseCaseOutput(
      this.assignmentId,
      this.tenantId,
      this.userId,
      this.organizationId,
      this.departmentId,
    );
  }
}

/**
 * 创建用户分配用例
 * @description 创建用户到组织或部门的分配的核心业务逻辑
 */
@Injectable()
export class CreateUserAssignmentUseCase extends UseCase<
  CreateUserAssignmentUseCaseInput,
  CreateUserAssignmentUseCaseOutput
> {
  constructor(
    logger: Logger,
    private readonly userAssignmentRepository: IUserAssignmentRepository,
    private readonly userRepository: IUserRepository,
    private readonly tenantRepository: ITenantRepository,
    private readonly organizationRepository: IOrganizationRepository,
    private readonly departmentRepository: IDepartmentRepository,
  ) {
    super(logger);
  }

  /**
   * 获取用例描述
   * @returns 用例描述
   */
  public getDescription(): string {
    return "创建用户分配用例，将用户分配到组织或部门";
  }

  /**
   * 执行业务逻辑
   * @param input 用例输入
   * @returns 用例输出
   * @throws {Error} 当业务规则验证失败时抛出异常
   */
  protected async executeBusinessLogic(
    input: CreateUserAssignmentUseCaseInput,
  ): Promise<CreateUserAssignmentUseCaseOutput> {
    const tenantId = TenantId.fromString(input.tenantId);
    const userId = EntityId.fromString(input.assignedUserId);
    const roleId = input.roleId ? EntityId.fromString(input.roleId) : undefined;

    // 1. 验证租户存在
    const tenant = await this.tenantRepository.findByTenantId(tenantId);
    if (!tenant) {
      throw new Error("租户不存在");
    }

    // 2. 验证用户存在
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new Error("用户不存在");
    }

    // 3. 查找或创建用户分配
    let assignment =
      await this.userAssignmentRepository.findByUserIdAndTenantId(
        userId,
        tenantId,
      );

    if (!assignment) {
      // 用户未分配到该租户，创建新的用户分配
      assignment = UserAssignment.create(userId, tenantId);
      assignment.addTenantAssignment(tenantId, roleId);
    }

    // 4. 如果指定了组织，添加组织分配
    let organizationId: OrganizationId | undefined;
    if (input.organizationId) {
      const orgId = OrganizationId.fromString(tenantId, input.organizationId);
      // 验证组织存在（使用 findByOrganizationId）
      const organization =
        await this.organizationRepository.findByOrganizationId(orgId);
      if (!organization) {
        throw new Error("组织不存在");
      }

      // 验证组织属于该租户
      if (!organization.tenantId.equals(tenantId)) {
        throw new Error("组织不属于指定租户");
      }

      assignment.addOrganizationAssignment(orgId, roleId);
      organizationId = orgId;
    }

    // 5. 如果指定了部门，添加部门分配
    let departmentId: DepartmentId | undefined;
    if (input.departmentId) {
      if (!input.organizationId) {
        throw new Error("分配部门时必须同时指定组织");
      }

      const orgId = OrganizationId.fromString(tenantId, input.organizationId);
      const deptId = DepartmentId.fromString(orgId, input.departmentId);

      // 验证部门存在（使用 findByDepartmentId）
      const department =
        await this.departmentRepository.findByDepartmentId(deptId);
      if (!department) {
        throw new Error("部门不存在");
      }

      // 验证部门属于指定组织
      if (!department.organizationId.equals(orgId)) {
        throw new Error("部门不属于指定组织");
      }

      assignment.addDepartmentAssignment(deptId, roleId);
      departmentId = deptId;
    }

    // 6. 保存用户分配
    await this.userAssignmentRepository.save(assignment);

    return new CreateUserAssignmentUseCaseOutput(
      assignment.id.value,
      tenantId.value,
      userId.value,
      organizationId?.value,
      departmentId?.value,
    );
  }
}
