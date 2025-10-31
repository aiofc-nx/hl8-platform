/**
 * @fileoverview 业务操作异常类
 * @description 定义业务操作相关的异常
 */

import {
  DomainException,
  ExceptionSeverity,
} from "./base/domain-exception.base.js";
import { ExceptionType } from "./base/exception-type.enum.js";
import { EntityId } from "../identifiers/entity-id.js";

/**
 * 业务操作异常基类
 * @description 所有业务操作相关异常的基类
 */
export abstract class OperationException extends DomainException {
  /**
   * 创建业务操作异常
   * @param message 异常消息
   * @param errorCode 错误代码
   * @param context 异常上下文
   * @param cause 原始异常
   * @param exceptionId 异常标识符，可选
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
    return "请检查操作参数和业务规则，修正后重试";
  }
}

/**
 * 操作管理器异常
 * @description 当操作管理器操作失败时抛出
 */
export class OperationManagerException extends OperationException {
  /**
   * 创建操作管理器异常
   * @param message 异常消息
   * @param operation 操作名称
   * @param operationId 操作ID，可选
   * @param cause 原始异常，可选
   */
  constructor(
    message: string,
    operation: string,
    operationId?: string,
    cause?: Error,
  ) {
    super(
      `Operation manager error: ${message}`,
      "OPERATION_MANAGER_ERROR",
      {
        operation,
        operationId,
      },
      cause,
    );
  }

  /**
   * 克隆异常
   * @returns 新的异常实例
   */
  public clone(): OperationManagerException {
    return new OperationManagerException(
      this.message,
      this.context.operation as string,
      this.context.operationId as string | undefined,
      this.cause,
    );
  }
}

/**
 * 操作执行异常
 * @description 当操作执行失败时抛出
 */
export class OperationExecutionException extends OperationException {
  /**
   * 创建操作执行异常
   * @param operationId 操作ID
   * @param message 异常消息
   * @param cause 原始异常，可选
   */
  constructor(operationId: string, message: string, cause?: Error) {
    super(
      `Operation execution failed: ${message}`,
      "OPERATION_EXECUTION_ERROR",
      {
        operationId,
      },
      cause,
    );
  }

  /**
   * 克隆异常
   * @returns 新的异常实例
   */
  public clone(): OperationExecutionException {
    return new OperationExecutionException(
      this.context.operationId as string,
      this.message,
      this.cause,
    );
  }
}

/**
 * 操作验证异常
 * @description 当操作验证失败时抛出
 */
export class OperationValidationException extends OperationException {
  /**
   * 创建操作验证异常
   * @param operationId 操作ID
   * @param message 异常消息
   * @param validationErrors 验证错误列表
   */
  constructor(
    operationId: string,
    message: string,
    validationErrors: string[] = [],
  ) {
    super(
      `Operation validation failed: ${message}`,
      "OPERATION_VALIDATION_ERROR",
      {
        operationId,
        validationErrors,
      },
    );
  }

  /**
   * 克隆异常
   * @returns 新的异常实例
   */
  public clone(): OperationValidationException {
    return new OperationValidationException(
      this.context.operationId as string,
      this.message,
      this.context.validationErrors as string[],
    );
  }
}

/**
 * 操作未找到异常
 * @description 当操作不存在时抛出
 */
export class OperationNotFoundException extends OperationException {
  /**
   * 创建操作未找到异常
   * @param operationId 操作ID
   */
  constructor(operationId: string) {
    super(`Operation '${operationId}' not found`, "OPERATION_NOT_FOUND", {
      operationId,
    });
  }

  /**
   * 克隆异常
   * @returns 新的异常实例
   */
  public clone(): OperationNotFoundException {
    return new OperationNotFoundException(this.context.operationId as string);
  }
}

/**
 * 操作上下文异常
 * @description 当操作上下文无效时抛出
 */
export class OperationContextException extends OperationException {
  /**
   * 创建操作上下文异常
   * @param message 异常消息
   * @param contextId 上下文ID，可选
   */
  constructor(message: string, contextId?: string) {
    super(`Operation context error: ${message}`, "OPERATION_CONTEXT_ERROR", {
      contextId,
    });
  }

  /**
   * 克隆异常
   * @returns 新的异常实例
   */
  public clone(): OperationContextException {
    return new OperationContextException(
      this.message,
      this.context.contextId as string | undefined,
    );
  }
}

/**
 * 操作异常详情接口
 * @description 提供操作异常的详细信息
 */
export interface OperationExceptionDetails {
  /** 操作ID */
  operationId?: string;
  /** 操作名称 */
  operation?: string;
  /** 上下文ID */
  contextId?: string;
  /** 验证错误列表 */
  validationErrors?: string[];
  /** 额外详情 */
  additionalDetails?: Record<string, unknown>;
}
