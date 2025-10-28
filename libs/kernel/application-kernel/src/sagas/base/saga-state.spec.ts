/**
 * @fileoverview Saga状态管理单元测试
 * @description 测试Saga状态的管理和持久化功能
 */

import { Logger } from "@hl8/logger";
import { EntityId } from "@hl8/domain-kernel";
import { SagaStateManager, SagaStateSnapshot } from "./saga-state.js";
import { InMemorySagaStateStore } from "../persistence/saga-state-store.impl.js";
import { SagaStatus, SagaStepStatus } from "./saga.base.js";

describe("SagaStateManager", () => {
  let logger: Logger;
  let stateStore: InMemorySagaStateStore;
  let stateManager: SagaStateManager;
  let sagaId: EntityId;
  let aggregateId: EntityId;

  beforeEach(() => {
    logger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    } as unknown as Logger;

    stateStore = new InMemorySagaStateStore(logger);
    stateManager = new SagaStateManager(logger, stateStore);
    sagaId = new EntityId();
    aggregateId = new EntityId();
  });

  describe("创建状态快照", () => {
    it("应该正确创建状态快照", () => {
      const context = {
        sagaId,
        aggregateId,
        currentStepIndex: 1,
        startTime: new Date(),
        lastUpdateTime: new Date(),
        data: { test: "value" },
        error: undefined,
        compensationReason: undefined,
      };

      const stepStates = [
        {
          stepIndex: 0,
          stepName: "step1",
          status: SagaStepStatus.COMPLETED,
          executedAt: new Date(),
        },
        {
          stepIndex: 1,
          stepName: "step2",
          status: SagaStepStatus.RUNNING,
          executedAt: new Date(),
        },
      ];

      const snapshot = stateManager.createSnapshot(
        sagaId,
        aggregateId,
        SagaStatus.RUNNING,
        context,
        stepStates,
      );

      expect(snapshot.sagaId).toBe(sagaId.toString());
      expect(snapshot.aggregateId).toBe(aggregateId.toString());
      expect(snapshot.status).toBe(SagaStatus.RUNNING);
      expect(snapshot.currentStepIndex).toBe(1);
      expect(snapshot.contextData).toEqual({ test: "value" });
      expect(snapshot.stepStates).toHaveLength(2);
      expect(snapshot.version).toBe(1);
    });

    it("应该设置正确的时间戳", () => {
      const context = {
        sagaId,
        aggregateId,
        currentStepIndex: 0,
        startTime: new Date(),
        lastUpdateTime: new Date(),
        data: {},
        error: undefined,
        compensationReason: undefined,
      };

      const snapshot = stateManager.createSnapshot(
        sagaId,
        aggregateId,
        SagaStatus.COMPLETED,
        context,
        [],
      );

      expect(snapshot.createdAt).toBeInstanceOf(Date);
      expect(snapshot.updatedAt).toBeInstanceOf(Date);
      expect(snapshot.startTime).toBe(context.startTime);
      expect(snapshot.completedAt).toBeInstanceOf(Date);
    });
  });

  describe("保存状态", () => {
    it("应该成功保存状态", async () => {
      const context = {
        sagaId,
        aggregateId,
        currentStepIndex: 0,
        startTime: new Date(),
        lastUpdateTime: new Date(),
        data: {},
        error: undefined,
        compensationReason: undefined,
      };

      const snapshot = stateManager.createSnapshot(
        sagaId,
        aggregateId,
        SagaStatus.RUNNING,
        context,
        [],
      );

      await stateManager.save(snapshot);

      const saved = await stateManager.getById(sagaId.toString());
      expect(saved).toBeDefined();
      expect(saved?.sagaId).toBe(sagaId.toString());
    });

    it("应该处理保存错误", async () => {
      const mockStateStore = {
        save: jest.fn().mockRejectedValue(new Error("保存失败")),
        getById: jest.fn(),
        getByAggregateId: jest.fn(),
        query: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        cleanup: jest.fn(),
      };

      const errorStateManager = new SagaStateManager(
        logger,
        mockStateStore as any,
      );
      const context = {
        sagaId,
        aggregateId,
        currentStepIndex: 0,
        startTime: new Date(),
        lastUpdateTime: new Date(),
        data: {},
        error: undefined,
        compensationReason: undefined,
      };

      const snapshot = stateManager.createSnapshot(
        sagaId,
        aggregateId,
        SagaStatus.RUNNING,
        context,
        [],
      );

      await expect(errorStateManager.save(snapshot)).rejects.toThrow(
        "保存失败",
      );
    });
  });

  describe("查询状态", () => {
    beforeEach(async () => {
      const context = {
        sagaId,
        aggregateId,
        currentStepIndex: 0,
        startTime: new Date(),
        lastUpdateTime: new Date(),
        data: {},
        error: undefined,
        compensationReason: undefined,
      };

      const snapshot = stateManager.createSnapshot(
        sagaId,
        aggregateId,
        SagaStatus.COMPLETED,
        context,
        [],
      );

      await stateManager.save(snapshot);
    });

    it("应该根据ID获取状态", async () => {
      const snapshot = await stateManager.getById(sagaId.toString());

      expect(snapshot).toBeDefined();
      expect(snapshot?.sagaId).toBe(sagaId.toString());
    });

    it("应该根据聚合根ID获取状态", async () => {
      const snapshots = await stateManager.getByAggregateId(
        aggregateId.toString(),
      );

      expect(snapshots).toHaveLength(1);
      expect(snapshots[0].aggregateId).toBe(aggregateId.toString());
    });

    it("应该查询状态", async () => {
      const result = await stateManager.query({
        status: SagaStatus.COMPLETED,
      });

      expect(result.snapshots).toHaveLength(1);
      expect(result.snapshots[0].status).toBe(SagaStatus.COMPLETED);
    });

    it("应该支持分页查询", async () => {
      const result = await stateManager.query({
        pagination: { page: 1, pageSize: 10 },
      });

      expect(result.pagination).toBeDefined();
      expect(result.pagination?.page).toBe(1);
      expect(result.pagination?.pageSize).toBe(10);
    });
  });

  describe("更新状态", () => {
    beforeEach(async () => {
      const context = {
        sagaId,
        aggregateId,
        currentStepIndex: 0,
        startTime: new Date(),
        lastUpdateTime: new Date(),
        data: {},
        error: undefined,
        compensationReason: undefined,
      };

      const snapshot = stateManager.createSnapshot(
        sagaId,
        aggregateId,
        SagaStatus.RUNNING,
        context,
        [],
      );

      await stateManager.save(snapshot);
    });

    it("应该更新状态", async () => {
      await stateManager.update(sagaId.toString(), {
        status: SagaStatus.COMPLETED,
        completedAt: new Date(),
      });

      const updated = await stateManager.getById(sagaId.toString());
      expect(updated?.status).toBe(SagaStatus.COMPLETED);
      expect(updated?.completedAt).toBeDefined();
    });

    it("应该增加版本号", async () => {
      const original = await stateManager.getById(sagaId.toString());
      const originalVersion = original?.version || 0;

      await stateManager.update(sagaId.toString(), {
        status: SagaStatus.COMPLETED,
      });

      const updated = await stateManager.getById(sagaId.toString());
      expect(updated?.version).toBe(originalVersion + 1);
    });
  });

  describe("删除状态", () => {
    beforeEach(async () => {
      const context = {
        sagaId,
        aggregateId,
        currentStepIndex: 0,
        startTime: new Date(),
        lastUpdateTime: new Date(),
        data: {},
        error: undefined,
        compensationReason: undefined,
      };

      const snapshot = stateManager.createSnapshot(
        sagaId,
        aggregateId,
        SagaStatus.COMPLETED,
        context,
        [],
      );

      await stateManager.save(snapshot);
    });

    it("应该删除状态", async () => {
      await stateManager.delete(sagaId.toString());

      const deleted = await stateManager.getById(sagaId.toString());
      expect(deleted).toBeUndefined();
    });
  });

  describe("清理过期状态", () => {
    it("应该清理过期状态", async () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 10);

      const context = {
        sagaId,
        aggregateId,
        currentStepIndex: 0,
        startTime: oldDate,
        lastUpdateTime: oldDate,
        data: {},
        error: undefined,
        compensationReason: undefined,
      };

      const snapshot = stateManager.createSnapshot(
        sagaId,
        aggregateId,
        SagaStatus.COMPLETED,
        context,
        [],
      );

      // 手动设置创建时间为旧日期
      snapshot.createdAt = oldDate;

      await stateManager.save(snapshot);

      const beforeDate = new Date();
      beforeDate.setDate(beforeDate.getDate() - 1);

      const cleanedCount = await stateManager.cleanup(beforeDate);

      expect(cleanedCount).toBe(1);
    });
  });

  describe("恢复状态", () => {
    it("应该从快照恢复上下文", () => {
      const snapshot: SagaStateSnapshot = {
        sagaId: sagaId.toString(),
        aggregateId: aggregateId.toString(),
        status: SagaStatus.COMPLETED,
        currentStepIndex: 2,
        createdAt: new Date(),
        updatedAt: new Date(),
        startTime: new Date(),
        contextData: { test: "value" },
        error: "测试错误",
        compensationReason: "测试补偿",
        stepStates: [],
        version: 1,
      };

      const context = stateManager.restoreFromSnapshot(snapshot);

      expect(context.sagaId.toString()).toBe(sagaId.toString());
      expect(context.aggregateId.toString()).toBe(aggregateId.toString());
      expect(context.currentStepIndex).toBe(2);
      expect(context.data).toEqual({ test: "value" });
      expect(context.error).toBe("测试错误");
      expect(context.compensationReason).toBe("测试补偿");
    });
  });

  describe("统计信息", () => {
    beforeEach(async () => {
      // 创建多个不同状态的快照
      const contexts = [
        { sagaId: new EntityId(), aggregateId, status: SagaStatus.COMPLETED },
        { sagaId: new EntityId(), aggregateId, status: SagaStatus.FAILED },
        { sagaId: new EntityId(), aggregateId, status: SagaStatus.RUNNING },
      ];

      for (const ctx of contexts) {
        const context = {
          sagaId: ctx.sagaId,
          aggregateId: ctx.aggregateId,
          currentStepIndex: 0,
          startTime: new Date(),
          lastUpdateTime: new Date(),
          data: {},
          error: undefined,
          compensationReason: undefined,
        };

        const snapshot = stateManager.createSnapshot(
          ctx.sagaId,
          ctx.aggregateId,
          ctx.status,
          context,
          [],
        );

        await stateManager.save(snapshot);
      }
    });

    it("应该获取统计信息", async () => {
      const stats = await stateManager.getStatistics();

      expect(stats.total).toBe(3);
      expect(stats.byStatus[SagaStatus.COMPLETED]).toBe(1);
      expect(stats.byStatus[SagaStatus.FAILED]).toBe(1);
      expect(stats.byStatus[SagaStatus.RUNNING]).toBe(1);
    });

    it("应该按聚合根ID获取统计信息", async () => {
      const stats = await stateManager.getStatistics(aggregateId.toString());

      expect(stats.total).toBe(3);
      expect(stats.byStatus[SagaStatus.COMPLETED]).toBe(1);
    });
  });
});

describe("InMemorySagaStateStore", () => {
  let logger: Logger;
  let store: InMemorySagaStateStore;

  beforeEach(() => {
    logger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    } as unknown as Logger;

    store = new InMemorySagaStateStore(logger);
  });

  describe("基本操作", () => {
    it("应该保存和获取快照", async () => {
      const snapshot: SagaStateSnapshot = {
        sagaId: "test-saga-1",
        aggregateId: "test-aggregate-1",
        status: SagaStatus.COMPLETED,
        currentStepIndex: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        startTime: new Date(),
        contextData: {},
        stepStates: [],
        version: 1,
      };

      await store.save(snapshot);

      const retrieved = await store.getById("test-saga-1");
      expect(retrieved).toBeDefined();
      expect(retrieved?.sagaId).toBe("test-saga-1");
    });

    it("应该根据聚合根ID获取快照", async () => {
      const snapshot: SagaStateSnapshot = {
        sagaId: "test-saga-1",
        aggregateId: "test-aggregate-1",
        status: SagaStatus.COMPLETED,
        currentStepIndex: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        startTime: new Date(),
        contextData: {},
        stepStates: [],
        version: 1,
      };

      await store.save(snapshot);

      const snapshots = await store.getByAggregateId("test-aggregate-1");
      expect(snapshots).toHaveLength(1);
      expect(snapshots[0].aggregateId).toBe("test-aggregate-1");
    });

    it("应该更新快照", async () => {
      const snapshot: SagaStateSnapshot = {
        sagaId: "test-saga-1",
        aggregateId: "test-aggregate-1",
        status: SagaStatus.RUNNING,
        currentStepIndex: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        startTime: new Date(),
        contextData: {},
        stepStates: [],
        version: 1,
      };

      await store.save(snapshot);
      await store.update("test-saga-1", { status: SagaStatus.COMPLETED });

      const updated = await store.getById("test-saga-1");
      expect(updated?.status).toBe(SagaStatus.COMPLETED);
    });

    it("应该删除快照", async () => {
      const snapshot: SagaStateSnapshot = {
        sagaId: "test-saga-1",
        aggregateId: "test-aggregate-1",
        status: SagaStatus.COMPLETED,
        currentStepIndex: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        startTime: new Date(),
        contextData: {},
        stepStates: [],
        version: 1,
      };

      await store.save(snapshot);
      await store.delete("test-saga-1");

      const deleted = await store.getById("test-saga-1");
      expect(deleted).toBeUndefined();
    });
  });

  describe("查询功能", () => {
    beforeEach(async () => {
      const snapshots: SagaStateSnapshot[] = [
        {
          sagaId: "saga-1",
          aggregateId: "agg-1",
          status: SagaStatus.COMPLETED,
          currentStepIndex: 0,
          createdAt: new Date("2023-01-01"),
          updatedAt: new Date("2023-01-01"),
          startTime: new Date("2023-01-01"),
          contextData: {},
          stepStates: [],
          version: 1,
        },
        {
          sagaId: "saga-2",
          aggregateId: "agg-1",
          status: SagaStatus.FAILED,
          currentStepIndex: 1,
          createdAt: new Date("2023-01-02"),
          updatedAt: new Date("2023-01-02"),
          startTime: new Date("2023-01-02"),
          contextData: {},
          stepStates: [],
          version: 1,
        },
        {
          sagaId: "saga-3",
          aggregateId: "agg-2",
          status: SagaStatus.RUNNING,
          currentStepIndex: 0,
          createdAt: new Date("2023-01-03"),
          updatedAt: new Date("2023-01-03"),
          startTime: new Date("2023-01-03"),
          contextData: {},
          stepStates: [],
          version: 1,
        },
      ];

      for (const snapshot of snapshots) {
        await store.save(snapshot);
      }
    });

    it("应该按状态过滤", async () => {
      const result = await store.query({ status: SagaStatus.COMPLETED });
      expect(result.snapshots).toHaveLength(1);
      expect(result.snapshots[0].sagaId).toBe("saga-1");
    });

    it("应该按聚合根ID过滤", async () => {
      const result = await store.query({ aggregateId: "agg-1" });
      expect(result.snapshots).toHaveLength(2);
    });

    it("应该按时间范围过滤", async () => {
      const result = await store.query({
        createdAtRange: {
          start: new Date("2023-01-01"),
          end: new Date("2023-01-02"),
        },
      });
      expect(result.snapshots).toHaveLength(2);
    });

    it("应该支持排序", async () => {
      const result = await store.query({
        sort: { field: "createdAt", direction: "desc" },
      });
      expect(result.snapshots[0].sagaId).toBe("saga-3");
    });

    it("应该支持分页", async () => {
      const result = await store.query({
        pagination: { page: 1, pageSize: 2 },
      });
      expect(result.snapshots).toHaveLength(2);
      expect(result.pagination?.total).toBe(3);
      expect(result.pagination?.totalPages).toBe(2);
    });
  });

  describe("清理功能", () => {
    it("应该清理过期快照", async () => {
      const oldSnapshot: SagaStateSnapshot = {
        sagaId: "old-saga",
        aggregateId: "old-agg",
        status: SagaStatus.COMPLETED,
        currentStepIndex: 0,
        createdAt: new Date("2020-01-01"),
        updatedAt: new Date("2020-01-01"),
        startTime: new Date("2020-01-01"),
        contextData: {},
        stepStates: [],
        version: 1,
      };

      await store.save(oldSnapshot);

      const beforeDate = new Date("2022-01-01");
      const cleanedCount = await store.cleanup(beforeDate);

      expect(cleanedCount).toBe(1);
    });
  });

  describe("统计功能", () => {
    it("应该返回存储统计信息", async () => {
      const snapshots: SagaStateSnapshot[] = [
        {
          sagaId: "saga-1",
          aggregateId: "agg-1",
          status: SagaStatus.COMPLETED,
          currentStepIndex: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
          startTime: new Date(),
          contextData: {},
          stepStates: [],
          version: 1,
        },
        {
          sagaId: "saga-2",
          aggregateId: "agg-1",
          status: SagaStatus.FAILED,
          currentStepIndex: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
          startTime: new Date(),
          contextData: {},
          stepStates: [],
          version: 1,
        },
      ];

      for (const snapshot of snapshots) {
        await store.save(snapshot);
      }

      const stats = store.getStorageStatistics();
      expect(stats.totalSnapshots).toBe(2);
      expect(stats.byStatus[SagaStatus.COMPLETED]).toBe(1);
      expect(stats.byStatus[SagaStatus.FAILED]).toBe(1);
      expect(stats.byAggregateId["agg-1"]).toBe(2);
    });
  });
});
