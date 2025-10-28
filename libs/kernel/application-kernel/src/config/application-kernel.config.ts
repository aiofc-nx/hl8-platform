/**
 * @fileoverview 应用层核心配置实现
 * @description 应用层核心模块的配置管理和验证
 */

import { Injectable } from "@nestjs/common";
import { Logger, InjectPinoLogger } from "@hl8/logger";
import {
  ApplicationKernelConfig,
  ConfigValidationResult,
  ConfigUpdateCallback,
  EventStoreConfig,
  EventBusConfig,
  CacheConfig,
  MonitoringConfig,
  PerformanceConfig,
  LoggingConfig,
} from "./config.interface.js";

/**
 * 应用层核心配置服务
 * @description 管理应用层核心模块的配置
 */
@Injectable()
export class ApplicationKernelConfigService {
  private config: ApplicationKernelConfig;
  private updateCallbacks: ConfigUpdateCallback[] = [];

  constructor(
    @InjectPinoLogger(ApplicationKernelConfigService.name)
    private readonly logger: Logger,
  ) {
    this.config = this.loadDefaultConfig();
  }

  /**
   * 获取当前配置
   * @returns 当前配置
   */
  public getConfig(): ApplicationKernelConfig {
    return { ...this.config };
  }

  /**
   * 更新配置
   * @param newConfig 新配置
   * @returns 配置验证结果
   */
  public async updateConfig(
    newConfig: Partial<ApplicationKernelConfig>,
  ): Promise<ConfigValidationResult> {
    const validationResult = this.validateConfig(newConfig);

    if (!validationResult.valid) {
      this.logger.error("配置验证失败", { errors: validationResult.errors });
      return validationResult;
    }

    // 合并配置
    this.config = {
      ...this.config,
      ...newConfig,
    };

    // 通知所有回调
    await this.notifyConfigUpdate();

    this.logger.log("配置更新成功");
    return validationResult;
  }

  /**
   * 注册配置更新回调
   * @param callback 回调函数
   */
  public onConfigUpdate(callback: ConfigUpdateCallback): void {
    this.updateCallbacks.push(callback);
  }

  /**
   * 验证配置
   * @param config 配置对象
   * @returns 验证结果
   */
  public validateConfig(
    config: Partial<ApplicationKernelConfig>,
  ): ConfigValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 验证事件存储配置
    if (config.eventStore) {
      this.validateEventStoreConfig(config.eventStore, errors, warnings);
    }

    // 验证事件总线配置
    if (config.eventBus) {
      this.validateEventBusConfig(config.eventBus, errors, warnings);
    }

    // 验证缓存配置
    if (config.cache) {
      this.validateCacheConfig(config.cache, errors, warnings);
    }

    // 验证监控配置
    if (config.monitoring) {
      this.validateMonitoringConfig(config.monitoring, errors, warnings);
    }

    // 验证性能配置
    if (config.performance) {
      this.validatePerformanceConfig(config.performance, errors, warnings);
    }

    // 验证日志配置
    if (config.logging) {
      this.validateLoggingConfig(config.logging, errors, warnings);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * 从环境变量加载配置
   */
  private loadConfigFromEnvironment(): void {
    // 暂时简化，后续可以集成 @hl8/config
    // 这里可以从环境变量或配置文件加载配置
  }

  /**
   * 加载默认配置
   * @returns 默认配置
   */
  private loadDefaultConfig(): ApplicationKernelConfig {
    return {
      eventStore: {
        type: "hybrid",
        connection: {
          host: "localhost",
          port: 5432,
          database: "hl8_events",
        },
        snapshots: {
          enabled: true,
          interval: 100,
          maxAge: 30 * 24 * 60 * 60 * 1000, // 30天
        },
        performance: {
          batchSize: 100,
          maxConcurrentOperations: 10,
          timeout: 5000,
        },
      },
      eventBus: {
        deliveryGuarantee: "at-least-once",
        retry: {
          maxAttempts: 3,
          backoffMs: 1000,
          maxBackoffMs: 10000,
        },
        deadLetterQueue: {
          enabled: true,
          maxRetries: 5,
        },
        performance: {
          maxConcurrentEvents: 100,
          batchSize: 50,
          timeout: 3000,
        },
      },
      cache: {
        type: "memory",
        ttl: {
          default: 300, // 5分钟
          max: 3600, // 1小时
        },
        invalidation: {
          strategy: "event-based",
          events: ["UserCreated", "UserUpdated", "UserDeleted"],
        },
        performance: {
          maxSize: 1000,
          maxMemoryUsage: 100 * 1024 * 1024, // 100MB
        },
      },
      monitoring: {
        enabled: true,
        metrics: {
          enabled: true,
          interval: 1000,
          retention: 24 * 60 * 60 * 1000, // 24小时
        },
        performance: {
          enabled: true,
          slowQueryThreshold: 1000,
          slowCommandThreshold: 2000,
        },
        memory: {
          enabled: true,
          gcThreshold: 100 * 1024 * 1024, // 100MB
          alertThreshold: 500 * 1024 * 1024, // 500MB
        },
      },
      performance: {
        concurrency: {
          maxConcurrentCommands: 100,
          maxConcurrentQueries: 200,
          maxConcurrentEvents: 500,
        },
        timeouts: {
          commandTimeout: 5000,
          queryTimeout: 1000,
          eventProcessingTimeout: 2000,
        },
        batching: {
          enabled: true,
          batchSize: 50,
          flushInterval: 100,
        },
      },
      logging: {
        level: "info",
        format: "json",
        fields: {
          correlationId: true,
          userId: true,
          commandId: true,
          queryId: true,
          eventId: true,
        },
        performance: {
          enabled: true,
          slowQueryThreshold: 1000,
          slowCommandThreshold: 2000,
        },
      },
    };
  }

  /**
   * 验证事件存储配置
   */
  private validateEventStoreConfig(
    config: EventStoreConfig,
    errors: string[],
    _warnings: string[],
  ): void {
    if (
      !config.type ||
      !["postgresql", "mongodb", "hybrid"].includes(config.type)
    ) {
      errors.push("事件存储类型必须是 postgresql、mongodb 或 hybrid");
    }

    if (!config.connection?.host) {
      errors.push("事件存储主机地址不能为空");
    }

    if (!config.connection?.port || config.connection.port <= 0) {
      errors.push("事件存储端口必须是正整数");
    }

    if (!config.connection?.database) {
      errors.push("事件存储数据库名称不能为空");
    }

    if (config.snapshots?.interval && config.snapshots.interval <= 0) {
      errors.push("快照间隔必须是正整数");
    }
  }

  /**
   * 验证事件总线配置
   */
  private validateEventBusConfig(
    config: EventBusConfig,
    errors: string[],
    _warnings: string[],
  ): void {
    if (
      !config.deliveryGuarantee ||
      !["at-least-once", "exactly-once", "at-most-once"].includes(
        config.deliveryGuarantee,
      )
    ) {
      errors.push(
        "事件总线传递保证必须是 at-least-once、exactly-once 或 at-most-once",
      );
    }

    if (config.retry?.maxAttempts && config.retry.maxAttempts <= 0) {
      errors.push("重试最大次数必须是正整数");
    }
  }

  /**
   * 验证缓存配置
   */
  private validateCacheConfig(
    config: CacheConfig,
    errors: string[],
    _warnings: string[],
  ): void {
    if (!config.type || !["memory", "redis", "hybrid"].includes(config.type)) {
      errors.push("缓存类型必须是 memory、redis 或 hybrid");
    }

    if (config.ttl?.default && config.ttl.default <= 0) {
      errors.push("缓存默认TTL必须是正整数");
    }
  }

  /**
   * 验证监控配置
   */
  private validateMonitoringConfig(
    config: MonitoringConfig,
    errors: string[],
    _warnings: string[],
  ): void {
    if (config.metrics?.interval && config.metrics.interval <= 0) {
      errors.push("指标收集间隔必须是正整数");
    }
  }

  /**
   * 验证性能配置
   */
  private validatePerformanceConfig(
    config: PerformanceConfig,
    errors: string[],
    _warnings: string[],
  ): void {
    if (
      config.concurrency?.maxConcurrentCommands &&
      config.concurrency.maxConcurrentCommands <= 0
    ) {
      errors.push("最大并发命令数必须是正整数");
    }

    if (
      config.timeouts?.commandTimeout &&
      config.timeouts.commandTimeout <= 0
    ) {
      errors.push("命令超时时间必须是正整数");
    }
  }

  /**
   * 验证日志配置
   */
  private validateLoggingConfig(
    config: LoggingConfig,
    errors: string[],
    _warnings: string[],
  ): void {
    if (
      !config.level ||
      !["debug", "info", "warn", "error", "fatal"].includes(config.level)
    ) {
      errors.push("日志级别必须是 debug、info、warn、error 或 fatal");
    }

    if (!config.format || !["json", "text"].includes(config.format)) {
      errors.push("日志格式必须是 json 或 text");
    }
  }

  /**
   * 通知配置更新
   */
  private async notifyConfigUpdate(): Promise<void> {
    for (const callback of this.updateCallbacks) {
      try {
        await callback(this.config);
      } catch (error) {
        this.logger.error("配置更新回调执行失败", {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }
}
