/**
 * @fileoverview 领域异常基类
 * @description 提供领域异常的基础功能，包括异常分类和错误代码
 */

import { EntityId } from "../../identifiers/entity-id.js";
import { ExceptionType } from "./exception-type.enum.js";

/**
 * 领域异常基类
 * @description 提供领域异常的基础功能，支持异常分类和错误代码
 */
export abstract class DomainException extends Error {
  private readonly _exceptionId: EntityId;
  private readonly _exceptionType: ExceptionType;
  private readonly _errorCode: string;
  private readonly _timestamp: Date;
  private readonly _context: Record<string, unknown>;
  private readonly _cause?: Error;

  /**
   * 创建领域异常
   * @param message 异常消息
   * @param exceptionType 异常类型
   * @param errorCode 错误代码
   * @param context 异常上下文
   * @param cause 原始异常
   * @param exceptionId 异常标识符，可选，默认自动生成
   */
  constructor(
    message: string,
    exceptionType: ExceptionType,
    errorCode: string,
    context: Record<string, unknown> = {},
    cause?: Error,
    exceptionId?: EntityId,
  ) {
    super(message);

    this.name = this.constructor.name;
    this._exceptionId = exceptionId || new EntityId();
    this._exceptionType = exceptionType;
    this._errorCode = errorCode;
    this._timestamp = new Date();
    this._context = { ...context };
    this._cause = cause;

    // 确保堆栈跟踪正确
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * 获取异常标识符
   * @returns 异常标识符
   */
  public get exceptionId(): EntityId {
    return this._exceptionId.clone();
  }

  /**
   * 获取异常类型
   * @returns 异常类型
   */
  public get exceptionType(): ExceptionType {
    return this._exceptionType;
  }

  /**
   * 获取错误代码
   * @returns 错误代码
   */
  public get errorCode(): string {
    return this._errorCode;
  }

  /**
   * 获取异常时间戳
   * @returns 异常时间戳
   */
  public get timestamp(): Date {
    return new Date(this._timestamp.getTime());
  }

  /**
   * 获取异常上下文
   * @returns 异常上下文的副本
   */
  public get context(): Record<string, unknown> {
    return { ...this._context };
  }

  /**
   * 获取原始异常
   * @returns 原始异常，如果不存在则返回undefined
   */
  public get cause(): Error | undefined {
    return this._cause;
  }

  /**
   * 比较两个异常是否相等
   * @param other 要比较的另一个异常
   * @returns 是否相等
   */
  public equals(other: DomainException | null | undefined): boolean {
    if (!other) {
      return false;
    }

    if (!(other instanceof DomainException)) {
      return false;
    }

    return (
      this._exceptionId.equals(other._exceptionId) &&
      this._exceptionType === other._exceptionType &&
      this._errorCode === other._errorCode &&
      this.message === other.message
    );
  }

  /**
   * 转换为字符串表示
   * @returns 字符串表示
   */
  public toString(): string {
    return `${this.name}[${this._exceptionId.value}]: ${this.message} (${this._errorCode})`;
  }

  /**
   * 转换为JSON表示
   * @returns JSON对象
   */
  public toJSON(): object {
    return {
      exceptionId: this._exceptionId.toJSON(),
      exceptionType: this._exceptionType,
      errorCode: this._errorCode,
      message: this.message,
      timestamp: this._timestamp.toISOString(),
      context: this._context,
      cause: this._cause
        ? {
            name: this._cause.name,
            message: this._cause.message,
            stack: this._cause.stack,
          }
        : undefined,
      stack: this.stack,
    };
  }

  /**
   * 克隆异常
   * @returns 新的异常实例
   */
  public abstract clone(): DomainException;

  /**
   * 获取异常严重程度
   * @returns 异常严重程度
   */
  public abstract getSeverity(): ExceptionSeverity;

  /**
   * 检查异常是否可恢复
   * @returns 是否可恢复
   */
  public abstract isRecoverable(): boolean;

  /**
   * 获取异常建议
   * @returns 异常建议
   */
  public abstract getSuggestion(): string;
}

/**
 * 异常严重程度枚举
 * @description 定义异常的严重程度级别
 */
export enum ExceptionSeverity {
  /** 低 - 不影响系统正常运行 */
  LOW = "LOW",
  /** 中 - 可能影响部分功能 */
  MEDIUM = "MEDIUM",
  /** 高 - 影响系统主要功能 */
  HIGH = "HIGH",
  /** 严重 - 系统无法正常运行 */
  CRITICAL = "CRITICAL",
}
