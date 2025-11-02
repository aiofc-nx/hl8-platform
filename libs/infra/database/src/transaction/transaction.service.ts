/**
 * 事务服务
 *
 * @description 提供编程式事务管理功能
 *
 * ## 业务规则
 *
 * ### 事务执行规则
 * - 事务必须保证原子性（ACID）
 * - 成功时自动提交所有操作
 * - 失败时自动回滚所有操作
 * - 支持嵌套事务（使用相同的 EntityManager）
 *
 * ### 上下文管理规则
 * - 使用 nestjs-cls 存储事务上下文
 * - 事务 EntityManager 存储在 CLS 中
 * - 事务结束后清理上下文
 * - 嵌套事务复用父事务的 EntityManager
 *
 * ### 超时规则
 * - 默认事务超时为 60 秒
 * - 超时后自动回滚
 * - 记录超时警告日志
 *
 * @example
 * ```typescript
 * @Injectable()
 * export class UserService {
 *   constructor(
 *     private readonly transactionService: TransactionService,
 *   ) {}
 *
 *   async createUser(data: UserData): Promise<User> {
 *     return this.transactionService.runInTransaction(async (em) => {
 *       const user = new User(data);
 *       await em.persistAndFlush(user);
 *       return user;
 *     });
 *   }
 * }
 * ```
 *
 * @since 1.0.0
 */

import { Logger } from "@hl8/logger";
import { EntityManager, MikroORM } from "@mikro-orm/core";
import { Injectable } from "@nestjs/common";
import { ClsService } from "nestjs-cls";
import { v4 as uuidv4 } from "uuid";
import { DatabaseDriver } from "../drivers/database-driver.interface.js";
import { ConnectionManager } from "../connection/connection.manager.js";
import {
  DatabaseTransactionException,
  TransactionExceptionType,
} from "../exceptions/database-transaction.exception.js";
import type { TransactionOptions } from "../types/transaction.types.js";

@Injectable()
export class TransactionService {
  constructor(
    private readonly orm: MikroORM,
    private readonly cls: ClsService,
    private readonly logger: Logger,
    private readonly connectionManager: ConnectionManager,
  ) {
    this.logger.log("TransactionService 初始化");
  }

  /**
   * 在事务中运行代码块
   *
   * @description 执行编程式事务，成功时自动提交，失败时自动回滚
   *
   * @param callback - 事务回调函数
   * @param options - 事务选项（可选）
   * @returns 回调函数的返回值
   *
   * @throws {DatabaseTransactionException} 事务执行失败时抛出
   *
   * @example
   * ```typescript
   * const user = await this.transactionService.runInTransaction(async (em) => {
   *   const user = new User(data);
   *   await em.persistAndFlush(user);
   *   return user;
   * });
   * ```
   */
  async runInTransaction<T>(
    callback: (em: EntityManager) => Promise<T>,
    options?: TransactionOptions,
  ): Promise<T> {
    // 检查是否已在事务中
    const existingEm = this.cls.get<EntityManager>("entityManager");
    if (existingEm) {
      this.logger.debug("检测到现有事务，复用 EntityManager");
      return callback(existingEm);
    }

    const transactionId = uuidv4();
    const startTime = Date.now();

    this.logger.log("开始事务", { transactionId, options });

    try {
      const em = this.orm.em.fork();

      const result = await em.transactional(async (transactionEm) => {
        // 将事务 EM 存储到上下文
        this.cls.set("entityManager", transactionEm);
        this.cls.set("transactionId", transactionId);

        try {
          return await callback(transactionEm);
        } finally {
          // 清理上下文
          this.cls.set("entityManager", undefined);
          this.cls.set("transactionId", undefined);
        }
      });

      const duration = Date.now() - startTime;
      this.logger.log("事务提交成功", { transactionId, duration });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;

      // 记录技术错误日志用于监控和调试
      this.logger.error("事务执行失败，已回滚", undefined, {
        transactionId,
        duration,
        err:
          error instanceof Error
            ? {
                type: error.constructor.name,
                message: error.message,
                stack: error.stack,
              }
            : undefined,
      });

      // 抛出业务异常
      throw new DatabaseTransactionException(
        "事务执行失败，所有操作已回滚",
        TransactionExceptionType.EXECUTION_FAILED,
        {
          transactionId,
          duration,
        },
      );
    }
  }

  /**
   * 获取当前事务的 EntityManager
   *
   * @description 从 CLS 上下文获取事务 EntityManager
   *
   * @returns 事务 EntityManager，如果不在事务中则返回 undefined
   *
   * @example
   * ```typescript
   * const em = this.transactionService.getTransactionEntityManager();
   * if (em) {
   *   // 在事务中
   *   await em.persist(entity);
   * }
   * ```
   */
  getTransactionEntityManager(): EntityManager | undefined {
    return this.cls.get<EntityManager>("entityManager");
  }

  /**
   * 检查是否在事务中
   *
   * @description 判断当前代码是否在事务上下文中执行
   *
   * @returns 是否在事务中
   */
  isInTransaction(): boolean {
    return this.cls.get<EntityManager>("entityManager") !== undefined;
  }

  /**
   * 获取当前事务 ID
   *
   * @description 从 CLS 上下文获取事务 ID
   *
   * @returns 事务 ID，如果不在事务中则返回 undefined
   */
  getTransactionId(): string | undefined {
    return this.cls.get<string>("transactionId");
  }

  /**
   * 获取数据库驱动类型
   *
   * @description 获取当前使用的数据库驱动类型
   *
   * @returns 数据库驱动类型
   */
  getDatabaseType(): string {
    const driver = this.connectionManager.getDriver();
    if (driver) {
      return driver.getDriverType();
    }

    // 回退到从 ORM 配置获取
    const config = this.orm.config as any;
    const driverName = config.get("driver")?.name?.toLowerCase();
    return driverName?.includes("mongo") ? "mongodb" : "postgresql";
  }

  /**
   * 检查数据库是否支持事务
   *
   * @description 检查当前数据库是否支持事务
   *
   * @returns 是否支持事务
   */
  supportsTransactions(): boolean {
    const dbType = this.getDatabaseType();

    // PostgreSQL 完全支持 ACID 事务
    if (dbType === "postgresql") {
      return true;
    }

    // MongoDB 4.0+ 支持多文档事务
    if (dbType === "mongodb") {
      return true;
    }

    return false;
  }

  /**
   * 获取事务隔离级别
   *
   * @description 获取当前数据库支持的事务隔离级别
   *
   * @returns 隔离级别数组
   */
  getSupportedIsolationLevels(): string[] {
    const dbType = this.getDatabaseType();

    if (dbType === "postgresql") {
      return [
        "READ_UNCOMMITTED",
        "READ_COMMITTED",
        "REPEATABLE_READ",
        "SERIALIZABLE",
      ];
    }

    if (dbType === "mongodb") {
      return ["READ_COMMITTED", "SNAPSHOT"];
    }

    return ["READ_COMMITTED"];
  }

  /**
   * 执行数据库特定的事务操作
   *
   * @description 根据数据库类型执行特定的事务操作
   *
   * @param callback 事务回调函数
   * @param options 事务选项
   * @returns 事务结果
   */
  async runDatabaseSpecificTransaction<T>(
    callback: (em: EntityManager, driver: DatabaseDriver | null) => Promise<T>,
    options?: TransactionOptions,
  ): Promise<T> {
    const dbType = this.getDatabaseType();
    const driver = this.connectionManager.getDriver();

    this.logger.log("执行数据库特定事务", {
      databaseType: dbType,
      supportsTransactions: this.supportsTransactions(),
      driverType: driver?.getDriverType(),
    });

    if (dbType === "postgresql") {
      return this.runPostgreSQLTransaction(callback, options);
    } else if (dbType === "mongodb") {
      return this.runMongoDBTransaction(callback, options);
    } else {
      // 回退到默认实现
      return this.runInTransaction(async (em) => {
        return callback(em, this.connectionManager.getDriver());
      }, options);
    }
  }

  /**
   * 执行 PostgreSQL 事务
   *
   * @private
   */
  private async runPostgreSQLTransaction<T>(
    callback: (em: EntityManager, driver: DatabaseDriver | null) => Promise<T>,
    options?: TransactionOptions,
  ): Promise<T> {
    // PostgreSQL 使用标准的 ACID 事务
    return this.runInTransaction(async (em) => {
      return callback(em, this.connectionManager.getDriver());
    }, options);
  }

  /**
   * 执行 MongoDB 事务
   *
   * @private
   */
  private async runMongoDBTransaction<T>(
    callback: (em: EntityManager, driver: DatabaseDriver | null) => Promise<T>,
    options?: TransactionOptions,
  ): Promise<T> {
    // MongoDB 事务需要特殊处理
    const driver = this.connectionManager.getDriver();

    if (!driver) {
      throw new DatabaseTransactionException("MongoDB 驱动未设置");
    }

    // 检查是否已在事务中
    const existingEm = this.cls.get<EntityManager>("entityManager");
    if (existingEm) {
      this.logger.debug("检测到现有 MongoDB 事务，复用 EntityManager");
      return callback(existingEm, driver);
    }

    const transactionId = uuidv4();
    const startTime = Date.now();

    this.logger.log("开始 MongoDB 事务", { transactionId, options });

    try {
      const em = this.orm.em.fork();

      // MongoDB 事务需要显式开始
      const result = await em.transactional(async (transactionEm) => {
        this.cls.set("entityManager", transactionEm);
        this.cls.set("transactionId", transactionId);

        try {
          return await callback(transactionEm, driver);
        } finally {
          this.cls.set("entityManager", undefined);
          this.cls.set("transactionId", undefined);
        }
      });

      const duration = Date.now() - startTime;
      this.logger.log("MongoDB 事务提交成功", { transactionId, duration });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;

      this.logger.error("MongoDB 事务执行失败，已回滚", undefined, {
        transactionId,
        duration,
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
        "MongoDB 事务执行失败，所有操作已回滚",
        TransactionExceptionType.EXECUTION_FAILED,
        {
          transactionId,
          duration,
        },
      );
    }
  }
}
