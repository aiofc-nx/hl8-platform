/**
 * @fileoverview Saga状态管理
 * @description 提供Saga状态的管理和持久化功能
 */

import { Logger } from "@hl8/logger";
import { EntityId } from "@hl8/domain-kernel";
import { SagaStatus, SagaStepStatus, SagaContext } from "./saga.base.js";

/**
 * Saga状态快照
 * @description Saga状态的快照，用于持久化和恢复
 */
export interface SagaStateSnapshot {
  /** Saga ID */
  sagaId: string;
  /** 关联的聚合根ID */
  aggregateId: string;
  /** Saga状态 */
  status: SagaStatus;
  /** 当前步骤索引 */
  currentStepIndex: number;
  /** 创建时间 */
  createdAt: Date;
  /** 最后更新时间 */
  updatedAt: Date;
  /** 执行开始时间 */
  startTime: Date;
  /** 完成时间 */
  completedAt?: Date;
  /** 失败时间 */
  failedAt?: Date;
  /** 补偿时间 */
  compensatedAt?: Date;
  /** 暂停时间 */
  pausedAt?: Date;
  /** 取消时间 */
  cancelledAt?: Date;
  /** 上下文数据 */
  contextData: Record<string, unknown>;
  /** 错误信息 */
  error?: string;
  /** 补偿原因 */
  compensationReason?: string;
  /** 步骤状态 */
  stepStates: Array<{
    stepIndex: number;
    stepName: string;
    status: SagaStepStatus;
    executedAt?: Date;
    failedAt?: Date;
    compensatedAt?: Date;
    error?: string;
  }>;
  /** 版本号 */
  version: number;
}

/**
 * Saga状态查询条件
 * @description 用于查询Saga状态的条件
 */
export interface SagaStateQuery {
  /** Saga ID */
  sagaId?: string;
  /** 关联的聚合根ID */
  aggregateId?: string;
  /** Saga状态 */
  status?: SagaStatus;
  /** 创建时间范围 */
  createdAtRange?: {
    start: Date;
    end: Date;
  };
  /** 最后更新时间范围 */
  updatedAtRange?: {
    start: Date;
    end: Date;
  };
  /** 分页参数 */
  pagination?: {
    page: number;
    pageSize: number;
  };
  /** 排序参数 */
  sort?: {
    field: string;
    direction: "asc" | "desc";
  };
}

/**
 * Saga状态查询结果
 * @description Saga状态查询的结果
 */
export interface SagaStateQueryResult {
  /** 状态快照列表 */
  snapshots: SagaStateSnapshot[];
  /** 分页信息 */
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  /** 元数据 */
  metadata?: {
    queryTime: number;
    lastUpdated: Date;
  };
}

/**
 * Saga状态存储接口
 * @description 定义Saga状态存储的接口
 */
export interface ISagaStateStore {
  /**
   * 保存Saga状态
   * @param snapshot 状态快照
   * @returns 保存结果
   */
  save(snapshot: SagaStateSnapshot): Promise<void>;

  /**
   * 根据ID获取Saga状态
   * @param sagaId Saga ID
   * @returns 状态快照
   */
  getById(sagaId: string): Promise<SagaStateSnapshot | undefined>;

  /**
   * 根据聚合根ID获取Saga状态
   * @param aggregateId 聚合根ID
   * @returns 状态快照列表
   */
  getByAggregateId(aggregateId: string): Promise<SagaStateSnapshot[]>;

  /**
   * 查询Saga状态
   * @param query 查询条件
   * @returns 查询结果
   */
  query(query: SagaStateQuery): Promise<SagaStateQueryResult>;

  /**
   * 更新Saga状态
   * @param sagaId Saga ID
   * @param updates 更新内容
   * @returns 更新结果
   */
  update(sagaId: string, updates: Partial<SagaStateSnapshot>): Promise<void>;

  /**
   * 删除Saga状态
   * @param sagaId Saga ID
   * @returns 删除结果
   */
  delete(sagaId: string): Promise<void>;

  /**
   * 清理过期的Saga状态
   * @param beforeDate 清理此日期之前的状态
   * @returns 清理结果
   */
  cleanup(beforeDate: Date): Promise<number>;
}

/**
 * Saga状态管理器
 * @description 管理Saga状态的生命周期
 */
export class SagaStateManager {
  private readonly logger: Logger;
  private readonly stateStore: ISagaStateStore;
  private readonly autoSave: boolean;
  private readonly saveInterval: number;

  constructor(
    logger: Logger,
    stateStore: ISagaStateStore,
    autoSave: boolean = true,
    saveInterval: number = 5000, // 5秒
  ) {
    this.logger = logger;
    this.stateStore = stateStore;
    this.autoSave = autoSave;
    this.saveInterval = saveInterval;
  }

  /**
   * 创建Saga状态快照
   * @param sagaId Saga ID
   * @param aggregateId 聚合根ID
   * @param status Saga状态
   * @param context Saga上下文
   * @param stepStates 步骤状态
   * @returns 状态快照
   */
  public createSnapshot(
    sagaId: EntityId,
    aggregateId: EntityId,
    status: SagaStatus,
    context: SagaContext,
    stepStates: Array<{
      stepIndex: number;
      stepName: string;
      status: SagaStepStatus;
      executedAt?: Date;
      failedAt?: Date;
      compensatedAt?: Date;
      error?: string;
    }>,
  ): SagaStateSnapshot {
    const now = new Date();

    return {
      sagaId: sagaId.toString(),
      aggregateId: aggregateId.toString(),
      status,
      currentStepIndex: context.currentStepIndex,
      createdAt: now,
      updatedAt: now,
      startTime: context.startTime,
      completedAt: status === SagaStatus.COMPLETED ? now : undefined,
      failedAt: status === SagaStatus.FAILED ? now : undefined,
      compensatedAt: status === SagaStatus.COMPENSATED ? now : undefined,
      pausedAt: status === SagaStatus.PAUSED ? now : undefined,
      cancelledAt: status === SagaStatus.CANCELLED ? now : undefined,
      contextData: context.data,
      error: context.error,
      compensationReason: context.compensationReason,
      stepStates,
      version: 1,
    };
  }

  /**
   * 保存Saga状态
   * @param snapshot 状态快照
   * @returns 保存结果
   */
  public async save(snapshot: SagaStateSnapshot): Promise<void> {
    try {
      await this.stateStore.save(snapshot);
      this.logger.debug(`Saga状态已保存: ${snapshot.sagaId}`, {
        status: snapshot.status,
        stepIndex: snapshot.currentStepIndex,
      });
    } catch (error) {
      this.logger.error(`保存Saga状态失败: ${snapshot.sagaId}`, {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * 根据ID获取Saga状态
   * @param sagaId Saga ID
   * @returns 状态快照
   */
  public async getById(sagaId: string): Promise<SagaStateSnapshot | undefined> {
    try {
      const snapshot = await this.stateStore.getById(sagaId);
      if (snapshot) {
        this.logger.debug(`获取Saga状态成功: ${sagaId}`, {
          status: snapshot.status,
          stepIndex: snapshot.currentStepIndex,
        });
      }
      return snapshot;
    } catch (error) {
      this.logger.error(`获取Saga状态失败: ${sagaId}`, {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * 根据聚合根ID获取Saga状态
   * @param aggregateId 聚合根ID
   * @returns 状态快照列表
   */
  public async getByAggregateId(
    aggregateId: string,
  ): Promise<SagaStateSnapshot[]> {
    try {
      const snapshots = await this.stateStore.getByAggregateId(aggregateId);
      this.logger.debug(`获取聚合根Saga状态成功: ${aggregateId}`, {
        count: snapshots.length,
      });
      return snapshots;
    } catch (error) {
      this.logger.error(`获取聚合根Saga状态失败: ${aggregateId}`, {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * 查询Saga状态
   * @param query 查询条件
   * @returns 查询结果
   */
  public async query(query: SagaStateQuery): Promise<SagaStateQueryResult> {
    try {
      const result = await this.stateStore.query(query);
      this.logger.debug(`查询Saga状态成功`, {
        count: result.snapshots.length,
        query,
      });
      return result;
    } catch (error) {
      this.logger.error(`查询Saga状态失败`, {
        error: error instanceof Error ? error.message : String(error),
        query,
      });
      throw error;
    }
  }

  /**
   * 更新Saga状态
   * @param sagaId Saga ID
   * @param updates 更新内容
   * @returns 更新结果
   */
  public async update(
    sagaId: string,
    updates: Partial<SagaStateSnapshot>,
  ): Promise<void> {
    try {
      const updateData = {
        ...updates,
        updatedAt: new Date(),
        version: (updates.version || 1) + 1,
      };

      await this.stateStore.update(sagaId, updateData);
      this.logger.debug(`更新Saga状态成功: ${sagaId}`, {
        updates: Object.keys(updates),
      });
    } catch (error) {
      this.logger.error(`更新Saga状态失败: ${sagaId}`, {
        error: error instanceof Error ? error.message : String(error),
        updates: Object.keys(updates),
      });
      throw error;
    }
  }

  /**
   * 删除Saga状态
   * @param sagaId Saga ID
   * @returns 删除结果
   */
  public async delete(sagaId: string): Promise<void> {
    try {
      await this.stateStore.delete(sagaId);
      this.logger.debug(`删除Saga状态成功: ${sagaId}`);
    } catch (error) {
      this.logger.error(`删除Saga状态失败: ${sagaId}`, {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * 清理过期的Saga状态
   * @param beforeDate 清理此日期之前的状态
   * @returns 清理的数量
   */
  public async cleanup(beforeDate: Date): Promise<number> {
    try {
      const count = await this.stateStore.cleanup(beforeDate);
      this.logger.debug(`清理过期Saga状态成功`, {
        count,
        beforeDate,
      });
      return count;
    } catch (error) {
      this.logger.error(`清理过期Saga状态失败`, {
        error: error instanceof Error ? error.message : String(error),
        beforeDate,
      });
      throw error;
    }
  }

  /**
   * 恢复Saga状态
   * @param snapshot 状态快照
   * @returns 恢复的上下文
   */
  public restoreFromSnapshot(snapshot: SagaStateSnapshot): SagaContext {
    return {
      sagaId: new EntityId(snapshot.sagaId),
      aggregateId: new EntityId(snapshot.aggregateId),
      currentStepIndex: snapshot.currentStepIndex,
      startTime: snapshot.startTime,
      lastUpdateTime: snapshot.updatedAt,
      data: snapshot.contextData,
      error: snapshot.error,
      compensationReason: snapshot.compensationReason,
    };
  }

  /**
   * 检查Saga状态是否存在
   * @param sagaId Saga ID
   * @returns 是否存在
   */
  public async exists(sagaId: string): Promise<boolean> {
    const snapshot = await this.getById(sagaId);
    return snapshot !== undefined;
  }

  /**
   * 获取Saga状态统计信息
   * @param aggregateId 聚合根ID（可选）
   * @returns 统计信息
   */
  public async getStatistics(aggregateId?: string): Promise<{
    total: number;
    byStatus: Record<SagaStatus, number>;
    byDate: Array<{
      date: string;
      count: number;
    }>;
  }> {
    try {
      const query: SagaStateQuery = aggregateId ? { aggregateId } : {};
      const result = await this.query(query);

      const byStatus: Record<SagaStatus, number> = {
        [SagaStatus.NOT_STARTED]: 0,
        [SagaStatus.RUNNING]: 0,
        [SagaStatus.COMPLETED]: 0,
        [SagaStatus.FAILED]: 0,
        [SagaStatus.COMPENSATED]: 0,
        [SagaStatus.PAUSED]: 0,
        [SagaStatus.CANCELLED]: 0,
      };

      const byDate: Record<string, number> = {};

      for (const snapshot of result.snapshots) {
        byStatus[snapshot.status]++;

        const date = snapshot.createdAt.toISOString().split("T")[0];
        byDate[date] = (byDate[date] || 0) + 1;
      }

      return {
        total: result.snapshots.length,
        byStatus,
        byDate: Object.entries(byDate).map(([date, count]) => ({
          date,
          count,
        })),
      };
    } catch (error) {
      this.logger.error(`获取Saga状态统计信息失败`, {
        error: error instanceof Error ? error.message : String(error),
        aggregateId,
      });
      throw error;
    }
  }
}
