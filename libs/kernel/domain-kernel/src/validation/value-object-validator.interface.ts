/**
 * @fileoverview Value Object Validator Interface - 值对象验证器接口
 * @description 值对象专用的验证器接口
 */

import { ValueObject } from "../value-objects/base/value-object.base.js";
import { SimpleValidationResult } from "./rules/simple-validation-result.js";
import { ValidationContext } from "./rules/validation-rule.interface.js";

// 重新导出ValidationContext以便外部使用
export type { ValidationContext };

/**
 * 值对象验证规则接口
 * @description 值对象专用的验证规则接口
 * @template T 值对象类型
 */
export interface IValueObjectValidationRule<T extends ValueObject<unknown>> {
  /** 规则名称 */
  name: string;
  /** 规则描述 */
  description: string;
  /** 验证逻辑 */
  validate(value: T): SimpleValidationResult;
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
 * 值对象验证结果接口
 * @description 值对象验证的结果接口
 */
export interface IValueObjectValidationResult extends SimpleValidationResult {
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
 * 值对象验证器接口
 * @description 值对象专用的验证器接口
 * @template T 值对象类型
 */
export interface IValueObjectValidator<T extends ValueObject<unknown>> {
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
