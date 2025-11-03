/**
 * @fileoverview 缓存统计信息收集器
 * @description 收集和计算缓存操作的统计信息
 */

import type { CacheStats } from "../cache.interface.js";

/**
 * 缓存统计信息收集器
 * @description 用于收集缓存操作的统计信息，包括命中率、操作次数等
 *
 * @example
 * ```typescript
 * const collector = new CacheStatsCollector(1000);
 *
 * collector.recordHit();
 * collector.recordMiss();
 * collector.recordSet();
 *
 * const stats = collector.getStats();
 * console.log(stats.hitRate); // 0.5
 * ```
 */
export class CacheStatsCollector {
  private hits = 0;
  private misses = 0;
  private sets = 0;
  private deletes = 0;
  private cleanups = 0;
  private maxSize: number;

  /**
   * 构造函数
   *
   * @param maxSize 最大缓存大小（用于统计信息）
   */
  constructor(maxSize: number) {
    this.maxSize = maxSize;
  }

  /**
   * 记录缓存命中
   */
  recordHit(): void {
    this.hits++;
  }

  /**
   * 记录缓存未命中
   */
  recordMiss(): void {
    this.misses++;
  }

  /**
   * 记录缓存设置操作
   */
  recordSet(): void {
    this.sets++;
  }

  /**
   * 记录缓存删除操作
   */
  recordDelete(): void {
    this.deletes++;
  }

  /**
   * 记录缓存清理操作
   */
  recordCleanup(): void {
    this.cleanups++;
  }

  /**
   * 获取统计信息
   *
   * @param currentSize 当前缓存大小
   * @returns 缓存统计信息
   */
  getStats(currentSize: number): CacheStats {
    const total = this.hits + this.misses;
    const hitRate = total > 0 ? this.hits / total : 0;

    return {
      hits: this.hits,
      misses: this.misses,
      sets: this.sets,
      deletes: this.deletes,
      cleanups: this.cleanups,
      currentSize,
      maxSize: this.maxSize,
      hitRate,
      lastUpdated: new Date(),
    };
  }

  /**
   * 重置所有统计信息
   */
  reset(): void {
    this.hits = 0;
    this.misses = 0;
    this.sets = 0;
    this.deletes = 0;
    this.cleanups = 0;
  }

  /**
   * 更新最大缓存大小
   *
   * @param maxSize 新的最大缓存大小
   */
  updateMaxSize(maxSize: number): void {
    this.maxSize = maxSize;
  }
}
