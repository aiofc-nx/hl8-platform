/**
 * @fileoverview 用例异常单元测试
 * @description 测试UseCaseException类的功能
 */

import { UseCaseException } from "../../../src/exceptions/use-case/use-case-exception.js";
import { ExceptionCodes } from "../base/exception-codes.js";
import { EntityId } from "@hl8/domain-kernel";

describe("UseCaseException", () => {
  describe("构造函数", () => {
    it("应该正确初始化用例异常", () => {
      const message = "用例执行失败";
      const errorCode = ExceptionCodes.USE_CASE_EXECUTION_FAILED;
      const useCaseName = "TestUseCase";
      const inputData = { userId: "123", action: "test" };
      const context = { step: "validation" };
      const cause = new Error("原始错误");
      const exceptionId = new EntityId();

      const exception = new UseCaseException(
        message,
        errorCode,
        useCaseName,
        inputData,
        context,
        cause,
        exceptionId,
      );

      expect(exception.message).toBe(message);
      expect(exception.errorCode).toBe(errorCode);
      expect(exception.getUseCaseName()).toBe(useCaseName);
      expect(exception.getInputData()).toBe(inputData);
      expect(exception.getComponent()).toBe("UseCase");
      expect(exception.getOperation()).toBe("execute");
      expect(exception.context).toEqual({
        ...context,
        useCaseName,
        inputData: expect.any(Object), // 序列化后的数据
        component: "UseCase",
        operation: "execute",
      });
      expect(exception.cause).toBe(cause);
      expect(exception.exceptionId).toStrictEqual(exceptionId);
    });

    it("应该正确序列化输入数据", () => {
      const inputData = { complex: { nested: { value: "test" } } };
      const exception = new UseCaseException(
        "测试",
        ExceptionCodes.USE_CASE_EXECUTION_FAILED,
        "TestUseCase",
        inputData,
      );

      expect(exception.getInputData()).toBe(inputData);
      expect(exception.context.inputData).toEqual(inputData);
    });

    it("应该处理不可序列化的输入数据", () => {
      const inputData = { func: () => "test" }; // 包含函数，不可序列化
      const exception = new UseCaseException(
        "测试",
        ExceptionCodes.USE_CASE_EXECUTION_FAILED,
        "TestUseCase",
        inputData,
      );

      expect(exception.getInputData()).toBe(inputData);
      expect(exception.context.inputData).toEqual({}); // 不可序列化的对象被转换为空对象
    });
  });

  describe("getUseCaseName", () => {
    it("应该返回用例名称", () => {
      const exception = new UseCaseException(
        "测试",
        ExceptionCodes.USE_CASE_EXECUTION_FAILED,
        "TestUseCase",
        {},
      );

      expect(exception.getUseCaseName()).toBe("TestUseCase");
    });
  });

  describe("getInputData", () => {
    it("应该返回原始输入数据", () => {
      const inputData = { test: "data" };
      const exception = new UseCaseException(
        "测试",
        ExceptionCodes.USE_CASE_EXECUTION_FAILED,
        "TestUseCase",
        inputData,
      );

      expect(exception.getInputData()).toBe(inputData);
    });
  });

  describe("clone", () => {
    it("应该正确克隆异常", () => {
      const original = new UseCaseException(
        "原始消息",
        ExceptionCodes.USE_CASE_EXECUTION_FAILED,
        "TestUseCase",
        { test: "data" },
        { step: "validation" },
        new Error("原始错误"),
        new EntityId(),
      );

      const cloned = original.clone();

      expect(cloned).toBeInstanceOf(UseCaseException);
      expect(cloned.message).toBe(original.message);
      expect(cloned.errorCode).toBe(original.errorCode);
      expect(cloned.getUseCaseName()).toBe(original.getUseCaseName());
      expect(cloned.getInputData()).toEqual(original.getInputData());
      expect(cloned.context).toEqual(original.context);
      expect(cloned.cause).toBe(original.cause);
      expect(cloned.exceptionId).toStrictEqual(original.exceptionId);
    });
  });

  describe("继承关系", () => {
    it("应该正确继承ApplicationException", () => {
      const exception = new UseCaseException(
        "测试",
        ExceptionCodes.USE_CASE_EXECUTION_FAILED,
        "TestUseCase",
        {},
      );

      expect(exception).toBeInstanceOf(UseCaseException);
      expect(exception.getComponent()).toBe("UseCase");
      expect(exception.getOperation()).toBe("execute");
    });
  });
});
