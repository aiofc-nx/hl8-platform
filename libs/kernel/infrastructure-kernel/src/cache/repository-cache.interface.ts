/**
 * @fileoverview 仓储查询缓存接口与配置
 * @description 定义仓储查询缓存的选项与契约，供基础设施层仓储集成。
 */

import type { ICache } from "@hl8/cache";

/**
 * @public
 * @description 仓储查询缓存配置
 */
export interface RepositoryCacheOptions {
  /**
   * @description 是否启用仓储查询缓存
   */
  enabled?: boolean;
  /**
   * @description 默认 TTL（毫秒）；未设置时沿用 CacheConfig.defaultTtl
   */
  defaultTtlMs?: number;
  /**
   * @description 键前缀（可用于区分不同上下文/模块）
   */
  keyPrefix?: string;
}

/**
 * @public
 * @description 仓储查询缓存依赖
 */
export interface RepositoryCacheDependencies {
  /**
   * @description 缓存实例
   */
  cache: ICache;
}
