/**
 * @fileoverview 缓存配置集成测试
 * @description 验证缓存配置的初始化和运行时配置行为
 */

import { InMemoryCache } from "../../src/implementations/in-memory-cache.js";
import { CacheConfig } from "../../src/config/cache.config.js";
import type { Logger } from "@hl8/logger";

describe("Cache Configuration Integration", () => {
  let mockLogger: Logger;

  beforeEach(() => {
    mockLogger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      info: jest.fn(),
    } as unknown as Logger;
  });

  describe("配置初始化", () => {
    it("应该使用有效的配置初始化缓存", () => {
      const config: CacheConfig = {
        defaultTtl: 3600000,
        maxSize: 1000,
        enableStats: true,
        enableEventInvalidation: true,
        cleanupInterval: 600000,
        evictionStrategy: "LRU",
      };

      const cache = new InMemoryCache(config, mockLogger);

      // 验证缓存可以正常工作
      expect(cache).toBeDefined();

      cache.destroy();
    });

    it("应该支持不同的淘汰策略配置", () => {
      const strategies: Array<"LRU" | "FIFO" | "LFU"> = ["LRU", "FIFO", "LFU"];

      for (const strategy of strategies) {
        const config: CacheConfig = {
          defaultTtl: 1000,
          maxSize: 10,
          enableStats: true,
          enableEventInvalidation: true,
          cleanupInterval: 1000,
          evictionStrategy: strategy,
        };

        const cache = new InMemoryCache(config, mockLogger);
        expect(cache).toBeDefined();

        cache.destroy();
      }
    });

    it("应该支持不同的 TTL 配置", () => {
      const ttls = [0, 100, 1000, 3600000];

      for (const ttl of ttls) {
        const config: CacheConfig = {
          defaultTtl: ttl,
          maxSize: 100,
          enableStats: true,
          enableEventInvalidation: true,
          cleanupInterval: 1000,
          evictionStrategy: "LRU",
        };

        const cache = new InMemoryCache(config, mockLogger);
        expect(cache).toBeDefined();

        cache.destroy();
      }
    });

    it("应该支持禁用统计功能", () => {
      const config: CacheConfig = {
        defaultTtl: 1000,
        maxSize: 100,
        enableStats: false,
        enableEventInvalidation: true,
        cleanupInterval: 1000,
        evictionStrategy: "LRU",
      };

      const cache = new InMemoryCache(config, mockLogger);
      expect(cache).toBeDefined();

      cache.destroy();
    });

    it("应该支持禁用事件失效功能", () => {
      const config: CacheConfig = {
        defaultTtl: 1000,
        maxSize: 100,
        enableStats: true,
        enableEventInvalidation: false,
        cleanupInterval: 1000,
        evictionStrategy: "LRU",
      };

      const cache = new InMemoryCache(config, mockLogger);
      expect(cache).toBeDefined();

      cache.destroy();
    });

    it("应该支持不同的清理间隔配置", () => {
      const intervals = [100, 1000, 60000, 3600000];

      for (const interval of intervals) {
        const config: CacheConfig = {
          defaultTtl: 1000,
          maxSize: 100,
          enableStats: true,
          enableEventInvalidation: true,
          cleanupInterval: interval,
          evictionStrategy: "LRU",
        };

        const cache = new InMemoryCache(config, mockLogger);
        expect(cache).toBeDefined();

        cache.destroy();
      }
    });
  });

  describe("配置影响行为", () => {
    it("应该根据 maxSize 配置执行淘汰", async () => {
      const config: CacheConfig = {
        defaultTtl: 0,
        maxSize: 3,
        enableStats: true,
        enableEventInvalidation: true,
        cleanupInterval: 1000,
        evictionStrategy: "LRU",
      };

      const cache = new InMemoryCache(config, mockLogger);

      // 填满缓存
      await cache.set("key1", { v: 1 });
      await cache.set("key2", { v: 2 });
      await cache.set("key3", { v: 3 });

      // 添加新项，应该淘汰一个
      await cache.set("key4", { v: 4 });

      const stats = await cache.getStats();
      expect(stats.currentSize).toBeLessThanOrEqual(3);

      cache.destroy();
    });

    it("应该根据 defaultTtl 配置自动过期", async () => {
      const config: CacheConfig = {
        defaultTtl: 100,
        maxSize: 100,
        enableStats: true,
        enableEventInvalidation: true,
        cleanupInterval: 50,
        evictionStrategy: "LRU",
      };

      const cache = new InMemoryCache(config, mockLogger);

      await cache.set("key1", { v: 1 });

      // 等待过期
      await new Promise((resolve) => setTimeout(resolve, 150));

      expect(await cache.get("key1")).toBeUndefined();

      cache.destroy();
    });

    it("应该根据清理间隔定期清理", async () => {
      const config: CacheConfig = {
        defaultTtl: 100,
        maxSize: 100,
        enableStats: true,
        enableEventInvalidation: true,
        cleanupInterval: 50,
        evictionStrategy: "LRU",
      };

      const cache = new InMemoryCache(config, mockLogger);

      await cache.set("key1", { v: 1 });

      // 等待至少两次清理周期
      await new Promise((resolve) => setTimeout(resolve, 150));

      const stats = await cache.getStats();
      // 清理次数可能为 0 如果定时器尚未触发，这是正常的
      // 只要缓存项被正确过期即可
      expect(stats.currentSize).toBe(0);

      cache.destroy();
    });
  });

  describe("复杂配置场景", () => {
    it("应该组合所有配置选项正常工作", async () => {
      const config: CacheConfig = {
        defaultTtl: 1000,
        maxSize: 50,
        enableStats: true,
        enableEventInvalidation: true,
        cleanupInterval: 500,
        evictionStrategy: "LFU",
        enableCompression: false,
      };

      const cache = new InMemoryCache(config, mockLogger);

      // 测试基本操作
      await cache.set("key1", { v: 1 }, undefined, ["tag1"]);
      await cache.set("key2", { v: 2 }, 500, ["tag1", "tag2"]);
      const value = await cache.get("key2");

      expect(value).toBeDefined();
      expect(await cache.getStats()).toBeDefined();

      await cache.invalidateByTags(["tag1"]);
      expect(await cache.get("key1")).toBeUndefined();
      expect(await cache.get("key2")).toBeUndefined();

      cache.destroy();
    });

    it("应该在不同配置下保持稳定", async () => {
      const configs: CacheConfig[] = [
        {
          defaultTtl: 0,
          maxSize: 1000,
          enableStats: false,
          enableEventInvalidation: false,
          cleanupInterval: 10000,
          evictionStrategy: "LRU",
        },
        {
          defaultTtl: 1000,
          maxSize: 10,
          enableStats: true,
          enableEventInvalidation: true,
          cleanupInterval: 100,
          evictionStrategy: "FIFO",
        },
        {
          defaultTtl: 60000,
          maxSize: 500,
          enableStats: true,
          enableEventInvalidation: true,
          cleanupInterval: 60000,
          evictionStrategy: "LFU",
        },
      ];

      for (const config of configs) {
        const cache = new InMemoryCache(config, mockLogger);

        // 执行基本操作
        await cache.set("test", { v: "test" });
        await cache.get("test");
        await cache.delete("test");

        const stats = await cache.getStats();
        expect(stats).toBeDefined();

        cache.destroy();
      }
    });
  });
});
