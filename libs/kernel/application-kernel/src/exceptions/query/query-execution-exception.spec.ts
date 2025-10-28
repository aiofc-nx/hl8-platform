/**
 * @fileoverview 查询执行异常单元测试
 * @description 测试QueryExecutionException类的功能
 */

import { QueryExecutionException } from "./query-execution-exception.js";
import { ExceptionCodes } from "../base/exception-codes.js";
import { EntityId } from "@hl8/domain-kernel";

describe("QueryExecutionException", () => {
  describe("构造函数", () => {
    it("应该正确初始化查询执行异常", () => {
      const message = "查询执行失败";
      const errorCode = ExceptionCodes.QUERY_EXECUTION_FAILED;
      const queryType = "GetUserQuery";
      const queryId = new EntityId();
      const handlerName = "GetUserHandler";
      const context = { step: "execution" };
      const cause = new Error("原始错误");
      const exceptionId = new EntityId();

      const exception = new QueryExecutionException(
        message,
        errorCode,
        queryType,
        queryId,
        handlerName,
        context,
        cause,
        exceptionId,
      );

      expect(exception.message).toBe(message);
      expect(exception.errorCode).toBe(errorCode);
      expect(exception.getQueryType()).toBe(queryType);
      expect(exception.getQueryId()).toBe(queryId);
      expect(exception.getHandlerName()).toBe(handlerName);
      expect(exception.getComponent()).toBe("Query");
      expect(exception.getOperation()).toBe("execute");
      expect(exception.context).toEqual({
        ...context,
        queryType,
        queryId: queryId.toString(),
        handlerName,
        component: "Query",
        operation: "execute",
      });
      expect(exception.cause).toBe(cause);
      expect(exception.exceptionId).toStrictEqual(exceptionId);
    });
  });

  describe("getQueryType", () => {
    it("应该返回查询类型", () => {
      const exception = new QueryExecutionException(
        "测试",
        ExceptionCodes.QUERY_EXECUTION_FAILED,
        "TestQuery",
        new EntityId(),
        "TestHandler",
      );

      expect(exception.getQueryType()).toBe("TestQuery");
    });
  });

  describe("getQueryId", () => {
    it("应该返回查询ID", () => {
      const queryId = new EntityId();
      const exception = new QueryExecutionException(
        "测试",
        ExceptionCodes.QUERY_EXECUTION_FAILED,
        "TestQuery",
        queryId,
        "TestHandler",
      );

      expect(exception.getQueryId()).toBe(queryId);
    });
  });

  describe("getHandlerName", () => {
    it("应该返回处理器名称", () => {
      const exception = new QueryExecutionException(
        "测试",
        ExceptionCodes.QUERY_EXECUTION_FAILED,
        "TestQuery",
        new EntityId(),
        "TestHandler",
      );

      expect(exception.getHandlerName()).toBe("TestHandler");
    });
  });

  describe("clone", () => {
    it("应该正确克隆异常", () => {
      const original = new QueryExecutionException(
        "原始消息",
        ExceptionCodes.QUERY_EXECUTION_FAILED,
        "TestQuery",
        new EntityId(),
        "TestHandler",
        { step: "execution" },
        new Error("原始错误"),
        new EntityId(),
      );

      const cloned = original.clone();

      expect(cloned).toBeInstanceOf(QueryExecutionException);
      expect(cloned.message).toBe(original.message);
      expect(cloned.errorCode).toBe(original.errorCode);
      expect(cloned.getQueryType()).toBe(original.getQueryType());
      expect(cloned.getQueryId()).toBe(original.getQueryId());
      expect(cloned.getHandlerName()).toBe(original.getHandlerName());
      expect(cloned.context).toEqual(original.context);
      expect(cloned.cause).toBe(original.cause);
      expect(cloned.exceptionId).toStrictEqual(original.exceptionId);
    });
  });
});
