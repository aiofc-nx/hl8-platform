/**
 * 数据库事务异常
 *
 * @description 当事务执行失败时抛出此异常
 *
 * ## 业务规则
 *
 * - HTTP 状态码：500 Internal Server Error
 * - 错误代码：DATABASE_TRANSACTION_ERROR
 * - 使用场景：事务提交失败、回滚失败、死锁
 *
 * ## 使用场景
 *
 * - 事务提交失败
 * - 事务回滚失败
 * - 事务超时
 * - 数据库死锁
 *
 * @example
 * ```typescript
 * try {
 *   await em.transactional(async (tem) => {
 *     // 事务操作
 *   });
 * } catch (error) {
 *   throw new DatabaseTransactionException(
 *     '事务执行失败',
 *     { operation: 'createUser' }
 *   );
 * }
 * ```
 *
 * @since 1.0.0
 */

import { SystemException } from "@hl8/domain-kernel";

/**
 * 事务异常类型
 */
export enum TransactionExceptionType {
  /** 事务执行失败 */
  EXECUTION_FAILED = "EXECUTION_FAILED",
  /** 事务提交失败 */
  COMMIT_FAILED = "COMMIT_FAILED",
  /** 事务回滚失败 */
  ROLLBACK_FAILED = "ROLLBACK_FAILED",
  /** 事务超时 */
  TIMEOUT = "TIMEOUT",
  /** 数据库死锁 */
  DEADLOCK = "DEADLOCK",
  /** 连接失败 */
  CONNECTION_FAILED = "CONNECTION_FAILED",
  /** 隔离级别冲突 */
  ISOLATION_CONFLICT = "ISOLATION_CONFLICT",
  /** 不支持的数据库类型 */
  UNSUPPORTED_DATABASE = "UNSUPPORTED_DATABASE",
  /** 事务配置错误 */
  CONFIGURATION_ERROR = "CONFIGURATION_ERROR",
}

/**
 * 事务异常数据
 */
export interface TransactionExceptionData {
  /** 事务 ID */
  transactionId?: string;
  /** 数据库类型 */
  databaseType?: string;
  /** 隔离级别 */
  isolationLevel?: string;
  /** 执行时间（毫秒） */
  duration?: number;
  /** 重试次数 */
  retryCount?: number;
  /** 操作名称 */
  operation?: string;
  /** 错误代码 */
  errorCode?: string;
  /** 原始错误 */
  originalError?: Error;
  /** 附加数据 */
  metadata?: Record<string, any>;
}

/**
 * 数据库事务异常
 *
 * @description 当事务执行失败时抛出的系统异常
 */
export class DatabaseTransactionException extends SystemException {
  /** 事务异常类型 */
  public readonly transactionExceptionType: TransactionExceptionType;
  /** 异常数据 */
  public readonly exceptionData: TransactionExceptionData;
  /** 详细错误说明 */
  public readonly detail: string;

  /**
   * 创建数据库事务异常
   *
   * @param detail - 详细错误说明（中文）
   * @param exceptionType - 异常类型
   * @param exceptionData - 异常数据
   */
  constructor(
    detail: string,
    exceptionType: TransactionExceptionType = TransactionExceptionType.EXECUTION_FAILED,
    exceptionData?: TransactionExceptionData,
  ) {
    super(
      detail, // message
      "DATABASE_TRANSACTION_ERROR", // errorCode
      {
        transactionExceptionType: exceptionType,
        ...exceptionData,
      }, // context
    );

    this.detail = detail;
    this.transactionExceptionType = exceptionType;
    this.exceptionData = exceptionData || {};
  }

  /**
   * 创建事务执行失败异常
   */
  static executionFailed(
    detail: string,
    data?: TransactionExceptionData,
  ): DatabaseTransactionException {
    return new DatabaseTransactionException(
      detail,
      TransactionExceptionType.EXECUTION_FAILED,
      data,
    );
  }

  /**
   * 创建事务提交失败异常
   */
  static commitFailed(
    detail: string,
    data?: TransactionExceptionData,
  ): DatabaseTransactionException {
    return new DatabaseTransactionException(
      detail,
      TransactionExceptionType.COMMIT_FAILED,
      data,
    );
  }

  /**
   * 创建事务回滚失败异常
   */
  static rollbackFailed(
    detail: string,
    data?: TransactionExceptionData,
  ): DatabaseTransactionException {
    return new DatabaseTransactionException(
      detail,
      TransactionExceptionType.ROLLBACK_FAILED,
      data,
    );
  }

  /**
   * 创建事务超时异常
   */
  static timeout(
    detail: string,
    data?: TransactionExceptionData,
  ): DatabaseTransactionException {
    return new DatabaseTransactionException(
      detail,
      TransactionExceptionType.TIMEOUT,
      data,
    );
  }

  /**
   * 创建数据库死锁异常
   */
  static deadlock(
    detail: string,
    data?: TransactionExceptionData,
  ): DatabaseTransactionException {
    return new DatabaseTransactionException(
      detail,
      TransactionExceptionType.DEADLOCK,
      data,
    );
  }

  /**
   * 创建连接失败异常
   */
  static connectionFailed(
    detail: string,
    data?: TransactionExceptionData,
  ): DatabaseTransactionException {
    return new DatabaseTransactionException(
      detail,
      TransactionExceptionType.CONNECTION_FAILED,
      data,
    );
  }

  /**
   * 创建隔离级别冲突异常
   */
  static isolationConflict(
    detail: string,
    data?: TransactionExceptionData,
  ): DatabaseTransactionException {
    return new DatabaseTransactionException(
      detail,
      TransactionExceptionType.ISOLATION_CONFLICT,
      data,
    );
  }

  /**
   * 创建不支持的数据库类型异常
   */
  static unsupportedDatabase(
    detail: string,
    data?: TransactionExceptionData,
  ): DatabaseTransactionException {
    return new DatabaseTransactionException(
      detail,
      TransactionExceptionType.UNSUPPORTED_DATABASE,
      data,
    );
  }

  /**
   * 创建事务配置错误异常
   */
  static configurationError(
    detail: string,
    data?: TransactionExceptionData,
  ): DatabaseTransactionException {
    return new DatabaseTransactionException(
      detail,
      TransactionExceptionType.CONFIGURATION_ERROR,
      data,
    );
  }

  /**
   * 获取异常摘要
   */
  getExceptionSummary(): {
    type: TransactionExceptionType;
    message: string;
    databaseType?: string;
    transactionId?: string;
    duration?: number;
    retryCount?: number;
  } {
    return {
      type: this.transactionExceptionType,
      message: this.detail,
      databaseType: this.exceptionData.databaseType,
      transactionId: this.exceptionData.transactionId,
      duration: this.exceptionData.duration,
      retryCount: this.exceptionData.retryCount,
    };
  }

  /**
   * 检查是否可重试
   */
  isRetryable(): boolean {
    const retryableTypes = [
      TransactionExceptionType.CONNECTION_FAILED,
      TransactionExceptionType.TIMEOUT,
    ];

    return retryableTypes.includes(this.transactionExceptionType);
  }

  /**
   * 检查是否为死锁
   */
  isDeadlock(): boolean {
    return this.transactionExceptionType === TransactionExceptionType.DEADLOCK;
  }

  /**
   * 检查是否为超时
   */
  isTimeout(): boolean {
    return this.transactionExceptionType === TransactionExceptionType.TIMEOUT;
  }
}
