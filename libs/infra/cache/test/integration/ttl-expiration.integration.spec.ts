/**
 * @fileoverview TTL 失效集成测试
 * @description 验证缓存的 TTL 过期机制在端到端场景中正常工作
 */

import { InMemoryCache } from "../../src/implementations/in-memory-cache.js";
import { CacheConfig } from "../../src/config/cache.config.js";
import type { Logger } from "@hl8/logger";

describe("TTL Expiration Integration", () => {
  let cache: InMemoryCache;
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

  afterEach(() => {
    if (cache) {
      cache.destroy();
    }
  });

  describe("默认 TTL 配置", () => {
    it("应该在默认 TTL 过期后自动失效缓存", async () => {
      const config: CacheConfig = {
        defaultTtl: 100, // 100 毫秒
        maxSize: 1000,
        enableStats: true,
        enableEventInvalidation: true,
        cleanupInterval: 50,
        evictionStrategy: "LRU",
      };

      cache = new InMemoryCache(config, mockLogger);

      // 设置缓存
      await cache.set("key1", { data: "value1" });
      await cache.set("key2", { data: "value2" });

      // 立即获取应该成功
      expect(await cache.get("key1")).toEqual({ data: "value1" });
      expect(await cache.get("key2")).toEqual({ data: "value2" });

      // 等待 TTL 过期
      await new Promise((resolve) => setTimeout(resolve, 150));

      // 获取应该返回 undefined
      expect(await cache.get("key1")).toBeUndefined();
      expect(await cache.get("key2")).toBeUndefined();

      // 检查统计信息
      const stats = await cache.getStats();
      expect(stats.hits).toBeGreaterThan(0);
      expect(stats.cleanups).toBeGreaterThan(0);
    });

    it("应该在使用自定义 TTL 覆盖默认 TTL", async () => {
      const config: CacheConfig = {
        defaultTtl: 100, // 默认 100ms
        maxSize: 1000,
        enableStats: true,
        enableEventInvalidation: true,
        cleanupInterval: 50,
        evictionStrategy: "LRU",
      };

      cache = new InMemoryCache(config, mockLogger);

      // 使用默认 TTL（100ms）
      await cache.set("default-key", { data: "default" });

      // 使用自定义 TTL（更短 50ms）
      await cache.set("short-ttl-key", { data: "short" }, 50);

      // 使用自定义 TTL（更长 200ms）
      await cache.set("long-ttl-key", { data: "long" }, 200);

      await new Promise((resolve) => setTimeout(resolve, 120));

      // 默认和短 TTL 都应该失效
      expect(await cache.get("default-key")).toBeUndefined();
      expect(await cache.get("short-ttl-key")).toBeUndefined();
      expect(await cache.get("long-ttl-key")).toEqual({ data: "long" });

      await new Promise((resolve) => setTimeout(resolve, 100));

      // 长 TTL 也应该失效
      expect(await cache.get("long-ttl-key")).toBeUndefined();
    });

    it("应该正确处理 TTL=0 的情况（永不过期）", async () => {
      const config: CacheConfig = {
        defaultTtl: 0, // 永不过期
        maxSize: 1000,
        enableStats: true,
        enableEventInvalidation: true,
        cleanupInterval: 50,
        evictionStrategy: "LRU",
      };

      cache = new InMemoryCache(config, mockLogger);

      await cache.set("never-expire-key", { data: "never" });

      // 等待足够长的时间
      await new Promise((resolve) => setTimeout(resolve, 200));

      // 应该仍然可用
      expect(await cache.get("never-expire-key")).toEqual({ data: "never" });
    });
  });

  describe("清理定时器", () => {
    it("应该定期清理过期缓存", async () => {
      const config: CacheConfig = {
        defaultTtl: 100,
        maxSize: 1000,
        enableStats: true,
        enableEventInvalidation: true,
        cleanupInterval: 50, // 每 50ms 清理一次
        evictionStrategy: "LRU",
      };

      cache = new InMemoryCache(config, mockLogger);

      // 设置多个缓存项
      for (let i = 0; i < 5; i++) {
        await cache.set(`key${i}`, { index: i });
      }

      // 等待 TTL 过期和清理
      await new Promise((resolve) => setTimeout(resolve, 200));

      // 所有项都应该被清理
      for (let i = 0; i < 5; i++) {
        expect(await cache.get(`key${i}`)).toBeUndefined();
      }

      const stats = await cache.getStats();
      expect(stats.cleanups).toBeGreaterThan(0);
      expect(stats.currentSize).toBe(0);
    });

    it("应该在不启用统计时仍然正常工作", async () => {
      const config: CacheConfig = {
        defaultTtl: 100,
        maxSize: 1000,
        enableStats: false, // 禁用统计
        enableEventInvalidation: true,
        cleanupInterval: 50,
        evictionStrategy: "LRU",
      };

      cache = new InMemoryCache(config, mockLogger);

      await cache.set("key1", { data: "value1" });

      await new Promise((resolve) => setTimeout(resolve, 150));

      expect(await cache.get("key1")).toBeUndefined();
    });
  });

  describe("复杂场景", () => {
    it("应该处理混合 TTL 和正常操作的场景", async () => {
      const config: CacheConfig = {
        defaultTtl: 200,
        maxSize: 100,
        enableStats: true,
        enableEventInvalidation: true,
        cleanupInterval: 50,
        evictionStrategy: "LRU",
      };

      cache = new InMemoryCache(config, mockLogger);

      // 设置不同 TTL 的缓存
      await cache.set("short", { value: "short" }, 100);
      await cache.set("medium", { value: "medium" }, 200);
      await cache.set("long", { value: "long" }, 400);

      // 等待第一次过期
      await new Promise((resolve) => setTimeout(resolve, 150));

      expect(await cache.get("short")).toBeUndefined();
      expect(await cache.get("medium")).toBeDefined();
      expect(await cache.get("long")).toBeDefined();

      // 等待第二次过期
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(await cache.get("short")).toBeUndefined();
      expect(await cache.get("medium")).toBeUndefined();
      expect(await cache.get("long")).toBeDefined();

      // 等待第三次过期
      await new Promise((resolve) => setTimeout(resolve, 200));

      expect(await cache.get("short")).toBeUndefined();
      expect(await cache.get("medium")).toBeUndefined();
      expect(await cache.get("long")).toBeUndefined();
    });

    it("应该在过期后仍能正常添加和获取新缓存", async () => {
      const config: CacheConfig = {
        defaultTtl: 100,
        maxSize: 1000,
        enableStats: true,
        enableEventInvalidation: true,
        cleanupInterval: 50,
        evictionStrategy: "LRU",
      };

      cache = new InMemoryCache(config, mockLogger);

      // 设置并等待过期
      await cache.set("old", { value: "old" });
      await new Promise((resolve) => setTimeout(resolve, 150));
      expect(await cache.get("old")).toBeUndefined();

      // 添加新缓存
      await cache.set("new", { value: "new" });
      expect(await cache.get("new")).toEqual({ value: "new" });

      const stats = await cache.getStats();
      expect(stats.hits).toBeGreaterThan(0);
    });

    it("应该正确处理并发过期和访问", async () => {
      const config: CacheConfig = {
        defaultTtl: 100,
        maxSize: 1000,
        enableStats: true,
        enableEventInvalidation: true,
        cleanupInterval: 50,
        evictionStrategy: "LRU",
      };

      cache = new InMemoryCache(config, mockLogger);

      // 设置缓存
      await cache.set("key1", { value: "value1" });
      await cache.set("key2", { value: "value2" });

      // 并发读取
      const promises = [
        cache.get("key1"),
        cache.get("key2"),
        new Promise((resolve) => setTimeout(() => resolve(cache.get("key1")), 20)),
        new Promise((resolve) => setTimeout(() => resolve(cache.get("key2")), 20)),
      ];

      const results = await Promise.all(promises);

      // 前两个应该成功
      expect(results[0]).toEqual({ value: "value1" });
      expect(results[1]).toEqual({ value: "value2" });

      // 等过期后再访问
      await new Promise((resolve) => setTimeout(resolve, 150));

      expect(await cache.get("key1")).toBeUndefined();
      expect(await cache.get("key2")).toBeUndefined();
    });
  });

  describe("与淘汰策略结合", () => {
    it("应该在达到 maxSize 时触发 LRU 淘汰，同时尊重 TTL", async () => {
      const config: CacheConfig = {
        defaultTtl: 1000,
        maxSize: 3,
        enableStats: true,
        enableEventInvalidation: true,
        cleanupInterval: 500,
        evictionStrategy: "LRU",
      };

      cache = new InMemoryCache(config, mockLogger);

      // 填满缓存
      await cache.set("key1", { v: 1 });
      await cache.set("key2", { v: 2 });
      await cache.set("key3", { v: 3 });

      // 等待一小段时间以区分时间戳
      await new Promise((resolve) => setTimeout(resolve, 10));

      // 访问 key1 使其成为最近使用
      await cache.get("key1");

      // 添加新项，应该淘汰最近最少使用的 key2
      await cache.set("key4", { v: 4 });

      // 检查
      expect(await cache.get("key1")).toBeDefined(); // 最近使用
      expect(await cache.get("key2")).toBeUndefined(); // 被淘汰
      expect(await cache.get("key3")).toBeDefined();
      expect(await cache.get("key4")).toBeDefined();

      // 等待 TTL 过期
      await new Promise((resolve) => setTimeout(resolve, 1100));

      // 所有项都应该过期
      expect(await cache.get("key1")).toBeUndefined();
      expect(await cache.get("key3")).toBeUndefined();
      expect(await cache.get("key4")).toBeUndefined();
    });
  });

  describe("元数据准确性", () => {
    it("应该返回准确的元数据信息", async () => {
      const config: CacheConfig = {
        defaultTtl: 200,
        maxSize: 1000,
        enableStats: true,
        enableEventInvalidation: true,
        cleanupInterval: 100,
        evictionStrategy: "LRU",
      };

      cache = new InMemoryCache(config, mockLogger);

      await cache.set("key1", { data: "value1" });
      await cache.set("key2", { data: "value2" }, 500);

      const metadata1 = await cache.getMetadata("key1");
      const metadata2 = await cache.getMetadata("key2");

      expect(metadata1).toBeDefined();
      expect(metadata2).toBeDefined();
      expect(metadata1!.expiresAt).toBeGreaterThan(Date.now());
      expect(metadata2!.expiresAt).toBeGreaterThan(metadata1!.expiresAt);

      // 等待 key1 过期
      await new Promise((resolve) => setTimeout(resolve, 250));

      const expiredMetadata = await cache.getMetadata("key1");
      expect(expiredMetadata).toBeUndefined();
    });
  });
});
