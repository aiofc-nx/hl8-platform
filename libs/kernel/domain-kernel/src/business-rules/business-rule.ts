/**
 * @fileoverview 业务规则实现
 * @description 提供业务规则的基础实现和通用功能
 */

import {
  BusinessRule as IBusinessRule,
  BusinessRuleContext,
  BusinessRuleOptions,
  BusinessRuleLevel,
  BusinessRuleType,
  BusinessRuleSeverity,
} from "./business-rule.interface.js";
import type { BusinessRuleValidationResult } from "./business-rule-validation-result.interface.js";
import type {
  BusinessRuleViolation,
  BusinessRuleViolationData,
} from "./business-rule-violation.interface.js";
import { BusinessRuleViolationException } from "../exceptions/business-rule-exceptions.js";

/**
 * 业务规则抽象基类
 * @description 提供业务规则的基础实现，所有具体业务规则都应继承此类
 */
export abstract class BusinessRule<T = unknown> implements IBusinessRule<T> {
  /**
   * 规则名称
   */
  public readonly name: string;

  /**
   * 规则描述
   */
  public readonly description: string;

  /**
   * 规则优先级
   */
  public readonly priority: number;

  /**
   * 规则是否启用
   */
  public readonly enabled: boolean;

  /**
   * 启用规则
   * @description 动态启用规则
   */
  public enable(): void {
    // 默认实现：规则状态在创建时设置，无法动态修改
    // 子类可以重写此方法以提供动态启用功能
    throw new Error("Rule state cannot be changed dynamically");
  }

  /**
   * 禁用规则
   * @description 动态禁用规则
   */
  public disable(): void {
    // 默认实现：规则状态在创建时设置，无法动态修改
    // 子类可以重写此方法以提供动态禁用功能
    throw new Error("Rule state cannot be changed dynamically");
  }

  /**
   * 规则类型
   */
  public readonly type: BusinessRuleType;

  /**
   * 规则严重程度
   */
  public readonly severity: BusinessRuleSeverity;

  /**
   * 创建业务规则
   * @param name 规则名称
   * @param description 规则描述
   * @param priority 规则优先级
   * @param enabled 规则是否启用
   * @param type 规则类型
   * @param severity 规则严重程度
   */
  constructor(
    name: string,
    description: string = "",
    priority: number = 100,
    enabled: boolean = true,
    type: BusinessRuleType = BusinessRuleType.BUSINESS_LOGIC,
    severity: BusinessRuleSeverity = BusinessRuleSeverity.ERROR,
  ) {
    this.name = name;
    this.description = description;
    this.priority = priority;
    this.enabled = enabled;
    this.type = type;
    this.severity = severity;
  }

  /**
   * 执行业务规则验证
   * @param entity 要验证的实体
   * @param context 业务规则上下文
   * @returns 业务规则验证结果
   */
  public validate(
    entity: T,
    context?: BusinessRuleContext,
  ): BusinessRuleValidationResult {
    try {
      // 检查规则是否启用
      if (!this.enabled) {
        return this.createSuccessResult(entity, context);
      }

      // 检查规则是否适用
      if (!this.isApplicable(entity, context)) {
        return this.createSuccessResult(entity, context);
      }

      // 执行具体验证逻辑
      return this.doValidate(entity, context);
    } catch (error) {
      throw new BusinessRuleViolationException(
        this.name,
        this.getEntityType(context),
        this.getEntityId(context),
        `Rule execution failed: ${error instanceof Error ? error.message : String(error)}`,
        { originalError: error },
      );
    }
  }

  /**
   * 创建业务规则违反
   * @param message 违反消息
   * @param code 违反代码
   * @param details 违反详情
   * @returns 业务规则违反对象
   */
  public createViolation(
    message: string,
    code: string = "BUSINESS_RULE_VIOLATION",
    details?: Record<string, unknown>,
  ): BusinessRuleViolation {
    return this.createBusinessRuleViolation({
      message,
      code,
      severity: this.severity,
      details,
      ruleName: this.name,
      ruleType: this.type,
    });
  }

  /**
   * 创建警告级别的违反
   * @param message 违反消息
   * @param code 违反代码
   * @param details 违反详情
   * @returns 业务规则违反对象
   */
  public createWarning(
    message: string,
    code: string = "BUSINESS_RULE_WARNING",
    details?: Record<string, unknown>,
  ): BusinessRuleViolation {
    return this.createBusinessRuleViolation({
      message,
      code,
      severity: BusinessRuleSeverity.WARNING,
      details,
      ruleName: this.name,
      ruleType: this.type,
    });
  }

  /**
   * 创建信息级别的违反
   * @param message 违反消息
   * @param code 违反代码
   * @param details 违反详情
   * @returns 业务规则违反对象
   */
  public createInfo(
    message: string,
    code: string = "BUSINESS_RULE_INFO",
    details?: Record<string, unknown>,
  ): BusinessRuleViolation {
    return this.createBusinessRuleViolation({
      message,
      code,
      severity: BusinessRuleSeverity.INFO,
      details,
      ruleName: this.name,
      ruleType: this.type,
    });
  }

  /**
   * 检查规则是否适用于给定实体
   * @param entity 要检查的实体
   * @param context 业务规则上下文
   * @returns 是否适用此规则
   */
  public isApplicable(_entity: T, _context?: BusinessRuleContext): boolean {
    // 默认实现：总是适用
    // 子类可以重写此方法以提供更精确的适用性检查
    return true;
  }

  /**
   * 获取规则依赖
   * @returns 依赖的规则名称列表
   */
  public getDependencies(): string[] {
    // 默认实现：无依赖
    // 子类可以重写此方法以提供依赖信息
    return [];
  }

  /**
   * 检查规则是否与给定规则冲突
   * @param other 其他规则
   * @returns 是否冲突
   */
  public conflictsWith(other: IBusinessRule<T>): boolean {
    // 默认实现：无冲突
    // 子类可以重写此方法以提供冲突检查
    return false;
  }

  /**
   * 执行具体验证逻辑
   * @description 子类必须实现此方法以提供具体的验证逻辑
   * @param entity 要验证的实体
   * @param context 业务规则上下文
   * @returns 业务规则验证结果
   */
  protected abstract doValidate(
    entity: T,
    context?: BusinessRuleContext,
  ): BusinessRuleValidationResult;

  /**
   * 创建成功验证结果
   * @param entity 被验证的实体
   * @param context 业务规则上下文
   * @returns 成功的验证结果
   */
  protected createSuccessResult(
    entity: T,
    context?: BusinessRuleContext,
  ): BusinessRuleValidationResult {
    return {
      isValid: true,
      entityType: this.getEntityType(context),
      entityId: this.getEntityId(context),
      violations: [],
      warnings: [],
      info: [],
      executionTime: 0,
      rulesExecuted: 1,
      entitiesValidated: 1,
      hasViolations: () => false,
      hasWarnings: () => false,
      hasInfo: () => false,
      getAllMessages: () => [],
      getMessagesBySeverity: () => [],
      getViolationsForRule: () => [],
      getViolationsBySeverity: () => [],
      getViolationsByRuleType: () => [],
      merge: (other) => other,
      toJSON: () => ({
        isValid: true,
        entityType: this.getEntityType(context),
        entityId: this.getEntityId(context),
        violationCount: 0,
        warningCount: 0,
        infoCount: 0,
        executionTime: 0,
        rulesExecuted: 1,
        entitiesValidated: 1,
        violations: [],
        warnings: [],
        info: [],
      }),
      toString: () => "Business rule validation passed",
    };
  }

  /**
   * 创建失败验证结果
   * @param violations 违反列表
   * @param entity 被验证的实体
   * @param context 业务规则上下文
   * @param warnings 警告列表
   * @param info 信息列表
   * @returns 失败的验证结果
   */
  protected createFailureResult(
    violations: BusinessRuleViolation[],
    entity: T,
    context?: BusinessRuleContext,
    warnings: BusinessRuleViolation[] = [],
    info: BusinessRuleViolation[] = [],
  ): BusinessRuleValidationResult {
    return {
      isValid: false,
      entityType: this.getEntityType(context),
      entityId: this.getEntityId(context),
      violations: Object.freeze([...violations]),
      warnings: Object.freeze([...warnings]),
      info: Object.freeze([...info]),
      executionTime: 0,
      rulesExecuted: 1,
      entitiesValidated: 1,
      hasViolations: () => violations.length > 0,
      hasWarnings: () => warnings.length > 0,
      hasInfo: () => info.length > 0,
      getAllMessages: () =>
        [...violations, ...warnings, ...info].map((v) => v.message),
      getMessagesBySeverity: (severity) => {
        const all = [...violations, ...warnings, ...info];
        return all.filter((v) => v.severity === severity).map((v) => v.message);
      },
      getViolationsForRule: (ruleName) =>
        violations.filter((v) => v.ruleName === ruleName),
      getViolationsBySeverity: (severity) =>
        violations.filter((v) => v.severity === severity),
      getViolationsByRuleType: (ruleType) =>
        violations.filter((v) => v.ruleType === ruleType),
      merge: (other) =>
        this.createFailureResult(
          [...violations, ...other.violations],
          entity,
          context,
          [...warnings, ...other.warnings],
          [...info, ...other.info],
        ),
      toJSON: () => ({
        isValid: false,
        entityType: this.getEntityType(context),
        entityId: this.getEntityId(context),
        violationCount: violations.length,
        warningCount: warnings.length,
        infoCount: info.length,
        executionTime: 0,
        rulesExecuted: 1,
        entitiesValidated: 1,
        violations: violations.map((v) => v.toJSON()),
        warnings: warnings.map((v) => v.toJSON()),
        info: info.map((v) => v.toJSON()),
      }),
      toString: () =>
        `Business rule validation failed: ${violations.map((v) => v.message).join(", ")}`,
    };
  }

  /**
   * 创建业务规则违反对象
   * @param data 违反数据
   * @returns 业务规则违反对象
   */
  private createBusinessRuleViolation(
    data: BusinessRuleViolationData,
  ): BusinessRuleViolation {
    return {
      message: data.message,
      code: data.code,
      ruleName: data.ruleName,
      ruleType: data.ruleType,
      severity: data.severity,
      details: data.details,
      timestamp: data.timestamp ?? new Date(),
      path: data.path,
      value: data.value,
      position: data.position,
      entityType: data.entityType,
      entityId: data.entityId,
      operationType: data.operationType,
      isError: () => data.severity === BusinessRuleSeverity.ERROR,
      isWarning: () => data.severity === BusinessRuleSeverity.WARNING,
      isInfo: () => data.severity === BusinessRuleSeverity.INFO,
      isCritical: () => data.severity === BusinessRuleSeverity.CRITICAL,
      getFullPath: () => {
        const path = data.path ? [...data.path] : [];
        if (data.ruleName) {
          path.push(data.ruleName);
        }
        return path.join(".");
      },
      getFormattedMessage: () => {
        const path = this.createBusinessRuleViolation(data).getFullPath();
        return path ? `${path}: ${data.message}` : data.message;
      },
      toJSON: () => ({
        message: data.message,
        code: data.code,
        ruleName: data.ruleName,
        ruleType: data.ruleType,
        severity: data.severity,
        details: data.details,
        timestamp: (data.timestamp ?? new Date()).getTime(),
        path: data.path,
        value: data.value,
        position: data.position,
        entityType: data.entityType,
        entityId: data.entityId,
        operationType: data.operationType,
      }),
      toString: () => data.message,
      clone: (overrides) =>
        this.createBusinessRuleViolation({ ...data, ...overrides }),
    };
  }

  /**
   * 检查业务规则级别是否匹配
   * @param context 业务规则上下文
   * @param requiredLevel 需要的业务规则级别
   * @returns 是否匹配
   */
  protected isBusinessRuleLevelMatched(
    context?: BusinessRuleContext,
    requiredLevel: BusinessRuleLevel = BusinessRuleLevel.STANDARD,
  ): boolean {
    if (!context?.level) {
      return true; // 默认匹配
    }

    const levelOrder = {
      [BusinessRuleLevel.BASIC]: 1,
      [BusinessRuleLevel.STANDARD]: 2,
      [BusinessRuleLevel.STRICT]: 3,
      [BusinessRuleLevel.COMPLETE]: 4,
    };

    return levelOrder[context.level] >= levelOrder[requiredLevel];
  }

  /**
   * 获取实体类型
   * @param context 业务规则上下文
   * @returns 实体类型
   */
  protected getEntityType(context?: BusinessRuleContext): string {
    return context?.entityType || "Unknown";
  }

  /**
   * 获取实体ID
   * @param context 业务规则上下文
   * @returns 实体ID
   */
  protected getEntityId(context?: BusinessRuleContext): string {
    return context?.entityId || "Unknown";
  }

  /**
   * 获取业务规则选项
   * @param context 业务规则上下文
   * @returns 业务规则选项
   */
  protected getBusinessRuleOptions(
    context?: BusinessRuleContext,
  ): BusinessRuleOptions {
    return context?.options ?? {};
  }
}
