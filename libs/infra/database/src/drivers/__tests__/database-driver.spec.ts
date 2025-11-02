/**
 * 数据库驱动测试
 *
 * @description 测试数据库驱动的核心功能
 *
 * @since 1.0.0
 */

import { Test, TestingModule } from "@nestjs/testing";
import { Logger } from "@hl8/logger";
import { DatabaseDriverFactory } from "../database-driver.factory.js";
import { DriverSelector, DriverSelectionStrategy } from "../driver-selector.js";
import { DriverRegistry } from "../driver-registry.js";
import { PostgreSQLDriver } from "../postgresql.driver.js";
import { MongoDBDriver } from "../mongodb.driver.js";
import type { DatabaseDriverConfig } from "../database-driver.interface.js";

describe("数据库驱动测试", () => {
  let factory: DatabaseDriverFactory;
  let selector: DriverSelector;
  let registry: DriverRegistry;
  let logger: Logger;

  const mockLogger = {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DatabaseDriverFactory,
        DriverSelector,
        DriverRegistry,
        {
          provide: Logger,
          useValue: mockLogger,
        },
      ],
    }).compile();

    factory = module.get<DatabaseDriverFactory>(DatabaseDriverFactory);
    selector = module.get<DriverSelector>(DriverSelector);
    registry = module.get<DriverRegistry>(DriverRegistry);
    logger = module.get<Logger>(Logger);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("DatabaseDriverFactory", () => {
    it("应该创建 PostgreSQL 驱动", () => {
      const config: DatabaseDriverConfig = {
        type: "postgresql",
        connection: {
          host: "localhost",
          port: 5432,
          database: "test_db",
          username: "test_user",
          password: "test_pass",
        },
      };

      const driver = factory.createDriver(config);

      expect(driver).toBeInstanceOf(PostgreSQLDriver);
    });

    it("应该创建 MongoDB 驱动", () => {
      const config: DatabaseDriverConfig = {
        type: "mongodb",
        connection: {
          host: "localhost",
          port: 27017,
          database: "test_db",
          username: "test_user",
          password: "test_pass",
        },
      };

      const driver = factory.createDriver(config);

      expect(driver).toBeInstanceOf(MongoDBDriver);
    });

    it("应该抛出错误对于不支持的数据库类型", () => {
      const config: DatabaseDriverConfig = {
        type: "mysql" as any,
        connection: {
          host: "localhost",
          port: 3306,
          database: "test_db",
          username: "test_user",
          password: "test_pass",
        },
      };

      expect(() => factory.createDriver(config)).toThrow(
        "不支持的数据库类型: mysql",
      );
    });

    it("应该返回支持的数据库类型", () => {
      const supportedTypes = factory.getSupportedTypes();

      expect(supportedTypes).toContain("postgresql");
      expect(supportedTypes).toContain("mongodb");
    });

    it("应该验证数据库类型支持", () => {
      expect(factory.isSupportedType("postgresql")).toBe(true);
      expect(factory.isSupportedType("mongodb")).toBe(true);
      expect(factory.isSupportedType("mysql")).toBe(false);
    });
  });

  describe("DriverSelector", () => {
    it("应该基于配置选择驱动", () => {
      const config: DatabaseDriverConfig = {
        type: "postgresql",
        connection: {
          host: "localhost",
          port: 5432,
          database: "test_db",
          username: "test_user",
          password: "test_pass",
        },
      };

      const driver = selector.selectDriver(
        config,
        DriverSelectionStrategy.CONFIG_BASED,
      );

      expect(driver).toBeInstanceOf(PostgreSQLDriver);
    });

    it("应该基于负载选择驱动", () => {
      const config: DatabaseDriverConfig = {
        type: "mongodb",
        connection: {
          host: "localhost",
          port: 27017,
          database: "test_db",
          username: "test_user",
          password: "test_pass",
        },
      };

      const driver = selector.selectDriver(
        config,
        DriverSelectionStrategy.LOAD_BASED,
      );

      expect(driver).toBeInstanceOf(MongoDBDriver);
    });

    it("应该基于性能选择驱动", () => {
      const config: DatabaseDriverConfig = {
        type: "postgresql",
        connection: {
          host: "localhost",
          port: 5432,
          database: "test_db",
          username: "test_user",
          password: "test_pass",
        },
      };

      const driver = selector.selectDriver(
        config,
        DriverSelectionStrategy.PERFORMANCE_BASED,
      );

      expect(driver).toBeInstanceOf(PostgreSQLDriver);
    });

    it("应该基于可用性选择驱动", () => {
      const config: DatabaseDriverConfig = {
        type: "mongodb",
        connection: {
          host: "localhost",
          port: 27017,
          database: "test_db",
          username: "test_user",
          password: "test_pass",
        },
      };

      const driver = selector.selectDriver(
        config,
        DriverSelectionStrategy.AVAILABILITY_BASED,
      );

      expect(driver).toBeInstanceOf(MongoDBDriver);
    });

    it("应该返回推荐策略", () => {
      expect(selector.getRecommendedStrategy("development")).toBe(
        DriverSelectionStrategy.CONFIG_BASED,
      );
      expect(selector.getRecommendedStrategy("staging")).toBe(
        DriverSelectionStrategy.AVAILABILITY_BASED,
      );
      expect(selector.getRecommendedStrategy("production")).toBe(
        DriverSelectionStrategy.PERFORMANCE_BASED,
      );
    });
  });

  describe("DriverRegistry", () => {
    it("应该注册新驱动", () => {
      class CustomDriver {
        constructor() {}
      }

      registry.registerDriver({
        type: "custom",
        driverClass: CustomDriver as any,
        isDefault: false,
        description: "自定义驱动",
        version: "1.0.0",
      });

      expect(registry.isDriverRegistered("custom")).toBe(true);
    });

    it("应该注销驱动", () => {
      registry.unregisterDriver("mongodb");
      expect(registry.isDriverRegistered("mongodb")).toBe(false);
    });

    it("应该获取所有驱动", () => {
      const drivers = registry.getAllDrivers();

      expect(drivers.length).toBeGreaterThan(0);
      expect(drivers.some((d) => d.type === "postgresql")).toBe(true);
    });

    it("应该获取支持的驱动类型", () => {
      const types = registry.getSupportedTypes();

      expect(types).toContain("postgresql");
      expect(types).toContain("mongodb");
    });

    it("应该创建驱动实例", () => {
      const config: DatabaseDriverConfig = {
        type: "postgresql",
        connection: {
          host: "localhost",
          port: 5432,
          database: "test_db",
          username: "test_user",
          password: "test_pass",
        },
      };

      const driver = registry.createDriver(config);

      expect(driver).toBeInstanceOf(PostgreSQLDriver);
    });

    it("应该获取默认驱动类型", () => {
      expect(registry.getDefaultDriverType()).toBe("postgresql");
    });

    it("应该获取注册表统计信息", () => {
      const stats = registry.getRegistryStats();

      expect(stats.totalDrivers).toBeGreaterThan(0);
      expect(stats.supportedTypes).toContain("postgresql");
      expect(stats.defaultDriver).toBe("postgresql");
    });
  });

  describe("PostgreSQLDriver", () => {
    let driver: PostgreSQLDriver;
    let config: DatabaseDriverConfig;

    beforeEach(() => {
      config = {
        type: "postgresql",
        connection: {
          host: "localhost",
          port: 5432,
          database: "test_db",
          username: "test_user",
          password: "test_pass",
        },
      };
      driver = new PostgreSQLDriver(config, logger);
    });

    it("应该获取连接信息", () => {
      const info = driver.getConnectionInfo();

      expect(info.host).toBe("localhost");
      expect(info.port).toBe(5432);
      expect(info.database).toBe("test_db");
      expect(info.type).toBe("postgresql");
    });

    it("应该获取连接池统计", () => {
      const stats = driver.getPoolStats();

      expect(stats).toHaveProperty("total");
      expect(stats).toHaveProperty("active");
      expect(stats).toHaveProperty("idle");
      expect(stats).toHaveProperty("waiting");
      expect(stats).toHaveProperty("max");
      expect(stats).toHaveProperty("min");
    });
  });

  describe("MongoDBDriver", () => {
    let driver: MongoDBDriver;
    let config: DatabaseDriverConfig;

    beforeEach(() => {
      config = {
        type: "mongodb",
        connection: {
          host: "localhost",
          port: 27017,
          database: "test_db",
          username: "test_user",
          password: "test_pass",
        },
      };
      driver = new MongoDBDriver(config, logger);
    });

    it("应该获取连接信息", () => {
      const info = driver.getConnectionInfo();

      expect(info.host).toBe("localhost");
      expect(info.port).toBe(27017);
      expect(info.database).toBe("test_db");
      expect(info.type).toBe("mongodb");
    });

    it("应该获取连接池统计", () => {
      const stats = driver.getPoolStats();

      expect(stats).toHaveProperty("total");
      expect(stats).toHaveProperty("active");
      expect(stats).toHaveProperty("idle");
      expect(stats).toHaveProperty("waiting");
      expect(stats).toHaveProperty("max");
      expect(stats).toHaveProperty("min");
    });
  });
});
