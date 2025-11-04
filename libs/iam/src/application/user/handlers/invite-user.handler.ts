/**
 * @fileoverview 邀请用户命令处理器
 * @description 处理邀请用户命令，委托给邀请用户用例执行
 */

import { CommandHandler } from "@nestjs/cqrs";
import { Injectable } from "@nestjs/common";
import { BaseCommandHandler, CommandResult } from "@hl8/application-kernel";
import { Logger } from "@hl8/logger";
import {
  InviteUserCommand,
  InviteUserCommandResult,
} from "../commands/invite-user.command.js";
import {
  InviteUserUseCase,
  InviteUserUseCaseInput,
} from "../use-cases/invite-user.use-case.js";

/**
 * 邀请用户命令处理器
 * @description 处理邀请用户命令，委托给邀请用户用例执行
 * @note CommandHandler 负责适配和转换，UseCase 负责核心业务逻辑
 */
@Injectable()
@CommandHandler(InviteUserCommand)
export class InviteUserHandler extends BaseCommandHandler<
  InviteUserCommand,
  InviteUserCommandResult
> {
  constructor(
    logger: Logger,
    private readonly inviteUserUseCase: InviteUserUseCase,
  ) {
    super(logger);
  }

  /**
   * 执行命令逻辑
   * @param command 邀请用户命令
   * @returns 命令结果
   */
  protected async executeCommand(
    command: InviteUserCommand,
  ): Promise<CommandResult<InviteUserCommandResult>> {
    try {
      // 将 Command 转换为 UseCase Input
      const useCaseInput = new InviteUserUseCaseInput(
        command.tenantId,
        command.email,
        command.invitedBy,
        command.invitationCode,
        {
          correlationId: command.correlationId,
          userId: command.userId,
          timestamp: command.timestamp,
        },
      );

      // 执行用例
      const useCaseOutput = await this.inviteUserUseCase.execute(useCaseInput);

      // 将 UseCase Output 转换为 Command Result
      return CommandResult.success<InviteUserCommandResult>(
        {
          assignmentId: useCaseOutput.assignmentId,
          tenantId: useCaseOutput.tenantId,
          email: useCaseOutput.email,
          invitationCode: useCaseOutput.invitationCode,
          expiresAt: useCaseOutput.expiresAt,
        },
        "用户邀请成功",
      );
    } catch (error) {
      // 处理用例抛出的异常
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorCode = errorMessage.includes("租户不存在")
        ? "TENANT_NOT_FOUND"
        : errorMessage.includes("邀请者不存在")
          ? "INVITER_NOT_FOUND"
          : errorMessage.includes("用户未注册")
            ? "USER_NOT_REGISTERED"
            : errorMessage.includes("邀请已存在")
              ? "INVITATION_ALREADY_EXISTS"
              : "INVITATION_FAILED";

      return CommandResult.failure(errorCode, errorMessage);
    }
  }

  /**
   * 获取处理器描述
   * @returns 处理器描述
   */
  public getDescription(): string {
    return "邀请用户命令处理器，处理用户邀请请求";
  }

  /**
   * 处理命令（NestJS CQRS接口实现）
   * @param command 邀请用户命令
   * @returns 命令结果（适配NestJS期望的返回类型）
   */
  public async handle(
    command: InviteUserCommand,
  ): Promise<InviteUserCommandResult> {
    const result = await this.execute(command);
    if (!result.success) {
      throw new Error(result.message || "用户邀请失败");
    }
    return result.data as InviteUserCommandResult;
  }
}
