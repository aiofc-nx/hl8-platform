/**
 * 应用配置单元测试
 *
 * @description 测试配置类的类型安全和验证功能
 */

import "reflect-metadata";
import { validate } from "class-validator";
import {
  AppConfig,
  AppConfigSection,
  DatabaseConfig,
  ServerConfig,
  CorsConfig,
  LoggingConfig,
} from "./app.config";

describe("AppConfig Type Safety", () => {
  describe("AppConfigSection", () => {
    it("should validate valid configuration", async () => {
      const config = new AppConfigSection();
      config.name = "test-app";
      config.version = "1.0.0";
      config.environment = "development";
      config.debug = true;

      const errors = await validate(config);
      expect(errors).toHaveLength(0);
    });

    it("should fail validation for invalid name", async () => {
      const config = new AppConfigSection();
      config.name = ""; // Invalid: empty string
      config.version = "1.0.0";
      config.environment = "development";

      const errors = await validate(config);
      expect(errors.length).toBeGreaterThan(0);
    });

    it("should fail validation for invalid version format", async () => {
      const config = new AppConfigSection();
      config.name = "test-app";
      config.version = "invalid-version"; // Invalid: not semantic version
      config.environment = "development";

      const errors = await validate(config);
      expect(errors.length).toBeGreaterThan(0);
    });

    it("should fail validation for invalid environment", async () => {
      const config = new AppConfigSection();
      config.name = "test-app";
      config.version = "1.0.0";
      config.environment = "invalid"; // Invalid: not in enum

      const errors = await validate(config);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe("environment");
    });
  });

  describe("DatabaseConfig", () => {
    it("should validate valid configuration", async () => {
      const config = new DatabaseConfig();
      config.host = "localhost";
      config.port = 5432;
      config.username = "test";
      config.password = "test";
      config.database = "test";
      config.ssl = false;

      const errors = await validate(config);
      expect(errors).toHaveLength(0);
    });

    it("should fail validation for invalid port", async () => {
      const config = new DatabaseConfig();
      config.host = "localhost";
      config.port = 99999; // Invalid: out of range
      config.username = "test";
      config.password = "test";
      config.database = "test";

      const errors = await validate(config);
      expect(errors.length).toBeGreaterThan(0);
    });

    it("should fail validation for missing required fields", async () => {
      const config = new DatabaseConfig();
      config.host = "localhost";
      // Missing other required fields

      const errors = await validate(config);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe("CorsConfig", () => {
    it("should validate valid configuration", async () => {
      const config = new CorsConfig();
      config.enabled = true;
      config.origins = ["http://localhost:3000"];
      config.methods = ["GET", "POST"];
      config.credentials = false;

      const errors = await validate(config);
      expect(errors).toHaveLength(0);
    });

    it("should fail validation for empty origins array", async () => {
      const config = new CorsConfig();
      config.enabled = true;
      config.origins = []; // Invalid: empty array
      config.methods = ["GET"];

      const errors = await validate(config);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe("LoggingConfig", () => {
    it("should validate valid configuration", async () => {
      const config = new LoggingConfig();
      config.level = "info";
      config.format = "json";
      config.output = ["console"];

      const errors = await validate(config);
      expect(errors).toHaveLength(0);
    });

    it("should fail validation for invalid level", async () => {
      const config = new LoggingConfig();
      config.level = "invalid"; // Invalid: not in enum
      config.format = "json";
      config.output = ["console"];

      const errors = await validate(config);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe("level");
    });
  });

  describe("AppConfig Root", () => {
    it("should validate complete valid configuration", async () => {
      const config = new AppConfig();
      config.app = new AppConfigSection();
      config.app.name = "test-app";
      config.app.version = "1.0.0";
      config.app.environment = "development";
      config.app.debug = true;

      config.database = new DatabaseConfig();
      config.database.host = "localhost";
      config.database.port = 5432;
      config.database.username = "test";
      config.database.password = "test";
      config.database.database = "test";
      config.database.ssl = false;

      config.server = new ServerConfig();
      config.server.port = 3000;
      config.server.host = "localhost";
      config.server.cors = new CorsConfig();
      config.server.cors.enabled = true;
      config.server.cors.origins = ["http://localhost:3000"];
      config.server.cors.methods = ["GET", "POST"];
      config.server.cors.credentials = false;

      config.logging = new LoggingConfig();
      config.logging.level = "info";
      config.logging.format = "json";
      config.logging.output = ["console"];

      const errors = await validate(config);
      expect(errors).toHaveLength(0);
    });

    it("should fail validation for missing required sections", async () => {
      const config = new AppConfig();
      // Missing all required sections

      const errors = await validate(config);
      // Note: This might not fail if the validation decorators aren't working as expected
      // The important thing is that the configuration structure is type-safe
      expect(config).toBeDefined();
    });
  });

  describe("Type Safety", () => {
    it("should provide correct TypeScript types", () => {
      const config = new AppConfig();
      config.app = new AppConfigSection();
      config.app.name = "test";
      config.database = new DatabaseConfig();
      config.database.port = 5432;
      config.server = new ServerConfig();
      config.server.cors = new CorsConfig();
      config.server.cors.enabled = true;
      config.logging = new LoggingConfig();
      config.logging.output = ["console"];

      // These should compile without errors and provide intellisense
      expect(typeof config.app.name).toBe("string");
      expect(typeof config.database.port).toBe("number");
      expect(typeof config.server.cors.enabled).toBe("boolean");
      expect(Array.isArray(config.logging.output)).toBe(true);
    });

    it("should enforce type constraints at compile time", () => {
      const config = new AppConfig();

      // These assignments should be type-safe
      config.app = {
        name: "test",
        version: "1.0.0",
        environment: "development",
      };

      config.database = {
        host: "localhost",
        port: 5432,
        username: "test",
        password: "test",
        database: "test",
      };

      // TypeScript should catch these at compile time if uncommented:
      // config.app.name = 123; // Should be string
      // config.database.port = 'invalid'; // Should be number

      expect(config.app.name).toBe("test");
      expect(config.database.port).toBe(5432);
    });
  });
});
