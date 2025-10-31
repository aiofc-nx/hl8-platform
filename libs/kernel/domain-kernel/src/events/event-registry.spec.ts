/**
 * @fileoverview 事件注册表单元测试
 * @description 测试事件注册表的功能和异常处理
 */

import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import { EventRegistry } from "./event-registry.js";
import {
  IDomainEventHandler,
  EventHandlerMetadata,
  EventProcessingResult,
  EventHandlerResult,
} from "./domain-event-handler.interface.js";
import { EventRegistryException } from "./event-registry-exceptions.js";
import { DomainEvent } from "./base/domain-event.base.js";
import { EntityId } from "../identifiers/entity-id.js";

// 测试用的领域事件实现
class TestDomainEvent extends DomainEvent {
  constructor(
    aggregateRootId: EntityId,
    eventType: string,
    data: unknown,
    metadata: Record<string, unknown> = {},
    eventId?: EntityId,
    timestamp?: Date,
    version: number = 1,
  ) {
    super(
      aggregateRootId,
      eventType,
      data,
      metadata,
      eventId,
      timestamp,
      version,
    );
  }

  protected validateEvent(): void {
    if (!this.eventType) {
      throw new Error("事件类型不能为空");
    }
  }

  public clone(): DomainEvent {
    return new TestDomainEvent(
      this.aggregateRootId,
      this.eventType,
      this.data,
      this.metadata,
      this.eventId,
      this.timestamp,
      this.version,
    );
  }
}

// 模拟事件处理器类
class MockEventHandler implements IDomainEventHandler {
  private _initialized = false;
  private _disposed = false;

  constructor(
    private metadata: EventHandlerMetadata,
    private shouldSucceed: boolean = true,
    private shouldValidate: boolean = true,
    private executionDelay: number = 0,
  ) {}

  getMetadata(): EventHandlerMetadata {
    return { ...this.metadata };
  }

  canHandle(eventType: string): boolean {
    return this.metadata.supportedEventTypes.includes(eventType);
  }

  async handle(event: DomainEvent): Promise<EventProcessingResult> {
    if (this.executionDelay > 0) {
      await new Promise((resolve) => setTimeout(resolve, this.executionDelay));
    }

    const startTime = new Date();
    const endTime = new Date();
    const duration = endTime.getTime() - startTime.getTime();

    if (!this.shouldSucceed) {
      throw new Error("处理器执行失败");
    }

    return {
      success: this.shouldSucceed,
      result: this.shouldSucceed
        ? EventHandlerResult.SUCCESS
        : EventHandlerResult.FAILURE,
      duration,
      context: {
        eventId: event.eventId.value,
        eventType: event.eventType,
        aggregateRootId: event.aggregateRootId.value,
        startTime,
        endTime,
        duration,
        handlerId: this.metadata.handlerId,
        result: this.shouldSucceed
          ? EventHandlerResult.SUCCESS
          : EventHandlerResult.FAILURE,
      },
      shouldRetry: false,
    };
  }

  validateEvent(event: DomainEvent): boolean {
    return this.shouldValidate;
  }

  getDependencies(): string[] {
    return [];
  }

  async initialize(): Promise<void> {
    if (this._initialized) {
      throw new Error("处理器已初始化");
    }
    this._initialized = true;
  }

  async dispose(): Promise<void> {
    if (this._disposed) {
      throw new Error("处理器已销毁");
    }
    this._disposed = true;
  }

  get initialized(): boolean {
    return this._initialized;
  }

  get disposed(): boolean {
    return this._disposed;
  }
}

describe("EventRegistry", () => {
  let registry: EventRegistry;

  beforeEach(() => {
    registry = new EventRegistry();
  });

  afterEach(async () => {
    await registry.clear();
  });

  describe("registerHandler", () => {
    it("应该成功注册事件处理器", async () => {
      const handler = new MockEventHandler({
        handlerId: "handler-1",
        handlerName: "Test Handler",
        description: "测试处理器",
        supportedEventTypes: ["EventType1"],
        priority: 1,
        enabled: true,
        version: "1.0.0",
      });

      await expect(registry.registerHandler(handler)).resolves.not.toThrow();
      expect(registry.isHandlerRegistered("handler-1")).toBe(true);
    });

    it("应该为多个事件类型注册处理器", async () => {
      const handler = new MockEventHandler({
        handlerId: "handler-1",
        handlerName: "Multi Event Handler",
        supportedEventTypes: ["EventType1", "EventType2", "EventType3"],
        priority: 1,
        enabled: true,
        version: "1.0.0",
      });

      await registry.registerHandler(handler);

      expect(registry.hasHandlersForEvent("EventType1")).toBe(true);
      expect(registry.hasHandlersForEvent("EventType2")).toBe(true);
      expect(registry.hasHandlersForEvent("EventType3")).toBe(true);
    });

    it("应该在注册时初始化处理器", async () => {
      const handler = new MockEventHandler({
        handlerId: "handler-1",
        handlerName: "Test Handler",
        supportedEventTypes: ["EventType1"],
        priority: 1,
        enabled: true,
        version: "1.0.0",
      });

      await registry.registerHandler(handler);

      expect(handler.initialized).toBe(true);
    });

    it("应该拒绝注册重复的处理器", async () => {
      const handler1 = new MockEventHandler({
        handlerId: "handler-1",
        handlerName: "Test Handler 1",
        supportedEventTypes: ["EventType1"],
        priority: 1,
        enabled: true,
        version: "1.0.0",
      });

      const handler2 = new MockEventHandler({
        handlerId: "handler-1",
        handlerName: "Test Handler 2",
        supportedEventTypes: ["EventType2"],
        priority: 1,
        enabled: true,
        version: "1.0.0",
      });

      await registry.registerHandler(handler1);

      await expect(registry.registerHandler(handler2)).rejects.toThrow(
        EventRegistryException,
      );
    });

    it("应该拒绝注册无效的处理器（空的 handlerId）", async () => {
      const handler = new MockEventHandler({
        handlerId: "",
        handlerName: "Test Handler",
        supportedEventTypes: ["EventType1"],
        priority: 1,
        enabled: true,
        version: "1.0.0",
      });

      await expect(registry.registerHandler(handler)).rejects.toThrow(
        EventRegistryException,
      );
    });

    it("应该拒绝注册无效的处理器（空的 supportedEventTypes）", async () => {
      const handler = new MockEventHandler({
        handlerId: "handler-1",
        handlerName: "Test Handler",
        supportedEventTypes: [],
        priority: 1,
        enabled: true,
        version: "1.0.0",
      });

      await expect(registry.registerHandler(handler)).rejects.toThrow(
        EventRegistryException,
      );
    });

    it("应该拒绝注册无效的处理器（负优先级）", async () => {
      const handler = new MockEventHandler({
        handlerId: "handler-1",
        handlerName: "Test Handler",
        supportedEventTypes: ["EventType1"],
        priority: -1,
        enabled: true,
        version: "1.0.0",
      });

      await expect(registry.registerHandler(handler)).rejects.toThrow(
        EventRegistryException,
      );
    });

    it("应该在初始化失败时抛出异常", async () => {
      const handler = new MockEventHandler({
        handlerId: "handler-1",
        handlerName: "Test Handler",
        supportedEventTypes: ["EventType1"],
        priority: 1,
        enabled: true,
        version: "1.0.0",
      });

      // 模拟初始化失败
      jest
        .spyOn(handler, "initialize")
        .mockRejectedValueOnce(new Error("初始化失败"));

      await expect(registry.registerHandler(handler)).rejects.toThrow(
        EventRegistryException,
      );
    });
  });

  describe("unregisterHandler", () => {
    it("应该成功注销事件处理器", async () => {
      const handler = new MockEventHandler({
        handlerId: "handler-1",
        handlerName: "Test Handler",
        supportedEventTypes: ["EventType1"],
        priority: 1,
        enabled: true,
        version: "1.0.0",
      });

      await registry.registerHandler(handler);
      const result = await registry.unregisterHandler("handler-1");

      expect(result).toBe(true);
      expect(registry.isHandlerRegistered("handler-1")).toBe(false);
      expect(handler.disposed).toBe(true);
    });

    it("应该在注销时销毁处理器", async () => {
      const handler = new MockEventHandler({
        handlerId: "handler-1",
        handlerName: "Test Handler",
        supportedEventTypes: ["EventType1"],
        priority: 1,
        enabled: true,
        version: "1.0.0",
      });

      await registry.registerHandler(handler);
      await registry.unregisterHandler("handler-1");

      expect(handler.disposed).toBe(true);
    });

    it("应该在注销不存在的处理器时返回 false", async () => {
      const result = await registry.unregisterHandler("non-existent");

      expect(result).toBe(false);
    });

    it("应该从所有相关的事件类型中移除处理器", async () => {
      const handler = new MockEventHandler({
        handlerId: "handler-1",
        handlerName: "Multi Event Handler",
        supportedEventTypes: ["EventType1", "EventType2"],
        priority: 1,
        enabled: true,
        version: "1.0.0",
      });

      await registry.registerHandler(handler);
      await registry.unregisterHandler("handler-1");

      expect(registry.hasHandlersForEvent("EventType1")).toBe(false);
      expect(registry.hasHandlersForEvent("EventType2")).toBe(false);
    });
  });

  describe("getHandlersForEvent", () => {
    it("应该返回处理指定事件类型的处理器", async () => {
      const handler1 = new MockEventHandler({
        handlerId: "handler-1",
        handlerName: "Handler 1",
        supportedEventTypes: ["EventType1"],
        priority: 1,
        enabled: true,
        version: "1.0.0",
      });

      const handler2 = new MockEventHandler({
        handlerId: "handler-2",
        handlerName: "Handler 2",
        supportedEventTypes: ["EventType1"],
        priority: 2,
        enabled: true,
        version: "1.0.0",
      });

      await registry.registerHandler(handler1);
      await registry.registerHandler(handler2);

      const handlers = registry.getHandlersForEvent("EventType1");

      expect(handlers.length).toBe(2);
      expect(handlers.map((h) => h.getMetadata().handlerId)).toContain(
        "handler-1",
      );
      expect(handlers.map((h) => h.getMetadata().handlerId)).toContain(
        "handler-2",
      );
    });

    it("应该只返回启用的处理器", async () => {
      const enabledHandler = new MockEventHandler({
        handlerId: "handler-enabled",
        handlerName: "Enabled Handler",
        supportedEventTypes: ["EventType1"],
        priority: 1,
        enabled: true,
        version: "1.0.0",
      });

      const disabledHandler = new MockEventHandler({
        handlerId: "handler-disabled",
        handlerName: "Disabled Handler",
        supportedEventTypes: ["EventType1"],
        priority: 2,
        enabled: false,
        version: "1.0.0",
      });

      await registry.registerHandler(enabledHandler);
      await registry.registerHandler(disabledHandler);

      const handlers = registry.getHandlersForEvent("EventType1");

      expect(handlers.length).toBe(1);
      expect(handlers[0].getMetadata().handlerId).toBe("handler-enabled");
    });

    it("应该在没有处理器时返回空数组", () => {
      const handlers = registry.getHandlersForEvent("NonExistentEvent");

      expect(handlers.length).toBe(0);
    });
  });

  describe("getRegisteredEventTypes", () => {
    it("应该返回所有已注册的事件类型", async () => {
      const handler1 = new MockEventHandler({
        handlerId: "handler-1",
        handlerName: "Handler 1",
        supportedEventTypes: ["EventType1", "EventType2"],
        priority: 1,
        enabled: true,
        version: "1.0.0",
      });

      const handler2 = new MockEventHandler({
        handlerId: "handler-2",
        handlerName: "Handler 2",
        supportedEventTypes: ["EventType2", "EventType3"],
        priority: 1,
        enabled: true,
        version: "1.0.0",
      });

      await registry.registerHandler(handler1);
      await registry.registerHandler(handler2);

      const eventTypes = registry.getRegisteredEventTypes();

      expect(eventTypes.length).toBe(3);
      expect(eventTypes).toContain("EventType1");
      expect(eventTypes).toContain("EventType2");
      expect(eventTypes).toContain("EventType3");
    });
  });

  describe("getHandlerMetadata", () => {
    it("应该返回处理器的元数据", async () => {
      const metadata: EventHandlerMetadata = {
        handlerId: "handler-1",
        handlerName: "Test Handler",
        description: "测试处理器",
        supportedEventTypes: ["EventType1"],
        priority: 1,
        enabled: true,
        version: "1.0.0",
        metadata: { custom: "value" },
      };

      const handler = new MockEventHandler(metadata);
      await registry.registerHandler(handler);

      const retrievedMetadata = registry.getHandlerMetadata("handler-1");

      expect(retrievedMetadata).toBeDefined();
      expect(retrievedMetadata?.handlerId).toBe("handler-1");
      expect(retrievedMetadata?.handlerName).toBe("Test Handler");
    });

    it("应该在没有找到处理器时返回 undefined", () => {
      const metadata = registry.getHandlerMetadata("non-existent");

      expect(metadata).toBeUndefined();
    });
  });

  describe("getAllHandlers", () => {
    it("应该返回所有已注册的处理器", async () => {
      const handler1 = new MockEventHandler({
        handlerId: "handler-1",
        handlerName: "Handler 1",
        supportedEventTypes: ["EventType1"],
        priority: 1,
        enabled: true,
        version: "1.0.0",
      });

      const handler2 = new MockEventHandler({
        handlerId: "handler-2",
        handlerName: "Handler 2",
        supportedEventTypes: ["EventType2"],
        priority: 1,
        enabled: true,
        version: "1.0.0",
      });

      await registry.registerHandler(handler1);
      await registry.registerHandler(handler2);

      const allHandlers = registry.getAllHandlers();

      expect(allHandlers.length).toBe(2);
    });

    it("应该避免重复返回处理器", async () => {
      const handler = new MockEventHandler({
        handlerId: "handler-1",
        handlerName: "Multi Event Handler",
        supportedEventTypes: ["EventType1", "EventType2"],
        priority: 1,
        enabled: true,
        version: "1.0.0",
      });

      await registry.registerHandler(handler);

      const allHandlers = registry.getAllHandlers();

      expect(allHandlers.length).toBe(1);
    });
  });

  describe("getStatistics", () => {
    it("应该返回注册表统计信息", async () => {
      const handler1 = new MockEventHandler({
        handlerId: "handler-1",
        handlerName: "Handler 1",
        supportedEventTypes: ["EventType1", "EventType2"],
        priority: 1,
        enabled: true,
        version: "1.0.0",
      });

      const handler2 = new MockEventHandler({
        handlerId: "handler-2",
        handlerName: "Handler 2",
        supportedEventTypes: ["EventType2"],
        priority: 1,
        enabled: true,
        version: "1.0.0",
      });

      await registry.registerHandler(handler1);
      await registry.registerHandler(handler2);

      const stats = registry.getStatistics();

      expect(stats.totalHandlers).toBe(2);
      expect(stats.totalEventTypes).toBe(2);
      expect(stats.handlersByEventType.get("EventType1")).toBe(1);
      expect(stats.handlersByEventType.get("EventType2")).toBe(2);
    });
  });

  describe("clear", () => {
    it("应该清除所有注册的处理器", async () => {
      const handler1 = new MockEventHandler({
        handlerId: "handler-1",
        handlerName: "Handler 1",
        supportedEventTypes: ["EventType1"],
        priority: 1,
        enabled: true,
        version: "1.0.0",
      });

      const handler2 = new MockEventHandler({
        handlerId: "handler-2",
        handlerName: "Handler 2",
        supportedEventTypes: ["EventType2"],
        priority: 1,
        enabled: true,
        version: "1.0.0",
      });

      await registry.registerHandler(handler1);
      await registry.registerHandler(handler2);

      await registry.clear();

      expect(registry.getAllHandlers().length).toBe(0);
      expect(registry.getRegisteredEventTypes().length).toBe(0);
      expect(handler1.disposed).toBe(true);
      expect(handler2.disposed).toBe(true);
    });
  });
});
