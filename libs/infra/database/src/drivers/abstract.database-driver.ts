/**
 * 抽象数据库驱动
 *
 * @description 提供数据库驱动的通用实现和模板方法
 *
 * @since 1.0.0
 */

import { Logger } from "@hl8/logger";
import {
  DatabaseDriver,
  HealthCheckResult,
} from "./database-driver.interface.js";
import type { ConnectionInfo, PoolStats } from "../types/connection.types.js";
import type { DatabaseDriverConfig } from "./database-driver.interface.js";

/**
 * 抽象数据库驱动
 *
 * @description 提供数据库驱动的通用实现，子类只需实现特定数据库的逻辑
 */
export abstract class AbstractDatabaseDriver implements DatabaseDriver {
  protected connectedAt: Date | null = null;
  protected lastActivityAt: Date | null = null;
  protected isConnecting: boolean = false;

  constructor(
    protected readonly config: DatabaseDriverConfig,
    protected readonly logger: Logger,
  ) {}

  /**
   * 建立数据库连接
   *
   * @description 连接到数据库服务器，子类需要实现具体的连接逻辑
   *
   * @throws {Error} 连接失败时抛出
   */
  abstract connect(): Promise<void>;

  /**
   * 断开数据库连接
   *
   * @description 优雅关闭数据库连接，子类需要实现具体的断开逻辑
   */
  abstract disconnect(): Promise<void>;

  /**
   * 检查连接状态
   *
   * @description 检查数据库连接是否活跃，子类需要实现具体的状态检查逻辑
   *
   * @returns 连接状态
   */
  abstract isConnected(): Promise<boolean>;

  /**
   * 获取连接信息
   *
   * @description 获取当前连接的详细信息
   *
   * @returns 连接信息
   */
  getConnectionInfo(): ConnectionInfo {
    return {
      host: this.config.connection.host,
      port: this.config.connection.port,
      database: this.config.connection.database,
      type: this.config.type,
      status: this.connectedAt ? "connected" : "disconnected",
      connectedAt: this.connectedAt || new Date(),
      uptime: this.connectedAt ? Date.now() - this.connectedAt.getTime() : 0,
    };
  }

  /**
   * 获取连接池统计
   *
   * @description 获取连接池的使用统计信息，子类可以重写以提供更精确的统计
   *
   * @returns 连接池统计
   */
  getPoolStats(): PoolStats {
    return {
      total: 1,
      active: this.connectedAt ? 1 : 0,
      idle: this.connectedAt ? 0 : 1,
      waiting: 0,
      max: this.config.pool?.max || 20,
      min: this.config.pool?.min || 5,
    };
  }

  /**
   * 健康检查
   *
   * @description 执行数据库健康检查，子类需要实现具体的健康检查逻辑
   *
   * @returns 健康检查结果
   */
  abstract healthCheck(): Promise<HealthCheckResult>;

  /**
   * 更新活动时间
   *
   * @description 更新最后活动时间戳
   */
  protected updateActivity(): void {
    this.lastActivityAt = new Date();
  }

  /**
   * 记录连接事件
   *
   * @description 记录连接相关的事件日志
   *
   * @param event 事件类型
   * @param message 事件消息
   * @param data 附加数据
   */
  protected logConnectionEvent(
    event:
      | "connecting"
      | "connected"
      | "disconnecting"
      | "disconnected"
      | "error",
    message: string,
    data?: any,
  ): void {
    const logData = {
      event,
      type: this.config.type,
      host: this.config.connection.host,
      database: this.config.connection.database,
      ...data,
    };

    switch (event) {
      case "connecting":
        this.logger.log(message, logData);
        break;
      case "connected":
        this.logger.log(message, logData);
        break;
      case "disconnecting":
        this.logger.log(message, logData);
        break;
      case "disconnected":
        this.logger.log(message, logData);
        break;
      case "error":
        this.logger.error(message, logData);
        break;
    }
  }

  /**
   * 验证配置
   *
   * @description 验证数据库配置的有效性
   *
   * @throws {Error} 配置无效时抛出
   */
  protected validateConfig(): void {
    if (!this.config.connection.host) {
      throw new Error("数据库主机地址不能为空");
    }
    if (!this.config.connection.port || this.config.connection.port <= 0) {
      throw new Error("数据库端口必须大于 0");
    }
    if (!this.config.connection.database) {
      throw new Error("数据库名称不能为空");
    }
    if (!this.config.connection.username) {
      throw new Error("数据库用户名不能为空");
    }
  }

  /**
   * 获取驱动类型
   *
   * @description 获取当前驱动的数据库类型
   *
   * @returns 数据库类型
   */
  getDriverType(): "postgresql" | "mongodb" {
    return this.config.type;
  }

  /**
   * 获取配置摘要
   *
   * @description 获取配置的安全摘要（不包含敏感信息）
   *
   * @returns 配置摘要
   */
  getConfigSummary(): string {
    return `${this.config.type}://${this.config.connection.host}:${this.config.connection.port}/${this.config.connection.database}`;
  }
}
