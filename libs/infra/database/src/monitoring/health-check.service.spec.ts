/**
 * 健康检查服务测试
 *
 * @description 测试 HealthCheckService 的健康检查功能
 */

import { Logger } from "@hl8/logger";
import { Test, TestingModule } from "@nestjs/testing";
import { ConnectionManager } from "../connection/connection.manager.js";
import { ConnectionHealthService } from "../connection/connection-health.service.js";
import { ConnectionPoolAdapter } from "../connection/connection-pool.adapter.js";
import { HealthCheckService } from "./health-check.service.js";

describe("HealthCheckService", () => {
  let service: HealthCheckService;
  let mockConnectionManager: jest.Mocked<ConnectionManager>;
  let mockLogger: jest.Mocked<Logger>;

  beforeEach(async () => {
    mockLogger = {
      log: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      error: jest.fn(),
    } as any;

    mockConnectionManager = {
      isConnected: jest.fn().mockResolvedValue(true),
      getPoolStats: jest.fn().mockResolvedValue({
        total: 10,
        active: 3,
        idle: 7,
        waiting: 0,
        max: 20,
        min: 5,
      }),
      getDriver: jest.fn().mockReturnValue({
        getDriverType: jest.fn().mockReturnValue("postgresql"),
        isConnected: jest.fn().mockResolvedValue(true),
      }),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HealthCheckService,
        {
          provide: ConnectionManager,
          useValue: mockConnectionManager,
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
          provide: Logger,
          useValue: mockLogger,
        },
      ],
    }).compile();

    service = module.get<HealthCheckService>(HealthCheckService);
  });

  describe("check", () => {
    it("应该返回健康状态", async () => {
      const result = await service.check();

      expect(result.status).toBe("healthy");
      expect(result.details?.connection).toBe(true);
      expect(result.responseTime).toBeGreaterThanOrEqual(0);
    });

    it("应该在连接失败时返回不健康状态", async () => {
      // Mock the ConnectionHealthService to return unhealthy status
      const mockConnectionHealthService = {
        performHealthCheck: jest.fn().mockResolvedValue({
          healthy: false,
          status: "unhealthy",
          responseTime: 100,
          timestamp: new Date(),
        }),
      };

      // Update the module to use the new mock
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          HealthCheckService,
          {
            provide: ConnectionManager,
            useValue: mockConnectionManager,
          },
          {
            provide: ConnectionHealthService,
            useValue: mockConnectionHealthService,
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
            provide: Logger,
            useValue: mockLogger,
          },
        ],
      }).compile();

      const service = module.get<HealthCheckService>(HealthCheckService);
      const result = await service.check();

      expect(result.status).toBe("unhealthy");
      expect(result.details?.connection).toBe(false);
    });

    it("应该在连接池接近上限时返回降级状态", async () => {
      // Mock the ConnectionHealthService to return degraded status
      const mockConnectionHealthService = {
        performHealthCheck: jest.fn().mockResolvedValue({
          healthy: true,
          status: "degraded",
          responseTime: 100,
          timestamp: new Date(),
        }),
      };

      // Update the module to use the new mock
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          HealthCheckService,
          {
            provide: ConnectionManager,
            useValue: mockConnectionManager,
          },
          {
            provide: ConnectionHealthService,
            useValue: mockConnectionHealthService,
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
            provide: Logger,
            useValue: mockLogger,
          },
        ],
      }).compile();

      const service = module.get<HealthCheckService>(HealthCheckService);
      const result = await service.check();

      expect(result.status).toBe("degraded");
    });

    it("应该处理检查异常", async () => {
      // Mock the ConnectionHealthService to throw an error
      const mockConnectionHealthService = {
        performHealthCheck: jest
          .fn()
          .mockRejectedValue(new Error("Check failed")),
      };

      // Update the module to use the new mock
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          HealthCheckService,
          {
            provide: ConnectionManager,
            useValue: mockConnectionManager,
          },
          {
            provide: ConnectionHealthService,
            useValue: mockConnectionHealthService,
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
            provide: Logger,
            useValue: mockLogger,
          },
        ],
      }).compile();

      const service = module.get<HealthCheckService>(HealthCheckService);
      const result = await service.check();

      expect(result.status).toBe("unhealthy");
      expect(result.error).toBe("Check failed");
    });
  });

  describe("getPoolStats", () => {
    it("应该返回连接池统计", async () => {
      const stats = await service.getPoolStats();

      expect(stats).toEqual({
        total: 10,
        active: 3,
        idle: 7,
        waiting: 0,
        max: 20,
        min: 5,
      });
    });
  });
});
