/**
 * @fileoverview 创建用户分配命令处理器
 * @description 处理创建用户分配命令，委托给创建用户分配用例执行
 */

import { CommandHandler } from "@nestjs/cqrs";
import { Injectable } from "@nestjs/common";
import { BaseCommandHandler, CommandResult } from "@hl8/application-kernel";
import { Logger } from "@hl8/logger";
import {
  CreateUserAssignmentCommand,
  CreateUserAssignmentCommandResult,
} from "../commands/create-user-assignment.command.js";
import {
  CreateUserAssignmentUseCase,
  CreateUserAssignmentUseCaseInput,
} from "../use-cases/create-user-assignment.use-case.js";

/**
 * 创建用户分配命令处理器
 * @description 处理创建用户分配命令，委托给创建用户分配用例执行
 * @note CommandHandler 负责适配和转换，UseCase 负责核心业务逻辑
 */
@Injectable()
@CommandHandler(CreateUserAssignmentCommand)
export class CreateUserAssignmentHandler extends BaseCommandHandler<
  CreateUserAssignmentCommand,
  CreateUserAssignmentCommandResult
> {
  constructor(
    logger: Logger,
    private readonly createUserAssignmentUseCase: CreateUserAssignmentUseCase,
  ) {
    super(logger);
  }

  /**
   * 执行命令逻辑
   * @param command 创建用户分配命令
   * @returns 命令结果
   */
  protected async executeCommand(
    command: CreateUserAssignmentCommand,
  ): Promise<CommandResult<CreateUserAssignmentCommandResult>> {
    try {
      // 将 Command 转换为 UseCase Input
      const useCaseInput = new CreateUserAssignmentUseCaseInput(
        command.tenantId,
        command.assignedUserId,
        {
          organizationId: command.organizationId,
          departmentId: command.departmentId,
          roleId: command.roleId,
          correlationId: command.correlationId,
          timestamp: command.timestamp,
        },
      );

      // 执行用例
      const useCaseOutput =
        await this.createUserAssignmentUseCase.execute(useCaseInput);

      // 将 UseCase Output 转换为 Command Result
      return CommandResult.success<CreateUserAssignmentCommandResult>(
        {
          assignmentId: useCaseOutput.assignmentId,
          tenantId: useCaseOutput.tenantId,
          assignedUserId: useCaseOutput.userId,
          organizationId: useCaseOutput.organizationId,
          departmentId: useCaseOutput.departmentId,
        },
        "用户分配创建成功",
      );
    } catch (error) {
      // 处理用例抛出的异常
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorCode = errorMessage.includes("租户不存在")
        ? "TENANT_NOT_FOUND"
        : errorMessage.includes("用户不存在")
          ? "USER_NOT_FOUND"
          : errorMessage.includes("组织不存在")
            ? "ORGANIZATION_NOT_FOUND"
            : errorMessage.includes("部门不存在")
              ? "DEPARTMENT_NOT_FOUND"
              : errorMessage.includes("组织不属于指定租户")
                ? "ORGANIZATION_TENANT_MISMATCH"
                : errorMessage.includes("部门不属于指定组织")
                  ? "DEPARTMENT_ORGANIZATION_MISMATCH"
                  : errorMessage.includes("分配部门时必须同时指定组织")
                    ? "DEPARTMENT_REQUIRES_ORGANIZATION"
                    : "ASSIGNMENT_FAILED";

      return CommandResult.failure(errorCode, errorMessage);
    }
  }

  /**
   * 获取处理器描述
   * @returns 处理器描述
   */
  public getDescription(): string {
    return "创建用户分配命令处理器，处理用户到组织或部门的分配请求";
  }

  /**
   * 处理命令（NestJS CQRS接口实现）
   * @param command 创建用户分配命令
   * @returns 命令结果（适配NestJS期望的返回类型）
   */
  public async handle(
    command: CreateUserAssignmentCommand,
  ): Promise<CreateUserAssignmentCommandResult> {
    const result = await this.execute(command);
    if (!result.success) {
      throw new Error(result.message || "用户分配创建失败");
    }
    return result.data as CreateUserAssignmentCommandResult;
  }
}
