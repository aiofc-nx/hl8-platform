/**
 * @fileoverview 用户控制器
 * @description 处理用户相关的HTTP请求，包括注册、验证等
 */

import { Controller, Post, Body, HttpCode, HttpStatus } from "@nestjs/common";
import { CommandBus } from "@nestjs/cqrs";
import { RegisterUserCommand } from "../../../application/commands/register-user.command.js";
import { VerifyEmailCommand } from "../../../application/commands/verify-email.command.js";
import { VerifyPhoneCommand } from "../../../application/commands/verify-phone.command.js";
import { RegisterUserDto } from "../dto/register-user.dto.js";
import { VerifyEmailDto } from "../dto/verify-email.dto.js";
import { VerifyPhoneDto } from "../dto/verify-phone.dto.js";

/**
 * 用户控制器
 * @description 处理用户相关的HTTP请求
 */
@Controller("users")
export class UsersController {
  constructor(private readonly commandBus: CommandBus) {}

  /**
   * 用户注册
   * @param dto 注册用户DTO
   * @returns 注册结果
   */
  @Post("register")
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() dto: RegisterUserDto) {
    const command = new RegisterUserCommand(
      dto.email,
      dto.phoneNumber,
      dto.name,
      dto.password,
    );

    const result = await this.commandBus.execute(command);
    return result;
  }

  /**
   * 验证邮箱
   * @param dto 验证邮箱DTO
   * @returns 验证结果
   */
  @Post("verify-email")
  @HttpCode(HttpStatus.OK)
  async verifyEmail(@Body() dto: VerifyEmailDto) {
    const command = new VerifyEmailCommand(dto.userId, dto.code);

    const result = await this.commandBus.execute(command);
    return result;
  }

  /**
   * 验证手机号
   * @param dto 验证手机号DTO
   * @returns 验证结果
   */
  @Post("verify-phone")
  @HttpCode(HttpStatus.OK)
  async verifyPhone(@Body() dto: VerifyPhoneDto) {
    const command = new VerifyPhoneCommand(dto.userId, dto.code);

    const result = await this.commandBus.execute(command);
    return result;
  }
}
