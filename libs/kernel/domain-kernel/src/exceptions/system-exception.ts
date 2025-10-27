/**
 * @fileoverview 系统异常类
 * @description 表示系统操作或基础设施相关的异常
 */

import {
  DomainException,
  ExceptionSeverity,
} from "./base/domain-exception.base.js";
import { ExceptionType } from "./base/exception-type.enum.js";
import { EntityId } from "../identifiers/entity-id.js";

/**
 * 系统异常类
 * @description 表示系统操作或基础设施相关的异常，通常由技术问题引起
 */
export class SystemException extends DomainException {
  /**
   * 创建系统异常
   * @param message 异常消息
   * @param errorCode 错误代码
   * @param context 异常上下文
   * @param cause 原始异常
   * @param exceptionId 异常标识符，可选，默认自动生成
   */
  constructor(
    message: string,
    errorCode: string,
    context: Record<string, unknown> = {},
    cause?: Error,
    exceptionId?: EntityId,
  ) {
    super(
      message,
      ExceptionType.SYSTEM,
      errorCode,
      context,
      cause,
      exceptionId,
    );
  }

  /**
   * 克隆异常
   * @returns 新的系统异常实例
   */
  public clone(): SystemException {
    return new SystemException(
      this.message,
      this.errorCode,
      this.context,
      this.cause,
      this.exceptionId,
    );
  }

  /**
   * 获取异常严重程度
   * @returns 异常严重程度
   */
  public getSeverity(): ExceptionSeverity {
    // 系统异常通常为高严重程度
    return ExceptionSeverity.HIGH;
  }

  /**
   * 检查异常是否可恢复
   * @returns 是否可恢复
   */
  public isRecoverable(): boolean {
    // 系统异常通常需要技术干预才能恢复
    return false;
  }

  /**
   * 获取异常建议
   * @returns 异常建议
   */
  public getSuggestion(): string {
    return "请联系技术支持团队，检查系统状态和基础设施";
  }
}
