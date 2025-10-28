import { InMemoryCache } from "./cache.impl.js";
import type { CacheConfig } from "./cache.interface.js";
import type { Logger } from "@hl8/logger";

describe("InMemoryCache", () => {
  let cache: InMemoryCache;
  let logger: Logger;
  let config: CacheConfig;

  beforeEach(() => {
    logger = {
      debug: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    } as unknown as Logger;

    config = {
      defaultTtl: 50,
      maxSize: 100,
      enableStats: true,
      enableEventInvalidation: true,
      cleanupInterval: 20,
      enableCompression: false,
    };

    cache = new InMemoryCache(config, logger);
  });

  afterEach(async () => {
    await cache.destroy();
  });

  it("should set and get a value", async () => {
    await cache.set("k1", 123);
    await expect(cache.get<number>("k1")).resolves.toBe(123);
  });

  it("should expire values after ttl", async () => {
    await cache.set("k2", "v", 10);
    await new Promise((r) => setTimeout(r, 25));
    await expect(cache.get("k2")).resolves.toBeUndefined();
  });

  it("should delete and report has=false", async () => {
    await cache.set("k3", true);
    await cache.delete("k3");
    await expect(cache.has("k3")).resolves.toBe(false);
  });

  it("should support tag invalidation", async () => {
    await cache.set("t:1", 1, undefined, ["A"]);
    await cache.set("t:2", 2, undefined, ["A", "B"]);
    await cache.invalidateByTags(["A"]);
    await expect(cache.get("t:1")).resolves.toBeUndefined();
    await expect(cache.get("t:2")).resolves.toBeUndefined();
  });

  it("should cleanup expired entries via timer", async () => {
    await cache.set("auto", "x", 10);
    await new Promise((r) => setTimeout(r, 60));
    // allow cleanup tick
    await new Promise((r) => setTimeout(r, config.cleanupInterval + 10));
    await expect(cache.get("auto")).resolves.toBeUndefined();
  });
});
