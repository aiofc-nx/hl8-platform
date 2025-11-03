/**
 * @fileoverview 数据库配置测试
 * @description 测试数据库配置函数的正确性
 */

import { describe, it, expect } from "@jest/globals";
import { getDatabaseConfig, DatabaseConfig } from "./database.config.js";

describe("getDatabaseConfig", () => {
  it("应该能够从完整配置创建数据库配置", () => {
    const config = {
      type: "postgresql",
      dbName: "test_db",
      connectionUrl: "postgresql://user:pass@localhost:5432/test_db",
      pool: {
        min: 2,
        max: 10,
        idleTimeoutMillis: 30000,
      },
      healthCheck: true,
      healthCheckTimeout: 5000,
    };

    const result = getDatabaseConfig(config);

    expect(result).not.toBeNull();
    expect(result!.type).toBe("postgresql");
    expect(result!.dbName).toBe("test_db");
    expect(result!.connectionUrl).toBe(config.connectionUrl);
    expect(result!.pool).toEqual(config.pool);
    expect(result!.healthCheck).toBe(true);
    expect(result!.healthCheckTimeout).toBe(5000);
  });

  it("应该能够从最小配置创建数据库配置", () => {
    const config = {
      type: "mongodb",
      dbName: "test_db",
    };

    const result = getDatabaseConfig(config);

    expect(result).not.toBeNull();
    expect(result!.type).toBe("mongodb");
    expect(result!.dbName).toBe("test_db");
    expect(result!.healthCheck).toBe(true); // 默认值
    expect(result!.healthCheckTimeout).toBe(5000); // 默认值
  });

  it("应该能够使用 database 字段作为 dbName", () => {
    const config = {
      type: "postgresql",
      database: "test_db",
    };

    const result = getDatabaseConfig(config);

    expect(result).not.toBeNull();
    expect(result!.dbName).toBe("test_db");
  });

  it("应该能够在 dbName 和 database 都不提供时使用默认值", () => {
    const config = {
      type: "postgresql",
    };

    const result = getDatabaseConfig(config);

    expect(result).not.toBeNull();
    expect(result!.dbName).toBe("hl8_platform"); // 默认值
  });

  it("应该在没有提供 type 时默认使用 postgresql", () => {
    const config = {
      dbName: "test_db",
    };

    const result = getDatabaseConfig(config);

    expect(result).not.toBeNull();
    expect(result!.type).toBe("postgresql");
  });

  it("应该能够在 healthCheck 为 false 时禁用健康检查", () => {
    const config = {
      type: "postgresql",
      dbName: "test_db",
      healthCheck: false,
    };

    const result = getDatabaseConfig(config);

    expect(result).not.toBeNull();
    expect(result!.healthCheck).toBe(false);
  });

  it("应该能够在配置为 null 或 undefined 时返回 null", () => {
    expect(getDatabaseConfig(null as any)).toBeNull();
    expect(getDatabaseConfig(undefined as any)).toBeNull();
  });

  it("应该能够使用自定义健康检查超时时间", () => {
    const config = {
      type: "postgresql",
      dbName: "test_db",
      healthCheckTimeout: 10000,
    };

    const result = getDatabaseConfig(config);

    expect(result).not.toBeNull();
    expect(result!.healthCheckTimeout).toBe(10000);
  });

  it("应该能够处理空的 pool 配置", () => {
    const config = {
      type: "postgresql",
      dbName: "test_db",
      pool: {},
    };

    const result = getDatabaseConfig(config);

    expect(result).not.toBeNull();
    expect(result!.pool).toEqual({});
  });

  it("应该能够处理部分 pool 配置", () => {
    const config = {
      type: "postgresql",
      dbName: "test_db",
      pool: {
        min: 5,
      },
    };

    const result = getDatabaseConfig(config);

    expect(result).not.toBeNull();
    expect(result!.pool).toEqual({ min: 5 });
  });
});

