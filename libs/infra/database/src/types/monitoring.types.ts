/**
 * 监控相关类型定义
 *
 * @description 数据库监控和健康检查的类型定义
 *
 * @since 1.0.0
 */

import type { PoolStats } from "./connection.types.js";

/**
 * 健康检查结果接口
 *
 * @description 数据库健康检查的结果
 */
export interface HealthCheckResult {
  /** 是否健康 */
  healthy: boolean;

  /** 健康状态 */
  status: "healthy" | "unhealthy" | "degraded";

  /** 响应时间（毫秒） */
  responseTime: number;

  /** 错误信息（如果有） */
  error?: string;

  /** 时间戳 */
  timestamp: Date;

  /** 详细信息 */
  details?: Record<string, unknown>;
}

/**
 * 查询性能指标接口
 *
 * @description 查询执行的性能指标
 */
export interface QueryMetrics {
  /** 查询 SQL（脱敏） */
  query?: string;

  /** 执行时间（毫秒） */
  duration: number;

  /** 执行时间戳 */
  executedAt: Date;

  /** 是否为慢查询 */
  isSlow: boolean;

  /** 隔离上下文 */
  isolationContext?: {
    tenantId?: string;
    organizationId?: string;
    departmentId?: string;
  };

  /** 请求 ID（用于追踪） */
  requestId?: string;
}

/**
 * 慢查询日志接口
 *
 * @description 记录慢查询的详细信息
 */
export interface SlowQueryLog {
  /** 日志 ID */
  id: string;

  /** 查询 SQL（脱敏） */
  query: string;

  /** 执行时间（毫秒） */
  duration: number;

  /** 执行时间戳 */
  timestamp: Date;

  /** 租户 ID */
  tenantId?: string;

  /** 请求 ID */
  requestId?: string;

  /** 堆栈跟踪 */
  stackTrace?: string;
}

/**
 * 数据库整体指标接口
 *
 * @description 数据库的整体性能和资源使用指标
 */
export interface DatabaseMetrics {
  /** 采集时间 */
  timestamp: Date;

  /** 连接池指标 */
  pool: PoolStats;

  /** 查询统计 */
  queries: {
    /** 总查询数 */
    total: number;

    /** 平均执行时间（毫秒） */
    avgDuration: number;

    /** 最大执行时间（毫秒） */
    maxDuration: number;

    /** 慢查询数量 */
    slowCount: number;
  };

  /** 事务统计 */
  transactions: {
    /** 活动事务数 */
    active: number;

    /** 提交成功数 */
    committed: number;

    /** 回滚数 */
    rolledBack: number;
  };
}
