/**
 * @fileoverview 业务规则管理器接口
 * @description 定义业务规则管理器的核心契约
 */

import type {
  BusinessRule,
  BusinessRuleContext,
  BusinessRuleLike,
} from "./business-rule.interface.js";
import type { BusinessRuleValidationResult } from "./business-rule-validation-result.interface.js";
// import type { BusinessRuleViolation } from "./business-rule-violation.interface.js";

/**
 * 业务规则管理器接口
 * @description 提供业务规则的管理、注册、验证和协调功能
 */
export interface BusinessRuleManager {
  /**
   * 注册业务规则
   * @param rule 业务规则
   * @returns 是否注册成功
   */
  registerRule(rule: BusinessRule | BusinessRuleLike): boolean;

  /**
   * 注销业务规则
   * @param ruleName 规则名称
   * @returns 是否注销成功
   */
  unregisterRule(ruleName: string): boolean;

  /**
   * 获取业务规则
   * @param ruleName 规则名称
   * @returns 业务规则或undefined
   */
  getRule(ruleName: string): (BusinessRule | BusinessRuleLike) | undefined;

  /**
   * 获取所有业务规则
   * @returns 所有业务规则列表
   */
  getAllRules(): Array<BusinessRule | BusinessRuleLike>;

  /**
   * 获取启用的业务规则
   * @returns 启用的业务规则列表
   */
  getEnabledRules(): Array<BusinessRule | BusinessRuleLike>;

  /**
   * 获取禁用的业务规则
   * @returns 禁用的业务规则列表
   */
  getDisabledRules(): Array<BusinessRule | BusinessRuleLike>;

  /**
   * 获取指定类型的业务规则
   * @param ruleType 规则类型
   * @returns 指定类型的业务规则列表
   */
  getRulesByType(ruleType: string): Array<BusinessRule | BusinessRuleLike>;

  /**
   * 获取指定优先级的业务规则
   * @param priority 优先级
   * @returns 指定优先级的业务规则列表
   */
  getRulesByPriority(priority: number): Array<BusinessRule | BusinessRuleLike>;

  /**
   * 获取指定严重程度的业务规则
   * @param severity 严重程度
   * @returns 指定严重程度的业务规则列表
   */
  getRulesBySeverity(severity: string): Array<BusinessRule | BusinessRuleLike>;

  /**
   * 启用业务规则
   * @param ruleName 规则名称
   * @returns 是否启用成功
   */
  enableRule(ruleName: string): boolean;

  /**
   * 禁用业务规则
   * @param ruleName 规则名称
   * @returns 是否禁用成功
   */
  disableRule(ruleName: string): boolean;

  /**
   * 检查业务规则是否存在
   * @param ruleName 规则名称
   * @returns 是否存在
   */
  hasRule(ruleName: string): boolean;

  /**
   * 检查业务规则是否启用
   * @param ruleName 规则名称
   * @returns 是否启用
   */
  isRuleEnabled(ruleName: string): boolean;

  /**
   * 获取业务规则数量
   * @returns 业务规则数量
   */
  getRuleCount(): number;

  /**
   * 获取启用的业务规则数量
   * @returns 启用的业务规则数量
   */
  getEnabledRuleCount(): number;

  /**
   * 获取禁用的业务规则数量
   * @returns 禁用的业务规则数量
   */
  getDisabledRuleCount(): number;

  /**
   * 清空所有业务规则
   * @returns 清空的业务规则数量
   */
  clearRules(): number;

  /**
   * 验证实体
   * @param entity 要验证的实体
   * @param context 验证上下文
   * @returns 验证结果
   */
  validateEntity(
    entity: unknown,
    context?: BusinessRuleContext,
  ): BusinessRuleValidationResult;

  /**
   * 验证实体属性
   * @param entity 要验证的实体
   * @param propertyName 属性名称
   * @param context 验证上下文
   * @returns 验证结果
   */
  validateEntityProperty(
    entity: unknown,
    propertyName: string,
    context?: BusinessRuleContext,
  ): BusinessRuleValidationResult;

  /**
   * 验证实体集合
   * @param entities 要验证的实体集合
   * @param context 验证上下文
   * @returns 验证结果
   */
  validateEntityCollection(
    entities: unknown[],
    context?: BusinessRuleContext,
  ): BusinessRuleValidationResult;

  /**
   * 验证指定规则
   * @param ruleName 规则名称
   * @param value 要验证的值
   * @param context 验证上下文
   * @returns 验证结果
   */
  validateRule(
    ruleName: string,
    value: unknown,
    context?: BusinessRuleContext,
  ): BusinessRuleValidationResult;

  /**
   * 验证指定规则集合
   * @param ruleNames 规则名称集合
   * @param value 要验证的值
   * @param context 验证上下文
   * @returns 验证结果
   */
  validateRules(
    ruleNames: string[],
    value: unknown,
    context?: BusinessRuleContext,
  ): BusinessRuleValidationResult;

  /**
   * 验证所有规则
   * @param value 要验证的值
   * @param context 验证上下文
   * @returns 验证结果
   */
  validateAllRules(
    value: unknown,
    context?: BusinessRuleContext,
  ): BusinessRuleValidationResult;

  /**
   * 验证指定类型的规则
   * @param ruleType 规则类型
   * @param value 要验证的值
   * @param context 验证上下文
   * @returns 验证结果
   */
  validateRulesByType(
    ruleType: string,
    value: unknown,
    context?: BusinessRuleContext,
  ): BusinessRuleValidationResult;

  /**
   * 验证指定优先级的规则
   * @param priority 优先级
   * @param value 要验证的值
   * @param context 验证上下文
   * @returns 验证结果
   */
  validateRulesByPriority(
    priority: number,
    value: unknown,
    context?: BusinessRuleContext,
  ): BusinessRuleValidationResult;

  /**
   * 验证指定严重程度的规则
   * @param severity 严重程度
   * @param value 要验证的值
   * @param context 验证上下文
   * @returns 验证结果
   */
  validateRulesBySeverity(
    severity: string,
    value: unknown,
    context?: BusinessRuleContext,
  ): BusinessRuleValidationResult;

  /**
   * 获取验证统计信息
   * @returns 验证统计信息
   */
  getValidationStats(): BusinessRuleValidationStats;

  /**
   * 重置验证统计信息
   * @returns 是否重置成功
   */
  resetValidationStats(): boolean;

  /**
   * 导出业务规则配置
   * @returns 业务规则配置
   */
  exportConfiguration(): BusinessRuleConfiguration;

  /**
   * 导入业务规则配置
   * @param configuration 业务规则配置
   * @returns 是否导入成功
   */
  importConfiguration(configuration: BusinessRuleConfiguration): boolean;

  /**
   * 转换为JSON格式
   * @returns JSON格式的业务规则管理器
   */
  toJSON(): BusinessRuleManagerJSON;
}

/**
 * 业务规则验证统计信息
 * @description 提供业务规则验证的统计信息
 */
export interface BusinessRuleValidationStats {
  /**
   * 总验证次数
   */
  readonly totalValidations: number;

  /**
   * 成功验证次数
   */
  readonly successfulValidations: number;

  /**
   * 失败验证次数
   */
  readonly failedValidations: number;

  /**
   * 警告验证次数
   */
  readonly warningValidations: number;

  /**
   * 信息验证次数
   */
  readonly infoValidations: number;

  /**
   * 平均验证时间（毫秒）
   */
  readonly averageValidationTime: number;

  /**
   * 最长验证时间（毫秒）
   */
  readonly maxValidationTime: number;

  /**
   * 最短验证时间（毫秒）
   */
  readonly minValidationTime: number;

  /**
   * 规则执行统计
   */
  readonly ruleExecutionStats: Record<
    string,
    {
      executionCount: number;
      successCount: number;
      failureCount: number;
      averageTime: number;
    }
  >;

  /**
   * 严重程度统计
   */
  readonly severityStats: Record<string, number>;

  /**
   * 规则类型统计
   */
  readonly ruleTypeStats: Record<string, number>;

  /**
   * 最后验证时间
   */
  readonly lastValidationTime?: Date;

  /**
   * 重置统计信息
   * @returns 是否重置成功
   */
  reset(): boolean;

  /**
   * 更新验证统计
   * @param validationResult 验证结果
   * @param executionTime 执行时间
   * @returns 是否更新成功
   */
  updateStats(
    validationResult: BusinessRuleValidationResult,
    executionTime: number,
  ): boolean;

  /**
   * 转换为JSON格式
   * @returns JSON格式的验证统计信息
   */
  toJSON(): BusinessRuleValidationStatsJSON;
}

/**
 * 业务规则配置
 * @description 提供业务规则的配置信息
 */
export interface BusinessRuleConfiguration {
  /**
   * 规则配置列表
   */
  readonly rules: BusinessRuleConfigurationItem[];

  /**
   * 全局配置
   */
  readonly globalConfig: {
    readonly enableValidation: boolean;
    readonly enableWarnings: boolean;
    readonly enableInfo: boolean;
    readonly maxViolations: number;
    readonly validationTimeout: number;
  };

  /**
   * 版本信息
   */
  readonly version: string;

  /**
   * 创建时间
   */
  readonly createdAt: Date;

  /**
   * 更新时间
   */
  readonly updatedAt: Date;

  /**
   * 转换为JSON格式
   * @returns JSON格式的业务规则配置
   */
  toJSON(): BusinessRuleConfigurationJSON;
}

/**
 * 业务规则配置项
 * @description 提供单个业务规则的配置信息
 */
export interface BusinessRuleConfigurationItem {
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
   * 转换为JSON格式
   * @returns JSON格式的业务规则配置项
   */
  toJSON(): BusinessRuleConfigurationItemJSON;
}

/**
 * 业务规则管理器JSON格式
 * @description 提供业务规则管理器的JSON表示
 */
export interface BusinessRuleManagerJSON {
  /**
   * 规则数量
   */
  readonly ruleCount: number;

  /**
   * 启用的规则数量
   */
  readonly enabledRuleCount: number;

  /**
   * 禁用的规则数量
   */
  readonly disabledRuleCount: number;

  /**
   * 规则列表
   */
  readonly rules: Array<{
    name: string;
    type: string;
    description: string;
    priority: number;
    enabled: boolean;
  }>;

  /**
   * 验证统计信息
   */
  readonly validationStats: BusinessRuleValidationStatsJSON;

  /**
   * 配置信息
   */
  readonly configuration: BusinessRuleConfigurationJSON;
}

/**
 * 业务规则验证统计信息JSON格式
 * @description 提供业务规则验证统计信息的JSON表示
 */
export interface BusinessRuleValidationStatsJSON {
  /**
   * 总验证次数
   */
  readonly totalValidations: number;

  /**
   * 成功验证次数
   */
  readonly successfulValidations: number;

  /**
   * 失败验证次数
   */
  readonly failedValidations: number;

  /**
   * 警告验证次数
   */
  readonly warningValidations: number;

  /**
   * 信息验证次数
   */
  readonly infoValidations: number;

  /**
   * 平均验证时间（毫秒）
   */
  readonly averageValidationTime: number;

  /**
   * 最长验证时间（毫秒）
   */
  readonly maxValidationTime: number;

  /**
   * 最短验证时间（毫秒）
   */
  readonly minValidationTime: number;

  /**
   * 规则执行统计
   */
  readonly ruleExecutionStats: Record<
    string,
    {
      executionCount: number;
      successCount: number;
      failureCount: number;
      averageTime: number;
    }
  >;

  /**
   * 严重程度统计
   */
  readonly severityStats: Record<string, number>;

  /**
   * 规则类型统计
   */
  readonly ruleTypeStats: Record<string, number>;

  /**
   * 最后验证时间
   */
  readonly lastValidationTime?: string;
}

/**
 * 业务规则配置JSON格式
 * @description 提供业务规则配置的JSON表示
 */
export interface BusinessRuleConfigurationJSON {
  /**
   * 规则配置列表
   */
  readonly rules: BusinessRuleConfigurationItemJSON[];

  /**
   * 全局配置
   */
  readonly globalConfig: {
    readonly enableValidation: boolean;
    readonly enableWarnings: boolean;
    readonly enableInfo: boolean;
    readonly maxViolations: number;
    readonly validationTimeout: number;
  };

  /**
   * 版本信息
   */
  readonly version: string;

  /**
   * 创建时间
   */
  readonly createdAt: string;

  /**
   * 更新时间
   */
  readonly updatedAt: string;
}

/**
 * 业务规则配置项JSON格式
 * @description 提供业务规则配置项的JSON表示
 */
export interface BusinessRuleConfigurationItemJSON {
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
}
