/**
 * @fileoverview 业务规则工厂接口
 * @description 定义业务规则工厂的核心契约
 */

import type { BusinessRule } from "../business-rule.interface.js";
import type { BusinessRuleValidationResult } from "../business-rule-validation-result.interface.js";
import type { BusinessRuleViolation } from "../business-rule-violation.interface.js";
import type { ValidationContext } from "../../validation/rules/validation-rule.interface.js";

/**
 * 业务规则工厂接口
 * @description 提供业务规则的创建、配置和管理功能
 */
export interface BusinessRuleFactory {
  /**
   * 创建业务规则
   * @param type 规则类型
   * @param config 规则配置
   * @returns 业务规则实例
   */
  createRule(type: string, config: BusinessRuleConfig): BusinessRule;

  /**
   * 创建业务规则验证结果
   * @param config 验证结果配置
   * @returns 业务规则验证结果实例
   */
  createValidationResult(
    config: BusinessRuleValidationResultConfig,
  ): BusinessRuleValidationResult;

  /**
   * 创建业务规则违反
   * @param config 违反配置
   * @returns 业务规则违反实例
   */
  createViolation(config: BusinessRuleViolationConfig): BusinessRuleViolation;

  /**
   * 创建业务规则集合
   * @param configs 规则配置集合
   * @returns 业务规则集合
   */
  createRules(configs: BusinessRuleConfig[]): BusinessRule[];

  /**
   * 创建业务规则验证结果集合
   * @param configs 验证结果配置集合
   * @returns 业务规则验证结果集合
   */
  createValidationResults(
    configs: BusinessRuleValidationResultConfig[],
  ): BusinessRuleValidationResult[];

  /**
   * 创建业务规则违反集合
   * @param configs 违反配置集合
   * @returns 业务规则违反集合
   */
  createViolations(
    configs: BusinessRuleViolationConfig[],
  ): BusinessRuleViolation[];

  /**
   * 注册规则类型
   * @param type 规则类型
   * @param creator 规则创建器
   * @returns 是否注册成功
   */
  registerRuleType(type: string, creator: BusinessRuleCreator): boolean;

  /**
   * 注销规则类型
   * @param type 规则类型
   * @returns 是否注销成功
   */
  unregisterRuleType(type: string): boolean;

  /**
   * 获取规则类型
   * @param type 规则类型
   * @returns 规则创建器或undefined
   */
  getRuleType(type: string): BusinessRuleCreator | undefined;

  /**
   * 获取所有规则类型
   * @returns 所有规则类型列表
   */
  getAllRuleTypes(): string[];

  /**
   * 检查规则类型是否存在
   * @param type 规则类型
   * @returns 是否存在
   */
  hasRuleType(type: string): boolean;

  /**
   * 获取规则类型数量
   * @returns 规则类型数量
   */
  getRuleTypeCount(): number;

  /**
   * 清空所有规则类型
   * @returns 清空的规则类型数量
   */
  clearRuleTypes(): number;

  /**
   * 转换为JSON格式
   * @returns JSON格式的业务规则工厂
   */
  toJSON(): BusinessRuleFactoryJSON;
}

/**
 * 业务规则配置
 * @description 提供业务规则的配置信息
 */
export interface BusinessRuleConfig {
  /**
   * 规则名称
   */
  readonly name: string;

  /**
   * 规则类型
   */
  readonly type: string;

  /**
   * 规则描述
   */
  readonly description: string;

  /**
   * 规则优先级
   */
  readonly priority: number;

  /**
   * 是否启用
   */
  readonly enabled: boolean;

  /**
   * 规则配置
   */
  readonly config: Record<string, unknown>;

  /**
   * 规则依赖
   */
  readonly dependencies: string[];

  /**
   * 规则标签
   */
  readonly tags: string[];

  /**
   * 规则严重程度
   */
  readonly severity?: string;

  /**
   * 规则超时时间
   */
  readonly timeout?: number;

  /**
   * 规则重试次数
   */
  readonly retryCount?: number;

  /**
   * 规则重试延迟
   */
  readonly retryDelay?: number;

  /**
   * 规则条件
   */
  readonly conditions?: BusinessRuleCondition[];

  /**
   * 规则动作
   */
  readonly actions?: BusinessRuleAction[];

  /**
   * 转换为JSON格式
   * @returns JSON格式的业务规则配置
   */
  toJSON(): BusinessRuleConfigJSON;
}

/**
 * 业务规则验证结果配置
 * @description 提供业务规则验证结果的配置信息
 */
export interface BusinessRuleValidationResultConfig {
  /**
   * 是否有效
   */
  readonly isValid: boolean;

  /**
   * 实体类型
   */
  readonly entityType: string;

  /**
   * 实体ID
   */
  readonly entityId: string;

  /**
   * 违反列表
   */
  readonly violations?: BusinessRuleViolation[];

  /**
   * 警告列表
   */
  readonly warnings?: BusinessRuleViolation[];

  /**
   * 信息列表
   */
  readonly info?: BusinessRuleViolation[];

  /**
   * 执行时间
   */
  readonly executionTime?: number;

  /**
   * 规则执行数量
   */
  readonly rulesExecuted?: number;

  /**
   * 实体验证数量
   */
  readonly entitiesValidated?: number;

  /**
   * 验证上下文
   */
  readonly context?: ValidationContext;

  /**
   * 转换为JSON格式
   * @returns JSON格式的业务规则验证结果配置
   */
  toJSON(): BusinessRuleValidationResultConfigJSON;
}

/**
 * 业务规则违反配置
 * @description 提供业务规则违反的配置信息
 */
export interface BusinessRuleViolationConfig {
  /**
   * 违反消息
   */
  readonly message: string;

  /**
   * 违反代码
   */
  readonly code: string;

  /**
   * 规则名称
   */
  readonly ruleName: string;

  /**
   * 规则类型
   */
  readonly ruleType?: string;

  /**
   * 严重程度
   */
  readonly severity?: string;

  /**
   * 详细信息
   */
  readonly details?: Record<string, unknown>;

  /**
   * 时间戳
   */
  readonly timestamp?: Date;

  /**
   * 属性路径
   */
  readonly path?: string[];

  /**
   * 违反的值
   */
  readonly value?: unknown;

  /**
   * 位置信息
   */
  readonly position?: {
    line?: number;
    column?: number;
    start?: number;
    end?: number;
  };

  /**
   * 实体类型
   */
  readonly entityType?: string;

  /**
   * 实体ID
   */
  readonly entityId?: string;

  /**
   * 操作类型
   */
  readonly operationType?: string;

  /**
   * 转换为JSON格式
   * @returns JSON格式的业务规则违反配置
   */
  toJSON(): BusinessRuleViolationConfigJSON;
}

/**
 * 业务规则创建器
 * @description 提供业务规则的创建功能
 */
export interface BusinessRuleCreator {
  /**
   * 创建业务规则
   * @param config 规则配置
   * @returns 业务规则实例
   */
  create(config: BusinessRuleConfig): BusinessRule;

  /**
   * 获取规则类型
   * @returns 规则类型
   */
  getType(): string;

  /**
   * 获取规则描述
   * @returns 规则描述
   */
  getDescription(): string;

  /**
   * 获取规则版本
   * @returns 规则版本
   */
  getVersion(): string;

  /**
   * 检查配置是否有效
   * @param config 规则配置
   * @returns 是否有效
   */
  validateConfig(config: BusinessRuleConfig): boolean;

  /**
   * 获取默认配置
   * @returns 默认配置
   */
  getDefaultConfig(): Partial<BusinessRuleConfig>;

  /**
   * 转换为JSON格式
   * @returns JSON格式的业务规则创建器
   */
  toJSON(): BusinessRuleCreatorJSON;
}

/**
 * 业务规则条件
 * @description 提供业务规则的条件定义
 */
export interface BusinessRuleCondition {
  /**
   * 条件名称
   */
  readonly name: string;

  /**
   * 条件类型
   */
  readonly type: string;

  /**
   * 条件表达式
   */
  readonly expression: string;

  /**
   * 条件参数
   */
  readonly parameters: Record<string, unknown>;

  /**
   * 条件描述
   */
  readonly description?: string;

  /**
   * 条件优先级
   */
  readonly priority?: number;

  /**
   * 条件是否启用
   */
  readonly enabled?: boolean;

  /**
   * 转换为JSON格式
   * @returns JSON格式的业务规则条件
   */
  toJSON(): BusinessRuleConditionJSON;
}

/**
 * 业务规则动作
 * @description 提供业务规则的动作定义
 */
export interface BusinessRuleAction {
  /**
   * 动作名称
   */
  readonly name: string;

  /**
   * 动作类型
   */
  readonly type: string;

  /**
   * 动作表达式
   */
  readonly expression: string;

  /**
   * 动作参数
   */
  readonly parameters: Record<string, unknown>;

  /**
   * 动作描述
   */
  readonly description?: string;

  /**
   * 动作优先级
   */
  readonly priority?: number;

  /**
   * 动作是否启用
   */
  readonly enabled?: boolean;

  /**
   * 转换为JSON格式
   * @returns JSON格式的业务规则动作
   */
  toJSON(): BusinessRuleActionJSON;
}

/**
 * 业务规则工厂JSON格式
 * @description 提供业务规则工厂的JSON表示
 */
export interface BusinessRuleFactoryJSON {
  /**
   * 规则类型数量
   */
  readonly ruleTypeCount: number;

  /**
   * 规则类型列表
   */
  readonly ruleTypes: string[];

  /**
   * 规则类型详情
   */
  readonly ruleTypeDetails: Record<string, BusinessRuleCreatorJSON>;
}

/**
 * 业务规则配置JSON格式
 * @description 提供业务规则配置的JSON表示
 */
export interface BusinessRuleConfigJSON {
  /**
   * 规则名称
   */
  readonly name: string;

  /**
   * 规则类型
   */
  readonly type: string;

  /**
   * 规则描述
   */
  readonly description: string;

  /**
   * 规则优先级
   */
  readonly priority: number;

  /**
   * 是否启用
   */
  readonly enabled: boolean;

  /**
   * 规则配置
   */
  readonly config: Record<string, unknown>;

  /**
   * 规则依赖
   */
  readonly dependencies: string[];

  /**
   * 规则标签
   */
  readonly tags: string[];

  /**
   * 规则严重程度
   */
  readonly severity?: string;

  /**
   * 规则超时时间
   */
  readonly timeout?: number;

  /**
   * 规则重试次数
   */
  readonly retryCount?: number;

  /**
   * 规则重试延迟
   */
  readonly retryDelay?: number;

  /**
   * 规则条件
   */
  readonly conditions?: BusinessRuleConditionJSON[];

  /**
   * 规则动作
   */
  readonly actions?: BusinessRuleActionJSON[];
}

/**
 * 业务规则验证结果配置JSON格式
 * @description 提供业务规则验证结果配置的JSON表示
 */
export interface BusinessRuleValidationResultConfigJSON {
  /**
   * 是否有效
   */
  readonly isValid: boolean;

  /**
   * 实体类型
   */
  readonly entityType: string;

  /**
   * 实体ID
   */
  readonly entityId: string;

  /**
   * 违反列表
   */
  readonly violations?: BusinessRuleViolationConfigJSON[];

  /**
   * 警告列表
   */
  readonly warnings?: BusinessRuleViolationConfigJSON[];

  /**
   * 信息列表
   */
  readonly info?: BusinessRuleViolationConfigJSON[];

  /**
   * 执行时间
   */
  readonly executionTime?: number;

  /**
   * 规则执行数量
   */
  readonly rulesExecuted?: number;

  /**
   * 实体验证数量
   */
  readonly entitiesValidated?: number;
}

/**
 * 业务规则违反配置JSON格式
 * @description 提供业务规则违反配置的JSON表示
 */
export interface BusinessRuleViolationConfigJSON {
  /**
   * 违反消息
   */
  readonly message: string;

  /**
   * 违反代码
   */
  readonly code: string;

  /**
   * 规则名称
   */
  readonly ruleName: string;

  /**
   * 规则类型
   */
  readonly ruleType?: string;

  /**
   * 严重程度
   */
  readonly severity?: string;

  /**
   * 详细信息
   */
  readonly details?: Record<string, unknown>;

  /**
   * 时间戳
   */
  readonly timestamp?: string;

  /**
   * 属性路径
   */
  readonly path?: string[];

  /**
   * 违反的值
   */
  readonly value?: unknown;

  /**
   * 位置信息
   */
  readonly position?: {
    line?: number;
    column?: number;
    start?: number;
    end?: number;
  };

  /**
   * 实体类型
   */
  readonly entityType?: string;

  /**
   * 实体ID
   */
  readonly entityId?: string;

  /**
   * 操作类型
   */
  readonly operationType?: string;
}

/**
 * 业务规则创建器JSON格式
 * @description 提供业务规则创建器的JSON表示
 */
export interface BusinessRuleCreatorJSON {
  /**
   * 规则类型
   */
  readonly type: string;

  /**
   * 规则描述
   */
  readonly description: string;

  /**
   * 规则版本
   */
  readonly version: string;

  /**
   * 默认配置
   */
  readonly defaultConfig: Partial<BusinessRuleConfigJSON>;
}

/**
 * 业务规则条件JSON格式
 * @description 提供业务规则条件的JSON表示
 */
export interface BusinessRuleConditionJSON {
  /**
   * 条件名称
   */
  readonly name: string;

  /**
   * 条件类型
   */
  readonly type: string;

  /**
   * 条件表达式
   */
  readonly expression: string;

  /**
   * 条件参数
   */
  readonly parameters: Record<string, unknown>;

  /**
   * 条件描述
   */
  readonly description?: string;

  /**
   * 条件优先级
   */
  readonly priority?: number;

  /**
   * 条件是否启用
   */
  readonly enabled?: boolean;
}

/**
 * 业务规则动作JSON格式
 * @description 提供业务规则动作的JSON表示
 */
export interface BusinessRuleActionJSON {
  /**
   * 动作名称
   */
  readonly name: string;

  /**
   * 动作类型
   */
  readonly type: string;

  /**
   * 动作表达式
   */
  readonly expression: string;

  /**
   * 动作参数
   */
  readonly parameters: Record<string, unknown>;

  /**
   * 动作描述
   */
  readonly description?: string;

  /**
   * 动作优先级
   */
  readonly priority?: number;

  /**
   * 动作是否启用
   */
  readonly enabled?: boolean;
}
