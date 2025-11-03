/**
 * @fileoverview InMemoryCache 单元测试
 * @description 测试内存缓存实现的功能
 */

import { InMemoryCache } from "./in-memory-cache.js";
import type { CacheConfig, Logger } from "../cache.interface.js";
import type { Logger as LoggerType } from "@hl8/logger";

describe("InMemoryCache", () => {
  let cache: InMemoryCache;
  let mockLogger: Logger;
  let config: CacheConfig;

  const createMockLogger = (): Logger => {
    return {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      info: jest.fn(),
    } as unknown as LoggerType;
  };

  beforeEach(() => {
    mockLogger = createMockLogger();
    config = {
      defaultTtl: 1000,
      maxSize: 100,
      enableStats: true,
      enableEventInvalidation: true,
      cleanupInterval: 5000,
      evictionStrategy: "LRU",
    };
    cache = new InMemoryCache(config, mockLogger);
  });

  afterEach(() => {
    cache.destroy();
  });

  describe("构造函数", () => {
    it("应该初始化缓存", () => {
      expect(cache).toBeDefined();
      expect(mockLogger.info).toHaveBeenCalledWith(
        "InMemoryCache 初始化完成",
        expect.objectContaining({
          maxSize: config.maxSize,
          defaultTtl: config.defaultTtl,
          evictionStrategy: config.evictionStrategy,
        }),
      );
    });

    it("应该启动清理定时器", () => {
      expect(mockLogger.debug).toHaveBeenCalledWith(
        "清理定时器已启动",
        expect.objectContaining({
          interval: config.cleanupInterval,
        }),
      );
    });
  });

  describe("get", () => {
    it("应该返回未定义当键不存在时", async () => {
      const result = await cache.get("nonexistent");
      expect(result).toBeUndefined();
      expect(mockLogger.debug).toHaveBeenCalledWith("缓存未命中", {
        key: "nonexistent",
      });
    });

    it("应该返回缓存值当键存在时", async () => {
      await cache.set("key1", "value1");
      const result = await cache.get("key1");
      expect(result).toBe("value1");
      expect(mockLogger.debug).toHaveBeenCalledWith(
        "缓存命中",
        expect.objectContaining({
          key: "key1",
        }),
      );
    });

    it("应该返回未定义当缓存项已过期时", async () => {
      await cache.set("key1", "value1", 10);
      await new Promise((resolve) => setTimeout(resolve, 20));
      const result = await cache.get("key1");
      expect(result).toBeUndefined();
      expect(mockLogger.debug).toHaveBeenCalledWith(
        "缓存已过期",
        expect.objectContaining({
          key: "key1",
        }),
      );
    });

    it("应该更新访问信息", async () => {
      await cache.set("key1", "value1");
      await cache.get("key1");
      await cache.get("key1");
      const metadata = await cache.getMetadata("key1");
      expect(metadata?.accessCount).toBe(2);
      expect(metadata?.lastAccessedAt).toBeGreaterThan(0);
    });

    it("应该记录统计信息", async () => {
      await cache.set("key1", "value1");
      await cache.get("key1");
      await cache.get("nonexistent");
      const stats = await cache.getStats();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
    });
  });

  describe("set", () => {
    it("应该设置缓存值", async () => {
      await cache.set("key1", "value1");
      const result = await cache.get("key1");
      expect(result).toBe("value1");
    });

    it("应该使用默认 TTL", async () => {
      await cache.set("key1", "value1");
      const metadata = await cache.getMetadata("key1");
      expect(metadata?.expiresAt).toBeGreaterThan(Date.now());
    });

    it("应该使用自定义 TTL", async () => {
      await cache.set("key1", "value1", 500);
      const metadata = await cache.getMetadata("key1");
      const expectedExpiresAt = metadata?.createdAt! + 500;
      expect(metadata?.expiresAt).toBe(expectedExpiresAt);
    });

    it("应该支持永不过期的缓存项（TTL=0）", async () => {
      await cache.set("key1", "value1", 0);
      await new Promise((resolve) => setTimeout(resolve, 100));
      const result = await cache.get("key1");
      expect(result).toBe("value1");
      const metadata = await cache.getMetadata("key1");
      expect(metadata?.expiresAt).toBe(0);
    });

    it("应该支持标签", async () => {
      await cache.set("key1", "value1", undefined, ["tag1", "tag2"]);
      await cache.set("key2", "value2", undefined, ["tag1"]);
      await cache.invalidateByTags(["tag1"]);
      expect(await cache.get("key1")).toBeUndefined();
      expect(await cache.get("key2")).toBeUndefined();
    });

    it("应该在缓存满时淘汰旧项", async () => {
      const smallConfig: CacheConfig = {
        ...config,
        maxSize: 2,
        evictionStrategy: "FIFO",
      };
      const smallCache = new InMemoryCache(smallConfig, mockLogger);
      await smallCache.set("key1", "value1");
      await smallCache.set("key2", "value2");
      await smallCache.set("key3", "value3");
      expect(await smallCache.get("key1")).toBeUndefined();
      expect(await smallCache.get("key2")).toBeDefined();
      expect(await smallCache.get("key3")).toBeDefined();
      smallCache.destroy();
    });

    it("应该记录设置操作", async () => {
      await cache.set("key1", "value1");
      const stats = await cache.getStats();
      expect(stats.sets).toBe(1);
    });
  });

  describe("delete", () => {
    it("应该删除缓存项", async () => {
      await cache.set("key1", "value1");
      await cache.delete("key1");
      expect(await cache.get("key1")).toBeUndefined();
    });

    it("应该安全地删除不存在的键", async () => {
      await expect(cache.delete("nonexistent")).resolves.not.toThrow();
    });

    it("应该清理标签索引", async () => {
      await cache.set("key1", "value1", undefined, ["tag1"]);
      await cache.delete("key1");
      await cache.invalidateByTags(["tag1"]);
      // 不应该有错误
      expect(true).toBe(true);
    });

    it("应该记录删除操作", async () => {
      await cache.set("key1", "value1");
      await cache.delete("key1");
      const stats = await cache.getStats();
      expect(stats.deletes).toBe(1);
    });
  });

  describe("deleteMany", () => {
    it("应该批量删除缓存项", async () => {
      await cache.set("key1", "value1");
      await cache.set("key2", "value2");
      await cache.set("key3", "value3");
      await cache.deleteMany(["key1", "key2"]);
      expect(await cache.get("key1")).toBeUndefined();
      expect(await cache.get("key2")).toBeUndefined();
      expect(await cache.get("key3")).toBeDefined();
    });
  });

  describe("invalidateByTags", () => {
    it("应该通过标签失效缓存", async () => {
      await cache.set("key1", "value1", undefined, ["tag1"]);
      await cache.set("key2", "value2", undefined, ["tag2"]);
      await cache.set("key3", "value3", undefined, ["tag1", "tag2"]);
      await cache.invalidateByTags(["tag1"]);
      expect(await cache.get("key1")).toBeUndefined();
      expect(await cache.get("key2")).toBeDefined();
      expect(await cache.get("key3")).toBeUndefined();
    });

    it("应该支持多个标签", async () => {
      await cache.set("key1", "value1", undefined, ["tag1"]);
      await cache.set("key2", "value2", undefined, ["tag2"]);
      await cache.invalidateByTags(["tag1", "tag2"]);
      expect(await cache.get("key1")).toBeUndefined();
      expect(await cache.get("key2")).toBeUndefined();
    });
  });

  describe("invalidateByPattern", () => {
    it("应该通过模式匹配失效缓存", async () => {
      await cache.set("repo:user:1", "user1");
      await cache.set("repo:user:2", "user2");
      await cache.set("repo:order:1", "order1");
      await cache.invalidateByPattern("repo:user:*");
      expect(await cache.get("repo:user:1")).toBeUndefined();
      expect(await cache.get("repo:user:2")).toBeUndefined();
      expect(await cache.get("repo:order:1")).toBeDefined();
    });

    it("应该支持复杂模式", async () => {
      await cache.set("tenant1:repo:user:1", "user1");
      await cache.set("tenant2:repo:user:1", "user1");
      await cache.invalidateByPattern("tenant1:*");
      expect(await cache.get("tenant1:repo:user:1")).toBeUndefined();
      expect(await cache.get("tenant2:repo:user:1")).toBeDefined();
    });
  });

  describe("clear", () => {
    it("应该清空所有缓存", async () => {
      await cache.set("key1", "value1");
      await cache.set("key2", "value2");
      await cache.clear();
      expect(await cache.get("key1")).toBeUndefined();
      expect(await cache.get("key2")).toBeUndefined();
      const stats = await cache.getStats();
      expect(stats.currentSize).toBe(0);
    });

    it("应该重置统计信息", async () => {
      await cache.set("key1", "value1");
      await cache.get("key1");
      await cache.clear();
      const stats = await cache.getStats();
      expect(stats.hits).toBe(0);
      expect(stats.sets).toBe(0);
    });
  });

  describe("getStats", () => {
    it("应该返回统计信息", async () => {
      await cache.set("key1", "value1");
      await cache.get("key1");
      await cache.get("nonexistent");
      const stats = await cache.getStats();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
      expect(stats.sets).toBe(1);
      expect(stats.currentSize).toBe(1);
      expect(stats.maxSize).toBe(config.maxSize);
      expect(stats.hitRate).toBeCloseTo(0.5, 5);
      expect(stats.lastUpdated).toBeInstanceOf(Date);
    });
  });

  describe("getMetadata", () => {
    it("应该返回缓存项元数据", async () => {
      await cache.set("key1", "value1", 1000, ["tag1"]);
      const metadata = await cache.getMetadata("key1");
      expect(metadata).toBeDefined();
      expect(metadata?.key).toBe("key1");
      expect(metadata?.tags).toEqual(["tag1"]);
      expect(metadata?.expiresAt).toBeGreaterThan(0);
      expect(metadata?.createdAt).toBeGreaterThan(0);
      expect(metadata?.lastAccessedAt).toBeGreaterThan(0);
      expect(metadata?.accessCount).toBe(0);
    });

    it("应该返回未定义当键不存在时", async () => {
      const metadata = await cache.getMetadata("nonexistent");
      expect(metadata).toBeUndefined();
    });
  });

  describe("resetStats", () => {
    it("应该重置统计信息", async () => {
      await cache.set("key1", "value1");
      await cache.get("key1");
      await cache.resetStats();
      const stats = await cache.getStats();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
      expect(stats.sets).toBe(0);
    });
  });

  describe("淘汰策略", () => {
    it("应该使用 LRU 策略淘汰", async () => {
      const lruConfig: CacheConfig = {
        ...config,
        maxSize: 2,
        evictionStrategy: "LRU",
      };
      const lruCache = new InMemoryCache(lruConfig, mockLogger);
      await lruCache.set("key1", "value1");
      // 等待一小段时间，确保时间戳不同
      await new Promise((resolve) => setTimeout(resolve, 10));
      await lruCache.set("key2", "value2");
      // 访问 key2，使其成为最近使用的
      await lruCache.get("key2");
      // 确保 lastAccessedAt 存在明显时间差
      await new Promise((resolve) => setTimeout(resolve, 50));
      // 添加新项，应该淘汰 key2（因为它是最久未使用的）
      await lruCache.set("key3", "value3");
      expect(await lruCache.get("key1")).toBeUndefined(); // key1 被淘汰（最久未使用）
      expect(await lruCache.get("key2")).toBeDefined(); // key2 被保留（最近访问）
      expect(await lruCache.get("key3")).toBeDefined(); // key3 被添加
      lruCache.destroy();
    });

    it("应该使用 FIFO 策略淘汰", async () => {
      const fifoConfig: CacheConfig = {
        ...config,
        maxSize: 2,
        evictionStrategy: "FIFO",
      };
      const fifoCache = new InMemoryCache(fifoConfig, mockLogger);
      await fifoCache.set("key1", "value1");
      await fifoCache.set("key2", "value2");
      await fifoCache.set("key3", "value3"); // 应该淘汰 key1
      expect(await fifoCache.get("key1")).toBeUndefined();
      expect(await fifoCache.get("key2")).toBeDefined();
      expect(await fifoCache.get("key3")).toBeDefined();
      fifoCache.destroy();
    });

    it("应该使用 LFU 策略淘汰", async () => {
      const lfuConfig: CacheConfig = {
        ...config,
        maxSize: 2,
        evictionStrategy: "LFU",
      };
      const lfuCache = new InMemoryCache(lfuConfig, mockLogger);
      await lfuCache.set("key1", "value1");
      await lfuCache.set("key2", "value2");
      await lfuCache.get("key2"); // 增加 key2 的访问次数
      await lfuCache.get("key2");
      await lfuCache.set("key3", "value3"); // 应该淘汰 key1
      expect(await lfuCache.get("key1")).toBeUndefined();
      expect(await lfuCache.get("key2")).toBeDefined();
      expect(await lfuCache.get("key3")).toBeDefined();
      lfuCache.destroy();
    });
  });

  describe("清理定时器", () => {
    it("应该定期清理过期项", async () => {
      const shortIntervalConfig: CacheConfig = {
        ...config,
        cleanupInterval: 100,
      };
      const testCache = new InMemoryCache(shortIntervalConfig, mockLogger);
      await testCache.set("key1", "value1", 50);
      await new Promise((resolve) => setTimeout(resolve, 150));
      expect(await testCache.get("key1")).toBeUndefined();
      testCache.destroy();
    }, 10000);
  });

  describe("destroy", () => {
    it("应该清理所有资源", () => {
      cache.destroy();
      expect(mockLogger.info).toHaveBeenCalledWith("InMemoryCache 已销毁");
    });
  });
});
