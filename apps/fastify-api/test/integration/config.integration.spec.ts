/**
 * 配置集成测试
 *
 * @description 测试配置模块的集成和基本功能
 */

import { Test, TestingModule } from "@nestjs/testing";
import { AppModule } from "../../src/app.module";
import { AppConfig } from "../../src/config/app.config";
import { AppService } from "../../src/app.service";

describe("Config Integration", () => {
  let app: TestingModule;
  let config: AppConfig;
  let appService: AppService;

  beforeAll(async () => {
    app = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    config = app.get<AppConfig>(AppConfig);
    appService = app.get<AppService>(AppService);
  });

  afterAll(async () => {
    await app.close();
  });

  describe("Configuration Loading", () => {
    it("should load configuration successfully", () => {
      expect(config).toBeDefined();
      expect(config.app).toBeDefined();
      expect(config.database).toBeDefined();
      expect(config.server).toBeDefined();
      expect(config.logging).toBeDefined();
    });

    it("should have valid app configuration", () => {
      expect(config.app.name).toBe("fastify-api");
      expect(config.app.version).toBe("1.0.0");
      expect(config.app.environment).toBe("development");
      expect(config.app.debug).toBe(true);
    });

    it("should have valid database configuration", () => {
      expect(config.database.host).toBe("localhost");
      expect(config.database.port).toBe(5432);
      expect(config.database.username).toBe("postgres");
      expect(config.database.password).toBe("password");
      expect(config.database.database).toBe("fastify_api");
      expect(config.database.ssl).toBe(false);
    });

    it("should have valid server configuration", () => {
      expect(config.server.port).toBe(3000);
      expect(config.server.host).toBe("0.0.0.0");
      expect(config.server.cors.enabled).toBe(true);
      expect(config.server.cors.origins).toContain("http://localhost:3000");
      expect(config.server.cors.methods).toContain("GET");
    });

    it("should have valid logging configuration", () => {
      expect(config.logging.level).toBe("info");
      expect(config.logging.format).toBe("json");
      expect(config.logging.output).toContain("console");
    });
  });

  describe("Service Integration", () => {
    it("should inject configuration into AppService", () => {
      expect(appService).toBeDefined();
    });

    it("should use configuration in getHello method", () => {
      const result = appService.getHello();
      expect(result).toContain("fastify-api");
      expect(result).toContain("1.0.0");
    });

    it("should use configuration in getHealth method", () => {
      const result = appService.getHealth();
      expect(result.status).toBe("ok");
      expect(result.config.app.name).toBe("fastify-api");
      expect(result.config.server.port).toBe(3000);
    });

    it("should use configuration in getDatabaseInfo method", () => {
      const result = appService.getDatabaseInfo();
      expect(result).toContain("localhost:5432");
      expect(result).toContain("fastify_api");
    });
  });

  describe("Configuration Structure", () => {
    it("should have correct configuration hierarchy", () => {
      expect(config.app).toBeInstanceOf(Object);
      expect(config.database).toBeInstanceOf(Object);
      expect(config.server).toBeInstanceOf(Object);
      expect(config.server.cors).toBeInstanceOf(Object);
      expect(config.logging).toBeInstanceOf(Object);
    });

    it("should have all required fields", () => {
      // App section
      expect(config.app.name).toBeDefined();
      expect(config.app.version).toBeDefined();
      expect(config.app.environment).toBeDefined();

      // Database section
      expect(config.database.host).toBeDefined();
      expect(config.database.port).toBeDefined();
      expect(config.database.username).toBeDefined();
      expect(config.database.password).toBeDefined();
      expect(config.database.database).toBeDefined();

      // Server section
      expect(config.server.port).toBeDefined();
      expect(config.server.host).toBeDefined();
      expect(config.server.cors).toBeDefined();

      // Logging section
      expect(config.logging.level).toBeDefined();
      expect(config.logging.format).toBeDefined();
      expect(config.logging.output).toBeDefined();
    });
  });

  describe("Type Safety", () => {
    it("should provide correct TypeScript types", () => {
      // These should compile without errors and provide intellisense
      expect(typeof config.app.name).toBe("string");
      expect(typeof config.database.port).toBe("number");
      expect(typeof config.server.cors.enabled).toBe("boolean");
      expect(Array.isArray(config.logging.output)).toBe(true);
    });

    it("should enforce type constraints", () => {
      // Verify type safety at runtime
      expect(typeof config.app.name).toBe("string");
      expect(typeof config.app.version).toBe("string");
      expect(typeof config.app.environment).toBe("string");
      expect(typeof config.app.debug).toBe("boolean");

      expect(typeof config.database.host).toBe("string");
      expect(typeof config.database.port).toBe("number");
      expect(typeof config.database.username).toBe("string");
      expect(typeof config.database.password).toBe("string");
      expect(typeof config.database.database).toBe("string");
      expect(typeof config.database.ssl).toBe("boolean");

      expect(typeof config.server.port).toBe("number");
      expect(typeof config.server.host).toBe("string");
      expect(typeof config.server.cors.enabled).toBe("boolean");
      expect(Array.isArray(config.server.cors.origins)).toBe(true);
      expect(Array.isArray(config.server.cors.methods)).toBe(true);
      expect(typeof config.server.cors.credentials).toBe("boolean");

      expect(typeof config.logging.level).toBe("string");
      expect(typeof config.logging.format).toBe("string");
      expect(Array.isArray(config.logging.output)).toBe(true);
    });

    it("should provide intellisense and autocomplete", () => {
      // This test verifies that TypeScript types are working correctly
      // The fact that this compiles means the types are properly defined
      const appName: string = config.app.name;
      const dbPort: number = config.database.port;
      const corsEnabled: boolean = config.server.cors.enabled;
      const logLevel: string = config.logging.level;

      expect(appName).toBe("fastify-api");
      expect(dbPort).toBe(5432);
      expect(corsEnabled).toBe(true);
      expect(logLevel).toBe("info");
    });
  });
});
