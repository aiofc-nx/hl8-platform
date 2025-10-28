/**
 * @fileoverview 验证规则接口
 * @description 定义验证规则的基本契约和结构
 */

import type { ValidationResult } from "./validation-result.interface.js";
import type { ValidationError } from "./validation-error.interface.js";

/**
 * 验证规则接口
 * @description 定义验证规则的基本契约，所有验证规则都必须实现此接口
 */
export interface ValidationRule<T = unknown> {
  /**
   * 规则名称
   * @description 用于标识和调试的唯一名称
   */
  readonly name: string;

  /**
   * 规则描述
   * @description 规则的详细描述，用于文档和错误消息
   */
  readonly description: string;

  /**
   * 规则优先级
   * @description 数值越小优先级越高，用于确定规则执行顺序
   */
  readonly priority: number;

  /**
   * 规则是否启用
   * @description 用于动态启用/禁用规则
   */
  readonly enabled: boolean;

  /**
   * 执行验证
   * @description 对给定值执行验证逻辑
   * @param value 要验证的值
   * @param context 验证上下文，包含额外的验证信息
   * @returns 验证结果
   */
  validate(value: T, context?: ValidationContext): ValidationResult;

  /**
   * 创建验证错误
   * @description 创建标准化的验证错误对象
   * @param message 错误消息
   * @param code 错误代码
   * @param details 错误详情
   * @returns 验证错误对象
   */
  createError(
    message: string,
    code?: string,
    details?: Record<string, unknown>,
  ): ValidationError;

  /**
   * 检查规则是否适用于给定值
   * @description 用于优化验证流程，跳过不适用的规则
   * @param value 要检查的值
   * @param context 验证上下文
   * @returns 是否适用此规则
   */
  isApplicable(value: T, context?: ValidationContext): boolean;
}

/**
 * 验证上下文接口
 * @description 提供验证过程中需要的上下文信息
 */
export interface ValidationContext {
  /**
   * 字段名称
   * @description 被验证字段的名称
   */
  fieldName?: string;

  /**
   * 父对象
   * @description 包含被验证字段的父对象
   */
  parentObject?: unknown;

  /**
   * 验证选项
   * @description 验证过程中的配置选项
   */
  options?: ValidationOptions | Record<string, unknown>;

  /**
   * 自定义数据
   * @description 验证过程中需要的自定义数据
   */
  customData?: Record<string, unknown>;

  /**
   * 实体类型
   * @description 被验证实体的类型
   */
  entityType?: string;

  /**
   * 实体ID
   * @description 被验证实体的ID
   */
  entityId?: string;

  /**
   * 开始时间
   * @description 验证开始时间
   */
  startTime: number;

  /**
   * 结束时间
   * @description 验证结束时间
   */
  endTime: number;

  /**
   * 已验证的实体
   * @description 已验证的实体列表
   */
  validatedEntities: readonly string[];

  /**
   * 已执行的规则
   * @description 已执行的规则列表
   */
  executedRules: readonly string[];

  /**
   * 验证路径
   * @description 在嵌套对象中的验证路径
   */
  path?: string[];

  /**
   * 验证级别
   * @description 验证的严格程度级别
   */
  level?: ValidationLevel;
}

/**
 * 验证选项接口
 * @description 定义验证过程中的配置选项
 */
export interface ValidationOptions {
  /**
   * 是否在第一个错误时停止
   * @description 当为true时，遇到第一个验证错误就停止验证
   */
  stopOnFirstError?: boolean;

  /**
   * 是否包含警告
   * @description 当为true时，包含警告级别的验证结果
   */
  includeWarnings?: boolean;

  /**
   * 是否包含详细信息
   * @description 当为true时，包含详细的验证信息
   */
  includeDetails?: boolean;

  /**
   * 最大错误数量
   * @description 验证过程中允许的最大错误数量
   */
  maxErrors?: number;

  /**
   * 是否验证嵌套对象
   * @description 当为true时，验证嵌套的对象和数组
   */
  validateNested?: boolean;

  // 字符串验证选项
  /**
   * 最小长度
   * @description 字符串或数组的最小长度
   */
  minLength?: number;

  /**
   * 最大长度
   * @description 字符串或数组的最大长度
   */
  maxLength?: number;

  // 数字验证选项
  /**
   * 最小值
   * @description 数字的最小值
   */
  min?: number;

  /**
   * 最大值
   * @description 数字的最大值
   */
  max?: number;

  // 数组验证选项
  /**
   * 目标元素
   * @description 数组必须包含的元素
   */
  target?: unknown;

  // 对象验证选项
  /**
   * 属性名称
   * @description 对象必须包含的属性名称
   */
  property?: string;

  /**
   * 期望值
   * @description 对象属性的期望值
   */
  expectedValue?: unknown;

  // 日期验证选项
  /**
   * 最小日期
   * @description 日期的最小值
   */
  minDate?: string | Date;

  /**
   * 最大日期
   * @description 日期的最大值
   */
  maxDate?: string | Date;

  /**
   * 是否忽略未知属性
   * @description 当为true时，忽略对象中的未知属性
   */
  ignoreUnknownProperties?: boolean;

  /**
   * 索引签名
   * @description 允许任意字符串键值对
   */
  [key: string]: unknown;
}

/**
 * 验证级别枚举
 * @description 定义验证的严格程度级别
 */
export enum ValidationLevel {
  /**
   * 基础验证
   * @description 只进行基本的类型和格式验证
   */
  BASIC = "BASIC",

  /**
   * 标准验证
   * @description 进行标准的业务规则验证
   */
  STANDARD = "STANDARD",

  /**
   * 严格验证
   * @description 进行严格的业务规则验证，包括所有约束
   */
  STRICT = "STRICT",

  /**
   * 完整验证
   * @description 进行完整的验证，包括所有可能的检查
   */
  COMPLETE = "COMPLETE",
}

/**
 * 验证规则工厂接口
 * @description 用于创建验证规则的工厂接口
 */
export interface ValidationRuleFactory<T = unknown> {
  /**
   * 创建验证规则
   * @param config 规则配置
   * @returns 验证规则实例
   */
  createRule(config: ValidationRuleConfig): ValidationRule<T>;

  /**
   * 创建多个验证规则
   * @param configs 规则配置数组
   * @returns 验证规则实例数组
   */
  createRules(configs: ValidationRuleConfig[]): ValidationRule<T>[];

  /**
   * 注册规则类型
   * @param type 规则类型
   * @param creator 规则创建函数
   */
  registerRuleType(type: string, creator: RuleCreator<T>): void;

  /**
   * 获取支持的规则类型
   * @returns 支持的规则类型列表
   */
  getSupportedRuleTypes(): string[];
}

/**
 * 验证规则配置接口
 * @description 定义创建验证规则所需的配置
 */
export interface ValidationRuleConfig {
  /**
   * 规则类型
   * @description 规则的类型标识符
   */
  type: string;

  /**
   * 规则名称
   * @description 规则的唯一名称
   */
  name: string;

  /**
   * 规则描述
   * @description 规则的描述信息
   */
  description?: string;

  /**
   * 规则优先级
   * @description 规则的执行优先级
   */
  priority?: number;

  /**
   * 规则是否启用
   * @description 规则是否默认启用
   */
  enabled?: boolean;

  /**
   * 规则参数
   * @description 规则执行所需的参数
   */
  parameters?: Record<string, unknown>;

  /**
   * 规则选项
   * @description 规则的特定选项
   */
  options?: Record<string, unknown>;
}

/**
 * 规则创建函数类型
 * @description 用于创建验证规则的函数类型
 */
export type RuleCreator<T = unknown> = (
  config: ValidationRuleConfig,
) => ValidationRule<T>;
