/**
 * @fileoverview 业务规则违反接口
 * @description 定义业务规则违反的数据结构和行为
 */

import { BusinessRuleSeverity } from "./business-rule.interface.js";

/**
 * 业务规则违反接口
 * @description 表示业务规则违反的信息，包含违反详情、严重程度等
 */
export interface BusinessRuleViolation {
  /**
   * 违反消息
   * @description 人类可读的违反描述
   */
  readonly message: string;

  /**
   * 违反代码
   * @description 机器可读的违反标识符
   */
  readonly code: string;

  /**
   * 规则名称
   * @description 产生此违反的业务规则名称
   */
  readonly ruleName?: string;

  /**
   * 规则类型
   * @description 产生此违反的业务规则类型
   */
  readonly ruleType?: string;

  /**
   * 严重程度
   * @description 违反的严重程度级别
   */
  readonly severity: BusinessRuleSeverity;

  /**
   * 违反详情
   * @description 违反的额外详细信息
   */
  readonly details?: Record<string, unknown>;

  /**
   * 违反时间戳
   * @description 违反发生的时间戳
   */
  readonly timestamp: Date;

  /**
   * 违反路径
   * @description 在嵌套对象中的违反路径
   */
  readonly path?: string[];

  /**
   * 违反值
   * @description 导致违反的值
   */
  readonly value?: unknown;

  /**
   * 违反位置
   * @description 违反在值中的位置信息
   */
  readonly position?: BusinessRuleViolationPosition;

  /**
   * 实体类型
   * @description 发生违反的实体类型
   */
  readonly entityType?: string;

  /**
   * 实体ID
   * @description 发生违反的实体ID
   */
  readonly entityId?: string;

  /**
   * 操作类型
   * @description 触发违反的操作类型
   */
  readonly operationType?: string;

  /**
   * 检查是否为错误级别
   * @returns 是否为错误级别
   */
  isError(): boolean;

  /**
   * 检查是否为警告级别
   * @returns 是否为警告级别
   */
  isWarning(): boolean;

  /**
   * 检查是否为信息级别
   * @returns 是否为信息级别
   */
  isInfo(): boolean;

  /**
   * 检查是否为严重级别
   * @returns 是否为严重级别
   */
  isCritical(): boolean;

  /**
   * 获取完整路径
   * @description 获取包含规则名称的完整违反路径
   * @returns 完整的违反路径
   */
  getFullPath(): string;

  /**
   * 获取格式化消息
   * @description 获取包含路径和上下文的格式化违反消息
   * @returns 格式化的违反消息
   */
  getFormattedMessage(): string;

  /**
   * 转换为JSON格式
   * @returns JSON格式的违反信息
   */
  toJSON(): BusinessRuleViolationJSON;

  /**
   * 转换为字符串格式
   * @returns 字符串格式的违反信息
   */
  toString(): string;

  /**
   * 克隆违反
   * @param overrides 要覆盖的属性
   * @returns 克隆的违反实例
   */
  clone(overrides?: Partial<BusinessRuleViolationData>): BusinessRuleViolation;
}

/**
 * 业务规则违反位置接口
 * @description 定义违反在值中的位置信息
 */
export interface BusinessRuleViolationPosition {
  /**
   * 行号
   * @description 违反所在的行号（从1开始）
   */
  line?: number;

  /**
   * 列号
   * @description 违反所在的列号（从1开始）
   */
  column?: number;

  /**
   * 字符位置
   * @description 违反在字符串中的字符位置（从0开始）
   */
  offset?: number;

  /**
   * 长度
   * @description 违反值的长度
   */
  length?: number;

  /**
   * 索引
   * @description 违反在数组中的索引
   */
  readonly index?: number;

  /**
   * 属性名
   * @description 违反在对象中的属性名
   */
  readonly property?: string;

  /**
   * 字段名
   * @description 违反在实体中的字段名
   */
  readonly fieldName?: string;
}

/**
 * 业务规则违反数据接口
 * @description 定义创建业务规则违反所需的数据
 */
export interface BusinessRuleViolationData {
  /**
   * 违反消息
   */
  message: string;

  /**
   * 违反代码
   */
  code: string;

  /**
   * 规则名称
   */
  ruleName: string;

  /**
   * 规则类型
   */
  ruleType?: string;

  /**
   * 严重程度
   */
  severity: BusinessRuleSeverity;

  /**
   * 违反详情
   */
  details?: Record<string, unknown>;

  /**
   * 违反时间戳
   */
  timestamp?: Date;

  /**
   * 违反路径
   */
  path?: string[];

  /**
   * 违反值
   */
  value?: unknown;

  /**
   * 违反位置
   */
  position?: BusinessRuleViolationPosition;

  /**
   * 实体类型
   */
  entityType?: string;

  /**
   * 实体ID
   */
  entityId?: string;

  /**
   * 操作类型
   */
  operationType?: string;
}

/**
 * 业务规则违反JSON接口
 * @description 业务规则违反的JSON序列化格式
 */
export interface BusinessRuleViolationJSON {
  /**
   * 违反消息
   */
  message: string;

  /**
   * 违反代码
   */
  code: string;

  /**
   * 规则名称
   */
  ruleName: string;

  /**
   * 规则类型
   */
  ruleType?: string;

  /**
   * 严重程度
   */
  severity: string;

  /**
   * 违反详情
   */
  details?: Record<string, unknown>;

  /**
   * 违反时间戳
   */
  timestamp: number;

  /**
   * 违反路径
   */
  path?: string[];

  /**
   * 违反值
   */
  value?: unknown;

  /**
   * 违反位置
   */
  position?: BusinessRuleViolationPosition;

  /**
   * 实体类型
   */
  entityType?: string;

  /**
   * 实体ID
   */
  entityId?: string;

  /**
   * 操作类型
   */
  operationType?: string;
}

/**
 * 业务规则违反构建器接口
 * @description 用于构建业务规则违反的构建器接口
 */
export interface BusinessRuleViolationBuilder {
  /**
   * 设置消息
   * @param message 违反消息
   * @returns 构建器实例
   */
  setMessage(message: string): BusinessRuleViolationBuilder;

  /**
   * 设置代码
   * @param code 违反代码
   * @returns 构建器实例
   */
  setCode(code: string): BusinessRuleViolationBuilder;

  /**
   * 设置规则名称
   * @param ruleName 规则名称
   * @returns 构建器实例
   */
  setRuleName(ruleName: string): BusinessRuleViolationBuilder;

  /**
   * 设置规则类型
   * @param ruleType 规则类型
   * @returns 构建器实例
   */
  setRuleType(ruleType: string): BusinessRuleViolationBuilder;

  /**
   * 设置严重程度
   * @param severity 严重程度
   * @returns 构建器实例
   */
  setSeverity(severity: BusinessRuleSeverity): BusinessRuleViolationBuilder;

  /**
   * 设置详情
   * @param details 违反详情
   * @returns 构建器实例
   */
  setDetails(details: Record<string, unknown>): BusinessRuleViolationBuilder;

  /**
   * 设置时间戳
   * @param timestamp 违反时间戳
   * @returns 构建器实例
   */
  setTimestamp(timestamp: Date): BusinessRuleViolationBuilder;

  /**
   * 设置路径
   * @param path 违反路径
   * @returns 构建器实例
   */
  setPath(path: string[]): BusinessRuleViolationBuilder;

  /**
   * 设置值
   * @param value 违反值
   * @returns 构建器实例
   */
  setValue(value: unknown): BusinessRuleViolationBuilder;

  /**
   * 设置位置
   * @param position 违反位置
   * @returns 构建器实例
   */
  setPosition(
    position: BusinessRuleViolationPosition,
  ): BusinessRuleViolationBuilder;

  /**
   * 设置实体信息
   * @param entityType 实体类型
   * @param entityId 实体ID
   * @returns 构建器实例
   */
  setEntity(entityType: string, entityId: string): BusinessRuleViolationBuilder;

  /**
   * 设置操作类型
   * @param operationType 操作类型
   * @returns 构建器实例
   */
  setOperationType(operationType: string): BusinessRuleViolationBuilder;

  /**
   * 设置行号
   * @param line 行号
   * @returns 构建器实例
   */
  setLine(line: number): BusinessRuleViolationBuilder;

  /**
   * 设置列号
   * @param column 列号
   * @returns 构建器实例
   */
  setColumn(column: number): BusinessRuleViolationBuilder;

  /**
   * 设置字符位置
   * @param offset 字符位置
   * @returns 构建器实例
   */
  setOffset(offset: number): BusinessRuleViolationBuilder;

  /**
   * 设置长度
   * @param length 长度
   * @returns 构建器实例
   */
  setLength(length: number): BusinessRuleViolationBuilder;

  /**
   * 设置索引
   * @param index 索引
   * @returns 构建器实例
   */
  setIndex(index: number): BusinessRuleViolationBuilder;

  /**
   * 设置属性名
   * @param property 属性名
   * @returns 构建器实例
   */
  setProperty(property: string): BusinessRuleViolationBuilder;

  /**
   * 设置字段名
   * @param fieldName 字段名
   * @returns 构建器实例
   */
  setFieldName(fieldName: string): BusinessRuleViolationBuilder;

  /**
   * 添加详情项
   * @param key 详情键
   * @param value 详情值
   * @returns 构建器实例
   */
  addDetail(key: string, value: unknown): BusinessRuleViolationBuilder;

  /**
   * 添加多个详情项
   * @param details 详情对象
   * @returns 构建器实例
   */
  addDetails(details: Record<string, unknown>): BusinessRuleViolationBuilder;

  /**
   * 清空详情
   * @returns 构建器实例
   */
  clearDetails(): BusinessRuleViolationBuilder;

  /**
   * 设置当前时间戳
   * @returns 构建器实例
   */
  setCurrentTimestamp(): BusinessRuleViolationBuilder;

  /**
   * 从现有违反复制
   * @param violation 现有违反
   * @returns 构建器实例
   */
  copyFrom(violation: BusinessRuleViolation): BusinessRuleViolationBuilder;

  /**
   * 从违反数据复制
   * @param data 违反数据
   * @returns 构建器实例
   */
  copyFromData(data: BusinessRuleViolationData): BusinessRuleViolationBuilder;

  /**
   * 构建业务规则违反
   * @returns 业务规则违反实例
   */
  build(): BusinessRuleViolation;

  /**
   * 重置构建器
   * @returns 构建器实例
   */
  reset(): BusinessRuleViolationBuilder;
}

/**
 * 业务规则违反比较器接口
 * @description 用于比较业务规则违反的接口
 */
export interface BusinessRuleViolationComparator {
  /**
   * 比较两个违反
   * @param a 第一个违反
   * @param b 第二个违反
   * @returns 比较结果（负数表示a < b，0表示a = b，正数表示a > b）
   */
  compare(a: BusinessRuleViolation, b: BusinessRuleViolation): number;

  /**
   * 检查两个违反是否相等
   * @param a 第一个违反
   * @param b 第二个违反
   * @returns 是否相等
   */
  equals(a: BusinessRuleViolation, b: BusinessRuleViolation): boolean;

  /**
   * 检查违反是否匹配条件
   * @param violation 要检查的违反
   * @param condition 匹配条件
   * @returns 是否匹配
   */
  matches(
    violation: BusinessRuleViolation,
    condition: BusinessRuleViolationCondition,
  ): boolean;
}

/**
 * 业务规则违反条件接口
 * @description 定义业务规则违反的匹配条件
 */
export interface BusinessRuleViolationCondition {
  /**
   * 规则名称匹配
   */
  ruleName?: string | RegExp;

  /**
   * 规则类型匹配
   */
  ruleType?: string | RegExp;

  /**
   * 严重程度匹配
   */
  severity?: BusinessRuleSeverity | BusinessRuleSeverity[];

  /**
   * 违反代码匹配
   */
  code?: string | RegExp;

  /**
   * 消息匹配
   */
  message?: string | RegExp;

  /**
   * 路径匹配
   */
  path?: string[] | RegExp;

  /**
   * 实体类型匹配
   */
  entityType?: string | RegExp;

  /**
   * 实体ID匹配
   */
  entityId?: string | RegExp;

  /**
   * 操作类型匹配
   */
  operationType?: string | RegExp;

  /**
   * 自定义匹配函数
   */
  customMatcher?: (violation: BusinessRuleViolation) => boolean;
}
