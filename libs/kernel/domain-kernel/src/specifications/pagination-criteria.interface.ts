/**
 * @fileoverview Pagination Criteria Interface - 分页条件接口
 * @description 用于数据分页的条件定义
 */

/**
 * 分页条件接口
 * @description 定义数据分页的条件
 */
export interface PaginationCriteria {
  /** 页码（从1开始） */
  page: number;
  /** 每页数量 */
  limit: number;
  /** 分页选项 */
  options?: PaginationOptions;
  /** 分页元数据 */
  metadata?: PaginationMetadata;
}

/**
 * 分页选项接口
 * @description 分页操作的选项
 */
export interface PaginationOptions {
  /** 是否计算总数 */
  calculateTotal?: boolean;
  /** 是否计算总页数 */
  calculateTotalPages?: boolean;
  /** 是否包含元数据 */
  includeMetadata?: boolean;
  /** 最大每页数量 */
  maxLimit?: number;
  /** 默认每页数量 */
  defaultLimit?: number;
  /** 是否允许空页 */
  allowEmptyPages?: boolean;
  /** 分页策略 */
  strategy?: PaginationStrategy;
}

/**
 * 分页元数据接口
 * @description 分页操作的元数据
 */
export interface PaginationMetadata {
  /** 分页ID */
  paginationId: string;
  /** 分页时间戳 */
  timestamp: Date;
  /** 分页者 */
  paginatedBy?: string;
  /** 分页原因 */
  reason?: string;
  /** 分页标签 */
  tags: string[];
  /** 自定义元数据 */
  customData: Record<string, unknown>;
}

/**
 * 分页策略枚举
 * @description 分页的策略类型
 */
export enum PaginationStrategy {
  /** 基于偏移的分页 */
  OFFSET_BASED = "OFFSET_BASED",
  /** 基于游标的分页 */
  CURSOR_BASED = "CURSOR_BASED",
  /** 基于键的分页 */
  KEY_BASED = "KEY_BASED",
  /** 基于时间戳的分页 */
  TIMESTAMP_BASED = "TIMESTAMP_BASED",
}

/**
 * 分页结果接口
 * @description 分页操作的结果
 * @template T 分页对象类型
 */
export interface PaginationResult<T> {
  /** 分页数据 */
  items: T[];
  /** 分页信息 */
  pagination: PaginationInfo;
  /** 分页统计信息 */
  statistics: PaginationStatistics;
  /** 分页元数据 */
  metadata: PaginationResultMetadata;
}

/**
 * 分页信息接口
 * @description 分页的基本信息
 */
export interface PaginationInfo {
  /** 当前页码 */
  currentPage: number;
  /** 每页数量 */
  pageSize: number;
  /** 总数量 */
  totalCount: number;
  /** 总页数 */
  totalPages: number;
  /** 是否有下一页 */
  hasNextPage: boolean;
  /** 是否有上一页 */
  hasPreviousPage: boolean;
  /** 下一页页码 */
  nextPage?: number;
  /** 上一页页码 */
  previousPage?: number;
  /** 游标信息（用于游标分页） */
  cursor?: PaginationCursor;
}

/**
 * 分页游标接口
 * @description 用于游标分页的游标信息
 */
export interface PaginationCursor {
  /** 当前游标 */
  current: string;
  /** 下一页游标 */
  next?: string;
  /** 上一页游标 */
  previous?: string;
  /** 游标类型 */
  type: CursorType;
}

/**
 * 游标类型枚举
 * @description 游标的类型
 */
export enum CursorType {
  /** 字符串游标 */
  STRING = "STRING",
  /** 数字游标 */
  NUMBER = "NUMBER",
  /** 时间戳游标 */
  TIMESTAMP = "TIMESTAMP",
  /** 复合游标 */
  COMPOSITE = "COMPOSITE",
}

/**
 * 分页统计信息接口
 * @description 分页过程的统计信息
 */
export interface PaginationStatistics {
  /** 分页开始时间 */
  startTime: Date;
  /** 分页结束时间 */
  endTime: Date;
  /** 分页耗时（毫秒） */
  duration: number;
  /** 查询的数据数量 */
  queriedCount: number;
  /** 返回的数据数量 */
  returnedCount: number;
  /** 分页策略 */
  strategy: PaginationStrategy;
  /** 内存使用量（字节） */
  memoryUsage: number;
  /** 数据库查询次数 */
  databaseQueries: number;
}

/**
 * 分页结果元数据接口
 * @description 分页结果的元数据
 */
export interface PaginationResultMetadata {
  /** 分页结果ID */
  resultId: string;
  /** 分页结果时间戳 */
  timestamp: Date;
  /** 分页结果标签 */
  tags: string[];
  /** 分页结果来源 */
  source: string;
  /** 分页结果版本 */
  version: string;
  /** 自定义元数据 */
  customData: Record<string, unknown>;
}

/**
 * 分页条件构建器接口
 * @description 用于构建分页条件的构建器
 */
export interface IPaginationCriteriaBuilder {
  /**
   * 设置页码
   * @param page 页码
   * @returns 构建器实例
   */
  setPage(page: number): IPaginationCriteriaBuilder;

  /**
   * 设置每页数量
   * @param limit 每页数量
   * @returns 构建器实例
   */
  setLimit(limit: number): IPaginationCriteriaBuilder;

  /**
   * 设置分页选项
   * @param options 分页选项
   * @returns 构建器实例
   */
  setOptions(options: PaginationOptions): IPaginationCriteriaBuilder;

  /**
   * 设置分页元数据
   * @param metadata 分页元数据
   * @returns 构建器实例
   */
  setMetadata(metadata: PaginationMetadata): IPaginationCriteriaBuilder;

  /**
   * 设置分页策略
   * @param strategy 分页策略
   * @returns 构建器实例
   */
  setStrategy(strategy: PaginationStrategy): IPaginationCriteriaBuilder;

  /**
   * 构建分页条件
   * @returns 分页条件实例
   */
  build(): PaginationCriteria;
}

/**
 * 分页服务接口
 * @description 提供分页功能的服务
 * @template T 分页对象类型
 */
export interface IPaginationService<T> {
  /**
   * 对数据进行分页
   * @param data 要分页的数据
   * @param criteria 分页条件
   * @returns 分页结果
   */
  paginate(
    data: T[],
    criteria: PaginationCriteria,
  ): Promise<PaginationResult<T>>;

  /**
   * 验证分页条件
   * @param criteria 分页条件
   * @returns 验证结果
   */
  validateCriteria(criteria: PaginationCriteria): PaginationValidationResult;

  /**
   * 获取推荐的分页条件
   * @param dataSize 数据总量
   * @param context 分页上下文
   * @returns 推荐的分页条件
   */
  getRecommendedCriteria(
    dataSize: number,
    context?: PaginationContext,
  ): PaginationCriteria;

  /**
   * 检查分页条件是否有效
   * @param criteria 分页条件
   * @returns 是否有效
   */
  isValidCriteria(criteria: PaginationCriteria): boolean;

  /**
   * 优化分页条件
   * @param criteria 分页条件
   * @returns 优化后的分页条件
   */
  optimizeCriteria(criteria: PaginationCriteria): PaginationCriteria;
}

/**
 * 分页验证结果接口
 * @description 分页条件验证的结果
 */
export interface PaginationValidationResult {
  /** 是否有效 */
  isValid: boolean;
  /** 错误消息列表 */
  errors: string[];
  /** 警告消息列表 */
  warnings: string[];
  /** 性能建议 */
  performanceSuggestions: string[];
}

/**
 * 分页上下文接口
 * @description 分页操作的上下文信息
 */
export interface PaginationContext {
  /** 数据总量 */
  totalDataSize: number;
  /** 性能要求 */
  performanceRequirement: PerformanceRequirement;
  /** 内存限制 */
  memoryLimit?: number;
  /** 时间限制 */
  timeLimit?: number;
  /** 用户偏好 */
  userPreferences?: UserPaginationPreferences;
}

/**
 * 性能要求枚举
 * @description 分页性能的要求级别
 */
export enum PerformanceRequirement {
  /** 低性能要求 */
  LOW = "LOW",
  /** 中等性能要求 */
  MEDIUM = "MEDIUM",
  /** 高性能要求 */
  HIGH = "HIGH",
  /** 最高性能要求 */
  CRITICAL = "CRITICAL",
}

/**
 * 用户分页偏好接口
 * @description 用户的分页偏好设置
 */
export interface UserPaginationPreferences {
  /** 首选每页数量 */
  preferredPageSize: number;
  /** 首选分页策略 */
  preferredStrategy: PaginationStrategy;
  /** 是否显示总数 */
  showTotalCount: boolean;
  /** 是否显示总页数 */
  showTotalPages: boolean;
  /** 自定义分页规则 */
  customRules: Record<string, unknown>;
}
