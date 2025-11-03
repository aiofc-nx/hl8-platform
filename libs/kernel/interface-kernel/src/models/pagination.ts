/**
 * @fileoverview 分页模型
 * @description 定义分页、排序、过滤的稳定契约
 */

/**
 * 分页参数
 */
export interface Pagination {
  /** 页码（从1开始） */
  page: number;
  /** 每页数量 */
  limit: number;
  /** 偏移量（可选，page和limit确定时自动计算） */
  offset?: number;
}

/**
 * 排序方向
 */
export type SortingDirection = "asc" | "desc";

/**
 * 排序规则
 */
export interface Sorting {
  /** 排序字段 */
  field: string;
  /** 排序方向 */
  direction: SortingDirection;
}

/**
 * 过滤条件
 * @description 键值对形式的过滤条件，值可以是任意类型
 */
export type Filtering = Record<string, unknown>;
