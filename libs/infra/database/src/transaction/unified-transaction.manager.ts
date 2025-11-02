/**
 * 统一事务管理器
 *
 * @description 提供跨数据库类型的事务管理统一接口
 *
 * @since 1.0.0
 */

import { Injectable } from "@nestjs/common";
import { EntityManager } from "@mikro-orm/core";
import { Logger } from "@hl8/logger";
import { DatabaseDriver } from "../drivers/database-driver.interface.js";
import { ConnectionManager } from "../connection/connection.manager.js";
import { PostgreSQLTransactionAdapter } from "./postgresql-transaction.adapter.js";
import { MongoDBTransactionAdapter } from "./mongodb-transaction.adapter.js";
import {
  DatabaseTransactionException,
  TransactionExceptionType,
} from "../exceptions/database-transaction.exception.js";
// import type { TransactionOptions } from "../types/transaction.types.js";

/**
 * 统一事务配置
 */
export interface UnifiedTransactionConfig {
  /** 数据库类型 */
  databaseType?: "postgresql" | "mongodb" | "auto";
  /** 隔离级别 */
  isolationLevel?: string;
  /** 只读事务 */
  readOnly?: boolean;
  /** 超时时间（毫秒） */
  timeout?: number;
  /** 重试次数 */
  retries?: number;
  /** 重试延迟（毫秒） */
  retryDelay?: number;
}

/**
 * 事务执行结果
 */
export interface TransactionResult<T> {
  /** 执行结果 */
  result: T;
  /** 数据库类型 */
  databaseType: string;
  /** 事务 ID */
  transactionId: string;
  /** 执行时间（毫秒） */
  duration: number;
  /** 重试次数 */
  retryCount: number;
  /** 隔离级别 */
  isolationLevel?: string;
}

/**
 * 统一事务管理器
 *
 * @description 提供跨数据库类型的事务管理统一接口
 */
@Injectable()
export class UnifiedTransactionManager {
  constructor(
    private readonly connectionManager: ConnectionManager,
    private readonly postgresqlAdapter: PostgreSQLTransactionAdapter,
    private readonly mongodbAdapter: MongoDBTransactionAdapter,
    private readonly logger: Logger,
  ) {}

  /**
   * 执行统一事务
   *
   * @description 根据数据库类型自动选择合适的事务实现
   *
   * @param callback 事务回调函数
   * @param config 统一事务配置
   * @returns 事务结果
   */
  async executeTransaction<T>(
    callback: (em: EntityManager, driver: DatabaseDriver | null) => Promise<T>,
    config: UnifiedTransactionConfig = {},
  ): Promise<TransactionResult<T>> {
    const startTime = Date.now();
    const databaseType = this.determineDatabaseType(config.databaseType);

    this.logger.log("执行统一事务", {
      databaseType,
      config,
    });

    try {
      let result: T;
      const retryCount = 0;

      if (databaseType === "postgresql") {
        result = await this.executePostgreSQLTransaction(callback, config);
      } else if (databaseType === "mongodb") {
        result = await this.executeMongoDBTransaction(callback, config);
      } else {
        throw new DatabaseTransactionException(
          `不支持的数据库类型: ${databaseType}`,
        );
      }

      const duration = Date.now() - startTime;

      return {
        result,
        databaseType,
        transactionId: this.generateTransactionId(),
        duration,
        retryCount,
        isolationLevel: config.isolationLevel,
      };
    } catch (error) {
      const duration = Date.now() - startTime;

      this.logger.error("统一事务执行失败", undefined, {
        databaseType,
        duration,
        config,
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
        "统一事务执行失败",
        TransactionExceptionType.EXECUTION_FAILED,
        {
          databaseType,
          duration,
        },
      );
    }
  }

  /**
   * 执行只读事务
   *
   * @description 执行只读的统一事务
   *
   * @param callback 事务回调函数
   * @param config 统一事务配置
   * @returns 事务结果
   */
  async executeReadOnlyTransaction<T>(
    callback: (em: EntityManager, driver: DatabaseDriver | null) => Promise<T>,
    config: UnifiedTransactionConfig = {},
  ): Promise<TransactionResult<T>> {
    return this.executeTransaction(callback, {
      ...config,
      readOnly: true,
    });
  }

  /**
   * 执行批量事务
   *
   * @description 执行批量操作的统一事务
   *
   * @param operations 批量操作函数数组
   * @param config 统一事务配置
   * @returns 事务结果
   */
  async executeBatchTransaction<T>(
    operations: Array<
      (em: EntityManager, driver: DatabaseDriver | null) => Promise<T>
    >,
    config: UnifiedTransactionConfig = {},
  ): Promise<TransactionResult<T[]>> {
    return this.executeTransaction(async (em, driver) => {
      const results: T[] = [];

      for (const operation of operations) {
        const result = await operation(em, driver);
        results.push(result);
      }

      return results;
    }, config);
  }

  /**
   * 执行嵌套事务
   *
   * @description 执行嵌套的统一事务
   *
   * @param callback 事务回调函数
   * @param config 统一事务配置
   * @returns 事务结果
   */
  async executeNestedTransaction<T>(
    callback: (em: EntityManager, driver: DatabaseDriver | null) => Promise<T>,
    config: UnifiedTransactionConfig = {},
  ): Promise<TransactionResult<T>> {
    // 检查是否已在事务中
    const existingEm = this.getCurrentEntityManager();
    if (existingEm) {
      this.logger.debug("检测到嵌套事务，复用现有 EntityManager");
      const startTime = Date.now();

      const result = await callback(
        existingEm,
        this.connectionManager.getDriver(),
      );
      const duration = Date.now() - startTime;

      return {
        result,
        databaseType: this.determineDatabaseType(config.databaseType),
        transactionId: this.generateTransactionId(),
        duration,
        retryCount: 0,
        isolationLevel: config.isolationLevel,
      };
    }

    // 执行新事务
    return this.executeTransaction(callback, config);
  }

  /**
   * 获取数据库类型信息
   *
   * @description 获取当前数据库的详细信息
   *
   * @returns 数据库类型信息
   */
  getDatabaseInfo(): {
    type: string;
    supportsTransactions: boolean;
    supportedIsolationLevels: string[];
    driver: DatabaseDriver | null;
  } {
    const driver = this.connectionManager.getDriver();
    const type = driver?.getDriverType() || "unknown";

    let supportsTransactions = false;
    let supportedIsolationLevels: string[] = [];

    if (type === "postgresql") {
      supportsTransactions = true;
      supportedIsolationLevels =
        this.postgresqlAdapter.getSupportedIsolationLevels();
    } else if (type === "mongodb") {
      supportsTransactions = true;
      supportedIsolationLevels =
        this.mongodbAdapter.getSupportedIsolationLevels();
    }

    return {
      type,
      supportsTransactions,
      supportedIsolationLevels,
      driver,
    };
  }

  /**
   * 获取事务统计信息
   *
   * @description 获取当前数据库的事务统计信息
   *
   * @returns 事务统计
   */
  async getTransactionStats(): Promise<{
    databaseType: string;
    activeTransactions: number;
    totalTransactions: number;
    averageDuration: number;
    additionalStats: any;
  }> {
    const databaseType = this.determineDatabaseType();

    try {
      if (databaseType === "postgresql") {
        const stats = await this.postgresqlAdapter.getTransactionStats();
        return {
          databaseType,
          ...stats,
          additionalStats: stats,
        };
      } else if (databaseType === "mongodb") {
        const stats = await this.mongodbAdapter.getTransactionStats();
        return {
          databaseType,
          ...stats,
          additionalStats: stats,
        };
      } else {
        return {
          databaseType,
          activeTransactions: 0,
          totalTransactions: 0,
          averageDuration: 0,
          additionalStats: {},
        };
      }
    } catch (error) {
      this.logger.error(error as Error);
      return {
        databaseType,
        activeTransactions: 0,
        totalTransactions: 0,
        averageDuration: 0,
        additionalStats: {},
      };
    }
  }

  /**
   * 确定数据库类型
   *
   * @private
   */
  private determineDatabaseType(configuredType?: string): string {
    if (configuredType && configuredType !== "auto") {
      return configuredType;
    }

    const driver = this.connectionManager.getDriver();
    if (driver) {
      return driver.getDriverType();
    }

    // 回退到默认类型
    return "postgresql";
  }

  /**
   * 执行 PostgreSQL 事务
   *
   * @private
   */
  private async executePostgreSQLTransaction<T>(
    callback: (em: EntityManager, driver: DatabaseDriver | null) => Promise<T>,
    config: UnifiedTransactionConfig,
  ): Promise<T> {
    const postgresqlConfig = {
      isolationLevel: config.isolationLevel as any,
      readOnly: config.readOnly,
      timeout: config.timeout,
    };

    return this.postgresqlAdapter.executeTransaction(
      (em) => callback(em, this.connectionManager.getDriver()),
      postgresqlConfig,
    );
  }

  /**
   * 执行 MongoDB 事务
   *
   * @private
   */
  private async executeMongoDBTransaction<T>(
    callback: (em: EntityManager, driver: DatabaseDriver | null) => Promise<T>,
    config: UnifiedTransactionConfig,
  ): Promise<T> {
    const mongodbConfig = {
      isolationLevel: config.isolationLevel as any,
      maxRetries: config.retries,
      retryDelay: config.retryDelay,
    };

    return this.mongodbAdapter.executeTransaction(
      (em) => callback(em, this.connectionManager.getDriver()),
      mongodbConfig,
    );
  }

  /**
   * 获取当前 EntityManager
   *
   * @private
   */
  private getCurrentEntityManager(): EntityManager | null {
    // 这里需要从 CLS 或其他上下文获取
    // 简化实现，实际应该从 TransactionService 获取
    return null;
  }

  /**
   * 生成事务 ID
   *
   * @private
   */
  private generateTransactionId(): string {
    return `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
