/**
 * @fileoverview Query Condition Interface - 查询条件接口
 * @description 单个查询条件的接口定义
 */

import { QueryOperator } from "./query-operator.enum.js";

/**
 * 查询条件接口
 * @description 封装单个查询条件的接口
 */
export interface QueryCondition {
  /**
   * 字段名
   * @description 要查询的字段名称
   */
  readonly field: string;

  /**
   * 操作符
   * @description 查询操作的类型
   */
  readonly operator: QueryOperator;

  /**
   * 字段值
   * @description 查询条件的值
   */
  readonly value: unknown;

  /**
   * 条件组
   * @description 条件所属的组，用于逻辑分组
   */
  readonly group?: string;

  /**
   * 条件优先级
   * @description 条件的优先级，数字越小优先级越高
   */
  readonly priority?: number;

  /**
   * 是否忽略大小写
   * @description 对于字符串比较是否忽略大小写
   */
  readonly ignoreCase?: boolean;

  /**
   * 条件元数据
   * @description 条件的额外元数据信息
   */
  readonly metadata?: ConditionMetadata;
}

/**
 * 条件元数据接口
 * @description 查询条件的元数据信息
 */
export interface ConditionMetadata {
  /**
   * 条件描述
   * @description 条件的描述信息
   */
  readonly description?: string;

  /**
   * 条件标签
   * @description 用于分类条件的标签
   */
  readonly tags?: readonly string[];

  /**
   * 条件来源
   * @description 条件的来源信息
   */
  readonly source?: string;

  /**
   * 条件创建时间
   * @description 条件创建的时间戳
   */
  readonly createdAt?: number;

  /**
   * 条件创建者
   * @description 创建条件的用户或系统
   */
  readonly createdBy?: string;

  /**
   * 自定义数据
   * @description 额外的自定义数据
   */
  readonly customData?: Record<string, unknown>;
}

/**
 * 复合查询条件接口
 * @description 包含多个子条件的复合条件
 */
export interface CompositeQueryCondition extends QueryCondition {
  /**
   * 子条件列表
   * @description 包含的所有子条件
   */
  readonly subConditions: readonly QueryCondition[];

  /**
   * 逻辑操作符
   * @description 子条件之间的逻辑关系
   */
  readonly logicalOperator: "AND" | "OR" | "NOT";

  /**
   * 是否否定整个条件
   * @description 是否对复合条件的结果进行否定
   */
  readonly negated?: boolean;
}

/**
 * 范围查询条件接口
 * @description 用于范围查询的条件
 */
export interface RangeQueryCondition extends QueryCondition {
  /**
   * 最小值
   * @description 范围的最小值
   */
  readonly minValue: unknown;

  /**
   * 最大值
   * @description 范围的最大值
   */
  readonly maxValue: unknown;

  /**
   * 是否包含最小值
   * @description 范围是否包含最小值
   */
  readonly includeMin: boolean;

  /**
   * 是否包含最大值
   * @description 范围是否包含最大值
   */
  readonly includeMax: boolean;
}

/**
 * 模糊查询条件接口
 * @description 用于模糊查询的条件
 */
export interface FuzzyQueryCondition extends QueryCondition {
  /**
   * 搜索模式
   * @description 模糊搜索的模式
   */
  readonly pattern: string;

  /**
   * 通配符
   * @description 使用的通配符，如%或*
   */
  readonly wildcard?: string;

  /**
   * 转义字符
   * @description 用于转义特殊字符的字符
   */
  readonly escapeChar?: string;
}

/**
 * 查询条件构建器接口
 * @description 用于构建查询条件的构建器
 */
export interface QueryConditionBuilder {
  /**
   * 设置字段名
   * @param field 字段名
   * @returns 构建器实例
   */
  field(field: string): QueryConditionBuilder;

  /**
   * 设置操作符
   * @param operator 操作符
   * @returns 构建器实例
   */
  operator(operator: QueryOperator): QueryConditionBuilder;

  /**
   * 设置字段值
   * @param value 字段值
   * @returns 构建器实例
   */
  value(value: unknown): QueryConditionBuilder;

  /**
   * 设置条件组
   * @param group 条件组
   * @returns 构建器实例
   */
  group(group: string): QueryConditionBuilder;

  /**
   * 设置优先级
   * @param priority 优先级
   * @returns 构建器实例
   */
  priority(priority: number): QueryConditionBuilder;

  /**
   * 设置忽略大小写
   * @param ignoreCase 是否忽略大小写
   * @returns 构建器实例
   */
  ignoreCase(ignoreCase: boolean): QueryConditionBuilder;

  /**
   * 设置元数据
   * @param metadata 元数据
   * @returns 构建器实例
   */
  metadata(metadata: ConditionMetadata): QueryConditionBuilder;

  /**
   * 构建查询条件
   * @returns 查询条件实例
   */
  build(): QueryCondition;
}
