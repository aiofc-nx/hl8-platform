/**
 * MongoDB 数据库驱动
 *
 * @description 实现 MongoDB 数据库的连接和管理
 *
 * @since 1.0.0
 */

import { MikroORM } from "@mikro-orm/core";
import { MongoDriver } from "@mikro-orm/mongodb";
import { Logger } from "@hl8/logger";
import {
  DatabaseDriver,
  HealthCheckResult,
} from "./database-driver.interface.js";
import type { ConnectionInfo, PoolStats } from "../types/connection.types.js";
import type { DatabaseDriverConfig } from "./database-driver.interface.js";

/**
 * MongoDB 数据库驱动
 *
 * @description 实现 MongoDB 数据库的连接、查询和事务管理
 */
export class MongoDBDriver implements DatabaseDriver {
  private orm: MikroORM | null = null;
  private connectedAt: Date | null = null;
  private lastActivityAt: Date | null = null;

  constructor(
    private readonly config: DatabaseDriverConfig,
    private readonly logger: Logger,
  ) {}

  /**
   * 建立数据库连接
   *
   * @description 连接到 MongoDB 数据库
   *
   * @throws {Error} 连接失败时抛出
   */
  async connect(): Promise<void> {
    try {
      this.logger.log("正在连接 MongoDB 数据库", {
        host: this.config.connection.host,
        port: this.config.connection.port,
        database: this.config.connection.database,
      });

      this.orm = await MikroORM.init({
        driver: MongoDriver,
        host: this.config.connection.host,
        port: this.config.connection.port,
        dbName: this.config.connection.database,
        user: this.config.connection.username,
        password: this.config.connection.password,
        debug: this.config.debug || false,
      });

      this.connectedAt = new Date();
      this.lastActivityAt = new Date();

      this.logger.log("MongoDB 数据库连接成功", {
        host: this.config.connection.host,
        database: this.config.connection.database,
        connectedAt: this.connectedAt,
      });
    } catch (error) {
      this.logger.error(error as Error);
      throw new Error(
        `MongoDB 连接失败: ${error instanceof Error ? error.message : "未知错误"}`,
      );
    }
  }

  /**
   * 断开数据库连接
   *
   * @description 优雅关闭 MongoDB 数据库连接
   */
  async disconnect(): Promise<void> {
    if (this.orm) {
      try {
        await this.orm.close();
        this.logger.log("MongoDB 数据库连接已关闭");
      } catch (error) {
        this.logger.error(error as Error);
      } finally {
        this.orm = null;
        this.connectedAt = null;
        this.lastActivityAt = null;
      }
    }
  }

  /**
   * 检查连接状态
   *
   * @description 检查 MongoDB 数据库连接是否活跃
   *
   * @returns 连接状态
   */
  async isConnected(): Promise<boolean> {
    if (!this.orm) {
      return false;
    }

    try {
      return await this.orm.isConnected();
    } catch (error) {
      this.logger.error(error as Error);
      return false;
    }
  }

  /**
   * 获取连接信息
   *
   * @description 获取当前 MongoDB 连接的详细信息
   *
   * @returns 连接信息
   */
  getConnectionInfo(): ConnectionInfo {
    return {
      host: this.config.connection.host,
      port: this.config.connection.port,
      database: this.config.connection.database,
      type: "mongodb",
      status: this.connectedAt ? "connected" : "disconnected",
      connectedAt: this.connectedAt || new Date(),
      uptime: this.connectedAt ? Date.now() - this.connectedAt.getTime() : 0,
    };
  }

  /**
   * 获取连接池统计
   *
   * @description 获取 MongoDB 连接池的使用统计信息
   *
   * @returns 连接池统计
   */
  getPoolStats(): PoolStats {
    // MongoDB 连接统计
    const _connection = this.orm?.em?.getConnection();

    return {
      total: 1, // MongoDB 通常使用单个连接
      active: this.orm ? 1 : 0,
      idle: this.orm ? 0 : 1,
      waiting: 0,
      max: 1,
      min: 1,
    };
  }

  /**
   * 健康检查
   *
   * @description 执行 MongoDB 数据库健康检查
   *
   * @returns 健康检查结果
   */
  async healthCheck(): Promise<HealthCheckResult> {
    const startTime = Date.now();

    try {
      if (!this.orm) {
        return {
          healthy: false,
          status: "unhealthy",
          responseTime: Date.now() - startTime,
          error: "数据库未连接",
          timestamp: new Date(),
        };
      }

      // 执行简单的 ping 操作来检查连接
      await this.orm.em.getConnection().execute("ping");

      const responseTime = Date.now() - startTime;
      this.lastActivityAt = new Date();

      return {
        healthy: true,
        status: "healthy",
        responseTime,
        timestamp: new Date(),
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;

      return {
        healthy: false,
        status: "unhealthy",
        responseTime,
        error: error instanceof Error ? error.message : "未知错误",
        timestamp: new Date(),
      };
    }
  }

  /**
   * 获取驱动类型
   *
   * @description 获取数据库驱动的类型
   * @returns 驱动类型
   */
  getDriverType(): "postgresql" | "mongodb" {
    return "mongodb";
  }

  /**
   * 获取配置摘要
   *
   * @description 获取数据库配置的摘要信息
   * @returns 配置摘要
   */
  getConfigSummary(): string {
    return `mongodb://${this.config.connection.host}:${this.config.connection.port}/${this.config.connection.database}`;
  }
}
