/**
 * @fileoverview 缓存库 API 接口定义
 * @description 定义统一的缓存操作接口和类型
 * 
 * **重要**: 缓存库必须使用 `@hl8/config` 进行配置管理，必须使用 `@hl8/logger` 进行日志记录。
 */

/**
 * 缓存配置接口
 * @description 定义缓存的全局配置参数
 */
export interface CacheConfig {
  /** 默认过期时间（毫秒），0 表示不过期 */
  defaultTtl: number;
  /** 最大缓存项数量 */
  maxSize: number;
  /** 是否启用统计 */
  enableStats: boolean;
  /** 是否启用事件驱动失效 */
  enableEventInvalidation: boolean;
  /** 清理间隔（毫秒） */
  cleanupInterval: number;
  /** 是否启用压缩（未来功能） */
  enableCompression?: boolean;
  /** 淘汰策略 */
  evictionStrategy?: 'LRU' | 'FIFO' | 'LFU';
}

/**
 * 缓存统计信息接口
 * @description 提供缓存的性能统计信息
 */
export interface CacheStats {
  /** 命中次数 */
  hits: number;
  /** 未命中次数 */
  misses: number;
  /** 设置次数 */
  sets: number;
  /** 删除次数 */
  deletes: number;
  /** 清理次数 */
  cleanups: number;
  /** 当前缓存项数量 */
  currentSize: number;
  /** 最大缓存项数量 */
  maxSize: number;
  /** 命中率（0-1） */
  hitRate: number;
  /** 最后更新时间 */
  lastUpdated: Date;
}

/**
 * 缓存项接口
 * @description 表示单个缓存项的元数据
 */
export interface CacheItemMetadata {
  /** 缓存键 */
  key: string;
  /** 过期时间戳（毫秒） */
  expiresAt: number;
  /** 创建时间戳（毫秒） */
  createdAt: number;
  /** 最后访问时间戳（毫秒） */
  lastAccessedAt: number;
  /** 访问次数 */
  accessCount: number;
  /** 标签列表 */
  tags: string[];
}

/**
 * 缓存失效规则接口
 * @description 定义缓存失效规则的配置
 */
export interface CacheInvalidationRule {
  /** 规则 ID（唯一标识） */
  id: string;
  /** 领域事件类型 */
  eventType: string;
  /** 失效策略 */
  invalidationStrategy: 'tag' | 'pattern' | 'key';
  /** 缓存键模式（用于模式匹配，支持 glob） */
  keyPattern?: string;
  /** 标签列表（用于标签失效） */
  tags?: string[];
  /** 条件函数（可选） */
  condition?: (event: unknown) => boolean;
  /** 键生成函数（可选） */
  keyGenerator?: (event: unknown) => string;
  /** 是否启用 */
  enabled: boolean;
  /** 优先级（数字越小优先级越高） */
  priority: number;
}

/**
 * 缓存接口
 * @description 统一的缓存操作接口，所有缓存实现必须实现此接口
 */
export interface ICache {
  /**
   * 获取缓存值
   * @param key 缓存键
   * @returns 缓存值，如果不存在或已过期返回 undefined
   */
  get<T>(key: string): Promise<T | undefined>;

  /**
   * 设置缓存值
   * @param key 缓存键
   * @param value 缓存值
   * @param ttl 过期时间（毫秒），如果不提供则使用默认 TTL
   * @param tags 标签列表（用于批量失效）
   */
  set(
    key: string,
    value: unknown,
    ttl?: number,
    tags?: string[],
  ): Promise<void>;

  /**
   * 删除缓存项
   * @param key 缓存键
   */
  delete(key: string): Promise<void>;

  /**
   * 批量删除缓存项
   * @param keys 缓存键列表
   */
  deleteMany(keys: string[]): Promise<void>;

  /**
   * 通过标签失效缓存
   * @param tags 标签列表
   */
  invalidateByTags(tags: string[]): Promise<void>;

  /**
   * 通过模式匹配失效缓存
   * @param pattern 模式（支持 glob，如 "repo:user:*"）
   */
  invalidateByPattern(pattern: string): Promise<void>;

  /**
   * 清空所有缓存
   */
  clear(): Promise<void>;

  /**
   * 获取缓存统计信息
   * @returns 统计信息
   */
  getStats(): Promise<CacheStats>;

  /**
   * 获取缓存项元数据
   * @param key 缓存键
   * @returns 元数据，如果不存在返回 undefined
   */
  getMetadata(key: string): Promise<CacheItemMetadata | undefined>;

  /**
   * 重置统计信息
   */
  resetStats(): Promise<void>;
}

/**
 * 缓存键构建器接口
 * @description 用于构建标准化的缓存键
 */
export interface CacheKeyBuilder {
  /**
   * 构建实体缓存键
   * @param entityName 实体名称
   * @param entityId 实体 ID
   * @param tenantId 租户 ID（可选）
   * @returns 缓存键
   */
  buildEntityKey(
    entityName: string,
    entityId: string,
    tenantId?: string,
  ): string;

  /**
   * 构建查询缓存键
   * @param queryType 查询类型
   * @param params 查询参数
   * @returns 缓存键
   */
  buildQueryKey(queryType: string, params: Record<string, unknown>): string;
}

