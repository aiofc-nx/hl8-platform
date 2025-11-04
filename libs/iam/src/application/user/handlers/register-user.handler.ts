/**
 * @fileoverview 用户注册命令处理器
 * @description 处理用户注册命令，创建用户聚合根并发布事件
 */

import { CommandHandler } from "@nestjs/cqrs";
import { Injectable } from "@nestjs/common";
import { BaseCommandHandler, CommandResult } from "@hl8/application-kernel";
import { Logger } from "@hl8/logger";
import {
  RegisterUserCommand,
  RegisterUserCommandResult,
} from "../commands/register-user.command.js";
import {
  RegisterUserUseCase,
  RegisterUserUseCaseInput,
} from "../use-cases/register-user.use-case.js";

/**
 * 用户注册命令处理器
 * @description 处理用户注册命令，委托给用户注册用例执行
 * @note CommandHandler 负责适配和转换，UseCase 负责核心业务逻辑
 */
@Injectable()
@CommandHandler(RegisterUserCommand)
export class RegisterUserHandler extends BaseCommandHandler<
  RegisterUserCommand,
  RegisterUserCommandResult
> {
  constructor(
    logger: Logger,
    private readonly registerUserUseCase: RegisterUserUseCase,
  ) {
    super(logger);
  }

  /**
   * 执行命令逻辑
   * @param command 注册用户命令
   * @returns 命令结果
   */
  protected async executeCommand(
    command: RegisterUserCommand,
  ): Promise<CommandResult<RegisterUserCommandResult>> {
    try {
      // 将 Command 转换为 UseCase Input
      const useCaseInput = new RegisterUserUseCaseInput(
        command.email,
        command.phoneNumber,
        command.name,
        command.password,
        {
          correlationId: command.correlationId,
          userId: command.userId,
          timestamp: command.timestamp,
        },
      );

      // 执行用例
      const useCaseOutput =
        await this.registerUserUseCase.execute(useCaseInput);

      // 将 UseCase Output 转换为 Command Result
      return CommandResult.success<RegisterUserCommandResult>(
        {
          userId: useCaseOutput.userId,
          email: useCaseOutput.email,
          phoneNumber: useCaseOutput.phoneNumber,
          name: useCaseOutput.name,
          registeredAt: useCaseOutput.registeredAt,
        },
        "用户注册成功",
      );
    } catch (error) {
      // 处理用例抛出的异常
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorCode = errorMessage.includes("邮箱已被注册")
        ? "EMAIL_ALREADY_EXISTS"
        : errorMessage.includes("手机号已被注册")
          ? "PHONE_ALREADY_EXISTS"
          : "REGISTRATION_FAILED";

      return CommandResult.failure(errorCode, errorMessage);
    }
  }

  /**
   * 获取处理器描述
   * @returns 处理器描述
   */
  public getDescription(): string {
    return "用户注册命令处理器，处理新用户注册请求";
  }

  /**
   * 处理命令（NestJS CQRS接口实现）
   * @param command 注册用户命令
   * @returns 命令结果（适配NestJS期望的返回类型）
   */
  public async handle(
    command: RegisterUserCommand,
  ): Promise<RegisterUserCommandResult> {
    const result = await this.execute(command);
    if (!result.success) {
      throw new Error(result.message || "用户注册失败");
    }
    return result.data as RegisterUserCommandResult;
  }
}
