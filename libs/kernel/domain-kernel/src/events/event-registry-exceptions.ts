/**
 * @fileoverview 事件注册表异常类
 * @description 定义事件注册表相关的异常类型
 */

import {
  DomainException,
  ExceptionSeverity,
} from "../exceptions/base/domain-exception.base.js";
import { ExceptionType } from "../exceptions/base/exception-type.enum.js";

/**
 * 事件注册表异常类
 * @description 表示事件注册表操作过程中的异常
 */
export class EventRegistryException extends DomainException {
  /**
   * 创建事件注册表异常
   * @param message 异常消息
   * @param handlerId 处理器标识符，可选
   */
  constructor(message: string, handlerId?: string) {
    super(message, ExceptionType.SYSTEM, "EVENT_REGISTRY_ERROR", {
      handlerId,
    });
  }

  /**
   * 克隆异常
   * @returns 新的事件注册表异常实例
   */
  public clone(): EventRegistryException {
    const context = this.context;
    return new EventRegistryException(
      this.message,
      context.handlerId as string,
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
    return "请检查事件处理器配置和注册信息，修正后重试";
  }
}
