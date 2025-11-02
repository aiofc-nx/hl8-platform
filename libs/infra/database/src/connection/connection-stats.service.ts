/**
 * 连接统计服务
 *
 * @description 提供数据库连接的统计和分析功能
 *
 * @since 1.0.0
 */

import { Injectable } from "@nestjs/common";
import { Logger } from "@hl8/logger";
import { DatabaseDriver } from "../drivers/database-driver.interface.js";
import { ConnectionPoolAdapter } from "./connection-pool.adapter.js";
import { ConnectionHealthService } from "./connection-health.service.js";

/**
 * 连接统计信息
 */
export interface ConnectionStats {
  /** 总连接数 */
  totalConnections: number;
  /** 活跃连接数 */
  activeConnections: number;
  /** 空闲连接数 */
  idleConnections: number;
  /** 等待连接数 */
  waitingConnections: number;
  /** 连接使用率 */
  usageRate: number;
  /** 平均响应时间 */
  averageResponseTime: number;
  /** 最大响应时间 */
  maxResponseTime: number;
  /** 最小响应时间 */
  minResponseTime: number;
  /** 连接成功率 */
  successRate: number;
  /** 连接失败率 */
  failureRate: number;
  /** 统计时间 */
  timestamp: Date;
}

/**
 * 连接趋势分析
 */
export interface ConnectionTrend {
  /** 趋势方向 */
  direction: "increasing" | "decreasing" | "stable";
  /** 变化百分比 */
  changePercent: number;
  /** 预测值 */
  predicted: number;
  /** 置信度 */
  confidence: number;
}

/**
 * 连接统计服务
 *
 * @description 提供数据库连接的统计、分析和预测功能
 */
@Injectable()
export class ConnectionStatsService {
  private readonly statsHistory: ConnectionStats[] = [];
  private readonly maxHistorySize = 100;
  private connectionAttempts = 0;
  private connectionSuccesses = 0;
  private responseTimes: number[] = [];

  constructor(
    private readonly logger: Logger,
    private readonly poolAdapter: ConnectionPoolAdapter,
    private readonly healthService: ConnectionHealthService,
  ) {}

  /**
   * 记录连接尝试
   *
   * @description 记录一次连接尝试
   *
   * @param success 是否成功
   * @param responseTime 响应时间（毫秒）
   */
  recordConnectionAttempt(success: boolean, responseTime?: number): void {
    this.connectionAttempts++;

    if (success) {
      this.connectionSuccesses++;
    }

    if (responseTime !== undefined) {
      this.responseTimes.push(responseTime);

      // 保持响应时间历史在合理范围内
      if (this.responseTimes.length > 100) {
        this.responseTimes.shift();
      }
    }

    this.logger.debug("记录连接尝试", {
      success,
      responseTime,
      totalAttempts: this.connectionAttempts,
      successRate: this.getSuccessRate(),
    });
  }

  /**
   * 获取连接统计
   *
   * @description 获取当前的连接统计信息
   *
   * @param driver 数据库驱动
   * @returns 连接统计信息
   */
  async getConnectionStats(driver: DatabaseDriver): Promise<ConnectionStats> {
    try {
      const poolStats = await this.poolAdapter.getPoolStats(driver);
      const _healthResult = await this.healthService.performHealthCheck(driver);

      const stats: ConnectionStats = {
        totalConnections: poolStats.total,
        activeConnections: poolStats.active,
        idleConnections: poolStats.idle,
        waitingConnections: poolStats.waiting,
        usageRate: poolStats.usageRate,
        averageResponseTime: this.calculateAverageResponseTime(),
        maxResponseTime: this.getMaxResponseTime(),
        minResponseTime: this.getMinResponseTime(),
        successRate: this.getSuccessRate(),
        failureRate: this.getFailureRate(),
        timestamp: new Date(),
      };

      // 添加到历史记录
      this.addToHistory(stats);

      return stats;
    } catch (error) {
      this.logger.error(error as Error);
      throw error;
    }
  }

  /**
   * 获取连接趋势分析
   *
   * @description 分析连接使用趋势
   *
   * @returns 连接趋势分析
   */
  getConnectionTrend(): ConnectionTrend {
    if (this.statsHistory.length < 2) {
      return {
        direction: "stable",
        changePercent: 0,
        predicted: 0,
        confidence: 0,
      };
    }

    const recent = this.statsHistory.slice(-10);
    const older = this.statsHistory.slice(-20, -10);

    if (older.length === 0) {
      return {
        direction: "stable",
        changePercent: 0,
        predicted: recent[recent.length - 1]?.usageRate || 0,
        confidence: 0.5,
      };
    }

    const recentAvg = this.calculateAverageUsageRate(recent);
    const olderAvg = this.calculateAverageUsageRate(older);
    const changePercent = ((recentAvg - olderAvg) / olderAvg) * 100;

    let direction: "increasing" | "decreasing" | "stable";
    if (changePercent > 5) {
      direction = "increasing";
    } else if (changePercent < -5) {
      direction = "decreasing";
    } else {
      direction = "stable";
    }

    // 简单的线性预测
    const predicted = this.predictUsageRate(recent);
    const confidence = this.calculateConfidence(recent);

    return {
      direction,
      changePercent: Math.round(changePercent * 100) / 100,
      predicted: Math.round(predicted * 100) / 100,
      confidence: Math.round(confidence * 100) / 100,
    };
  }

  /**
   * 获取连接性能报告
   *
   * @description 生成连接性能分析报告
   *
   * @param driver 数据库驱动
   * @returns 性能报告
   */
  async getPerformanceReport(driver: DatabaseDriver): Promise<{
    stats: ConnectionStats;
    trend: ConnectionTrend;
    recommendations: string[];
    alerts: string[];
  }> {
    const stats = await this.getConnectionStats(driver);
    const trend = this.getConnectionTrend();
    const recommendations: string[] = [];
    const alerts: string[] = [];

    // 分析使用率
    if (stats.usageRate > 90) {
      alerts.push("连接池使用率过高，可能导致性能问题");
      recommendations.push("考虑增加最大连接数或优化查询性能");
    } else if (stats.usageRate < 20) {
      recommendations.push(
        "连接池使用率较低，可以考虑减少最大连接数以节省资源",
      );
    }

    // 分析响应时间
    if (stats.averageResponseTime > 1000) {
      alerts.push("平均响应时间过长，可能影响用户体验");
      recommendations.push("优化数据库查询和索引，检查网络延迟");
    }

    // 分析成功率
    if (stats.successRate < 95) {
      alerts.push("连接成功率较低，可能存在稳定性问题");
      recommendations.push("检查数据库配置和网络连接稳定性");
    }

    // 分析趋势
    if (trend.direction === "increasing" && trend.changePercent > 20) {
      alerts.push("连接使用率快速上升，需要关注");
      recommendations.push("监控连接使用情况，准备扩容");
    }

    return {
      stats,
      trend,
      recommendations,
      alerts,
    };
  }

  /**
   * 获取历史统计
   *
   * @description 获取连接统计的历史记录
   *
   * @param limit 返回记录数限制
   * @returns 历史统计记录
   */
  getHistoryStats(limit?: number): ConnectionStats[] {
    if (limit) {
      return this.statsHistory.slice(-limit);
    }
    return [...this.statsHistory];
  }

  /**
   * 清除历史记录
   *
   * @description 清除所有历史统计记录
   */
  clearHistory(): void {
    this.statsHistory.length = 0;
    this.responseTimes.length = 0;
    this.connectionAttempts = 0;
    this.connectionSuccesses = 0;
    this.logger.log("已清除连接统计历史记录");
  }

  /**
   * 获取成功率
   *
   * @private
   */
  private getSuccessRate(): number {
    if (this.connectionAttempts === 0) {
      return 0;
    }
    return (this.connectionSuccesses / this.connectionAttempts) * 100;
  }

  /**
   * 获取失败率
   *
   * @private
   */
  private getFailureRate(): number {
    return 100 - this.getSuccessRate();
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
   * 获取最大响应时间
   *
   * @private
   */
  private getMaxResponseTime(): number {
    if (this.responseTimes.length === 0) {
      return 0;
    }
    return Math.max(...this.responseTimes);
  }

  /**
   * 获取最小响应时间
   *
   * @private
   */
  private getMinResponseTime(): number {
    if (this.responseTimes.length === 0) {
      return 0;
    }
    return Math.min(...this.responseTimes);
  }

  /**
   * 添加到历史记录
   *
   * @private
   */
  private addToHistory(stats: ConnectionStats): void {
    this.statsHistory.push(stats);

    if (this.statsHistory.length > this.maxHistorySize) {
      this.statsHistory.shift();
    }
  }

  /**
   * 计算平均使用率
   *
   * @private
   */
  private calculateAverageUsageRate(stats: ConnectionStats[]): number {
    if (stats.length === 0) {
      return 0;
    }
    const sum = stats.reduce((acc, stat) => acc + stat.usageRate, 0);
    return sum / stats.length;
  }

  /**
   * 预测使用率
   *
   * @private
   */
  private predictUsageRate(recent: ConnectionStats[]): number {
    if (recent.length < 2) {
      return recent[0]?.usageRate || 0;
    }

    // 简单的线性回归预测
    const n = recent.length;
    const x = Array.from({ length: n }, (_, i) => i);
    const y = recent.map((stat) => stat.usageRate);

    const sumX = x.reduce((acc, val) => acc + val, 0);
    const sumY = y.reduce((acc, val) => acc + val, 0);
    const sumXY = x.reduce((acc, val, i) => acc + val * y[i], 0);
    const sumXX = x.reduce((acc, val) => acc + val * val, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    return slope * n + intercept;
  }

  /**
   * 计算置信度
   *
   * @private
   */
  private calculateConfidence(recent: ConnectionStats[]): number {
    if (recent.length < 3) {
      return 0.5;
    }

    // 基于数据点数量和方差计算置信度
    const usageRates = recent.map((stat) => stat.usageRate);
    const mean =
      usageRates.reduce((acc, rate) => acc + rate, 0) / usageRates.length;
    const variance =
      usageRates.reduce((acc, rate) => acc + Math.pow(rate - mean, 2), 0) /
      usageRates.length;
    const stdDev = Math.sqrt(variance);

    // 标准差越小，置信度越高
    const confidence = Math.max(0, Math.min(1, 1 - stdDev / mean));
    return confidence;
  }
}
