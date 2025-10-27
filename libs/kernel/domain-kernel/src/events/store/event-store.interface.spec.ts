/**
 * @fileoverview 事件存储接口测试
 * @description 测试事件存储接口的定义和异常处理
 */

import {
  IEventStore,
  EventStoreStats,
  EventStoreConfig,
  EventStoreException,
} from "./event-store.interface.js";
import { DomainEvent } from "../base/domain-event.base.js";
import { EntityId } from "../../identifiers/entity-id.js";

// 测试用的具体领域事件实现
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
    if (!this.aggregateRootId) {
      throw new Error("聚合根标识符不能为空");
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

// 测试用的内存事件存储实现
class InMemoryEventStore implements IEventStore {
  private events: DomainEvent[] = [];
  private stats: EventStoreStats = {
    totalEvents: 0,
    aggregateRootCount: 0,
    eventTypeCount: 0,
    earliestEventTime: null,
    latestEventTime: null,
    storageSize: 0,
  };

  async appendEvents(events: DomainEvent[]): Promise<void> {
    this.events.push(...events);
    this.updateStats();
  }

  async getEvents(aggregateRootId: EntityId): Promise<DomainEvent[]> {
    return this.events.filter((event) =>
      event.aggregateRootId.equals(aggregateRootId),
    );
  }

  async getEventsFromVersion(
    aggregateRootId: EntityId,
    fromVersion: number,
  ): Promise<DomainEvent[]> {
    return this.events.filter(
      (event) =>
        event.aggregateRootId.equals(aggregateRootId) &&
        event.version >= fromVersion,
    );
  }

  async getEventsInTimeRange(
    aggregateRootId: EntityId,
    fromDate: Date,
    toDate: Date,
  ): Promise<DomainEvent[]> {
    return this.events.filter(
      (event) =>
        event.aggregateRootId.equals(aggregateRootId) &&
        event.timestamp >= fromDate &&
        event.timestamp <= toDate,
    );
  }

  async getAllEvents(limit?: number, offset?: number): Promise<DomainEvent[]> {
    const start = offset || 0;
    const end = limit ? start + limit : this.events.length;
    return this.events.slice(start, end);
  }

  async getEventsByType(
    eventType: string,
    limit?: number,
    offset?: number,
  ): Promise<DomainEvent[]> {
    const filtered = this.events.filter(
      (event) => event.eventType === eventType,
    );
    const start = offset || 0;
    const end = limit ? start + limit : filtered.length;
    return filtered.slice(start, end);
  }

  async getLatestVersion(aggregateRootId: EntityId): Promise<number> {
    const aggregateEvents = this.events.filter((event) =>
      event.aggregateRootId.equals(aggregateRootId),
    );
    return aggregateEvents.length > 0
      ? Math.max(...aggregateEvents.map((event) => event.version))
      : 0;
  }

  async eventExists(eventId: EntityId): Promise<boolean> {
    return this.events.some((event) => event.eventId.equals(eventId));
  }

  async deleteEvents(aggregateRootId: EntityId): Promise<void> {
    this.events = this.events.filter(
      (event) => !event.aggregateRootId.equals(aggregateRootId),
    );
    this.updateStats();
  }

  async clearAllEvents(): Promise<void> {
    this.events = [];
    this.updateStats();
  }

  async getStats(): Promise<EventStoreStats> {
    return { ...this.stats };
  }

  private updateStats(): void {
    this.stats.totalEvents = this.events.length;
    this.stats.aggregateRootCount = new Set(
      this.events.map((event) => event.aggregateRootId.value),
    ).size;
    this.stats.eventTypeCount = new Set(
      this.events.map((event) => event.eventType),
    ).size;

    if (this.events.length > 0) {
      const timestamps = this.events.map((event) => event.timestamp);
      this.stats.earliestEventTime = new Date(
        Math.min(...timestamps.map((t) => t.getTime())),
      );
      this.stats.latestEventTime = new Date(
        Math.max(...timestamps.map((t) => t.getTime())),
      );
    } else {
      this.stats.earliestEventTime = null;
      this.stats.latestEventTime = null;
    }

    this.stats.storageSize = JSON.stringify(this.events).length;
  }
}

describe("IEventStore", () => {
  let eventStore: IEventStore;
  let aggregateRootId: EntityId;
  let event1: TestDomainEvent;
  let event2: TestDomainEvent;

  beforeEach(() => {
    eventStore = new InMemoryEventStore();
    aggregateRootId = new EntityId();
    event1 = new TestDomainEvent(aggregateRootId, "TestEvent1", {
      data: "test1",
    });
    event2 = new TestDomainEvent(aggregateRootId, "TestEvent2", {
      data: "test2",
    });
  });

  describe("appendEvents", () => {
    it("应该追加事件到存储", async () => {
      await eventStore.appendEvents([event1, event2]);

      const events = await eventStore.getEvents(aggregateRootId);
      expect(events).toHaveLength(2);
    });

    it("应该处理空事件数组", async () => {
      await expect(eventStore.appendEvents([])).resolves.not.toThrow();
    });
  });

  describe("getEvents", () => {
    it("应该获取聚合根的所有事件", async () => {
      await eventStore.appendEvents([event1, event2]);

      const events = await eventStore.getEvents(aggregateRootId);
      expect(events).toHaveLength(2);
      expect(events[0].equals(event1)).toBe(true);
      expect(events[1].equals(event2)).toBe(true);
    });

    it("应该返回空数组当聚合根没有事件时", async () => {
      const events = await eventStore.getEvents(aggregateRootId);
      expect(events).toHaveLength(0);
    });
  });

  describe("getEventsFromVersion", () => {
    it("应该获取指定版本之后的事件", async () => {
      const event1WithVersion = new TestDomainEvent(
        aggregateRootId,
        "Event1",
        { data: "1" },
        {},
        undefined,
        undefined,
        1,
      );
      const event2WithVersion = new TestDomainEvent(
        aggregateRootId,
        "Event2",
        { data: "2" },
        {},
        undefined,
        undefined,
        2,
      );
      const event3WithVersion = new TestDomainEvent(
        aggregateRootId,
        "Event3",
        { data: "3" },
        {},
        undefined,
        undefined,
        3,
      );

      await eventStore.appendEvents([
        event1WithVersion,
        event2WithVersion,
        event3WithVersion,
      ]);

      const events = await eventStore.getEventsFromVersion(aggregateRootId, 2);
      expect(events).toHaveLength(2);
      expect(events[0].version).toBe(2);
      expect(events[1].version).toBe(3);
    });
  });

  describe("getEventsInTimeRange", () => {
    it("应该获取指定时间范围内的事件", async () => {
      const now = new Date();
      const past = new Date(now.getTime() - 1000);
      const future = new Date(now.getTime() + 1000);

      const pastEvent = new TestDomainEvent(
        aggregateRootId,
        "PastEvent",
        { data: "past" },
        {},
        undefined,
        past,
      );
      const nowEvent = new TestDomainEvent(
        aggregateRootId,
        "NowEvent",
        { data: "now" },
        {},
        undefined,
        now,
      );
      const futureEvent = new TestDomainEvent(
        aggregateRootId,
        "FutureEvent",
        { data: "future" },
        {},
        undefined,
        future,
      );

      await eventStore.appendEvents([pastEvent, nowEvent, futureEvent]);

      const events = await eventStore.getEventsInTimeRange(
        aggregateRootId,
        past,
        now,
      );
      expect(events).toHaveLength(2);
    });
  });

  describe("getAllEvents", () => {
    it("应该获取所有事件", async () => {
      await eventStore.appendEvents([event1, event2]);

      const events = await eventStore.getAllEvents();
      expect(events).toHaveLength(2);
    });

    it("应该支持分页", async () => {
      await eventStore.appendEvents([event1, event2]);

      const events = await eventStore.getAllEvents(1, 0);
      expect(events).toHaveLength(1);
    });
  });

  describe("getEventsByType", () => {
    it("应该获取指定类型的事件", async () => {
      await eventStore.appendEvents([event1, event2]);

      const events = await eventStore.getEventsByType("TestEvent1");
      expect(events).toHaveLength(1);
      expect(events[0].eventType).toBe("TestEvent1");
    });
  });

  describe("getLatestVersion", () => {
    it("应该获取聚合根的最新版本号", async () => {
      const event1WithVersion = new TestDomainEvent(
        aggregateRootId,
        "Event1",
        { data: "1" },
        {},
        undefined,
        undefined,
        1,
      );
      const event2WithVersion = new TestDomainEvent(
        aggregateRootId,
        "Event2",
        { data: "2" },
        {},
        undefined,
        undefined,
        3,
      );

      await eventStore.appendEvents([event1WithVersion, event2WithVersion]);

      const version = await eventStore.getLatestVersion(aggregateRootId);
      expect(version).toBe(3);
    });

    it("应该返回0当聚合根没有事件时", async () => {
      const version = await eventStore.getLatestVersion(aggregateRootId);
      expect(version).toBe(0);
    });
  });

  describe("eventExists", () => {
    it("应该检查事件是否存在", async () => {
      await eventStore.appendEvents([event1]);

      const exists = await eventStore.eventExists(event1.eventId);
      expect(exists).toBe(true);

      const notExists = await eventStore.eventExists(new EntityId());
      expect(notExists).toBe(false);
    });
  });

  describe("deleteEvents", () => {
    it("应该删除聚合根的所有事件", async () => {
      await eventStore.appendEvents([event1, event2]);
      await eventStore.deleteEvents(aggregateRootId);

      const events = await eventStore.getEvents(aggregateRootId);
      expect(events).toHaveLength(0);
    });
  });

  describe("clearAllEvents", () => {
    it("应该清空所有事件", async () => {
      await eventStore.appendEvents([event1, event2]);
      await eventStore.clearAllEvents();

      const events = await eventStore.getAllEvents();
      expect(events).toHaveLength(0);
    });
  });

  describe("getStats", () => {
    it("应该返回统计信息", async () => {
      await eventStore.appendEvents([event1, event2]);

      const stats = await eventStore.getStats();
      expect(stats.totalEvents).toBe(2);
      expect(stats.aggregateRootCount).toBe(1);
      expect(stats.eventTypeCount).toBe(2);
      expect(stats.earliestEventTime).toBeInstanceOf(Date);
      expect(stats.latestEventTime).toBeInstanceOf(Date);
    });
  });
});

describe("EventStoreException", () => {
  it("应该创建异常实例", () => {
    const exception = new EventStoreException("测试错误", "TEST_ERROR", {
      detail: "详细信息",
    });

    expect(exception.message).toBe("测试错误");
    expect(exception.code).toBe("TEST_ERROR");
    expect(exception.details).toEqual({ detail: "详细信息" });
    expect(exception.name).toBe("EventStoreException");
  });
});

describe("EventStoreConfig", () => {
  it("应该支持所有配置选项", () => {
    const config: EventStoreConfig = {
      maxEvents: 1000,
      retentionTime: 86400000, // 1天
      enableCompression: true,
      enableEncryption: false,
      batchSize: 100,
    };

    expect(config.maxEvents).toBe(1000);
    expect(config.retentionTime).toBe(86400000);
    expect(config.enableCompression).toBe(true);
    expect(config.enableEncryption).toBe(false);
    expect(config.batchSize).toBe(100);
  });
});
