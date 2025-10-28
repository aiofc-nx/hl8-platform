/**
 * @fileoverview 读模型管理器
 * @description 管理读模型的更新、查询和缓存
 */

import { Logger } from "@hl8/logger";
import { DomainEvent } from "@hl8/domain-kernel";
import { ProjectorRegistry } from "../registry/projector-registry.js";

/**
 * 读模型配置
 * @description 读模型的配置选项
 */
export interface ReadModelConfig {
  /** 读模型名称 */
  name: string;
  /** 读模型描述 */
  description?: string;
  /** 缓存配置 */
  cache?: {
    enabled: boolean;
    ttl: number; // 生存时间（毫秒）
    maxSize: number; // 最大缓存大小
  };
  /** 索引配置 */
  indexes?: Array<{
    name: string;
    fields: string[];
    unique?: boolean;
  }>;
  /** 分页配置 */
  pagination?: {
    defaultPageSize: number;
    maxPageSize: number;
  };
}

/**
 * 读模型查询选项
 * @description 读模型查询的选项
 */
export interface ReadModelQueryOptions {
  /** 分页选项 */
  pagination?: {
    page: number;
    pageSize: number;
  };
  /** 排序选项 */
  sort?: Array<{
    field: string;
    direction: "asc" | "desc";
  }>;
  /** 过滤选项 */
  filter?: Record<string, unknown>;
  /** 字段选择 */
  select?: string[];
}

/**
 * 读模型查询结果
 * @description 读模型查询的结果
 */
export interface ReadModelQueryResult<T = unknown> {
  /** 数据列表 */
  data: T[];
  /** 分页信息 */
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  /** 元数据 */
  metadata?: {
    queryTime: number;
    cacheHit: boolean;
    lastUpdated: Date;
  };
}

/**
 * 读模型更新结果
 * @description 读模型更新的结果
 */
export interface ReadModelUpdateResult {
  /** 是否成功 */
  success: boolean;
  /** 更新的记录数 */
  updatedCount: number;
  /** 插入的记录数 */
  insertedCount: number;
  /** 删除的记录数 */
  deletedCount: number;
  /** 处理时间（毫秒） */
  processingTime: number;
  /** 错误信息 */
  error?: string;
}

/**
 * 读模型管理器
 * @description 管理读模型的更新、查询和缓存
 */
export class ReadModelManager {
  private readonly logger: Logger;
  private readonly registry: ProjectorRegistry;
  private readonly config: ReadModelConfig;
  private readonly cache: Map<string, { data: unknown; timestamp: number }> =
    new Map();
  private readonly indexes: Map<string, Map<string, Set<string>>> = new Map();

  constructor(
    logger: Logger,
    registry: ProjectorRegistry,
    config: ReadModelConfig,
  ) {
    this.logger = logger;
    this.registry = registry;
    this.config = {
      cache: {
        enabled: true,
        ttl: 300000, // 5分钟
        maxSize: 1000,
      },
      pagination: {
        defaultPageSize: 20,
        maxPageSize: 100,
      },
      ...config,
    };

    this.initializeIndexes();
  }

  /**
   * 更新读模型
   * @param event 领域事件
   * @returns 更新结果
   */
  public async updateReadModel(
    event: DomainEvent,
  ): Promise<ReadModelUpdateResult> {
    const startTime = Date.now();
    const result: ReadModelUpdateResult = {
      success: false,
      updatedCount: 0,
      insertedCount: 0,
      deletedCount: 0,
      processingTime: 0,
    };

    try {
      this.logger.debug(`开始更新读模型: ${event.eventType}`, {
        eventId: event.eventId.toString(),
        aggregateId: event.aggregateRootId?.toString(),
        version: event.version,
      });

      // 获取支持该事件类型的投影器
      const projectors = this.registry.getProjectorsForEventType(
        event.eventType,
      );
      const enabledProjectors = projectors.filter(
        (registration) => registration.enabled,
      );

      if (enabledProjectors.length === 0) {
        this.logger.warn(`没有找到支持事件类型 ${event.eventType} 的投影器`);
        result.success = true;
        result.processingTime = Date.now() - startTime;
        return result;
      }

      // 处理每个投影器
      for (const registration of enabledProjectors) {
        try {
          const projector = registration.projector;
          const _readModel = await projector.getReadModel();
          await projector.processEvent(event);
          const updatedReadModel = await projector.getReadModel();
          await projector.updateReadModel(updatedReadModel);

          result.updatedCount++;
          this.logger.debug(
            `投影器 ${registration.metadata.name} 读模型更新成功`,
          );
        } catch (error) {
          this.logger.error(
            `投影器 ${registration.metadata.name} 读模型更新失败`,
            {
              eventId: event.eventId.toString(),
              error: error instanceof Error ? error.message : String(error),
            },
          );
          throw error;
        }
      }

      // 清除相关缓存
      this.clearCacheForEvent(event);

      result.success = true;
      result.processingTime = Date.now() - startTime;

      this.logger.debug(`读模型更新完成: ${event.eventType}`, {
        eventId: event.eventId.toString(),
        processingTime: result.processingTime,
        updatedProjectors: result.updatedCount,
      });

      return result;
    } catch (error) {
      result.processingTime = Date.now() - startTime;
      result.error = error instanceof Error ? error.message : String(error);

      this.logger.error(`读模型更新失败: ${event.eventType}`, {
        eventId: event.eventId.toString(),
        error: result.error,
      });

      return result;
    }
  }

  /**
   * 批量更新读模型
   * @param events 事件列表
   * @returns 更新结果
   */
  public async batchUpdateReadModel(
    events: DomainEvent[],
  ): Promise<ReadModelUpdateResult> {
    const startTime = Date.now();
    const result: ReadModelUpdateResult = {
      success: false,
      updatedCount: 0,
      insertedCount: 0,
      deletedCount: 0,
      processingTime: 0,
    };

    try {
      this.logger.debug(`开始批量更新读模型: ${events.length} 个事件`);

      // 按事件类型分组
      const eventsByType = this.groupEventsByType(events);

      // 处理每种事件类型
      for (const [eventType, typeEvents] of eventsByType) {
        const typeResult = await this.updateReadModelByType(
          eventType,
          typeEvents,
        );
        result.updatedCount += typeResult.updatedCount;
        result.insertedCount += typeResult.insertedCount;
        result.deletedCount += typeResult.deletedCount;
      }

      // 清除相关缓存
      for (const event of events) {
        this.clearCacheForEvent(event);
      }

      result.success = true;
      result.processingTime = Date.now() - startTime;

      this.logger.debug(`批量读模型更新完成`, {
        totalEvents: events.length,
        processingTime: result.processingTime,
        updatedProjectors: result.updatedCount,
      });

      return result;
    } catch (error) {
      result.processingTime = Date.now() - startTime;
      result.error = error instanceof Error ? error.message : String(error);

      this.logger.error(`批量读模型更新失败`, {
        eventCount: events.length,
        error: result.error,
      });

      return result;
    }
  }

  /**
   * 查询读模型
   * @param query 查询条件
   * @param options 查询选项
   * @returns 查询结果
   */
  public async queryReadModel<T = unknown>(
    query: Record<string, unknown> = {},
    options: ReadModelQueryOptions = {},
  ): Promise<ReadModelQueryResult<T>> {
    const startTime = Date.now();
    const cacheKey = this.generateCacheKey(query, options);

    // 检查缓存
    if (this.config.cache?.enabled) {
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.config.cache.ttl) {
        this.logger.debug(`读模型查询缓存命中: ${cacheKey}`);
        return {
          ...(cached.data as ReadModelQueryResult<T>),
          metadata: {
            ...(cached.data as ReadModelQueryResult<T>).metadata,
            cacheHit: true,
            queryTime: Date.now() - startTime,
          },
        };
      }
    }

    try {
      this.logger.debug(`开始查询读模型`, { query, options });

      // 获取所有投影器的读模型
      const projectors = this.registry.getEnabledProjectors();
      const readModels: T[] = [];

      for (const registration of projectors) {
        try {
          const readModel = await registration.projector.getReadModel();
          if (readModel) {
            readModels.push(readModel as T);
          }
        } catch (error) {
          this.logger.warn(
            `获取投影器 ${registration.metadata.name} 读模型失败`,
            {
              error: error instanceof Error ? error.message : String(error),
            },
          );
        }
      }

      // 应用过滤和排序
      let filteredData = this.applyFilters(readModels, query);
      filteredData = this.applySorting(filteredData, options.sort);

      // 应用分页
      const paginatedData = this.applyPagination(
        filteredData,
        options.pagination,
      );

      const result: ReadModelQueryResult<T> = {
        data: paginatedData,
        pagination: options.pagination
          ? {
              page: options.pagination.page,
              pageSize: options.pagination.pageSize,
              total: filteredData.length,
              totalPages: Math.ceil(
                filteredData.length / options.pagination.pageSize,
              ),
            }
          : undefined,
        metadata: {
          queryTime: Date.now() - startTime,
          cacheHit: false,
          lastUpdated: new Date(),
        },
      };

      // 缓存结果
      if (this.config.cache?.enabled) {
        this.cache.set(cacheKey, {
          data: result,
          timestamp: Date.now(),
        });
        this.cleanupCache();
      }

      this.logger.debug(`读模型查询完成`, {
        resultCount: result.data.length,
        queryTime: result.metadata?.queryTime,
      });

      return result;
    } catch (error) {
      this.logger.error(`读模型查询失败`, {
        query,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * 清除读模型缓存
   * @param pattern 缓存键模式（可选）
   */
  public clearCache(pattern?: string): void {
    if (pattern) {
      const regex = new RegExp(pattern);
      for (const key of this.cache.keys()) {
        if (regex.test(key)) {
          this.cache.delete(key);
        }
      }
      this.logger.debug(`清除读模型缓存: ${pattern}`);
    } else {
      this.cache.clear();
      this.logger.debug("清除所有读模型缓存");
    }
  }

  /**
   * 获取读模型统计信息
   * @returns 统计信息
   */
  public getStatistics(): {
    cacheSize: number;
    cacheHitRate: number;
    indexCount: number;
    lastUpdated: Date;
  } {
    return {
      cacheSize: this.cache.size,
      cacheHitRate: 0, // TODO: 实现缓存命中率统计
      indexCount: this.indexes.size,
      lastUpdated: new Date(),
    };
  }

  // 私有辅助方法

  /**
   * 初始化索引
   */
  private initializeIndexes(): void {
    if (this.config.indexes) {
      for (const index of this.config.indexes) {
        this.indexes.set(index.name, new Map());
      }
    }
  }

  /**
   * 按事件类型分组事件
   * @param events 事件列表
   * @returns 按事件类型分组的事件映射
   */
  private groupEventsByType(events: DomainEvent[]): Map<string, DomainEvent[]> {
    const grouped = new Map<string, DomainEvent[]>();

    for (const event of events) {
      const eventType = event.eventType;
      if (!grouped.has(eventType)) {
        grouped.set(eventType, []);
      }
      grouped.get(eventType)!.push(event);
    }

    return grouped;
  }

  /**
   * 更新特定类型的读模型
   * @param eventType 事件类型
   * @param events 事件列表
   * @returns 更新结果
   */
  private async updateReadModelByType(
    eventType: string,
    events: DomainEvent[],
  ): Promise<ReadModelUpdateResult> {
    const result: ReadModelUpdateResult = {
      success: false,
      updatedCount: 0,
      insertedCount: 0,
      deletedCount: 0,
      processingTime: 0,
    };

    const startTime = Date.now();

    try {
      // 获取支持该事件类型的投影器
      const projectors = this.registry.getProjectorsForEventType(eventType);
      const enabledProjectors = projectors.filter(
        (registration) => registration.enabled,
      );

      if (enabledProjectors.length === 0) {
        result.success = true;
        result.processingTime = Date.now() - startTime;
        return result;
      }

      // 处理每个投影器
      for (const registration of enabledProjectors) {
        try {
          const projector = registration.projector;
          await projector.processEvents(events);
          result.updatedCount++;
        } catch (error) {
          this.logger.error(
            `投影器 ${registration.metadata.name} 批量读模型更新失败`,
            {
              eventType,
              eventCount: events.length,
              error: error instanceof Error ? error.message : String(error),
            },
          );
          throw error;
        }
      }

      result.success = true;
      result.processingTime = Date.now() - startTime;
      return result;
    } catch (error) {
      result.processingTime = Date.now() - startTime;
      result.error = error instanceof Error ? error.message : String(error);
      return result;
    }
  }

  /**
   * 清除事件相关的缓存
   * @param event 领域事件
   */
  private clearCacheForEvent(event: DomainEvent): void {
    // 清除包含该聚合根ID的缓存
    const aggregateId = event.aggregateRootId?.toString();
    for (const key of this.cache.keys()) {
      if (key.includes(aggregateId)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * 生成缓存键
   * @param query 查询条件
   * @param options 查询选项
   * @returns 缓存键
   */
  private generateCacheKey(
    query: Record<string, unknown>,
    options: ReadModelQueryOptions,
  ): string {
    return JSON.stringify({ query, options });
  }

  /**
   * 应用过滤条件
   * @param data 数据列表
   * @param filters 过滤条件
   * @returns 过滤后的数据
   */
  private applyFilters<T>(data: T[], filters: Record<string, unknown>): T[] {
    if (Object.keys(filters).length === 0) {
      return data;
    }

    return data.filter((item) => {
      for (const [field, value] of Object.entries(filters)) {
        if (typeof value === "object" && value !== null) {
          // 复杂过滤条件
          const filterValue = value as Record<string, unknown>;
          if (
            filterValue.$eq !== undefined &&
            (item as Record<string, unknown>)[field] !== filterValue.$eq
          ) {
            return false;
          }
          if (
            filterValue.$ne !== undefined &&
            (item as Record<string, unknown>)[field] === filterValue.$ne
          ) {
            return false;
          }
          if (
            filterValue.$gt !== undefined &&
            (item as Record<string, unknown>)[field] <= filterValue.$gt
          ) {
            return false;
          }
          if (
            filterValue.$lt !== undefined &&
            (item as Record<string, unknown>)[field] >= filterValue.$lt
          ) {
            return false;
          }
          if (
            filterValue.$in !== undefined &&
            !(filterValue.$in as unknown[]).includes(
              (item as Record<string, unknown>)[field],
            )
          ) {
            return false;
          }
          if (
            filterValue.$nin !== undefined &&
            (filterValue.$nin as unknown[]).includes(
              (item as Record<string, unknown>)[field],
            )
          ) {
            return false;
          }
        } else {
          // 简单过滤条件
          if ((item as Record<string, unknown>)[field] !== value) {
            return false;
          }
        }
      }
      return true;
    });
  }

  /**
   * 应用排序
   * @param data 数据列表
   * @param sort 排序条件
   * @returns 排序后的数据
   */
  private applySorting<T>(
    data: T[],
    sort?: Array<{ field: string; direction: "asc" | "desc" }>,
  ): T[] {
    if (!sort || sort.length === 0) {
      return data;
    }

    return data.sort((a, b) => {
      for (const { field, direction } of sort) {
        const aValue = (a as Record<string, unknown>)[field];
        const bValue = (b as Record<string, unknown>)[field];

        if (aValue < bValue) {
          return direction === "asc" ? -1 : 1;
        }
        if (aValue > bValue) {
          return direction === "asc" ? 1 : -1;
        }
      }
      return 0;
    });
  }

  /**
   * 应用分页
   * @param data 数据列表
   * @param pagination 分页选项
   * @returns 分页后的数据
   */
  private applyPagination<T>(
    data: T[],
    pagination?: { page: number; pageSize: number },
  ): T[] {
    if (!pagination) {
      return data;
    }

    const { page, pageSize } = pagination;
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;

    return data.slice(startIndex, endIndex);
  }

  /**
   * 清理过期缓存
   */
  private cleanupCache(): void {
    if (!this.config.cache?.enabled) {
      return;
    }

    const now = Date.now();
    const ttl = this.config.cache.ttl;
    const maxSize = this.config.cache.maxSize;

    // 清理过期缓存
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > ttl) {
        this.cache.delete(key);
      }
    }

    // 如果缓存仍然超过最大大小，删除最旧的条目
    if (this.cache.size > maxSize) {
      const entries = Array.from(this.cache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);

      const toDelete = entries.slice(0, this.cache.size - maxSize);
      for (const [key] of toDelete) {
        this.cache.delete(key);
      }
    }
  }
}
