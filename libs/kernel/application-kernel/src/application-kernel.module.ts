/**
 * @fileoverview 应用内核模块
 * @description 应用层核心模块的NestJS模块定义
 */

import { Module, DynamicModule } from "@nestjs/common";
import { CqrsModule } from "@nestjs/cqrs";
import type { InjectionToken, OptionalFactoryDependency } from "@nestjs/common";
import { Logger } from "@hl8/logger";
import type { PinoLogger } from "@hl8/logger";

import { CommandQueryBusImpl } from "./bus/command-query-bus.impl.js";
import { EventStore } from "./events/store/event-store.impl.js";
import { EventBusImpl } from "./events/bus/event-bus.impl.js";
import { ProjectorRegistry } from "./projectors/registry/projector-registry.js";
import {
  SagaStateManager,
  type ISagaStateStore,
  type SagaStateSnapshot,
  type SagaStateQuery,
  type SagaStateQueryResult,
} from "./sagas/base/saga-state.js";
import { InMemoryCache } from "./cache/cache.impl.js";
import { MonitoringService } from "./monitoring/monitoring.service.js";
import type { CacheConfig } from "./cache/cache.interface.js";
import type { MonitoringConfig } from "./monitoring/monitoring.service.js";
import { ApplicationKernelConfigService } from "./config/application-kernel.config.js";

/**
 * 应用内核模块选项
 */
export interface ApplicationKernelModuleOptions {
  /** 事件存储配置 */
  eventStore?: {
    type: "postgresql" | "mongodb" | "hybrid";
    postgresql?: string;
    mongodb?: string;
  };
  /** 事件总线配置 */
  eventBus?: {
    deliveryGuarantee: "at-least-once" | "exactly-once" | "at-most-once";
    retryPolicy: {
      maxRetries: number;
      backoffMs: number;
    };
  };
  /** 缓存配置 */
  cache?: {
    type: "memory" | "redis";
    connectionString?: string;
    ttl: {
      default: number;
    };
  };
  /** 监控配置 */
  monitoring?: {
    enabled: boolean;
    metricsInterval: number;
  };
}

/**
 * 应用内核模块
 * @description 提供CQRS、事件溯源、事件驱动架构的标准化实现
 */
@Module({ imports: [CqrsModule] })
export class ApplicationKernelModule {
  /**
   * 创建应用内核模块
   * @param options 模块选项
   * @returns 动态模块
   */
  static forRoot(_options?: ApplicationKernelModuleOptions): DynamicModule {
    return {
      module: ApplicationKernelModule,
      imports: [CqrsModule],
      providers: [
        {
          provide: ApplicationKernelConfigService,
          useFactory: (logger: Logger) =>
            new ApplicationKernelConfigService(logger),
          inject: [Logger],
        },
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
        {
          provide: CommandQueryBusImpl,
          useClass: CommandQueryBusImpl,
        },
        {
          provide: EventStore,
          useClass: EventStore,
        },
        {
          provide: EventBusImpl,
          useClass: EventBusImpl,
        },
        {
          provide: ProjectorRegistry,
          useFactory: (logger: Logger) => new ProjectorRegistry(logger),
          inject: [Logger],
        },
        {
          provide: SagaStateManager,
          useFactory: (logger: Logger) => {
            const data = new Map<string, SagaStateSnapshot>();
            const store: ISagaStateStore = {
              async save(snapshot: SagaStateSnapshot): Promise<void> {
                data.set(snapshot.sagaId, { ...snapshot });
              },
              async getById(
                sagaId: string,
              ): Promise<SagaStateSnapshot | undefined> {
                return data.get(sagaId);
              },
              async getByAggregateId(
                aggregateId: string,
              ): Promise<SagaStateSnapshot[]> {
                return Array.from(data.values()).filter(
                  (s) => s.aggregateId === aggregateId,
                );
              },
              async query(
                query: SagaStateQuery,
              ): Promise<SagaStateQueryResult> {
                let list = Array.from(data.values());
                if (query.sagaId)
                  list = list.filter((s) => s.sagaId === query.sagaId);
                if (query.aggregateId)
                  list = list.filter(
                    (s) => s.aggregateId === query.aggregateId,
                  );
                if (query.status)
                  list = list.filter((s) => s.status === query.status);
                return { snapshots: list };
              },
              async update(
                sagaId: string,
                updates: Partial<SagaStateSnapshot>,
              ): Promise<void> {
                const existing = data.get(sagaId);
                if (!existing) return;
                data.set(sagaId, { ...existing, ...updates });
              },
              async delete(sagaId: string): Promise<void> {
                data.delete(sagaId);
              },
              async cleanup(beforeDate: Date): Promise<number> {
                const toDelete = Array.from(data.values()).filter(
                  (s) => s.updatedAt < beforeDate,
                );
                for (const s of toDelete) {
                  data.delete(s.sagaId);
                }
                return toDelete.length;
              },
            };
            return new SagaStateManager(logger, store);
          },
          inject: [Logger],
        },
        {
          provide: InMemoryCache,
          useFactory: (
            configService: ApplicationKernelConfigService,
            logger: Logger,
          ) => {
            const cfg = configService.getConfig().cache;
            const cacheConfig: CacheConfig = {
              defaultTtl: cfg.ttl.default * 1000,
              maxSize: cfg.performance.maxSize,
              enableStats: true,
              enableEventInvalidation: cfg.invalidation.strategy !== "manual",
              cleanupInterval: 60_000,
              enableCompression: false,
            };
            return new InMemoryCache(cacheConfig, logger);
          },
          inject: [ApplicationKernelConfigService, Logger],
        },
        {
          provide: MonitoringService,
          useFactory: (logger: Logger) => {
            const defaultMonitoringConfig: MonitoringConfig = {
              enabled: true,
              collectionInterval: 1000,
              alertCheckInterval: 2000,
              dataRetentionTime: 24 * 60 * 60 * 1000,
              maxMetrics: 1000,
              enableAutoCleanup: true,
              cleanupInterval: 60 * 1000,
            };
            return new MonitoringService(defaultMonitoringConfig, logger);
          },
          inject: [Logger],
        },
        // 兼容字符串 token 的别名映射
        { provide: "CommandQueryBus", useExisting: CommandQueryBusImpl },
        { provide: "EventStore", useExisting: EventStore },
        { provide: "EventBus", useExisting: EventBusImpl },
        { provide: "ProjectorRegistry", useExisting: ProjectorRegistry },
        { provide: "SagaStateManager", useExisting: SagaStateManager },
        { provide: "CacheService", useExisting: InMemoryCache },
        { provide: "MonitoringService", useExisting: MonitoringService },
      ],
      exports: [
        ApplicationKernelConfigService,
        Logger,
        CommandQueryBusImpl,
        EventStore,
        EventBusImpl,
        ProjectorRegistry,
        SagaStateManager,
        InMemoryCache,
        MonitoringService,
      ],
    };
  }

  /**
   * 创建异步应用内核模块
   * @param options 模块选项工厂
   * @returns 动态模块
   */
  static forRootAsync(options: {
    useFactory: (
      ...args: unknown[]
    ) =>
      | Promise<ApplicationKernelModuleOptions>
      | ApplicationKernelModuleOptions;
    inject?: (InjectionToken | OptionalFactoryDependency)[];
  }): DynamicModule {
    return {
      module: ApplicationKernelModule,
      imports: [CqrsModule],
      providers: [
        {
          provide: ApplicationKernelConfigService,
          useFactory: async (logger: Logger, ...args: unknown[]) => {
            await options.useFactory(...args);
            return new ApplicationKernelConfigService(logger);
          },
          inject: [
            Logger,
            ...((options.inject ?? []) as (
              | InjectionToken
              | OptionalFactoryDependency
            )[]),
          ],
        },
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
        {
          provide: CommandQueryBusImpl,
          useClass: CommandQueryBusImpl,
        },
        {
          provide: EventStore,
          useClass: EventStore,
        },
        {
          provide: EventBusImpl,
          useClass: EventBusImpl,
        },
        {
          provide: ProjectorRegistry,
          useFactory: (logger: Logger) => new ProjectorRegistry(logger),
          inject: [Logger],
        },
        {
          provide: SagaStateManager,
          useFactory: (logger: Logger) => {
            const data = new Map<string, SagaStateSnapshot>();
            const store: ISagaStateStore = {
              async save(snapshot: SagaStateSnapshot): Promise<void> {
                data.set(snapshot.sagaId, { ...snapshot });
              },
              async getById(
                sagaId: string,
              ): Promise<SagaStateSnapshot | undefined> {
                return data.get(sagaId);
              },
              async getByAggregateId(
                aggregateId: string,
              ): Promise<SagaStateSnapshot[]> {
                return Array.from(data.values()).filter(
                  (s) => s.aggregateId === aggregateId,
                );
              },
              async query(
                query: SagaStateQuery,
              ): Promise<SagaStateQueryResult> {
                let list = Array.from(data.values());
                if (query.sagaId)
                  list = list.filter((s) => s.sagaId === query.sagaId);
                if (query.aggregateId)
                  list = list.filter(
                    (s) => s.aggregateId === query.aggregateId,
                  );
                if (query.status)
                  list = list.filter((s) => s.status === query.status);
                return { snapshots: list };
              },
              async update(
                sagaId: string,
                updates: Partial<SagaStateSnapshot>,
              ): Promise<void> {
                const existing = data.get(sagaId);
                if (!existing) return;
                data.set(sagaId, { ...existing, ...updates });
              },
              async delete(sagaId: string): Promise<void> {
                data.delete(sagaId);
              },
              async cleanup(beforeDate: Date): Promise<number> {
                const toDelete = Array.from(data.values()).filter(
                  (s) => s.updatedAt < beforeDate,
                );
                for (const s of toDelete) {
                  data.delete(s.sagaId);
                }
                return toDelete.length;
              },
            };
            return new SagaStateManager(logger, store);
          },
          inject: [Logger],
        },
        {
          provide: InMemoryCache,
          useFactory: (
            configService: ApplicationKernelConfigService,
            logger: Logger,
          ) => {
            const cfg = configService.getConfig().cache;
            const cacheConfig: CacheConfig = {
              defaultTtl: cfg.ttl.default * 1000,
              maxSize: cfg.performance.maxSize,
              enableStats: true,
              enableEventInvalidation: cfg.invalidation.strategy !== "manual",
              cleanupInterval: 60_000,
              enableCompression: false,
            };
            return new InMemoryCache(cacheConfig, logger);
          },
          inject: [ApplicationKernelConfigService, Logger],
        },
        {
          provide: MonitoringService,
          useFactory: (logger: Logger) => {
            const defaultMonitoringConfig: MonitoringConfig = {
              enabled: true,
              collectionInterval: 1000,
              alertCheckInterval: 2000,
              dataRetentionTime: 24 * 60 * 60 * 1000,
              maxMetrics: 1000,
              enableAutoCleanup: true,
              cleanupInterval: 60 * 1000,
            };
            return new MonitoringService(defaultMonitoringConfig, logger);
          },
          inject: [Logger],
        },
        // 兼容字符串 token 的别名映射
        { provide: "CommandQueryBus", useExisting: CommandQueryBusImpl },
        { provide: "EventStore", useExisting: EventStore },
        { provide: "EventBus", useExisting: EventBusImpl },
        { provide: "ProjectorRegistry", useExisting: ProjectorRegistry },
        { provide: "SagaStateManager", useExisting: SagaStateManager },
        { provide: "CacheService", useExisting: InMemoryCache },
        { provide: "MonitoringService", useExisting: MonitoringService },
      ],
      exports: [
        ApplicationKernelConfigService,
        Logger,
        CommandQueryBusImpl,
        EventStore,
        EventBusImpl,
        ProjectorRegistry,
        SagaStateManager,
        InMemoryCache,
        MonitoringService,
      ],
    };
  }
}
