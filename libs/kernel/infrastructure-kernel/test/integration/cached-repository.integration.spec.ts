import { CachedRepository } from "../../src/cache/cached-repository.js";
import type { IRepository } from "@hl8/domain-kernel";
import type { EntityId } from "@hl8/domain-kernel";
import { InMemoryCache } from "@hl8/cache";
import type { CacheConfig } from "@hl8/cache";
import type { Logger } from "@hl8/logger";

interface User {
  id: string;
  name: string;
}

class InMemoryUserRepo implements IRepository<User> {
  private store = new Map<string, User>();
  public reads = 0;

  async findById(id: EntityId): Promise<User | null> {
    this.reads += 1;
    const u = this.store.get(String(id.value));
    return u ?? null;
  }

  async save(entity: User): Promise<void> {
    this.store.set(entity.id, entity);
  }

  async delete(id: EntityId): Promise<void> {
    this.store.delete(String(id.value));
  }

  async exists(id: EntityId): Promise<boolean> {
    return this.store.has(String(id.value));
  }
}

const logger: Logger = {
  // 仅实现测试需要的方法
  log: () => undefined,
  error: () => undefined,
  warn: () => undefined,
  debug: () => undefined,
  verbose: () => undefined,
} as unknown as Logger;

const config: CacheConfig = {
  defaultTtl: 60_000,
  maxSize: 1_000,
  enableStats: true,
  enableEventInvalidation: true,
  cleanupInterval: 60_000,
  evictionStrategy: "LRU",
};

function eid(value: string): EntityId {
  return { value } as unknown as EntityId;
}

describe("CachedRepository integration", () => {
  it("should cache findById result and avoid second inner read", async () => {
    const inner = new InMemoryUserRepo();
    const cache = new InMemoryCache(config, logger);
    const tenantContext = { getTenantId: () => undefined };
    const repo = new CachedRepository<User>(
      inner,
      "user",
      cache,
      tenantContext,
      logger,
      { defaultTtlMs: 5_000 },
    );

    await inner.save({ id: "u1", name: "Alice" });

    const v1 = await repo.findById(eid("u1"));
    const v2 = await repo.findById(eid("u1"));

    expect(v1?.name).toBe("Alice");
    expect(v2?.name).toBe("Alice");
    expect(inner.reads).toBe(1);
  });

  it("should invalidate by delete and miss afterwards", async () => {
    const inner = new InMemoryUserRepo();
    const cache = new InMemoryCache(config, logger);
    const tenantContext = { getTenantId: () => undefined };
    const repo = new CachedRepository<User>(
      inner,
      "user",
      cache,
      tenantContext,
      logger,
      { defaultTtlMs: 5_000 },
    );

    await inner.save({ id: "u2", name: "Bob" });

    await repo.findById(eid("u2")); // 缓存
    await repo.delete(eid("u2")); // 失效

    const v = await repo.findById(eid("u2"));
    expect(v).toBeNull();
  });

  it("should isolate cache by tenant id", async () => {
    const inner = new InMemoryUserRepo();
    const cache = new InMemoryCache(config, logger);
    const tenantA = { getTenantId: () => "tA" };
    const tenantB = { getTenantId: () => "tB" };

    const repoA = new CachedRepository<User>(
      inner,
      "user",
      cache,
      tenantA,
      logger,
    );
    const repoB = new CachedRepository<User>(
      inner,
      "user",
      cache,
      tenantB,
      logger,
    );

    await inner.save({ id: "u3", name: "Carol" });

    // A 第一次命中存储，之后对 A 再查走缓存
    const a1 = await repoA.findById(eid("u3"));
    const a2 = await repoA.findById(eid("u3"));

    // B 第一次应该也命中存储（不同租户键隔离，不共享 A 的缓存）
    const b1 = await repoB.findById(eid("u3"));

    expect(a1?.name).toBe("Carol");
    expect(a2?.name).toBe("Carol");
    expect(b1?.name).toBe("Carol");
    // inner.reads 应为 2：A 首查一次、B 首查一次
    expect(inner.reads).toBe(2);
  });

  it("should cache exists and invalidate on save", async () => {
    const inner = new InMemoryUserRepo();
    const cache = new InMemoryCache(config, logger);
    const tenantContext = { getTenantId: () => undefined };
    const repo = new CachedRepository<User>(
      inner,
      "user",
      cache,
      tenantContext,
      logger,
      { defaultTtlMs: 5_000 },
    );

    // 初始不存在，exists 首次查询后缓存 false
    const e1 = await repo.exists(eid("u4"));
    const e2 = await repo.exists(eid("u4"));
    expect(e1).toBe(false);
    expect(e2).toBe(false);

    // 保存后应通过标签失效，再查 exists 返回 true
    await repo.save({ id: "u4", name: "Dave" });
    const e3 = await repo.exists(eid("u4"));
    expect(e3).toBe(true);
  });

  it("should invalidate by pattern externally and then miss", async () => {
    const inner = new InMemoryUserRepo();
    const cache = new InMemoryCache(config, logger);
    const tenantContext = { getTenantId: () => "tP" };
    const repo = new CachedRepository<User>(
      inner,
      "user",
      cache,
      tenantContext,
      logger,
      { defaultTtlMs: 60_000 },
    );

    await inner.save({ id: "u5", name: "Eve" });

    // 第一次查询写入缓存
    await repo.findById(eid("u5"));

    // 外部通过模式失效该租户下 user 实体缓存
    await cache.invalidateByPattern("tP:repo:user:*");

    // 再次查询应 miss 并触发 inner 读取
    const after = await repo.findById(eid("u5"));
    expect(after?.name).toBe("Eve");
  });

  it("should expire by ttl and refresh from inner store", async () => {
    const inner = new InMemoryUserRepo();
    const cache = new InMemoryCache({ ...config, cleanupInterval: 5 }, logger);
    const tenantContext = { getTenantId: () => undefined };
    const repo = new CachedRepository<User>(
      inner,
      "user",
      cache,
      tenantContext,
      logger,
      { defaultTtlMs: 20 },
    );

    await inner.save({ id: "u6", name: "Frank" });

    const v1 = await repo.findById(eid("u6"));
    expect(v1?.name).toBe("Frank");

    // 等待超过 TTL 并触发清理轮询
    await new Promise((r) => setTimeout(r, 40));

    // 过期后应再次触发存储访问
    const beforeReads = inner.reads;
    const v2 = await repo.findById(eid("u6"));
    expect(v2?.name).toBe("Frank");
    expect(inner.reads).toBeGreaterThan(beforeReads);
  });
});
