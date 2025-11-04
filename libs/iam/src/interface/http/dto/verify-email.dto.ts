/**
 * @fileoverview 验证邮箱DTO
 * @description 邮箱验证请求的数据传输对象
 */

import { IsNotEmpty, IsString, IsUUID } from "class-validator";

/**
 * 验证邮箱DTO
 * @description 用于接收邮箱验证请求的数据
 */
export class VerifyEmailDto {
  /**
   * 用户ID
   */
  @IsUUID(4, { message: "用户ID格式不正确" })
  userId!: string;

  /**
   * 验证码
   */
  @IsNotEmpty()
  @IsString()
  code!: string;
}
