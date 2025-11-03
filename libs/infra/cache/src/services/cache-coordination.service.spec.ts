/**
 * @fileoverview CacheCoordinationService 单元测试
 * @description 测试缓存协调服务的功能
 */

import { CacheCoordinationService } from "./cache-coordination.service.js";
import { InMemoryCache } from "../implementations/in-memory-cache.js";
import { CacheConfig } from "../config/cache.config.js";
import type { Logger } from "@hl8/logger";

describe("CacheCoordinationService", () => {
  let service: CacheCoordinationService;
  let cache: InMemoryCache;
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
    service = new CacheCoordinationService(cache, mockLogger);
  });

  afterEach(() => {
    cache.destroy();
  });

  describe("invalidateEntityUpdate", () => {
    it("应该失效实体缓存和查询缓存", async () => {
      // 设置基础设施层缓存
      await cache.set("repo:user:123", { id: "123", name: "Alice" });

      // 设置应用层查询缓存
      await cache.set(
        "query:GetUserProfile:abc123",
        { profile: "data" },
        undefined,
        ["entity:user"],
      );

      // 执行协调失效
      await service.invalidateEntityUpdate("user", "123");

      // 验证基础设施层缓存已失效
      expect(await cache.get("repo:user:123")).toBeUndefined();

      // 验证应用层查询缓存已失效
      expect(await cache.get("query:GetUserProfile:abc123")).toBeUndefined();

      // 验证日志已记录
      expect(mockLogger.debug).toHaveBeenCalledWith(
        "协调失效：实体缓存已失效",
        expect.objectContaining({
          entityKey: "repo:user:123",
        }),
      );
    });

    it("应该支持多租户场景", async () => {
      // 设置多租户缓存
      await cache.set("tenant1:repo:user:123", { id: "123", name: "Alice" });
      await cache.set("tenant2:repo:user:123", { id: "123", name: "Bob" });

      // 失效租户1的缓存
      await service.invalidateEntityUpdate("user", "123", "tenant1");

      // 验证租户1缓存已失效
      expect(await cache.get("tenant1:repo:user:123")).toBeUndefined();

      // 验证租户2缓存仍然存在
      expect(await cache.get("tenant2:repo:user:123")).toBeDefined();
    });

    it("应该在无entityId时失效所有实体类型缓存", async () => {
      // 设置多个同类型实体缓存
      await cache.set("repo:user:123", { id: "123", name: "Alice" });
      await cache.set("repo:user:456", { id: "456", name: "Bob" });
      await cache.set("repo:order:789", { id: "789", amount: 100 });

      // 失效所有user实体缓存
      await service.invalidateEntityUpdate("user");

      // 验证所有user缓存已失效
      expect(await cache.get("repo:user:123")).toBeUndefined();
      expect(await cache.get("repo:user:456")).toBeUndefined();

      // 验证order缓存仍然存在
      expect(await cache.get("repo:order:789")).toBeDefined();
    });

    it("应该失效匹配模式的查询缓存", async () => {
      // 设置不同类型的查询缓存，并添加标签
      await cache.set("query:GetUserProfile:abc", { data: 1 }, undefined, [
        "entity:user",
      ]);
      await cache.set("query:GetUserList:def", { data: 2 }, undefined, [
        "entity:user",
      ]);
      await cache.set("query:GetOrderDetails:ghi", { data: 3 }, undefined, [
        "entity:order",
      ]);

      // 失效user相关查询缓存
      await service.invalidateEntityUpdate("user");

      // 验证user相关查询已失效
      expect(await cache.get("query:GetUserProfile:abc")).toBeUndefined();
      expect(await cache.get("query:GetUserList:def")).toBeUndefined();

      // 验证order查询仍然存在
      expect(await cache.get("query:GetOrderDetails:ghi")).toBeDefined();
    });
  });

  describe("invalidateEntityDelete", () => {
    it("应该调用invalidateEntityUpdate", async () => {
      await cache.set("repo:user:123", { id: "123", name: "Alice" });

      await service.invalidateEntityDelete("user", "123");

      expect(await cache.get("repo:user:123")).toBeUndefined();
    });
  });

  describe("invalidateBatchEntityUpdate", () => {
    it("应该批量失效多个实体缓存", async () => {
      // 设置多个实体缓存
      await cache.set("repo:user:123", { id: "123", name: "Alice" });
      await cache.set("repo:user:456", { id: "456", name: "Bob" });
      await cache.set("repo:user:789", { id: "789", name: "Carol" });

      // 批量失效
      await service.invalidateBatchEntityUpdate("user", ["123", "456"]);

      // 验证已失效
      expect(await cache.get("repo:user:123")).toBeUndefined();
      expect(await cache.get("repo:user:456")).toBeUndefined();

      // 验证未失效的仍然存在
      expect(await cache.get("repo:user:789")).toBeDefined();

      expect(mockLogger.debug).toHaveBeenCalledWith(
        "协调失效：批量实体缓存已失效",
        expect.objectContaining({
          entityIds: ["123", "456"],
        }),
      );
    });
  });
});
