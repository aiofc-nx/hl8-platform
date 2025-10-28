/**
 * @fileoverview 业务规则管理器实现
 * @description 提供业务规则管理器的完整实现
 */

import type {
  BusinessRuleManager as IBusinessRuleManager,
  BusinessRuleValidationStats,
  BusinessRuleConfiguration,
  BusinessRuleConfigurationItem,
  BusinessRuleManagerJSON,
  BusinessRuleValidationStatsJSON,
  BusinessRuleConfigurationJSON,
  BusinessRuleConfigurationItemJSON,
} from "./business-rule-manager.interface.js";
import type {
  BusinessRule,
  BusinessRuleContext,
} from "./business-rule.interface.js";
import type { BusinessRuleValidationResult } from "./business-rule-validation-result.interface.js";
import type { BusinessRuleViolation } from "./business-rule-violation.interface.js";
import { BusinessRuleViolation as BusinessRuleViolationImpl } from "./business-rule-violation.js";
import { BusinessRuleSeverity } from "./business-rule.interface.js";
import { BusinessRuleManagerException } from "../exceptions/business-rule-exceptions.js";
import { BusinessRuleValidationResult as BusinessRuleValidationResultImpl } from "./business-rule-validation-result.js";

/**
 * 业务规则管理器实现类
 * @description 提供业务规则管理器的完整实现
 */
export class BusinessRuleManager implements IBusinessRuleManager {
  private rules: Map<
    string,
    | BusinessRule
    | {
        name: string;
        description: string;
        priority: number;
        enabled: boolean;
        validate: (
          entity: unknown,
          context?: BusinessRuleContext,
        ) => BusinessRuleValidationResult;
      }
  > = new Map();
  private validationStats: BusinessRuleValidationStatsImpl =
    new BusinessRuleValidationStatsImpl();

  // 业务规则层级直接使用 BusinessRuleLevel，无需从验证模块转换
  private globalConfig: {
    enableValidation: boolean;
    enableWarnings: boolean;
    enableInfo: boolean;
    maxViolations: number;
    validationTimeout: number;
  } = {
    enableValidation: true,
    enableWarnings: true,
    enableInfo: true,
    maxViolations: 100,
    validationTimeout: 5000,
  };

  /**
   * 注册业务规则
   * @param rule 业务规则
   * @returns 是否注册成功
   */
  public registerRule(
    rule:
      | BusinessRule
      | {
          name: string;
          description: string;
          priority: number;
          enabled: boolean;
          validate: (
            entity: unknown,
            context?: BusinessRuleContext,
          ) => BusinessRuleValidationResult;
        },
  ): boolean {
    try {
      if (this.rules.has(rule.name)) {
        throw new Error(`Rule with name '${rule.name}' already exists`);
      }

      this.rules.set(rule.name, rule);
      return true;
    } catch (error) {
      throw new BusinessRuleManagerException(
        `Failed to register rule '${rule.name}': ${error instanceof Error ? error.message : String(error)}`,
        { ruleName: rule.name, originalError: error },
      );
    }
  }

  /**
   * 注销业务规则
   * @param ruleName 规则名称
   * @returns 是否注销成功
   */
  public unregisterRule(ruleName: string): boolean {
    try {
      if (!this.rules.has(ruleName)) {
        return false;
      }

      this.rules.delete(ruleName);
      return true;
    } catch (error) {
      throw new BusinessRuleManagerException(
        `Failed to unregister rule '${ruleName}': ${error instanceof Error ? error.message : String(error)}`,
        { ruleName, originalError: error },
      );
    }
  }

  /**
   * 获取业务规则
   * @param ruleName 规则名称
   * @returns 业务规则或undefined
   */
  public getRule(ruleName: string):
    | (
        | BusinessRule
        | {
            name: string;
            description: string;
            priority: number;
            enabled: boolean;
            validate: (
              entity: unknown,
              context?: BusinessRuleContext,
            ) => BusinessRuleValidationResult;
          }
      )
    | undefined {
    return this.rules.get(ruleName);
  }

  /**
   * 获取所有业务规则
   * @returns 所有业务规则列表
   */
  public getAllRules(): Array<
    | BusinessRule
    | {
        name: string;
        description: string;
        priority: number;
        enabled: boolean;
        validate: (
          entity: unknown,
          context?: BusinessRuleContext,
        ) => BusinessRuleValidationResult;
      }
  > {
    return Array.from(this.rules.values());
  }

  /**
   * 获取启用的业务规则
   * @returns 启用的业务规则列表
   */
  public getEnabledRules(): Array<
    | BusinessRule
    | {
        name: string;
        description: string;
        priority: number;
        enabled: boolean;
        validate: (
          entity: unknown,
          context?: BusinessRuleContext,
        ) => BusinessRuleValidationResult;
      }
  > {
    return Array.from(this.rules.values()).filter((rule) => rule.enabled);
  }

  /**
   * 获取禁用的业务规则
   * @returns 禁用的业务规则列表
   */
  public getDisabledRules(): Array<
    | BusinessRule
    | {
        name: string;
        description: string;
        priority: number;
        enabled: boolean;
        validate: (
          entity: unknown,
          context?: BusinessRuleContext,
        ) => BusinessRuleValidationResult;
      }
  > {
    return Array.from(this.rules.values()).filter((rule) => !rule.enabled);
  }

  /**
   * 获取指定类型的业务规则
   * @param ruleType 规则类型
   * @returns 指定类型的业务规则列表
   */
  public getRulesByType(ruleType: string): Array<
    | BusinessRule
    | {
        name: string;
        description: string;
        priority: number;
        enabled: boolean;
        validate: (
          entity: unknown,
          context?: BusinessRuleContext,
        ) => BusinessRuleValidationResult;
      }
  > {
    return Array.from(this.rules.values()).filter(
      (rule) =>
        (rule as BusinessRule & { ruleType?: string }).ruleType === ruleType,
    );
  }

  /**
   * 获取指定优先级的业务规则
   * @param priority 优先级
   * @returns 指定优先级的业务规则列表
   */
  public getRulesByPriority(priority: number): Array<
    | BusinessRule
    | {
        name: string;
        description: string;
        priority: number;
        enabled: boolean;
        validate: (
          entity: unknown,
          context?: BusinessRuleContext,
        ) => BusinessRuleValidationResult;
      }
  > {
    return Array.from(this.rules.values()).filter(
      (rule) => rule.priority === priority,
    );
  }

  /**
   * 获取指定严重程度的业务规则
   * @param severity 严重程度
   * @returns 指定严重程度的业务规则列表
   */
  public getRulesBySeverity(severity: string): Array<
    | BusinessRule
    | {
        name: string;
        description: string;
        priority: number;
        enabled: boolean;
        validate: (
          entity: unknown,
          context?: BusinessRuleContext,
        ) => BusinessRuleValidationResult;
      }
  > {
    return Array.from(this.rules.values()).filter(
      (rule) =>
        (rule as BusinessRule & { severity?: string }).severity === severity,
    );
  }

  /**
   * 启用业务规则
   * @param ruleName 规则名称
   * @returns 是否启用成功
   */
  public enableRule(ruleName: string): boolean {
    const rule = this.rules.get(ruleName);
    if (!rule) {
      return false;
    }

    if (rule.enabled) {
      return true; // 已经启用
    }

    // 检查规则是否有 enable 方法
    if ("enable" in rule && typeof rule.enable === "function") {
      rule.enable();
      // this.emitRuleStateChanged(ruleName, true);
      return true;
    }

    return false; // 规则不支持动态启用
  }

  /**
   * 禁用业务规则
   * @param ruleName 规则名称
   * @returns 是否禁用成功
   */
  public disableRule(ruleName: string): boolean {
    const rule = this.rules.get(ruleName);
    if (!rule) {
      return false;
    }

    if (!rule.enabled) {
      return true; // 已经禁用
    }

    // 检查规则是否有 disable 方法
    if ("disable" in rule && typeof rule.disable === "function") {
      rule.disable();
      // this.emitRuleStateChanged(ruleName, false);
      return true;
    }

    return false; // 规则不支持动态禁用
  }

  /**
   * 检查业务规则是否存在
   * @param ruleName 规则名称
   * @returns 是否存在
   */
  public hasRule(ruleName: string): boolean {
    return this.rules.has(ruleName);
  }

  /**
   * 检查业务规则是否启用
   * @param ruleName 规则名称
   * @returns 是否启用
   */
  public isRuleEnabled(ruleName: string): boolean {
    const rule = this.rules.get(ruleName);
    return rule ? rule.enabled : false;
  }

  /**
   * 获取业务规则数量
   * @returns 业务规则数量
   */
  public getRuleCount(): number {
    return this.rules.size;
  }

  /**
   * 获取启用的业务规则数量
   * @returns 启用的业务规则数量
   */
  public getEnabledRuleCount(): number {
    return this.getEnabledRules().length;
  }

  /**
   * 获取禁用的业务规则数量
   * @returns 禁用的业务规则数量
   */
  public getDisabledRuleCount(): number {
    return this.getDisabledRules().length;
  }

  /**
   * 清空所有业务规则
   * @returns 清空的业务规则数量
   */
  public clearRules(): number {
    const count = this.rules.size;
    this.rules.clear();
    return count;
  }

  /**
   * 验证实体
   * @param entity 要验证的实体
   * @param context 验证上下文
   * @returns 验证结果
   */
  public validateEntity(
    entity: unknown,
    context?: BusinessRuleContext,
  ): BusinessRuleValidationResult {
    const startTime = Date.now();

    try {
      if (!this.globalConfig.enableValidation) {
        return BusinessRuleValidationResultImpl.success(
          context?.entityType ?? "Unknown",
          context?.entityId ?? "Unknown",
          { executionTime: 0, rulesExecuted: 0, entitiesValidated: 1 },
        );
      }

      const enabledRules = this.getEnabledRules();
      const violations: BusinessRuleViolation[] = [];
      const warnings: BusinessRuleViolation[] = [];
      const info: BusinessRuleViolation[] = [];

      for (const rule of enabledRules) {
        try {
          console.log(`Validating with rule: ${rule.name}`);
          const result = rule.validate(entity, context);

          // 收集违规（无论验证是否成功）
          for (const violation of result.violations) {
            if (
              violation.severity === BusinessRuleSeverity.ERROR ||
              violation.severity === BusinessRuleSeverity.CRITICAL
            ) {
              violations.push(violation);
            } else if (violation.severity === BusinessRuleSeverity.WARNING) {
              warnings.push(violation);
            } else if (violation.severity === BusinessRuleSeverity.INFO) {
              info.push(violation);
            }
          }

          // 收集警告和信息（无论验证是否成功）
          for (const warning of result.warnings) {
            warnings.push(warning);
          }
          for (const infoItem of result.info) {
            info.push(infoItem);
          }
        } catch (error) {
          // 规则执行失败，记录为错误
          violations.push(
            new BusinessRuleViolationImpl({
              message: `Rule execution failed: ${error instanceof Error ? error.message : String(error)}`,
              code: "RULE_EXECUTION_ERROR",
              ruleName: rule.name,
              severity: BusinessRuleSeverity.ERROR,
              timestamp: new Date(),
              details: { originalError: error },
            }),
          );
        }
      }

      const executionTime = Date.now() - startTime;
      const isValid = violations.length === 0;

      const result = isValid
        ? BusinessRuleValidationResultImpl.success(
            context?.entityType ?? "Unknown",
            context?.entityId ?? "Unknown",
            {
              executionTime,
              rulesExecuted: enabledRules.length,
              entitiesValidated: 1,
            },
          )
        : BusinessRuleValidationResultImpl.failure(
            context?.entityType ?? "Unknown",
            context?.entityId ?? "Unknown",
            violations,
            {
              warnings,
              info,
              executionTime,
              rulesExecuted: enabledRules.length,
              entitiesValidated: 1,
            },
          );

      // 更新统计信息
      this.validationStats.updateStats(result, executionTime);

      return result;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      throw new BusinessRuleManagerException(
        `Entity validation failed: ${error instanceof Error ? error.message : String(error)}`,
        { originalError: error, executionTime },
      );
    }
  }

  /**
   * 验证实体属性
   * @param entity 要验证的实体
   * @param propertyName 属性名称
   * @param context 验证上下文
   * @returns 验证结果
   */
  public validateEntityProperty(
    entity: unknown,
    propertyName: string,
    context?: BusinessRuleContext,
  ): BusinessRuleValidationResult {
    const propertyContext: BusinessRuleContext = {
      ...context,
      fieldName: propertyName,
      entityType: context?.entityType ?? "Unknown",
      entityId: context?.entityId ?? "Unknown",
    };

    return this.validateEntity(entity, propertyContext);
  }

  /**
   * 验证实体集合
   * @param entities 要验证的实体集合
   * @param context 验证上下文
   * @returns 验证结果
   */
  public validateEntityCollection(
    entities: unknown[],
    context?: BusinessRuleContext,
  ): BusinessRuleValidationResult {
    const startTime = Date.now();

    try {
      if (!this.globalConfig.enableValidation) {
        return BusinessRuleValidationResultImpl.success(
          context?.entityType ?? "Collection",
          context?.entityId ?? "Unknown",
          {
            executionTime: 0,
            rulesExecuted: 0,
            entitiesValidated: entities.length,
          },
        );
      }

      const allViolations: BusinessRuleViolation[] = [];
      const allWarnings: BusinessRuleViolation[] = [];
      const allInfo: BusinessRuleViolation[] = [];
      let totalRulesExecuted = 0;

      for (let i = 0; i < entities.length; i++) {
        const entity = entities[i];
        const entityContext: BusinessRuleContext = {
          ...context,
          entityType: context?.entityType ?? "Unknown",
          entityId: context?.entityId ?? `Entity_${i}`,
        };

        const result = this.validateEntity(entity, entityContext);
        totalRulesExecuted += result.rulesExecuted;

        allViolations.push(...result.violations);
        allWarnings.push(...result.warnings);
        allInfo.push(...result.info);
      }

      const executionTime = Date.now() - startTime;
      const isValid = allViolations.length === 0;

      const result = isValid
        ? BusinessRuleValidationResultImpl.success(
            context?.entityType ?? "Collection",
            context?.entityId ?? "Unknown",
            {
              executionTime,
              rulesExecuted: totalRulesExecuted,
              entitiesValidated: entities.length,
            },
          )
        : BusinessRuleValidationResultImpl.failure(
            context?.entityType ?? "Collection",
            context?.entityId ?? "Unknown",
            allViolations,
            {
              warnings: allWarnings,
              info: allInfo,
              executionTime,
              rulesExecuted: totalRulesExecuted,
              entitiesValidated: entities.length,
            },
          );

      // 更新统计信息
      this.validationStats.updateStats(result, executionTime);

      return result;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      throw new BusinessRuleManagerException(
        `Entity collection validation failed: ${error instanceof Error ? error.message : String(error)}`,
        { originalError: error, executionTime },
      );
    }
  }

  /**
   * 验证指定规则
   * @param ruleName 规则名称
   * @param value 要验证的值
   * @param context 验证上下文
   * @returns 验证结果
   */
  public validateRule(
    ruleName: string,
    value: unknown,
    context?: BusinessRuleContext,
  ): BusinessRuleValidationResult {
    const startTime = Date.now();

    try {
      const rule = this.rules.get(ruleName);
      if (!rule) {
        throw new Error(`Rule '${ruleName}' not found`);
      }

      if (!rule.enabled) {
        return BusinessRuleValidationResultImpl.success(
          context?.entityType ?? "Unknown",
          context?.entityId ?? "Unknown",
          { executionTime: 0, rulesExecuted: 0, entitiesValidated: 1 },
        );
      }

      const result = rule.validate(value, context);
      const executionTime = Date.now() - startTime;

      // 更新统计信息
      this.validationStats.updateStats(result, executionTime);

      return result;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      throw new BusinessRuleManagerException(
        `Rule validation failed for '${ruleName}': ${error instanceof Error ? error.message : String(error)}`,
        { ruleName, originalError: error, executionTime },
      );
    }
  }

  /**
   * 验证指定规则集合
   * @param ruleNames 规则名称集合
   * @param value 要验证的值
   * @param context 验证上下文
   * @returns 验证结果
   */
  public validateRules(
    ruleNames: string[],
    value: unknown,
    context?: BusinessRuleContext,
  ): BusinessRuleValidationResult {
    const startTime = Date.now();

    try {
      const violations: BusinessRuleViolation[] = [];
      const warnings: BusinessRuleViolation[] = [];
      const info: BusinessRuleViolation[] = [];
      let rulesExecuted = 0;

      for (const ruleName of ruleNames) {
        const rule = this.rules.get(ruleName);
        if (!rule || !rule.enabled) {
          continue;
        }

        try {
          const result = rule.validate(value, context);
          rulesExecuted++;

          // 收集违规（无论验证是否成功）
          for (const violation of result.violations) {
            if (
              violation.severity === BusinessRuleSeverity.ERROR ||
              violation.severity === BusinessRuleSeverity.CRITICAL
            ) {
              violations.push(violation);
            } else if (violation.severity === BusinessRuleSeverity.WARNING) {
              warnings.push(violation);
            } else if (violation.severity === BusinessRuleSeverity.INFO) {
              info.push(violation);
            }
          }

          // 收集警告和信息（无论验证是否成功）
          for (const warning of result.warnings) {
            warnings.push(warning);
          }
          for (const infoItem of result.info) {
            info.push(infoItem);
          }
        } catch (error) {
          // 规则执行失败，记录为错误
          violations.push(
            new BusinessRuleViolationImpl({
              message: `Rule execution failed: ${error instanceof Error ? error.message : String(error)}`,
              code: "RULE_EXECUTION_ERROR",
              ruleName: rule.name,
              severity: BusinessRuleSeverity.ERROR,
              timestamp: new Date(),
              details: { originalError: error },
            }),
          );
        }
      }

      const executionTime = Date.now() - startTime;
      const isValid = violations.length === 0;

      const result = isValid
        ? BusinessRuleValidationResultImpl.success(
            context?.entityType ?? "Unknown",
            context?.entityId ?? "Unknown",
            { executionTime, rulesExecuted, entitiesValidated: 1 },
          )
        : BusinessRuleValidationResultImpl.failure(
            context?.entityType ?? "Unknown",
            context?.entityId ?? "Unknown",
            violations,
            {
              warnings,
              info,
              executionTime,
              rulesExecuted,
              entitiesValidated: 1,
            },
          );

      // 更新统计信息
      this.validationStats.updateStats(result, executionTime);

      return result;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      throw new BusinessRuleManagerException(
        `Rules validation failed: ${error instanceof Error ? error.message : String(error)}`,
        { ruleNames, originalError: error, executionTime },
      );
    }
  }

  /**
   * 验证所有规则
   * @param value 要验证的值
   * @param context 验证上下文
   * @returns 验证结果
   */
  public validateAllRules(
    value: unknown,
    context?: BusinessRuleContext,
  ): BusinessRuleValidationResult {
    const enabledRules = this.getEnabledRules();
    const ruleNames = enabledRules.map((rule) => rule.name);
    return this.validateRules(ruleNames, value, context);
  }

  /**
   * 验证指定类型的规则
   * @param ruleType 规则类型
   * @param value 要验证的值
   * @param context 验证上下文
   * @returns 验证结果
   */
  public validateRulesByType(
    ruleType: string,
    value: unknown,
    context?: BusinessRuleContext,
  ): BusinessRuleValidationResult {
    const rules = this.getRulesByType(ruleType);
    const ruleNames = rules.map((rule) => rule.name);
    return this.validateRules(ruleNames, value, context);
  }

  /**
   * 验证指定优先级的规则
   * @param priority 优先级
   * @param value 要验证的值
   * @param context 验证上下文
   * @returns 验证结果
   */
  public validateRulesByPriority(
    priority: number,
    value: unknown,
    context?: BusinessRuleContext,
  ): BusinessRuleValidationResult {
    const rules = this.getRulesByPriority(priority);
    const ruleNames = rules.map((rule) => rule.name);
    return this.validateRules(ruleNames, value, context);
  }

  /**
   * 验证指定严重程度的规则
   * @param severity 严重程度
   * @param value 要验证的值
   * @param context 验证上下文
   * @returns 验证结果
   */
  public validateRulesBySeverity(
    severity: string,
    value: unknown,
    context?: BusinessRuleContext,
  ): BusinessRuleValidationResult {
    const rules = this.getRulesBySeverity(severity);
    const ruleNames = rules.map((rule) => rule.name);
    return this.validateRules(ruleNames, value, context);
  }

  /**
   * 获取验证统计信息
   * @returns 验证统计信息
   */
  public getValidationStats(): BusinessRuleValidationStats {
    return this.validationStats;
  }

  /**
   * 重置验证统计信息
   * @returns 是否重置成功
   */
  public resetValidationStats(): boolean {
    return this.validationStats.reset();
  }

  /**
   * 导出业务规则配置
   * @returns 业务规则配置
   */
  public exportConfiguration(): BusinessRuleConfiguration {
    const rules: BusinessRuleConfigurationItem[] = Array.from(
      this.rules.values(),
    ).map((rule) => ({
      name: rule.name,
      type:
        (rule as BusinessRule & { ruleType?: string }).ruleType || "Unknown",
      description: rule.description,
      priority: rule.priority,
      enabled: rule.enabled,
      config:
        (rule as BusinessRule & { config?: Record<string, unknown> }).config ||
        {},
      dependencies:
        (rule as BusinessRule & { dependencies?: string[] }).dependencies || [],
      tags: (rule as BusinessRule & { tags?: string[] }).tags || [],
      toJSON: (): BusinessRuleConfigurationItemJSON => ({
        name: rule.name,
        type:
          (rule as BusinessRule & { ruleType?: string }).ruleType || "Unknown",
        description: rule.description,
        priority: rule.priority,
        enabled: rule.enabled,
        config:
          (rule as BusinessRule & { config?: Record<string, unknown> })
            .config || {},
        dependencies:
          (rule as BusinessRule & { dependencies?: string[] }).dependencies ||
          [],
        tags: (rule as BusinessRule & { tags?: string[] }).tags || [],
      }),
    }));

    const createdAt = new Date();
    const updatedAt = new Date();

    return {
      rules,
      globalConfig: this.globalConfig,
      version: "1.0.0",
      createdAt,
      updatedAt,
      toJSON: (): BusinessRuleConfigurationJSON => ({
        rules: rules.map((r) => r.toJSON()),
        globalConfig: this.globalConfig,
        version: "1.0.0",
        createdAt: createdAt.toISOString(),
        updatedAt: updatedAt.toISOString(),
      }),
    };
  }

  /**
   * 导入业务规则配置
   * @param configuration 业务规则配置
   * @returns 是否导入成功
   */
  public importConfiguration(
    configuration: BusinessRuleConfiguration,
  ): boolean {
    try {
      // 清空现有规则
      this.clearRules();

      // 导入全局配置
      this.globalConfig = configuration.globalConfig;

      // 导入规则配置
      for (const ruleConfig of configuration.rules) {
        // 这里需要根据实际的规则类型创建规则实例
        // 由于我们只有接口，这里只是示例
        console.log(`Importing rule: ${ruleConfig.name}`);
      }

      return true;
    } catch (error) {
      throw new BusinessRuleManagerException(
        `Failed to import configuration: ${error instanceof Error ? error.message : String(error)}`,
        { originalError: error },
      );
    }
  }

  /**
   * 转换为JSON格式
   * @returns JSON格式的业务规则管理器
   */
  public toJSON(): BusinessRuleManagerJSON {
    return {
      ruleCount: this.getRuleCount(),
      enabledRuleCount: this.getEnabledRuleCount(),
      disabledRuleCount: this.getDisabledRuleCount(),
      rules: Array.from(this.rules.values()).map((rule) => ({
        name: rule.name,
        type:
          (rule as BusinessRule & { ruleType?: string }).ruleType || "Unknown",
        description: rule.description,
        priority: rule.priority,
        enabled: rule.enabled,
      })),
      validationStats: this.validationStats.toJSON(),
      configuration: this.exportConfiguration().toJSON(),
    };
  }
}

/**
 * 业务规则验证统计信息实现类
 * @description 提供业务规则验证统计信息的完整实现
 */
class BusinessRuleValidationStatsImpl implements BusinessRuleValidationStats {
  private _totalValidations: number = 0;
  private _successfulValidations: number = 0;
  private _failedValidations: number = 0;
  private _warningValidations: number = 0;
  private _infoValidations: number = 0;
  private _totalExecutionTime: number = 0;
  private _maxExecutionTime: number = 0;
  private _minExecutionTime: number = Number.MAX_SAFE_INTEGER;
  private _ruleExecutionStats: Map<
    string,
    {
      executionCount: number;
      successCount: number;
      failureCount: number;
      totalTime: number;
    }
  > = new Map();
  private _severityStats: Map<string, number> = new Map();
  private _ruleTypeStats: Map<string, number> = new Map();
  private _lastValidationTime?: Date;

  public get totalValidations(): number {
    return this._totalValidations;
  }

  public get successfulValidations(): number {
    return this._successfulValidations;
  }

  public get failedValidations(): number {
    return this._failedValidations;
  }

  public get warningValidations(): number {
    return this._warningValidations;
  }

  public get infoValidations(): number {
    return this._infoValidations;
  }

  public get averageValidationTime(): number {
    return this._totalValidations > 0
      ? this._totalExecutionTime / this._totalValidations
      : 0;
  }

  public get maxValidationTime(): number {
    return this._maxExecutionTime;
  }

  public get minValidationTime(): number {
    return this._minExecutionTime === Number.MAX_SAFE_INTEGER
      ? 0
      : this._minExecutionTime;
  }

  public get ruleExecutionStats(): Record<
    string,
    {
      executionCount: number;
      successCount: number;
      failureCount: number;
      averageTime: number;
    }
  > {
    const stats: Record<
      string,
      {
        executionCount: number;
        successCount: number;
        failureCount: number;
        averageTime: number;
      }
    > = {};
    for (const [ruleName, ruleStats] of this._ruleExecutionStats) {
      stats[ruleName] = {
        executionCount: ruleStats.executionCount,
        successCount: ruleStats.successCount,
        failureCount: ruleStats.failureCount,
        averageTime:
          ruleStats.executionCount > 0
            ? ruleStats.totalTime / ruleStats.executionCount
            : 0,
      };
    }
    return stats;
  }

  public get severityStats(): Record<string, number> {
    const stats: Record<string, number> = {};
    for (const [severity, count] of this._severityStats) {
      stats[severity] = count;
    }
    return stats;
  }

  public get ruleTypeStats(): Record<string, number> {
    const stats: Record<string, number> = {};
    for (const [ruleType, count] of this._ruleTypeStats) {
      stats[ruleType] = count;
    }
    return stats;
  }

  public get lastValidationTime(): Date | undefined {
    return this._lastValidationTime;
  }

  public reset(): boolean {
    try {
      this._totalValidations = 0;
      this._successfulValidations = 0;
      this._failedValidations = 0;
      this._warningValidations = 0;
      this._infoValidations = 0;
      this._totalExecutionTime = 0;
      this._maxExecutionTime = 0;
      this._minExecutionTime = Number.MAX_SAFE_INTEGER;
      this._ruleExecutionStats.clear();
      this._severityStats.clear();
      this._ruleTypeStats.clear();
      this._lastValidationTime = undefined;
      return true;
    } catch (_error) {
      return false;
    }
  }

  public updateStats(
    validationResult: BusinessRuleValidationResult,
    executionTime: number,
  ): boolean {
    try {
      this._totalValidations++;
      this._lastValidationTime = new Date();

      if (validationResult.isValid) {
        this._successfulValidations++;
      } else {
        this._failedValidations++;
      }

      // 更新严重程度统计
      for (const violation of validationResult.violations) {
        const severity = violation.severity;
        this._severityStats.set(
          severity,
          (this._severityStats.get(severity) || 0) + 1,
        );

        if (severity === BusinessRuleSeverity.WARNING) {
          this._warningValidations++;
        } else if (severity === BusinessRuleSeverity.INFO) {
          this._infoValidations++;
        }
      }

      // 更新警告和信息统计（从 warnings 和 info 数组）
      for (const _warning of validationResult.warnings) {
        this._warningValidations++;
        this._severityStats.set(
          BusinessRuleSeverity.WARNING,
          (this._severityStats.get(BusinessRuleSeverity.WARNING) || 0) + 1,
        );
      }

      for (const _infoItem of validationResult.info) {
        this._infoValidations++;
        this._severityStats.set(
          BusinessRuleSeverity.INFO,
          (this._severityStats.get(BusinessRuleSeverity.INFO) || 0) + 1,
        );
      }

      // 更新执行时间统计
      this._totalExecutionTime += executionTime;
      this._maxExecutionTime = Math.max(this._maxExecutionTime, executionTime);
      this._minExecutionTime = Math.min(this._minExecutionTime, executionTime);

      // 更新规则执行统计
      for (const violation of validationResult.violations) {
        const ruleName = violation.ruleName;
        const ruleStats = this._ruleExecutionStats.get(ruleName) || {
          executionCount: 0,
          successCount: 0,
          failureCount: 0,
          totalTime: 0,
        };

        ruleStats.executionCount++;
        ruleStats.totalTime += executionTime;

        if (validationResult.isValid) {
          ruleStats.successCount++;
        } else {
          ruleStats.failureCount++;
        }

        this._ruleExecutionStats.set(ruleName, ruleStats);
      }

      return true;
    } catch (_error) {
      return false;
    }
  }

  public toJSON(): BusinessRuleValidationStatsJSON {
    return {
      totalValidations: this._totalValidations,
      successfulValidations: this._successfulValidations,
      failedValidations: this._failedValidations,
      warningValidations: this._warningValidations,
      infoValidations: this._infoValidations,
      averageValidationTime: this.averageValidationTime,
      maxValidationTime: this._maxExecutionTime,
      minValidationTime: this.minValidationTime,
      ruleExecutionStats: this.ruleExecutionStats,
      severityStats: this.severityStats,
      ruleTypeStats: this.ruleTypeStats,
      lastValidationTime: this._lastValidationTime?.toISOString(),
    };
  }

  /**
   * 发射规则状态变更事件
   * @param ruleName 规则名称
   * @param enabled 是否启用
   * @private
   */
  private emitRuleStateChanged(ruleName: string, enabled: boolean): void {
    // 这里可以添加事件发射逻辑，比如使用 EventEmitter
    // 目前只是占位符实现
    console.log(
      `Rule ${ruleName} state changed to ${enabled ? "enabled" : "disabled"}`,
    );
  }
}
