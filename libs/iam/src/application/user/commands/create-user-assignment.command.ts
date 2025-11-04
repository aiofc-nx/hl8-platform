/**
 * @fileoverview 创建用户分配命令
 * @description 创建用户到组织或部门的分配的命令
 */

import { BaseCommand } from "@hl8/application-kernel";
import { IsNotEmpty, IsOptional, IsString, IsUUID } from "class-validator";

/**
 * 创建用户分配命令结果
 */
export interface CreateUserAssignmentCommandResult {
  /** 分配ID */
  assignmentId: string;
  /** 租户ID */
  tenantId: string;
  /** 被分配用户ID */
  assignedUserId: string;
  /** 组织ID（如果已分配） */
  organizationId?: string;
  /** 部门ID（如果已分配） */
  departmentId?: string;
}

/**
 * 创建用户分配命令
 * @description 用于创建用户到组织或部门分配的命令
 */
export class CreateUserAssignmentCommand extends BaseCommand<CreateUserAssignmentCommandResult> {
  /** 租户ID */
  @IsNotEmpty()
  @IsUUID()
  @IsString()
  public readonly tenantId: string;

  /** 被分配用户ID */
  @IsNotEmpty()
  @IsUUID()
  @IsString()
  public readonly assignedUserId: string;

  /** 组织ID（可选） */
  @IsOptional()
  @IsUUID()
  @IsString()
  public readonly organizationId?: string;

  /** 部门ID（可选） */
  @IsOptional()
  @IsUUID()
  @IsString()
  public readonly departmentId?: string;

  /** 角色ID（可选） */
  @IsOptional()
  @IsUUID()
  @IsString()
  public readonly roleId?: string;

  /**
   * 创建用户分配命令
   * @param tenantId 租户ID
   * @param assignedUserId 被分配用户ID
   * @param options 命令选项
   */
  constructor(
    tenantId: string,
    assignedUserId: string,
    options: {
      organizationId?: string;
      departmentId?: string;
      roleId?: string;
      commandId?: string;
      correlationId?: string;
      timestamp?: Date;
      version?: string;
      metadata?: Record<string, unknown>;
    } = {},
  ) {
    super(tenantId, "CreateUserAssignment", options);
    this.tenantId = tenantId;
    this.assignedUserId = assignedUserId;
    this.organizationId = options.organizationId;
    this.departmentId = options.departmentId;
    this.roleId = options.roleId;
  }

  /**
   * 克隆命令对象
   * @returns 新的命令对象实例
   */
  public clone(): CreateUserAssignmentCommand {
    return new CreateUserAssignmentCommand(this.tenantId, this.assignedUserId, {
      organizationId: this.organizationId,
      departmentId: this.departmentId,
      roleId: this.roleId,
      commandId: this.commandId,
      correlationId: this.correlationId,
      timestamp: this.timestamp,
      version: this.version,
      metadata: this.metadata ? { ...this.metadata } : undefined,
    });
  }
}
