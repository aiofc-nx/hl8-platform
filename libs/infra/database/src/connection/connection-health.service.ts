/**
 * 连接健康检查服务
 *
 * @description 提供数据库连接的健康检查和监控功能
 *
 * @since 1.0.0
 */

import { Injectable } from "@nestjs/common";
import { Logger } from "@hl8/logger";
import { DatabaseDriver } from "../drivers/database-driver.interface.js";
import { ConnectionPoolAdapter } from "./connection-pool.adapter.js";
import type { HealthCheckResult } from "../types/monitoring.types.js";

// HealthCheckResult interface is now imported from types module

/**
 * 健康检查配置
 */
export interface HealthCheckConfig {
  /** 检查间隔（毫秒） */
  interval: number;
  /** 超时时间（毫秒） */
  timeout: number;
  /** 重试次数 */
  retryCount: number;
  /** 是否启用自动检查 */
  autoCheck: boolean;
}

/**
 * 连接健康检查服务
 *
 * @description 提供全面的数据库连接健康检查功能
 */
@Injectable()
export class ConnectionHealthService {
  private healthCheckInterval?: NodeJS.Timeout;
  private lastHealthCheck?: HealthCheckResult;
  private consecutiveFailures = 0;

  constructor(
    private readonly logger: Logger,
    private readonly poolAdapter: ConnectionPoolAdapter,
  ) {}

  /**
   * 执行健康检查
   *
   * @description 对数据库连接执行全面的健康检查
   *
   * @param driver 数据库驱动
   * @param config 健康检查配置
   * @returns 健康检查结果
   */
  async performHealthCheck(
    driver: DatabaseDriver,
    config: HealthCheckConfig = this.getDefaultConfig(),
  ): Promise<HealthCheckResult> {
    const startTime = Date.now();
    let healthy = true;
    const details = {
      connection: false,
      pool: false,
      performance: false,
    };
    let error: string | undefined;

    try {
      // 1. 连接检查
      const isConnected = await this.checkConnection(driver, config.timeout);
      details.connection = isConnected;
      if (!isConnected) {
        healthy = false;
        error = "数据库连接不可用";
      }

      // 2. 连接池检查
      if (healthy) {
        const poolHealthy = await this.checkPoolHealth(driver);
        details.pool = poolHealthy;
        if (!poolHealthy) {
          healthy = false;
          error = "连接池状态异常";
        }
      }

      // 3. 性能检查
      if (healthy) {
        const performanceHealthy = await this.checkPerformance(
          driver,
          config.timeout,
        );
        details.performance = performanceHealthy;
        if (!performanceHealthy) {
          healthy = false;
          error = "数据库性能异常";
        }
      }

      const responseTime = Date.now() - startTime;
      const result: HealthCheckResult = {
        healthy,
        status: healthy ? "healthy" : "unhealthy",
        responseTime,
        error,
        timestamp: new Date(),
        details,
      };

      this.lastHealthCheck = result;
      this.consecutiveFailures = healthy ? 0 : this.consecutiveFailures + 1;

      // 记录响应时间
      this.poolAdapter.recordResponseTime(responseTime);

      this.logger.log("健康检查完成", {
        healthy,
        responseTime,
        consecutiveFailures: this.consecutiveFailures,
      });

      return result;
    } catch (err) {
      const responseTime = Date.now() - startTime;
      const result: HealthCheckResult = {
        healthy: false,
        status: "unhealthy",
        responseTime,
        error: err instanceof Error ? err.message : "未知错误",
        timestamp: new Date(),
        details,
      };

      this.lastHealthCheck = result;
      this.consecutiveFailures++;

      this.logger.error(err as Error);
      return result;
    }
  }

  /**
   * 开始自动健康检查
   *
   * @description 启动定期健康检查
   *
   * @param driver 数据库驱动
   * @param config 健康检查配置
   */
  startAutoHealthCheck(
    driver: DatabaseDriver,
    config: HealthCheckConfig = this.getDefaultConfig(),
  ): void {
    if (this.healthCheckInterval) {
      this.logger.warn("自动健康检查已在运行");
      return;
    }

    if (!config.autoCheck) {
      this.logger.log("自动健康检查已禁用");
      return;
    }

    this.logger.log("启动自动健康检查", {
      interval: config.interval,
      timeout: config.timeout,
    });

    this.healthCheckInterval = setInterval(async () => {
      try {
        await this.performHealthCheck(driver, config);
      } catch (error) {
        this.logger.error(error as Error);
      }
    }, config.interval);
  }

  /**
   * 停止自动健康检查
   *
   * @description 停止定期健康检查
   */
  stopAutoHealthCheck(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = undefined;
      this.logger.log("自动健康检查已停止");
    }
  }

  /**
   * 获取最后一次健康检查结果
   *
   * @description 获取最后一次健康检查的结果
   *
   * @returns 健康检查结果或 undefined
   */
  getLastHealthCheck(): HealthCheckResult | undefined {
    return this.lastHealthCheck;
  }

  /**
   * 获取连续失败次数
   *
   * @description 获取连续健康检查失败的次数
   *
   * @returns 连续失败次数
   */
  getConsecutiveFailures(): number {
    return this.consecutiveFailures;
  }

  /**
   * 检查连接状态
   *
   * @private
   */
  private async checkConnection(
    driver: DatabaseDriver,
    timeout: number,
  ): Promise<boolean> {
    try {
      const healthResult = await Promise.race([
        driver.healthCheck(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("连接检查超时")), timeout),
        ),
      ]);

      return healthResult.healthy;
    } catch (error) {
      this.logger.error(error as Error);
      return false;
    }
  }

  /**
   * 检查连接池健康状态
   *
   * @private
   */
  private async checkPoolHealth(driver: DatabaseDriver): Promise<boolean> {
    try {
      const health = await this.poolAdapter.checkPoolHealth(driver);
      return health.healthy;
    } catch (error) {
      this.logger.error(error as Error);
      return false;
    }
  }

  /**
   * 检查性能状态
   *
   * @private
   */
  private async checkPerformance(
    driver: DatabaseDriver,
    timeout: number,
  ): Promise<boolean> {
    try {
      const startTime = Date.now();

      // 执行简单的性能测试
      await Promise.race([
        driver.healthCheck(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("性能检查超时")), timeout),
        ),
      ]);

      const responseTime = Date.now() - startTime;

      // 如果响应时间超过 1 秒，认为性能有问题
      return responseTime < 1000;
    } catch (error) {
      this.logger.error(error as Error);
      return false;
    }
  }

  /**
   * 获取默认配置
   *
   * @private
   */
  private getDefaultConfig(): HealthCheckConfig {
    return {
      interval: 60000, // 1 分钟
      timeout: 5000, // 5 秒
      retryCount: 3,
      autoCheck: true,
    };
  }
}
