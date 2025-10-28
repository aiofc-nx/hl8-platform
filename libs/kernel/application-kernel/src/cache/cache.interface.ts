/**
 * @fileoverview 缓存接口定义
 * @description 提供统一的缓存操作接口，支持多种缓存策略和失效机制
 */

import type { Logger } from "@hl8/logger";

/**
 * 缓存配置接口
 * @description 定义缓存的配置参数
 */
export interface CacheConfig {
  /** 默认过期时间（毫秒） */
  defaultTtl: number;
  /** 最大缓存大小 */
  maxSize: number;
  /** 是否启用统计 */
  enableStats: boolean;
  /** 是否启用事件驱动失效 */
  enableEventInvalidation: boolean;
  /** 清理间隔（毫秒） */
  cleanupInterval: number;
  /** 是否启用压缩 */
  enableCompression: boolean;
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
  /** 当前缓存大小 */
  currentSize: number;
  /** 最大缓存大小 */
  maxSize: number;
  /** 命中率 */
  hitRate: number;
  /** 最后更新时间 */
  lastUpdated: Date;
}

/**
 * 缓存项接口
 * @description 定义缓存项的数据结构
 */
export interface CacheItem<T = unknown> {
  /** 缓存值 */
  value: T;
  /** 过期时间 */
  expiresAt: Date;
  /** 创建时间 */
  createdAt: Date;
  /** 最后访问时间 */
  lastAccessedAt: Date;
  /** 访问次数 */
  accessCount: number;
  /** 标签列表 */
  tags: string[];
  /** 元数据 */
  metadata: Record<string, unknown>;
}

/**
 * 缓存失效策略枚举
 * @description 定义不同的缓存失效策略
 */
export enum CacheInvalidationStrategy {
  /** 基于时间失效 */
  TIME_BASED = "time_based",
  /** 基于事件失效 */
  EVENT_BASED = "event_based",
  /** 基于标签失效 */
  TAG_BASED = "tag_based",
  /** 基于模式失效 */
  PATTERN_BASED = "pattern_based",
  /** 手动失效 */
  MANUAL = "manual",
}

/**
 * 缓存失效事件接口
 * @description 定义缓存失效事件的数据结构
 */
export interface CacheInvalidationEvent {
  /** 事件类型 */
  type: string;
  /** 失效键 */
  keys: string[];
  /** 失效标签 */
  tags: string[];
  /** 失效模式 */
  pattern?: string;
  /** 失效策略 */
  strategy: CacheInvalidationStrategy;
  /** 事件时间 */
  timestamp: Date;
  /** 事件元数据 */
  metadata: Record<string, unknown>;
}

/**
 * 缓存接口
 * @description 提供统一的缓存操作接口
 */
export interface ICache {
  /**
   * 获取缓存项
   * @param key 缓存键
   * @returns 缓存值或undefined
   */
  get<T>(key: string): Promise<T | undefined>;

  /**
   * 设置缓存项
   * @param key 缓存键
   * @param value 缓存值
   * @param ttl 过期时间（毫秒）
   * @param tags 标签列表
   * @param metadata 元数据
   * @returns 设置结果
   */
  set<T>(
    key: string,
    value: T,
    ttl?: number,
    tags?: string[],
    metadata?: Record<string, unknown>,
  ): Promise<boolean>;

  /**
   * 删除缓存项
   * @param key 缓存键
   * @returns 删除结果
   */
  delete(key: string): Promise<boolean>;

  /**
   * 检查缓存项是否存在
   * @param key 缓存键
   * @returns 是否存在
   */
  has(key: string): Promise<boolean>;

  /**
   * 清空所有缓存
   * @returns 清空结果
   */
  clear(): Promise<boolean>;

  /**
   * 获取多个缓存项
   * @param keys 缓存键列表
   * @returns 缓存项映射
   */
  getMany<T>(keys: string[]): Promise<Record<string, T>>;

  /**
   * 设置多个缓存项
   * @param items 缓存项映射
   * @param ttl 过期时间（毫秒）
   * @param tags 标签列表
   * @param metadata 元数据
   * @returns 设置结果
   */
  setMany<T>(
    items: Record<string, T>,
    ttl?: number,
    tags?: string[],
    metadata?: Record<string, unknown>,
  ): Promise<boolean>;

  /**
   * 删除多个缓存项
   * @param keys 缓存键列表
   * @returns 删除结果
   */
  deleteMany(keys: string[]): Promise<boolean>;

  /**
   * 根据标签失效缓存
   * @param tags 标签列表
   * @returns 失效结果
   */
  invalidateByTags(tags: string[]): Promise<boolean>;

  /**
   * 根据模式失效缓存
   * @param pattern 键模式
   * @returns 失效结果
   */
  invalidateByPattern(pattern: string): Promise<boolean>;

  /**
   * 获取缓存统计信息
   * @returns 统计信息
   */
  getStats(): Promise<CacheStats>;

  /**
   * 重置统计信息
   * @returns 重置结果
   */
  resetStats(): Promise<boolean>;

  /**
   * 清理过期缓存项
   * @returns 清理结果
   */
  cleanup(): Promise<number>;

  /**
   * 获取缓存项详情
   * @param key 缓存键
   * @returns 缓存项详情
   */
  getItem<T>(key: string): Promise<CacheItem<T> | undefined>;

  /**
   * 更新缓存项元数据
   * @param key 缓存键
   * @param metadata 元数据
   * @returns 更新结果
   */
  updateMetadata(
    key: string,
    metadata: Record<string, unknown>,
  ): Promise<boolean>;

  /**
   * 获取所有缓存键
   * @param pattern 键模式（可选）
   * @returns 缓存键列表
   */
  keys(pattern?: string): Promise<string[]>;

  /**
   * 获取缓存大小
   * @returns 缓存大小
   */
  size(): Promise<number>;

  /**
   * 检查缓存是否已满
   * @returns 是否已满
   */
  isFull(): Promise<boolean>;

  /**
   * 销毁缓存实例
   * @returns 销毁结果
   */
  destroy(): Promise<boolean>;
}

/**
 * 缓存失效监听器接口
 * @description 定义缓存失效事件的监听器
 */
export interface CacheInvalidationListener {
  /**
   * 处理缓存失效事件
   * @param event 失效事件
   * @returns 处理结果
   */
  onInvalidation(event: CacheInvalidationEvent): Promise<void>;
}

/**
 * 缓存提供者接口
 * @description 定义缓存提供者的工厂接口
 */
export interface CacheProvider {
  /**
   * 创建缓存实例
   * @param config 缓存配置
   * @param logger 日志记录器
   * @returns 缓存实例
   */
  createCache(config: CacheConfig, logger: Logger): ICache;

  /**
   * 获取提供者名称
   * @returns 提供者名称
   */
  getName(): string;

  /**
   * 检查是否支持指定配置
   * @param config 缓存配置
   * @returns 是否支持
   */
  supports(config: CacheConfig): boolean;
}
