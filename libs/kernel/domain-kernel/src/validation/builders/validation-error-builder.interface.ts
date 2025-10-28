/**
 * @fileoverview 验证错误构建器接口
 * @description 定义验证错误构建器的基本契约和功能
 */

import type {
  ValidationError,
  ValidationErrorData,
  ValidationErrorPosition,
} from "../rules/validation-error.interface.js";
import { ValidationErrorLevel } from "../rules/validation-result.interface.js";

/**
 * 验证错误构建器接口
 * @description 定义构建验证错误的构建器契约
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
   * 设置行号
   * @param line 行号
   * @returns 构建器实例
   */
  setLine(line: number): ValidationErrorBuilder;

  /**
   * 设置列号
   * @param column 列号
   * @returns 构建器实例
   */
  setColumn(column: number): ValidationErrorBuilder;

  /**
   * 设置字符位置
   * @param offset 字符位置
   * @returns 构建器实例
   */
  setOffset(offset: number): ValidationErrorBuilder;

  /**
   * 设置长度
   * @param length 长度
   * @returns 构建器实例
   */
  setLength(length: number): ValidationErrorBuilder;

  /**
   * 设置索引
   * @param index 索引
   * @returns 构建器实例
   */
  setIndex(index: number): ValidationErrorBuilder;

  /**
   * 设置属性名
   * @param property 属性名
   * @returns 构建器实例
   */
  setProperty(property: string): ValidationErrorBuilder;

  /**
   * 添加详情项
   * @param key 详情键
   * @param value 详情值
   * @returns 构建器实例
   */
  addDetail(key: string, value: unknown): ValidationErrorBuilder;

  /**
   * 添加多个详情项
   * @param details 详情对象
   * @returns 构建器实例
   */
  addDetails(details: Record<string, unknown>): ValidationErrorBuilder;

  /**
   * 清空详情
   * @returns 构建器实例
   */
  clearDetails(): ValidationErrorBuilder;

  /**
   * 设置当前时间戳
   * @returns 构建器实例
   */
  setCurrentTimestamp(): ValidationErrorBuilder;

  /**
   * 从现有错误复制
   * @param error 现有错误
   * @returns 构建器实例
   */
  copyFrom(error: ValidationError): ValidationErrorBuilder;

  /**
   * 从错误数据复制
   * @param data 错误数据
   * @returns 构建器实例
   */
  copyFromData(data: ValidationErrorData): ValidationErrorBuilder;

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
 * 验证错误构建器配置接口
 * @description 定义验证错误构建器的配置选项
 */
export interface ValidationErrorBuilderConfig {
  /**
   * 默认错误级别
   * @description 创建错误时的默认级别
   */
  defaultLevel?: ValidationErrorLevel;

  /**
   * 默认错误代码
   * @description 创建错误时的默认代码
   */
  defaultCode?: string;

  /**
   * 是否自动设置时间戳
   * @description 当为true时，会自动设置当前时间戳
   */
  autoSetTimestamp?: boolean;

  /**
   * 是否启用验证
   * @description 当为true时，会在构建时进行数据验证
   */
  enableValidation?: boolean;

  /**
   * 是否允许空消息
   * @description 当为false时，不允许空消息
   */
  allowEmptyMessage?: boolean;

  /**
   * 是否允许空代码
   * @description 当为false时，不允许空代码
   */
  allowEmptyCode?: boolean;
}

/**
 * 验证错误构建器工厂接口
 * @description 用于创建验证错误构建器的工厂接口
 */
export interface ValidationErrorBuilderFactory {
  /**
   * 创建构建器
   * @param config 构建器配置
   * @returns 构建器实例
   */
  createBuilder(config?: ValidationErrorBuilderConfig): ValidationErrorBuilder;

  /**
   * 创建默认构建器
   * @returns 默认配置的构建器实例
   */
  createDefaultBuilder(): ValidationErrorBuilder;

  /**
   * 创建严格模式构建器
   * @returns 严格模式的构建器实例
   */
  createStrictBuilder(): ValidationErrorBuilder;

  /**
   * 创建错误级别构建器
   * @param level 错误级别
   * @returns 指定级别的构建器实例
   */
  createErrorLevelBuilder(level: ValidationErrorLevel): ValidationErrorBuilder;
}
