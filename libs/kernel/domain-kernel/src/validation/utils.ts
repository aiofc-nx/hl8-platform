/**
 * @fileoverview 验证工具函数
 * @description 提供验证过程中使用的通用工具函数
 */

import type { ValidationResult } from "./rules/validation-result.interface.js";
import type { ValidationError } from "./rules/validation-error.interface.js";
import { ValidationErrorLevel } from "./rules/validation-result.interface.js";

/**
 * 验证结果合并器
 * @description 提供验证结果合并的实用工具
 */
export class ValidationResultMerger {
  /**
   * 合并多个验证结果
   * @param results 要合并的验证结果列表
   * @returns 合并后的验证结果
   */
  public static merge(results: ValidationResult[]): ValidationResult {
    if (results.length === 0) {
      return this.createEmptyResult();
    }

    if (results.length === 1) {
      return results[0];
    }

    const allErrors = results.flatMap((result) => result.errors);
    const allWarnings = results.flatMap((result) => result.warnings);
    const allInfo = results.flatMap((result) => result.info);

    const isValid = allErrors.length === 0;
    const executionTime = Math.max(...results.map((r) => r.executionTime));
    const rulesExecuted = results.reduce((sum, r) => sum + r.rulesExecuted, 0);
    const fieldsValidated = Math.max(...results.map((r) => r.fieldsValidated));

    return {
      isValid,
      errors: Object.freeze(allErrors),
      warnings: Object.freeze(allWarnings),
      info: Object.freeze(allInfo),
      executionTime,
      rulesExecuted,
      fieldsValidated,
      hasErrors: () => allErrors.length > 0,
      hasWarnings: () => allWarnings.length > 0,
      hasInfo: () => allInfo.length > 0,
      getAllMessages: () =>
        [...allErrors, ...allWarnings, ...allInfo].map((item) => item.message),
      getMessagesByLevel: (level) => {
        const all = [...allErrors, ...allWarnings, ...allInfo];
        return all
          .filter((item) => item.level === level)
          .map((item) => item.message);
      },
      getErrorsForField: (fieldName) =>
        allErrors.filter((error) => error.fieldName === fieldName),
      getErrorsForRule: (ruleName) =>
        allErrors.filter((error) => error.ruleName === ruleName),
      merge: (other) => this.merge([...results, other]),
      toJSON: () => ({
        isValid,
        errorCount: allErrors.length,
        warningCount: allWarnings.length,
        infoCount: allInfo.length,
        executionTime,
        rulesExecuted,
        fieldsValidated,
        errors: allErrors.map((error) => error.toJSON()),
        warnings: allWarnings.map((warning) => warning.toJSON()),
        info: allInfo.map((info) => info.toJSON()),
      }),
      toString: () => {
        if (isValid) {
          return "Validation passed";
        }
        const messages = [...allErrors, ...allWarnings, ...allInfo].map(
          (item) => item.message,
        );
        return `Validation failed: ${messages.join(", ")}`;
      },
    };
  }

  /**
   * 创建空结果
   * @returns 空的验证结果
   */
  private static createEmptyResult(): ValidationResult {
    return {
      isValid: true,
      errors: [],
      warnings: [],
      info: [],
      executionTime: 0,
      rulesExecuted: 0,
      fieldsValidated: 0,
      hasErrors: () => false,
      hasWarnings: () => false,
      hasInfo: () => false,
      getAllMessages: () => [],
      getMessagesByLevel: () => [],
      getErrorsForField: () => [],
      getErrorsForRule: () => [],
      merge: (other) => other,
      toJSON: () => ({
        isValid: true,
        errorCount: 0,
        warningCount: 0,
        infoCount: 0,
        executionTime: 0,
        rulesExecuted: 0,
        fieldsValidated: 0,
        errors: [],
        warnings: [],
        info: [],
      }),
      toString: () => "Validation passed",
    };
  }
}

/**
 * 验证错误过滤器
 * @description 提供验证错误过滤的实用工具
 */
export class ValidationErrorFilter {
  /**
   * 按字段名称过滤错误
   * @param errors 错误列表
   * @param fieldName 字段名称
   * @returns 过滤后的错误列表
   */
  public static filterByField(
    errors: ValidationError[],
    fieldName: string,
  ): ValidationError[] {
    return errors.filter((error) => error.fieldName === fieldName);
  }

  /**
   * 按规则名称过滤错误
   * @param errors 错误列表
   * @param ruleName 规则名称
   * @returns 过滤后的错误列表
   */
  public static filterByRule(
    errors: ValidationError[],
    ruleName: string,
  ): ValidationError[] {
    return errors.filter((error) => error.ruleName === ruleName);
  }

  /**
   * 按级别过滤错误
   * @param errors 错误列表
   * @param level 错误级别
   * @returns 过滤后的错误列表
   */
  public static filterByLevel(
    errors: ValidationError[],
    level: ValidationErrorLevel,
  ): ValidationError[] {
    return errors.filter((error) => error.level === level);
  }

  /**
   * 按代码过滤错误
   * @param errors 错误列表
   * @param code 错误代码
   * @returns 过滤后的错误列表
   */
  public static filterByCode(
    errors: ValidationError[],
    code: string,
  ): ValidationError[] {
    return errors.filter((error) => error.code === code);
  }

  /**
   * 按路径过滤错误
   * @param errors 错误列表
   * @param path 错误路径
   * @returns 过滤后的错误列表
   */
  public static filterByPath(
    errors: ValidationError[],
    path: string[],
  ): ValidationError[] {
    return errors.filter((error) => {
      if (!error.path || error.path.length !== path.length) {
        return false;
      }
      return error.path.every((segment, index) => segment === path[index]);
    });
  }

  /**
   * 按自定义条件过滤错误
   * @param errors 错误列表
   * @param predicate 过滤条件
   * @returns 过滤后的错误列表
   */
  public static filterByCondition(
    errors: ValidationError[],
    predicate: (error: ValidationError) => boolean,
  ): ValidationError[] {
    return errors.filter(predicate);
  }
}

/**
 * 验证错误分组器
 * @description 提供验证错误分组的实用工具
 */
export class ValidationErrorGrouper {
  /**
   * 按字段名称分组错误
   * @param errors 错误列表
   * @returns 按字段分组的错误映射
   */
  public static groupByField(
    errors: ValidationError[],
  ): Map<string, ValidationError[]> {
    const groups = new Map<string, ValidationError[]>();

    for (const error of errors) {
      const fieldName = error.fieldName || "unknown";
      if (!groups.has(fieldName)) {
        groups.set(fieldName, []);
      }
      groups.get(fieldName)!.push(error);
    }

    return groups;
  }

  /**
   * 按规则名称分组错误
   * @param errors 错误列表
   * @returns 按规则分组的错误映射
   */
  public static groupByRule(
    errors: ValidationError[],
  ): Map<string, ValidationError[]> {
    const groups = new Map<string, ValidationError[]>();

    for (const error of errors) {
      const ruleName = error.ruleName || "unknown";
      if (!groups.has(ruleName)) {
        groups.set(ruleName, []);
      }
      groups.get(ruleName)!.push(error);
    }

    return groups;
  }

  /**
   * 按级别分组错误
   * @param errors 错误列表
   * @returns 按级别分组的错误映射
   */
  public static groupByLevel(
    errors: ValidationError[],
  ): Map<ValidationErrorLevel, ValidationError[]> {
    const groups = new Map<ValidationErrorLevel, ValidationError[]>();

    for (const error of errors) {
      if (!groups.has(error.level)) {
        groups.set(error.level, []);
      }
      groups.get(error.level)!.push(error);
    }

    return groups;
  }

  /**
   * 按代码分组错误
   * @param errors 错误列表
   * @returns 按代码分组的错误映射
   */
  public static groupByCode(
    errors: ValidationError[],
  ): Map<string, ValidationError[]> {
    const groups = new Map<string, ValidationError[]>();

    for (const error of errors) {
      if (!groups.has(error.code)) {
        groups.set(error.code, []);
      }
      groups.get(error.code)!.push(error);
    }

    return groups;
  }
}

/**
 * 验证结果分析器
 * @description 提供验证结果分析的实用工具
 */
export class ValidationResultAnalyzer {
  /**
   * 分析验证结果
   * @param result 验证结果
   * @returns 分析报告
   */
  public static analyze(result: ValidationResult): ValidationAnalysisReport {
    const errorCount = result.errors.length;
    const warningCount = result.warnings.length;
    const infoCount = result.info.length;

    const fieldGroups = ValidationErrorGrouper.groupByField([
      ...result.errors,
      ...result.warnings,
      ...result.info,
    ]);
    const ruleGroups = ValidationErrorGrouper.groupByRule([
      ...result.errors,
      ...result.warnings,
      ...result.info,
    ]);
    const levelGroups = ValidationErrorGrouper.groupByLevel([
      ...result.errors,
      ...result.warnings,
      ...result.info,
    ]);

    return {
      isValid: result.isValid,
      totalIssues: errorCount + warningCount + infoCount,
      errorCount,
      warningCount,
      infoCount,
      fieldCount: fieldGroups.size,
      ruleCount: ruleGroups.size,
      executionTime: result.executionTime,
      rulesExecuted: result.rulesExecuted,
      fieldsValidated: result.fieldsValidated,
      fieldGroups,
      ruleGroups,
      levelGroups,
      mostCommonField: this.findMostCommonField(fieldGroups),
      mostCommonRule: this.findMostCommonRule(ruleGroups),
      mostCommonLevel: this.findMostCommonLevel(levelGroups),
    };
  }

  /**
   * 查找最常见的字段
   * @param fieldGroups 字段分组
   * @returns 最常见的字段名称
   */
  private static findMostCommonField(
    fieldGroups: Map<string, ValidationError[]>,
  ): string | null {
    let maxCount = 0;
    let mostCommonField: string | null = null;

    for (const [fieldName, errors] of fieldGroups) {
      if (errors.length > maxCount) {
        maxCount = errors.length;
        mostCommonField = fieldName;
      }
    }

    return mostCommonField;
  }

  /**
   * 查找最常见的规则
   * @param ruleGroups 规则分组
   * @returns 最常见的规则名称
   */
  private static findMostCommonRule(
    ruleGroups: Map<string, ValidationError[]>,
  ): string | null {
    let maxCount = 0;
    let mostCommonRule: string | null = null;

    for (const [ruleName, errors] of ruleGroups) {
      if (errors.length > maxCount) {
        maxCount = errors.length;
        mostCommonRule = ruleName;
      }
    }

    return mostCommonRule;
  }

  /**
   * 查找最常见的级别
   * @param levelGroups 级别分组
   * @returns 最常见的级别
   */
  private static findMostCommonLevel(
    levelGroups: Map<ValidationErrorLevel, ValidationError[]>,
  ): ValidationErrorLevel | null {
    let maxCount = 0;
    let mostCommonLevel: ValidationErrorLevel | null = null;

    for (const [level, errors] of levelGroups) {
      if (errors.length > maxCount) {
        maxCount = errors.length;
        mostCommonLevel = level;
      }
    }

    return mostCommonLevel;
  }
}

/**
 * 验证分析报告接口
 * @description 定义验证结果分析报告的结构
 */
export interface ValidationAnalysisReport {
  /**
   * 是否有效
   */
  isValid: boolean;

  /**
   * 总问题数量
   */
  totalIssues: number;

  /**
   * 错误数量
   */
  errorCount: number;

  /**
   * 警告数量
   */
  warningCount: number;

  /**
   * 信息数量
   */
  infoCount: number;

  /**
   * 字段数量
   */
  fieldCount: number;

  /**
   * 规则数量
   */
  ruleCount: number;

  /**
   * 执行时间
   */
  executionTime: number;

  /**
   * 执行的规则数量
   */
  rulesExecuted: number;

  /**
   * 验证的字段数量
   */
  fieldsValidated: number;

  /**
   * 按字段分组的错误
   */
  fieldGroups: Map<string, ValidationError[]>;

  /**
   * 按规则分组的错误
   */
  ruleGroups: Map<string, ValidationError[]>;

  /**
   * 按级别分组的错误
   */
  levelGroups: Map<ValidationErrorLevel, ValidationError[]>;

  /**
   * 最常见的字段
   */
  mostCommonField: string | null;

  /**
   * 最常见的规则
   */
  mostCommonRule: string | null;

  /**
   * 最常见的级别
   */
  mostCommonLevel: ValidationErrorLevel | null;
}

/**
 * 验证工具函数集合
 * @description 提供各种验证相关的工具函数
 */
export class ValidationUtils {
  /**
   * 检查值是否为空
   * @param value 要检查的值
   * @returns 是否为空
   */
  public static isEmpty(value: unknown): boolean {
    return value === null || value === undefined || value === "";
  }

  /**
   * 检查值是否为非空
   * @param value 要检查的值
   * @returns 是否为非空
   */
  public static isNotEmpty(value: unknown): boolean {
    return !this.isEmpty(value);
  }

  /**
   * 检查值是否为字符串
   * @param value 要检查的值
   * @returns 是否为字符串
   */
  public static isString(value: unknown): value is string {
    return typeof value === "string";
  }

  /**
   * 检查值是否为数字
   * @param value 要检查的值
   * @returns 是否为数字
   */
  public static isNumber(value: unknown): value is number {
    return typeof value === "number" && !isNaN(value);
  }

  /**
   * 检查值是否为布尔值
   * @param value 要检查的值
   * @returns 是否为布尔值
   */
  public static isBoolean(value: unknown): value is boolean {
    return typeof value === "boolean";
  }

  /**
   * 检查值是否为数组
   * @param value 要检查的值
   * @returns 是否为数组
   */
  public static isArray(value: unknown): value is unknown[] {
    return Array.isArray(value);
  }

  /**
   * 检查值是否为对象
   * @param value 要检查的值
   * @returns 是否为对象
   */
  public static isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
  }

  /**
   * 检查值是否为函数
   * @param value 要检查的值
   * @returns 是否为函数
   */
  public static isFunction(
    value: unknown,
  ): value is (...args: unknown[]) => unknown {
    return typeof value === "function";
  }

  /**
   * 检查值是否为日期
   * @param value 要检查的值
   * @returns 是否为日期
   */
  public static isDate(value: unknown): value is Date {
    return value instanceof Date && !isNaN(value.getTime());
  }

  /**
   * 检查值是否为有效日期字符串
   * @param value 要检查的值
   * @returns 是否为有效日期字符串
   */
  public static isValidDateString(value: unknown): boolean {
    if (typeof value !== "string") {
      return false;
    }

    const date = new Date(value);
    return !isNaN(date.getTime());
  }

  /**
   * 检查值是否为有效邮箱
   * @param value 要检查的值
   * @returns 是否为有效邮箱
   */
  public static isValidEmail(value: unknown): boolean {
    if (typeof value !== "string") {
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value);
  }

  /**
   * 检查值是否为有效URL
   * @param value 要检查的值
   * @returns 是否为有效URL
   */
  public static isValidUrl(value: unknown): boolean {
    if (typeof value !== "string") {
      return false;
    }

    try {
      new URL(value);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 检查值是否匹配正则表达式
   * @param value 要检查的值
   * @param pattern 正则表达式
   * @returns 是否匹配
   */
  public static matchesPattern(value: unknown, pattern: RegExp): boolean {
    if (typeof value !== "string") {
      return false;
    }

    return pattern.test(value);
  }

  /**
   * 检查值是否在指定范围内
   * @param value 要检查的值
   * @param min 最小值
   * @param max 最大值
   * @returns 是否在范围内
   */
  public static isInRange(value: unknown, min: number, max: number): boolean {
    if (typeof value !== "number" || isNaN(value)) {
      return false;
    }

    return value >= min && value <= max;
  }

  /**
   * 检查值是否在指定数组中
   * @param value 要检查的值
   * @param array 数组
   * @returns 是否在数组中
   */
  public static isInArray<T>(value: unknown, array: T[]): value is T {
    return array.includes(value as T);
  }

  /**
   * 检查对象是否包含指定属性
   * @param obj 要检查的对象
   * @param properties 属性列表
   * @returns 是否包含所有属性
   */
  public static hasProperties(obj: unknown, properties: string[]): boolean {
    if (!this.isObject(obj)) {
      return false;
    }

    return properties.every((prop) => prop in obj);
  }

  /**
   * 检查对象属性的类型
   * @param obj 要检查的对象
   * @param propertyTypeMap 属性类型映射
   * @returns 是否所有属性类型都正确
   */
  public static hasCorrectPropertyTypes(
    obj: unknown,
    propertyTypeMap: Record<string, string>,
  ): boolean {
    if (!this.isObject(obj)) {
      return false;
    }

    for (const [property, expectedType] of Object.entries(propertyTypeMap)) {
      if (property in obj) {
        const actualType = typeof obj[property];
        if (actualType !== expectedType) {
          return false;
        }
      }
    }

    return true;
  }
}
