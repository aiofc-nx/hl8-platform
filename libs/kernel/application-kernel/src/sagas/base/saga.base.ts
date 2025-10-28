/**
 * @fileoverview Saga基类
 * @description 提供Saga模式的基础功能和生命周期管理
 */

import { Logger } from "@hl8/logger";
import { EntityId } from "@hl8/domain-kernel";
// DomainEvent 暂时未使用，但保留导入以备将来使用

/**
 * Saga状态
 * @description Saga的执行状态
 */
export enum SagaStatus {
  /** 未开始 */
  NOT_STARTED = "not_started",
  /** 运行中 */
  RUNNING = "running",
  /** 已完成 */
  COMPLETED = "completed",
  /** 已失败 */
  FAILED = "failed",
  /** 已补偿 */
  COMPENSATED = "compensated",
  /** 已暂停 */
  PAUSED = "paused",
  /** 已取消 */
  CANCELLED = "cancelled",
}

/**
 * Saga步骤状态
 * @description Saga步骤的执行状态
 */
export enum SagaStepStatus {
  /** 待执行 */
  PENDING = "pending",
  /** 执行中 */
  RUNNING = "running",
  /** 已完成 */
  COMPLETED = "completed",
  /** 已失败 */
  FAILED = "failed",
  /** 已补偿 */
  COMPENSATED = "compensated",
  /** 已跳过 */
  SKIPPED = "skipped",
}

/**
 * Saga配置
 * @description Saga的配置选项
 */
export interface SagaConfig {
  /** Saga名称 */
  name: string;
  /** Saga描述 */
  description?: string;
  /** Saga版本 */
  version?: string;
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
  /** 性能配置 */
  performance?: {
    maxConcurrency: number;
    batchSize: number;
  };
}

/**
 * Saga统计信息
 * @description Saga的运行统计
 */
export interface SagaStatistics {
  /** Saga名称 */
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
  status: SagaStatus;
}

/**
 * Saga上下文
 * @description Saga执行过程中的上下文信息
 */
export interface SagaContext {
  /** Saga ID */
  sagaId: EntityId;
  /** 关联的聚合根ID */
  aggregateId: EntityId;
  /** 当前步骤索引 */
  currentStepIndex: number;
  /** 执行开始时间 */
  startTime: Date;
  /** 最后更新时间 */
  lastUpdateTime: Date;
  /** 自定义数据 */
  data: Record<string, unknown>;
  /** 错误信息 */
  error?: string;
  /** 补偿原因 */
  compensationReason?: string;
}

/**
 * Saga基类
 * @description 提供Saga模式的基础功能
 */
import { BaseSagaStep } from "./saga-step.js";

export abstract class Saga<TData = unknown> {
  protected readonly logger: Logger;
  protected readonly config: SagaConfig;
  protected status: SagaStatus = SagaStatus.NOT_STARTED;
  protected statistics: SagaStatistics;
  protected context: SagaContext;
  protected steps: BaseSagaStep[] = [];

  constructor(logger: Logger, config: SagaConfig, aggregateId: EntityId) {
    this.logger = logger;
    this.config = {
      enabled: true,
      timeout: 300000, // 5分钟
      retry: {
        maxAttempts: 3,
        backoffMs: 1000,
        maxBackoffMs: 10000,
      },
      compensation: {
        enabled: true,
        timeout: 60000, // 1分钟
        maxAttempts: 3,
      },
      performance: {
        maxConcurrency: 5,
        batchSize: 10,
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

    this.context = {
      sagaId: new EntityId(),
      aggregateId,
      currentStepIndex: 0,
      startTime: new Date(),
      lastUpdateTime: new Date(),
      data: {},
    };

    this.initializeSteps();
  }

  /**
   * 获取Saga ID
   * @returns Saga ID
   */
  public getSagaId(): EntityId {
    return this.context.sagaId;
  }

  /**
   * 获取Saga名称
   * @returns Saga名称
   */
  public getName(): string {
    return this.config.name;
  }

  /**
   * 获取Saga描述
   * @returns Saga描述
   */
  public getDescription(): string {
    return this.config.description || "";
  }

  /**
   * 获取Saga版本
   * @returns Saga版本
   */
  public getVersion(): string {
    return this.config.version || "1.0.0";
  }

  /**
   * 获取Saga状态
   * @returns 当前状态
   */
  public getStatus(): SagaStatus {
    return this.status;
  }

  /**
   * 获取Saga统计信息
   * @returns 统计信息
   */
  public getStatistics(): SagaStatistics {
    return { ...this.statistics };
  }

  /**
   * 获取Saga上下文
   * @returns 上下文信息
   */
  public getContext(): SagaContext {
    return { ...this.context };
  }

  /**
   * 检查Saga是否启用
   * @returns 是否启用
   */
  public isEnabled(): boolean {
    return this.config.enabled === true;
  }

  /**
   * 执行Saga
   * @param data 执行数据
   * @returns 执行结果
   */
  public async execute(data: TData): Promise<void> {
    if (this.status !== SagaStatus.NOT_STARTED) {
      throw new Error(`Saga ${this.config.name} 已经执行过或正在执行中`);
    }

    if (!this.isEnabled()) {
      this.logger.warn(`Saga ${this.config.name} 已禁用，跳过执行`);
      return;
    }

    const startTime = Date.now();
    this.statistics.executionCount++;
    this.status = SagaStatus.RUNNING;
    this.statistics.status = this.status;
    this.context.startTime = new Date();
    this.context.lastUpdateTime = new Date();

    try {
      this.logger.debug(`开始执行Saga: ${this.config.name}`, {
        sagaId: this.context.sagaId.toString(),
        aggregateId: this.context.aggregateId.toString(),
      });

      // 设置执行数据
      this.context.data = {
        ...this.context.data,
        ...(data as Record<string, unknown>),
      };

      // 执行前置处理
      await this.onBeforeExecute(data);

      // 执行步骤
      await this.executeSteps();

      // TODO: 检查是否被取消（这里的写法是对的，出现错误提示时再修改）
      if (this.status === SagaStatus.CANCELLED) {
        this.logger.debug(`Saga已取消: ${this.config.name}`, {
          sagaId: this.context.sagaId.toString(),
          executionTime: Date.now() - startTime,
        });
        return;
      }

      // 执行后置处理
      await this.onAfterExecute(data);

      this.status = SagaStatus.COMPLETED;
      this.statistics.status = this.status;
      this.statistics.successCount++;
      this.statistics.lastSuccessAt = new Date();
      this.statistics.lastExecutedAt = new Date();
      this.updateAverageExecutionTime(Date.now() - startTime);

      this.logger.debug(`Saga执行成功: ${this.config.name}`, {
        sagaId: this.context.sagaId.toString(),
        executionTime: Date.now() - startTime,
      });
    } catch (error) {
      this.status = SagaStatus.FAILED;
      this.statistics.status = this.status;
      this.statistics.failureCount++;
      this.statistics.lastFailureAt = new Date();
      this.statistics.lastExecutedAt = new Date();
      this.context.error =
        error instanceof Error ? error.message : String(error);
      this.updateAverageExecutionTime(Date.now() - startTime);

      this.logger.error(`Saga执行失败: ${this.config.name}`, {
        sagaId: this.context.sagaId.toString(),
        error: this.context.error,
        executionTime: Date.now() - startTime,
      });

      // 如果启用了补偿，执行补偿操作
      if (this.config.compensation?.enabled) {
        await this.compensate();
      }

      throw error;
    }
  }

  /**
   * 补偿Saga
   * @param reason 补偿原因
   * @returns 补偿结果
   */
  public async compensate(reason?: string): Promise<void> {
    if (this.status === SagaStatus.COMPENSATED) {
      this.logger.warn(`Saga ${this.config.name} 已经补偿过`);
      return;
    }

    if (!this.config.compensation?.enabled) {
      this.logger.warn(`Saga ${this.config.name} 未启用补偿功能`);
      return;
    }

    const startTime = Date.now();
    this.status = SagaStatus.COMPENSATED;
    this.statistics.status = this.status;
    this.statistics.compensationCount++;
    this.context.compensationReason = reason || "执行失败";
    this.context.lastUpdateTime = new Date();

    try {
      this.logger.debug(`开始补偿Saga: ${this.config.name}`, {
        sagaId: this.context.sagaId.toString(),
        reason: this.context.compensationReason,
      });

      // 执行补偿前置处理
      await this.onBeforeCompensate(reason);

      // 按相反顺序执行补偿步骤
      await this.executeCompensationSteps();

      // 执行补偿后置处理
      await this.onAfterCompensate(reason);

      this.logger.debug(`Saga补偿成功: ${this.config.name}`, {
        sagaId: this.context.sagaId.toString(),
        compensationTime: Date.now() - startTime,
      });
    } catch (error) {
      this.logger.error(`Saga补偿失败: ${this.config.name}`, {
        sagaId: this.context.sagaId.toString(),
        error: error instanceof Error ? error.message : String(error),
        compensationTime: Date.now() - startTime,
      });
      throw error;
    }
  }

  /**
   * 暂停Saga
   * @returns 暂停结果
   */
  public async pause(): Promise<void> {
    if (this.status !== SagaStatus.RUNNING) {
      throw new Error(`Saga ${this.config.name} 未在运行中，无法暂停`);
    }

    this.status = SagaStatus.PAUSED;
    this.statistics.status = this.status;
    this.context.lastUpdateTime = new Date();

    await this.onPause();

    this.logger.debug(`Saga已暂停: ${this.config.name}`, {
      sagaId: this.context.sagaId.toString(),
    });
  }

  /**
   * 恢复Saga
   * @returns 恢复结果
   */
  public async resume(): Promise<void> {
    if (this.status !== SagaStatus.PAUSED) {
      throw new Error(`Saga ${this.config.name} 未暂停，无法恢复`);
    }

    this.status = SagaStatus.RUNNING;
    this.statistics.status = this.status;
    this.context.lastUpdateTime = new Date();

    await this.onResume();

    this.logger.debug(`Saga已恢复: ${this.config.name}`, {
      sagaId: this.context.sagaId.toString(),
    });
  }

  /**
   * 取消Saga
   * @param reason 取消原因
   * @returns 取消结果
   */
  public async cancel(reason?: string): Promise<void> {
    if (
      this.status === SagaStatus.COMPLETED ||
      this.status === SagaStatus.CANCELLED
    ) {
      this.logger.warn(`Saga ${this.config.name} 已完成或已取消`);
      return;
    }

    this.status = SagaStatus.CANCELLED;
    this.statistics.status = this.status;
    this.context.lastUpdateTime = new Date();

    await this.onCancel(reason);

    this.logger.debug(`Saga已取消: ${this.config.name}`, {
      sagaId: this.context.sagaId.toString(),
      reason,
    });
  }

  /**
   * 获取当前步骤
   * @returns 当前步骤
   */
  public getCurrentStep(): BaseSagaStep | undefined {
    return this.steps[this.context.currentStepIndex];
  }

  /**
   * 获取所有步骤
   * @returns 步骤列表
   */
  public getSteps(): BaseSagaStep[] {
    return [...this.steps];
  }

  /**
   * 获取步骤数量
   * @returns 步骤数量
   */
  public getStepCount(): number {
    return this.steps.length;
  }

  /**
   * 检查是否完成
   * @returns 是否完成
   */
  public isCompleted(): boolean {
    return this.status === SagaStatus.COMPLETED;
  }

  /**
   * 检查是否失败
   * @returns 是否失败
   */
  public isFailed(): boolean {
    return this.status === SagaStatus.FAILED;
  }

  /**
   * 检查是否已补偿
   * @returns 是否已补偿
   */
  public isCompensated(): boolean {
    return this.status === SagaStatus.COMPENSATED;
  }

  // 抽象方法，子类必须实现

  /**
   * 初始化步骤
   * @description 子类必须实现此方法来定义Saga的步骤
   */
  protected abstract initializeSteps(): void;

  /**
   * 执行步骤
   * @description 子类可以重写此方法来自定义步骤执行逻辑
   */
  protected async executeSteps(): Promise<void> {
    for (let i = 0; i < this.steps.length; i++) {
      // Check if saga was cancelled before executing each step
      if (this.status === SagaStatus.CANCELLED) {
        this.logger.debug(`Saga已取消，停止执行步骤`, {
          sagaId: this.context.sagaId.toString(),
          stepIndex: i,
        });
        return;
      }

      this.context.currentStepIndex = i;
      const step = this.steps[i];

      try {
        this.logger.debug(`执行步骤: ${step.getName()}`, {
          sagaId: this.context.sagaId.toString(),
          stepIndex: i,
        });

        await step.execute(this.context);
        this.context.lastUpdateTime = new Date();

        this.logger.debug(`步骤执行成功: ${step.getName()}`, {
          sagaId: this.context.sagaId.toString(),
          stepIndex: i,
        });
      } catch (error) {
        this.logger.error(`步骤执行失败: ${step.getName()}`, {
          sagaId: this.context.sagaId.toString(),
          stepIndex: i,
          error: error instanceof Error ? error.message : String(error),
        });
        throw error;
      }
    }
  }

  /**
   * 执行补偿步骤
   * @description 子类可以重写此方法来自定义补偿步骤执行逻辑
   */
  protected async executeCompensationSteps(): Promise<void> {
    // 按相反顺序执行补偿步骤
    for (let i = this.steps.length - 1; i >= 0; i--) {
      const step = this.steps[i];

      if (step.getStatus() === SagaStepStatus.COMPLETED) {
        try {
          this.logger.debug(`补偿步骤: ${step.getName()}`, {
            sagaId: this.context.sagaId.toString(),
            stepIndex: i,
          });

          await step.compensate(this.context);
          this.context.lastUpdateTime = new Date();

          this.logger.debug(`步骤补偿成功: ${step.getName()}`, {
            sagaId: this.context.sagaId.toString(),
            stepIndex: i,
          });
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

  // 生命周期钩子方法，子类可以重写

  /**
   * 执行前置处理
   * @param data 执行数据
   * @description 子类可以重写此方法进行执行前的处理
   */
  protected async onBeforeExecute(_data: TData): Promise<void> {
    // 默认实现为空
  }

  /**
   * 执行后置处理
   * @param data 执行数据
   * @description 子类可以重写此方法进行执行后的处理
   */
  protected async onAfterExecute(_data: TData): Promise<void> {
    // 默认实现为空
  }

  /**
   * 补偿前置处理
   * @param reason 补偿原因
   * @description 子类可以重写此方法进行补偿前的处理
   */
  protected async onBeforeCompensate(_reason?: string): Promise<void> {
    // 默认实现为空
  }

  /**
   * 补偿后置处理
   * @param reason 补偿原因
   * @description 子类可以重写此方法进行补偿后的处理
   */
  protected async onAfterCompensate(_reason?: string): Promise<void> {
    // 默认实现为空
  }

  /**
   * 暂停处理
   * @description 子类可以重写此方法进行暂停时的处理
   */
  protected async onPause(): Promise<void> {
    // 默认实现为空
  }

  /**
   * 恢复处理
   * @description 子类可以重写此方法进行恢复时的处理
   */
  protected async onResume(): Promise<void> {
    // 默认实现为空
  }

  /**
   * 取消处理
   * @param reason 取消原因
   * @description 子类可以重写此方法进行取消时的处理
   */
  protected async onCancel(_reason?: string): Promise<void> {
    // 默认实现为空
  }

  // 私有辅助方法

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
 * Saga步骤基类
 * @description 提供Saga步骤的基础功能
 */
export abstract class SagaStep {
  protected readonly name: string;
  protected readonly description?: string;
  protected status: SagaStepStatus = SagaStepStatus.PENDING;
  protected statistics?: {
    executionCount: number;
    successCount: number;
    failureCount: number;
  };

  constructor(name: string, description?: string) {
    this.name = name;
    this.description = description;
    this.statistics = { executionCount: 0, successCount: 0, failureCount: 0 };
  }

  /**
   * 获取步骤名称
   * @returns 步骤名称
   */
  public getName(): string {
    return this.name;
  }

  /**
   * 获取步骤描述
   * @returns 步骤描述
   */
  public getDescription(): string {
    return this.description || "";
  }

  /**
   * 获取步骤状态
   * @returns 当前状态
   */
  public getStatus(): SagaStepStatus {
    return this.status;
  }

  /**
   * 执行步骤
   * @param context Saga上下文
   * @description 子类必须实现此方法
   */
  public abstract execute(context: SagaContext): Promise<void>;

  /**
   * 补偿步骤
   * @param context Saga上下文
   * @description 子类必须实现此方法
   */
  public abstract compensate(context: SagaContext): Promise<void>;

  /**
   * 获取步骤统计（为测试提供最小实现）
   */
  public getStatistics(): {
    executionCount: number;
    successCount: number;
    failureCount: number;
  } {
    const stats = this.statistics || {
      executionCount: 0,
      successCount: 0,
      failureCount: 0,
    };
    return { ...stats };
  }
}
