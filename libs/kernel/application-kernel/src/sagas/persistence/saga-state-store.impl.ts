/**
 * @fileoverview Saga状态存储实现
 * @description 提供Saga状态的持久化存储实现
 */

import { Logger } from "@hl8/logger";
import {
  ISagaStateStore,
  SagaStateSnapshot,
  SagaStateQuery,
  SagaStateQueryResult,
} from "../base/saga-state.js";

/**
 * 内存Saga状态存储实现
 * @description 使用内存存储Saga状态，适用于开发和测试环境
 */
export class InMemorySagaStateStore implements ISagaStateStore {
  private readonly logger: Logger;
  private readonly snapshots: Map<string, SagaStateSnapshot> = new Map();
  private readonly aggregateIndex: Map<string, Set<string>> = new Map();

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * 保存Saga状态
   * @param snapshot 状态快照
   * @returns 保存结果
   */
  public async save(snapshot: SagaStateSnapshot): Promise<void> {
    try {
      this.snapshots.set(snapshot.sagaId, snapshot);

      // 更新聚合根索引
      const aggregateId = snapshot.aggregateId;
      if (!this.aggregateIndex.has(aggregateId)) {
        this.aggregateIndex.set(aggregateId, new Set());
      }
      this.aggregateIndex.get(aggregateId)!.add(snapshot.sagaId);

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
      const snapshot = this.snapshots.get(sagaId);
      if (snapshot) {
        this.logger.debug(`获取Saga状态成功: ${sagaId}`, {
          status: snapshot.status,
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
      const sagaIds = this.aggregateIndex.get(aggregateId) || new Set();
      const snapshots = Array.from(sagaIds)
        .map((sagaId) => this.snapshots.get(sagaId))
        .filter(
          (snapshot): snapshot is SagaStateSnapshot => snapshot !== undefined,
        );

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
      let snapshots = Array.from(this.snapshots.values());

      // 应用过滤条件
      if (query.sagaId) {
        snapshots = snapshots.filter((s) => s.sagaId === query.sagaId);
      }
      if (query.aggregateId) {
        snapshots = snapshots.filter(
          (s) => s.aggregateId === query.aggregateId,
        );
      }
      if (query.status) {
        snapshots = snapshots.filter((s) => s.status === query.status);
      }
      if (query.createdAtRange) {
        snapshots = snapshots.filter(
          (s) =>
            s.createdAt >= query.createdAtRange!.start &&
            s.createdAt <= query.createdAtRange!.end,
        );
      }
      if (query.updatedAtRange) {
        snapshots = snapshots.filter(
          (s) =>
            s.updatedAt >= query.updatedAtRange!.start &&
            s.updatedAt <= query.updatedAtRange!.end,
        );
      }

      // 应用排序
      if (query.sort) {
        snapshots.sort((a, b) => {
          const aValue = (a as unknown as Record<string, unknown>)[
            query.sort!.field
          ];
          const bValue = (b as unknown as Record<string, unknown>)[
            query.sort!.field
          ];

          if (aValue < bValue) return query.sort!.direction === "asc" ? -1 : 1;
          if (aValue > bValue) return query.sort!.direction === "asc" ? 1 : -1;
          return 0;
        });
      }

      // 应用分页
      let pagination;
      if (query.pagination) {
        const { page, pageSize } = query.pagination;
        const startIndex = (page - 1) * pageSize;
        const endIndex = startIndex + pageSize;
        snapshots = snapshots.slice(startIndex, endIndex);

        pagination = {
          page,
          pageSize,
          total: this.snapshots.size,
          totalPages: Math.ceil(this.snapshots.size / pageSize),
        };
      }

      const result: SagaStateQueryResult = {
        snapshots,
        pagination,
        metadata: {
          queryTime: Date.now(),
          lastUpdated: new Date(),
        },
      };

      this.logger.debug(`查询Saga状态成功`, {
        count: snapshots.length,
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
      const existingSnapshot = this.snapshots.get(sagaId);
      if (!existingSnapshot) {
        throw new Error(`未找到Saga状态: ${sagaId}`);
      }

      const updatedSnapshot = { ...existingSnapshot, ...updates };
      this.snapshots.set(sagaId, updatedSnapshot);

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
      const snapshot = this.snapshots.get(sagaId);
      if (snapshot) {
        // 从聚合根索引中移除
        const aggregateId = snapshot.aggregateId;
        const sagaIds = this.aggregateIndex.get(aggregateId);
        if (sagaIds) {
          sagaIds.delete(sagaId);
          if (sagaIds.size === 0) {
            this.aggregateIndex.delete(aggregateId);
          }
        }

        this.snapshots.delete(sagaId);
        this.logger.debug(`删除Saga状态成功: ${sagaId}`);
      }
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
   * @returns 清理数量
   */
  public async cleanup(beforeDate: Date): Promise<number> {
    try {
      let cleanedCount = 0;
      const snapshotsToDelete: string[] = [];

      for (const [sagaId, snapshot] of this.snapshots) {
        if (snapshot.createdAt < beforeDate) {
          snapshotsToDelete.push(sagaId);
          cleanedCount++;
        }
      }

      for (const sagaId of snapshotsToDelete) {
        await this.delete(sagaId);
      }

      this.logger.debug(`清理过期Saga状态完成`, {
        cleanedCount,
        beforeDate,
      });

      return cleanedCount;
    } catch (error) {
      this.logger.error(`清理过期Saga状态失败`, {
        error: error instanceof Error ? error.message : String(error),
        beforeDate,
      });
      throw error;
    }
  }

  /**
   * 获取存储统计信息
   * @returns 统计信息
   */
  public getStorageStatistics(): {
    totalSnapshots: number;
    byStatus: Record<string, number>;
    byAggregateId: Record<string, number>;
  } {
    const byStatus: Record<string, number> = {};
    const byAggregateId: Record<string, number> = {};

    for (const snapshot of this.snapshots.values()) {
      // 按状态统计
      byStatus[snapshot.status] = (byStatus[snapshot.status] || 0) + 1;

      // 按聚合根ID统计
      byAggregateId[snapshot.aggregateId] =
        (byAggregateId[snapshot.aggregateId] || 0) + 1;
    }

    return {
      totalSnapshots: this.snapshots.size,
      byStatus,
      byAggregateId,
    };
  }

  /**
   * 清空所有数据
   * @returns 清空结果
   */
  public async clear(): Promise<void> {
    try {
      this.snapshots.clear();
      this.aggregateIndex.clear();
      this.logger.debug("Saga状态存储已清空");
    } catch (error) {
      this.logger.error("清空Saga状态存储失败", {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}

/**
 * 文件系统Saga状态存储实现
 * @description 使用文件系统存储Saga状态，适用于单机环境
 */
export class FileSystemSagaStateStore implements ISagaStateStore {
  private readonly logger: Logger;
  private readonly dataDir: string;
  private readonly snapshots: Map<string, SagaStateSnapshot> = new Map();
  private readonly aggregateIndex: Map<string, Set<string>> = new Map();
  private isLoaded = false;

  constructor(logger: Logger, dataDir: string = "./data/saga-states") {
    this.logger = logger;
    this.dataDir = dataDir;
  }

  /**
   * 保存Saga状态
   * @param snapshot 状态快照
   * @returns 保存结果
   */
  public async save(snapshot: SagaStateSnapshot): Promise<void> {
    try {
      await this.ensureLoaded();

      this.snapshots.set(snapshot.sagaId, snapshot);

      // 更新聚合根索引
      const aggregateId = snapshot.aggregateId;
      if (!this.aggregateIndex.has(aggregateId)) {
        this.aggregateIndex.set(aggregateId, new Set());
      }
      this.aggregateIndex.get(aggregateId)!.add(snapshot.sagaId);

      // 保存到文件
      await this.saveToFile(snapshot);

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
      await this.ensureLoaded();
      const snapshot = this.snapshots.get(sagaId);
      if (snapshot) {
        this.logger.debug(`获取Saga状态成功: ${sagaId}`, {
          status: snapshot.status,
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
      await this.ensureLoaded();
      const sagaIds = this.aggregateIndex.get(aggregateId) || new Set();
      const snapshots = Array.from(sagaIds)
        .map((sagaId) => this.snapshots.get(sagaId))
        .filter(
          (snapshot): snapshot is SagaStateSnapshot => snapshot !== undefined,
        );

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
      await this.ensureLoaded();

      // 使用与InMemorySagaStateStore相同的查询逻辑
      const inMemoryStore = new InMemorySagaStateStore(this.logger);
      for (const snapshot of this.snapshots.values()) {
        await inMemoryStore.save(snapshot);
      }

      return await inMemoryStore.query(query);
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
      await this.ensureLoaded();

      const existingSnapshot = this.snapshots.get(sagaId);
      if (!existingSnapshot) {
        throw new Error(`未找到Saga状态: ${sagaId}`);
      }

      const updatedSnapshot = { ...existingSnapshot, ...updates };
      this.snapshots.set(sagaId, updatedSnapshot);

      // 保存到文件
      await this.saveToFile(updatedSnapshot);

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
      await this.ensureLoaded();

      const snapshot = this.snapshots.get(sagaId);
      if (snapshot) {
        // 从聚合根索引中移除
        const aggregateId = snapshot.aggregateId;
        const sagaIds = this.aggregateIndex.get(aggregateId);
        if (sagaIds) {
          sagaIds.delete(sagaId);
          if (sagaIds.size === 0) {
            this.aggregateIndex.delete(aggregateId);
          }
        }

        this.snapshots.delete(sagaId);

        // 删除文件
        await this.deleteFile(sagaId);

        this.logger.debug(`删除Saga状态成功: ${sagaId}`);
      }
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
   * @returns 清理数量
   */
  public async cleanup(beforeDate: Date): Promise<number> {
    try {
      await this.ensureLoaded();

      let cleanedCount = 0;
      const snapshotsToDelete: string[] = [];

      for (const [sagaId, snapshot] of this.snapshots) {
        if (snapshot.createdAt < beforeDate) {
          snapshotsToDelete.push(sagaId);
          cleanedCount++;
        }
      }

      for (const sagaId of snapshotsToDelete) {
        await this.delete(sagaId);
      }

      this.logger.debug(`清理过期Saga状态完成`, {
        cleanedCount,
        beforeDate,
      });

      return cleanedCount;
    } catch (error) {
      this.logger.error(`清理过期Saga状态失败`, {
        error: error instanceof Error ? error.message : String(error),
        beforeDate,
      });
      throw error;
    }
  }

  // 私有方法

  /**
   * 确保数据已加载
   * @returns 加载结果
   */
  private async ensureLoaded(): Promise<void> {
    if (this.isLoaded) {
      return;
    }

    try {
      // TODO: 实现从文件系统加载数据
      // 这里需要根据实际的文件系统API来实现
      this.isLoaded = true;
    } catch (error) {
      this.logger.error("加载Saga状态数据失败", {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * 保存快照到文件
   * @param snapshot 状态快照
   * @returns 保存结果
   */
  private async saveToFile(snapshot: SagaStateSnapshot): Promise<void> {
    try {
      // TODO: 实现保存到文件系统
      // 这里需要根据实际的文件系统API来实现
      this.logger.debug(`保存快照到文件: ${snapshot.sagaId}`);
    } catch (error) {
      this.logger.error(`保存快照到文件失败: ${snapshot.sagaId}`, {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * 删除文件
   * @param sagaId Saga ID
   * @returns 删除结果
   */
  private async deleteFile(sagaId: string): Promise<void> {
    try {
      // TODO: 实现删除文件
      // 这里需要根据实际的文件系统API来实现
      this.logger.debug(`删除文件: ${sagaId}`);
    } catch (error) {
      this.logger.error(`删除文件失败: ${sagaId}`, {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
