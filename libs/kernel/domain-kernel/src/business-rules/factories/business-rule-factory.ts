/**
 * @fileoverview 业务规则工厂实现
 * @description 提供业务规则工厂的完整实现
 */

import type {
  BusinessRuleFactory as IBusinessRuleFactory,
  BusinessRuleConfig,
  BusinessRuleValidationResultConfig,
  BusinessRuleViolationConfig,
  BusinessRuleCreator,
  BusinessRuleCondition,
  BusinessRuleAction,
  BusinessRuleFactoryJSON,
  BusinessRuleConfigJSON,
  // BusinessRuleValidationResultConfigJSON,
  // BusinessRuleViolationConfigJSON,
  BusinessRuleCreatorJSON,
  BusinessRuleConditionJSON,
  BusinessRuleActionJSON,
} from "./business-rule-factory.interface.js";
import type { BusinessRule } from "../business-rule.interface.js";
import type { BusinessRuleValidationResult } from "../business-rule-validation-result.interface.js";
import type { BusinessRuleViolation } from "../business-rule-violation.interface.js";
// import type { ValidationContext } from "../../validation/rules/validation-rule.interface.js";
import { BusinessRuleSeverity } from "../business-rule.interface.js";
import { BusinessRuleFactoryException } from "../../exceptions/business-rule-exceptions.js";

/**
 * 业务规则工厂实现类
 * @description 提供业务规则工厂的完整实现
 */
export class BusinessRuleFactory implements IBusinessRuleFactory {
  private ruleTypes: Map<string, BusinessRuleCreator> = new Map();

  /**
   * 创建业务规则
   * @param type 规则类型
   * @param config 规则配置
   * @returns 业务规则实例
   */
  public createRule(type: string, config: BusinessRuleConfig): BusinessRule {
    try {
      const creator = this.ruleTypes.get(type);
      if (!creator) {
        throw new Error(`Rule type '${type}' not found`);
      }

      if (!creator.validateConfig(config)) {
        throw new Error(`Invalid configuration for rule type '${type}'`);
      }

      return creator.create(config);
    } catch (error) {
      throw new BusinessRuleFactoryException(
        type,
        `Failed to create rule of type '${type}': ${error instanceof Error ? error.message : String(error)}`,
        { config, originalError: error },
      );
    }
  }

  /**
   * 创建业务规则验证结果
   * @param config 验证结果配置
   * @returns 业务规则验证结果实例
   */
  public createValidationResult(
    config: BusinessRuleValidationResultConfig,
  ): BusinessRuleValidationResult {
    try {
      // 这里需要根据实际的BusinessRuleValidationResult实现来创建
      // 由于我们只有接口，这里只是示例
      return {
        isValid: config.isValid,
        entityType: config.entityType,
        entityId: config.entityId,
        violations: config.violations ?? [],
        warnings: config.warnings ?? [],
        info: config.info ?? [],
        executionTime: config.executionTime ?? 0,
        rulesExecuted: config.rulesExecuted ?? 0,
        entitiesValidated: config.entitiesValidated ?? 0,
        context: config.context,
        hasViolations: () => (config.violations ?? []).length > 0,
        hasWarnings: () => (config.warnings ?? []).length > 0,
        hasInfo: () => (config.info ?? []).length > 0,
        getAllMessages: () =>
          [
            ...(config.violations ?? []),
            ...(config.warnings ?? []),
            ...(config.info ?? []),
          ].map((item) => item.message),
        getMessagesBySeverity: (severity: BusinessRuleSeverity) => {
          const allItems = [
            ...(config.violations ?? []),
            ...(config.warnings ?? []),
            ...(config.info ?? []),
          ];
          return allItems
            .filter((item) => item.severity === severity)
            .map((item) => item.message);
        },
        getViolationsForRule: (ruleName: string) =>
          (config.violations ?? []).filter(
            (violation) => violation.ruleName === ruleName,
          ),
        getViolationsBySeverity: (severity: BusinessRuleSeverity) =>
          (config.violations ?? []).filter(
            (violation) => violation.severity === severity,
          ),
        getViolationsByRuleType: (ruleType: string) =>
          (config.violations ?? []).filter(
            (violation) => violation.ruleType === ruleType,
          ),
        merge: (other: BusinessRuleValidationResult) => {
          // 这里需要根据实际的BusinessRuleValidationResult实现来合并
          // 由于我们只有接口，这里只是示例
          return this.createValidationResult({
            isValid: config.isValid && other.isValid,
            entityType: config.entityType,
            entityId: config.entityId,
            violations: [...(config.violations ?? []), ...other.violations],
            warnings: [...(config.warnings ?? []), ...other.warnings],
            info: [...(config.info ?? []), ...other.info],
            executionTime: Math.max(
              config.executionTime ?? 0,
              other.executionTime,
            ),
            rulesExecuted: (config.rulesExecuted ?? 0) + other.rulesExecuted,
            entitiesValidated: Math.max(
              config.entitiesValidated ?? 0,
              other.entitiesValidated,
            ),
            context: config.context,
            toJSON: () => ({
              isValid: config.isValid && other.isValid,
              entityType: config.entityType,
              entityId: config.entityId,
              violationCount:
                (config.violations ?? []).length + other.violations.length,
              warningCount:
                (config.warnings ?? []).length + other.warnings.length,
              infoCount: (config.info ?? []).length + other.info.length,
              executionTime: Math.max(
                config.executionTime ?? 0,
                other.executionTime,
              ),
              rulesExecuted: (config.rulesExecuted ?? 0) + other.rulesExecuted,
              entitiesValidated: Math.max(
                config.entitiesValidated ?? 0,
                other.entitiesValidated,
              ),
            }),
          });
        },
        toJSON: () => ({
          isValid: config.isValid,
          entityType: config.entityType,
          entityId: config.entityId,
          violationCount: (config.violations ?? []).length,
          warningCount: (config.warnings ?? []).length,
          infoCount: (config.info ?? []).length,
          executionTime: config.executionTime ?? 0,
          rulesExecuted: config.rulesExecuted ?? 0,
          entitiesValidated: config.entitiesValidated ?? 0,
          violations: (config.violations ?? []).map((violation) =>
            violation.toJSON(),
          ),
          warnings: (config.warnings ?? []).map((warning) => warning.toJSON()),
          info: (config.info ?? []).map((info) => info.toJSON()),
          severityStats: {},
          ruleTypeStats: {},
        }),
        toString: () =>
          config.isValid
            ? `Business rule validation passed for ${config.entityType}(${config.entityId})`
            : `Business rule validation failed for ${config.entityType}(${config.entityId})`,
      } as BusinessRuleValidationResult;
    } catch (error) {
      throw new BusinessRuleFactoryException(
        "validation_result",
        `Failed to create validation result: ${error instanceof Error ? error.message : String(error)}`,
        { config, originalError: error },
      );
    }
  }

  /**
   * 创建业务规则违反
   * @param config 违反配置
   * @returns 业务规则违反实例
   */
  public createViolation(
    config: BusinessRuleViolationConfig,
  ): BusinessRuleViolation {
    try {
      // 这里需要根据实际的BusinessRuleViolation实现来创建
      // 由于我们只有接口，这里只是示例
      return {
        message: config.message,
        code: config.code,
        ruleName: config.ruleName,
        ruleType: config.ruleType,
        severity:
          (config.severity as BusinessRuleSeverity) ??
          BusinessRuleSeverity.ERROR,
        details: config.details,
        timestamp: config.timestamp ?? new Date(),
        path: config.path,
        value: config.value,
        position: config.position,
        entityType: config.entityType,
        entityId: config.entityId,
        operationType: config.operationType,
        isError: () =>
          (config.severity as BusinessRuleSeverity) ===
          BusinessRuleSeverity.ERROR,
        isWarning: () =>
          (config.severity as BusinessRuleSeverity) ===
          BusinessRuleSeverity.WARNING,
        isInfo: () =>
          (config.severity as BusinessRuleSeverity) ===
          BusinessRuleSeverity.INFO,
        isCritical: () =>
          (config.severity as BusinessRuleSeverity) ===
          BusinessRuleSeverity.CRITICAL,
        getFullPath: () => {
          if (!config.path || config.path.length === 0) {
            return config.ruleName;
          }
          return [...config.path, config.ruleName].join(".");
        },
        getFormattedMessage: () => {
          const path = this.createViolation(config).getFullPath();
          const severity =
            (config.severity as BusinessRuleSeverity) ??
            BusinessRuleSeverity.ERROR;
          const timestamp = (config.timestamp ?? new Date()).toISOString();
          return `[${severity}] ${path}: ${config.message} (${timestamp})`;
        },
        toJSON: () => ({
          message: config.message,
          code: config.code,
          ruleName: config.ruleName,
          ruleType: config.ruleType,
          severity: config.severity ?? BusinessRuleSeverity.ERROR,
          details: config.details,
          timestamp: (config.timestamp ?? new Date()).getTime(),
          path: config.path,
          value: config.value,
          position: config.position,
          entityType: config.entityType,
          entityId: config.entityId,
          operationType: config.operationType,
        }),
        toString: () => config.message,
        clone: (overrides) => this.createViolation({ ...config, ...overrides }),
      } as BusinessRuleViolation;
    } catch (error) {
      throw new BusinessRuleFactoryException(
        "violation",
        `Failed to create violation: ${error instanceof Error ? error.message : String(error)}`,
        { config, originalError: error },
      );
    }
  }

  /**
   * 创建业务规则集合
   * @param configs 规则配置集合
   * @returns 业务规则集合
   */
  public createRules(configs: BusinessRuleConfig[]): BusinessRule[] {
    try {
      const rules: BusinessRule[] = [];

      for (const config of configs) {
        const rule = this.createRule(config.type, config);
        rules.push(rule);
      }

      return rules;
    } catch (error) {
      throw new BusinessRuleFactoryException(
        "rules",
        `Failed to create rules: ${error instanceof Error ? error.message : String(error)}`,
        { configs, originalError: error },
      );
    }
  }

  /**
   * 创建业务规则验证结果集合
   * @param configs 验证结果配置集合
   * @returns 业务规则验证结果集合
   */
  public createValidationResults(
    configs: BusinessRuleValidationResultConfig[],
  ): BusinessRuleValidationResult[] {
    try {
      const results: BusinessRuleValidationResult[] = [];

      for (const config of configs) {
        const result = this.createValidationResult(config);
        results.push(result);
      }

      return results;
    } catch (error) {
      throw new BusinessRuleFactoryException(
        "validation_results",
        `Failed to create validation results: ${error instanceof Error ? error.message : String(error)}`,
        { configs, originalError: error },
      );
    }
  }

  /**
   * 创建业务规则违反集合
   * @param configs 违反配置集合
   * @returns 业务规则违反集合
   */
  public createViolations(
    configs: BusinessRuleViolationConfig[],
  ): BusinessRuleViolation[] {
    try {
      const violations: BusinessRuleViolation[] = [];

      for (const config of configs) {
        const violation = this.createViolation(config);
        violations.push(violation);
      }

      return violations;
    } catch (error) {
      throw new BusinessRuleFactoryException(
        "violations",
        `Failed to create violations: ${error instanceof Error ? error.message : String(error)}`,
        { configs, originalError: error },
      );
    }
  }

  /**
   * 注册规则类型
   * @param type 规则类型
   * @param creator 规则创建器
   * @returns 是否注册成功
   */
  public registerRuleType(type: string, creator: BusinessRuleCreator): boolean {
    try {
      if (this.ruleTypes.has(type)) {
        throw new Error(`Rule type '${type}' already exists`);
      }

      this.ruleTypes.set(type, creator);
      return true;
    } catch (error) {
      throw new BusinessRuleFactoryException(
        type,
        `Failed to register rule type '${type}': ${error instanceof Error ? error.message : String(error)}`,
        { originalError: error },
      );
    }
  }

  /**
   * 注销规则类型
   * @param type 规则类型
   * @returns 是否注销成功
   */
  public unregisterRuleType(type: string): boolean {
    try {
      if (!this.ruleTypes.has(type)) {
        return false;
      }

      this.ruleTypes.delete(type);
      return true;
    } catch (error) {
      throw new BusinessRuleFactoryException(
        type,
        `Failed to unregister rule type '${type}': ${error instanceof Error ? error.message : String(error)}`,
        { originalError: error },
      );
    }
  }

  /**
   * 获取规则类型
   * @param type 规则类型
   * @returns 规则创建器或undefined
   */
  public getRuleType(type: string): BusinessRuleCreator | undefined {
    return this.ruleTypes.get(type);
  }

  /**
   * 获取所有规则类型
   * @returns 所有规则类型列表
   */
  public getAllRuleTypes(): string[] {
    return Array.from(this.ruleTypes.keys());
  }

  /**
   * 检查规则类型是否存在
   * @param type 规则类型
   * @returns 是否存在
   */
  public hasRuleType(type: string): boolean {
    return this.ruleTypes.has(type);
  }

  /**
   * 获取规则类型数量
   * @returns 规则类型数量
   */
  public getRuleTypeCount(): number {
    return this.ruleTypes.size;
  }

  /**
   * 清空所有规则类型
   * @returns 清空的规则类型数量
   */
  public clearRuleTypes(): number {
    const count = this.ruleTypes.size;
    this.ruleTypes.clear();
    return count;
  }

  /**
   * 转换为JSON格式
   * @returns JSON格式的业务规则工厂
   */
  public toJSON(): BusinessRuleFactoryJSON {
    const ruleTypeDetails: Record<string, BusinessRuleCreatorJSON> = {};

    for (const [type, creator] of this.ruleTypes) {
      ruleTypeDetails[type] = creator.toJSON();
    }

    return {
      ruleTypeCount: this.ruleTypes.size,
      ruleTypes: Array.from(this.ruleTypes.keys()),
      ruleTypeDetails,
    };
  }
}

/**
 * 业务规则配置实现类
 * @description 提供业务规则配置的完整实现
 */
export class BusinessRuleConfigImpl implements BusinessRuleConfig {
  public readonly name: string;
  public readonly type: string;
  public readonly description: string;
  public readonly priority: number;
  public readonly enabled: boolean;
  public readonly config: Record<string, unknown>;
  public readonly dependencies: string[];
  public readonly tags: string[];
  public readonly severity?: string;
  public readonly timeout?: number;
  public readonly retryCount?: number;
  public readonly retryDelay?: number;
  public readonly conditions?: BusinessRuleCondition[];
  public readonly actions?: BusinessRuleAction[];

  constructor(params: {
    name: string;
    type: string;
    description: string;
    priority?: number;
    enabled?: boolean;
    config?: Record<string, unknown>;
    dependencies?: string[];
    tags?: string[];
    severity?: string;
    timeout?: number;
    retryCount?: number;
    retryDelay?: number;
    conditions?: BusinessRuleCondition[];
    actions?: BusinessRuleAction[];
  }) {
    this.name = params.name;
    this.type = params.type;
    this.description = params.description;
    this.priority = params.priority ?? 100;
    this.enabled = params.enabled ?? true;
    this.config = params.config ?? {};
    this.dependencies = params.dependencies ?? [];
    this.tags = params.tags ?? [];
    this.severity = params.severity;
    this.timeout = params.timeout;
    this.retryCount = params.retryCount;
    this.retryDelay = params.retryDelay;
    this.conditions = params.conditions;
    this.actions = params.actions;
  }

  public toJSON(): BusinessRuleConfigJSON {
    return {
      name: this.name,
      type: this.type,
      description: this.description,
      priority: this.priority,
      enabled: this.enabled,
      config: this.config,
      dependencies: this.dependencies,
      tags: this.tags,
      severity: this.severity,
      timeout: this.timeout,
      retryCount: this.retryCount,
      retryDelay: this.retryDelay,
      conditions: this.conditions?.map((condition) => condition.toJSON()),
      actions: this.actions?.map((action) => action.toJSON()),
    };
  }
}

/**
 * 业务规则条件实现类
 * @description 提供业务规则条件的完整实现
 */
export class BusinessRuleConditionImpl implements BusinessRuleCondition {
  public readonly name: string;
  public readonly type: string;
  public readonly expression: string;
  public readonly parameters: Record<string, unknown>;
  public readonly description?: string;
  public readonly priority?: number;
  public readonly enabled?: boolean;

  constructor(params: {
    name: string;
    type: string;
    expression: string;
    parameters: Record<string, unknown>;
    description?: string;
    priority?: number;
    enabled?: boolean;
  }) {
    this.name = params.name;
    this.type = params.type;
    this.expression = params.expression;
    this.parameters = params.parameters;
    this.description = params.description;
    this.priority = params.priority;
    this.enabled = params.enabled;
  }

  public toJSON(): BusinessRuleConditionJSON {
    return {
      name: this.name,
      type: this.type,
      expression: this.expression,
      parameters: this.parameters,
      description: this.description,
      priority: this.priority,
      enabled: this.enabled,
    };
  }
}

/**
 * 业务规则动作实现类
 * @description 提供业务规则动作的完整实现
 */
export class BusinessRuleActionImpl implements BusinessRuleAction {
  public readonly name: string;
  public readonly type: string;
  public readonly expression: string;
  public readonly parameters: Record<string, unknown>;
  public readonly description?: string;
  public readonly priority?: number;
  public readonly enabled?: boolean;

  constructor(params: {
    name: string;
    type: string;
    expression: string;
    parameters: Record<string, unknown>;
    description?: string;
    priority?: number;
    enabled?: boolean;
  }) {
    this.name = params.name;
    this.type = params.type;
    this.expression = params.expression;
    this.parameters = params.parameters;
    this.description = params.description;
    this.priority = params.priority;
    this.enabled = params.enabled;
  }

  public toJSON(): BusinessRuleActionJSON {
    return {
      name: this.name,
      type: this.type,
      expression: this.expression,
      parameters: this.parameters,
      description: this.description,
      priority: this.priority,
      enabled: this.enabled,
    };
  }
}
