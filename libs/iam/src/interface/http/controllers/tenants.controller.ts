/**
 * @fileoverview 租户控制器
 * @description 处理租户相关的HTTP请求
 */

import {
  Controller,
  Post,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  HttpException,
  UseGuards,
} from "@nestjs/common";
import { CommandBus } from "@nestjs/cqrs";
import { IsUUID as IsUUIDValidator } from "class-validator";
import { CreateTenantDto } from "../dto/create-tenant.dto.js";
import { CreateTenantCommand } from "../../../application/tenant/commands/create-tenant.command.js";
import { InviteUserDto } from "../dto/invite-user.dto.js";
import { InviteUserCommand } from "../../../application/user/commands/invite-user.command.js";
import { CreateUserAssignmentDto } from "../dto/create-user-assignment.dto.js";
import { CreateUserAssignmentCommand } from "../../../application/user/commands/create-user-assignment.command.js";

/**
 * 租户控制器
 * @description 处理租户相关的HTTP请求
 */
@Controller("tenants")
export class TenantsController {
  constructor(private readonly commandBus: CommandBus) {}

  /**
   * 创建租户
   * @description 创建新租户并初始化默认组织和根部门
   * @param dto 创建租户DTO
   * @returns 创建结果
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createTenant(@Body() dto: CreateTenantDto) {
    try {
      // 创建命令
      const command = new CreateTenantCommand(
        dto.code,
        dto.name,
        dto.domain,
        dto.type,
        {
          // TODO: 从认证上下文获取用户ID
          userId: "system", // 临时值，实际应从认证上下文获取
        },
      );

      // CommandBus.execute 返回的是 CommandHandler.handle 方法的返回值
      // CreateTenantHandler.handle 返回 CreateTenantCommandResult
      const result =
        await this.commandBus.execute<CreateTenantCommand>(command);

      // 返回结果（CommandHandler.handle 已经处理了错误，成功时返回结果）
      return {
        tenantId: result.tenantId,
        code: result.code,
        name: result.name,
        domain: result.domain,
        type: result.type,
        createdAt: result.createdAt,
        defaultOrganizationId: result.defaultOrganizationId,
        rootDepartmentId: result.rootDepartmentId,
      };
    } catch (error) {
      // 处理业务异常
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      // 根据错误类型返回不同的HTTP状态码
      if (errorMessage.includes("CODE_ALREADY_EXISTS")) {
        throw new HttpException(
          {
            message: "租户代码已存在",
            code: "CODE_ALREADY_EXISTS",
          },
          HttpStatus.CONFLICT,
        );
      }

      if (errorMessage.includes("DOMAIN_ALREADY_EXISTS")) {
        throw new HttpException(
          {
            message: "租户域名已存在",
            code: "DOMAIN_ALREADY_EXISTS",
          },
          HttpStatus.CONFLICT,
        );
      }

      if (errorMessage.includes("INVALID_TENANT_TYPE")) {
        throw new HttpException(
          {
            message: "无效的租户类型",
            code: "INVALID_TENANT_TYPE",
          },
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
  }

  /**
   * 邀请用户加入租户
   * @description 邀请用户加入指定租户
   * @param tenantId 租户ID
   * @param dto 邀请用户DTO
   * @returns 邀请结果
   */
  @Post(":tenantId/invitations")
  @HttpCode(HttpStatus.CREATED)
  async inviteUser(
    @Param("tenantId") tenantId: string,
    @Body() dto: InviteUserDto,
  ) {
    // 验证租户ID格式（使用正则表达式验证UUID格式）
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(tenantId)) {
      throw new HttpException(
        {
          message: "无效的租户ID格式",
          code: "INVALID_TENANT_ID",
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      // 创建命令
      const command = new InviteUserCommand(
        tenantId,
        dto.email,
        "system", // TODO: 从认证上下文获取邀请者用户ID
        dto.invitationCode,
        {
          // TODO: 从认证上下文获取用户ID和关联ID
          userId: "system",
        },
      );

      // 执行命令
      const result = await this.commandBus.execute<InviteUserCommand>(command);

      // 返回结果
      return {
        assignmentId: result.assignmentId,
        tenantId: result.tenantId,
        email: result.email,
        invitationCode: result.invitationCode,
        expiresAt: result.expiresAt,
      };
    } catch (error) {
      // 处理业务异常
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      // 根据错误类型返回不同的HTTP状态码
      if (errorMessage.includes("TENANT_NOT_FOUND")) {
        throw new HttpException(
          {
            message: "租户不存在",
            code: "TENANT_NOT_FOUND",
          },
          HttpStatus.NOT_FOUND,
        );
      }

      if (errorMessage.includes("INVITER_NOT_FOUND")) {
        throw new HttpException(
          {
            message: "邀请者不存在",
            code: "INVITER_NOT_FOUND",
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      if (errorMessage.includes("USER_NOT_REGISTERED")) {
        throw new HttpException(
          {
            message: "用户未注册，请先注册后再邀请",
            code: "USER_NOT_REGISTERED",
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      if (errorMessage.includes("INVITATION_ALREADY_EXISTS")) {
        throw new HttpException(
          {
            message: "该邮箱的邀请已存在",
            code: "INVITATION_ALREADY_EXISTS",
          },
          HttpStatus.CONFLICT,
        );
      }

      // 其他错误
      throw new HttpException(
        {
          message: errorMessage || "用户邀请失败",
          code: "INVITATION_FAILED",
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 创建用户分配
   * @description 将用户分配到组织或部门
   * @param tenantId 租户ID
   * @param userId 用户ID
   * @param dto 创建用户分配DTO
   * @returns 分配结果
   */
  @Post(":tenantId/users/:userId/assignments")
  @HttpCode(HttpStatus.CREATED)
  async createUserAssignment(
    @Param("tenantId") tenantId: string,
    @Param("userId") userId: string,
    @Body() dto: CreateUserAssignmentDto,
  ) {
    // 验证租户ID和用户ID格式（使用正则表达式验证UUID格式）
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(tenantId)) {
      throw new HttpException(
        {
          message: "无效的租户ID格式",
          code: "INVALID_TENANT_ID",
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    if (!uuidRegex.test(userId)) {
      throw new HttpException(
        {
          message: "无效的用户ID格式",
          code: "INVALID_USER_ID",
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      // 创建命令
      const command = new CreateUserAssignmentCommand(tenantId, userId, {
        organizationId: dto.organizationId,
        departmentId: dto.departmentId,
        roleId: dto.roleId,
      });

      // 执行命令
      const result =
        await this.commandBus.execute<CreateUserAssignmentCommand>(command);

      // 返回结果
      return {
        assignmentId: result.assignmentId,
        tenantId: result.tenantId,
        assignedUserId: result.assignedUserId,
        organizationId: result.organizationId,
        departmentId: result.departmentId,
      };
    } catch (error) {
      // 处理业务异常
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      // 根据错误类型返回不同的HTTP状态码
      if (errorMessage.includes("TENANT_NOT_FOUND")) {
        throw new HttpException(
          {
            message: "租户不存在",
            code: "TENANT_NOT_FOUND",
          },
          HttpStatus.NOT_FOUND,
        );
      }

      if (errorMessage.includes("USER_NOT_FOUND")) {
        throw new HttpException(
          {
            message: "用户不存在",
            code: "USER_NOT_FOUND",
          },
          HttpStatus.NOT_FOUND,
        );
      }

      if (errorMessage.includes("ORGANIZATION_NOT_FOUND")) {
        throw new HttpException(
          {
            message: "组织不存在",
            code: "ORGANIZATION_NOT_FOUND",
          },
          HttpStatus.NOT_FOUND,
        );
      }

      if (errorMessage.includes("DEPARTMENT_NOT_FOUND")) {
        throw new HttpException(
          {
            message: "部门不存在",
            code: "DEPARTMENT_NOT_FOUND",
          },
          HttpStatus.NOT_FOUND,
        );
      }

      if (errorMessage.includes("ORGANIZATION_TENANT_MISMATCH")) {
        throw new HttpException(
          {
            message: "组织不属于指定租户",
            code: "ORGANIZATION_TENANT_MISMATCH",
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      if (errorMessage.includes("DEPARTMENT_ORGANIZATION_MISMATCH")) {
        throw new HttpException(
          {
            message: "部门不属于指定组织",
            code: "DEPARTMENT_ORGANIZATION_MISMATCH",
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      if (errorMessage.includes("DEPARTMENT_REQUIRES_ORGANIZATION")) {
        throw new HttpException(
          {
            message: "分配部门时必须同时指定组织",
            code: "DEPARTMENT_REQUIRES_ORGANIZATION",
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      // 其他错误
      throw new HttpException(
        {
          message: errorMessage || "用户分配创建失败",
          code: "ASSIGNMENT_FAILED",
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
