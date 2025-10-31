/**
 * @fileoverview 事件处理器单元测试
 * @description 测试事件处理器的功能和事件处理流程
 */

import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  jest,
} from "@jest/globals";
import { EventProcessor, EventProcessingConfig } from "./event-processor.js";
import { EventRegistry } from "./event-registry.js";
import {
  IDomainEventHandler,
  EventHandlerMetadata,
  EventProcessingResult,
  EventHandlerResult,
} from "./domain-event-handler.interface.js";
import { EventProcessingException } from "./event-processing-exceptions.js";
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
  constructor(
    private metadata: EventHandlerMetadata,
    private shouldSucceed: boolean = true,
    private shouldValidate: boolean = true,
    private executionDelay: number = 0,
    private shouldRetry: boolean = false,
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
      shouldRetry: this.shouldRetry,
    };
  }

  validateEvent(event: DomainEvent): boolean {
    return this.shouldValidate;
  }

  getDependencies(): string[] {
    return [];
  }

  async initialize?(): Promise<void> {
    // 可选的初始化方法
  }

  async dispose?(): Promise<void> {
    // 可选的销毁方法
  }
}

describe("EventProcessor", () => {
  let registry: EventRegistry;
  let processor: EventProcessor;

  beforeEach(async () => {
    registry = new EventRegistry();
    processor = new EventProcessor(registry);
  });

  afterEach(async () => {
    await registry.clear();
  });

  describe("processEvent", () => {
    it("应该成功处理单个事件", async () => {
      const aggregateRootId = new EntityId();
      const event = new TestDomainEvent(aggregateRootId, "TestEvent", {
        message: "test",
      });

      const handler = new MockEventHandler({
        handlerId: "handler-1",
        handlerName: "Test Handler",
        supportedEventTypes: ["TestEvent"],
        priority: 1,
        enabled: true,
        version: "1.0.0",
      });

      await registry.registerHandler(handler);

      const results = await processor.processEvent(event);

      expect(results.length).toBe(1);
      expect(results[0].success).toBe(true);
      expect(results[0].result).toBe(EventHandlerResult.SUCCESS);
    });

    it("应该按优先级顺序处理事件", async () => {
      const aggregateRootId = new EntityId();
      const event = new TestDomainEvent(aggregateRootId, "TestEvent", {
        message: "test",
      });

      const executionOrder: number[] = [];

      const handler1 = new MockEventHandler({
        handlerId: "handler-1",
        handlerName: "Handler 1",
        supportedEventTypes: ["TestEvent"],
        priority: 2,
        enabled: true,
        version: "1.0.0",
      });

      const handler2 = new MockEventHandler({
        handlerId: "handler-2",
        handlerName: "Handler 2",
        supportedEventTypes: ["TestEvent"],
        priority: 1,
        enabled: true,
        version: "1.0.0",
      });

      // 使用 spy 记录执行顺序
      jest.spyOn(handler1, "handle").mockImplementation(async () => {
        executionOrder.push(2);
        return {
          success: true,
          result: EventHandlerResult.SUCCESS,
          duration: 0,
          context: {
            eventId: event.eventId.value,
            eventType: event.eventType,
            aggregateRootId: event.aggregateRootId.value,
            startTime: new Date(),
            handlerId: "handler-1",
            result: EventHandlerResult.SUCCESS,
          },
          shouldRetry: false,
        };
      });

      jest.spyOn(handler2, "handle").mockImplementation(async () => {
        executionOrder.push(1);
        return {
          success: true,
          result: EventHandlerResult.SUCCESS,
          duration: 0,
          context: {
            eventId: event.eventId.value,
            eventType: event.eventType,
            aggregateRootId: event.aggregateRootId.value,
            startTime: new Date(),
            handlerId: "handler-2",
            result: EventHandlerResult.SUCCESS,
          },
          shouldRetry: false,
        };
      });

      await registry.registerHandler(handler1);
      await registry.registerHandler(handler2);

      await processor.processEvent(event);

      expect(executionOrder[0]).toBe(1); // 优先级高的先执行
      expect(executionOrder[1]).toBe(2);
    });

    it("应该在验证失败时跳过处理器", async () => {
      const aggregateRootId = new EntityId();
      const event = new TestDomainEvent(aggregateRootId, "TestEvent", {
        message: "test",
      });

      const handler = new MockEventHandler(
        {
          handlerId: "handler-1",
          handlerName: "Test Handler",
          supportedEventTypes: ["TestEvent"],
          priority: 1,
          enabled: true,
          version: "1.0.0",
        },
        true,
        false, // 验证失败
      );

      await registry.registerHandler(handler);

      const results = await processor.processEvent(event);

      expect(results.length).toBe(1);
      expect(results[0].result).toBe(EventHandlerResult.SKIPPED);
    });

    it("应该在处理失败且不继续时停止处理", async () => {
      const aggregateRootId = new EntityId();
      const event = new TestDomainEvent(aggregateRootId, "TestEvent", {
        message: "test",
      });

      const handler1 = new MockEventHandler(
        {
          handlerId: "handler-1",
          handlerName: "Handler 1",
          supportedEventTypes: ["TestEvent"],
          priority: 1,
          enabled: true,
          version: "1.0.0",
        },
        false, // 失败
      );

      const handler2 = new MockEventHandler({
        handlerId: "handler-2",
        handlerName: "Handler 2",
        supportedEventTypes: ["TestEvent"],
        priority: 2,
        enabled: true,
        version: "1.0.0",
      });

      await registry.registerHandler(handler1);
      await registry.registerHandler(handler2);

      const processor = new EventProcessor(registry, {
        continueOnError: false,
      });

      await expect(processor.processEvent(event)).rejects.toThrow(
        EventProcessingException,
      );
    });

    it("应该在处理失败且继续时继续处理", async () => {
      const aggregateRootId = new EntityId();
      const event = new TestDomainEvent(aggregateRootId, "TestEvent", {
        message: "test",
      });

      const handler1 = new MockEventHandler(
        {
          handlerId: "handler-1",
          handlerName: "Handler 1",
          supportedEventTypes: ["TestEvent"],
          priority: 1,
          enabled: true,
          version: "1.0.0",
        },
        false, // 失败
      );

      const handler2 = new MockEventHandler({
        handlerId: "handler-2",
        handlerName: "Handler 2",
        supportedEventTypes: ["TestEvent"],
        priority: 2,
        enabled: true,
        version: "1.0.0",
      });

      await registry.registerHandler(handler1);
      await registry.registerHandler(handler2);

      const processor = new EventProcessor(registry, {
        continueOnError: true,
      });

      const results = await processor.processEvent(event);

      expect(results.length).toBe(2);
      expect(results[0].success).toBe(false);
      expect(results[1].success).toBe(true);
    });

    it("应该在处理超时时返回错误结果", async () => {
      const aggregateRootId = new EntityId();
      const event = new TestDomainEvent(aggregateRootId, "TestEvent", {
        message: "test",
      });

      const handler = new MockEventHandler(
        {
          handlerId: "handler-1",
          handlerName: "Test Handler",
          supportedEventTypes: ["TestEvent"],
          priority: 1,
          enabled: true,
          version: "1.0.0",
        },
        true,
        true,
        5000, // 5秒延迟
      );

      await registry.registerHandler(handler);

      const processor = new EventProcessor(registry, {
        defaultTimeout: 100, // 100ms超时
        continueOnError: true, // 允许继续，返回结果而不是抛出异常
      });

      const results = await processor.processEvent(event);

      expect(results.length).toBe(1);
      expect(results[0].success).toBe(false);
      expect(results[0].error).toBeDefined();
      expect(results[0].error?.message).toContain("处理超时");
    });

    it("应该在没有处理器时返回空数组", async () => {
      const aggregateRootId = new EntityId();
      const event = new TestDomainEvent(aggregateRootId, "TestEvent", {
        message: "test",
      });

      const results = await processor.processEvent(event);

      expect(results.length).toBe(0);
    });
  });

  describe("processEvents", () => {
    it("应该批量处理多个事件", async () => {
      const aggregateRootId = new EntityId();
      const event1 = new TestDomainEvent(aggregateRootId, "TestEvent1", {
        message: "test1",
      });
      const event2 = new TestDomainEvent(aggregateRootId, "TestEvent2", {
        message: "test2",
      });

      const handler1 = new MockEventHandler({
        handlerId: "handler-1",
        handlerName: "Handler 1",
        supportedEventTypes: ["TestEvent1"],
        priority: 1,
        enabled: true,
        version: "1.0.0",
      });

      const handler2 = new MockEventHandler({
        handlerId: "handler-2",
        handlerName: "Handler 2",
        supportedEventTypes: ["TestEvent2"],
        priority: 1,
        enabled: true,
        version: "1.0.0",
      });

      await registry.registerHandler(handler1);
      await registry.registerHandler(handler2);

      const results = await processor.processEvents([event1, event2]);

      expect(results.size).toBe(2);
      expect(results.get(event1.eventId.value)?.length).toBe(1);
      expect(results.get(event2.eventId.value)?.length).toBe(1);
    });

    it("应该在单个事件处理失败时继续处理其他事件", async () => {
      const aggregateRootId = new EntityId();
      const event1 = new TestDomainEvent(aggregateRootId, "TestEvent1", {
        message: "test1",
      });
      const event2 = new TestDomainEvent(aggregateRootId, "TestEvent2", {
        message: "test2",
      });

      const handler1 = new MockEventHandler(
        {
          handlerId: "handler-1",
          handlerName: "Handler 1",
          supportedEventTypes: ["TestEvent1"],
          priority: 1,
          enabled: true,
          version: "1.0.0",
        },
        false, // 失败
      );

      const handler2 = new MockEventHandler({
        handlerId: "handler-2",
        handlerName: "Handler 2",
        supportedEventTypes: ["TestEvent2"],
        priority: 1,
        enabled: true,
        version: "1.0.0",
      });

      await registry.registerHandler(handler1);
      await registry.registerHandler(handler2);

      const results = await processor.processEvents([event1, event2]);

      expect(results.size).toBe(2);
      expect(results.get(event1.eventId.value)?.[0].success).toBe(false);
      expect(results.get(event2.eventId.value)?.[0].success).toBe(true);
    });
  });

  describe("getProcessingHistory", () => {
    it("应该记录处理历史", async () => {
      const aggregateRootId = new EntityId();
      const event = new TestDomainEvent(aggregateRootId, "TestEvent", {
        message: "test",
      });

      const handler = new MockEventHandler({
        handlerId: "handler-1",
        handlerName: "Test Handler",
        supportedEventTypes: ["TestEvent"],
        priority: 1,
        enabled: true,
        version: "1.0.0",
      });

      await registry.registerHandler(handler);
      await processor.processEvent(event);

      const history = processor.getProcessingHistory(event.eventId.value);

      expect(history.length).toBe(1);
      expect(history[0].success).toBe(true);
    });

    it("应该在没有历史时返回空数组", () => {
      const history = processor.getProcessingHistory("non-existent");

      expect(history.length).toBe(0);
    });
  });

  describe("clearProcessingHistory", () => {
    it("应该清除指定事件的处理历史", async () => {
      const aggregateRootId = new EntityId();
      const event = new TestDomainEvent(aggregateRootId, "TestEvent", {
        message: "test",
      });

      const handler = new MockEventHandler({
        handlerId: "handler-1",
        handlerName: "Test Handler",
        supportedEventTypes: ["TestEvent"],
        priority: 1,
        enabled: true,
        version: "1.0.0",
      });

      await registry.registerHandler(handler);
      await processor.processEvent(event);

      processor.clearProcessingHistory(event.eventId.value);

      const history = processor.getProcessingHistory(event.eventId.value);

      expect(history.length).toBe(0);
    });

    it("应该清除所有处理历史", async () => {
      const aggregateRootId = new EntityId();
      const event1 = new TestDomainEvent(aggregateRootId, "TestEvent1", {
        message: "test1",
      });
      const event2 = new TestDomainEvent(aggregateRootId, "TestEvent2", {
        message: "test2",
      });

      const handler = new MockEventHandler({
        handlerId: "handler-1",
        handlerName: "Test Handler",
        supportedEventTypes: ["TestEvent1", "TestEvent2"],
        priority: 1,
        enabled: true,
        version: "1.0.0",
      });

      await registry.registerHandler(handler);
      await processor.processEvent(event1);
      await processor.processEvent(event2);

      processor.clearProcessingHistory();

      expect(processor.getProcessingHistory(event1.eventId.value).length).toBe(
        0,
      );
      expect(processor.getProcessingHistory(event2.eventId.value).length).toBe(
        0,
      );
    });
  });

  describe("retry processing", () => {
    it("应该在启用重试时重试失败的处理", async () => {
      const aggregateRootId = new EntityId();
      const event = new TestDomainEvent(aggregateRootId, "TestEvent", {
        message: "test",
      });

      let attemptCount = 0;
      const handler = new MockEventHandler(
        {
          handlerId: "handler-1",
          handlerName: "Test Handler",
          supportedEventTypes: ["TestEvent"],
          priority: 1,
          enabled: true,
          version: "1.0.0",
        },
        true,
        true,
        0,
        true, // 需要重试
      );

      jest.spyOn(handler, "handle").mockImplementation(async () => {
        attemptCount++;
        if (attemptCount < 2) {
          return {
            success: false,
            result: EventHandlerResult.FAILURE,
            duration: 0,
            context: {
              eventId: event.eventId.value,
              eventType: event.eventType,
              aggregateRootId: event.aggregateRootId.value,
              startTime: new Date(),
              handlerId: "handler-1",
              result: EventHandlerResult.FAILURE,
              data: { retryCount: attemptCount - 1 },
            },
            shouldRetry: true,
          };
        }
        return {
          success: true,
          result: EventHandlerResult.SUCCESS,
          duration: 0,
          context: {
            eventId: event.eventId.value,
            eventType: event.eventType,
            aggregateRootId: event.aggregateRootId.value,
            startTime: new Date(),
            handlerId: "handler-1",
            result: EventHandlerResult.SUCCESS,
          },
          shouldRetry: false,
        };
      });

      await registry.registerHandler(handler);

      const processor = new EventProcessor(registry, {
        enableRetry: true,
        maxRetries: 3,
        retryDelay: 10,
      });

      const results = await processor.processEvent(event);

      expect(attemptCount).toBeGreaterThan(1);
    });
  });
});
