/**
 * @fileoverview 用户注册DTO
 * @description 用户注册请求的数据传输对象
 */

import { IsEmail, IsString, Length, Matches } from "class-validator";

/**
 * 用户注册DTO
 * @description 用于接收用户注册请求的数据
 */
export class RegisterUserDto {
  /**
   * 邮箱地址
   */
  @IsEmail({}, { message: "邮箱格式不正确" })
  email!: string;

  /**
   * 手机号
   */
  @IsString()
  @Matches(/^(\+?86)?1\d{10}$/, { message: "手机号格式不正确" })
  phoneNumber!: string;

  /**
   * 用户姓名
   */
  @IsString()
  @Length(2, 50, { message: "用户名称长度必须在2到50个字符之间" })
  name!: string;

  /**
   * 密码
   */
  @IsString()
  @Length(8, 100, { message: "密码长度必须在8到100个字符之间" })
  @Matches(/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,}$/, {
    message: "密码必须包含字母和数字",
  })
  password!: string;
}
