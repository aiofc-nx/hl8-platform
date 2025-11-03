/**
 * @fileoverview 事件存储性能测试
 * @description 验证事件存储支持 100,000+ 事件/聚合的性能
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "@jest/globals";
import { MikroORM, EntityManager } from "@mikro-orm/core";
import { PostgreSqlDriver } from "@mikro-orm/postgresql";
import { MikroORMEventStore } from "../../src/events/event-store.impl.js";
import { EventEntity } from "../../src/events/event-entity.js";
import { EventSnapshotEntity } from "../../src/events/event-snapshot-entity.js";
import {
  DomainEvent as ApplicationDomainEvent,
  EventSnapshot,
} from "@hl8/application-kernel";
import { EntityId } from "@hl8/domain-kernel";

describe("事件存储性能测试", () => {
  let orm: MikroORM | null = null;
  let em: EntityManager | null = null;
  let eventStore: MikroORMEventStore | null = null;

  beforeAll(async () => {
    try {
      const { PostgreSqlContainer } = await import(
        "@testcontainers/postgresql"
      );
      const postgresContainer = await new PostgreSqlContainer("postgres:16")
        .withDatabase("event_perf_test_db")
        .withUsername("test_user")
        .withPassword("test_pass")
        .start();

      const connectionUrl = postgresContainer.getConnectionUri();

      orm = await MikroORM.init({
        driver: PostgreSqlDriver,
        dbName: "event_perf_test_db",
        entities: [EventEntity, EventSnapshotEntity],
        debug: false,
        discovery: {
          disableDynamicFileAccess: true,
          requireEntitiesArray: true,
        },
        driverOptions: {
          connection: {
            connectionString: connectionUrl,
          },
        },
      });

      em = orm.em.fork();

      // 创建 schema
      await orm.schema.createSchema();

      eventStore = new MikroORMEventStore(em);
    } catch (error) {
      console.warn("TestContainers 不可用，跳过性能测试");
      console.warn(error);
      orm = null;
      em = null;
    }
  });

  afterAll(async () => {
    if (orm && typeof orm.close === "function") {
      await orm.close();
    }
  });

  beforeEach(async () => {
    if (em) {
      // 清理测试数据
      await em.nativeDelete(EventEntity, {});
      await em.nativeDelete(EventSnapshotEntity, {});
    }
  });

  describe("大量事件保存性能", () => {
    it("应该能够在合理时间内保存 100,000 个事件", async () => {
      if (!orm || !em || !eventStore) {
        console.log("跳过测试：PostgreSQL 不可用");
        return;
      }

      const aggregateId = EntityId.generate();
      const totalEvents = 100000;
      const batchSize = 1000; // 每次保存 1000 个事件

      console.log(`开始保存 ${totalEvents} 个事件...`);

      let currentVersion = 0;
      const startTime = Date.now();

      // 分批保存事件（模拟实际场景）
      for (let i = 0; i < totalEvents; i += batchSize) {
        const events: ApplicationDomainEvent[] = [];
        for (let j = 0; j < batchSize && i + j < totalEvents; j++) {
          events.push(
            new ApplicationDomainEvent(
              aggregateId,
              "TestEvent",
              {
                index: i + j,
                data: `Event data for index ${i + j}`,
              },
              {},
              EntityId.generate(),
              new Date(),
              currentVersion + j + 1,
            ),
          );
        }

        const result = await eventStore.saveEvents(
          aggregateId,
          events,
          currentVersion,
        );

        expect(result.success).toBe(true);
        currentVersion = result.newVersion;

        // 每 10,000 个事件输出一次进度
        if ((i + batchSize) % 10000 === 0) {
          console.log(
            `已保存 ${Math.min(i + batchSize, totalEvents)} / ${totalEvents} 个事件`,
          );
        }
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      console.log(
        `保存 ${totalEvents} 个事件总耗时: ${duration}ms (${(duration / 1000).toFixed(2)}秒)`,
      );
      console.log(
        `平均每个事件耗时: ${(duration / totalEvents).toFixed(3)}ms`,
      );

      // 验证所有事件都已保存
      const allEvents = await eventStore.getEvents(aggregateId);
      expect(allEvents.length).toBe(totalEvents);

      // 验证当前版本
      const currentVersionResult = await eventStore.getCurrentVersion(
        aggregateId,
      );
      expect(currentVersionResult).toBe(totalEvents);

      // 性能要求：100,000 个事件应该在 5 分钟内完成（考虑批量操作）
      expect(duration).toBeLessThan(300000); // 5 分钟
    }, 600000); // 10 分钟超时

    it("应该在合理时间内查询 100,000 个事件", async () => {
      if (!orm || !em || !eventStore) {
        console.log("跳过测试：PostgreSQL 不可用");
        return;
      }

      const aggregateId = EntityId.generate();
      const totalEvents = 100000;

      // 先保存事件（使用批量保存）
      console.log(`准备测试数据：保存 ${totalEvents} 个事件...`);
      const batchSize = 5000;
      let currentVersion = 0;

      for (let i = 0; i < totalEvents; i += batchSize) {
        const events: ApplicationDomainEvent[] = [];
        for (let j = 0; j < batchSize && i + j < totalEvents; j++) {
          events.push(
            new ApplicationDomainEvent(
              aggregateId,
              "TestEvent",
              { index: i + j },
              {},
              EntityId.generate(),
              new Date(),
              currentVersion + j + 1,
            ),
          );
        }
        await eventStore.saveEvents(aggregateId, events, currentVersion);
        currentVersion += events.length;
      }

      console.log("开始查询所有事件...");
      const startTime = Date.now();
      const events = await eventStore.getEvents(aggregateId);
      const endTime = Date.now();
      const duration = endTime - startTime;

      console.log(
        `查询 ${totalEvents} 个事件耗时: ${duration}ms (${(duration / 1000).toFixed(2)}秒)`,
      );

      expect(events.length).toBe(totalEvents);
      // 查询 100,000 个事件应该在 10 秒内完成
      expect(duration).toBeLessThan(10000);
    }, 120000); // 2 分钟超时

    it("应该在合理时间内查询事件范围", async () => {
      if (!orm || !em || !eventStore) {
        console.log("跳过测试：PostgreSQL 不可用");
        return;
      }

      const aggregateId = EntityId.generate();
      const totalEvents = 100000;

      // 准备数据
      console.log(`准备测试数据：保存 ${totalEvents} 个事件...`);
      const batchSize = 5000;
      let currentVersion = 0;

      for (let i = 0; i < totalEvents; i += batchSize) {
        const events: ApplicationDomainEvent[] = [];
        for (let j = 0; j < batchSize && i + j < totalEvents; j++) {
          events.push(
            new ApplicationDomainEvent(
              aggregateId,
              "TestEvent",
              { index: i + j },
              {},
              EntityId.generate(),
              new Date(),
              currentVersion + j + 1,
            ),
          );
        }
        await eventStore.saveEvents(aggregateId, events, currentVersion);
        currentVersion += events.length;
      }

      // 查询特定范围的事件（例如：版本 50000 到 60000）
      console.log("查询事件范围 (50000-60000)...");
      const startTime = Date.now();
      const events = await eventStore.getEvents(aggregateId, 50000, 60000);
      const endTime = Date.now();
      const duration = endTime - startTime;

      console.log(
        `查询事件范围耗时: ${duration}ms, 返回记录数: ${events.length}`,
      );

      expect(events.length).toBe(10001); // 50000 到 60000 包含两端，共 10001 个事件
      // 范围查询应该在 1 秒内完成（有索引的情况下）
      expect(duration).toBeLessThan(1000);
    }, 120000);
  });

  describe("快照性能", () => {
    it("应该能够在合理时间内保存和获取快照", async () => {
      if (!orm || !em || !eventStore) {
        console.log("跳过测试：PostgreSQL 不可用");
        return;
      }

      const aggregateId = EntityId.generate();

      // 先保存一些事件
      const events: ApplicationDomainEvent[] = [];
      for (let i = 0; i < 1000; i++) {
        events.push(
          new ApplicationDomainEvent(
            aggregateId,
            "TestEvent",
            { index: i },
            {},
            EntityId.generate(),
            new Date(),
            i + 1,
          ),
        );
      }
      await eventStore.saveEvents(aggregateId, events, 0);

      // 保存快照
      const snapshot = new EventSnapshot(
        aggregateId,
        500,
        { snapshot: "test snapshot data" },
        "TestSnapshot",
        {},
        new Date(),
      );

      const saveStartTime = Date.now();
      const saveResult = await eventStore.saveSnapshot(snapshot);
      const saveEndTime = Date.now();
      const saveDuration = saveEndTime - saveStartTime;

      console.log(`保存快照耗时: ${saveDuration}ms`);

      expect(saveResult.success).toBe(true);
      expect(saveDuration).toBeLessThan(1000); // 保存快照应该在 1 秒内

      // 获取快照
      const getStartTime = Date.now();
      const retrievedSnapshot = await eventStore.getSnapshot(aggregateId, 500);
      const getEndTime = Date.now();
      const getDuration = getEndTime - getStartTime;

      console.log(`获取快照耗时: ${getDuration}ms`);

      expect(retrievedSnapshot).toBeDefined();
      expect(retrievedSnapshot!.version).toBe(500);
      expect(getDuration).toBeLessThan(100); // 获取快照应该在 100ms 内
    });

    it("应该能够在有快照时优化事件重放", async () => {
      if (!orm || !em || !eventStore) {
        console.log("跳过测试：PostgreSQL 不可用");
        return;
      }

      const aggregateId = EntityId.generate();
      const totalEvents = 10000;

      // 保存 10,000 个事件
      console.log(`准备测试数据：保存 ${totalEvents} 个事件...`);
      const batchSize = 1000;
      let currentVersion = 0;

      for (let i = 0; i < totalEvents; i += batchSize) {
        const events: ApplicationDomainEvent[] = [];
        for (let j = 0; j < batchSize && i + j < totalEvents; j++) {
          events.push(
            new ApplicationDomainEvent(
              aggregateId,
              "TestEvent",
              { index: i + j },
              {},
              EntityId.generate(),
              new Date(),
              currentVersion + j + 1,
            ),
          );
        }
        await eventStore.saveEvents(aggregateId, events, currentVersion);
        currentVersion += events.length;
      }

      // 在版本 5000 处保存快照
      const snapshot = new EventSnapshot(
        aggregateId,
        5000,
        { snapshot: "optimization snapshot" },
        "TestSnapshot",
        {},
        new Date(),
      );
      await eventStore.saveSnapshot(snapshot);

      // 测试：从快照版本之后查询事件（应该只查询 5001-10000 的事件）
      console.log("测试快照优化：查询版本 5001-10000 的事件...");
      const startTime = Date.now();
      const events = await eventStore.getEvents(aggregateId, 5001);
      const endTime = Date.now();
      const duration = endTime - startTime;

      console.log(
        `使用快照优化后查询耗时: ${duration}ms, 返回记录数: ${events.length}`,
      );

      expect(events.length).toBe(5000); // 5001-10000 共 5000 个事件
      // 使用快照优化后，查询应该更快
      expect(duration).toBeLessThan(2000); // 应该在 2 秒内完成
    }, 60000);
  });

  describe("统计信息性能", () => {
    it("应该能够在合理时间内获取大量事件的统计信息", async () => {
      if (!orm || !em || !eventStore) {
        console.log("跳过测试：PostgreSQL 不可用");
        return;
      }

      const aggregateId = EntityId.generate();
      const totalEvents = 10000;

      // 准备数据
      console.log(`准备测试数据：保存 ${totalEvents} 个事件...`);
      const batchSize = 1000;
      let currentVersion = 0;

      for (let i = 0; i < totalEvents; i += batchSize) {
        const events: ApplicationDomainEvent[] = [];
        for (let j = 0; j < batchSize && i + j < totalEvents; j++) {
          events.push(
            new ApplicationDomainEvent(
              aggregateId,
              "TestEvent",
              { index: i + j },
              {},
              EntityId.generate(),
              new Date(),
              currentVersion + j + 1,
            ),
          );
        }
        await eventStore.saveEvents(aggregateId, events, currentVersion);
        currentVersion += events.length;
      }

      // 获取统计信息
      console.log("获取统计信息...");
      const startTime = Date.now();
      const stats = await eventStore.getStatistics(aggregateId);
      const endTime = Date.now();
      const duration = endTime - startTime;

      console.log(`获取统计信息耗时: ${duration}ms`);
      console.log(`统计结果:`, {
        totalEvents: stats.totalEvents,
        aggregateCount: stats.aggregateCount,
        snapshotCount: stats.snapshotCount,
      });

      expect(stats.totalEvents).toBe(totalEvents);
      expect(stats.aggregateCount).toBe(1);
      // 获取统计信息应该在 2 秒内完成
      expect(duration).toBeLessThan(2000);
    }, 60000);
  });

  describe("并发性能", () => {
    it("应该能够处理并发保存事件", async () => {
      if (!orm || !em || !eventStore) {
        console.log("跳过测试：PostgreSQL 不可用");
        return;
      }

      const aggregateId = EntityId.generate();
      const concurrentBatches = 10;
      const eventsPerBatch = 100;

      console.log(
        `并发保存 ${concurrentBatches} 批事件，每批 ${eventsPerBatch} 个事件...`,
      );

      const startTime = Date.now();
      let currentVersion = 0;

      // 创建并发任务（但需要顺序执行以避免版本冲突）
      // 在实际场景中，可以使用乐观锁来处理并发
      const promises: Promise<any>[] = [];

      for (let batch = 0; batch < concurrentBatches; batch++) {
        const events: ApplicationDomainEvent[] = [];
        for (let i = 0; i < eventsPerBatch; i++) {
          events.push(
            new ApplicationDomainEvent(
              aggregateId,
              "ConcurrentEvent",
              { batch, index: i },
              {},
              EntityId.generate(),
              new Date(),
              currentVersion + i + 1,
            ),
          );
        }

        const promise = eventStore!.saveEvents(
          aggregateId,
          events,
          currentVersion,
        ).then((result) => {
          if (result.success) {
            return result.newVersion;
          }
          throw new Error("保存失败");
        });

        promises.push(promise);
        currentVersion += eventsPerBatch;
      }

      // 顺序执行以避免版本冲突（实际场景中可以使用事务或乐观锁）
      let version = 0;
      for (const promise of promises) {
        version = await promise;
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      console.log(
        `并发保存 ${concurrentBatches * eventsPerBatch} 个事件耗时: ${duration}ms`,
      );

      // 验证所有事件都已保存
      const allEvents = await eventStore!.getEvents(aggregateId);
      expect(allEvents.length).toBe(concurrentBatches * eventsPerBatch);

      // 并发保存应该在合理时间内完成
      expect(duration).toBeLessThan(10000); // 10 秒内
    }, 30000);
  });
});

