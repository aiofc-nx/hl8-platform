/**
 * @fileoverview 应用层异常基类
 * @description 提供应用层异常的基础功能，继承自领域层DomainException
 */

import {
  DomainException,
  ExceptionType,
  ExceptionSeverity,
} from "@hl8/domain-kernel";
import { EntityId } from "@hl8/domain-kernel";

/**
 * 应用层异常基类
 * @description 继承自领域层DomainException，提供应用层特定的异常功能
 */
export abstract class ApplicationException extends DomainException {
  private readonly _component: string;
  private readonly _operation: string;

  /**
   * 创建应用层异常
   * @param message 异常消息
   * @param errorCode 错误代码
   * @param component 组件名称
   * @param operation 操作名称
   * @param context 异常上下文
   * @param cause 原始异常
   * @param exceptionId 异常标识符，可选，默认自动生成
   */
  constructor(
    message: string,
    errorCode: string,
    component: string,
    operation: string,
    context: Record<string, unknown> = {},
    cause?: Error,
    exceptionId?: EntityId,
  ) {
    super(
      message,
      ExceptionType.SYSTEM, // 应用层异常默认为系统异常
      errorCode,
      {
        ...context,
        component,
        operation,
      },
      cause,
      exceptionId,
    );

    this._component = component;
    this._operation = operation;
  }

  /**
   * 获取组件名称
   * @returns 组件名称
   */
  public getComponent(): string {
    return this._component;
  }

  /**
   * 获取操作名称
   * @returns 操作名称
   */
  public getOperation(): string {
    return this._operation;
  }

  /**
   * 获取异常严重程度
   * @returns 异常严重程度
   */
  public getSeverity(): ExceptionSeverity {
    // 应用层异常通常为中等严重程度
    return ExceptionSeverity.MEDIUM;
  }

  /**
   * 检查异常是否可恢复
   * @returns 是否可恢复
   */
  public isRecoverable(): boolean {
    // 应用层异常通常可以通过重试或修正输入来恢复
    return true;
  }

  /**
   * 获取异常建议
   * @returns 异常建议
   */
  public getSuggestion(): string {
    return `请检查${this._component}组件的${this._operation}操作，修正后重试`;
  }

  /**
   * 克隆异常
   * @returns 新的应用层异常实例
   */
  public abstract clone(): ApplicationException;

  /**
   * 序列化异常信息
   * @returns 序列化后的异常信息
   */
  public toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      component: this._component,
      operation: this._operation,
    };
  }
}
