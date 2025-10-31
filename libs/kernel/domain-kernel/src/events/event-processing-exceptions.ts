/**
 * @fileoverview 事件处理异常类
 * @description 定义事件处理相关的异常类型
 */

import {
  DomainException,
  ExceptionSeverity,
} from "../exceptions/base/domain-exception.base.js";
import { ExceptionType } from "../exceptions/base/exception-type.enum.js";

/**
 * 事件处理异常类
 * @description 表示事件处理过程中的一般性异常
 */
export class EventProcessingException extends DomainException {
  /**
   * 创建事件处理异常
   * @param message 异常消息
   * @param eventId 事件标识符
   * @param eventType 事件类型
   * @param cause 原始异常，可选
   * @param additionalContext 额外的上下文信息，可选
   */
  constructor(
    message: string,
    eventId?: string,
    eventType?: string,
    cause?: Error,
    additionalContext?: Record<string, unknown>,
  ) {
    super(
      message,
      ExceptionType.SYSTEM,
      "EVENT_PROCESSING_ERROR",
      {
        eventId,
        eventType,
        ...additionalContext,
      },
      cause,
    );
  }

  /**
   * 克隆异常
   * @returns 新的事件处理异常实例
   */
  public clone(): EventProcessingException {
    const context = this.context;
    return new EventProcessingException(
      this.message,
      context.eventId as string,
      context.eventType as string,
      this.cause,
    );
  }

  /**
   * 获取异常严重程度
   * @returns 异常严重程度
   */
  public getSeverity(): ExceptionSeverity {
    return ExceptionSeverity.MEDIUM;
  }

  /**
   * 检查异常是否可恢复
   * @returns 是否可恢复
   */
  public isRecoverable(): boolean {
    return true;
  }

  /**
   * 获取异常建议
   * @returns 异常建议
   */
  public getSuggestion(): string {
    return "请检查事件处理配置和处理器状态，修正后重试";
  }
}

/**
 * 事件处理器未找到异常
 * @description 当找不到适合的事件处理器时抛出
 */
export class EventHandlerNotFoundException extends EventProcessingException {
  /**
   * 创建事件处理器未找到异常
   * @param eventType 事件类型
   * @param eventId 事件标识符，可选
   */
  constructor(eventType: string, eventId?: string) {
    super(`未找到处理事件类型 "${eventType}" 的处理器`, eventId, eventType);
  }

  /**
   * 克隆异常
   * @returns 新的事件处理器未找到异常实例
   */
  public clone(): EventHandlerNotFoundException {
    const context = this.context;
    return new EventHandlerNotFoundException(
      context.eventType as string,
      context.eventId as string,
    );
  }
}

/**
 * 事件处理超时异常
 * @description 当事件处理超时时抛出
 */
export class EventProcessingTimeoutException extends EventProcessingException {
  /**
   * 创建事件处理超时异常
   * @param eventId 事件标识符
   * @param eventType 事件类型
   * @param timeout 超时时间（毫秒）
   */
  constructor(eventId: string, eventType: string, timeout: number) {
    super(`事件处理超时: ${timeout}ms`, eventId, eventType, undefined, {
      timeout,
    });
  }

  /**
   * 克隆异常
   * @returns 新的事件处理超时异常实例
   */
  public clone(): EventProcessingTimeoutException {
    const context = this.context;
    return new EventProcessingTimeoutException(
      context.eventId as string,
      context.eventType as string,
      context.timeout as number,
    );
  }
}

/**
 * 事件处理器验证失败异常
 * @description 当事件处理器验证事件失败时抛出
 */
export class EventHandlerValidationException extends EventProcessingException {
  /**
   * 创建事件处理器验证失败异常
   * @param handlerId 处理器标识符
   * @param eventType 事件类型
   * @param reason 验证失败原因
   */
  constructor(handlerId: string, eventType: string, reason: string) {
    super(
      `事件处理器 "${handlerId}" 验证事件 "${eventType}" 失败: ${reason}`,
      undefined,
      eventType,
      undefined,
      { handlerId, reason },
    );
  }

  /**
   * 克隆异常
   * @returns 新的事件处理器验证失败异常实例
   */
  public clone(): EventHandlerValidationException {
    const context = this.context;
    return new EventHandlerValidationException(
      context.handlerId as string,
      context.eventType as string,
      context.reason as string,
    );
  }
}

/**
 * 事件处理器执行失败异常
 * @description 当事件处理器执行过程中发生错误时抛出
 */
export class EventHandlerExecutionException extends EventProcessingException {
  /**
   * 创建事件处理器执行失败异常
   * @param handlerId 处理器标识符
   * @param eventType 事件类型
   * @param cause 原始异常
   */
  constructor(handlerId: string, eventType: string, cause: Error) {
    super(
      `事件处理器 "${handlerId}" 执行失败: ${cause.message}`,
      undefined,
      eventType,
      cause,
      { handlerId },
    );
  }

  /**
   * 克隆异常
   * @returns 新的事件处理器执行失败异常实例
   */
  public clone(): EventHandlerExecutionException {
    const context = this.context;
    return new EventHandlerExecutionException(
      context.handlerId as string,
      context.eventType as string,
      this.cause!,
    );
  }
}
