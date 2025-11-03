/**
 * @fileoverview 查询结果接口
 * @description 定义查询结果的稳定契约
 */

/**
 * 分页信息
 */
export interface PaginationInfo {
  /** 当前页码 */
  page: number;
  /** 每页数量 */
  limit: number;
  /** 总记录数 */
  total: number;
  /** 总页数 */
  totalPages: number;
  /** 是否有下一页 */
  hasNext: boolean;
  /** 是否有上一页 */
  hasPrevious: boolean;
}

/**
 * 查询结果接口
 * @description 查询结果的标准格式
 * @template TData 查询数据类型
 */
export interface IQueryResult<TData = unknown> {
  /** 执行是否成功 */
  success: boolean;

  /** 查询数据（数组） */
  data?: TData[];

  /** 单个结果数据 */
  item?: TData;

  /** 结果消息 */
  message?: string;

  /** 错误代码，仅在失败时使用 */
  errorCode?: string;

  /** 分页信息 */
  pagination?: PaginationInfo;

  /** 执行时间（毫秒） */
  executionTime?: number;

  /** 结果时间戳 */
  timestamp?: Date;

  /** 结果元数据 */
  metadata?: Record<string, unknown>;
}
