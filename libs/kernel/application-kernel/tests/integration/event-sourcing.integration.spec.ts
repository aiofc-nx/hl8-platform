/**
 * @fileoverview 事件溯源集成测试
 * @description 测试事件存储和事件总线的集成功能
 */

import { Test, TestingModule } from "@nestjs/testing";
import { Logger } from "@hl8/logger";
import { EntityId } from "@hl8/domain-kernel";
import { EventBus } from "@nestjs/cqrs";

import { ApplicationKernelModule } from "../../src/application-kernel.module.js";
import { EventStore } from "../../src/events/store/event-store.impl.js";
import { EventBusImpl as CustomEventBus } from "../../src/events/bus/event-bus.impl.js";
import { DomainEvent } from "../../src/events/types/domain-event.js";

// 测试领域事件
class TestDomainEvent extends DomainEvent {
  constructor(
    aggregateRootId: EntityId,
    public readonly testData: string,
    version: number = 1,
  ) {
    super(
      aggregateRootId,
      "TestDomainEvent",
      { testData },
      {},
      undefined,
      undefined,
      version,
    );
  }
}

class AnotherTestEvent extends DomainEvent {
  constructor(
    aggregateRootId: EntityId,
    public readonly anotherData: number,
    version: number = 1,
  ) {
    super(
      aggregateRootId,
      "AnotherTestEvent",
      { anotherData },
      {},
      undefined,
      undefined,
      version,
    );
  }
}

// 测试事件处理器
class TestEventHandler {
  public handledEvents: DomainEvent[] = [];

  async handle(event: TestDomainEvent): Promise<void> {
    this.handledEvents.push(event);
  }
}

class AnotherEventHandler {
  public handledEvents: DomainEvent[] = [];

  async handle(event: AnotherTestEvent): Promise<void> {
    this.handledEvents.push(event);
  }
}

describe("Event Sourcing Integration Tests", () => {
  let module: TestingModule;
  let eventStore: EventStore;
  let eventBus: CustomEventBus;
  let nestEventBus: EventBus;
  let logger: Logger;
  let testEventHandler: TestEventHandler;
  let anotherEventHandler: AnotherEventHandler;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [ApplicationKernelModule.forRoot()],
      providers: [TestEventHandler, AnotherEventHandler],
    }).compile();

    eventStore = module.get<EventStore>(EventStore);
    eventBus = module.get<CustomEventBus>(CustomEventBus);
    nestEventBus = module.get<EventBus>(EventBus);
    logger = module.get<Logger>(Logger);
    testEventHandler = module.get<TestEventHandler>(TestEventHandler);
    anotherEventHandler = module.get<AnotherEventHandler>(AnotherEventHandler);

    // 订阅测试事件，使处理器能够收到事件
    await eventBus.subscribe("TestDomainEvent", {
      getHandlerName: () => "TestEventHandler",
      getDescription: () => "Test event handler",
      getVersion: () => "1.0.0",
      isAvailable: () => true,
      handle: async (event: TestDomainEvent) => {
        await testEventHandler.handle(event);
        return {
          success: true,
          processingTime: 0,
          handlerName: "TestEventHandler",
        };
      },
    });
    await eventBus.subscribe("AnotherTestEvent", {
      getHandlerName: () => "AnotherEventHandler",
      getDescription: () => "Another test event handler",
      getVersion: () => "1.0.0",
      isAvailable: () => true,
      handle: async (event: AnotherTestEvent) => {
        await anotherEventHandler.handle(event);
        return {
          success: true,
          processingTime: 0,
          handlerName: "AnotherEventHandler",
        };
      },
    });
  });

  afterAll(async () => {
    await module.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    testEventHandler.handledEvents = [];
    anotherEventHandler.handledEvents = [];
  });

  describe("Event Store Integration", () => {
    it("should store and retrieve events", async () => {
      // Given
      const aggregateId = new EntityId();
      const event1 = new TestDomainEvent(aggregateId, "test-data-1", 1);
      const event2 = new TestDomainEvent(aggregateId, "test-data-2", 2);

      // When
      await eventStore.appendEvents(aggregateId, [event1, event2]);
      const retrievedEvents = await eventStore.getEvents(aggregateId);

      // Then
      expect(retrievedEvents).toHaveLength(2);
      expect(retrievedEvents[0].eventType).toBe("TestDomainEvent");
      expect(retrievedEvents[1].eventType).toBe("TestDomainEvent");
    });

    it("should retrieve events by version range", async () => {
      // Given
      const aggregateId = new EntityId();
      const events = Array.from(
        { length: 5 },
        (_, i) => new TestDomainEvent(aggregateId, `test-data-${i}`, i + 1),
      );

      // When
      await eventStore.appendEvents(aggregateId, events);
      const retrievedEvents = await eventStore.getEvents(aggregateId, 2, 4);

      // Then
      expect(retrievedEvents).toHaveLength(3);
      expect(retrievedEvents[0].version).toBe(2);
      expect(retrievedEvents[2].version).toBe(4);
    });

    it("should handle event snapshots", async () => {
      // Given
      const aggregateId = new EntityId();
      const events = Array.from(
        { length: 10 },
        (_, i) => new TestDomainEvent(aggregateId, `test-data-${i}`, i + 1),
      );

      // When
      await eventStore.appendEvents(aggregateId, events);
      const snapshot = await eventStore.createSnapshot(aggregateId, 5);

      // Then
      expect(snapshot).toBeDefined();
      expect(snapshot.aggregateId).toBe(aggregateId);
      expect(snapshot.version).toBe(5);
    });

    it("should replay events from snapshot", async () => {
      // Given
      const aggregateId = new EntityId();
      const events = Array.from(
        { length: 10 },
        (_, i) => new TestDomainEvent(aggregateId, `test-data-${i}`, i + 1),
      );

      // When
      await eventStore.appendEvents(aggregateId, events);
      const snapshot = await eventStore.createSnapshot(aggregateId, 5);
      const replayedEvents = await eventStore.getEvents(aggregateId, 6);

      // Then
      expect(replayedEvents).toHaveLength(5);
      expect(replayedEvents[0].version).toBe(6);
      expect(replayedEvents[4].version).toBe(10);
    });
  });

  describe("Event Bus Integration", () => {
    it("should publish and handle events", async () => {
      // Given
      const aggregateId = new EntityId();
      const event = new TestDomainEvent(aggregateId, "test-data", 1);

      // When
      await eventBus.publish(event);

      // Then
      // Wait for async processing
      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(testEventHandler.handledEvents).toHaveLength(1);
      expect(testEventHandler.handledEvents[0]).toBeInstanceOf(TestDomainEvent);
    });

    it("should handle multiple event types", async () => {
      // Given
      const aggregateId = new EntityId();
      const event1 = new TestDomainEvent(aggregateId, "test-data", 1);
      const event2 = new AnotherTestEvent(aggregateId, 42, 1);

      // When
      await eventBus.publish(event1);
      await eventBus.publish(event2);

      // Then
      // Wait for async processing
      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(testEventHandler.handledEvents).toHaveLength(1);
      expect(anotherEventHandler.handledEvents).toHaveLength(1);
    });

    it("should handle event publishing errors gracefully", async () => {
      // Given
      const aggregateId = new EntityId();
      const invalidEvent = new TestDomainEvent(aggregateId, "", 1);

      // When & Then
      await expect(eventBus.publish(invalidEvent)).resolves.not.toThrow();
    });
  });

  describe("Event Store and Event Bus Integration", () => {
    it("should store events and publish them", async () => {
      // Given
      const aggregateId = new EntityId();
      const event = new TestDomainEvent(aggregateId, "integration-test", 1);

      // When
      await eventStore.appendEvents(aggregateId, [event]);
      await eventBus.publish(event);

      // Then
      // Wait for async processing
      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(testEventHandler.handledEvents).toHaveLength(1);
    });

    it("should handle event replay and republishing", async () => {
      // Given
      const aggregateId = new EntityId();
      const events = Array.from(
        { length: 3 },
        (_, i) => new TestDomainEvent(aggregateId, `replay-test-${i}`, i + 1),
      );

      // When
      await eventStore.appendEvents(aggregateId, events);
      const retrievedEvents = await eventStore.getEvents(aggregateId);

      // Republish events
      for (const event of retrievedEvents) {
        await eventBus.publish(event);
      }

      // Then
      // Wait for async processing
      await new Promise((resolve) => setTimeout(resolve, 200));
      expect(testEventHandler.handledEvents).toHaveLength(3);
    });
  });

  describe("Performance Tests", () => {
    it("should handle large number of events efficiently", async () => {
      // Given
      const aggregateId = new EntityId();
      const events = Array.from(
        { length: 100 },
        (_, i) => new TestDomainEvent(aggregateId, `perf-test-${i}`, i + 1),
      );

      // When
      const startTime = Date.now();
      await eventStore.appendEvents(aggregateId, events);
      const storageTime = Date.now() - startTime;

      // Then
      expect(storageTime).toBeLessThan(1000); // 1 second threshold
    });

    it("should handle concurrent event publishing", async () => {
      // Given
      const aggregateId = new EntityId();
      const events = Array.from(
        { length: 10 },
        (_, i) =>
          new TestDomainEvent(aggregateId, `concurrent-test-${i}`, i + 1),
      );

      // When
      const startTime = Date.now();
      await Promise.all(events.map((event) => eventBus.publish(event)));
      const publishTime = Date.now() - startTime;

      // Then
      expect(publishTime).toBeLessThan(500); // 500ms threshold
    });
  });

  describe("Error Recovery", () => {
    it("should recover from event store errors", async () => {
      // Given
      const aggregateId = new EntityId();
      const event = new TestDomainEvent(aggregateId, "error-recovery-test", 1);

      // When & Then
      // This should not throw even if there are internal errors
      await expect(
        eventStore.appendEvents(aggregateId, [event]),
      ).resolves.not.toThrow();
    });

    it("should recover from event bus errors", async () => {
      // Given
      const aggregateId = new EntityId();
      const event = new TestDomainEvent(aggregateId, "error-recovery-test", 1);

      // When & Then
      // This should not throw even if there are internal errors
      await expect(eventBus.publish(event)).resolves.not.toThrow();
    });
  });

  describe("Logging Integration", () => {
    it("should log event store operations", async () => {
      // Given
      const aggregateId = new EntityId();
      const event = new TestDomainEvent(aggregateId, "logging-test", 1);
      const loggerSpy = jest.spyOn(logger, "log");

      // When
      await eventStore.appendEvents(aggregateId, [event]);

      // Then
      expect(loggerSpy).toHaveBeenCalled();
    });

    it("should log event bus operations", async () => {
      // Given
      const aggregateId = new EntityId();
      const event = new TestDomainEvent(aggregateId, "logging-test", 1);
      const loggerSpy = jest.spyOn(logger, "debug");

      // When
      await eventBus.publish(event);

      // Then
      expect(loggerSpy).toHaveBeenCalled();
    });
  });
});
