/**
 * @fileoverview 缓存实现
 * @description 基于内存的缓存实现，支持事件驱动失效和性能监控
 */

import type { Logger } from "@hl8/logger";
import type {
  CacheConfig,
  CacheItem,
  CacheStats,
  ICache,
  CacheInvalidationEvent,
  CacheInvalidationListener,
} from "./cache.interface.js";
import { CacheInvalidationStrategy } from "./cache.interface.js";

/**
 * 内存缓存实现
 * @description 基于Map的内存缓存实现，支持TTL、标签失效和性能监控
 */
export class InMemoryCache implements ICache {
  private readonly cache = new Map<string, CacheItem>();
  private readonly tagIndex = new Map<string, Set<string>>();
  private readonly listeners = new Set<CacheInvalidationListener>();
  private readonly config: CacheConfig;
  private readonly logger: Logger;
  private stats: CacheStats;
  private cleanupTimer?: NodeJS.Timeout;

  constructor(config: CacheConfig, logger: Logger) {
    this.config = config;
    this.logger = logger;
    this.stats = this.initializeStats();

    // 启动清理定时器
    this.startCleanupTimer();
  }

  /**
   * 获取缓存项
   * @param key 缓存键
   * @returns 缓存值或undefined
   */
  async get<T>(key: string): Promise<T | undefined> {
    const item = this.cache.get(key);
    if (!item) {
      this.stats.misses++;
      this.updateStats();
      return undefined;
    }

    // 检查是否过期
    if (this.isExpired(item)) {
      await this.delete(key);
      this.stats.misses++;
      this.updateStats();
      return undefined;
    }

    // 更新访问信息
    item.lastAccessedAt = new Date();
    item.accessCount++;
    this.stats.hits++;
    this.updateStats();

    this.logger.debug("缓存命中", { key, accessCount: item.accessCount });
    return item.value as T;
  }

  /**
   * 设置缓存项
   * @param key 缓存键
   * @param value 缓存值
   * @param ttl 过期时间（毫秒）
   * @param tags 标签列表
   * @param metadata 元数据
   * @returns 设置结果
   */
  async set<T>(
    key: string,
    value: T,
    ttl?: number,
    tags: string[] = [],
    metadata: Record<string, unknown> = {},
  ): Promise<boolean> {
    try {
      // 检查缓存是否已满
      if ((await this.isFull()) && !this.cache.has(key)) {
        await this.evictLeastRecentlyUsed();
      }

      const now = new Date();
      const expiresAt = new Date(
        now.getTime() + (ttl || this.config.defaultTtl),
      );

      const item: CacheItem<T> = {
        value,
        expiresAt,
        createdAt: now,
        lastAccessedAt: now,
        accessCount: 0,
        tags: [...tags],
        metadata: { ...metadata },
      };

      // 如果键已存在，先清理旧标签
      if (this.cache.has(key)) {
        await this.removeFromTagIndex(key);
      }

      this.cache.set(key, item);
      await this.addToTagIndex(key, tags);
      this.stats.sets++;
      this.updateStats();

      this.logger.debug("缓存设置成功", {
        key,
        ttl: ttl || this.config.defaultTtl,
        tags,
        metadata,
      });

      return true;
    } catch (error) {
      this.logger.error("设置缓存失败", {
        key,
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * 删除缓存项
   * @param key 缓存键
   * @returns 删除结果
   */
  async delete(key: string): Promise<boolean> {
    const item = this.cache.get(key);
    if (!item) {
      return false;
    }

    // 从标签索引中移除
    await this.removeFromTagIndex(key);
    this.cache.delete(key);
    this.stats.deletes++;
    this.updateStats();

    this.logger.debug("缓存删除成功", { key });
    return true;
  }

  /**
   * 检查缓存项是否存在
   * @param key 缓存键
   * @returns 是否存在
   */
  async has(key: string): Promise<boolean> {
    const item = this.cache.get(key);
    if (!item) {
      return false;
    }

    if (this.isExpired(item)) {
      await this.delete(key);
      return false;
    }

    return true;
  }

  /**
   * 清空所有缓存
   * @returns 清空结果
   */
  async clear(): Promise<boolean> {
    try {
      this.cache.clear();
      this.tagIndex.clear();
      this.stats = this.initializeStats();

      this.logger.debug("缓存已清空");
      return true;
    } catch (error) {
      this.logger.error("清空缓存失败", {
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * 获取多个缓存项
   * @param keys 缓存键列表
   * @returns 缓存项映射
   */
  async getMany<T>(keys: string[]): Promise<Record<string, T>> {
    const result: Record<string, T> = {};
    const promises = keys.map(async (key) => {
      const value = await this.get<T>(key);
      if (value !== undefined) {
        result[key] = value;
      }
    });

    await Promise.all(promises);
    return result;
  }

  /**
   * 设置多个缓存项
   * @param items 缓存项映射
   * @param ttl 过期时间（毫秒）
   * @param tags 标签列表
   * @param metadata 元数据
   * @returns 设置结果
   */
  async setMany<T>(
    items: Record<string, T>,
    ttl?: number,
    tags: string[] = [],
    metadata: Record<string, unknown> = {},
  ): Promise<boolean> {
    const promises = Object.entries(items).map(([key, value]) =>
      this.set(key, value, ttl, tags, metadata),
    );

    const results = await Promise.all(promises);
    return results.every((result) => result);
  }

  /**
   * 删除多个缓存项
   * @param keys 缓存键列表
   * @returns 删除结果
   */
  async deleteMany(keys: string[]): Promise<boolean> {
    const promises = keys.map((key) => this.delete(key));
    const results = await Promise.all(promises);
    return results.every((result) => result);
  }

  /**
   * 根据标签失效缓存
   * @param tags 标签列表
   * @returns 失效结果
   */
  async invalidateByTags(tags: string[]): Promise<boolean> {
    try {
      const keysToInvalidate = new Set<string>();

      for (const tag of tags) {
        const keys = this.tagIndex.get(tag);
        if (keys) {
          keys.forEach((key) => keysToInvalidate.add(key));
        }
      }

      const keys = Array.from(keysToInvalidate);
      const result = await this.deleteMany(keys);

      // 发送失效事件
      await this.emitInvalidationEvent({
        type: "tag_invalidation",
        keys,
        tags,
        strategy: CacheInvalidationStrategy.TAG_BASED,
        timestamp: new Date(),
        metadata: {},
      });

      this.logger.debug("根据标签失效缓存", {
        tags,
        invalidatedCount: keys.length,
      });
      return result;
    } catch (error) {
      this.logger.error("根据标签失效缓存失败", {
        tags,
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * 根据模式失效缓存
   * @param pattern 键模式
   * @returns 失效结果
   */
  async invalidateByPattern(pattern: string): Promise<boolean> {
    try {
      const regex = new RegExp(pattern);
      const keys = Array.from(this.cache.keys()).filter((key) =>
        regex.test(key),
      );

      const result = await this.deleteMany(keys);

      // 发送失效事件
      await this.emitInvalidationEvent({
        type: "pattern_invalidation",
        keys,
        tags: [],
        pattern,
        strategy: CacheInvalidationStrategy.PATTERN_BASED,
        timestamp: new Date(),
        metadata: {},
      });

      this.logger.debug("根据模式失效缓存", {
        pattern,
        invalidatedCount: keys.length,
      });
      return result;
    } catch (error) {
      this.logger.error("根据模式失效缓存失败", {
        pattern,
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * 获取缓存统计信息
   * @returns 统计信息
   */
  async getStats(): Promise<CacheStats> {
    return { ...this.stats };
  }

  /**
   * 重置统计信息
   * @returns 重置结果
   */
  async resetStats(): Promise<boolean> {
    this.stats = this.initializeStats();
    this.logger.debug("缓存统计信息已重置");
    return true;
  }

  /**
   * 清理过期缓存项
   * @returns 清理结果
   */
  async cleanup(): Promise<number> {
    const _now = new Date();
    const expiredKeys: string[] = [];

    for (const [key, item] of this.cache.entries()) {
      if (this.isExpired(item)) {
        expiredKeys.push(key);
      }
    }

    await this.deleteMany(expiredKeys);
    this.stats.cleanups++;
    this.updateStats();

    this.logger.debug("清理过期缓存项", { cleanedCount: expiredKeys.length });
    return expiredKeys.length;
  }

  /**
   * 获取缓存项详情
   * @param key 缓存键
   * @returns 缓存项详情
   */
  async getItem<T>(key: string): Promise<CacheItem<T> | undefined> {
    const item = this.cache.get(key);
    if (!item || this.isExpired(item)) {
      return undefined;
    }

    return item as CacheItem<T>;
  }

  /**
   * 更新缓存项元数据
   * @param key 缓存键
   * @param metadata 元数据
   * @returns 更新结果
   */
  async updateMetadata(
    key: string,
    metadata: Record<string, unknown>,
  ): Promise<boolean> {
    const item = this.cache.get(key);
    if (!item) {
      return false;
    }

    item.metadata = { ...item.metadata, ...metadata };
    this.logger.debug("更新缓存项元数据", { key, metadata });
    return true;
  }

  /**
   * 获取所有缓存键
   * @param pattern 键模式（可选）
   * @returns 缓存键列表
   */
  async keys(pattern?: string): Promise<string[]> {
    const allKeys = Array.from(this.cache.keys());
    if (!pattern) {
      return allKeys;
    }

    const regex = new RegExp(pattern);
    return allKeys.filter((key) => regex.test(key));
  }

  /**
   * 获取缓存大小
   * @returns 缓存大小
   */
  async size(): Promise<number> {
    return this.cache.size;
  }

  /**
   * 检查缓存是否已满
   * @returns 是否已满
   */
  async isFull(): Promise<boolean> {
    return this.cache.size >= this.config.maxSize;
  }

  /**
   * 销毁缓存实例
   * @returns 销毁结果
   */
  async destroy(): Promise<boolean> {
    try {
      if (this.cleanupTimer) {
        clearInterval(this.cleanupTimer);
        this.cleanupTimer = undefined;
      }

      await this.clear();
      this.listeners.clear();

      this.logger.debug("缓存实例已销毁");
      return true;
    } catch (error) {
      this.logger.error("销毁缓存实例失败", {
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * 添加失效监听器
   * @param listener 监听器
   */
  addInvalidationListener(listener: CacheInvalidationListener): void {
    this.listeners.add(listener);
  }

  /**
   * 移除失效监听器
   * @param listener 监听器
   */
  removeInvalidationListener(listener: CacheInvalidationListener): void {
    this.listeners.delete(listener);
  }

  // 私有方法

  /**
   * 初始化统计信息
   * @returns 统计信息
   */
  private initializeStats(): CacheStats {
    return {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      cleanups: 0,
      currentSize: 0,
      maxSize: this.config.maxSize,
      hitRate: 0,
      lastUpdated: new Date(),
    };
  }

  /**
   * 更新统计信息
   */
  private updateStats(): void {
    this.stats.currentSize = this.cache.size;
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? this.stats.hits / total : 0;
    this.stats.lastUpdated = new Date();
  }

  /**
   * 检查缓存项是否过期
   * @param item 缓存项
   * @returns 是否过期
   */
  private isExpired(item: CacheItem): boolean {
    return new Date() > item.expiresAt;
  }

  /**
   * 添加到标签索引
   * @param key 缓存键
   * @param tags 标签列表
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
   * 驱逐最近最少使用的缓存项
   */
  private async evictLeastRecentlyUsed(): Promise<void> {
    let oldestKey = "";
    let oldestTime = new Date();

    for (const [key, item] of this.cache.entries()) {
      if (item.lastAccessedAt < oldestTime) {
        oldestKey = key;
        oldestTime = item.lastAccessedAt;
      }
    }

    if (oldestKey) {
      await this.delete(oldestKey);
    }
  }

  /**
   * 启动清理定时器
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(async () => {
      await this.cleanup();
    }, this.config.cleanupInterval);
  }

  /**
   * 发送失效事件
   * @param event 失效事件
   */
  private async emitInvalidationEvent(
    event: CacheInvalidationEvent,
  ): Promise<void> {
    const promises = Array.from(this.listeners).map((listener) =>
      listener.onInvalidation(event).catch((error) => {
        this.logger.error("处理缓存失效事件失败", {
          event,
          error: error instanceof Error ? error.message : String(error),
        });
      }),
    );

    await Promise.all(promises);
  }
}
