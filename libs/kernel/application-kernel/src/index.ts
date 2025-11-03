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

// Context - 租户上下文相关
export * from "./context/index.js";

// Middleware - 中间件
export * from "./middleware/index.js";

// Cache - 从 @hl8/cache 导出统一缓存接口（注意：CacheConfig 与本地配置冲突）
export {
  InMemoryCache,
  CacheKeyBuilder,
  CacheStatsCollector,
  CacheCoordinationService,
  EventDrivenCacheInvalidation,
  InvalidationRuleRegistry,
} from "@hl8/cache";
export type {
  ICache,
  CacheStats,
  CacheItemMetadata,
  CacheConfigShape,
  CacheInvalidationRule,
  GenericDomainEvent,
  InvalidationResult,
} from "@hl8/cache";

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
