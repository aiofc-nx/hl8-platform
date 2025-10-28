/**
 * @fileoverview 应用层核心配置服务
 * @description 提供配置的默认值、读取、更新与验证能力
 */

import { Logger } from "@hl8/logger";
import type {
  ApplicationKernelConfig,
  ConfigUpdateCallback,
  ConfigValidationResult,
} from "./config.interface.js";

/**
 * 配置服务
 * @description 管理 Application Kernel 的配置生命周期
 */
export class ApplicationKernelConfigService {
  private readonly logger: Logger;
  private readonly callbacks: Set<ConfigUpdateCallback> = new Set();
  private config: ApplicationKernelConfig;

  constructor(logger: Logger) {
    this.logger = logger;
    this.config = this.createDefaultConfig();
  }

  /** 获取配置（返回副本以保证不可变性） */
  public getConfig(): ApplicationKernelConfig {
    return JSON.parse(JSON.stringify(this.config));
  }

  /** 注册配置更新回调 */
  public onConfigUpdate(callback: ConfigUpdateCallback): void {
    this.callbacks.add(callback);
  }

  /** 更新配置（部分更新），并执行校验与回调 */
  public async updateConfig(
    partial: Partial<ApplicationKernelConfig>,
  ): Promise<ConfigValidationResult> {
    const merged = this.deepMerge(this.config, partial);
    const validation = this.validateConfig(merged);
    if (!validation.valid) {
      this.logger.error("配置验证失败", { errors: validation.errors });
      return validation;
    }

    this.config = merged;
    await this.dispatchCallbacks();
    return { valid: true, errors: [], warnings: [] };
  }

  /** 按用例规则进行同步校验（返回结果对象） */
  public validateConfig(
    candidate: Partial<ApplicationKernelConfig>,
  ): ConfigValidationResult {
    const errors: string[] = [];

    // 事件存储校验
    if (candidate.eventStore) {
      const es = candidate.eventStore;
      const validTypes = ["postgresql", "mongodb", "hybrid"] as const;
      if (!validTypes.includes(es.type)) {
        errors.push("事件存储类型必须是 postgresql、mongodb 或 hybrid");
      }
      if (!es.connection?.host) errors.push("事件存储主机地址不能为空");
      if (!(es.connection?.port > 0)) errors.push("事件存储端口必须是正整数");
      if (!es.connection?.database) errors.push("事件存储数据库名称不能为空");
    }

    // 事件总线校验
    if (candidate.eventBus) {
      const eb = candidate.eventBus;
      const guarantees = [
        "at-least-once",
        "exactly-once",
        "at-most-once",
      ] as const;
      if (!guarantees.includes(eb.deliveryGuarantee)) {
        errors.push(
          "事件总线传递保证必须是 at-least-once、exactly-once 或 at-most-once",
        );
      }
      if (!(eb.retry?.maxAttempts > 0)) {
        errors.push("重试最大次数必须是正整数");
      }
    }

    // 缓存校验
    if (candidate.cache) {
      const c = candidate.cache;
      const cacheTypes = ["memory", "redis", "hybrid"] as const;
      if (!cacheTypes.includes(c.type)) {
        errors.push("缓存类型必须是 memory、redis 或 hybrid");
      }
      if (!(c.ttl?.default > 0)) {
        errors.push("缓存默认TTL必须是正整数");
      }
    }

    // 性能校验
    if (candidate.performance) {
      const p = candidate.performance;
      if (!(p.concurrency?.maxConcurrentCommands > 0)) {
        errors.push("最大并发命令数必须是正整数");
      }
      if (!(p.timeouts?.commandTimeout > 0)) {
        errors.push("命令超时时间必须是正整数");
      }
    }

    // 日志校验
    if (candidate.logging) {
      const l = candidate.logging;
      const levels = ["debug", "info", "warn", "error", "fatal"] as const;
      const formats = ["json", "text"] as const;
      if (!levels.includes(l.level)) {
        errors.push("日志级别必须是 debug、info、warn、error 或 fatal");
      }
      if (!formats.includes(l.format)) {
        errors.push("日志格式必须是 json 或 text");
      }
    }

    return { valid: errors.length === 0, errors, warnings: [] };
  }

  // 默认配置，需覆盖测试中的断言
  private createDefaultConfig(): ApplicationKernelConfig {
    return {
      eventStore: {
        type: "hybrid",
        connection: {
          host: "localhost",
          port: 5432,
          database: "hl8_events",
        },
        snapshots: { enabled: true, interval: 100, maxAge: 2592000000 },
        performance: {
          batchSize: 100,
          maxConcurrentOperations: 10,
          timeout: 5000,
        },
      },
      eventBus: {
        deliveryGuarantee: "at-least-once",
        retry: { maxAttempts: 3, backoffMs: 1000, maxBackoffMs: 10000 },
        deadLetterQueue: { enabled: true, maxRetries: 3 },
        performance: { maxConcurrentEvents: 100, batchSize: 50, timeout: 3000 },
      },
      cache: {
        type: "memory",
        connection: undefined,
        ttl: { default: 300, max: 3600 },
        invalidation: { strategy: "event-based", events: [] },
        performance: { maxSize: 1000, maxMemoryUsage: 104857600 },
      },
      monitoring: {
        enabled: true,
        metrics: { enabled: true, interval: 1000, retention: 86400000 },
        performance: {
          enabled: true,
          slowQueryThreshold: 1000,
          slowCommandThreshold: 2000,
        },
        memory: {
          enabled: true,
          gcThreshold: 104857600,
          alertThreshold: 524288000,
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
        batching: { enabled: true, batchSize: 50, flushInterval: 100 },
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

  private async dispatchCallbacks(): Promise<void> {
    for (const cb of this.callbacks) {
      try {
        await Promise.resolve(cb(this.getConfig()));
      } catch (error) {
        this.logger.error("配置更新回调执行失败", {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  private deepMerge<T>(base: T, partial: Partial<T>): T {
    const baseRecord: Record<string, unknown> = {
      ...(base as Record<string, unknown>),
    };
    const partialRecord: Record<string, unknown> = partial as Record<
      string,
      unknown
    >;

    const result: Record<string, unknown> = { ...baseRecord };
    for (const key of Object.keys(partialRecord)) {
      const partialValue = partialRecord[key];
      const baseValue = baseRecord[key];

      if (
        partialValue !== null &&
        typeof partialValue === "object" &&
        !Array.isArray(partialValue)
      ) {
        const mergedNested = this.deepMerge(
          (baseValue as Record<string, unknown>) || {},
          partialValue as Record<string, unknown>,
        );
        result[key] = mergedNested;
      } else {
        result[key] = partialValue;
      }
    }
    return result as T;
  }
}
