/**
 * @fileoverview MikroORM 配置测试
 * @description 测试 MikroORM 配置函数的正确性
 */

import { describe, it, expect } from "@jest/globals";
import { createMikroORMConfig, loadMikroORMConfigFromConfig } from "./mikro-orm.config.js";
import type { Logger } from "@hl8/logger";

describe("createMikroORMConfig", () => {
  it("应该能够创建 PostgreSQL 配置", () => {
    const options = {
      type: "postgresql" as const,
      dbName: "test_db",
      entities: ["./dist/entities"],
      connectionUrl: "postgresql://user:pass@localhost:5432/test_db",
    };

    const config = createMikroORMConfig(options);

    expect(config).toBeDefined();
    expect(config.dbName).toBe("test_db");
    expect(config.entities).toEqual(["./dist/entities"]);
    expect(config.debug).toBe(false);
    expect(config.discovery).toBeDefined();
    expect(config.discovery!.disableDynamicFileAccess).toBe(true);
    expect(config.discovery!.requireEntitiesArray).toBe(true);
  });

  it("应该能够创建 MongoDB 配置", () => {
    const options = {
      type: "mongodb" as const,
      dbName: "test_db",
      entities: ["./dist/entities"],
      connectionUrl: "mongodb://localhost:27017/test_db",
    };

    const config = createMikroORMConfig(options);

    expect(config).toBeDefined();
    expect(config.dbName).toBe("test_db");
    expect(config.entities).toEqual(["./dist/entities"]);
  });

  it("应该能够启用调试模式", () => {
    const options = {
      type: "postgresql" as const,
      dbName: "test_db",
      entities: ["./dist/entities"],
      debug: true,
    };

    const config = createMikroORMConfig(options);

    expect(config.debug).toBe(true);
  });

  it("应该能够使用 connectionOptions 而不是 connectionUrl", () => {
    const options = {
      type: "postgresql" as const,
      dbName: "test_db",
      entities: ["./dist/entities"],
      connectionOptions: {
        host: "localhost",
        port: 5432,
        user: "test_user",
        password: "test_pass",
        database: "test_db",
      },
    };

    const config = createMikroORMConfig(options);

    expect(config).toBeDefined();
    // connectionOptions 应该在 driverOptions.connection 中
  });

  it("应该能够使用实体类构造函数数组", () => {
    class TestEntity {}

    const options = {
      type: "postgresql" as const,
      dbName: "test_db",
      entities: [TestEntity],
    };

    const config = createMikroORMConfig(options);

    expect(config).toBeDefined();
    expect(config.entities).toEqual([TestEntity]);
  });

  it("应该包含 migrations 路径配置", () => {
    const options = {
      type: "postgresql" as const,
      dbName: "test_db",
      entities: ["./dist/entities"],
    };

    const config = createMikroORMConfig(options);

    expect(config.migrations).toBeDefined();
    expect(config.migrations!.path).toBe("./migrations");
  });
});

describe("loadMikroORMConfigFromConfig", () => {
  it("应该在无 logger 时返回 null", () => {
    const result = loadMikroORMConfigFromConfig();

    expect(result).toBeNull();
  });

  it("应该在提供 logger 时记录警告并返回 null", () => {
    const mockLogger = {
      warn: jest.fn(),
    } as unknown as Logger;

    const result = loadMikroORMConfigFromConfig(mockLogger);

    expect(result).toBeNull();
    expect(mockLogger.warn).toHaveBeenCalledWith(
      "loadMikroORMConfigFromConfig 需要使用依赖注入获取配置，当前返回 null",
    );
  });
});

