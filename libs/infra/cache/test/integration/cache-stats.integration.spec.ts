/**
 * @fileoverview 缓存统计集成测试
 * @description 验证缓存统计信息的准确性和完整性
 */

import { InMemoryCache } from "../../src/implementations/in-memory-cache.js";
import { CacheConfig } from "../../src/config/cache.config.js";
import type { Logger } from "@hl8/logger";

describe("Cache Statistics Integration", () => {
  let cache: InMemoryCache;
  let mockLogger: Logger;
  let config: CacheConfig;

  beforeEach(() => {
    mockLogger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      info: jest.fn(),
    } as unknown as Logger;

    config = {
      defaultTtl: 0,
      maxSize: 100,
      enableStats: true,
      enableEventInvalidation: true,
      cleanupInterval: 5000,
      evictionStrategy: "LRU",
    };

    cache = new InMemoryCache(config, mockLogger);
  });

  afterEach(() => {
    if (cache) {
      cache.destroy();
    }
  });

  describe("统计准确性", () => {
    it("应该准确记录缓存命中", async () => {
      await cache.set("key1", { v: 1 });
      await cache.get("key1");
      await cache.get("key1");
      await cache.get("key1");

      const stats = await cache.getStats();

      expect(stats.hits).toBe(3);
      expect(stats.misses).toBe(0);
      expect(stats.sets).toBe(1);
      expect(stats.currentSize).toBe(1);
      expect(stats.hitRate).toBe(1);
    });

    it("应该准确记录缓存未命中", async () => {
      await cache.get("nonexistent1");
      await cache.get("nonexistent2");
      await cache.get("nonexistent3");

      const stats = await cache.getStats();

      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(3);
      expect(stats.hitRate).toBe(0);
    });

    it("应该准确记录缓存设置次数", async () => {
      for (let i = 0; i < 10; i++) {
        await cache.set(`key${i}`, { v: i });
      }

      const stats = await cache.getStats();

      expect(stats.sets).toBe(10);
      expect(stats.currentSize).toBe(10);
    });

    it("应该准确记录删除次数", async () => {
      await cache.set("key1", { v: 1 });
      await cache.set("key2", { v: 2 });
      await cache.set("key3", { v: 3 });

      await cache.delete("key1");
      await cache.delete("key3");

      const stats = await cache.getStats();

      expect(stats.deletes).toBe(2);
      expect(stats.currentSize).toBe(1);
    });

    it("应该准确计算命中率", async () => {
      await cache.set("key1", { v: 1 });

      // 10 次命中
      for (let i = 0; i < 10; i++) {
        await cache.get("key1");
      }

      // 5 次未命中
      for (let i = 0; i < 5; i++) {
        await cache.get("nonexistent");
      }

      const stats = await cache.getStats();

      expect(stats.hits).toBe(10);
      expect(stats.misses).toBe(5);
      expect(stats.hitRate).toBe(10 / 15);
    });

    it("应该在并发操作时保持统计准确性", async () => {
      const operations = [];

      // 并发设置
      for (let i = 0; i < 20; i++) {
        operations.push(cache.set(`key${i}`, { v: i }));
      }

      await Promise.all(operations);

      // 并发读取
      for (let i = 0; i < 20; i++) {
        operations.push(cache.get(`key${i}`));
      }

      await Promise.all(operations);

      const stats = await cache.getStats();

      expect(stats.sets).toBe(20);
      expect(stats.hits).toBe(20);
      expect(stats.currentSize).toBe(20);
    });

    it("应该准确记录清理次数", async () => {
      const configWithTtl: CacheConfig = {
        defaultTtl: 100,
        maxSize: 100,
        enableStats: true,
        enableEventInvalidation: true,
        cleanupInterval: 50,
        evictionStrategy: "LRU",
      };

      const ttlCache = new InMemoryCache(configWithTtl, mockLogger);

      // 设置多个过期项
      for (let i = 0; i < 10; i++) {
        await ttlCache.set(`key${i}`, { v: i });
      }

      // 等待清理
      await new Promise((resolve) => setTimeout(resolve, 200));

      const stats = await ttlCache.getStats();

      expect(stats.cleanups).toBeGreaterThan(0);
      expect(stats.currentSize).toBe(0);

      ttlCache.destroy();
    });
  });

  describe("统计重置", () => {
    it("应该正确重置统计信息", async () => {
      await cache.set("key1", { v: 1 });
      await cache.get("key1");
      await cache.get("key1");

      let stats = await cache.getStats();
      expect(stats.hits).toBeGreaterThan(0);
      expect(stats.sets).toBeGreaterThan(0);

      await cache.resetStats();

      stats = await cache.getStats();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
      expect(stats.sets).toBe(0);
      expect(stats.deletes).toBe(0);
      expect(stats.cleanups).toBe(0);
      expect(stats.hitRate).toBe(0);

      // 验证缓存项仍在
      expect(await cache.get("key1")).toBeDefined();
    });

    it("应该在重置后继续正常统计", async () => {
      await cache.set("key1", { v: 1 });
      await cache.get("key1");

      await cache.resetStats();

      await cache.set("key2", { v: 2 });
      await cache.get("key2");

      const stats = await cache.getStats();

      expect(stats.sets).toBe(1);
      expect(stats.hits).toBe(1);
    });
  });

  describe("时间戳更新", () => {
    it("应该正确更新时间戳", async () => {
      const stats1 = await cache.getStats();
      const time1 = stats1.lastUpdated.getTime();

      // 等待一小段时间
      await new Promise((resolve) => setTimeout(resolve, 10));

      await cache.set("key1", { v: 1 });

      const stats2 = await cache.getStats();
      const time2 = stats2.lastUpdated.getTime();

      expect(time2).toBeGreaterThanOrEqual(time1);
    });
  });

  describe("元数据统计", () => {
    it("应该返回准确的缓存项元数据", async () => {
      await cache.set("key1", { v: 1 }, 1000, ["tag1"]);

      const metadata = await cache.getMetadata("key1");

      expect(metadata).toBeDefined();
      expect(metadata!.key).toBe("key1");
      expect(metadata!.expiresAt).toBeGreaterThan(0);
      expect(metadata!.createdAt).toBeGreaterThan(0);
      expect(metadata!.lastAccessedAt).toBeGreaterThan(0);
      expect(metadata!.accessCount).toBe(0);
      expect(metadata!.tags).toEqual(["tag1"]);
    });

    it("应该在访问后更新元数据", async () => {
      await cache.set("key1", { v: 1 });

      const metadata1 = await cache.getMetadata("key1");
      const originalAccessCount = metadata1!.accessCount;
      const originalLastAccessed = metadata1!.lastAccessedAt;

      await new Promise((resolve) => setTimeout(resolve, 10));
      await cache.get("key1");

      const metadata2 = await cache.getMetadata("key1");

      expect(metadata2!.accessCount).toBe(originalAccessCount + 1);
      expect(metadata2!.lastAccessedAt).toBeGreaterThan(originalLastAccessed);
    });

    it("应该为不存在的键返回 undefined", async () => {
      const metadata = await cache.getMetadata("nonexistent");

      expect(metadata).toBeUndefined();
    });
  });

  describe("边界情况", () => {
    it("应该在禁用统计时正常返回统计信息", async () => {
      const configNoStats: CacheConfig = {
        defaultTtl: 0,
        maxSize: 100,
        enableStats: false,
        enableEventInvalidation: true,
        cleanupInterval: 5000,
        evictionStrategy: "LRU",
      };

      const noStatsCache = new InMemoryCache(configNoStats, mockLogger);

      await noStatsCache.set("key1", { v: 1 });
      await noStatsCache.get("key1");

      const stats = await noStatsCache.getStats();

      // 即使禁用统计，也应该返回统计对象
      expect(stats).toBeDefined();
      expect(typeof stats.hits).toBe("number");
      expect(typeof stats.misses).toBe("number");

      noStatsCache.destroy();
    });

    it("应该正确处理最大值限制", async () => {
      const configSmallMax: CacheConfig = {
        defaultTtl: 0,
        maxSize: 2,
        enableStats: true,
        enableEventInvalidation: true,
        cleanupInterval: 5000,
        evictionStrategy: "LRU",
      };

      const smallCache = new InMemoryCache(configSmallMax, mockLogger);

      await smallCache.set("key1", { v: 1 });
      await smallCache.set("key2", { v: 2 });
      await smallCache.set("key3", { v: 3 });

      const stats = await smallCache.getStats();

      expect(stats.currentSize).toBeLessThanOrEqual(2);
      expect(stats.maxSize).toBe(2);

      smallCache.destroy();
    });
  });
});
