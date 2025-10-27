/**
 * 数据库配置模块
 *
 * @description 定义数据库连接配置和验证规则
 * 提供类型安全的数据库配置管理
 */

import { IsString, IsNumber, IsBoolean } from "class-validator";
import { Type } from "class-transformer";

/**
 * 数据库配置
 * @description 数据库连接配置
 */
export class DatabaseConfig {
  /** 数据库主机 */
  @IsString()
  host!: string;

  /** 数据库端口 */
  @IsNumber()
  @Type(() => Number)
  port!: number;

  /** 数据库用户名 */
  @IsString()
  username!: string;

  /** 数据库密码 */
  @IsString()
  password!: string;

  /** 数据库名称 */
  @IsString()
  database!: string;

  /** SSL连接标志 */
  @IsBoolean()
  ssl?: boolean;
}
