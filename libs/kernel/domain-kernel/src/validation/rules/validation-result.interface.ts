/**
 * @fileoverview 验证结果接口
 * @description 定义验证结果的数据结构和行为
 */

import type { ValidationError } from "./validation-error.interface.js";

/**
 * 验证结果接口
 * @description 表示验证操作的结果，包含验证状态、错误信息等
 */
export interface ValidationResult {
  /**
   * 验证是否通过
   * @description 当所有验证规则都通过时为true，否则为false
   */
  readonly isValid: boolean;

  /**
   * 验证错误列表
   * @description 验证过程中发现的所有错误
   */
  readonly errors: readonly ValidationError[];

  /**
   * 验证警告列表
   * @description 验证过程中发现的所有警告
   */
  readonly warnings: readonly ValidationError[];

  /**
   * 验证信息列表
   * @description 验证过程中的信息性消息
   */
  readonly info: readonly ValidationError[];

  /**
   * 验证执行时间（毫秒）
   * @description 验证过程消耗的时间
   */
  readonly executionTime: number;

  /**
   * 验证的规则数量
   * @description 参与验证的规则总数
   */
  readonly rulesExecuted: number;

  /**
   * 验证的字段数量
   * @description 参与验证的字段总数
   */
  readonly fieldsValidated: number;

  /**
   * 验证上下文
   * @description 验证过程中的上下文信息
   */
  readonly context?: ValidationResultContext;

  /**
   * 检查是否有错误
   * @returns 是否存在验证错误
   */
  hasErrors(): boolean;

  /**
   * 检查是否有警告
   * @returns 是否存在验证警告
   */
  hasWarnings(): boolean;

  /**
   * 检查是否有信息
   * @returns 是否存在验证信息
   */
  hasInfo(): boolean;

  /**
   * 获取所有消息
   * @description 获取所有错误、警告和信息的消息
   * @returns 所有消息的数组
   */
  getAllMessages(): string[];

  /**
   * 获取指定级别的消息
   * @param level 消息级别
   * @returns 指定级别的消息数组
   */
  getMessagesByLevel(level: ValidationErrorLevel): string[];

  /**
   * 获取指定字段的错误
   * @param fieldName 字段名称
   * @returns 指定字段的错误数组
   */
  getErrorsForField(fieldName: string): ValidationError[];

  /**
   * 获取指定规则类型的错误
   * @param ruleName 规则名称
   * @returns 指定规则类型的错误数组
   */
  getErrorsForRule(ruleName: string): ValidationError[];

  /**
   * 合并验证结果
   * @param other 要合并的验证结果
   * @returns 合并后的验证结果
   */
  merge(other: ValidationResult): ValidationResult;

  /**
   * 转换为JSON格式
   * @returns JSON格式的验证结果
   */
  toJSON(): ValidationResultJSON;

  /**
   * 转换为字符串格式
   * @returns 字符串格式的验证结果
   */
  toString(): string;
}

/**
 * 验证结果上下文接口
 * @description 提供验证结果的上下文信息
 */
export interface ValidationResultContext {
  /**
   * 验证开始时间
   * @description 验证开始的时间戳
   */
  readonly startTime: number;

  /**
   * 验证结束时间
   * @description 验证结束的时间戳
   */
  readonly endTime: number;

  /**
   * 验证的字段列表
   * @description 参与验证的字段名称列表
   */
  readonly validatedFields: readonly string[];

  /**
   * 执行的规则列表
   * @description 参与验证的规则名称列表
   */
  readonly executedRules: readonly string[];

  /**
   * 验证选项
   * @description 验证过程中使用的选项
   */
  readonly options?: ValidationResultOptions;

  /**
   * 自定义数据
   * @description 验证过程中的自定义数据
   */
  readonly customData?: Record<string, unknown>;
}

/**
 * 验证结果选项接口
 * @description 定义验证结果的选项配置
 */
export interface ValidationResultOptions {
  /**
   * 是否包含执行时间
   * @description 是否在结果中包含执行时间信息
   */
  includeExecutionTime?: boolean;

  /**
   * 是否包含规则信息
   * @description 是否在结果中包含规则执行信息
   */
  includeRuleInfo?: boolean;

  /**
   * 是否包含字段信息
   * @description 是否在结果中包含字段验证信息
   */
  includeFieldInfo?: boolean;

  /**
   * 是否包含上下文信息
   * @description 是否在结果中包含上下文信息
   */
  includeContextInfo?: boolean;

  /**
   * 最大错误数量
   * @description 结果中保留的最大错误数量
   */
  maxErrors?: number;

  /**
   * 最大警告数量
   * @description 结果中保留的最大警告数量
   */
  maxWarnings?: number;
}

/**
 * 验证错误级别枚举
 * @description 定义验证错误的严重程度级别
 */
export enum ValidationErrorLevel {
  /**
   * 错误级别
   * @description 严重的验证错误，会导致验证失败
   */
  ERROR = "error",

  /**
   * 警告级别
   * @description 验证警告，不会导致验证失败但需要注意
   */
  WARNING = "warning",

  /**
   * 信息级别
   * @description 验证信息，提供额外的信息
   */
  INFO = "info",
}

/**
 * 验证结果JSON接口
 * @description 验证结果的JSON序列化格式
 */
export interface ValidationResultJSON {
  /**
   * 验证是否通过
   */
  isValid: boolean;

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
   * 执行时间（毫秒）
   */
  executionTime: number;

  /**
   * 规则执行数量
   */
  rulesExecuted: number;

  /**
   * 字段验证数量
   */
  fieldsValidated: number;

  /**
   * 错误列表
   */
  errors: Array<{
    message: string;
    code: string;
    fieldName?: string;
    ruleName?: string;
    level: string;
    details?: Record<string, unknown>;
  }>;

  /**
   * 警告列表
   */
  warnings: Array<{
    message: string;
    code: string;
    fieldName?: string;
    ruleName?: string;
    level: string;
    details?: Record<string, unknown>;
  }>;

  /**
   * 信息列表
   */
  info: Array<{
    message: string;
    code: string;
    fieldName?: string;
    ruleName?: string;
    level: string;
    details?: Record<string, unknown>;
  }>;
}

/**
 * 验证结果构建器接口
 * @description 用于构建验证结果的构建器接口
 */
export interface ValidationResultBuilder {
  /**
   * 添加错误
   * @param error 验证错误
   * @returns 构建器实例
   */
  addError(error: ValidationError): ValidationResultBuilder;

  /**
   * 添加警告
   * @param warning 验证警告
   * @returns 构建器实例
   */
  addWarning(warning: ValidationError): ValidationResultBuilder;

  /**
   * 添加信息
   * @param info 验证信息
   * @returns 构建器实例
   */
  addInfo(info: ValidationError): ValidationResultBuilder;

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
