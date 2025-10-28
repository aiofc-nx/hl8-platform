/**
 * @fileoverview 验证结果实现
 * @description 提供验证结果的具体实现和功能
 */

import type {
  ValidationResult as IValidationResult,
  ValidationResultContext,
  // ValidationResultOptions,
  ValidationResultJSON,
} from "./validation-result.interface.js";
import type {
  ValidationError,
  ValidationErrorJSON,
} from "./validation-error.interface.js";
import { ValidationErrorLevel } from "./validation-result.interface.js";
import { ValidationResultException } from "../../exceptions/validation-exceptions.js";

/**
 * 验证结果实现类
 * @description 提供验证结果的完整实现
 */
export class ValidationResult implements IValidationResult {
  /**
   * 验证是否通过
   */
  public readonly isValid: boolean;

  /**
   * 验证错误列表
   */
  public readonly errors: readonly ValidationError[];

  /**
   * 验证警告列表
   */
  public readonly warnings: readonly ValidationError[];

  /**
   * 验证信息列表
   */
  public readonly info: readonly ValidationError[];

  /**
   * 验证执行时间（毫秒）
   */
  public readonly executionTime: number;

  /**
   * 验证的规则数量
   */
  public readonly rulesExecuted: number;

  /**
   * 验证的字段数量
   */
  public readonly fieldsValidated: number;

  /**
   * 验证上下文
   */
  public readonly context?: ValidationResultContext;

  /**
   * 创建验证结果
   * @param params 验证结果参数
   */
  constructor(params: {
    isValid: boolean;
    errors?: ValidationError[];
    warnings?: ValidationError[];
    info?: ValidationError[];
    executionTime?: number;
    rulesExecuted?: number;
    fieldsValidated?: number;
    context?: ValidationResultContext;
  }) {
    this.isValid = params.isValid;
    this.errors = Object.freeze(params.errors ?? []);
    this.warnings = Object.freeze(params.warnings ?? []);
    this.info = Object.freeze(params.info ?? []);
    this.executionTime = params.executionTime ?? 0;
    this.rulesExecuted = params.rulesExecuted ?? 0;
    this.fieldsValidated = params.fieldsValidated ?? 0;
    this.context = params.context;
  }

  /**
   * 检查是否有错误
   * @returns 是否存在验证错误
   */
  public hasErrors(): boolean {
    return this.errors.length > 0;
  }

  /**
   * 检查是否有警告
   * @returns 是否存在验证警告
   */
  public hasWarnings(): boolean {
    return this.warnings.length > 0;
  }

  /**
   * 检查是否有信息
   * @returns 是否存在验证信息
   */
  public hasInfo(): boolean {
    return this.info.length > 0;
  }

  /**
   * 获取所有消息
   * @returns 所有消息的数组
   */
  public getAllMessages(): string[] {
    return [...this.errors, ...this.warnings, ...this.info].map(
      (item) => item.message,
    );
  }

  /**
   * 获取指定级别的消息
   * @param level 消息级别
   * @returns 指定级别的消息数组
   */
  public getMessagesByLevel(level: ValidationErrorLevel): string[] {
    const allItems = [...this.errors, ...this.warnings, ...this.info];
    return allItems
      .filter((item) => item.level === level)
      .map((item) => item.message);
  }

  /**
   * 获取指定字段的错误
   * @param fieldName 字段名称
   * @returns 指定字段的错误数组
   */
  public getErrorsForField(fieldName: string): ValidationError[] {
    return this.errors.filter((error) => error.fieldName === fieldName);
  }

  /**
   * 获取指定规则类型的错误
   * @param ruleName 规则名称
   * @returns 指定规则类型的错误数组
   */
  public getErrorsForRule(ruleName: string): ValidationError[] {
    return this.errors.filter((error) => error.ruleName === ruleName);
  }

  /**
   * 合并验证结果
   * @param other 要合并的验证结果
   * @returns 合并后的验证结果
   */
  public merge(other: IValidationResult): ValidationResult {
    const mergedErrors = [...this.errors, ...other.errors];
    const mergedWarnings = [...this.warnings, ...other.warnings];
    const mergedInfo = [...this.info, ...other.info];

    const isValid = this.isValid && other.isValid;
    const executionTime = Math.max(this.executionTime, other.executionTime);
    const rulesExecuted = this.rulesExecuted + other.rulesExecuted;
    const fieldsValidated = Math.max(
      this.fieldsValidated,
      other.fieldsValidated,
    );

    return new ValidationResult({
      isValid,
      errors: mergedErrors,
      warnings: mergedWarnings,
      info: mergedInfo,
      executionTime,
      rulesExecuted,
      fieldsValidated,
      context: this.context,
    });
  }

  /**
   * 转换为JSON格式
   * @returns JSON格式的验证结果
   */
  public toJSON(): ValidationResultJSON {
    return {
      isValid: this.isValid,
      errorCount: this.errors.length,
      warningCount: this.warnings.length,
      infoCount: this.info.length,
      executionTime: this.executionTime,
      rulesExecuted: this.rulesExecuted,
      fieldsValidated: this.fieldsValidated,
      errors: this.errors.map((error) => error.toJSON()),
      warnings: this.warnings.map((warning) => warning.toJSON()),
      info: this.info.map((info) => info.toJSON()),
    };
  }

  /**
   * 转换为字符串格式
   * @returns 字符串格式的验证结果
   */
  public toString(): string {
    if (this.isValid) {
      return "Validation passed";
    }

    const errorMessages = this.errors.map((error) => error.message);
    const warningMessages = this.warnings.map((warning) => warning.message);
    const infoMessages = this.info.map((info) => info.message);

    const messages = [...errorMessages, ...warningMessages, ...infoMessages];
    return `Validation failed: ${messages.join(", ")}`;
  }

  /**
   * 创建成功的验证结果
   * @param options 创建选项
   * @returns 成功的验证结果
   */
  public static success(options?: {
    executionTime?: number;
    rulesExecuted?: number;
    fieldsValidated?: number;
    context?: ValidationResultContext;
  }): ValidationResult {
    return new ValidationResult({
      isValid: true,
      errors: [],
      warnings: [],
      info: [],
      executionTime: options?.executionTime ?? 0,
      rulesExecuted: options?.rulesExecuted ?? 0,
      fieldsValidated: options?.fieldsValidated ?? 0,
      context: options?.context,
    });
  }

  /**
   * 创建失败的验证结果
   * @param errors 错误列表
   * @param options 创建选项
   * @returns 失败的验证结果
   */
  public static failure(
    errors: ValidationError[],
    options?: {
      warnings?: ValidationError[];
      info?: ValidationError[];
      executionTime?: number;
      rulesExecuted?: number;
      fieldsValidated?: number;
      context?: ValidationResultContext;
    },
  ): ValidationResult {
    return new ValidationResult({
      isValid: false,
      errors: errors ?? [],
      warnings: options?.warnings ?? [],
      info: options?.info ?? [],
      executionTime: options?.executionTime ?? 0,
      rulesExecuted: options?.rulesExecuted ?? 0,
      fieldsValidated: options?.fieldsValidated ?? 0,
      context: options?.context,
    });
  }

  /**
   * 从JSON创建验证结果
   * @param json JSON数据
   * @returns 验证结果实例
   */
  public static fromJSON(json: ValidationResultJSON): ValidationResult {
    try {
      return new ValidationResult({
        isValid: json.isValid,
        errors: json.errors.map((errorJson) =>
          this.createValidationErrorFromJSON({
            ...errorJson,
            timestamp:
              (errorJson as Partial<ValidationErrorJSON>).timestamp ??
              Date.now(),
          }),
        ),
        warnings: json.warnings.map((warningJson) =>
          this.createValidationErrorFromJSON({
            ...warningJson,
            timestamp:
              (warningJson as Partial<ValidationErrorJSON>).timestamp ??
              Date.now(),
          }),
        ),
        info: json.info.map((infoJson) =>
          this.createValidationErrorFromJSON({
            ...infoJson,
            timestamp:
              (infoJson as Partial<ValidationErrorJSON>).timestamp ??
              Date.now(),
          }),
        ),
        executionTime: json.executionTime,
        rulesExecuted: json.rulesExecuted,
        fieldsValidated: json.fieldsValidated,
      });
    } catch (error) {
      throw new ValidationResultException(
        `Failed to create ValidationResult from JSON: ${error instanceof Error ? error.message : String(error)}`,
        { originalError: error, json },
      );
    }
  }

  /**
   * 从JSON创建验证错误
   * @param json JSON数据
   * @returns 验证错误实例
   */
  private static createValidationErrorFromJSON(
    json: ValidationErrorJSON,
  ): ValidationError {
    return {
      message: json.message,
      code: json.code,
      fieldName: json.fieldName,
      ruleName: json.ruleName,
      level: json.level as ValidationErrorLevel,
      details: json.details,
      timestamp: json.timestamp ?? Date.now(),
      path: json.path,
      value: json.value,
      position: json.position,
      isError: () => json.level === ValidationErrorLevel.ERROR,
      isWarning: () => json.level === ValidationErrorLevel.WARNING,
      isInfo: () => json.level === ValidationErrorLevel.INFO,
      getFullPath: () => {
        const path = json.path ? [...json.path] : [];
        if (json.fieldName) {
          path.push(json.fieldName);
        }
        return path.join(".");
      },
      getFormattedMessage: () => {
        const path = this.createValidationErrorFromJSON(json).getFullPath();
        return path ? `${path}: ${json.message}` : json.message;
      },
      toJSON: () => json,
      toString: () => json.message,
      clone: (overrides) =>
        this.createValidationErrorFromJSON({
          ...json,
          timestamp: json.timestamp,
          ...overrides,
        }),
    };
  }

  /**
   * 创建验证结果构建器
   * @returns 验证结果构建器实例
   */
  public static builder(): ValidationResultBuilder {
    return new ValidationResultBuilder();
  }
}

/**
 * 验证结果构建器
 * @description 用于构建验证结果的构建器类
 */
export class ValidationResultBuilder {
  private errors: ValidationError[] = [];
  private warnings: ValidationError[] = [];
  private info: ValidationError[] = [];
  private executionTime: number = 0;
  private rulesExecuted: number = 0;
  private fieldsValidated: number = 0;
  private context?: ValidationResultContext;

  /**
   * 添加错误
   * @param error 验证错误
   * @returns 构建器实例
   */
  public addError(error: ValidationError): ValidationResultBuilder {
    this.errors.push(error);
    return this;
  }

  /**
   * 添加警告
   * @param warning 验证警告
   * @returns 构建器实例
   */
  public addWarning(warning: ValidationError): ValidationResultBuilder {
    this.warnings.push(warning);
    return this;
  }

  /**
   * 添加信息
   * @param info 验证信息
   * @returns 构建器实例
   */
  public addInfo(info: ValidationError): ValidationResultBuilder {
    this.info.push(info);
    return this;
  }

  /**
   * 设置执行时间
   * @param executionTime 执行时间（毫秒）
   * @returns 构建器实例
   */
  public setExecutionTime(executionTime: number): ValidationResultBuilder {
    this.executionTime = executionTime;
    return this;
  }

  /**
   * 设置规则执行数量
   * @param rulesExecuted 规则执行数量
   * @returns 构建器实例
   */
  public setRulesExecuted(rulesExecuted: number): ValidationResultBuilder {
    this.rulesExecuted = rulesExecuted;
    return this;
  }

  /**
   * 设置字段验证数量
   * @param fieldsValidated 字段验证数量
   * @returns 构建器实例
   */
  public setFieldsValidated(fieldsValidated: number): ValidationResultBuilder {
    this.fieldsValidated = fieldsValidated;
    return this;
  }

  /**
   * 设置上下文
   * @param context 验证结果上下文
   * @returns 构建器实例
   */
  public setContext(context: ValidationResultContext): ValidationResultBuilder {
    this.context = context;
    return this;
  }

  /**
   * 构建验证结果
   * @returns 验证结果实例
   */
  public build(): ValidationResult {
    const isValid = this.errors.length === 0;

    return new ValidationResult({
      isValid,
      errors: this.errors,
      warnings: this.warnings,
      info: this.info,
      executionTime: this.executionTime,
      rulesExecuted: this.rulesExecuted,
      fieldsValidated: this.fieldsValidated,
      context: this.context,
    });
  }

  /**
   * 重置构建器
   * @returns 构建器实例
   */
  public reset(): ValidationResultBuilder {
    this.errors = [];
    this.warnings = [];
    this.info = [];
    this.executionTime = 0;
    this.rulesExecuted = 0;
    this.fieldsValidated = 0;
    this.context = undefined;
    return this;
  }
}
