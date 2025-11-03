/**
 * @fileoverview 内存缓存实现
 * @description 基于 Map 的内存缓存实现，支持 TTL、标签失效、模式匹配失效和性能监控
 */

import type { Logger } from "@hl8/logger";
import type {
  CacheItemMetadata,
  CacheStats,
  ICache,
} from "../cache.interface.js";
import type { CacheConfig } from "../config/cache.config.js";
import { CacheStatsCollector } from "../utils/cache-stats-collector.js";
import { minimatch } from "minimatch";

/**
 * 内部缓存项结构
 * @private
 */
interface InternalCacheItem {
  value: unknown;
  expiresAt: number;
  createdAt: number;
  lastAccessedAt: number;
  accessCount: number;
  tags: string[];
}

/**
 * 内存缓存实现
 * @description 基于 Map 的高效内存缓存，支持 TTL、标签失效、模式匹配失效
 *
 * @example
 * ```typescript
 * import { InMemoryCache } from '@hl8/cache';
 * import { Logger } from '@hl8/logger';
 *
 * const config = {
 *   defaultTtl: 3600000,
 *   maxSize: 10000,
 *   enableStats: true,
 *   enableEventInvalidation: true,
 *   cleanupInterval: 600000,
 * };
 *
 * const cache = new InMemoryCache(config, logger);
 * ```
 */
export class InMemoryCache implements ICache {
  private readonly cache = new Map<string, InternalCacheItem>();
  private readonly tagIndex = new Map<string, Set<string>>();
  private readonly statsCollector: CacheStatsCollector;
  private readonly config: CacheConfig;
  private readonly logger: Logger;
  private cleanupTimer?: NodeJS.Timeout;

  /**
   * 构造函数
   *
   * @param config 缓存配置
   * @param logger 日志记录器（来自 @hl8/logger）
   */
  constructor(config: CacheConfig, logger: Logger) {
    this.config = config;
    this.logger = logger;
    this.statsCollector = new CacheStatsCollector(config.maxSize);

    // 启动清理定时器
    this.startCleanupTimer();

    this.logger.log("InMemoryCache 初始化完成", {
      maxSize: config.maxSize,
      defaultTtl: config.defaultTtl,
      evictionStrategy: config.evictionStrategy,
    });
  }

  /**
   * 获取缓存值
   * @param key 缓存键
   * @returns 缓存值，如果不存在或已过期返回 undefined
   */
  async get<T>(key: string): Promise<T | undefined> {
    const item = this.cache.get(key);

    if (!item) {
      this.statsCollector.recordMiss();
      this.logger.debug("缓存未命中", { key });
      return undefined;
    }

    // 检查是否过期
    if (this.isExpired(item)) {
      await this.delete(key);
      this.statsCollector.recordMiss();
      this.logger.debug("缓存已过期", { key, expiresAt: item.expiresAt });
      return undefined;
    }

    // 更新访问信息
    item.lastAccessedAt = Date.now();
    item.accessCount++;
    this.statsCollector.recordHit();

    this.logger.debug("缓存命中", {
      key,
      accessCount: item.accessCount,
      age: Date.now() - item.createdAt,
    });

    return item.value as T;
  }

  /**
   * 设置缓存值
   * @param key 缓存键
   * @param value 缓存值
   * @param ttl 过期时间（毫秒），如果不提供则使用默认 TTL
   * @param tags 标签列表（用于批量失效）
   */
  async set(
    key: string,
    value: unknown,
    ttl?: number,
    tags?: string[],
  ): Promise<void> {
    try {
      // 检查缓存是否已满
      if (this.cache.size >= this.config.maxSize && !this.cache.has(key)) {
        await this.evictItem();
      }

      const now = Date.now();
      const effectiveTtl = ttl ?? this.config.defaultTtl;
      const expiresAt = effectiveTtl > 0 ? now + effectiveTtl : 0;

      // 如果键已存在，先清理旧标签索引
      if (this.cache.has(key)) {
        await this.removeFromTagIndex(key);
      }

      const item: InternalCacheItem = {
        value,
        expiresAt,
        createdAt: now,
        lastAccessedAt: now,
        accessCount: 0,
        tags: tags ?? [],
      };

      this.cache.set(key, item);
      await this.addToTagIndex(key, item.tags);
      this.statsCollector.recordSet();

      this.logger.debug("缓存设置成功", {
        key,
        ttl: effectiveTtl,
        tags: item.tags,
        expiresAt: expiresAt > 0 ? new Date(expiresAt) : "never",
      });
    } catch (error) {
      this.logger.error("设置缓存失败", {
        key,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * 删除缓存项
   * @param key 缓存键
   */
  async delete(key: string): Promise<void> {
    const item = this.cache.get(key);
    if (!item) {
      return;
    }

    await this.removeFromTagIndex(key);
    this.cache.delete(key);
    this.statsCollector.recordDelete();

    this.logger.debug("缓存删除成功", { key });
  }

  /**
   * 批量删除缓存项
   * @param keys 缓存键列表
   */
  async deleteMany(keys: string[]): Promise<void> {
    for (const key of keys) {
      await this.delete(key);
    }
  }

  /**
   * 通过标签失效缓存
   * @param tags 标签列表
   */
  async invalidateByTags(tags: string[]): Promise<void> {
    const keysToDelete = new Set<string>();

    for (const tag of tags) {
      const keys = this.tagIndex.get(tag);
      if (keys) {
        for (const key of keys) {
          keysToDelete.add(key);
        }
      }
    }

    for (const key of keysToDelete) {
      await this.delete(key);
    }

    this.logger.debug("通过标签失效缓存", {
      tags,
      deletedCount: keysToDelete.size,
    });
  }

  /**
   * 通过模式匹配失效缓存
   * @param pattern 模式（支持 glob，如 "repo:user:*"）
   */
  async invalidateByPattern(pattern: string): Promise<void> {
    const keysToDelete: string[] = [];

    for (const key of this.cache.keys()) {
      if (minimatch(key, pattern)) {
        keysToDelete.push(key);
      }
    }

    await this.deleteMany(keysToDelete);

    this.logger.debug("通过模式匹配失效缓存", {
      pattern,
      deletedCount: keysToDelete.length,
    });
  }

  /**
   * 清空所有缓存
   */
  async clear(): Promise<void> {
    const size = this.cache.size;
    this.cache.clear();
    this.tagIndex.clear();
    this.statsCollector.reset();

    this.logger.log("缓存已清空", { clearedItems: size });
  }

  /**
   * 获取缓存统计信息
   * @returns 统计信息
   */
  async getStats(): Promise<CacheStats> {
    return this.statsCollector.getStats(this.cache.size);
  }

  /**
   * 获取缓存项元数据
   * @param key 缓存键
   * @returns 元数据，如果不存在返回 undefined
   */
  async getMetadata(key: string): Promise<CacheItemMetadata | undefined> {
    const item = this.cache.get(key);
    if (!item) {
      return undefined;
    }

    return {
      key,
      expiresAt: item.expiresAt,
      createdAt: item.createdAt,
      lastAccessedAt: item.lastAccessedAt,
      accessCount: item.accessCount,
      tags: [...item.tags],
    };
  }

  /**
   * 重置统计信息
   */
  async resetStats(): Promise<void> {
    this.statsCollector.reset();
    this.logger.debug("统计信息已重置");
  }

  /**
   * 检查缓存项是否过期
   * @param item 缓存项
   * @returns 是否过期
   * @private
   */
  private isExpired(item: InternalCacheItem): boolean {
    if (item.expiresAt === 0) {
      return false; // 永不过期
    }
    return Date.now() > item.expiresAt;
  }

  /**
   * 添加标签索引
   * @param key 缓存键
   * @param tags 标签列表
   * @private
   */
  private async addToTagIndex(key: string, tags: string[]): Promise<void> {
    for (const tag of tags) {
      if (!this.tagIndex.has(tag)) {
        this.tagIndex.set(tag, new Set());
      }
      this.tagIndex.get(tag)!.add(key);
    }
  }

  /**
   * 从标签索引中移除
   * @param key 缓存键
   * @private
   */
  private async removeFromTagIndex(key: string): Promise<void> {
    const item = this.cache.get(key);
    if (!item) {
      return;
    }

    for (const tag of item.tags) {
      const keys = this.tagIndex.get(tag);
      if (keys) {
        keys.delete(key);
        if (keys.size === 0) {
          this.tagIndex.delete(tag);
        }
      }
    }
  }

  /**
   * 淘汰缓存项（根据淘汰策略）
   * @private
   */
  private async evictItem(): Promise<void> {
    if (this.cache.size === 0) {
      return;
    }

    let keyToEvict: string | undefined;

    switch (this.config.evictionStrategy ?? "LRU") {
      case "LRU": {
        // 找到最近最少使用的项
        let minLastAccessed = Infinity;
        for (const [key, item] of this.cache.entries()) {
          if (item.lastAccessedAt < minLastAccessed) {
            minLastAccessed = item.lastAccessedAt;
            keyToEvict = key;
          }
        }
        break;
      }
      case "FIFO": {
        // 找到最早创建的项
        let minCreatedAt = Infinity;
        for (const [key, item] of this.cache.entries()) {
          if (item.createdAt < minCreatedAt) {
            minCreatedAt = item.createdAt;
            keyToEvict = key;
          }
        }
        break;
      }
      case "LFU": {
        // 找到访问次数最少的项
        let minAccessCount = Infinity;
        for (const [key, item] of this.cache.entries()) {
          if (item.accessCount < minAccessCount) {
            minAccessCount = item.accessCount;
            keyToEvict = key;
          }
        }
        break;
      }
    }

    if (keyToEvict) {
      await this.delete(keyToEvict);
      this.logger.debug("缓存项已淘汰", {
        key: keyToEvict,
        strategy: this.config.evictionStrategy,
      });
    }
  }

  /**
   * 启动清理定时器
   * @private
   */
  private startCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }

    this.cleanupTimer = setInterval(() => {
      this.cleanupExpiredItems();
    }, this.config.cleanupInterval);

    // 避免保持事件循环存活，防止测试环境的 open handles
    // Node.js 定时器支持 unref，将其标记为不阻止进程退出
    // 在某些运行时环境中可能不存在 unref，这里做可选调用
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (this.cleanupTimer as any)?.unref?.();

    this.logger.debug("清理定时器已启动", {
      interval: this.config.cleanupInterval,
    });
  }

  /**
   * 清理过期项
   * @private
   */
  private cleanupExpiredItems(): void {
    const keysToDelete: string[] = [];

    for (const [key, item] of this.cache.entries()) {
      if (this.isExpired(item)) {
        keysToDelete.push(key);
      }
    }

    if (keysToDelete.length > 0) {
      this.deleteMany(keysToDelete).catch((error) => {
        this.logger.error("清理过期缓存项失败", { error });
      });
      this.statsCollector.recordCleanup();

      this.logger.debug("清理过期缓存项", {
        deletedCount: keysToDelete.length,
        currentSize: this.cache.size,
      });
    }
  }

  /**
   * 销毁缓存实例（清理资源）
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }

    this.cache.clear();
    this.tagIndex.clear();

    this.logger.log("InMemoryCache 已销毁");
  }
}
