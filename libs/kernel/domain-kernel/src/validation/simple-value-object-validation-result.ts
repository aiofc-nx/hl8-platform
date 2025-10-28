/**
 * @fileoverview Simple Value Object Validation Result - 简化值对象验证结果
 * @description 简化的值对象验证结果实现
 */

import { SimpleValidationResult } from "./rules/simple-validation-result.js";
import {
  FieldViolation,
  ValidationStatistics,
} from "./value-object-validator.interface.js";

/**
 * 简化值对象验证结果实现
 * @description 简化的值对象验证结果实现
 */
export class SimpleValueObjectValidationResult extends SimpleValidationResult {
  public readonly valueObjectType: string;
  public readonly validationRules: string[];
  public readonly fieldViolations: FieldViolation[];
  public readonly statistics: ValidationStatistics;

  constructor(
    isValid: boolean,
    errors: string[] = [],
    warnings: string[] = [],
    info: string[] = [],
    executionTime: number = 0,
    rulesExecuted: number = 0,
    fieldsValidated: number = 0,
    valueObjectType: string = "",
    validationRules: string[] = [],
    fieldViolations: FieldViolation[] = [],
    statistics: ValidationStatistics = {
      startTime: new Date(),
      endTime: new Date(),
      duration: 0,
      rulesCount: 0,
      executedRulesCount: 0,
      violationsCount: 0,
      fieldsCount: 0,
      validatedFieldsCount: 0,
    },
  ) {
    super(
      isValid,
      errors,
      warnings,
      info,
      executionTime,
      rulesExecuted,
      fieldsValidated,
    );
    this.valueObjectType = valueObjectType;
    this.validationRules = validationRules;
    this.fieldViolations = fieldViolations;
    this.statistics = statistics;
  }
}
