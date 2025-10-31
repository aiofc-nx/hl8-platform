/**
 * @fileoverview 业务操作接口定义
 * @description 定义聚合根上复杂业务操作的数据结构和行为
 */

import { ValidationResult } from "../validation/rules/validation-result.interface.js";
import { DomainEvent } from "../events/base/domain-event.base.js";
// 重新导出验证相关类型，便于从本模块统一导入
export type {
  ValidationResult as ValidationResult,
  ValidationErrorLevel,
} from "../validation/rules/validation-result.interface.js";

/**
 * 业务操作接口
 * @description 定义聚合根上的业务操作的基本行为
 * @template T 聚合根类型
 */
export interface IBusinessOperation<T> {
  /** 操作唯一标识符 */
  readonly id: string;
  /** 操作名称 */
  readonly name: string;
  /** 操作描述 */
  readonly description: string;
  /** 操作类型 */
  readonly operationType: BusinessOperationType;
  /** 操作优先级 */
  readonly priority: number;
  /** 操作是否启用 */
  readonly enabled: boolean;
  /** 操作版本 */
  readonly version: string;
  /** 操作创建时间 */
  readonly createdAt: Date;
  /** 操作最后更新时间 */
  readonly updatedAt: Date;

  /**
   * 执行业务操作
   * @description 在聚合根上执行业务操作
   * @param aggregate 聚合根实例
   * @param parameters 操作参数
   * @param context 操作上下文
   * @returns 操作结果
   */
  execute(
    aggregate: T,
    parameters: OperationParameters,
    context: OperationContext,
  ): Promise<OperationResult>;

  /**
   * 验证操作参数
   * @description 验证操作参数的有效性
   * @param parameters 操作参数
   * @param aggregate 聚合根实例
   * @returns 验证结果
   */
  validateParameters(
    parameters: OperationParameters,
    aggregate: T,
  ): ValidationResult;

  /**
   * 检查前置条件
   * @description 检查操作执行的前置条件
   * @param aggregate 聚合根实例
   * @param parameters 操作参数
   * @returns 验证结果
   */
  checkPreconditions(
    aggregate: T,
    parameters: OperationParameters,
  ): ValidationResult;

  /**
   * 检查后置条件
   * @description 检查操作执行的后置条件
   * @param aggregate 聚合根实例
   * @param result 操作结果
   * @returns 验证结果
   */
  checkPostconditions(aggregate: T, result: OperationResult): ValidationResult;

  /**
   * 获取操作依赖
   * @description 获取操作执行所需的依赖
   * @returns 依赖列表
   */
  getDependencies(): OperationDependency[];

  /**
   * 获取操作元数据
   * @description 获取操作的元数据信息
   * @returns 操作元数据
   */
  getMetadata(): BusinessOperationMetadata;

  /**
   * 检查操作是否适用于给定聚合根
   * @param aggregate 聚合根实例
   * @returns 是否适用
   */
  isApplicable(aggregate: T): boolean;
}

/**
 * 操作处理程序接口
 * @description 定义业务操作的执行处理逻辑
 * @template T 聚合根类型
 */
export interface IOperationHandler<T> {
  /** 处理程序唯一标识符 */
  readonly id: string;
  /** 处理程序名称 */
  readonly name: string;
  /** 处理程序类型 */
  readonly handlerType: OperationHandlerType;
  /** 支持的操作类型 */
  readonly supportedOperationTypes: BusinessOperationType[];
  /** 处理程序优先级 */
  readonly priority: number;

  /**
   * 处理操作
   * @description 执行业务操作的处理逻辑
   * @param operation 业务操作
   * @param aggregate 聚合根实例
   * @param parameters 操作参数
   * @param context 操作上下文
   * @returns 操作结果
   */
  handle(
    operation: IBusinessOperation<T>,
    aggregate: T,
    parameters: OperationParameters,
    context: OperationContext,
  ): Promise<OperationResult>;

  /**
   * 检查是否支持操作类型
   * @param operationType 操作类型
   * @returns 是否支持
   */
  supports(operationType: BusinessOperationType): boolean;

  /**
   * 获取处理程序元数据
   * @returns 处理程序元数据
   */
  getMetadata(): OperationHandlerMetadata;
}

/**
 * 操作参数接口
 * @description 定义业务操作的参数结构
 */
export interface OperationParameters {
  /** 参数数据 */
  readonly data: Record<string, unknown>;
  /** 参数验证规则 */
  readonly validationRules?: OperationParameterValidationRule[];
  /** 参数元数据 */
  readonly metadata?: Record<string, unknown>;
}

/**
 * 操作上下文接口
 * @description 提供业务操作执行时的上下文信息
 */
export interface OperationContext {
  /** 上下文唯一标识符 */
  readonly id: string;
  /** 操作发起者 */
  readonly initiator: string;
  /** 操作时间戳 */
  readonly timestamp: Date;
  /** 操作原因 */
  readonly reason?: string;
  /** 操作标签 */
  readonly tags: string[];
  /** 操作元数据 */
  readonly metadata: Record<string, unknown>;
  /** 操作历史记录 */
  readonly history: OperationHistoryEntry[];
  /** 操作状态 */
  readonly status: OperationStatus;

  /**
   * 添加历史记录
   * @param entry 历史记录条目
   */
  addHistoryEntry(entry: OperationHistoryEntry): void;

  /**
   * 更新操作状态
   * @param status 新状态
   */
  updateStatus(status: OperationStatus): void;
}

/**
 * 操作结果接口
 * @description 描述业务操作的执行结果
 */
export interface OperationResult {
  /** 结果唯一标识符 */
  readonly id: string;
  /** 操作ID */
  readonly operationId: string;
  /** 上下文ID */
  readonly contextId: string;
  /** 执行是否成功 */
  readonly success: boolean;
  /** 结果数据 */
  readonly data: unknown;
  /** 结果消息 */
  readonly message: string;
  /** 生成的事件列表 */
  readonly events: DomainEvent[];
  /** 执行开始时间 */
  readonly startTime: Date;
  /** 执行结束时间 */
  readonly endTime: Date;
  /** 执行耗时（毫秒） */
  readonly duration: number;
  /** 执行错误 */
  readonly error?: Error;
  /** 执行警告 */
  readonly warnings: string[];
  /** 执行元数据 */
  readonly metadata: Record<string, unknown>;

  /**
   * 检查是否有错误
   * @returns 是否有错误
   */
  hasError(): boolean;

  /**
   * 检查是否有警告
   * @returns 是否有警告
   */
  hasWarnings(): boolean;

  /**
   * 检查是否生成了事件
   * @returns 是否生成了事件
   */
  hasEvents(): boolean;

  /**
   * 获取执行摘要
   * @returns 执行摘要
   */
  getSummary(): OperationResultSummary;
}

/**
 * 操作依赖接口
 * @description 描述业务操作的依赖关系
 */
export interface OperationDependency {
  /** 依赖类型 */
  readonly type: OperationDependencyType;
  /** 依赖名称 */
  readonly name: string;
  /** 依赖是否必需 */
  readonly required: boolean;
  /** 依赖描述 */
  readonly description: string;
  /** 依赖元数据 */
  readonly metadata?: Record<string, unknown>;
}

/**
 * 业务操作元数据接口
 * @description 描述业务操作的元数据信息
 */
export interface BusinessOperationMetadata {
  /** 操作分类 */
  readonly category: string;
  /** 操作标签 */
  readonly tags: string[];
  /** 操作作者 */
  readonly author: string;
  /** 操作维护者 */
  readonly maintainer: string;
  /** 操作文档URL */
  readonly documentationUrl?: string;
  /** 操作示例 */
  readonly examples: string[];
  /** 操作配置 */
  readonly configuration: Record<string, unknown>;
  /** 操作约束 */
  readonly constraints: BusinessOperationConstraints;
}

/**
 * 业务操作约束接口
 * @description 描述业务操作的约束条件
 */
export interface BusinessOperationConstraints {
  /** 最大执行时间（毫秒） */
  readonly maxExecutionTime: number;
  /** 最大重试次数 */
  readonly maxRetries: number;
  /** 重试间隔（毫秒） */
  readonly retryInterval: number;
  /** 并发限制 */
  readonly concurrencyLimit: number;
  /** 资源限制 */
  readonly resourceLimits: Record<string, number>;
  /** 前置条件 */
  readonly preconditions: string[];
  /** 后置条件 */
  readonly postconditions: string[];
}

/**
 * 操作处理程序元数据接口
 * @description 描述操作处理程序的元数据信息
 */
export interface OperationHandlerMetadata {
  /** 处理程序分类 */
  readonly category: string;
  /** 处理程序标签 */
  readonly tags: string[];
  /** 处理程序作者 */
  readonly author: string;
  /** 处理程序版本 */
  readonly version: string;
  /** 处理程序描述 */
  readonly description: string;
}

/**
 * 操作参数验证规则接口
 * @description 定义操作参数的验证规则
 */
export interface OperationParameterValidationRule {
  /** 规则名称 */
  readonly name: string;
  /** 规则描述 */
  readonly description: string;
  /** 验证函数 */
  readonly validate: (
    value: unknown,
    parameter: OperationParameters,
  ) => ValidationResult;
  /** 规则优先级 */
  readonly priority: number;
}

/**
 * 操作历史记录条目接口
 * @description 描述操作执行过程中的历史记录
 */
export interface OperationHistoryEntry {
  /** 记录唯一标识符 */
  readonly id: string;
  /** 记录时间戳 */
  readonly timestamp: Date;
  /** 记录类型 */
  readonly type: OperationHistoryType;
  /** 记录消息 */
  readonly message: string;
  /** 记录数据 */
  readonly data: unknown;
  /** 记录来源 */
  readonly source: string;
  /** 记录级别 */
  readonly level: OperationLogLevel;
}

/**
 * 操作结果摘要接口
 * @description 描述操作结果的摘要信息
 */
export interface OperationResultSummary {
  /** 执行状态 */
  readonly status: string;
  /** 执行耗时 */
  readonly duration: number;
  /** 错误数量 */
  readonly errorCount: number;
  /** 警告数量 */
  readonly warningCount: number;
  /** 生成事件数量 */
  readonly eventCount: number;
  /** 操作类型 */
  readonly operationType: string;
}

/**
 * 业务操作类型枚举
 * @description 定义业务操作的类型
 */
export enum BusinessOperationType {
  /** 创建操作 */
  CREATE = "create",
  /** 更新操作 */
  UPDATE = "update",
  /** 删除操作 */
  DELETE = "delete",
  /** 查询操作 */
  QUERY = "query",
  /** 状态变更操作 */
  STATE_CHANGE = "state_change",
  /** 业务逻辑操作 */
  BUSINESS_LOGIC = "business_logic",
  /** 验证操作 */
  VALIDATION = "validation",
  /** 转换操作 */
  TRANSFORMATION = "transformation",
}

/**
 * 操作处理程序类型枚举
 * @description 定义操作处理程序的类型
 */
export enum OperationHandlerType {
  /** 同步处理程序 */
  SYNCHRONOUS = "synchronous",
  /** 异步处理程序 */
  ASYNCHRONOUS = "asynchronous",
  /** 批处理处理程序 */
  BATCH = "batch",
  /** 流处理处理程序 */
  STREAM = "stream",
}

/**
 * 操作依赖类型枚举
 * @description 定义操作依赖的类型
 */
export enum OperationDependencyType {
  /** 服务依赖 */
  SERVICE = "service",
  /** 仓储依赖 */
  REPOSITORY = "repository",
  /** 工厂依赖 */
  FACTORY = "factory",
  /** 验证器依赖 */
  VALIDATOR = "validator",
  /** 事件处理器依赖 */
  EVENT_HANDLER = "event_handler",
}

/**
 * 操作状态枚举
 * @description 定义操作过程的状态
 */
export enum OperationStatus {
  /** 初始化 */
  INITIALIZED = "initialized",
  /** 验证中 */
  VALIDATING = "validating",
  /** 执行中 */
  EXECUTING = "executing",
  /** 完成 */
  COMPLETED = "completed",
  /** 失败 */
  FAILED = "failed",
  /** 取消 */
  CANCELLED = "cancelled",
  /** 回滚 */
  ROLLED_BACK = "rolled_back",
}

/**
 * 操作历史记录类型枚举
 * @description 定义操作历史记录的类型
 */
export enum OperationHistoryType {
  /** 操作开始 */
  OPERATION_STARTED = "operation_started",
  /** 操作完成 */
  OPERATION_COMPLETED = "operation_completed",
  /** 操作失败 */
  OPERATION_FAILED = "operation_failed",
  /** 参数验证 */
  PARAMETER_VALIDATION = "parameter_validation",
  /** 前置条件检查 */
  PRECONDITION_CHECK = "precondition_check",
  /** 后置条件检查 */
  POSTCONDITION_CHECK = "postcondition_check",
  /** 事件生成 */
  EVENT_GENERATED = "event_generated",
  /** 错误发生 */
  ERROR_OCCURRED = "error_occurred",
  /** 警告发生 */
  WARNING_OCCURRED = "warning_occurred",
}

/**
 * 操作日志级别枚举
 * @description 定义操作日志的级别
 */
export enum OperationLogLevel {
  /** 调试 */
  DEBUG = "debug",
  /** 信息 */
  INFO = "info",
  /** 警告 */
  WARN = "warn",
  /** 错误 */
  ERROR = "error",
  /** 致命 */
  FATAL = "fatal",
}
