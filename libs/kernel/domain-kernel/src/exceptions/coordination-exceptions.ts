/**
 * @fileoverview 协调相关异常类
 * @description 提供协调框架中使用的各种异常类型
 */

import {
  DomainException,
  ExceptionSeverity,
} from "./base/domain-exception.base.js";
import { ExceptionType } from "./base/exception-type.enum.js";

/**
 * 协调异常基类
 * @description 所有协调相关异常的基类
 */
export abstract class CoordinationException extends DomainException {
  /**
   * 创建协调异常
   * @param message 异常消息
   * @param code 异常代码
   * @param details 异常详情
   */
  constructor(
    message: string,
    code: string = "COORDINATION_ERROR",
    details?: Record<string, unknown>,
  ) {
    super(message, ExceptionType.COORDINATION, code, details);
    this.name = "CoordinationException";
  }

  public abstract clone(): CoordinationException;
  public abstract getSeverity(): ExceptionSeverity;
  public abstract isRecoverable(): boolean;
  public abstract getSuggestion(): string;
}

/**
 * 协调规则异常
 * @description 当协调规则执行失败时抛出
 */
export class CoordinationRuleException extends CoordinationException {
  /**
   * 创建协调规则异常
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
      `Coordination rule '${ruleName}' failed: ${message}`,
      "COORDINATION_RULE_ERROR",
      { ruleName, ...details },
    );
    this.name = "CoordinationRuleException";
  }

  public clone(): CoordinationRuleException {
    return new CoordinationRuleException(
      this.context.ruleName as string,
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
    return "检查协调规则配置和执行逻辑，确保规则正确实现";
  }
}

/**
 * 协调上下文异常
 * @description 当协调上下文处理失败时抛出
 */
export class CoordinationContextException extends CoordinationException {
  /**
   * 创建协调上下文异常
   * @param message 异常消息
   * @param details 异常详情
   */
  constructor(message: string, details?: Record<string, unknown>) {
    super(
      `Coordination context error: ${message}`,
      "COORDINATION_CONTEXT_ERROR",
      details,
    );
    this.name = "CoordinationContextException";
  }

  public clone(): CoordinationContextException {
    return new CoordinationContextException(this.message, this.context);
  }

  public getSeverity(): ExceptionSeverity {
    return ExceptionSeverity.MEDIUM;
  }

  public isRecoverable(): boolean {
    return true;
  }

  public getSuggestion(): string {
    return "检查上下文初始化与生命周期管理，确保依赖已正确注入";
  }
}

/**
 * 协调结果异常
 * @description 当协调结果处理失败时抛出
 */
export class CoordinationResultException extends CoordinationException {
  /**
   * 创建协调结果异常
   * @param message 异常消息
   * @param details 异常详情
   */
  constructor(message: string, details?: Record<string, unknown>) {
    super(
      `Coordination result error: ${message}`,
      "COORDINATION_RESULT_ERROR",
      details,
    );
    this.name = "CoordinationResultException";
  }

  public clone(): CoordinationResultException {
    return new CoordinationResultException(this.message, this.context);
  }

  public getSeverity(): ExceptionSeverity {
    return ExceptionSeverity.MEDIUM;
  }

  public isRecoverable(): boolean {
    return true;
  }

  public getSuggestion(): string {
    return "校验结果聚合/映射逻辑与输出契约是否一致";
  }
}

/**
 * 协调管理器异常
 * @description 当协调管理器操作失败时抛出
 */
export class CoordinationManagerException extends CoordinationException {
  /**
   * 创建协调管理器异常
   * @param message 异常消息
   * @param details 异常详情
   */
  constructor(message: string, details?: Record<string, unknown>) {
    super(
      `Coordination manager error: ${message}`,
      "COORDINATION_MANAGER_ERROR",
      details,
    );
    this.name = "CoordinationManagerException";
  }

  public clone(): CoordinationManagerException {
    return new CoordinationManagerException(this.message, this.context);
  }

  public getSeverity(): ExceptionSeverity {
    return ExceptionSeverity.HIGH;
  }

  public isRecoverable(): boolean {
    return false;
  }

  public getSuggestion(): string {
    return "检查管理器状态机与并发控制，考虑回滚或重试策略";
  }
}

/**
 * 协调规则工厂异常
 * @description 当协调规则工厂创建规则失败时抛出
 */
export class CoordinationRuleFactoryException extends CoordinationException {
  /**
   * 创建协调规则工厂异常
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
      `Coordination rule factory failed to create '${ruleType}': ${message}`,
      "COORDINATION_RULE_FACTORY_ERROR",
      { ruleType, ...details },
    );
    this.name = "CoordinationRuleFactoryException";
  }

  public clone(): CoordinationRuleFactoryException {
    return new CoordinationRuleFactoryException(
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
    return "确认规则类型注册与依赖可用，必要时降级或使用默认规则";
  }
}

/**
 * 协调模式异常
 * @description 当协调模式执行失败时抛出
 */
export class CoordinationPatternException extends CoordinationException {
  /**
   * 创建协调模式异常
   * @param patternName 模式名称
   * @param message 异常消息
   * @param details 异常详情
   */
  constructor(
    patternName: string,
    message: string,
    details?: Record<string, unknown>,
  ) {
    super(
      `Coordination pattern '${patternName}' failed: ${message}`,
      "COORDINATION_PATTERN_ERROR",
      { patternName, ...details },
    );
    this.name = "CoordinationPatternException";
  }

  public clone(): CoordinationPatternException {
    return new CoordinationPatternException(
      this.context.patternName as string,
      this.message,
      this.context,
    );
  }

  public getSeverity(): ExceptionSeverity {
    return ExceptionSeverity.HIGH;
  }

  public isRecoverable(): boolean {
    return false;
  }

  public getSuggestion(): string {
    return "检查模式编排顺序与边界条件，必要时启用补偿事务";
  }
}
