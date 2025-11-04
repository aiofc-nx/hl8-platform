/**
 * @fileoverview 事件驱动缓存失效单元测试
 */

import { EventDrivenCacheInvalidation } from "./event-driven-invalidation.js";
import { InMemoryCache } from "../implementations/in-memory-cache.js";
import { CacheConfig } from "../config/cache.config.js";
import type { Logger } from "@hl8/logger";
import type {
  CacheInvalidationRule,
  GenericDomainEvent,
} from "./cache-invalidation-rule.interface.js";

describe("EventDrivenCacheInvalidation", () => {
  let invalidation: EventDrivenCacheInvalidation;
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
      defaultTtl: 1000,
      maxSize: 100,
      enableStats: true,
      enableEventInvalidation: true,
      cleanupInterval: 5000,
      evictionStrategy: "LRU",
    };

    cache = new InMemoryCache(config, mockLogger);
    invalidation = new EventDrivenCacheInvalidation(cache, mockLogger);
  });

  afterEach(() => {
    cache.destroy();
  });

  describe("registerRule and registerRules", () => {
    it("应该成功注册单个规则", () => {
      const rule: CacheInvalidationRule = {
        id: "rule-1",
        eventType: "TestEvent",
        enabled: true,
        priority: 100,
      };

      const result = invalidation.registerRule(rule);

      expect(result).toBe(true);
      expect(invalidation.getRegistry().getRule("rule-1")).toEqual(rule);
    });

    it("应该批量注册规则", () => {
      const rules: CacheInvalidationRule[] = [
        {
          id: "rule-1",
          eventType: "Event1",
          enabled: true,
          priority: 100,
        },
        {
          id: "rule-2",
          eventType: "Event2",
          enabled: true,
          priority: 100,
        },
      ];

      invalidation.registerRules(rules);

      expect(invalidation.getRegistry().size()).toBe(2);
    });
  });

  describe("unregisterRule", () => {
    it("应该成功取消注册规则", () => {
      const rule: CacheInvalidationRule = {
        id: "rule-1",
        eventType: "TestEvent",
        enabled: true,
        priority: 100,
      };

      invalidation.registerRule(rule);
      const result = invalidation.unregisterRule("rule-1");

      expect(result).toBe(true);
      expect(invalidation.getRegistry().getRule("rule-1")).toBeUndefined();
    });
  });

  describe("handleEvent", () => {
    it("应该在无匹配规则时返回空结果", async () => {
      const event: GenericDomainEvent = {
        eventType: "TestEvent",
        data: {},
      };

      const results = await invalidation.handleEvent(event);

      expect(results).toHaveLength(0);
    });

    it("应该按规则失效指定键", async () => {
      const rule: CacheInvalidationRule = {
        id: "rule-1",
        eventType: "UserUpdatedEvent",
        keyGenerator: (event: GenericDomainEvent) => [
          `repo:user:${(event.data as any).userId}`,
        ],
        enabled: true,
        priority: 100,
      };

      invalidation.registerRule(rule);

      // 设置缓存
      await cache.set("repo:user:123", { id: "123", name: "Alice" });
      await cache.set("repo:user:456", { id: "456", name: "Bob" });

      const event: GenericDomainEvent = {
        eventType: "UserUpdatedEvent",
        data: { userId: "123" },
      };

      const results = await invalidation.handleEvent(event);

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(true);
      expect(results[0].keysInvalidated).toBe(1);

      // 验证缓存已失效
      expect(await cache.get("repo:user:123")).toBeUndefined();
      expect(await cache.get("repo:user:456")).toBeDefined();
    });

    it("应该按标签失效缓存", async () => {
      const rule: CacheInvalidationRule = {
        id: "rule-1",
        eventType: "UserBatchUpdateEvent",
        tags: ["entity:user"],
        enabled: true,
        priority: 100,
      };

      invalidation.registerRule(rule);

      // 设置带标签的缓存
      await cache.set("cache1", { data: "user data 1" }, undefined, [
        "entity:user",
      ]);
      await cache.set("cache2", { data: "user data 2" }, undefined, [
        "entity:user",
      ]);
      await cache.set("cache3", { data: "order data" }, undefined, [
        "entity:order",
      ]);

      const event: GenericDomainEvent = {
        eventType: "UserBatchUpdateEvent",
        data: {},
      };

      const results = await invalidation.handleEvent(event);

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(true);
      expect(results[0].tagsInvalidated).toBe(1);

      // 验证标签失效
      expect(await cache.get("cache1")).toBeUndefined();
      expect(await cache.get("cache2")).toBeUndefined();
      expect(await cache.get("cache3")).toBeDefined();
    });

    it("应该按模式失效缓存", async () => {
      const rule: CacheInvalidationRule = {
        id: "rule-1",
        eventType: "UserClearEvent",
        patterns: ["repo:user:*"],
        enabled: true,
        priority: 100,
      };

      invalidation.registerRule(rule);

      // 设置缓存
      await cache.set("repo:user:123", { id: "123" });
      await cache.set("repo:user:456", { id: "456" });
      await cache.set("repo:order:789", { id: "789" });

      const event: GenericDomainEvent = {
        eventType: "UserClearEvent",
        data: {},
      };

      const results = await invalidation.handleEvent(event);

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(true);
      expect(results[0].patternsMatched).toBe(1);

      // 验证模式失效
      expect(await cache.get("repo:user:123")).toBeUndefined();
      expect(await cache.get("repo:user:456")).toBeUndefined();
      expect(await cache.get("repo:order:789")).toBeDefined();
    });

    it("应该组合多种失效策略", async () => {
      const rule: CacheInvalidationRule = {
        id: "rule-1",
        eventType: "ComprehensiveEvent",
        keyGenerator: (event: GenericDomainEvent) => [
          `repo:user:${(event.data as any).userId}`,
        ],
        tags: ["entity:user"],
        patterns: ["query:GetUser:*"],
        enabled: true,
        priority: 100,
      };

      invalidation.registerRule(rule);

      // 设置各种缓存
      await cache.set("repo:user:123", { id: "123" });
      await cache.set("cache-tagged", { data: "tagged" }, undefined, [
        "entity:user",
      ]);
      await cache.set("query:GetUser:abc", { result: "data" });
      await cache.set("query:GetOrder:def", { result: "order" });

      const event: GenericDomainEvent = {
        eventType: "ComprehensiveEvent",
        data: { userId: "123" },
      };

      const results = await invalidation.handleEvent(event);

      expect(results).toHaveLength(1);
      expect(results[0].keysInvalidated).toBe(1);
      expect(results[0].tagsInvalidated).toBe(1);
      expect(results[0].patternsMatched).toBe(1);

      // 验证所有缓存都已失效
      expect(await cache.get("repo:user:123")).toBeUndefined();
      expect(await cache.get("cache-tagged")).toBeUndefined();
      expect(await cache.get("query:GetUser:abc")).toBeUndefined();
      expect(await cache.get("query:GetOrder:def")).toBeDefined();
    });

    it("应该检查条件", async () => {
      const rule: CacheInvalidationRule = {
        id: "rule-conditional",
        eventType: "TestEvent",
        keyGenerator: (event: GenericDomainEvent) => [
          `key:${(event.data as any).id}`,
        ],
        condition: (event: GenericDomainEvent) =>
          (event.data as any).shouldInvalidate === true,
        enabled: true,
        priority: 100,
      };

      invalidation.registerRule(rule);

      await cache.set("key:123", { id: "123" });

      const event1: GenericDomainEvent = {
        eventType: "TestEvent",
        data: { id: "123", shouldInvalidate: true },
      };
      const event2: GenericDomainEvent = {
        eventType: "TestEvent",
        data: { id: "123", shouldInvalidate: false },
      };

      const results1 = await invalidation.handleEvent(event1);
      expect(results1).toHaveLength(1);
      expect(await cache.get("key:123")).toBeUndefined();

      await cache.set("key:123", { id: "123" });

      const results2 = await invalidation.handleEvent(event2);
      expect(results2).toHaveLength(0);
      expect(await cache.get("key:123")).toBeDefined();
    });

    it("应该处理规则执行错误", async () => {
      const rule: CacheInvalidationRule = {
        id: "rule-error",
        eventType: "TestEvent",
        keyGenerator: () => {
          throw new Error("Generator error");
        },
        enabled: true,
        priority: 100,
      };

      invalidation.registerRule(rule);

      const event: GenericDomainEvent = {
        eventType: "TestEvent",
        data: {},
      };

      const results = await invalidation.handleEvent(event);

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(false);
      expect(results[0].error).toBeDefined();
      expect(results[0].error).toContain("Generator error");
    });
  });

  describe("handleEvents", () => {
    it("应该批量处理事件", async () => {
      const rule: CacheInvalidationRule = {
        id: "rule-1",
        eventType: "TestEvent",
        keyGenerator: (event: GenericDomainEvent) => [
          `key:${(event.data as any).id}`,
        ],
        enabled: true,
        priority: 100,
      };

      invalidation.registerRule(rule);

      await cache.set("key:1", { id: "1" });
      await cache.set("key:2", { id: "2" });

      const events: GenericDomainEvent[] = [
        { eventType: "TestEvent", data: { id: "1" } },
        { eventType: "TestEvent", data: { id: "2" } },
      ];

      const results = await invalidation.handleEvents(events);

      expect(results).toHaveLength(2);
      expect(results.every((r) => r.success)).toBe(true);
      expect(await cache.get("key:1")).toBeUndefined();
      expect(await cache.get("key:2")).toBeUndefined();
    });
  });

  describe("getStats", () => {
    it("应该返回正确的统计信息", () => {
      invalidation.registerRules([
        {
          id: "rule-1",
          eventType: "Event1",
          enabled: true,
          priority: 100,
        },
        {
          id: "rule-2",
          eventType: "Event2",
          enabled: true,
          priority: 100,
        },
        {
          id: "rule-3",
          eventType: "Event3",
          enabled: false,
          priority: 100,
        },
      ]);

      const stats = invalidation.getStats();

      expect(stats.totalRules).toBe(3);
      expect(stats.enabledRules).toBe(2);
      expect(stats.disabledRules).toBe(1);
    });
  });
});
