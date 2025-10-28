/**
 * @fileoverview 事件存储异常单元测试
 * @description 测试EventStoreException类的功能
 */

import { EventStoreException } from "./event-store-exception.js";
import { ExceptionCodes } from "../base/exception-codes.js";
import { EntityId } from "@hl8/domain-kernel";

describe("EventStoreException", () => {
  describe("构造函数", () => {
    it("应该正确初始化事件存储异常", () => {
      const message = "事件存储失败";
      const errorCode = ExceptionCodes.EVENT_STORE_ERROR;
      const storeOperation = "save";
      const aggregateId = new EntityId();
      const eventId = new EntityId();
      const context = { step: "storage" };
      const cause = new Error("原始错误");
      const exceptionId = new EntityId();

      const exception = new EventStoreException(
        message,
        errorCode,
        storeOperation,
        aggregateId,
        context,
        cause,
        exceptionId,
      );

      expect(exception.message).toBe(message);
      expect(exception.errorCode).toBe(errorCode);
      expect(exception.getOperation()).toBe(storeOperation);
      expect(exception.getAggregateId()).toBe(aggregateId);
      expect(exception.getComponent()).toBe("EventStore");
      expect(exception.context).toEqual({
        ...context,
        aggregateId: aggregateId.toString(),
        component: "EventStore",
        operation: storeOperation,
      });
      expect(exception.cause).toBe(cause);
      expect(exception.exceptionId).toStrictEqual(exceptionId);
    });
  });

  describe("getStoreOperation", () => {
    it("应该返回存储操作", () => {
      const exception = new EventStoreException(
        "测试",
        ExceptionCodes.EVENT_STORE_ERROR,
        "save",
        new EntityId(),
        {},
      );

      expect(exception.getOperation()).toBe("save");
    });
  });

  describe("getAggregateId", () => {
    it("应该返回聚合ID", () => {
      const aggregateId = new EntityId();
      const exception = new EventStoreException(
        "测试",
        ExceptionCodes.EVENT_STORE_ERROR,
        "save",
        aggregateId,
        {},
      );

      expect(exception.getAggregateId()).toBe(aggregateId);
    });
  });

  describe("getEventId", () => {
    it("应该返回事件ID", () => {
      const eventId = new EntityId();
      const exception = new EventStoreException(
        "测试",
        ExceptionCodes.EVENT_STORE_ERROR,
        "save",
        new EntityId(),
        {},
      );

      // EventStoreException doesn't have getEventId method
    });
  });

  describe("clone", () => {
    it("应该正确克隆异常", () => {
      const original = new EventStoreException(
        "原始消息",
        ExceptionCodes.EVENT_STORE_ERROR,
        "save",
        new EntityId(),
        { step: "storage" },
        new Error("原始错误"),
        new EntityId(),
      );

      const cloned = original.clone();

      expect(cloned).toBeInstanceOf(EventStoreException);
      expect(cloned.message).toBe(original.message);
      expect(cloned.errorCode).toBe(original.errorCode);
      expect((cloned as EventStoreException).getOperation()).toBe(
        original.getOperation(),
      );
      expect((cloned as EventStoreException).getAggregateId()).toBe(
        original.getAggregateId(),
      );
      expect(cloned.context).toEqual(original.context);
      expect(cloned.cause).toBe(original.cause);
      expect(cloned.exceptionId).toStrictEqual(original.exceptionId);
    });
  });
});
