/**
 * @fileoverview Aggregate Creation Params Interface - 聚合创建参数接口
 * @description 聚合根创建时的参数定义
 */

import { EntityId } from "../identifiers/entity-id.js";
import { DomainEvent } from "../events/base/domain-event.base.js";

/**
 * 聚合创建参数接口
 * @description 聚合根创建时的参数
 */
export interface AggregateCreationParams {
  /** 聚合根标识符 */
  aggregateId: EntityId;
  /** 聚合根类型 */
  aggregateType: string;
  /** 创建数据 */
  data: unknown;
  /** 初始事件列表 */
  initialEvents?: DomainEvent[];
  /** 创建选项 */
  options?: AggregateCreationOptions;
  /** 元数据 */
  metadata?: AggregateCreationMetadata;
}

/**
 * 聚合创建选项接口
 * @description 聚合根创建时的选项
 */
export interface AggregateCreationOptions {
  /** 是否自动生成标识符 */
  autoGenerateId?: boolean;
  /** 是否严格验证 */
  strictValidation?: boolean;
  /** 是否应用初始事件 */
  applyInitialEvents?: boolean;
  /** 是否验证业务规则 */
  validateBusinessRules?: boolean;
  /** 是否执行业务逻辑 */
  executeBusinessLogic?: boolean;
  /** 是否发布领域事件 */
  publishDomainEvents?: boolean;
  /** 最大初始事件数量 */
  maxInitialEvents?: number;
  /** 事件过滤器 */
  eventFilter?: (event: DomainEvent) => boolean;
  /** 事件转换器 */
  eventTransformer?: (event: DomainEvent) => DomainEvent;
  /** 验证上下文 */
  validationContext?: Record<string, unknown>;
}

/**
 * 聚合创建元数据接口
 * @description 聚合根创建时的元数据
 */
export interface AggregateCreationMetadata {
  /** 创建时间 */
  createdAt: Date;
  /** 创建者 */
  createdBy?: string;
  /** 创建来源 */
  source?: string;
  /** 创建原因 */
  reason?: string;
  /** 标签 */
  tags?: string[];
  /** 相关性标识符 */
  correlationId?: string;
  /** 因果关系标识符 */
  causationId?: string;
  /** 用户标识符 */
  userId?: string;
  /** 会话标识符 */
  sessionId?: string;
  /** 请求标识符 */
  requestId?: string;
  /** 自定义元数据 */
  customData?: Record<string, unknown>;
}

/**
 * 聚合创建结果接口
 * @description 聚合根创建的结果
 */
export interface AggregateCreationResult<T> {
  /** 创建的聚合根 */
  aggregate: T;
  /** 发布的事件列表 */
  publishedEvents: DomainEvent[];
  /** 创建统计信息 */
  statistics: CreationStatistics;
  /** 警告信息 */
  warnings: string[];
  /** 错误信息 */
  errors: string[];
}

/**
 * 创建统计信息接口
 * @description 聚合根创建过程的统计信息
 */
export interface CreationStatistics {
  /** 创建开始时间 */
  startTime: Date;
  /** 创建结束时间 */
  endTime: Date;
  /** 创建耗时（毫秒） */
  duration: number;
  /** 处理的数据字段数 */
  processedFields: number;
  /** 应用的初始事件数 */
  appliedInitialEvents: number;
  /** 发布的事件数 */
  publishedEvents: number;
  /** 验证的业务规则数 */
  validatedBusinessRules: number;
  /** 执行的业务逻辑数 */
  executedBusinessLogic: number;
  /** 最终版本号 */
  finalVersion: number;
}

/**
 * 聚合创建验证结果接口
 * @description 聚合创建参数验证的结果
 */
export interface AggregateCreationValidationResult {
  /** 是否有效 */
  isValid: boolean;
  /** 错误消息列表 */
  errors: string[];
  /** 警告消息列表 */
  warnings: string[];
  /** 验证统计信息 */
  statistics: ValidationStatistics;
}

/**
 * 验证统计信息接口
 * @description 参数验证过程的统计信息
 */
export interface ValidationStatistics {
  /** 验证开始时间 */
  startTime: Date;
  /** 验证结束时间 */
  endTime: Date;
  /** 验证耗时（毫秒） */
  duration: number;
  /** 验证的字段数 */
  validatedFields: number;
  /** 验证的规则数 */
  validatedRules: number;
  /** 验证的事件数 */
  validatedEvents: number;
  /** 错误数量 */
  errorCount: number;
  /** 警告数量 */
  warningCount: number;
}

/**
 * 聚合创建构建器接口
 * @description 用于构建聚合创建参数的构建器
 */
export interface AggregateCreationParamsBuilder {
  /**
   * 设置聚合根标识符
   * @param aggregateId 聚合根标识符
   * @returns 构建器实例
   */
  setAggregateId(aggregateId: EntityId): AggregateCreationParamsBuilder;

  /**
   * 设置聚合根类型
   * @param aggregateType 聚合根类型
   * @returns 构建器实例
   */
  setAggregateType(aggregateType: string): AggregateCreationParamsBuilder;

  /**
   * 设置创建数据
   * @param data 创建数据
   * @returns 构建器实例
   */
  setData(data: unknown): AggregateCreationParamsBuilder;

  /**
   * 添加初始事件
   * @param event 初始事件
   * @returns 构建器实例
   */
  addInitialEvent(event: DomainEvent): AggregateCreationParamsBuilder;

  /**
   * 设置初始事件列表
   * @param events 初始事件列表
   * @returns 构建器实例
   */
  setInitialEvents(events: DomainEvent[]): AggregateCreationParamsBuilder;

  /**
   * 设置创建选项
   * @param options 创建选项
   * @returns 构建器实例
   */
  setOptions(options: AggregateCreationOptions): AggregateCreationParamsBuilder;

  /**
   * 设置元数据
   * @param metadata 元数据
   * @returns 构建器实例
   */
  setMetadata(
    metadata: AggregateCreationMetadata,
  ): AggregateCreationParamsBuilder;

  /**
   * 构建聚合创建参数
   * @returns 聚合创建参数实例
   */
  build(): AggregateCreationParams;
}
