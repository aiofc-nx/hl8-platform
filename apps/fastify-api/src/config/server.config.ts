/**
 * 服务器配置模块
 *
 * @description 定义服务器和端口配置
 * 提供类型安全的服务器配置管理
 */

import { IsString, IsNumber, ValidateNested } from "class-validator";
import { Type } from "class-transformer";
import { CorsConfig } from "./cors.config";

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
