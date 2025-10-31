/**
 * @fileoverview 事件处理异常单元测试
 * @description 测试事件处理相关的异常类
 */

import { describe, it, expect } from "@jest/globals";
import {
  EventProcessingException,
  EventHandlerNotFoundException,
  EventProcessingTimeoutException,
  EventHandlerValidationException,
  EventHandlerExecutionException,
} from "./event-processing-exceptions.js";

describe("EventProcessingException", () => {
  it("应该正确创建事件处理异常", () => {
    const exception = new EventProcessingException(
      "测试异常",
      "event-1",
      "TestEvent",
    );

    expect(exception.message).toBe("测试异常");
    expect(exception.context.eventId).toBe("event-1");
    expect(exception.context.eventType).toBe("TestEvent");
    expect(exception.errorCode).toBe("EVENT_PROCESSING_ERROR");
  });

  it("应该支持额外的上下文信息", () => {
    const exception = new EventProcessingException(
      "测试异常",
      "event-1",
      "TestEvent",
      undefined,
      { customField: "customValue" },
    );

    expect(exception.context.customField).toBe("customValue");
  });

  it("应该支持原始异常", () => {
    const cause = new Error("原始错误");
    const exception = new EventProcessingException(
      "测试异常",
      "event-1",
      "TestEvent",
      cause,
    );

    expect(exception.cause).toBe(cause);
  });

  it("应该正确克隆异常", () => {
    const exception = new EventProcessingException(
      "测试异常",
      "event-1",
      "TestEvent",
    );
    const cloned = exception.clone();

    expect(cloned).not.toBe(exception);
    expect(cloned.message).toBe(exception.message);
    expect(cloned.context.eventId).toBe(exception.context.eventId);
    expect(cloned.context.eventType).toBe(exception.context.eventType);
  });

  it("应该返回正确的严重程度", () => {
    const exception = new EventProcessingException(
      "测试异常",
      "event-1",
      "TestEvent",
    );

    expect(exception.getSeverity().valueOf()).toBe("MEDIUM");
  });

  it("应该指示异常可恢复", () => {
    const exception = new EventProcessingException(
      "测试异常",
      "event-1",
      "TestEvent",
    );

    expect(exception.isRecoverable()).toBe(true);
  });
});

describe("EventHandlerNotFoundException", () => {
  it("应该正确创建事件处理器未找到异常", () => {
    const exception = new EventHandlerNotFoundException("TestEvent", "event-1");

    expect(exception.message).toContain("未找到处理事件类型");
    expect(exception.message).toContain("TestEvent");
    expect(exception.context.eventType).toBe("TestEvent");
    expect(exception.context.eventId).toBe("event-1");
  });

  it("应该正确克隆异常", () => {
    const exception = new EventHandlerNotFoundException("TestEvent", "event-1");
    const cloned = exception.clone();

    expect(cloned).not.toBe(exception);
    expect(cloned.message).toBe(exception.message);
    expect(cloned.context.eventType).toBe(exception.context.eventType);
  });
});

describe("EventProcessingTimeoutException", () => {
  it("应该正确创建事件处理超时异常", () => {
    const exception = new EventProcessingTimeoutException(
      "event-1",
      "TestEvent",
      5000,
    );

    expect(exception.message).toContain("事件处理超时");
    expect(exception.message).toContain("5000ms");
    expect(exception.context.eventId).toBe("event-1");
    expect(exception.context.eventType).toBe("TestEvent");
    expect(exception.context.timeout).toBe(5000);
  });

  it("应该正确克隆异常", () => {
    const exception = new EventProcessingTimeoutException(
      "event-1",
      "TestEvent",
      5000,
    );
    const cloned = exception.clone();

    expect(cloned).not.toBe(exception);
    expect(cloned.context.timeout).toBe(5000);
  });
});

describe("EventHandlerValidationException", () => {
  it("应该正确创建事件处理器验证失败异常", () => {
    const exception = new EventHandlerValidationException(
      "handler-1",
      "TestEvent",
      "验证失败原因",
    );

    expect(exception.message).toContain("验证失败");
    expect(exception.message).toContain("handler-1");
    expect(exception.message).toContain("TestEvent");
    expect(exception.message).toContain("验证失败原因");
    expect(exception.context.handlerId).toBe("handler-1");
    expect(exception.context.reason).toBe("验证失败原因");
  });

  it("应该正确克隆异常", () => {
    const exception = new EventHandlerValidationException(
      "handler-1",
      "TestEvent",
      "验证失败原因",
    );
    const cloned = exception.clone();

    expect(cloned).not.toBe(exception);
    expect(cloned.context.handlerId).toBe("handler-1");
    expect(cloned.context.reason).toBe("验证失败原因");
  });
});

describe("EventHandlerExecutionException", () => {
  it("应该正确创建事件处理器执行失败异常", () => {
    const cause = new Error("执行失败");
    const exception = new EventHandlerExecutionException(
      "handler-1",
      "TestEvent",
      cause,
    );

    expect(exception.message).toContain("执行失败");
    expect(exception.message).toContain("handler-1");
    expect(exception.context.handlerId).toBe("handler-1");
    expect(exception.cause).toBe(cause);
  });

  it("应该正确克隆异常", () => {
    const cause = new Error("执行失败");
    const exception = new EventHandlerExecutionException(
      "handler-1",
      "TestEvent",
      cause,
    );
    const cloned = exception.clone();

    expect(cloned).not.toBe(exception);
    expect(cloned.context.handlerId).toBe("handler-1");
    expect(cloned.cause).toBe(cause);
  });
});
