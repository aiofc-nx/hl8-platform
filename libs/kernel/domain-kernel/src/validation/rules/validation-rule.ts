/**
 * @fileoverview 验证规则实现
 * @description 提供验证规则的基础实现和通用功能
 */

import type {
  ValidationRule as IValidationRule,
  ValidationContext,
  ValidationOptions,
} from "./validation-rule.interface.js";
import { ValidationLevel } from "./validation-rule.interface.js";
import type { ValidationResult } from "./validation-result.interface.js";
import type {
  ValidationError,
  ValidationErrorData,
} from "./validation-error.interface.js";
import { ValidationErrorLevel } from "./validation-result.interface.js";
import { ValidationRuleException } from "../../exceptions/validation-exceptions.js";

/**
 * 验证规则抽象基类
 * @description 提供验证规则的基础实现，所有具体验证规则都应继承此类
 */
export abstract class ValidationRule<T = unknown>
  implements IValidationRule<T>
{
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
   * 创建验证规则
   * @param name 规则名称
   * @param description 规则描述
   * @param priority 规则优先级
   * @param enabled 规则是否启用
   */
  constructor(
    name: string,
    description: string = "",
    priority: number = 100,
    enabled: boolean = true,
  ) {
    this.name = name;
    this.description = description;
    this.priority = priority;
    this.enabled = enabled;
  }

  /**
   * 执行验证
   * @param value 要验证的值
   * @param context 验证上下文
   * @returns 验证结果
   */
  public validate(value: T, context?: ValidationContext): ValidationResult {
    try {
      // 检查规则是否启用
      if (!this.enabled) {
        return this.createSuccessResult();
      }

      // 检查规则是否适用
      if (!this.isApplicable(value, context)) {
        return this.createSuccessResult();
      }

      // 执行具体验证逻辑
      return this.doValidate(value, context);
    } catch (error) {
      throw new ValidationRuleException(
        this.name,
        `Rule execution failed: ${error instanceof Error ? error.message : String(error)}`,
        { originalError: error },
      );
    }
  }

  /**
   * 创建验证错误
   * @param message 错误消息
   * @param code 错误代码
   * @param details 错误详情
   * @returns 验证错误对象
   */
  public createError(
    message: string,
    code: string = "VALIDATION_ERROR",
    details?: Record<string, unknown>,
  ): ValidationError {
    return this.createValidationError({
      message,
      code,
      level: ValidationErrorLevel.ERROR,
      details,
      ruleName: this.name,
    });
  }

  /**
   * 创建验证警告
   * @param message 警告消息
   * @param code 警告代码
   * @param details 警告详情
   * @returns 验证错误对象
   */
  public createWarning(
    message: string,
    code: string = "VALIDATION_WARNING",
    details?: Record<string, unknown>,
  ): ValidationError {
    return this.createValidationError({
      message,
      code,
      level: ValidationErrorLevel.WARNING,
      details,
      ruleName: this.name,
    });
  }

  /**
   * 创建验证信息
   * @param message 信息消息
   * @param code 信息代码
   * @param details 信息详情
   * @returns 验证错误对象
   */
  public createInfo(
    message: string,
    code: string = "VALIDATION_INFO",
    details?: Record<string, unknown>,
  ): ValidationError {
    return this.createValidationError({
      message,
      code,
      level: ValidationErrorLevel.INFO,
      details,
      ruleName: this.name,
    });
  }

  /**
   * 检查规则是否适用于给定值
   * @param value 要检查的值
   * @param context 验证上下文
   * @returns 是否适用此规则
   */
  public isApplicable(_value: T, _context?: ValidationContext): boolean {
    // 默认实现：总是适用
    // 子类可以重写此方法以提供更精确的适用性检查
    return true;
  }

  /**
   * 执行具体验证逻辑
   * @description 子类必须实现此方法以提供具体的验证逻辑
   * @param value 要验证的值
   * @param context 验证上下文
   * @returns 验证结果
   */
  protected abstract doValidate(
    value: T,
    context?: ValidationContext,
  ): ValidationResult;

  /**
   * 创建成功验证结果
   * @returns 成功的验证结果
   */
  protected createSuccessResult(): ValidationResult {
    return {
      isValid: true,
      errors: [],
      warnings: [],
      info: [],
      executionTime: 0,
      rulesExecuted: 1,
      fieldsValidated: 1,
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
        rulesExecuted: 1,
        fieldsValidated: 1,
        errors: [],
        warnings: [],
        info: [],
      }),
      toString: () => "Validation passed",
    };
  }

  /**
   * 创建失败验证结果
   * @param errors 错误列表
   * @param warnings 警告列表
   * @param info 信息列表
   * @returns 失败的验证结果
   */
  protected createFailureResult(
    errors: ValidationError[] = [],
    warnings: ValidationError[] = [],
    info: ValidationError[] = [],
  ): ValidationResult {
    return {
      isValid: false,
      errors: Object.freeze([...errors]),
      warnings: Object.freeze([...warnings]),
      info: Object.freeze([...info]),
      executionTime: 0,
      rulesExecuted: 1,
      fieldsValidated: 1,
      hasErrors: () => errors.length > 0,
      hasWarnings: () => warnings.length > 0,
      hasInfo: () => info.length > 0,
      getAllMessages: () =>
        [...errors, ...warnings, ...info].map((e) => e.message),
      getMessagesByLevel: (level) => {
        const all = [...errors, ...warnings, ...info];
        return all.filter((e) => e.level === level).map((e) => e.message);
      },
      getErrorsForField: (fieldName) =>
        errors.filter((e) => e.fieldName === fieldName),
      getErrorsForRule: (ruleName) =>
        errors.filter((e) => e.ruleName === ruleName),
      merge: (other) =>
        this.createFailureResult(
          [...errors, ...other.errors],
          [...warnings, ...other.warnings],
          [...info, ...other.info],
        ),
      toJSON: () => ({
        isValid: false,
        errorCount: errors.length,
        warningCount: warnings.length,
        infoCount: info.length,
        executionTime: 0,
        rulesExecuted: 1,
        fieldsValidated: 1,
        errors: errors.map((e) => e.toJSON()),
        warnings: warnings.map((e) => e.toJSON()),
        info: info.map((e) => e.toJSON()),
      }),
      toString: () =>
        `Validation failed: ${errors.map((e) => e.message).join(", ")}`,
    };
  }

  /**
   * 创建验证错误对象
   * @param data 错误数据
   * @returns 验证错误对象
   */
  private createValidationError(data: ValidationErrorData): ValidationError {
    return {
      message: data.message,
      code: data.code,
      fieldName: data.fieldName,
      ruleName: data.ruleName,
      level: data.level,
      details: data.details,
      timestamp: data.timestamp ?? Date.now(),
      path: data.path,
      value: data.value,
      position: data.position,
      isError: () => data.level === ValidationErrorLevel.ERROR,
      isWarning: () => data.level === ValidationErrorLevel.WARNING,
      isInfo: () => data.level === ValidationErrorLevel.INFO,
      getFullPath: () => {
        const path = data.path ? [...data.path] : [];
        if (data.fieldName) {
          path.push(data.fieldName);
        }
        return path.join(".");
      },
      getFormattedMessage: () => {
        const path = this.createValidationError(data).getFullPath();
        return path ? `${path}: ${data.message}` : data.message;
      },
      toJSON: () => ({
        message: data.message,
        code: data.code,
        fieldName: data.fieldName,
        ruleName: data.ruleName,
        level: data.level,
        details: data.details,
        timestamp: data.timestamp ?? Date.now(),
        path: data.path,
        value: data.value,
        position: data.position,
      }),
      toString: () => data.message,
      clone: (overrides) =>
        this.createValidationError({ ...data, ...overrides }),
    };
  }

  /**
   * 检查验证级别是否匹配
   * @param context 验证上下文
   * @param requiredLevel 需要的验证级别
   * @returns 是否匹配
   */
  protected isValidationLevelMatched(
    context?: ValidationContext,
    requiredLevel: ValidationLevel = ValidationLevel.STANDARD,
  ): boolean {
    if (!context?.level) {
      return true; // 默认匹配
    }

    const levelOrder = {
      [ValidationLevel.BASIC]: 1,
      [ValidationLevel.STANDARD]: 2,
      [ValidationLevel.STRICT]: 3,
      [ValidationLevel.COMPLETE]: 4,
    };

    return levelOrder[context.level] >= levelOrder[requiredLevel];
  }

  /**
   * 获取字段名称
   * @param context 验证上下文
   * @returns 字段名称
   */
  protected getFieldName(context?: ValidationContext): string | undefined {
    return context?.fieldName;
  }

  /**
   * 获取验证选项
   * @param context 验证上下文
   * @returns 验证选项
   */
  protected getValidationOptions(
    context?: ValidationContext,
  ): ValidationOptions {
    return context?.options ?? {};
  }
}
