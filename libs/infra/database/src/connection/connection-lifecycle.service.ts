/**
 * 连接生命周期管理服务
 *
 * @description 管理数据库连接的生命周期，包括创建、维护、回收和销毁
 *
 * @since 1.0.0
 */

import { Injectable } from "@nestjs/common";
import { Logger } from "@hl8/logger";
import { DatabaseDriver } from "../drivers/database-driver.interface.js";
import { ConnectionPoolAdapter } from "./connection-pool.adapter.js";
import { ConnectionHealthService } from "./connection-health.service.js";
import { ConnectionStatsService } from "./connection-stats.service.js";

/**
 * 连接生命周期状态
 */
export enum ConnectionLifecycleState {
  /** 初始化 */
  INITIALIZING = "initializing",
  /** 连接中 */
  CONNECTING = "connecting",
  /** 已连接 */
  CONNECTED = "connected",
  /** 健康检查中 */
  HEALTH_CHECKING = "health_checking",
  /** 健康 */
  HEALTHY = "healthy",
  /** 不健康 */
  UNHEALTHY = "unhealthy",
  /** 断开连接中 */
  DISCONNECTING = "disconnecting",
  /** 已断开 */
  DISCONNECTED = "disconnected",
  /** 错误 */
  ERROR = "error",
}

/**
 * 连接生命周期事件
 */
export interface ConnectionLifecycleEvent {
  /** 事件类型 */
  type: "state_change" | "health_check" | "error" | "metrics";
  /** 时间戳 */
  timestamp: Date;
  /** 状态 */
  state: ConnectionLifecycleState;
  /** 消息 */
  message: string;
  /** 附加数据 */
  data?: any;
}

/**
 * 连接生命周期配置
 */
export interface ConnectionLifecycleConfig {
  /** 健康检查间隔（毫秒） */
  healthCheckInterval: number;
  /** 连接超时时间（毫秒） */
  connectionTimeout: number;
  /** 最大重试次数 */
  maxRetries: number;
  /** 重试间隔（毫秒） */
  retryInterval: number;
  /** 自动回收空闲连接 */
  autoRecycleIdle: boolean;
  /** 空闲超时时间（毫秒） */
  idleTimeout: number;
}

/**
 * 连接生命周期管理服务
 *
 * @description 提供完整的连接生命周期管理功能
 */
@Injectable()
export class ConnectionLifecycleService {
  private currentState: ConnectionLifecycleState =
    ConnectionLifecycleState.INITIALIZING;
  private lifecycleEvents: ConnectionLifecycleEvent[] = [];
  private healthCheckTimer?: NodeJS.Timeout;
  private idleCheckTimer?: NodeJS.Timeout;
  private driver: DatabaseDriver | null = null;
  private lastActivity: Date = new Date();
  private connectionStartTime?: Date;

  constructor(
    private readonly logger: Logger,
    private readonly poolAdapter: ConnectionPoolAdapter,
    private readonly healthService: ConnectionHealthService,
    private readonly statsService: ConnectionStatsService,
  ) {}

  /**
   * 初始化连接生命周期
   *
   * @description 初始化连接生命周期管理
   *
   * @param driver 数据库驱动
   * @param config 生命周期配置
   */
  async initialize(
    driver: DatabaseDriver,
    config: ConnectionLifecycleConfig,
  ): Promise<void> {
    this.driver = driver;
    this.setState(
      ConnectionLifecycleState.INITIALIZING,
      "初始化连接生命周期管理",
    );

    try {
      // 开始连接过程
      await this.connect(config);

      // 启动健康检查
      this.startHealthCheck(config);

      // 启动空闲连接检查
      if (config.autoRecycleIdle) {
        this.startIdleCheck(config);
      }

      this.logger.log("连接生命周期管理已初始化", {
        driverType: driver.constructor.name,
        config,
      });
    } catch (error) {
      this.setState(ConnectionLifecycleState.ERROR, "初始化失败", { error });
      throw error;
    }
  }

  /**
   * 建立连接
   *
   * @description 建立数据库连接
   *
   * @param config 生命周期配置
   */
  private async connect(_config: ConnectionLifecycleConfig): Promise<void> {
    if (!this.driver) {
      throw new Error("数据库驱动未设置");
    }

    this.setState(ConnectionLifecycleState.CONNECTING, "正在建立数据库连接");
    this.connectionStartTime = new Date();

    try {
      await this.driver.connect();
      this.setState(ConnectionLifecycleState.CONNECTED, "数据库连接已建立");

      // 记录连接成功
      this.statsService.recordConnectionAttempt(
        true,
        Date.now() - this.connectionStartTime.getTime(),
      );

      this.logger.log("数据库连接建立成功", {
        driverType: this.driver.getDriverType(),
        connectionTime: Date.now() - this.connectionStartTime.getTime(),
      });
    } catch (error) {
      this.setState(ConnectionLifecycleState.ERROR, "数据库连接失败", {
        error,
      });

      // 记录连接失败
      this.statsService.recordConnectionAttempt(false);

      this.logger.error(error as Error);
      throw error;
    }
  }

  /**
   * 启动健康检查
   *
   * @description 启动定期健康检查
   *
   * @param config 生命周期配置
   */
  private startHealthCheck(config: ConnectionLifecycleConfig): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }

    this.healthCheckTimer = setInterval(async () => {
      await this.performHealthCheck();
    }, config.healthCheckInterval);

    this.logger.log("已启动健康检查", {
      interval: config.healthCheckInterval,
    });
  }

  /**
   * 启动空闲连接检查
   *
   * @description 启动空闲连接检查和回收
   *
   * @param config 生命周期配置
   */
  private startIdleCheck(config: ConnectionLifecycleConfig): void {
    if (this.idleCheckTimer) {
      clearInterval(this.idleCheckTimer);
    }

    this.idleCheckTimer = setInterval(async () => {
      await this.checkIdleConnections(config);
    }, config.idleTimeout / 2);

    this.logger.log("已启动空闲连接检查", {
      timeout: config.idleTimeout,
    });
  }

  /**
   * 执行健康检查
   *
   * @description 执行连接健康检查
   */
  private async performHealthCheck(): Promise<void> {
    if (!this.driver) {
      return;
    }

    this.setState(ConnectionLifecycleState.HEALTH_CHECKING, "执行健康检查");

    try {
      const healthResult = await this.healthService.performHealthCheck(
        this.driver,
      );

      if (healthResult.healthy) {
        this.setState(ConnectionLifecycleState.HEALTHY, "连接健康");
        this.lastActivity = new Date();
      } else {
        this.setState(ConnectionLifecycleState.UNHEALTHY, "连接不健康", {
          error: healthResult.error,
          responseTime: healthResult.responseTime,
        });
      }
    } catch (error) {
      this.setState(ConnectionLifecycleState.ERROR, "健康检查失败", { error });
      this.logger.error(error as Error);
    }
  }

  /**
   * 检查空闲连接
   *
   * @description 检查并回收空闲连接
   *
   * @param config 生命周期配置
   */
  private async checkIdleConnections(
    config: ConnectionLifecycleConfig,
  ): Promise<void> {
    if (!this.driver) {
      return;
    }

    const now = new Date();
    const idleTime = now.getTime() - this.lastActivity.getTime();

    if (idleTime > config.idleTimeout) {
      this.logger.log("检测到空闲连接，准备回收", {
        idleTime,
        timeout: config.idleTimeout,
      });

      await this.recycleConnection();
    }
  }

  /**
   * 回收连接
   *
   * @description 回收空闲或异常的连接
   */
  async recycleConnection(): Promise<void> {
    if (!this.driver) {
      return;
    }

    this.logger.log("开始回收连接");

    try {
      // 断开当前连接
      await this.driver.disconnect();
      this.setState(ConnectionLifecycleState.DISCONNECTED, "连接已回收");

      // 重新建立连接
      await this.driver.connect();
      this.setState(ConnectionLifecycleState.CONNECTED, "连接已重新建立");
      this.lastActivity = new Date();

      this.logger.log("连接回收完成");
    } catch (error) {
      this.setState(ConnectionLifecycleState.ERROR, "连接回收失败", { error });
      this.logger.error(error as Error);
    }
  }

  /**
   * 优雅关闭
   *
   * @description 优雅关闭连接生命周期管理
   */
  async shutdown(): Promise<void> {
    this.setState(
      ConnectionLifecycleState.DISCONNECTING,
      "正在关闭连接生命周期管理",
    );

    // 停止定时器
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = undefined;
    }

    if (this.idleCheckTimer) {
      clearInterval(this.idleCheckTimer);
      this.idleCheckTimer = undefined;
    }

    // 断开连接
    if (this.driver) {
      try {
        await this.driver.disconnect();
        this.setState(ConnectionLifecycleState.DISCONNECTED, "连接已断开");
      } catch (error) {
        this.setState(ConnectionLifecycleState.ERROR, "断开连接失败", {
          error,
        });
        this.logger.error(error as Error);
      }
    }

    this.logger.log("连接生命周期管理已关闭");
  }

  /**
   * 设置状态
   *
   * @description 设置连接生命周期状态
   *
   * @param state 新状态
   * @param message 状态消息
   * @param data 附加数据
   */
  private setState(
    state: ConnectionLifecycleState,
    message: string,
    data?: any,
  ): void {
    const previousState = this.currentState;
    this.currentState = state;

    const event: ConnectionLifecycleEvent = {
      type: "state_change",
      timestamp: new Date(),
      state,
      message,
      data,
    };

    this.lifecycleEvents.push(event);

    // 保持事件历史在合理范围内
    if (this.lifecycleEvents.length > 100) {
      this.lifecycleEvents.shift();
    }

    this.logger.log(`连接状态变更: ${previousState} -> ${state}`, {
      message,
      data,
    });
  }

  /**
   * 获取当前状态
   *
   * @description 获取当前连接生命周期状态
   *
   * @returns 当前状态
   */
  getCurrentState(): ConnectionLifecycleState {
    return this.currentState;
  }

  /**
   * 获取生命周期事件
   *
   * @description 获取连接生命周期事件历史
   *
   * @param limit 返回事件数限制
   * @returns 生命周期事件
   */
  getLifecycleEvents(limit?: number): ConnectionLifecycleEvent[] {
    if (limit) {
      return this.lifecycleEvents.slice(-limit);
    }
    return [...this.lifecycleEvents];
  }

  /**
   * 获取连接统计
   *
   * @description 获取连接统计信息
   *
   * @returns 连接统计
   */
  async getConnectionStats(): Promise<any> {
    if (!this.driver) {
      return null;
    }

    return await this.statsService.getConnectionStats(this.driver);
  }

  /**
   * 更新活动时间
   *
   * @description 更新最后活动时间
   */
  updateActivity(): void {
    this.lastActivity = new Date();
  }

  /**
   * 获取连接运行时间
   *
   * @description 获取连接运行时间（毫秒）
   *
   * @returns 运行时间
   */
  getUptime(): number {
    if (!this.connectionStartTime) {
      return 0;
    }
    return Date.now() - this.connectionStartTime.getTime();
  }
}
