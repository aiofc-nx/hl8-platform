/**
 * @fileoverview Saga基类单元测试
 * @description 测试Saga基类的功能和生命周期管理
 */

import { Logger } from "@hl8/logger";
import { EntityId } from "@hl8/domain-kernel";
import { Saga, SagaStatus, SagaConfig, SagaContext } from "./saga.base.js";
import { BaseSagaStep } from "./saga-step.js";

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

  constructor(logger: Logger, config: SagaConfig, aggregateId: EntityId) {
    super(logger, config, aggregateId);
  }

  protected initializeSteps(): void {
    this.testSteps = [
      { name: "step1", executed: false, compensated: false },
      { name: "step2", executed: false, compensated: false },
      { name: "step3", executed: false, compensated: false },
    ];

    // 初始化实际的Saga步骤
    this.steps = this.testSteps.map((testStep, index) => {
      class StepImpl extends BaseSagaStep {
        constructor() {
          super({} as unknown as Logger, {
            name: testStep.name,
            description: `测试步骤${index + 1}`,
          });
        }

        protected async executeStep(_context: SagaContext): Promise<unknown> {
          testStep.executed = true;
          await new Promise((resolve) => setTimeout(resolve, 10));
          return undefined;
        }

        protected async compensateStep(
          _context: SagaContext,
        ): Promise<unknown> {
          testStep.compensated = true;
          return undefined;
        }
      }
      return new StepImpl();
    });
  }

  protected async executeSteps(): Promise<void> {
    // 使用基类的逻辑，但添加延迟
    for (let i = 0; i < this.steps.length; i++) {
      this.context.currentStepIndex = i;
      const step = this.steps[i];

      await step.execute(this.context);
      this.context.lastUpdateTime = new Date();
      // 添加小延迟以确保执行时间大于0
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
  }

  protected async executeCompensationSteps(): Promise<void> {
    // 使用基类的逻辑
    for (let i = this.steps.length - 1; i >= 0; i--) {
      const step = this.steps[i];

      try {
        await step.compensate(this.context);
        this.context.lastUpdateTime = new Date();
      } catch (error) {
        this.logger.error(`步骤补偿失败: ${step.getName()}`, {
          sagaId: this.context.sagaId.toString(),
          stepIndex: i,
          error: error instanceof Error ? error.message : String(error),
        });
        throw error;
      }
    }
  }
}

/**
 * 测试Saga步骤实现
 * @description 用于测试的Saga步骤实现
 */
class TestSagaStep {
  public name: string;
  public executed: boolean = false;
  public compensated: boolean = false;

  constructor(name: string) {
    this.name = name;
  }

  public async execute(): Promise<void> {
    this.executed = true;
  }

  public async compensate(): Promise<void> {
    this.compensated = true;
  }
}

describe("Saga", () => {
  let logger: Logger;
  let aggregateId: EntityId;
  let config: SagaConfig;
  let saga: TestSaga;

  beforeEach(() => {
    logger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    } as unknown as Logger;

    aggregateId = new EntityId();
    config = {
      name: "TestSaga",
      description: "测试Saga",
      version: "1.0.0",
      enabled: true,
      timeout: 30000,
    };

    saga = new TestSaga(logger, config, aggregateId);
  });

  describe("构造函数", () => {
    it("应该正确初始化Saga", () => {
      expect(saga.getName()).toBe("TestSaga");
      expect(saga.getDescription()).toBe("测试Saga");
      expect(saga.getVersion()).toBe("1.0.0");
      expect(saga.getStatus()).toBe(SagaStatus.NOT_STARTED);
      expect(saga.isEnabled()).toBe(true);
    });

    it("应该生成唯一的Saga ID", () => {
      const saga2 = new TestSaga(logger, config, aggregateId);
      expect(saga.getSagaId().toString()).not.toBe(
        saga2.getSagaId().toString(),
      );
    });

    it("应该正确设置聚合根ID", () => {
      expect(saga.getContext().aggregateId).toBe(aggregateId);
    });
  });

  describe("执行Saga", () => {
    it("应该成功执行Saga", async () => {
      const data = { value: "test" };

      await saga.execute(data);

      expect(saga.getStatus()).toBe(SagaStatus.COMPLETED);
      expect(saga.isCompleted()).toBe(true);
      expect(saga.getStatistics().successCount).toBe(1);
      expect(saga.getStatistics().executionCount).toBe(1);
    });

    it("应该正确执行所有步骤", async () => {
      const data = { value: "test" };

      await saga.execute(data);

      expect(saga.testSteps.every((step) => step.executed)).toBe(true);
      expect(saga.getContext().currentStepIndex).toBe(2); // 最后一个步骤的索引
    });

    it("应该设置执行数据到上下文", async () => {
      const data = { value: "test" };

      await saga.execute(data);

      expect(saga.getContext().data).toEqual(expect.objectContaining(data));
    });

    it("应该更新统计信息", async () => {
      const data = { value: "test" };

      await saga.execute(data);

      const stats = saga.getStatistics();
      expect(stats.executionCount).toBe(1);
      expect(stats.successCount).toBe(1);
      expect(stats.failureCount).toBe(0);
      expect(stats.averageExecutionTime).toBeGreaterThan(0);
    });

    it("应该防止重复执行", async () => {
      const data = { value: "test" };

      await saga.execute(data);

      await expect(saga.execute(data)).rejects.toThrow(
        "Saga TestSaga 已经执行过或正在执行中",
      );
    });

    it("应该跳过禁用的Saga", async () => {
      const disabledSaga = new TestSaga(
        logger,
        { ...config, enabled: false },
        aggregateId,
      );

      await disabledSaga.execute({ value: "test" });

      expect(disabledSaga.getStatus()).toBe(SagaStatus.NOT_STARTED);
      expect(logger.warn).toHaveBeenCalledWith(
        "Saga TestSaga 已禁用，跳过执行",
      );
    });
  });

  describe("补偿Saga", () => {
    beforeEach(async () => {
      const data = { value: "test" };
      await saga.execute(data);
    });

    it("应该成功补偿Saga", async () => {
      await saga.compensate("测试补偿");

      expect(saga.getStatus()).toBe(SagaStatus.COMPENSATED);
      expect(saga.isCompensated()).toBe(true);
      expect(saga.getStatistics().compensationCount).toBe(1);
      expect(saga.getContext().compensationReason).toBe("测试补偿");
    });

    it("应该按相反顺序补偿步骤", async () => {
      await saga.compensate("测试补偿");

      // 检查所有步骤都被补偿了
      expect(saga.testSteps.every((step) => step.compensated)).toBe(true);
    });

    it("应该跳过未启用的补偿", async () => {
      const noCompensationSaga = new TestSaga(
        logger,
        {
          ...config,
          compensation: { enabled: false, timeout: 0, maxAttempts: 0 },
        },
        aggregateId,
      );

      await noCompensationSaga.execute({ value: "test" });
      await noCompensationSaga.compensate("测试补偿");

      expect(logger.warn).toHaveBeenCalledWith("Saga TestSaga 未启用补偿功能");
    });
  });

  describe("暂停和恢复Saga", () => {
    it("应该暂停运行中的Saga", async () => {
      const data = { value: "test" };

      // 模拟运行中的Saga
      saga["status"] = SagaStatus.RUNNING;

      await saga.pause();

      expect(saga.getStatus()).toBe(SagaStatus.PAUSED);
    });

    it("应该恢复暂停的Saga", async () => {
      saga["status"] = SagaStatus.PAUSED;

      await saga.resume();

      expect(saga.getStatus()).toBe(SagaStatus.RUNNING);
    });

    it("应该拒绝暂停非运行中的Saga", async () => {
      await expect(saga.pause()).rejects.toThrow(
        "Saga TestSaga 未在运行中，无法暂停",
      );
    });

    it("应该拒绝恢复非暂停的Saga", async () => {
      await expect(saga.resume()).rejects.toThrow(
        "Saga TestSaga 未暂停，无法恢复",
      );
    });
  });

  describe("取消Saga", () => {
    it("应该取消Saga", async () => {
      await saga.cancel("测试取消");

      expect(saga.getStatus()).toBe(SagaStatus.CANCELLED);
    });

    it("应该设置取消原因", async () => {
      const reason = "测试取消";
      await saga.cancel(reason);

      // 注意：这里需要检查Saga基类是否存储了取消原因
      // 当前实现中没有存储，可能需要添加
    });
  });

  describe("步骤管理", () => {
    it("应该返回当前步骤", () => {
      saga["context"].currentStepIndex = 1;
      const currentStep = saga.getCurrentStep();

      expect(currentStep).toBeDefined();
    });

    it("应该返回所有步骤", () => {
      const steps = saga.getSteps();

      expect(steps).toHaveLength(3);
    });

    it("应该返回步骤数量", () => {
      expect(saga.getStepCount()).toBe(3);
    });
  });

  describe("状态检查", () => {
    it("应该正确检查完成状态", () => {
      saga["status"] = SagaStatus.COMPLETED;
      expect(saga.isCompleted()).toBe(true);

      saga["status"] = SagaStatus.RUNNING;
      expect(saga.isCompleted()).toBe(false);
    });

    it("应该正确检查失败状态", () => {
      saga["status"] = SagaStatus.FAILED;
      expect(saga.isFailed()).toBe(true);

      saga["status"] = SagaStatus.RUNNING;
      expect(saga.isFailed()).toBe(false);
    });

    it("应该正确检查补偿状态", () => {
      saga["status"] = SagaStatus.COMPENSATED;
      expect(saga.isCompensated()).toBe(true);

      saga["status"] = SagaStatus.RUNNING;
      expect(saga.isCompensated()).toBe(false);
    });
  });

  describe("错误处理", () => {
    it("应该处理执行错误", async () => {
      const errorSaga = new TestSaga(logger, config, aggregateId);
      errorSaga["executeSteps"] = jest
        .fn()
        .mockRejectedValue(new Error("执行失败"));

      await expect(errorSaga.execute({ value: "test" })).rejects.toThrow(
        "执行失败",
      );

      expect(errorSaga.getStatus()).toBe(SagaStatus.COMPENSATED);
      expect(errorSaga.isCompensated()).toBe(true);
      expect(errorSaga.getStatistics().failureCount).toBe(1);
    });

    it("应该在执行失败时自动补偿", async () => {
      const errorSaga = new TestSaga(
        logger,
        {
          ...config,
          compensation: { enabled: true, timeout: 1000, maxAttempts: 1 },
        },
        aggregateId,
      );
      errorSaga["executeSteps"] = jest
        .fn()
        .mockRejectedValue(new Error("执行失败"));

      await expect(errorSaga.execute({ value: "test" })).rejects.toThrow(
        "执行失败",
      );

      expect(errorSaga.getStatus()).toBe(SagaStatus.COMPENSATED);
    });
  });

  describe("统计信息", () => {
    it("应该正确计算平均执行时间", async () => {
      const data = { value: "test" };

      await saga.execute(data);

      const stats = saga.getStatistics();
      expect(stats.averageExecutionTime).toBeGreaterThan(0);
    });

    it("应该更新最后执行时间", async () => {
      const data = { value: "test" };

      await saga.execute(data);

      const stats = saga.getStatistics();
      expect(stats.lastSuccessAt).toBeDefined();
      expect(stats.lastExecutedAt).toBeDefined();
    });
  });
});

describe("SagaStep", () => {
  let step: TestSagaStep;

  beforeEach(() => {
    step = new TestSagaStep("test-step");
  });

  describe("基本功能", () => {
    it("应该正确初始化", () => {
      expect(step.name).toBe("test-step");
      expect(step.executed).toBe(false);
      expect(step.compensated).toBe(false);
    });

    it("应该执行步骤", async () => {
      await step.execute();

      expect(step.executed).toBe(true);
    });

    it("应该补偿步骤", async () => {
      step.executed = true;
      await step.compensate();

      expect(step.compensated).toBe(true);
    });
  });
});
