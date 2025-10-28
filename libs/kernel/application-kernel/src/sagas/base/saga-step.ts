/**
 * @fileoverview Saga步骤实现
 * @description 提供Saga步骤的具体实现和扩展功能
 */

import { Logger } from "@hl8/logger";
// EntityId 暂时未使用，但保留导入以备将来使用
import { SagaStepStatus, SagaContext } from "./saga.base.js";

/**
 * 步骤执行结果
 * @description 步骤执行的结果信息
 */
export interface StepExecutionResult {
  /** 是否成功 */
  success: boolean;
  /** 结果数据 */
  data?: unknown;
  /** 错误信息 */
  error?: string;
  /** 执行时间（毫秒） */
  executionTime: number;
  /** 重试次数 */
  retryCount: number;
  /** 是否需要补偿 */
  needsCompensation: boolean;
}

/**
 * 步骤配置
 * @description 步骤的配置选项
 */
export interface StepConfig {
  /** 步骤名称 */
  name: string;
  /** 步骤描述 */
  description?: string;
  /** 是否启用 */
  enabled?: boolean;
  /** 超时时间（毫秒） */
  timeout?: number;
  /** 重试配置 */
  retry?: {
    maxAttempts: number;
    backoffMs: number;
    maxBackoffMs: number;
  };
  /** 补偿配置 */
  compensation?: {
    enabled: boolean;
    timeout: number;
    maxAttempts: number;
  };
  /** 条件配置 */
  condition?: {
    enabled: boolean;
    expression: string;
  };
}

/**
 * 步骤统计信息
 * @description 步骤的执行统计
 */
export interface StepStatistics {
  /** 步骤名称 */
  name: string;
  /** 执行次数 */
  executionCount: number;
  /** 成功次数 */
  successCount: number;
  /** 失败次数 */
  failureCount: number;
  /** 补偿次数 */
  compensationCount: number;
  /** 最后执行时间 */
  lastExecutedAt?: Date;
  /** 最后成功时间 */
  lastSuccessAt?: Date;
  /** 最后失败时间 */
  lastFailureAt?: Date;
  /** 平均执行时间（毫秒） */
  averageExecutionTime: number;
  /** 状态 */
  status: SagaStepStatus;
}

/**
 * 基础Saga步骤实现
 * @description 提供Saga步骤的基础实现
 */
export abstract class BaseSagaStep {
  protected readonly logger: Logger;
  protected readonly config: StepConfig;
  protected status: SagaStepStatus = SagaStepStatus.PENDING;
  protected statistics: StepStatistics;
  protected lastResult?: StepExecutionResult;

  constructor(logger: Logger, config: StepConfig) {
    this.logger = logger;
    this.config = {
      enabled: true,
      timeout: 30000, // 30秒
      retry: {
        maxAttempts: 3,
        backoffMs: 1000,
        maxBackoffMs: 10000,
      },
      compensation: {
        enabled: true,
        timeout: 30000, // 30秒
        maxAttempts: 3,
      },
      condition: {
        enabled: false,
        expression: "",
      },
      ...config,
    };

    this.statistics = {
      name: this.config.name,
      executionCount: 0,
      successCount: 0,
      failureCount: 0,
      compensationCount: 0,
      averageExecutionTime: 0,
      status: this.status,
    };
  }

  private logDebug(message: string, meta?: Record<string, unknown>): void {
    const fn = (this.logger as unknown as Record<string, unknown>)["debug"];
    if (typeof fn === "function") {
      if (meta) {
        (fn as (a: unknown, b?: unknown) => void).call(
          this.logger,
          message,
          meta,
        );
      } else {
        (fn as (a: unknown) => void).call(this.logger, message);
      }
    }
  }

  private logWarn(message: string, meta?: Record<string, unknown>): void {
    const fn = (this.logger as unknown as Record<string, unknown>)["warn"];
    if (typeof fn === "function") {
      if (meta) {
        (fn as (a: unknown, b?: unknown) => void).call(
          this.logger,
          message,
          meta,
        );
      } else {
        (fn as (a: unknown) => void).call(this.logger, message);
      }
    }
  }

  private logError(message: string, meta?: Record<string, unknown>): void {
    const fn = (this.logger as unknown as Record<string, unknown>)["error"];
    if (typeof fn === "function") {
      if (meta) {
        (fn as (a: unknown, b?: unknown) => void).call(
          this.logger,
          message,
          meta,
        );
      } else {
        (fn as (a: unknown) => void).call(this.logger, message);
      }
    }
  }

  /**
   * 获取步骤名称
   * @returns 步骤名称
   */
  public getName(): string {
    return this.config.name;
  }

  /**
   * 获取步骤描述
   * @returns 步骤描述
   */
  public getDescription(): string {
    return this.config.description || "";
  }

  /**
   * 获取步骤状态
   * @returns 当前状态
   */
  public getStatus(): SagaStepStatus {
    return this.status;
  }

  /**
   * 获取步骤统计信息
   * @returns 统计信息
   */
  public getStatistics(): StepStatistics {
    return { ...this.statistics };
  }

  /**
   * 获取最后执行结果
   * @returns 最后执行结果
   */
  public getLastResult(): StepExecutionResult | undefined {
    return this.lastResult;
  }

  /**
   * 检查步骤是否启用
   * @returns 是否启用
   */
  public isEnabled(): boolean {
    return this.config.enabled === true;
  }

  /**
   * 执行步骤
   * @param context Saga上下文
   * @returns 执行结果
   */
  public async execute(context: SagaContext): Promise<StepExecutionResult> {
    if (!this.isEnabled()) {
      this.logDebug(`步骤已禁用，跳过执行: ${this.config.name}`);
      return {
        success: true,
        executionTime: 0,
        retryCount: 0,
        needsCompensation: false,
      };
    }

    if (this.status === SagaStepStatus.COMPLETED) {
      this.logDebug(`步骤已完成，跳过执行: ${this.config.name}`);
      return this.lastResult!;
    }

    const startTime = Date.now();
    this.status = SagaStepStatus.RUNNING;
    this.statistics.status = this.status;
    this.statistics.executionCount++;
    this.statistics.lastExecutedAt = new Date();

    let retryCount = 0;
    let lastError: Error | undefined;

    // 检查执行条件
    if (this.config.condition?.enabled) {
      if (!(await this.checkCondition(context))) {
        this.logDebug(`步骤条件不满足，跳过执行: ${this.config.name}`);
        this.status = SagaStepStatus.SKIPPED;
        this.statistics.status = this.status;
        return {
          success: true,
          executionTime: Date.now() - startTime,
          retryCount: 0,
          needsCompensation: false,
        };
      }
    }

    // 执行前置处理
    await this.onBeforeExecute(context);

    // 重试执行
    while (retryCount <= this.config.retry!.maxAttempts) {
      try {
        this.logDebug(`执行步骤: ${this.config.name}`, {
          sagaId: context.sagaId.toString(),
          retryCount,
        });

        const result = await this.executeWithTimeout(context);

        this.status = SagaStepStatus.COMPLETED;
        this.statistics.status = this.status;
        this.statistics.successCount++;
        this.statistics.lastSuccessAt = new Date();
        this.updateAverageExecutionTime(Date.now() - startTime);

        this.lastResult = {
          success: true,
          data: result,
          executionTime: Date.now() - startTime,
          retryCount,
          needsCompensation: true,
        };

        // 执行后置处理
        await this.onAfterExecute(context, this.lastResult);

        this.logDebug(`步骤执行成功: ${this.config.name}`, {
          sagaId: context.sagaId.toString(),
          executionTime: this.lastResult.executionTime,
          retryCount,
        });

        return this.lastResult;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        retryCount++;

        this.logWarn(`步骤执行失败: ${this.config.name}`, {
          sagaId: context.sagaId.toString(),
          retryCount,
          error: lastError.message,
        });

        if (retryCount <= this.config.retry!.maxAttempts) {
          const backoffMs = Math.min(
            this.config.retry!.backoffMs * Math.pow(2, retryCount - 1),
            this.config.retry!.maxBackoffMs,
          );
          await this.delay(backoffMs);
        }
      }
    }

    // 执行失败
    this.status = SagaStepStatus.FAILED;
    this.statistics.status = this.status;
    this.statistics.failureCount++;
    this.statistics.lastFailureAt = new Date();
    this.updateAverageExecutionTime(Date.now() - startTime);

    this.lastResult = {
      success: false,
      error: lastError!.message,
      executionTime: Date.now() - startTime,
      retryCount,
      needsCompensation: false,
    };

    // 执行错误处理
    await this.onError(context, lastError!, this.lastResult);

    this.logError(`步骤执行最终失败: ${this.config.name}`, {
      sagaId: context.sagaId.toString(),
      error: lastError!.message,
      executionTime: this.lastResult.executionTime,
      retryCount,
    });

    throw lastError;
  }

  /**
   * 补偿步骤
   * @param context Saga上下文
   * @returns 补偿结果
   */
  public async compensate(context: SagaContext): Promise<StepExecutionResult> {
    if (!this.config.compensation?.enabled) {
      this.logDebug(`步骤未启用补偿: ${this.config.name}`);
      return {
        success: true,
        executionTime: 0,
        retryCount: 0,
        needsCompensation: false,
      };
    }

    if (this.status !== SagaStepStatus.COMPLETED) {
      this.logDebug(`步骤未完成，跳过补偿: ${this.config.name}`);
      return {
        success: true,
        executionTime: 0,
        retryCount: 0,
        needsCompensation: false,
      };
    }

    const startTime = Date.now();
    this.status = SagaStepStatus.COMPENSATED;
    this.statistics.status = this.status;
    this.statistics.compensationCount++;

    let retryCount = 0;
    let lastError: Error | undefined;

    // 执行补偿前置处理
    await this.onBeforeCompensate(context);

    // 重试补偿
    while (retryCount <= this.config.compensation!.maxAttempts) {
      try {
        this.logDebug(`补偿步骤: ${this.config.name}`, {
          sagaId: context.sagaId.toString(),
          retryCount,
        });

        const result = await this.compensateWithTimeout(context);

        const compensationResult = {
          success: true,
          data: result,
          executionTime: Date.now() - startTime,
          retryCount,
          needsCompensation: false,
        };

        // 执行补偿后置处理
        await this.onAfterCompensate(context, compensationResult);

        this.logDebug(`步骤补偿成功: ${this.config.name}`, {
          sagaId: context.sagaId.toString(),
          executionTime: compensationResult.executionTime,
          retryCount,
        });

        return compensationResult;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        retryCount++;

        this.logWarn(`步骤补偿失败: ${this.config.name}`, {
          sagaId: context.sagaId.toString(),
          retryCount,
          error: lastError.message,
        });

        if (retryCount <= this.config.compensation!.maxAttempts) {
          const backoffMs = Math.min(
            this.config.retry!.backoffMs * Math.pow(2, retryCount - 1),
            this.config.retry!.maxBackoffMs,
          );
          await this.delay(backoffMs);
        }
      }
    }

    // 补偿失败
    const compensationResult = {
      success: false,
      error: lastError!.message,
      executionTime: Date.now() - startTime,
      retryCount,
      needsCompensation: false,
    };

    // 执行补偿错误处理
    await this.onCompensationError(context, lastError!, compensationResult);

    this.logError(`步骤补偿最终失败: ${this.config.name}`, {
      sagaId: context.sagaId.toString(),
      error: lastError!.message,
      executionTime: compensationResult.executionTime,
      retryCount,
    });

    throw lastError;
  }

  // 抽象方法，子类必须实现

  /**
   * 执行步骤的具体逻辑
   * @param context Saga上下文
   * @returns 执行结果
   * @description 子类必须实现此方法
   */
  protected abstract executeStep(context: SagaContext): Promise<unknown>;

  /**
   * 补偿步骤的具体逻辑
   * @param context Saga上下文
   * @returns 补偿结果
   * @description 子类必须实现此方法
   */
  protected abstract compensateStep(context: SagaContext): Promise<unknown>;

  // 生命周期钩子方法，子类可以重写

  /**
   * 检查执行条件
   * @param context Saga上下文
   * @returns 是否满足条件
   * @description 子类可以重写此方法进行条件检查
   */
  protected async checkCondition(_context: SagaContext): Promise<boolean> {
    // 默认实现：总是满足条件
    return true;
  }

  /**
   * 执行前置处理
   * @param context Saga上下文
   * @description 子类可以重写此方法进行执行前的处理
   */
  protected async onBeforeExecute(_context: SagaContext): Promise<void> {
    // 默认实现为空
  }

  /**
   * 执行后置处理
   * @param context Saga上下文
   * @param result 执行结果
   * @description 子类可以重写此方法进行执行后的处理
   */
  protected async onAfterExecute(
    _context: SagaContext,
    _result: StepExecutionResult,
  ): Promise<void> {
    // 默认实现为空
  }

  /**
   * 执行错误处理
   * @param context Saga上下文
   * @param error 错误信息
   * @param result 执行结果
   * @description 子类可以重写此方法进行错误处理
   */
  protected async onError(
    _context: SagaContext,
    _error: Error,
    _result: StepExecutionResult,
  ): Promise<void> {
    // 默认实现为空
  }

  /**
   * 补偿前置处理
   * @param context Saga上下文
   * @description 子类可以重写此方法进行补偿前的处理
   */
  protected async onBeforeCompensate(_context: SagaContext): Promise<void> {
    // 默认实现为空
  }

  /**
   * 补偿后置处理
   * @param context Saga上下文
   * @param result 补偿结果
   * @description 子类可以重写此方法进行补偿后的处理
   */
  protected async onAfterCompensate(
    _context: SagaContext,
    _result: StepExecutionResult,
  ): Promise<void> {
    // 默认实现为空
  }

  /**
   * 补偿错误处理
   * @param context Saga上下文
   * @param error 错误信息
   * @param result 补偿结果
   * @description 子类可以重写此方法进行补偿错误处理
   */
  protected async onCompensationError(
    _context: SagaContext,
    _error: Error,
    _result: StepExecutionResult,
  ): Promise<void> {
    // 默认实现为空
  }

  // 私有辅助方法

  /**
   * 带超时的执行
   * @param context Saga上下文
   * @returns 执行结果
   */
  private async executeWithTimeout(context: SagaContext): Promise<unknown> {
    const timeout = this.config.timeout!;

    return Promise.race([
      this.executeStep(context),
      new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`步骤执行超时: ${this.config.name} (${timeout}ms)`));
        }, timeout);
      }),
    ]);
  }

  /**
   * 带超时的补偿
   * @param context Saga上下文
   * @returns 补偿结果
   */
  private async compensateWithTimeout(context: SagaContext): Promise<unknown> {
    const timeout = this.config.compensation!.timeout;

    return Promise.race([
      this.compensateStep(context),
      new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`步骤补偿超时: ${this.config.name} (${timeout}ms)`));
        }, timeout);
      }),
    ]);
  }

  /**
   * 延迟执行
   * @param ms 延迟时间（毫秒）
   * @returns Promise
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * 更新平均执行时间
   * @param executionTime 执行时间
   */
  private updateAverageExecutionTime(executionTime: number): void {
    const totalExecutions =
      this.statistics.successCount + this.statistics.failureCount;
    if (totalExecutions > 0) {
      this.statistics.averageExecutionTime =
        (this.statistics.averageExecutionTime * (totalExecutions - 1) +
          executionTime) /
        totalExecutions;
    }
  }
}

/**
 * 简单Saga步骤
 * @description 提供简单的Saga步骤实现
 */
export class SimpleSagaStep extends BaseSagaStep {
  private readonly executeFn: (context: SagaContext) => Promise<unknown>;
  private readonly compensateFn?: (context: SagaContext) => Promise<unknown>;

  constructor(
    logger: Logger,
    config: StepConfig,
    executeFn: (context: SagaContext) => Promise<unknown>,
    compensateFn?: (context: SagaContext) => Promise<unknown>,
  ) {
    super(logger, config);
    this.executeFn = executeFn;
    this.compensateFn = compensateFn;
  }

  protected async executeStep(context: SagaContext): Promise<unknown> {
    return await this.executeFn(context);
  }

  protected async compensateStep(context: SagaContext): Promise<unknown> {
    if (this.compensateFn) {
      return await this.compensateFn(context);
    }
    return undefined;
  }
}
