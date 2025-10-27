/**
 * 应用配置模块
 *
 * @description 定义应用程序的配置结构和验证规则
 * 提供类型安全的配置管理，支持环境变量和配置文件
 */

import {
  IsString,
  IsNumber,
  IsBoolean,
  IsArray,
  ValidateNested,
  IsEnum,
} from "class-validator";
import { Type } from "class-transformer";

/**
 * 应用配置节
 * @description 应用程序特定的配置设置
 */
export class AppConfigSection {
  /** 应用程序名称 */
  @IsString()
  name!: string;

  /** 应用程序版本 */
  @IsString()
  version!: string;

  /** 运行环境 */
  @IsEnum(["development", "staging", "production"])
  environment!: string;

  /** 调试模式标志 */
  @IsBoolean()
  debug?: boolean;
}

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

/**
 * CORS配置
 * @description 跨域资源共享配置
 */
export class CorsConfig {
  /** CORS是否启用 */
  @IsBoolean()
  enabled!: boolean;

  /** 允许的源 */
  @IsArray()
  @IsString({ each: true })
  origins!: string[];

  /** 允许的HTTP方法 */
  @IsArray()
  @IsString({ each: true })
  methods!: string[];

  /** 是否允许凭据 */
  @IsBoolean()
  credentials?: boolean;
}

/**
 * 服务器配置
 * @description 服务器和端口配置
 */
export class ServerConfig {
  /** 服务器端口 */
  @IsNumber()
  @Type(() => Number)
  port!: number;

  /** 服务器主机 */
  @IsString()
  host!: string;

  /** CORS设置 */
  @ValidateNested()
  @Type(() => CorsConfig)
  cors!: CorsConfig;
}

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

/**
 * 应用配置根类
 * @description 主应用程序配置模式
 */
export class AppConfig {
  /** 应用程序配置 */
  @ValidateNested()
  @Type(() => AppConfigSection)
  app!: AppConfigSection;

  /** 数据库配置 */
  @ValidateNested()
  @Type(() => DatabaseConfig)
  database!: DatabaseConfig;

  /** 服务器配置 */
  @ValidateNested()
  @Type(() => ServerConfig)
  server!: ServerConfig;

  /** 日志配置 */
  @ValidateNested()
  @Type(() => LoggingConfig)
  logging!: LoggingConfig;
}
