/**
 * @fileoverview 事件注册表异常单元测试
 * @description 测试事件注册表相关的异常类
 */

import { describe, it, expect } from "@jest/globals";
import { EventRegistryException } from "./event-registry-exceptions.js";

describe("EventRegistryException", () => {
  it("应该正确创建事件注册表异常", () => {
    const exception = new EventRegistryException("测试异常", "handler-1");

    expect(exception.message).toBe("测试异常");
    expect(exception.context.handlerId).toBe("handler-1");
    expect(exception.errorCode).toBe("EVENT_REGISTRY_ERROR");
  });

  it("应该支持可选的处理器标识符", () => {
    const exception = new EventRegistryException("测试异常");

    expect(exception.message).toBe("测试异常");
    expect(exception.context.handlerId).toBeUndefined();
  });

  it("应该正确克隆异常", () => {
    const exception = new EventRegistryException("测试异常", "handler-1");
    const cloned = exception.clone();

    expect(cloned).not.toBe(exception);
    expect(cloned.message).toBe(exception.message);
    expect(cloned.context.handlerId).toBe(exception.context.handlerId);
  });

  it("应该返回正确的严重程度", () => {
    const exception = new EventRegistryException("测试异常", "handler-1");

    expect(exception.getSeverity().valueOf()).toBe("MEDIUM");
  });

  it("应该指示异常可恢复", () => {
    const exception = new EventRegistryException("测试异常", "handler-1");

    expect(exception.isRecoverable()).toBe(true);
  });

  it("应该返回异常建议", () => {
    const exception = new EventRegistryException("测试异常", "handler-1");

    expect(exception.getSuggestion()).toContain("检查事件处理器配置");
  });
});
