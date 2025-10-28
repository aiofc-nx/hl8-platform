/**
 * @fileoverview 验证规则工厂接口
 * @description 定义验证规则工厂的基本契约和功能
 */

import type {
  ValidationRule,
  ValidationRuleConfig,
  RuleCreator,
} from "../rules/validation-rule.interface.js";

/**
 * 验证规则工厂接口
 * @description 定义创建验证规则的工厂契约
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

  /**
   * 检查是否支持规则类型
   * @param type 规则类型
   * @returns 是否支持该类型
   */
  supportsRuleType(type: string): boolean;

  /**
   * 获取规则创建函数
   * @param type 规则类型
   * @returns 规则创建函数，如果不存在则返回undefined
   */
  getRuleCreator(type: string): RuleCreator<T> | undefined;

  /**
   * 取消注册规则类型
   * @param type 规则类型
   * @returns 是否成功取消注册
   */
  unregisterRuleType(type: string): boolean;

  /**
   * 清空所有注册的规则类型
   */
  clearRuleTypes(): void;

  /**
   * 获取规则类型数量
   * @returns 注册的规则类型数量
   */
  getRuleTypeCount(): number;
}

/**
 * 验证规则工厂配置接口
 * @description 定义验证规则工厂的配置选项
 */
export interface ValidationRuleFactoryConfig {
  /**
   * 是否启用默认规则类型
   * @description 是否自动注册默认的规则类型
   */
  enableDefaultRuleTypes?: boolean;

  /**
   * 是否启用严格模式
   * @description 在严格模式下，创建规则时会进行更严格的验证
   */
  strictMode?: boolean;

  /**
   * 默认规则优先级
   * @description 创建规则时的默认优先级
   */
  defaultPriority?: number;

  /**
   * 是否启用规则缓存
   * @description 是否缓存已创建的规则实例
   */
  enableRuleCache?: boolean;

  /**
   * 缓存大小限制
   * @description 规则缓存的最大大小
   */
  maxCacheSize?: number;

  /**
   * 自定义规则类型映射
   * @description 自定义规则类型到创建函数的映射
   */
  customRuleTypes?: Record<string, RuleCreator<unknown>>;
}

/**
 * 验证规则工厂构建器接口
 * @description 用于构建验证规则工厂的构建器接口
 */
export interface ValidationRuleFactoryBuilder<T = unknown> {
  /**
   * 设置配置
   * @param config 工厂配置
   * @returns 构建器实例
   */
  setConfig(
    config: ValidationRuleFactoryConfig,
  ): ValidationRuleFactoryBuilder<T>;

  /**
   * 注册规则类型
   * @param type 规则类型
   * @param creator 规则创建函数
   * @returns 构建器实例
   */
  registerRuleType(
    type: string,
    creator: RuleCreator<T>,
  ): ValidationRuleFactoryBuilder<T>;

  /**
   * 注册多个规则类型
   * @param ruleTypes 规则类型映射
   * @returns 构建器实例
   */
  registerRuleTypes(
    ruleTypes: Record<string, RuleCreator<T>>,
  ): ValidationRuleFactoryBuilder<T>;

  /**
   * 启用默认规则类型
   * @returns 构建器实例
   */
  enableDefaultRuleTypes(): ValidationRuleFactoryBuilder<T>;

  /**
   * 禁用默认规则类型
   * @returns 构建器实例
   */
  disableDefaultRuleTypes(): ValidationRuleFactoryBuilder<T>;

  /**
   * 启用严格模式
   * @returns 构建器实例
   */
  enableStrictMode(): ValidationRuleFactoryBuilder<T>;

  /**
   * 禁用严格模式
   * @returns 构建器实例
   */
  disableStrictMode(): ValidationRuleFactoryBuilder<T>;

  /**
   * 启用规则缓存
   * @param maxSize 最大缓存大小
   * @returns 构建器实例
   */
  enableRuleCache(maxSize?: number): ValidationRuleFactoryBuilder<T>;

  /**
   * 禁用规则缓存
   * @returns 构建器实例
   */
  disableRuleCache(): ValidationRuleFactoryBuilder<T>;

  /**
   * 构建工厂
   * @returns 验证规则工厂实例
   */
  build(): ValidationRuleFactory<T>;

  /**
   * 重置构建器
   * @returns 构建器实例
   */
  reset(): ValidationRuleFactoryBuilder<T>;
}
