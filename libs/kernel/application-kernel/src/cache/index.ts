/**
 * @fileoverview 缓存模块导出
 * @description 导出所有缓存相关的类和接口
 */

// Cache - 接口和类型
export type {
  ICache,
  CacheStats,
  CacheItem,
  CacheInvalidationStrategy,
  CacheInvalidationEvent,
  CacheInvalidationListener,
  CacheProvider,
} from "./cache.interface.js";
export type { CacheConfig } from "./cache.interface.js";
export { CacheInvalidationStrategy as CacheInvalidationStrategyEnum } from "./cache.interface.js";

// Cache - 实现
export { InMemoryCache } from "./cache.impl.js";

// Invalidation
export * from "./invalidation/event-based-invalidation.js";
