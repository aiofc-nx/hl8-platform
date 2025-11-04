/**
 * @fileoverview 创建租户命令
 * @description 用于创建新租户的命令
 */

import { BaseCommand } from "@hl8/application-kernel";
import { IsNotEmpty, IsString, Length, Matches } from "class-validator";

/**
 * 创建租户命令结果
 */
export interface CreateTenantCommandResult {
  /** 租户ID */
  tenantId: string;
  /** 租户代码 */
  code: string;
  /** 租户名称 */
  name: string;
  /** 租户域名 */
  domain: string;
  /** 租户类型 */
  type: string;
  /** 创建时间 */
  createdAt: Date;
  /** 默认组织ID */
  defaultOrganizationId: string;
  /** 根部门ID */
  rootDepartmentId: string;
}

/**
 * 创建租户命令
 * @description 用于创建新租户的命令，会自动创建默认组织和根部门
 */
export class CreateTenantCommand extends BaseCommand<CreateTenantCommandResult> {
  /** 租户代码 */
  @IsNotEmpty({ message: "租户代码不能为空" })
  @IsString({ message: "租户代码必须是字符串" })
  @Length(3, 20, { message: "租户代码长度必须在3到20个字符之间" })
  @Matches(/^[a-zA-Z0-9][a-zA-Z0-9_-]*[a-zA-Z0-9]$|^[a-zA-Z0-9]$/, {
    message: "租户代码格式无效，应为字母数字开头/结尾，可包含连字符和下划线",
  })
  public readonly code: string;

  /** 租户名称 */
  @IsNotEmpty({ message: "租户名称不能为空" })
  @IsString({ message: "租户名称必须是字符串" })
  @Length(1, 100, { message: "租户名称长度必须在1到100个字符之间" })
  public readonly name: string;

  /** 租户域名 */
  @IsNotEmpty({ message: "租户域名不能为空" })
  @IsString({ message: "租户域名必须是字符串" })
  @Length(1, 253, { message: "租户域名长度不能超过253个字符" })
  @Matches(
    /^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)*[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/,
    {
      message: "租户域名格式无效",
    },
  )
  public readonly domain: string;

  /** 租户类型 */
  @IsNotEmpty({ message: "租户类型不能为空" })
  @IsString({ message: "租户类型必须是字符串" })
  public readonly type: string;

  /**
   * 创建创建租户命令
   * @param code 租户代码
   * @param name 租户名称
   * @param domain 租户域名
   * @param type 租户类型
   * @param options 命令选项
   */
  constructor(
    code: string,
    name: string,
    domain: string,
    type: string,
    options: {
      commandId?: string;
      correlationId?: string;
      userId?: string;
      timestamp?: Date;
      version?: string;
      metadata?: Record<string, unknown>;
    } = {},
  ) {
    // 使用临时聚合根ID（创建时租户还不存在）
    super("temp", "CreateTenant", options);
    this.code = code;
    this.name = name;
    this.domain = domain;
    this.type = type;
  }

  /**
   * 克隆命令对象
   * @returns 新的命令对象实例
   */
  public clone(): CreateTenantCommand {
    return new CreateTenantCommand(
      this.code,
      this.name,
      this.domain,
      this.type,
      {
        commandId: this.commandId,
        correlationId: this.correlationId,
        userId: this.userId,
        timestamp: this.timestamp,
        version: this.version,
        metadata: this.metadata,
      },
    );
  }
}
