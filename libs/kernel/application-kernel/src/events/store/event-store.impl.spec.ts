/**
 * @fileoverview 事件存储实现单元测试
 * @description 测试EventStore类的功能
 */

import { Test, TestingModule } from "@nestjs/testing";
import { EventStore } from "./event-store.impl.js";
import { EntityId } from "@hl8/domain-kernel";
import { DomainEvent } from "../types/domain-event.js";
import { EventSnapshot } from "./event-snapshot.js";
import { Logger } from "@hl8/logger";

// Mock logger
const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  trace: jest.fn(),
  child: jest.fn(() => mockLogger),
};

describe("EventStore", () => {
  let eventStore: EventStore;
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [
        EventStore,
        {
          provide: "PinoLogger:EventStore",
          useValue: mockLogger,
        },
      ],
    }).compile();

    eventStore = module.get<EventStore>(EventStore);
  });

  afterEach(async () => {
    await module.close();
  });

  describe("saveEvents", () => {
    it("应该成功保存事件", async () => {
      try {
        const aggregateId = new EntityId();
        console.log("AggregateId:", aggregateId.toString());
        const events: DomainEvent[] = [
          new DomainEvent(
            aggregateId,
            "UserCreated",
            { name: "John Doe" },
            { version: 1 },
          ),
        ];

        console.log("Events created:", events);
        const result = await eventStore.saveEvents(aggregateId, events, 0);

        console.log("Result:", result);
        if (!result.success) {
          console.error("Error:", result.error);
        }
        expect(result.success).toBe(true);
        expect(result.eventsCount).toBe(1);
        expect(result.newVersion).toBe(1);
      } catch (error) {
        console.error("Test error:", error);
        throw error;
      }
    });

    it("应该处理版本冲突", async () => {
      const aggregateId = new EntityId();
      const events: DomainEvent[] = [
        new DomainEvent(aggregateId, "UserCreated", { name: "John Doe" }, {}),
      ];

      // 第一次保存
      await eventStore.saveEvents(aggregateId, events, 0);

      // 第二次保存时版本冲突
      const result = await eventStore.saveEvents(aggregateId, events, 0);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Version conflict");
    });
  });

  describe("getEvents", () => {
    it("应该获取聚合根的所有事件", async () => {
      const aggregateId = new EntityId();
      const events: DomainEvent[] = [
        new DomainEvent(aggregateId, "UserCreated", { name: "John Doe" }, {}),
        new DomainEvent(aggregateId, "UserUpdated", { name: "Jane Doe" }, {}),
      ];

      await eventStore.saveEvents(aggregateId, events, 0);
      const retrievedEvents = await eventStore.getEvents(aggregateId);

      expect(retrievedEvents).toHaveLength(2);
      expect(retrievedEvents[0].eventType).toBe("UserCreated");
      expect(retrievedEvents[1].eventType).toBe("UserUpdated");
    });

    it("应该按版本范围过滤事件", async () => {
      const aggregateId = new EntityId();
      const events: DomainEvent[] = [
        new DomainEvent(aggregateId, "UserCreated", { name: "John Doe" }, {}),
        new DomainEvent(aggregateId, "UserUpdated", { name: "Jane Doe" }, {}),
      ];

      await eventStore.saveEvents(aggregateId, events, 0);
      const filteredEvents = await eventStore.getEvents(aggregateId, 2, 2);

      expect(filteredEvents).toHaveLength(1);
      expect(filteredEvents[0].eventType).toBe("UserUpdated");
    });
  });

  describe("getEventStream", () => {
    it("应该获取事件流", async () => {
      const aggregateId = new EntityId();
      const events: DomainEvent[] = [
        new DomainEvent(aggregateId, "UserCreated", { name: "John Doe" }, {}),
      ];

      await eventStore.saveEvents(aggregateId, events, 0);
      const stream = await eventStore.getEventStream(aggregateId);

      expect(stream.aggregateId).toBe(aggregateId);
      expect(stream.events).toHaveLength(1);
      expect(stream.fromVersion).toBe(0);
      expect(stream.toVersion).toBe(1);
      expect(stream.totalEvents).toBe(1);
      expect(stream.hasMore).toBe(false);
    });
  });

  describe("getAllEvents", () => {
    it("应该获取所有事件", async () => {
      const aggregateId1 = new EntityId();
      const aggregateId2 = new EntityId();
      const events1: DomainEvent[] = [
        new DomainEvent(aggregateId1, "UserCreated", { name: "John Doe" }, {}),
      ];
      const events2: DomainEvent[] = [
        new DomainEvent(aggregateId2, "OrderCreated", { orderId: "123" }, {}),
      ];

      await eventStore.saveEvents(aggregateId1, events1, 0);
      await eventStore.saveEvents(aggregateId2, events2, 0);

      const allEvents = await eventStore.getAllEvents();

      expect(allEvents).toHaveLength(2);
    });
  });

  describe("snapshots", () => {
    it("应该保存和获取快照", async () => {
      const aggregateId = new EntityId();
      const snapshot = new EventSnapshot(
        aggregateId,
        5,
        { name: "John Doe", email: "john@example.com" },
        "UserSnapshot",
      );

      const saveResult = await eventStore.saveSnapshot(snapshot);
      expect(saveResult.success).toBe(true);

      const retrievedSnapshot = await eventStore.getSnapshot(aggregateId);
      expect(retrievedSnapshot).not.toBeNull();
      expect(retrievedSnapshot?.version).toBe(5);
      expect(retrievedSnapshot?.type).toBe("UserSnapshot");
    });

    it("应该删除快照", async () => {
      const aggregateId = new EntityId();
      const snapshot = new EventSnapshot(
        aggregateId,
        5,
        { name: "John Doe" },
        "UserSnapshot",
      );

      await eventStore.saveSnapshot(snapshot);
      const deleteResult = await eventStore.deleteSnapshot(aggregateId, 5);

      expect(deleteResult.success).toBe(true);

      const retrievedSnapshot = await eventStore.getSnapshot(aggregateId);
      expect(retrievedSnapshot).toBeNull();
    });
  });

  describe("getCurrentVersion", () => {
    it("应该返回当前版本号", async () => {
      const aggregateId = new EntityId();
      const events: DomainEvent[] = [
        {
          id: new EntityId(),
          type: "UserCreated",
          data: { name: "John Doe" },
          timestamp: new Date(),
          version: 1,
          aggregateId: aggregateId.toString(),
        } as DomainEvent,
      ];

      await eventStore.saveEvents(aggregateId, events, 0);
      const version = await eventStore.getCurrentVersion(aggregateId);

      expect(version).toBe(1);
    });
  });

  describe("exists", () => {
    it("应该检查聚合根是否存在", async () => {
      const aggregateId = new EntityId();

      expect(await eventStore.exists(aggregateId)).toBe(false);

      const events: DomainEvent[] = [
        new DomainEvent(aggregateId, "UserCreated", { name: "John Doe" }, {}),
      ];

      await eventStore.saveEvents(aggregateId, events, 0);
      expect(await eventStore.exists(aggregateId)).toBe(true);
    });
  });

  describe("getStatistics", () => {
    it("应该返回统计信息", async () => {
      const aggregateId = new EntityId();
      const events: DomainEvent[] = [
        new DomainEvent(aggregateId, "UserCreated", { name: "John Doe" }, {}),
      ];

      await eventStore.saveEvents(aggregateId, events, 0);
      const stats = await eventStore.getStatistics();

      expect(stats.totalEvents).toBe(1);
      expect(stats.aggregateCount).toBe(1);
      expect(stats.byType["UserCreated"]).toBe(1);
    });

    it("应该返回特定聚合根的统计信息", async () => {
      const aggregateId = new EntityId();
      const events: DomainEvent[] = [
        new DomainEvent(aggregateId, "UserCreated", { name: "John Doe" }, {}),
      ];

      await eventStore.saveEvents(aggregateId, events, 0);
      const stats = await eventStore.getStatistics(aggregateId);

      expect(stats.totalEvents).toBe(1);
      expect(stats.aggregateCount).toBe(1);
      expect(stats.byAggregate[aggregateId.toString()]).toBe(1);
    });
  });
});
