/**
 * @fileoverview 值对象验证器接口
 * @description 定义值对象验证器的基本契约和功能
 */

import type {
  ValidationRule,
  ValidationContext,
} from "./rules/validation-rule.interface.js";
import type { ValidationResult } from "./rules/validation-result.interface.js";
// import type { ValidationError } from "./rules/validation-error.interface.js";

/**
 * 值对象验证器接口
 * @description 定义值对象验证的基本契约，所有值对象验证器都必须实现此接口
 */
export interface ValueObjectValidator<T = unknown> {
  /**
   * 验证器名称
   * @description 用于标识和调试的唯一名称
   */
  readonly name: string;

  /**
   * 验证器描述
   * @description 验证器的详细描述，用于文档和错误消息
   */
  readonly description: string;

  /**
   * 验证规则列表
   * @description 验证器包含的所有验证规则
   */
  readonly rules: readonly ValidationRule<T>[];

  /**
   * 验证器是否启用
   * @description 用于动态启用/禁用验证器
   */
  readonly enabled: boolean;

  /**
   * 执行验证
   * @description 对给定值对象执行所有验证规则
   * @param value 要验证的值对象
   * @param context 验证上下文，包含额外的验证信息
   * @returns 验证结果
   */
  validate(value: T, context?: ValidationContext): ValidationResult;

  /**
   * 添加验证规则
   * @description 向验证器添加新的验证规则
   * @param rule 要添加的验证规则
   * @returns 验证器实例（支持链式调用）
   */
  addRule(rule: ValidationRule<T>): ValueObjectValidator<T>;

  /**
   * 移除验证规则
   * @description 从验证器中移除指定的验证规则
   * @param ruleName 要移除的规则名称
   * @returns 验证器实例（支持链式调用）
   */
  removeRule(ruleName: string): ValueObjectValidator<T>;

  /**
   * 获取验证规则
   * @description 根据名称获取验证规则
   * @param ruleName 规则名称
   * @returns 验证规则实例，如果不存在则返回undefined
   */
  getRule(ruleName: string): ValidationRule<T> | undefined;

  /**
   * 检查是否有指定规则
   * @description 检查验证器是否包含指定的验证规则
   * @param ruleName 规则名称
   * @returns 是否包含该规则
   */
  hasRule(ruleName: string): boolean;

  /**
   * 启用验证器
   * @description 启用验证器，使其能够执行验证
   * @returns 验证器实例（支持链式调用）
   */
  enable(): ValueObjectValidator<T>;

  /**
   * 禁用验证器
   * @description 禁用验证器，使其不能执行验证
   * @returns 验证器实例（支持链式调用）
   */
  disable(): ValueObjectValidator<T>;

  /**
   * 清空所有规则
   * @description 移除验证器中的所有验证规则
   * @returns 验证器实例（支持链式调用）
   */
  clearRules(): ValueObjectValidator<T>;

  /**
   * 获取规则数量
   * @returns 验证器中的规则数量
   */
  getRuleCount(): number;

  /**
   * 获取启用的规则数量
   * @returns 验证器中启用的规则数量
   */
  getEnabledRuleCount(): number;

  /**
   * 克隆验证器
   * @description 创建验证器的深拷贝
   * @returns 克隆的验证器实例
   */
  clone(): ValueObjectValidator<T>;

  /**
   * 合并验证器
   * @description 将另一个验证器的规则合并到当前验证器
   * @param other 要合并的验证器
   * @returns 验证器实例（支持链式调用）
   */
  merge(other: ValueObjectValidator<T>): ValueObjectValidator<T>;
}

/**
 * 值对象验证器工厂接口
 * @description 用于创建值对象验证器的工厂接口
 */
export interface ValueObjectValidatorFactory<T = unknown> {
  /**
   * 创建验证器
   * @param name 验证器名称
   * @param description 验证器描述
   * @param rules 验证规则列表
   * @returns 验证器实例
   */
  createValidator(
    name: string,
    description?: string,
    rules?: ValidationRule<T>[],
  ): ValueObjectValidator<T>;

  /**
   * 创建空验证器
   * @param name 验证器名称
   * @param description 验证器描述
   * @returns 空验证器实例
   */
  createEmptyValidator(
    name: string,
    description?: string,
  ): ValueObjectValidator<T>;

  /**
   * 从配置创建验证器
   * @param config 验证器配置
   * @returns 验证器实例
   */
  createValidatorFromConfig(
    config: ValueObjectValidatorConfig<T>,
  ): ValueObjectValidator<T>;

  /**
   * 注册验证器类型
   * @param type 验证器类型
   * @param creator 验证器创建函数
   */
  registerValidatorType(type: string, creator: ValidatorCreator<T>): void;

  /**
   * 获取支持的验证器类型
   * @returns 支持的验证器类型列表
   */
  getSupportedValidatorTypes(): string[];
}

/**
 * 值对象验证器配置接口
 * @description 定义创建值对象验证器所需的配置
 */
export interface ValueObjectValidatorConfig<_T = unknown> {
  /**
   * 验证器类型
   * @description 验证器的类型标识符
   */
  type?: string;

  /**
   * 验证器名称
   * @description 验证器的唯一名称
   */
  name: string;

  /**
   * 验证器描述
   * @description 验证器的描述信息
   */
  description?: string;

  /**
   * 验证器是否启用
   * @description 验证器是否默认启用
   */
  enabled?: boolean;

  /**
   * 验证规则配置
   * @description 验证规则的配置列表
   */
  rules?: Array<{
    type: string;
    name: string;
    description?: string;
    priority?: number;
    enabled?: boolean;
    parameters?: Record<string, unknown>;
    options?: Record<string, unknown>;
  }>;

  /**
   * 验证器选项
   * @description 验证器的特定选项
   */
  options?: Record<string, unknown>;
}

/**
 * 验证器创建函数类型
 * @description 用于创建值对象验证器的函数类型
 */
export type ValidatorCreator<T = unknown> = (
  config: ValueObjectValidatorConfig<T>,
) => ValueObjectValidator<T>;

/**
 * 值对象验证器构建器接口
 * @description 用于构建值对象验证器的构建器接口
 */
export interface ValueObjectValidatorBuilder<T = unknown> {
  /**
   * 设置名称
   * @param name 验证器名称
   * @returns 构建器实例
   */
  setName(name: string): ValueObjectValidatorBuilder<T>;

  /**
   * 设置描述
   * @param description 验证器描述
   * @returns 构建器实例
   */
  setDescription(description: string): ValueObjectValidatorBuilder<T>;

  /**
   * 设置启用状态
   * @param enabled 是否启用
   * @returns 构建器实例
   */
  setEnabled(enabled: boolean): ValueObjectValidatorBuilder<T>;

  /**
   * 添加规则
   * @param rule 验证规则
   * @returns 构建器实例
   */
  addRule(rule: ValidationRule<T>): ValueObjectValidatorBuilder<T>;

  /**
   * 添加多个规则
   * @param rules 验证规则列表
   * @returns 构建器实例
   */
  addRules(rules: ValidationRule<T>[]): ValueObjectValidatorBuilder<T>;

  /**
   * 构建验证器
   * @returns 验证器实例
   */
  build(): ValueObjectValidator<T>;

  /**
   * 重置构建器
   * @returns 构建器实例
   */
  reset(): ValueObjectValidatorBuilder<T>;
}
