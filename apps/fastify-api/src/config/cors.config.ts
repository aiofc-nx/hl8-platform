/**
 * CORS配置模块
 *
 * @description 定义跨域资源共享配置
 * 提供类型安全的CORS配置管理
 */

import { IsString, IsBoolean, IsArray } from "class-validator";

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
