/**
 * @fileoverview 应用层核心配置服务单元测试
 * @description 测试ApplicationKernelConfigService的功能
 */

import { Test, TestingModule } from "@nestjs/testing";
import { Logger } from "@hl8/logger";
import { ApplicationKernelConfigService } from "./application-kernel.config.js";
import { ApplicationKernelConfig } from "./config.interface.js";

describe("ApplicationKernelConfigService", () => {
  let service: ApplicationKernelConfigService;
  let mockLogger: jest.Mocked<Logger>;

  beforeEach(async () => {
    mockLogger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: ApplicationKernelConfigService,
          useFactory: (logger: Logger) =>
            new ApplicationKernelConfigService(logger),
          inject: [Logger],
        },
        {
          provide: Logger,
          useValue: mockLogger,
        },
      ],
    }).compile();

    service = module.get<ApplicationKernelConfigService>(
      ApplicationKernelConfigService,
    );
  });

  describe("构造函数", () => {
    it("应该正确初始化服务", () => {
      expect(service).toBeDefined();
      expect(service.getConfig()).toBeDefined();
    });

    it("应该加载默认配置", () => {
      const config = service.getConfig();

      expect(config.eventStore).toBeDefined();
      expect(config.eventBus).toBeDefined();
      expect(config.cache).toBeDefined();
      expect(config.monitoring).toBeDefined();
      expect(config.performance).toBeDefined();
      expect(config.logging).toBeDefined();
    });
  });

  describe("getConfig", () => {
    it("应该返回配置的副本", () => {
      const config1 = service.getConfig();
      const config2 = service.getConfig();

      expect(config1).toEqual(config2);
      expect(config1).not.toBe(config2); // 应该是不同的对象
    });

    it("应该包含所有必需的配置项", () => {
      const config = service.getConfig();

      expect(config.eventStore.type).toBeDefined();
      expect(config.eventStore.connection).toBeDefined();
      expect(config.eventBus.deliveryGuarantee).toBeDefined();
      expect(config.cache.type).toBeDefined();
      expect(config.monitoring.enabled).toBeDefined();
      expect(config.performance.concurrency).toBeDefined();
      expect(config.logging.level).toBeDefined();
    });
  });

  describe("updateConfig", () => {
    it("应该成功更新有效配置", async () => {
      const newConfig = {
        eventStore: {
          type: "postgresql" as const,
          connection: {
            host: "newhost",
            port: 5433,
            database: "newdb",
          },
          snapshots: {
            enabled: true,
            interval: 100,
            maxAge: 1000,
          },
          performance: {
            batchSize: 100,
            maxConcurrentOperations: 10,
            timeout: 30000,
          },
        },
      };

      const result = await service.updateConfig(newConfig);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);

      const updatedConfig = service.getConfig();
      expect(updatedConfig.eventStore.type).toBe("postgresql");
      expect(updatedConfig.eventStore.connection.host).toBe("newhost");
    });

    it("应该拒绝无效配置", async () => {
      const invalidConfig = {
        eventStore: {
          type: "invalid" as any,
          connection: {
            host: "",
            port: -1,
            database: "",
          },
          snapshots: {
            enabled: true,
            interval: 100,
            maxAge: 1000,
          },
          performance: {
            batchSize: 100,
            maxConcurrentOperations: 10,
            timeout: 30000,
          },
        },
      };

      const result = await service.updateConfig(invalidConfig);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(mockLogger.error).toHaveBeenCalledWith(
        "配置验证失败",
        expect.objectContaining({ errors: expect.any(Array) }),
      );
    });

    it("应该部分更新配置", async () => {
      const originalConfig = service.getConfig();
      const partialUpdate = {
        logging: {
          level: "debug" as const,
          format: "text" as const,
          fields: {
            correlationId: true,
            userId: true,
            commandId: true,
            queryId: true,
            eventId: true,
          },
          performance: {
            enabled: true,
            slowQueryThreshold: 500,
            slowCommandThreshold: 1000,
          },
        },
      };

      const result = await service.updateConfig(partialUpdate);

      expect(result.valid).toBe(true);

      const updatedConfig = service.getConfig();
      expect(updatedConfig.logging.level).toBe("debug");
      expect(updatedConfig.logging.format).toBe("text");
      expect(updatedConfig.eventStore).toEqual(originalConfig.eventStore); // 其他配置应该保持不变
    });
  });

  describe("validateConfig", () => {
    it("应该验证事件存储配置", () => {
      const invalidEventStore = {
        eventStore: {
          type: "invalid" as any,
          connection: {
            host: "",
            port: -1,
            database: "",
          },
          snapshots: {
            enabled: true,
            interval: 100,
            maxAge: 1000,
          },
          performance: {
            batchSize: 100,
            maxConcurrentOperations: 10,
            timeout: 30000,
          },
        },
      };

      const result = service.validateConfig(invalidEventStore);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        "事件存储类型必须是 postgresql、mongodb 或 hybrid",
      );
      expect(result.errors).toContain("事件存储主机地址不能为空");
      expect(result.errors).toContain("事件存储端口必须是正整数");
      expect(result.errors).toContain("事件存储数据库名称不能为空");
    });

    it("应该验证事件总线配置", () => {
      const invalidEventBus = {
        eventBus: {
          deliveryGuarantee: "invalid" as any,
          retry: {
            maxAttempts: -1,
            backoffMs: 1000,
            maxBackoffMs: 10000,
          },
          deadLetterQueue: {
            enabled: true,
            maxRetries: 3,
          },
          performance: {
            maxConcurrentEvents: 10,
            batchSize: 100,
            timeout: 30000,
          },
        },
      };

      const result = service.validateConfig(invalidEventBus);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        "事件总线传递保证必须是 at-least-once、exactly-once 或 at-most-once",
      );
      expect(result.errors).toContain("重试最大次数必须是正整数");
    });

    it("应该验证缓存配置", () => {
      const invalidCache = {
        cache: {
          type: "invalid" as any,
          ttl: {
            default: -1,
            max: 3600,
          },
          invalidation: {
            strategy: "event-based" as const,
            events: [],
          },
          performance: {
            maxSize: 1000,
            maxMemoryUsage: 104857600,
          },
        },
      };

      const result = service.validateConfig(invalidCache);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("缓存类型必须是 memory、redis 或 hybrid");
      expect(result.errors).toContain("缓存默认TTL必须是正整数");
    });

    it("应该验证性能配置", () => {
      const invalidPerformance = {
        performance: {
          concurrency: {
            maxConcurrentCommands: -1,
            maxConcurrentQueries: 200,
            maxConcurrentEvents: 500,
          },
          timeouts: {
            commandTimeout: -1,
            queryTimeout: 1000,
            eventProcessingTimeout: 2000,
          },
          batching: {
            enabled: true,
            batchSize: 50,
            flushInterval: 100,
          },
        },
      };

      const result = service.validateConfig(invalidPerformance);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("最大并发命令数必须是正整数");
      expect(result.errors).toContain("命令超时时间必须是正整数");
    });

    it("应该验证日志配置", () => {
      const invalidLogging = {
        logging: {
          level: "invalid" as any,
          format: "invalid" as any,
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

      const result = service.validateConfig(invalidLogging);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        "日志级别必须是 debug、info、warn、error 或 fatal",
      );
      expect(result.errors).toContain("日志格式必须是 json 或 text");
    });

    it("应该通过有效配置的验证", () => {
      const validConfig = {
        eventStore: {
          type: "postgresql" as const,
          connection: {
            host: "localhost",
            port: 5432,
            database: "test",
          },
          snapshots: {
            enabled: true,
            interval: 100,
            maxAge: 2592000000,
          },
          performance: {
            batchSize: 100,
            maxConcurrentOperations: 10,
            timeout: 5000,
          },
        },
      };

      const result = service.validateConfig(validConfig);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe("onConfigUpdate", () => {
    it("应该注册配置更新回调", () => {
      const callback = jest.fn();

      service.onConfigUpdate(callback);

      // 回调应该被注册，但不会立即调用
      expect(callback).not.toHaveBeenCalled();
    });

    it("应该在配置更新时调用回调", async () => {
      const callback = jest.fn();
      service.onConfigUpdate(callback);

      const newConfig = {
        logging: {
          level: "debug" as const,
          format: "json" as const,
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

      await service.updateConfig(newConfig);

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          logging: expect.objectContaining({
            level: "debug",
          }),
        }),
      );
    });

    it("应该处理回调执行错误", async () => {
      const errorCallback = jest
        .fn()
        .mockRejectedValue(new Error("回调执行失败"));
      service.onConfigUpdate(errorCallback);

      const newConfig = {
        logging: {
          level: "debug" as const,
          format: "json" as const,
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

      await service.updateConfig(newConfig);

      expect(errorCallback).toHaveBeenCalled();
      expect(mockLogger.error).toHaveBeenCalledWith(
        "配置更新回调执行失败",
        expect.objectContaining({ error: "回调执行失败" }),
      );
    });
  });

  describe("默认配置", () => {
    it("应该提供合理的默认值", () => {
      const config = service.getConfig();

      // 事件存储默认配置
      expect(config.eventStore.type).toBe("hybrid");
      expect(config.eventStore.connection.host).toBe("localhost");
      expect(config.eventStore.connection.port).toBe(5432);
      expect(config.eventStore.snapshots.enabled).toBe(true);

      // 事件总线默认配置
      expect(config.eventBus.deliveryGuarantee).toBe("at-least-once");
      expect(config.eventBus.retry.maxAttempts).toBe(3);

      // 缓存默认配置
      expect(config.cache.type).toBe("memory");
      expect(config.cache.ttl.default).toBe(300);

      // 监控默认配置
      expect(config.monitoring.enabled).toBe(true);
      expect(config.monitoring.metrics.enabled).toBe(true);

      // 性能默认配置
      expect(config.performance.concurrency.maxConcurrentCommands).toBe(100);
      expect(config.performance.timeouts.commandTimeout).toBe(5000);

      // 日志默认配置
      expect(config.logging.level).toBe("info");
      expect(config.logging.format).toBe("json");
    });
  });
});
