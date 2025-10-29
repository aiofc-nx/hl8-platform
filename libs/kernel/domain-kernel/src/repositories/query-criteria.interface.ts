/**
 * @fileoverview Query Criteria Interface - 查询条件接口
 * @description 查询条件的通用接口定义
 */

import { QueryCondition } from "./query-condition.interface.js";

/**
 * 查询条件接口
 * @description 封装查询条件的通用接口
 */
export interface QueryCriteria {
  /**
   * 查询条件列表
   * @description 包含所有查询条件的列表
   */
  readonly conditions: readonly QueryCondition[];

  /**
   * 排序条件
   * @description 查询结果的排序规则
   */
  readonly sortBy?: SortCriteria;

  /**
   * 分页条件
   * @description 查询结果的分页规则
   */
  readonly pagination?: PaginationCriteria;

  /**
   * 字段选择
   * @description 需要返回的字段列表，如果为空则返回所有字段
   */
  readonly selectFields?: readonly string[];

  /**
   * 是否去重
   * @description 是否对查询结果进行去重
   */
  readonly distinct?: boolean;

  /**
   * 查询元数据
   * @description 查询相关的元数据信息
   */
  readonly metadata?: QueryMetadata;
}

/**
 * 排序条件接口
 * @description 定义查询结果的排序规则
 */
export interface SortCriteria {
  /**
   * 排序字段
   * @description 用于排序的字段名
   */
  readonly field: string;

  /**
   * 排序方向
   * @description 排序的方向，asc为升序，desc为降序
   */
  readonly direction: "asc" | "desc";

  /**
   * 排序优先级
   * @description 当有多个排序条件时的优先级，数字越小优先级越高
   */
  readonly priority?: number;
}

/**
 * 分页条件接口
 * @description 定义查询结果的分页规则
 */
export interface PaginationCriteria {
  /**
   * 页码
   * @description 要查询的页码，从1开始
   */
  readonly page: number;

  /**
   * 每页大小
   * @description 每页包含的数据项数量
   */
  readonly pageSize: number;

  /**
   * 最大页大小
   * @description 允许的最大每页大小，用于限制分页大小
   */
  readonly maxPageSize?: number;
}

/**
 * 查询元数据接口
 * @description 查询相关的元数据信息
 */
export interface QueryMetadata {
  /**
   * 查询标识符
   * @description 用于标识查询的唯一标识符
   */
  readonly queryId?: string;

  /**
   * 查询标签
   * @description 用于分类和过滤查询的标签
   */
  readonly tags?: readonly string[];

  /**
   * 查询描述
   * @description 查询的描述信息
   */
  readonly description?: string;

  /**
   * 查询来源
   * @description 查询的来源信息，如用户ID、服务名称等
   */
  readonly source?: string;

  /**
   * 查询时间戳
   * @description 查询创建的时间戳
   */
  readonly timestamp?: number;

  /**
   * 自定义数据
   * @description 额外的自定义数据
   */
  readonly customData?: Record<string, unknown>;
}

/**
 * 查询条件构建器接口
 * @description 用于构建查询条件的构建器
 */
export interface QueryCriteriaBuilder {
  /**
   * 添加相等条件
   * @param field 字段名
   * @param value 字段值
   * @returns 构建器实例
   */
  equals(field: string, value: unknown): QueryCriteriaBuilder;

  /**
   * 添加不等条件
   * @param field 字段名
   * @param value 字段值
   * @returns 构建器实例
   */
  notEquals(field: string, value: unknown): QueryCriteriaBuilder;

  /**
   * 添加大于条件
   * @param field 字段名
   * @param value 字段值
   * @returns 构建器实例
   */
  greaterThan(field: string, value: unknown): QueryCriteriaBuilder;

  /**
   * 添加大于等于条件
   * @param field 字段名
   * @param value 字段值
   * @returns 构建器实例
   */
  greaterThanOrEqual(field: string, value: unknown): QueryCriteriaBuilder;

  /**
   * 添加小于条件
   * @param field 字段名
   * @param value 字段值
   * @returns 构建器实例
   */
  lessThan(field: string, value: unknown): QueryCriteriaBuilder;

  /**
   * 添加小于等于条件
   * @param field 字段名
   * @param value 字段值
   * @returns 构建器实例
   */
  lessThanOrEqual(field: string, value: unknown): QueryCriteriaBuilder;

  /**
   * 添加包含条件
   * @param field 字段名
   * @param value 字段值
   * @returns 构建器实例
   */
  contains(field: string, value: string): QueryCriteriaBuilder;

  /**
   * 添加开始于条件
   * @param field 字段名
   * @param value 字段值
   * @returns 构建器实例
   */
  startsWith(field: string, value: string): QueryCriteriaBuilder;

  /**
   * 添加结束于条件
   * @param field 字段名
   * @param value 字段值
   * @returns 构建器实例
   */
  endsWith(field: string, value: string): QueryCriteriaBuilder;

  /**
   * 添加在列表中条件
   * @param field 字段名
   * @param values 值列表
   * @returns 构建器实例
   */
  in(field: string, values: readonly unknown[]): QueryCriteriaBuilder;

  /**
   * 添加不在列表中条件
   * @param field 字段名
   * @param values 值列表
   * @returns 构建器实例
   */
  notIn(field: string, values: readonly unknown[]): QueryCriteriaBuilder;

  /**
   * 添加为空条件
   * @param field 字段名
   * @returns 构建器实例
   */
  isNull(field: string): QueryCriteriaBuilder;

  /**
   * 添加不为空条件
   * @param field 字段名
   * @returns 构建器实例
   */
  isNotNull(field: string): QueryCriteriaBuilder;

  /**
   * 添加自定义条件
   * @param condition 查询条件
   * @returns 构建器实例
   */
  addCondition(condition: QueryCondition): QueryCriteriaBuilder;

  /**
   * 设置排序条件
   * @param sortBy 排序条件
   * @returns 构建器实例
   */
  sortBy(sortBy: SortCriteria): QueryCriteriaBuilder;

  /**
   * 设置分页条件
   * @param pagination 分页条件
   * @returns 构建器实例
   */
  paginate(pagination: PaginationCriteria): QueryCriteriaBuilder;

  /**
   * 设置字段选择
   * @param fields 字段列表
   * @returns 构建器实例
   */
  select(fields: readonly string[]): QueryCriteriaBuilder;

  /**
   * 设置去重
   * @param distinct 是否去重
   * @returns 构建器实例
   */
  distinct(distinct: boolean): QueryCriteriaBuilder;

  /**
   * 设置元数据
   * @param metadata 元数据
   * @returns 构建器实例
   */
  withMetadata(metadata: QueryMetadata): QueryCriteriaBuilder;

  /**
   * 构建查询条件
   * @returns 查询条件实例
   */
  build(): QueryCriteria;
}
