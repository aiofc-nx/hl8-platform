/**
 * PostgreSQL 事务适配器
 *
 * @description 为 PostgreSQL 数据库提供专门的事务管理功能
 *
 * @since 1.0.0
 */

import { Injectable } from "@nestjs/common";
import { EntityManager, MikroORM } from "@mikro-orm/core";
import { Logger } from "@hl8/logger";
import { ClsService } from "nestjs-cls";
import { v4 as uuidv4 } from "uuid";
import {
  DatabaseTransactionException,
  TransactionExceptionType,
} from "../exceptions/database-transaction.exception.js";
// import type { TransactionOptions } from "../types/transaction.types.js";

/**
 * PostgreSQL 事务隔离级别
 */
export enum PostgreSQLIsolationLevel {
  READ_UNCOMMITTED = "READ UNCOMMITTED",
  READ_COMMITTED = "READ COMMITTED",
  REPEATABLE_READ = "REPEATABLE READ",
  SERIALIZABLE = "SERIALIZABLE",
}

/**
 * PostgreSQL 事务配置
 */
export interface PostgreSQLTransactionConfig {
  /** 隔离级别 */
  isolationLevel?: PostgreSQLIsolationLevel;
  /** 只读事务 */
  readOnly?: boolean;
  /** 延迟约束检查 */
  deferrable?: boolean;
  /** 事务超时（毫秒） */
  timeout?: number;
}

/**
 * PostgreSQL 事务适配器
 *
 * @description 提供 PostgreSQL 特定的 ACID 事务管理功能
 */
@Injectable()
export class PostgreSQLTransactionAdapter {
  constructor(
    private readonly orm: MikroORM,
    private readonly cls: ClsService,
    private readonly logger: Logger,
  ) {}

  /**
   * 执行 PostgreSQL 事务
   *
   * @description 使用 PostgreSQL 的 ACID 事务特性执行操作
   *
   * @param callback 事务回调函数
   * @param config PostgreSQL 事务配置
   * @returns 事务结果
   */
  async executeTransaction<T>(
    callback: (em: EntityManager) => Promise<T>,
    config?: PostgreSQLTransactionConfig,
  ): Promise<T> {
    const transactionId = uuidv4();
    const startTime = Date.now();

    this.logger.log("开始 PostgreSQL 事务", {
      transactionId,
      config,
      isolationLevel: config?.isolationLevel,
      readOnly: config?.readOnly,
    });

    try {
      const em = this.orm.em.fork();

      // 设置事务配置
      if (config?.isolationLevel) {
        await this.setIsolationLevel(em, config.isolationLevel);
      }

      if (config?.readOnly) {
        await this.setReadOnly(em);
      }

      if (config?.deferrable) {
        await this.setDeferrable(em);
      }

      const result = await em.transactional(async (transactionEm) => {
        // 设置事务上下文
        this.cls.set("entityManager", transactionEm);
        this.cls.set("transactionId", transactionId);
        this.cls.set("postgresqlConfig", config);

        try {
          return await callback(transactionEm);
        } finally {
          // 清理上下文
          this.cls.set("entityManager", undefined);
          this.cls.set("transactionId", undefined);
          this.cls.set("postgresqlConfig", undefined);
        }
      });

      const duration = Date.now() - startTime;
      this.logger.log("PostgreSQL 事务提交成功", {
        transactionId,
        duration,
        isolationLevel: config?.isolationLevel,
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;

      this.logger.error("PostgreSQL 事务执行失败，已回滚", undefined, {
        transactionId,
        duration,
        isolationLevel: config?.isolationLevel,
        err:
          error instanceof Error
            ? {
                type: error.constructor.name,
                message: error.message,
                stack: error.stack,
              }
            : undefined,
      });

      throw new DatabaseTransactionException(
        "PostgreSQL 事务执行失败，所有操作已回滚",
        TransactionExceptionType.EXECUTION_FAILED,
        {
          transactionId,
          duration,
          isolationLevel: config?.isolationLevel,
        },
      );
    }
  }

  /**
   * 执行只读事务
   *
   * @description 执行只读的 PostgreSQL 事务
   *
   * @param callback 事务回调函数
   * @param isolationLevel 隔离级别
   * @returns 事务结果
   */
  async executeReadOnlyTransaction<T>(
    callback: (em: EntityManager) => Promise<T>,
    isolationLevel?: PostgreSQLIsolationLevel,
  ): Promise<T> {
    return this.executeTransaction(callback, {
      readOnly: true,
      isolationLevel: isolationLevel || PostgreSQLIsolationLevel.READ_COMMITTED,
    });
  }

  /**
   * 执行可序列化事务
   *
   * @description 执行最高隔离级别的 PostgreSQL 事务
   *
   * @param callback 事务回调函数
   * @returns 事务结果
   */
  async executeSerializableTransaction<T>(
    callback: (em: EntityManager) => Promise<T>,
  ): Promise<T> {
    return this.executeTransaction(callback, {
      isolationLevel: PostgreSQLIsolationLevel.SERIALIZABLE,
    });
  }

  /**
   * 执行批量操作事务
   *
   * @description 执行批量操作的 PostgreSQL 事务
   *
   * @param operations 批量操作函数数组
   * @param config 事务配置
   * @returns 操作结果数组
   */
  async executeBatchTransaction<T>(
    operations: Array<(em: EntityManager) => Promise<T>>,
    config?: PostgreSQLTransactionConfig,
  ): Promise<T[]> {
    return this.executeTransaction(async (em) => {
      const results: T[] = [];

      for (const operation of operations) {
        const result = await operation(em);
        results.push(result);
      }

      return results;
    }, config);
  }

  /**
   * 设置隔离级别
   *
   * @private
   */
  private async setIsolationLevel(
    em: EntityManager,
    isolationLevel: PostgreSQLIsolationLevel,
  ): Promise<void> {
    try {
      await em
        .getConnection()
        .execute(`SET TRANSACTION ISOLATION LEVEL ${isolationLevel}`);

      this.logger.debug("已设置事务隔离级别", { isolationLevel });
    } catch (error) {
      this.logger.error(error as Error);
      throw new DatabaseTransactionException(
        `无法设置隔离级别 ${isolationLevel}`,
        TransactionExceptionType.CONFIGURATION_ERROR,
        { isolationLevel },
      );
    }
  }

  /**
   * 设置只读事务
   *
   * @private
   */
  private async setReadOnly(em: EntityManager): Promise<void> {
    try {
      await em.getConnection().execute("SET TRANSACTION READ ONLY");
      this.logger.debug("已设置只读事务");
    } catch (error) {
      this.logger.error(error as Error);
      throw new DatabaseTransactionException("无法设置只读事务");
    }
  }

  /**
   * 设置延迟约束检查
   *
   * @private
   */
  private async setDeferrable(em: EntityManager): Promise<void> {
    try {
      await em.getConnection().execute("SET TRANSACTION DEFERRABLE");
      this.logger.debug("已设置延迟约束检查");
    } catch (error) {
      this.logger.error(error as Error);
      throw new DatabaseTransactionException("无法设置延迟约束检查");
    }
  }

  /**
   * 获取当前事务配置
   *
   * @description 获取当前 PostgreSQL 事务的配置
   *
   * @returns 事务配置
   */
  getCurrentTransactionConfig(): PostgreSQLTransactionConfig | undefined {
    return this.cls.get<PostgreSQLTransactionConfig>("postgresqlConfig");
  }

  /**
   * 检查是否支持隔离级别
   *
   * @description 检查 PostgreSQL 是否支持指定的隔离级别
   *
   * @param isolationLevel 隔离级别
   * @returns 是否支持
   */
  supportsIsolationLevel(isolationLevel: PostgreSQLIsolationLevel): boolean {
    return Object.values(PostgreSQLIsolationLevel).includes(isolationLevel);
  }

  /**
   * 获取支持的隔离级别
   *
   * @description 获取 PostgreSQL 支持的所有隔离级别
   *
   * @returns 隔离级别数组
   */
  getSupportedIsolationLevels(): PostgreSQLIsolationLevel[] {
    return Object.values(PostgreSQLIsolationLevel);
  }

  /**
   * 获取事务统计信息
   *
   * @description 获取 PostgreSQL 事务的统计信息
   *
   * @returns 事务统计
   */
  async getTransactionStats(): Promise<{
    activeTransactions: number;
    totalTransactions: number;
    averageDuration: number;
    isolationLevels: Record<string, number>;
  }> {
    try {
      const em = this.orm.em;
      const connection = em.getConnection();

      // 获取活跃事务数
      const activeResult = await connection.execute(`
        SELECT count(*) as active_count 
        FROM pg_stat_activity 
        WHERE state = 'active' AND query LIKE '%BEGIN%'
      `);

      // 获取事务统计
      const statsResult = await connection.execute(`
        SELECT 
          xact_commit as committed,
          xact_rollback as rolled_back,
          xact_commit + xact_rollback as total
        FROM pg_stat_database 
        WHERE datname = current_database()
      `);

      return {
        activeTransactions: parseInt(activeResult[0]?.active_count || "0"),
        totalTransactions: parseInt(statsResult[0]?.total || "0"),
        averageDuration: 0, // 需要更复杂的查询来计算
        isolationLevels: {}, // 需要额外的查询来获取
      };
    } catch (error) {
      this.logger.error(error as Error);
      return {
        activeTransactions: 0,
        totalTransactions: 0,
        averageDuration: 0,
        isolationLevels: {},
      };
    }
  }
}
