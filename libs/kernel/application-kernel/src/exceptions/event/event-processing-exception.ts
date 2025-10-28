/**
 * @fileoverview 事件处理异常类
 * @description 事件处理相关的异常
 */

import { ApplicationException } from "../base/application-exception.base.js";
import { ExceptionCodes } from "../base/exception-codes.js";
import { EntityId } from "@hl8/domain-kernel";

/**
 * 事件处理异常类
 * @description 事件处理相关的异常
 */
export class EventProcessingException extends ApplicationException {
  private readonly _eventType: string;
  private readonly _eventId: EntityId;
  private readonly _handlerName: string;

  /**
   * 创建事件处理异常
   * @param message 异常消息
   * @param errorCode 错误代码
   * @param eventType 事件类型
   * @param eventId 事件ID
   * @param handlerName 处理器名称
   * @param context 异常上下文
   * @param cause 原始异常
   * @param exceptionId 异常标识符，可选，默认自动生成
   */
  constructor(
    message: string,
    errorCode: ExceptionCodes,
    eventType: string,
    eventId: EntityId,
    handlerName: string,
    context: Record<string, unknown> = {},
    cause?: Error,
    exceptionId?: EntityId,
  ) {
    super(
      message,
      errorCode,
      "Event",
      "process",
      {
        ...context,
        eventType,
        eventId: eventId.toString(),
        handlerName,
      },
      cause,
      exceptionId,
    );

    this._eventType = eventType;
    this._eventId = eventId;
    this._handlerName = handlerName;
  }

  /**
   * 获取事件类型
   * @returns 事件类型
   */
  public getEventType(): string {
    return this._eventType;
  }

  /**
   * 获取事件ID
   * @returns 事件ID
   */
  public getEventId(): EntityId {
    return this._eventId;
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
   * @returns 新的事件处理异常实例
   */
  public clone(): EventProcessingException {
    return new EventProcessingException(
      this.message,
      this.errorCode as ExceptionCodes,
      this._eventType,
      this._eventId,
      this._handlerName,
      this.context,
      this.cause,
      this.exceptionId,
    );
  }
}
