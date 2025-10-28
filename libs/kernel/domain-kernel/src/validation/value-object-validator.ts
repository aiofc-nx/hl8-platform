/**
 * @fileoverview 值对象验证器实现
 * @description 提供值对象验证的具体实现和功能
 */

import type {
  ValueObjectValidator as IValueObjectValidator,
  ValueObjectValidatorConfig,
  ValueObjectValidatorBuilder,
} from "./value-object-validator.interface.js";
import type {
  ValidationRule,
  ValidationContext,
} from "./rules/validation-rule.interface.js";
import type { ValidationResult } from "./rules/validation-result.interface.js";
import type { ValidationError } from "./rules/validation-error.interface.js";
import { ValidationErrorLevel } from "./rules/validation-result.interface.js";
import { ValidationResult as ValidationResultImpl } from "./rules/validation-result.js";
import { ValueObjectValidationException } from "../exceptions/validation-exceptions.js";

/**
 * 值对象验证器实现类
 * @description 提供值对象验证的完整实现
 */
export class ValueObjectValidator<T = unknown>
  implements IValueObjectValidator<T>
{
  /**
   * 验证器名称
   */
  public readonly name: string;

  /**
   * 验证器描述
   */
  public readonly description: string;

  /**
   * 验证规则列表
   */
  public readonly rules: readonly ValidationRule<T>[];

  /**
   * 验证器是否启用
   */
  public readonly enabled: boolean;

  /**
   * 创建值对象验证器
   * @param name 验证器名称
   * @param description 验证器描述
   * @param rules 验证规则列表
   * @param enabled 验证器是否启用
   */
  constructor(
    name: string,
    description: string = "",
    rules: ValidationRule<T>[] = [],
    enabled: boolean = true,
  ) {
    this.name = name;
    this.description = description;
    this.rules = Object.freeze([...rules]);
    this.enabled = enabled;
  }

  /**
   * 执行验证
   * @param value 要验证的值对象
   * @param context 验证上下文
   * @returns 验证结果
   */
  public validate(value: T, context?: ValidationContext): ValidationResult {
    const startTime = Date.now();

    try {
      // 检查验证器是否启用
      if (!this.enabled) {
        return ValidationResultImpl.success({
          executionTime: Date.now() - startTime,
          rulesExecuted: 0,
          fieldsValidated: 1,
        });
      }

      // 如果没有规则，返回成功结果
      if (this.rules.length === 0) {
        return ValidationResultImpl.success({
          executionTime: Date.now() - startTime,
          rulesExecuted: 0,
          fieldsValidated: 1,
        });
      }

      // 按优先级排序规则
      const sortedRules = [...this.rules].sort(
        (a, b) => a.priority - b.priority,
      );

      // 执行所有规则
      const results: ValidationResult[] = [];
      let allErrors: ValidationError[] = [];
      let allWarnings: ValidationError[] = [];
      let allInfo: ValidationError[] = [];

      for (const rule of sortedRules) {
        try {
          const result = rule.validate(value, context);
          results.push(result);

          // 收集错误、警告和信息
          allErrors = [...allErrors, ...result.errors];
          allWarnings = [...allWarnings, ...result.warnings];
          allInfo = [...allInfo, ...result.info];

          // 如果配置了在第一个错误时停止，且当前结果有错误，则停止验证
          if (context?.options?.stopOnFirstError && result.hasErrors()) {
            break;
          }
        } catch (error) {
          // 规则执行失败，创建错误
          const errorResult = ValidationResultImpl.failure([
            {
              message: `Rule '${rule.name}' execution failed: ${error instanceof Error ? error.message : String(error)}`,
              code: "RULE_EXECUTION_ERROR",
              level: ValidationErrorLevel.ERROR,
              ruleName: rule.name,
              timestamp: Date.now(),
              isError: () => true,
              isWarning: () => false,
              isInfo: () => false,
              getFullPath: () => rule.name,
              getFormattedMessage: () =>
                `Rule '${rule.name}' execution failed: ${error instanceof Error ? error.message : String(error)}`,
              toJSON: () => ({
                message: `Rule '${rule.name}' execution failed: ${error instanceof Error ? error.message : String(error)}`,
                code: "RULE_EXECUTION_ERROR",
                level: "error",
                ruleName: rule.name,
                timestamp: Date.now(),
              }),
              toString: () =>
                `Rule '${rule.name}' execution failed: ${error instanceof Error ? error.message : String(error)}`,
              clone: () =>
                this.createError(
                  `Rule '${rule.name}' execution failed: ${error instanceof Error ? error.message : String(error)}`,
                  "RULE_EXECUTION_ERROR",
                ),
            },
          ]);
          results.push(errorResult);
          allErrors = [...allErrors, ...errorResult.errors];

          // 如果配置了在第一个错误时停止，则停止验证
          if (context?.options?.stopOnFirstError) {
            break;
          }
        }
      }

      // 合并所有结果
      const isValid = allErrors.length === 0;
      const executionTime = Date.now() - startTime;

      if (isValid) {
        return ValidationResultImpl.success({
          executionTime,
          rulesExecuted: sortedRules.length,
          fieldsValidated: 1,
        });
      } else {
        return ValidationResultImpl.failure(allErrors, {
          warnings: allWarnings,
          info: allInfo,
          executionTime,
          rulesExecuted: sortedRules.length,
          fieldsValidated: 1,
        });
      }
    } catch (error) {
      throw new ValueObjectValidationException(
        this.name,
        `Validator execution failed: ${error instanceof Error ? error.message : String(error)}`,
        { originalError: error },
      );
    }
  }

  /**
   * 添加验证规则
   * @param rule 要添加的验证规则
   * @returns 验证器实例（支持链式调用）
   */
  public addRule(rule: ValidationRule<T>): ValueObjectValidator<T> {
    const newRules = [...this.rules, rule];
    return new ValueObjectValidator(
      this.name,
      this.description,
      newRules,
      this.enabled,
    );
  }

  /**
   * 移除验证规则
   * @param ruleName 要移除的规则名称
   * @returns 验证器实例（支持链式调用）
   */
  public removeRule(ruleName: string): ValueObjectValidator<T> {
    const newRules = this.rules.filter((rule) => rule.name !== ruleName);
    return new ValueObjectValidator(
      this.name,
      this.description,
      newRules,
      this.enabled,
    );
  }

  /**
   * 获取验证规则
   * @param ruleName 规则名称
   * @returns 验证规则实例，如果不存在则返回undefined
   */
  public getRule(ruleName: string): ValidationRule<T> | undefined {
    return this.rules.find((rule) => rule.name === ruleName);
  }

  /**
   * 检查是否有指定规则
   * @param ruleName 规则名称
   * @returns 是否包含该规则
   */
  public hasRule(ruleName: string): boolean {
    return this.rules.some((rule) => rule.name === ruleName);
  }

  /**
   * 启用验证器
   * @returns 验证器实例（支持链式调用）
   */
  public enable(): ValueObjectValidator<T> {
    return new ValueObjectValidator(
      this.name,
      this.description,
      [...this.rules],
      true,
    );
  }

  /**
   * 禁用验证器
   * @returns 验证器实例（支持链式调用）
   */
  public disable(): ValueObjectValidator<T> {
    return new ValueObjectValidator(
      this.name,
      this.description,
      [...this.rules],
      false,
    );
  }

  /**
   * 清空所有规则
   * @returns 验证器实例（支持链式调用）
   */
  public clearRules(): ValueObjectValidator<T> {
    return new ValueObjectValidator(
      this.name,
      this.description,
      [],
      this.enabled,
    );
  }

  /**
   * 获取规则数量
   * @returns 验证器中的规则数量
   */
  public getRuleCount(): number {
    return this.rules.length;
  }

  /**
   * 获取启用的规则数量
   * @returns 验证器中启用的规则数量
   */
  public getEnabledRuleCount(): number {
    return this.rules.filter((rule) => rule.enabled).length;
  }

  /**
   * 克隆验证器
   * @returns 克隆的验证器实例
   */
  public clone(): ValueObjectValidator<T> {
    return new ValueObjectValidator(
      this.name,
      this.description,
      [...this.rules],
      this.enabled,
    );
  }

  /**
   * 合并验证器
   * @param other 要合并的验证器
   * @returns 验证器实例（支持链式调用）
   */
  public merge(other: ValueObjectValidator<T>): ValueObjectValidator<T> {
    const mergedRules = [...this.rules, ...other.rules];
    return new ValueObjectValidator(
      this.name,
      this.description,
      mergedRules,
      this.enabled,
    );
  }

  /**
   * 创建错误对象
   * @param message 错误消息
   * @param code 错误代码
   * @returns 错误对象
   */
  private createError(message: string, code: string): ValidationError {
    return {
      message,
      code,
      level: ValidationErrorLevel.ERROR,
      timestamp: Date.now(),
      isError: () => true,
      isWarning: () => false,
      isInfo: () => false,
      getFullPath: () => this.name,
      getFormattedMessage: () => message,
      toJSON: () => ({
        message,
        code,
        level: ValidationErrorLevel.ERROR,
        timestamp: Date.now(),
      }),
      toString: () => message,
      clone: () => this.createError(message, code),
    };
  }

  /**
   * 创建值对象验证器
   * @param name 验证器名称
   * @param description 验证器描述
   * @param rules 验证规则列表
   * @returns 验证器实例
   */
  public static create<T = unknown>(
    name: string,
    description?: string,
    rules?: ValidationRule<T>[],
  ): ValueObjectValidator<T> {
    return new ValueObjectValidator(name, description ?? "", rules ?? []);
  }

  /**
   * 创建空验证器
   * @param name 验证器名称
   * @param description 验证器描述
   * @returns 空验证器实例
   */
  public static createEmpty<T = unknown>(
    name: string,
    description?: string,
  ): ValueObjectValidator<T> {
    return new ValueObjectValidator(name, description ?? "", []);
  }

  /**
   * 从配置创建验证器
   * @param config 验证器配置
   * @returns 验证器实例
   */
  public static fromConfig<T = unknown>(
    config: ValueObjectValidatorConfig<T>,
  ): ValueObjectValidator<T> {
    return new ValueObjectValidator(
      config.name,
      config.description ?? "",
      [], // 规则需要单独创建
      config.enabled ?? true,
    );
  }

  /**
   * 创建验证器构建器
   * @returns 验证器构建器实例
   */
  public static builder<T = unknown>(): ValueObjectValidatorBuilder<T> {
    return new ValueObjectValidatorBuilderImpl<T>();
  }
}

/**
 * 值对象验证器构建器
 * @description 用于构建值对象验证器的构建器类
 */
export class ValueObjectValidatorBuilderImpl<T = unknown>
  implements ValueObjectValidatorBuilder<T>
{
  private name: string = "";
  private description: string = "";
  private enabled: boolean = true;
  private rules: ValidationRule<T>[] = [];

  /**
   * 设置名称
   * @param name 验证器名称
   * @returns 构建器实例
   */
  public setName(name: string): ValueObjectValidatorBuilder<T> {
    this.name = name;
    return this;
  }

  /**
   * 设置描述
   * @param description 验证器描述
   * @returns 构建器实例
   */
  public setDescription(description: string): ValueObjectValidatorBuilder<T> {
    this.description = description;
    return this;
  }

  /**
   * 设置启用状态
   * @param enabled 是否启用
   * @returns 构建器实例
   */
  public setEnabled(enabled: boolean): ValueObjectValidatorBuilder<T> {
    this.enabled = enabled;
    return this;
  }

  /**
   * 添加规则
   * @param rule 验证规则
   * @returns 构建器实例
   */
  public addRule(rule: ValidationRule<T>): ValueObjectValidatorBuilder<T> {
    this.rules.push(rule);
    return this;
  }

  /**
   * 添加多个规则
   * @param rules 验证规则列表
   * @returns 构建器实例
   */
  public addRules(rules: ValidationRule<T>[]): ValueObjectValidatorBuilder<T> {
    this.rules.push(...rules);
    return this;
  }

  /**
   * 构建验证器
   * @returns 验证器实例
   */
  public build(): ValueObjectValidator<T> {
    if (!this.name) {
      throw new Error("Validator name is required");
    }

    return new ValueObjectValidator(
      this.name,
      this.description,
      this.rules,
      this.enabled,
    );
  }

  /**
   * 重置构建器
   * @returns 构建器实例
   */
  public reset(): ValueObjectValidatorBuilder<T> {
    this.name = "";
    this.description = "";
    this.enabled = true;
    this.rules = [];
    return this;
  }
}
