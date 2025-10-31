/**
 * @fileoverview 规范异常类定义
 * @description 定义规范模式操作相关的异常类型
 */

import {
  DomainException,
  ExceptionSeverity,
} from "./base/domain-exception.base.js";
import { ExceptionType } from "./base/exception-type.enum.js";

/**
 * 规范异常基类
 * @description 所有规范相关异常的基类
 */
export abstract class SpecificationException extends DomainException {
  constructor(
    message: string,
    public readonly specificationType: string,
    public readonly evaluationContext: unknown,
    public readonly originalError?: Error,
  ) {
    super(
      message,
      ExceptionType.BUSINESS_RULE,
      "SPECIFICATION_ERROR",
      {
        specificationType,
        evaluationContext,
      },
      originalError,
    );
  }

  abstract clone(): SpecificationException;

  getSeverity(): ExceptionSeverity {
    return ExceptionSeverity.MEDIUM;
  }

  isRecoverable(): boolean {
    return true;
  }

  getSuggestion(): string {
    return "请检查规范定义和评估上下文";
  }

  /**
   * 获取异常详情
   * @returns 异常详情对象
   */
  getDetails(): SpecificationExceptionDetails {
    return {
      specificationType: this.specificationType,
      evaluationContext: this.evaluationContext,
      originalError: this.originalError?.message,
      stack: this.stack,
      timestamp: new Date(),
    };
  }
}

/**
 * 规范评估失败异常
 * @description 当规范评估失败时抛出
 */
export class SpecificationEvaluationFailedException extends SpecificationException {
  constructor(
    specificationType: string,
    evaluationContext: unknown,
    reason: string,
    originalError?: Error,
  ) {
    super(
      `Specification '${specificationType}' evaluation failed: ${reason}`,
      specificationType,
      evaluationContext,
      originalError,
    );
  }

  clone(): SpecificationEvaluationFailedException {
    const reason = this.message.split(": ")[1] || "";
    return new SpecificationEvaluationFailedException(
      this.specificationType,
      this.evaluationContext,
      reason,
      this.originalError,
    );
  }
}

/**
 * 规范组合异常
 * @description 当规范组合操作失败时抛出
 */
export class SpecificationCompositionException extends SpecificationException {
  constructor(
    specificationType: string,
    compositionOperation: string,
    originalError?: Error,
  ) {
    super(
      `Specification '${specificationType}' composition operation '${compositionOperation}' failed`,
      specificationType,
      { compositionOperation },
      originalError,
    );
  }

  clone(): SpecificationCompositionException {
    const match = this.message.match(/composition operation '([^']+)'/);
    const compositionOperation = match
      ? match[1]
      : (this.evaluationContext as { compositionOperation?: string })
          ?.compositionOperation || "";
    return new SpecificationCompositionException(
      this.specificationType,
      compositionOperation,
      this.originalError,
    );
  }
}

/**
 * 规范验证异常
 * @description 当规范验证失败时抛出
 */
export class SpecificationValidationException extends SpecificationException {
  constructor(
    specificationType: string,
    validationErrors: string[],
    originalError?: Error,
  ) {
    super(
      `Specification '${specificationType}' validation failed: ${validationErrors.join(", ")}`,
      specificationType,
      { validationErrors },
      originalError,
    );
  }

  clone(): SpecificationValidationException {
    const match = this.message.split(": ")[1];
    const validationErrors = match ? match.split(", ") : [];
    return new SpecificationValidationException(
      this.specificationType,
      validationErrors,
      this.originalError,
    );
  }
}

/**
 * 规范配置异常
 * @description 当规范配置无效时抛出
 */
export class SpecificationConfigurationException extends SpecificationException {
  constructor(
    specificationType: string,
    configurationError: string,
    originalError?: Error,
  ) {
    super(
      `Specification '${specificationType}' configuration error: ${configurationError}`,
      specificationType,
      {},
      originalError,
    );
  }

  clone(): SpecificationConfigurationException {
    const configurationError = this.message.split(": ")[1] || "";
    return new SpecificationConfigurationException(
      this.specificationType,
      configurationError,
      this.originalError,
    );
  }
}

/**
 * 规范类型不支持异常
 * @description 当规范不支持指定类型时抛出
 */
export class SpecificationUnsupportedTypeException extends SpecificationException {
  constructor(
    specificationType: string,
    requestedType: string,
    supportedTypes: string[],
    originalError?: Error,
  ) {
    super(
      `Specification '${specificationType}' does not support type '${requestedType}'. Supported types: ${supportedTypes.join(", ")}`,
      specificationType,
      { requestedType, supportedTypes },
      originalError,
    );
  }

  clone(): SpecificationUnsupportedTypeException {
    const reqMatch = this.message.match(/does not support type '([^']+)'/);
    const requestedType = reqMatch ? reqMatch[1] : "";
    const supMatch = this.message.match(/Supported types: (.+)$/);
    const supportedTypes =
      supMatch && supMatch[1] ? supMatch[1].split(", ") : [];
    return new SpecificationUnsupportedTypeException(
      this.specificationType,
      requestedType,
      supportedTypes,
      this.originalError,
    );
  }
}

/**
 * 规范执行异常
 * @description 当规范执行过程中发生错误时抛出
 */
export class SpecificationExecutionException extends SpecificationException {
  constructor(
    specificationType: string,
    executionContext: unknown,
    executionError: string,
    originalError?: Error,
  ) {
    super(
      `Specification '${specificationType}' execution failed: ${executionError}`,
      specificationType,
      executionContext,
      originalError,
    );
  }

  clone(): SpecificationExecutionException {
    const executionError = this.message.split(": ")[1] || "";
    return new SpecificationExecutionException(
      this.specificationType,
      this.evaluationContext,
      executionError,
      this.originalError,
    );
  }
}

/**
 * 规范异常详情接口
 * @description 描述规范异常的详细信息
 */
export interface SpecificationExceptionDetails {
  /** 规范类型 */
  specificationType: string;
  /** 评估上下文 */
  evaluationContext: unknown;
  /** 原始错误消息 */
  originalError?: string;
  /** 错误堆栈 */
  stack?: string;
  /** 异常时间戳 */
  timestamp: Date;
}
