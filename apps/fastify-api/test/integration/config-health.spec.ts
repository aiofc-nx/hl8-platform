/**
 * 配置健康检查测试
 *
 * @description 测试配置健康检查控制器的功能
 */

import "reflect-metadata";
import { Test, TestingModule } from "@nestjs/testing";
import { AppModule } from "../../src/app.module";
import { AppConfig } from "../../src/config/app.config";
import { ConfigHealthController } from "../../src/config/config-health.controller";

describe("Config Health Check", () => {
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

  describe("Health Check Endpoints", () => {
    it("should return healthy status for valid configuration", () => {
      const health = healthController.getConfigHealth();

      expect(health).toBeDefined();
      expect(health.status).toBe("healthy");
      expect(health.message).toBe("Configuration loaded successfully");
      expect(health.configLoaded).toBe(true);
      expect(health.validationPassed).toBe(true);
      expect(health.lastValidated).toBeDefined();
      expect(new Date(health.lastValidated)).toBeInstanceOf(Date);
    });

    it("should include app information in health response", () => {
      const health = healthController.getConfigHealth();

      expect(health.app).toBeDefined();
      expect(health.app.name).toBe("fastify-api");
      expect(health.app.version).toBe("1.0.0");
      expect(health.app.environment).toBe("development");
    });

    it("should return config summary", () => {
      const summary = healthController.getConfigSummary();

      expect(summary).toBeDefined();
      expect(summary.app).toBeDefined();
      expect(summary.server).toBeDefined();
      expect(summary.database).toBeDefined();
      expect(summary.logging).toBeDefined();
    });

    it("should have correct summary structure", () => {
      const summary = healthController.getConfigSummary();

      // App section
      expect(summary.app.name).toBe("fastify-api");
      expect(summary.app.version).toBe("1.0.0");
      expect(summary.app.environment).toBe("development");
      expect(typeof summary.app.debug).toBe("boolean");

      // Server section
      expect(summary.server.port).toBe(3000);
      expect(summary.server.host).toBe("0.0.0.0");
      expect(typeof summary.server.corsEnabled).toBe("boolean");

      // Database section
      expect(summary.database.host).toBe("localhost");
      expect(summary.database.port).toBe(5432);
      expect(summary.database.database).toBe("fastify_api");
      expect(typeof summary.database.ssl).toBe("boolean");

      // Logging section
      expect(summary.logging.level).toBe("info");
      expect(summary.logging.format).toBe("json");
      expect(Array.isArray(summary.logging.output)).toBe(true);
    });
  });

  describe("Health Check Validation", () => {
    it("should validate configuration completeness", () => {
      const health = healthController.getConfigHealth();

      expect(health.configLoaded).toBe(true);
      expect(health.validationPassed).toBe(true);
    });

    it("should validate required fields", () => {
      // Test that all required fields are present
      expect(config.app.name).toBeTruthy();
      expect(config.app.version).toBeTruthy();
      expect(config.app.environment).toBeTruthy();
      expect(config.database.host).toBeTruthy();
      expect(config.database.port).toBeTruthy();
      expect(config.database.username).toBeTruthy();
      expect(config.database.password).toBeTruthy();
      expect(config.database.database).toBeTruthy();
      expect(config.server.port).toBeTruthy();
      expect(config.server.host).toBeTruthy();
      expect(config.server.cors).toBeTruthy();
      expect(config.logging.level).toBeTruthy();
      expect(config.logging.format).toBeTruthy();
      expect(config.logging.output).toBeTruthy();
    });

    it("should validate port ranges", () => {
      expect(config.database.port).toBeGreaterThan(0);
      expect(config.database.port).toBeLessThanOrEqual(65535);
      expect(config.server.port).toBeGreaterThan(0);
      expect(config.server.port).toBeLessThanOrEqual(65535);
    });

    it("should validate enum values", () => {
      const validEnvironments = ["development", "staging", "production"];
      expect(validEnvironments).toContain(config.app.environment);

      const validLogLevels = ["error", "warn", "info", "debug"];
      expect(validLogLevels).toContain(config.logging.level);

      const validLogFormats = ["json", "text"];
      expect(validLogFormats).toContain(config.logging.format);
    });

    it("should validate array fields", () => {
      expect(Array.isArray(config.server.cors.origins)).toBe(true);
      expect(Array.isArray(config.server.cors.methods)).toBe(true);
      expect(Array.isArray(config.logging.output)).toBe(true);

      expect(config.server.cors.origins.length).toBeGreaterThan(0);
      expect(config.server.cors.methods.length).toBeGreaterThan(0);
      expect(config.logging.output.length).toBeGreaterThan(0);
    });
  });

  describe("Error Handling", () => {
    it("should handle health check gracefully", () => {
      expect(() => {
        const health = healthController.getConfigHealth();
        expect(health).toBeDefined();
      }).not.toThrow();
    });

    it("should handle summary request gracefully", () => {
      expect(() => {
        const summary = healthController.getConfigSummary();
        expect(summary).toBeDefined();
      }).not.toThrow();
    });

    it("should return consistent health status", () => {
      const health1 = healthController.getConfigHealth();
      const health2 = healthController.getConfigHealth();

      expect(health1.status).toBe(health2.status);
      expect(health1.configLoaded).toBe(health2.configLoaded);
      expect(health1.validationPassed).toBe(health2.validationPassed);
    });
  });

  describe("Performance", () => {
    it("should respond to health check quickly", () => {
      const start = Date.now();
      const health = healthController.getConfigHealth();
      const duration = Date.now() - start;

      expect(health).toBeDefined();
      expect(duration).toBeLessThan(100); // Should respond within 100ms
    });

    it("should respond to summary request quickly", () => {
      const start = Date.now();
      const summary = healthController.getConfigSummary();
      const duration = Date.now() - start;

      expect(summary).toBeDefined();
      expect(duration).toBeLessThan(100); // Should respond within 100ms
    });
  });

  describe("Data Integrity", () => {
    it("should return consistent data between health and summary", () => {
      const health = healthController.getConfigHealth();
      const summary = healthController.getConfigSummary();

      expect(health.app.name).toBe(summary.app.name);
      expect(health.app.version).toBe(summary.app.version);
      expect(health.app.environment).toBe(summary.app.environment);
    });

    it("should maintain data consistency across multiple calls", () => {
      const health1 = healthController.getConfigHealth();
      const health2 = healthController.getConfigHealth();

      expect(health1.app.name).toBe(health2.app.name);
      expect(health1.app.version).toBe(health2.app.version);
      expect(health1.app.environment).toBe(health2.app.environment);
    });
  });
});
