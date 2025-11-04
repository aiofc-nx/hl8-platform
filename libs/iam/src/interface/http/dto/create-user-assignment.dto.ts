/**
 * @fileoverview 创建用户分配DTO
 * @description 创建用户到组织或部门分配的请求数据传输对象
 */

import { IsOptional, IsString, IsUUID } from "class-validator";

/**
 * 创建用户分配DTO
 * @description 用于接收创建用户分配的HTTP请求数据
 */
export class CreateUserAssignmentDto {
  /** 组织ID（可选） */
  @IsOptional()
  @IsUUID()
  @IsString()
  organizationId?: string;

  /** 部门ID（可选） */
  @IsOptional()
  @IsUUID()
  @IsString()
  departmentId?: string;

  /** 角色ID（可选，未来扩展） */
  @IsOptional()
  @IsUUID()
  @IsString()
  roleId?: string;
}
