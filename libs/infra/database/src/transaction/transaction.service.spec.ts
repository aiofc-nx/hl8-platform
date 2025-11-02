/**
 * 事务服务测试
 *
 * @description 测试 TransactionService 的事务管理功能
 */

import { Logger } from "@hl8/logger";
import { EntityManager, MikroORM } from "@mikro-orm/core";
import { Test, TestingModule } from "@nestjs/testing";
import { ClsService } from "nestjs-cls";
import { ConnectionManager } from "../connection/connection.manager.js";
import { DatabaseTransactionException } from "../exceptions/database-transaction.exception.js";
import { TransactionService } from "./transaction.service.js";

describe("TransactionService", () => {
  let service: TransactionService;
  let mockOrm: jest.Mocked<MikroORM>;
  let mockCls: jest.Mocked<ClsService>;
  let mockLogger: jest.Mocked<Logger>;
  let mockEm: jest.Mocked<EntityManager>;

  beforeEach(async () => {
    mockLogger = {
      log: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    } as any;

    mockCls = {
      get: jest.fn(),
      set: jest.fn(),
    } as any;

    mockEm = {
      fork: jest.fn(),
      transactional: jest.fn((callback) => callback(mockEm)),
      persistAndFlush: jest.fn(),
    } as any;

    (mockEm.fork as jest.Mock).mockReturnValue(mockEm);

    mockOrm = {
      em: mockEm,
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionService,
        {
          provide: MikroORM,
          useValue: mockOrm,
        },
        {
          provide: ClsService,
          useValue: mockCls,
        },
        {
          provide: ConnectionManager,
          useValue: {
            getDriver: jest.fn().mockReturnValue({
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
            }),
          },
        },
        {
          provide: Logger,
          useValue: mockLogger,
        },
      ],
    }).compile();

    service = module.get<TransactionService>(TransactionService);
  });

  describe("runInTransaction", () => {
    it("应该成功执行事务并返回结果", async () => {
      mockCls.get.mockReturnValue(undefined);

      const result = await service.runInTransaction(async (_em) => {
        return "success";
      });

      expect(result).toBe("success");
      expect(mockLogger.log).toHaveBeenCalledWith(
        "事务提交成功",
        expect.objectContaining({ duration: expect.any(Number) }),
      );
    });

    it("应该在事务失败时回滚并抛出异常", async () => {
      mockCls.get.mockReturnValue(undefined);
      mockEm.transactional.mockRejectedValue(new Error("Transaction failed"));

      await expect(
        service.runInTransaction(async () => {
          throw new Error("Transaction failed");
        }),
      ).rejects.toThrow(DatabaseTransactionException);
    });

    it("应该复用现有事务的 EntityManager", async () => {
      mockCls.get.mockReturnValue(mockEm);

      const result = await service.runInTransaction(async (em) => {
        expect(em).toBe(mockEm);
        return "success";
      });

      expect(result).toBe("success");
      expect(mockLogger.debug).toHaveBeenCalledWith(
        "检测到现有事务，复用 EntityManager",
      );
    });
  });

  describe("isInTransaction", () => {
    it("应该正确判断是否在事务中", () => {
      mockCls.get.mockReturnValue(mockEm);
      expect(service.isInTransaction()).toBe(true);

      mockCls.get.mockReturnValue(undefined);
      expect(service.isInTransaction()).toBe(false);
    });
  });
});
