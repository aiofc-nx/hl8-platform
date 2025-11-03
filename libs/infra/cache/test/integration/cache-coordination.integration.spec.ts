/**
 * @fileoverview 缓存协调失效集成测试
 * @description 测试应用层和基础设施层缓存的协同失效机制
 */

import { InMemoryCache } from "../../src/implementations/in-memory-cache.js";
import { CacheConfig } from "../../src/config/cache.config.js";
import { CacheCoordinationService } from "../../src/services/cache-coordination.service.js";
import { CacheKeyBuilder } from "../../src/utils/cache-key-builder.js";
import type { Logger } from "@hl8/logger";

describe("Cache Coordination Invalidation Integration", () => {
  let cache: InMemoryCache;
  let coordinationService: CacheCoordinationService;
  let keyBuilder: CacheKeyBuilder;
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
    cache = new InMemoryCache(config, mockLogger);
    coordinationService = new CacheCoordinationService(cache, mockLogger);
    keyBuilder = new CacheKeyBuilder();
  });

  afterEach(() => {
    cache.destroy();
  });

  describe("协调失效：实体更新场景", () => {
    it("应该失效基础设施层的实体缓存和应用层的查询缓存", async () => {
      const entityKey = keyBuilder.buildEntityKey("user", "123");
      const queryKey1 = keyBuilder.buildQueryKey("GetUserProfile", {
        userId: "123",
      });
      const queryKey2 = keyBuilder.buildQueryKey("GetUserList", {
        filter: "active",
      });

      // 设置基础设施层实体缓存
      await cache.set(entityKey, { id: "123", name: "Alice" });

      // 设置应用层查询缓存（添加标签以便协调失效）
      await cache.set(queryKey1, { profile: "data" }, undefined, [
        "entity:user",
      ]);
      await cache.set(queryKey2, [{ id: "1" }, { id: "2" }], undefined, [
        "entity:user",
      ]);

      // 执行协调失效
      await coordinationService.invalidateEntityUpdate("user", "123");

      // 验证基础设施层缓存已失效
      expect(await cache.get(entityKey)).toBeUndefined();

      // 验证应用层查询缓存已失效
      expect(await cache.get(queryKey1)).toBeUndefined();
      expect(await cache.get(queryKey2)).toBeUndefined();
    });

    it("应该只失效匹配的查询缓存，不影响其他实体", async () => {
      const userEntityKey = keyBuilder.buildEntityKey("user", "123");
      const orderEntityKey = keyBuilder.buildEntityKey("order", "456");
      const userQueryKey = keyBuilder.buildQueryKey("GetUserProfile", {
        userId: "123",
      });
      const orderQueryKey = keyBuilder.buildQueryKey("GetOrderDetails", {
        orderId: "456",
      });

      // 设置不同类型的缓存
      await cache.set(userEntityKey, { id: "123", name: "Alice" });
      await cache.set(orderEntityKey, { id: "456", amount: 100 });
      await cache.set(userQueryKey, { profile: "data" }, undefined, [
        "entity:user",
      ]);
      await cache.set(orderQueryKey, { details: "data" }, undefined, [
        "entity:order",
      ]);

      // 失效user相关缓存
      await coordinationService.invalidateEntityUpdate("user", "123");

      // 验证user缓存已失效
      expect(await cache.get(userEntityKey)).toBeUndefined();
      expect(await cache.get(userQueryKey)).toBeUndefined();

      // 验证order缓存仍然存在
      expect(await cache.get(orderEntityKey)).toBeDefined();
      expect(await cache.get(orderQueryKey)).toBeDefined();
    });
  });

  describe("协调失效：无entityId的全局失效", () => {
    it("应该失效该实体类型的所有缓存", async () => {
      const user1Key = keyBuilder.buildEntityKey("user", "123");
      const user2Key = keyBuilder.buildEntityKey("user", "456");
      const userQueryKey = keyBuilder.buildQueryKey("GetUserList", {});

      await cache.set(user1Key, { id: "123", name: "Alice" });
      await cache.set(user2Key, { id: "456", name: "Bob" });
      await cache.set(userQueryKey, [], undefined, ["entity:user"]);

      // 全局失效user实体
      await coordinationService.invalidateEntityUpdate("user");

      expect(await cache.get(user1Key)).toBeUndefined();
      expect(await cache.get(user2Key)).toBeUndefined();
      expect(await cache.get(userQueryKey)).toBeUndefined();
    });
  });

  describe("协调失效：实体删除场景", () => {
    it("应该调用invalidateEntityUpdate", async () => {
      const entityKey = keyBuilder.buildEntityKey("user", "123");
      const queryKey = keyBuilder.buildQueryKey("GetUserProfile", {
        userId: "123",
      });

      await cache.set(entityKey, { id: "123", name: "Alice" });
      await cache.set(queryKey, { profile: "data" }, undefined, [
        "entity:user",
      ]);

      await coordinationService.invalidateEntityDelete("user", "123");

      expect(await cache.get(entityKey)).toBeUndefined();
      expect(await cache.get(queryKey)).toBeUndefined();
    });
  });

  describe("协调失效：批量更新场景", () => {
    it("应该批量失效多个实体的缓存", async () => {
      const user1Key = keyBuilder.buildEntityKey("user", "123");
      const user2Key = keyBuilder.buildEntityKey("user", "456");
      const user3Key = keyBuilder.buildEntityKey("user", "789");
      const queryKey = keyBuilder.buildQueryKey("GetUserList", {});

      await cache.set(user1Key, { id: "123", name: "Alice" });
      await cache.set(user2Key, { id: "456", name: "Bob" });
      await cache.set(user3Key, { id: "789", name: "Carol" });
      await cache.set(queryKey, [], undefined, ["entity:user"]);

      // 批量失效前两个用户
      await coordinationService.invalidateBatchEntityUpdate("user", [
        "123",
        "456",
      ]);

      expect(await cache.get(user1Key)).toBeUndefined();
      expect(await cache.get(user2Key)).toBeUndefined();
      expect(await cache.get(user3Key)).toBeDefined();
      expect(await cache.get(queryKey)).toBeUndefined();
    });
  });

  describe("协调失效：多租户场景", () => {
    it("应该正确隔离不同租户的缓存", async () => {
      const tenant1Key = keyBuilder.buildEntityKey("user", "123", "tenant1");
      const tenant2Key = keyBuilder.buildEntityKey("user", "123", "tenant2");
      const tenant1QueryKey = keyBuilder.buildQueryKey("GetUserProfile", {
        userId: "123",
      });

      await cache.set(tenant1Key, { id: "123", tenant: "1" });
      await cache.set(tenant2Key, { id: "123", tenant: "2" });
      await cache.set(tenant1QueryKey, { profile: "data" }, undefined, [
        "entity:user",
      ]);

      // 失效租户1的缓存
      await coordinationService.invalidateEntityUpdate(
        "user",
        "123",
        "tenant1",
      );

      expect(await cache.get(tenant1Key)).toBeUndefined();
      expect(await cache.get(tenant2Key)).toBeDefined();
    });
  });

  describe("协调失效：复杂场景", () => {
    it("应该处理混合场景（实体和查询缓存并存）", async () => {
      const user1Key = keyBuilder.buildEntityKey("user", "1");
      const user2Key = keyBuilder.buildEntityKey("user", "2");
      const queryKey1 = keyBuilder.buildQueryKey("GetUserProfile", {
        userId: "1",
      });
      const queryKey2 = keyBuilder.buildQueryKey("GetUserList", {});

      // 设置各种缓存
      await cache.set(user1Key, { id: "1", name: "Alice" });
      await cache.set(user2Key, { id: "2", name: "Bob" });
      await cache.set(queryKey1, { profile: "Alice" }, undefined, [
        "entity:user",
      ]);
      await cache.set(queryKey2, [{ id: "1" }, { id: "2" }], undefined, [
        "entity:user",
      ]);

      // 失效用户1的缓存（实体缓存应失效，查询缓存也应失效）
      await coordinationService.invalidateEntityUpdate("user", "1");

      expect(await cache.get(user1Key)).toBeUndefined();
      expect(await cache.get(user2Key)).toBeDefined();
      expect(await cache.get(queryKey1)).toBeUndefined();
      expect(await cache.get(queryKey2)).toBeUndefined();
    });

    it("应该正确处理缓存统计信息", async () => {
      const entityKey = keyBuilder.buildEntityKey("user", "123");
      const queryKey = keyBuilder.buildQueryKey("GetUserProfile", {
        userId: "123",
      });

      await cache.set(entityKey, { id: "123" });
      await cache.set(queryKey, { profile: "data" }, undefined, [
        "entity:user",
      ]);

      const beforeStats = await cache.getStats();
      const beforeDeletes = beforeStats.deletes;

      await coordinationService.invalidateEntityUpdate("user", "123");

      const afterStats = await cache.getStats();
      expect(afterStats.deletes).toBeGreaterThan(beforeDeletes);
      expect(afterStats.currentSize).toBeLessThan(beforeStats.currentSize);
    });
  });
});
