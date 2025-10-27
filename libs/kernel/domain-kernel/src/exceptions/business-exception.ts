/**
 * @fileoverview 业务异常类
 * @description 表示业务逻辑相关的异常
 */

import {
  DomainException,
  ExceptionSeverity,
} from "./base/domain-exception.base.js";
import { ExceptionType } from "./base/exception-type.enum.js";
import { EntityId } from "../identifiers/entity-id.js";

/**
 * 业务异常类
 * @description 表示业务逻辑相关的异常，通常由业务规则违反引起
 */
export class BusinessException extends DomainException {
  /**
   * 创建业务异常
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
      ExceptionType.BUSINESS,
      errorCode,
      context,
      cause,
      exceptionId,
    );
  }

  /**
   * 克隆异常
   * @returns 新的业务异常实例
   */
  public clone(): BusinessException {
    return new BusinessException(
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
    // 业务异常通常为中等严重程度
    return ExceptionSeverity.MEDIUM;
  }

  /**
   * 检查异常是否可恢复
   * @returns 是否可恢复
   */
  public isRecoverable(): boolean {
    // 业务异常通常可以通过修正输入或状态来恢复
    return true;
  }

  /**
   * 获取异常建议
   * @returns 异常建议
   */
  public getSuggestion(): string {
    return "请检查业务规则和输入数据，修正后重试";
  }
}
