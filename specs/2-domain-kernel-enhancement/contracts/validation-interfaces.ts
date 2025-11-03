/**
 * @fileoverview Validation Interfaces - 验证接口定义
 * @description 定义值对象验证和模型版本管理的接口
 */

import { ValidationResult } from "@hl8/domain-kernel";
import { ValidationRule } from "@hl8/domain-kernel";
import { ValidationContext } from "@hl8/domain-kernel";
import { ValueObject } from "@hl8/domain-kernel";

/**
 * 值对象验证器接口
 * @description 值对象专用的验证器接口
 * @template T 值对象类型
 */
export interface IValueObjectValidator<T extends ValueObject> {
  /**
   * 验证值对象
   * @param value 要验证的值对象
   * @param rules 验证规则列表
   * @returns 验证结果
   */
  validate(
    value: T,
    rules: IValueObjectValidationRule<T>[],
  ): IValueObjectValidationResult;

  /**
   * 使用上下文验证值对象
   * @param value 要验证的值对象
   * @param context 验证上下文
   * @returns 验证结果
   */
  validateWithContext(
    value: T,
    context: ValidationContext,
  ): IValueObjectValidationResult;

  /**
   * 添加验证规则
   * @param rule 验证规则
   */
  addRule(rule: IValueObjectValidationRule<T>): void;

  /**
   * 移除验证规则
   * @param ruleName 规则名称
   * @returns 是否移除成功
   */
  removeRule(ruleName: string): boolean;

  /**
   * 获取所有验证规则
   * @returns 验证规则列表
   */
  getRules(): IValueObjectValidationRule<T>[];

  /**
   * 清空所有验证规则
   */
  clearRules(): void;
}

/**
 * 值对象验证规则接口
 * @description 值对象专用的验证规则接口
 * @template T 值对象类型
 */
export interface IValueObjectValidationRule<T extends ValueObject> {
  /** 规则名称 */
  name: string;
  /** 规则描述 */
  description: string;
  /** 验证逻辑 */
  validate(value: T): ValidationResult;
  /** 规则优先级 */
  priority: number;
  /** 是否启用 */
  enabled: boolean;
  /** 规则标签 */
  tags: string[];
  /** 规则元数据 */
  metadata: Record<string, unknown>;
}

/**
 * 值对象验证结果接口
 * @description 值对象验证的结果接口
 */
export interface IValueObjectValidationResult extends ValidationResult {
  /** 值对象类型 */
  valueObjectType: string;
  /** 应用的验证规则 */
  validationRules: string[];
  /** 字段违规列表 */
  fieldViolations: FieldViolation[];
  /** 验证统计信息 */
  statistics: ValidationStatistics;
}

/**
 * 字段违规接口
 * @description 字段级别的验证违规信息
 */
export interface FieldViolation {
  /** 字段名称 */
  field: string;
  /** 字段值 */
  value: unknown;
  /** 违规消息 */
  violation: string;
  /** 违规规则 */
  rule: string;
  /** 违规级别 */
  severity: ViolationSeverity;
  /** 违规代码 */
  code: string;
  /** 违规上下文 */
  context: Record<string, unknown>;
}

/**
 * 违规严重级别枚举
 * @description 验证违规的严重级别
 */
export enum ViolationSeverity {
  /** 信息 */
  INFO = "info",
  /** 警告 */
  WARNING = "warning",
  /** 错误 */
  ERROR = "error",
  /** 严重错误 */
  CRITICAL = "critical",
}

/**
 * 验证统计信息接口
 * @description 验证过程的统计信息
 */
export interface ValidationStatistics {
  /** 验证开始时间 */
  startTime: Date;
  /** 验证结束时间 */
  endTime: Date;
  /** 验证耗时（毫秒） */
  duration: number;
  /** 验证规则数量 */
  rulesCount: number;
  /** 执行的规则数量 */
  executedRulesCount: number;
  /** 违规数量 */
  violationsCount: number;
  /** 字段数量 */
  fieldsCount: number;
  /** 验证的字段数量 */
  validatedFieldsCount: number;
}

/**
 * 模型版本接口
 * @description 领域模型版本信息
 */
export interface IModelVersion {
  /** 主版本号 */
  major: number;
  /** 次版本号 */
  minor: number;
  /** 补丁版本号 */
  patch: number;
  /** 版本元数据 */
  metadata: Record<string, unknown>;
  /** 创建时间 */
  createdAt: Date;
  /** 破坏性变更列表 */
  breakingChanges: string[];
  /** 版本描述 */
  description: string;
  /** 版本标签 */
  tags: string[];
}

/**
 * 版本兼容性检查器接口
 * @description 检查模型版本兼容性
 */
export interface IVersionCompatibilityChecker {
  /**
   * 检查版本兼容性
   * @param from 源版本
   * @param to 目标版本
   * @returns 是否兼容
   */
  isCompatible(from: IModelVersion, to: IModelVersion): boolean;

  /**
   * 获取兼容性问题
   * @param from 源版本
   * @param to 目标版本
   * @returns 兼容性问题列表
   */
  getCompatibilityIssues(from: IModelVersion, to: IModelVersion): string[];

  /**
   * 检查是否可以迁移
   * @param from 源版本
   * @param to 目标版本
   * @returns 是否可以迁移
   */
  canMigrate(from: IModelVersion, to: IModelVersion): boolean;

  /**
   * 获取迁移路径
   * @param from 源版本
   * @param to 目标版本
   * @returns 迁移步骤列表
   */
  getMigrationPath(from: IModelVersion, to: IModelVersion): MigrationStep[];
}

/**
 * 模型迁移器接口
 * @description 模型版本迁移
 */
export interface IModelMigrator {
  /**
   * 迁移数据
   * @param from 源版本
   * @param to 目标版本
   * @param data 要迁移的数据
   * @returns 迁移后的数据
   */
  migrate(from: IModelVersion, to: IModelVersion, data: unknown): unknown;

  /**
   * 获取迁移路径
   * @param from 源版本
   * @param to 目标版本
   * @returns 迁移步骤列表
   */
  getMigrationPath(from: IModelVersion, to: IModelVersion): MigrationStep[];

  /**
   * 验证迁移
   * @param data 要验证的数据
   * @param targetVersion 目标版本
   * @returns 验证结果
   */
  validateMigration(
    data: unknown,
    targetVersion: IModelVersion,
  ): ValidationResult;

  /**
   * 回滚迁移
   * @param from 源版本
   * @param to 目标版本
   * @param data 要回滚的数据
   * @returns 回滚后的数据
   */
  rollbackMigration(
    from: IModelVersion,
    to: IModelVersion,
    data: unknown,
  ): unknown;
}

/**
 * 迁移步骤接口
 * @description 模型迁移的单个步骤
 */
export interface MigrationStep {
  /** 源版本 */
  fromVersion: IModelVersion;
  /** 目标版本 */
  toVersion: IModelVersion;
  /** 迁移函数 */
  migrationFunction: (data: unknown) => unknown;
  /** 步骤描述 */
  description: string;
  /** 是否可逆 */
  isReversible: boolean;
  /** 回滚函数 */
  rollbackFunction?: (data: unknown) => unknown;
  /** 步骤元数据 */
  metadata: Record<string, unknown>;
}

/**
 * 版本比较结果接口
 * @description 版本比较的结果
 */
export interface VersionComparisonResult {
  /** 比较结果 */
  result: VersionComparison;
  /** 差异描述 */
  differences: string[];
  /** 破坏性变更 */
  breakingChanges: string[];
  /** 新增功能 */
  newFeatures: string[];
  /** 修复问题 */
  bugFixes: string[];
}

/**
 * 版本比较枚举
 * @description 版本比较的结果类型
 */
export enum VersionComparison {
  /** 相同版本 */
  EQUAL = "equal",
  /** 新版本 */
  NEWER = "newer",
  /** 旧版本 */
  OLDER = "older",
  /** 不兼容 */
  INCOMPATIBLE = "incompatible",
}

/**
 * 版本范围接口
 * @description 版本范围定义
 */
export interface VersionRange {
  /** 最小版本 */
  minVersion: IModelVersion;
  /** 最大版本 */
  maxVersion: IModelVersion;
  /** 是否包含最小版本 */
  includeMin: boolean;
  /** 是否包含最大版本 */
  includeMax: boolean;
  /** 范围描述 */
  description: string;
}

/**
 * 版本约束接口
 * @description 版本约束定义
 */
export interface VersionConstraint {
  /** 约束类型 */
  type: ConstraintType;
  /** 版本范围 */
  range: VersionRange;
  /** 约束描述 */
  description: string;
  /** 约束元数据 */
  metadata: Record<string, unknown>;
}

/**
 * 约束类型枚举
 * @description 版本约束的类型
 */
export enum ConstraintType {
  /** 兼容性约束 */
  COMPATIBILITY = "compatibility",
  /** 功能约束 */
  FEATURE = "feature",
  /** 性能约束 */
  PERFORMANCE = "performance",
  /** 安全约束 */
  SECURITY = "security",
}
