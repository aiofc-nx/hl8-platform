/**
 * MongoDB 事务适配器
 *
 * @description 为 MongoDB 数据库提供专门的事务管理功能
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
 * MongoDB 事务隔离级别
 */
export enum MongoDBIsolationLevel {
  READ_UNCOMMITTED = "readUncommitted",
  READ_COMMITTED = "readCommitted",
  SNAPSHOT = "snapshot",
}

/**
 * MongoDB 事务配置
 */
export interface MongoDBTransactionConfig {
  /** 隔离级别 */
  isolationLevel?: MongoDBIsolationLevel;
  /** 读关注级别 */
  readConcern?:
    | "local"
    | "available"
    | "majority"
    | "linearizable"
    | "snapshot";
  /** 写关注级别 */
  writeConcern?: {
    w?: number | "majority";
    j?: boolean;
    wtimeout?: number;
  };
  /** 最大重试次数 */
  maxRetries?: number;
  /** 重试延迟（毫秒） */
  retryDelay?: number;
}

/**
 * MongoDB 事务适配器
 *
 * @description 提供 MongoDB 特定的多文档事务管理功能
 */
@Injectable()
export class MongoDBTransactionAdapter {
  constructor(
    private readonly orm: MikroORM,
    private readonly cls: ClsService,
    private readonly logger: Logger,
  ) {}

  /**
   * 执行 MongoDB 事务
   *
   * @description 使用 MongoDB 的多文档事务特性执行操作
   *
   * @param callback 事务回调函数
   * @param config MongoDB 事务配置
   * @returns 事务结果
   */
  async executeTransaction<T>(
    callback: (em: EntityManager) => Promise<T>,
    config?: MongoDBTransactionConfig,
  ): Promise<T> {
    const transactionId = uuidv4();
    const startTime = Date.now();
    const maxRetries = config?.maxRetries || 3;
    const retryDelay = config?.retryDelay || 1000;

    this.logger.log("开始 MongoDB 事务", {
      transactionId,
      config,
      isolationLevel: config?.isolationLevel,
      readConcern: config?.readConcern,
      writeConcern: config?.writeConcern,
    });

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const em = this.orm.em.fork();

        // 设置事务配置
        if (config?.readConcern) {
          await this.setReadConcern(em, config.readConcern);
        }

        if (config?.writeConcern) {
          await this.setWriteConcern(em, config.writeConcern);
        }

        const result = await em.transactional(async (transactionEm) => {
          // 设置事务上下文
          this.cls.set("entityManager", transactionEm);
          this.cls.set("transactionId", transactionId);
          this.cls.set("mongodbConfig", config);
          this.cls.set("transactionAttempt", attempt);

          try {
            return await callback(transactionEm);
          } finally {
            // 清理上下文
            this.cls.set("entityManager", undefined);
            this.cls.set("transactionId", undefined);
            this.cls.set("mongodbConfig", undefined);
            this.cls.set("transactionAttempt", undefined);
          }
        });

        const duration = Date.now() - startTime;
        this.logger.log("MongoDB 事务提交成功", {
          transactionId,
          duration,
          attempt,
          isolationLevel: config?.isolationLevel,
        });

        return result;
      } catch (error) {
        lastError = error as Error;
        const duration = Date.now() - startTime;

        this.logger.warn("MongoDB 事务执行失败，准备重试", {
          transactionId,
          attempt,
          maxRetries,
          duration,
          error: lastError.message,
        });

        // 检查是否是可重试的错误
        if (!this.isRetryableError(lastError) || attempt === maxRetries) {
          this.logger.error("MongoDB 事务执行失败，已回滚", undefined, {
            transactionId,
            attempt,
            maxRetries,
            duration,
            err: {
              type: lastError.constructor.name,
              message: lastError.message,
              stack: lastError.stack,
            },
          });

          throw new DatabaseTransactionException(
            "MongoDB 事务执行失败，所有操作已回滚",
            TransactionExceptionType.EXECUTION_FAILED,
            {
              transactionId,
              duration,
              retryCount: attempt,
              isolationLevel: config?.isolationLevel,
            },
          );
        }

        // 等待后重试
        if (attempt < maxRetries) {
          await this.sleep(retryDelay * attempt);
        }
      }
    }

    throw lastError || new Error("MongoDB 事务执行失败");
  }

  /**
   * 执行只读事务
   *
   * @description 执行只读的 MongoDB 事务
   *
   * @param callback 事务回调函数
   * @param readConcern 读关注级别
   * @returns 事务结果
   */
  async executeReadOnlyTransaction<T>(
    callback: (em: EntityManager) => Promise<T>,
    readConcern:
      | "local"
      | "available"
      | "majority"
      | "linearizable"
      | "snapshot" = "majority",
  ): Promise<T> {
    return this.executeTransaction(callback, {
      readConcern,
      isolationLevel: MongoDBIsolationLevel.READ_COMMITTED,
    });
  }

  /**
   * 执行快照事务
   *
   * @description 执行快照隔离级别的 MongoDB 事务
   *
   * @param callback 事务回调函数
   * @returns 事务结果
   */
  async executeSnapshotTransaction<T>(
    callback: (em: EntityManager) => Promise<T>,
  ): Promise<T> {
    return this.executeTransaction(callback, {
      isolationLevel: MongoDBIsolationLevel.SNAPSHOT,
      readConcern: "snapshot",
    });
  }

  /**
   * 执行批量操作事务
   *
   * @description 执行批量操作的 MongoDB 事务
   *
   * @param operations 批量操作函数数组
   * @param config 事务配置
   * @returns 操作结果数组
   */
  async executeBatchTransaction<T>(
    operations: Array<(em: EntityManager) => Promise<T>>,
    config?: MongoDBTransactionConfig,
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
   * 设置读关注级别
   *
   * @private
   */
  private async setReadConcern(
    em: EntityManager,
    readConcern: string,
  ): Promise<void> {
    try {
      await em
        .getConnection()
        .execute(
          `db.runCommand({ setReadConcern: { level: "${readConcern}" } })`,
        );

      this.logger.debug("已设置读关注级别", { readConcern });
    } catch (error) {
      this.logger.error(error as Error);
      throw new DatabaseTransactionException(
        `无法设置读关注级别 ${readConcern}`,
        TransactionExceptionType.CONFIGURATION_ERROR,
        { isolationLevel: readConcern },
      );
    }
  }

  /**
   * 设置写关注级别
   *
   * @private
   */
  private async setWriteConcern(
    em: EntityManager,
    writeConcern: { w?: number | "majority"; j?: boolean; wtimeout?: number },
  ): Promise<void> {
    try {
      const concern = JSON.stringify(writeConcern);
      await em
        .getConnection()
        .execute(`db.runCommand({ setWriteConcern: ${concern} })`);

      this.logger.debug("已设置写关注级别", { writeConcern });
    } catch (error) {
      this.logger.error(error as Error);
      throw new DatabaseTransactionException(
        `无法设置写关注级别`,
        TransactionExceptionType.CONFIGURATION_ERROR,
        { isolationLevel: writeConcern.toString() },
      );
    }
  }

  /**
   * 检查是否是可重试的错误
   *
   * @private
   */
  private isRetryableError(error: Error): boolean {
    const retryableErrors = [
      "TransientTransactionError",
      "NoSuchTransaction",
      "WriteConflict",
      "WriteConcernError",
      "NetworkError",
      "TimeoutError",
    ];

    return retryableErrors.some(
      (errorType) =>
        error.name.includes(errorType) || error.message.includes(errorType),
    );
  }

  /**
   * 延迟辅助方法
   *
   * @private
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * 获取当前事务配置
   *
   * @description 获取当前 MongoDB 事务的配置
   *
   * @returns 事务配置
   */
  getCurrentTransactionConfig(): MongoDBTransactionConfig | undefined {
    return this.cls.get<MongoDBTransactionConfig>("mongodbConfig");
  }

  /**
   * 获取当前事务尝试次数
   *
   * @description 获取当前事务的重试尝试次数
   *
   * @returns 尝试次数
   */
  getCurrentTransactionAttempt(): number {
    return this.cls.get<number>("transactionAttempt") || 1;
  }

  /**
   * 检查是否支持隔离级别
   *
   * @description 检查 MongoDB 是否支持指定的隔离级别
   *
   * @param isolationLevel 隔离级别
   * @returns 是否支持
   */
  supportsIsolationLevel(isolationLevel: MongoDBIsolationLevel): boolean {
    return Object.values(MongoDBIsolationLevel).includes(isolationLevel);
  }

  /**
   * 获取支持的隔离级别
   *
   * @description 获取 MongoDB 支持的所有隔离级别
   *
   * @returns 隔离级别数组
   */
  getSupportedIsolationLevels(): MongoDBIsolationLevel[] {
    return Object.values(MongoDBIsolationLevel);
  }

  /**
   * 获取事务统计信息
   *
   * @description 获取 MongoDB 事务的统计信息
   *
   * @returns 事务统计
   */
  async getTransactionStats(): Promise<{
    activeTransactions: number;
    totalTransactions: number;
    averageDuration: number;
    retryCount: number;
  }> {
    try {
      const em = this.orm.em;
      const connection = em.getConnection();

      // 获取当前数据库的统计信息
      const statsResult = await connection.execute(`
        db.runCommand({ serverStatus: 1 }).transactions
      `);

      return {
        activeTransactions: statsResult?.activeTransactions || 0,
        totalTransactions: statsResult?.totalTransactions || 0,
        averageDuration: statsResult?.averageDuration || 0,
        retryCount: statsResult?.retryCount || 0,
      };
    } catch (error) {
      this.logger.error(error as Error);
      return {
        activeTransactions: 0,
        totalTransactions: 0,
        averageDuration: 0,
        retryCount: 0,
      };
    }
  }

  /**
   * 检查事务支持
   *
   * @description 检查 MongoDB 是否支持事务
   *
   * @returns 是否支持事务
   */
  async checkTransactionSupport(): Promise<boolean> {
    try {
      const em = this.orm.em;
      const connection = em.getConnection();

      // 检查 MongoDB 版本和副本集状态
      const serverInfo = await connection.execute(`
        db.runCommand({ serverStatus: 1 })
      `);

      const version = serverInfo?.version;
      const isReplicaSet = serverInfo?.repl?.ismaster;

      // MongoDB 4.0+ 支持事务，且需要副本集
      return version && parseFloat(version) >= 4.0 && isReplicaSet;
    } catch (error) {
      this.logger.error(error as Error);
      return false;
    }
  }
}
