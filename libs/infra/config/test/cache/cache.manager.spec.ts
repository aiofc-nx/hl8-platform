/**
 * 缓存管理器测试
 *
 * @description 测试缓存管理器的功能
 * @author HL8 SAAS Platform Team
 * @since 1.0.0
 */

import { CacheManager } from "../../src/lib/cache/cache.manager.js";
import { CacheOptions, CacheStrategy } from "../../src/lib/types/cache.types.js";
import { createTestConfig, wait } from "../test-utils.js";

describe("CacheManager", () => {
  let cacheManager: CacheManager;
  let options: CacheOptions;

  beforeEach(() => {
    options = {
      strategy: CacheStrategy.MEMORY,
      ttl: 1000, // 1 秒
      maxSize: 10,
      enabled: true,
    };
    cacheManager = new CacheManager(options);
  });

  afterEach(() => {
    cacheManager.destroy();
  });

  describe("基本功能", () => {
    it("应该设置和获取缓存值", async () => {
      const config = createTestConfig();
      const key = "test-config";

      await cacheManager.set(key, config);
      const result = await cacheManager.get(key);

      expect(result).toBeDefined();
      expect(result).toEqual(config);
    });

    it("应该返回 null 当键不存在时", async () => {
      const result = await cacheManager.get("nonexistent-key");
      expect(result).toBeNull();
    });

    it("应该检查缓存是否存在", async () => {
      const config = createTestConfig();
      const key = "test-config";

      expect(await cacheManager.has(key)).toBe(false);

      await cacheManager.set(key, config);
      expect(await cacheManager.has(key)).toBe(true);
    });

    it("应该删除缓存值", async () => {
      const config = createTestConfig();
      const key = "test-config";

      await cacheManager.set(key, config);
      expect(await cacheManager.has(key)).toBe(true);

      const deleted = await cacheManager.delete(key);
      expect(deleted).toBe(true);
      expect(await cacheManager.has(key)).toBe(false);
    });

    it("应该清空所有缓存", async () => {
      const config1 = createTestConfig();
      const config2 = { ...createTestConfig(), name: "Test App 2" };

      await cacheManager.set("key1", config1);
      await cacheManager.set("key2", config2);

      expect(await cacheManager.has("key1")).toBe(true);
      expect(await cacheManager.has("key2")).toBe(true);

      await cacheManager.clear();

      expect(await cacheManager.has("key1")).toBe(false);
      expect(await cacheManager.has("key2")).toBe(false);
    });
  });

  describe("缓存键生成", () => {
    it("应该使用默认键前缀", async () => {
      const config = createTestConfig();
      const key = "test-config";

      await cacheManager.set(key, config);
      const result = await cacheManager.get(key);

      expect(result).toBeDefined();
      expect(result).toEqual(config);
    });

    it("应该使用自定义键前缀", async () => {
      const customManager = new CacheManager({
        ...options,
        keyPrefix: "custom",
      });

      const config = createTestConfig();
      const key = "test-config";

      await customManager.set(key, config);
      const result = await customManager.get(key);

      expect(result).toBeDefined();
      expect(result).toEqual(config);

      customManager.destroy();
    });

    it("应该使用自定义键生成器", async () => {
      const customManager = new CacheManager({
        ...options,
        keyGenerator: (key: string) => `custom:${key}:${Date.now()}`,
      });

      const config = createTestConfig();
      const key = "test-config";

      await customManager.set(key, config);
      const result = await customManager.get(key);

      expect(result).toBeDefined();
      expect(result).toEqual(config);

      customManager.destroy();
    });
  });

  describe("TTL 处理", () => {
    it("应该使用默认 TTL", async () => {
      const config = createTestConfig();
      const key = "test-config";

      await cacheManager.set(key, config);
      expect(await cacheManager.get(key)).toEqual(config);

      await wait(1100); // 等待默认 TTL 过期

      const result = await cacheManager.get(key);
      expect(result).toBeNull();
    });

    it("应该使用自定义 TTL", async () => {
      const config = createTestConfig();
      const key = "test-config";

      await cacheManager.set(key, config, 2000); // 2 秒 TTL
      expect(await cacheManager.get(key)).toEqual(config);

      await wait(500); // 等待 500ms，应该还没过期
      expect(await cacheManager.get(key)).toEqual(config);

      await wait(1600); // 再等待 1.6 秒，总共 2.1 秒，应该过期
      const result = await cacheManager.get(key);
      expect(result).toBeNull();
    });
  });

  describe("缓存禁用", () => {
    it("应该在禁用时返回 null", async () => {
      cacheManager.disable();

      const config = createTestConfig();
      const key = "test-config";

      await cacheManager.set(key, config);
      const result = await cacheManager.get(key);

      expect(result).toBeNull();
    });

    it("应该在禁用时忽略设置操作", async () => {
      cacheManager.disable();

      const config = createTestConfig();
      const key = "test-config";

      await expect(cacheManager.set(key, config)).resolves.not.toThrow();
    });

    it("应该支持重新启用", async () => {
      cacheManager.disable();

      const config = createTestConfig();
      const key = "test-config";

      await cacheManager.set(key, config);
      expect(await cacheManager.get(key)).toBeNull();

      cacheManager.enable();
      await cacheManager.set(key, config);
      expect(await cacheManager.get(key)).toEqual(config);
    });
  });

  describe("统计信息", () => {
    it("应该提供缓存统计信息", async () => {
      const config = createTestConfig();
      const key = "test-config";

      // 初始统计
      let stats = await cacheManager.getStats();
      expect(stats.totalEntries).toBe(0);
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
      expect(stats.hitRate).toBe(0);

      // 设置缓存
      await cacheManager.set(key, config);

      // 获取缓存（命中）
      await cacheManager.get(key);

      stats = await cacheManager.getStats();
      expect(stats.totalEntries).toBe(1);
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(0);
      expect(stats.hitRate).toBe(1);
    });

    it("应该跟踪未命中", async () => {
      // 获取不存在的缓存（未命中）
      await cacheManager.get("nonexistent-key");

      const stats = await cacheManager.getStats();
      expect(stats.misses).toBe(1);
      expect(stats.hits).toBe(0);
      expect(stats.hitRate).toBe(0);
    });
  });

  describe("事件系统", () => {
    it("应该代理缓存事件", async () => {
      const events: any[] = [];
      const config = createTestConfig();
      const key = "test-config";

      cacheManager.on("set", (event) => events.push(event));
      cacheManager.on("hit", (event) => events.push(event));

      await cacheManager.set(key, config);
      await cacheManager.get(key);

      expect(events).toHaveLength(2);
      expect(events[0].type).toBe("set");
      expect(events[1].type).toBe("hit");
    });

    it("应该支持移除事件监听器", async () => {
      const events: any[] = [];
      const config = createTestConfig();
      const key = "test-config";

      const listener = (event: any) => events.push(event);
      cacheManager.on("set", listener);

      await cacheManager.set(key, config);
      expect(events).toHaveLength(1);

      cacheManager.off("set", listener);
      await cacheManager.set("key2", config);
      expect(events).toHaveLength(1); // 不应该增加
    });
  });

  describe("配置更新", () => {
    it("应该支持更新缓存选项", async () => {
      const config = createTestConfig();
      const key = "test-config";

      await cacheManager.set(key, config);
      expect(await cacheManager.get(key)).toEqual(config);

      // 更新 TTL - 这只会影响新条目
      await cacheManager.updateOptions({ ttl: 500 });

      // 添加一个新条目来测试新的 TTL
      const newConfig = { ...config, id: 2 };
      await cacheManager.set("new-key", newConfig);
      expect(await cacheManager.get("new-key")).toEqual(newConfig);

      await wait(600); // 等待新的 TTL 过期

      // 新条目应该过期，但旧条目不应该
      expect(await cacheManager.get("new-key")).toBeNull();
      expect(await cacheManager.get(key)).toEqual(config); // 旧条目仍然有效
    });

    it("应该支持更新缓存策略", async () => {
      const config = createTestConfig();
      const key = "test-config";

      await cacheManager.set(key, config);
      expect(await cacheManager.get(key)).toEqual(config);

      // 更新策略为文件缓存
      await cacheManager.updateOptions({
        strategy: CacheStrategy.FILE,
        cacheDir: "./test-cache",
      });

      // 应该仍然能获取到缓存
      expect(await cacheManager.get(key)).toEqual(config);
    });

    it("应该获取当前选项", () => {
      const currentOptions = cacheManager.getOptions();

      expect(currentOptions.strategy).toBe(CacheStrategy.MEMORY);
      expect(currentOptions.ttl).toBe(1000);
      expect(currentOptions.maxSize).toBe(10);
      expect(currentOptions.enabled).toBe(true);
    });
  });

  describe("错误处理", () => {
    it("应该处理提供者错误", async () => {
      const events: any[] = [];
      cacheManager.on("miss", (event) => events.push(event));

      // 通过破坏内部状态来模拟错误
      const originalProvider = (cacheManager as any).provider;
      (cacheManager as any).provider = {
        get: jest.fn().mockRejectedValue(new Error("Provider error"))
      };

      const result = await cacheManager.get("key");

      expect(result).toBeNull();
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe("miss");
      expect(events[0].data.error).toBe("Provider error");

      // 恢复原始状态
      (cacheManager as any).provider = originalProvider;
    });

    it("应该处理禁用状态下的错误", async () => {
      cacheManager.disable();

      const config = createTestConfig();
      const key = "test-config";

      // 在禁用状态下，操作应该不会抛出错误
      await expect(cacheManager.set(key, config)).resolves.not.toThrow();
      await expect(cacheManager.get(key)).resolves.toBeNull();
      await expect(cacheManager.delete(key)).resolves.toBe(false);
      await expect(cacheManager.has(key)).resolves.toBe(false);
    });
  });

  describe("性能测试", () => {
    it("应该高效处理大量操作", async () => {
      // 创建一个更大的缓存用于性能测试
      const performanceCacheManager = new CacheManager({
        ...cacheManager.getOptions(),
        maxSize: 2000, // 增加最大大小
      });

      try {
        const config = createTestConfig();
        const startTime = Date.now();

        // 执行大量设置操作
        for (let i = 0; i < 1000; i++) {
          await performanceCacheManager.set(`key-${i}`, { ...config, id: i });
        }

        // 执行大量获取操作
        for (let i = 0; i < 1000; i++) {
          await performanceCacheManager.get(`key-${i}`);
        }

        const endTime = Date.now();
        const duration = endTime - startTime;

        expect(duration).toBeLessThan(2000); // 应该在2秒内完成

        const stats = await performanceCacheManager.getStats();
        expect(stats.hits).toBe(1000);
        expect(stats.misses).toBe(0);
        expect(stats.hitRate).toBe(1);
      } finally {
        performanceCacheManager.destroy();
      }
    });

    it("应该高效处理并发操作", async () => {
      // 创建一个更大的缓存用于并发测试
      const concurrentCacheManager = new CacheManager({
        ...cacheManager.getOptions(),
        maxSize: 200, // 增加最大大小
      });

      try {
        const config = createTestConfig();
        const operations = [];

        // 并发设置操作
        for (let i = 0; i < 100; i++) {
          operations.push(concurrentCacheManager.set(`key-${i}`, { ...config, id: i }));
        }

        await Promise.all(operations);

        // 并发获取操作
        const getOperations = [];
        for (let i = 0; i < 100; i++) {
          getOperations.push(concurrentCacheManager.get(`key-${i}`));
        }

        const results = await Promise.all(getOperations);

        expect(results).toHaveLength(100);
        results.forEach((result, index) => {
          expect(result).toBeDefined();
          expect(result.id).toBe(index);
        });
      } finally {
        concurrentCacheManager.destroy();
      }
    });
  });

  describe("资源清理", () => {
    it("应该正确清理资源", async () => {
      const config = createTestConfig();
      const key = "test-config";

      await cacheManager.set(key, config);
      expect(await cacheManager.has(key)).toBe(true);

      cacheManager.destroy();

      // 销毁后应该无法访问
      expect(await cacheManager.get(key)).toBeNull();
    });

    it("应该处理重复销毁", () => {
      expect(() => cacheManager.destroy()).not.toThrow();
      expect(() => cacheManager.destroy()).not.toThrow();
    });
  });
});
