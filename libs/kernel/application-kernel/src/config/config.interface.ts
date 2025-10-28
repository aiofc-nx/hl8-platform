/**
 * @fileoverview 配置接口定义
 * @description 应用层核心模块的配置接口
 */

/**
 * 应用层核心配置接口
 * @description 定义应用层核心模块的所有配置选项
 */
export interface ApplicationKernelConfig {
  /** 事件存储配置 */
  eventStore: EventStoreConfig;
  /** 事件总线配置 */
  eventBus: EventBusConfig;
  /** 缓存配置 */
  cache: CacheConfig;
  /** 监控配置 */
  monitoring: MonitoringConfig;
  /** 性能配置 */
  performance: PerformanceConfig;
  /** 日志配置 */
  logging: LoggingConfig;
}

/**
 * 事件存储配置
 */
export interface EventStoreConfig {
  /** 存储类型 */
  type: "postgresql" | "mongodb" | "hybrid";
  /** 连接配置 */
  connection: {
    host: string;
    port: number;
    database: string;
    username?: string;
    password?: string;
  };
  /** 快照配置 */
  snapshots: {
    enabled: boolean;
    interval: number; // 每多少个事件创建快照
    maxAge: number; // 快照最大保存时间（毫秒）
  };
  /** 性能配置 */
  performance: {
    batchSize: number;
    maxConcurrentOperations: number;
    timeout: number;
  };
}

/**
 * 事件总线配置
 */
export interface EventBusConfig {
  /** 消息传递保证 */
  deliveryGuarantee: "at-least-once" | "exactly-once" | "at-most-once";
  /** 重试配置 */
  retry: {
    maxAttempts: number;
    backoffMs: number;
    maxBackoffMs: number;
  };
  /** 死信队列配置 */
  deadLetterQueue: {
    enabled: boolean;
    maxRetries: number;
  };
  /** 性能配置 */
  performance: {
    maxConcurrentEvents: number;
    batchSize: number;
    timeout: number;
  };
}

/**
 * 缓存配置
 */
export interface CacheConfig {
  /** 缓存类型 */
  type: "memory" | "redis" | "hybrid";
  /** 连接配置 */
  connection?: {
    host: string;
    port: number;
    password?: string;
  };
  /** TTL配置 */
  ttl: {
    default: number; // 默认TTL（秒）
    max: number; // 最大TTL（秒）
  };
  /** 失效策略 */
  invalidation: {
    strategy: "event-based" | "time-based" | "manual";
    events: string[]; // 触发失效的事件类型
  };
  /** 性能配置 */
  performance: {
    maxSize: number;
    maxMemoryUsage: number; // 最大内存使用量（字节）
  };
}

/**
 * 监控配置
 */
export interface MonitoringConfig {
  /** 是否启用监控 */
  enabled: boolean;
  /** 指标收集配置 */
  metrics: {
    enabled: boolean;
    interval: number; // 收集间隔（毫秒）
    retention: number; // 数据保留时间（毫秒）
  };
  /** 性能监控配置 */
  performance: {
    enabled: boolean;
    slowQueryThreshold: number; // 慢查询阈值（毫秒）
    slowCommandThreshold: number; // 慢命令阈值（毫秒）
  };
  /** 内存监控配置 */
  memory: {
    enabled: boolean;
    gcThreshold: number; // GC阈值（字节）
    alertThreshold: number; // 告警阈值（字节）
  };
}

/**
 * 性能配置
 */
export interface PerformanceConfig {
  /** 并发限制 */
  concurrency: {
    maxConcurrentCommands: number;
    maxConcurrentQueries: number;
    maxConcurrentEvents: number;
  };
  /** 超时配置 */
  timeouts: {
    commandTimeout: number; // 命令超时（毫秒）
    queryTimeout: number; // 查询超时（毫秒）
    eventProcessingTimeout: number; // 事件处理超时（毫秒）
  };
  /** 批处理配置 */
  batching: {
    enabled: boolean;
    batchSize: number;
    flushInterval: number; // 刷新间隔（毫秒）
  };
}

/**
 * 日志配置
 */
export interface LoggingConfig {
  /** 日志级别 */
  level: "debug" | "info" | "warn" | "error" | "fatal";
  /** 日志格式 */
  format: "json" | "text";
  /** 结构化日志字段 */
  fields: {
    correlationId: boolean;
    userId: boolean;
    commandId: boolean;
    queryId: boolean;
    eventId: boolean;
  };
  /** 性能日志配置 */
  performance: {
    enabled: boolean;
    slowQueryThreshold: number;
    slowCommandThreshold: number;
  };
}

/**
 * 配置验证结果
 */
export interface ConfigValidationResult {
  /** 是否有效 */
  valid: boolean;
  /** 错误列表 */
  errors: string[];
  /** 警告列表 */
  warnings: string[];
}

/**
 * 配置更新回调
 */
export type ConfigUpdateCallback = (
  config: ApplicationKernelConfig,
) => void | Promise<void>;
