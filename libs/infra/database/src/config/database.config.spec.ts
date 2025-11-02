/**
 * 数据库配置测试
 *
 * @description 测试 DatabaseConfig 类
 */

import { POOL_DEFAULTS } from "../constants/defaults.js";
import { DatabaseConfig } from "./database.config.js";

describe("DatabaseConfig", () => {
  let config: DatabaseConfig;

  beforeEach(() => {
    config = new DatabaseConfig();
    config.host = "localhost";
    config.port = 5432;
    config.database = "test_db";
    config.username = "test_user";
    config.password = "test_pass";
  });

  describe("默认值", () => {
    it("应该提供正确的默认值", () => {
      expect(config.type).toBe("postgresql");
      expect(config.host).toBe("localhost");
      expect(config.port).toBe(5432);
      expect(config.poolMin).toBe(POOL_DEFAULTS.MIN);
      expect(config.poolMax).toBe(POOL_DEFAULTS.MAX);
      expect(config.debug).toBe(false);
    });
  });

  describe("getConnectionString", () => {
    it("应该生成正确的 PostgreSQL 连接字符串", () => {
      const connStr = config.getConnectionString();
      expect(connStr).toBe(
        "postgresql://test_user:test_pass@localhost:5432/test_db",
      );
    });

    it("应该生成正确的 MongoDB 连接字符串", () => {
      config.type = "mongodb";
      const connStr = config.getConnectionString();
      expect(connStr).toBe(
        "mongodb://test_user:test_pass@localhost:5432/test_db",
      );
    });

    it("应该在不支持的数据库类型时抛出错误", () => {
      (config as any).type = "mysql";
      expect(() => config.getConnectionString()).toThrow(
        "不支持的数据库类型: mysql",
      );
    });
  });

  describe("getConnectionConfig", () => {
    it("应该返回正确的连接配置对象", () => {
      const connConfig = config.getConnectionConfig();
      expect(connConfig).toEqual({
        type: "postgresql",
        host: "localhost",
        port: 5432,
        database: "test_db",
        username: "test_user",
        password: "test_pass",
      });
    });
  });

  describe("getPoolConfig", () => {
    it("应该返回正确的连接池配置对象", () => {
      const poolConfig = config.getPoolConfig();
      expect(poolConfig.min).toBe(POOL_DEFAULTS.MIN);
      expect(poolConfig.max).toBe(POOL_DEFAULTS.MAX);
      expect(poolConfig.idleTimeoutMillis).toBe(POOL_DEFAULTS.IDLE_TIMEOUT);
      expect(poolConfig.acquireTimeoutMillis).toBe(
        POOL_DEFAULTS.ACQUIRE_TIMEOUT,
      );
    });

    it("应该使用自定义连接池配置", () => {
      config.poolMin = 10;
      config.poolMax = 50;
      config.idleTimeoutMillis = 300000;

      const poolConfig = config.getPoolConfig();
      expect(poolConfig.min).toBe(10);
      expect(poolConfig.max).toBe(50);
      expect(poolConfig.idleTimeoutMillis).toBe(300000);
    });
  });
});
