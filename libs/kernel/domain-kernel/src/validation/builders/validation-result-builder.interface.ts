/**
 * @fileoverview 验证结果构建器接口
 * @description 定义验证结果构建器的基本契约和功能
 */

import type {
  ValidationResult,
  ValidationResultContext,
} from "../rules/validation-result.interface.js";
import type { ValidationError } from "../rules/validation-error.interface.js";

/**
 * 验证结果构建器接口
 * @description 定义构建验证结果的构建器契约
 */
export interface ValidationResultBuilder {
  /**
   * 添加错误
   * @param error 验证错误
   * @returns 构建器实例
   */
  addError(error: ValidationError): ValidationResultBuilder;

  /**
   * 添加多个错误
   * @param errors 验证错误列表
   * @returns 构建器实例
   */
  addErrors(errors: ValidationError[]): ValidationResultBuilder;

  /**
   * 添加警告
   * @param warning 验证警告
   * @returns 构建器实例
   */
  addWarning(warning: ValidationError): ValidationResultBuilder;

  /**
   * 添加多个警告
   * @param warnings 验证警告列表
   * @returns 构建器实例
   */
  addWarnings(warnings: ValidationError[]): ValidationResultBuilder;

  /**
   * 添加信息
   * @param info 验证信息
   * @returns 构建器实例
   */
  addInfo(info: ValidationError): ValidationResultBuilder;

  /**
   * 添加多个信息
   * @param info 验证信息列表
   * @returns 构建器实例
   */
  addInfos(info: ValidationError[]): ValidationResultBuilder;

  /**
   * 设置执行时间
   * @param executionTime 执行时间（毫秒）
   * @returns 构建器实例
   */
  setExecutionTime(executionTime: number): ValidationResultBuilder;

  /**
   * 设置规则执行数量
   * @param rulesExecuted 规则执行数量
   * @returns 构建器实例
   */
  setRulesExecuted(rulesExecuted: number): ValidationResultBuilder;

  /**
   * 设置字段验证数量
   * @param fieldsValidated 字段验证数量
   * @returns 构建器实例
   */
  setFieldsValidated(fieldsValidated: number): ValidationResultBuilder;

  /**
   * 设置上下文
   * @param context 验证结果上下文
   * @returns 构建器实例
   */
  setContext(context: ValidationResultContext): ValidationResultBuilder;

  /**
   * 设置验证状态
   * @param isValid 是否有效
   * @returns 构建器实例
   */
  setIsValid(isValid: boolean): ValidationResultBuilder;

  /**
   * 清空所有错误
   * @returns 构建器实例
   */
  clearErrors(): ValidationResultBuilder;

  /**
   * 清空所有警告
   * @returns 构建器实例
   */
  clearWarnings(): ValidationResultBuilder;

  /**
   * 清空所有信息
   * @returns 构建器实例
   */
  clearInfo(): ValidationResultBuilder;

  /**
   * 清空所有内容
   * @returns 构建器实例
   */
  clearAll(): ValidationResultBuilder;

  /**
   * 获取当前错误数量
   * @returns 错误数量
   */
  getErrorCount(): number;

  /**
   * 获取当前警告数量
   * @returns 警告数量
   */
  getWarningCount(): number;

  /**
   * 获取当前信息数量
   * @returns 信息数量
   */
  getInfoCount(): number;

  /**
   * 检查是否有错误
   * @returns 是否有错误
   */
  hasErrors(): boolean;

  /**
   * 检查是否有警告
   * @returns 是否有警告
   */
  hasWarnings(): boolean;

  /**
   * 检查是否有信息
   * @returns 是否有信息
   */
  hasInfo(): boolean;

  /**
   * 构建验证结果
   * @returns 验证结果实例
   */
  build(): ValidationResult;

  /**
   * 重置构建器
   * @returns 构建器实例
   */
  reset(): ValidationResultBuilder;
}

/**
 * 验证结果构建器配置接口
 * @description 定义验证结果构建器的配置选项
 */
export interface ValidationResultBuilderConfig {
  /**
   * 是否自动计算验证状态
   * @description 当为true时，会根据错误数量自动计算isValid状态
   */
  autoCalculateIsValid?: boolean;

  /**
   * 是否自动计算执行时间
   * @description 当为true时，会自动计算从构建开始到build()调用的时间
   */
  autoCalculateExecutionTime?: boolean;

  /**
   * 是否启用验证
   * @description 当为true时，会在构建时进行数据验证
   */
  enableValidation?: boolean;

  /**
   * 最大错误数量
   * @description 允许的最大错误数量，超过时会抛出异常
   */
  maxErrors?: number;

  /**
   * 最大警告数量
   * @description 允许的最大警告数量，超过时会抛出异常
   */
  maxWarnings?: number;

  /**
   * 最大信息数量
   * @description 允许的最大信息数量，超过时会抛出异常
   */
  maxInfo?: number;
}

/**
 * 验证结果构建器工厂接口
 * @description 用于创建验证结果构建器的工厂接口
 */
export interface ValidationResultBuilderFactory {
  /**
   * 创建构建器
   * @param config 构建器配置
   * @returns 构建器实例
   */
  createBuilder(
    config?: ValidationResultBuilderConfig,
  ): ValidationResultBuilder;

  /**
   * 创建默认构建器
   * @returns 默认配置的构建器实例
   */
  createDefaultBuilder(): ValidationResultBuilder;

  /**
   * 创建严格模式构建器
   * @returns 严格模式的构建器实例
   */
  createStrictBuilder(): ValidationResultBuilder;
}
