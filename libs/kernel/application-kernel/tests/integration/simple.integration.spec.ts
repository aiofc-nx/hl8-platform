/**
 * @fileoverview 简单集成测试
 * @description 测试应用层核心模块的基本功能
 */

import { Test, TestingModule } from "@nestjs/testing";
import { Logger } from "@hl8/logger";
import { EntityId } from "@hl8/domain-kernel";

import { ApplicationKernelModule } from "../../src/application-kernel.module.js";

describe("Simple Integration Tests", () => {
  let module: TestingModule;
  let logger: Logger;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [ApplicationKernelModule.forRoot()],
    }).compile();

    logger = module.get<Logger>(Logger);
  });

  afterAll(async () => {
    await module.close();
  });

  describe("Module Initialization", () => {
    it("should initialize application kernel module", () => {
      // When & Then
      expect(module).toBeDefined();
      expect(logger).toBeDefined();
    });

    it("should provide logger service", () => {
      // When & Then
      expect(logger).toBeInstanceOf(Logger);
    });
  });

  describe("Basic Functionality", () => {
    it("should create entity IDs", () => {
      // When
      const entityId = new EntityId();

      // Then
      expect(entityId).toBeDefined();
      expect(typeof entityId.toString()).toBe("string");
    });

    it("should log messages", () => {
      // Given
      const loggerSpy = jest.spyOn(logger, "debug");

      // When
      logger.debug("Test message", { test: "data" });

      // Then
      expect(loggerSpy).toHaveBeenCalledWith("Test message", { test: "data" });
    });
  });

  describe("Performance", () => {
    it("should handle basic operations efficiently", () => {
      // Given
      const startTime = Date.now();

      // When
      const entityId = new EntityId();
      const date = new Date();
      const testData = { test: "performance" };

      // Then
      const executionTime = Date.now() - startTime;
      expect(executionTime).toBeLessThan(100); // 100ms threshold
      expect(entityId).toBeDefined();
      expect(date).toBeDefined();
      expect(testData).toBeDefined();
    });
  });
});
