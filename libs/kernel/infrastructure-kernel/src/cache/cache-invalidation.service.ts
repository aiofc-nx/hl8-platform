/**
 * @fileoverview 缓存失效服务
 * @description 提供按实体、实体ID、模式的失效方法，并预留事件驱动钩子接口。
 */

import { Injectable } from "@nestjs/common";
import type { ICache, TenantContextProvider } from "@hl8/cache";
import { buildEntityIdTags, buildEntityTypeTags } from "./cache-tag.util.js";
import type { Logger } from "@hl8/logger";

@Injectable()
export class CacheInvalidationService {
  constructor(
    private readonly cache: ICache,
    private readonly tenantContext: TenantContextProvider,
    private readonly logger?: Logger,
  ) {}

  /**
   * @description 按实体类型失效（支持全局或租户粒度）
   */
  async invalidateEntity(entityName: string, tenantId?: string): Promise<void> {
    const tid = tenantId ?? this.tenantContext.getTenantId?.();
    const tags = buildEntityTypeTags(entityName, tid);
    await this.cache.invalidateByTags(tags);
    this.logger?.debug("缓存失效（按实体类型）", {
      entity: entityName,
      tenantId: tid,
      tags,
    });
  }

  /**
   * @description 按实体ID失效（支持全局或租户粒度）
   */
  async invalidateEntityId(
    entityName: string,
    id: string,
    tenantId?: string,
  ): Promise<void> {
    const tid = tenantId ?? this.tenantContext.getTenantId?.();
    const tags = buildEntityIdTags(entityName, String(id), tid);
    await this.cache.invalidateByTags(tags);
    this.logger?.debug("缓存失效（按实体ID）", {
      entity: entityName,
      id: String(id),
      tenantId: tid,
      tags,
    });
  }

  /**
   * @description 通过模式匹配失效（如："tenant:repo:user:*"）
   */
  async invalidateByPattern(pattern: string): Promise<void> {
    await this.cache.invalidateByPattern(pattern);
    this.logger?.debug("缓存失效（按模式）", { pattern });
  }

  /**
   * @description 事件驱动失效钩子（预留）
   * @example
   * // 伪代码：
   * // if (event.type === 'UserUpdated') invalidateEntityId('user', event.id, event.tenantId)
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async handleEvent(event: unknown): Promise<void> {
    // 预留：在基础设施层接入事件总线后，根据事件类型映射到相应失效调用
  }
}
