/**
 * @fileoverview 验证手机号DTO
 * @description 手机号验证请求的数据传输对象
 */

import { IsNotEmpty, IsString, IsUUID } from "class-validator";

/**
 * 验证手机号DTO
 * @description 用于接收手机号验证请求的数据
 */
export class VerifyPhoneDto {
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
