/**
 * @fileoverview 事件存储异常类
 * @description 事件存储相关的异常
 */

import { ApplicationException } from "../base/application-exception.base.js";
import { ExceptionCodes } from "../base/exception-codes.js";
import { EntityId } from "@hl8/domain-kernel";

/**
 * 事件存储异常类
 * @description 事件存储相关的异常
 */
export class EventStoreException extends ApplicationException {
  private readonly _storeOperation: string;
  private readonly _aggregateId?: EntityId;

  /**
   * 创建事件存储异常
   * @param message 异常消息
   * @param errorCode 错误代码
   * @param operation 操作类型
   * @param aggregateId 聚合根ID，可选
   * @param context 异常上下文
   * @param cause 原始异常
   * @param exceptionId 异常标识符，可选，默认自动生成
   */
  constructor(
    message: string,
    errorCode: ExceptionCodes,
    operation: string,
    aggregateId?: EntityId,
    context: Record<string, unknown> = {},
    cause?: Error,
    exceptionId?: EntityId,
  ) {
    super(
      message,
      errorCode,
      "EventStore",
      operation,
      {
        ...context,
        aggregateId: aggregateId?.toString(),
      },
      cause,
      exceptionId,
    );

    this._storeOperation = operation;
    this._aggregateId = aggregateId;
  }

  /**
   * 获取操作类型
   * @returns 操作类型
   */
  public getOperation(): string {
    return this._storeOperation;
  }

  /**
   * 获取聚合根ID
   * @returns 聚合根ID
   */
  public getAggregateId(): EntityId | undefined {
    return this._aggregateId;
  }

  /**
   * 克隆异常
   * @returns 新的事件存储异常实例
   */
  public clone(): ApplicationException {
    return new EventStoreException(
      this.message,
      this.errorCode as ExceptionCodes,
      this._storeOperation,
      this._aggregateId,
      this.context,
      this.cause,
      this.exceptionId,
    );
  }
}
