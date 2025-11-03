/**
 * @fileoverview 跨层缓存共享集成测试
 * @description 测试应用层和基础设施层缓存的共享机制
 */

import { InMemoryCache } from "../../src/implementations/in-memory-cache.js";
import { CacheConfig } from "../../src/config/cache.config.js";
import { CacheKeyBuilder } from "../../src/utils/cache-key-builder.js";
import type { Logger } from "@hl8/logger";

/**
 * 模拟应用层缓存使用场景
 */
interface AppLayerCache {
  cache: InMemoryCache;
  keyBuilder: CacheKeyBuilder;
}

/**
 * 模拟基础设施层缓存使用场景
 */
interface InfrastructureLayerCache {
  cache: InMemoryCache;
  keyBuilder: CacheKeyBuilder;
}

describe("Cross-Layer Cache Sharing Integration", () => {
  let appLayerCache: AppLayerCache;
  let infraLayerCache: InfrastructureLayerCache;
  let mockLogger: Logger;

  const createMockLogger = (): Logger => {
    return {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      verbose: jest.fn(),
    } as unknown as Logger;
  };

  beforeEach(() => {
    mockLogger = createMockLogger();
    const config: CacheConfig = {
      defaultTtl: 60000,
      maxSize: 1000,
      enableStats: true,
      enableEventInvalidation: true,
      cleanupInterval: 60000,
      evictionStrategy: "LRU",
    };

    // 共享同一个缓存实例（模拟两层缓存共享）
    const sharedCache = new InMemoryCache(config, mockLogger);

    appLayerCache = {
      cache: sharedCache,
      keyBuilder: new CacheKeyBuilder(),
    };

    infraLayerCache = {
      cache: sharedCache,
      keyBuilder: new CacheKeyBuilder(),
    };
  });

  afterEach(() => {
    appLayerCache.cache.destroy();
  });

  describe("共享缓存实例", () => {
    it("应用层和基础设施层应该共享同一个缓存实例", () => {
      expect(appLayerCache.cache).toBe(infraLayerCache.cache);
    });

    it("在基础设施层设置的缓存应该能在应用层访问", async () => {
      const entityKey = infraLayerCache.keyBuilder.buildEntityKey(
        "user",
        "123",
      );
      await infraLayerCache.cache.set(entityKey, { id: "123", name: "Alice" });

      const cached = await appLayerCache.cache.get(entityKey);
      expect(cached).toBeDefined();
      expect(cached).toEqual({ id: "123", name: "Alice" });
    });

    it("在应用层设置的查询缓存应该能在基础设施层访问（通过统计）", async () => {
      const queryKey = appLayerCache.keyBuilder.buildQueryKey(
        "GetUserProfile",
        { userId: "123" },
      );
      await appLayerCache.cache.set(queryKey, { profile: "data" });

      // 验证缓存已被设置
      const stats = await infraLayerCache.cache.getStats();
      expect(stats.sets).toBe(1);
      expect(stats.currentSize).toBe(1);
    });
  });

  describe("跨层缓存交互", () => {
    it("基础设施层缓存实体后，应用层应能从共享缓存访问", async () => {
      // 基础设施层：缓存用户实体
      const entityKey = infraLayerCache.keyBuilder.buildEntityKey(
        "user",
        "123",
      );
      await infraLayerCache.cache.set(entityKey, { id: "123", name: "Alice" });

      // 应用层：尝试访问同一实体
      const cached = await appLayerCache.cache.get(entityKey);
      expect(cached).toBeDefined();
      expect(cached).toEqual({ id: "123", name: "Alice" });

      // 验证统计信息（共享）
      const stats = await appLayerCache.cache.getStats();
      expect(stats.sets).toBe(1);
      expect(stats.hits).toBe(1);
    });

    it("应用层缓存查询结果后，基础设施层应能从共享缓存访问", async () => {
      // 应用层：缓存查询结果
      const queryKey = appLayerCache.keyBuilder.buildQueryKey("GetUsers", {
        filter: "active",
      });
      await appLayerCache.cache.set(queryKey, [{ id: "1" }, { id: "2" }]);

      // 基础设施层：访问同一查询结果
      const cached = await infraLayerCache.cache.get(queryKey);
      expect(cached).toBeDefined();
      expect(Array.isArray(cached)).toBe(true);
    });

    it("基础设施层失效缓存后，应用层应无法访问", async () => {
      const entityKey = infraLayerCache.keyBuilder.buildEntityKey(
        "user",
        "123",
      );

      // 应用层先设置缓存
      await appLayerCache.cache.set(entityKey, { id: "123", name: "Alice" });

      // 基础设施层失效缓存
      await infraLayerCache.cache.delete(entityKey);

      // 应用层无法访问
      const cached = await appLayerCache.cache.get(entityKey);
      expect(cached).toBeUndefined();

      const stats = await appLayerCache.cache.getStats();
      expect(stats.deletes).toBe(1);
    });

    it("应用层失效缓存后，基础设施层应无法访问", async () => {
      const queryKey = appLayerCache.keyBuilder.buildQueryKey("GetUser", {
        userId: "123",
      });

      // 基础设施层先设置缓存
      await infraLayerCache.cache.set(queryKey, { profile: "data" });

      // 应用层失效缓存
      await appLayerCache.cache.delete(queryKey);

      // 基础设施层无法访问
      const cached = await infraLayerCache.cache.get(queryKey);
      expect(cached).toBeUndefined();
    });
  });

  describe("缓存键命名空间", () => {
    it("实体缓存键和应用层查询键不应冲突", async () => {
      const entityKey = infraLayerCache.keyBuilder.buildEntityKey(
        "user",
        "123",
      );
      const queryKey = appLayerCache.keyBuilder.buildQueryKey("GetUser", {
        id: "123",
      });

      // 两个键应该不同
      expect(entityKey).not.toBe(queryKey);
      expect(entityKey.startsWith("repo:")).toBe(true);
      expect(queryKey.startsWith("query:")).toBe(true);

      // 可以同时缓存
      await infraLayerCache.cache.set(entityKey, { id: "123", name: "Alice" });
      await appLayerCache.cache.set(queryKey, { profile: "data" });

      // 两者都应该能独立访问
      expect(await appLayerCache.cache.get(entityKey)).toBeDefined();
      expect(await appLayerCache.cache.get(queryKey)).toBeDefined();
    });
  });

  describe("多租户场景", () => {
    it("不同租户的缓存应该隔离", async () => {
      const tenant1Key = infraLayerCache.keyBuilder.buildEntityKey(
        "user",
        "123",
        "tenant1",
      );
      const tenant2Key = infraLayerCache.keyBuilder.buildEntityKey(
        "user",
        "123",
        "tenant2",
      );

      await infraLayerCache.cache.set(tenant1Key, { id: "123", tenant: "1" });
      await infraLayerCache.cache.set(tenant2Key, { id: "123", tenant: "2" });

      const t1Data = await appLayerCache.cache.get(tenant1Key);
      const t2Data = await appLayerCache.cache.get(tenant2Key);

      expect(t1Data).toEqual({ id: "123", tenant: "1" });
      expect(t2Data).toEqual({ id: "123", tenant: "2" });
    });

    it("一个租户失效缓存不应该影响其他租户", async () => {
      const tenant1Key = infraLayerCache.keyBuilder.buildEntityKey(
        "user",
        "123",
        "tenant1",
      );
      const tenant2Key = infraLayerCache.keyBuilder.buildEntityKey(
        "user",
        "123",
        "tenant2",
      );

      await infraLayerCache.cache.set(tenant1Key, { data: 1 });
      await infraLayerCache.cache.set(tenant2Key, { data: 2 });

      // 失效租户1的缓存
      await appLayerCache.cache.delete(tenant1Key);

      expect(await appLayerCache.cache.get(tenant1Key)).toBeUndefined();
      expect(await appLayerCache.cache.get(tenant2Key)).toBeDefined();
    });
  });
});
