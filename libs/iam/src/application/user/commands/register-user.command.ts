/**
 * @fileoverview 用户注册命令
 * @description 用户注册命令，包含邮箱、手机号、姓名和密码
 */

import { BaseCommand } from "@hl8/application-kernel";
import { IsEmail, IsNotEmpty, IsString, MinLength } from "class-validator";

/**
 * 用户注册命令结果
 */
export interface RegisterUserCommandResult {
  /** 用户ID */
  userId: string;
  /** 邮箱 */
  email: string;
  /** 手机号 */
  phoneNumber: string;
  /** 姓名 */
  name: string;
  /** 注册时间 */
  registeredAt: Date;
}

/**
 * 用户注册命令
 * @description 用于注册新用户的命令
 */
export class RegisterUserCommand extends BaseCommand<RegisterUserCommandResult> {
  /** 邮箱地址 */
  @IsNotEmpty()
  @IsEmail()
  @IsString()
  public readonly email: string;

  /** 手机号 */
  @IsNotEmpty()
  @IsString()
  public readonly phoneNumber: string;

  /** 姓名 */
  @IsNotEmpty()
  @IsString()
  public readonly name: string;

  /** 密码（明文） */
  @IsNotEmpty()
  @IsString()
  @MinLength(8)
  public readonly password: string;

  /**
   * 创建用户注册命令
   * @param email 邮箱地址
   * @param phoneNumber 手机号
   * @param name 姓名
   * @param password 密码
   * @param options 命令选项
   */
  constructor(
    email: string,
    phoneNumber: string,
    name: string,
    password: string,
    options: {
      commandId?: string;
      correlationId?: string;
      userId?: string;
      timestamp?: Date;
      version?: string;
      metadata?: Record<string, unknown>;
    } = {},
  ) {
    // 使用临时聚合根ID（注册时用户还不存在）
    super("temp", "RegisterUser", options);
    this.email = email;
    this.phoneNumber = phoneNumber;
    this.name = name;
    this.password = password;
  }

  /**
   * 克隆命令对象
   * @returns 新的命令对象实例
   */
  public clone(): RegisterUserCommand {
    return new RegisterUserCommand(
      this.email,
      this.phoneNumber,
      this.name,
      this.password,
      {
        commandId: this.commandId,
        correlationId: this.correlationId,
        userId: this.userId,
        timestamp: this.timestamp,
        version: this.version,
        metadata: this.metadata ? { ...this.metadata } : undefined,
      },
    );
  }
}
