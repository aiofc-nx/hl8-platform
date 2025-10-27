/**
 * 内存缓存提供者测试
 *
 * @description 测试内存缓存提供者的功能
 * @author HL8 SAAS Platform Team
 * @since 1.0.0
 */

import { MemoryCacheProvider } from "../../src/lib/cache/memory-cache.provider.js";
import {
  CacheStrategy,
  MemoryCacheOptions,
} from "../../src/lib/types/cache.types.js";
import { createTestConfig, wait } from "../test-utils.js";

describe("MemoryCacheProvider", () => {
  let cacheProvider: MemoryCacheProvider;
  let options: MemoryCacheOptions;

  beforeEach(() => {
    options = {
      strategy: CacheStrategy.MEMORY,
      ttl: 1000, // 1 秒
      maxSize: 10,
      enabled: true,
    };
    cacheProvider = new MemoryCacheProvider(options);
  });

  afterEach(() => {
    cacheProvider.destroy();
  });

  describe("基本功能", () => {
    it("应该设置和获取缓存值", async () => {
      const config = createTestConfig();
      const key = "test-config";

      await cacheProvider.set(key, config);
      const result = await cacheProvider.get(key);

      expect(result).toBeDefined();
      expect(result).toEqual(config);
    });

    it("应该返回 null 当键不存在时", async () => {
      const result = await cacheProvider.get("nonexistent-key");
      expect(result).toBeNull();
    });

    it("应该检查缓存是否存在", async () => {
      const config = createTestConfig();
      const key = "test-config";

      expect(await cacheProvider.has(key)).toBe(false);

      await cacheProvider.set(key, config);
      expect(await cacheProvider.has(key)).toBe(true);
    });

    it("应该删除缓存值", async () => {
      const config = createTestConfig();
      const key = "test-config";

      await cacheProvider.set(key, config);
      expect(await cacheProvider.has(key)).toBe(true);

      const deleted = await cacheProvider.delete(key);
      expect(deleted).toBe(true);
      expect(await cacheProvider.has(key)).toBe(false);
    });

    it("应该清空所有缓存", async () => {
      const config1 = createTestConfig();
      const config2 = { ...createTestConfig(), name: "Test App 2" };

      await cacheProvider.set("key1", config1);
      await cacheProvider.set("key2", config2);

      expect(await cacheProvider.has("key1")).toBe(true);
      expect(await cacheProvider.has("key2")).toBe(true);

      await cacheProvider.clear();

      expect(await cacheProvider.has("key1")).toBe(false);
      expect(await cacheProvider.has("key2")).toBe(false);
    });
  });

  describe("TTL 过期", () => {
    it("应该处理 TTL 过期", async () => {
      const config = createTestConfig();
      const key = "test-config";

      await cacheProvider.set(key, config, 100); // 100ms TTL
      expect(await cacheProvider.get(key)).toEqual(config);

      await wait(150); // 等待过期

      const result = await cacheProvider.get(key);
      expect(result).toBeNull();
    });

    it("应该处理默认 TTL", async () => {
      const config = createTestConfig();
      const key = "test-config";

      await cacheProvider.set(key, config);
      expect(await cacheProvider.get(key)).toEqual(config);

      await wait(1100); // 等待默认 TTL 过期

      const result = await cacheProvider.get(key);
      expect(result).toBeNull();
    });

    it("应该处理无过期时间", async () => {
      const config = createTestConfig();
      const key = "test-config";

      await cacheProvider.set(key, config, 0); // 无过期时间
      expect(await cacheProvider.get(key)).toEqual(config);

      await wait(2000); // 等待很长时间

      const result = await cacheProvider.get(key);
      expect(result).toEqual(config);
    });
  });

  describe("大小限制", () => {
    it("应该处理最大缓存大小限制", async () => {
      const config = createTestConfig();

      // 设置超过最大大小的缓存
      for (let i = 0; i < 15; i++) {
        await cacheProvider.set(`key-${i}`, { ...config, id: i });
      }

      // 应该只保留最新的条目
      const stats = await cacheProvider.getStats();
      expect(stats.totalEntries).toBeLessThanOrEqual(10);
    });

    it("应该处理内存使用限制", async () => {
      const largeConfig = {
        ...createTestConfig(),
        largeData: new Array(500).fill("x").join(""), // 减少到500个字符
      };

      // 设置内存限制
      const limitedProvider = new MemoryCacheProvider({
        ...options,
        maxMemory: 1000, // 1KB 限制
      });

      try {
        await limitedProvider.set("large-key", largeConfig);
        const stats = await limitedProvider.getStats();
        expect(stats.totalSize).toBeLessThanOrEqual(1000);
      } finally {
        limitedProvider.destroy();
      }
    });
  });

  describe("统计信息", () => {
    it("应该跟踪缓存命中率", async () => {
      const config = createTestConfig();
      const key = "test-config";

      // 未命中
      await cacheProvider.get(key);
      let stats = await cacheProvider.getStats();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBe(0);

      // 设置缓存
      await cacheProvider.set(key, config);

      // 命中
      await cacheProvider.get(key);
      stats = await cacheProvider.getStats();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBe(0.5);
    });

    it("应该跟踪访问时间", async () => {
      const config = createTestConfig();
      const key = "test-config";

      await cacheProvider.set(key, config);

      // 多次访问以确保有足够的访问时间
      for (let i = 0; i < 5; i++) {
        await cacheProvider.get(key);
      }

      const stats = await cacheProvider.getStats();
      expect(stats.averageAccessTime).toBeGreaterThanOrEqual(0);
      expect(stats.hits).toBe(5);
    });

    it("应该跟踪最常访问的键", async () => {
      const config = createTestConfig();

      await cacheProvider.set("key1", config);
      await cacheProvider.set("key2", config);

      // 多次访问 key1
      await cacheProvider.get("key1");
      await cacheProvider.get("key1");
      await cacheProvider.get("key1");

      // 一次访问 key2
      await cacheProvider.get("key2");

      const stats = await cacheProvider.getStats();
      expect(stats.topKeys).toBeDefined();
      expect(stats.topKeys.length).toBeGreaterThan(0);
      expect(stats.topKeys[0].key).toBe("key1");
      expect(stats.topKeys[0].count).toBe(3);
    });
  });

  describe("事件系统", () => {
    it("应该发送缓存事件", async () => {
      const events: any[] = [];
      const config = createTestConfig();
      const key = "test-config";

      cacheProvider.on("set", (event) => events.push(event));
      cacheProvider.on("miss", (event) => events.push(event));
      cacheProvider.on("hit", (event) => events.push(event));

      await cacheProvider.get("nonexistent"); // This should emit a miss event
      await cacheProvider.set(key, config);
      await cacheProvider.get(key);

      expect(events).toHaveLength(3);
      expect(events[0].type).toBe("miss");
      expect(events[1].type).toBe("set");
      expect(events[2].type).toBe("hit");
    });

    it("应该发送过期事件", async () => {
      const events: any[] = [];
      const config = createTestConfig();
      const key = "test-config";

      cacheProvider.on("expire", (event) => events.push(event));

      await cacheProvider.set(key, config, 100); // 100ms TTL
      await wait(150); // 等待过期
      await cacheProvider.get(key); // 触发过期检查

      expect(events).toHaveLength(1);
      expect(events[0].type).toBe("expire");
      expect(events[0].key).toBe(key);
    });

    it("应该发送删除事件", async () => {
      const events: any[] = [];
      const config = createTestConfig();
      const key = "test-config";

      cacheProvider.on("delete", (event) => events.push(event));

      await cacheProvider.set(key, config);
      await cacheProvider.delete(key);

      expect(events).toHaveLength(1);
      expect(events[0].type).toBe("delete");
      expect(events[0].key).toBe(key);
    });

    it("应该发送清空事件", async () => {
      const events: any[] = [];
      const config = createTestConfig();

      cacheProvider.on("clear", (event) => events.push(event));

      await cacheProvider.set("key1", config);
      await cacheProvider.set("key2", config);
      await cacheProvider.clear();

      expect(events).toHaveLength(1);
      expect(events[0].type).toBe("clear");
      expect(events[0].key).toBe("all");
    });
  });

  describe("错误处理", () => {
    it("应该处理设置错误", async () => {
      const events: any[] = [];
      cacheProvider.on("set", (event) => events.push(event));

      // 通过破坏内部状态来模拟错误
      const originalCalculateSize = (cacheProvider as any).calculateSize;
      (cacheProvider as any).calculateSize = jest
        .fn()
        .mockImplementation(() => {
          throw new Error("Size calculation failed");
        });

      try {
        await cacheProvider.set("key", createTestConfig());
      } catch (error) {
        // 预期会抛出错误
      }

      expect(events).toHaveLength(1);
      expect(events[0].type).toBe("set");
      expect(events[0].data.error).toBe("Size calculation failed");

      // 恢复原始方法
      (cacheProvider as any).calculateSize = originalCalculateSize;
    });

    it("应该处理获取错误", async () => {
      const events: any[] = [];
      cacheProvider.on("miss", (event) => events.push(event));

      // 通过破坏内部状态来模拟错误
      const originalCache = (cacheProvider as any).cache;
      (cacheProvider as any).cache = null;

      const result = await cacheProvider.get("key");

      expect(result).toBeNull();
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe("miss");
      expect(events[0].data.error).toBeDefined();

      // 恢复原始状态
      (cacheProvider as any).cache = originalCache;
    });
  });

  describe("性能测试", () => {
    it("应该高效处理大量操作", async () => {
      // 创建一个更大的缓存用于性能测试
      const performanceProvider = new MemoryCacheProvider({
        ...options,
        maxSize: 2000, // 增加最大大小
      });

      try {
        const config = createTestConfig();
        const startTime = Date.now();

        // 执行大量设置操作
        for (let i = 0; i < 1000; i++) {
          await performanceProvider.set(`key-${i}`, { ...config, id: i });
        }

        // 执行大量获取操作
        for (let i = 0; i < 1000; i++) {
          await performanceProvider.get(`key-${i}`);
        }

        const endTime = Date.now();
        const duration = endTime - startTime;

        expect(duration).toBeLessThan(1000); // 应该在1秒内完成

        const stats = await performanceProvider.getStats();
        expect(stats.hits).toBe(1000);
        expect(stats.misses).toBe(0);
        expect(stats.hitRate).toBe(1);
      } finally {
        performanceProvider.destroy();
      }
    });

    it("应该高效处理并发操作", async () => {
      // 创建一个更大的缓存用于并发测试
      const concurrentProvider = new MemoryCacheProvider({
        ...options,
        maxSize: 200, // 增加最大大小
      });

      try {
        const config = createTestConfig();
        const operations = [];

        // 并发设置操作
        for (let i = 0; i < 100; i++) {
          operations.push(
            concurrentProvider.set(`key-${i}`, { ...config, id: i }),
          );
        }

        await Promise.all(operations);

        // 并发获取操作
        const getOperations = [];
        for (let i = 0; i < 100; i++) {
          getOperations.push(concurrentProvider.get(`key-${i}`));
        }

        const results = await Promise.all(getOperations);

        expect(results).toHaveLength(100);
        results.forEach((result, index) => {
          expect(result).toBeDefined();
          expect(result.id).toBe(index);
        });
      } finally {
        concurrentProvider.destroy();
      }
    });
  });
});
