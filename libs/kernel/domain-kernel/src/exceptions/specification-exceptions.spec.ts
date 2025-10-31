/**
 * @fileoverview 规范异常单元测试
 * @description 测试规范异常类的功能和异常处理
 */

import { describe, it, expect } from "@jest/globals";
import {
  SpecificationException,
  SpecificationEvaluationFailedException,
  SpecificationCompositionException,
  SpecificationValidationException,
  SpecificationConfigurationException,
  SpecificationUnsupportedTypeException,
  SpecificationExecutionException,
} from "./specification-exceptions.js";

describe("Specification Exceptions", () => {
  describe("SpecificationEvaluationFailedException", () => {
    it("应该正确创建异常实例", () => {
      const specificationType = "UserAgeSpecification";
      const evaluationContext = { user: { age: 15 } };
      const reason = "Age validation failed";
      const originalError = new Error("Validation error");

      const exception = new SpecificationEvaluationFailedException(
        specificationType,
        evaluationContext,
        reason,
        originalError,
      );

      expect(exception.message).toContain("evaluation failed");
      expect(exception.specificationType).toBe(specificationType);
      expect(exception.evaluationContext).toBe(evaluationContext);
      expect(exception.originalError).toBe(originalError);
      expect(exception.name).toBe("SpecificationEvaluationFailedException");
    });

    it("应该正确获取异常详情", () => {
      const exception = new SpecificationEvaluationFailedException(
        "UserAgeSpecification",
        { user: { age: 15 } },
        "Age validation failed",
        new Error("Validation error"),
      );

      const details = exception.getDetails();

      expect(details.specificationType).toBe("UserAgeSpecification");
      expect(details.evaluationContext).toEqual({ user: { age: 15 } });
      expect(details.originalError).toBe("Validation error");
      expect(details.timestamp).toBeInstanceOf(Date);
    });
  });

  describe("SpecificationCompositionException", () => {
    it("应该正确创建异常实例", () => {
      const specificationType = "UserAgeSpecification";
      const compositionOperation = "and";
      const originalError = new Error("Composition failed");

      const exception = new SpecificationCompositionException(
        specificationType,
        compositionOperation,
        originalError,
      );

      expect(exception.message).toContain("composition operation");
      expect(exception.specificationType).toBe(specificationType);
      expect(exception.originalError).toBe(originalError);
      expect(exception.name).toBe("SpecificationCompositionException");
    });
  });

  describe("SpecificationValidationException", () => {
    it("应该正确创建异常实例", () => {
      const specificationType = "UserAgeSpecification";
      const validationErrors = [
        "Age must be positive",
        "Age must be less than 150",
      ];

      const exception = new SpecificationValidationException(
        specificationType,
        validationErrors,
      );

      expect(exception.message).toContain("validation failed");
      expect(exception.specificationType).toBe(specificationType);
      expect(exception.name).toBe("SpecificationValidationException");
    });
  });

  describe("SpecificationConfigurationException", () => {
    it("应该正确创建异常实例", () => {
      const specificationType = "UserAgeSpecification";
      const configurationError = "Invalid age range configuration";
      const originalError = new Error("Configuration validation failed");

      const exception = new SpecificationConfigurationException(
        specificationType,
        configurationError,
        originalError,
      );

      expect(exception.message).toContain("configuration error");
      expect(exception.specificationType).toBe(specificationType);
      expect(exception.originalError).toBe(originalError);
      expect(exception.name).toBe("SpecificationConfigurationException");
    });
  });

  describe("SpecificationUnsupportedTypeException", () => {
    it("应该正确创建异常实例", () => {
      const specificationType = "UserAgeSpecification";
      const requestedType = "AdminUser";
      const supportedTypes = ["User", "GuestUser"];
      const originalError = new Error("Type not supported");

      const exception = new SpecificationUnsupportedTypeException(
        specificationType,
        requestedType,
        supportedTypes,
        originalError,
      );

      expect(exception.message).toContain("does not support type");
      expect(exception.specificationType).toBe(specificationType);
      expect(exception.originalError).toBe(originalError);
      expect(exception.name).toBe("SpecificationUnsupportedTypeException");
    });
  });

  describe("SpecificationExecutionException", () => {
    it("应该正确创建异常实例", () => {
      const specificationType = "UserAgeSpecification";
      const executionContext = { user: { age: 15 } };
      const executionError = "Runtime execution failed";
      const originalError = new Error("Execution error");

      const exception = new SpecificationExecutionException(
        specificationType,
        executionContext,
        executionError,
        originalError,
      );

      expect(exception.message).toContain("execution failed");
      expect(exception.specificationType).toBe(specificationType);
      expect(exception.evaluationContext).toBe(executionContext);
      expect(exception.originalError).toBe(originalError);
      expect(exception.name).toBe("SpecificationExecutionException");
    });
  });
});
