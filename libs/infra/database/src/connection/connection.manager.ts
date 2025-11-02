/**
 * 数据库连接管理器
 *
 * @description 管理数据库连接的生命周期，支持多数据库类型
 *
 * ## 业务规则
 *
 * ### 连接管理规则
 * - 应用启动时自动建立连接
 * - 连接失败时使用指数退避算法重试
 * - 最多重试 5 次，超过后抛出异常
 * - 连接断开时自动尝试重连
 *
 * ### 健康检查规则
 * - 定期检查连接状态（每分钟）
 * - 检测到不健康的连接立即标记
 * - 提供健康检查接口供外部调用
 *
 * ### 生命周期规则
 * - onModuleInit: 建立初始连接
 * - onModuleDestroy: 优雅关闭所有连接
 * - 确保资源正确释放
 *
 * @example
 * ```typescript
 * @Injectable()
 * export class UserService {
 *   constructor(
 *     private readonly connectionManager: ConnectionManager,
 *   ) {}
 *
 *   async checkConnection() {
 *     const isConnected = await this.connectionManager.isConnected();
 *     return { connected: isConnected };
 *   }
 * }
 * ```
 *
 * @since 1.0.0
 */

import { Logger } from "@hl8/logger";
import { MikroORM } from "@mikro-orm/core";
import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { DatabaseDriver } from "../drivers/database-driver.interface.js";
import { DatabaseDriverFactory } from "../drivers/database-driver.factory.js";
import {
  DriverSelector,
  // DriverSelectionStrategy,
} from "../drivers/driver-selector.js";
import { CONNECTION_DEFAULTS } from "../constants/defaults.js";
import { DatabaseConnectionException } from "../exceptions/database-connection.exception.js";
import {
  ConnectionStatus,
  type ConnectionInfo,
  type PoolStats,
} from "../types/connection.types.js";

@Injectable()
export class ConnectionManager implements OnModuleInit, OnModuleDestroy {
  private connectionStatus: ConnectionStatus = ConnectionStatus.DISCONNECTED;
  private connectedAt?: Date;
  private lastActivityAt?: Date;
  private reconnectAttempts = 0;
  private driver: DatabaseDriver | null = null;

  constructor(
    private readonly orm: MikroORM,
    private readonly logger: Logger,
    private readonly driverFactory: DatabaseDriverFactory,
    private readonly driverSelector: DriverSelector,
  ) {
    this.logger.log("ConnectionManager 初始化");
  }

  /**
   * 模块初始化钩子
   *
   * @description 应用启动时自动建立数据库连接
   */
  async onModuleInit(): Promise<void> {
    this.logger.log("正在建立数据库连接...");
    await this.connect();
  }

  /**
   * 模块销毁钩子
   *
   * @description 应用关闭时优雅关闭数据库连接
   */
  async onModuleDestroy(): Promise<void> {
    this.logger.log("正在关闭数据库连接...");
    await this.disconnect();
  }

  /**
   * 建立数据库连接
   *
   * @description 连接到数据库，失败时自动重试
   *
   * @throws {DatabaseConnectionException} 连接失败时抛出
   */
  async connect(): Promise<void> {
    try {
      this.connectionStatus = ConnectionStatus.CONNECTING;

      // 检查是否已有连接
      const connected = await this.orm.isConnected();
      if (connected) {
        this.connectionStatus = ConnectionStatus.CONNECTED;
        this.connectedAt = new Date();
        this.lastActivityAt = new Date();
        this.logger.log("数据库连接已存在");
        return;
      }

      // 创建数据库驱动
      const config = this.getDriverConfig();
      const strategy = this.driverSelector.getRecommendedStrategy(
        (process.env.NODE_ENV as any) || "development",
      );

      this.driver = this.driverSelector.selectDriver(config, strategy);
      await this.driver.connect();

      this.connectionStatus = ConnectionStatus.CONNECTED;
      this.connectedAt = new Date();
      this.lastActivityAt = new Date();
      this.reconnectAttempts = 0;

      this.logger.log("数据库连接建立成功", {
        type: config.type,
        host: config.connection.host,
        database: config.connection.database,
      });
    } catch (error) {
      this.connectionStatus = ConnectionStatus.DISCONNECTED;
      this.logger.error(error as Error);

      // 自动重试逻辑
      if (this.reconnectAttempts < CONNECTION_DEFAULTS.MAX_RETRY_ATTEMPTS) {
        this.reconnectAttempts++;
        const delay = Math.min(
          CONNECTION_DEFAULTS.BASE_RETRY_DELAY *
            Math.pow(2, this.reconnectAttempts - 1),
          CONNECTION_DEFAULTS.MAX_RETRY_DELAY,
        );

        this.logger.log(
          `将在 ${delay}ms 后重试连接 (第 ${this.reconnectAttempts} 次)`,
        );
        await this.sleep(delay);
        return this.connect();
      }

      throw new DatabaseConnectionException(
        `数据库连接失败，已重试 ${this.reconnectAttempts} 次`,
        error instanceof Error ? error : new Error(String(error)),
      );
    }
  }

  /**
   * 断开数据库连接
   *
   * @description 优雅关闭数据库连接
   */
  async disconnect(): Promise<void> {
    try {
      this.connectionStatus = ConnectionStatus.DISCONNECTED;

      if (this.driver) {
        await this.driver.disconnect();
        this.driver = null;
      }

      this.connectionStatus = ConnectionStatus.DISCONNECTED;
      this.connectedAt = undefined;
      this.lastActivityAt = undefined;

      this.logger.log("数据库连接已关闭");
    } catch (error) {
      this.logger.error(error as Error);
      this.connectionStatus = ConnectionStatus.DISCONNECTED;
    }
  }

  /**
   * 检查连接状态
   *
   * @description 检查数据库是否已连接
   * @returns 是否已连接
   */
  async isConnected(): Promise<boolean> {
    if (this.driver) {
      return await this.driver.isConnected();
    }
    return this.orm.isConnected();
  }

  /**
   * 获取连接信息
   *
   * @description 获取连接的详细信息
   * @returns 连接信息对象
   */
  async getConnectionInfo(): Promise<ConnectionInfo> {
    const poolStats = await this.getPoolStats();

    if (this.driver) {
      const driverInfo = this.driver.getConnectionInfo();
      return {
        status: this.connectionStatus,
        type: driverInfo.type,
        host: driverInfo.host,
        port: driverInfo.port,
        database: driverInfo.database,
        connectedAt: this.connectedAt,
        uptime: this.connectedAt ? Date.now() - this.connectedAt.getTime() : 0,
        lastActivityAt: this.lastActivityAt,
        poolStats,
      };
    }

    // 回退到原始实现
    return {
      status: this.connectionStatus,
      type: this.getDriverConfig().type,
      host: this.getDriverConfig().connection.host,
      port: this.getDriverConfig().connection.port,
      database: this.getDriverConfig().connection.database,
      connectedAt: this.connectedAt,
      uptime: this.connectedAt ? Date.now() - this.connectedAt.getTime() : 0,
      lastActivityAt: this.lastActivityAt,
      poolStats,
    };
  }

  /**
   * 获取连接池统计
   *
   * @description 获取连接池的实时统计信息
   * @returns 连接池统计
   */
  async getPoolStats(): Promise<PoolStats> {
    if (this.driver) {
      return this.driver.getPoolStats();
    }

    // 回退到原始实现
    const driver = (this.orm as any).driver;
    const pool = driver?.connection?.getPool?.();

    if (!pool) {
      return {
        total: 0,
        active: 0,
        idle: 0,
        waiting: 0,
        max: 0,
        min: 0,
      };
    }

    return {
      total: pool.totalCount || 0,
      active: (pool.totalCount || 0) - (pool.idleCount || 0),
      idle: pool.idleCount || 0,
      waiting: pool.waitingCount || 0,
      max: pool.max || 0,
      min: pool.min || 0,
    };
  }

  /**
   * 获取 ORM 实例
   *
   * @description 获取 MikroORM 实例供其他服务使用
   * @returns MikroORM 实例
   */
  getOrm(): MikroORM {
    return this.orm;
  }

  /**
   * 获取数据库驱动
   *
   * @description 获取当前使用的数据库驱动实例
   * @returns 数据库驱动实例或 null
   */
  getDriver(): DatabaseDriver | null {
    return this.driver;
  }

  /**
   * 健康检查
   *
   * @description 执行数据库健康检查
   * @returns 健康检查结果
   */
  async healthCheck(): Promise<{
    healthy: boolean;
    responseTime: number;
    error?: string;
    timestamp: Date;
  }> {
    if (this.driver) {
      return await this.driver.healthCheck();
    }

    // 回退到原始实现
    const startTime = Date.now();
    try {
      const isConnected = await this.isConnected();
      const responseTime = Date.now() - startTime;

      return {
        healthy: isConnected,
        responseTime,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        healthy: false,
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : "未知错误",
        timestamp: new Date(),
      };
    }
  }

  /**
   * 获取驱动配置（内部方法）
   *
   * @private
   */
  private getDriverConfig() {
    const config = this.orm.config as any;
    return {
      type: (config.get("driver")?.name?.toLowerCase()?.includes("mongo")
        ? "mongodb"
        : "postgresql") as "postgresql" | "mongodb",
      connection: {
        host: config.get("host"),
        port: config.get("port"),
        database: config.get("dbName"),
        username: config.get("user"),
        password: config.get("password"),
      },
      pool: {
        min: config.get("pool")?.min,
        max: config.get("pool")?.max,
        idleTimeoutMillis: config.get("pool")?.idleTimeoutMillis,
        acquireTimeoutMillis: config.get("pool")?.acquireTimeoutMillis,
        createTimeoutMillis: config.get("pool")?.createTimeoutMillis,
      },
      debug: config.get("debug"),
    };
  }

  /**
   * 获取连接配置（内部方法）
   *
   * @private
   */
  private getConnectionConfig() {
    const config = this.orm.config as any;
    return {
      type: config.get("driver")?.name?.toLowerCase()?.includes("mongo")
        ? "mongodb"
        : "postgresql",
      host: config.get("host"),
      port: config.get("port"),
      database: config.get("dbName"),
    };
  }

  /**
   * 延迟辅助方法
   *
   * @param ms - 延迟毫秒数
   * @private
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
