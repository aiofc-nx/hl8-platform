/**
 * @fileoverview Query Specification Interface - 查询规范接口
 * @description 用于数据库查询的规范接口定义
 */

import { ISpecification } from "./specification.interface.js";
import { QueryCriteria } from "../repositories/query-criteria.interface.js";
import { SortingCriteria } from "./sorting-criteria.interface.js";
import { PaginationCriteria } from "./pagination-criteria.interface.js";

/**
 * 查询规范接口
 * @description 用于数据库查询的规范，提供查询条件、排序和分页功能
 * @template T 查询对象类型
 */
export interface IQuerySpecification<T> extends ISpecification<T> {
  /**
   * 获取查询条件
   * @description 获取用于数据库查询的条件
   * @returns 查询条件
   */
  getQueryCriteria(): QueryCriteria;

  /**
   * 获取排序条件
   * @description 获取用于排序的条件
   * @returns 排序条件，如果未设置则返回undefined
   */
  getSortingCriteria(): SortingCriteria | undefined;

  /**
   * 获取分页条件
   * @description 获取用于分页的条件
   * @returns 分页条件，如果未设置则返回undefined
   */
  getPaginationCriteria(): PaginationCriteria | undefined;

  /**
   * 设置排序条件
   * @param sortingCriteria 排序条件
   * @returns 新的查询规范实例
   */
  withSorting(sortingCriteria: SortingCriteria): IQuerySpecification<T>;

  /**
   * 设置分页条件
   * @param paginationCriteria 分页条件
   * @returns 新的查询规范实例
   */
  withPagination(
    paginationCriteria: PaginationCriteria,
  ): IQuerySpecification<T>;

  /**
   * 添加查询条件
   * @param criteria 查询条件
   * @returns 新的查询规范实例
   */
  andCriteria(criteria: QueryCriteria): IQuerySpecification<T>;

  /**
   * 添加或查询条件
   * @param criteria 查询条件
   * @returns 新的查询规范实例
   */
  orCriteria(criteria: QueryCriteria): IQuerySpecification<T>;

  /**
   * 获取查询限制
   * @description 获取查询结果的最大数量限制
   * @returns 查询限制，如果未设置则返回undefined
   */
  getLimit(): number | undefined;

  /**
   * 设置查询限制
   * @param limit 查询限制
   * @returns 新的查询规范实例
   */
  withLimit(limit: number): IQuerySpecification<T>;

  /**
   * 获取查询偏移
   * @description 获取查询结果的偏移量
   * @returns 查询偏移，如果未设置则返回undefined
   */
  getOffset(): number | undefined;

  /**
   * 设置查询偏移
   * @param offset 查询偏移
   * @returns 新的查询规范实例
   */
  withOffset(offset: number): IQuerySpecification<T>;

  /**
   * 检查是否为空查询
   * @description 检查查询规范是否为空（没有任何条件）
   * @returns 是否为空查询
   */
  isEmpty(): boolean;

  /**
   * 获取查询复杂度
   * @description 获取查询的复杂度评分
   * @returns 复杂度评分（0-100）
   */
  getComplexity(): number;

  /**
   * 优化查询
   * @description 优化查询规范以提高性能
   * @returns 优化后的查询规范实例
   */
  optimize(): IQuerySpecification<T>;

  /**
   * 验证查询规范
   * @description 验证查询规范的有效性
   * @returns 验证结果
   */
  validate(): QuerySpecificationValidationResult;
}

/**
 * 查询规范验证结果接口
 * @description 查询规范验证的结果
 */
export interface QuerySpecificationValidationResult {
  /** 是否有效 */
  isValid: boolean;
  /** 错误消息列表 */
  errors: string[];
  /** 警告消息列表 */
  warnings: string[];
  /** 性能建议 */
  performanceSuggestions: string[];
  /** 复杂度评分 */
  complexityScore: number;
}

/**
 * 查询规范构建器接口
 * @description 用于构建查询规范的构建器
 * @template T 查询对象类型
 */
export interface IQuerySpecificationBuilder<T> {
  /**
   * 添加查询条件
   * @param criteria 查询条件
   * @returns 构建器实例
   */
  addCriteria(criteria: QueryCriteria): IQuerySpecificationBuilder<T>;

  /**
   * 设置排序条件
   * @param sortingCriteria 排序条件
   * @returns 构建器实例
   */
  setSorting(sortingCriteria: SortingCriteria): IQuerySpecificationBuilder<T>;

  /**
   * 设置分页条件
   * @param paginationCriteria 分页条件
   * @returns 构建器实例
   */
  setPagination(
    paginationCriteria: PaginationCriteria,
  ): IQuerySpecificationBuilder<T>;

  /**
   * 设置查询限制
   * @param limit 查询限制
   * @returns 构建器实例
   */
  setLimit(limit: number): IQuerySpecificationBuilder<T>;

  /**
   * 设置查询偏移
   * @param offset 查询偏移
   * @returns 构建器实例
   */
  setOffset(offset: number): IQuerySpecificationBuilder<T>;

  /**
   * 构建查询规范
   * @returns 查询规范实例
   */
  build(): IQuerySpecification<T>;
}

/**
 * 查询规范工厂接口
 * @description 用于创建查询规范的工厂
 * @template T 查询对象类型
 */
export interface IQuerySpecificationFactory<T> {
  /**
   * 创建空查询规范
   * @returns 空查询规范
   */
  createEmpty(): IQuerySpecification<T>;

  /**
   * 从查询条件创建查询规范
   * @param criteria 查询条件
   * @returns 查询规范
   */
  createFromCriteria(criteria: QueryCriteria): IQuerySpecification<T>;

  /**
   * 从JSON创建查询规范
   * @param json JSON表示
   * @returns 查询规范
   */
  createFromJSON(json: Record<string, unknown>): IQuerySpecification<T>;

  /**
   * 创建查询规范构建器
   * @returns 查询规范构建器
   */
  createBuilder(): IQuerySpecificationBuilder<T>;
}
