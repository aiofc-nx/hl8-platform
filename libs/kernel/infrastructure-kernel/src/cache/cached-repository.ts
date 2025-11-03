/**
 * @fileoverview CachedRepository
 * @description 使用 @hl8/cache 为基础设施层仓储增加查询缓存能力。
 */

import type { IRepository } from "@hl8/domain-kernel";
import type { EntityId } from "@hl8/domain-kernel";
import type { ICache, TenantContextProvider } from "@hl8/cache";
import { CacheKeyBuilder } from "@hl8/cache";
import type { RepositoryCacheOptions } from "./repository-cache.interface.js";
import { buildEntityTypeTags, buildEntityIdTags } from "./cache-tag.util.js";
import type { Logger } from "@hl8/logger";

/**
 * @public
 * @description 为仓储提供查询缓存的包装类；缓存 findById/exists，变更操作触发失效。
 */
export class CachedRepository<T> implements IRepository<T> {
  private readonly enabled: boolean;
  private readonly defaultTtlMs?: number;
  private readonly keyPrefix?: string;
  private readonly keyBuilder = new CacheKeyBuilder();

  constructor(
    private readonly inner: IRepository<T>,
    private readonly entityName: string,
    private readonly cache: ICache,
    private readonly tenantContext: TenantContextProvider,
    private readonly logger?: Logger,
    options?: RepositoryCacheOptions,
  ) {
    this.enabled = options?.enabled ?? true;
    this.defaultTtlMs = options?.defaultTtlMs;
    this.keyPrefix = options?.keyPrefix;
  }

  async findById(id: EntityId): Promise<T | null> {
    if (!this.enabled) return this.inner.findById(id);

    const tenantId = this.tenantContext.getTenantId?.();
    const baseKey = this.keyBuilder.buildEntityKey(
      this.entityName,
      String(id.value),
      tenantId,
    );
    const cacheKey = this.keyPrefix ? `${this.keyPrefix}:${baseKey}` : baseKey;

    const cached = await this.cache.get<T | null>(cacheKey);
    if (cached !== undefined) {
      this.logger?.debug("缓存命中", {
        entity: this.entityName,
        id: String(id.value),
        tenantId,
        key: cacheKey,
      });
      return cached;
    }

    const value = await this.inner.findById(id);
    if (value !== null) {
      const tags = [
        ...buildEntityTypeTags(this.entityName, tenantId),
        ...buildEntityIdTags(this.entityName, String(id.value), tenantId),
      ];
      await this.cache.set(cacheKey, value, this.defaultTtlMs, tags);
      this.logger?.debug("缓存写入", {
        entity: this.entityName,
        id: String(id.value),
        tenantId,
        key: cacheKey,
        ttl: this.defaultTtlMs,
        tags,
      });
    } else {
      // 对 null 不缓存，避免穿透造成脏空缓存
      this.logger?.debug("缓存未命中（null值不缓存）", {
        entity: this.entityName,
        id: String(id.value),
        tenantId,
      });
    }
    return value;
  }

  async save(entity: T): Promise<void> {
    await this.inner.save(entity);
    const tenantId = this.tenantContext.getTenantId?.();
    const tags = buildEntityTypeTags(this.entityName, tenantId);
    await this.cache.invalidateByTags(tags);
    this.logger?.debug("缓存失效（save）", {
      entity: this.entityName,
      tenantId,
      tags,
    });
  }

  async delete(id: EntityId): Promise<void> {
    await this.inner.delete(id);
    const tenantId = this.tenantContext.getTenantId?.();
    const tags = [
      ...buildEntityTypeTags(this.entityName, tenantId),
      ...buildEntityIdTags(this.entityName, String(id.value), tenantId),
    ];
    await this.cache.invalidateByTags(tags);
    this.logger?.debug("缓存失效（delete）", {
      entity: this.entityName,
      id: String(id.value),
      tenantId,
      tags,
    });
  }

  async exists(id: EntityId): Promise<boolean> {
    if (!this.enabled) return this.inner.exists(id);

    const tenantId = this.tenantContext.getTenantId?.();
    const baseKey = this.keyBuilder.buildEntityKey(
      this.entityName,
      `exists:${String(id.value)}`,
      tenantId,
    );
    const cacheKey = this.keyPrefix ? `${this.keyPrefix}:${baseKey}` : baseKey;

    const cached = await this.cache.get<boolean | undefined>(cacheKey);
    if (cached !== undefined) {
      this.logger?.debug("缓存命中（exists）", {
        entity: this.entityName,
        id: String(id.value),
        tenantId,
        key: cacheKey,
      });
      return cached;
    }

    const value = await this.inner.exists(id);
    const tags = [
      ...buildEntityTypeTags(this.entityName, tenantId),
      ...buildEntityIdTags(this.entityName, String(id.value), tenantId),
    ];
    await this.cache.set(cacheKey, value, this.defaultTtlMs, tags);
    this.logger?.debug("缓存写入（exists）", {
      entity: this.entityName,
      id: String(id.value),
      tenantId,
      key: cacheKey,
      ttl: this.defaultTtlMs,
      tags,
    });
    return value;
  }
}
