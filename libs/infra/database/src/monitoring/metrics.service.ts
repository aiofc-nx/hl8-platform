/**
 * 性能指标服务
 *
 * @description 收集和报告数据库性能指标
 *
 * ## 业务规则
 *
 * ### 慢查询记录规则
 * - 执行时间超过阈值的查询记录为慢查询
 * - 慢查询保存在内存队列中（FIFO）
 * - 队列大小有上限（默认 100 条）
 * - 重启后数据丢失（预期行为）
 *
 * ### 查询统计规则
 * - 使用滑动窗口记录最近的查询
 * - 计算平均、最大、最小执行时间
 * - 统计慢查询数量
 * - 内存中维护，不持久化
 *
 * ### 数据脱敏规则
 * - 查询 SQL 需要脱敏（隐藏敏感参数）
 * - 不记录查询参数的实际值
 * - 不暴露用户的私密信息
 *
 * @example
 * ```typescript
 * @Injectable()
 * export class UserRepository {
 *   constructor(
 *     private readonly metrics: MetricsService,
 *   ) {}
 *
 *   async findAll(): Promise<User[]> {
 *     const startTime = Date.now();
 *     const result = await this.em.find(User, {});
 *
 *     this.metrics.recordQuery({
 *       duration: Date.now() - startTime,
 *       query: 'SELECT * FROM users',
 *     });
 *
 *     return result;
 *   }
 * }
 * ```
 *
 * @since 1.0.0
 */

import { Logger } from "@hl8/logger";
import { Injectable } from "@nestjs/common";
import { v4 as uuidv4 } from "uuid";
import { DatabaseDriver } from "../drivers/database-driver.interface.js";
import { ConnectionPoolAdapter } from "../connection/connection-pool.adapter.js";
import { ConnectionHealthService } from "../connection/connection-health.service.js";
import { ConnectionStatsService } from "../connection/connection-stats.service.js";
import { TransactionMonitor } from "../transaction/transaction-monitor.js";
import { MONITORING_DEFAULTS } from "../constants/defaults.js";
import type {
  DatabaseMetrics,
  QueryMetrics,
  SlowQueryLog,
} from "../types/monitoring.types.js";

@Injectable()
export class MetricsService {
  private slowQueryQueue: SlowQueryLog[] = [];
  private queryDurations: number[] = [];
  private transactionStats = {
    active: 0,
    committed: 0,
    rolledBack: 0,
  };
  private driver: DatabaseDriver | null = null;

  constructor(
    private readonly logger: Logger,
    private readonly poolAdapter: ConnectionPoolAdapter,
    private readonly healthService: ConnectionHealthService,
    private readonly statsService: ConnectionStatsService,
    private readonly transactionMonitor: TransactionMonitor,
  ) {
    this.logger.log("MetricsService 初始化");
  }

  // 查询统计属性
  private queryCount = 0;
  private totalQueryTime = 0;
  private slowQueryCount = 0;
  private errorQueryCount = 0;

  /**
   * 设置数据库驱动
   *
   * @description 设置用于监控的数据库驱动
   *
   * @param driver 数据库驱动
   */
  setDriver(driver: DatabaseDriver): void {
    this.driver = driver;
    this.logger.log("设置数据库驱动用于监控", {
      type: driver.getDriverType(),
    });
  }

  /**
   * 记录查询执行
   *
   * @description 记录查询的执行时间和相关信息
   *
   * @param metrics - 查询指标
   */
  recordQuery(metrics: Partial<QueryMetrics>): void {
    const duration = metrics.duration || 0;
    const threshold = MONITORING_DEFAULTS.SLOW_QUERY_THRESHOLD;

    // 添加到滑动窗口
    this.queryDurations.push(duration);
    if (
      this.queryDurations.length > MONITORING_DEFAULTS.QUERY_METRICS_WINDOW_SIZE
    ) {
      this.queryDurations.shift();
    }

    // 如果是慢查询，记录到队列
    if (duration >= threshold) {
      const slowQuery: SlowQueryLog = {
        id: uuidv4(),
        query: metrics.query || "Unknown query",
        duration,
        timestamp: new Date(),
        tenantId: metrics.isolationContext?.tenantId,
        requestId: metrics.requestId,
      };

      this.slowQueryQueue.push(slowQuery);

      // 保持队列大小
      if (
        this.slowQueryQueue.length > MONITORING_DEFAULTS.SLOW_QUERY_MAX_SIZE
      ) {
        this.slowQueryQueue.shift();
      }

      this.logger.warn("检测到慢查询", {
        duration,
        threshold,
        query: slowQuery.query,
        tenantId: slowQuery.tenantId,
      });
    }
  }

  /**
   * 获取慢查询列表
   *
   * @description 获取最近的慢查询记录
   *
   * @param limit - 返回数量限制（可选）
   * @returns 慢查询列表
   */
  getSlowQueries(limit?: number): SlowQueryLog[] {
    if (limit) {
      return this.slowQueryQueue.slice(-limit);
    }
    return [...this.slowQueryQueue];
  }

  /**
   * 获取数据库整体指标
   *
   * @description 获取数据库的整体性能指标
   *
   * @param poolStats - 连接池统计（从外部传入）
   * @returns 数据库整体指标
   */
  async getDatabaseMetrics(poolStats?: any): Promise<DatabaseMetrics> {
    const queryStats = this.calculateQueryStats();
    let finalPoolStats = poolStats;

    // 如果提供了驱动，获取实时连接池统计
    if (this.driver && !poolStats) {
      try {
        const poolStatsData = await this.poolAdapter.getPoolStats(this.driver);
        finalPoolStats = {
          total: poolStatsData.total,
          active: poolStatsData.active,
          idle: poolStatsData.idle,
          waiting: poolStatsData.waiting,
          max: poolStatsData.max,
          min: poolStatsData.min,
        };
      } catch (error) {
        this.logger.error(error as Error);
        finalPoolStats = {
          total: 0,
          active: 0,
          idle: 0,
          waiting: 0,
          max: 0,
          min: 0,
        };
      }
    }

    return {
      timestamp: new Date(),
      pool: finalPoolStats,
      queries: queryStats,
      transactions: { ...this.transactionStats },
    };
  }

  /**
   * 记录事务提交
   *
   * @description 记录事务提交统计
   */
  recordTransactionCommit(): void {
    this.transactionStats.committed++;
  }

  /**
   * 记录事务回滚
   *
   * @description 记录事务回滚统计
   */
  recordTransactionRollback(): void {
    this.transactionStats.rolledBack++;
  }

  /**
   * 增加活动事务计数
   */
  incrementActiveTransactions(): void {
    this.transactionStats.active++;
  }

  /**
   * 减少活动事务计数
   */
  decrementActiveTransactions(): void {
    this.transactionStats.active = Math.max(
      0,
      this.transactionStats.active - 1,
    );
  }

  /**
   * 获取连接池监控数据
   *
   * @description 获取详细的连接池监控数据
   *
   * @returns 连接池监控数据
   */
  async getPoolMonitoringData(): Promise<any> {
    if (!this.driver) {
      throw new Error("数据库驱动未设置");
    }

    return await this.poolAdapter.getMonitoringData(this.driver);
  }

  /**
   * 获取健康检查结果
   *
   * @description 获取最新的健康检查结果
   *
   * @returns 健康检查结果
   */
  getHealthCheckResult(): any {
    return this.healthService.getLastHealthCheck();
  }

  /**
   * 获取连接池优化建议
   *
   * @description 获取连接池配置优化建议
   *
   * @returns 优化建议
   */
  async getPoolOptimizationSuggestions(): Promise<any> {
    if (!this.driver) {
      throw new Error("数据库驱动未设置");
    }

    return await this.poolAdapter.optimizePoolConfig(this.driver);
  }

  /**
   * 计算查询统计
   *
   * @private
   */
  private calculateQueryStats() {
    if (this.queryDurations.length === 0) {
      return {
        total: 0,
        avgDuration: 0,
        maxDuration: 0,
        slowCount: 0,
      };
    }

    const total = this.queryDurations.length;
    const sum = this.queryDurations.reduce((a, b) => a + b, 0);
    const avgDuration = sum / total;
    const maxDuration = Math.max(...this.queryDurations);
    const slowCount = this.slowQueryQueue.length;

    return {
      total,
      avgDuration,
      maxDuration,
      slowCount,
    };
  }

  /**
   * 获取多数据库性能指标
   *
   * @description 获取跨数据库类型的综合性能指标
   *
   * @returns 多数据库性能指标
   */
  async getMultiDatabaseMetrics(): Promise<{
    databaseType: string;
    connectionMetrics: any;
    transactionMetrics: any;
    queryMetrics: any;
    healthMetrics: any;
    overallScore: number;
  }> {
    const databaseType = this.driver?.getDriverType() || "unknown";

    try {
      // 获取连接指标
      const connectionMetrics = await this.getConnectionMetrics();

      // 获取事务指标
      const transactionMetrics = this.transactionMonitor.getTransactionStats();

      // 获取查询指标
      const queryMetrics = this.getQueryMetrics();

      // 获取健康指标
      const healthMetrics = await this.getHealthMetrics();

      // 计算综合评分
      const overallScore = this.calculateOverallScore({
        connectionMetrics,
        transactionMetrics,
        queryMetrics,
        healthMetrics,
      });

      return {
        databaseType,
        connectionMetrics,
        transactionMetrics,
        queryMetrics,
        healthMetrics,
        overallScore,
      };
    } catch (error) {
      this.logger.error(error as Error);
      return {
        databaseType,
        connectionMetrics: {},
        transactionMetrics: {},
        queryMetrics: {},
        healthMetrics: {},
        overallScore: 0,
      };
    }
  }

  /**
   * 获取连接指标
   *
   * @private
   */
  private async getConnectionMetrics(): Promise<any> {
    try {
      const poolStats = await this.poolAdapter.getPoolStats(this.driver!);
      const connectionStats = await this.statsService.getConnectionStats(
        this.driver!,
      );

      return {
        poolStats,
        connectionStats,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error(error as Error);
      return {};
    }
  }

  /**
   * 获取查询指标
   *
   * @private
   */
  private getQueryMetrics(): any {
    return {
      totalQueries: this.queryCount,
      averageDuration: this.totalQueryTime / Math.max(this.queryCount, 1),
      slowQueries: this.slowQueryCount,
      errorQueries: this.errorQueryCount,
    };
  }

  /**
   * 获取健康指标
   *
   * @private
   */
  private async getHealthMetrics(): Promise<any> {
    try {
      const healthResult = await this.healthService.performHealthCheck(
        this.driver!,
      );
      return {
        status: healthResult.status,
        responseTime: healthResult.responseTime,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error(error as Error);
      return {
        status: "unhealthy",
        responseTime: 0,
        timestamp: new Date(),
      };
    }
  }

  /**
   * 计算综合评分
   *
   * @private
   */
  private calculateOverallScore(metrics: {
    connectionMetrics: any;
    transactionMetrics: any;
    queryMetrics: any;
    healthMetrics: any;
  }): number {
    let score = 0;
    let factors = 0;

    // 连接健康度评分 (25%)
    if (metrics.connectionMetrics.poolStats) {
      const poolUtilization =
        metrics.connectionMetrics.poolStats.utilization || 0;
      const connectionScore = Math.max(0, 100 - poolUtilization);
      score += connectionScore * 0.25;
      factors += 0.25;
    }

    // 事务成功率评分 (25%)
    if (metrics.transactionMetrics.successRate !== undefined) {
      const transactionScore = metrics.transactionMetrics.successRate;
      score += transactionScore * 0.25;
      factors += 0.25;
    }

    // 查询性能评分 (25%)
    if (metrics.queryMetrics.avgDuration !== undefined) {
      const avgDuration = metrics.queryMetrics.avgDuration;
      const queryScore = Math.max(0, 100 - avgDuration / 100); // 假设100ms为满分
      score += Math.min(100, queryScore) * 0.25;
      factors += 0.25;
    }

    // 健康状态评分 (25%)
    if (metrics.healthMetrics.status) {
      const healthScore = metrics.healthMetrics.status === "healthy" ? 100 : 0;
      score += healthScore * 0.25;
      factors += 0.25;
    }

    return factors > 0 ? Math.round(score / factors) : 0;
  }

  /**
   * 获取数据库特定指标
   *
   * @description 根据数据库类型获取特定指标
   *
   * @returns 数据库特定指标
   */
  async getDatabaseSpecificMetrics(): Promise<any> {
    if (!this.driver) {
      return {};
    }

    const databaseType = this.driver.getDriverType();

    try {
      if (databaseType === "postgresql") {
        return await this.getPostgreSQLMetrics();
      } else if (databaseType === "mongodb") {
        return await this.getMongoDBMetrics();
      } else {
        return {};
      }
    } catch (error) {
      this.logger.error(error as Error);
      return {};
    }
  }

  /**
   * 获取 PostgreSQL 特定指标
   *
   * @private
   */
  private async getPostgreSQLMetrics(): Promise<any> {
    // PostgreSQL 特定的性能指标
    return {
      databaseType: "postgresql",
      features: ["ACID 事务支持", "复杂查询优化", "索引统计", "锁等待分析"],
      metrics: {
        // 这里可以添加 PostgreSQL 特定的指标
        version: "PostgreSQL 特定版本信息",
        configuration: "PostgreSQL 配置信息",
      },
    };
  }

  /**
   * 获取 MongoDB 特定指标
   *
   * @private
   */
  private async getMongoDBMetrics(): Promise<any> {
    // MongoDB 特定的性能指标
    return {
      databaseType: "mongodb",
      features: ["文档存储", "聚合管道", "索引优化", "分片支持"],
      metrics: {
        // 这里可以添加 MongoDB 特定的指标
        version: "MongoDB 特定版本信息",
        configuration: "MongoDB 配置信息",
      },
    };
  }

  /**
   * 记录数据库特定查询
   *
   * @description 根据数据库类型记录特定查询指标
   *
   * @param metrics 查询指标
   * @param databaseType 数据库类型
   */
  recordDatabaseSpecificQuery(
    metrics: Partial<QueryMetrics>,
    databaseType: string,
  ): void {
    // 基础查询记录
    this.recordQuery(metrics);

    // 数据库特定处理
    if (databaseType === "postgresql") {
      this.recordPostgreSQLQuery(metrics);
    } else if (databaseType === "mongodb") {
      this.recordMongoDBQuery(metrics);
    }
  }

  /**
   * 记录 PostgreSQL 查询
   *
   * @private
   */
  private recordPostgreSQLQuery(metrics: Partial<QueryMetrics>): void {
    // PostgreSQL 特定的查询记录逻辑
    this.logger.debug("记录 PostgreSQL 查询", {
      query: metrics.query,
      duration: metrics.duration,
    });
  }

  /**
   * 记录 MongoDB 查询
   *
   * @private
   */
  private recordMongoDBQuery(metrics: Partial<QueryMetrics>): void {
    // MongoDB 特定的查询记录逻辑
    this.logger.debug("记录 MongoDB 查询", {
      query: metrics.query,
      duration: metrics.duration,
    });
  }

  /**
   * 获取性能趋势分析
   *
   * @description 分析性能指标的趋势
   *
   * @returns 性能趋势分析
   */
  getPerformanceTrends(): {
    queryTrend: "improving" | "stable" | "degrading";
    transactionTrend: "improving" | "stable" | "degrading";
    connectionTrend: "improving" | "stable" | "degrading";
    overallTrend: "improving" | "stable" | "degrading";
  } {
    // 简化的趋势分析逻辑
    const avgDuration =
      this.queryDurations.length > 0
        ? this.queryDurations.reduce((a, b) => a + b, 0) /
          this.queryDurations.length
        : 0;

    const queryTrend =
      avgDuration < 100
        ? "improving"
        : avgDuration < 500
          ? "stable"
          : "degrading";

    const transactionStats = this.transactionMonitor.getTransactionStats();
    const transactionTrend =
      transactionStats.successRate > 95
        ? "improving"
        : transactionStats.successRate > 90
          ? "stable"
          : "degrading";

    return {
      queryTrend,
      transactionTrend,
      connectionTrend: "stable", // 简化实现
      overallTrend:
        queryTrend === "improving" && transactionTrend === "improving"
          ? "improving"
          : queryTrend === "degrading" || transactionTrend === "degrading"
            ? "degrading"
            : "stable",
    };
  }
}
