/**
 * @fileoverview 异常处理工具类
 * @description 提供统一的异常处理和转换功能
 */

import { DomainException } from "./base/domain-exception.base.js";
import { BusinessException } from "./business-exception.js";
import { SystemException } from "./system-exception.js";
import { ExceptionType } from "./base/exception-type.enum.js";

/**
 * 异常处理工具类
 * @description 提供统一的异常处理、转换和包装功能
 */
export class ExceptionHandler {
  /**
   * 将错误转换为领域异常
   * @param error 错误对象
   * @param errorCode 错误代码
   * @param context 异常上下文
   * @param defaultMessage 默认错误消息
   * @returns 领域异常实例
   */
  static toDomainException(
    error: unknown,
    errorCode: string,
    context: Record<string, unknown> = {},
    defaultMessage?: string,
  ): DomainException {
    if (error instanceof DomainException) {
      // 如果已经是领域异常，合并上下文并返回
      return error;
    }

    if (error instanceof Error) {
      // 判断是业务异常还是系统异常
      // 通常，已知的业务逻辑错误是业务异常，未知错误是系统异常
      const message = defaultMessage || error.message || "未知错误";
      const isBusinessError =
        errorCode.startsWith("BUSINESS_") ||
        errorCode.startsWith("VALIDATION_") ||
        errorCode.startsWith("RULE_");

      if (isBusinessError) {
        return new BusinessException(message, errorCode, context, error);
      } else {
        return new SystemException(message, errorCode, context, error);
      }
    }

    // 处理非 Error 类型的错误
    const message = defaultMessage || String(error) || "未知错误";
    return new SystemException(message, errorCode, context);
  }

  /**
   * 包装异步操作，统一处理异常
   * @param operation 异步操作函数
   * @param errorCode 错误代码
   * @param context 异常上下文
   * @returns 包装后的操作，抛出领域异常
   */
  static async wrapAsync<T>(
    operation: () => Promise<T>,
    errorCode: string,
    context: Record<string, unknown> = {},
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      throw this.toDomainException(error, errorCode, context);
    }
  }

  /**
   * 包装同步操作，统一处理异常
   * @param operation 同步操作函数
   * @param errorCode 错误代码
   * @param context 异常上下文
   * @returns 包装后的操作结果，抛出领域异常
   */
  static wrapSync<T>(
    operation: () => T,
    errorCode: string,
    context: Record<string, unknown> = {},
  ): T {
    try {
      return operation();
    } catch (error) {
      throw this.toDomainException(error, errorCode, context);
    }
  }

  /**
   * 安全执行异步操作，返回结果或错误
   * @param operation 异步操作函数
   * @param errorCode 错误代码
   * @param context 异常上下文
   * @returns 操作结果，如果失败则返回错误
   */
  static async safeAsync<T>(
    operation: () => Promise<T>,
    errorCode: string,
    context: Record<string, unknown> = {},
  ): Promise<
    { success: true; data: T } | { success: false; error: DomainException }
  > {
    try {
      const data = await operation();
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: this.toDomainException(error, errorCode, context),
      };
    }
  }

  /**
   * 安全执行同步操作，返回结果或错误
   * @param operation 同步操作函数
   * @param errorCode 错误代码
   * @param context 异常上下文
   * @returns 操作结果，如果失败则返回错误
   */
  static safeSync<T>(
    operation: () => T,
    errorCode: string,
    context: Record<string, unknown> = {},
  ): { success: true; data: T } | { success: false; error: DomainException } {
    try {
      const data = operation();
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: this.toDomainException(error, errorCode, context),
      };
    }
  }

  /**
   * 检查错误是否为业务异常
   * @param error 错误对象
   * @returns 是否为业务异常
   */
  static isBusinessException(error: unknown): boolean {
    if (error instanceof DomainException) {
      return error.exceptionType === ExceptionType.BUSINESS;
    }
    return false;
  }

  /**
   * 检查错误是否为系统异常
   * @param error 错误对象
   * @returns 是否为系统异常
   */
  static isSystemException(error: unknown): boolean {
    if (error instanceof DomainException) {
      return error.exceptionType === ExceptionType.SYSTEM;
    }
    return false;
  }

  /**
   * 提取错误的根原因
   * @param error 错误对象
   * @returns 根原因错误
   */
  static getRootCause(error: unknown): Error {
    if (error instanceof DomainException && error.cause) {
      return this.getRootCause(error.cause);
    }
    if (error instanceof Error) {
      return error;
    }
    return new Error(String(error));
  }

  /**
   * 创建错误上下文
   * @param operation 操作名称
   * @param params 操作参数
   * @param metadata 额外元数据
   * @returns 错误上下文对象
   */
  static createErrorContext(
    operation: string,
    params?: Record<string, unknown>,
    metadata?: Record<string, unknown>,
  ): Record<string, unknown> {
    return {
      operation,
      timestamp: new Date().toISOString(),
      ...params,
      ...metadata,
    };
  }
}
