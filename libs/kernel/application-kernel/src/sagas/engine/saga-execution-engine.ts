/**
 * @fileoverview Saga执行引擎
 * @description 提供Saga的执行、管理和监控功能
 */

import { Logger } from "@hl8/logger";
// EntityId, SagaConfig, SagaStateSnapshot 暂时未使用，但保留导入以备将来使用
import { Saga, SagaStatus, SagaStatistics } from "../base/saga.base.js";
import { SagaStateManager } from "../base/saga-state.js";

/**
 * Saga执行配置
 * @description Saga执行引擎的配置选项
 */
export interface SagaExecutionConfig {
  /** 最大并发Saga数量 */
  maxConcurrentSagas: number;
  /** 执行超时时间（毫秒） */
  executionTimeout: number;
  /** 状态保存间隔（毫秒） */
  stateSaveInterval: number;
  /** 是否启用自动恢复 */
  autoRecovery: boolean;
  /** 恢复检查间隔（毫秒） */
  recoveryCheckInterval: number;
  /** 是否启用性能监控 */
  performanceMonitoring: boolean;
  /** 清理配置 */
  cleanup: {
    enabled: boolean;
    interval: number;
    retentionDays: number;
  };
}

/**
 * Saga执行结果
 * @description Saga执行的结果信息
 */
export interface SagaExecutionResult {
  /** 是否成功 */
  success: boolean;
  /** Saga ID */
  sagaId: string;
  /** 执行时间（毫秒） */
  executionTime: number;
  /** 错误信息 */
  error?: string;
  /** 结果数据 */
  data?: unknown;
  /** 事件列表 */
  events: Array<{
    type: string;
    timestamp: Date;
    data: unknown;
  }>;
}

/**
 * Saga执行统计
 * @description Saga执行的统计信息
 */
export interface SagaExecutionStatistics {
  /** 总执行次数 */
  totalExecutions: number;
  /** 成功次数 */
  successCount: number;
  /** 失败次数 */
  failureCount: number;
  /** 补偿次数 */
  compensationCount: number;
  /** 当前运行中的Saga数量 */
  runningSagas: number;
  /** 平均执行时间（毫秒） */
  averageExecutionTime: number;
  /** 最后执行时间 */
  lastExecutedAt?: Date;
  /** 按状态分组的统计 */
  byStatus: Record<SagaStatus, number>;
}

/**
 * Saga执行引擎接口
 * @description 定义Saga执行引擎的接口
 */
export interface ISagaExecutionEngine {
  /**
   * 执行Saga
   * @param saga Saga实例
   * @param data 执行数据
   * @returns 执行结果
   */
  execute<TData>(saga: Saga<TData>, data: TData): Promise<SagaExecutionResult>;

  /**
   * 暂停Saga
   * @param sagaId Saga ID
   * @returns 暂停结果
   */
  pause(sagaId: string): Promise<void>;

  /**
   * 恢复Saga
   * @param sagaId Saga ID
   * @returns 恢复结果
   */
  resume(sagaId: string): Promise<void>;

  /**
   * 取消Saga
   * @param sagaId Saga ID
   * @param reason 取消原因
   * @returns 取消结果
   */
  cancel(sagaId: string, reason?: string): Promise<void>;

  /**
   * 补偿Saga
   * @param sagaId Saga ID
   * @param reason 补偿原因
   * @returns 补偿结果
   */
  compensate(sagaId: string, reason?: string): Promise<void>;

  /**
   * 获取Saga状态
   * @param sagaId Saga ID
   * @returns Saga状态
   */
  getSagaStatus(sagaId: string): Promise<SagaStatus | undefined>;

  /**
   * 获取Saga统计信息
   * @param sagaId Saga ID
   * @returns 统计信息
   */
  getSagaStatistics(sagaId: string): Promise<SagaStatistics | undefined>;

  /**
   * 获取执行引擎统计信息
   * @returns 执行统计
   */
  getExecutionStatistics(): Promise<SagaExecutionStatistics>;

  /**
   * 获取所有运行中的Saga
   * @returns 运行中的Saga列表
   */
  getRunningSagas(): Promise<Array<{ sagaId: string; status: SagaStatus }>>;

  /**
   * 恢复失败的Saga
   * @param sagaId Saga ID
   * @returns 恢复结果
   */
  recoverSaga(sagaId: string): Promise<void>;

  /**
   * 清理过期的Saga
   * @param beforeDate 清理此日期之前的Saga
   * @returns 清理数量
   */
  cleanup(beforeDate: Date): Promise<number>;
}

/**
 * Saga执行引擎实现
 * @description 提供Saga的执行、管理和监控功能
 */
export class SagaExecutionEngine implements ISagaExecutionEngine {
  private readonly logger: Logger;
  private readonly stateManager: SagaStateManager;
  private readonly config: SagaExecutionConfig;
  private readonly runningSagas: Map<string, Saga<unknown>> = new Map();
  private readonly executionStatistics: SagaExecutionStatistics;
  private stateSaveTimer?: NodeJS.Timeout;
  private recoveryTimer?: NodeJS.Timeout;
  private cleanupTimer?: NodeJS.Timeout;

  constructor(
    logger: Logger,
    stateManager: SagaStateManager,
    config: Partial<SagaExecutionConfig> = {},
  ) {
    this.logger = logger;
    this.stateManager = stateManager;
    this.config = {
      maxConcurrentSagas: 100,
      executionTimeout: 300000, // 5分钟
      stateSaveInterval: 5000, // 5秒
      autoRecovery: true,
      recoveryCheckInterval: 30000, // 30秒
      performanceMonitoring: true,
      cleanup: {
        enabled: true,
        interval: 3600000, // 1小时
        retentionDays: 7,
      },
      ...config,
    };

    this.executionStatistics = {
      totalExecutions: 0,
      successCount: 0,
      failureCount: 0,
      compensationCount: 0,
      runningSagas: 0,
      averageExecutionTime: 0,
      byStatus: {
        [SagaStatus.NOT_STARTED]: 0,
        [SagaStatus.RUNNING]: 0,
        [SagaStatus.COMPLETED]: 0,
        [SagaStatus.FAILED]: 0,
        [SagaStatus.COMPENSATED]: 0,
        [SagaStatus.PAUSED]: 0,
        [SagaStatus.CANCELLED]: 0,
      },
    };

    this.initializeTimers();
  }

  /**
   * 执行Saga
   * @param saga Saga实例
   * @param data 执行数据
   * @returns 执行结果
   */
  public async execute<TData>(
    saga: Saga<TData>,
    data: TData,
  ): Promise<SagaExecutionResult> {
    const sagaId = saga.getSagaId().toString();
    const startTime = Date.now();

    // 检查并发限制
    if (this.runningSagas.size >= this.config.maxConcurrentSagas) {
      throw new Error(
        `已达到最大并发Saga数量限制: ${this.config.maxConcurrentSagas}`,
      );
    }

    // 检查Saga是否已在运行
    if (this.runningSagas.has(sagaId)) {
      throw new Error(`Saga ${sagaId} 已在运行中`);
    }

    try {
      this.logger.debug(`开始执行Saga: ${sagaId}`, {
        sagaName: saga.getName(),
        dataKeys: Object.keys(data as Record<string, unknown>),
      });

      // 添加到运行列表
      this.runningSagas.set(sagaId, saga as Saga<unknown>);
      this.executionStatistics.runningSagas++;
      this.executionStatistics.byStatus[SagaStatus.RUNNING]++;

      // 执行Saga
      await saga.execute(data);

      const executionTime = Date.now() - startTime;
      this.updateExecutionStatistics(true, executionTime);

      const result: SagaExecutionResult = {
        success: true,
        sagaId,
        executionTime,
        data: saga.getContext().data,
        events: [], // TODO: 实现事件收集
      };

      this.logger.debug(`Saga执行成功: ${sagaId}`, {
        executionTime,
        sagaName: saga.getName(),
      });

      return result;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.updateExecutionStatistics(false, executionTime);

      const result: SagaExecutionResult = {
        success: false,
        sagaId,
        executionTime,
        error: error instanceof Error ? error.message : String(error),
        events: [], // TODO: 实现事件收集
      };

      this.logger.error(`Saga执行失败: ${sagaId}`, {
        error: result.error,
        executionTime,
        sagaName: saga.getName(),
      });

      return result;
    } finally {
      // 从运行列表移除
      this.runningSagas.delete(sagaId);
      this.executionStatistics.runningSagas--;
      this.executionStatistics.byStatus[SagaStatus.RUNNING]--;
    }
  }

  /**
   * 暂停Saga
   * @param sagaId Saga ID
   * @returns 暂停结果
   */
  public async pause(sagaId: string): Promise<void> {
    const saga = this.runningSagas.get(sagaId);
    if (!saga) {
      throw new Error(`未找到运行中的Saga: ${sagaId}`);
    }

    try {
      await saga.pause();
      this.executionStatistics.byStatus[SagaStatus.RUNNING]--;
      this.executionStatistics.byStatus[SagaStatus.PAUSED]++;

      this.logger.debug(`Saga已暂停: ${sagaId}`);
    } catch (error) {
      this.logger.error(`暂停Saga失败: ${sagaId}`, {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * 恢复Saga
   * @param sagaId Saga ID
   * @returns 恢复结果
   */
  public async resume(sagaId: string): Promise<void> {
    const saga = this.runningSagas.get(sagaId);
    if (!saga) {
      throw new Error(`未找到运行中的Saga: ${sagaId}`);
    }

    try {
      await saga.resume();
      this.executionStatistics.byStatus[SagaStatus.PAUSED]--;
      this.executionStatistics.byStatus[SagaStatus.RUNNING]++;

      this.logger.debug(`Saga已恢复: ${sagaId}`);
    } catch (error) {
      this.logger.error(`恢复Saga失败: ${sagaId}`, {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * 取消Saga
   * @param sagaId Saga ID
   * @param reason 取消原因
   * @returns 取消结果
   */
  public async cancel(sagaId: string, reason?: string): Promise<void> {
    const saga = this.runningSagas.get(sagaId);
    if (!saga) {
      throw new Error(`未找到运行中的Saga: ${sagaId}`);
    }

    try {
      await saga.cancel(reason);
      this.runningSagas.delete(sagaId);
      this.executionStatistics.runningSagas--;
      this.executionStatistics.byStatus[SagaStatus.RUNNING]--;
      this.executionStatistics.byStatus[SagaStatus.CANCELLED]++;

      this.logger.debug(`Saga已取消: ${sagaId}`, { reason });
    } catch (error) {
      this.logger.error(`取消Saga失败: ${sagaId}`, {
        error: error instanceof Error ? error.message : String(error),
        reason,
      });
      throw error;
    }
  }

  /**
   * 补偿Saga
   * @param sagaId Saga ID
   * @param reason 补偿原因
   * @returns 补偿结果
   */
  public async compensate(sagaId: string, reason?: string): Promise<void> {
    const saga = this.runningSagas.get(sagaId);
    if (!saga) {
      throw new Error(`未找到运行中的Saga: ${sagaId}`);
    }

    try {
      await saga.compensate(reason);
      this.executionStatistics.compensationCount++;
      this.executionStatistics.byStatus[SagaStatus.COMPENSATED]++;

      this.logger.debug(`Saga已补偿: ${sagaId}`, { reason });
    } catch (error) {
      this.logger.error(`补偿Saga失败: ${sagaId}`, {
        error: error instanceof Error ? error.message : String(error),
        reason,
      });
      throw error;
    }
  }

  /**
   * 获取Saga状态
   * @param sagaId Saga ID
   * @returns Saga状态
   */
  public async getSagaStatus(sagaId: string): Promise<SagaStatus | undefined> {
    const saga = this.runningSagas.get(sagaId);
    if (saga) {
      return saga.getStatus();
    }

    // 从状态存储中获取
    const snapshot = await this.stateManager.getById(sagaId);
    return snapshot?.status;
  }

  /**
   * 获取Saga统计信息
   * @param sagaId Saga ID
   * @returns 统计信息
   */
  public async getSagaStatistics(
    sagaId: string,
  ): Promise<SagaStatistics | undefined> {
    const saga = this.runningSagas.get(sagaId);
    if (saga) {
      return saga.getStatistics();
    }

    // 从状态存储中获取
    const snapshot = await this.stateManager.getById(sagaId);
    if (snapshot) {
      return {
        name: snapshot.sagaId,
        executionCount: 0, // TODO: 从快照中恢复
        successCount: 0,
        failureCount: 0,
        compensationCount: 0,
        averageExecutionTime: 0,
        status: snapshot.status,
      };
    }

    return undefined;
  }

  /**
   * 获取执行引擎统计信息
   * @returns 执行统计
   */
  public async getExecutionStatistics(): Promise<SagaExecutionStatistics> {
    return { ...this.executionStatistics };
  }

  /**
   * 获取所有运行中的Saga
   * @returns 运行中的Saga列表
   */
  public async getRunningSagas(): Promise<
    Array<{ sagaId: string; status: SagaStatus }>
  > {
    return Array.from(this.runningSagas.entries()).map(([sagaId, saga]) => ({
      sagaId,
      status: saga.getStatus(),
    }));
  }

  /**
   * 恢复失败的Saga
   * @param sagaId Saga ID
   * @returns 恢复结果
   */
  public async recoverSaga(sagaId: string): Promise<void> {
    try {
      const snapshot = await this.stateManager.getById(sagaId);
      if (!snapshot) {
        throw new Error(`未找到Saga状态快照: ${sagaId}`);
      }

      if (snapshot.status !== SagaStatus.FAILED) {
        throw new Error(`Saga状态不是失败状态: ${snapshot.status}`);
      }

      // TODO: 实现Saga恢复逻辑
      this.logger.debug(`开始恢复Saga: ${sagaId}`);
    } catch (error) {
      this.logger.error(`恢复Saga失败: ${sagaId}`, {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * 清理过期的Saga
   * @param beforeDate 清理此日期之前的Saga
   * @returns 清理数量
   */
  public async cleanup(beforeDate: Date): Promise<number> {
    try {
      const count = await this.stateManager.cleanup(beforeDate);
      this.logger.debug(`清理过期Saga完成`, { count, beforeDate });
      return count;
    } catch (error) {
      this.logger.error(`清理过期Saga失败`, {
        error: error instanceof Error ? error.message : String(error),
        beforeDate,
      });
      throw error;
    }
  }

  /**
   * 销毁执行引擎
   * @description 清理定时器和资源
   */
  public destroy(): void {
    if (this.stateSaveTimer) {
      clearInterval(this.stateSaveTimer);
    }
    if (this.recoveryTimer) {
      clearInterval(this.recoveryTimer);
    }
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }

    this.logger.debug("Saga执行引擎已销毁");
  }

  // 私有方法

  /**
   * 初始化定时器
   * @description 设置状态保存、恢复检查和清理定时器
   */
  private initializeTimers(): void {
    // 状态保存定时器
    this.stateSaveTimer = setInterval(() => {
      this.saveStates().catch((error) => {
        this.logger.error("保存Saga状态失败", {
          error: error instanceof Error ? error.message : String(error),
        });
      });
    }, this.config.stateSaveInterval);

    // 恢复检查定时器
    if (this.config.autoRecovery) {
      this.recoveryTimer = setInterval(() => {
        this.checkAndRecoverSagas().catch((error) => {
          this.logger.error("检查Saga恢复失败", {
            error: error instanceof Error ? error.message : String(error),
          });
        });
      }, this.config.recoveryCheckInterval);
    }

    // 清理定时器
    if (this.config.cleanup.enabled) {
      this.cleanupTimer = setInterval(() => {
        const beforeDate = new Date();
        beforeDate.setDate(
          beforeDate.getDate() - this.config.cleanup.retentionDays,
        );
        this.cleanup(beforeDate).catch((error) => {
          this.logger.error("清理过期Saga失败", {
            error: error instanceof Error ? error.message : String(error),
          });
        });
      }, this.config.cleanup.interval);
    }
  }

  /**
   * 保存所有运行中Saga的状态
   * @returns 保存结果
   */
  private async saveStates(): Promise<void> {
    for (const [sagaId, saga] of this.runningSagas) {
      try {
        const snapshot = this.stateManager.createSnapshot(
          saga.getSagaId(),
          saga.getContext().aggregateId,
          saga.getStatus(),
          saga.getContext(),
          saga.getSteps().map((step, index) => ({
            stepIndex: index,
            stepName: step.getName(),
            status: step.getStatus(),
            executedAt: new Date(), // TODO: 从步骤中获取实际时间
          })),
        );

        await this.stateManager.save(snapshot);
      } catch (error) {
        this.logger.error(`保存Saga状态失败: ${sagaId}`, {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  /**
   * 检查并恢复失败的Saga
   * @returns 恢复结果
   */
  private async checkAndRecoverSagas(): Promise<void> {
    try {
      const failedSnapshots = await this.stateManager.query({
        status: SagaStatus.FAILED,
        pagination: { page: 1, pageSize: 100 },
      });

      for (const snapshot of failedSnapshots.snapshots) {
        try {
          await this.recoverSaga(snapshot.sagaId);
        } catch (error) {
          this.logger.error(`恢复Saga失败: ${snapshot.sagaId}`, {
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
    } catch (error) {
      this.logger.error("检查失败Saga时出错", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * 更新执行统计信息
   * @param success 是否成功
   * @param executionTime 执行时间
   */
  private updateExecutionStatistics(
    success: boolean,
    executionTime: number,
  ): void {
    this.executionStatistics.totalExecutions++;
    this.executionStatistics.lastExecutedAt = new Date();

    if (success) {
      this.executionStatistics.successCount++;
    } else {
      this.executionStatistics.failureCount++;
    }

    // 更新平均执行时间
    const totalExecutions =
      this.executionStatistics.successCount +
      this.executionStatistics.failureCount;
    if (totalExecutions > 0) {
      this.executionStatistics.averageExecutionTime =
        (this.executionStatistics.averageExecutionTime * (totalExecutions - 1) +
          executionTime) /
        totalExecutions;
    }
  }
}
