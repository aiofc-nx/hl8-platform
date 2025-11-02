/**
 * 连接池适配器
 *
 * @description 为不同数据库类型提供统一的连接池管理接口
 *
 * @since 1.0.0
 */

import { Injectable } from "@nestjs/common";
import { Logger } from "@hl8/logger";
import { DatabaseDriver } from "../drivers/database-driver.interface.js";
import type { PoolConfig } from "../types/connection.types.js";

// PoolConfig interface is now imported from types module

/**
 * 连接池统计
 */
export interface PoolStatistics {
  /** 总连接数 */
  total: number;
  /** 活跃连接数 */
  active: number;
  /** 空闲连接数 */
  idle: number;
  /** 等待连接数 */
  waiting: number;
  /** 最大连接数 */
  max: number;
  /** 最小连接数 */
  min: number;
  /** 连接使用率 */
  usageRate: number;
  /** 平均响应时间 */
  averageResponseTime: number;
}

/**
 * 连接池适配器
 *
 * @description 提供统一的连接池管理接口，适配不同数据库类型
 */
@Injectable()
export class ConnectionPoolAdapter {
  private readonly responseTimes: number[] = [];
  private readonly maxResponseTimeHistory = 100;

  constructor(private readonly logger: Logger) {}

  /**
   * 获取连接池统计
   *
   * @description 从数据库驱动获取连接池统计信息
   *
   * @param driver 数据库驱动
   * @returns 连接池统计
   */
  async getPoolStats(driver: DatabaseDriver): Promise<PoolStatistics> {
    try {
      const stats = driver.getPoolStats();
      const usageRate = stats.max > 0 ? (stats.active / stats.max) * 100 : 0;
      const averageResponseTime = this.calculateAverageResponseTime();

      return {
        total: stats.total,
        active: stats.active,
        idle: stats.idle,
        waiting: stats.waiting,
        max: stats.max,
        min: stats.min,
        usageRate: Math.round(usageRate * 100) / 100,
        averageResponseTime: Math.round(averageResponseTime * 100) / 100,
      };
    } catch (error) {
      this.logger.error(error as Error);
      return this.getEmptyStats();
    }
  }

  /**
   * 检查连接池健康状态
   *
   * @description 检查连接池是否健康
   *
   * @param driver 数据库驱动
   * @returns 健康状态
   */
  async checkPoolHealth(driver: DatabaseDriver): Promise<{
    healthy: boolean;
    issues: string[];
    recommendations: string[];
  }> {
    const stats = await this.getPoolStats(driver);
    const issues: string[] = [];
    const recommendations: string[] = [];

    // 检查连接使用率
    if (stats.usageRate > 90) {
      issues.push("连接池使用率过高");
      recommendations.push("考虑增加最大连接数或优化查询性能");
    }

    // 检查等待连接数
    if (stats.waiting > 0) {
      issues.push("有连接在等待");
      recommendations.push("检查连接池配置和数据库性能");
    }

    // 检查响应时间
    if (stats.averageResponseTime > 1000) {
      issues.push("平均响应时间过长");
      recommendations.push("优化数据库查询和索引");
    }

    // 检查连接泄漏
    if (stats.active > stats.max * 0.8 && stats.idle < stats.min) {
      issues.push("可能存在连接泄漏");
      recommendations.push("检查代码中是否正确释放连接");
    }

    return {
      healthy: issues.length === 0,
      issues,
      recommendations,
    };
  }

  /**
   * 优化连接池配置
   *
   * @description 根据当前使用情况提供连接池配置优化建议
   *
   * @param driver 数据库驱动
   * @returns 优化建议
   */
  async optimizePoolConfig(driver: DatabaseDriver): Promise<{
    current: PoolConfig;
    recommended: PoolConfig;
    reasoning: string[];
  }> {
    const stats = await this.getPoolStats(driver);
    const current = this.getCurrentPoolConfig(driver);

    const reasoning: string[] = [];
    const recommended: PoolConfig = { ...current };

    // 基于使用率调整最大连接数
    if (stats.usageRate > 80) {
      recommended.max = Math.min(current.max * 1.5, 50);
      reasoning.push(
        `当前使用率 ${stats.usageRate}%，建议增加最大连接数到 ${recommended.max}`,
      );
    } else if (stats.usageRate < 30 && current.max > 10) {
      recommended.max = Math.max(current.max * 0.8, 10);
      reasoning.push(
        `当前使用率 ${stats.usageRate}%，可以减少最大连接数到 ${recommended.max}`,
      );
    }

    // 基于等待时间调整超时设置
    if (stats.waiting > 0) {
      recommended.acquireTimeoutMillis = Math.min(
        current.acquireTimeoutMillis * 1.5,
        30000,
      );
      reasoning.push("检测到连接等待，建议增加获取连接超时时间");
    }

    // 基于响应时间调整空闲超时
    if (stats.averageResponseTime > 500) {
      recommended.idleTimeoutMillis = Math.max(
        current.idleTimeoutMillis * 0.8,
        30000,
      );
      reasoning.push("响应时间较长，建议减少空闲连接超时时间");
    }

    return {
      current,
      recommended,
      reasoning,
    };
  }

  /**
   * 记录响应时间
   *
   * @description 记录数据库操作的响应时间
   *
   * @param responseTime 响应时间（毫秒）
   */
  recordResponseTime(responseTime: number): void {
    this.responseTimes.push(responseTime);

    // 保持历史记录在合理范围内
    if (this.responseTimes.length > this.maxResponseTimeHistory) {
      this.responseTimes.shift();
    }
  }

  /**
   * 获取连接池监控数据
   *
   * @description 获取用于监控的连接池数据
   *
   * @param driver 数据库驱动
   * @returns 监控数据
   */
  async getMonitoringData(driver: DatabaseDriver): Promise<{
    timestamp: Date;
    stats: PoolStatistics;
    health: {
      healthy: boolean;
      issues: string[];
      recommendations: string[];
    };
    trends: {
      responseTimeTrend: "improving" | "stable" | "degrading";
      usageTrend: "increasing" | "stable" | "decreasing";
    };
  }> {
    const stats = await this.getPoolStats(driver);
    const health = await this.checkPoolHealth(driver);

    const responseTimeTrend = this.analyzeResponseTimeTrend();
    const usageTrend = this.analyzeUsageTrend(stats);

    return {
      timestamp: new Date(),
      stats,
      health,
      trends: {
        responseTimeTrend,
        usageTrend,
      },
    };
  }

  /**
   * 计算平均响应时间
   *
   * @private
   */
  private calculateAverageResponseTime(): number {
    if (this.responseTimes.length === 0) {
      return 0;
    }

    const sum = this.responseTimes.reduce((acc, time) => acc + time, 0);
    return sum / this.responseTimes.length;
  }

  /**
   * 获取当前连接池配置
   *
   * @private
   */
  private getCurrentPoolConfig(_driver: DatabaseDriver): PoolConfig {
    // 这里应该从驱动或配置中获取当前配置
    // 目前返回默认配置
    return {
      min: 5,
      max: 20,
      idleTimeoutMillis: 30000,
      acquireTimeoutMillis: 10000,
      createTimeoutMillis: 5000,
    };
  }

  /**
   * 分析响应时间趋势
   *
   * @private
   */
  private analyzeResponseTimeTrend(): "improving" | "stable" | "degrading" {
    if (this.responseTimes.length < 10) {
      return "stable";
    }

    const recent = this.responseTimes.slice(-10);
    const older = this.responseTimes.slice(-20, -10);

    if (older.length === 0) {
      return "stable";
    }

    const recentAvg =
      recent.reduce((acc, time) => acc + time, 0) / recent.length;
    const olderAvg = older.reduce((acc, time) => acc + time, 0) / older.length;

    const changePercent = ((recentAvg - olderAvg) / olderAvg) * 100;

    if (changePercent > 10) {
      return "degrading";
    } else if (changePercent < -10) {
      return "improving";
    } else {
      return "stable";
    }
  }

  /**
   * 分析使用率趋势
   *
   * @private
   */
  private analyzeUsageTrend(
    stats: PoolStatistics,
  ): "increasing" | "stable" | "decreasing" {
    // 这里需要历史数据来分析趋势
    // 目前简化实现
    if (stats.usageRate > 80) {
      return "increasing";
    } else if (stats.usageRate < 30) {
      return "decreasing";
    } else {
      return "stable";
    }
  }

  /**
   * 获取空统计
   *
   * @private
   */
  private getEmptyStats(): PoolStatistics {
    return {
      total: 0,
      active: 0,
      idle: 0,
      waiting: 0,
      max: 0,
      min: 0,
      usageRate: 0,
      averageResponseTime: 0,
    };
  }
}
