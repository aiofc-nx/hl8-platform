/**
 * @fileoverview 标签失效集成测试
 */

import { InMemoryCache } from "../../src/implementations/in-memory-cache.js";
import { CacheConfig } from "../../src/config/cache.config.js";
import type { Logger } from "@hl8/logger";

describe("Tag Invalidation Integration", () => {
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

  it("应该按单个标签失效相关缓存", async () => {
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

    await cache.set("key1", { v: 1 }, undefined, ["user:123"]);
    await cache.set("key2", { v: 2 }, undefined, ["user:123"]);
    await cache.set("key3", { v: 3 }, undefined, ["order:456"]);

    await cache.invalidateByTags(["user:123"]);

    expect(await cache.get("key1")).toBeUndefined();
    expect(await cache.get("key2")).toBeUndefined();
    expect(await cache.get("key3")).toBeDefined();
  });

  it("应该按多个标签失效相关缓存", async () => {
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

    await cache.set("key1", { v: 1 }, undefined, ["tag1"]);
    await cache.set("key2", { v: 2 }, undefined, ["tag2"]);
    await cache.set("key3", { v: 3 }, undefined, ["tag3"]);

    await cache.invalidateByTags(["tag1", "tag3"]);

    expect(await cache.get("key1")).toBeUndefined();
    expect(await cache.get("key2")).toBeDefined();
    expect(await cache.get("key3")).toBeUndefined();
  });

  it("应该支持多个标签的缓存项", async () => {
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

    await cache.set("key1", { v: 1 }, undefined, ["user", "active"]);
    await cache.set("key2", { v: 2 }, undefined, ["user", "inactive"]);

    await cache.invalidateByTags(["user"]);

    expect(await cache.get("key1")).toBeUndefined();
    expect(await cache.get("key2")).toBeUndefined();
  });

  it("应该仅在匹配标签时失效", async () => {
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

    await cache.set("key1", { v: 1 }, undefined, ["tag1"]);
    await cache.set("key2", { v: 2 });

    await cache.invalidateByTags(["tag1"]);

    expect(await cache.get("key1")).toBeUndefined();
    expect(await cache.get("key2")).toBeDefined();
  });
});
