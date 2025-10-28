import { InMemoryCache } from "../cache.impl.js";
import {
  EventBasedCacheInvalidation,
  type CacheInvalidationRule,
} from "./event-based-invalidation.js";
import type { CacheConfig } from "../cache.interface.js";
import type { Logger } from "@hl8/logger";
import { CacheInvalidationStrategy } from "../cache.interface.js";

describe("EventBasedCacheInvalidation", () => {
  let cache: InMemoryCache;
  let invalidation: EventBasedCacheInvalidation;
  let logger: Logger;

  beforeEach(() => {
    logger = {
      debug: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    } as unknown as Logger;

    const config: CacheConfig = {
      defaultTtl: 1000,
      maxSize: 100,
      enableStats: true,
      enableEventInvalidation: true,
      cleanupInterval: 1000,
      enableCompression: false,
    };

    cache = new InMemoryCache(config, logger);
    invalidation = new EventBasedCacheInvalidation(cache, logger);
  });

  afterEach(async () => {
    await cache.destroy();
  });

  it("should add and apply a tag-based rule", async () => {
    const rule: CacheInvalidationRule = {
      id: "r1",
      eventType: "UserUpdated",
      strategy: CacheInvalidationStrategy.TAG_BASED,
      tags: ["user:1"],
      enabled: true,
      priority: 1,
    };

    invalidation.addRule(rule);
    await cache.set("user:1:profile", { id: 1 }, undefined, ["user:1"]);

    await invalidation.handleDomainEvent({
      eventId: "e",
      eventType: "UserUpdated",
      aggregateId: "agg",
      occurredAt: new Date(),
      version: 1,
      data: {},
      metadata: {},
    } as any);

    await expect(cache.get("user:1:profile")).resolves.toBeUndefined();
  });

  it("should manual invalidate by keys", async () => {
    await cache.set("k", 1);
    const ok = await invalidation.manualInvalidation(["k"], []);
    expect(ok).toBe(true);
    await expect(cache.get("k")).resolves.toBeUndefined();
  });
});
