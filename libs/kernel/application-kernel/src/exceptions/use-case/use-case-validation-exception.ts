/**
 * @fileoverview 用例验证异常类
 * @description 用例输入验证相关的异常
 */

import { UseCaseException } from "./use-case-exception.js";
import { ExceptionCodes } from "../base/exception-codes.js";
import { EntityId } from "@hl8/domain-kernel";

/**
 * 用例验证异常类
 * @description 用例输入验证相关的异常
 */
export class UseCaseValidationException extends UseCaseException {
  private readonly _validationErrors: string[];

  /**
   * 创建用例验证异常
   * @param message 异常消息
   * @param useCaseName 用例名称
   * @param inputData 输入数据
   * @param validationErrors 验证错误列表
   * @param context 异常上下文
   * @param cause 原始异常
   * @param exceptionId 异常标识符，可选，默认自动生成
   */
  constructor(
    message: string,
    useCaseName: string,
    inputData: unknown,
    validationErrors: string[],
    context: Record<string, unknown> = {},
    cause?: Error,
    exceptionId?: EntityId,
  ) {
    super(
      message,
      ExceptionCodes.USE_CASE_VALIDATION_FAILED,
      useCaseName,
      inputData,
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
    return `${this.getUseCaseName()}验证失败: ${this._validationErrors.join(", ")}`;
  }

  /**
   * 克隆异常
   * @returns 新的用例验证异常实例
   */
  public clone(): UseCaseValidationException {
    return new UseCaseValidationException(
      this.message,
      this.getUseCaseName(),
      this.getInputData(),
      this._validationErrors,
      this.context,
      this.cause,
      this.exceptionId,
    );
  }
}
