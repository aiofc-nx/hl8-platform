/**
 * 健康检查服务
 *
 * @description 提供数据库健康检查功能
 *
 * ## 业务规则
 *
 * ### 健康状态规则
 * - healthy: 连接正常，连接池健康
 * - degraded: 连接正常，但连接池接近上限
 * - unhealthy: 连接失败或不可用
 *
 * ### 检查规则
 * - 检查数据库连通性
 * - 检查连接池状态
 * - 检查响应时间
 * - 记录检查结果
 *
 * @example
 * ```typescript
 * @Controller('health')
 * export class HealthController {
 *   constructor(
 *     private readonly healthCheck: HealthCheckService,
 *   ) {}
 *
 *   @Get('database')
 *   async checkDatabase() {
 *     return this.healthCheck.check();
 *   }
 * }
 * ```
 *
 * @since 1.0.0
 */

import { Logger } from "@hl8/logger";
import { Injectable } from "@nestjs/common";
import { ConnectionManager } from "../connection/connection.manager.js";
import { ConnectionHealthService } from "../connection/connection-health.service.js";
import { ConnectionPoolAdapter } from "../connection/connection-pool.adapter.js";
// import { DatabaseDriver } from "../drivers/database-driver.interface.js";
import { HealthCheckException } from "../exceptions/health-check.exception.js";
import type { PoolStats } from "../types/connection.types.js";
import type { HealthCheckResult } from "../types/monitoring.types.js";

@Injectable()
export class HealthCheckService {
  constructor(
    private readonly connectionManager: ConnectionManager,
    private readonly connectionHealthService: ConnectionHealthService,
    private readonly poolAdapter: ConnectionPoolAdapter,
    private readonly logger: Logger,
  ) {
    this.logger.log("HealthCheckService 初始化");
  }

  /**
   * 执行健康检查
   *
   * @description 检查数据库连接和连接池状态
   *
   * @returns 健康检查结果
   */
  async check(): Promise<HealthCheckResult> {
    const startTime = Date.now();

    try {
      // 获取数据库驱动
      const driver = this.connectionManager.getDriver();

      if (driver) {
        // 使用新的健康检查服务
        const healthResult =
          await this.connectionHealthService.performHealthCheck(driver);

        const result: HealthCheckResult = {
          healthy: healthResult.healthy,
          status:
            healthResult.status ||
            (healthResult.healthy ? "healthy" : "unhealthy"),
          responseTime: healthResult.responseTime,
          error: healthResult.error,
          timestamp: healthResult.timestamp,
          details: {
            connection: healthResult.healthy,
            pool: true,
            performance: true,
          },
        };

        if (result.status === "unhealthy") {
          this.logger.warn("数据库健康检查异常", result as any);
          throw new HealthCheckException(
            `数据库健康检查失败: ${result.status}`,
            result.status,
            result,
          );
        } else {
          this.logger.debug("数据库健康检查通过", result as any);
        }

        return result;
      } else {
        // 回退到原始实现
        return await this.legacyHealthCheck();
      }
    } catch (error) {
      const responseTime = Date.now() - startTime;

      this.logger.error("健康检查失败", (error as Error).stack);

      return {
        healthy: false,
        status: "unhealthy",
        responseTime,
        error: (error as Error).message,
        timestamp: new Date(),
        details: {
          connection: false,
          pool: false,
          performance: false,
        },
      };
    }
  }

  /**
   * 传统健康检查实现
   *
   * @private
   */
  private async legacyHealthCheck(): Promise<HealthCheckResult> {
    const startTime = Date.now();

    // 检查连接状态
    const isConnected = await this.connectionManager.isConnected();
    const poolStats = await this.connectionManager.getPoolStats();

    const responseTime = Date.now() - startTime;

    // 判断健康状态
    let status: "healthy" | "unhealthy" | "degraded" = "healthy";

    if (!isConnected) {
      status = "unhealthy";
    } else if (poolStats.idle < 2 && poolStats.total >= poolStats.max * 0.9) {
      // 连接池接近上限
      status = "degraded";
    }

    const result: HealthCheckResult = {
      healthy: isConnected,
      status,
      responseTime,
      timestamp: new Date(),
      details: {
        connection: isConnected,
        pool: true,
        performance: true,
      },
    };

    if (status !== "healthy") {
      this.logger.warn("数据库健康检查异常", result as any);
      throw new HealthCheckException(
        `数据库健康检查失败: ${status}`,
        status,
        result,
      );
    } else {
      this.logger.debug("数据库健康检查通过", result as any);
    }

    return result;
  }

  /**
   * 获取连接池统计
   *
   * @description 获取连接池的实时统计信息
   *
   * @returns 连接池统计
   */
  async getPoolStats(): Promise<PoolStats> {
    return this.connectionManager.getPoolStats();
  }

  /**
   * 获取详细健康检查结果
   *
   * @description 获取包含更多细节的健康检查结果
   *
   * @returns 详细健康检查结果
   */
  async getDetailedHealthCheck(): Promise<{
    basic: HealthCheckResult;
    driver?: any;
    pool?: any;
    health?: any;
  }> {
    const basic = await this.check();
    const driver = this.connectionManager.getDriver();

    let poolDetails: any;
    let healthDetails: any;

    if (driver) {
      try {
        poolDetails = await this.poolAdapter.getPoolStats(driver);
        healthDetails =
          await this.connectionHealthService.performHealthCheck(driver);
      } catch (error) {
        this.logger.error(error as Error);
      }
    }

    return {
      basic,
      driver: driver
        ? {
            type: driver.getDriverType(),
            config: driver.getConfigSummary(),
          }
        : undefined,
      pool: poolDetails,
      health: healthDetails,
    };
  }

  /**
   * 启动自动健康检查
   *
   * @description 启动定期健康检查
   */
  startAutoHealthCheck(): void {
    const driver = this.connectionManager.getDriver();
    if (driver) {
      this.connectionHealthService.startAutoHealthCheck(driver);
      this.logger.log("已启动自动健康检查");
    } else {
      this.logger.warn("无法启动自动健康检查：数据库驱动未设置");
    }
  }

  /**
   * 停止自动健康检查
   *
   * @description 停止定期健康检查
   */
  stopAutoHealthCheck(): void {
    this.connectionHealthService.stopAutoHealthCheck();
    this.logger.log("已停止自动健康检查");
  }

  /**
   * 获取健康检查历史
   *
   * @description 获取健康检查的历史记录
   *
   * @returns 健康检查历史
   */
  getHealthCheckHistory(): any {
    return this.connectionHealthService.getLastHealthCheck();
  }
}
