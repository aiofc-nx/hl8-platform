/**
 * @fileoverview 验证错误接口
 * @description 定义验证错误的数据结构和行为
 */

import type { ValidationErrorLevel } from "./validation-result.interface.js";

/**
 * 验证错误接口
 * @description 表示验证过程中的错误、警告或信息
 */
export interface ValidationError {
  /**
   * 错误消息
   * @description 人类可读的错误描述
   */
  readonly message: string;

  /**
   * 错误代码
   * @description 机器可读的错误标识符
   */
  readonly code: string;

  /**
   * 字段名称
   * @description 发生错误的字段名称
   */
  readonly fieldName?: string;

  /**
   * 规则名称
   * @description 产生此错误的验证规则名称
   */
  readonly ruleName?: string;

  /**
   * 错误级别
   * @description 错误的严重程度级别
   */
  readonly level: ValidationErrorLevel;

  /**
   * 错误详情
   * @description 错误的额外详细信息
   */
  readonly details?: Record<string, unknown>;

  /**
   * 错误时间戳
   * @description 错误发生的时间戳
   */
  readonly timestamp: number;

  /**
   * 错误路径
   * @description 在嵌套对象中的错误路径
   */
  readonly path?: string[];

  /**
   * 错误值
   * @description 导致错误的值
   */
  readonly value?: unknown;

  /**
   * 错误位置
   * @description 错误在值中的位置信息
   */
  readonly position?: ValidationErrorPosition;

  /**
   * 检查是否为错误级别
   * @returns 是否为错误级别
   */
  isError(): boolean;

  /**
   * 检查是否为警告级别
   * @returns 是否为警告级别
   */
  isWarning(): boolean;

  /**
   * 检查是否为信息级别
   * @returns 是否为信息级别
   */
  isInfo(): boolean;

  /**
   * 获取完整路径
   * @description 获取包含字段名称的完整错误路径
   * @returns 完整的错误路径
   */
  getFullPath(): string;

  /**
   * 获取格式化消息
   * @description 获取包含路径和上下文的格式化错误消息
   * @returns 格式化的错误消息
   */
  getFormattedMessage(): string;

  /**
   * 转换为JSON格式
   * @returns JSON格式的错误信息
   */
  toJSON(): ValidationErrorJSON;

  /**
   * 转换为字符串格式
   * @returns 字符串格式的错误信息
   */
  toString(): string;

  /**
   * 克隆错误
   * @param overrides 要覆盖的属性
   * @returns 克隆的错误实例
   */
  clone(overrides?: Partial<ValidationErrorData>): ValidationError;
}

/**
 * 验证错误位置接口
 * @description 定义错误在值中的位置信息
 */
export interface ValidationErrorPosition {
  /**
   * 行号
   * @description 错误所在的行号（从1开始）
   */
  readonly line?: number;

  /**
   * 列号
   * @description 错误所在的列号（从1开始）
   */
  readonly column?: number;

  /**
   * 字符位置
   * @description 错误在字符串中的字符位置（从0开始）
   */
  readonly offset?: number;

  /**
   * 长度
   * @description 错误值的长度
   */
  readonly length?: number;

  /**
   * 索引
   * @description 错误在数组中的索引
   */
  readonly index?: number;

  /**
   * 属性名
   * @description 错误在对象中的属性名
   */
  readonly property?: string;
}

/**
 * 验证错误数据接口
 * @description 定义创建验证错误所需的数据
 */
export interface ValidationErrorData {
  /**
   * 错误消息
   */
  message: string;

  /**
   * 错误代码
   */
  code: string;

  /**
   * 字段名称
   */
  fieldName?: string;

  /**
   * 规则名称
   */
  ruleName?: string;

  /**
   * 错误级别
   */
  level: ValidationErrorLevel;

  /**
   * 错误详情
   */
  details?: Record<string, unknown>;

  /**
   * 错误时间戳
   */
  timestamp?: number;

  /**
   * 错误路径
   */
  path?: string[];

  /**
   * 错误值
   */
  value?: unknown;

  /**
   * 错误位置
   */
  position?: ValidationErrorPosition;
}

/**
 * 验证错误JSON接口
 * @description 验证错误的JSON序列化格式
 */
export interface ValidationErrorJSON {
  /**
   * 错误消息
   */
  message: string;

  /**
   * 错误代码
   */
  code: string;

  /**
   * 字段名称
   */
  fieldName?: string;

  /**
   * 规则名称
   */
  ruleName?: string;

  /**
   * 错误级别
   */
  level: string;

  /**
   * 错误详情
   */
  details?: Record<string, unknown>;

  /**
   * 错误时间戳
   */
  timestamp: number;

  /**
   * 错误路径
   */
  path?: string[];

  /**
   * 错误值
   */
  value?: unknown;

  /**
   * 错误位置
   */
  position?: ValidationErrorPosition;
}

/**
 * 验证错误构建器接口
 * @description 用于构建验证错误的构建器接口
 */
export interface ValidationErrorBuilder {
  /**
   * 设置消息
   * @param message 错误消息
   * @returns 构建器实例
   */
  setMessage(message: string): ValidationErrorBuilder;

  /**
   * 设置代码
   * @param code 错误代码
   * @returns 构建器实例
   */
  setCode(code: string): ValidationErrorBuilder;

  /**
   * 设置字段名称
   * @param fieldName 字段名称
   * @returns 构建器实例
   */
  setFieldName(fieldName: string): ValidationErrorBuilder;

  /**
   * 设置规则名称
   * @param ruleName 规则名称
   * @returns 构建器实例
   */
  setRuleName(ruleName: string): ValidationErrorBuilder;

  /**
   * 设置级别
   * @param level 错误级别
   * @returns 构建器实例
   */
  setLevel(level: ValidationErrorLevel): ValidationErrorBuilder;

  /**
   * 设置详情
   * @param details 错误详情
   * @returns 构建器实例
   */
  setDetails(details: Record<string, unknown>): ValidationErrorBuilder;

  /**
   * 设置时间戳
   * @param timestamp 错误时间戳
   * @returns 构建器实例
   */
  setTimestamp(timestamp: number): ValidationErrorBuilder;

  /**
   * 设置路径
   * @param path 错误路径
   * @returns 构建器实例
   */
  setPath(path: string[]): ValidationErrorBuilder;

  /**
   * 设置值
   * @param value 错误值
   * @returns 构建器实例
   */
  setValue(value: unknown): ValidationErrorBuilder;

  /**
   * 设置位置
   * @param position 错误位置
   * @returns 构建器实例
   */
  setPosition(position: ValidationErrorPosition): ValidationErrorBuilder;

  /**
   * 构建验证错误
   * @returns 验证错误实例
   */
  build(): ValidationError;

  /**
   * 重置构建器
   * @returns 构建器实例
   */
  reset(): ValidationErrorBuilder;
}

/**
 * 验证错误比较器接口
 * @description 用于比较验证错误的接口
 */
export interface ValidationErrorComparator {
  /**
   * 比较两个错误
   * @param a 第一个错误
   * @param b 第二个错误
   * @returns 比较结果（负数表示a < b，0表示a = b，正数表示a > b）
   */
  compare(a: ValidationError, b: ValidationError): number;

  /**
   * 检查两个错误是否相等
   * @param a 第一个错误
   * @param b 第二个错误
   * @returns 是否相等
   */
  equals(a: ValidationError, b: ValidationError): boolean;

  /**
   * 检查错误是否匹配条件
   * @param error 要检查的错误
   * @param condition 匹配条件
   * @returns 是否匹配
   */
  matches(error: ValidationError, condition: ValidationErrorCondition): boolean;
}

/**
 * 验证错误条件接口
 * @description 定义验证错误的匹配条件
 */
export interface ValidationErrorCondition {
  /**
   * 字段名称匹配
   */
  fieldName?: string | RegExp;

  /**
   * 规则名称匹配
   */
  ruleName?: string | RegExp;

  /**
   * 错误级别匹配
   */
  level?: ValidationErrorLevel | ValidationErrorLevel[];

  /**
   * 错误代码匹配
   */
  code?: string | RegExp;

  /**
   * 消息匹配
   */
  message?: string | RegExp;

  /**
   * 路径匹配
   */
  path?: string[] | RegExp;

  /**
   * 自定义匹配函数
   */
  customMatcher?: (error: ValidationError) => boolean;
}
