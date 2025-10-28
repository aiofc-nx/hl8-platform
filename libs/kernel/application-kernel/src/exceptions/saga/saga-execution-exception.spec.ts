/**
 * @fileoverview Saga执行异常单元测试
 * @description 测试SagaExecutionException类的功能
 */

import { SagaExecutionException } from "./saga-execution-exception.js";
import { ExceptionCodes } from "../base/exception-codes.js";
import { EntityId } from "@hl8/domain-kernel";

describe("SagaExecutionException", () => {
  describe("构造函数", () => {
    it("应该正确初始化Saga执行异常", () => {
      const message = "Saga执行失败";
      const errorCode = ExceptionCodes.SAGA_EXECUTION_FAILED;
      const sagaName = "CreateUserSaga";
      const sagaId = new EntityId();
      const stepName = "CreateUserStep";
      const context = { step: "execution" };
      const cause = new Error("原始错误");
      const exceptionId = new EntityId();

      const exception = new SagaExecutionException(
        message,
        errorCode,
        sagaName,
        stepName,
        sagaId,
        context,
        cause,
        exceptionId,
      );

      expect(exception.message).toBe(message);
      expect(exception.errorCode).toBe(errorCode);
      expect(exception.getSagaName()).toBe(sagaName);
      expect(exception.getSagaId()).toBe(sagaId);
      expect(exception.getStepName()).toBe(stepName);
      expect(exception.getComponent()).toBe("Saga");
      expect(exception.getOperation()).toBe("execute");
      expect(exception.context).toEqual({
        ...context,
        sagaName,
        sagaId: sagaId.toString(),
        stepName,
        component: "Saga",
        operation: "execute",
      });
      expect(exception.cause).toBe(cause);
      expect(exception.exceptionId).toStrictEqual(exceptionId);
    });
  });

  describe("getSagaName", () => {
    it("应该返回Saga名称", () => {
      const exception = new SagaExecutionException(
        "测试",
        ExceptionCodes.SAGA_EXECUTION_FAILED,
        "TestSaga",
        "TestStep",
        new EntityId(),
      );

      expect(exception.getSagaName()).toBe("TestSaga");
    });
  });

  describe("getSagaId", () => {
    it("应该返回Saga ID", () => {
      const sagaId = new EntityId();
      const exception = new SagaExecutionException(
        "测试",
        ExceptionCodes.SAGA_EXECUTION_FAILED,
        "TestSaga",
        "TestStep",
        sagaId,
      );

      expect(exception.getSagaId()).toBe(sagaId);
    });
  });

  describe("getStepName", () => {
    it("应该返回步骤名称", () => {
      const exception = new SagaExecutionException(
        "测试",
        ExceptionCodes.SAGA_EXECUTION_FAILED,
        "TestSaga",
        "TestStep",
        new EntityId(),
      );

      expect(exception.getStepName()).toBe("TestStep");
    });
  });

  describe("clone", () => {
    it("应该正确克隆异常", () => {
      const original = new SagaExecutionException(
        "原始消息",
        ExceptionCodes.SAGA_EXECUTION_FAILED,
        "TestSaga",
        "TestStep",
        new EntityId(),
        { step: "execution" },
        new Error("原始错误"),
        new EntityId(),
      );

      const cloned = original.clone();

      expect(cloned).toBeInstanceOf(SagaExecutionException);
      expect(cloned.message).toBe(original.message);
      expect(cloned.errorCode).toBe(original.errorCode);
      expect(cloned.getSagaName()).toBe(original.getSagaName());
      expect(cloned.getSagaId()).toBe(original.getSagaId());
      expect(cloned.getStepName()).toBe(original.getStepName());
      expect(cloned.context).toEqual(original.context);
      expect(cloned.cause).toBe(original.cause);
      expect(cloned.exceptionId).toStrictEqual(original.exceptionId);
    });
  });
});
