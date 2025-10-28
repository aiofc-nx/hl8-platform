/**
 * @fileoverview Saga补偿异常单元测试
 * @description 测试SagaCompensationException类的功能
 */

import { SagaCompensationException } from "./saga-compensation-exception.js";
import { ExceptionCodes } from "../base/exception-codes.js";
import { EntityId } from "@hl8/domain-kernel";

describe("SagaCompensationException", () => {
  describe("构造函数", () => {
    it("应该正确初始化Saga补偿异常", () => {
      const message = "Saga补偿失败";
      const sagaName = "CreateUserSaga";
      const sagaId = new EntityId();
      const stepName = "CreateUserStep";
      const compensationStep = "RollbackUserStep";
      const context = { step: "compensation" };
      const cause = new Error("原始错误");
      const exceptionId = new EntityId();

      const originalError = new Error("原始步骤错误");
      const exception = new SagaCompensationException(
        message,
        sagaName,
        stepName,
        sagaId,
        compensationStep,
        originalError,
        context,
        cause,
        exceptionId,
      );

      expect(exception.message).toBe(message);
      expect(exception.errorCode).toBe(ExceptionCodes.SAGA_COMPENSATION_FAILED);
      expect(exception.getSagaName()).toBe(sagaName);
      expect(exception.getSagaId()).toBe(sagaId);
      expect(exception.getStepName()).toBe(stepName);
      expect(exception.getCompensationStep()).toBe(compensationStep);
      expect(exception.getComponent()).toBe("Saga");
      expect(exception.getOperation()).toBe("compensate");
      expect(exception.context).toEqual({
        ...context,
        sagaName,
        sagaId: sagaId.toString(),
        stepName,
        compensationStep,
        originalError: originalError.message,
        component: "Saga",
        operation: "compensate",
      });
      expect(exception.cause).toBe(cause);
      expect(exception.exceptionId).toStrictEqual(exceptionId);
    });
  });

  describe("getCompensationStep", () => {
    it("应该返回补偿步骤", () => {
      const originalError = new Error("原始步骤错误");
      const exception = new SagaCompensationException(
        "测试",
        "TestSaga",
        "TestStep",
        new EntityId(),
        "TestCompensationStep",
        originalError,
      );

      expect(exception.getCompensationStep()).toBe("TestCompensationStep");
    });
  });

  describe("getCompensationSummary", () => {
    it("应该返回补偿摘要", () => {
      const originalError = new Error("原始步骤错误");
      const exception = new SagaCompensationException(
        "测试",
        "TestSaga",
        "TestStep",
        new EntityId(),
        "TestCompensationStep",
        originalError,
      );

      const summary = exception.getCompensationSummary();
      expect(summary).toContain("TestSaga");
      expect(summary).toContain("TestCompensationStep");
      expect(summary).toContain("原始步骤错误");
    });
  });

  describe("clone", () => {
    it("应该正确克隆异常", () => {
      const originalError = new Error("原始步骤错误");
      const original = new SagaCompensationException(
        "原始消息",
        "TestSaga",
        "TestStep",
        new EntityId(),
        "TestCompensationStep",
        originalError,
        { step: "compensation" },
        new Error("原始错误"),
        new EntityId(),
      );

      const cloned = original.clone();

      expect(cloned).toBeInstanceOf(SagaCompensationException);
      expect(cloned.message).toBe(original.message);
      expect(cloned.errorCode).toBe(original.errorCode);
      expect(cloned.getSagaName()).toBe(original.getSagaName());
      expect(cloned.getSagaId()).toBe(original.getSagaId());
      expect(cloned.getStepName()).toBe(original.getStepName());
      expect(cloned.getCompensationStep()).toBe(original.getCompensationStep());
      expect(cloned.context).toEqual(original.context);
      expect(cloned.cause).toBe(original.cause);
      expect(cloned.exceptionId).toStrictEqual(original.exceptionId);
    });
  });
});
