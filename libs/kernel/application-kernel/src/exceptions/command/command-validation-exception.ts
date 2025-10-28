/**
 * @fileoverview 命令验证异常类
 * @description 命令验证相关的异常
 */

import { CommandExecutionException } from "./command-execution-exception.js";
import { ExceptionCodes } from "../base/exception-codes.js";
import { EntityId } from "@hl8/domain-kernel";

/**
 * 命令验证异常类
 * @description 命令验证相关的异常
 */
export class CommandValidationException extends CommandExecutionException {
  private readonly _validationErrors: string[];

  /**
   * 创建命令验证异常
   * @param message 异常消息
   * @param commandType 命令类型
   * @param commandId 命令ID
   * @param handlerName 处理器名称
   * @param validationErrors 验证错误列表
   * @param context 异常上下文
   * @param cause 原始异常
   * @param exceptionId 异常标识符，可选，默认自动生成
   */
  constructor(
    message: string,
    commandType: string,
    commandId: EntityId,
    handlerName: string,
    validationErrors: string[],
    context: Record<string, unknown> = {},
    cause?: Error,
    exceptionId?: EntityId,
  ) {
    super(
      message,
      ExceptionCodes.COMMAND_VALIDATION_FAILED,
      commandType,
      commandId,
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
    return `${this.getCommandType()}验证失败: ${this._validationErrors.join(", ")}`;
  }

  /**
   * 克隆异常
   * @returns 新的命令验证异常实例
   */
  public clone(): CommandValidationException {
    return new CommandValidationException(
      this.message,
      this.getCommandType(),
      this.getCommandId(),
      this.getHandlerName(),
      this._validationErrors,
      this.context,
      this.cause,
      this.exceptionId,
    );
  }
}
