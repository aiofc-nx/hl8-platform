/**
 * @fileoverview 创建租户DTO
 * @description 用于接收创建租户的HTTP请求数据
 */

import { IsNotEmpty, IsString, Length, Matches } from "class-validator";

/**
 * 创建租户DTO
 * @description 接收创建租户的请求数据
 */
export class CreateTenantDto {
  /**
   * 租户代码
   * @description 租户的唯一标识代码，用于URL和系统标识
   * @example "acme-corp"
   */
  @IsNotEmpty({ message: "租户代码不能为空" })
  @IsString({ message: "租户代码必须是字符串" })
  @Length(3, 20, { message: "租户代码长度必须在3到20个字符之间" })
  @Matches(/^[a-zA-Z0-9][a-zA-Z0-9_-]*[a-zA-Z0-9]$|^[a-zA-Z0-9]$/, {
    message: "租户代码格式无效，应为字母数字开头/结尾，可包含连字符和下划线",
  })
  code!: string;

  /**
   * 租户名称
   * @description 租户的显示名称
   * @example "Acme Corporation"
   */
  @IsNotEmpty({ message: "租户名称不能为空" })
  @IsString({ message: "租户名称必须是字符串" })
  @Length(1, 100, { message: "租户名称长度必须在1到100个字符之间" })
  name!: string;

  /**
   * 租户域名
   * @description 租户的域名，用于多租户访问
   * @example "acme.example.com"
   */
  @IsNotEmpty({ message: "租户域名不能为空" })
  @IsString({ message: "租户域名必须是字符串" })
  @Length(1, 253, { message: "租户域名长度不能超过253个字符" })
  @Matches(
    /^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)*[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/,
    {
      message: "租户域名格式无效",
    },
  )
  domain!: string;

  /**
   * 租户类型
   * @description 租户的类型，用于区分不同的租户类别
   * @example "TRIAL" | "BASIC" | "PROFESSIONAL" | "ENTERPRISE"
   */
  @IsNotEmpty({ message: "租户类型不能为空" })
  @IsString({ message: "租户类型必须是字符串" })
  type!: string;
}
