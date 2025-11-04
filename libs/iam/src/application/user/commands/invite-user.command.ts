/**
 * @fileoverview 邀请用户命令
 * @description 邀请用户加入租户的命令
 */

import { BaseCommand } from "@hl8/application-kernel";
import { IsEmail, IsNotEmpty, IsString, IsUUID } from "class-validator";

/**
 * 邀请用户命令结果
 */
export interface InviteUserCommandResult {
  /** 分配ID */
  assignmentId: string;
  /** 租户ID */
  tenantId: string;
  /** 被邀请用户邮箱 */
  email: string;
  /** 邀请码 */
  invitationCode: string;
  /** 过期时间 */
  expiresAt: Date;
}

/**
 * 邀请用户命令
 * @description 用于邀请用户加入租户的命令
 */
export class InviteUserCommand extends BaseCommand<InviteUserCommandResult> {
  /** 租户ID */
  @IsNotEmpty()
  @IsUUID()
  @IsString()
  public readonly tenantId: string;

  /** 被邀请用户邮箱 */
  @IsNotEmpty()
  @IsEmail()
  @IsString()
  public readonly email: string;

  /** 邀请者用户ID */
  @IsNotEmpty()
  @IsUUID()
  @IsString()
  public readonly invitedBy: string;

  /** 邀请码 */
  @IsNotEmpty()
  @IsString()
  public readonly invitationCode: string;

  /**
   * 创建邀请用户命令
   * @param tenantId 租户ID
   * @param email 被邀请用户邮箱
   * @param invitedBy 邀请者用户ID
   * @param invitationCode 邀请码
   * @param options 命令选项
   */
  constructor(
    tenantId: string,
    email: string,
    invitedBy: string,
    invitationCode: string,
    options: {
      commandId?: string;
      correlationId?: string;
      userId?: string;
      timestamp?: Date;
      version?: string;
      metadata?: Record<string, unknown>;
    } = {},
  ) {
    super(tenantId, "InviteUser", options);
    this.tenantId = tenantId;
    this.email = email;
    this.invitedBy = invitedBy;
    this.invitationCode = invitationCode;
  }

  /**
   * 克隆命令对象
   * @returns 新的命令对象实例
   */
  public clone(): InviteUserCommand {
    return new InviteUserCommand(
      this.tenantId,
      this.email,
      this.invitedBy,
      this.invitationCode,
      {
        commandId: this.commandId,
        correlationId: this.correlationId,
        userId: this.userId,
        timestamp: this.timestamp,
        version: this.version,
        metadata: this.metadata ? { ...this.metadata } : undefined,
      },
    );
  }
}
