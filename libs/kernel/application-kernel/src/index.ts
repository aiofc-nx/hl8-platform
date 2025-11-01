/**
 * @fileoverview Application Kernel Core Module
 * @description 应用层核心模块 - 提供CQRS、事件溯源、事件驱动架构的标准化实现
 */

// Use Cases
export * from "./use-cases/index.js";

// Commands
export * from "./commands/index.js";

// Queries
export * from "./queries/index.js";

// Events
export * from "./events/index.js";

// Projectors
export * from "./projectors/index.js";

// Sagas
export * from "./sagas/index.js";

// Bus
export * from "./bus/index.js";

// Cache - 避免 CacheConfig 冲突
export type {
  ICache,
  CacheConfig as CacheConfigType,
  CacheStats,
  CacheItem,
  CacheInvalidationStrategy,
  CacheInvalidationEvent,
  CacheInvalidationListener,
  CacheProvider,
} from "./cache/cache.interface.js";
export { CacheInvalidationStrategy as CacheInvalidationStrategyEnum } from "./cache/cache.interface.js";
export { InMemoryCache } from "./cache/cache.impl.js";
export * from "./cache/invalidation/event-based-invalidation.js";

// Monitoring - 避免 MonitoringConfig 冲突
export {
  PerformanceMetric,
  PerformanceMetricType,
} from "./monitoring/performance-metrics.js";
export type {
  PerformanceMetricLabel,
  PerformanceMetricData,
  HistogramData,
  SummaryData,
  PerformanceMetricConfig,
} from "./monitoring/performance-metrics.js";
export { MonitoringService } from "./monitoring/monitoring.service.js";
export type { MonitoringConfig as MonitoringConfigType } from "./monitoring/monitoring.service.js";

// Config
export * from "./config/index.js";

// Exceptions
export * from "./exceptions/index.js";
