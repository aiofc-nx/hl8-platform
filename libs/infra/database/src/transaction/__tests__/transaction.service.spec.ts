/**
 * 事务服务测试
 *
 * @description 测试事务服务的核心功能
 *
 * @since 1.0.0
 */

import { Test, TestingModule } from "@nestjs/testing";
import { Logger } from "@hl8/logger";
import { MikroORM } from "@mikro-orm/core";
import { ClsService } from "nestjs-cls";
import { TransactionService } from "../transaction.service.js";
import { PostgreSQLTransactionAdapter } from "../postgresql-transaction.adapter.js";
import { MongoDBTransactionAdapter } from "../mongodb-transaction.adapter.js";
import { UnifiedTransactionManager } from "../unified-transaction.manager.js";
import { TransactionFactory } from "../transaction.factory.js";
import { TransactionMonitor } from "../transaction-monitor.js";
import { ConnectionManager } from "../../connection/connection.manager.js";
import {
  DatabaseTransactionException,
  TransactionExceptionType,
} from "../../exceptions/database-transaction.exception.js";

describe("事务服务测试", () => {
  let transactionService: TransactionService;
  let postgresqlAdapter: PostgreSQLTransactionAdapter;
  let mongodbAdapter: MongoDBTransactionAdapter;
  let unifiedManager: UnifiedTransactionManager;
  let transactionFactory: TransactionFactory;
  let transactionMonitor: TransactionMonitor;
  let _connectionManager: ConnectionManager;
  let _mockOrm: MikroORM;
  let mockCls: ClsService;
  let mockLogger: Logger;

  const mockLoggerService = {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  };

  const mockOrmService = {
    em: {
      fork: jest.fn(),
    },
    config: {
      get: jest.fn(),
    },
  };

  const mockClsService = {
    get: jest.fn(),
    set: jest.fn(),
  };

  const mockConnectionManager = {
    getDriver: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionService,
        PostgreSQLTransactionAdapter,
        MongoDBTransactionAdapter,
        UnifiedTransactionManager,
        TransactionFactory,
        TransactionMonitor,
        {
          provide: MikroORM,
          useValue: mockOrmService,
        },
        {
          provide: ClsService,
          useValue: mockClsService,
        },
        {
          provide: Logger,
          useValue: mockLoggerService,
        },
        {
          provide: ConnectionManager,
          useValue: mockConnectionManager,
        },
      ],
    }).compile();

    transactionService = module.get<TransactionService>(TransactionService);
    postgresqlAdapter = module.get<PostgreSQLTransactionAdapter>(
      PostgreSQLTransactionAdapter,
    );
    mongodbAdapter = module.get<MongoDBTransactionAdapter>(
      MongoDBTransactionAdapter,
    );
    unifiedManager = module.get<UnifiedTransactionManager>(
      UnifiedTransactionManager,
    );
    transactionFactory = module.get<TransactionFactory>(TransactionFactory);
    transactionMonitor = module.get<TransactionMonitor>(TransactionMonitor);
    _connectionManager = module.get<ConnectionManager>(ConnectionManager);
    _mockOrm = module.get<MikroORM>(MikroORM);
    mockCls = module.get<ClsService>(ClsService);
    mockLogger = module.get<Logger>(Logger);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("TransactionService", () => {
    it("应该正确初始化", () => {
      expect(transactionService).toBeDefined();
      expect(mockLogger.log).toHaveBeenCalledWith("TransactionService 初始化");
    });

    it("应该获取数据库类型", () => {
      mockConnectionManager.getDriver.mockReturnValue({
        getDriverType: () => "postgresql",
      });

      const dbType = transactionService.getDatabaseType();

      expect(dbType).toBe("postgresql");
    });

    it("应该检查事务支持", () => {
      mockConnectionManager.getDriver.mockReturnValue({
        getDriverType: () => "postgresql",
      });

      const supports = transactionService.supportsTransactions();

      expect(supports).toBe(true);
    });

    it("应该获取支持的隔离级别", () => {
      mockConnectionManager.getDriver.mockReturnValue({
        getDriverType: () => "postgresql",
      });

      const levels = transactionService.getSupportedIsolationLevels();

      expect(levels).toContain("READ_UNCOMMITTED");
      expect(levels).toContain("READ_COMMITTED");
      expect(levels).toContain("REPEATABLE_READ");
      expect(levels).toContain("SERIALIZABLE");
    });

    it("应该检查是否在事务中", () => {
      (mockCls.get as jest.Mock).mockReturnValue(undefined);

      const inTransaction = transactionService.isInTransaction();

      expect(inTransaction).toBe(false);
    });

    it("应该获取事务 ID", () => {
      (mockCls.get as jest.Mock).mockReturnValue("txn_123");

      const transactionId = transactionService.getTransactionId();

      expect(transactionId).toBe("txn_123");
    });
  });

  describe("PostgreSQLTransactionAdapter", () => {
    it("应该正确初始化", () => {
      expect(postgresqlAdapter).toBeDefined();
    });

    it("应该支持隔离级别", () => {
      const supports = postgresqlAdapter.supportsIsolationLevel(
        postgresqlAdapter.getSupportedIsolationLevels()[1], // READ_COMMITTED
      );
      expect(supports).toBe(true);
    });

    it("应该获取支持的隔离级别", () => {
      const levels = postgresqlAdapter.getSupportedIsolationLevels();
      expect(levels.length).toBeGreaterThan(0);
    });

    it("应该获取事务统计", async () => {
      const stats = await postgresqlAdapter.getTransactionStats();
      expect(stats).toHaveProperty("activeTransactions");
      expect(stats).toHaveProperty("totalTransactions");
    });
  });

  describe("MongoDBTransactionAdapter", () => {
    it("应该正确初始化", () => {
      expect(mongodbAdapter).toBeDefined();
    });

    it("应该支持隔离级别", () => {
      const supports = mongodbAdapter.supportsIsolationLevel(
        mongodbAdapter.getSupportedIsolationLevels()[0], // First supported level
      );
      expect(supports).toBe(true);
    });

    it("应该获取支持的隔离级别", () => {
      const levels = mongodbAdapter.getSupportedIsolationLevels();
      expect(levels.length).toBeGreaterThan(0);
    });

    it("应该检查事务支持", async () => {
      const supports = await mongodbAdapter.checkTransactionSupport();
      expect(typeof supports).toBe("boolean");
    });

    it("应该获取事务统计", async () => {
      const stats = await mongodbAdapter.getTransactionStats();
      expect(stats).toHaveProperty("activeTransactions");
      expect(stats).toHaveProperty("totalTransactions");
    });
  });

  describe("UnifiedTransactionManager", () => {
    it("应该正确初始化", () => {
      expect(unifiedManager).toBeDefined();
    });

    it("应该获取数据库信息", () => {
      const info = unifiedManager.getDatabaseInfo();
      expect(info).toHaveProperty("type");
      expect(info).toHaveProperty("supportsTransactions");
      expect(info).toHaveProperty("supportedIsolationLevels");
    });

    it("应该获取事务统计", async () => {
      const stats = await unifiedManager.getTransactionStats();
      expect(stats).toHaveProperty("databaseType");
      expect(stats).toHaveProperty("activeTransactions");
    });
  });

  describe("TransactionFactory", () => {
    it("应该正确初始化", () => {
      expect(transactionFactory).toBeDefined();
    });

    it("应该获取默认配置", () => {
      const config = transactionFactory.getDefaultConfig();
      expect(config).toHaveProperty("databaseType");
      expect(config).toHaveProperty("defaultTimeout");
    });

    it("应该验证配置", () => {
      const validConfig = {
        databaseType: "postgresql" as const,
        defaultTimeout: 60000,
        defaultRetries: 3,
      };

      const result = transactionFactory.validateConfig(validConfig);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("应该检测无效配置", () => {
      const invalidConfig = {
        databaseType: "invalid" as any,
        defaultTimeout: 500,
        defaultRetries: -1,
      };

      const result = transactionFactory.validateConfig(invalidConfig);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe("TransactionMonitor", () => {
    it("应该正确初始化", () => {
      expect(transactionMonitor).toBeDefined();
    });

    it("应该开始监控事务", () => {
      transactionMonitor.startTransaction(
        "txn_123",
        "postgresql",
        "READ_COMMITTED",
      );

      const activeTransactions = transactionMonitor.getActiveTransactions();
      expect(activeTransactions).toHaveLength(1);
      expect(activeTransactions[0].transactionId).toBe("txn_123");
    });

    it("应该记录事务提交", () => {
      transactionMonitor.startTransaction("txn_123", "postgresql");
      transactionMonitor.commitTransaction("txn_123");

      const activeTransactions = transactionMonitor.getActiveTransactions();
      expect(activeTransactions).toHaveLength(0);
    });

    it("应该记录事务回滚", () => {
      transactionMonitor.startTransaction("txn_123", "postgresql");
      transactionMonitor.rollbackTransaction("txn_123", "Test error");

      const activeTransactions = transactionMonitor.getActiveTransactions();
      expect(activeTransactions).toHaveLength(0);
    });

    it("应该记录事务超时", () => {
      transactionMonitor.startTransaction("txn_123", "postgresql");
      transactionMonitor.timeoutTransaction("txn_123", 60000);

      const activeTransactions = transactionMonitor.getActiveTransactions();
      expect(activeTransactions).toHaveLength(0);
    });

    it("应该获取事务统计", () => {
      transactionMonitor.startTransaction("txn_123", "postgresql");
      transactionMonitor.commitTransaction("txn_123");

      const stats = transactionMonitor.getTransactionStats();
      expect(stats.totalTransactions).toBe(1);
      expect(stats.successfulTransactions).toBe(1);
      expect(stats.successRate).toBe(100);
    });

    it("应该获取事务事件", () => {
      transactionMonitor.startTransaction("txn_123", "postgresql");
      transactionMonitor.commitTransaction("txn_123");

      const events = transactionMonitor.getTransactionEvents();
      expect(events).toHaveLength(2);
      expect(events[0].type).toBe("started");
      expect(events[1].type).toBe("committed");
    });

    it("应该清理所有数据", () => {
      transactionMonitor.startTransaction("txn_123", "postgresql");
      transactionMonitor.clearAll();

      const activeTransactions = transactionMonitor.getActiveTransactions();
      const events = transactionMonitor.getTransactionEvents();

      expect(activeTransactions).toHaveLength(0);
      expect(events).toHaveLength(0);
    });
  });

  describe("DatabaseTransactionException", () => {
    it("应该创建基本异常", () => {
      const exception = new DatabaseTransactionException("测试错误");

      expect(exception.exceptionType).toBe(
        TransactionExceptionType.EXECUTION_FAILED,
      );
      expect(exception.detail).toBe("测试错误");
    });

    it("应该创建执行失败异常", () => {
      const exception = DatabaseTransactionException.executionFailed(
        "执行失败",
        {
          transactionId: "txn_123",
          databaseType: "postgresql",
        },
      );

      expect(exception.exceptionType).toBe(
        TransactionExceptionType.EXECUTION_FAILED,
      );
      expect(exception.exceptionData.transactionId).toBe("txn_123");
    });

    it("应该创建提交失败异常", () => {
      const exception = DatabaseTransactionException.commitFailed("提交失败");

      expect(exception.exceptionType).toBe(
        TransactionExceptionType.COMMIT_FAILED,
      );
    });

    it("应该创建回滚失败异常", () => {
      const exception = DatabaseTransactionException.rollbackFailed("回滚失败");

      expect(exception.exceptionType).toBe(
        TransactionExceptionType.ROLLBACK_FAILED,
      );
    });

    it("应该创建超时异常", () => {
      const exception = DatabaseTransactionException.timeout("事务超时", {
        duration: 60000,
      });

      expect(exception.exceptionType).toBe(TransactionExceptionType.TIMEOUT);
      expect(exception.exceptionData.duration).toBe(60000);
    });

    it("应该创建死锁异常", () => {
      const exception = DatabaseTransactionException.deadlock("检测到死锁");

      expect(exception.exceptionType).toBe(TransactionExceptionType.DEADLOCK);
    });

    it("应该检查是否可重试", () => {
      const retryableException =
        DatabaseTransactionException.connectionFailed("连接失败");
      const nonRetryableException =
        DatabaseTransactionException.deadlock("死锁");

      expect(retryableException.isRetryable()).toBe(true);
      expect(nonRetryableException.isRetryable()).toBe(false);
    });

    it("应该检查是否为死锁", () => {
      const deadlockException = DatabaseTransactionException.deadlock("死锁");
      const timeoutException = DatabaseTransactionException.timeout("超时");

      expect(deadlockException.isDeadlock()).toBe(true);
      expect(timeoutException.isDeadlock()).toBe(false);
    });

    it("应该检查是否为超时", () => {
      const timeoutException = DatabaseTransactionException.timeout("超时");
      const deadlockException = DatabaseTransactionException.deadlock("死锁");

      expect(timeoutException.isTimeout()).toBe(true);
      expect(deadlockException.isTimeout()).toBe(false);
    });

    it("应该获取异常摘要", () => {
      const exception = DatabaseTransactionException.executionFailed(
        "执行失败",
        {
          transactionId: "txn_123",
          databaseType: "postgresql",
          duration: 1000,
          retryCount: 2,
        },
      );

      const summary = exception.getExceptionSummary();

      expect(summary.type).toBe(TransactionExceptionType.EXECUTION_FAILED);
      expect(summary.message).toBe("执行失败");
      expect(summary.transactionId).toBe("txn_123");
      expect(summary.databaseType).toBe("postgresql");
      expect(summary.duration).toBe(1000);
      expect(summary.retryCount).toBe(2);
    });
  });

  describe("集成测试", () => {
    it("应该完整的事务流程", async () => {
      // 模拟事务执行
      const mockTransactionEm = {
        persistAndFlush: jest.fn().mockResolvedValue(undefined),
        persist: jest.fn().mockResolvedValue(undefined),
        flush: jest.fn().mockResolvedValue(undefined),
        find: jest.fn().mockResolvedValue([]),
        findOne: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockReturnValue({}),
        remove: jest.fn().mockResolvedValue(undefined),
        removeAndFlush: jest.fn().mockResolvedValue(undefined),
        transactional: jest.fn().mockImplementation(async (callback) => {
          return callback(mockTransactionEm);
        }),
      };

      // 创建新的模块实例以避免状态污染
      const testModule: TestingModule = await Test.createTestingModule({
        providers: [
          TransactionService,
          {
            provide: MikroORM,
            useValue: {
              em: {
                fork: jest.fn().mockReturnValue({
                  transactional: jest
                    .fn()
                    .mockImplementation(async (callback) => {
                      return callback(mockTransactionEm);
                    }),
                }),
              },
              config: {
                get: jest.fn(),
              },
            },
          },
          {
            provide: ClsService,
            useValue: {
              get: jest.fn().mockReturnValue(undefined),
              set: jest.fn(),
            },
          },
          {
            provide: Logger,
            useValue: mockLoggerService,
          },
          {
            provide: ConnectionManager,
            useValue: mockConnectionManager,
          },
        ],
      }).compile();

      const testTransactionService =
        testModule.get<TransactionService>(TransactionService);

      const result = await testTransactionService.runInTransaction(
        async (transactionEm) => {
          await transactionEm.persistAndFlush({});
          return "success";
        },
      );

      expect(result).toBe("success");
      expect(mockTransactionEm.persistAndFlush).toHaveBeenCalled();
    });

    it("应该处理事务错误", async () => {
      mockOrmService.em.fork.mockReturnValue({
        transactional: jest.fn().mockRejectedValue(new Error("数据库错误")),
      });

      await expect(
        transactionService.runInTransaction(async (_em) => {
          throw new Error("业务错误");
        }),
      ).rejects.toThrow();
    });
  });
});
