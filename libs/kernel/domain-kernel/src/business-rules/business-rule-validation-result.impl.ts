/**
 * @fileoverview 业务规则验证结果实现类
 * @description 业务规则验证结果的具体实现
 */

import type {
  BusinessRuleValidationResult,
  BusinessRuleValidationResultContext,
  BusinessRuleValidationResultJSON,
} from "./business-rule-validation-result.interface.js";
import type { BusinessRuleViolation } from "./business-rule-violation.interface.js";
import { BusinessRuleSeverity } from "./business-rule.interface.js";

/**
 * 业务规则验证结果实现类
 * @description 业务规则验证结果的具体实现
 */
export class BusinessRuleValidationResultImpl
  implements BusinessRuleValidationResult
{
  constructor(
    public readonly isValid: boolean,
    public readonly entityType: string,
    public readonly entityId: string,
    public readonly violations: readonly BusinessRuleViolation[],
    public readonly warnings: readonly BusinessRuleViolation[],
    public readonly info: readonly BusinessRuleViolation[],
    public readonly executionTime: number,
    public readonly rulesExecuted: number,
    public readonly entitiesValidated: number,
    public readonly context?: BusinessRuleValidationResultContext,
  ) {}

  hasViolations(): boolean {
    return this.violations.length > 0;
  }

  hasWarnings(): boolean {
    return this.warnings.length > 0;
  }

  hasInfo(): boolean {
    return this.info.length > 0;
  }

  getAllMessages(): string[] {
    return [
      ...this.violations.map((v) => v.message),
      ...this.warnings.map((v) => v.message),
      ...this.info.map((v) => v.message),
    ];
  }

  getMessagesBySeverity(severity: BusinessRuleSeverity): string[] {
    const allItems = [...this.violations, ...this.warnings, ...this.info];
    return allItems
      .filter((item) => item.severity === severity)
      .map((item) => item.message);
  }

  getViolationsForRule(ruleName: string): BusinessRuleViolation[] {
    return this.violations.filter((v) => v.ruleName === ruleName);
  }

  getViolationsBySeverity(
    severity: BusinessRuleSeverity,
  ): BusinessRuleViolation[] {
    return this.violations.filter((v) => v.severity === severity);
  }

  getViolationsByRuleType(ruleType: string): BusinessRuleViolation[] {
    return this.violations.filter(
      (v) => (v as unknown as { ruleType?: string }).ruleType === ruleType,
    );
  }

  merge(other: BusinessRuleValidationResult): BusinessRuleValidationResult {
    return new BusinessRuleValidationResultImpl(
      this.isValid && other.isValid,
      this.entityType,
      this.entityId,
      [...this.violations, ...other.violations],
      [...this.warnings, ...other.warnings],
      [...this.info, ...other.info],
      this.executionTime + other.executionTime,
      this.rulesExecuted + other.rulesExecuted,
      this.entitiesValidated + other.entitiesValidated,
      this.context,
    );
  }

  toJSON(): BusinessRuleValidationResultJSON {
    return {
      isValid: this.isValid,
      entityType: this.entityType,
      entityId: this.entityId,
      violationCount: this.violations.length,
      warningCount: this.warnings.length,
      infoCount: this.info.length,
      executionTime: this.executionTime,
      rulesExecuted: this.rulesExecuted,
      entitiesValidated: this.entitiesValidated,
      violations: this.violations.map((v) => ({
        message: v.message,
        code: v.code,
        ruleName: v.ruleName,
        severity: v.severity,
        details: v.details,
        timestamp: v.timestamp.getTime(),
      })),
      warnings: this.warnings.map((v) => ({
        message: v.message,
        code: v.code,
        ruleName: v.ruleName,
        severity: v.severity,
        details: v.details,
        timestamp: v.timestamp.getTime(),
      })),
      info: this.info.map((v) => ({
        message: v.message,
        code: v.code,
        ruleName: v.ruleName,
        severity: v.severity,
        details: v.details,
        timestamp: v.timestamp.getTime(),
      })),
    };
  }

  toString(): string {
    return JSON.stringify(this.toJSON(), null, 2);
  }
}
