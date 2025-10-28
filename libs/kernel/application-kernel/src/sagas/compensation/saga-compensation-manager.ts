/**
 * @fileoverview Saga补偿管理器
 * @description 提供Saga补偿机制的管理和协调功能
 */

import { Logger } from "@hl8/logger";
import { EntityId } from "@hl8/domain-kernel";
// Saga, SagaStatus, SagaContext 暂时未使用，但保留导入以备将来使用
import { SagaStateManager, SagaStateSnapshot } from "../base/saga-state.js";

/**
 * 补偿策略
 * @description 定义补偿的执行策略
 */
export enum CompensationStrategy {
  /** 立即补偿 */
  IMMEDIATE = "immediate",
  /** 延迟补偿 */
  DELAYED = "delayed",
  /** 批量补偿 */
  BATCH = "batch",
  /** 手动补偿 */
  MANUAL = "manual",
}

/**
 * 补偿配置
 * @description 补偿机制的配置选项
 */
export interface CompensationConfig {
  /** 补偿策略 */
  strategy: CompensationStrategy;
  /** 延迟时间（毫秒） */
  delayMs?: number;
  /** 批量大小 */
  batchSize?: number;
  /** 最大重试次数 */
  maxRetries: number;
  /** 重试间隔（毫秒） */
  retryInterval: number;
  /** 补偿超时时间（毫秒） */
  timeout: number;
  /** 是否启用并行补偿 */
  parallelCompensation: boolean;
  /** 最大并行补偿数 */
  maxParallelCompensations: number;
}

/**
 * 补偿任务
 * @description 补偿任务的详细信息
 */
export interface CompensationTask {
  /** 任务ID */
  taskId: string;
  /** Saga ID */
  sagaId: string;
  /** 聚合根ID */
  aggregateId: string;
  /** 补偿原因 */
  reason: string;
  /** 创建时间 */
  createdAt: Date;
  /** 计划执行时间 */
  scheduledAt: Date;
  /** 优先级 */
  priority: number;
  /** 重试次数 */
  retryCount: number;
  /** 最大重试次数 */
  maxRetries: number;
  /** 状态 */
  status: CompensationTaskStatus;
  /** 错误信息 */
  error?: string;
  /** 执行时间 */
  executedAt?: Date;
  /** 完成时间 */
  completedAt?: Date;
}

/**
 * 补偿任务状态
 * @description 补偿任务的执行状态
 */
export enum CompensationTaskStatus {
  /** 待执行 */
  PENDING = "pending",
  /** 执行中 */
  RUNNING = "running",
  /** 已完成 */
  COMPLETED = "completed",
  /** 已失败 */
  FAILED = "failed",
  /** 已取消 */
  CANCELLED = "cancelled",
  /** 已重试 */
  RETRYING = "retrying",
}

/**
 * 补偿结果
 * @description 补偿执行的结果信息
 */
export interface CompensationResult {
  /** 是否成功 */
  success: boolean;
  /** 任务ID */
  taskId: string;
  /** Saga ID */
  sagaId: string;
  /** 执行时间（毫秒） */
  executionTime: number;
  /** 错误信息 */
  error?: string;
  /** 补偿的步骤数量 */
  compensatedSteps: number;
  /** 补偿的步骤详情 */
  stepResults: Array<{
    stepName: string;
    success: boolean;
    error?: string;
    executionTime: number;
  }>;
}

/**
 * 补偿统计信息
 * @description 补偿机制的统计信息
 */
export interface CompensationStatistics {
  /** 总补偿任务数 */
  totalTasks: number;
  /** 成功补偿数 */
  successCount: number;
  /** 失败补偿数 */
  failureCount: number;
  /** 重试补偿数 */
  retryCount: number;
  /** 平均补偿时间（毫秒） */
  averageCompensationTime: number;
  /** 按策略分组的统计 */
  byStrategy: Record<CompensationStrategy, number>;
  /** 按状态分组的统计 */
  byStatus: Record<CompensationTaskStatus, number>;
  /** 最后补偿时间 */
  lastCompensationAt?: Date;
}

/**
 * 补偿管理器接口
 * @description 定义补偿管理器的接口
 */
export interface ICompensationManager {
  /**
   * 创建补偿任务
   * @param sagaId Saga ID
   * @param aggregateId 聚合根ID
   * @param reason 补偿原因
   * @param priority 优先级
   * @returns 补偿任务
   */
  createCompensationTask(
    sagaId: string,
    aggregateId: string,
    reason: string,
    priority?: number,
  ): Promise<CompensationTask>;

  /**
   * 执行补偿任务
   * @param taskId 任务ID
   * @returns 补偿结果
   */
  executeCompensationTask(taskId: string): Promise<CompensationResult>;

  /**
   * 取消补偿任务
   * @param taskId 任务ID
   * @returns 取消结果
   */
  cancelCompensationTask(taskId: string): Promise<void>;

  /**
   * 获取补偿任务
   * @param taskId 任务ID
   * @returns 补偿任务
   */
  getCompensationTask(taskId: string): Promise<CompensationTask | undefined>;

  /**
   * 获取待执行的补偿任务
   * @param limit 限制数量
   * @returns 补偿任务列表
   */
  getPendingTasks(limit?: number): Promise<CompensationTask[]>;

  /**
   * 获取补偿统计信息
   * @returns 统计信息
   */
  getStatistics(): Promise<CompensationStatistics>;

  /**
   * 清理已完成的补偿任务
   * @param beforeDate 清理此日期之前的任务
   * @returns 清理数量
   */
  cleanup(beforeDate: Date): Promise<number>;
}

/**
 * Saga补偿管理器实现
 * @description 提供Saga补偿机制的管理和协调功能
 */
export class SagaCompensationManager implements ICompensationManager {
  private readonly logger: Logger;
  private readonly stateManager: SagaStateManager;
  private readonly config: CompensationConfig;
  private readonly compensationTasks: Map<string, CompensationTask> = new Map();
  private readonly statistics: CompensationStatistics;
  private executionTimer?: NodeJS.Timeout;

  constructor(
    logger: Logger,
    stateManager: SagaStateManager,
    config: Partial<CompensationConfig> = {},
  ) {
    this.logger = logger;
    this.stateManager = stateManager;
    this.config = {
      strategy: CompensationStrategy.IMMEDIATE,
      maxRetries: 3,
      retryInterval: 5000,
      timeout: 60000,
      parallelCompensation: true,
      maxParallelCompensations: 10,
      ...config,
    };

    this.statistics = {
      totalTasks: 0,
      successCount: 0,
      failureCount: 0,
      retryCount: 0,
      averageCompensationTime: 0,
      byStrategy: {
        [CompensationStrategy.IMMEDIATE]: 0,
        [CompensationStrategy.DELAYED]: 0,
        [CompensationStrategy.BATCH]: 0,
        [CompensationStrategy.MANUAL]: 0,
      },
      byStatus: {
        [CompensationTaskStatus.PENDING]: 0,
        [CompensationTaskStatus.RUNNING]: 0,
        [CompensationTaskStatus.COMPLETED]: 0,
        [CompensationTaskStatus.FAILED]: 0,
        [CompensationTaskStatus.CANCELLED]: 0,
        [CompensationTaskStatus.RETRYING]: 0,
      },
    };

    this.initializeExecutionTimer();
  }

  /**
   * 创建补偿任务
   * @param sagaId Saga ID
   * @param aggregateId 聚合根ID
   * @param reason 补偿原因
   * @param priority 优先级
   * @returns 补偿任务
   */
  public async createCompensationTask(
    sagaId: string,
    aggregateId: string,
    reason: string,
    priority: number = 0,
  ): Promise<CompensationTask> {
    const taskId = new EntityId().toString();
    const now = new Date();
    const scheduledAt = new Date(now.getTime() + (this.config.delayMs || 0));

    const task: CompensationTask = {
      taskId,
      sagaId,
      aggregateId,
      reason,
      createdAt: now,
      scheduledAt,
      priority,
      retryCount: 0,
      maxRetries: this.config.maxRetries,
      status: CompensationTaskStatus.PENDING,
    };

    this.compensationTasks.set(taskId, task);
    this.updateStatistics(task);

    this.logger.debug(`创建补偿任务: ${taskId}`, {
      sagaId,
      aggregateId,
      reason,
      priority,
      scheduledAt,
    });

    // 根据策略执行补偿
    if (this.config.strategy === CompensationStrategy.IMMEDIATE) {
      this.executeCompensationTask(taskId).catch((error) => {
        this.logger.error(`立即补偿执行失败: ${taskId}`, {
          error: error instanceof Error ? error.message : String(error),
        });
      });
    }

    return task;
  }

  /**
   * 执行补偿任务
   * @param taskId 任务ID
   * @returns 补偿结果
   */
  public async executeCompensationTask(
    taskId: string,
  ): Promise<CompensationResult> {
    const task = this.compensationTasks.get(taskId);
    if (!task) {
      throw new Error(`未找到补偿任务: ${taskId}`);
    }

    if (
      task.status !== CompensationTaskStatus.PENDING &&
      task.status !== CompensationTaskStatus.RETRYING
    ) {
      throw new Error(`补偿任务状态不正确: ${task.status}`);
    }

    const startTime = Date.now();
    task.status = CompensationTaskStatus.RUNNING;
    task.executedAt = new Date();
    this.updateStatistics(task);

    try {
      this.logger.debug(`开始执行补偿任务: ${taskId}`, {
        sagaId: task.sagaId,
        reason: task.reason,
      });

      // 获取Saga状态快照
      const snapshot = await this.stateManager.getById(task.sagaId);
      if (!snapshot) {
        throw new Error(`未找到Saga状态快照: ${task.sagaId}`);
      }

      // 创建Saga实例并执行补偿
      // TODO: 这里需要根据实际的Saga类型来创建实例
      // const saga = await this.createSagaFromSnapshot(snapshot);
      // await saga.compensate(task.reason);

      // 模拟补偿执行
      const stepResults = await this.executeCompensationSteps(snapshot);

      const executionTime = Date.now() - startTime;
      task.status = CompensationTaskStatus.COMPLETED;
      task.completedAt = new Date();
      this.updateStatistics(task);

      const result: CompensationResult = {
        success: true,
        taskId,
        sagaId: task.sagaId,
        executionTime,
        compensatedSteps: stepResults.length,
        stepResults,
      };

      this.logger.debug(`补偿任务执行成功: ${taskId}`, {
        executionTime,
        compensatedSteps: result.compensatedSteps,
      });

      return result;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      task.error = errorMessage;
      task.retryCount++;

      if (task.retryCount < task.maxRetries) {
        task.status = CompensationTaskStatus.RETRYING;
        this.updateStatistics(task);

        // 安排重试
        setTimeout(() => {
          this.executeCompensationTask(taskId).catch((retryError) => {
            this.logger.error(`补偿任务重试失败: ${taskId}`, {
              error:
                retryError instanceof Error
                  ? retryError.message
                  : String(retryError),
            });
          });
        }, this.config.retryInterval);

        this.logger.warn(`补偿任务执行失败，将重试: ${taskId}`, {
          error: errorMessage,
          retryCount: task.retryCount,
          maxRetries: task.maxRetries,
        });
      } else {
        task.status = CompensationTaskStatus.FAILED;
        this.updateStatistics(task);

        this.logger.error(`补偿任务最终失败: ${taskId}`, {
          error: errorMessage,
          retryCount: task.retryCount,
          executionTime,
        });
      }

      return {
        success: false,
        taskId,
        sagaId: task.sagaId,
        executionTime,
        error: errorMessage,
        compensatedSteps: 0,
        stepResults: [],
      };
    }
  }

  /**
   * 取消补偿任务
   * @param taskId 任务ID
   * @returns 取消结果
   */
  public async cancelCompensationTask(taskId: string): Promise<void> {
    const task = this.compensationTasks.get(taskId);
    if (!task) {
      throw new Error(`未找到补偿任务: ${taskId}`);
    }

    if (
      task.status === CompensationTaskStatus.COMPLETED ||
      task.status === CompensationTaskStatus.CANCELLED
    ) {
      this.logger.warn(`补偿任务已完成或已取消: ${taskId}`);
      return;
    }

    task.status = CompensationTaskStatus.CANCELLED;
    this.updateStatistics(task);

    this.logger.debug(`补偿任务已取消: ${taskId}`);
  }

  /**
   * 获取补偿任务
   * @param taskId 任务ID
   * @returns 补偿任务
   */
  public async getCompensationTask(
    taskId: string,
  ): Promise<CompensationTask | undefined> {
    return this.compensationTasks.get(taskId);
  }

  /**
   * 获取待执行的补偿任务
   * @param limit 限制数量
   * @returns 补偿任务列表
   */
  public async getPendingTasks(
    limit: number = 100,
  ): Promise<CompensationTask[]> {
    const pendingTasks = Array.from(this.compensationTasks.values())
      .filter((task) => task.status === CompensationTaskStatus.PENDING)
      .sort(
        (a, b) =>
          b.priority - a.priority ||
          a.scheduledAt.getTime() - b.scheduledAt.getTime(),
      )
      .slice(0, limit);

    return pendingTasks;
  }

  /**
   * 获取补偿统计信息
   * @returns 统计信息
   */
  public async getStatistics(): Promise<CompensationStatistics> {
    return { ...this.statistics };
  }

  /**
   * 清理已完成的补偿任务
   * @param beforeDate 清理此日期之前的任务
   * @returns 清理数量
   */
  public async cleanup(beforeDate: Date): Promise<number> {
    let cleanedCount = 0;
    const tasksToDelete: string[] = [];

    for (const [taskId, task] of this.compensationTasks) {
      if (
        (task.status === CompensationTaskStatus.COMPLETED ||
          task.status === CompensationTaskStatus.FAILED) &&
        task.completedAt &&
        task.completedAt < beforeDate
      ) {
        tasksToDelete.push(taskId);
        cleanedCount++;
      }
    }

    for (const taskId of tasksToDelete) {
      this.compensationTasks.delete(taskId);
    }

    this.logger.debug(`清理补偿任务完成`, { cleanedCount, beforeDate });
    return cleanedCount;
  }

  /**
   * 销毁补偿管理器
   * @description 清理定时器和资源
   */
  public destroy(): void {
    if (this.executionTimer) {
      clearInterval(this.executionTimer);
    }

    this.logger.debug("Saga补偿管理器已销毁");
  }

  // 私有方法

  /**
   * 初始化执行定时器
   * @description 设置补偿任务的执行定时器
   */
  private initializeExecutionTimer(): void {
    if (
      this.config.strategy === CompensationStrategy.DELAYED ||
      this.config.strategy === CompensationStrategy.BATCH
    ) {
      this.executionTimer = setInterval(() => {
        this.processPendingTasks().catch((error) => {
          this.logger.error("处理待执行补偿任务失败", {
            error: error instanceof Error ? error.message : String(error),
          });
        });
      }, 1000); // 每秒检查一次
    }
  }

  /**
   * 处理待执行的补偿任务
   * @returns 处理结果
   */
  private async processPendingTasks(): Promise<void> {
    const now = new Date();
    const pendingTasks = await this.getPendingTasks(
      this.config.maxParallelCompensations,
    );

    for (const task of pendingTasks) {
      if (task.scheduledAt <= now) {
        if (this.config.parallelCompensation) {
          // 并行执行
          this.executeCompensationTask(task.taskId).catch((error) => {
            this.logger.error(`并行补偿执行失败: ${task.taskId}`, {
              error: error instanceof Error ? error.message : String(error),
            });
          });
        } else {
          // 串行执行
          await this.executeCompensationTask(task.taskId);
        }
      }
    }
  }

  /**
   * 执行补偿步骤
   * @param snapshot Saga状态快照
   * @returns 步骤结果
   */
  private async executeCompensationSteps(snapshot: SagaStateSnapshot): Promise<
    Array<{
      stepName: string;
      success: boolean;
      error?: string;
      executionTime: number;
    }>
  > {
    const stepResults: Array<{
      stepName: string;
      success: boolean;
      error?: string;
      executionTime: number;
    }> = [];

    // 按相反顺序执行补偿步骤
    for (let i = snapshot.stepStates.length - 1; i >= 0; i--) {
      const stepState = snapshot.stepStates[i];
      const startTime = Date.now();

      try {
        // TODO: 实际执行补偿步骤
        // 这里需要根据具体的步骤类型来执行补偿逻辑
        await this.delay(100); // 模拟执行时间

        stepResults.push({
          stepName: stepState.stepName,
          success: true,
          executionTime: Date.now() - startTime,
        });
      } catch (error) {
        stepResults.push({
          stepName: stepState.stepName,
          success: false,
          error: error instanceof Error ? error.message : String(error),
          executionTime: Date.now() - startTime,
        });
      }
    }

    return stepResults;
  }

  /**
   * 更新统计信息
   * @param task 补偿任务
   */
  private updateStatistics(task: CompensationTask): void {
    // 更新总数
    if (
      task.status === CompensationTaskStatus.PENDING &&
      task.retryCount === 0
    ) {
      this.statistics.totalTasks++;
    }

    // 更新成功/失败计数
    if (task.status === CompensationTaskStatus.COMPLETED) {
      this.statistics.successCount++;
    } else if (task.status === CompensationTaskStatus.FAILED) {
      this.statistics.failureCount++;
    }

    // 更新重试计数
    if (task.status === CompensationTaskStatus.RETRYING) {
      this.statistics.retryCount++;
    }

    // 更新策略统计
    this.statistics.byStrategy[this.config.strategy]++;

    // 更新状态统计
    this.statistics.byStatus[task.status]++;

    // 更新最后补偿时间
    if (task.status === CompensationTaskStatus.COMPLETED) {
      this.statistics.lastCompensationAt = task.completedAt;
    }
  }

  /**
   * 延迟执行
   * @param ms 延迟时间（毫秒）
   * @returns Promise
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
