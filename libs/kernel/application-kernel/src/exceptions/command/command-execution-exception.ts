/**
 * @fileoverview 命令执行异常类
 * @description 命令执行相关的异常
 */

import { ApplicationException } from "../base/application-exception.base.js";
import { ExceptionCodes } from "../base/exception-codes.js";
import { EntityId } from "@hl8/domain-kernel";

/**
 * 命令执行异常类
 * @description 命令执行相关的异常
 */
export class CommandExecutionException extends ApplicationException {
  private readonly _commandType: string;
  private readonly _commandId: EntityId;
  private readonly _handlerName: string;

  /**
   * 创建命令执行异常
   * @param message 异常消息
   * @param errorCode 错误代码
   * @param commandType 命令类型
   * @param commandId 命令ID
   * @param handlerName 处理器名称
   * @param context 异常上下文
   * @param cause 原始异常
   * @param exceptionId 异常标识符，可选，默认自动生成
   */
  constructor(
    message: string,
    errorCode: ExceptionCodes,
    commandType: string,
    commandId: EntityId,
    handlerName: string,
    context: Record<string, unknown> = {},
    cause?: Error,
    exceptionId?: EntityId,
  ) {
    super(
      message,
      errorCode,
      "Command",
      "execute",
      {
        ...context,
        commandType,
        commandId: commandId.toString(),
        handlerName,
      },
      cause,
      exceptionId,
    );

    this._commandType = commandType;
    this._commandId = commandId;
    this._handlerName = handlerName;
  }

  /**
   * 获取命令类型
   * @returns 命令类型
   */
  public getCommandType(): string {
    return this._commandType;
  }

  /**
   * 获取命令ID
   * @returns 命令ID
   */
  public getCommandId(): EntityId {
    return this._commandId;
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
   * @returns 新的命令执行异常实例
   */
  public clone(): CommandExecutionException {
    return new CommandExecutionException(
      this.message,
      this.errorCode as ExceptionCodes,
      this._commandType,
      this._commandId,
      this._handlerName,
      this.context,
      this.cause,
      this.exceptionId,
    );
  }
}
