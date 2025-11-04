/**
 * @fileoverview 用户注册用例
 * @description 用户注册的核心业务逻辑，遵循用例驱动设计原则
 */

import { Injectable } from "@nestjs/common";
import { UseCase, UseCaseInput, UseCaseOutput } from "@hl8/application-kernel";
import type { Logger } from "@hl8/logger";
import { User } from "../../../domain/user/aggregates/user.aggregate.js";
import { EmailValueObject } from "../../../domain/user/value-objects/email.value-object.js";
import { PhoneNumberValueObject } from "../../../domain/user/value-objects/phone-number.value-object.js";
import { UserNameValueObject } from "../../../domain/user/value-objects/user-name.value-object.js";
import { PasswordHashValueObject } from "../../../domain/user/value-objects/password-hash.value-object.js";
import type { IUserRepository } from "../../../domain/user/repositories/user.repository.interface.js";

/**
 * 用户注册用例输入
 */
export class RegisterUserUseCaseInput extends UseCaseInput {
  /** 邮箱地址 */
  public readonly email: string;
  /** 手机号 */
  public readonly phoneNumber: string;
  /** 姓名 */
  public readonly name: string;
  /** 密码（明文） */
  public readonly password: string;

  constructor(
    email: string,
    phoneNumber: string,
    name: string,
    password: string,
    options?: {
      correlationId?: string;
      userId?: string;
      timestamp?: Date;
    },
  ) {
    super();
    this.email = email;
    this.phoneNumber = phoneNumber;
    this.name = name;
    this.password = password;
    if (options) {
      this.correlationId = options.correlationId;
      this.userId = options.userId;
      if (options.timestamp) {
        this.timestamp = options.timestamp;
      }
    }
  }

  /**
   * 获取输入摘要
   * @returns 输入摘要（隐藏敏感信息）
   */
  public getSummary(): Record<string, unknown> {
    return {
      ...super.getSummary(),
      email: this.email,
      phoneNumber: this.phoneNumber.replace(/(\d{3})\d{4}(\d{4})/, "$1****$2"), // 隐藏中间4位
      name: this.name,
      password: "***", // 隐藏密码
    };
  }

  /**
   * 克隆输入对象
   * @returns 新的输入对象实例
   */
  public clone(): RegisterUserUseCaseInput {
    return new RegisterUserUseCaseInput(
      this.email,
      this.phoneNumber,
      this.name,
      this.password,
      {
        correlationId: this.correlationId,
        userId: this.userId,
        timestamp: this.timestamp,
      },
    );
  }
}

/**
 * 用户注册用例输出
 */
export class RegisterUserUseCaseOutput extends UseCaseOutput {
  /** 用户ID */
  public readonly userId: string;
  /** 邮箱 */
  public readonly email: string;
  /** 手机号 */
  public readonly phoneNumber: string;
  /** 姓名 */
  public readonly name: string;
  /** 注册时间 */
  public readonly registeredAt: Date;

  constructor(
    userId: string,
    email: string,
    phoneNumber: string,
    name: string,
    registeredAt: Date,
  ) {
    super();
    this.userId = userId;
    this.email = email;
    this.phoneNumber = phoneNumber;
    this.name = name;
    this.registeredAt = registeredAt;
  }

  /**
   * 获取输出摘要
   * @returns 输出摘要
   */
  public getSummary(): Record<string, unknown> {
    return {
      ...super.getSummary(),
      userId: this.userId,
      email: this.email,
      phoneNumber: this.phoneNumber.replace(/(\d{3})\d{4}(\d{4})/, "$1****$2"),
      name: this.name,
      registeredAt: this.registeredAt.toISOString(),
    };
  }

  /**
   * 克隆输出对象
   * @returns 新的输出对象实例
   */
  public clone(): RegisterUserUseCaseOutput {
    return new RegisterUserUseCaseOutput(
      this.userId,
      this.email,
      this.phoneNumber,
      this.name,
      this.registeredAt,
    );
  }
}

/**
 * 用户注册用例
 * @description 处理用户注册的核心业务逻辑
 * @note 这是应用层的核心用例，包含完整的业务规则和验证逻辑
 */
@Injectable()
export class RegisterUserUseCase extends UseCase<
  RegisterUserUseCaseInput,
  RegisterUserUseCaseOutput
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
   * 执行业务逻辑
   * @param input 用例输入
   * @returns 用例输出
   * @throws {Error} 当业务规则验证失败时抛出异常
   */
  protected async executeBusinessLogic(
    input: RegisterUserUseCaseInput,
  ): Promise<RegisterUserUseCaseOutput> {
    // 创建值对象
    const email = new EmailValueObject(input.email);
    const phoneNumber = new PhoneNumberValueObject(input.phoneNumber);
    const name = new UserNameValueObject(input.name);

    // 验证邮箱和手机号唯一性
    const emailExists = await this.userRepository.existsByEmail(email);
    if (emailExists) {
      throw new Error("邮箱已被注册");
    }

    const phoneExists =
      await this.userRepository.existsByPhoneNumber(phoneNumber);
    if (phoneExists) {
      throw new Error("手机号已被注册");
    }

    // TODO: 使用密码哈希服务对密码进行哈希
    // const hashedPassword = await this.passwordHashingService.hash(input.password);
    // 临时实现：直接使用密码（实际应用中应该使用哈希）
    // 注意：这仅用于开发阶段，生产环境必须使用密码哈希
    const hashedPassword = `$2b$10$${Buffer.from(input.password)
      .toString("base64")
      .substring(0, 53)}`;
    const passwordHash = new PasswordHashValueObject(hashedPassword);

    // 创建用户聚合根
    const user = User.register(email, phoneNumber, name, passwordHash);

    // 保存用户
    await this.userRepository.save(user);

    // 获取领域事件（用于后续发布）
    // TODO: 通过事件总线发布领域事件（T032任务）
    const _domainEvents = user.getDomainEvents();
    user.clearDomainEvents();

    // 返回用例输出
    return new RegisterUserUseCaseOutput(
      user.id.value,
      user.email.value,
      user.phoneNumber.value,
      user.name.value,
      user.registeredAt,
    );
  }

  /**
   * 获取用例描述
   * @returns 用例描述
   */
  public getDescription(): string {
    return "用户注册用例，处理新用户注册的核心业务逻辑，包括唯一性验证、密码哈希和用户聚合根创建";
  }
}
