/**
 * @fileoverview 模式失效集成测试
 */

import { InMemoryCache } from "../../src/implementations/in-memory-cache.js";
import { CacheConfig } from "../../src/config/cache.config.js";
import type { Logger } from "@hl8/logger";

describe("Pattern Invalidation Integration", () => {
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

  it("应该按 glob 模式失效缓存", async () => {
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

    await cache.set("repo:user:1", { v: 1 });
    await cache.set("repo:user:2", { v: 2 });
    await cache.set("repo:order:1", { v: 3 });

    await cache.invalidateByPattern("repo:user:*");

    expect(await cache.get("repo:user:1")).toBeUndefined();
    expect(await cache.get("repo:user:2")).toBeUndefined();
    expect(await cache.get("repo:order:1")).toBeDefined();
  });

  it("应该支持多个模式", async () => {
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

    await cache.set("repo:user:1", { v: 1 });
    await cache.set("query:GetUser:*", { v: 2 });
    await cache.set("cache:temp:1", { v: 3 });

    await cache.invalidateByPattern("repo:user:*");
    await cache.invalidateByPattern("query:GetUser:*");

    expect(await cache.get("repo:user:1")).toBeUndefined();
    expect(await cache.get("query:GetUser:*")).toBeUndefined();
    expect(await cache.get("cache:temp:1")).toBeDefined();
  });
});
