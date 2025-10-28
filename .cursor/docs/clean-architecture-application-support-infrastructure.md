# Clean Architecture中应用层支持基础设施层的机制

## 📋 文档概述

本文档详细阐述了在Clean Architecture架构模式中，应用层如何通过定义接口、配置规范、服务抽象和标准化协议来支持基础设施层的实现。基于hl8-platform项目中的application-kernel模块的实际实现进行分析。

## 🎯 核心概念

### Clean Architecture中应用层与基础设施层的关系

在Clean Architecture中，**应用层（Application Layer）** 作为业务用例的协调者，为**基础设施层（Infrastructure Layer）** 提供：

- **接口定义** - 定义基础设施层必须实现的标准化接口
- **配置规范** - 提供统一的配置管理和验证机制
- **服务抽象** - 定义业务服务的抽象接口
- **协议标准** - 制定数据交换和通信协议
- **监控规范** - 定义性能监控和日志记录标准

基础设施层则负责：

- **实现应用层定义的接口** - 提供具体的技术实现
- **遵循配置规范** - 按照应用层的配置标准进行配置
- **实现服务抽象** - 提供具体的业务服务实现
- **遵循协议标准** - 按照标准协议进行数据交换

## 🏗️ 应用层支持基础设施层的机制

### 1. 接口定义 (Interface Definition)

应用层通过定义接口来告诉基础设施层"必须实现什么能力"，确保基础设施层提供标准化的服务。

#### 示例：事件存储接口

```typescript
// 应用层定义：libs/kernel/application-kernel/src/events/store/event-store.interface.ts
export interface IEventStore {
  /**
   * 保存事件
   * @param aggregateId 聚合根ID
   * @param events 事件列表
   * @param expectedVersion 期望版本号，用于乐观并发控制
   * @returns 保存结果
   */
  saveEvents(aggregateId: EntityId, events: DomainEvent[], expectedVersion: number): Promise<EventStoreResult>;

  /**
   * 获取聚合根的所有事件
   * @param aggregateId 聚合根ID
   * @param fromVersion 起始版本号，可选
   * @param toVersion 结束版本号，可选
   * @returns 事件列表
   */
  getEvents(aggregateId: EntityId, fromVersion?: number, toVersion?: number): Promise<DomainEvent[]>;

  /**
   * 获取聚合根的事件流
   * @param aggregateId 聚合根ID
   * @param fromVersion 起始版本号，可选
   * @param toVersion 结束版本号，可选
   * @returns 事件流
   */
  getEventStream(aggregateId: EntityId, fromVersion?: number, toVersion?: number): Promise<EventStream>;

  /**
   * 获取所有事件
   * @param fromTimestamp 起始时间戳，可选
   * @param toTimestamp 结束时间戳，可选
   * @param limit 限制数量，可选
   * @returns 事件列表
   */
  getAllEvents(fromTimestamp?: Date, toTimestamp?: Date, limit?: number): Promise<DomainEvent[]>;

  /**
   * 获取事件快照
   * @param aggregateId 聚合根ID
   * @param version 版本号，可选，默认最新版本
   * @returns 事件快照
   */
  getSnapshot(aggregateId: EntityId, version?: number): Promise<EventSnapshot | null>;

  /**
   * 保存事件快照
   * @param snapshot 事件快照
   * @returns 保存结果
   */
  saveSnapshot(snapshot: EventSnapshot): Promise<EventStoreResult>;

  /**
   * 删除事件快照
   * @param aggregateId 聚合根ID
   * @param version 版本号，可选，默认删除所有版本
   * @returns 删除结果
   */
  deleteSnapshot(aggregateId: EntityId, version?: number): Promise<EventStoreResult>;

  /**
   * 获取聚合根的当前版本
   * @param aggregateId 聚合根ID
   * @returns 当前版本号
   */
  getCurrentVersion(aggregateId: EntityId): Promise<number>;

  /**
   * 检查聚合根是否存在
   * @param aggregateId 聚合根ID
   * @returns 是否存在
   */
  exists(aggregateId: EntityId): Promise<boolean>;

  /**
   * 获取事件统计信息
   * @param aggregateId 聚合根ID，可选
   * @returns 统计信息
   */
  getStatistics(aggregateId?: EntityId): Promise<EventStoreStatistics>;
}
```

#### 示例：缓存接口

```typescript
// 应用层定义：libs/kernel/application-kernel/src/cache/cache.interface.ts
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
  set<T>(key: string, value: T, ttl?: number, tags?: string[], metadata?: Record<string, unknown>): Promise<boolean>;

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
  setMany<T>(items: Record<string, T>, ttl?: number, tags?: string[], metadata?: Record<string, unknown>): Promise<boolean>;

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
  updateMetadata(key: string, metadata: Record<string, unknown>): Promise<boolean>;

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
```

### 2. 配置规范 (Configuration Standards)

应用层提供统一的配置管理和验证机制，为基础设施层提供标准化的配置接口。

#### 示例：应用层核心配置接口

```typescript
// 应用层定义：libs/kernel/application-kernel/src/config/config.interface.ts
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
```

#### 示例：配置验证和加载服务

```typescript
// 应用层实现：libs/kernel/application-kernel/src/config/config-loader.service.ts
export class ConfigLoaderService {
  private config: ApplicationKernelConfig | null = null;
  private readonly logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * 加载配置
   * @param source 配置源
   * @returns 配置对象
   */
  public async loadConfig(source: ConfigSource): Promise<ApplicationKernelConfig> {
    try {
      this.logger.log("开始加载应用内核配置", { source: source.type });

      // 从不同源加载配置
      const rawConfig = await this.loadFromSource(source);

      // 验证配置
      const validationResult = await this.validateConfig(rawConfig);
      if (!validationResult.valid) {
        throw new ConfigValidationException("配置验证失败", validationResult.errors, validationResult.warnings);
      }

      // 合并默认配置
      this.config = this.mergeWithDefaults(rawConfig);

      this.logger.log("应用内核配置加载成功", {
        eventStore: this.config.eventStore.type,
        cache: this.config.cache.type,
        monitoring: this.config.monitoring.enabled,
      });

      return this.config;
    } catch (error) {
      this.logger.error("配置加载失败", {
        error: error instanceof Error ? error.message : String(error),
        source: source.type,
      });
      throw error;
    }
  }

  /**
   * 获取当前配置
   * @returns 当前配置
   */
  public getConfig(): ApplicationKernelConfig {
    if (!this.config) {
      throw new Error("配置尚未加载");
    }
    return this.config;
  }

  /**
   * 验证配置
   * @param config 配置对象
   * @returns 验证结果
   */
  public async validateConfig(config: unknown): Promise<ConfigValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // 验证事件存储配置
      const eventStoreValidation = this.validateEventStoreConfig((config as any).eventStore);
      errors.push(...eventStoreValidation.errors);
      warnings.push(...eventStoreValidation.warnings);

      // 验证缓存配置
      const cacheValidation = this.validateCacheConfig((config as any).cache);
      errors.push(...cacheValidation.errors);
      warnings.push(...cacheValidation.warnings);

      // 验证监控配置
      const monitoringValidation = this.validateMonitoringConfig((config as any).monitoring);
      errors.push(...monitoringValidation.errors);
      warnings.push(...monitoringValidation.warnings);

      return {
        valid: errors.length === 0,
        errors,
        warnings,
      };
    } catch (error) {
      return {
        valid: false,
        errors: [error instanceof Error ? error.message : String(error)],
        warnings: [],
      };
    }
  }

  private validateEventStoreConfig(config: any): ConfigValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!config) {
      errors.push("事件存储配置不能为空");
      return { valid: false, errors, warnings };
    }

    if (!config.type || !["postgresql", "mongodb", "hybrid"].includes(config.type)) {
      errors.push("事件存储类型必须是 postgresql、mongodb 或 hybrid");
    }

    if (!config.connection) {
      errors.push("事件存储连接配置不能为空");
    } else {
      if (!config.connection.host) {
        errors.push("事件存储主机地址不能为空");
      }
      if (!config.connection.port || config.connection.port < 1 || config.connection.port > 65535) {
        errors.push("事件存储端口必须是1-65535之间的数字");
      }
      if (!config.connection.database) {
        errors.push("事件存储数据库名称不能为空");
      }
    }

    if (config.performance) {
      if (config.performance.batchSize < 1) {
        warnings.push("批处理大小应该大于0");
      }
      if (config.performance.maxConcurrentOperations < 1) {
        warnings.push("最大并发操作数应该大于0");
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  private validateCacheConfig(config: any): ConfigValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!config) {
      errors.push("缓存配置不能为空");
      return { valid: false, errors, warnings };
    }

    if (!config.type || !["memory", "redis", "hybrid"].includes(config.type)) {
      errors.push("缓存类型必须是 memory、redis 或 hybrid");
    }

    if (config.type === "redis" && !config.connection) {
      errors.push("Redis缓存需要连接配置");
    }

    if (config.ttl) {
      if (config.ttl.default < 1) {
        warnings.push("默认TTL应该大于0");
      }
      if (config.ttl.max < config.ttl.default) {
        warnings.push("最大TTL应该大于等于默认TTL");
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  private validateMonitoringConfig(config: any): ConfigValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!config) {
      errors.push("监控配置不能为空");
      return { valid: false, errors, warnings };
    }

    if (typeof config.enabled !== "boolean") {
      errors.push("监控启用状态必须是布尔值");
    }

    if (config.metrics && config.metrics.enabled) {
      if (!config.metrics.interval || config.metrics.interval < 1000) {
        warnings.push("指标收集间隔应该至少1000毫秒");
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }
}
```

### 3. 服务抽象 (Service Abstractions)

应用层定义业务服务的抽象接口，为基础设施层提供标准化的服务实现规范。

#### 示例：监控服务抽象

```typescript
// 应用层定义：libs/kernel/application-kernel/src/monitoring/monitoring.service.ts
export interface MonitoringConfig {
  /** 是否启用监控 */
  enabled: boolean;
  /** 指标收集间隔（毫秒） */
  collectionInterval: number;
  /** 告警检查间隔（毫秒） */
  alertCheckInterval: number;
  /** 数据保留时间（毫秒） */
  dataRetentionTime: number;
  /** 最大指标数量 */
  maxMetrics: number;
  /** 是否启用自动清理 */
  enableAutoCleanup: boolean;
  /** 清理间隔（毫秒） */
  cleanupInterval: number;
}

/**
 * 告警规则接口
 */
export interface AlertRule {
  /** 规则ID */
  id: string;
  /** 指标名称 */
  metricName: string;
  /** 条件 */
  condition: string;
  /** 阈值 */
  threshold: number;
  /** 比较操作符 */
  operator: "gt" | "gte" | "lt" | "lte" | "eq" | "ne";
  /** 持续时间（毫秒） */
  duration: number;
  /** 严重级别 */
  severity: "low" | "medium" | "high" | "critical";
  /** 是否启用 */
  enabled: boolean;
  /** 标签过滤器 */
  labels?: PerformanceMetricLabel[];
}

/**
 * 告警事件接口
 */
export interface AlertEvent {
  /** 告警ID */
  id: string;
  /** 规则ID */
  ruleId: string;
  /** 指标名称 */
  metricName: string;
  /** 当前值 */
  currentValue: number;
  /** 阈值 */
  threshold: number;
  /** 严重级别 */
  severity: string;
  /** 触发时间 */
  triggeredAt: Date;
  /** 恢复时间 */
  recoveredAt?: Date;
  /** 状态 */
  status: "active" | "recovered" | "suppressed";
  /** 标签 */
  labels: PerformanceMetricLabel[];
  /** 消息 */
  message: string;
}

/**
 * 监控服务类
 */
export class MonitoringService {
  private readonly metrics = new Map<string, PerformanceMetric>();
  private readonly alertRules = new Map<string, AlertRule>();
  private readonly activeAlerts = new Map<string, AlertEvent>();
  private readonly config: MonitoringConfig;
  private readonly logger: Logger;
  private collectionTimer?: NodeJS.Timeout;
  private alertCheckTimer?: NodeJS.Timeout;
  private cleanupTimer?: NodeJS.Timeout;

  constructor(config: MonitoringConfig, logger: Logger) {
    this.config = config;
    this.logger = logger;
  }

  /**
   * 启动监控服务
   */
  public async start(): Promise<void> {
    if (!this.config.enabled) {
      this.logger.log("监控服务已禁用");
      return;
    }

    this.logger.log("启动监控服务", {
      collectionInterval: this.config.collectionInterval,
      alertCheckInterval: this.config.alertCheckInterval,
    });

    // 启动指标收集
    this.startCollection();

    // 启动告警检查
    this.startAlertChecking();

    // 启动自动清理
    if (this.config.enableAutoCleanup) {
      this.startCleanup();
    }
  }

  /**
   * 停止监控服务
   */
  public async stop(): Promise<void> {
    this.logger.log("停止监控服务");

    if (this.collectionTimer) {
      clearInterval(this.collectionTimer);
    }
    if (this.alertCheckTimer) {
      clearInterval(this.alertCheckTimer);
    }
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
  }

  /**
   * 记录指标
   * @param metric 指标
   */
  public recordMetric(metric: PerformanceMetric): void {
    if (!this.config.enabled) {
      return;
    }

    this.metrics.set(metric.name, metric);
    this.logger.debug("记录指标", {
      name: metric.name,
      value: metric.value,
      type: metric.type,
    });
  }

  /**
   * 获取指标
   * @param name 指标名称
   * @returns 指标或undefined
   */
  public getMetric(name: string): PerformanceMetric | undefined {
    return this.metrics.get(name);
  }

  /**
   * 获取所有指标
   * @returns 指标列表
   */
  public getAllMetrics(): PerformanceMetric[] {
    return Array.from(this.metrics.values());
  }

  /**
   * 添加告警规则
   * @param rule 告警规则
   */
  public addAlertRule(rule: AlertRule): void {
    this.alertRules.set(rule.id, rule);
    this.logger.log("添加告警规则", {
      ruleId: rule.id,
      metricName: rule.metricName,
      threshold: rule.threshold,
    });
  }

  /**
   * 移除告警规则
   * @param ruleId 规则ID
   */
  public removeAlertRule(ruleId: string): void {
    this.alertRules.delete(ruleId);
    this.logger.log("移除告警规则", { ruleId });
  }

  /**
   * 获取活跃告警
   * @returns 活跃告警列表
   */
  public getActiveAlerts(): AlertEvent[] {
    return Array.from(this.activeAlerts.values()).filter((alert) => alert.status === "active");
  }

  /**
   * 获取监控统计信息
   * @returns 统计信息
   */
  public getStats(): {
    metricsCount: number;
    alertRulesCount: number;
    activeAlertsCount: number;
    uptime: number;
  } {
    return {
      metricsCount: this.metrics.size,
      alertRulesCount: this.alertRules.size,
      activeAlertsCount: this.getActiveAlerts().length,
      uptime: process.uptime() * 1000, // 转换为毫秒
    };
  }

  private startCollection(): void {
    this.collectionTimer = setInterval(() => {
      this.collectMetrics();
    }, this.config.collectionInterval);
  }

  private startAlertChecking(): void {
    this.alertCheckTimer = setInterval(() => {
      this.checkAlerts();
    }, this.config.alertCheckInterval);
  }

  private startCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanupOldData();
    }, this.config.cleanupInterval);
  }

  private collectMetrics(): void {
    // 收集系统指标
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    this.recordMetric({
      name: "memory.heap.used",
      value: memoryUsage.heapUsed,
      type: PerformanceMetricType.GAUGE,
      labels: [{ name: "unit", value: "bytes" }],
      timestamp: new Date(),
    });

    this.recordMetric({
      name: "memory.heap.total",
      value: memoryUsage.heapTotal,
      type: PerformanceMetricType.GAUGE,
      labels: [{ name: "unit", value: "bytes" }],
      timestamp: new Date(),
    });

    this.recordMetric({
      name: "cpu.user",
      value: cpuUsage.user,
      type: PerformanceMetricType.COUNTER,
      labels: [{ name: "unit", value: "microseconds" }],
      timestamp: new Date(),
    });

    this.recordMetric({
      name: "cpu.system",
      value: cpuUsage.system,
      type: PerformanceMetricType.COUNTER,
      labels: [{ name: "unit", value: "microseconds" }],
      timestamp: new Date(),
    });
  }

  private checkAlerts(): void {
    for (const rule of this.alertRules.values()) {
      if (!rule.enabled) {
        continue;
      }

      const metric = this.metrics.get(rule.metricName);
      if (!metric) {
        continue;
      }

      const shouldAlert = this.evaluateAlertCondition(metric, rule);
      if (shouldAlert) {
        this.triggerAlert(metric, rule);
      } else {
        this.recoverAlert(rule.id);
      }
    }
  }

  private evaluateAlertCondition(metric: PerformanceMetric, rule: AlertRule): boolean {
    const value = metric.value;
    const threshold = rule.threshold;

    switch (rule.operator) {
      case "gt":
        return value > threshold;
      case "gte":
        return value >= threshold;
      case "lt":
        return value < threshold;
      case "lte":
        return value <= threshold;
      case "eq":
        return value === threshold;
      case "ne":
        return value !== threshold;
      default:
        return false;
    }
  }

  private triggerAlert(metric: PerformanceMetric, rule: AlertRule): void {
    const alertId = `${rule.id}_${Date.now()}`;
    const alert: AlertEvent = {
      id: alertId,
      ruleId: rule.id,
      metricName: metric.name,
      currentValue: metric.value,
      threshold: rule.threshold,
      severity: rule.severity,
      triggeredAt: new Date(),
      status: "active",
      labels: metric.labels,
      message: `指标 ${metric.name} 当前值 ${metric.value} ${rule.operator} 阈值 ${rule.threshold}`,
    };

    this.activeAlerts.set(alertId, alert);

    this.logger.warn("触发告警", {
      alertId,
      ruleId: rule.id,
      metricName: metric.name,
      currentValue: metric.value,
      threshold: rule.threshold,
      severity: rule.severity,
    });
  }

  private recoverAlert(ruleId: string): void {
    const alert = Array.from(this.activeAlerts.values()).find((a) => a.ruleId === ruleId && a.status === "active");

    if (alert) {
      alert.status = "recovered";
      alert.recoveredAt = new Date();

      this.logger.log("告警恢复", {
        alertId: alert.id,
        ruleId: alert.ruleId,
        metricName: alert.metricName,
      });
    }
  }

  private cleanupOldData(): void {
    const now = Date.now();
    const retentionTime = this.config.dataRetentionTime;

    // 清理过期指标
    for (const [name, metric] of this.metrics.entries()) {
      if (now - metric.timestamp.getTime() > retentionTime) {
        this.metrics.delete(name);
      }
    }

    // 清理过期告警
    for (const [id, alert] of this.activeAlerts.entries()) {
      if (now - alert.triggeredAt.getTime() > retentionTime) {
        this.activeAlerts.delete(id);
      }
    }

    this.logger.debug("清理过期监控数据", {
      metricsCount: this.metrics.size,
      alertsCount: this.activeAlerts.size,
    });
  }
}
```

### 4. 协议标准 (Protocol Standards)

应用层定义数据交换和通信协议，为基础设施层提供标准化的数据格式和通信规范。

#### 示例：事件存储结果协议

```typescript
// 应用层定义：事件存储结果协议
export interface EventStoreResult {
  /** 是否成功 */
  success: boolean;
  /** 错误信息 */
  error?: string;
  /** 保存的事件数量 */
  eventsCount: number;
  /** 新版本号 */
  newVersion: number;
  /** 操作时间戳 */
  timestamp: Date;
}

/**
 * 事件流协议
 */
export interface EventStream {
  /** 聚合根ID */
  aggregateId: EntityId;
  /** 事件列表 */
  events: DomainEvent[];
  /** 起始版本号 */
  fromVersion: number;
  /** 结束版本号 */
  toVersion: number;
  /** 总事件数量 */
  totalEvents: number;
  /** 是否有更多事件 */
  hasMore: boolean;
}

/**
 * 事件快照协议
 */
export interface EventSnapshot {
  /** 聚合根ID */
  aggregateId: EntityId;
  /** 版本号 */
  version: number;
  /** 快照数据 */
  data: Record<string, unknown>;
  /** 创建时间戳 */
  timestamp: Date;
  /** 快照类型 */
  type: string;
  /** 元数据 */
  metadata: Record<string, unknown>;
}

/**
 * 事件存储统计信息协议
 */
export interface EventStoreStatistics {
  /** 总事件数量 */
  totalEvents: number;
  /** 聚合根数量 */
  aggregateCount: number;
  /** 快照数量 */
  snapshotCount: number;
  /** 存储大小（字节） */
  storageSize: number;
  /** 最后更新时间 */
  lastUpdated: Date;
  /** 按类型分组的统计 */
  byType: Record<string, number>;
  /** 按聚合根分组的统计 */
  byAggregate: Record<string, number>;
}
```

#### 示例：缓存统计协议

```typescript
// 应用层定义：缓存统计协议
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
 * 缓存项协议
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
 * 缓存失效事件协议
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
```

### 5. 模块化支持 (Modular Support)

应用层通过NestJS模块系统为基础设施层提供标准化的模块化支持。

#### 示例：应用内核模块

```typescript
// 应用层定义：libs/kernel/application-kernel/src/application-kernel.module.ts
@Module({ imports: [CqrsModule] })
export class ApplicationKernelModule {
  /**
   * 创建应用内核模块
   * @param options 模块选项
   * @returns 动态模块
   */
  static forRoot(options?: ApplicationKernelModuleOptions): DynamicModule {
    return {
      module: ApplicationKernelModule,
      imports: [CqrsModule],
      providers: [
        // 配置服务
        {
          provide: ApplicationKernelConfigService,
          useFactory: (logger: Logger) => new ApplicationKernelConfigService(logger),
          inject: [Logger],
        },
        // 日志服务
        {
          provide: Logger,
          useFactory: () => {
            const pinoLike = {
              debug: (..._args: unknown[]) => undefined,
              info: (..._args: unknown[]) => undefined,
              warn: (..._args: unknown[]) => undefined,
              error: (..._args: unknown[]) => undefined,
              fatal: (..._args: unknown[]) => undefined,
              child: () => ({
                debug: (..._args: unknown[]) => undefined,
                info: (..._args: unknown[]) => undefined,
                warn: (..._args: unknown[]) => undefined,
                error: (..._args: unknown[]) => undefined,
                fatal: (..._args: unknown[]) => undefined,
                child: () => undefined,
              }),
            } as unknown as PinoLogger;
            return new Logger(pinoLike, {} as Record<string, unknown>);
          },
        },
        // 命令查询总线
        {
          provide: CommandQueryBusImpl,
          useClass: CommandQueryBusImpl,
        },
        // 事件存储
        {
          provide: EventStore,
          useClass: EventStore,
        },
        // 事件总线
        {
          provide: EventBusImpl,
          useClass: EventBusImpl,
        },
        // 投影器注册表
        {
          provide: ProjectorRegistry,
          useFactory: (logger: Logger) => new ProjectorRegistry(logger),
          inject: [Logger],
        },
        // Saga状态管理器
        {
          provide: SagaStateManager,
          useFactory: (logger: Logger) => {
            const data = new Map<string, SagaStateSnapshot>();
            const store: ISagaStateStore = {
              async save(snapshot: SagaStateSnapshot): Promise<void> {
                data.set(snapshot.sagaId, { ...snapshot });
              },
              async getById(sagaId: string): Promise<SagaStateSnapshot | undefined> {
                return data.get(sagaId);
              },
              async getByAggregateId(aggregateId: string): Promise<SagaStateSnapshot[]> {
                return Array.from(data.values()).filter((s) => s.aggregateId === aggregateId);
              },
              async query(query: SagaStateQuery): Promise<SagaStateQueryResult> {
                let list = Array.from(data.values());
                if (query.sagaId) list = list.filter((s) => s.sagaId === query.sagaId);
                if (query.aggregateId) list = list.filter((s) => s.aggregateId === query.aggregateId);
                if (query.status) list = list.filter((s) => s.status === query.status);
                if (query.limit) list = list.slice(0, query.limit);
                if (query.offset) list = list.slice(query.offset);
                return { items: list, total: list.length };
              },
            };
            return new SagaStateManager(store, logger);
          },
          inject: [Logger],
        },
        // 缓存服务
        {
          provide: InMemoryCache,
          useFactory: (logger: Logger) => {
            const config: CacheConfig = {
              defaultTtl: 300000, // 5分钟
              maxSize: 1000,
              enableStats: true,
              enableEventInvalidation: true,
              cleanupInterval: 60000, // 1分钟
              enableCompression: false,
            };
            return new InMemoryCache(config, logger);
          },
          inject: [Logger],
        },
        // 监控服务
        {
          provide: MonitoringService,
          useFactory: (logger: Logger) => {
            const config: MonitoringConfig = {
              enabled: true,
              collectionInterval: 30000, // 30秒
              alertCheckInterval: 60000, // 1分钟
              dataRetentionTime: 86400000, // 24小时
              maxMetrics: 1000,
              enableAutoCleanup: true,
              cleanupInterval: 3600000, // 1小时
            };
            return new MonitoringService(config, logger);
          },
          inject: [Logger],
        },
      ],
      exports: [ApplicationKernelConfigService, Logger, CommandQueryBusImpl, EventStore, EventBusImpl, ProjectorRegistry, SagaStateManager, InMemoryCache, MonitoringService],
    };
  }

  /**
   * 创建异步应用内核模块
   * @param options 模块选项
   * @returns 动态模块
   */
  static forRootAsync(options: { imports?: any[]; useFactory: (...args: any[]) => Promise<ApplicationKernelModuleOptions>; inject?: any[] }): DynamicModule {
    return {
      module: ApplicationKernelModule,
      imports: [CqrsModule, ...(options.imports || [])],
      providers: [
        {
          provide: "APPLICATION_KERNEL_OPTIONS",
          useFactory: options.useFactory,
          inject: options.inject || [],
        },
        {
          provide: ApplicationKernelConfigService,
          useFactory: (logger: Logger, config: ApplicationKernelModuleOptions) => new ApplicationKernelConfigService(logger, config),
          inject: [Logger, "APPLICATION_KERNEL_OPTIONS"],
        },
        // ... 其他提供者
      ],
      exports: [ApplicationKernelConfigService, Logger, CommandQueryBusImpl, EventStore, EventBusImpl, ProjectorRegistry, SagaStateManager, InMemoryCache, MonitoringService],
    };
  }
}
```

## 🔄 基础设施层如何利用应用层的支持

### 1. 实现应用层定义的接口

基础设施层必须实现应用层定义的接口，遵循"契约"。

```typescript
// 基础设施层实现：PostgreSQL事件存储
@Injectable()
export class PostgreSQLEventStore implements IEventStore {
  constructor(
    private readonly dataSource: DataSource,
    private readonly logger: Logger,
  ) {}

  async saveEvents(aggregateId: EntityId, events: DomainEvent[], expectedVersion: number): Promise<EventStoreResult> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 检查当前版本
      const currentVersion = await this.getCurrentVersion(aggregateId);
      if (currentVersion !== expectedVersion) {
        return {
          success: false,
          error: `Version conflict: expected ${expectedVersion}, got ${currentVersion}`,
          eventsCount: 0,
          newVersion: currentVersion,
          timestamp: new Date(),
        };
      }

      // 保存事件
      const newVersion = currentVersion + events.length;
      for (let i = 0; i < events.length; i++) {
        const event = events[i];
        await queryRunner.query(
          `INSERT INTO domain_events (id, aggregate_id, event_type, data, metadata, version, created_at) 
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [event.eventId.toString(), aggregateId.toString(), event.eventType, JSON.stringify(event.data), JSON.stringify(event.metadata), currentVersion + i + 1, event.timestamp],
        );
      }

      await queryRunner.commitTransaction();

      this.logger.log("事件保存成功", {
        aggregateId: aggregateId.toString(),
        eventsCount: events.length,
        newVersion,
      });

      return {
        success: true,
        eventsCount: events.length,
        newVersion,
        timestamp: new Date(),
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error("事件保存失败", {
        error: error instanceof Error ? error.message : String(error),
        aggregateId: aggregateId.toString(),
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        eventsCount: 0,
        newVersion: expectedVersion,
        timestamp: new Date(),
      };
    } finally {
      await queryRunner.release();
    }
  }

  async getEvents(aggregateId: EntityId, fromVersion?: number, toVersion?: number): Promise<DomainEvent[]> {
    let query = `
      SELECT id, event_type, data, metadata, version, created_at
      FROM domain_events
      WHERE aggregate_id = $1
    `;
    const params: any[] = [aggregateId.toString()];

    if (fromVersion !== undefined) {
      query += ` AND version >= $${params.length + 1}`;
      params.push(fromVersion);
    }

    if (toVersion !== undefined) {
      query += ` AND version <= $${params.length + 1}`;
      params.push(toVersion);
    }

    query += ` ORDER BY version ASC`;

    const rows = await this.dataSource.query(query, params);

    return rows.map((row) => new DomainEvent(aggregateId, row.event_type, JSON.parse(row.data), JSON.parse(row.metadata), new EntityId(row.id), new Date(row.created_at), row.version));
  }

  // 实现其他接口方法...
}
```

### 2. 遵循应用层的配置规范

基础设施层必须按照应用层的配置标准进行配置。

```typescript
// 基础设施层实现：Redis缓存
@Injectable()
export class RedisCache implements ICache {
  private readonly redis: Redis;
  private readonly config: CacheConfig;
  private readonly stats: CacheStats;

  constructor(config: CacheConfig, logger: Logger) {
    this.config = config;
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      cleanups: 0,
      currentSize: 0,
      maxSize: config.maxSize,
      hitRate: 0,
      lastUpdated: new Date(),
    };

    // 根据应用层配置创建Redis连接
    this.redis = new Redis({
      host: config.connection?.host || "localhost",
      port: config.connection?.port || 6379,
      password: config.connection?.password,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
    });

    // 启动清理任务
    if (config.cleanupInterval > 0) {
      setInterval(() => this.cleanup(), config.cleanupInterval);
    }
  }

  async get<T>(key: string): Promise<T | undefined> {
    try {
      const value = await this.redis.get(key);
      if (value === null) {
        this.stats.misses++;
        this.updateHitRate();
        return undefined;
      }

      this.stats.hits++;
      this.updateHitRate();

      const item: CacheItem<T> = JSON.parse(value);

      // 检查是否过期
      if (item.expiresAt && new Date() > item.expiresAt) {
        await this.delete(key);
        this.stats.misses++;
        this.updateHitRate();
        return undefined;
      }

      // 更新访问信息
      item.lastAccessedAt = new Date();
      item.accessCount++;
      await this.redis.set(key, JSON.stringify(item));

      return item.value;
    } catch (error) {
      this.logger.error("缓存获取失败", {
        key,
        error: error instanceof Error ? error.message : String(error),
      });
      return undefined;
    }
  }

  async set<T>(key: string, value: T, ttl?: number, tags?: string[], metadata?: Record<string, unknown>): Promise<boolean> {
    try {
      const item: CacheItem<T> = {
        value,
        expiresAt: ttl ? new Date(Date.now() + ttl) : new Date(Date.now() + this.config.defaultTtl),
        createdAt: new Date(),
        lastAccessedAt: new Date(),
        accessCount: 0,
        tags: tags || [],
        metadata: metadata || {},
      };

      const serialized = JSON.stringify(item);
      await this.redis.set(key, serialized, "PX", ttl || this.config.defaultTtl);

      this.stats.sets++;
      this.stats.currentSize++;
      this.stats.lastUpdated = new Date();

      return true;
    } catch (error) {
      this.logger.error("缓存设置失败", {
        key,
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  // 实现其他接口方法...

  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? this.stats.hits / total : 0;
    this.stats.lastUpdated = new Date();
  }
}
```

### 3. 实现应用层定义的服务抽象

基础设施层实现应用层定义的服务抽象。

```typescript
// 基础设施层实现：Prometheus监控服务
@Injectable()
export class PrometheusMonitoringService extends MonitoringService {
  private readonly prometheusRegistry: Registry;
  private readonly metrics: Map<string, Metric>;

  constructor(config: MonitoringConfig, logger: Logger) {
    super(config, logger);
    this.prometheusRegistry = new Registry();
    this.metrics = new Map();
  }

  async start(): Promise<void> {
    await super.start();

    // 注册Prometheus指标
    this.registerPrometheusMetrics();

    this.logger.log("Prometheus监控服务已启动");
  }

  recordMetric(metric: PerformanceMetric): void {
    super.recordMetric(metric);

    // 转换为Prometheus指标
    const prometheusMetric = this.getOrCreatePrometheusMetric(metric);
    if (prometheusMetric) {
      this.updatePrometheusMetric(prometheusMetric, metric);
    }
  }

  private registerPrometheusMetrics(): void {
    // 注册内存指标
    const memoryUsedGauge = new Gauge({
      name: "memory_heap_used_bytes",
      help: "Used heap memory in bytes",
      registers: [this.prometheusRegistry],
    });
    this.metrics.set("memory.heap.used", memoryUsedGauge);

    const memoryTotalGauge = new Gauge({
      name: "memory_heap_total_bytes",
      help: "Total heap memory in bytes",
      registers: [this.prometheusRegistry],
    });
    this.metrics.set("memory.heap.total", memoryTotalGauge);

    // 注册CPU指标
    const cpuUserCounter = new Counter({
      name: "cpu_user_microseconds_total",
      help: "Total user CPU time in microseconds",
      registers: [this.prometheusRegistry],
    });
    this.metrics.set("cpu.user", cpuUserCounter);

    const cpuSystemCounter = new Counter({
      name: "cpu_system_microseconds_total",
      help: "Total system CPU time in microseconds",
      registers: [this.prometheusRegistry],
    });
    this.metrics.set("cpu.system", cpuSystemCounter);
  }

  private getOrCreatePrometheusMetric(metric: PerformanceMetric): Metric | undefined {
    return this.metrics.get(metric.name);
  }

  private updatePrometheusMetric(prometheusMetric: Metric, metric: PerformanceMetric): void {
    if (prometheusMetric instanceof Gauge) {
      prometheusMetric.set(metric.value);
    } else if (prometheusMetric instanceof Counter) {
      prometheusMetric.inc(metric.value);
    } else if (prometheusMetric instanceof Histogram) {
      prometheusMetric.observe(metric.value);
    }
  }

  /**
   * 获取Prometheus指标
   * @returns Prometheus指标字符串
   */
  public async getPrometheusMetrics(): Promise<string> {
    return this.prometheusRegistry.metrics();
  }
}
```

## 🎯 支持机制的优势

### 1. 标准化和一致性

- **统一的接口契约** - 所有基础设施实现都遵循相同的接口
- **一致的配置规范** - 使用统一的配置管理和验证机制
- **标准化的协议** - 数据交换和通信遵循统一协议

### 2. 灵活性和可扩展性

- **多实现支持** - 可以轻松替换不同的基础设施实现
- **配置驱动** - 通过配置控制基础设施行为
- **模块化设计** - 支持按需加载和组合

### 3. 可测试性和可维护性

- **接口契约作为测试规范** - 可以基于接口创建测试用例
- **配置验证** - 确保配置的正确性和一致性
- **清晰的职责分离** - 应用层定义规范，基础设施层实现

### 4. 监控和可观测性

- **统一的监控接口** - 所有基础设施都提供标准化的监控数据
- **性能指标收集** - 自动收集和报告性能指标
- **告警机制** - 统一的告警规则和事件处理

## 📊 架构层次关系图

```
┌─────────────────────────────────────────────────────────────┐
│                    基础设施层 (Infrastructure)                │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐  │
│  │   PostgreSQL    │  │    MongoDB      │  │   Redis      │  │
│  │   EventStore    │  │   EventStore    │  │   Cache      │  │
│  └─────────────────┘  └─────────────────┘  └──────────────┘  │
│           │                    │                    │        │
│           └────────────────────┼────────────────────┘        │
│                                │                             │
│          实现应用层定义的接口     │                             │
│          遵循应用层的配置规范     │                             │
│          使用应用层的协议标准     │                             │
└─────────────────────────────────┼─────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────┐
│                    应用层 (Application)                      │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐  │
│  │   接口定义       │  │   配置规范       │  │   服务抽象    │  │
│  │  IEventStore    │  │ ConfigInterface │  │ Monitoring   │  │
│  │  ICache         │  │ ConfigLoader    │  │ Service      │  │
│  └─────────────────┘  └─────────────────┘  └──────────────┘  │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐  │
│  │   协议标准       │  │   模块化支持     │  │   监控规范    │  │
│  │ EventStoreResult│  │ NestJS Module   │  │ Performance  │  │
│  │ CacheStats      │  │ DynamicModule   │  │ Metrics      │  │
│  └─────────────────┘  └─────────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## 📋 最佳实践

### 1. 接口设计原则

- **单一职责** - 每个接口只负责一个特定的功能领域
- **最小化接口** - 只定义必要的方法，避免过度设计
- **清晰的命名** - 使用清晰、描述性的方法名
- **完整的文档** - 为每个方法提供详细的TSDoc注释

### 2. 配置管理原则

- **类型安全** - 使用TypeScript接口定义配置结构
- **验证机制** - 提供配置验证和错误报告
- **默认值** - 为所有配置项提供合理的默认值
- **环境适配** - 支持不同环境的配置

### 3. 协议设计原则

- **标准化** - 使用行业标准的数据格式和协议
- **版本管理** - 支持协议版本演进
- **向后兼容** - 确保新版本向后兼容
- **文档化** - 提供完整的协议文档

### 4. 模块化设计原则

- **松耦合** - 模块间依赖最小化
- **高内聚** - 模块内部功能相关性强
- **可测试** - 支持单元测试和集成测试
- **可扩展** - 支持功能扩展和定制

## 🎯 总结

Clean Architecture中应用层通过以下机制支持基础设施层：

1. **接口定义** - 定义基础设施层必须实现的标准化接口
2. **配置规范** - 提供统一的配置管理和验证机制
3. **服务抽象** - 定义业务服务的抽象接口
4. **协议标准** - 制定数据交换和通信协议
5. **模块化支持** - 通过NestJS模块系统提供标准化支持

这种设计确保了：

- ✅ **标准化和一致性** - 所有基础设施实现都遵循相同的规范
- ✅ **灵活性和可扩展性** - 可以轻松替换和扩展基础设施实现
- ✅ **可测试性和可维护性** - 清晰的职责分离便于测试和维护
- ✅ **监控和可观测性** - 统一的监控和性能指标收集

通过这种机制，我们能够构建出既灵活又稳定的企业级应用架构，为hl8-platform项目提供了坚实的基础设施支撑。
