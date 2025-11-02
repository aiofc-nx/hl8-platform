/**
 * 错误代码常量
 *
 * @description Database 模块使用的错误代码定义
 *
 * ## 业务规则
 *
 * - 错误代码使用大写蛇形命名法（UPPER_SNAKE_CASE）
 * - 错误代码必须唯一且具有描述性
 * - 错误代码用于异常追踪和监控告警
 *
 * @since 1.0.0
 */

/**
 * 数据库错误代码
 */
export const DATABASE_ERROR_CODES = {
  /**
   * 数据库连接错误
   *
   * @description 无法建立数据库连接
   * @httpStatus 503
   */
  CONNECTION_ERROR: "DATABASE_CONNECTION_ERROR",

  /**
   * 数据库查询错误
   *
   * @description 查询执行失败
   * @httpStatus 500
   */
  QUERY_ERROR: "DATABASE_QUERY_ERROR",

  /**
   * 数据库事务错误
   *
   * @description 事务执行失败
   * @httpStatus 500
   */
  TRANSACTION_ERROR: "DATABASE_TRANSACTION_ERROR",
} as const;

/**
 * 数据库错误代码类型
 */
export type DatabaseErrorCode =
  (typeof DATABASE_ERROR_CODES)[keyof typeof DATABASE_ERROR_CODES];
