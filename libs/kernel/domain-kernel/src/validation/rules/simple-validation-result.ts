/**
 * @fileoverview Simple Validation Result - 简化验证结果
 * @description 简化的验证结果实现，用于值对象验证
 */

import {
  ValidationResult,
  ValidationResultContext,
  ValidationResultJSON,
} from "./validation-result.interface.js";
import { ValidationError } from "./validation-error.interface.js";

/**
 * 简化验证结果实现
 * @description 简化的验证结果实现，用于值对象验证
 */
export class SimpleValidationResult implements ValidationResult {
  readonly isValid: boolean;
  readonly errors: readonly ValidationError[];
  readonly warnings: readonly ValidationError[];
  readonly info: readonly ValidationError[];
  readonly executionTime: number;
  readonly rulesExecuted: number;
  readonly fieldsValidated: number;
  readonly context?: ValidationResultContext;

  constructor(
    isValid: boolean,
    errors: string[] = [],
    warnings: string[] = [],
    info: string[] = [],
    executionTime: number = 0,
    rulesExecuted: number = 0,
    fieldsValidated: number = 0,
  ) {
    this.isValid = isValid;
    this.errors = errors.map((msg, index) =>
      this.createValidationError(msg, "error", `error_${index}`),
    );
    this.warnings = warnings.map((msg, index) =>
      this.createValidationError(msg, "warning", `warning_${index}`),
    );
    this.info = info.map((msg, index) =>
      this.createValidationError(msg, "info", `info_${index}`),
    );
    this.executionTime = executionTime;
    this.rulesExecuted = rulesExecuted;
    this.fieldsValidated = fieldsValidated;
  }

  private createValidationError(
    message: string,
    level: string,
    code: string,
  ): ValidationError {
    return {
      message,
      code,
      level,
      timestamp: Date.now(),
      isError: () => level === "error",
      isWarning: () => level === "warning",
      isInfo: () => level === "info",
      getFullPath: () => "",
      getFormattedMessage: () => message,
      toJSON: () => ({
        message,
        code,
        level: level.toString(),
        timestamp: Date.now(),
      }),
      toString: () => message,
      clone: () => this.createValidationError(message, level, code),
    } as ValidationError;
  }

  hasErrors(): boolean {
    return this.errors.length > 0;
  }

  hasWarnings(): boolean {
    return this.warnings.length > 0;
  }

  hasInfo(): boolean {
    return this.info.length > 0;
  }

  getAllMessages(): string[] {
    return [
      ...this.errors.map((e) => e.message),
      ...this.warnings.map((w) => w.message),
      ...this.info.map((i) => i.message),
    ];
  }

  getMessagesByLevel(level: string): string[] {
    switch (level) {
      case "error":
        return this.errors.map((e) => e.message);
      case "warning":
        return this.warnings.map((w) => w.message);
      case "info":
        return this.info.map((i) => i.message);
      default:
        return [];
    }
  }

  getErrorsForField(fieldName: string): ValidationError[] {
    return this.errors.filter((e) => e.fieldName === fieldName);
  }

  getErrorsForRule(ruleName: string): ValidationError[] {
    return this.errors.filter((e) => e.ruleName === ruleName);
  }

  merge(other: ValidationResult): ValidationResult {
    return new SimpleValidationResult(
      this.isValid && other.isValid,
      [...this.getAllMessages(), ...other.getAllMessages()],
      [],
      [],
      this.executionTime + other.executionTime,
      this.rulesExecuted + other.rulesExecuted,
      this.fieldsValidated + other.fieldsValidated,
    );
  }

  toJSON(): ValidationResultJSON {
    return {
      isValid: this.isValid,
      errorCount: this.errors.length,
      warningCount: this.warnings.length,
      infoCount: this.info.length,
      executionTime: this.executionTime,
      rulesExecuted: this.rulesExecuted,
      fieldsValidated: this.fieldsValidated,
      errors: this.errors.map((e) => ({
        message: e.message,
        code: e.code,
        fieldName: e.fieldName,
        ruleName: e.ruleName,
        level: e.level.toString(),
        details: e.details,
      })),
      warnings: this.warnings.map((w) => ({
        message: w.message,
        code: w.code,
        fieldName: w.fieldName,
        ruleName: w.ruleName,
        level: w.level.toString(),
        details: w.details,
      })),
      info: this.info.map((i) => ({
        message: i.message,
        code: i.code,
        fieldName: i.fieldName,
        ruleName: i.ruleName,
        level: i.level.toString(),
        details: i.details,
      })),
    };
  }

  toString(): string {
    return `ValidationResult(isValid=${this.isValid}, errors=${this.errors.length}, warnings=${this.warnings.length})`;
  }
}
