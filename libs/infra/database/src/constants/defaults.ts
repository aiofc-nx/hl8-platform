/**
 * 默认配置值
 *
 * @description Database 模块的默认配置常量
 *
 * ## 业务规则
 *
 * ### 连接池规则
 * - 最小连接数默认为 5，确保基本可用性
 * - 最大连接数默认为 20，避免资源耗尽
 * - 空闲超时默认为 10 分钟，平衡性能和资源
 *
 * ### 超时规则
 * - 连接超时默认为 5 秒，快速失败
 * - 查询超时默认为 30 秒，避免长查询阻塞
 * - 事务超时默认为 60 秒，给复杂事务足够时间
 *
 * ### 监控规则
 * - 慢查询阈值默认为 1000 毫秒（1 秒）
 * - 慢查询队列大小默认为 100 条
 * - 查询指标窗口大小默认为 1000 次
 *
 * @since 1.0.0
 */

/**
 * 连接池默认配置
 */
export const POOL_DEFAULTS = {
  /**
   * 最小连接数
   */
  MIN: 5,

  /**
   * 最大连接数
   */
  MAX: 20,

  /**
   * 空闲超时时间（毫秒）
   *
   * @default 600000 (10 分钟)
   */
  IDLE_TIMEOUT: 600_000,

  /**
   * 获取连接超时（毫秒）
   *
   * @default 10000 (10 秒)
   */
  ACQUIRE_TIMEOUT: 10_000,

  /**
   * 创建连接超时（毫秒）
   *
   * @default 5000 (5 秒)
   */
  CREATE_TIMEOUT: 5_000,
} as const;

/**
 * 连接默认配置
 */
export const CONNECTION_DEFAULTS = {
  /**
   * 连接超时（毫秒）
   *
   * @default 5000 (5 秒)
   */
  CONNECT_TIMEOUT: 5_000,

  /**
   * 查询超时（毫秒）
   *
   * @default 30000 (30 秒)
   */
  QUERY_TIMEOUT: 30_000,

  /**
   * 重连最大次数
   *
   * @default 5
   */
  MAX_RECONNECT_ATTEMPTS: 5,

  /**
   * 重连初始延迟（毫秒）
   *
   * @default 1000 (1 秒)
   */
  RECONNECT_INITIAL_DELAY: 1_000,

  /**
   * 重连最大延迟（毫秒）
   *
   * @default 30000 (30 秒)
   */
  RECONNECT_MAX_DELAY: 30_000,

  /**
   * 最大重试次数
   *
   * @default 3
   */
  MAX_RETRY_ATTEMPTS: 3,

  /**
   * 基础重试延迟（毫秒）
   *
   * @default 1000 (1 秒)
   */
  BASE_RETRY_DELAY: 1_000,

  /**
   * 最大重试延迟（毫秒）
   *
   * @default 5000 (5 秒)
   */
  MAX_RETRY_DELAY: 5_000,
} as const;

/**
 * 事务默认配置
 */
export const TRANSACTION_DEFAULTS = {
  /**
   * 事务超时（毫秒）
   *
   * @default 60000 (60 秒)
   */
  TIMEOUT: 60_000,
} as const;

/**
 * 监控默认配置
 */
export const MONITORING_DEFAULTS = {
  /**
   * 慢查询阈值（毫秒）
   *
   * @default 1000 (1 秒)
   */
  SLOW_QUERY_THRESHOLD: 1_000,

  /**
   * 慢查询队列最大大小
   *
   * @default 100
   */
  SLOW_QUERY_MAX_SIZE: 100,

  /**
   * 查询指标滑动窗口大小
   *
   * @default 1000
   */
  QUERY_METRICS_WINDOW_SIZE: 1_000,

  /**
   * 健康检查超时（毫秒）
   *
   * @default 3000 (3 秒)
   */
  HEALTH_CHECK_TIMEOUT: 3_000,
} as const;
