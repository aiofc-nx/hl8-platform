/**
 * @fileoverview Business Rule Composition - 业务规则组合
 * @description 业务规则的组合逻辑实现
 */

import {
  BusinessRule,
  BusinessRuleType,
  BusinessRuleSeverity,
} from "./business-rule.interface.js";
import { BusinessRuleValidationResult } from "./business-rule-validation-result.interface.js";
import { BusinessRuleViolation } from "./business-rule-violation.interface.js";
import { BusinessRuleSeverityUtils } from "./business-rule-severity.enum.js";
import { Entity } from "../entities/base/entity.base.js";

/**
 * 业务规则组合操作符枚举
 * @description 定义业务规则组合的操作符
 */
export enum BusinessRuleCompositionOperator {
  /** 逻辑与 - 所有规则都必须通过 */
  AND = "AND",
  /** 逻辑或 - 至少一个规则通过 */
  OR = "OR",
  /** 逻辑非 - 规则必须不通过 */
  NOT = "NOT",
  /** 条件组合 - 基于条件的组合 */
  CONDITIONAL = "CONDITIONAL",
  /** 优先级组合 - 基于优先级的组合 */
  PRIORITY = "PRIORITY",
}

/**
 * 业务规则组合条件接口
 * @description 定义业务规则组合的条件
 */
export interface BusinessRuleCompositionCondition {
  /** 条件名称 */
  name: string;
  /** 条件描述 */
  description: string;
  /** 条件函数 */
  evaluate: (entity: Entity) => boolean;
  /** 条件优先级 */
  priority: number;
}

/**
 * 业务规则组合配置接口
 * @description 定义业务规则组合的配置
 */
export interface BusinessRuleCompositionConfig {
  /** 组合操作符 */
  operator: BusinessRuleCompositionOperator;
  /** 规则列表 */
  rules: BusinessRule<Entity>[];
  /** 组合条件 */
  conditions?: BusinessRuleCompositionCondition[];
  /** 是否短路执行 */
  shortCircuit?: boolean;
  /** 组合名称 */
  name?: string;
  /** 组合描述 */
  description?: string;
  /** 优先级 */
  priority: number;
  /** 是否启用 */
  enabled: boolean;
  /** 规则类型 */
  type: BusinessRuleType;
  /** 严重程度 */
  severity: BusinessRuleSeverity;
}

/**
 * 业务规则组合类
 * @description 实现业务规则的组合逻辑
 * @template T 实体类型
 */
export class BusinessRuleComposition<T extends Entity> {
  private readonly config: BusinessRuleCompositionConfig;

  constructor(config: BusinessRuleCompositionConfig) {
    this.config = config;
  }

  // 实现 BusinessRule 接口的属性
  get name(): string {
    return this.config.name;
  }

  get description(): string {
    return this.config.description;
  }

  get priority(): number {
    return this.config.priority;
  }

  get enabled(): boolean {
    return this.config.enabled;
  }

  get type(): BusinessRuleType {
    return this.config.type;
  }

  get severity(): BusinessRuleSeverity {
    return this.config.severity;
  }

  /**
   * 启用规则
   */
  enable(): void {
    this.config.enabled = true;
  }

  /**
   * 禁用规则
   */
  disable(): void {
    this.config.enabled = false;
  }

  /**
   * 获取规则严重性
   * @returns 规则严重性
   */
  /**
   * 执行业务规则验证
   */
  validate(entity: T, context?: unknown): BusinessRuleValidationResult {
    return this.executeComposition(entity, context);
  }

  /**
   * 创建业务规则违反
   */
  createViolation(
    message: string,
    code?: string,
    details?: Record<string, unknown>,
  ): BusinessRuleViolation {
    return {
      message,
      code: code || "COMPOSITION_VIOLATION",
      ruleName: this.name,
      severity: this.severity,
      timestamp: new Date(),
      details,
    } as unknown as BusinessRuleViolation;
  }

  /**
   * 检查规则是否适用于给定实体
   */
  isApplicable(entity: T, context?: unknown): boolean {
    return this.config.rules.every(
      (rule) => rule.isApplicable?.(entity, context) ?? true,
    );
  }

  /**
   * 获取规则依赖
   */
  getDependencies(): string[] {
    return this.config.rules.map((rule) => rule.name);
  }

  /**
   * 检查规则是否与给定规则冲突
   */
  conflictsWith(other: BusinessRule<T>): boolean {
    return this.config.rules.some(
      (rule) => rule.conflictsWith?.(other) ?? false,
    );
  }

  /**
   * 执行规则组合
   * @param entity 实体
   * @param context 上下文
   * @returns 验证结果
   */
  private executeComposition(
    entity: T,
    _context?: unknown,
  ): BusinessRuleValidationResult {
    const startTime = Date.now();
    const violations: BusinessRuleViolation[] = [];
    const executedRules: string[] = [];
    const skippedRules: string[] = [];

    // 检查组合条件
    if (this.config.conditions) {
      const conditionResults = this.config.conditions.map((condition) => ({
        condition,
        result: condition.evaluate(entity),
      }));

      // 按优先级排序条件
      conditionResults.sort(
        (a, b) => b.condition.priority - a.condition.priority,
      );

      // 检查是否有条件不满足
      const failedConditions = conditionResults.filter((cr) => !cr.result);
      if (failedConditions.length > 0) {
        // 创建条件失败违规
        const conditionViolation = {
          message: `Composition conditions not met: ${failedConditions.map((fc) => fc.condition.name).join(", ")}`,
          code: "COMPOSITION_CONDITION_FAILED",
          ruleName: this.name,
          severity: BusinessRuleSeverity.WARNING,
          entityId: entity.id.toString(),
          timestamp: new Date(),
          details: {
            failedConditions: failedConditions.map((fc) => fc.condition.name),
            allConditions: conditionResults.map((cr) => ({
              name: cr.condition.name,
              result: cr.result,
              priority: cr.condition.priority,
            })),
          },
        } as unknown as BusinessRuleViolation;
        violations.push(conditionViolation);
      }
    }

    // 执行规则组合
    const ruleResults = this.executeRules(entity, executedRules, skippedRules);
    violations.push(...ruleResults.violations);

    const endTime = Date.now();

    return {
      isValid: violations.length === 0,
      entityType: entity.constructor.name,
      entityId: entity.id.toString(),
      violations,
      warnings: [],
      info: [],
      executionTime: endTime - startTime,
      rulesExecuted: executedRules.length,
      entitiesValidated: 1,
      context: {
        startTime,
        endTime,
        validatedEntities: [entity.id.toString()],
        executedRules,
        operationType: "COMPOSITION",
      },
    } as unknown as BusinessRuleValidationResult;
  }

  /**
   * 执行规则
   * @param entity 实体
   * @param executedRules 已执行的规则列表
   * @param skippedRules 跳过的规则列表
   * @returns 组合结果
   */
  private executeRules(
    entity: T,
    executedRules: string[],
    skippedRules: string[],
  ): { violations: BusinessRuleViolation[] } {
    const violations: BusinessRuleViolation[] = [];
    const ruleResults: BusinessRuleValidationResult[] = [];

    // 执行所有规则
    for (const rule of this.config.rules) {
      if (!rule.enabled) {
        skippedRules.push(rule.name);
        continue;
      }

      try {
        const result = rule.validate(entity);
        ruleResults.push(result);
        executedRules.push(rule.name);

        if (!result.isValid) {
          violations.push(...result.violations);
        }
      } catch (error) {
        // 创建规则执行错误违规
        const errorViolation = {
          message: `Rule execution failed: ${error instanceof Error ? error.message : "Unknown error"}`,
          code: "RULE_EXECUTION_ERROR",
          ruleName: rule.name,
          severity: BusinessRuleSeverity.ERROR,
          entityId: entity.id.toString(),
          timestamp: new Date(),
          details: {
            error: error instanceof Error ? error.stack : String(error),
          },
        } as unknown as BusinessRuleViolation;
        violations.push(errorViolation);
        executedRules.push(rule.name);
      }
    }

    // 根据操作符处理结果
    return this.processCompositionResults(ruleResults, violations);
  }

  /**
   * 处理组合结果
   * @param ruleResults 规则结果列表
   * @param violations 违规列表
   * @returns 处理后的结果
   */
  private processCompositionResults(
    ruleResults: BusinessRuleValidationResult[],
    violations: BusinessRuleViolation[],
  ): { violations: BusinessRuleViolation[] } {
    switch (this.config.operator) {
      case BusinessRuleCompositionOperator.AND:
        return this.processAndComposition(ruleResults, violations);
      case BusinessRuleCompositionOperator.OR:
        return this.processOrComposition(ruleResults, violations);
      case BusinessRuleCompositionOperator.NOT:
        return this.processNotComposition(ruleResults, violations);
      case BusinessRuleCompositionOperator.CONDITIONAL:
        return this.processConditionalComposition(ruleResults, violations);
      case BusinessRuleCompositionOperator.PRIORITY:
        return this.processPriorityComposition(ruleResults, violations);
      default:
        throw new Error(
          `Unsupported composition operator: ${this.config.operator}`,
        );
    }
  }

  /**
   * 处理AND组合
   * @param ruleResults 规则结果列表
   * @param violations 违规列表
   * @returns 处理后的结果
   */
  private processAndComposition(
    ruleResults: BusinessRuleValidationResult[],
    violations: BusinessRuleViolation[],
  ): { violations: BusinessRuleViolation[] } {
    // AND组合：所有规则都必须通过
    const allValid = ruleResults.every((result) => result.isValid);

    if (allValid) {
      return { violations: [] };
    }

    // 如果启用短路执行，只返回第一个失败的规则结果
    if (this.config.shortCircuit) {
      const firstInvalidResult = ruleResults.find((result) => !result.isValid);
      return {
        violations: firstInvalidResult
          ? [...firstInvalidResult.violations]
          : [],
      };
    }

    return { violations };
  }

  /**
   * 处理OR组合
   * @param ruleResults 规则结果列表
   * @param violations 违规列表
   * @returns 处理后的结果
   */
  private processOrComposition(
    ruleResults: BusinessRuleValidationResult[],
    violations: BusinessRuleViolation[],
  ): { violations: BusinessRuleViolation[] } {
    // OR组合：至少一个规则通过
    const anyValid = ruleResults.some((result) => result.isValid);

    if (anyValid) {
      return { violations: [] };
    }

    // 如果启用短路执行，只返回第一个失败的规则结果
    if (this.config.shortCircuit) {
      const firstInvalidResult = ruleResults.find((result) => !result.isValid);
      return {
        violations: firstInvalidResult
          ? [...firstInvalidResult.violations]
          : [],
      };
    }

    return { violations };
  }

  /**
   * 处理NOT组合
   * @param ruleResults 规则结果列表
   * @param violations 违规列表
   * @returns 处理后的结果
   */
  private processNotComposition(
    ruleResults: BusinessRuleValidationResult[],
    _violations: BusinessRuleViolation[],
  ): { violations: BusinessRuleViolation[] } {
    // NOT组合：规则必须不通过
    const allInvalid = ruleResults.every((result) => !result.isValid);

    if (allInvalid) {
      return { violations: [] };
    }

    // 如果规则通过，创建违规
    const passedRules = ruleResults.filter((result) => result.isValid);
    const notViolations = passedRules.map((result) => ({
      message: `Rule should not pass: ${result.entityType || "Unknown"}`,
      code: "NOT_COMPOSITION_VIOLATION",
      ruleName: this.name,
      severity: BusinessRuleSeverity.ERROR,
      entityId: result.entityId || "Unknown",
      timestamp: new Date(),
      details: { originalResult: result },
    })) as unknown as BusinessRuleViolation[];

    return { violations: notViolations };
  }

  /**
   * 处理条件组合
   * @param ruleResults 规则结果列表
   * @param violations 违规列表
   * @returns 处理后的结果
   */
  private processConditionalComposition(
    _ruleResults: BusinessRuleValidationResult[],
    _violations: BusinessRuleViolation[],
  ): { violations: BusinessRuleViolation[] } {
    // 条件组合：基于条件决定是否应用规则结果
    // 这里简化实现，实际应用中需要更复杂的条件逻辑
    return { violations: [] };
  }

  /**
   * 处理优先级组合
   * @param ruleResults 规则结果列表
   * @param violations 违规列表
   * @returns 处理后的结果
   */
  private processPriorityComposition(
    _ruleResults: BusinessRuleValidationResult[],
    _violations: BusinessRuleViolation[],
  ): { violations: BusinessRuleViolation[] } {
    // 优先级组合：按优先级处理规则结果
    // 这里简化实现，实际应用中需要更复杂的优先级逻辑
    return { violations: [] };
  }

  /**
   * 获取最严重的违规
   * @param violations 违规列表
   * @returns 最严重的违规或undefined
   */
  private getMostSevereViolation(
    violations: BusinessRuleViolation[],
  ): BusinessRuleViolation | undefined {
    if (violations.length === 0) {
      return undefined;
    }

    return violations.reduce((mostSevere, current) => {
      const currentSeverity = BusinessRuleSeverityUtils.compare(
        current.severity,
        mostSevere.severity,
      );
      return currentSeverity > 0 ? current : mostSevere;
    });
  }

  /**
   * 创建组合摘要
   * @param ruleResults 规则结果
   * @param violations 违规列表
   * @returns 组合摘要
   */
  private createCompositionSummary(
    ruleResults: { violations: BusinessRuleViolation[] },
    violations: BusinessRuleViolation[],
  ): Record<string, unknown> {
    return {
      compositionOperator: this.config.operator,
      totalRules: this.config.rules.length,
      totalViolations: violations.length,
      shortCircuit: this.config.shortCircuit || false,
      conditions: this.config.conditions?.length || 0,
    };
  }
}
