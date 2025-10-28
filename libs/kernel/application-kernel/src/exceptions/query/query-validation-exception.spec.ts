/**
 * @fileoverview 查询验证异常单元测试
 * @description 测试QueryValidationException类的功能
 */

import { QueryValidationException } from "./query-validation-exception.js";
import { ExceptionCodes } from "../base/exception-codes.js";
import { EntityId } from "@hl8/domain-kernel";

describe("QueryValidationException", () => {
  describe("构造函数", () => {
    it("应该正确初始化查询验证异常", () => {
      const message = "查询验证失败";
      const queryType = "GetUserQuery";
      const queryId = new EntityId();
      const handlerName = "GetUserHandler";
      const validationErrors = ["参数不能为空", "格式不正确"];
      const context = { step: "validation" };
      const cause = new Error("原始错误");
      const exceptionId = new EntityId();

      const exception = new QueryValidationException(
        message,
        queryType,
        queryId,
        handlerName,
        validationErrors,
        context,
        cause,
        exceptionId,
      );

      expect(exception.message).toBe(message);
      expect(exception.errorCode).toBe(ExceptionCodes.QUERY_VALIDATION_FAILED);
      expect(exception.getQueryType()).toBe(queryType);
      expect(exception.getQueryId()).toBe(queryId);
      expect(exception.getHandlerName()).toBe(handlerName);
      expect(exception.getValidationErrors()).toEqual(validationErrors);
      expect(exception.getComponent()).toBe("Query");
      expect(exception.getOperation()).toBe("validate");
      expect(exception.context).toEqual({
        ...context,
        queryType,
        queryId: queryId.toString(),
        handlerName,
        validationErrors,
        component: "Query",
        operation: "validate",
      });
      expect(exception.cause).toBe(cause);
      expect(exception.exceptionId).toStrictEqual(exceptionId);
    });
  });

  describe("getValidationErrors", () => {
    it("应该返回验证错误列表", () => {
      const validationErrors = ["错误1", "错误2"];
      const exception = new QueryValidationException(
        "测试",
        "TestQuery",
        new EntityId(),
        "TestHandler",
        validationErrors,
      );

      expect(exception.getValidationErrors()).toEqual(validationErrors);
    });
  });

  describe("getValidationSummary", () => {
    it("应该返回验证错误摘要", () => {
      const validationErrors = ["参数不能为空", "格式不正确"];
      const exception = new QueryValidationException(
        "测试",
        "TestQuery",
        new EntityId(),
        "TestHandler",
        validationErrors,
      );

      const summary = exception.getValidationSummary();
      expect(summary).toContain("参数不能为空");
      expect(summary).toContain("格式不正确");
      expect(summary).toContain("TestQuery验证失败");
    });
  });

  describe("clone", () => {
    it("应该正确克隆异常", () => {
      const original = new QueryValidationException(
        "原始消息",
        "TestQuery",
        new EntityId(),
        "TestHandler",
        ["错误1", "错误2"],
        { step: "validation" },
        new Error("原始错误"),
        new EntityId(),
      );

      const cloned = original.clone();

      expect(cloned).toBeInstanceOf(QueryValidationException);
      expect(cloned.message).toBe(original.message);
      expect(cloned.errorCode).toBe(original.errorCode);
      expect(cloned.getQueryType()).toBe(original.getQueryType());
      expect(cloned.getQueryId()).toBe(original.getQueryId());
      expect(cloned.getHandlerName()).toBe(original.getHandlerName());
      expect(cloned.getValidationErrors()).toEqual(
        original.getValidationErrors(),
      );
      expect(cloned.context).toEqual(original.context);
      expect(cloned.cause).toBe(original.cause);
      expect(cloned.exceptionId).toStrictEqual(original.exceptionId);
    });
  });
});
