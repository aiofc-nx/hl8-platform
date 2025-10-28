/**
 * @fileoverview Saga步骤单元测试
 * @description 测试Saga步骤的具体实现和扩展功能
 */

import { Logger } from "@hl8/logger";
import {
  BaseSagaStep,
  SimpleSagaStep,
  StepConfig,
  StepExecutionResult,
} from "./saga-step.js";
import { SagaStepStatus } from "./saga.base.js";
import { SagaContext } from "./saga.base.js";

/**
 * 测试Saga步骤实现
 * @description 用于测试的Saga步骤实现
 */
class TestSagaStep extends BaseSagaStep {
  public executeCalled: boolean = false;
  public compensateCalled: boolean = false;
  public beforeExecuteCalled: boolean = false;
  public afterExecuteCalled: boolean = false;
  public onErrorCalled: boolean = false;
  public beforeCompensateCalled: boolean = false;
  public afterCompensateCalled: boolean = false;
  public onCompensationErrorCalled: boolean = false;
  public checkConditionCalled: boolean = false;
  public shouldFail: boolean = false;
  public shouldCompensateFail: boolean = false;
  public executionDelay: number = 0;
  public compensationDelay: number = 0;

  constructor(logger: Logger, config: StepConfig) {
    super(logger, config);
  }

  protected async executeStep(context: SagaContext): Promise<unknown> {
    this.executeCalled = true;

    if (this.executionDelay > 0) {
      await this.testDelay(this.executionDelay);
    } else {
      // 添加小延迟以确保执行时间大于0
      await this.testDelay(10);
    }

    if (this.shouldFail) {
      throw new Error("步骤执行失败");
    }

    return { result: "success", context: context.sagaId.toString() };
  }

  protected async compensateStep(context: SagaContext): Promise<unknown> {
    this.compensateCalled = true;

    if (this.compensationDelay > 0) {
      await this.testDelay(this.compensationDelay);
    } else {
      // 添加小延迟以确保执行时间大于0
      await this.testDelay(10);
    }

    if (this.shouldCompensateFail) {
      throw new Error("步骤补偿失败");
    }

    return { result: "compensated", context: context.sagaId.toString() };
  }

  protected async checkCondition(context: SagaContext): Promise<boolean> {
    this.checkConditionCalled = true;
    return true;
  }

  protected async onBeforeExecute(context: SagaContext): Promise<void> {
    this.beforeExecuteCalled = true;
  }

  protected async onAfterExecute(
    context: SagaContext,
    result: StepExecutionResult,
  ): Promise<void> {
    this.afterExecuteCalled = true;
  }

  protected async onError(
    context: SagaContext,
    error: Error,
    result: StepExecutionResult,
  ): Promise<void> {
    this.onErrorCalled = true;
  }

  protected async onBeforeCompensate(context: SagaContext): Promise<void> {
    this.beforeCompensateCalled = true;
  }

  protected async onAfterCompensate(
    context: SagaContext,
    result: StepExecutionResult,
  ): Promise<void> {
    this.afterCompensateCalled = true;
  }

  protected async onCompensationError(
    context: SagaContext,
    error: Error,
    result: StepExecutionResult,
  ): Promise<void> {
    this.onCompensationErrorCalled = true;
  }

  private testDelay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

describe("BaseSagaStep", () => {
  let logger: Logger;
  let config: StepConfig;
  let step: TestSagaStep;
  let context: SagaContext;

  beforeEach(() => {
    logger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    } as unknown as Logger;

    config = {
      name: "test-step",
      description: "测试步骤",
      enabled: true,
      timeout: 5000,
      retry: {
        maxAttempts: 3,
        backoffMs: 1000,
        maxBackoffMs: 5000,
      },
      compensation: {
        enabled: true,
        timeout: 3000,
        maxAttempts: 2,
      },
    };

    step = new TestSagaStep(logger, config);

    context = {
      sagaId: { toString: () => "test-saga-id" } as any,
      aggregateId: { toString: () => "test-aggregate-id" } as any,
      currentStepIndex: 0,
      startTime: new Date(),
      lastUpdateTime: new Date(),
      data: { test: "value" },
    };
  });

  describe("构造函数", () => {
    it("应该正确初始化步骤", () => {
      expect(step.getName()).toBe("test-step");
      expect(step.getDescription()).toBe("测试步骤");
      expect(step.getStatus()).toBe(SagaStepStatus.PENDING);
      expect(step.isEnabled()).toBe(true);
    });

    it("应该使用默认配置", () => {
      const defaultStep = new TestSagaStep(logger, { name: "default-step" });

      expect(defaultStep.getName()).toBe("default-step");
      expect(defaultStep.isEnabled()).toBe(true);
      expect(defaultStep.getStatistics().executionCount).toBe(0);
    });
  });

  describe("执行步骤", () => {
    it("应该成功执行步骤", async () => {
      const result = await step.execute(context);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        result: "success",
        context: "test-saga-id",
      });
      expect(result.executionTime).toBeGreaterThan(0);
      expect(result.retryCount).toBe(0);
      expect(result.needsCompensation).toBe(true);

      expect(step.executeCalled).toBe(true);
      expect(step.beforeExecuteCalled).toBe(true);
      expect(step.afterExecuteCalled).toBe(true);
      expect(step.getStatus()).toBe(SagaStepStatus.COMPLETED);
    });

    it("应该跳过禁用的步骤", async () => {
      const disabledStep = new TestSagaStep(logger, {
        ...config,
        enabled: false,
      });

      const result = await disabledStep.execute(context);

      expect(result.success).toBe(true);
      expect(result.executionTime).toBe(0);
      expect(result.needsCompensation).toBe(false);
      expect(disabledStep.executeCalled).toBe(false);
    });

    it("应该处理执行超时", async () => {
      const timeoutStep = new TestSagaStep(logger, { ...config, timeout: 50 }); // 50ms超时
      timeoutStep.executionDelay = 100; // 100ms延迟，超过超时时间

      await expect(timeoutStep.execute(context)).rejects.toThrow(
        "步骤执行超时",
      );
    });

    it("应该重试失败的步骤", async () => {
      step.shouldFail = true;

      await expect(step.execute(context)).rejects.toThrow("步骤执行失败");

      expect(step.getStatus()).toBe(SagaStepStatus.FAILED);
      expect(step.getStatistics().failureCount).toBe(1);
      expect(step.onErrorCalled).toBe(true);
    });

    it("应该检查执行条件", async () => {
      const conditionStep = new TestSagaStep(logger, {
        ...config,
        condition: {
          enabled: true,
          expression: "test-condition",
        },
      });

      await conditionStep.execute(context);

      expect(conditionStep.checkConditionCalled).toBe(true);
    });
  });

  describe("补偿步骤", () => {
    beforeEach(async () => {
      // 先执行步骤使其完成
      await step.execute(context);
    });

    it("应该成功补偿步骤", async () => {
      const result = await step.compensate(context);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        result: "compensated",
        context: "test-saga-id",
      });
      expect(result.executionTime).toBeGreaterThan(0);
      expect(result.needsCompensation).toBe(false);

      expect(step.compensateCalled).toBe(true);
      expect(step.beforeCompensateCalled).toBe(true);
      expect(step.afterCompensateCalled).toBe(true);
      expect(step.getStatus()).toBe(SagaStepStatus.COMPENSATED);
    });

    it("应该跳过未完成的步骤", async () => {
      const pendingStep = new TestSagaStep(logger, config);

      const result = await pendingStep.compensate(context);

      expect(result.success).toBe(true);
      expect(result.executionTime).toBe(0);
      expect(pendingStep.compensateCalled).toBe(false);
    });

    it("应该跳过未启用补偿的步骤", async () => {
      const noCompensationStep = new TestSagaStep(logger, {
        ...config,
        compensation: { enabled: false, timeout: 0, maxAttempts: 0 },
      });

      await noCompensationStep.execute(context);
      const result = await noCompensationStep.compensate(context);

      expect(result.success).toBe(true);
      expect(result.executionTime).toBe(0);
      expect(noCompensationStep.compensateCalled).toBe(false);
    });

    it("应该处理补偿超时", async () => {
      const timeoutStep = new TestSagaStep(logger, {
        ...config,
        compensation: { enabled: true, timeout: 50, maxAttempts: 1 },
      });
      timeoutStep.compensationDelay = 100; // 100ms延迟，超过超时时间

      await timeoutStep.execute(context);
      await expect(timeoutStep.compensate(context)).rejects.toThrow(
        "步骤补偿超时",
      );
    });

    it("应该重试失败的补偿", async () => {
      step.shouldCompensateFail = true;

      await expect(step.compensate(context)).rejects.toThrow("步骤补偿失败");

      expect(step.onCompensationErrorCalled).toBe(true);
    });
  });

  describe("统计信息", () => {
    it("应该正确更新执行统计", async () => {
      await step.execute(context);

      const stats = step.getStatistics();
      expect(stats.executionCount).toBe(1);
      expect(stats.successCount).toBe(1);
      expect(stats.failureCount).toBe(0);
      expect(stats.averageExecutionTime).toBeGreaterThan(0);
      expect(stats.lastExecutedAt).toBeDefined();
      expect(stats.lastSuccessAt).toBeDefined();
    });

    it("应该正确更新补偿统计", async () => {
      await step.execute(context);
      await step.compensate(context);

      const stats = step.getStatistics();
      expect(stats.compensationCount).toBe(1);
    });

    it("应该正确计算平均执行时间", async () => {
      // 创建两个不同的步骤来测试平均时间计算
      const step1 = new TestSagaStep(logger, { ...config, name: "step1" });
      const step2 = new TestSagaStep(logger, { ...config, name: "step2" });

      await step1.execute(context);
      await step2.execute(context);

      // 检查第一个步骤的统计
      const stats1 = step1.getStatistics();
      expect(stats1.executionCount).toBe(1);
      expect(stats1.averageExecutionTime).toBeGreaterThan(0);

      // 检查第二个步骤的统计
      const stats2 = step2.getStatistics();
      expect(stats2.executionCount).toBe(1);
      expect(stats2.averageExecutionTime).toBeGreaterThan(0);
    });
  });

  describe("状态管理", () => {
    it("应该正确跟踪步骤状态", async () => {
      expect(step.getStatus()).toBe(SagaStepStatus.PENDING);

      await step.execute(context);
      expect(step.getStatus()).toBe(SagaStepStatus.COMPLETED);

      await step.compensate(context);
      expect(step.getStatus()).toBe(SagaStepStatus.COMPENSATED);
    });

    it("应该返回最后执行结果", async () => {
      const result = await step.execute(context);

      const lastResult = step.getLastResult();
      expect(lastResult).toEqual(result);
    });
  });

  describe("错误处理", () => {
    it("应该处理执行错误", async () => {
      step.shouldFail = true;

      await expect(step.execute(context)).rejects.toThrow("步骤执行失败");

      expect(step.onErrorCalled).toBe(true);
      expect(step.getStatus()).toBe(SagaStepStatus.FAILED);
    });

    it("应该处理补偿错误", async () => {
      await step.execute(context);
      step.shouldCompensateFail = true;

      await expect(step.compensate(context)).rejects.toThrow("步骤补偿失败");

      expect(step.onCompensationErrorCalled).toBe(true);
    });
  });
});

describe("SimpleSagaStep", () => {
  let logger: Logger;
  let config: StepConfig;
  let context: SagaContext;

  beforeEach(() => {
    logger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    } as unknown as Logger;

    config = {
      name: "simple-step",
      description: "简单步骤",
    };

    context = {
      sagaId: { toString: () => "test-saga-id" } as any,
      aggregateId: { toString: () => "test-aggregate-id" } as any,
      currentStepIndex: 0,
      startTime: new Date(),
      lastUpdateTime: new Date(),
      data: { test: "value" },
    };
  });

  it("应该使用提供的执行函数", async () => {
    const executeFn = jest.fn().mockResolvedValue("执行结果");
    const step = new SimpleSagaStep(logger, config, executeFn);

    const result = await step.execute(context);

    expect(executeFn).toHaveBeenCalledWith(context);
    expect(result.success).toBe(true);
    expect(result.data).toBe("执行结果");
  });

  it("应该使用提供的补偿函数", async () => {
    const executeFn = jest.fn().mockResolvedValue("执行结果");
    const compensateFn = jest.fn().mockResolvedValue("补偿结果");
    const step = new SimpleSagaStep(logger, config, executeFn, compensateFn);

    await step.execute(context);
    const result = await step.compensate(context);

    expect(compensateFn).toHaveBeenCalledWith(context);
    expect(result.success).toBe(true);
    expect(result.data).toBe("补偿结果");
  });

  it("应该在没有补偿函数时跳过补偿", async () => {
    const executeFn = jest.fn().mockResolvedValue("执行结果");
    const step = new SimpleSagaStep(logger, config, executeFn);

    await step.execute(context);
    const result = await step.compensate(context);

    expect(result.success).toBe(true);
    expect(result.data).toBeUndefined();
  });

  it("应该处理执行函数错误", async () => {
    const executeFn = jest.fn().mockRejectedValue(new Error("执行失败"));
    const step = new SimpleSagaStep(logger, config, executeFn);

    await expect(step.execute(context)).rejects.toThrow("执行失败");
  });

  it("应该处理补偿函数错误", async () => {
    const executeFn = jest.fn().mockResolvedValue("执行结果");
    const compensateFn = jest.fn().mockRejectedValue(new Error("补偿失败"));
    const step = new SimpleSagaStep(logger, config, executeFn, compensateFn);

    await step.execute(context);
    await expect(step.compensate(context)).rejects.toThrow("补偿失败");
  });
});
