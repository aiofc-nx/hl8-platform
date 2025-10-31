/**
 * @fileoverview 值对象验证异常类定义
 * @description 定义值对象验证相关的异常类型
 */

import {
  DomainException,
  ExceptionSeverity,
} from "./base/domain-exception.base.js";
import { ExceptionType } from "./base/exception-type.enum.js";

/**
 * 值对象验证异常基类
 * @description 所有值对象验证相关异常的基类
 */
export abstract class ValueObjectValidationException extends DomainException {
  constructor(
    message: string,
    public readonly valueObjectType: string,
    public readonly validationContext: unknown,
    public readonly originalError?: Error,
  ) {
    super(
      message,
      ExceptionType.VALIDATION,
      "VALUE_OBJECT_VALIDATION_ERROR",
      {
        valueObjectType,
        validationContext,
      },
      originalError,
    );
  }

  abstract clone(): ValueObjectValidationException;

  getSeverity(): ExceptionSeverity {
    return ExceptionSeverity.MEDIUM;
  }

  isRecoverable(): boolean {
    return true;
  }

  getSuggestion(): string {
    return "请检查值对象的验证规则和输入数据";
  }

  /**
   * 获取异常详情
   * @returns 异常详情对象
   */
  getDetails(): ValueObjectValidationExceptionDetails {
    return {
      valueObjectType: this.valueObjectType,
      validationContext: this.validationContext,
      originalError: this.originalError?.message,
      stack: this.stack,
      timestamp: new Date(),
    };
  }
}

/**
 * 值对象验证失败异常
 * @description 当值对象验证失败时抛出
 */
export class ValueObjectValidationFailedException extends ValueObjectValidationException {
  constructor(
    valueObjectType: string,
    validationErrors: string[],
    validationContext: unknown,
    originalError?: Error,
  ) {
    super(
      `Value object '${valueObjectType}' validation failed: ${validationErrors.join(", ")}`,
      valueObjectType,
      validationContext,
      originalError,
    );
  }

  clone(): ValueObjectValidationFailedException {
    const match = this.message.split(": ")[1];
    const validationErrors = match ? match.split(", ") : [];
    return new ValueObjectValidationFailedException(
      this.valueObjectType,
      validationErrors,
      this.validationContext,
      this.originalError,
    );
  }
}

/**
 * 值对象规则违反异常
 * @description 当值对象违反验证规则时抛出
 */
export class ValueObjectRuleViolationException extends ValueObjectValidationException {
  constructor(
    valueObjectType: string,
    violatedRule: string,
    ruleValue: unknown,
    validationContext: unknown,
    originalError?: Error,
  ) {
    super(
      `Value object '${valueObjectType}' violated rule '${violatedRule}' with value: ${JSON.stringify(ruleValue)}`,
      valueObjectType,
      validationContext,
      originalError,
    );
  }

  clone(): ValueObjectRuleViolationException {
    const match = this.message.match(
      /violated rule '([^']+)' with value: (.+)$/,
    );
    const violatedRule = match ? match[1] : "";
    let ruleValue: unknown = null;
    try {
      ruleValue = match && match[2] ? JSON.parse(match[2]) : null;
    } catch {
      ruleValue = match ? match[2] : null;
    }
    return new ValueObjectRuleViolationException(
      this.valueObjectType,
      violatedRule,
      ruleValue,
      this.validationContext,
      this.originalError,
    );
  }
}

/**
 * 值对象类型不匹配异常
 * @description 当值对象类型不匹配时抛出
 */
export class ValueObjectTypeMismatchException extends ValueObjectValidationException {
  constructor(
    valueObjectType: string,
    expectedType: string,
    actualType: string,
    validationContext: unknown,
    originalError?: Error,
  ) {
    super(
      `Value object '${valueObjectType}' type mismatch. Expected: ${expectedType}, Actual: ${actualType}`,
      valueObjectType,
      validationContext,
      originalError,
    );
  }

  clone(): ValueObjectTypeMismatchException {
    const match = this.message.match(/Expected: ([^,]+), Actual: (.+)$/);
    return new ValueObjectTypeMismatchException(
      this.valueObjectType,
      match ? match[1].trim() : "",
      match ? match[2].trim() : "",
      this.validationContext,
      this.originalError,
    );
  }
}

/**
 * 值对象格式无效异常
 * @description 当值对象格式无效时抛出
 */
export class ValueObjectInvalidFormatException extends ValueObjectValidationException {
  constructor(
    valueObjectType: string,
    invalidValue: unknown,
    formatError: string,
    validationContext: unknown,
    originalError?: Error,
  ) {
    super(
      `Value object '${valueObjectType}' has invalid format: ${formatError}. Value: ${JSON.stringify(invalidValue)}`,
      valueObjectType,
      validationContext,
      originalError,
    );
  }

  clone(): ValueObjectInvalidFormatException {
    const match = this.message.match(
      /has invalid format: ([^.]+)\. Value: (.+)$/,
    );
    const formatError = match ? match[1].trim() : "";
    let invalidValue: unknown = null;
    try {
      invalidValue = match && match[2] ? JSON.parse(match[2]) : null;
    } catch {
      invalidValue = match ? match[2] : null;
    }
    return new ValueObjectInvalidFormatException(
      this.valueObjectType,
      invalidValue,
      formatError,
      this.validationContext,
      this.originalError,
    );
  }
}

/**
 * 值对象范围异常
 * @description 当值对象超出允许范围时抛出
 */
export class ValueObjectRangeException extends ValueObjectValidationException {
  constructor(
    valueObjectType: string,
    value: unknown,
    minValue: unknown,
    maxValue: unknown,
    validationContext: unknown,
    originalError?: Error,
  ) {
    super(
      `Value object '${valueObjectType}' value ${JSON.stringify(value)} is out of range [${JSON.stringify(minValue)}, ${JSON.stringify(maxValue)}]`,
      valueObjectType,
      validationContext,
      originalError,
    );
  }

  clone(): ValueObjectRangeException {
    const match = this.message.match(
      /value (.+?) is out of range \[(.+?), (.+?)\]/,
    );
    let value: unknown = null;
    let minValue: unknown = null;
    let maxValue: unknown = null;
    try {
      value = match && match[1] ? JSON.parse(match[1]) : null;
      minValue = match && match[2] ? JSON.parse(match[2]) : null;
      maxValue = match && match[3] ? JSON.parse(match[3]) : null;
    } catch {
      value = match ? match[1] : null;
      minValue = match ? match[2] : null;
      maxValue = match ? match[3] : null;
    }
    return new ValueObjectRangeException(
      this.valueObjectType,
      value,
      minValue,
      maxValue,
      this.validationContext,
      this.originalError,
    );
  }
}

/**
 * 值对象长度异常
 * @description 当值对象长度不符合要求时抛出
 */
export class ValueObjectLengthException extends ValueObjectValidationException {
  constructor(
    valueObjectType: string,
    value: unknown,
    minLength: number,
    maxLength: number,
    validationContext: unknown,
    originalError?: Error,
  ) {
    super(
      `Value object '${valueObjectType}' length is out of range [${minLength}, ${maxLength}]. Value: ${JSON.stringify(value)}`,
      valueObjectType,
      validationContext,
      originalError,
    );
  }

  clone(): ValueObjectLengthException {
    const match = this.message.match(/length is out of range \[(\d+), (\d+)\]/);
    const minLength = match ? parseInt(match[1], 10) : 0;
    const maxLength = match ? parseInt(match[2], 10) : 0;
    const valueMatch = this.message.match(/Value: (.+)$/);
    let value: unknown = null;
    try {
      value = valueMatch && valueMatch[1] ? JSON.parse(valueMatch[1]) : null;
    } catch {
      value = valueMatch ? valueMatch[1] : null;
    }
    return new ValueObjectLengthException(
      this.valueObjectType,
      value,
      minLength,
      maxLength,
      this.validationContext,
      this.originalError,
    );
  }
}

/**
 * 值对象必需字段缺失异常
 * @description 当值对象缺少必需字段时抛出
 */
export class ValueObjectRequiredFieldMissingException extends ValueObjectValidationException {
  constructor(
    valueObjectType: string,
    missingFields: string[],
    validationContext: unknown,
    originalError?: Error,
  ) {
    super(
      `Value object '${valueObjectType}' is missing required fields: ${missingFields.join(", ")}`,
      valueObjectType,
      validationContext,
      originalError,
    );
  }

  clone(): ValueObjectRequiredFieldMissingException {
    const match = this.message.split(": ")[1];
    const missingFields = match ? match.split(", ") : [];
    return new ValueObjectRequiredFieldMissingException(
      this.valueObjectType,
      missingFields,
      this.validationContext,
      this.originalError,
    );
  }
}

/**
 * 值对象验证异常详情接口
 * @description 描述值对象验证异常的详细信息
 */
export interface ValueObjectValidationExceptionDetails {
  /** 值对象类型 */
  valueObjectType: string;
  /** 验证上下文 */
  validationContext: unknown;
  /** 原始错误消息 */
  originalError?: string;
  /** 错误堆栈 */
  stack?: string;
  /** 异常时间戳 */
  timestamp: Date;
}
