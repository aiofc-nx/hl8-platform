/**
 * @fileoverview 租户控制器
 * @description 处理租户相关的HTTP请求，包括创建租户等
 */

import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  HttpException,
} from "@nestjs/common";
import { CommandBus } from "@nestjs/cqrs";
import { CreateTenantCommand } from "../../../application/tenant/commands/create-tenant.command.js";
import { CreateTenantDto } from "../dto/create-tenant.dto.js";

/**
 * 创建租户响应DTO
 * @description 返回给客户端的租户创建结果
 */
export interface CreateTenantResponseDto {
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
 * 租户控制器
 * @description 处理租户相关的HTTP请求
 */
@Controller("tenants")
export class TenantsController {
  constructor(private readonly commandBus: CommandBus) {}

  /**
   * 创建租户
   * @description 创建新租户，自动创建默认组织和根部门
   * @param dto 创建租户DTO
   * @returns 创建结果
   * @throws {HttpException} 当创建失败时抛出HTTP异常
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createTenant(
    @Body() dto: CreateTenantDto,
  ): Promise<CreateTenantResponseDto> {
    try {
      // 创建命令
      const command = new CreateTenantCommand(
        dto.code,
        dto.name,
        dto.domain,
        dto.type,
      );

      // 执行命令
      // CommandBus.execute 返回的是 CommandHandler.handle 方法的返回值
      // CreateTenantHandler.handle 返回 CreateTenantCommandResult
      const result =
        await this.commandBus.execute<CreateTenantCommand>(command);

      // 返回结果（CommandHandler.handle 已经处理了错误，成功时返回结果）
      return result;
    } catch (error) {
      // 处理错误
      if (error instanceof Error) {
        // 检查是否是业务错误（包含错误代码）
        const errorMessage = error.message;
        if (errorMessage.includes("CODE_ALREADY_EXISTS")) {
          throw new HttpException(
            { message: "租户代码已被使用", code: "CODE_ALREADY_EXISTS" },
            HttpStatus.CONFLICT,
          );
        }
        if (errorMessage.includes("DOMAIN_ALREADY_EXISTS")) {
          throw new HttpException(
            { message: "租户域名已被使用", code: "DOMAIN_ALREADY_EXISTS" },
            HttpStatus.CONFLICT,
          );
        }
        if (errorMessage.includes("INVALID_TENANT_TYPE")) {
          throw new HttpException(
            { message: "租户类型无效", code: "INVALID_TENANT_TYPE" },
            HttpStatus.BAD_REQUEST,
          );
        }
        // 其他错误
        throw new HttpException(
          {
            message: errorMessage || "租户创建失败",
            code: "TENANT_CREATION_FAILED",
          },
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
      // 未知错误
      throw new HttpException(
        { message: "租户创建失败", code: "TENANT_CREATION_FAILED" },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
