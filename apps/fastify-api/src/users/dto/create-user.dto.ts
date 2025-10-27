import { IsEmail, IsNotEmpty, IsString, MinLength } from "class-validator";

/**
 * 创建用户 DTO
 * @description 用于创建新用户的数据传输对象
 */
export class CreateUserDto {
  /**
   * 用户名称
   * @description 用户的显示名称，不能为空且最少2个字符
   */
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  name: string;

  /**
   * 用户邮箱
   * @description 用户的邮箱地址，必须是有效的邮箱格式
   */
  @IsEmail()
  email: string;

  /**
   * 用户密码
   * @description 用户密码，不能为空且最少6个字符
   */
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;
}
