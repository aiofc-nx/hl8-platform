/**
 * @fileoverview 业务规则相关异常类
 * @description 提供业务规则框架中使用的各种异常类型
 */

import {
  DomainException,
  ExceptionSeverity,
} from "./base/domain-exception.base.js";
import { ExceptionType } from "./base/exception-type.enum.js";

/**
 * 业务规则异常基类
 * @description 所有业务规则相关异常的基类
 */
export abstract class BusinessRuleException extends DomainException {
  /**
   * 创建业务规则异常
   * @param message 异常消息
   * @param code 异常代码
   * @param details 异常详情
   */
  constructor(
    message: string,
    code: string = "BUSINESS_RULE_ERROR",
    details?: Record<string, unknown>,
  ) {
    super(message, ExceptionType.BUSINESS_RULE, code, details);
    this.name = "BusinessRuleException";
  }

  public abstract clone(): BusinessRuleException;
  public abstract getSeverity(): ExceptionSeverity;
  public abstract isRecoverable(): boolean;
  public abstract getSuggestion(): string;
}

/**
 * 业务规则违反异常
 * @description 当业务规则被违反时抛出
 */
export class BusinessRuleViolationException extends BusinessRuleException {
  /**
   * 创建业务规则违反异常
   * @param ruleName 规则名称
   * @param entityType 实体类型
   * @param entityId 实体ID
   * @param message 异常消息
   * @param details 异常详情
   */
  constructor(
    ruleName: string,
    entityType: string,
    entityId: string,
    message: string,
    details?: Record<string, unknown>,
  ) {
    super(
      `Business rule '${ruleName}' violated on ${entityType}(${entityId}): ${message}`,
      "BUSINESS_RULE_VIOLATION",
      { ruleName, entityType, entityId, ...details },
    );
    this.name = "BusinessRuleViolationException";
  }

  public clone(): BusinessRuleViolationException {
    return new BusinessRuleViolationException(
      this.context.ruleName as string,
      this.context.entityType as string,
      this.context.entityId as string,
      this.message,
      this.context,
    );
  }

  public getSeverity(): ExceptionSeverity {
    return ExceptionSeverity.HIGH;
  }

  public isRecoverable(): boolean {
    return true;
  }

  public getSuggestion(): string {
    return "检查业务规则违反的详细信息，修正违反的业务逻辑";
  }
}

/**
 * 业务规则管理器异常
 * @description 当业务规则管理器操作失败时抛出
 */
export class BusinessRuleManagerException extends BusinessRuleException {
  /**
   * 创建业务规则管理器异常
   * @param message 异常消息
   * @param details 异常详情
   */
  constructor(message: string, details?: Record<string, unknown>) {
    super(
      `Business rule manager error: ${message}`,
      "BUSINESS_RULE_MANAGER_ERROR",
      details,
    );
    this.name = "BusinessRuleManagerException";
  }

  public clone(): BusinessRuleManagerException {
    return new BusinessRuleManagerException(this.message, this.context);
  }

  public getSeverity(): ExceptionSeverity {
    return ExceptionSeverity.MEDIUM;
  }

  public isRecoverable(): boolean {
    return true;
  }

  public getSuggestion(): string {
    return "检查业务规则管理器配置，确保规则正确注册和配置";
  }
}

/**
 * 业务规则工厂异常
 * @description 当业务规则工厂创建规则失败时抛出
 */
export class BusinessRuleFactoryException extends BusinessRuleException {
  /**
   * 创建业务规则工厂异常
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
      `Business rule factory failed to create '${ruleType}': ${message}`,
      "BUSINESS_RULE_FACTORY_ERROR",
      { ruleType, ...details },
    );
    this.name = "BusinessRuleFactoryException";
  }

  public clone(): BusinessRuleFactoryException {
    return new BusinessRuleFactoryException(
      this.context.ruleType as string,
      this.message,
      this.context,
    );
  }

  public getSeverity(): ExceptionSeverity {
    return ExceptionSeverity.MEDIUM;
  }

  public isRecoverable(): boolean {
    return true;
  }

  public getSuggestion(): string {
    return "检查业务规则工厂配置，确保规则类型正确注册";
  }
}

/**
 * 业务规则验证结果异常
 * @description 当业务规则验证结果处理失败时抛出
 */
export class BusinessRuleValidationResultException extends BusinessRuleException {
  /**
   * 创建业务规则验证结果异常
   * @param message 异常消息
   * @param details 异常详情
   */
  constructor(message: string, details?: Record<string, unknown>) {
    super(
      `Business rule validation result error: ${message}`,
      "BUSINESS_RULE_VALIDATION_RESULT_ERROR",
      details,
    );
    this.name = "BusinessRuleValidationResultException";
  }

  public clone(): BusinessRuleValidationResultException {
    return new BusinessRuleValidationResultException(
      this.message,
      this.context,
    );
  }

  public getSeverity(): ExceptionSeverity {
    return ExceptionSeverity.MEDIUM;
  }

  public isRecoverable(): boolean {
    return true;
  }

  public getSuggestion(): string {
    return "检查业务规则验证结果处理逻辑，确保数据格式正确";
  }
}

/**
 * 业务规则违反构建器异常
 * @description 当业务规则违反构建器构建违反失败时抛出
 */
export class BusinessRuleViolationBuilderException extends BusinessRuleException {
  /**
   * 创建业务规则违反构建器异常
   * @param message 异常消息
   * @param details 异常详情
   */
  constructor(message: string, details?: Record<string, unknown>) {
    super(
      `Business rule violation builder error: ${message}`,
      "BUSINESS_RULE_VIOLATION_BUILDER_ERROR",
      details,
    );
    this.name = "BusinessRuleViolationBuilderException";
  }

  public clone(): BusinessRuleViolationBuilderException {
    return new BusinessRuleViolationBuilderException(
      this.message,
      this.context,
    );
  }

  public getSeverity(): ExceptionSeverity {
    return ExceptionSeverity.LOW;
  }

  public isRecoverable(): boolean {
    return true;
  }

  public getSuggestion(): string {
    return "检查业务规则违反构建器参数，确保所有必需字段都已设置";
  }
}
