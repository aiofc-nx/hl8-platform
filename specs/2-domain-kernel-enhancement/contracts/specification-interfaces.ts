/**
 * @fileoverview Specification Interfaces - 规范接口定义
 * @description 定义业务规则和查询的规范接口，支持组合和复合逻辑
 */

import { BusinessRule } from "@hl8/domain-kernel";
import { BusinessRuleSeverity } from "@hl8/domain-kernel";

/**
 * 基础规范接口
 * @description 业务规则和查询的基础规范接口
 * @template T 候选对象类型
 */
export interface ISpecification<T> {
  /**
   * 检查候选对象是否满足规范
   * @param candidate 候选对象
   * @returns 是否满足规范
   */
  isSatisfiedBy(candidate: T): boolean;

  /**
   * 逻辑AND组合
   * @param other 另一个规范
   * @returns 组合后的规范
   */
  and(other: ISpecification<T>): ISpecification<T>;

  /**
   * 逻辑OR组合
   * @param other 另一个规范
   * @returns 组合后的规范
   */
  or(other: ISpecification<T>): ISpecification<T>;

  /**
   * 逻辑NOT组合
   * @returns 否定后的规范
   */
  not(): ISpecification<T>;

  /**
   * 获取规范描述
   * @returns 人类可读的描述
   */
  getDescription(): string;
}

/**
 * AND规范实现
 * @description 逻辑AND组合的规范实现
 * @template T 候选对象类型
 */
export class AndSpecification<T> implements ISpecification<T> {
  constructor(
    private readonly left: ISpecification<T>,
    private readonly right: ISpecification<T>,
  ) {}

  isSatisfiedBy(candidate: T): boolean {
    return (
      this.left.isSatisfiedBy(candidate) && this.right.isSatisfiedBy(candidate)
    );
  }

  and(other: ISpecification<T>): ISpecification<T> {
    return new AndSpecification(this, other);
  }

  or(other: ISpecification<T>): ISpecification<T> {
    return new OrSpecification(this, other);
  }

  not(): ISpecification<T> {
    return new NotSpecification(this);
  }

  getDescription(): string {
    return `(${this.left.getDescription()} AND ${this.right.getDescription()})`;
  }
}

/**
 * OR规范实现
 * @description 逻辑OR组合的规范实现
 * @template T 候选对象类型
 */
export class OrSpecification<T> implements ISpecification<T> {
  constructor(
    private readonly left: ISpecification<T>,
    private readonly right: ISpecification<T>,
  ) {}

  isSatisfiedBy(candidate: T): boolean {
    return (
      this.left.isSatisfiedBy(candidate) || this.right.isSatisfiedBy(candidate)
    );
  }

  and(other: ISpecification<T>): ISpecification<T> {
    return new AndSpecification(this, other);
  }

  or(other: ISpecification<T>): ISpecification<T> {
    return new OrSpecification(this, other);
  }

  not(): ISpecification<T> {
    return new NotSpecification(this);
  }

  getDescription(): string {
    return `(${this.left.getDescription()} OR ${this.right.getDescription()})`;
  }
}

/**
 * NOT规范实现
 * @description 逻辑NOT组合的规范实现
 * @template T 候选对象类型
 */
export class NotSpecification<T> implements ISpecification<T> {
  constructor(private readonly specification: ISpecification<T>) {}

  isSatisfiedBy(candidate: T): boolean {
    return !this.specification.isSatisfiedBy(candidate);
  }

  and(other: ISpecification<T>): ISpecification<T> {
    return new AndSpecification(this, other);
  }

  or(other: ISpecification<T>): ISpecification<T> {
    return new OrSpecification(this, other);
  }

  not(): ISpecification<T> {
    return this.specification;
  }

  getDescription(): string {
    return `NOT (${this.specification.getDescription()})`;
  }
}

/**
 * 查询规范接口
 * @description 用于查询操作的规范接口
 * @template T 候选对象类型
 */
export interface IQuerySpecification<T> extends ISpecification<T> {
  /**
   * 获取查询条件
   * @returns 查询条件
   */
  getQueryCriteria(): QueryCriteria;

  /**
   * 获取排序条件
   * @returns 排序条件列表
   */
  getSorting(): SortingCriteria[];

  /**
   * 获取分页条件
   * @returns 分页条件
   */
  getPagination(): PaginationCriteria;
}

/**
 * 业务规范接口
 * @description 用于业务规则的规范接口
 * @template T 候选对象类型
 */
export interface IBusinessSpecification<T> extends ISpecification<T> {
  /**
   * 获取关联的业务规则
   * @returns 业务规则
   */
  getBusinessRule(): BusinessRule;

  /**
   * 获取规则严重级别
   * @returns 严重级别
   */
  getSeverity(): BusinessRuleSeverity;

  /**
   * 获取违规时的错误消息
   * @returns 错误消息
   */
  getErrorMessage(): string;
}

/**
 * 查询条件
 * @description 数据库查询的条件
 */
export interface QueryCriteria {
  /** 查询条件列表 */
  conditions: QueryCondition[];
  /** 表连接列表 */
  joins: QueryJoin[];
  /** 分组字段 */
  groupBy: string[];
  /** HAVING条件 */
  having: QueryCondition[];
}

/**
 * 查询条件项
 * @description 单个查询条件
 */
export interface QueryCondition {
  /** 字段名 */
  field: string;
  /** 比较操作符 */
  operator: QueryOperator;
  /** 条件值 */
  value: unknown;
  /** 逻辑操作符 */
  logicalOperator: LogicalOperator;
}

/**
 * 查询连接
 * @description 表连接信息
 */
export interface QueryJoin {
  /** 连接类型 */
  type: JoinType;
  /** 连接表 */
  table: string;
  /** 连接条件 */
  condition: string;
  /** 别名 */
  alias?: string;
}

/**
 * 排序条件
 * @description 排序条件
 */
export interface SortingCriteria {
  /** 排序字段 */
  field: string;
  /** 排序方向 */
  direction: SortDirection;
  /** 排序优先级 */
  priority: number;
}

/**
 * 分页条件
 * @description 分页条件
 */
export interface PaginationCriteria {
  /** 页码 */
  page: number;
  /** 每页数量 */
  limit: number;
  /** 偏移量 */
  offset: number;
}

/**
 * 查询操作符枚举
 */
export enum QueryOperator {
  EQUALS = "equals",
  NOT_EQUALS = "not_equals",
  GREATER_THAN = "greater_than",
  GREATER_THAN_OR_EQUALS = "greater_than_or_equals",
  LESS_THAN = "less_than",
  LESS_THAN_OR_EQUALS = "less_than_or_equals",
  LIKE = "like",
  NOT_LIKE = "not_like",
  IN = "in",
  NOT_IN = "not_in",
  IS_NULL = "is_null",
  IS_NOT_NULL = "is_not_null",
  BETWEEN = "between",
  NOT_BETWEEN = "not_between",
}

/**
 * 逻辑操作符枚举
 */
export enum LogicalOperator {
  AND = "and",
  OR = "or",
}

/**
 * 连接类型枚举
 */
export enum JoinType {
  INNER = "inner",
  LEFT = "left",
  RIGHT = "right",
  FULL = "full",
}

/**
 * 排序方向枚举
 */
export enum SortDirection {
  ASC = "asc",
  DESC = "desc",
}
