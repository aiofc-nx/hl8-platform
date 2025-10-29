/**
 * @fileoverview Sorting Criteria Interface - 排序条件接口
 * @description 用于数据排序的条件定义
 */

/**
 * 排序条件接口
 * @description 定义数据排序的条件
 */
export interface SortingCriteria {
  /** 排序字段列表 */
  fields: SortingField[];
  /** 默认排序字段 */
  defaultField?: string;
  /** 默认排序方向 */
  defaultDirection?: SortDirection;
}

/**
 * 排序字段接口
 * @description 单个排序字段的定义
 */
export interface SortingField {
  /** 字段名称 */
  fieldName: string;
  /** 排序方向 */
  direction: SortDirection;
  /** 字段优先级（用于多字段排序） */
  priority?: number;
  /** 字段类型 */
  fieldType?: SortFieldType;
  /** 是否区分大小写 */
  caseSensitive?: boolean;
  /** 自定义排序函数 */
  customSortFunction?: (a: unknown, b: unknown) => number;
}

/**
 * 排序方向枚举
 * @description 排序的方向
 */
export enum SortDirection {
  /** 升序 */
  ASC = "ASC",
  /** 降序 */
  DESC = "DESC",
}

/**
 * 排序字段类型枚举
 * @description 排序字段的数据类型
 */
export enum SortFieldType {
  /** 字符串类型 */
  STRING = "STRING",
  /** 数字类型 */
  NUMBER = "NUMBER",
  /** 日期类型 */
  DATE = "DATE",
  /** 布尔类型 */
  BOOLEAN = "BOOLEAN",
  /** 自定义类型 */
  CUSTOM = "CUSTOM",
}

/**
 * 排序结果接口
 * @description 排序操作的结果
 */
export interface SortingResult<T> {
  /** 排序后的数据 */
  sortedData: T[];
  /** 排序统计信息 */
  statistics: SortingStatistics;
  /** 排序元数据 */
  metadata: SortingMetadata;
}

/**
 * 排序统计信息接口
 * @description 排序过程的统计信息
 */
export interface SortingStatistics {
  /** 排序开始时间 */
  startTime: Date;
  /** 排序结束时间 */
  endTime: Date;
  /** 排序耗时（毫秒） */
  duration: number;
  /** 排序的数据数量 */
  dataCount: number;
  /** 使用的排序字段数量 */
  fieldCount: number;
  /** 排序算法 */
  algorithm: SortAlgorithm;
  /** 内存使用量（字节） */
  memoryUsage: number;
}

/**
 * 排序元数据接口
 * @description 排序操作的元数据
 */
export interface SortingMetadata {
  /** 排序ID */
  sortingId: string;
  /** 排序时间戳 */
  timestamp: Date;
  /** 排序者 */
  sortedBy?: string;
  /** 排序原因 */
  reason?: string;
  /** 排序标签 */
  tags: string[];
  /** 自定义元数据 */
  customData: Record<string, unknown>;
}

/**
 * 排序算法枚举
 * @description 可用的排序算法
 */
export enum SortAlgorithm {
  /** 快速排序 */
  QUICK_SORT = "QUICK_SORT",
  /** 归并排序 */
  MERGE_SORT = "MERGE_SORT",
  /** 堆排序 */
  HEAP_SORT = "HEAP_SORT",
  /** 插入排序 */
  INSERTION_SORT = "INSERTION_SORT",
  /** 选择排序 */
  SELECTION_SORT = "SELECTION_SORT",
  /** 冒泡排序 */
  BUBBLE_SORT = "BUBBLE_SORT",
  /** 自定义排序 */
  CUSTOM = "CUSTOM",
}

/**
 * 排序条件构建器接口
 * @description 用于构建排序条件的构建器
 */
export interface ISortingCriteriaBuilder {
  /**
   * 添加排序字段
   * @param field 排序字段
   * @returns 构建器实例
   */
  addField(field: SortingField): ISortingCriteriaBuilder;

  /**
   * 添加简单排序字段
   * @param fieldName 字段名称
   * @param direction 排序方向
   * @returns 构建器实例
   */
  addSimpleField(
    fieldName: string,
    direction: SortDirection,
  ): ISortingCriteriaBuilder;

  /**
   * 设置默认排序字段
   * @param fieldName 字段名称
   * @returns 构建器实例
   */
  setDefaultField(fieldName: string): ISortingCriteriaBuilder;

  /**
   * 设置默认排序方向
   * @param direction 排序方向
   * @returns 构建器实例
   */
  setDefaultDirection(direction: SortDirection): ISortingCriteriaBuilder;

  /**
   * 清除所有排序字段
   * @returns 构建器实例
   */
  clearFields(): ISortingCriteriaBuilder;

  /**
   * 构建排序条件
   * @returns 排序条件实例
   */
  build(): SortingCriteria;
}

/**
 * 排序服务接口
 * @description 提供排序功能的服务
 * @template T 排序对象类型
 */
export interface ISortingService<T> {
  /**
   * 对数据进行排序
   * @param data 要排序的数据
   * @param criteria 排序条件
   * @returns 排序结果
   */
  sort(data: T[], criteria: SortingCriteria): Promise<SortingResult<T>>;

  /**
   * 验证排序条件
   * @param criteria 排序条件
   * @returns 验证结果
   */
  validateCriteria(criteria: SortingCriteria): SortingValidationResult;

  /**
   * 获取支持的排序字段
   * @param objectType 对象类型
   * @returns 支持的排序字段列表
   */
  getSupportedFields(objectType: string): string[];

  /**
   * 检查字段是否可排序
   * @param objectType 对象类型
   * @param fieldName 字段名称
   * @returns 是否可排序
   */
  isFieldSortable(objectType: string, fieldName: string): boolean;

  /**
   * 获取推荐的排序条件
   * @param objectType 对象类型
   * @param context 排序上下文
   * @returns 推荐的排序条件
   */
  getRecommendedCriteria(
    objectType: string,
    context?: SortingContext,
  ): SortingCriteria;
}

/**
 * 排序验证结果接口
 * @description 排序条件验证的结果
 */
export interface SortingValidationResult {
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
 * 排序上下文接口
 * @description 排序操作的上下文信息
 */
export interface SortingContext {
  /** 数据量 */
  dataSize: number;
  /** 性能要求 */
  performanceRequirement: PerformanceRequirement;
  /** 内存限制 */
  memoryLimit?: number;
  /** 时间限制 */
  timeLimit?: number;
  /** 用户偏好 */
  userPreferences?: UserSortingPreferences;
}

/**
 * 性能要求枚举
 * @description 排序性能的要求级别
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
 * 用户排序偏好接口
 * @description 用户的排序偏好设置
 */
export interface UserSortingPreferences {
  /** 首选排序方向 */
  preferredDirection: SortDirection;
  /** 首选排序字段 */
  preferredFields: string[];
  /** 是否区分大小写 */
  caseSensitive: boolean;
  /** 自定义排序规则 */
  customRules: Record<string, unknown>;
}
