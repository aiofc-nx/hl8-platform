/**
 * @fileoverview 查询验证异常类
 * @description 查询验证相关的异常
 */

import { QueryExecutionException } from "./query-execution-exception.js";
import { ExceptionCodes } from "../base/exception-codes.js";
import { EntityId } from "@hl8/domain-kernel";

/**
 * 查询验证异常类
 * @description 查询验证相关的异常
 */
export class QueryValidationException extends QueryExecutionException {
  private readonly _validationErrors: string[];

  /**
   * 创建查询验证异常
   * @param message 异常消息
   * @param queryType 查询类型
   * @param queryId 查询ID
   * @param handlerName 处理器名称
   * @param validationErrors 验证错误列表
   * @param context 异常上下文
   * @param cause 原始异常
   * @param exceptionId 异常标识符，可选，默认自动生成
   */
  constructor(
    message: string,
    queryType: string,
    queryId: EntityId,
    handlerName: string,
    validationErrors: string[],
    context: Record<string, unknown> = {},
    cause?: Error,
    exceptionId?: EntityId,
  ) {
    super(
      message,
      ExceptionCodes.QUERY_VALIDATION_FAILED,
      queryType,
      queryId,
      handlerName,
      {
        ...context,
        validationErrors,
        operation: "validate", // Override operation in context
      },
      cause,
      exceptionId,
    );

    this._validationErrors = validationErrors;
    // Override the operation to "validate" for validation exceptions
    (this as unknown as { _operation: string })._operation = "validate";
    // Update the context to reflect the correct operation
    (
      this as unknown as { _context: Record<string, unknown> }
    )._context.operation = "validate";
  }

  /**
   * 获取验证错误列表
   * @returns 验证错误列表
   */
  public getValidationErrors(): string[] {
    return [...this._validationErrors];
  }

  /**
   * 获取验证错误摘要
   * @returns 验证错误摘要
   */
  public getValidationSummary(): string {
    return `${this.getQueryType()}验证失败: ${this._validationErrors.join(", ")}`;
  }

  /**
   * 克隆异常
   * @returns 新的查询验证异常实例
   */
  public clone(): QueryValidationException {
    return new QueryValidationException(
      this.message,
      this.getQueryType(),
      this.getQueryId(),
      this.getHandlerName(),
      this._validationErrors,
      this.context,
      this.cause,
      this.exceptionId,
    );
  }
}
