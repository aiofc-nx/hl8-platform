/**
 * @fileoverview Business Rule Manager - 业务规则管理器
 * @description 管理业务规则的注册、执行和验证
 */

import { BusinessRule } from "./business-rule.interface.js";
import { BusinessRuleValidationResult } from "./business-rule-validation-result.interface.js";
import { BusinessRuleValidationResultImpl } from "./business-rule-validation-result.impl.js";
import { BusinessRuleViolation } from "./business-rule-violation.interface.js";
import { BusinessRuleSeverity as BusinessRuleSeverityEnum } from "./business-rule.interface.js";
import { BusinessRuleSeverityUtils } from "./business-rule-severity.enum.js";
import { Entity } from "../entities/base/entity.base.js";

/**
 * 业务规则管理器类
 * @description 管理业务规则的注册、执行和验证
 * @template T 实体类型
 */
export class BusinessRuleManager<T extends Entity> {
  private rules: Map<string, BusinessRule<T>> = new Map();
  private ruleGroups: Map<string, string[]> = new Map();
  private ruleDependencies: Map<string, string[]> = new Map();
  private ruleExecutionOrder: string[] = [];
  private validationStats: {
    totalValidations: number;
    successfulValidations: number;
    failedValidations: number;
    warningValidations: number;
  } = {
    totalValidations: 0,
    successfulValidations: 0,
    failedValidations: 0,
    warningValidations: 0,
  };

  /**
   * 注册业务规则
   * @param rule 业务规则
   */
  registerRule(rule: BusinessRule<T>): boolean {
    this.rules.set(rule.name, rule);
    this.updateExecutionOrder();
    return true;
  }

  /**
   * 注销业务规则
   * @param ruleId 规则ID
   */
  unregisterRule(ruleName: string): void {
    this.rules.delete(ruleName);
    this.updateExecutionOrder();
  }

  /**
   * 获取业务规则
   * @param ruleId 规则ID
   * @returns 业务规则或undefined
   */
  getRule(ruleName: string): BusinessRule<T> | undefined {
    return this.rules.get(ruleName);
  }

  /**
   * 获取所有业务规则
   * @returns 业务规则列表
   */
  getAllRules(): BusinessRule<T>[] {
    return Array.from(this.rules.values());
  }

  /**
   * 创建规则组
   * @param groupName 组名称
   * @param ruleIds 规则ID列表
   */
  createRuleGroup(groupName: string, ruleIds: string[]): void {
    this.ruleGroups.set(groupName, ruleIds);
  }

  /**
   * 添加规则依赖
   * @param ruleId 规则ID
   * @param dependencyRuleIds 依赖的规则ID列表
   */
  addRuleDependencies(ruleId: string, dependencyRuleIds: string[]): void {
    this.ruleDependencies.set(ruleId, dependencyRuleIds);
  }

  /**
   * 验证实体
   * @param entity 实体
   * @param ruleIdsOrContext 要验证的规则ID列表或上下文，如果未提供则验证所有规则
   * @returns 验证结果
   */
  validateEntity(
    entity: T,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ruleIdsOrContext?: string[] | any,
  ): BusinessRuleValidationResult {
    const startTime = Date.now();
    const violations: BusinessRuleViolation[] = [];
    const warnings: BusinessRuleViolation[] = [];
    const info: BusinessRuleViolation[] = [];
    const executedRules: string[] = [];
    const skippedRules: string[] = [];

    const rulesToExecute =
      ruleIdsOrContext && Array.isArray(ruleIdsOrContext)
        ? (ruleIdsOrContext
            .map((id) => this.rules.get(id))
            .filter((rule) => rule !== undefined) as BusinessRule<T>[])
        : this.getAllRules();

    for (const rule of rulesToExecute) {
      try {
        if (this.shouldExecuteRule(rule, executedRules)) {
          const ruleResult = rule.validate(entity);
          violations.push(...ruleResult.violations);
          warnings.push(...ruleResult.warnings);
          info.push(...ruleResult.info);
          executedRules.push(rule.name);
        } else {
          skippedRules.push(rule.name);
        }
      } catch (error) {
        // 创建错误违规
        const errorViolation = {
          message: `Rule execution failed: ${error instanceof Error ? error.message : "Unknown error"}`,
          code: "RULE_EXECUTION_ERROR",
          ruleName: rule.name,
          severity: BusinessRuleSeverityEnum.ERROR,
          entityId: entity?.id?.toString() || "unknown",
          timestamp: new Date(),
          details: {
            error: error instanceof Error ? error.stack : String(error),
          },
        } as unknown as BusinessRuleViolation;
        violations.push(errorViolation);
        executedRules.push(rule.name);
      }
    }

    const endTime = Date.now();
    const _mostSevereViolation = this.getMostSevereViolation(violations);

    const isValid = violations.length === 0;
    const result = new BusinessRuleValidationResultImpl(
      isValid,
      entity?.constructor?.name || "Unknown",
      entity?.id?.toString() || "unknown",
      violations,
      warnings,
      info,
      endTime - startTime,
      executedRules.length,
      1,
      {
        startTime,
        endTime,
        validatedEntities: [entity?.id?.toString() || "unknown"],
        executedRules,
        operationType: "VALIDATION",
      },
    );

    // 更新统计信息
    this.validationStats.totalValidations++;
    if (isValid) {
      this.validationStats.successfulValidations++;
    } else {
      this.validationStats.failedValidations++;
    }
    if (warnings.length > 0) {
      this.validationStats.warningValidations++;
    }

    return result;
  }

  /**
   * 验证规则组
   * @param entity 实体
   * @param groupName 组名称
   * @returns 验证结果
   */
  validateRuleGroup(
    entity: T,
    groupName: string,
  ): BusinessRuleValidationResult {
    const ruleIds = this.ruleGroups.get(groupName);
    if (!ruleIds) {
      throw new Error(`Rule group '${groupName}' not found`);
    }
    return this.validateEntity(entity, ruleIds);
  }

  /**
   * 检查规则是否应该执行
   * @param rule 规则
   * @param executedRules 已执行的规则列表
   * @returns 是否应该执行
   */
  private shouldExecuteRule(
    rule: BusinessRule<T>,
    executedRules: string[],
  ): boolean {
    const dependencies = this.ruleDependencies.get(rule.name);
    if (!dependencies) {
      return true;
    }
    return dependencies.every((depId) => executedRules.includes(depId));
  }

  /**
   * 更新规则执行顺序
   */
  private updateExecutionOrder(): void {
    const visited = new Set<string>();
    const visiting = new Set<string>();
    const order: string[] = [];

    const visit = (ruleId: string): void => {
      if (visiting.has(ruleId)) {
        throw new Error(
          `Circular dependency detected involving rule: ${ruleId}`,
        );
      }
      if (visited.has(ruleId)) {
        return;
      }

      visiting.add(ruleId);
      const dependencies = this.ruleDependencies.get(ruleId) || [];
      for (const depId of dependencies) {
        if (this.rules.has(depId)) {
          visit(depId);
        }
      }
      visiting.delete(ruleId);
      visited.add(ruleId);
      order.push(ruleId);
    };

    for (const ruleId of this.rules.keys()) {
      if (!visited.has(ruleId)) {
        visit(ruleId);
      }
    }

    this.ruleExecutionOrder = order;
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
   * 创建验证摘要
   * @param violations 违规列表
   * @param executedRules 已执行的规则列表
   * @param skippedRules 跳过的规则列表
   * @returns 验证摘要
   */
  private createValidationSummary(
    violations: BusinessRuleViolation[],
    executedRules: string[],
    skippedRules: string[],
  ): Record<string, unknown> {
    const severityCounts = violations.reduce(
      (counts, violation) => {
        counts[violation.severity] = (counts[violation.severity] || 0) + 1;
        return counts;
      },
      {} as Record<string, number>,
    );

    return {
      totalViolations: violations.length,
      totalRulesExecuted: executedRules.length,
      totalRulesSkipped: skippedRules.length,
      severityCounts,
      hasBlockingViolations: violations.some((v) =>
        BusinessRuleSeverityUtils.blocksOperation(
          v.severity as BusinessRuleSeverityEnum,
        ),
      ),
      hasImmediateActionRequired: violations.some((v) =>
        BusinessRuleSeverityUtils.requiresImmediateAction(
          v.severity as BusinessRuleSeverityEnum,
        ),
      ),
    };
  }

  /**
   * 检查规则是否存在
   * @param ruleName 规则名称
   * @returns 是否存在
   */
  hasRule(ruleName: string): boolean {
    return this.rules.has(ruleName);
  }

  /**
   * 启用规则
   * @param ruleName 规则名称
   * @returns 是否成功启用
   */
  enableRule(ruleName: string): boolean {
    const rule = this.rules.get(ruleName);
    if (rule) {
      rule.enable();
      return true;
    }
    return false;
  }

  /**
   * 禁用规则
   * @param ruleName 规则名称
   * @returns 是否成功禁用
   */
  disableRule(ruleName: string): boolean {
    const rule = this.rules.get(ruleName);
    if (rule) {
      rule.disable();
      return true;
    }
    return false;
  }

  /**
   * 检查规则是否启用
   * @param ruleName 规则名称
   * @returns 是否启用
   */
  isRuleEnabled(ruleName: string): boolean {
    const rule = this.rules.get(ruleName);
    return rule ? rule.enabled : false;
  }

  /**
   * 获取规则数量
   * @returns 规则数量
   */
  getRuleCount(): number {
    return this.rules.size;
  }

  /**
   * 获取启用的规则数量
   * @returns 启用的规则数量
   */
  getEnabledRuleCount(): number {
    return Array.from(this.rules.values()).filter((rule) => rule.enabled)
      .length;
  }

  /**
   * 获取禁用的规则数量
   * @returns 禁用的规则数量
   */
  getDisabledRuleCount(): number {
    return Array.from(this.rules.values()).filter((rule) => !rule.enabled)
      .length;
  }

  /**
   * 按类型获取规则
   * @param type 规则类型
   * @returns 规则列表
   */
  getRulesByType(type: string): BusinessRule<T>[] {
    return Array.from(this.rules.values()).filter(
      (rule) =>
        rule.type === type ||
        (rule as unknown as { ruleType?: string }).ruleType === type,
    );
  }

  /**
   * 按优先级获取规则
   * @param priority 优先级
   * @returns 规则列表
   */
  getRulesByPriority(priority: number): BusinessRule<T>[] {
    return Array.from(this.rules.values()).filter(
      (rule) => rule.priority === priority,
    );
  }

  /**
   * 清空所有规则
   * @returns 清空的规则数量
   */
  clearRules(): number {
    const count = this.rules.size;
    this.rules.clear();
    this.ruleGroups.clear();
    this.ruleDependencies.clear();
    this.ruleExecutionOrder = [];
    return count;
  }

  /**
   * 验证实体属性
   * @param entity 实体
   * @param property 属性名
   * @param context 上下文
   * @returns 验证结果
   */
  validateEntityProperty(
    entity: T,
    property: string,
    context?: unknown,
  ): BusinessRuleValidationResult {
    // 简化实现，实际应该根据属性过滤规则
    return this.validateEntity(entity, context);
  }

  /**
   * 验证实体集合
   * @param entities 实体集合
   * @param context 上下文
   * @returns 验证结果
   */
  validateEntityCollection(
    entities: T[],
    context?: unknown,
  ): BusinessRuleValidationResult {
    const allViolations: BusinessRuleViolation[] = [];
    let totalExecutionTime = 0;
    let totalRulesExecuted = 0;

    for (const entity of entities) {
      const result = this.validateEntity(entity, context);
      allViolations.push(...result.violations);
      totalExecutionTime += result.executionTime;
      totalRulesExecuted += result.rulesExecuted;
    }

    return new BusinessRuleValidationResultImpl(
      allViolations.length === 0,
      entities[0]?.constructor.name || "Unknown",
      "collection",
      allViolations,
      [],
      [],
      totalExecutionTime,
      totalRulesExecuted,
      entities.length,
      {
        startTime: Date.now(),
        endTime: Date.now(),
        validatedEntities: entities.map((e) => e?.id?.toString() || "unknown"),
        executedRules: [],
        operationType: "COLLECTION_VALIDATION",
      },
    );
  }

  /**
   * 验证指定规则
   * @param ruleName 规则名称
   * @param value 值
   * @param context 上下文
   * @returns 验证结果
   */
  validateRule(
    ruleName: string,
    value: unknown,
    context?: unknown,
  ): BusinessRuleValidationResult {
    const rule = this.rules.get(ruleName);
    if (!rule) {
      throw new Error(`Rule '${ruleName}' not found`);
    }

    // 创建一个临时实体，将 value 作为实体内容
    // 如果 value 是字符串，尝试将其作为实体属性
    const tempEntity = (
      typeof value === "string"
        ? { value, id: { toString: () => "temp" } }
        : value
    ) as T;
    return rule.validate(tempEntity, context);
  }

  /**
   * 验证指定规则集合
   * @param ruleNames 规则名称列表
   * @param value 值
   * @param context 上下文
   * @returns 验证结果
   */
  validateRules(
    ruleNames: string[],
    value: unknown,
    context?: unknown,
  ): BusinessRuleValidationResult {
    const rules = ruleNames
      .map((name) => this.rules.get(name))
      .filter((rule) => rule !== undefined) as BusinessRule<T>[];
    if (rules.length === 0) {
      throw new Error("No valid rules found");
    }

    // 创建一个临时实体，将 value 作为实体内容
    const tempEntity = (
      typeof value === "string"
        ? { value, id: { toString: () => "temp" } }
        : value
    ) as T;
    const allViolations: BusinessRuleViolation[] = [];
    const allWarnings: BusinessRuleViolation[] = [];
    const allInfo: BusinessRuleViolation[] = [];
    let totalExecutionTime = 0;

    for (const rule of rules) {
      const result = rule.validate(tempEntity, context);
      allViolations.push(...result.violations);
      allWarnings.push(...result.warnings);
      allInfo.push(...result.info);
      totalExecutionTime += result.executionTime;
    }

    return new BusinessRuleValidationResultImpl(
      allViolations.length === 0,
      "Unknown",
      "temp",
      allViolations,
      allWarnings,
      allInfo,
      totalExecutionTime,
      rules.length,
      1,
      {
        startTime: Date.now(),
        endTime: Date.now(),
        validatedEntities: ["temp"],
        executedRules: ruleNames,
        operationType: "RULES_VALIDATION",
      },
    );
  }

  /**
   * 验证所有规则
   * @param value 值
   * @param context 上下文
   * @returns 验证结果
   */
  validateAllRules(
    value: unknown,
    context?: unknown,
  ): BusinessRuleValidationResult {
    // 创建一个临时实体，将 value 作为实体内容
    const tempEntity = (
      typeof value === "string"
        ? { value, id: { toString: () => "temp" } }
        : value
    ) as T;
    return this.validateEntity(tempEntity, context);
  }

  /**
   * 获取规则统计信息
   * @returns 规则统计信息
   */
  getRuleStatistics(): Record<string, unknown> {
    const rules = this.getAllRules();
    const severityCounts = rules.reduce(
      (counts, rule) => {
        const severity = rule.severity as string;
        counts[severity] = (counts[severity] || 0) + 1;
        return counts;
      },
      {} as Record<string, number>,
    );

    return {
      totalRules: rules.length,
      severityCounts,
      ruleGroups: this.ruleGroups.size,
      ruleDependencies: this.ruleDependencies.size,
      executionOrder: this.ruleExecutionOrder,
    };
  }

  /**
   * 获取验证统计信息
   * @returns 验证统计信息
   */
  getValidationStats(): {
    totalValidations: number;
    successfulValidations: number;
    failedValidations: number;
    warningValidations: number;
  } {
    return { ...this.validationStats };
  }

  /**
   * 重置验证统计信息
   * @returns 是否重置成功
   */
  resetValidationStats(): boolean {
    this.validationStats = {
      totalValidations: 0,
      successfulValidations: 0,
      failedValidations: 0,
      warningValidations: 0,
    };
    return true;
  }

  /**
   * 清空所有规则
   */
  clearAllRules(): void {
    this.rules.clear();
    this.ruleGroups.clear();
    this.ruleDependencies.clear();
    this.ruleExecutionOrder = [];
  }

  /**
   * 导出规则配置
   * @returns 规则配置
   */
  exportConfiguration(): Record<string, unknown> {
    return {
      rules: Array.from(this.rules.entries()).map(([name, rule]) => ({
        name,
        description: rule.description,
        severity: rule.severity as string,
        isEnabled: rule.enabled,
      })),
      ruleGroups: Object.fromEntries(this.ruleGroups),
      ruleDependencies: Object.fromEntries(this.ruleDependencies),
      executionOrder: this.ruleExecutionOrder,
    };
  }

  /**
   * 导入规则配置
   * @param configuration 规则配置
   */
  importConfiguration(configuration: Record<string, unknown>): void {
    // 注意：这里只导入配置信息，不导入规则实现
    // 实际的规则实现需要单独注册
    if (configuration.ruleGroups) {
      this.ruleGroups = new Map(
        Object.entries(configuration.ruleGroups as Record<string, string[]>),
      );
    }
    if (configuration.ruleDependencies) {
      this.ruleDependencies = new Map(
        Object.entries(
          configuration.ruleDependencies as Record<string, string[]>,
        ),
      );
    }
    if (configuration.executionOrder) {
      this.ruleExecutionOrder = configuration.executionOrder as string[];
    }
  }
}
