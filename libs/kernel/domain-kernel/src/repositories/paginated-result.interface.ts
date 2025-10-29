/**
 * @fileoverview Paginated Result Interface - 分页结果接口
 * @description 分页查询结果的通用接口定义
 */

/**
 * 分页结果接口
 * @description 封装分页查询的结果数据
 * @template T 结果项的类型
 */
export interface PaginatedResult<T> {
  /**
   * 当前页的数据项列表
   * @description 包含当前页的所有数据项
   */
  readonly items: readonly T[];

  /**
   * 总数据项数量
   * @description 满足查询条件的数据项总数
   */
  readonly totalItems: number;

  /**
   * 总页数
   * @description 根据总数据项数量和每页大小计算的总页数
   */
  readonly totalPages: number;

  /**
   * 当前页码
   * @description 当前页的页码，从1开始
   */
  readonly currentPage: number;

  /**
   * 每页大小
   * @description 每页包含的数据项数量
   */
  readonly pageSize: number;

  /**
   * 是否有下一页
   * @description 是否存在下一页数据
   */
  readonly hasNextPage: boolean;

  /**
   * 是否有上一页
   * @description 是否存在上一页数据
   */
  readonly hasPreviousPage: boolean;

  /**
   * 下一页页码
   * @description 下一页的页码，如果没有下一页则为null
   */
  readonly nextPage: number | null;

  /**
   * 上一页页码
   * @description 上一页的页码，如果没有上一页则为null
   */
  readonly previousPage: number | null;

  /**
   * 分页元数据
   * @description 包含分页相关的额外信息
   */
  readonly metadata: PaginationMetadata;
}

/**
 * 分页元数据接口
 * @description 分页查询的元数据信息
 */
export interface PaginationMetadata {
  /**
   * 查询开始时间
   * @description 分页查询开始执行的时间戳
   */
  readonly startTime: number;

  /**
   * 查询结束时间
   * @description 分页查询完成的时间戳
   */
  readonly endTime: number;

  /**
   * 查询耗时（毫秒）
   * @description 分页查询的总耗时
   */
  readonly duration: number;

  /**
   * 排序字段
   * @description 用于排序的字段名
   */
  readonly sortBy?: string;

  /**
   * 排序方向
   * @description 排序的方向，asc为升序，desc为降序
   */
  readonly sortOrder?: "asc" | "desc";

  /**
   * 查询条件数量
   * @description 应用的查询条件数量
   */
  readonly conditionCount: number;

  /**
   * 是否使用缓存
   * @description 查询结果是否来自缓存
   */
  readonly fromCache: boolean;

  /**
   * 自定义元数据
   * @description 额外的自定义元数据信息
   */
  readonly customData?: Record<string, unknown>;
}

/**
 * 分页结果构建器接口
 * @description 用于构建分页结果的构建器
 * @template T 结果项的类型
 */
export interface PaginatedResultBuilder<T> {
  /**
   * 设置数据项列表
   * @param items 数据项列表
   * @returns 构建器实例
   */
  setItems(items: T[]): PaginatedResultBuilder<T>;

  /**
   * 设置总数据项数量
   * @param totalItems 总数据项数量
   * @returns 构建器实例
   */
  setTotalItems(totalItems: number): PaginatedResultBuilder<T>;

  /**
   * 设置当前页码
   * @param currentPage 当前页码
   * @returns 构建器实例
   */
  setCurrentPage(currentPage: number): PaginatedResultBuilder<T>;

  /**
   * 设置每页大小
   * @param pageSize 每页大小
   * @returns 构建器实例
   */
  setPageSize(pageSize: number): PaginatedResultBuilder<T>;

  /**
   * 设置分页元数据
   * @param metadata 分页元数据
   * @returns 构建器实例
   */
  setMetadata(metadata: PaginationMetadata): PaginatedResultBuilder<T>;

  /**
   * 构建分页结果
   * @returns 分页结果实例
   */
  build(): PaginatedResult<T>;
}
