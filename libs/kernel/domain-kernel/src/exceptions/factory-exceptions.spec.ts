/**
 * @fileoverview 工厂异常单元测试
 * @description 测试工厂异常类的功能和异常处理
 */

import { describe, it, expect } from "@jest/globals";
import {
  FactoryException,
  FactoryCreationFailedException,
  FactoryInvalidParametersException,
  FactoryMissingDependencyException,
  FactoryConfigurationException,
  FactoryUnsupportedTypeException,
  FactoryInitializationException,
} from "./factory-exceptions.js";

describe("Factory Exceptions", () => {
  describe("FactoryCreationFailedException", () => {
    it("应该正确创建异常实例", () => {
      const factoryType = "UserFactory";
      const creationParams = { name: "John", email: "john@example.com" };
      const reason = "Validation failed";
      const originalError = new Error("Validation error");

      const exception = new FactoryCreationFailedException(
        factoryType,
        creationParams,
        reason,
        originalError,
      );

      expect(exception.message).toContain("failed to create object");
      expect(exception.factoryType).toBe(factoryType);
      expect(exception.creationParams).toBe(creationParams);
      expect(exception.originalError).toBe(originalError);
      expect(exception.name).toBe("FactoryCreationFailedException");
    });

    it("应该正确获取异常详情", () => {
      const exception = new FactoryCreationFailedException(
        "UserFactory",
        { name: "John" },
        "Validation failed",
        new Error("Validation error"),
      );

      const details = exception.getDetails();

      expect(details.factoryType).toBe("UserFactory");
      expect(details.creationParams).toEqual({ name: "John" });
      expect(details.originalError).toBe("Validation error");
      expect(details.timestamp).toBeInstanceOf(Date);
    });
  });

  describe("FactoryInvalidParametersException", () => {
    it("应该正确创建异常实例", () => {
      const factoryType = "UserFactory";
      const creationParams = { name: "", email: "invalid" };
      const validationErrors = ["Name is required", "Email format is invalid"];

      const exception = new FactoryInvalidParametersException(
        factoryType,
        creationParams,
        validationErrors,
      );

      expect(exception.message).toContain("invalid parameters");
      expect(exception.factoryType).toBe(factoryType);
      expect(exception.creationParams).toBe(creationParams);
      expect(exception.name).toBe("FactoryInvalidParametersException");
    });
  });

  describe("FactoryMissingDependencyException", () => {
    it("应该正确创建异常实例", () => {
      const factoryType = "UserFactory";
      const creationParams = { name: "John" };
      const missingDependencies = ["EmailService", "ValidationService"];

      const exception = new FactoryMissingDependencyException(
        factoryType,
        creationParams,
        missingDependencies,
      );

      expect(exception.message).toContain("missing required dependencies");
      expect(exception.factoryType).toBe(factoryType);
      expect(exception.creationParams).toBe(creationParams);
      expect(exception.name).toBe("FactoryMissingDependencyException");
    });
  });

  describe("FactoryConfigurationException", () => {
    it("应该正确创建异常实例", () => {
      const factoryType = "UserFactory";
      const configurationError = "Invalid database connection string";
      const originalError = new Error("Configuration validation failed");

      const exception = new FactoryConfigurationException(
        factoryType,
        configurationError,
        originalError,
      );

      expect(exception.message).toContain("configuration error");
      expect(exception.factoryType).toBe(factoryType);
      expect(exception.originalError).toBe(originalError);
      expect(exception.name).toBe("FactoryConfigurationException");
    });
  });

  describe("FactoryUnsupportedTypeException", () => {
    it("应该正确创建异常实例", () => {
      const factoryType = "UserFactory";
      const requestedType = "AdminUser";
      const supportedTypes = ["User", "GuestUser"];
      const originalError = new Error("Type not supported");

      const exception = new FactoryUnsupportedTypeException(
        factoryType,
        requestedType,
        supportedTypes,
        originalError,
      );

      expect(exception.message).toContain("does not support type");
      expect(exception.factoryType).toBe(factoryType);
      expect(exception.originalError).toBe(originalError);
      expect(exception.name).toBe("FactoryUnsupportedTypeException");
    });
  });

  describe("FactoryInitializationException", () => {
    it("应该正确创建异常实例", () => {
      const factoryType = "UserFactory";
      const initializationError = "Failed to initialize database connection";
      const originalError = new Error("Database connection failed");

      const exception = new FactoryInitializationException(
        factoryType,
        initializationError,
        originalError,
      );

      expect(exception.message).toContain("initialization failed");
      expect(exception.factoryType).toBe(factoryType);
      expect(exception.originalError).toBe(originalError);
      expect(exception.name).toBe("FactoryInitializationException");
    });
  });
});
