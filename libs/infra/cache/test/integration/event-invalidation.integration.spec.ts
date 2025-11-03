/**
 * @fileoverview 事件失效集成测试
 */

import { InMemoryCache } from "../../src/implementations/in-memory-cache.js";
import { CacheConfig } from "../../src/config/cache.config.js";
import { EventDrivenCacheInvalidation } from "../../src/invalidation/event-driven-invalidation.js";
import type { Logger } from "@hl8/logger";

describe("Event Invalidation Integration", () => {
  let cache: InMemoryCache;
  let invalidation: EventDrivenCacheInvalidation;
  let mockLogger: Logger;

  beforeEach(() => {
    mockLogger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      info: jest.fn(),
    } as unknown as Logger;

    cache = new InMemoryCache(
      {
        defaultTtl: 0,
        maxSize: 100,
        enableStats: true,
        enableEventInvalidation: true,
        cleanupInterval: 1000,
        evictionStrategy: "LRU",
      },
      mockLogger,
    );

    invalidation = new EventDrivenCacheInvalidation(cache, mockLogger);
  });

  afterEach(() => {
    if (cache) {
      cache.destroy();
    }
  });

  it("应该根据事件驱动规则失效缓存", async () => {
    invalidation.registerRule({
      id: "user-update",
      eventType: "UserUpdatedEvent",
      keyGenerator: (event: any) => [`repo:user:${event.data.userId}`],
      enabled: true,
      priority: 100,
    });

    await cache.set("repo:user:123", { id: "123", name: "Alice" });
    await cache.set("repo:user:456", { id: "456", name: "Bob" });

    await invalidation.handleEvent({
      eventType: "UserUpdatedEvent",
      data: { userId: "123" },
    });

    expect(await cache.get("repo:user:123")).toBeUndefined();
    expect(await cache.get("repo:user:456")).toBeDefined();
  });

  it("应该支持标签失效规则", async () => {
    invalidation.registerRule({
      id: "user-tag",
      eventType: "UserBatchUpdateEvent",
      tags: ["entity:user"],
      enabled: true,
      priority: 100,
    });

    await cache.set("key1", { v: 1 }, undefined, ["entity:user"]);
    await cache.set("key2", { v: 2 }, undefined, ["entity:order"]);

    await invalidation.handleEvent({
      eventType: "UserBatchUpdateEvent",
      data: {},
    });

    expect(await cache.get("key1")).toBeUndefined();
    expect(await cache.get("key2")).toBeDefined();
  });

  it("应该支持通配符事件类型", async () => {
    invalidation.registerRule({
      id: "user-all",
      eventType: "user.*",
      tags: ["entity:user"],
      enabled: true,
      priority: 100,
    });

    await cache.set("key1", { v: 1 }, undefined, ["entity:user"]);

    await invalidation.handleEvent({
      eventType: "user.updated",
      data: {},
    });

    expect(await cache.get("key1")).toBeUndefined();
  });
});
