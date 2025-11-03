import { CacheInvalidationService } from "./cache-invalidation.service.js";

describe("CacheInvalidationService", () => {
  const cache = {
    invalidateByTags: jest.fn().mockResolvedValue(undefined),
    invalidateByPattern: jest.fn().mockResolvedValue(undefined),
  } as unknown as {
    invalidateByTags: (tags: string[]) => Promise<void>;
    invalidateByPattern: (pattern: string) => Promise<void>;
  };

  const tenant = { getTenantId: () => "tX" } as { getTenantId: () => string };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("invalidateEntity should build global+tenant tags", async () => {
    const svc = new CacheInvalidationService(cache as any, tenant as any);
    await svc.invalidateEntity("user");
    expect(cache.invalidateByTags).toHaveBeenCalledWith([
      "entity:user",
      "tX:entity:user",
    ]);
  });

  it("invalidateEntityId should build global+tenant id tags", async () => {
    const svc = new CacheInvalidationService(cache as any, tenant as any);
    await svc.invalidateEntityId("user", "u1");
    expect(cache.invalidateByTags).toHaveBeenCalledWith([
      "entity:user:id:u1",
      "tX:entity:user:id:u1",
    ]);
  });

  it("invalidateByPattern should forward pattern", async () => {
    const svc = new CacheInvalidationService(cache as any, tenant as any);
    await svc.invalidateByPattern("tX:repo:user:*");
    expect(cache.invalidateByPattern).toHaveBeenCalledWith("tX:repo:user:*");
  });
});
