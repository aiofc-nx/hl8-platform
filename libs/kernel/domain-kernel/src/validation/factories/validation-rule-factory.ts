/**
 * @fileoverview 验证规则工厂实现
 * @description 提供验证规则工厂的具体实现和功能
 */

import type {
  ValidationRuleFactory as IValidationRuleFactory,
  ValidationRuleFactoryConfig,
  ValidationRuleFactoryBuilder as IValidationRuleFactoryBuilder,
} from "./validation-rule-factory.interface.js";
import type {
  ValidationRule,
  ValidationRuleConfig,
  RuleCreator,
} from "../rules/validation-rule.interface.js";
import { ValidationRuleFactoryException } from "../../exceptions/validation-exceptions.js";

/**
 * 验证规则工厂实现类
 * @description 提供验证规则工厂的完整实现
 */
export class ValidationRuleFactory<T = unknown>
  implements IValidationRuleFactory<T>
{
  private readonly ruleCreators: Map<string, RuleCreator<T>> = new Map();
  private readonly ruleCache: Map<string, ValidationRule<T>> = new Map();
  private readonly config: ValidationRuleFactoryConfig;

  /**
   * 创建验证规则工厂
   * @param config 工厂配置
   */
  constructor(config: ValidationRuleFactoryConfig = {}) {
    this.config = {
      enableDefaultRuleTypes: true,
      strictMode: false,
      defaultPriority: 100,
      enableRuleCache: false,
      maxCacheSize: 1000,
      customRuleTypes: {},
      ...config,
    };

    // 注册自定义规则类型
    if (this.config.customRuleTypes) {
      for (const [type, creator] of Object.entries(
        this.config.customRuleTypes,
      )) {
        this.registerRuleType(type, creator);
      }
    }

    // 注册默认规则类型
    if (this.config.enableDefaultRuleTypes) {
      this.registerDefaultRuleTypes();
    }
  }

  /**
   * 创建验证规则
   * @param config 规则配置
   * @returns 验证规则实例
   */
  public createRule(config: ValidationRuleConfig): ValidationRule<T> {
    try {
      // 验证配置
      this.validateRuleConfig(config);

      // 检查缓存
      const cacheKey = this.getCacheKey(config);
      if (this.config.enableRuleCache && this.ruleCache.has(cacheKey)) {
        return this.ruleCache.get(cacheKey)!;
      }

      // 获取规则创建函数
      const creator = this.getRuleCreator(config.type);
      if (!creator) {
        throw new ValidationRuleFactoryException(
          config.type,
          `Unsupported rule type: ${config.type}`,
        );
      }

      // 创建规则
      const rule = creator(config);

      // 缓存规则
      if (this.config.enableRuleCache) {
        this.cacheRule(cacheKey, rule);
      }

      return rule;
    } catch (error) {
      throw new ValidationRuleFactoryException(
        config.type,
        `Failed to create rule: ${error instanceof Error ? error.message : String(error)}`,
        { originalError: error, config },
      );
    }
  }

  /**
   * 创建多个验证规则
   * @param configs 规则配置数组
   * @returns 验证规则实例数组
   */
  public createRules(configs: ValidationRuleConfig[]): ValidationRule<T>[] {
    return configs.map((config) => this.createRule(config));
  }

  /**
   * 注册规则类型
   * @param type 规则类型
   * @param creator 规则创建函数
   */
  public registerRuleType(type: string, creator: RuleCreator<T>): void {
    if (!type || typeof creator !== "function") {
      throw new ValidationRuleFactoryException(
        type,
        "Invalid rule type or creator function",
      );
    }

    this.ruleCreators.set(type, creator);
  }

  /**
   * 获取支持的规则类型
   * @returns 支持的规则类型列表
   */
  public getSupportedRuleTypes(): string[] {
    return Array.from(this.ruleCreators.keys());
  }

  /**
   * 检查是否支持规则类型
   * @param type 规则类型
   * @returns 是否支持该类型
   */
  public supportsRuleType(type: string): boolean {
    return this.ruleCreators.has(type);
  }

  /**
   * 获取规则创建函数
   * @param type 规则类型
   * @returns 规则创建函数，如果不存在则返回undefined
   */
  public getRuleCreator(type: string): RuleCreator<T> | undefined {
    return this.ruleCreators.get(type);
  }

  /**
   * 取消注册规则类型
   * @param type 规则类型
   * @returns 是否成功取消注册
   */
  public unregisterRuleType(type: string): boolean {
    return this.ruleCreators.delete(type);
  }

  /**
   * 清空所有注册的规则类型
   */
  public clearRuleTypes(): void {
    this.ruleCreators.clear();
    this.ruleCache.clear();
  }

  /**
   * 获取规则类型数量
   * @returns 注册的规则类型数量
   */
  public getRuleTypeCount(): number {
    return this.ruleCreators.size;
  }

  /**
   * 验证规则配置
   * @param config 规则配置
   */
  private validateRuleConfig(config: ValidationRuleConfig): void {
    if (!config) {
      throw new ValidationRuleFactoryException(
        "unknown",
        "Rule config is required",
      );
    }

    if (!config.type) {
      throw new ValidationRuleFactoryException(
        "unknown",
        "Rule type is required",
      );
    }

    if (!config.name) {
      throw new ValidationRuleFactoryException(
        config.type,
        "Rule name is required",
      );
    }

    if (this.config.strictMode) {
      if (typeof config.priority !== "number" || config.priority < 0) {
        throw new ValidationRuleFactoryException(
          config.type,
          "Rule priority must be a non-negative number in strict mode",
        );
      }

      if (typeof config.enabled !== "boolean") {
        throw new ValidationRuleFactoryException(
          config.type,
          "Rule enabled must be a boolean in strict mode",
        );
      }
    }
  }

  /**
   * 获取缓存键
   * @param config 规则配置
   * @returns 缓存键
   */
  private getCacheKey(config: ValidationRuleConfig): string {
    return JSON.stringify({
      type: config.type,
      name: config.name,
      priority: config.priority,
      enabled: config.enabled,
      parameters: config.parameters,
      options: config.options,
    });
  }

  /**
   * 缓存规则
   * @param key 缓存键
   * @param rule 规则实例
   */
  private cacheRule(key: string, rule: ValidationRule<T>): void {
    if (this.ruleCache.size >= (this.config.maxCacheSize ?? 1000)) {
      // 移除最旧的缓存项
      const firstKey = this.ruleCache.keys().next().value;
      this.ruleCache.delete(firstKey);
    }

    this.ruleCache.set(key, rule);
  }

  /**
   * 注册默认规则类型
   */
  private registerDefaultRuleTypes(): void {
    // 这里可以注册一些默认的规则类型
    // 例如：字符串规则、数字规则、邮箱规则等
    // 具体实现可以根据需要添加
  }

  /**
   * 创建验证规则工厂
   * @param config 工厂配置
   * @returns 验证规则工厂实例
   */
  public static create<T = unknown>(
    config?: ValidationRuleFactoryConfig,
  ): ValidationRuleFactory<T> {
    return new ValidationRuleFactory<T>(config);
  }

  /**
   * 创建默认工厂
   * @returns 默认配置的验证规则工厂实例
   */
  public static createDefault<T = unknown>(): ValidationRuleFactory<T> {
    return new ValidationRuleFactory<T>({
      enableDefaultRuleTypes: true,
      strictMode: false,
      enableRuleCache: true,
    });
  }

  /**
   * 创建严格模式工厂
   * @returns 严格模式的验证规则工厂实例
   */
  public static createStrict<T = unknown>(): ValidationRuleFactory<T> {
    return new ValidationRuleFactory<T>({
      enableDefaultRuleTypes: true,
      strictMode: true,
      enableRuleCache: false,
    });
  }

  /**
   * 创建工厂构建器
   * @returns 工厂构建器实例
   */
  public static builder<T = unknown>(): IValidationRuleFactoryBuilder<T> {
    return new ValidationRuleFactoryBuilderImpl<T>();
  }
}

/**
 * 验证规则工厂构建器
 * @description 用于构建验证规则工厂的构建器类
 */
export class ValidationRuleFactoryBuilderImpl<T = unknown>
  implements IValidationRuleFactoryBuilder<T>
{
  private config: ValidationRuleFactoryConfig = {};
  private ruleTypes: Record<string, RuleCreator<T>> = {};

  /**
   * 设置配置
   * @param config 工厂配置
   * @returns 构建器实例
   */
  public setConfig(
    config: ValidationRuleFactoryConfig,
  ): IValidationRuleFactoryBuilder<T> {
    this.config = { ...this.config, ...config };
    return this;
  }

  /**
   * 注册规则类型
   * @param type 规则类型
   * @param creator 规则创建函数
   * @returns 构建器实例
   */
  public registerRuleType(
    type: string,
    creator: RuleCreator<T>,
  ): IValidationRuleFactoryBuilder<T> {
    this.ruleTypes[type] = creator;
    return this;
  }

  /**
   * 注册多个规则类型
   * @param ruleTypes 规则类型映射
   * @returns 构建器实例
   */
  public registerRuleTypes(
    ruleTypes: Record<string, RuleCreator<T>>,
  ): IValidationRuleFactoryBuilder<T> {
    Object.assign(this.ruleTypes, ruleTypes);
    return this;
  }

  /**
   * 启用默认规则类型
   * @returns 构建器实例
   */
  public enableDefaultRuleTypes(): IValidationRuleFactoryBuilder<T> {
    this.config.enableDefaultRuleTypes = true;
    return this;
  }

  /**
   * 禁用默认规则类型
   * @returns 构建器实例
   */
  public disableDefaultRuleTypes(): IValidationRuleFactoryBuilder<T> {
    this.config.enableDefaultRuleTypes = false;
    return this;
  }

  /**
   * 启用严格模式
   * @returns 构建器实例
   */
  public enableStrictMode(): IValidationRuleFactoryBuilder<T> {
    this.config.strictMode = true;
    return this;
  }

  /**
   * 禁用严格模式
   * @returns 构建器实例
   */
  public disableStrictMode(): IValidationRuleFactoryBuilder<T> {
    this.config.strictMode = false;
    return this;
  }

  /**
   * 启用规则缓存
   * @param maxSize 最大缓存大小
   * @returns 构建器实例
   */
  public enableRuleCache(maxSize?: number): IValidationRuleFactoryBuilder<T> {
    this.config.enableRuleCache = true;
    if (maxSize !== undefined) {
      this.config.maxCacheSize = maxSize;
    }
    return this;
  }

  /**
   * 禁用规则缓存
   * @returns 构建器实例
   */
  public disableRuleCache(): IValidationRuleFactoryBuilder<T> {
    this.config.enableRuleCache = false;
    return this;
  }

  /**
   * 构建工厂
   * @returns 验证规则工厂实例
   */
  public build(): ValidationRuleFactory<T> {
    const finalConfig = {
      ...this.config,
      customRuleTypes: { ...this.ruleTypes },
    };

    return new ValidationRuleFactory<T>(finalConfig);
  }

  /**
   * 重置构建器
   * @returns 构建器实例
   */
  public reset(): IValidationRuleFactoryBuilder<T> {
    this.config = {};
    this.ruleTypes = {};
    return this;
  }
}
