/**
 * @fileoverview 缓存协调服务
 * @description 提供跨层缓存失效协调功能，使得应用层和基础设施层缓存能够协同工作
 */

import type { Logger } from "@hl8/logger";
import type { ICache } from "../cache.interface.js";

/**
 * 缓存协调服务
 * @description 提供跨层缓存失效协调功能，协调应用层和基础设施层的缓存失效
 *
 * @example
 * ```typescript
 * const service = new CacheCoordinationService(cache, logger);
 *
 * // 当实体更新时，协调失效两层缓存
 * await service.invalidateEntityUpdate('user', '123', 'tenant1');
 * // 这会失效:
 * // 1. 基础设施层: repo:user:123 (或 tenant1:repo:user:123)
 * // 2. 应用层: query:*:user:* 模式的查询缓存
 * ```
 */
export class CacheCoordinationService {
  constructor(
    private readonly cache: ICache,
    private readonly logger?: Logger,
  ) {}

  /**
   * 协调实体更新引起的缓存失效
   * @description 当实体更新时，失效基础设施层的实体缓存和应用层的相关查询缓存
   *
   * @param entityName 实体名称（如 "user"）
   * @param entityId 实体 ID（可选，不提供则失效该类型的所有实体缓存）
   * @param tenantId 租户 ID（可选，多租户场景）
   *
   * @example
   * ```typescript
   * // 失效特定用户的所有缓存
   * await service.invalidateEntityUpdate('user', '123');
   *
   * // 多租户场景
   * await service.invalidateEntityUpdate('user', '123', 'tenant1');
   * ```
   */
  async invalidateEntityUpdate(
    entityName: string,
    entityId?: string,
    tenantId?: string,
  ): Promise<void> {
    const cacheKeys: string[] = [];

    // 1. 失效基础设施层的实体缓存
    if (entityId) {
      const entityKey = tenantId
        ? `${tenantId}:repo:${entityName}:${entityId}`
        : `repo:${entityName}:${entityId}`;
      cacheKeys.push(entityKey);
      await this.cache.delete(entityKey);

      this.logger?.debug("协调失效：实体缓存已失效", {
        entityKey,
        entityName,
        entityId,
        tenantId,
      });
    } else {
      // 失效该类型的所有实体缓存（使用模式匹配）
      const pattern = tenantId
        ? `${tenantId}:repo:${entityName}:*`
        : `repo:${entityName}:*`;
      await this.cache.invalidateByPattern(pattern);

      this.logger?.debug("协调失效：实体类型缓存已失效", {
        pattern,
        entityName,
        tenantId,
      });
    }

    // 2. 失效应用层的相关查询缓存（使用标签）
    const tags = [`entity:${entityName}`];
    if (tenantId) {
      tags.push(`${tenantId}:entity:${entityName}`);
    }
    await this.cache.invalidateByTags(tags);

    this.logger?.debug("协调失效：查询缓存已失效", {
      tags,
      entityName,
      entityId,
      tenantId,
    });

    // 3. 额外失效可能的查询模式
    const queryPattern = `query:*:${entityName}:*`;
    await this.cache.invalidateByPattern(queryPattern);

    this.logger?.debug("协调失效：查询模式缓存已失效", {
      queryPattern,
      entityName,
      tenantId,
    });
  }

  /**
   * 协调实体删除引起的缓存失效
   * @description 当实体删除时，失效相关缓存
   *
   * @param entityName 实体名称
   * @param entityId 实体 ID
   * @param tenantId 租户 ID（可选）
   */
  async invalidateEntityDelete(
    entityName: string,
    entityId: string,
    tenantId?: string,
  ): Promise<void> {
    await this.invalidateEntityUpdate(entityName, entityId, tenantId);
  }

  /**
   * 协调批量实体更新引起的缓存失效
   * @description 批量失效多个实体的缓存
   *
   * @param entityName 实体名称
   * @param entityIds 实体 ID 列表
   * @param tenantId 租户 ID（可选）
   */
  async invalidateBatchEntityUpdate(
    entityName: string,
    entityIds: string[],
    tenantId?: string,
  ): Promise<void> {
    const cacheKeys = entityIds.map((id) =>
      tenantId
        ? `${tenantId}:repo:${entityName}:${id}`
        : `repo:${entityName}:${id}`,
    );

    await this.cache.deleteMany(cacheKeys);

    // 失效查询缓存
    const tags = [`entity:${entityName}`];
    if (tenantId) {
      tags.push(`${tenantId}:entity:${entityName}`);
    }
    await this.cache.invalidateByTags(tags);

    this.logger?.debug("协调失效：批量实体缓存已失效", {
      entityName,
      entityIds,
      tenantId,
      deletedCount: cacheKeys.length,
    });
  }
}
