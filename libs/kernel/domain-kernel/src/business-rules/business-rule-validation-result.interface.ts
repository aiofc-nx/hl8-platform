/**
 * @fileoverview 业务规则验证结果接口
 * @description 定义业务规则验证结果的数据结构和行为
 */

import type { BusinessRuleViolation } from "./business-rule-violation.interface.js";
import { BusinessRuleSeverity } from "./business-rule.interface.js";

/**
 * 业务规则验证结果接口
 * @description 表示业务规则验证操作的结果，包含验证状态、违反信息等
 */
export interface BusinessRuleValidationResult {
  /**
   * 验证是否通过
   * @description 当所有业务规则都通过时为true，否则为false
   */
  readonly isValid: boolean;

  /**
   * 实体类型
   * @description 被验证实体的类型
   */
  readonly entityType: string;

  /**
   * 实体ID
   * @description 被验证实体的ID
   */
  readonly entityId: string;

  /**
   * 业务规则违反列表
   * @description 验证过程中发现的所有业务规则违反
   */
  readonly violations: readonly BusinessRuleViolation[];

  /**
   * 警告列表
   * @description 验证过程中的警告信息
   */
  readonly warnings: readonly BusinessRuleViolation[];

  /**
   * 信息列表
   * @description 验证过程中的信息性消息
   */
  readonly info: readonly BusinessRuleViolation[];

  /**
   * 验证执行时间（毫秒）
   * @description 验证过程消耗的时间
   */
  readonly executionTime: number;

  /**
   * 验证的规则数量
   * @description 参与验证的业务规则总数
   */
  readonly rulesExecuted: number;

  /**
   * 验证的实体数量
   * @description 参与验证的实体总数
   */
  readonly entitiesValidated: number;

  /**
   * 验证上下文
   * @description 验证过程中的上下文信息
   */
  readonly context?: BusinessRuleValidationResultContext;

  /**
   * 检查是否有违反
   * @returns 是否存在业务规则违反
   */
  hasViolations(): boolean;

  /**
   * 检查是否有警告
   * @returns 是否存在警告
   */
  hasWarnings(): boolean;

  /**
   * 检查是否有信息
   * @returns 是否存在信息
   */
  hasInfo(): boolean;

  /**
   * 获取所有消息
   * @description 获取所有违反、警告和信息的消息
   * @returns 所有消息的数组
   */
  getAllMessages(): string[];

  /**
   * 获取指定级别的消息
   * @param severity 严重程度级别
   * @returns 指定级别的消息数组
   */
  getMessagesBySeverity(severity: BusinessRuleSeverity): string[];

  /**
   * 获取指定规则类型的违反
   * @param ruleName 规则名称
   * @returns 指定规则类型的违反数组
   */
  getViolationsForRule(ruleName: string): BusinessRuleViolation[];

  /**
   * 获取指定严重程度的违反
   * @param severity 严重程度
   * @returns 指定严重程度的违反数组
   */
  getViolationsBySeverity(
    severity: BusinessRuleSeverity,
  ): BusinessRuleViolation[];

  /**
   * 获取指定规则类型的违反
   * @param ruleType 规则类型
   * @returns 指定规则类型的违反数组
   */
  getViolationsByRuleType(ruleType: string): BusinessRuleViolation[];

  /**
   * 合并业务规则验证结果
   * @param other 要合并的业务规则验证结果
   * @returns 合并后的业务规则验证结果
   */
  merge(other: BusinessRuleValidationResult): BusinessRuleValidationResult;

  /**
   * 转换为JSON格式
   * @returns JSON格式的业务规则验证结果
   */
  toJSON(): BusinessRuleValidationResultJSON;

  /**
   * 转换为字符串格式
   * @returns 字符串格式的业务规则验证结果
   */
  toString(): string;
}

/**
 * 业务规则验证结果上下文接口
 * @description 提供业务规则验证结果的上下文信息
 */
export interface BusinessRuleValidationResultContext {
  /**
   * 验证开始时间
   * @description 验证开始的时间戳
   */
  readonly startTime: number;

  /**
   * 验证结束时间
   * @description 验证结束的时间戳
   */
  readonly endTime: number;

  /**
   * 验证的实体列表
   * @description 参与验证的实体标识符列表
   */
  readonly validatedEntities: readonly string[];

  /**
   * 执行的规则列表
   * @description 参与验证的规则名称列表
   */
  readonly executedRules: readonly string[];

  /**
   * 验证选项
   * @description 验证过程中使用的选项
   */
  readonly options?:
    | BusinessRuleValidationResultOptions
    | Record<string, unknown>;

  /**
   * 自定义数据
   * @description 验证过程中的自定义数据
   */
  readonly customData?: Record<string, unknown>;

  /**
   * 操作类型
   * @description 触发验证的操作类型
   */
  readonly operationType?: string;

  /**
   * 验证级别
   * @description 验证的严格程度级别
   */
  readonly validationLevel?: string;
}

/**
 * 业务规则验证结果选项接口
 * @description 定义业务规则验证结果的选项配置
 */
export interface BusinessRuleValidationResultOptions {
  /**
   * 是否包含执行时间
   * @description 是否在结果中包含执行时间信息
   */
  includeExecutionTime?: boolean;

  /**
   * 是否包含规则信息
   * @description 是否在结果中包含规则执行信息
   */
  includeRuleInfo?: boolean;

  /**
   * 是否包含实体信息
   * @description 是否在结果中包含实体验证信息
   */
  includeEntityInfo?: boolean;

  /**
   * 是否包含上下文信息
   * @description 是否在结果中包含上下文信息
   */
  includeContextInfo?: boolean;

  /**
   * 最大违反数量
   * @description 结果中保留的最大违反数量
   */
  maxViolations?: number;

  /**
   * 最大警告数量
   * @description 结果中保留的最大警告数量
   */
  maxWarnings?: number;

  /**
   * 是否包含严重程度统计
   * @description 是否在结果中包含严重程度统计信息
   */
  includeSeverityStats?: boolean;

  /**
   * 是否包含规则类型统计
   * @description 是否在结果中包含规则类型统计信息
   */
  includeRuleTypeStats?: boolean;
}

/**
 * 业务规则验证结果JSON接口
 * @description 业务规则验证结果的JSON序列化格式
 */
export interface BusinessRuleValidationResultJSON {
  /**
   * 验证是否通过
   */
  isValid: boolean;

  /**
   * 实体类型
   */
  entityType: string;

  /**
   * 实体ID
   */
  entityId: string;

  /**
   * 违反数量
   */
  violationCount: number;

  /**
   * 警告数量
   */
  warningCount: number;

  /**
   * 信息数量
   */
  infoCount: number;

  /**
   * 执行时间（毫秒）
   */
  executionTime: number;

  /**
   * 规则执行数量
   */
  rulesExecuted: number;

  /**
   * 实体验证数量
   */
  entitiesValidated: number;

  /**
   * 违反列表
   */
  violations: Array<{
    message: string;
    code: string;
    ruleName: string;
    ruleType?: string;
    severity: string;
    details?: Record<string, unknown>;
    timestamp: number;
  }>;

  /**
   * 警告列表
   */
  warnings: Array<{
    message: string;
    code: string;
    ruleName: string;
    ruleType?: string;
    severity: string;
    details?: Record<string, unknown>;
    timestamp: number;
  }>;

  /**
   * 信息列表
   */
  info: Array<{
    message: string;
    code: string;
    ruleName: string;
    ruleType?: string;
    severity: string;
    details?: Record<string, unknown>;
    timestamp: number;
  }>;

  /**
   * 严重程度统计
   */
  severityStats?: Record<string, number>;

  /**
   * 规则类型统计
   */
  ruleTypeStats?: Record<string, number>;
}

/**
 * 业务规则验证结果构建器接口
 * @description 用于构建业务规则验证结果的构建器接口
 */
export interface BusinessRuleValidationResultBuilder {
  /**
   * 设置实体信息
   * @param entityType 实体类型
   * @param entityId 实体ID
   * @returns 构建器实例
   */
  setEntity(
    entityType: string,
    entityId: string,
  ): BusinessRuleValidationResultBuilder;

  /**
   * 添加违反
   * @param violation 业务规则违反
   * @returns 构建器实例
   */
  addViolation(
    violation: BusinessRuleViolation,
  ): BusinessRuleValidationResultBuilder;

  /**
   * 添加多个违反
   * @param violations 业务规则违反列表
   * @returns 构建器实例
   */
  addViolations(
    violations: BusinessRuleViolation[],
  ): BusinessRuleValidationResultBuilder;

  /**
   * 添加警告
   * @param warning 业务规则警告
   * @returns 构建器实例
   */
  addWarning(
    warning: BusinessRuleViolation,
  ): BusinessRuleValidationResultBuilder;

  /**
   * 添加多个警告
   * @param warnings 业务规则警告列表
   * @returns 构建器实例
   */
  addWarnings(
    warnings: BusinessRuleViolation[],
  ): BusinessRuleValidationResultBuilder;

  /**
   * 添加信息
   * @param info 业务规则信息
   * @returns 构建器实例
   */
  addInfo(info: BusinessRuleViolation): BusinessRuleValidationResultBuilder;

  /**
   * 添加多个信息
   * @param info 业务规则信息列表
   * @returns 构建器实例
   */
  addInfos(info: BusinessRuleViolation[]): BusinessRuleValidationResultBuilder;

  /**
   * 设置执行时间
   * @param executionTime 执行时间（毫秒）
   * @returns 构建器实例
   */
  setExecutionTime(executionTime: number): BusinessRuleValidationResultBuilder;

  /**
   * 设置规则执行数量
   * @param rulesExecuted 规则执行数量
   * @returns 构建器实例
   */
  setRulesExecuted(rulesExecuted: number): BusinessRuleValidationResultBuilder;

  /**
   * 设置实体验证数量
   * @param entitiesValidated 实体验证数量
   * @returns 构建器实例
   */
  setEntitiesValidated(
    entitiesValidated: number,
  ): BusinessRuleValidationResultBuilder;

  /**
   * 设置上下文
   * @param context 业务规则验证结果上下文
   * @returns 构建器实例
   */
  setContext(
    context: BusinessRuleValidationResultContext,
  ): BusinessRuleValidationResultBuilder;

  /**
   * 设置验证状态
   * @param isValid 是否有效
   * @returns 构建器实例
   */
  setIsValid(isValid: boolean): BusinessRuleValidationResultBuilder;

  /**
   * 清空所有违反
   * @returns 构建器实例
   */
  clearViolations(): BusinessRuleValidationResultBuilder;

  /**
   * 清空所有警告
   * @returns 构建器实例
   */
  clearWarnings(): BusinessRuleValidationResultBuilder;

  /**
   * 清空所有信息
   * @returns 构建器实例
   */
  clearInfo(): BusinessRuleValidationResultBuilder;

  /**
   * 清空所有内容
   * @returns 构建器实例
   */
  clearAll(): BusinessRuleValidationResultBuilder;

  /**
   * 获取当前违反数量
   * @returns 违反数量
   */
  getViolationCount(): number;

  /**
   * 获取当前警告数量
   * @returns 警告数量
   */
  getWarningCount(): number;

  /**
   * 获取当前信息数量
   * @returns 信息数量
   */
  getInfoCount(): number;

  /**
   * 检查是否有违反
   * @returns 是否有违反
   */
  hasViolations(): boolean;

  /**
   * 检查是否有警告
   * @returns 是否有警告
   */
  hasWarnings(): boolean;

  /**
   * 检查是否有信息
   * @returns 是否有信息
   */
  hasInfo(): boolean;

  /**
   * 构建业务规则验证结果
   * @returns 业务规则验证结果实例
   */
  build(): BusinessRuleValidationResult;

  /**
   * 重置构建器
   * @returns 构建器实例
   */
  reset(): BusinessRuleValidationResultBuilder;
}
