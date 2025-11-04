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
import { User } from "../../domain/user/aggregates/user.aggregate.js";
import { EmailValueObject } from "../../domain/user/value-objects/email.value-object.js";
import { PhoneNumberValueObject } from "../../domain/user/value-objects/phone-number.value-object.js";
import { UserNameValueObject } from "../../domain/user/value-objects/user-name.value-object.js";
import { PasswordHashValueObject } from "../../domain/user/value-objects/password-hash.value-object.js";
import type { IUserRepository } from "../../domain/user/repositories/user.repository.interface.js";

/**
 * 用户注册命令处理器
 * @description 处理用户注册命令，验证唯一性，创建用户聚合根
 * @note 密码哈希服务将在基础设施层实现（T053任务）
 */
@Injectable()
@CommandHandler(RegisterUserCommand)
export class RegisterUserHandler extends BaseCommandHandler<
  RegisterUserCommand,
  RegisterUserCommandResult
> {
  constructor(
    logger: Logger,
    private readonly userRepository: IUserRepository,
    // TODO: 注入密码哈希服务
    // private readonly passwordHashingService: IPasswordHashingService,
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
    // 创建值对象
    const email = new EmailValueObject(command.email);
    const phoneNumber = new PhoneNumberValueObject(command.phoneNumber);
    const name = new UserNameValueObject(command.name);

    // 验证邮箱和手机号唯一性
    const emailExists = await this.userRepository.existsByEmail(email);
    if (emailExists) {
      return CommandResult.failure("EMAIL_ALREADY_EXISTS", "邮箱已被注册");
    }

    const phoneExists =
      await this.userRepository.existsByPhoneNumber(phoneNumber);
    if (phoneExists) {
      return CommandResult.failure("PHONE_ALREADY_EXISTS", "手机号已被注册");
    }

    // TODO: 使用密码哈希服务对密码进行哈希
    // const hashedPassword = await this.passwordHashingService.hash(command.password);
    // 临时实现：直接使用密码（实际应用中应该使用哈希）
    // 注意：这仅用于开发阶段，生产环境必须使用密码哈希
    const hashedPassword = `$2b$10$${Buffer.from(command.password).toString("base64").substring(0, 53)}`;
    const passwordHash = new PasswordHashValueObject(hashedPassword);

    // 创建用户聚合根
    const user = User.register(email, phoneNumber, name, passwordHash);

    // 保存用户
    await this.userRepository.save(user);

    // 获取领域事件（用于后续发布）
    // TODO: 通过事件总线发布领域事件（T032任务）
    const _domainEvents = user.getDomainEvents();
    user.clearDomainEvents();

    // 返回成功结果
    return CommandResult.success<RegisterUserCommandResult>(
      {
        userId: user.id.value,
        email: email.value,
        phoneNumber: phoneNumber.value,
        name: name.value,
        registeredAt: user.registeredAt,
      },
      "用户注册成功",
      undefined, // events will be published separately
    );
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
