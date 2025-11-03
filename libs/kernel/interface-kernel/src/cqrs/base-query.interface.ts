/**
 * @fileoverview 查询基类接口（框架无关）
 * @description 定义查询的稳定契约，不依赖具体框架（如NestJS）
 */

import type { TenantContext } from "../index.js";

/**
 * 排序方向
 */
export type SortDirection = "asc" | "desc";

/**
 * 排序规则
 */
export interface SortRule {
  /** 排序字段 */
  field: string;
  /** 排序方向 */
  direction: SortDirection;
}

/**
 * 查询基类接口
 * @description 框架无关的查询契约，用于CQRS模式的查询处理
 * @template TResult 查询结果类型
 */
export interface IBaseQuery<_TResult = unknown> {
  /** 查询ID */
  readonly queryId: string;

  /** 查询类型 */
  readonly queryType: string;

  /** 关联ID，用于追踪请求 */
  readonly correlationId?: string;

  /** 用户ID，用于权限控制 */
  readonly userId?: string;

  /** 查询时间戳 */
  readonly timestamp?: Date;

  /** 查询版本 */
  readonly version?: string;

  /** 分页参数 */
  readonly pagination?: {
    page: number;
    limit: number;
    offset?: number;
  };

  /** 排序参数 */
  readonly sorting?: SortRule[];

  /** 过滤参数 */
  readonly filters?: Record<string, unknown>;

  /** 查询元数据 */
  readonly metadata?: Record<string, unknown>;

  /** 租户上下文（自动注入） */
  readonly tenantContext?: TenantContext;
}
