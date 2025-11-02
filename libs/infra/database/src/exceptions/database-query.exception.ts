/**
 * 数据库查询异常
 *
 * @description 当数据库查询执行失败时抛出此异常
 *
 * ## 业务规则
 *
 * - HTTP 状态码：500 Internal Server Error
 * - 错误代码：DATABASE_QUERY_ERROR
 * - 使用场景：查询执行失败、SQL 语法错误、约束违反
 *
 * ## 使用场景
 *
 * - SELECT 查询失败
 * - INSERT/UPDATE/DELETE 操作失败
 * - SQL 语法错误
 * - 数据库约束违反（唯一键、外键等）
 *
 * @example
 * ```typescript
 * try {
 *   return await this.em.find(User, filter);
 * } catch (error) {
 *   throw new DatabaseQueryException(
 *     '查询用户数据失败',
 *     { operation: 'findUsers' }
 *   );
 * }
 * ```
 *
 * @since 1.0.0
 */

import { SystemException } from "@hl8/domain-kernel";

/**
 * 数据库查询异常
 *
 * @description 当数据库查询执行失败时抛出的系统异常
 */
export class DatabaseQueryException extends SystemException {
  /**
   * 创建数据库查询异常
   *
   * @param detail - 详细错误说明（中文）
   * @param data - 诊断信息（可选），如 operation、entity 等
   */
  constructor(detail: string, data?: Record<string, any>) {
    super(
      detail, // message
      "DATABASE_QUERY_ERROR", // errorCode
      data || {}, // context
    );
  }
}
