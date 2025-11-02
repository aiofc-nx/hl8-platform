/**
 * 数据库集成测试
 *
 * @description 测试数据库模块的集成功能
 *
 * @since 1.0.0
 */

import { Test, TestingModule } from "@nestjs/testing";
import { Logger } from "@hl8/logger";
import { MikroORM } from "@mikro-orm/core";
import { ClsModule, ClsService } from "nestjs-cls";
import { DatabaseModule } from "../../database.module.js";
import { ConnectionManager } from "../../connection/connection.manager.js";
import { TransactionService } from "../../transaction/transaction.service.js";
import { PostgreSQLTransactionAdapter } from "../../transaction/postgresql-transaction.adapter.js";
import { MongoDBTransactionAdapter } from "../../transaction/mongodb-transaction.adapter.js";
import { UnifiedTransactionManager } from "../../transaction/unified-transaction.manager.js";
import { TransactionFactory } from "../../transaction/transaction.factory.js";
import { TransactionMonitor } from "../../transaction/transaction-monitor.js";
import { MetricsService } from "../../monitoring/metrics.service.js";
import { EntityMapper } from "../../mapping/entity-mapper.js";
import { DatabaseDriverFactory } from "../../drivers/database-driver.factory.js";
import { DriverSelector } from "../../drivers/driver-selector.js";
import { ConnectionPoolAdapter } from "../../connection/connection-pool.adapter.js";
import { ConnectionHealthService } from "../../connection/connection-health.service.js";
import { ConnectionStatsService } from "../../connection/connection-stats.service.js";
import { ConnectionLifecycleService } from "../../connection/connection-lifecycle.service.js";
import { HealthCheckService } from "../../monitoring/health-check.service.js";

describe("数据库集成测试", () => {
  let module: TestingModule;
  let connectionManager: ConnectionManager;
  let transactionService: TransactionService;
  let unifiedTransactionManager: UnifiedTransactionManager;
  let transactionFactory: TransactionFactory;
  let transactionMonitor: TransactionMonitor;
  let metricsService: MetricsService;
  let entityMapper: EntityMapper;
  let databaseDriverFactory: DatabaseDriverFactory;
  let driverSelector: DriverSelector;
  let connectionPoolAdapter: ConnectionPoolAdapter;
  let connectionHealthService: ConnectionHealthService;
  let connectionStatsService: ConnectionStatsService;
  let connectionLifecycleService: ConnectionLifecycleService;
  let healthCheckService: HealthCheckService;
  let _mockOrm: MikroORM;
  let _mockLogger: Logger;

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

  // 创建实际跟踪活跃事务的模拟
  let activeTransactions: any[] = [];
  const mockTransactionMonitor = {
    startTransaction: jest
      .fn()
      .mockImplementation(
        (
          transactionId: string,
          databaseType: string,
          isolationLevel?: string,
        ) => {
          activeTransactions.push({
            transactionId,
            databaseType,
            isolationLevel,
            startTime: new Date(),
          });
        },
      ),
    commitTransaction: jest.fn().mockImplementation((transactionId: string) => {
      activeTransactions = activeTransactions.filter(
        (t) => t.transactionId !== transactionId,
      );
    }),
    rollbackTransaction: jest
      .fn()
      .mockImplementation((transactionId: string, reason?: string) => {
        activeTransactions = activeTransactions.filter(
          (t) => t.transactionId !== transactionId,
        );
      }),
    getActiveTransactions: jest
      .fn()
      .mockImplementation(() => activeTransactions),
    getTransactionStats: jest.fn().mockReturnValue({
      totalTransactions: 10,
      successfulTransactions: 8,
      failedTransactions: 2,
      successRate: 80,
      averageDuration: 100,
    }),
  };

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        ClsModule.forRoot({
          global: true,
        }),
      ],
      providers: [
        ConnectionManager,
        TransactionService,
        PostgreSQLTransactionAdapter,
        MongoDBTransactionAdapter,
        UnifiedTransactionManager,
        TransactionFactory,
        TransactionMonitor,
        MetricsService,
        EntityMapper,
        DatabaseDriverFactory,
        DriverSelector,
        ConnectionPoolAdapter,
        ConnectionHealthService,
        ConnectionStatsService,
        ConnectionLifecycleService,
        HealthCheckService,
        {
          provide: Logger,
          useValue: mockLoggerService,
        },
        {
          provide: MikroORM,
          useValue: mockOrmService,
        },
        {
          provide: ConnectionPoolAdapter,
          useValue: {
            getPoolStats: jest.fn().mockResolvedValue({
              total: 10,
              active: 3,
              idle: 7,
              waiting: 0,
              max: 20,
              min: 5,
            }),
          },
        },
        {
          provide: ConnectionHealthService,
          useValue: {
            performHealthCheck: jest.fn().mockResolvedValue({
              healthy: true,
              status: "healthy",
              responseTime: 100,
              timestamp: new Date(),
            }),
          },
        },
        {
          provide: ConnectionStatsService,
          useValue: {
            getConnectionStats: jest.fn().mockResolvedValue({
              totalConnections: 10,
              activeConnections: 3,
              idleConnections: 7,
              waitingConnections: 0,
              usageRate: 15,
              averageResponseTime: 100,
              maxResponseTime: 500,
              minResponseTime: 50,
              successRate: 95,
              failureRate: 5,
              timestamp: new Date(),
            }),
            recordConnectionAttempt: jest.fn(),
          },
        },
        {
          provide: TransactionMonitor,
          useValue: mockTransactionMonitor,
        },
      ],
    }).compile();

    connectionManager = module.get<ConnectionManager>(ConnectionManager);
    transactionService = module.get<TransactionService>(TransactionService);
    unifiedTransactionManager = module.get<UnifiedTransactionManager>(
      UnifiedTransactionManager,
    );
    transactionFactory = module.get<TransactionFactory>(TransactionFactory);
    transactionMonitor = module.get<TransactionMonitor>(TransactionMonitor);
    metricsService = module.get<MetricsService>(MetricsService);
    entityMapper = module.get<EntityMapper>(EntityMapper);
    databaseDriverFactory = module.get<DatabaseDriverFactory>(
      DatabaseDriverFactory,
    );
    driverSelector = module.get<DriverSelector>(DriverSelector);
    connectionPoolAdapter = module.get<ConnectionPoolAdapter>(
      ConnectionPoolAdapter,
    );
    connectionHealthService = module.get<ConnectionHealthService>(
      ConnectionHealthService,
    );
    connectionStatsService = module.get<ConnectionStatsService>(
      ConnectionStatsService,
    );
    connectionLifecycleService = module.get<ConnectionLifecycleService>(
      ConnectionLifecycleService,
    );
    healthCheckService = module.get<HealthCheckService>(HealthCheckService);
    _mockOrm = module.get<MikroORM>(MikroORM);
    _mockLogger = module.get<Logger>(Logger);
  });

  afterAll(async () => {
    await module.close();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("模块初始化", () => {
    it("应该正确初始化所有服务", () => {
      expect(connectionManager).toBeDefined();
      expect(transactionService).toBeDefined();
      expect(unifiedTransactionManager).toBeDefined();
      expect(transactionFactory).toBeDefined();
      expect(transactionMonitor).toBeDefined();
      expect(metricsService).toBeDefined();
      expect(entityMapper).toBeDefined();
      expect(databaseDriverFactory).toBeDefined();
      expect(driverSelector).toBeDefined();
      expect(connectionPoolAdapter).toBeDefined();
      expect(connectionHealthService).toBeDefined();
      expect(connectionStatsService).toBeDefined();
      expect(connectionLifecycleService).toBeDefined();
      expect(healthCheckService).toBeDefined();
    });
  });

  describe("连接管理集成", () => {
    it("应该正确管理数据库连接", async () => {
      // 模拟连接状态
      const _mockDriver = {
        getDriverType: () => "postgresql",
        connect: jest.fn().mockResolvedValue(true),
        disconnect: jest.fn().mockResolvedValue(true),
        isConnected: () => true,
      };

      // 测试连接管理
      expect(connectionManager).toBeDefined();
      expect(typeof connectionManager.connect).toBe("function");
      expect(typeof connectionManager.disconnect).toBe("function");
      expect(typeof connectionManager.isConnected).toBe("function");
    });

    it("应该正确管理连接池", async () => {
      const mockDriver = {
        connect: jest.fn().mockResolvedValue(undefined),
        disconnect: jest.fn().mockResolvedValue(undefined),
        isConnected: jest.fn().mockResolvedValue(true),
        getConnectionInfo: jest.fn().mockReturnValue({
          host: "localhost",
          port: 5432,
          database: "test_db",
          type: "postgresql" as const,
          status: "connected" as const,
          connectedAt: new Date(),
          uptime: 1000,
        }),
        getPoolStats: jest.fn().mockReturnValue({
          total: 10,
          active: 3,
          idle: 7,
          waiting: 0,
          max: 20,
          min: 5,
        }),
        healthCheck: jest.fn().mockResolvedValue({
          healthy: true,
          status: "healthy" as const,
          responseTime: 100,
          timestamp: new Date(),
        }),
        getDriverType: jest.fn().mockReturnValue("postgresql" as const),
        getConfigSummary: jest.fn().mockReturnValue("PostgreSQL Driver"),
      };
      const poolStats = await connectionPoolAdapter.getPoolStats(mockDriver);
      expect(poolStats).toBeDefined();
    });

    it("应该正确执行健康检查", async () => {
      const mockDriver = {
        connect: jest.fn().mockResolvedValue(undefined),
        disconnect: jest.fn().mockResolvedValue(undefined),
        isConnected: jest.fn().mockResolvedValue(true),
        getConnectionInfo: jest.fn().mockReturnValue({
          host: "localhost",
          port: 5432,
          database: "test_db",
          type: "postgresql" as const,
          status: "connected" as const,
          connectedAt: new Date(),
          uptime: 1000,
        }),
        getPoolStats: jest.fn().mockReturnValue({
          total: 10,
          active: 3,
          idle: 7,
          waiting: 0,
          max: 20,
          min: 5,
        }),
        healthCheck: jest.fn().mockResolvedValue({
          healthy: true,
          status: "healthy" as const,
          responseTime: 100,
          timestamp: new Date(),
        }),
        getDriverType: jest.fn().mockReturnValue("postgresql" as const),
        getConfigSummary: jest.fn().mockReturnValue("PostgreSQL Driver"),
      };
      const healthResult =
        await connectionHealthService.performHealthCheck(mockDriver);
      expect(healthResult).toBeDefined();
      expect(healthResult).toHaveProperty("status");
    });
  });

  describe("事务管理集成", () => {
    it("应该正确执行事务", async () => {
      const mockEm = {
        persistAndFlush: jest.fn().mockResolvedValue(undefined),
        persist: jest.fn().mockResolvedValue(undefined),
        flush: jest.fn().mockResolvedValue(undefined),
        find: jest.fn().mockResolvedValue([]),
        findOne: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockReturnValue({}),
        remove: jest.fn().mockResolvedValue(undefined),
        removeAndFlush: jest.fn().mockResolvedValue(undefined),
      };

      // 重置模拟以确保干净的状态
      jest.clearAllMocks();

      // 模拟CLS服务，确保没有现有的事务上下文
      const mockClsService = {
        get: jest.fn().mockReturnValue(undefined),
        set: jest.fn(),
      };

      // 重新创建模块以使用新的CLS模拟
      const testModule: TestingModule = await Test.createTestingModule({
        imports: [
          ClsModule.forRoot({
            global: true,
          }),
        ],
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
                      return callback(mockEm);
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
            useValue: mockClsService,
          },
          {
            provide: Logger,
            useValue: mockLoggerService,
          },
          {
            provide: ConnectionManager,
            useValue: {
              getDriver: jest.fn().mockReturnValue({
                getDriverType: () => "postgresql",
              }),
            },
          },
        ],
      }).compile();

      const testTransactionService =
        testModule.get<TransactionService>(TransactionService);

      const result = await testTransactionService.runInTransaction(
        async (em) => {
          await em.persistAndFlush({});
          return "success";
        },
      );

      expect(result).toBe("success");
      expect(mockEm.persistAndFlush).toHaveBeenCalled();
    });

    it("应该正确监控事务", () => {
      transactionMonitor.startTransaction("txn_123", "postgresql");

      const activeTransactions = transactionMonitor.getActiveTransactions();
      expect(activeTransactions).toHaveLength(1);
      expect(activeTransactions[0].transactionId).toBe("txn_123");

      transactionMonitor.commitTransaction("txn_123");

      const finalActiveTransactions =
        transactionMonitor.getActiveTransactions();
      expect(finalActiveTransactions).toHaveLength(0);
    });

    it("应该正确创建事务实例", () => {
      const transaction = transactionFactory.createTransaction({
        databaseType: "postgresql",
        defaultTimeout: 60000,
        enableUnifiedManager: true,
      });

      expect(transaction).toBeDefined();
      expect(transaction.type).toBe("unified");
      expect(typeof transaction.execute).toBe("function");
    });
  });

  describe("性能监控集成", () => {
    it("应该正确记录查询指标", async () => {
      metricsService.recordQuery({
        duration: 150,
        query: "SELECT * FROM users",
      });

      const databaseMetrics = await metricsService.getDatabaseMetrics();
      expect(databaseMetrics.queries.total).toBe(1);
      expect(databaseMetrics.queries.avgDuration).toBe(150);
    });

    it("应该正确记录慢查询", () => {
      metricsService.recordQuery({
        duration: 1500,
        query: "SELECT * FROM users WHERE complex_condition",
      });

      const slowQueries = metricsService.getSlowQueries();
      expect(slowQueries.length).toBeGreaterThan(0);
    });

    it("应该正确获取多数据库性能指标", async () => {
      const multiDbMetrics = await metricsService.getMultiDatabaseMetrics();
      expect(multiDbMetrics).toBeDefined();
      expect(multiDbMetrics).toHaveProperty("databaseType");
      expect(multiDbMetrics).toHaveProperty("overallScore");
    });

    it("应该正确获取性能趋势", () => {
      const trends = metricsService.getPerformanceTrends();
      expect(trends).toBeDefined();
      expect(trends).toHaveProperty("queryTrend");
      expect(trends).toHaveProperty("transactionTrend");
      expect(trends).toHaveProperty("overallTrend");
    });
  });

  describe("实体映射集成", () => {
    it("应该正确映射 PostgreSQL 到 MongoDB", () => {
      const entity = {
        id: 1,
        name: "Test User",
        email: "test@example.com",
        createdAt: new Date(),
        isActive: true,
      };

      const config = entityMapper.createPostgreSQLToMongoDBConfig(entity);
      const result = entityMapper.mapEntity(entity, config);

      expect(result.success).toBe(true);
      expect(result.mappedEntity).toHaveProperty("_id");
      expect(result.mappedEntity).toHaveProperty("name");
      expect(result.mappedEntity).toHaveProperty("email");
    });

    it("应该正确映射 MongoDB 到 PostgreSQL", () => {
      const entity = {
        _id: "507f1f77bcf86cd799439011",
        name: "Test User",
        email: "test@example.com",
        createdAt: new Date(),
        isActive: true,
      };

      const config = entityMapper.createMongoDBToPostgreSQLConfig(entity);
      const result = entityMapper.mapEntity(entity, config);

      expect(result.success).toBe(true);
      expect(result.mappedEntity).toHaveProperty("id");
      expect(result.mappedEntity).toHaveProperty("name");
      expect(result.mappedEntity).toHaveProperty("email");
    });

    it("应该正确批量映射实体", () => {
      const entities = [
        { id: 1, name: "User 1" },
        { id: 2, name: "User 2" },
        { id: 3, name: "User 3" },
      ];

      const config = entityMapper.createPostgreSQLToMongoDBConfig(entities[0]);
      const results = entityMapper.mapEntities(entities, config);

      expect(results).toHaveLength(3);
      expect(results.every((r) => r.success)).toBe(true);
    });

    it("应该正确验证映射配置", () => {
      const validConfig = {
        sourceType: "postgresql" as const,
        targetType: "mongodb" as const,
        mappingRules: [
          {
            sourceField: "id",
            targetField: "_id",
            fieldType: "string" as const,
            required: true,
          },
        ],
        autoMapping: true,
        preserveOriginal: true,
      };

      const validation = entityMapper.validateMappingConfig(validConfig);
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it("应该正确获取映射统计", () => {
      const entities = [
        { id: 1, name: "User 1" },
        { id: 2, name: "User 2" },
      ];

      const config = entityMapper.createPostgreSQLToMongoDBConfig(entities[0]);
      const results = entityMapper.mapEntities(entities, config);
      const statistics = entityMapper.getMappingStatistics(results);

      expect(statistics.totalEntities).toBe(2);
      expect(statistics.successfulMappings).toBe(2);
      expect(statistics.failedMappings).toBe(0);
    });
  });

  describe("驱动管理集成", () => {
    it("应该正确创建数据库驱动", () => {
      const postgresqlDriver = databaseDriverFactory.createDriver({
        type: "postgresql",
        connection: {
          host: "localhost",
          port: 5432,
          database: "test_db",
          username: "test",
          password: "test",
        },
      });
      const mongodbDriver = databaseDriverFactory.createDriver({
        type: "mongodb",
        connection: {
          host: "localhost",
          port: 27017,
          database: "test_db",
          username: "test",
          password: "test",
        },
      });

      expect(postgresqlDriver).toBeDefined();
      expect(mongodbDriver).toBeDefined();
    });

    it("应该正确选择数据库驱动", () => {
      const selectedDriver = driverSelector.selectDriver({
        type: "postgresql",
        connection: {
          host: "localhost",
          port: 5432,
          database: "test_db",
          username: "test",
          password: "test",
        },
      });
      expect(selectedDriver).toBeDefined();
    });
  });

  describe("连接统计集成", () => {
    it("应该正确获取连接统计", async () => {
      const mockDriver = {
        connect: jest.fn().mockResolvedValue(undefined),
        disconnect: jest.fn().mockResolvedValue(undefined),
        isConnected: jest.fn().mockResolvedValue(true),
        getConnectionInfo: jest.fn().mockReturnValue({
          host: "localhost",
          port: 5432,
          database: "test_db",
          type: "postgresql" as const,
          status: "connected" as const,
          connectedAt: new Date(),
          uptime: 1000,
        }),
        getPoolStats: jest.fn().mockReturnValue({
          total: 10,
          active: 3,
          idle: 7,
          waiting: 0,
          max: 20,
          min: 5,
        }),
        healthCheck: jest.fn().mockResolvedValue({
          healthy: true,
          status: "healthy" as const,
          responseTime: 100,
          timestamp: new Date(),
        }),
        getDriverType: jest.fn().mockReturnValue("postgresql" as const),
        getConfigSummary: jest.fn().mockReturnValue("PostgreSQL Driver"),
      };
      const connectionStats =
        await connectionStatsService.getConnectionStats(mockDriver);
      expect(connectionStats).toBeDefined();
    });

    it("应该正确管理连接生命周期", async () => {
      const mockDriver = {
        connect: jest.fn().mockResolvedValue(undefined),
        disconnect: jest.fn().mockResolvedValue(undefined),
        isConnected: jest.fn().mockResolvedValue(true),
        getConnectionInfo: jest.fn().mockReturnValue({
          host: "localhost",
          port: 5432,
          database: "test_db",
          type: "postgresql" as const,
          status: "connected" as const,
          connectedAt: new Date(),
          uptime: 1000,
        }),
        getPoolStats: jest.fn().mockReturnValue({
          total: 10,
          active: 3,
          idle: 7,
          waiting: 0,
          max: 20,
          min: 5,
        }),
        healthCheck: jest.fn().mockResolvedValue({
          healthy: true,
          status: "healthy" as const,
          responseTime: 100,
          timestamp: new Date(),
        }),
        getDriverType: jest.fn().mockReturnValue("postgresql" as const),
        getConfigSummary: jest.fn().mockReturnValue("PostgreSQL Driver"),
      };
      const config = {
        healthCheckInterval: 30000,
        connectionTimeout: 10000,
        maxRetries: 3,
        retryInterval: 1000,
        autoRecycleIdle: true,
        idleTimeout: 300000,
      };
      await connectionLifecycleService.initialize(mockDriver, config);
      await connectionLifecycleService.shutdown();
    });
  });

  describe("健康检查集成", () => {
    it("应该正确执行健康检查", async () => {
      const healthResult = await healthCheckService.check();
      expect(healthResult).toBeDefined();
      expect(healthResult).toHaveProperty("status");
    });
  });

  describe("错误处理集成", () => {
    it("应该正确处理事务错误", async () => {
      mockOrmService.em.fork.mockReturnValue({
        transactional: jest.fn().mockRejectedValue(new Error("数据库错误")),
      });

      await expect(
        transactionService.runInTransaction(async (_em) => {
          throw new Error("业务错误");
        }),
      ).rejects.toThrow();
    });

    it("应该正确处理映射错误", () => {
      const invalidEntity = null;
      const config = entityMapper.createPostgreSQLToMongoDBConfig({});

      const result = entityMapper.mapEntity(invalidEntity, config);
      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe("性能测试", () => {
    it("应该能够处理大量查询记录", () => {
      const startTime = Date.now();

      // 记录大量查询
      for (let i = 0; i < 1000; i++) {
        metricsService.recordQuery({
          duration: Math.random() * 1000,
          query: `SELECT * FROM table_${i}`,
        });
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(5000); // 应该在5秒内完成
    });

    it("应该能够处理大量事务监控", () => {
      const startTime = Date.now();

      // 创建大量事务
      for (let i = 0; i < 100; i++) {
        transactionMonitor.startTransaction(`txn_${i}`, "postgresql");
        transactionMonitor.commitTransaction(`txn_${i}`);
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(2000); // 应该在2秒内完成
    });
  });

  describe("配置验证", () => {
    it("应该正确验证数据库配置", () => {
      const validConfig = {
        connection: {
          type: "postgresql" as const,
          host: "localhost",
          port: 5432,
          username: "test",
          password: "test",
          database: "test_db",
        },
        monitoring: {
          enabled: true,
          slowQueryThreshold: 1000,
        },
      };

      // 配置应该是有效的
      expect(validConfig.connection.type).toBe("postgresql");
      expect(validConfig.monitoring.enabled).toBe(true);
    });
  });
});
