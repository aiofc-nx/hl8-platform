/**
 * @fileoverview 事件存储单元测试
 * @description 验证 MikroORMEventStore 的所有方法实现
 */

import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { EntityManager } from "@mikro-orm/core";
import { MikroORMEventStore } from "./event-store.impl.js";
import { EventEntity } from "./event-entity.js";
import { EventSnapshotEntity } from "./event-snapshot-entity.js";
import {
  DomainEvent as ApplicationDomainEvent,
  EventSnapshot,
} from "@hl8/application-kernel";
import { EntityId } from "@hl8/domain-kernel";

describe("MikroORMEventStore", () => {
  let mockEm: EntityManager;
  let eventStore: MikroORMEventStore;

  beforeEach(() => {
    mockEm = {
      find: jest.fn(),
      findOne: jest.fn(),
      persist: jest.fn(),
      flush: jest.fn(),
      remove: jest.fn(),
      removeAndFlush: jest.fn(),
      count: jest.fn(),
    } as any;

    eventStore = new MikroORMEventStore(mockEm);
  });

  describe("constructor", () => {
    it("应该能够在提供 EntityManager 时创建实例", () => {
      const store = new MikroORMEventStore(mockEm);
      expect(store).toBeDefined();
    });

    it("应该在 EntityManager 为空时抛出错误", () => {
      expect(() => {
        new MikroORMEventStore(null as any);
      }).toThrow("EntityManager不能为空");
    });

    it("应该能够使用自定义事件实体类", () => {
      const store = new MikroORMEventStore(
        mockEm,
        EventEntity,
        EventSnapshotEntity,
      );
      expect(store).toBeDefined();
    });
  });

  describe("saveEvents", () => {
    it("应该在事件列表为空时抛出错误", async () => {
      const aggregateId = EntityId.generate();

      await expect(eventStore.saveEvents(aggregateId, [], 0)).rejects.toThrow(
        "事件列表不能为空",
      );
    });

    it("应该在版本冲突时返回失败结果", async () => {
      const aggregateId = EntityId.generate();
      const events = [
        new ApplicationDomainEvent(
          aggregateId,
          "TestEvent",
          { test: "data" },
          {},
          EntityId.generate(),
          new Date(),
          1,
        ),
      ];

      // Mock getCurrentVersion 返回不同的版本（通过 mock findOne）
      const existingEvent = new EventEntity();
      existingEvent.aggregateId = aggregateId.value;
      existingEvent.eventVersion = 5; // 当前版本是5，期望版本是0

      const tempEm = {
        ...mockEm,
        findOne: jest.fn().mockResolvedValue(existingEvent),
      } as any;
      const tempStore = new MikroORMEventStore(tempEm);

      const result = await tempStore.saveEvents(aggregateId, events, 0);

      expect(result.success).toBe(false);
      expect(result.error).toContain("版本冲突");
    });

    it("应该能够成功保存事件", async () => {
      const aggregateId = EntityId.generate();
      const events = [
        new ApplicationDomainEvent(
          aggregateId,
          "TestEvent",
          { test: "data" },
          {},
          EntityId.generate(),
          new Date(),
          1,
        ),
      ];

      // Mock getCurrentVersion 返回期望的版本（通过 mock findOne）
      const tempEm = {
        ...mockEm,
        findOne: jest.fn().mockResolvedValue(null), // 没有现有事件，版本为0
      } as any;
      const tempStore = new MikroORMEventStore(tempEm);
      (tempEm.flush as jest.Mock).mockResolvedValue(undefined);

      const result = await tempStore.saveEvents(aggregateId, events, 0);

      expect(result.success).toBe(true);
      expect(result.eventsCount).toBe(1);
      expect(result.newVersion).toBe(1);
      expect(tempEm.persist).toHaveBeenCalled();
      expect(tempEm.flush).toHaveBeenCalled();
    });
  });

  describe("getEvents", () => {
    it("应该能够获取聚合根的所有事件", async () => {
      const aggregateId = EntityId.generate();
      const eventEntity = new EventEntity();
      eventEntity.aggregateId = aggregateId.value;
      eventEntity.eventVersion = 1;
      eventEntity.eventType = "TestEvent";
      eventEntity.eventId = EntityId.generate().value;
      eventEntity.data = { test: "data" };
      eventEntity.metadata = {};
      eventEntity.timestamp = new Date();

      (mockEm.find as jest.Mock).mockResolvedValue([eventEntity]);

      const events = await eventStore.getEvents(aggregateId);

      expect(events).toBeDefined();
      expect(events.length).toBe(1);
      expect(mockEm.find).toHaveBeenCalled();
    });

    it("应该能够使用版本范围过滤事件", async () => {
      const aggregateId = EntityId.generate();
      const eventEntity = new EventEntity();
      eventEntity.aggregateId = aggregateId.value;
      eventEntity.eventVersion = 2;
      eventEntity.eventType = "TestEvent";
      eventEntity.eventId = EntityId.generate().value;
      eventEntity.data = { test: "data" };
      eventEntity.metadata = {};
      eventEntity.timestamp = new Date();

      (mockEm.find as jest.Mock).mockResolvedValue([eventEntity]);

      const events = await eventStore.getEvents(aggregateId, 2, 5);

      expect(events).toBeDefined();
      expect(mockEm.find).toHaveBeenCalledWith(
        EventEntity,
        expect.objectContaining({
          aggregateId: aggregateId.value,
          eventVersion: expect.objectContaining({
            $gte: 2,
            $lte: 5,
          }),
        }),
        expect.any(Object),
      );
    });

    it("应该在查询失败时抛出错误", async () => {
      const aggregateId = EntityId.generate();

      (mockEm.find as jest.Mock).mockRejectedValue(new Error("查询失败"));

      await expect(eventStore.getEvents(aggregateId)).rejects.toThrow(
        "获取事件失败",
      );
    });
  });

  describe("getEventStream", () => {
    it("应该能够获取事件流", async () => {
      const aggregateId = EntityId.generate();
      const eventEntity = new EventEntity();
      eventEntity.aggregateId = aggregateId.value;
      eventEntity.eventVersion = 1;
      eventEntity.eventType = "TestEvent";
      eventEntity.eventId = EntityId.generate().value;
      eventEntity.data = { test: "data" };
      eventEntity.metadata = {};
      eventEntity.timestamp = new Date();

      (mockEm.find as jest.Mock).mockResolvedValue([eventEntity]);

      const stream = await eventStore.getEventStream(aggregateId);

      expect(stream).toBeDefined();
      expect(stream.aggregateId).toEqual(aggregateId);
      expect(stream.events.length).toBe(1);
      expect(stream.totalEvents).toBe(1);
    });
  });

  describe("getAllEvents", () => {
    it("应该能够获取所有事件", async () => {
      const eventEntity = new EventEntity();
      eventEntity.aggregateId = EntityId.generate().value;
      eventEntity.eventVersion = 1;
      eventEntity.eventType = "TestEvent";
      eventEntity.eventId = EntityId.generate().value;
      eventEntity.data = { test: "data" };
      eventEntity.metadata = {};
      eventEntity.timestamp = new Date();

      (mockEm.find as jest.Mock).mockResolvedValue([eventEntity]);

      const events = await eventStore.getAllEvents();

      expect(events).toBeDefined();
      expect(events.length).toBe(1);
    });

    it("应该能够使用时间范围过滤事件", async () => {
      const fromTimestamp = new Date("2024-01-01");
      const toTimestamp = new Date("2024-12-31");
      const eventEntity = new EventEntity();
      eventEntity.aggregateId = EntityId.generate().value;
      eventEntity.eventVersion = 1;
      eventEntity.eventType = "TestEvent";
      eventEntity.eventId = EntityId.generate().value;
      eventEntity.data = { test: "data" };
      eventEntity.metadata = {};
      eventEntity.timestamp = new Date("2024-06-01");

      (mockEm.find as jest.Mock).mockResolvedValue([eventEntity]);

      const events = await eventStore.getAllEvents(fromTimestamp, toTimestamp);

      expect(events).toBeDefined();
      expect(mockEm.find).toHaveBeenCalledWith(
        EventEntity,
        expect.objectContaining({
          timestamp: expect.objectContaining({
            $gte: fromTimestamp,
            $lte: toTimestamp,
          }),
        }),
        expect.any(Object),
      );
    });

    it("应该能够使用数量限制", async () => {
      const eventEntity = new EventEntity();
      eventEntity.aggregateId = EntityId.generate().value;
      eventEntity.eventVersion = 1;
      eventEntity.eventType = "TestEvent";
      eventEntity.eventId = EntityId.generate().value;
      eventEntity.data = { test: "data" };
      eventEntity.metadata = {};
      eventEntity.timestamp = new Date();

      (mockEm.find as jest.Mock).mockResolvedValue([eventEntity]);

      const events = await eventStore.getAllEvents(undefined, undefined, 10);

      expect(events).toBeDefined();
      expect(mockEm.find).toHaveBeenCalledWith(
        EventEntity,
        expect.any(Object),
        expect.objectContaining({
          limit: 10,
        }),
      );
    });
  });

  describe("getCurrentVersion", () => {
    it("应该能够获取聚合根的当前版本", async () => {
      const aggregateId = EntityId.generate();
      const eventEntity = new EventEntity();
      eventEntity.aggregateId = aggregateId.value;
      eventEntity.eventVersion = 5;

      // getCurrentVersion 使用 findOne 查找最新版本的事件
      (mockEm.findOne as jest.Mock).mockResolvedValue(eventEntity);

      const version = await eventStore.getCurrentVersion(aggregateId);

      expect(version).toBe(5);
      expect(mockEm.findOne).toHaveBeenCalledWith(
        EventEntity,
        expect.objectContaining({
          aggregateId: aggregateId.value,
          deletedAt: null,
        }),
        expect.objectContaining({
          orderBy: { eventVersion: "desc" },
        }),
      );
    });

    it("应该在没有事件时返回 0", async () => {
      const aggregateId = EntityId.generate();

      (mockEm.findOne as jest.Mock).mockResolvedValue(null);

      const version = await eventStore.getCurrentVersion(aggregateId);

      expect(version).toBe(0);
    });
  });

  describe("exists", () => {
    it("应该能够检查聚合根是否存在", async () => {
      const aggregateId = EntityId.generate();

      // exists 方法使用 count 而不是 findOne
      (mockEm.count as jest.Mock).mockResolvedValue(1);

      const exists = await eventStore.exists(aggregateId);

      expect(exists).toBe(true);
      expect(mockEm.count).toHaveBeenCalledWith(
        EventEntity,
        expect.objectContaining({
          aggregateId: aggregateId.value,
          deletedAt: null,
        }),
      );
    });

    it("应该在聚合根不存在时返回 false", async () => {
      const aggregateId = EntityId.generate();

      (mockEm.count as jest.Mock).mockResolvedValue(0);

      const exists = await eventStore.exists(aggregateId);

      expect(exists).toBe(false);
    });
  });

  describe("saveSnapshot", () => {
    it("应该能够保存新快照", async () => {
      const aggregateId = EntityId.generate();
      const snapshot = new EventSnapshot(
        aggregateId,
        5,
        { test: "data" },
        "TestSnapshot",
        {},
        new Date(),
      );

      // Mock 不存在现有快照（创建新快照）
      (mockEm.findOne as jest.Mock).mockResolvedValue(null);
      (mockEm.flush as jest.Mock).mockResolvedValue(undefined);

      const result = await eventStore.saveSnapshot(snapshot);

      expect(result.success).toBe(true);
      expect(mockEm.persist).toHaveBeenCalled();
      expect(mockEm.flush).toHaveBeenCalled();
    });

    it("应该能够更新现有快照", async () => {
      const aggregateId = EntityId.generate();
      const snapshot = new EventSnapshot(
        aggregateId,
        5,
        { test: "data" },
        "TestSnapshot",
        {},
        new Date(),
      );

      // Mock 存在现有快照（更新）
      const existingSnapshot = new EventSnapshotEntity();
      existingSnapshot.aggregateId = aggregateId.value;
      existingSnapshot.snapshotVersion = 5;
      (mockEm.findOne as jest.Mock).mockResolvedValue(existingSnapshot);
      (mockEm.flush as jest.Mock).mockResolvedValue(undefined);

      const result = await eventStore.saveSnapshot(snapshot);

      expect(result.success).toBe(true);
      expect(mockEm.persist).toHaveBeenCalled();
      expect(mockEm.flush).toHaveBeenCalled();
    });

    it("应该在保存失败时返回失败结果", async () => {
      const aggregateId = EntityId.generate();
      const snapshot = new EventSnapshot(
        aggregateId,
        5,
        { test: "data" },
        "TestSnapshot",
        {},
        new Date(),
      );

      (mockEm.findOne as jest.Mock).mockResolvedValue(null);
      (mockEm.flush as jest.Mock).mockRejectedValue(new Error("保存失败"));

      const result = await eventStore.saveSnapshot(snapshot);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe("getSnapshot", () => {
    it("应该能够获取快照", async () => {
      const aggregateId = EntityId.generate();
      const snapshotEntity = new EventSnapshotEntity();
      snapshotEntity.aggregateId = aggregateId.value;
      snapshotEntity.snapshotVersion = 5;
      snapshotEntity.data = { test: "data" };
      snapshotEntity.snapshotType = "TestSnapshot";
      snapshotEntity.metadata = {};
      snapshotEntity.timestamp = new Date();

      (mockEm.findOne as jest.Mock).mockResolvedValue(snapshotEntity);

      const snapshot = await eventStore.getSnapshot(aggregateId);

      expect(snapshot).toBeDefined();
      expect(snapshot!.version).toBe(5);
      expect(snapshot!.aggregateId).toEqual(aggregateId);
    });

    it("应该在快照不存在时返回 null", async () => {
      const aggregateId = EntityId.generate();

      (mockEm.findOne as jest.Mock).mockResolvedValue(null);

      const snapshot = await eventStore.getSnapshot(aggregateId);

      expect(snapshot).toBeNull();
    });

    it("应该能够获取指定版本号的快照", async () => {
      const aggregateId = EntityId.generate();
      const snapshotEntity = new EventSnapshotEntity();
      snapshotEntity.aggregateId = aggregateId.value;
      snapshotEntity.snapshotVersion = 3;
      snapshotEntity.data = { test: "data" };
      snapshotEntity.snapshotType = "TestSnapshot";
      snapshotEntity.metadata = {};
      snapshotEntity.timestamp = new Date();

      (mockEm.findOne as jest.Mock).mockResolvedValue(snapshotEntity);

      const snapshot = await eventStore.getSnapshot(aggregateId, 3);

      expect(snapshot).toBeDefined();
      expect(snapshot!.version).toBe(3);
      expect(mockEm.findOne).toHaveBeenCalledWith(
        EventSnapshotEntity,
        expect.objectContaining({
          aggregateId: aggregateId.value,
          snapshotVersion: 3,
          deletedAt: null,
        }),
        expect.objectContaining({
          orderBy: undefined, // 当指定版本时，不需要 orderBy
        }),
      );
    });
  });

  describe("deleteSnapshot", () => {
    it("应该能够删除快照", async () => {
      const aggregateId = EntityId.generate();
      const snapshotEntity = new EventSnapshotEntity();
      snapshotEntity.aggregateId = aggregateId.value;
      snapshotEntity.snapshotVersion = 5;
      snapshotEntity.softDelete = jest.fn();

      (mockEm.find as jest.Mock).mockResolvedValue([snapshotEntity]);
      (mockEm.flush as jest.Mock).mockResolvedValue(undefined);

      const result = await eventStore.deleteSnapshot(aggregateId, 5);

      expect(result.success).toBe(true);
      expect(mockEm.persist).toHaveBeenCalled();
      expect(mockEm.flush).toHaveBeenCalled();
    });

    it("应该在快照不存在时返回成功（eventsCount 为 0）", async () => {
      const aggregateId = EntityId.generate();

      (mockEm.find as jest.Mock).mockResolvedValue([]);
      (mockEm.flush as jest.Mock).mockResolvedValue(undefined);

      const result = await eventStore.deleteSnapshot(aggregateId, 5);

      expect(result.success).toBe(true); // deleteSnapshot 即使没有找到也返回 success，eventsCount 为 0
      expect(result.eventsCount).toBe(0);
    });
  });

  describe("getStatistics", () => {
    it("应该能够获取事件存储统计信息", async () => {
      const aggregateId1 = EntityId.generate();
      const aggregateId2 = EntityId.generate();
      const eventEntity1 = new EventEntity();
      eventEntity1.aggregateId = aggregateId1.value;
      eventEntity1.eventType = "Event1";
      const eventEntity2 = new EventEntity();
      eventEntity2.aggregateId = aggregateId2.value;
      eventEntity2.eventType = "Event2";

      // Mock count：第一个调用返回事件总数，第二个调用返回快照数量
      const countMock = mockEm.count as jest.Mock;
      countMock
        .mockResolvedValueOnce(2) // 事件总数
        .mockResolvedValueOnce(0); // 快照数量
      // Mock find 返回所有事件（用于统计聚合根数量）
      (mockEm.find as jest.Mock)
        .mockResolvedValueOnce([eventEntity1, eventEntity2]) // 用于统计聚合根数量
        .mockResolvedValueOnce([eventEntity1, eventEntity2]); // 用于统计 byAggregate

      const stats = await eventStore.getStatistics();

      expect(stats).toBeDefined();
      expect(stats.totalEvents).toBe(2);
      expect(stats.aggregateCount).toBe(2);
    });

    it("应该能够获取指定聚合根的统计信息", async () => {
      const aggregateId = EntityId.generate();
      const eventEntity = new EventEntity();
      eventEntity.aggregateId = aggregateId.value;
      eventEntity.eventVersion = 1;
      eventEntity.eventType = "TestEvent";

      // Mock count：第一个调用返回事件总数，第二个调用返回快照数量
      const countMock = mockEm.count as jest.Mock;
      countMock
        .mockResolvedValueOnce(1) // 事件总数
        .mockResolvedValueOnce(0); // 快照数量
      // Mock find 返回该聚合根的事件（用于统计类型）
      (mockEm.find as jest.Mock).mockResolvedValue([eventEntity]);

      const stats = await eventStore.getStatistics(aggregateId);

      expect(stats).toBeDefined();
      expect(stats.totalEvents).toBe(1);
      expect(stats.aggregateCount).toBe(1);
    });
  });
});
