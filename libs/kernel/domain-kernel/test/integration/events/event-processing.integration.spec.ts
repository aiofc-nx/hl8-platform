/**
 * @fileoverview 事件处理集成测试
 * @description 测试事件处理系统的端到端功能和交互
 */

import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import {
  EventProcessor,
  EventProcessingConfig,
} from "../../../src/events/event-processor.js";
import { EventRegistry } from "../../../src/events/event-registry.js";
import {
  IDomainEventHandler,
  EventHandlerMetadata,
  EventProcessingResult,
  EventHandlerResult,
} from "../../../src/events/domain-event-handler.interface.js";
import { DomainEvent } from "../../../src/events/base/domain-event.base.js";
import { EntityId } from "../../../src/identifiers/entity-id.js";

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
  private _processedEvents: DomainEvent[] = [];
  private _initialized = false;
  private _disposed = false;

  constructor(
    private metadata: EventHandlerMetadata,
    private shouldSucceed: boolean = true,
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

    this._processedEvents.push(event);

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
    return true;
  }

  getDependencies(): string[] {
    return [];
  }

  async initialize(): Promise<void> {
    this._initialized = true;
  }

  async dispose(): Promise<void> {
    this._disposed = true;
  }

  get processedEvents(): DomainEvent[] {
    return [...this._processedEvents];
  }

  get processedCount(): number {
    return this._processedEvents.length;
  }

  get initialized(): boolean {
    return this._initialized;
  }

  get disposed(): boolean {
    return this._disposed;
  }

  reset(): void {
    this._processedEvents = [];
  }
}

describe("Event Processing Integration", () => {
  let registry: EventRegistry;
  let processor: EventProcessor;

  beforeEach(async () => {
    registry = new EventRegistry();
    processor = new EventProcessor(registry);
  });

  afterEach(async () => {
    await registry.clear();
  });

  describe("完整的事件处理流程", () => {
    it("应该完成从注册到处理的完整流程", async () => {
      const aggregateRootId = new EntityId();
      const event = new TestDomainEvent(aggregateRootId, "OrderCreated", {
        orderId: "order-123",
        amount: 100,
      });

      const handler = new MockEventHandler({
        handlerId: "order-created-handler",
        handlerName: "Order Created Handler",
        description: "处理订单创建事件",
        supportedEventTypes: ["OrderCreated"],
        priority: 1,
        enabled: true,
        version: "1.0.0",
      });

      // 1. 注册处理器
      await registry.registerHandler(handler);
      expect(handler.initialized).toBe(true);
      expect(registry.isHandlerRegistered("order-created-handler")).toBe(true);

      // 2. 处理事件
      const results = await processor.processEvent(event);

      // 3. 验证处理结果
      expect(results.length).toBe(1);
      expect(results[0].success).toBe(true);
      expect(results[0].result).toBe(EventHandlerResult.SUCCESS);
      expect(handler.processedCount).toBe(1);

      // 4. 验证处理历史
      const history = processor.getProcessingHistory(event.eventId.value);
      expect(history.length).toBe(1);

      // 5. 注销处理器
      await registry.unregisterHandler("order-created-handler");
      expect(handler.disposed).toBe(true);
      expect(registry.isHandlerRegistered("order-created-handler")).toBe(false);
    });

    it("应该支持多个处理器处理同一个事件类型", async () => {
      const aggregateRootId = new EntityId();
      const event = new TestDomainEvent(aggregateRootId, "UserRegistered", {
        userId: "user-123",
        email: "user@example.com",
      });

      const emailHandler = new MockEventHandler({
        handlerId: "email-handler",
        handlerName: "Email Notification Handler",
        supportedEventTypes: ["UserRegistered"],
        priority: 1,
        enabled: true,
        version: "1.0.0",
      });

      const auditHandler = new MockEventHandler({
        handlerId: "audit-handler",
        handlerName: "Audit Log Handler",
        supportedEventTypes: ["UserRegistered"],
        priority: 2,
        enabled: true,
        version: "1.0.0",
      });

      await registry.registerHandler(emailHandler);
      await registry.registerHandler(auditHandler);

      const results = await processor.processEvent(event);

      expect(results.length).toBe(2);
      expect(emailHandler.processedCount).toBe(1);
      expect(auditHandler.processedCount).toBe(1);
    });

    it("应该支持处理多个事件类型", async () => {
      const aggregateRootId = new EntityId();
      const orderCreatedEvent = new TestDomainEvent(
        aggregateRootId,
        "OrderCreated",
        { orderId: "order-1" },
      );
      const orderPaidEvent = new TestDomainEvent(aggregateRootId, "OrderPaid", {
        orderId: "order-1",
      });

      const orderCreatedHandler = new MockEventHandler({
        handlerId: "order-created-handler",
        handlerName: "Order Created Handler",
        supportedEventTypes: ["OrderCreated"],
        priority: 1,
        enabled: true,
        version: "1.0.0",
      });

      const orderPaidHandler = new MockEventHandler({
        handlerId: "order-paid-handler",
        handlerName: "Order Paid Handler",
        supportedEventTypes: ["OrderPaid"],
        priority: 1,
        enabled: true,
        version: "1.0.0",
      });

      await registry.registerHandler(orderCreatedHandler);
      await registry.registerHandler(orderPaidHandler);

      await processor.processEvent(orderCreatedEvent);
      await processor.processEvent(orderPaidEvent);

      expect(orderCreatedHandler.processedCount).toBe(1);
      expect(orderPaidHandler.processedCount).toBe(1);
    });
  });

  describe("错误处理和恢复", () => {
    it("应该在启用继续模式时继续处理其他处理器", async () => {
      const aggregateRootId = new EntityId();
      const event = new TestDomainEvent(aggregateRootId, "TestEvent", {
        data: "test",
      });

      const failingHandler = new MockEventHandler(
        {
          handlerId: "failing-handler",
          handlerName: "Failing Handler",
          supportedEventTypes: ["TestEvent"],
          priority: 1,
          enabled: true,
          version: "1.0.0",
        },
        false, // 失败
      );

      const succeedingHandler = new MockEventHandler({
        handlerId: "succeeding-handler",
        handlerName: "Succeeding Handler",
        supportedEventTypes: ["TestEvent"],
        priority: 2,
        enabled: true,
        version: "1.0.0",
      });

      await registry.registerHandler(failingHandler);
      await registry.registerHandler(succeedingHandler);

      const processor = new EventProcessor(registry, {
        continueOnError: true,
      });

      const results = await processor.processEvent(event);

      expect(results.length).toBe(2);
      expect(results[0].success).toBe(false);
      expect(results[1].success).toBe(true);
    });

    it("应该正确处理批量事件处理中的错误", async () => {
      const aggregateRootId = new EntityId();
      const event1 = new TestDomainEvent(aggregateRootId, "TestEvent1", {
        data: "test1",
      });
      const event2 = new TestDomainEvent(aggregateRootId, "TestEvent2", {
        data: "test2",
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

  describe("处理器生命周期管理", () => {
    it("应该在清除注册表时销毁所有处理器", async () => {
      const handler1 = new MockEventHandler({
        handlerId: "handler-1",
        handlerName: "Handler 1",
        supportedEventTypes: ["Event1"],
        priority: 1,
        enabled: true,
        version: "1.0.0",
      });

      const handler2 = new MockEventHandler({
        handlerId: "handler-2",
        handlerName: "Handler 2",
        supportedEventTypes: ["Event2"],
        priority: 1,
        enabled: true,
        version: "1.0.0",
      });

      await registry.registerHandler(handler1);
      await registry.registerHandler(handler2);

      await registry.clear();

      expect(handler1.disposed).toBe(true);
      expect(handler2.disposed).toBe(true);
      expect(registry.getAllHandlers().length).toBe(0);
    });

    it("应该在注销单个处理器时只销毁该处理器", async () => {
      const handler1 = new MockEventHandler({
        handlerId: "handler-1",
        handlerName: "Handler 1",
        supportedEventTypes: ["Event1"],
        priority: 1,
        enabled: true,
        version: "1.0.0",
      });

      const handler2 = new MockEventHandler({
        handlerId: "handler-2",
        handlerName: "Handler 2",
        supportedEventTypes: ["Event2"],
        priority: 1,
        enabled: true,
        version: "1.0.0",
      });

      await registry.registerHandler(handler1);
      await registry.registerHandler(handler2);

      await registry.unregisterHandler("handler-1");

      expect(handler1.disposed).toBe(true);
      expect(handler2.disposed).toBe(false);
      expect(registry.isHandlerRegistered("handler-2")).toBe(true);
    });
  });

  describe("性能和并发处理", () => {
    it("应该支持并发处理多个事件", async () => {
      const aggregateRootId = new EntityId();
      const events = Array.from(
        { length: 10 },
        (_, i) =>
          new TestDomainEvent(aggregateRootId, "TestEvent", { index: i }),
      );

      const handler = new MockEventHandler({
        handlerId: "handler-1",
        handlerName: "Handler 1",
        supportedEventTypes: ["TestEvent"],
        priority: 1,
        enabled: true,
        version: "1.0.0",
      });

      await registry.registerHandler(handler);

      const results = await processor.processEvents(events);

      expect(results.size).toBe(10);
      expect(handler.processedCount).toBe(10);
    });

    it("应该正确统计处理历史", async () => {
      const aggregateRootId = new EntityId();
      const events = Array.from(
        { length: 5 },
        (_, i) =>
          new TestDomainEvent(aggregateRootId, "TestEvent", { index: i }),
      );

      const handler = new MockEventHandler({
        handlerId: "handler-1",
        handlerName: "Handler 1",
        supportedEventTypes: ["TestEvent"],
        priority: 1,
        enabled: true,
        version: "1.0.0",
      });

      await registry.registerHandler(handler);

      for (const event of events) {
        await processor.processEvent(event);
      }

      for (const event of events) {
        const history = processor.getProcessingHistory(event.eventId.value);
        expect(history.length).toBe(1);
      }

      const allHistory = processor.getAllProcessingHistory();
      expect(allHistory.size).toBe(5);
    });
  });

  describe("配置选项", () => {
    it("应该使用自定义配置", async () => {
      const aggregateRootId = new EntityId();
      const event = new TestDomainEvent(aggregateRootId, "TestEvent", {
        data: "test",
      });

      const handler = new MockEventHandler(
        {
          handlerId: "handler-1",
          handlerName: "Handler 1",
          supportedEventTypes: ["TestEvent"],
          priority: 1,
          enabled: true,
          version: "1.0.0",
        },
        true,
        0,
      );

      await registry.registerHandler(handler);

      const customConfig: Partial<EventProcessingConfig> = {
        continueOnError: true,
        processByPriority: false,
        defaultTimeout: 5000,
        enableRetry: true,
        maxRetries: 5,
        retryDelay: 500,
      };

      const customProcessor = new EventProcessor(registry, customConfig);

      expect(customProcessor.config.continueOnError).toBe(true);
      expect(customProcessor.config.processByPriority).toBe(false);
      expect(customProcessor.config.defaultTimeout).toBe(5000);
      expect(customProcessor.config.enableRetry).toBe(true);
      expect(customProcessor.config.maxRetries).toBe(5);
      expect(customProcessor.config.retryDelay).toBe(500);
    });
  });
});
