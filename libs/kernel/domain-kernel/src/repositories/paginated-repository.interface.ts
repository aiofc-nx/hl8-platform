/**
 * @fileoverview Paginated Repository Interface - 分页仓储接口
 * @description 提供分页查询功能的数据访问抽象
 */

import { IQueryRepository } from "./query-repository.interface.js";
import { ISpecification } from "../specifications/specification.interface.js";

/**
 * 分页结果接口
 * @description 分页查询的结果容器
 * @template T 实体类型
 */
export interface PaginatedResult<T> {
  /** 实体列表 */
  items: T[];
  /** 总数量 */
  totalCount: number;
  /** 当前页码 */
  page: number;
  /** 每页数量 */
  limit: number;
  /** 是否有下一页 */
  hasNext: boolean;
  /** 是否有上一页 */
  hasPrevious: boolean;
  /** 总页数 */
  totalPages: number;
}

/**
 * 分页仓储接口
 * @description 提供分页查询功能的数据访问抽象
 * @template T 实体类型
 */
export interface IPaginatedRepository<T> extends IQueryRepository<T> {
  /**
   * 分页查询实体
   * @param spec 查询规范
   * @param page 页码（从1开始）
   * @param limit 每页数量
   * @returns 分页结果
   * @throws {RepositoryException} 当查询失败时抛出
   */
  findPaginated(
    spec: ISpecification<T>,
    page: number,
    limit: number,
  ): Promise<PaginatedResult<T>>;
}
