/**
 * @fileoverview 事件总线实现单元测试
 * @description 测试EventBusImpl类的功能
 */

import { Test, TestingModule } from "@nestjs/testing";
import { CqrsModule, EventBus } from "@nestjs/cqrs";
import { EventBusImpl } from "./event-bus.impl.js";
import {
  IEventBus,
  EventHandler,
  EventHandlerResult,
} from "./event-bus.interface.js";
import { DomainEvent } from "../types/domain-event.js";
import { IntegrationEvent } from "../types/integration-event.js";
import { EntityId } from "@hl8/domain-kernel";
import { Logger } from "@hl8/logger";

/**
 * 测试事件处理器
 */
class TestEventHandler implements EventHandler {
  private shouldThrowError = false;
  private processingTime = 0;

  constructor(
    public readonly handlerName: string,
    public readonly description: string = "测试事件处理器",
  ) {}

  public setShouldThrowError(shouldThrow: boolean): void {
    this.shouldThrowError = shouldThrow;
  }

  public setProcessingTime(time: number): void {
    this.processingTime = time;
  }

  public async handle(
    event: DomainEvent | IntegrationEvent,
  ): Promise<EventHandlerResult> {
    const startTime = Date.now();

    if (this.shouldThrowError) {
      throw new Error("模拟处理器错误");
    }

    // 模拟处理时间
    if (this.processingTime > 0) {
      await new Promise((resolve) => setTimeout(resolve, this.processingTime));
    }

    return {
      success: true,
      processingTime: Date.now() - startTime,
      handlerName: this.handlerName,
      data: { processed: true },
    };
  }

  public getHandlerName(): string {
    return this.handlerName;
  }

  public getDescription(): string {
    return this.description;
  }

  public getVersion(): string {
    return "1.0.0";
  }

  public isAvailable(): boolean {
    return true;
  }
}

describe("EventBusImpl", () => {
  let eventBus: EventBusImpl;
  let nestEventBus: EventBus;
  let module: TestingModule;
  let mockLogger: jest.Mocked<Logger>;

  beforeEach(async () => {
    mockLogger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    } as any;

    module = await Test.createTestingModule({
      imports: [CqrsModule],
      providers: [
        EventBusImpl,
        {
          provide: Logger,
          useValue: mockLogger,
        },
      ],
    }).compile();

    eventBus = module.get<EventBusImpl>(EventBusImpl);
    nestEventBus = module.get<EventBus>(EventBus);
  });

  afterEach(async () => {
    await module.close();
  });

  describe("构造函数", () => {
    it("应该正确初始化事件总线", () => {
      expect(eventBus).toBeDefined();
      expect(eventBus.isRunning()).toBe(false);
    });
  });

  describe("start和stop", () => {
    it("应该能够启动和停止事件总线", async () => {
      await eventBus.start();
      expect(eventBus.isRunning()).toBe(true);

      await eventBus.stop();
      expect(eventBus.isRunning()).toBe(false);
    });
  });

  describe("publishDomainEvent", () => {
    it("应该成功发布领域事件", async () => {
      const aggregateId = new EntityId();
      const event = new DomainEvent(
        aggregateId,
        "UserCreated",
        { name: "John Doe" },
        {},
      );

      const result = await eventBus.publishDomainEvent(event);

      expect(result.success).toBe(true);
      expect(result.eventId).toBe(event.eventId.toString());
      expect(result.timestamp).toBeInstanceOf(Date);
      expect(result.processingTime).toBeGreaterThanOrEqual(0);
    });

    it("应该处理发布错误", async () => {
      // 模拟NestJS事件总线抛出错误
      jest.spyOn(nestEventBus, "publish").mockImplementation(() => {
        throw new Error("发布失败");
      });

      const aggregateId = new EntityId();
      const event = new DomainEvent(
        aggregateId,
        "UserCreated",
        { name: "John Doe" },
        {},
      );

      const result = await eventBus.publishDomainEvent(event);

      expect(result.success).toBe(false);
      expect(result.error).toBe("发布失败");
    });
  });

  describe("publishIntegrationEvent", () => {
    it("应该成功发布集成事件", async () => {
      const event = new IntegrationEvent(
        "UserCreated",
        { name: "John Doe" },
        "user-service",
      );

      const result = await eventBus.publishIntegrationEvent(event);

      expect(result.success).toBe(true);
      expect(result.eventId).toBe(event.eventId.toString());
      expect(result.timestamp).toBeInstanceOf(Date);
      expect(result.processingTime).toBeGreaterThanOrEqual(0);
    });

    it("应该处理发布错误", async () => {
      // 模拟NestJS事件总线抛出错误
      jest.spyOn(nestEventBus, "publish").mockImplementation(() => {
        throw new Error("发布失败");
      });

      const event = new IntegrationEvent(
        "UserCreated",
        { name: "John Doe" },
        "user-service",
      );

      const result = await eventBus.publishIntegrationEvent(event);

      expect(result.success).toBe(false);
      expect(result.error).toBe("发布失败");
    });
  });

  describe("publishEvents", () => {
    it("应该批量发布事件", async () => {
      const aggregateId = new EntityId();
      const domainEvent = new DomainEvent(
        aggregateId,
        "UserCreated",
        { name: "John Doe" },
        {},
      );
      const integrationEvent = new IntegrationEvent(
        "UserCreated",
        { name: "John Doe" },
        "user-service",
      );

      const results = await eventBus.publishEvents([
        domainEvent,
        integrationEvent,
      ]);

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(true);
    });
  });

  describe("subscribeToDomainEvent", () => {
    it("应该成功订阅领域事件", async () => {
      const handler = new TestEventHandler("TestHandler");
      const subscriptionId = await eventBus.subscribeToDomainEvent(
        "UserCreated",
        handler,
      );

      expect(subscriptionId).toBeDefined();
      expect(subscriptionId).toMatch(/^sub_\d+_[a-z0-9]+$/);

      const subscriptions = await eventBus.getSubscriptions();
      expect(subscriptions).toHaveLength(1);
      expect(subscriptions[0].eventType).toBe("UserCreated");
      expect(subscriptions[0].subscriptionType).toBe("domain");
      expect(subscriptions[0].handlerName).toBe("TestHandler");
    });
  });

  describe("subscribeToIntegrationEvent", () => {
    it("应该成功订阅集成事件", async () => {
      const handler = new TestEventHandler("TestHandler");
      const subscriptionId = await eventBus.subscribeToIntegrationEvent(
        "UserCreated",
        handler,
      );

      expect(subscriptionId).toBeDefined();
      expect(subscriptionId).toMatch(/^sub_\d+_[a-z0-9]+$/);

      const subscriptions = await eventBus.getSubscriptions();
      expect(subscriptions).toHaveLength(1);
      expect(subscriptions[0].eventType).toBe("UserCreated");
      expect(subscriptions[0].subscriptionType).toBe("integration");
      expect(subscriptions[0].handlerName).toBe("TestHandler");
    });
  });

  describe("unsubscribe", () => {
    it("应该成功取消订阅", async () => {
      const handler = new TestEventHandler("TestHandler");
      const subscriptionId = await eventBus.subscribeToDomainEvent(
        "UserCreated",
        handler,
      );

      const result = await eventBus.unsubscribe(subscriptionId);
      expect(result).toBe(true);

      const subscriptions = await eventBus.getSubscriptions();
      expect(subscriptions[0].active).toBe(false);
    });

    it("应该处理不存在的订阅", async () => {
      const result = await eventBus.unsubscribe("non-existent-id");
      expect(result).toBe(false);
    });
  });

  describe("getStatistics", () => {
    it("应该返回统计信息", async () => {
      const stats = await eventBus.getStatistics();

      expect(stats).toEqual({
        totalPublished: 0,
        totalProcessed: 0,
        totalSubscriptions: 0,
        activeSubscriptions: 0,
        averageProcessingTime: 0,
        successRate: 0,
        byEventType: {},
        byHandler: {},
        lastUpdated: expect.any(Date),
      });
    });

    it("应该更新统计信息", async () => {
      const aggregateId = new EntityId();
      const event = new DomainEvent(
        aggregateId,
        "UserCreated",
        { name: "John Doe" },
        {},
      );

      await eventBus.publishDomainEvent(event);

      const stats = await eventBus.getStatistics();
      expect(stats.totalPublished).toBe(1);
      expect(stats.byEventType["UserCreated"]).toBeDefined();
      expect(stats.byEventType["UserCreated"].published).toBe(1);
    });
  });

  describe("事件处理", () => {
    it("应该处理领域事件", async () => {
      const handler = new TestEventHandler("TestHandler");
      await eventBus.subscribeToDomainEvent("UserCreated", handler);

      const aggregateId = new EntityId();
      const event = new DomainEvent(
        aggregateId,
        "UserCreated",
        { name: "John Doe" },
        {},
      );

      const result = await eventBus.publishDomainEvent(event);
      expect(result.success).toBe(true);
    });

    it("应该处理集成事件", async () => {
      const handler = new TestEventHandler("TestHandler");
      await eventBus.subscribeToIntegrationEvent("UserCreated", handler);

      const event = new IntegrationEvent(
        "UserCreated",
        { name: "John Doe" },
        "user-service",
      );

      const result = await eventBus.publishIntegrationEvent(event);
      expect(result.success).toBe(true);
    });
  });

  describe("错误处理", () => {
    it("应该处理处理器错误", async () => {
      const handler = new TestEventHandler("TestHandler");
      handler.setShouldThrowError(true);
      await eventBus.subscribeToDomainEvent("UserCreated", handler);

      const aggregateId = new EntityId();
      const event = new DomainEvent(
        aggregateId,
        "UserCreated",
        { name: "John Doe" },
        {},
      );

      // 这里应该不会抛出异常，因为错误被内部处理
      const result = await eventBus.publishDomainEvent(event);
      expect(result.success).toBe(true);
    });
  });

  describe("配置", () => {
    it("应该使用默认配置", () => {
      expect(eventBus).toBeDefined();
    });

    it("应该使用自定义配置", () => {
      const customConfig = {
        maxRetries: 5,
        retryDelay: 2000,
        maxConcurrency: 20,
        processingTimeout: 60000,
        enableDeadLetterQueue: false,
        deadLetterQueueMaxSize: 500,
        enablePerformanceMonitoring: false,
        performanceMonitoringSamplingRate: 0.05,
      };

      const customEventBus = new EventBusImpl(
        mockLogger,
        nestEventBus,
        customConfig,
      );
      expect(customEventBus).toBeDefined();
    });
  });
});
