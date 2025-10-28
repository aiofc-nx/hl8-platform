/**
 * @fileoverview 用例验证异常单元测试
 * @description 测试UseCaseValidationException类的功能
 */

import { UseCaseValidationException } from "./use-case-validation-exception.js";
import { ExceptionCodes } from "../base/exception-codes.js";
import { EntityId } from "@hl8/domain-kernel";

describe("UseCaseValidationException", () => {
  describe("构造函数", () => {
    it("应该正确初始化用例验证异常", () => {
      const message = "用例验证失败";
      const useCaseName = "CreateUserUseCase";
      const inputData = { userId: "123", action: "test" };
      const validationErrors = ["字段不能为空", "格式不正确"];
      const context = { step: "validation" };
      const cause = new Error("原始错误");
      const exceptionId = new EntityId();

      const exception = new UseCaseValidationException(
        message,
        useCaseName,
        inputData,
        validationErrors,
        context,
        cause,
        exceptionId,
      );

      expect(exception.message).toBe(message);
      expect(exception.errorCode).toBe(
        ExceptionCodes.USE_CASE_VALIDATION_FAILED,
      );
      expect(exception.getUseCaseName()).toBe(useCaseName);
      expect(exception.getInputData()).toBe(inputData);
      expect(exception.getValidationErrors()).toEqual(validationErrors);
      expect(exception.getComponent()).toBe("UseCase");
      expect(exception.getOperation()).toBe("validate");
      expect(exception.context).toEqual({
        ...context,
        useCaseName,
        inputData: expect.any(Object), // 序列化后的数据
        validationErrors,
        component: "UseCase",
        operation: "validate",
      });
      expect(exception.cause).toBe(cause);
      expect(exception.exceptionId).toStrictEqual(exceptionId);
    });
  });

  describe("getValidationErrors", () => {
    it("应该返回验证错误列表", () => {
      const validationErrors = ["错误1", "错误2"];
      const exception = new UseCaseValidationException(
        "测试",
        "TestUseCase",
        {},
        validationErrors,
      );

      expect(exception.getValidationErrors()).toEqual(validationErrors);
    });
  });

  describe("getValidationSummary", () => {
    it("应该返回验证错误摘要", () => {
      const validationErrors = ["字段不能为空", "格式不正确"];
      const exception = new UseCaseValidationException(
        "测试",
        "TestUseCase",
        {},
        validationErrors,
      );

      const summary = exception.getValidationSummary();
      expect(summary).toContain("字段不能为空");
      expect(summary).toContain("格式不正确");
      expect(summary).toContain("TestUseCase验证失败");
    });
  });

  describe("clone", () => {
    it("应该正确克隆异常", () => {
      const original = new UseCaseValidationException(
        "原始消息",
        "TestUseCase",
        { test: "data" },
        ["错误1", "错误2"],
        { step: "validation" },
        new Error("原始错误"),
        new EntityId(),
      );

      const cloned = original.clone();

      expect(cloned).toBeInstanceOf(UseCaseValidationException);
      expect(cloned.message).toBe(original.message);
      expect(cloned.errorCode).toBe(original.errorCode);
      expect(cloned.getUseCaseName()).toBe(original.getUseCaseName());
      expect(cloned.getInputData()).toEqual(original.getInputData());
      expect(cloned.getValidationErrors()).toEqual(
        original.getValidationErrors(),
      );
      expect(cloned.context).toEqual(original.context);
      expect(cloned.cause).toBe(original.cause);
      expect(cloned.exceptionId).toStrictEqual(original.exceptionId);
    });
  });
});
