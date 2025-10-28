/**
 * @fileoverview 事件处理异常单元测试
 * @description 测试EventProcessingException类的功能
 */

import { EventProcessingException } from "./event-processing-exception.js";
import { ExceptionCodes } from "../base/exception-codes.js";
import { EntityId } from "@hl8/domain-kernel";

describe("EventProcessingException", () => {
  describe("构造函数", () => {
    it("应该正确初始化事件处理异常", () => {
      const message = "事件处理失败";
      const errorCode = ExceptionCodes.EVENT_PROCESSING_FAILED;
      const eventType = "UserCreatedEvent";
      const eventId = new EntityId();
      const processorName = "UserProjector";
      const context = { step: "processing" };
      const cause = new Error("原始错误");
      const exceptionId = new EntityId();

      const exception = new EventProcessingException(
        message,
        errorCode,
        eventType,
        eventId,
        processorName,
        context,
        cause,
        exceptionId,
      );

      expect(exception.message).toBe(message);
      expect(exception.errorCode).toBe(errorCode);
      expect(exception.getEventType()).toBe(eventType);
      expect(exception.getEventId()).toBe(eventId);
      expect(exception.getHandlerName()).toBe(processorName);
      expect(exception.getComponent()).toBe("Event");
      expect(exception.getOperation()).toBe("process");
      expect(exception.context).toEqual({
        ...context,
        eventType,
        eventId: eventId.toString(),
        handlerName: processorName,
        component: "Event",
        operation: "process",
      });
      expect(exception.cause).toBe(cause);
      expect(exception.exceptionId).toStrictEqual(exceptionId);
    });
  });

  describe("getEventType", () => {
    it("应该返回事件类型", () => {
      const exception = new EventProcessingException(
        "测试",
        ExceptionCodes.EVENT_PROCESSING_FAILED,
        "TestEvent",
        new EntityId(),
        "TestProcessor",
      );

      expect(exception.getEventType()).toBe("TestEvent");
    });
  });

  describe("getEventId", () => {
    it("应该返回事件ID", () => {
      const eventId = new EntityId();
      const exception = new EventProcessingException(
        "测试",
        ExceptionCodes.EVENT_PROCESSING_FAILED,
        "TestEvent",
        eventId,
        "TestProcessor",
      );

      expect(exception.getEventId()).toBe(eventId);
    });
  });

  describe("getProcessorName", () => {
    it("应该返回处理器名称", () => {
      const exception = new EventProcessingException(
        "测试",
        ExceptionCodes.EVENT_PROCESSING_FAILED,
        "TestEvent",
        new EntityId(),
        "TestProcessor",
      );

      expect(exception.getHandlerName()).toBe("TestProcessor");
    });
  });

  describe("clone", () => {
    it("应该正确克隆异常", () => {
      const original = new EventProcessingException(
        "原始消息",
        ExceptionCodes.EVENT_PROCESSING_FAILED,
        "TestEvent",
        new EntityId(),
        "TestProcessor",
        { step: "processing" },
        new Error("原始错误"),
        new EntityId(),
      );

      const cloned = original.clone();

      expect(cloned).toBeInstanceOf(EventProcessingException);
      expect(cloned.message).toBe(original.message);
      expect(cloned.errorCode).toBe(original.errorCode);
      expect(cloned.getEventType()).toBe(original.getEventType());
      expect(cloned.getEventId()).toBe(original.getEventId());
      expect(cloned.getHandlerName()).toBe(original.getHandlerName());
      expect(cloned.context).toEqual(original.context);
      expect(cloned.cause).toBe(original.cause);
      expect(cloned.exceptionId).toStrictEqual(original.exceptionId);
    });
  });
});
