/**
 * @fileoverview 缓存接口与类型定义
 * @description 提供统一的缓存操作抽象，供各层通过依赖注入使用。
 * @public
 */

import type { Logger } from "@hl8/logger";

/**
 * 缓存配置
 * @description 控制缓存的容量、过期、统计与清理等行为。
 */
export interface CacheConfigShape {
  /** 默认过期时间（毫秒）。0 表示不过期，需要调用方显式传递 ttl 才会过期。 */
  defaultTtl: number;
  /** 最大缓存项数量（达到上限时按淘汰策略驱逐）。 */
  maxSize: number;
  /** 是否启用统计信息收集。 */
  enableStats: boolean;
  /** 是否启用事件驱动的缓存失效（用于跨模块协同失效）。 */
  enableEventInvalidation: boolean;
  /** 过期清理的周期（毫秒）。 */
  cleanupInterval: number;
  /** 是否启用压缩（预留，未来实现）。 */
  enableCompression?: boolean;
  /** 淘汰策略（默认 LRU）。 */
  evictionStrategy?: "LRU" | "FIFO" | "LFU";
}

/**
 * 缓存统计信息
 */
export interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  cleanups: number;
  currentSize: number;
  maxSize: number;
  hitRate: number;
  lastUpdated: Date;
}

/**
 * 缓存项元数据
 */
export interface CacheItemMetadata {
  key: string;
  expiresAt: number;
  createdAt: number;
  lastAccessedAt: number;
  accessCount: number;
  tags: string[];
}

/**
 * 缓存接口（所有实现必须遵循）
 */
export interface ICache {
  /** 获取缓存值（不存在或已过期返回 undefined） */
  get<T>(key: string): Promise<T | undefined>;
  /** 设置缓存值（可选 ttl 与标签） */
  set(
    key: string,
    value: unknown,
    ttl?: number,
    tags?: string[],
  ): Promise<void>;
  /** 删除指定键 */
  delete(key: string): Promise<void>;
  /** 批量删除 */
  deleteMany(keys: string[]): Promise<void>;
  /** 通过标签失效 */
  invalidateByTags(tags: string[]): Promise<void>;
  /** 通过模式（如 repo:user:*）失效 */
  invalidateByPattern(pattern: string): Promise<void>;
  /** 清空所有缓存 */
  clear(): Promise<void>;
  /** 获取统计信息 */
  getStats(): Promise<CacheStats>;
  /** 获取缓存项元数据 */
  getMetadata(key: string): Promise<CacheItemMetadata | undefined>;
  /** 重置统计信息 */
  resetStats(): Promise<void>;
}

/**
 * 缓存构造依赖
 * @description 统一约束实现类初始化所需依赖（配置与日志）。
 */
export interface CacheDependencies {
  config: CacheConfigShape;
  logger: Logger;
}
