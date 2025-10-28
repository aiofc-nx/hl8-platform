/**
 * @fileoverview Exception Interfaces - 异常接口定义
 * @description 定义领域层特定异常类型，提供详细的错误信息和上下文
 */

import { EntityId } from "@hl8/domain-kernel";
import { DomainException } from "@hl8/domain-kernel";

/**
 * 仓储异常
 * @description 数据访问操作相关的异常
 */
export class RepositoryException extends DomainException {
  constructor(
    message: string,
    public readonly operation: string,
    public readonly entityType: string,
    public readonly entityId?: EntityId,
    originalError?: Error,
  ) {
    super(
      message,
      "REPOSITORY_ERROR",
      { operation, entityType, entityId: entityId?.toString() },
      originalError,
    );
  }
}

/**
 * 工厂异常
 * @description 对象创建操作相关的异常
 */
export class FactoryException extends DomainException {
  constructor(
    message: string,
    public readonly factoryType: string,
    public readonly creationParams: unknown,
    originalError?: Error,
  ) {
    super(
      message,
      "FACTORY_ERROR",
      { factoryType, creationParams },
      originalError,
    );
  }
}

/**
 * 规范异常
 * @description 规范评估操作相关的异常
 */
export class SpecificationException extends DomainException {
  constructor(
    message: string,
    public readonly specificationType: string,
    public readonly evaluationContext: unknown,
    originalError?: Error,
  ) {
    super(
      message,
      "SPECIFICATION_ERROR",
      { specificationType, evaluationContext },
      originalError,
    );
  }
}

/**
 * 聚合异常
 * @description 聚合操作相关的异常
 */
export class AggregateException extends DomainException {
  constructor(
    message: string,
    public readonly aggregateType: string,
    public readonly aggregateId: EntityId,
    public readonly operation: string,
    originalError?: Error,
  ) {
    super(
      message,
      "AGGREGATE_ERROR",
      { aggregateType, aggregateId: aggregateId.toString(), operation },
      originalError,
    );
  }
}

/**
 * 服务注册表异常
 * @description 服务管理操作相关的异常
 */
export class ServiceRegistryException extends DomainException {
  constructor(
    message: string,
    public readonly serviceType: string,
    public readonly operation: string,
    originalError?: Error,
  ) {
    super(
      message,
      "SERVICE_REGISTRY_ERROR",
      { serviceType, operation },
      originalError,
    );
  }
}

/**
 * 值对象验证异常
 * @description 值对象验证操作相关的异常
 */
export class ValueObjectValidationException extends DomainException {
  constructor(
    message: string,
    public readonly valueObjectType: string,
    public readonly validationRules: string[],
    public readonly violations: string[],
    originalError?: Error,
  ) {
    super(
      message,
      "VALUE_OBJECT_VALIDATION_ERROR",
      { valueObjectType, validationRules, violations },
      originalError,
    );
  }
}

/**
 * 模型版本异常
 * @description 模型版本管理操作相关的异常
 */
export class ModelVersionException extends DomainException {
  constructor(
    message: string,
    public readonly fromVersion: string,
    public readonly toVersion: string,
    public readonly operation: string,
    originalError?: Error,
  ) {
    super(
      message,
      "MODEL_VERSION_ERROR",
      { fromVersion, toVersion, operation },
      originalError,
    );
  }
}

/**
 * 依赖注入异常
 * @description 依赖注入操作相关的异常
 */
export class DependencyInjectionException extends DomainException {
  constructor(
    message: string,
    public readonly dependencyName: string,
    public readonly injectionContext: unknown,
    originalError?: Error,
  ) {
    super(
      message,
      "DEPENDENCY_INJECTION_ERROR",
      { dependencyName, injectionContext },
      originalError,
    );
  }
}

/**
 * 规范组合异常
 * @description 规范组合操作相关的异常
 */
export class SpecificationCompositionException extends DomainException {
  constructor(
    message: string,
    public readonly leftSpecification: string,
    public readonly rightSpecification: string,
    public readonly compositionType: string,
    originalError?: Error,
  ) {
    super(
      message,
      "SPECIFICATION_COMPOSITION_ERROR",
      { leftSpecification, rightSpecification, compositionType },
      originalError,
    );
  }
}

/**
 * 聚合重建异常
 * @description 聚合重建操作相关的异常
 */
export class AggregateReconstructionException extends DomainException {
  constructor(
    message: string,
    public readonly aggregateType: string,
    public readonly aggregateId: EntityId,
    public readonly eventsCount: number,
    originalError?: Error,
  ) {
    super(
      message,
      "AGGREGATE_RECONSTRUCTION_ERROR",
      { aggregateType, aggregateId: aggregateId.toString(), eventsCount },
      originalError,
    );
  }
}

/**
 * 服务定位异常
 * @description 服务定位操作相关的异常
 */
export class ServiceLocationException extends DomainException {
  constructor(
    message: string,
    public readonly serviceType: string,
    public readonly locationContext: unknown,
    originalError?: Error,
  ) {
    super(
      message,
      "SERVICE_LOCATION_ERROR",
      { serviceType, locationContext },
      originalError,
    );
  }
}

/**
 * 异常上下文接口
 * @description 异常上下文信息的接口
 */
export interface ExceptionContext {
  /** 操作类型 */
  operation: string;
  /** 实体类型 */
  entityType?: string;
  /** 实体ID */
  entityId?: string;
  /** 服务类型 */
  serviceType?: string;
  /** 依赖名称 */
  dependencyName?: string;
  /** 规范类型 */
  specificationType?: string;
  /** 聚合类型 */
  aggregateType?: string;
  /** 值对象类型 */
  valueObjectType?: string;
  /** 版本信息 */
  version?: string;
  /** 额外上下文 */
  additionalContext?: Record<string, unknown>;
}

/**
 * 异常严重级别枚举
 * @description 异常的严重级别
 */
export enum ExceptionSeverity {
  /** 低 - 不影响核心功能 */
  LOW = "low",
  /** 中 - 影响部分功能 */
  MEDIUM = "medium",
  /** 高 - 影响核心功能 */
  HIGH = "high",
  /** 严重 - 系统不可用 */
  CRITICAL = "critical",
}

/**
 * 异常分类枚举
 * @description 异常的分类
 */
export enum ExceptionCategory {
  /** 验证错误 */
  VALIDATION = "validation",
  /** 业务规则错误 */
  BUSINESS_RULE = "business_rule",
  /** 数据访问错误 */
  DATA_ACCESS = "data_access",
  /** 对象创建错误 */
  OBJECT_CREATION = "object_creation",
  /** 服务管理错误 */
  SERVICE_MANAGEMENT = "service_management",
  /** 依赖注入错误 */
  DEPENDENCY_INJECTION = "dependency_injection",
  /** 规范评估错误 */
  SPECIFICATION_EVALUATION = "specification_evaluation",
  /** 聚合操作错误 */
  AGGREGATE_OPERATION = "aggregate_operation",
  /** 模型版本错误 */
  MODEL_VERSION = "model_version",
  /** 系统错误 */
  SYSTEM = "system",
}

/**
 * 异常统计信息
 * @description 异常统计信息
 */
export interface ExceptionStatistics {
  /** 异常总数 */
  totalExceptions: number;
  /** 按类型分组的异常数量 */
  byType: Record<string, number>;
  /** 按严重级别分组的异常数量 */
  bySeverity: Record<ExceptionSeverity, number>;
  /** 按分类分组的异常数量 */
  byCategory: Record<ExceptionCategory, number>;
  /** 最近异常时间 */
  lastExceptionTime: Date;
  /** 异常率 */
  exceptionRate: number;
}
