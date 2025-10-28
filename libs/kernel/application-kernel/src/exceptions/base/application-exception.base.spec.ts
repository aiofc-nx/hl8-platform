/**
 * @fileoverview 应用层异常基类单元测试
 * @description 测试ApplicationException基类的功能
 */

import { ApplicationException } from "../../../src/exceptions/base/application-exception.base.js";
import { ExceptionCodes } from "./exception-codes.js";
import { ExceptionType, ExceptionSeverity, EntityId } from "@hl8/domain-kernel";

/**
 * 测试用异常类
 */
class TestApplicationException extends ApplicationException {
  constructor(
    message: string,
    errorCode: ExceptionCodes | string,
    context: Record<string, unknown> = {},
    cause?: Error,
    exceptionId?: EntityId,
  ) {
    super(
      message,
      errorCode,
      "TestComponent",
      "testOperation",
      context,
      cause,
      exceptionId,
    );
  }

  public clone(): ApplicationException {
    return new TestApplicationException(
      this.message,
      this.errorCode,
      this.context,
      this.cause,
      this.exceptionId,
    );
  }
}

describe("ApplicationException", () => {
  describe("构造函数", () => {
    it("应该正确初始化基本属性", () => {
      const message = "测试异常消息";
      const errorCode = ExceptionCodes.USE_CASE_EXECUTION_FAILED;
      const context = { testKey: "testValue" };
      const cause = new Error("原始错误");

      const exception = new TestApplicationException(
        message,
        errorCode,
        context,
        cause,
      );

      expect(exception.message).toBe(message);
      expect(exception.errorCode).toBe(errorCode);
      expect(exception.getComponent()).toBe("TestComponent");
      expect(exception.getOperation()).toBe("testOperation");
      expect(exception.context).toEqual({
        ...context,
        component: "TestComponent",
        operation: "testOperation",
      });
      expect(exception.cause).toBe(cause);
    });

    it("应该使用默认的异常类型和严重程度", () => {
      const exception = new TestApplicationException("测试", "TEST_ERROR");

      expect(exception.exceptionType).toBe(ExceptionType.SYSTEM);
      expect(exception.getSeverity()).toBe(ExceptionSeverity.MEDIUM);
    });

    // ApplicationException constructor doesn't support custom exception type and severity
  });

  describe("getComponent", () => {
    it("应该返回组件名称", () => {
      const exception = new TestApplicationException("测试", "TEST_ERROR");
      expect(exception.getComponent()).toBe("TestComponent");
    });
  });

  describe("getOperation", () => {
    it("应该返回操作名称", () => {
      const exception = new TestApplicationException("测试", "TEST_ERROR");
      expect(exception.getOperation()).toBe("testOperation");
    });
  });

  describe("继承自DomainException", () => {
    it("应该正确继承DomainException的属性", () => {
      const exception = new TestApplicationException("测试", "TEST_ERROR");

      expect(exception).toHaveProperty("message");
      expect(exception).toHaveProperty("errorCode");
      expect(exception).toHaveProperty("context");
      expect(exception).toHaveProperty("cause");
      expect(exception).toHaveProperty("exceptionId");
      expect(exception).toHaveProperty("exceptionType");
      expect(exception).toHaveProperty("getSeverity");
      expect(exception).toHaveProperty("timestamp");
    });

    it("应该正确设置时间戳", () => {
      const before = new Date();
      const exception = new TestApplicationException("测试", "TEST_ERROR");
      const after = new Date();

      expect(exception.timestamp).toBeInstanceOf(Date);
      expect(exception.timestamp.getTime()).toBeGreaterThanOrEqual(
        before.getTime(),
      );
      expect(exception.timestamp.getTime()).toBeLessThanOrEqual(
        after.getTime(),
      );
    });
  });

  describe("错误处理", () => {
    it("应该正确处理undefined的cause", () => {
      const exception = new TestApplicationException(
        "测试",
        "TEST_ERROR",
        {},
        undefined,
      );
      expect(exception.cause).toBeUndefined();
    });

    it("应该正确处理空的context", () => {
      const exception = new TestApplicationException("测试", "TEST_ERROR", {});
      expect(exception.context).toEqual({
        component: "TestComponent",
        operation: "testOperation",
      });
    });
  });
});
