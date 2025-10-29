/**
 * @fileoverview Entity Creation Params Interface - 实体创建参数接口
 * @description 实体创建时的参数定义
 */

import { EntityId } from "../identifiers/entity-id.js";

/**
 * 实体创建参数接口
 * @description 实体创建时的参数
 */
export interface EntityCreationParams {
  /** 实体标识符 */
  entityId: EntityId;
  /** 实体类型 */
  entityType: string;
  /** 创建数据 */
  data: unknown;
  /** 创建选项 */
  options?: EntityCreationOptions;
  /** 元数据 */
  metadata?: EntityCreationMetadata;
}

/**
 * 实体创建选项接口
 * @description 实体创建时的选项
 */
export interface EntityCreationOptions {
  /** 是否自动生成标识符 */
  autoGenerateId?: boolean;
  /** 是否严格验证 */
  strictValidation?: boolean;
  /** 是否验证业务规则 */
  validateBusinessRules?: boolean;
  /** 是否执行业务逻辑 */
  executeBusinessLogic?: boolean;
  /** 是否自动设置审计信息 */
  autoSetAuditInfo?: boolean;
  /** 是否验证数据完整性 */
  validateDataIntegrity?: boolean;
  /** 是否允许空数据 */
  allowEmptyData?: boolean;
  /** 数据转换器 */
  dataTransformer?: (data: unknown) => unknown;
  /** 验证上下文 */
  validationContext?: Record<string, unknown>;
}

/**
 * 实体创建元数据接口
 * @description 实体创建时的元数据
 */
export interface EntityCreationMetadata {
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
  /** 父实体标识符 */
  parentEntityId?: EntityId;
  /** 父实体类型 */
  parentEntityType?: string;
  /** 自定义元数据 */
  customData?: Record<string, unknown>;
}

/**
 * 实体创建结果接口
 * @description 实体创建的结果
 */
export interface EntityCreationResult<T> {
  /** 创建的实体 */
  entity: T;
  /** 创建统计信息 */
  statistics: EntityCreationStatistics;
  /** 警告信息 */
  warnings: string[];
  /** 错误信息 */
  errors: string[];
}

/**
 * 实体创建统计信息接口
 * @description 实体创建过程的统计信息
 */
export interface EntityCreationStatistics {
  /** 创建开始时间 */
  startTime: Date;
  /** 创建结束时间 */
  endTime: Date;
  /** 创建耗时（毫秒） */
  duration: number;
  /** 处理的数据字段数 */
  processedFields: number;
  /** 验证的业务规则数 */
  validatedBusinessRules: number;
  /** 执行的业务逻辑数 */
  executedBusinessLogic: number;
  /** 数据转换次数 */
  dataTransformations: number;
  /** 最终版本号 */
  finalVersion: number;
}

/**
 * 实体创建验证结果接口
 * @description 实体创建参数验证的结果
 */
export interface EntityCreationValidationResult {
  /** 是否有效 */
  isValid: boolean;
  /** 错误消息列表 */
  errors: string[];
  /** 警告消息列表 */
  warnings: string[];
  /** 验证统计信息 */
  statistics: EntityValidationStatistics;
}

/**
 * 实体验证统计信息接口
 * @description 实体参数验证过程的统计信息
 */
export interface EntityValidationStatistics {
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
  /** 数据完整性检查次数 */
  dataIntegrityChecks: number;
  /** 业务规则验证次数 */
  businessRuleValidations: number;
  /** 错误数量 */
  errorCount: number;
  /** 警告数量 */
  warningCount: number;
}

/**
 * 实体创建构建器接口
 * @description 用于构建实体创建参数的构建器
 */
export interface EntityCreationParamsBuilder {
  /**
   * 设置实体标识符
   * @param entityId 实体标识符
   * @returns 构建器实例
   */
  setEntityId(entityId: EntityId): EntityCreationParamsBuilder;

  /**
   * 设置实体类型
   * @param entityType 实体类型
   * @returns 构建器实例
   */
  setEntityType(entityType: string): EntityCreationParamsBuilder;

  /**
   * 设置创建数据
   * @param data 创建数据
   * @returns 构建器实例
   */
  setData(data: unknown): EntityCreationParamsBuilder;

  /**
   * 设置创建选项
   * @param options 创建选项
   * @returns 构建器实例
   */
  setOptions(options: EntityCreationOptions): EntityCreationParamsBuilder;

  /**
   * 设置元数据
   * @param metadata 元数据
   * @returns 构建器实例
   */
  setMetadata(metadata: EntityCreationMetadata): EntityCreationParamsBuilder;

  /**
   * 添加标签
   * @param tag 标签
   * @returns 构建器实例
   */
  addTag(tag: string): EntityCreationParamsBuilder;

  /**
   * 设置标签列表
   * @param tags 标签列表
   * @returns 构建器实例
   */
  setTags(tags: string[]): EntityCreationParamsBuilder;

  /**
   * 设置父实体信息
   * @param parentEntityId 父实体标识符
   * @param parentEntityType 父实体类型
   * @returns 构建器实例
   */
  setParentEntity(
    parentEntityId: EntityId,
    parentEntityType: string,
  ): EntityCreationParamsBuilder;

  /**
   * 构建实体创建参数
   * @returns 实体创建参数实例
   */
  build(): EntityCreationParams;
}
