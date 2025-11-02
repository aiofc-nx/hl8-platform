/**
 * 事务监控服务
 *
 * @description 监控和管理数据库事务的执行状态和性能
 *
 * @since 1.0.0
 */

import { Injectable } from "@nestjs/common";
import { Logger } from "@hl8/logger";
// import { EntityManager } from "@mikro-orm/core";
import { v4 as uuidv4 } from "uuid";

/**
 * 事务监控事件
 */
export interface TransactionMonitorEvent {
  /** 事件 ID */
  id: string;
  /** 事务 ID */
  transactionId: string;
  /** 事件类型 */
  type: "started" | "committed" | "rolled_back" | "timeout" | "error";
  /** 时间戳 */
  timestamp: Date;
  /** 数据库类型 */
  databaseType: string;
  /** 隔离级别 */
  isolationLevel?: string;
  /** 执行时间（毫秒） */
  duration?: number;
  /** 错误信息 */
  error?: string;
  /** 附加数据 */
  metadata?: any;
}

/**
 * 事务统计信息
 */
export interface TransactionStats {
  /** 总事务数 */
  totalTransactions: number;
  /** 成功事务数 */
  successfulTransactions: number;
  /** 失败事务数 */
  failedTransactions: number;
  /** 回滚事务数 */
  rolledBackTransactions: number;
  /** 超时事务数 */
  timeoutTransactions: number;
  /** 平均执行时间（毫秒） */
  averageDuration: number;
  /** 最大执行时间（毫秒） */
  maxDuration: number;
  /** 最小执行时间（毫秒） */
  minDuration: number;
  /** 成功率 */
  successRate: number;
  /** 按数据库类型分组 */
  byDatabaseType: Record<string, any>;
  /** 按隔离级别分组 */
  byIsolationLevel: Record<string, any>;
}

/**
 * 事务监控服务
 *
 * @description 提供事务执行监控和统计功能
 */
@Injectable()
export class TransactionMonitor {
  private readonly events: TransactionMonitorEvent[] = [];
  private readonly activeTransactions = new Map<
    string,
    {
      startTime: Date;
      databaseType: string;
      isolationLevel?: string;
      metadata?: any;
    }
  >();
  private readonly maxEvents = 1000;

  constructor(private readonly logger: Logger) {}

  /**
   * 开始监控事务
   *
   * @description 开始监控一个新的事务
   *
   * @param transactionId 事务 ID
   * @param databaseType 数据库类型
   * @param isolationLevel 隔离级别
   * @param metadata 附加数据
   */
  startTransaction(
    transactionId: string,
    databaseType: string,
    isolationLevel?: string,
    metadata?: any,
  ): void {
    const event: TransactionMonitorEvent = {
      id: uuidv4(),
      transactionId,
      type: "started",
      timestamp: new Date(),
      databaseType,
      isolationLevel,
      metadata,
    };

    this.events.push(event);
    this.activeTransactions.set(transactionId, {
      startTime: new Date(),
      databaseType,
      isolationLevel,
      metadata,
    });

    this.logger.debug("开始监控事务", {
      transactionId,
      databaseType,
      isolationLevel,
    });

    this.cleanupEvents();
  }

  /**
   * 记录事务提交
   *
   * @description 记录事务成功提交
   *
   * @param transactionId 事务 ID
   * @param metadata 附加数据
   */
  commitTransaction(transactionId: string, metadata?: any): void {
    const activeTransaction = this.activeTransactions.get(transactionId);
    if (!activeTransaction) {
      this.logger.warn("尝试提交未监控的事务", { transactionId });
      return;
    }

    const duration = Date.now() - activeTransaction.startTime.getTime();
    const event: TransactionMonitorEvent = {
      id: uuidv4(),
      transactionId,
      type: "committed",
      timestamp: new Date(),
      databaseType: activeTransaction.databaseType,
      isolationLevel: activeTransaction.isolationLevel,
      duration,
      metadata,
    };

    this.events.push(event);
    this.activeTransactions.delete(transactionId);

    this.logger.debug("事务提交", {
      transactionId,
      duration,
      databaseType: activeTransaction.databaseType,
    });

    this.cleanupEvents();
  }

  /**
   * 记录事务回滚
   *
   * @description 记录事务回滚
   *
   * @param transactionId 事务 ID
   * @param error 错误信息
   * @param metadata 附加数据
   */
  rollbackTransaction(
    transactionId: string,
    error?: string,
    metadata?: any,
  ): void {
    const activeTransaction = this.activeTransactions.get(transactionId);
    if (!activeTransaction) {
      this.logger.warn("尝试回滚未监控的事务", { transactionId });
      return;
    }

    const duration = Date.now() - activeTransaction.startTime.getTime();
    const event: TransactionMonitorEvent = {
      id: uuidv4(),
      transactionId,
      type: "rolled_back",
      timestamp: new Date(),
      databaseType: activeTransaction.databaseType,
      isolationLevel: activeTransaction.isolationLevel,
      duration,
      error,
      metadata,
    };

    this.events.push(event);
    this.activeTransactions.delete(transactionId);

    this.logger.warn("事务回滚", {
      transactionId,
      duration,
      error,
      databaseType: activeTransaction.databaseType,
    });

    this.cleanupEvents();
  }

  /**
   * 记录事务超时
   *
   * @description 记录事务执行超时
   *
   * @param transactionId 事务 ID
   * @param timeout 超时时间（毫秒）
   * @param metadata 附加数据
   */
  timeoutTransaction(
    transactionId: string,
    timeout: number,
    metadata?: any,
  ): void {
    const activeTransaction = this.activeTransactions.get(transactionId);
    if (!activeTransaction) {
      this.logger.warn("尝试记录未监控事务的超时", { transactionId });
      return;
    }

    const duration = Date.now() - activeTransaction.startTime.getTime();
    const event: TransactionMonitorEvent = {
      id: uuidv4(),
      transactionId,
      type: "timeout",
      timestamp: new Date(),
      databaseType: activeTransaction.databaseType,
      isolationLevel: activeTransaction.isolationLevel,
      duration,
      metadata: { timeout, ...metadata },
    };

    this.events.push(event);
    this.activeTransactions.delete(transactionId);

    this.logger.warn("事务超时", {
      transactionId,
      duration,
      timeout,
      databaseType: activeTransaction.databaseType,
    });

    this.cleanupEvents();
  }

  /**
   * 记录事务错误
   *
   * @description 记录事务执行过程中的错误
   *
   * @param transactionId 事务 ID
   * @param error 错误信息
   * @param metadata 附加数据
   */
  errorTransaction(transactionId: string, error: string, metadata?: any): void {
    const activeTransaction = this.activeTransactions.get(transactionId);
    if (!activeTransaction) {
      this.logger.warn("尝试记录未监控事务的错误", { transactionId });
      return;
    }

    const duration = Date.now() - activeTransaction.startTime.getTime();
    const event: TransactionMonitorEvent = {
      id: uuidv4(),
      transactionId,
      type: "error",
      timestamp: new Date(),
      databaseType: activeTransaction.databaseType,
      isolationLevel: activeTransaction.isolationLevel,
      duration,
      error,
      metadata,
    };

    this.events.push(event);

    this.logger.error(error as unknown as Error);

    this.cleanupEvents();
  }

  /**
   * 获取事务统计信息
   *
   * @description 获取事务执行的统计信息
   *
   * @returns 事务统计
   */
  getTransactionStats(): TransactionStats {
    const totalTransactions = this.events.filter(
      (e) => e.type === "started",
    ).length;
    const successfulTransactions = this.events.filter(
      (e) => e.type === "committed",
    ).length;
    const failedTransactions = this.events.filter(
      (e) => e.type === "rolled_back",
    ).length;
    const timeoutTransactions = this.events.filter(
      (e) => e.type === "timeout",
    ).length;
    const _errorTransactions = this.events.filter(
      (e) => e.type === "error",
    ).length;

    const completedTransactions = this.events.filter((e) =>
      ["committed", "rolled_back", "timeout", "error"].includes(e.type),
    );

    const durations = completedTransactions
      .map((e) => e.duration || 0)
      .filter((d) => d > 0);

    const averageDuration =
      durations.length > 0
        ? durations.reduce((sum, d) => sum + d, 0) / durations.length
        : 0;

    const maxDuration = durations.length > 0 ? Math.max(...durations) : 0;
    const minDuration = durations.length > 0 ? Math.min(...durations) : 0;

    const successRate =
      totalTransactions > 0
        ? (successfulTransactions / totalTransactions) * 100
        : 0;

    // 按数据库类型分组
    const byDatabaseType = this.events.reduce(
      (acc, event) => {
        const type = event.databaseType;
        if (!acc[type]) {
          acc[type] = { total: 0, successful: 0, failed: 0 };
        }
        acc[type].total++;
        if (event.type === "committed") acc[type].successful++;
        if (["rolled_back", "timeout", "error"].includes(event.type))
          acc[type].failed++;
        return acc;
      },
      {} as Record<string, any>,
    );

    // 按隔离级别分组
    const byIsolationLevel = this.events.reduce(
      (acc, event) => {
        const level = event.isolationLevel || "default";
        if (!acc[level]) {
          acc[level] = { total: 0, successful: 0, failed: 0 };
        }
        acc[level].total++;
        if (event.type === "committed") acc[level].successful++;
        if (["rolled_back", "timeout", "error"].includes(event.type))
          acc[level].failed++;
        return acc;
      },
      {} as Record<string, any>,
    );

    return {
      totalTransactions,
      successfulTransactions,
      failedTransactions,
      rolledBackTransactions: failedTransactions,
      timeoutTransactions,
      averageDuration: Math.round(averageDuration * 100) / 100,
      maxDuration,
      minDuration,
      successRate: Math.round(successRate * 100) / 100,
      byDatabaseType,
      byIsolationLevel,
    };
  }

  /**
   * 获取活跃事务
   *
   * @description 获取当前活跃的事务列表
   *
   * @returns 活跃事务列表
   */
  getActiveTransactions(): Array<{
    transactionId: string;
    startTime: Date;
    databaseType: string;
    isolationLevel?: string;
    duration: number;
    metadata?: any;
  }> {
    const now = new Date();
    return Array.from(this.activeTransactions.entries()).map(([id, info]) => ({
      transactionId: id,
      startTime: info.startTime,
      databaseType: info.databaseType,
      isolationLevel: info.isolationLevel,
      duration: now.getTime() - info.startTime.getTime(),
      metadata: info.metadata,
    }));
  }

  /**
   * 获取事务事件历史
   *
   * @description 获取事务事件的历史记录
   *
   * @param limit 返回事件数限制
   * @param transactionId 特定事务 ID（可选）
   * @returns 事务事件列表
   */
  getTransactionEvents(
    limit?: number,
    transactionId?: string,
  ): TransactionMonitorEvent[] {
    let events = this.events;

    if (transactionId) {
      events = events.filter((e) => e.transactionId === transactionId);
    }

    if (limit) {
      events = events.slice(-limit);
    }

    return [...events];
  }

  /**
   * 清理过期事件
   *
   * @private
   */
  private cleanupEvents(): void {
    if (this.events.length > this.maxEvents) {
      const toRemove = this.events.length - this.maxEvents;
      this.events.splice(0, toRemove);
    }
  }

  /**
   * 清理所有数据
   *
   * @description 清理所有监控数据
   */
  clearAll(): void {
    this.events.length = 0;
    this.activeTransactions.clear();
    this.logger.log("已清理所有事务监控数据");
  }

  /**
   * 获取监控配置
   *
   * @description 获取当前监控配置
   *
   * @returns 监控配置
   */
  getMonitorConfig(): {
    maxEvents: number;
    activeTransactions: number;
    totalEvents: number;
  } {
    return {
      maxEvents: this.maxEvents,
      activeTransactions: this.activeTransactions.size,
      totalEvents: this.events.length,
    };
  }
}
