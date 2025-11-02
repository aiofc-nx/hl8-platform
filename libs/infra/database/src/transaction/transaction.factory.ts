/**
 * 事务工厂
 *
 * @description 根据数据库类型和配置创建合适的事务实例
 *
 * @since 1.0.0
 */

import { Injectable } from "@nestjs/common";
import { Logger } from "@hl8/logger";
// import { DatabaseDriver } from "../drivers/database-driver.interface.js";
import { ConnectionManager } from "../connection/connection.manager.js";
import { PostgreSQLTransactionAdapter } from "./postgresql-transaction.adapter.js";
import { MongoDBTransactionAdapter } from "./mongodb-transaction.adapter.js";
import { UnifiedTransactionManager } from "./unified-transaction.manager.js";
import { DatabaseTransactionException } from "../exceptions/database-transaction.exception.js";

/**
 * 事务工厂配置
 */
export interface TransactionFactoryConfig {
  /** 数据库类型 */
  databaseType: "postgresql" | "mongodb" | "auto";
  /** 默认隔离级别 */
  defaultIsolationLevel?: string;
  /** 默认超时时间（毫秒） */
  defaultTimeout?: number;
  /** 默认重试次数 */
  defaultRetries?: number;
  /** 是否启用统一事务管理 */
  enableUnifiedManager?: boolean;
}

/**
 * 事务工厂
 *
 * @description 根据数据库类型和配置创建合适的事务实例
 */
@Injectable()
export class TransactionFactory {
  constructor(
    private readonly connectionManager: ConnectionManager,
    private readonly postgresqlAdapter: PostgreSQLTransactionAdapter,
    private readonly mongodbAdapter: MongoDBTransactionAdapter,
    private readonly unifiedManager: UnifiedTransactionManager,
    private readonly logger: Logger,
  ) {}

  /**
   * 创建事务实例
   *
   * @description 根据配置创建合适的事务实例
   *
   * @param config 事务工厂配置
   * @returns 事务实例
   */
  createTransaction(config: TransactionFactoryConfig): TransactionInstance {
    const databaseType = this.determineDatabaseType(config.databaseType);

    this.logger.log("创建事务实例", {
      databaseType,
      config,
    });

    if (config.enableUnifiedManager) {
      return this.createUnifiedTransaction(config);
    }

    switch (databaseType) {
      case "postgresql":
        return this.createPostgreSQLTransaction(config);
      case "mongodb":
        return this.createMongoDBTransaction(config);
      default:
        throw new DatabaseTransactionException(
          `不支持的数据库类型: ${databaseType}`,
        );
    }
  }

  /**
   * 创建 PostgreSQL 事务实例
   *
   * @private
   */
  private createPostgreSQLTransaction(
    config: TransactionFactoryConfig,
  ): TransactionInstance {
    return {
      type: "postgresql",
      adapter: this.postgresqlAdapter,
      execute: async (callback, options) => {
        const postgresqlConfig = {
          isolationLevel: options?.isolationLevel as any,
          readOnly: options?.readOnly,
          timeout: options?.timeout || config.defaultTimeout,
        };

        return this.postgresqlAdapter.executeTransaction(
          callback,
          postgresqlConfig,
        );
      },
      executeReadOnly: async (callback, isolationLevel) => {
        return this.postgresqlAdapter.executeReadOnlyTransaction(
          callback,
          isolationLevel as any,
        );
      },
      executeSerializable: async (callback) => {
        return this.postgresqlAdapter.executeSerializableTransaction(callback);
      },
      executeBatch: async (operations, options) => {
        const postgresqlConfig = {
          isolationLevel: options?.isolationLevel as any,
          readOnly: options?.readOnly,
          timeout: options?.timeout || config.defaultTimeout,
        };

        return this.postgresqlAdapter.executeBatchTransaction(
          operations,
          postgresqlConfig,
        );
      },
      getStats: async () => this.postgresqlAdapter.getTransactionStats(),
      supportsIsolationLevel: (level) =>
        this.postgresqlAdapter.supportsIsolationLevel(level as any),
      getSupportedIsolationLevels: () =>
        this.postgresqlAdapter.getSupportedIsolationLevels(),
    };
  }

  /**
   * 创建 MongoDB 事务实例
   *
   * @private
   */
  private createMongoDBTransaction(
    config: TransactionFactoryConfig,
  ): TransactionInstance {
    return {
      type: "mongodb",
      adapter: this.mongodbAdapter,
      execute: async (callback, options) => {
        const mongodbConfig = {
          isolationLevel: options?.isolationLevel as any,
          readConcern: options?.readConcern,
          writeConcern: options?.writeConcern,
          maxRetries: options?.retries || config.defaultRetries,
          retryDelay: options?.retryDelay,
        };

        return this.mongodbAdapter.executeTransaction(callback, mongodbConfig);
      },
      executeReadOnly: async (callback, readConcern) => {
        return this.mongodbAdapter.executeReadOnlyTransaction(
          callback,
          readConcern as
            | "snapshot"
            | "local"
            | "available"
            | "majority"
            | "linearizable",
        );
      },
      executeSnapshot: async (callback) => {
        return this.mongodbAdapter.executeSnapshotTransaction(callback);
      },
      executeBatch: async (operations, options) => {
        const mongodbConfig = {
          isolationLevel: options?.isolationLevel as any,
          readConcern: options?.readConcern,
          writeConcern: options?.writeConcern,
          maxRetries: options?.retries || config.defaultRetries,
          retryDelay: options?.retryDelay,
        };

        return this.mongodbAdapter.executeBatchTransaction(
          operations,
          mongodbConfig,
        );
      },
      getStats: async () => this.mongodbAdapter.getTransactionStats(),
      supportsIsolationLevel: (level) =>
        this.mongodbAdapter.supportsIsolationLevel(level as any),
      getSupportedIsolationLevels: () =>
        this.mongodbAdapter.getSupportedIsolationLevels(),
    };
  }

  /**
   * 创建统一事务实例
   *
   * @private
   */
  private createUnifiedTransaction(
    config: TransactionFactoryConfig,
  ): TransactionInstance {
    return {
      type: "unified",
      adapter: this.unifiedManager,
      execute: async (callback, options) => {
        const unifiedConfig = {
          databaseType: config.databaseType,
          isolationLevel: options?.isolationLevel,
          readOnly: options?.readOnly,
          timeout: options?.timeout || config.defaultTimeout,
          retries: options?.retries || config.defaultRetries,
          retryDelay: options?.retryDelay,
        };

        const result = await this.unifiedManager.executeTransaction(
          (em, _driver) => callback(em),
          unifiedConfig,
        );

        return result.result;
      },
      executeReadOnly: async (callback, isolationLevel) => {
        const result = await this.unifiedManager.executeReadOnlyTransaction(
          (em, _driver) => callback(em),
          {
            databaseType: config.databaseType,
            isolationLevel,
          },
        );

        return result.result;
      },
      executeBatch: async (operations, options) => {
        const result = await this.unifiedManager.executeBatchTransaction(
          operations.map((op) => (em, _driver) => op(em)),
          {
            databaseType: config.databaseType,
            isolationLevel: options?.isolationLevel,
            readOnly: options?.readOnly,
            timeout: options?.timeout || config.defaultTimeout,
            retries: options?.retries || config.defaultRetries,
            retryDelay: options?.retryDelay,
          },
        );

        return result.result;
      },
      getStats: async () => this.unifiedManager.getTransactionStats(),
      supportsIsolationLevel: (level) => {
        const dbInfo = this.unifiedManager.getDatabaseInfo();
        return dbInfo.supportedIsolationLevels.includes(level);
      },
      getSupportedIsolationLevels: () => {
        const dbInfo = this.unifiedManager.getDatabaseInfo();
        return dbInfo.supportedIsolationLevels;
      },
    };
  }

  /**
   * 确定数据库类型
   *
   * @private
   */
  private determineDatabaseType(configuredType: string): string {
    if (configuredType === "auto") {
      const driver = this.connectionManager.getDriver();
      return driver?.getDriverType() || "postgresql";
    }
    return configuredType;
  }

  /**
   * 获取默认配置
   *
   * @description 获取事务工厂的默认配置
   *
   * @returns 默认配置
   */
  getDefaultConfig(): TransactionFactoryConfig {
    return {
      databaseType: "auto",
      defaultIsolationLevel: "READ_COMMITTED",
      defaultTimeout: 60000,
      defaultRetries: 3,
      enableUnifiedManager: true,
    };
  }

  /**
   * 验证配置
   *
   * @description 验证事务工厂配置的有效性
   *
   * @param config 配置
   * @returns 验证结果
   */
  validateConfig(config: TransactionFactoryConfig): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!["postgresql", "mongodb", "auto"].includes(config.databaseType)) {
      errors.push("无效的数据库类型");
    }

    if (config.defaultTimeout && config.defaultTimeout < 1000) {
      errors.push("默认超时时间不能少于 1000 毫秒");
    }

    if (config.defaultRetries && config.defaultRetries < 0) {
      errors.push("默认重试次数不能为负数");
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

/**
 * 事务实例接口
 */
export interface TransactionInstance {
  /** 事务类型 */
  type: "postgresql" | "mongodb" | "unified";
  /** 适配器实例 */
  adapter: any;
  /** 执行事务 */
  execute: (callback: (em: any) => Promise<any>, options?: any) => Promise<any>;
  /** 执行只读事务 */
  executeReadOnly: (
    callback: (em: any) => Promise<any>,
    level?: string,
  ) => Promise<any>;
  /** 执行可序列化事务（仅 PostgreSQL） */
  executeSerializable?: (callback: (em: any) => Promise<any>) => Promise<any>;
  /** 执行快照事务（仅 MongoDB） */
  executeSnapshot?: (callback: (em: any) => Promise<any>) => Promise<any>;
  /** 执行批量事务 */
  executeBatch: (
    operations: Array<(em: any) => Promise<any>>,
    options?: any,
  ) => Promise<any[]>;
  /** 获取统计信息 */
  getStats: () => Promise<any>;
  /** 检查是否支持隔离级别 */
  supportsIsolationLevel: (level: string) => boolean;
  /** 获取支持的隔离级别 */
  getSupportedIsolationLevels: () => string[];
}
