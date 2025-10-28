/**
 * @fileoverview Saga执行引擎单元测试
 * @description 测试Saga执行引擎的功能
 */

import { Logger } from "@hl8/logger";
import { EntityId } from "@hl8/domain-kernel";
import {
  SagaExecutionEngine,
  SagaExecutionConfig,
  SagaExecutionResult,
} from "./saga-execution-engine.js";
import { Saga, SagaStatus, SagaStatistics } from "../base/saga.base.js";
import { SagaStateManager } from "../base/saga-state.js";
import { InMemorySagaStateStore } from "../persistence/saga-state-store.impl.js";

/**
 * 测试Saga实现
 * @description 用于测试的Saga实现
 */
class TestSaga extends Saga<{ value: string }> {
  public testSteps: Array<{
    name: string;
    executed: boolean;
    compensated: boolean;
  }> = [];
  public shouldFail: boolean = false;
  public executionDelay: number = 0;

  constructor(
    logger: Logger,
    aggregateId: EntityId,
    shouldFail: boolean = false,
  ) {
    super(
      logger,
      {
        name: "TestSaga",
        description: "测试Saga",
        version: "1.0.0",
        enabled: true,
        timeout: 30000,
      },
      aggregateId,
    );

    this.shouldFail = shouldFail;
  }

  protected initializeSteps(): void {
    this.testSteps = [
      { name: "step1", executed: false, compensated: false },
      { name: "step2", executed: false, compensated: false },
      { name: "step3", executed: false, compensated: false },
    ];
  }

  protected async executeSteps(): Promise<void> {
    if (this.executionDelay > 0) {
      await this.delay(this.executionDelay);
    } else {
      // 添加小延迟以确保执行时间大于0
      await this.delay(10);
    }

    for (let i = 0; i < this.testSteps.length; i++) {
      this.testSteps[i].executed = true;
      this.context.currentStepIndex = i;
      this.context.lastUpdateTime = new Date();

      if (this.shouldFail && i === 1) {
        throw new Error("步骤执行失败");
      }
    }
  }

  protected async executeCompensationSteps(): Promise<void> {
    for (let i = this.testSteps.length - 1; i >= 0; i--) {
      if (this.testSteps[i].executed) {
        this.testSteps[i].compensated = true;
      }
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

describe("SagaExecutionEngine", () => {
  let logger: Logger;
  let stateStore: InMemorySagaStateStore;
  let stateManager: SagaStateManager;
  let engine: SagaExecutionEngine;
  let config: SagaExecutionConfig;
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
    config = {
      maxConcurrentSagas: 2,
      executionTimeout: 5000,
      stateSaveInterval: 1000,
      autoRecovery: true,
      recoveryCheckInterval: 2000,
      performanceMonitoring: true,
      cleanup: {
        enabled: true,
        interval: 5000,
        retentionDays: 7,
      },
    };

    engine = new SagaExecutionEngine(logger, stateManager, config);
    aggregateId = new EntityId();
  });

  afterEach(() => {
    engine.destroy();
  });

  describe("构造函数", () => {
    it("应该正确初始化执行引擎", () => {
      expect(engine).toBeDefined();
    });

    it("应该使用默认配置", () => {
      const defaultEngine = new SagaExecutionEngine(logger, stateManager);

      expect(defaultEngine).toBeDefined();

      // 清理引擎实例
      defaultEngine.destroy();
    });
  });

  describe("执行Saga", () => {
    it("应该成功执行Saga", async () => {
      const saga = new TestSaga(logger, aggregateId);
      const data = { value: "test" };

      const result = await engine.execute(saga, data);

      expect(result.success).toBe(true);
      expect(result.sagaId).toBe(saga.getSagaId().toString());
      expect(result.executionTime).toBeGreaterThan(0);
      expect(result.data).toBeDefined();
      expect(result.events).toEqual([]);
    });

    it.skip("应该处理执行超时", async () => {
      const saga = new TestSaga(logger, aggregateId);
      saga.executionDelay = 5000; // 5秒延迟
      const data = { value: "test" };

      await expect(engine.execute(saga, data)).rejects.toThrow();
    });

    it.skip("应该处理执行错误", async () => {
      const saga = new TestSaga(logger, aggregateId, true);
      const data = { value: "test" };

      const result = await engine.execute(saga, data);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.sagaId).toBe(saga.getSagaId().toString());
    });

    it("应该检查并发限制", async () => {
      const sagas = Array.from(
        { length: 3 },
        () => new TestSaga(logger, aggregateId),
      );
      const data = { value: "test" };

      // 执行前两个Saga
      const promises = sagas
        .slice(0, 2)
        .map((saga) => engine.execute(saga, data));

      // 第三个Saga应该因为并发限制而失败
      await expect(engine.execute(sagas[2], data)).rejects.toThrow(
        "已达到最大并发Saga数量限制",
      );

      // 等待前两个完成
      await Promise.all(promises);
    });

    it.skip("应该防止重复执行同一个Saga", async () => {
      const saga = new TestSaga(logger, aggregateId);
      const data = { value: "test" };

      // 第一次执行
      await engine.execute(saga, data);

      // 第二次执行应该失败
      await expect(engine.execute(saga, data)).rejects.toThrow(
        "Saga 已在运行中",
      );
    });
  });

  describe("暂停和恢复Saga", () => {
    it.skip("应该暂停运行中的Saga", async () => {
      const saga = new TestSaga(logger, aggregateId);
      const data = { value: "test" };

      // 先执行Saga
      await engine.execute(saga, data);

      // 模拟运行状态
      saga["status"] = SagaStatus.RUNNING;

      await engine.pause(saga.getSagaId().toString());

      expect(saga.getStatus()).toBe(SagaStatus.PAUSED);
    });

    it.skip("应该恢复暂停的Saga", async () => {
      const saga = new TestSaga(logger, aggregateId);
      saga["status"] = SagaStatus.PAUSED;

      await engine.resume(saga.getSagaId().toString());

      expect(saga.getStatus()).toBe(SagaStatus.RUNNING);
    });

    it("应该拒绝暂停非运行中的Saga", async () => {
      const saga = new TestSaga(logger, aggregateId);

      await expect(engine.pause(saga.getSagaId().toString())).rejects.toThrow(
        "未找到运行中的Saga",
      );
    });

    it("应该拒绝恢复非暂停的Saga", async () => {
      const saga = new TestSaga(logger, aggregateId);

      await expect(engine.resume(saga.getSagaId().toString())).rejects.toThrow(
        "未找到运行中的Saga",
      );
    });
  });

  describe("取消Saga", () => {
    it.skip("应该取消运行中的Saga", async () => {
      const saga = new TestSaga(logger, aggregateId);
      saga["status"] = SagaStatus.RUNNING;

      await engine.cancel(saga.getSagaId().toString(), "测试取消");

      expect(saga.getStatus()).toBe(SagaStatus.CANCELLED);
    });

    it("应该拒绝取消非运行中的Saga", async () => {
      const saga = new TestSaga(logger, aggregateId);

      await expect(engine.cancel(saga.getSagaId().toString())).rejects.toThrow(
        "未找到运行中的Saga",
      );
    });
  });

  describe("补偿Saga", () => {
    it.skip("应该补偿运行中的Saga", async () => {
      const saga = new TestSaga(logger, aggregateId);
      saga["status"] = SagaStatus.RUNNING;

      await engine.compensate(saga.getSagaId().toString(), "测试补偿");

      expect(saga.getStatus()).toBe(SagaStatus.COMPENSATED);
    });

    it("应该拒绝补偿非运行中的Saga", async () => {
      const saga = new TestSaga(logger, aggregateId);

      await expect(
        engine.compensate(saga.getSagaId().toString()),
      ).rejects.toThrow("未找到运行中的Saga");
    });
  });

  describe("状态查询", () => {
    it.skip("应该获取运行中Saga的状态", async () => {
      const saga = new TestSaga(logger, aggregateId);
      saga["status"] = SagaStatus.RUNNING;

      const status = await engine.getSagaStatus(saga.getSagaId().toString());

      expect(status).toBe(SagaStatus.RUNNING);
    });

    it.skip("应该从状态存储获取Saga状态", async () => {
      const saga = new TestSaga(logger, aggregateId);
      const data = { value: "test" };

      await engine.execute(saga, data);

      const status = await engine.getSagaStatus(saga.getSagaId().toString());

      expect(status).toBe(SagaStatus.COMPLETED);
    });

    it("应该返回undefined对于不存在的Saga", async () => {
      const status = await engine.getSagaStatus("non-existent-saga");

      expect(status).toBeUndefined();
    });
  });

  describe("统计信息查询", () => {
    it.skip("应该获取运行中Saga的统计信息", async () => {
      const saga = new TestSaga(logger, aggregateId);
      saga["status"] = SagaStatus.RUNNING;

      const stats = await engine.getSagaStatistics(saga.getSagaId().toString());

      expect(stats).toBeDefined();
      expect(stats?.name).toBe("TestSaga");
    });

    it.skip("应该从状态存储获取Saga统计信息", async () => {
      const saga = new TestSaga(logger, aggregateId);
      const data = { value: "test" };

      await engine.execute(saga, data);

      const stats = await engine.getSagaStatistics(saga.getSagaId().toString());

      expect(stats).toBeDefined();
    });

    it("应该返回undefined对于不存在的Saga", async () => {
      const stats = await engine.getSagaStatistics("non-existent-saga");

      expect(stats).toBeUndefined();
    });
  });

  describe("执行引擎统计信息", () => {
    it("应该获取执行引擎统计信息", async () => {
      const stats = await engine.getExecutionStatistics();

      expect(stats).toBeDefined();
      expect(stats.totalExecutions).toBe(0);
      expect(stats.successCount).toBe(0);
      expect(stats.failureCount).toBe(0);
      expect(stats.runningSagas).toBe(0);
    });

    it("应该更新统计信息", async () => {
      const saga = new TestSaga(logger, aggregateId);
      const data = { value: "test" };

      await engine.execute(saga, data);

      const stats = await engine.getExecutionStatistics();

      expect(stats.totalExecutions).toBe(1);
      expect(stats.successCount).toBe(1);
      expect(stats.failureCount).toBe(0);
    });
  });

  describe("运行中的Saga管理", () => {
    it("应该获取所有运行中的Saga", async () => {
      const saga = new TestSaga(logger, aggregateId);
      saga["status"] = SagaStatus.RUNNING;

      const runningSagas = await engine.getRunningSagas();

      expect(runningSagas).toHaveLength(0); // 因为Saga没有真正运行
    });
  });

  describe("恢复Saga", () => {
    it.skip("应该恢复失败的Saga", async () => {
      const sagaId = "test-saga-id";

      // 模拟状态存储中有失败的Saga
      const snapshot = stateManager.createSnapshot(
        new EntityId(),
        aggregateId,
        SagaStatus.FAILED,
        {
          sagaId: new EntityId(),
          aggregateId,
          currentStepIndex: 0,
          startTime: new Date(),
          lastUpdateTime: new Date(),
          data: {},
          error: "测试错误",
          compensationReason: undefined,
        },
        [],
      );

      await stateManager.save(snapshot);

      await engine.recoverSaga(sagaId);

      // 验证恢复逻辑被调用
      expect(logger.debug).toHaveBeenCalledWith(`开始恢复Saga: ${sagaId}`);
    });

    it("应该处理不存在的Saga恢复", async () => {
      await expect(engine.recoverSaga("non-existent-saga")).rejects.toThrow(
        "未找到Saga状态快照",
      );
    });

    it.skip("应该处理非失败状态的Saga恢复", async () => {
      const sagaId = "test-saga-id";

      const snapshot = stateManager.createSnapshot(
        new EntityId(),
        aggregateId,
        SagaStatus.COMPLETED,
        {
          sagaId: new EntityId(),
          aggregateId,
          currentStepIndex: 0,
          startTime: new Date(),
          lastUpdateTime: new Date(),
          data: {},
          error: undefined,
          compensationReason: undefined,
        },
        [],
      );

      await stateManager.save(snapshot);

      await expect(engine.recoverSaga(sagaId)).rejects.toThrow(
        "Saga状态不是失败状态",
      );
    });
  });

  describe("清理功能", () => {
    it("应该清理过期的Saga", async () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 10);

      const snapshot = stateManager.createSnapshot(
        new EntityId(),
        aggregateId,
        SagaStatus.COMPLETED,
        {
          sagaId: new EntityId(),
          aggregateId,
          currentStepIndex: 0,
          startTime: oldDate,
          lastUpdateTime: oldDate,
          data: {},
          error: undefined,
          compensationReason: undefined,
        },
        [],
      );

      snapshot.createdAt = oldDate;
      await stateManager.save(snapshot);

      const beforeDate = new Date();
      beforeDate.setDate(beforeDate.getDate() - 1);

      const cleanedCount = await engine.cleanup(beforeDate);

      expect(cleanedCount).toBe(1);
    });
  });

  describe("定时器管理", () => {
    it("应该初始化定时器", () => {
      // 定时器在构造函数中初始化
      expect(engine).toBeDefined();
    });

    it("应该销毁定时器", () => {
      engine.destroy();

      // 验证销毁逻辑被调用
      expect(logger.debug).toHaveBeenCalledWith("Saga执行引擎已销毁");
    });
  });

  describe("错误处理", () => {
    it("应该处理状态保存错误", async () => {
      const mockStateManager = {
        save: jest.fn().mockRejectedValue(new Error("保存失败")),
        getById: jest.fn(),
        getByAggregateId: jest.fn(),
        query: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        cleanup: jest.fn(),
      };

      const errorEngine = new SagaExecutionEngine(
        logger,
        mockStateManager as any,
      );

      try {
        const saga = new TestSaga(logger, aggregateId);
        const data = { value: "test" };

        // 执行应该成功，但状态保存会失败
        const result = await errorEngine.execute(saga, data);

        expect(result.success).toBe(true);
      } finally {
        errorEngine.destroy();
      }
    });

    it("应该处理状态查询错误", async () => {
      const mockStateManager = {
        save: jest.fn(),
        getById: jest.fn().mockRejectedValue(new Error("查询失败")),
        getByAggregateId: jest.fn(),
        query: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        cleanup: jest.fn(),
      };

      const errorEngine = new SagaExecutionEngine(
        logger,
        mockStateManager as any,
      );

      try {
        await expect(errorEngine.getSagaStatus("test-saga")).rejects.toThrow(
          "查询失败",
        );
      } finally {
        errorEngine.destroy();
      }
    });
  });

  describe("性能监控", () => {
    it("应该监控执行时间", async () => {
      const saga = new TestSaga(logger, aggregateId);
      saga.executionDelay = 100; // 100ms延迟
      const data = { value: "test" };

      await engine.execute(saga, data);

      const stats = await engine.getExecutionStatistics();

      expect(stats.averageExecutionTime).toBeGreaterThan(0);
    });

    it("应该跟踪并发Saga数量", async () => {
      const saga1 = new TestSaga(logger, aggregateId);
      const saga2 = new TestSaga(logger, aggregateId);
      const data = { value: "test" };

      // 同时执行两个Saga
      const promises = [
        engine.execute(saga1, data),
        engine.execute(saga2, data),
      ];

      await Promise.all(promises);

      const stats = await engine.getExecutionStatistics();

      expect(stats.totalExecutions).toBe(2);
      expect(stats.successCount).toBe(2);
    });
  });
});
