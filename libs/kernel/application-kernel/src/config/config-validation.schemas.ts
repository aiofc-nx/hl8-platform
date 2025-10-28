/**
 * @fileoverview 配置验证模式
 * @description 使用class-validator定义配置验证规则
 */

import {
  IsString,
  IsNumber,
  IsBoolean,
  IsOptional,
  IsEnum,
  IsArray,
  ValidateNested,
  Min,
  Max,
  IsObject,
  IsNotEmpty,
} from "class-validator";
import { Type } from "class-transformer";

/**
 * 事件存储配置验证模式
 */
export class EventStoreConfigSchema {
  @IsEnum(["postgresql", "mongodb", "hybrid"])
  @IsNotEmpty()
  type!: "postgresql" | "mongodb" | "hybrid";

  @ValidateNested()
  @Type(() => EventStoreConnectionSchema)
  @IsObject()
  connection!: EventStoreConnectionSchema;

  @ValidateNested()
  @Type(() => EventStoreSnapshotsSchema)
  @IsOptional()
  snapshots?: EventStoreSnapshotsSchema;

  @ValidateNested()
  @Type(() => EventStorePerformanceSchema)
  @IsOptional()
  performance?: EventStorePerformanceSchema;
}

/**
 * 事件存储连接配置验证模式
 */
export class EventStoreConnectionSchema {
  @IsString()
  @IsNotEmpty()
  host!: string;

  @IsNumber()
  @Min(1)
  @Max(65535)
  port!: number;

  @IsString()
  @IsNotEmpty()
  database!: string;

  @IsString()
  @IsOptional()
  username?: string;

  @IsString()
  @IsOptional()
  password?: string;
}

/**
 * 事件存储快照配置验证模式
 */
export class EventStoreSnapshotsSchema {
  @IsBoolean()
  enabled!: boolean;

  @IsNumber()
  @Min(1)
  @Max(10000)
  interval!: number;

  @IsNumber()
  @Min(1000)
  maxAge!: number;
}

/**
 * 事件存储性能配置验证模式
 */
export class EventStorePerformanceSchema {
  @IsNumber()
  @Min(1)
  @Max(10000)
  batchSize!: number;

  @IsNumber()
  @Min(1)
  @Max(1000)
  maxConcurrentOperations!: number;

  @IsNumber()
  @Min(1000)
  @Max(60000)
  timeout!: number;
}

/**
 * 事件总线配置验证模式
 */
export class EventBusConfigSchema {
  @IsEnum(["at-least-once", "exactly-once", "at-most-once"])
  @IsNotEmpty()
  deliveryGuarantee!: "at-least-once" | "exactly-once" | "at-most-once";

  @ValidateNested()
  @Type(() => EventBusRetrySchema)
  @IsOptional()
  retry?: EventBusRetrySchema;

  @ValidateNested()
  @Type(() => EventBusDeadLetterQueueSchema)
  @IsOptional()
  deadLetterQueue?: EventBusDeadLetterQueueSchema;

  @ValidateNested()
  @Type(() => EventBusPerformanceSchema)
  @IsOptional()
  performance?: EventBusPerformanceSchema;
}

/**
 * 事件总线重试配置验证模式
 */
export class EventBusRetrySchema {
  @IsNumber()
  @Min(1)
  @Max(10)
  maxAttempts!: number;

  @IsNumber()
  @Min(100)
  @Max(60000)
  backoffMs!: number;

  @IsNumber()
  @Min(1000)
  @Max(300000)
  maxBackoffMs!: number;
}

/**
 * 事件总线死信队列配置验证模式
 */
export class EventBusDeadLetterQueueSchema {
  @IsBoolean()
  enabled!: boolean;

  @IsNumber()
  @Min(1)
  @Max(100)
  maxRetries!: number;
}

/**
 * 事件总线性能配置验证模式
 */
export class EventBusPerformanceSchema {
  @IsNumber()
  @Min(1)
  @Max(10000)
  maxConcurrentEvents!: number;

  @IsNumber()
  @Min(1)
  @Max(10000)
  batchSize!: number;

  @IsNumber()
  @Min(1000)
  @Max(60000)
  timeout!: number;
}

/**
 * 缓存配置验证模式
 */
export class CacheConfigSchema {
  @IsEnum(["memory", "redis", "hybrid"])
  @IsNotEmpty()
  type!: "memory" | "redis" | "hybrid";

  @ValidateNested()
  @Type(() => CacheConnectionSchema)
  @IsOptional()
  connection?: CacheConnectionSchema;

  @ValidateNested()
  @Type(() => CacheTtlSchema)
  @IsObject()
  ttl!: CacheTtlSchema;

  @ValidateNested()
  @Type(() => CacheInvalidationSchema)
  @IsObject()
  invalidation!: CacheInvalidationSchema;

  @ValidateNested()
  @Type(() => CachePerformanceSchema)
  @IsObject()
  performance!: CachePerformanceSchema;
}

/**
 * 缓存连接配置验证模式
 */
export class CacheConnectionSchema {
  @IsString()
  @IsNotEmpty()
  host!: string;

  @IsNumber()
  @Min(1)
  @Max(65535)
  port!: number;

  @IsString()
  @IsOptional()
  password?: string;
}

/**
 * 缓存TTL配置验证模式
 */
export class CacheTtlSchema {
  @IsNumber()
  @Min(1)
  @Max(86400)
  default!: number;

  @IsNumber()
  @Min(1)
  @Max(86400)
  max!: number;
}

/**
 * 缓存失效配置验证模式
 */
export class CacheInvalidationSchema {
  @IsEnum(["event-based", "time-based", "manual"])
  @IsNotEmpty()
  strategy!: "event-based" | "time-based" | "manual";

  @IsArray()
  @IsString({ each: true })
  events!: string[];
}

/**
 * 缓存性能配置验证模式
 */
export class CachePerformanceSchema {
  @IsNumber()
  @Min(1)
  @Max(1000000)
  maxSize!: number;

  @IsNumber()
  @Min(1024 * 1024)
  @Max(10 * 1024 * 1024 * 1024)
  maxMemoryUsage!: number;
}

/**
 * 监控配置验证模式
 */
export class MonitoringConfigSchema {
  @IsBoolean()
  enabled!: boolean;

  @ValidateNested()
  @Type(() => MonitoringMetricsSchema)
  @IsOptional()
  metrics?: MonitoringMetricsSchema;

  @ValidateNested()
  @Type(() => MonitoringPerformanceSchema)
  @IsOptional()
  performance?: MonitoringPerformanceSchema;

  @ValidateNested()
  @Type(() => MonitoringMemorySchema)
  @IsOptional()
  memory?: MonitoringMemorySchema;
}

/**
 * 监控指标配置验证模式
 */
export class MonitoringMetricsSchema {
  @IsBoolean()
  enabled!: boolean;

  @IsNumber()
  @Min(100)
  @Max(60000)
  interval!: number;

  @IsNumber()
  @Min(60000)
  @Max(30 * 24 * 60 * 60 * 1000)
  retention!: number;
}

/**
 * 监控性能配置验证模式
 */
export class MonitoringPerformanceSchema {
  @IsBoolean()
  enabled!: boolean;

  @IsNumber()
  @Min(100)
  @Max(60000)
  slowQueryThreshold!: number;

  @IsNumber()
  @Min(100)
  @Max(60000)
  slowCommandThreshold!: number;
}

/**
 * 监控内存配置验证模式
 */
export class MonitoringMemorySchema {
  @IsBoolean()
  enabled!: boolean;

  @IsNumber()
  @Min(1024 * 1024)
  @Max(10 * 1024 * 1024 * 1024)
  gcThreshold!: number;

  @IsNumber()
  @Min(1024 * 1024)
  @Max(10 * 1024 * 1024 * 1024)
  alertThreshold!: number;
}

/**
 * 性能配置验证模式
 */
export class PerformanceConfigSchema {
  @ValidateNested()
  @Type(() => PerformanceConcurrencySchema)
  @IsObject()
  concurrency!: PerformanceConcurrencySchema;

  @ValidateNested()
  @Type(() => PerformanceTimeoutsSchema)
  @IsObject()
  timeouts!: PerformanceTimeoutsSchema;

  @ValidateNested()
  @Type(() => PerformanceBatchingSchema)
  @IsObject()
  batching!: PerformanceBatchingSchema;
}

/**
 * 性能并发配置验证模式
 */
export class PerformanceConcurrencySchema {
  @IsNumber()
  @Min(1)
  @Max(10000)
  maxConcurrentCommands!: number;

  @IsNumber()
  @Min(1)
  @Max(10000)
  maxConcurrentQueries!: number;

  @IsNumber()
  @Min(1)
  @Max(10000)
  maxConcurrentEvents!: number;
}

/**
 * 性能超时配置验证模式
 */
export class PerformanceTimeoutsSchema {
  @IsNumber()
  @Min(1000)
  @Max(60000)
  commandTimeout!: number;

  @IsNumber()
  @Min(100)
  @Max(30000)
  queryTimeout!: number;

  @IsNumber()
  @Min(1000)
  @Max(30000)
  eventProcessingTimeout!: number;
}

/**
 * 性能批处理配置验证模式
 */
export class PerformanceBatchingSchema {
  @IsBoolean()
  enabled!: boolean;

  @IsNumber()
  @Min(1)
  @Max(10000)
  batchSize!: number;

  @IsNumber()
  @Min(10)
  @Max(60000)
  flushInterval!: number;
}

/**
 * 日志配置验证模式
 */
export class LoggingConfigSchema {
  @IsEnum(["debug", "info", "warn", "error", "fatal"])
  @IsNotEmpty()
  level!: "debug" | "info" | "warn" | "error" | "fatal";

  @IsEnum(["json", "text"])
  @IsNotEmpty()
  format!: "json" | "text";

  @ValidateNested()
  @Type(() => LoggingFieldsSchema)
  @IsObject()
  fields!: LoggingFieldsSchema;

  @ValidateNested()
  @Type(() => LoggingPerformanceSchema)
  @IsObject()
  performance!: LoggingPerformanceSchema;
}

/**
 * 日志字段配置验证模式
 */
export class LoggingFieldsSchema {
  @IsBoolean()
  correlationId!: boolean;

  @IsBoolean()
  userId!: boolean;

  @IsBoolean()
  commandId!: boolean;

  @IsBoolean()
  queryId!: boolean;

  @IsBoolean()
  eventId!: boolean;
}

/**
 * 日志性能配置验证模式
 */
export class LoggingPerformanceSchema {
  @IsBoolean()
  enabled!: boolean;

  @IsNumber()
  @Min(100)
  @Max(60000)
  slowQueryThreshold!: number;

  @IsNumber()
  @Min(100)
  @Max(60000)
  slowCommandThreshold!: number;
}

/**
 * 应用层核心配置验证模式
 */
export class ApplicationKernelConfigSchema {
  @ValidateNested()
  @Type(() => EventStoreConfigSchema)
  @IsObject()
  eventStore!: EventStoreConfigSchema;

  @ValidateNested()
  @Type(() => EventBusConfigSchema)
  @IsObject()
  eventBus!: EventBusConfigSchema;

  @ValidateNested()
  @Type(() => CacheConfigSchema)
  @IsObject()
  cache!: CacheConfigSchema;

  @ValidateNested()
  @Type(() => MonitoringConfigSchema)
  @IsObject()
  monitoring!: MonitoringConfigSchema;

  @ValidateNested()
  @Type(() => PerformanceConfigSchema)
  @IsObject()
  performance!: PerformanceConfigSchema;

  @ValidateNested()
  @Type(() => LoggingConfigSchema)
  @IsObject()
  logging!: LoggingConfigSchema;
}
