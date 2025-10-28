/**
 * @fileoverview 配置加载服务
 * @description 负责从环境变量和配置文件加载配置
 */

import { Logger } from "@hl8/logger";
import { plainToClass } from "class-transformer";
import { validate, ValidationError } from "class-validator";
import {
  ApplicationKernelConfig,
  ConfigValidationResult,
} from "./config.interface.js";
import { ApplicationKernelConfigSchema } from "./config-validation.schemas.js";

/**
 * 配置加载服务
 * @description 负责从各种源加载和验证配置
 */
export class ConfigLoaderService {
  constructor(private readonly logger: Logger) {}

  /**
   * 从环境变量加载配置
   * @returns 配置对象
   */
  public async loadFromEnvironment(): Promise<ApplicationKernelConfig> {
    this.logger.debug("开始从环境变量加载配置");

    const config = {
      eventStore: this.loadEventStoreFromEnv(),
      eventBus: this.loadEventBusFromEnv(),
      cache: this.loadCacheFromEnv(),
      monitoring: this.loadMonitoringFromEnv(),
      performance: this.loadPerformanceFromEnv(),
      logging: this.loadLoggingFromEnv(),
    };

    this.logger.debug("环境变量配置加载完成", { config });
    return config;
  }

  /**
   * 从配置文件加载配置
   * @param configPath 配置文件路径
   * @returns 配置对象
   */
  public async loadFromFile(
    configPath: string,
  ): Promise<ApplicationKernelConfig> {
    this.logger.debug("开始从配置文件加载配置", { configPath });

    try {
      // 这里可以支持 JSON、YAML 等格式
      // 暂时简化实现
      const configData = await this.readConfigFile(configPath);
      const config = JSON.parse(configData);

      this.logger.debug("配置文件加载完成", { configPath });
      return config;
    } catch (error) {
      this.logger.error("配置文件加载失败", {
        configPath,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * 验证配置对象
   * @param config 配置对象
   * @returns 验证结果
   */
  public async validateConfig(
    config: ApplicationKernelConfig,
  ): Promise<ConfigValidationResult> {
    this.logger.debug("开始验证配置");

    try {
      // 转换为验证模式
      const configSchema = plainToClass(ApplicationKernelConfigSchema, config);

      // 执行验证
      const errors = await validate(configSchema);

      if (errors.length === 0) {
        this.logger.debug("配置验证通过");
        return {
          valid: true,
          errors: [],
          warnings: [],
        };
      }

      // 处理验证错误
      const errorMessages = this.formatValidationErrors(errors);
      this.logger.warn("配置验证失败", { errors: errorMessages });

      return {
        valid: false,
        errors: errorMessages,
        warnings: [],
      };
    } catch (error) {
      this.logger.error("配置验证过程中发生错误", {
        error: error instanceof Error ? error.message : String(error),
      });

      return {
        valid: false,
        errors: ["配置验证过程中发生错误"],
        warnings: [],
      };
    }
  }

  /**
   * 合并配置
   * @param baseConfig 基础配置
   * @param overrideConfig 覆盖配置
   * @returns 合并后的配置
   */
  public mergeConfig(
    baseConfig: ApplicationKernelConfig,
    overrideConfig: Partial<ApplicationKernelConfig>,
  ): ApplicationKernelConfig {
    this.logger.debug("开始合并配置");

    const mergedConfig = this.deepMerge(
      baseConfig as unknown as Record<string, unknown>,
      overrideConfig as unknown as Record<string, unknown>,
    ) as unknown as ApplicationKernelConfig;

    this.logger.debug("配置合并完成");
    return mergedConfig;
  }

  /**
   * 从环境变量加载事件存储配置
   */
  private loadEventStoreFromEnv() {
    return {
      type:
        (process.env.EVENT_STORE_TYPE as "postgresql" | "mongodb" | "hybrid") ||
        "hybrid",
      connection: {
        host: process.env.EVENT_STORE_HOST || "localhost",
        port: parseInt(process.env.EVENT_STORE_PORT || "5432", 10),
        database: process.env.EVENT_STORE_DATABASE || "hl8_events",
        username: process.env.EVENT_STORE_USERNAME,
        password: process.env.EVENT_STORE_PASSWORD,
      },
      snapshots: {
        enabled: process.env.EVENT_STORE_SNAPSHOTS_ENABLED !== "false",
        interval: parseInt(
          process.env.EVENT_STORE_SNAPSHOTS_INTERVAL || "100",
          10,
        ),
        maxAge: parseInt(
          process.env.EVENT_STORE_SNAPSHOTS_MAX_AGE || "2592000000",
          10,
        ), // 30天
      },
      performance: {
        batchSize: parseInt(process.env.EVENT_STORE_BATCH_SIZE || "100", 10),
        maxConcurrentOperations: parseInt(
          process.env.EVENT_STORE_MAX_CONCURRENT || "10",
          10,
        ),
        timeout: parseInt(process.env.EVENT_STORE_TIMEOUT || "5000", 10),
      },
    };
  }

  /**
   * 从环境变量加载事件总线配置
   */
  private loadEventBusFromEnv() {
    return {
      deliveryGuarantee:
        (process.env.EVENT_BUS_DELIVERY_GUARANTEE as
          | "at-least-once"
          | "exactly-once"
          | "at-most-once") || "at-least-once",
      retry: {
        maxAttempts: parseInt(
          process.env.EVENT_BUS_RETRY_MAX_ATTEMPTS || "3",
          10,
        ),
        backoffMs: parseInt(
          process.env.EVENT_BUS_RETRY_BACKOFF_MS || "1000",
          10,
        ),
        maxBackoffMs: parseInt(
          process.env.EVENT_BUS_RETRY_MAX_BACKOFF_MS || "10000",
          10,
        ),
      },
      deadLetterQueue: {
        enabled: process.env.EVENT_BUS_DLQ_ENABLED !== "false",
        maxRetries: parseInt(process.env.EVENT_BUS_DLQ_MAX_RETRIES || "5", 10),
      },
      performance: {
        maxConcurrentEvents: parseInt(
          process.env.EVENT_BUS_MAX_CONCURRENT_EVENTS || "100",
          10,
        ),
        batchSize: parseInt(process.env.EVENT_BUS_BATCH_SIZE || "50", 10),
        timeout: parseInt(process.env.EVENT_BUS_TIMEOUT || "3000", 10),
      },
    };
  }

  /**
   * 从环境变量加载缓存配置
   */
  private loadCacheFromEnv() {
    return {
      type:
        (process.env.CACHE_TYPE as "memory" | "redis" | "hybrid") || "memory",
      connection: process.env.CACHE_HOST
        ? {
            host: process.env.CACHE_HOST,
            port: parseInt(process.env.CACHE_PORT || "6379", 10),
            password: process.env.CACHE_PASSWORD,
          }
        : undefined,
      ttl: {
        default: parseInt(process.env.CACHE_TTL_DEFAULT || "300", 10),
        max: parseInt(process.env.CACHE_TTL_MAX || "3600", 10),
      },
      invalidation: {
        strategy:
          (process.env.CACHE_INVALIDATION_STRATEGY as
            | "event-based"
            | "time-based"
            | "manual") || "event-based",
        events: process.env.CACHE_INVALIDATION_EVENTS?.split(",") || [
          "UserCreated",
          "UserUpdated",
          "UserDeleted",
        ],
      },
      performance: {
        maxSize: parseInt(process.env.CACHE_MAX_SIZE || "1000", 10),
        maxMemoryUsage: parseInt(
          process.env.CACHE_MAX_MEMORY_USAGE || "104857600",
          10,
        ), // 100MB
      },
    };
  }

  /**
   * 从环境变量加载监控配置
   */
  private loadMonitoringFromEnv() {
    return {
      enabled: process.env.MONITORING_ENABLED !== "false",
      metrics: {
        enabled: process.env.MONITORING_METRICS_ENABLED !== "false",
        interval: parseInt(
          process.env.MONITORING_METRICS_INTERVAL || "1000",
          10,
        ),
        retention: parseInt(
          process.env.MONITORING_METRICS_RETENTION || "86400000",
          10,
        ), // 24小时
      },
      performance: {
        enabled: process.env.MONITORING_PERFORMANCE_ENABLED !== "false",
        slowQueryThreshold: parseInt(
          process.env.MONITORING_SLOW_QUERY_THRESHOLD || "1000",
          10,
        ),
        slowCommandThreshold: parseInt(
          process.env.MONITORING_SLOW_COMMAND_THRESHOLD || "2000",
          10,
        ),
      },
      memory: {
        enabled: process.env.MONITORING_MEMORY_ENABLED !== "false",
        gcThreshold: parseInt(
          process.env.MONITORING_GC_THRESHOLD || "104857600",
          10,
        ), // 100MB
        alertThreshold: parseInt(
          process.env.MONITORING_ALERT_THRESHOLD || "524288000",
          10,
        ), // 500MB
      },
    };
  }

  /**
   * 从环境变量加载性能配置
   */
  private loadPerformanceFromEnv() {
    return {
      concurrency: {
        maxConcurrentCommands: parseInt(
          process.env.PERFORMANCE_MAX_CONCURRENT_COMMANDS || "100",
          10,
        ),
        maxConcurrentQueries: parseInt(
          process.env.PERFORMANCE_MAX_CONCURRENT_QUERIES || "200",
          10,
        ),
        maxConcurrentEvents: parseInt(
          process.env.PERFORMANCE_MAX_CONCURRENT_EVENTS || "500",
          10,
        ),
      },
      timeouts: {
        commandTimeout: parseInt(
          process.env.PERFORMANCE_COMMAND_TIMEOUT || "5000",
          10,
        ),
        queryTimeout: parseInt(
          process.env.PERFORMANCE_QUERY_TIMEOUT || "1000",
          10,
        ),
        eventProcessingTimeout: parseInt(
          process.env.PERFORMANCE_EVENT_PROCESSING_TIMEOUT || "2000",
          10,
        ),
      },
      batching: {
        enabled: process.env.PERFORMANCE_BATCHING_ENABLED !== "false",
        batchSize: parseInt(process.env.PERFORMANCE_BATCH_SIZE || "50", 10),
        flushInterval: parseInt(
          process.env.PERFORMANCE_FLUSH_INTERVAL || "100",
          10,
        ),
      },
    };
  }

  /**
   * 从环境变量加载日志配置
   */
  private loadLoggingFromEnv() {
    return {
      level:
        (process.env.LOGGING_LEVEL as
          | "debug"
          | "info"
          | "warn"
          | "error"
          | "fatal") || "info",
      format: (process.env.LOGGING_FORMAT as "json" | "text") || "json",
      fields: {
        correlationId: process.env.LOGGING_FIELDS_CORRELATION_ID !== "false",
        userId: process.env.LOGGING_FIELDS_USER_ID !== "false",
        commandId: process.env.LOGGING_FIELDS_COMMAND_ID !== "false",
        queryId: process.env.LOGGING_FIELDS_QUERY_ID !== "false",
        eventId: process.env.LOGGING_FIELDS_EVENT_ID !== "false",
      },
      performance: {
        enabled: process.env.LOGGING_PERFORMANCE_ENABLED !== "false",
        slowQueryThreshold: parseInt(
          process.env.LOGGING_SLOW_QUERY_THRESHOLD || "1000",
          10,
        ),
        slowCommandThreshold: parseInt(
          process.env.LOGGING_SLOW_COMMAND_THRESHOLD || "2000",
          10,
        ),
      },
    };
  }

  /**
   * 读取配置文件
   * @param configPath 配置文件路径
   * @returns 配置文件内容
   */
  private async readConfigFile(configPath: string): Promise<string> {
    // 这里应该使用适当的文件读取方法
    // 暂时抛出错误，表示功能未实现
    throw new Error(`配置文件读取功能未实现: ${configPath}`);
  }

  /**
   * 格式化验证错误
   * @param errors 验证错误列表
   * @returns 错误消息列表
   */
  private formatValidationErrors(errors: ValidationError[]): string[] {
    const errorMessages: string[] = [];

    for (const error of errors) {
      if (error.constraints) {
        errorMessages.push(...Object.values(error.constraints));
      }

      if (error.children && error.children.length > 0) {
        errorMessages.push(...this.formatValidationErrors(error.children));
      }
    }

    return errorMessages;
  }

  /**
   * 深度合并对象
   * @param target 目标对象
   * @param source 源对象
   * @returns 合并后的对象
   */
  private deepMerge<T extends Record<string, unknown>>(
    target: T,
    source: Partial<T>,
  ): T {
    const result = { ...target };

    for (const key in source) {
      if (
        source[key] &&
        typeof source[key] === "object" &&
        !Array.isArray(source[key])
      ) {
        result[key] = this.deepMerge(
          (target[key] as Record<string, unknown>) || {},
          source[key] as Record<string, unknown>,
        ) as T[Extract<keyof T, string>];
      } else {
        result[key] = source[key];
      }
    }

    return result;
  }
}
