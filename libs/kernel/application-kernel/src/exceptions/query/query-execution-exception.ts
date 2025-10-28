/**
 * @fileoverview 查询执行异常类
 * @description 查询执行相关的异常
 */

import { ApplicationException } from "../base/application-exception.base.js";
import { ExceptionCodes } from "../base/exception-codes.js";
import { EntityId } from "@hl8/domain-kernel";

/**
 * 查询执行异常类
 * @description 查询执行相关的异常
 */
export class QueryExecutionException extends ApplicationException {
  private readonly _queryType: string;
  private readonly _queryId: EntityId;
  private readonly _handlerName: string;

  /**
   * 创建查询执行异常
   * @param message 异常消息
   * @param errorCode 错误代码
   * @param queryType 查询类型
   * @param queryId 查询ID
   * @param handlerName 处理器名称
   * @param context 异常上下文
   * @param cause 原始异常
   * @param exceptionId 异常标识符，可选，默认自动生成
   */
  constructor(
    message: string,
    errorCode: ExceptionCodes,
    queryType: string,
    queryId: EntityId,
    handlerName: string,
    context: Record<string, unknown> = {},
    cause?: Error,
    exceptionId?: EntityId,
  ) {
    super(
      message,
      errorCode,
      "Query",
      "execute",
      {
        ...context,
        queryType,
        queryId: queryId.toString(),
        handlerName,
      },
      cause,
      exceptionId,
    );

    this._queryType = queryType;
    this._queryId = queryId;
    this._handlerName = handlerName;
  }

  /**
   * 获取查询类型
   * @returns 查询类型
   */
  public getQueryType(): string {
    return this._queryType;
  }

  /**
   * 获取查询ID
   * @returns 查询ID
   */
  public getQueryId(): EntityId {
    return this._queryId;
  }

  /**
   * 获取处理器名称
   * @returns 处理器名称
   */
  public getHandlerName(): string {
    return this._handlerName;
  }

  /**
   * 克隆异常
   * @returns 新的查询执行异常实例
   */
  public clone(): QueryExecutionException {
    return new QueryExecutionException(
      this.message,
      this.errorCode as ExceptionCodes,
      this._queryType,
      this._queryId,
      this._handlerName,
      this.context,
      this.cause,
      this.exceptionId,
    );
  }
}
