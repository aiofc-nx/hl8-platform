/**
 * @fileoverview Business Specification Interface - 业务规范接口
 * @description 用于业务规则验证的规范接口定义
 */

import { ISpecification } from "./specification.interface.js";
import { BusinessRule } from "../business-rules/business-rule.js";
import { BusinessRuleViolation } from "../business-rules/business-rule-violation.js";

/**
 * 业务规范接口
 * @description 用于业务规则验证的规范，提供业务逻辑验证功能
 * @template T 验证对象类型
 */
export interface IBusinessSpecification<T> extends ISpecification<T> {
  /**
   * 获取业务规则
   * @description 获取规范中包含的业务规则
   * @returns 业务规则列表
   */
  getBusinessRules(): BusinessRule<T>[];

  /**
   * 验证业务规则
   * @description 验证对象是否满足所有业务规则
   * @param candidate 候选对象
   * @returns 验证结果
   */
  validateBusinessRules(candidate: T): BusinessSpecificationValidationResult;

  /**
   * 检查业务规则冲突
   * @description 检查规范中的业务规则是否存在冲突
   * @returns 冲突检查结果
   */
  checkConflicts(): BusinessRuleConflictResult;

  /**
   * 获取规范优先级
   * @description 获取规范的优先级（用于冲突解决）
   * @returns 优先级（1-10，10为最高）
   */
  getPriority(): number;

  /**
   * 设置规范优先级
   * @param priority 优先级
   * @returns 新的业务规范实例
   */
  withPriority(priority: number): IBusinessSpecification<T>;

  /**
   * 获取规范严重性
   * @description 获取规范违反时的严重性级别
   * @returns 严重性级别
   */
  getSeverity(): BusinessRuleSeverity;

  /**
   * 设置规范严重性
   * @param severity 严重性级别
   * @returns 新的业务规范实例
   */
  withSeverity(severity: BusinessRuleSeverity): IBusinessSpecification<T>;

  /**
   * 添加业务规则
   * @param rule 业务规则
   * @returns 新的业务规范实例
   */
  addBusinessRule(rule: BusinessRule<T>): IBusinessSpecification<T>;

  /**
   * 移除业务规则
   * @param ruleId 业务规则ID
   * @returns 新的业务规范实例
   */
  removeBusinessRule(ruleId: string): IBusinessSpecification<T>;

  /**
   * 获取规范元数据
   * @description 获取规范的元数据信息
   * @returns 元数据
   */
  getMetadata(): BusinessSpecificationMetadata;

  /**
   * 设置规范元数据
   * @param metadata 元数据
   * @returns 新的业务规范实例
   */
  withMetadata(
    metadata: BusinessSpecificationMetadata,
  ): IBusinessSpecification<T>;

  /**
   * 检查规范是否适用于对象类型
   * @param objectType 对象类型
   * @returns 是否适用
   */
  isApplicableTo(objectType: string): boolean;

  /**
   * 获取规范版本
   * @returns 规范版本
   */
  getVersion(): string;

  /**
   * 检查规范是否已过期
   * @returns 是否已过期
   */
  isExpired(): boolean;

  /**
   * 获取规范过期时间
   * @returns 过期时间，如果永不过期则返回undefined
   */
  getExpirationDate(): Date | undefined;
}

/**
 * 业务规则严重性枚举
 * @description 业务规则违反的严重性级别
 */
export enum BusinessRuleSeverity {
  /** 信息级别 */
  INFO = "INFO",
  /** 警告级别 */
  WARNING = "WARNING",
  /** 错误级别 */
  ERROR = "ERROR",
  /** 严重错误级别 */
  CRITICAL = "CRITICAL",
}

/**
 * 业务规范验证结果接口
 * @description 业务规范验证的结果
 */
export interface BusinessSpecificationValidationResult {
  /** 是否通过验证 */
  isValid: boolean;
  /** 违反的业务规则列表 */
  violations: BusinessRuleViolation[];
  /** 警告信息列表 */
  warnings: string[];
  /** 验证统计信息 */
  statistics: BusinessValidationStatistics;
}

/**
 * 业务验证统计信息接口
 * @description 业务验证过程的统计信息
 */
export interface BusinessValidationStatistics {
  /** 验证开始时间 */
  startTime: Date;
  /** 验证结束时间 */
  endTime: Date;
  /** 验证耗时（毫秒） */
  duration: number;
  /** 检查的业务规则数量 */
  rulesChecked: number;
  /** 违反的业务规则数量 */
  rulesViolated: number;
  /** 通过的业务规则数量 */
  rulesPassed: number;
  /** 严重性分布 */
  severityDistribution: Record<BusinessRuleSeverity, number>;
}

/**
 * 业务规则冲突结果接口
 * @description 业务规则冲突检查的结果
 */
export interface BusinessRuleConflictResult {
  /** 是否存在冲突 */
  hasConflicts: boolean;
  /** 冲突列表 */
  conflicts: BusinessRuleConflict[];
  /** 解决建议 */
  resolutionSuggestions: string[];
}

/**
 * 业务规则冲突接口
 * @description 业务规则之间的冲突信息
 */
export interface BusinessRuleConflict {
  /** 冲突ID */
  conflictId: string;
  /** 冲突的规则列表 */
  conflictingRules: string[];
  /** 冲突类型 */
  conflictType: BusinessRuleConflictType;
  /** 冲突描述 */
  description: string;
  /** 解决建议 */
  resolutionSuggestion: string;
}

/**
 * 业务规则冲突类型枚举
 * @description 业务规则冲突的类型
 */
export enum BusinessRuleConflictType {
  /** 逻辑冲突 */
  LOGICAL = "LOGICAL",
  /** 优先级冲突 */
  PRIORITY = "PRIORITY",
  /** 条件冲突 */
  CONDITIONAL = "CONDITIONAL",
  /** 时间冲突 */
  TEMPORAL = "TEMPORAL",
  /** 资源冲突 */
  RESOURCE = "RESOURCE",
}

/**
 * 业务规范元数据接口
 * @description 业务规范的元数据信息
 */
export interface BusinessSpecificationMetadata {
  /** 规范名称 */
  name: string;
  /** 规范描述 */
  description: string;
  /** 规范版本 */
  version: string;
  /** 创建时间 */
  createdAt: Date;
  /** 创建者 */
  createdBy: string;
  /** 最后修改时间 */
  lastModifiedAt: Date;
  /** 最后修改者 */
  lastModifiedBy: string;
  /** 标签 */
  tags: string[];
  /** 适用对象类型 */
  applicableObjectTypes: string[];
  /** 业务领域 */
  businessDomain: string;
  /** 规范来源 */
  source: string;
  /** 自定义元数据 */
  customData: Record<string, unknown>;
}

/**
 * 业务规范构建器接口
 * @description 用于构建业务规范的构建器
 * @template T 验证对象类型
 */
export interface IBusinessSpecificationBuilder<T> {
  /**
   * 添加业务规则
   * @param rule 业务规则
   * @returns 构建器实例
   */
  addBusinessRule(rule: BusinessRule<T>): IBusinessSpecificationBuilder<T>;

  /**
   * 设置优先级
   * @param priority 优先级
   * @returns 构建器实例
   */
  setPriority(priority: number): IBusinessSpecificationBuilder<T>;

  /**
   * 设置严重性
   * @param severity 严重性级别
   * @returns 构建器实例
   */
  setSeverity(severity: BusinessRuleSeverity): IBusinessSpecificationBuilder<T>;

  /**
   * 设置元数据
   * @param metadata 元数据
   * @returns 构建器实例
   */
  setMetadata(
    metadata: BusinessSpecificationMetadata,
  ): IBusinessSpecificationBuilder<T>;

  /**
   * 构建业务规范
   * @returns 业务规范实例
   */
  build(): IBusinessSpecification<T>;
}
