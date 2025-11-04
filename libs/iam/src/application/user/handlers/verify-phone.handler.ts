/**
 * @fileoverview 验证手机号命令处理器
 * @description 处理手机号验证命令，验证用户手机号
 */

import { CommandHandler } from "@nestjs/cqrs";
import { Injectable } from "@nestjs/common";
import { BaseCommandHandler, CommandResult } from "@hl8/application-kernel";
import { Logger } from "@hl8/logger";
import { EntityId } from "@hl8/domain-kernel";
import {
  VerifyPhoneCommand,
  type VerifyPhoneCommandResult,
} from "../commands/verify-phone.command.js";
import type { IUserRepository } from "../../../domain/user/repositories/user.repository.interface.js";

/**
 * 验证手机号命令处理器
 * @description 处理手机号验证命令，验证用户手机号验证码
 */
@Injectable()
@CommandHandler(VerifyPhoneCommand)
export class VerifyPhoneHandler extends BaseCommandHandler<
  VerifyPhoneCommand,
  VerifyPhoneCommandResult
> {
  constructor(
    logger: Logger,
    private readonly userRepository: IUserRepository,
  ) {
    super(logger);
  }

  /**
   * 执行命令逻辑
   * @param command 验证手机号命令
   * @returns 命令结果
   */
  protected async executeCommand(
    command: VerifyPhoneCommand,
  ): Promise<CommandResult<VerifyPhoneCommandResult>> {
    // 查找用户
    const userId = EntityId.fromString(command.aggregateId);
    const user = await this.userRepository.findById(userId);

    if (!user) {
      return CommandResult.failure("USER_NOT_FOUND", "用户不存在");
    }

    // 验证手机号
    try {
      const verified = user.verifyPhone(command.code);

      if (verified) {
        // 保存用户
        await this.userRepository.save(user);

        // 获取领域事件
        // TODO: 通过事件总线发布领域事件（T032任务）
        const _domainEvents = user.getDomainEvents();
        user.clearDomainEvents();

        return CommandResult.success<VerifyPhoneCommandResult>(
          {
            userId: user.id.value,
            verified: true,
            verifiedAt: new Date(),
          },
          "手机号验证成功",
        );
      } else {
        return CommandResult.failure("VERIFICATION_FAILED", "验证码错误");
      }
    } catch (error) {
      return CommandResult.failure(
        "VERIFICATION_ERROR",
        error instanceof Error ? error.message : "验证失败",
      );
    }
  }

  /**
   * 获取处理器描述
   * @returns 处理器描述
   */
  public getDescription(): string {
    return "验证手机号命令处理器，处理用户手机号验证请求";
  }

  /**
   * 处理命令（NestJS CQRS接口实现）
   * @param command 验证手机号命令
   * @returns 命令结果（适配NestJS期望的返回类型）
   */
  public async handle(
    command: VerifyPhoneCommand,
  ): Promise<VerifyPhoneCommandResult> {
    const result = await this.execute(command);
    if (!result.success) {
      throw new Error(result.message || "手机号验证失败");
    }
    return result.data as VerifyPhoneCommandResult;
  }
}
