/**
 * 数据库连接异常
 *
 * @description 当数据库连接失败时抛出此异常
 *
 * ## 业务规则
 *
 * - HTTP 状态码：503 Service Unavailable
 * - 错误代码：DATABASE_CONNECTION_ERROR
 * - 使用场景：连接失败、连接断开、连接超时
 *
 * ## 使用场景
 *
 * - 应用启动时无法连接到数据库
 * - 数据库服务不可用
 * - 网络连接问题
 * - 认证失败
 *
 * @example
 * ```typescript
 * try {
 *   await this.orm.connect();
 * } catch (error) {
 *   throw new DatabaseConnectionException(
 *     '无法连接到数据库服务器',
 *     { host: config.host, port: config.port }
 *   );
 * }
 * ```
 *
 * @since 1.0.0
 */

import { SystemException } from "@hl8/domain-kernel";

/**
 * 数据库连接异常
 *
 * @description 当数据库连接失败时抛出的系统异常
 */
export class DatabaseConnectionException extends SystemException {
  /**
   * 创建数据库连接异常
   *
   * @param detail - 详细错误说明（中文）
   * @param data - 诊断信息（可选），不包含敏感数据
   */
  constructor(detail: string, data?: Record<string, any>) {
    super(
      detail, // message
      "DATABASE_CONNECTION_ERROR", // errorCode
      data || {}, // context
    );
  }
}
