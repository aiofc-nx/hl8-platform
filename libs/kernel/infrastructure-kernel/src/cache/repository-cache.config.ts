/**
 * @fileoverview 仓储查询缓存配置类
 * @description 使用 @hl8/config 的 TypedConfigModule 管理缓存配置，支持 class-validator 验证
 */

import { Type } from "class-transformer";
import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from "class-validator";

/**
 * 仓储查询缓存配置
 * @description 通过 @hl8/config 统一管理，支持从配置文件和环境变量加载
 *
 * @example
 * ```typescript
 * // config/repository-cache.yml
 * repositoryCache:
 *   enabled: true
 *   defaultTtlMs: 60000
 *   keyPrefix: "infra"
 * ```
 */
export class RepositoryCacheConfig {
  /**
   * 是否启用仓储查询缓存
   * @default true
   */
  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  enabled: boolean = true;

  /**
   * 默认 TTL（毫秒）
   * @default 60000
   */
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  @IsOptional()
  defaultTtlMs?: number;

  /**
   * 缓存键前缀（可选，用于区分不同上下文/模块）
   */
  @IsString()
  @IsOptional()
  keyPrefix?: string;
}
