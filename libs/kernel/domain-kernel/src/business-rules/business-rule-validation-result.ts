/**
 * @fileoverview 业务规则验证结果实现
 * @description 提供业务规则验证结果的具体实现和功能
 */

import type {
  BusinessRuleValidationResult as IBusinessRuleValidationResult,
  BusinessRuleValidationResultContext,
  // BusinessRuleValidationResultOptions,
  BusinessRuleValidationResultJSON,
} from "./business-rule-validation-result.interface.js";
import type {
  BusinessRuleViolation,
  BusinessRuleViolationData,
  BusinessRuleViolationJSON,
} from "./business-rule-violation.interface.js";
import { BusinessRuleSeverity } from "./business-rule.interface.js";
import { BusinessRuleValidationResultException } from "../exceptions/business-rule-exceptions.js";

/**
 * 业务规则验证结果实现类
 * @description 提供业务规则验证结果的完整实现
 */
export class BusinessRuleValidationResult
  implements IBusinessRuleValidationResult
{
  /**
   * 验证是否通过
   */
  public readonly isValid: boolean;

  /**
   * 实体类型
   */
  public readonly entityType: string;

  /**
   * 实体ID
   */
  public readonly entityId: string;

  /**
   * 业务规则违反列表
   */
  public readonly violations: readonly BusinessRuleViolation[];

  /**
   * 警告列表
   */
  public readonly warnings: readonly BusinessRuleViolation[];

  /**
   * 信息列表
   */
  public readonly info: readonly BusinessRuleViolation[];

  /**
   * 验证执行时间（毫秒）
   */
  public readonly executionTime: number;

  /**
   * 验证的规则数量
   */
  public readonly rulesExecuted: number;

  /**
   * 验证的实体数量
   */
  public readonly entitiesValidated: number;

  /**
   * 验证上下文
   */
  public readonly context?: BusinessRuleValidationResultContext;

  /**
   * 创建业务规则验证结果
   * @param params 验证结果参数
   */
  constructor(params: {
    isValid: boolean;
    entityType: string;
    entityId: string;
    violations?: BusinessRuleViolation[];
    warnings?: BusinessRuleViolation[];
    info?: BusinessRuleViolation[];
    executionTime?: number;
    rulesExecuted?: number;
    entitiesValidated?: number;
    context?: BusinessRuleValidationResultContext;
  }) {
    this.isValid = params.isValid;
    this.entityType = params.entityType;
    this.entityId = params.entityId;
    this.violations = Object.freeze(params.violations ?? []);
    this.warnings = Object.freeze(params.warnings ?? []);
    this.info = Object.freeze(params.info ?? []);
    this.executionTime = params.executionTime ?? 0;
    this.rulesExecuted = params.rulesExecuted ?? 0;
    this.entitiesValidated = params.entitiesValidated ?? 0;
    this.context = params.context;
  }

  /**
   * 检查是否有违反
   * @returns 是否存在业务规则违反
   */
  public hasViolations(): boolean {
    return this.violations.length > 0;
  }

  /**
   * 检查是否有警告
   * @returns 是否存在警告
   */
  public hasWarnings(): boolean {
    return this.warnings.length > 0;
  }

  /**
   * 检查是否有信息
   * @returns 是否存在信息
   */
  public hasInfo(): boolean {
    return this.info.length > 0;
  }

  /**
   * 获取所有消息
   * @returns 所有消息的数组
   */
  public getAllMessages(): string[] {
    return [...this.violations, ...this.warnings, ...this.info].map(
      (item) => item.message,
    );
  }

  /**
   * 获取指定级别的消息
   * @param severity 严重程度级别
   * @returns 指定级别的消息数组
   */
  public getMessagesBySeverity(severity: BusinessRuleSeverity): string[] {
    const allItems = [...this.violations, ...this.warnings, ...this.info];
    return allItems
      .filter((item) => item.severity === severity)
      .map((item) => item.message);
  }

  /**
   * 获取指定规则类型的违反
   * @param ruleName 规则名称
   * @returns 指定规则类型的违反数组
   */
  public getViolationsForRule(ruleName: string): BusinessRuleViolation[] {
    return this.violations.filter(
      (violation) => violation.ruleName === ruleName,
    );
  }

  /**
   * 获取指定严重程度的违反
   * @param severity 严重程度
   * @returns 指定严重程度的违反数组
   */
  public getViolationsBySeverity(
    severity: BusinessRuleSeverity,
  ): BusinessRuleViolation[] {
    return this.violations.filter(
      (violation) => violation.severity === severity,
    );
  }

  /**
   * 获取指定规则类型的违反
   * @param ruleType 规则类型
   * @returns 指定规则类型的违反数组
   */
  public getViolationsByRuleType(ruleType: string): BusinessRuleViolation[] {
    return this.violations.filter(
      (violation) => violation.ruleType === ruleType,
    );
  }

  /**
   * 合并业务规则验证结果
   * @param other 要合并的业务规则验证结果
   * @returns 合并后的业务规则验证结果
   */
  public merge(
    other: IBusinessRuleValidationResult,
  ): BusinessRuleValidationResult {
    const mergedViolations = [...this.violations, ...other.violations];
    const mergedWarnings = [...this.warnings, ...other.warnings];
    const mergedInfo = [...this.info, ...other.info];

    const isValid = this.isValid && other.isValid;
    const executionTime = Math.max(this.executionTime, other.executionTime);
    const rulesExecuted = this.rulesExecuted + other.rulesExecuted;
    const entitiesValidated = Math.max(
      this.entitiesValidated,
      other.entitiesValidated,
    );

    return new BusinessRuleValidationResult({
      isValid,
      entityType: this.entityType,
      entityId: this.entityId,
      violations: mergedViolations,
      warnings: mergedWarnings,
      info: mergedInfo,
      executionTime,
      rulesExecuted,
      entitiesValidated,
      context: this.context,
    });
  }

  /**
   * 转换为JSON格式
   * @returns JSON格式的业务规则验证结果
   */
  public toJSON(): BusinessRuleValidationResultJSON {
    const severityStats = this.calculateSeverityStats();
    const ruleTypeStats = this.calculateRuleTypeStats();

    return {
      isValid: this.isValid,
      entityType: this.entityType,
      entityId: this.entityId,
      violationCount: this.violations.length,
      warningCount: this.warnings.length,
      infoCount: this.info.length,
      executionTime: this.executionTime,
      rulesExecuted: this.rulesExecuted,
      entitiesValidated: this.entitiesValidated,
      violations: this.violations.map((violation) => violation.toJSON()),
      warnings: this.warnings.map((warning) => warning.toJSON()),
      info: this.info.map((info) => info.toJSON()),
      severityStats,
      ruleTypeStats,
    };
  }

  /**
   * 转换为字符串格式
   * @returns 字符串格式的业务规则验证结果
   */
  public toString(): string {
    if (this.isValid) {
      return `Business rule validation passed for ${this.entityType}(${this.entityId})`;
    }

    const violationMessages = this.violations.map(
      (violation) => violation.message,
    );
    const warningMessages = this.warnings.map((warning) => warning.message);
    const infoMessages = this.info.map((info) => info.message);

    const messages = [
      ...violationMessages,
      ...warningMessages,
      ...infoMessages,
    ];
    return `Business rule validation failed for ${this.entityType}(${this.entityId}): ${messages.join(", ")}`;
  }

  /**
   * 计算严重程度统计
   * @returns 严重程度统计
   */
  private calculateSeverityStats(): Record<string, number> {
    const stats: Record<string, number> = {};

    for (const violation of this.violations) {
      const severity = violation.severity;
      stats[severity] = (stats[severity] || 0) + 1;
    }

    return stats;
  }

  /**
   * 计算规则类型统计
   * @returns 规则类型统计
   */
  private calculateRuleTypeStats(): Record<string, number> {
    const stats: Record<string, number> = {};

    for (const violation of this.violations) {
      const ruleType = violation.ruleType || "Unknown";
      stats[ruleType] = (stats[ruleType] || 0) + 1;
    }

    return stats;
  }

  /**
   * 创建成功的业务规则验证结果
   * @param entityType 实体类型
   * @param entityId 实体ID
   * @param options 创建选项
   * @returns 成功的业务规则验证结果
   */
  public static success(
    entityType: string,
    entityId: string,
    options?: {
      executionTime?: number;
      rulesExecuted?: number;
      entitiesValidated?: number;
      context?: BusinessRuleValidationResultContext;
    },
  ): BusinessRuleValidationResult {
    return new BusinessRuleValidationResult({
      isValid: true,
      entityType,
      entityId,
      violations: [],
      warnings: [],
      info: [],
      executionTime: options?.executionTime ?? 0,
      rulesExecuted: options?.rulesExecuted ?? 0,
      entitiesValidated: options?.entitiesValidated ?? 0,
      context: options?.context,
    });
  }

  /**
   * 创建失败的业务规则验证结果
   * @param entityType 实体类型
   * @param entityId 实体ID
   * @param violations 违反列表
   * @param options 创建选项
   * @returns 失败的业务规则验证结果
   */
  public static failure(
    entityType: string,
    entityId: string,
    violations: BusinessRuleViolation[],
    options?: {
      warnings?: BusinessRuleViolation[];
      info?: BusinessRuleViolation[];
      executionTime?: number;
      rulesExecuted?: number;
      entitiesValidated?: number;
      context?: BusinessRuleValidationResultContext;
    },
  ): BusinessRuleValidationResult {
    return new BusinessRuleValidationResult({
      isValid: false,
      entityType,
      entityId,
      violations: violations ?? [],
      warnings: options?.warnings ?? [],
      info: options?.info ?? [],
      executionTime: options?.executionTime ?? 0,
      rulesExecuted: options?.rulesExecuted ?? 0,
      entitiesValidated: options?.entitiesValidated ?? 0,
      context: options?.context,
    });
  }

  /**
   * 从JSON创建业务规则验证结果
   * @param json JSON数据
   * @returns 业务规则验证结果实例
   */
  public static fromJSON(
    json: BusinessRuleValidationResultJSON,
  ): BusinessRuleValidationResult {
    try {
      return new BusinessRuleValidationResult({
        isValid: json.isValid,
        entityType: json.entityType,
        entityId: json.entityId,
        violations: json.violations.map((violationJson) =>
          this.createBusinessRuleViolationFromJSON(violationJson),
        ),
        warnings: json.warnings.map((warningJson) =>
          this.createBusinessRuleViolationFromJSON(warningJson),
        ),
        info: json.info.map((infoJson) =>
          this.createBusinessRuleViolationFromJSON(infoJson),
        ),
        executionTime: json.executionTime,
        rulesExecuted: json.rulesExecuted,
        entitiesValidated: json.entitiesValidated,
      });
    } catch (error) {
      throw new BusinessRuleValidationResultException(
        `Failed to create BusinessRuleValidationResult from JSON: ${error instanceof Error ? error.message : String(error)}`,
        { originalError: error, json },
      );
    }
  }

  /**
   * 从JSON创建业务规则违反
   * @param json JSON数据
   * @returns 业务规则违反实例
   */
  private static createBusinessRuleViolationFromJSON(
    json: BusinessRuleViolationJSON,
  ): BusinessRuleViolation {
    return {
      message: json.message,
      code: json.code,
      ruleName: json.ruleName,
      ruleType: json.ruleType,
      severity: json.severity as BusinessRuleSeverity,
      details: json.details,
      timestamp: new Date(json.timestamp),
      path: json.path,
      value: json.value,
      position: json.position,
      entityType: json.entityType,
      entityId: json.entityId,
      operationType: json.operationType,
      isError: () => json.severity === BusinessRuleSeverity.ERROR,
      isWarning: () => json.severity === BusinessRuleSeverity.WARNING,
      isInfo: () => json.severity === BusinessRuleSeverity.INFO,
      isCritical: () => json.severity === BusinessRuleSeverity.CRITICAL,
      getFullPath: () => {
        const path = json.path ? [...json.path] : [];
        if (json.ruleName) {
          path.push(json.ruleName);
        }
        return path.join(".");
      },
      getFormattedMessage: () => {
        const path =
          this.createBusinessRuleViolationFromJSON(json).getFullPath();
        return path ? `${path}: ${json.message}` : json.message;
      },
      toJSON: () => json,
      toString: () => json.message,
      clone: (overrides?: Partial<BusinessRuleViolationData>) =>
        this.createBusinessRuleViolationFromJSON({
          ...json,
          ...(overrides
            ? {
                message: overrides.message ?? json.message,
                code: overrides.code ?? json.code,
                ruleName: overrides.ruleName ?? json.ruleName,
                ruleType: overrides.ruleType ?? json.ruleType,
                severity: overrides.severity ?? json.severity,
                details: overrides.details ?? json.details,
                timestamp: overrides.timestamp
                  ? overrides.timestamp.getTime()
                  : json.timestamp,
                path: overrides.path ?? json.path,
                value: overrides.value ?? json.value,
                position: overrides.position ?? json.position,
                entityType: overrides.entityType ?? json.entityType,
                entityId: overrides.entityId ?? json.entityId,
                operationType: overrides.operationType ?? json.operationType,
              }
            : {}),
        }),
    };
  }

  /**
   * 创建业务规则验证结果构建器
   * @returns 业务规则验证结果构建器实例
   */
  public static builder(): BusinessRuleValidationResultBuilder {
    return new BusinessRuleValidationResultBuilder();
  }
}

/**
 * 业务规则验证结果构建器
 * @description 用于构建业务规则验证结果的构建器类
 */
export class BusinessRuleValidationResultBuilder {
  private entityType: string = "";
  private entityId: string = "";
  private violations: BusinessRuleViolation[] = [];
  private warnings: BusinessRuleViolation[] = [];
  private info: BusinessRuleViolation[] = [];
  private executionTime: number = 0;
  private rulesExecuted: number = 0;
  private entitiesValidated: number = 0;
  private context?: BusinessRuleValidationResultContext;

  /**
   * 设置实体信息
   * @param entityType 实体类型
   * @param entityId 实体ID
   * @returns 构建器实例
   */
  public setEntity(
    entityType: string,
    entityId: string,
  ): BusinessRuleValidationResultBuilder {
    this.entityType = entityType;
    this.entityId = entityId;
    return this;
  }

  /**
   * 添加违反
   * @param violation 业务规则违反
   * @returns 构建器实例
   */
  public addViolation(
    violation: BusinessRuleViolation,
  ): BusinessRuleValidationResultBuilder {
    this.violations.push(violation);
    return this;
  }

  /**
   * 添加多个违反
   * @param violations 业务规则违反列表
   * @returns 构建器实例
   */
  public addViolations(
    violations: BusinessRuleViolation[],
  ): BusinessRuleValidationResultBuilder {
    this.violations.push(...violations);
    return this;
  }

  /**
   * 添加警告
   * @param warning 业务规则警告
   * @returns 构建器实例
   */
  public addWarning(
    warning: BusinessRuleViolation,
  ): BusinessRuleValidationResultBuilder {
    this.warnings.push(warning);
    return this;
  }

  /**
   * 添加多个警告
   * @param warnings 业务规则警告列表
   * @returns 构建器实例
   */
  public addWarnings(
    warnings: BusinessRuleViolation[],
  ): BusinessRuleValidationResultBuilder {
    this.warnings.push(...warnings);
    return this;
  }

  /**
   * 添加信息
   * @param info 业务规则信息
   * @returns 构建器实例
   */
  public addInfo(
    info: BusinessRuleViolation,
  ): BusinessRuleValidationResultBuilder {
    this.info.push(info);
    return this;
  }

  /**
   * 添加多个信息
   * @param info 业务规则信息列表
   * @returns 构建器实例
   */
  public addInfos(
    info: BusinessRuleViolation[],
  ): BusinessRuleValidationResultBuilder {
    this.info.push(...info);
    return this;
  }

  /**
   * 设置执行时间
   * @param executionTime 执行时间（毫秒）
   * @returns 构建器实例
   */
  public setExecutionTime(
    executionTime: number,
  ): BusinessRuleValidationResultBuilder {
    this.executionTime = executionTime;
    return this;
  }

  /**
   * 设置规则执行数量
   * @param rulesExecuted 规则执行数量
   * @returns 构建器实例
   */
  public setRulesExecuted(
    rulesExecuted: number,
  ): BusinessRuleValidationResultBuilder {
    this.rulesExecuted = rulesExecuted;
    return this;
  }

  /**
   * 设置实体验证数量
   * @param entitiesValidated 实体验证数量
   * @returns 构建器实例
   */
  public setEntitiesValidated(
    entitiesValidated: number,
  ): BusinessRuleValidationResultBuilder {
    this.entitiesValidated = entitiesValidated;
    return this;
  }

  /**
   * 设置上下文
   * @param context 业务规则验证结果上下文
   * @returns 构建器实例
   */
  public setContext(
    context: BusinessRuleValidationResultContext,
  ): BusinessRuleValidationResultBuilder {
    this.context = context;
    return this;
  }

  /**
   * 设置验证状态
   * @param isValid 是否有效
   * @returns 构建器实例
   */
  public setIsValid(_isValid: boolean): BusinessRuleValidationResultBuilder {
    // 这个状态会根据违反数量自动计算
    return this;
  }

  /**
   * 清空所有违反
   * @returns 构建器实例
   */
  public clearViolations(): BusinessRuleValidationResultBuilder {
    this.violations = [];
    return this;
  }

  /**
   * 清空所有警告
   * @returns 构建器实例
   */
  public clearWarnings(): BusinessRuleValidationResultBuilder {
    this.warnings = [];
    return this;
  }

  /**
   * 清空所有信息
   * @returns 构建器实例
   */
  public clearInfo(): BusinessRuleValidationResultBuilder {
    this.info = [];
    return this;
  }

  /**
   * 清空所有内容
   * @returns 构建器实例
   */
  public clearAll(): BusinessRuleValidationResultBuilder {
    this.violations = [];
    this.warnings = [];
    this.info = [];
    return this;
  }

  /**
   * 获取当前违反数量
   * @returns 违反数量
   */
  public getViolationCount(): number {
    return this.violations.length;
  }

  /**
   * 获取当前警告数量
   * @returns 警告数量
   */
  public getWarningCount(): number {
    return this.warnings.length;
  }

  /**
   * 获取当前信息数量
   * @returns 信息数量
   */
  public getInfoCount(): number {
    return this.info.length;
  }

  /**
   * 检查是否有违反
   * @returns 是否有违反
   */
  public hasViolations(): boolean {
    return this.violations.length > 0;
  }

  /**
   * 检查是否有警告
   * @returns 是否有警告
   */
  public hasWarnings(): boolean {
    return this.warnings.length > 0;
  }

  /**
   * 检查是否有信息
   * @returns 是否有信息
   */
  public hasInfo(): boolean {
    return this.info.length > 0;
  }

  /**
   * 构建业务规则验证结果
   * @returns 业务规则验证结果实例
   */
  public build(): BusinessRuleValidationResult {
    if (!this.entityType || !this.entityId) {
      throw new Error("Entity type and ID are required");
    }

    const isValid = this.violations.length === 0;

    return new BusinessRuleValidationResult({
      isValid,
      entityType: this.entityType,
      entityId: this.entityId,
      violations: this.violations,
      warnings: this.warnings,
      info: this.info,
      executionTime: this.executionTime,
      rulesExecuted: this.rulesExecuted,
      entitiesValidated: this.entitiesValidated,
      context: this.context,
    });
  }

  /**
   * 重置构建器
   * @returns 构建器实例
   */
  public reset(): BusinessRuleValidationResultBuilder {
    this.entityType = "";
    this.entityId = "";
    this.violations = [];
    this.warnings = [];
    this.info = [];
    this.executionTime = 0;
    this.rulesExecuted = 0;
    this.entitiesValidated = 0;
    this.context = undefined;
    return this;
  }
}
