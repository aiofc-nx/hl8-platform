/**
 * @fileoverview 查询装饰器
 * @description 提供查询的装饰器功能
 */

import { SetMetadata } from "@nestjs/common";

/**
 * 查询元数据键
 */
export const QUERY_METADATA_KEY = "query";

/**
 * 查询配置接口
 */
export interface QueryConfig {
  /** 查询名称 */
  name: string;
  /** 查询描述 */
  description?: string;
  /** 查询版本 */
  version?: string;
  /** 是否启用 */
  enabled?: boolean;
  /** 超时时间（毫秒） */
  timeout?: number;
  /** 重试次数 */
  retryCount?: number;
  /** 权限要求 */
  permissions?: string[];
  /** 标签 */
  tags?: string[];
  /** 是否支持缓存 */
  cacheable?: boolean;
  /** 缓存TTL（秒） */
  cacheTtl?: number;
  /** 缓存键生成器 */
  cacheKeyGenerator?: string;
}

/**
 * 查询装饰器
 * @description 标记类为查询并配置元数据
 * @param config 查询配置
 * @returns 装饰器函数
 */
export function Query(config: QueryConfig) {
  return function (target: new (...args: unknown[]) => unknown) {
    // 设置查询元数据
    SetMetadata(QUERY_METADATA_KEY, {
      ...config,
      enabled: config.enabled !== false,
      version: config.version || "1.0.0",
      timeout: config.timeout || 10000, // 默认10秒
      retryCount: config.retryCount || 0,
      permissions: config.permissions || [],
      tags: config.tags || [],
      cacheable: config.cacheable || false,
      cacheTtl: config.cacheTtl || 300, // 默认5分钟
      cacheKeyGenerator: config.cacheKeyGenerator || "default",
    })(target);

    // 添加查询标识
    Reflect.defineProperty(target, "isQuery", {
      value: true,
      writable: false,
      enumerable: false,
      configurable: false,
    });

    return target;
  };
}

/**
 * 检查是否为查询
 * @param target 目标类
 * @returns 是否为查询
 */
export function isQuery(target: new (...args: unknown[]) => unknown): boolean {
  return Reflect.get(target, "isQuery") === true;
}

/**
 * 获取查询配置
 * @param target 目标类
 * @returns 查询配置
 */
export function getQueryConfig(
  target: new (...args: unknown[]) => unknown,
): QueryConfig | undefined {
  return Reflect.getMetadata(QUERY_METADATA_KEY, target);
}
