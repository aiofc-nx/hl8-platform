/**
 * @fileoverview Value Object Validator - 值对象验证器实现
 * @description 值对象专用的验证器实现
 */

import { ValueObject } from "../value-objects/base/value-object.base.js";
import { SimpleValueObjectValidationResult } from "./simple-value-object-validation-result.js";
import {
  IValueObjectValidator,
  IValueObjectValidationRule,
  IValueObjectValidationResult,
  FieldViolation,
  ViolationSeverity,
  ValidationStatistics,
  ValidationContext,
} from "./value-object-validator.interface.js";

/**
 * 值对象验证器实现
 * @description 值对象专用的验证器实现
 * @template T 值对象类型
 */
export class ValueObjectValidator<T extends ValueObject<unknown>>
  implements IValueObjectValidator<T>
{
  private rules: IValueObjectValidationRule<T>[] = [];

  constructor(rules: IValueObjectValidationRule<T>[] = []) {
    this.rules = [...rules];
  }

  validate(
    value: T,
    rules: IValueObjectValidationRule<T>[],
  ): IValueObjectValidationResult {
    const startTime = new Date();
    const violations: FieldViolation[] = [];
    const appliedRules: string[] = [];
    let executedRulesCount = 0;

    // 按优先级排序规则
    const sortedRules = [...rules].sort((a, b) => b.priority - a.priority);

    for (const rule of sortedRules) {
      if (!rule.enabled) continue;

      appliedRules.push(rule.name);
      executedRulesCount++;

      try {
        const result = rule.validate(value);
        if (!result.isValid) {
          violations.push({
            field: "value",
            value: value.value,
            violation: result.getAllMessages()[0] || rule.description,
            rule: rule.name,
            severity: ViolationSeverity.ERROR,
            code: `RULE_${rule.name.toUpperCase()}`,
            context: {
              ruleDescription: rule.description,
              rulePriority: rule.priority,
              ruleTags: rule.tags,
            },
          });
        }
      } catch (error) {
        violations.push({
          field: "value",
          value: value.value,
          violation: `Rule execution failed: ${error instanceof Error ? error.message : "Unknown error"}`,
          rule: rule.name,
          severity: ViolationSeverity.CRITICAL,
          code: `RULE_EXECUTION_ERROR`,
          context: {
            ruleDescription: rule.description,
            error: error instanceof Error ? error.message : String(error),
          },
        });
      }
    }

    const endTime = new Date();
    const statistics: ValidationStatistics = {
      startTime,
      endTime,
      duration: endTime.getTime() - startTime.getTime(),
      rulesCount: rules.length,
      executedRulesCount,
      violationsCount: violations.length,
      fieldsCount: 1,
      validatedFieldsCount: 1,
    };

    return new SimpleValueObjectValidationResult(
      violations.length === 0,
      violations.map((v) => v.violation),
      violations
        .filter((v) => v.severity === ViolationSeverity.WARNING)
        .map((v) => v.violation),
      [],
      statistics.duration,
      statistics.executedRulesCount,
      statistics.validatedFieldsCount,
      value.constructor.name,
      appliedRules,
      violations,
      statistics,
    );
  }

  validateWithContext(
    value: T,
    _context: ValidationContext,
  ): IValueObjectValidationResult {
    // 使用上下文中的规则或默认规则
    // 注意：ValidationContext中没有rules属性，这里使用默认规则
    return this.validate(value, this.rules);
  }

  addRule(rule: IValueObjectValidationRule<T>): void {
    const existingIndex = this.rules.findIndex((r) => r.name === rule.name);
    if (existingIndex >= 0) {
      this.rules[existingIndex] = rule;
    } else {
      this.rules.push(rule);
    }
  }

  removeRule(ruleName: string): boolean {
    const index = this.rules.findIndex((rule) => rule.name === ruleName);
    if (index >= 0) {
      this.rules.splice(index, 1);
      return true;
    }
    return false;
  }

  getRules(): IValueObjectValidationRule<T>[] {
    return [...this.rules];
  }

  clearRules(): void {
    this.rules = [];
  }
}
