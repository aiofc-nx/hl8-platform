/**
 * @fileoverview 通用验证规则接口
 * @description 定义通用验证规则的接口和功能
 */

import type { ValidationRule } from "./validation-rule.interface.js";

/**
 * 通用验证规则接口
 * @description 提供常用的验证规则集合
 */
export interface CommonValidationRules {
  /**
   * 非空验证规则
   * @description 验证值不为null、undefined或空字符串
   * @param message 自定义错误消息
   * @returns 非空验证规则
   */
  notEmpty(message?: string): ValidationRule<unknown>;

  /**
   * 非null验证规则
   * @description 验证值不为null
   * @param message 自定义错误消息
   * @returns 非null验证规则
   */
  notNull(message?: string): ValidationRule<unknown>;

  /**
   * 非undefined验证规则
   * @description 验证值不为undefined
   * @param message 自定义错误消息
   * @returns 非undefined验证规则
   */
  notUndefined(message?: string): ValidationRule<unknown>;

  /**
   * 字符串长度验证规则
   * @description 验证字符串长度在指定范围内
   * @param minLength 最小长度
   * @param maxLength 最大长度
   * @param message 自定义错误消息
   * @returns 字符串长度验证规则
   */
  stringLength(
    minLength: number,
    maxLength: number,
    message?: string,
  ): ValidationRule<string>;

  /**
   * 字符串最小长度验证规则
   * @description 验证字符串长度不小于指定值
   * @param minLength 最小长度
   * @param message 自定义错误消息
   * @returns 字符串最小长度验证规则
   */
  stringMinLength(minLength: number, message?: string): ValidationRule<string>;

  /**
   * 字符串最大长度验证规则
   * @description 验证字符串长度不大于指定值
   * @param maxLength 最大长度
   * @param message 自定义错误消息
   * @returns 字符串最大长度验证规则
   */
  stringMaxLength(maxLength: number, message?: string): ValidationRule<string>;

  /**
   * 数字范围验证规则
   * @description 验证数字在指定范围内
   * @param min 最小值
   * @param max 最大值
   * @param message 自定义错误消息
   * @returns 数字范围验证规则
   */
  numberRange(
    min: number,
    max: number,
    message?: string,
  ): ValidationRule<number>;

  /**
   * 数字最小值验证规则
   * @description 验证数字不小于指定值
   * @param min 最小值
   * @param message 自定义错误消息
   * @returns 数字最小值验证规则
   */
  numberMin(min: number, message?: string): ValidationRule<number>;

  /**
   * 数字最大值验证规则
   * @description 验证数字不大于指定值
   * @param max 最大值
   * @param message 自定义错误消息
   * @returns 数字最大值验证规则
   */
  numberMax(max: number, message?: string): ValidationRule<number>;

  /**
   * 整数验证规则
   * @description 验证值为整数
   * @param message 自定义错误消息
   * @returns 整数验证规则
   */
  integer(message?: string): ValidationRule<number>;

  /**
   * 正数验证规则
   * @description 验证值为正数
   * @param message 自定义错误消息
   * @returns 正数验证规则
   */
  positive(message?: string): ValidationRule<number>;

  /**
   * 负数验证规则
   * @description 验证值为负数
   * @param message 自定义错误消息
   * @returns 负数验证规则
   */
  negative(message?: string): ValidationRule<number>;

  /**
   * 非负数验证规则
   * @description 验证值为非负数
   * @param message 自定义错误消息
   * @returns 非负数验证规则
   */
  nonNegative(message?: string): ValidationRule<number>;

  /**
   * 非正数验证规则
   * @description 验证值为非正数
   * @param message 自定义错误消息
   * @returns 非正数验证规则
   */
  nonPositive(message?: string): ValidationRule<number>;

  /**
   * 邮箱验证规则
   * @description 验证邮箱格式
   * @param message 自定义错误消息
   * @returns 邮箱验证规则
   */
  email(message?: string): ValidationRule<string>;

  /**
   * URL验证规则
   * @description 验证URL格式
   * @param message 自定义错误消息
   * @returns URL验证规则
   */
  url(message?: string): ValidationRule<string>;

  /**
   * 正则表达式验证规则
   * @description 验证值匹配指定的正则表达式
   * @param pattern 正则表达式
   * @param message 自定义错误消息
   * @returns 正则表达式验证规则
   */
  pattern(pattern: RegExp, message?: string): ValidationRule<string>;

  /**
   * 数组长度验证规则
   * @description 验证数组长度在指定范围内
   * @param minLength 最小长度
   * @param maxLength 最大长度
   * @param message 自定义错误消息
   * @returns 数组长度验证规则
   */
  arrayLength(
    minLength: number,
    maxLength: number,
    message?: string,
  ): ValidationRule<unknown[]>;

  /**
   * 数组最小长度验证规则
   * @description 验证数组长度不小于指定值
   * @param minLength 最小长度
   * @param message 自定义错误消息
   * @returns 数组最小长度验证规则
   */
  arrayMinLength(
    minLength: number,
    message?: string,
  ): ValidationRule<unknown[]>;

  /**
   * 数组最大长度验证规则
   * @description 验证数组长度不大于指定值
   * @param maxLength 最大长度
   * @param message 自定义错误消息
   * @returns 数组最大长度验证规则
   */
  arrayMaxLength(
    maxLength: number,
    message?: string,
  ): ValidationRule<unknown[]>;

  /**
   * 数组非空验证规则
   * @description 验证数组不为空
   * @param message 自定义错误消息
   * @returns 数组非空验证规则
   */
  arrayNotEmpty(message?: string): ValidationRule<unknown[]>;

  /**
   * 对象属性验证规则
   * @description 验证对象包含指定的属性
   * @param properties 必需的属性列表
   * @param message 自定义错误消息
   * @returns 对象属性验证规则
   */
  objectHasProperties(
    properties: string[],
    message?: string,
  ): ValidationRule<Record<string, unknown>>;

  /**
   * 对象属性类型验证规则
   * @description 验证对象属性的类型
   * @param propertyTypeMap 属性类型映射
   * @param message 自定义错误消息
   * @returns 对象属性类型验证规则
   */
  objectPropertyTypes(
    propertyTypeMap: Record<string, string>,
    message?: string,
  ): ValidationRule<Record<string, unknown>>;

  /**
   * 日期验证规则
   * @description 验证值为有效日期
   * @param message 自定义错误消息
   * @returns 日期验证规则
   */
  date(message?: string): ValidationRule<Date | string>;

  /**
   * 日期范围验证规则
   * @description 验证日期在指定范围内
   * @param minDate 最小日期
   * @param maxDate 最大日期
   * @param message 自定义错误消息
   * @returns 日期范围验证规则
   */
  dateRange(
    minDate: Date,
    maxDate: Date,
    message?: string,
  ): ValidationRule<Date | string>;

  /**
   * 布尔值验证规则
   * @description 验证值为布尔值
   * @param message 自定义错误消息
   * @returns 布尔值验证规则
   */
  boolean(message?: string): ValidationRule<boolean>;

  /**
   * 枚举值验证规则
   * @description 验证值在指定的枚举值中
   * @param enumValues 枚举值数组
   * @param message 自定义错误消息
   * @returns 枚举值验证规则
   */
  enum<T>(enumValues: T[], message?: string): ValidationRule<T>;

  /**
   * 自定义验证规则
   * @description 创建自定义验证规则
   * @param name 规则名称
   * @param validator 验证函数
   * @param message 自定义错误消息
   * @returns 自定义验证规则
   */
  custom<T>(
    name: string,
    validator: (value: T) => boolean,
    message?: string,
  ): ValidationRule<T>;

  /**
   * 条件验证规则
   * @description 根据条件决定是否应用验证规则
   * @param condition 条件函数
   * @param rule 要应用的规则
   * @returns 条件验证规则
   */
  conditional<T>(
    condition: (value: T) => boolean,
    rule: ValidationRule<T>,
  ): ValidationRule<T>;

  /**
   * 组合验证规则
   * @description 组合多个验证规则
   * @param rules 要组合的规则列表
   * @param mode 组合模式（AND或OR）
   * @returns 组合验证规则
   */
  combine<T>(rules: ValidationRule<T>[], mode: "AND" | "OR"): ValidationRule<T>;
}
