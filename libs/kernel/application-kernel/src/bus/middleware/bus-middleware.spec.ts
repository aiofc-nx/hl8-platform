/**
 * @fileoverview 总线中间件单元测试
 * @description 测试各种总线中间件的功能
 */

import { Test, TestingModule } from "@nestjs/testing";
import { Logger } from "@hl8/logger";
import {
  LoggingMiddleware,
  PerformanceMonitoringMiddleware,
  ValidationMiddleware,
  RetryMiddleware,
  CacheMiddleware,
} from "./bus-middleware.js";
import { ExecutionContext } from "../command-query-bus.interface.js";
import { BusConfig } from "../command-query-bus.impl.js";
import { BaseCommand } from "../../commands/base/command.base.js";
import { BaseQuery } from "../../queries/base/query.base.js";
import { CommandResult } from "../../commands/base/command-result.js";
import { QueryResult } from "../../queries/base/query-result.js";
import { EntityId } from "@hl8/domain-kernel";

/**
 * 测试命令类
 */
class TestCommand extends BaseCommand {
  constructor(
    public readonly data: { name: string },
    userId?: string,
    correlationId?: string,
  ) {
    super("test-aggregate-id", "TestCommand", { userId, correlationId });
  }

  public clone(): TestCommand {
    return new TestCommand(this.data, this.userId, this.correlationId);
  }
}

/**
 * 测试查询类
 */
class TestQuery extends BaseQuery {
  constructor(
    public readonly filters: { name?: string },
    userId?: string,
    correlationId?: string,
  ) {
    super("TestQuery", { userId, correlationId });
  }

  public clone(): TestQuery {
    return new TestQuery(this.filters, this.userId, this.correlationId);
  }
}

describe("LoggingMiddleware", () => {
  let middleware: LoggingMiddleware;
  let mockLogger: jest.Mocked<Logger>;

  beforeEach(() => {
    mockLogger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    } as any;

    middleware = new LoggingMiddleware(mockLogger);
  });

  describe("基本信息", () => {
    it("应该返回正确的名称", () => {
      expect(middleware.getName()).toBe("LoggingMiddleware");
    });

    it("应该返回正确的描述", () => {
      expect(middleware.getDescription()).toBe("记录命令和查询的执行日志");
    });

    it("应该返回正确的版本", () => {
      expect(middleware.getVersion()).toBe("1.0.0");
    });

    it("应该返回正确的优先级", () => {
      expect(middleware.getPriority()).toBe(100);
    });
  });

  describe("命令处理", () => {
    it("应该记录命令开始执行", async () => {
      const command = new TestCommand({ name: "Test" });
      const context: ExecutionContext = {
        executionId: "test-id",
        startTime: new Date(),
        executionType: "command",
        objectType: "TestCommand",
        userId: "user-123",
        correlationId: "corr-123",
        metadata: {},
        middlewareHistory: [],
      };

      const result = await middleware.beforeCommand!(command, context);

      expect(result).toBe(true);
      expect(mockLogger.debug).toHaveBeenCalledWith("开始执行命令", {
        executionId: "test-id",
        commandType: "TestCommand",
        commandId: expect.any(String),
        userId: "user-123",
        correlationId: "corr-123",
      });
    });

    it("应该记录命令执行成功", async () => {
      const command = new TestCommand({ name: "Test" });
      const result = CommandResult.success({ processed: true });
      const context: ExecutionContext = {
        executionId: "test-id",
        startTime: new Date(Date.now() - 100),
        executionType: "command",
        objectType: "TestCommand",
        metadata: {},
        middlewareHistory: [],
      };

      const finalResult = await middleware.afterCommand!(
        command,
        result,
        context,
      );

      expect(finalResult).toBe(result);
      expect(mockLogger.debug).toHaveBeenCalledWith("命令执行成功", {
        executionId: "test-id",
        commandType: "TestCommand",
        commandId: expect.any(String),
        processingTime: expect.any(Number),
        result: { processed: true },
      });
    });

    it("应该记录命令执行失败", async () => {
      const command = new TestCommand({ name: "Test" });
      const result = CommandResult.failure("测试错误", "TEST_ERROR");
      const context: ExecutionContext = {
        executionId: "test-id",
        startTime: new Date(Date.now() - 100),
        executionType: "command",
        objectType: "TestCommand",
        metadata: {},
        middlewareHistory: [],
      };

      const finalResult = await middleware.afterCommand!(
        command,
        result,
        context,
      );

      expect(finalResult).toBe(result);
      expect(mockLogger.error).toHaveBeenCalledWith("命令执行失败", {
        executionId: "test-id",
        commandType: "TestCommand",
        commandId: expect.any(String),
        processingTime: expect.any(Number),
        message: "TEST_ERROR",
        errorCode: "测试错误",
      });
    });
  });

  describe("查询处理", () => {
    it("应该记录查询开始执行", async () => {
      const query = new TestQuery({ name: "Test" });
      const context: ExecutionContext = {
        executionId: "test-id",
        startTime: new Date(),
        executionType: "query",
        objectType: "TestQuery",
        userId: "user-123",
        correlationId: "corr-123",
        metadata: {},
        middlewareHistory: [],
      };

      const result = await middleware.beforeQuery!(query, context);

      expect(result).toBe(true);
      expect(mockLogger.debug).toHaveBeenCalledWith("开始执行查询", {
        executionId: "test-id",
        queryType: "TestQuery",
        queryId: expect.any(String),
        userId: "user-123",
        correlationId: "corr-123",
      });
    });

    it("应该记录查询执行成功", async () => {
      const query = new TestQuery({ name: "Test" });
      const result = QueryResult.success([{ id: 1, name: "Test Item" }]);
      const context: ExecutionContext = {
        executionId: "test-id",
        startTime: new Date(Date.now() - 100),
        executionType: "query",
        objectType: "TestQuery",
        metadata: {},
        middlewareHistory: [],
      };

      const finalResult = await middleware.afterQuery!(query, result, context);

      expect(finalResult).toBe(result);
      expect(mockLogger.debug).toHaveBeenCalledWith("查询执行成功", {
        executionId: "test-id",
        queryType: "TestQuery",
        queryId: expect.any(String),
        processingTime: expect.any(Number),
        resultCount: 1,
      });
    });
  });

  describe("错误处理", () => {
    it("应该记录错误", async () => {
      const error = new Error("测试错误");
      const context: ExecutionContext = {
        executionId: "test-id",
        startTime: new Date(),
        executionType: "command",
        objectType: "TestCommand",
        metadata: {},
        middlewareHistory: [],
      };

      const result = await middleware.onError!(error, context);

      expect(result).toBe(true);
      expect(mockLogger.error).toHaveBeenCalledWith("执行过程中发生错误", {
        executionId: "test-id",
        executionType: "command",
        objectType: "TestCommand",
        error: "测试错误",
        stack: expect.any(String),
      });
    });
  });
});

describe("ValidationMiddleware", () => {
  let middleware: ValidationMiddleware;
  let mockLogger: jest.Mocked<Logger>;

  beforeEach(() => {
    mockLogger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    } as any;

    middleware = new ValidationMiddleware(mockLogger);
  });

  describe("命令验证", () => {
    it("应该验证有效的命令", async () => {
      const command = new TestCommand({ name: "Test" });
      const context: ExecutionContext = {
        executionId: "test-id",
        startTime: new Date(),
        executionType: "command",
        objectType: "TestCommand",
        metadata: {},
        middlewareHistory: [],
      };

      const result = await middleware.beforeCommand!(command, context);

      expect(result).toBe(true);
    });

    it("应该拒绝无效的命令", async () => {
      const command = new TestCommand({ name: "Test" });
      // 模拟无效命令
      (command as any).commandId = null;
      const context: ExecutionContext = {
        executionId: "test-id",
        startTime: new Date(),
        executionType: "command",
        objectType: "TestCommand",
        metadata: {},
        middlewareHistory: [],
      };

      const result = await middleware.beforeCommand!(command, context);

      expect(result).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith("命令验证失败", {
        executionId: "test-id",
        commandType: "TestCommand",
        error: "命令ID不能为空",
      });
    });
  });

  describe("查询验证", () => {
    it("应该验证有效的查询", async () => {
      const query = new TestQuery({ name: "Test" });
      const context: ExecutionContext = {
        executionId: "test-id",
        startTime: new Date(),
        executionType: "query",
        objectType: "TestQuery",
        metadata: {},
        middlewareHistory: [],
      };

      const result = await middleware.beforeQuery!(query, context);

      expect(result).toBe(true);
    });
  });
});

describe("PerformanceMonitoringMiddleware", () => {
  let middleware: PerformanceMonitoringMiddleware;
  let mockLogger: jest.Mocked<Logger>;
  let config: BusConfig;

  beforeEach(() => {
    mockLogger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    } as any;

    config = {
      maxConcurrency: 10,
      executionTimeout: 30000,
      enablePerformanceMonitoring: true,
      performanceMonitoringSamplingRate: 0.1,
      enableMiddleware: true,
      middlewareOrder: [],
      enableRetry: false,
      maxRetries: 3,
      retryDelay: 1000,
      enableCaching: false,
      cacheExpirationTime: 300000,
    };

    middleware = new PerformanceMonitoringMiddleware(mockLogger, config);
  });

  describe("性能监控", () => {
    it("应该记录命令性能", async () => {
      const command = new TestCommand({ name: "Test" });
      const result = CommandResult.success({ processed: true });
      const context: ExecutionContext = {
        executionId: "test-id",
        startTime: new Date(Date.now() - 100),
        executionType: "command",
        objectType: "TestCommand",
        metadata: {},
        middlewareHistory: [],
      };

      await middleware.afterCommand!(command, result, context);

      const stats = middleware.getPerformanceStats("TestCommand");
      expect(stats).not.toBeNull();
      expect(stats!.count).toBe(1);
      expect(stats!.average).toBeGreaterThan(0);
    });

    it("应该记录查询性能", async () => {
      const query = new TestQuery({ name: "Test" });
      const result = QueryResult.success([{ id: 1, name: "Test Item" }]);
      const context: ExecutionContext = {
        executionId: "test-id",
        startTime: new Date(Date.now() - 100),
        executionType: "query",
        objectType: "TestQuery",
        metadata: {},
        middlewareHistory: [],
      };

      await middleware.afterQuery!(query, result, context);

      const stats = middleware.getPerformanceStats("TestQuery");
      expect(stats).not.toBeNull();
      expect(stats!.count).toBe(1);
      expect(stats!.average).toBeGreaterThan(0);
    });

    it("应该记录慢查询警告", async () => {
      const query = new TestQuery({ name: "Test" });
      const result = QueryResult.success([{ id: 1, name: "Test Item" }]);
      const context: ExecutionContext = {
        executionId: "test-id",
        startTime: new Date(Date.now() - 6000), // 6秒前
        executionType: "query",
        objectType: "TestQuery",
        metadata: {},
        middlewareHistory: [],
      };

      await middleware.afterQuery!(query, result, context);

      expect(mockLogger.warn).toHaveBeenCalledWith("检测到慢执行", {
        type: "TestQuery",
        processingTime: expect.any(Number),
        threshold: 5000,
      });
    });
  });
});

describe("RetryMiddleware", () => {
  let middleware: RetryMiddleware;
  let mockLogger: jest.Mocked<Logger>;
  let config: BusConfig;

  beforeEach(() => {
    mockLogger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    } as any;

    config = {
      maxConcurrency: 10,
      executionTimeout: 30000,
      enablePerformanceMonitoring: false,
      performanceMonitoringSamplingRate: 0.1,
      enableMiddleware: true,
      middlewareOrder: [],
      enableRetry: true,
      maxRetries: 3,
      retryDelay: 100,
      enableCaching: false,
      cacheExpirationTime: 300000,
    };

    middleware = new RetryMiddleware(mockLogger, config);
  });

  describe("重试逻辑", () => {
    it("应该允许重试", async () => {
      const error = new Error("测试错误");
      const context: ExecutionContext = {
        executionId: "test-id",
        startTime: new Date(),
        executionType: "command",
        objectType: "TestCommand",
        metadata: { retryCount: 0 },
        middlewareHistory: [],
      };

      const result = await middleware.onError!(error, context);

      expect(result).toBe(false); // 不继续处理错误，让系统重试
      expect(context.metadata.retryCount).toBe(1);
    });

    it("应该达到最大重试次数后停止", async () => {
      const error = new Error("测试错误");
      const context: ExecutionContext = {
        executionId: "test-id",
        startTime: new Date(),
        executionType: "command",
        objectType: "TestCommand",
        metadata: { retryCount: 3 },
        middlewareHistory: [],
      };

      const result = await middleware.onError!(error, context);

      expect(result).toBe(true); // 继续处理错误
      expect(mockLogger.error).toHaveBeenCalledWith("达到最大重试次数", {
        executionId: "test-id",
        retryCount: 3,
        maxRetries: 3,
        error: "测试错误",
      });
    });
  });
});

describe("CacheMiddleware", () => {
  let middleware: CacheMiddleware;
  let mockLogger: jest.Mocked<Logger>;
  let config: BusConfig;

  beforeEach(() => {
    mockLogger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    } as any;

    config = {
      maxConcurrency: 10,
      executionTimeout: 30000,
      enablePerformanceMonitoring: false,
      performanceMonitoringSamplingRate: 0.1,
      enableMiddleware: true,
      middlewareOrder: [],
      enableRetry: false,
      maxRetries: 3,
      retryDelay: 1000,
      enableCaching: true,
      cacheExpirationTime: 300000,
    };

    middleware = new CacheMiddleware(mockLogger, config);
  });

  describe("缓存功能", () => {
    it("应该保留基本的中间件接口", () => {
      // 注意：缓存逻辑已迁移到 @hl8/cache，此处只测试接口兼容性
      expect(middleware.getName()).toBe("CacheMiddleware");
      expect(middleware.getDescription()).toBe("为查询结果提供缓存功能");
      expect(middleware.getVersion()).toBe("1.0.0");
      expect(middleware.getPriority()).toBe(150);
    });

    it("应该支持标准的查询前处理（空实现）", async () => {
      const query = new TestQuery({ name: "Test" });
      const context: ExecutionContext = {
        executionId: "test-id",
        startTime: new Date(),
        executionType: "query",
        objectType: "TestQuery",
        metadata: {},
        middlewareHistory: [],
      };

      const result = await middleware.beforeQuery!(query, context);
      expect(result).toBe(true); // 空实现返回 true，继续执行
    });

    it("应该支持标准的查询后处理（空实现）", async () => {
      const query = new TestQuery({ name: "Test" });
      const result = QueryResult.success([{ id: 1, name: "Test Item" }]);
      const context: ExecutionContext = {
        executionId: "test-id",
        startTime: new Date(),
        executionType: "query",
        objectType: "TestQuery",
        metadata: {},
        middlewareHistory: [],
      };

      const returnedResult = await middleware.afterQuery!(
        query,
        result,
        context,
      );
      expect(returnedResult).toBe(result); // 空实现直接返回原结果
    });
  });
});
