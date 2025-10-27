/**
 * 日志配置模块
 *
 * @description 定义日志记录配置
 * 提供类型安全的日志配置管理
 */

import { IsString, IsArray, IsEnum } from "class-validator";

/**
 * 日志配置
 * @description 日志记录配置
 */
export class LoggingConfig {
  /** 日志级别 */
  @IsEnum(["error", "warn", "info", "debug"])
  level!: string;

  /** 日志格式 */
  @IsEnum(["json", "text"])
  format!: string;

  /** 输出目标 */
  @IsArray()
  @IsString({ each: true })
  output!: string[];
}
