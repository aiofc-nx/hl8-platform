/**
 * @fileoverview 邀请用户用例
 * @description 邀请用户加入租户的核心业务逻辑
 */

import { Injectable } from "@nestjs/common";
import { UseCase, UseCaseInput, UseCaseOutput } from "@hl8/application-kernel";
import type { Logger } from "@hl8/logger";
import { EntityId, TenantId } from "@hl8/domain-kernel";
import { UserAssignment } from "../../../domain/user/aggregates/user-assignment.aggregate.js";
import type { IUserAssignmentRepository } from "../../../domain/user/repositories/user-assignment.repository.interface.js";
import type { IUserRepository } from "../../../domain/user/repositories/user.repository.interface.js";
import type { ITenantRepository } from "../../../domain/tenant/repositories/tenant.repository.interface.js";

/**
 * 邀请用户用例输入
 */
export class InviteUserUseCaseInput extends UseCaseInput {
  /** 租户ID */
  public readonly tenantId: string;
  /** 被邀请用户邮箱 */
  public readonly email: string;
  /** 邀请者用户ID */
  public readonly invitedBy: string;
  /** 邀请码 */
  public readonly invitationCode: string;

  constructor(
    tenantId: string,
    email: string,
    invitedBy: string,
    invitationCode: string,
    options?: {
      correlationId?: string;
      userId?: string;
      timestamp?: Date;
    },
  ) {
    super();
    this.tenantId = tenantId;
    this.email = email;
    this.invitedBy = invitedBy;
    this.invitationCode = invitationCode;
    if (options) {
      this.correlationId = options.correlationId;
      this.userId = options.userId;
      if (options.timestamp) {
        this.timestamp = options.timestamp;
      }
    }
  }

  /**
   * 克隆输入对象
   * @returns 新的输入对象实例
   */
  public clone(): InviteUserUseCaseInput {
    return new InviteUserUseCaseInput(
      this.tenantId,
      this.email,
      this.invitedBy,
      this.invitationCode,
      {
        correlationId: this.correlationId,
        userId: this.userId,
        timestamp: this.timestamp,
      },
    );
  }
}

/**
 * 邀请用户用例输出
 */
export class InviteUserUseCaseOutput extends UseCaseOutput {
  /** 分配ID */
  public readonly assignmentId: string;
  /** 租户ID */
  public readonly tenantId: string;
  /** 被邀请用户邮箱 */
  public readonly email: string;
  /** 邀请码 */
  public readonly invitationCode: string;
  /** 过期时间 */
  public readonly expiresAt: Date;

  constructor(
    assignmentId: string,
    tenantId: string,
    email: string,
    invitationCode: string,
    expiresAt: Date,
  ) {
    super();
    this.assignmentId = assignmentId;
    this.tenantId = tenantId;
    this.email = email;
    this.invitationCode = invitationCode;
    this.expiresAt = expiresAt;
  }

  /**
   * 克隆输出对象
   * @returns 新的输出对象实例
   */
  public clone(): InviteUserUseCaseOutput {
    return new InviteUserUseCaseOutput(
      this.assignmentId,
      this.tenantId,
      this.email,
      this.invitationCode,
      this.expiresAt,
    );
  }
}

/**
 * 邀请用户用例
 * @description 邀请用户加入租户的核心业务逻辑
 */
@Injectable()
export class InviteUserUseCase extends UseCase<
  InviteUserUseCaseInput,
  InviteUserUseCaseOutput
> {
  constructor(
    logger: Logger,
    private readonly userAssignmentRepository: IUserAssignmentRepository,
    private readonly userRepository: IUserRepository,
    private readonly tenantRepository: ITenantRepository,
  ) {
    super(logger);
  }

  /**
   * 获取用例描述
   * @returns 用例描述
   */
  public getDescription(): string {
    return "邀请用户加入租户用例，创建用户分配和邀请";
  }

  /**
   * 执行业务逻辑
   * @param input 用例输入
   * @returns 用例输出
   * @throws {Error} 当业务规则验证失败时抛出异常
   */
  protected async executeBusinessLogic(
    input: InviteUserUseCaseInput,
  ): Promise<InviteUserUseCaseOutput> {
    const tenantId = TenantId.fromString(input.tenantId);
    const invitedBy = EntityId.fromString(input.invitedBy);

    // 1. 验证租户存在
    const tenant = await this.tenantRepository.findByTenantId(tenantId);
    if (!tenant) {
      throw new Error("租户不存在");
    }

    // 2. 验证邀请者存在
    const inviter = await this.userRepository.findById(invitedBy);
    if (!inviter) {
      throw new Error("邀请者不存在");
    }

    // 3. 检查用户是否已注册（通过邮箱查找）
    // 如果用户已注册，使用实际用户ID；如果未注册，需要先注册
    const { EmailValueObject } = await import(
      "../../../domain/user/value-objects/email.value-object.js"
    );
    const email = new EmailValueObject(input.email);
    const existingUser = await this.userRepository.findByEmail(email);

    let userId: EntityId;
    if (existingUser) {
      // 用户已注册，使用实际用户ID
      userId = existingUser.id;
    } else {
      // 用户未注册，需要先注册才能邀请
      // 这里简化处理：要求用户必须先注册
      // 实际实现中，可能需要支持"邀请未注册用户"的场景
      throw new Error("用户未注册，请先注册后再邀请");
    }

    // 5. 检查用户是否已分配到该租户
    const existingAssignment =
      await this.userAssignmentRepository.findByUserIdAndTenantId(
        userId,
        tenantId,
      );
    if (existingAssignment) {
      // 用户已分配到该租户，检查是否已有待处理的邀请
      const pendingInvitation = existingAssignment.getPendingInvitation(
        input.email,
      );
      if (pendingInvitation) {
        throw new Error("该邮箱的邀请已存在");
      }
      // 如果已分配但没有待处理邀请，可以创建新邀请
      // 创建邀请
      const invitation = existingAssignment.createInvitation(
        input.email,
        invitedBy,
        input.invitationCode,
      );

      // 保存用户分配
      await this.userAssignmentRepository.save(existingAssignment);

      return new InviteUserUseCaseOutput(
        existingAssignment.id.value,
        tenantId.value,
        input.email,
        input.invitationCode,
        invitation.expiresAt,
      );
    }

    // 6. 用户未分配到该租户，创建新的用户分配和邀请
    const assignment = UserAssignment.create(userId, tenantId);
    const invitation = assignment.createInvitation(
      input.email,
      invitedBy,
      input.invitationCode,
    );

    // 添加租户分配
    assignment.addTenantAssignment(tenantId);

    // 保存用户分配
    await this.userAssignmentRepository.save(assignment);

    return new InviteUserUseCaseOutput(
      assignment.id.value,
      tenantId.value,
      input.email,
      input.invitationCode,
      invitation.expiresAt,
    );
  }
}
