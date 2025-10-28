/**
 * @fileoverview 验证相关异常类
 * @description 提供验证框架中使用的各种异常类型
 */

import {
  DomainException,
  ExceptionSeverity,
} from "./base/domain-exception.base.js";
import { ExceptionType } from "./base/exception-type.enum.js";

/**
 * 验证异常基类
 * @description 所有验证相关异常的基类
 */
export abstract class ValidationException extends DomainException {
  /**
   * 创建验证异常
   * @param message 异常消息
   * @param code 异常代码
   * @param details 异常详情
   */
  constructor(
    message: string,
    code: string = "VALIDATION_ERROR",
    details?: Record<string, unknown>,
  ) {
    super(message, ExceptionType.VALIDATION, code, details);
    this.name = "ValidationException";
  }

  public clone(): ValidationException {
    return new (this.constructor as new (
      message: string,
      code?: string,
      details?: Record<string, unknown>,
    ) => ValidationException)(this.message, this.errorCode, this.context);
  }

  public getSeverity(): ExceptionSeverity {
    return ExceptionSeverity.MEDIUM;
  }

  public isRecoverable(): boolean {
    return true;
  }

  public getSuggestion(): string {
    return "请检查输入数据并重试";
  }
}

/**
 * 验证规则异常
 * @description 当验证规则执行失败时抛出
 */
export class ValidationRuleException extends ValidationException {
  /**
   * 创建验证规则异常
   * @param ruleName 规则名称
   * @param message 异常消息
   * @param details 异常详情
   */
  constructor(
    ruleName: string,
    message: string,
    details?: Record<string, unknown>,
  ) {
    super(
      `Validation rule '${ruleName}' failed: ${message}`,
      "VALIDATION_RULE_ERROR",
      { ruleName, ...details },
    );
    this.name = "ValidationRuleException";
  }
}

/**
 * 验证结果异常
 * @description 当验证结果处理失败时抛出
 */
export class ValidationResultException extends ValidationException {
  /**
   * 创建验证结果异常
   * @param message 异常消息
   * @param details 异常详情
   */
  constructor(message: string, details?: Record<string, unknown>) {
    super(
      `Validation result error: ${message}`,
      "VALIDATION_RESULT_ERROR",
      details,
    );
    this.name = "ValidationResultException";
  }
}

/**
 * 值对象验证异常
 * @description 当值对象验证失败时抛出
 */
export class ValueObjectValidationException extends ValidationException {
  /**
   * 创建值对象验证异常
   * @param valueObjectType 值对象类型
   * @param message 异常消息
   * @param details 异常详情
   */
  constructor(
    valueObjectType: string,
    message: string,
    details?: Record<string, unknown>,
  ) {
    super(
      `Value object '${valueObjectType}' validation failed: ${message}`,
      "VALUE_OBJECT_VALIDATION_ERROR",
      { valueObjectType, ...details },
    );
    this.name = "ValueObjectValidationException";
  }
}

/**
 * 验证规则工厂异常
 * @description 当验证规则工厂创建规则失败时抛出
 */
export class ValidationRuleFactoryException extends ValidationException {
  /**
   * 创建验证规则工厂异常
   * @param ruleType 规则类型
   * @param message 异常消息
   * @param details 异常详情
   */
  constructor(
    ruleType: string,
    message: string,
    details?: Record<string, unknown>,
  ) {
    super(
      `Validation rule factory failed to create '${ruleType}': ${message}`,
      "VALIDATION_RULE_FACTORY_ERROR",
      { ruleType, ...details },
    );
    this.name = "ValidationRuleFactoryException";
  }
}

/**
 * 验证错误构建器异常
 * @description 当验证错误构建器构建错误失败时抛出
 */
export class ValidationErrorBuilderException extends ValidationException {
  /**
   * 创建验证错误构建器异常
   * @param message 异常消息
   * @param details 异常详情
   */
  constructor(message: string, details?: Record<string, unknown>) {
    super(
      `Validation error builder error: ${message}`,
      "VALIDATION_ERROR_BUILDER_ERROR",
      details,
    );
    this.name = "ValidationErrorBuilderException";
  }
}
