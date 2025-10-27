/**
 * 配置验证集成测试
 *
 * @description 测试配置验证和错误处理功能
 */

import "reflect-metadata";
import { Test, TestingModule } from "@nestjs/testing";
import { AppModule } from "../../src/app.module";
import { AppConfig } from "../../src/config/app.config";
import { ConfigHealthController } from "../../src/config/config-health.controller";
import {
  CONFIG_VALIDATION_MESSAGES,
  createConfigValidationError,
  createConfigValidationResult,
} from "../../src/config/validation-messages";

describe("Config Validation Integration", () => {
  let app: TestingModule;
  let config: AppConfig;
  let healthController: ConfigHealthController;

  beforeAll(async () => {
    app = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    config = app.get<AppConfig>(AppConfig);
    healthController = app.get<ConfigHealthController>(ConfigHealthController);
  });

  afterAll(async () => {
    await app.close();
  });

  describe("Configuration Validation", () => {
    it("should validate complete configuration successfully", () => {
      expect(config).toBeDefined();
      expect(config.app).toBeDefined();
      expect(config.database).toBeDefined();
      expect(config.server).toBeDefined();
      expect(config.logging).toBeDefined();
    });

    it("should have valid app configuration", () => {
      expect(config.app.name).toBe("fastify-api");
      expect(config.app.version).toBe("1.0.0");
      expect(["development", "staging", "production"]).toContain(
        config.app.environment,
      );
      expect(typeof config.app.debug).toBe("boolean");
    });

    it("should have valid database configuration", () => {
      expect(config.database.host).toBe("localhost");
      expect(config.database.port).toBeGreaterThan(0);
      expect(config.database.port).toBeLessThanOrEqual(65535);
      expect(config.database.username).toBeTruthy();
      expect(config.database.password).toBeTruthy();
      expect(config.database.database).toBeTruthy();
      expect(typeof config.database.ssl).toBe("boolean");
    });

    it("should have valid server configuration", () => {
      expect(config.server.port).toBeGreaterThan(0);
      expect(config.server.port).toBeLessThanOrEqual(65535);
      expect(config.server.host).toBeTruthy();
      expect(config.server.cors).toBeDefined();
      expect(typeof config.server.cors.enabled).toBe("boolean");
      expect(Array.isArray(config.server.cors.origins)).toBe(true);
      expect(Array.isArray(config.server.cors.methods)).toBe(true);
      expect(typeof config.server.cors.credentials).toBe("boolean");
    });

    it("should have valid logging configuration", () => {
      expect(["error", "warn", "info", "debug"]).toContain(
        config.logging.level,
      );
      expect(["json", "text"]).toContain(config.logging.format);
      expect(Array.isArray(config.logging.output)).toBe(true);
      expect(config.logging.output.length).toBeGreaterThan(0);
    });
  });

  describe("Health Check Controller", () => {
    it("should return healthy status for valid configuration", () => {
      const health = healthController.getConfigHealth();

      expect(health.status).toBe("healthy");
      expect(health.message).toBe("Configuration loaded successfully");
      expect(health.configLoaded).toBe(true);
      expect(health.validationPassed).toBe(true);
      expect(health.lastValidated).toBeDefined();
      expect(health.app).toBeDefined();
      expect(health.app.name).toBe("fastify-api");
    });

    it("should return config summary", () => {
      const summary = healthController.getConfigSummary();

      expect(summary.app).toBeDefined();
      expect(summary.server).toBeDefined();
      expect(summary.database).toBeDefined();
      expect(summary.logging).toBeDefined();

      expect(summary.app.name).toBe("fastify-api");
      expect(summary.server.port).toBe(3000);
      expect(summary.database.host).toBe("localhost");
      expect(summary.logging.level).toBe("info");
    });
  });

  describe("Validation Error Messages", () => {
    it("should have all required validation messages", () => {
      expect(CONFIG_VALIDATION_MESSAGES.APP_NAME_REQUIRED).toBeDefined();
      expect(CONFIG_VALIDATION_MESSAGES.DATABASE_HOST_REQUIRED).toBeDefined();
      expect(CONFIG_VALIDATION_MESSAGES.SERVER_PORT_REQUIRED).toBeDefined();
      expect(CONFIG_VALIDATION_MESSAGES.LOGGING_LEVEL_REQUIRED).toBeDefined();
    });

    it("should create validation error details correctly", () => {
      const error = createConfigValidationError(
        "app.name",
        "APP_NAME_REQUIRED",
        "",
        "app.name",
      );

      expect(error.field).toBe("app.name");
      expect(error.errorType).toBe("APP_NAME_REQUIRED");
      expect(error.value).toBe("");
      expect(error.path).toBe("app.name");
      expect(error.message).toContain("应用程序名称是必需的");
    });

    it("should create validation result correctly", () => {
      const errors = [
        createConfigValidationError("app.name", "APP_NAME_REQUIRED", ""),
        createConfigValidationError(
          "database.port",
          "DATABASE_PORT_INVALID",
          99999,
        ),
      ];

      const result = createConfigValidationResult(false, errors, [
        "Warning: Debug mode enabled",
      ]);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(2);
      expect(result.warnings).toHaveLength(1);
      expect(result.errors[0].field).toBe("app.name");
      expect(result.errors[1].field).toBe("database.port");
    });
  });

  describe("Error Handling", () => {
    it("should handle configuration loading gracefully", () => {
      // Test that the application can start with valid configuration
      expect(() => {
        const health = healthController.getConfigHealth();
        expect(health.status).toBe("healthy");
      }).not.toThrow();
    });

    it("should provide meaningful error messages", () => {
      const error = createConfigValidationError(
        "database.port",
        "DATABASE_PORT_INVALID",
        99999,
      );

      expect(error.message).toContain("数据库端口必须是 1-65535 之间的数字");
      expect(error.message).toContain("99999");
    });
  });

  describe("Configuration Structure Validation", () => {
    it("should have correct configuration hierarchy", () => {
      expect(config.app).toBeInstanceOf(Object);
      expect(config.database).toBeInstanceOf(Object);
      expect(config.server).toBeInstanceOf(Object);
      expect(config.server.cors).toBeInstanceOf(Object);
      expect(config.logging).toBeInstanceOf(Object);
    });

    it("should have all required top-level sections", () => {
      const requiredSections = ["app", "database", "server", "logging"];
      requiredSections.forEach((section) => {
        expect(config[section]).toBeDefined();
      });
    });

    it("should have proper data types for all fields", () => {
      // App section
      expect(typeof config.app.name).toBe("string");
      expect(typeof config.app.version).toBe("string");
      expect(typeof config.app.environment).toBe("string");
      expect(typeof config.app.debug).toBe("boolean");

      // Database section
      expect(typeof config.database.host).toBe("string");
      expect(typeof config.database.port).toBe("number");
      expect(typeof config.database.username).toBe("string");
      expect(typeof config.database.password).toBe("string");
      expect(typeof config.database.database).toBe("string");
      expect(typeof config.database.ssl).toBe("boolean");

      // Server section
      expect(typeof config.server.port).toBe("number");
      expect(typeof config.server.host).toBe("string");
      expect(typeof config.server.cors).toBe("object");

      // Logging section
      expect(typeof config.logging.level).toBe("string");
      expect(typeof config.logging.format).toBe("string");
      expect(Array.isArray(config.logging.output)).toBe(true);
    });
  });
});
