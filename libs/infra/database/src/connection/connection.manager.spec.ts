/**
 * 连接管理器测试
 *
 * @description 测试 ConnectionManager 的核心功能
 */

import { Logger } from "@hl8/logger";
import { MikroORM } from "@mikro-orm/core";
import { Test, TestingModule } from "@nestjs/testing";
import { DatabaseConnectionException } from "../exceptions/database-connection.exception.js";
import { ConnectionManager } from "./connection.manager.js";
import { DatabaseDriverFactory } from "../drivers/database-driver.factory.js";
import { DriverSelector } from "../drivers/driver-selector.js";

describe("ConnectionManager", () => {
  let manager: ConnectionManager;
  let mockOrm: jest.Mocked<MikroORM>;
  let mockLogger: jest.Mocked<Logger>;

  beforeEach(async () => {
    mockLogger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    } as any;

    mockOrm = {
      isConnected: jest.fn().mockResolvedValue(true),
      close: jest.fn().mockResolvedValue(undefined),
      config: {
        get: jest.fn((key: string) => {
          const config: any = {
            type: "postgresql",
            host: "localhost",
            port: 5432,
            dbName: "test_db",
          };
          return config[key];
        }),
      },
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConnectionManager,
        {
          provide: MikroORM,
          useValue: mockOrm,
        },
        {
          provide: Logger,
          useValue: mockLogger,
        },
        {
          provide: DatabaseDriverFactory,
          useValue: {
            createDriver: jest.fn(),
          },
        },
        {
          provide: DriverSelector,
          useValue: {
            selectDriver: jest.fn(),
            getRecommendedStrategy: jest.fn().mockReturnValue("development"),
          },
        },
      ],
    }).compile();

    manager = module.get<ConnectionManager>(ConnectionManager);
  });

  describe("connect", () => {
    it("应该成功建立连接", async () => {
      await manager.connect();

      expect(mockLogger.log).toHaveBeenCalledWith("数据库连接已存在");
    });

    it("应该在连接失败时抛出异常", async () => {
      // 模拟连接检查失败
      mockOrm.isConnected.mockRejectedValue(new Error("Connection failed"));

      // 模拟驱动选择器失败，但设置重试次数为0以避免无限循环
      const mockDriverSelector = {
        getRecommendedStrategy: jest.fn().mockReturnValue("development"),
        selectDriver: jest.fn().mockImplementation(() => {
          throw new Error("Driver selection failed");
        }),
      };

      // 重新创建模块以使用新的模拟
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          ConnectionManager,
          {
            provide: MikroORM,
            useValue: mockOrm,
          },
          {
            provide: Logger,
            useValue: mockLogger,
          },
          {
            provide: DatabaseDriverFactory,
            useValue: {
              createDriver: jest.fn(),
            },
          },
          {
            provide: DriverSelector,
            useValue: mockDriverSelector,
          },
        ],
      }).compile();

      const testManager = module.get<ConnectionManager>(ConnectionManager);

      // 设置重试次数为0以避免超时
      (testManager as any).reconnectAttempts = 5; // 设置为最大重试次数

      await expect(testManager.connect()).rejects.toThrow(
        DatabaseConnectionException,
      );
    }, 10000); // 增加超时时间
  });

  describe("disconnect", () => {
    it("应该优雅关闭连接", async () => {
      // 设置一个模拟驱动
      const mockDriver = {
        disconnect: jest.fn().mockResolvedValue(undefined),
      };

      // 使用反射设置私有属性
      (manager as any).driver = mockDriver;

      await manager.disconnect();

      expect(mockDriver.disconnect).toHaveBeenCalled();
      expect(mockLogger.log).toHaveBeenCalledWith("数据库连接已关闭");
    });

    it("应该处理关闭失败的情况", async () => {
      // 设置一个模拟驱动，使其断开连接失败
      const mockDriver = {
        disconnect: jest.fn().mockRejectedValue(new Error("Close failed")),
      };

      // 使用反射设置私有属性
      (manager as any).driver = mockDriver;

      // 由于当前实现不抛出异常，我们只验证错误被记录
      await manager.disconnect();

      expect(mockDriver.disconnect).toHaveBeenCalled();
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe("isConnected", () => {
    it("应该返回连接状态", async () => {
      const connected = await manager.isConnected();
      expect(connected).toBe(true);
      expect(mockOrm.isConnected).toHaveBeenCalled();
    });
  });

  describe("getConnectionInfo", () => {
    it("应该返回连接信息", async () => {
      const info = await manager.getConnectionInfo();

      expect(info).toHaveProperty("status");
      expect(info).toHaveProperty("type");
      expect(info).toHaveProperty("host");
      expect(info).toHaveProperty("port");
      expect(info).toHaveProperty("database");
      expect(info).toHaveProperty("poolStats");
    });
  });
});
