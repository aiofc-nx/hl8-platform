/**
 * 配置端到端测试
 *
 * @description 测试配置模块的端到端功能，包括应用启动、配置加载和健康检查
 */

import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import {
  FastifyAdapter,
  NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { AppModule } from "../../src/app.module";
import { AppConfig } from "../../src/config/app.config";

describe("Config E2E", () => {
  let app: INestApplication;
  let config: AppConfig;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );

    await app.init();
    await app.getHttpAdapter().getInstance().ready();

    config = app.get<AppConfig>(AppConfig);
  });

  afterAll(async () => {
    await app.close();
  });

  describe("Application Startup", () => {
    it("should start application successfully", () => {
      expect(app).toBeDefined();
    });

    it("should load configuration on startup", () => {
      expect(config).toBeDefined();
      expect(config.app).toBeDefined();
      expect(config.database).toBeDefined();
      expect(config.server).toBeDefined();
      expect(config.logging).toBeDefined();
    });
  });

  describe("Configuration Loading", () => {
    it("should load app configuration correctly", () => {
      expect(config.app.name).toBe("fastify-api");
      expect(config.app.version).toBe("1.0.0");
      expect(config.app.environment).toBe("development");
      expect(typeof config.app.debug).toBe("boolean");
    });

    it("should load database configuration correctly", () => {
      expect(config.database.host).toBe("localhost");
      expect(config.database.port).toBe(5432);
      expect(config.database.username).toBe("postgres");
      expect(config.database.password).toBe("password");
      expect(config.database.database).toBe("fastify_api");
      expect(typeof config.database.ssl).toBe("boolean");
    });

    it("should load server configuration correctly", () => {
      expect(config.server.port).toBe(3000);
      expect(config.server.host).toBe("0.0.0.0");
      expect(config.server.cors).toBeDefined();
      expect(config.server.cors.enabled).toBe(true);
      expect(Array.isArray(config.server.cors.origins)).toBe(true);
      expect(Array.isArray(config.server.cors.methods)).toBe(true);
    });

    it("should load logging configuration correctly", () => {
      expect(config.logging.level).toBe("info");
      expect(config.logging.format).toBe("json");
      expect(Array.isArray(config.logging.output)).toBe(true);
      expect(config.logging.output).toContain("console");
    });
  });

  describe("API Endpoints", () => {
    it("should respond to root endpoint", async () => {
      const response = await app.getHttpAdapter().getInstance().inject({
        method: "GET",
        url: "/",
      });

      expect(response.statusCode).toBe(200);
      expect(response.body).toContain("fastify-api");
      expect(response.body).toContain("1.0.0");
    });

    it("should respond to health endpoint", async () => {
      const response = await app.getHttpAdapter().getInstance().inject({
        method: "GET",
        url: "/health",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.status).toBe("ok");
      expect(body.config).toBeDefined();
      expect(body.config.app.name).toBe("fastify-api");
    });

    it("should respond to config health endpoint", async () => {
      const response = await app.getHttpAdapter().getInstance().inject({
        method: "GET",
        url: "/health/config",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.status).toBe("healthy");
      expect(body.configLoaded).toBe(true);
      expect(body.validationPassed).toBe(true);
      expect(body.app).toBeDefined();
    });

    it("should respond to config summary endpoint", async () => {
      const response = await app.getHttpAdapter().getInstance().inject({
        method: "GET",
        url: "/health/config/summary",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.app).toBeDefined();
      expect(body.server).toBeDefined();
      expect(body.database).toBeDefined();
      expect(body.logging).toBeDefined();
    });
  });

  describe("Configuration Validation", () => {
    it("should validate all required fields", () => {
      // App validation
      expect(config.app.name).toBeTruthy();
      expect(config.app.version).toBeTruthy();
      expect(["development", "staging", "production"]).toContain(
        config.app.environment,
      );

      // Database validation
      expect(config.database.host).toBeTruthy();
      expect(config.database.port).toBeGreaterThan(0);
      expect(config.database.port).toBeLessThanOrEqual(65535);
      expect(config.database.username).toBeTruthy();
      expect(config.database.password).toBeTruthy();
      expect(config.database.database).toBeTruthy();

      // Server validation
      expect(config.server.port).toBeGreaterThan(0);
      expect(config.server.port).toBeLessThanOrEqual(65535);
      expect(config.server.host).toBeTruthy();
      expect(config.server.cors).toBeDefined();

      // Logging validation
      expect(["error", "warn", "info", "debug"]).toContain(
        config.logging.level,
      );
      expect(["json", "text"]).toContain(config.logging.format);
      expect(config.logging.output.length).toBeGreaterThan(0);
    });

    it("should have correct data types", () => {
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
      expect(typeof config.server.cors).toBe("object");

      expect(typeof config.logging.level).toBe("string");
      expect(typeof config.logging.format).toBe("string");
      expect(Array.isArray(config.logging.output)).toBe(true);
    });
  });

  describe("Performance", () => {
    it("should start application within reasonable time", async () => {
      const start = Date.now();

      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();

      const testApp =
        moduleFixture.createNestApplication<NestFastifyApplication>(
          new FastifyAdapter(),
        );

      await testApp.init();
      await testApp.getHttpAdapter().getInstance().ready();

      const duration = Date.now() - start;
      expect(duration).toBeLessThan(5000); // Should start within 5 seconds

      await testApp.close();
    });

    it("should respond to health checks quickly", async () => {
      const start = Date.now();

      const response = await app.getHttpAdapter().getInstance().inject({
        method: "GET",
        url: "/health/config",
      });

      const duration = Date.now() - start;
      expect(response.statusCode).toBe(200);
      expect(duration).toBeLessThan(1000); // Should respond within 1 second
    });
  });

  describe("Error Handling", () => {
    it("should handle invalid endpoints gracefully", async () => {
      const response = await app.getHttpAdapter().getInstance().inject({
        method: "GET",
        url: "/invalid-endpoint",
      });

      expect(response.statusCode).toBe(404);
    });

    it("should maintain application stability", async () => {
      // Test multiple concurrent requests
      const promises = Array.from({ length: 10 }, () =>
        app.getHttpAdapter().getInstance().inject({
          method: "GET",
          url: "/health/config",
        }),
      );

      const responses = await Promise.all(promises);

      responses.forEach((response) => {
        expect(response.statusCode).toBe(200);
      });
    });
  });
});
