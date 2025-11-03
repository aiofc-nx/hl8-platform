/**
 * @fileoverview CacheStatsCollector 单元测试
 * @description 测试缓存统计信息收集器的功能
 */

import { CacheStatsCollector } from "./cache-stats-collector.js";

describe("CacheStatsCollector", () => {
  let collector: CacheStatsCollector;
  const maxSize = 1000;

  beforeEach(() => {
    collector = new CacheStatsCollector(maxSize);
  });

  describe("记录操作", () => {
    it("应该记录缓存命中", () => {
      collector.recordHit();
      collector.recordHit();
      const stats = collector.getStats(10);
      expect(stats.hits).toBe(2);
    });

    it("应该记录缓存未命中", () => {
      collector.recordMiss();
      collector.recordMiss();
      collector.recordMiss();
      const stats = collector.getStats(10);
      expect(stats.misses).toBe(3);
    });

    it("应该记录缓存设置操作", () => {
      collector.recordSet();
      collector.recordSet();
      const stats = collector.getStats(10);
      expect(stats.sets).toBe(2);
    });

    it("应该记录缓存删除操作", () => {
      collector.recordDelete();
      const stats = collector.getStats(10);
      expect(stats.deletes).toBe(1);
    });

    it("应该记录清理操作", () => {
      collector.recordCleanup();
      collector.recordCleanup();
      const stats = collector.getStats(10);
      expect(stats.cleanups).toBe(2);
    });
  });

  describe("getStats", () => {
    it("应该返回完整的统计信息", () => {
      collector.recordHit();
      collector.recordHit();
      collector.recordMiss();
      collector.recordSet();
      collector.recordDelete();
      collector.recordCleanup();

      const stats = collector.getStats(50);

      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(1);
      expect(stats.sets).toBe(1);
      expect(stats.deletes).toBe(1);
      expect(stats.cleanups).toBe(1);
      expect(stats.currentSize).toBe(50);
      expect(stats.maxSize).toBe(maxSize);
      expect(stats.hitRate).toBeCloseTo(2 / 3, 5);
      expect(stats.lastUpdated).toBeInstanceOf(Date);
    });

    it("应该正确计算命中率", () => {
      collector.recordHit();
      collector.recordHit();
      collector.recordMiss();
      const stats = collector.getStats(10);
      expect(stats.hitRate).toBeCloseTo(2 / 3, 5);
    });

    it("应该在没有操作时返回零命中率", () => {
      const stats = collector.getStats(0);
      expect(stats.hitRate).toBe(0);
    });

    it("应该正确反映当前缓存大小", () => {
      const stats1 = collector.getStats(10);
      expect(stats1.currentSize).toBe(10);

      const stats2 = collector.getStats(25);
      expect(stats2.currentSize).toBe(25);
    });

    it("应该使用最大缓存大小", () => {
      const stats = collector.getStats(10);
      expect(stats.maxSize).toBe(maxSize);
    });
  });

  describe("reset", () => {
    it("应该重置所有统计信息", () => {
      collector.recordHit();
      collector.recordMiss();
      collector.recordSet();
      collector.recordDelete();
      collector.recordCleanup();

      collector.reset();

      const stats = collector.getStats(0);
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
      expect(stats.sets).toBe(0);
      expect(stats.deletes).toBe(0);
      expect(stats.cleanups).toBe(0);
      expect(stats.hitRate).toBe(0);
    });
  });

  describe("updateMaxSize", () => {
    it("应该更新最大缓存大小", () => {
      collector.updateMaxSize(2000);
      const stats = collector.getStats(10);
      expect(stats.maxSize).toBe(2000);
    });
  });
});
