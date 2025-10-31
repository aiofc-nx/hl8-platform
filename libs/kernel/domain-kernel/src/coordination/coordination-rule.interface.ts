/**
 * @fileoverview 协调规则接口定义
 * @description 定义领域服务协调规则的数据结构和行为
 */

import { ValidationResult } from "../validation/rules/validation-result.interface.js";

/**
 * 协调规则接口
 * @description 定义领域服务协调规则的基本行为
 */
export interface ICoordinationRule {
  /** 规则唯一标识符 */
  readonly id: string;
  /** 规则名称 */
  readonly name: string;
  /** 规则描述 */
  readonly description: string;
  /** 规则优先级 */
  readonly priority: number;
  /** 规则是否启用 */
  readonly enabled: boolean;
  /** 规则版本 */
  readonly version: string;
  /** 规则创建时间 */
  readonly createdAt: Date;
  /** 规则最后更新时间 */
  readonly updatedAt: Date;

  /**
   * 执行协调规则
   * @description 根据协调上下文执行协调规则
   * @param context 协调上下文
   * @returns 协调结果
   */
  execute(context: ICoordinationContext): Promise<ICoordinationResult>;

  /**
   * 验证协调规则
   * @description 验证协调规则的有效性
   * @returns 验证结果
   */
  validate(): ValidationResult;

  /**
   * 检查规则是否适用于给定上下文
   * @param context 协调上下文
   * @returns 是否适用
   */
  isApplicable(context: ICoordinationContext): boolean;

  /**
   * 获取规则依赖的服务
   * @returns 依赖的服务类型列表
   */
  getDependencies(): string[];

  /**
   * 获取规则元数据
   * @returns 规则元数据
   */
  getMetadata(): CoordinationRuleMetadata;
}

/**
 * 协调上下文接口
 * @description 提供协调规则执行时的上下文信息
 */
export interface ICoordinationContext {
  /** 上下文唯一标识符 */
  readonly id: string;
  /** 协调操作类型 */
  readonly operationType: string;
  /** 协调操作数据 */
  readonly operationData: unknown;
  /** 参与协调的服务列表 */
  readonly participatingServices: string[];
  /** 协调开始时间 */
  readonly startTime: Date;
  /** 协调超时时间（毫秒） */
  readonly timeout: number;
  /** 协调优先级 */
  readonly priority: number;
  /** 协调标签 */
  readonly tags: string[];
  /** 协调元数据 */
  readonly metadata: Record<string, unknown>;
  /** 协调历史记录 */
  readonly history: CoordinationHistoryEntry[];
  /** 协调状态 */
  readonly status: CoordinationStatus;

  /**
   * 添加历史记录
   * @param entry 历史记录条目
   */
  addHistoryEntry(entry: CoordinationHistoryEntry): void;

  /**
   * 更新协调状态
   * @param status 新状态
   */
  updateStatus(status: CoordinationStatus): void;

  /**
   * 检查是否超时
   * @returns 是否超时
   */
  isTimeout(): boolean;

  /**
   * 获取剩余时间
   * @returns 剩余时间（毫秒）
   */
  getRemainingTime(): number;
}

/**
 * 协调结果接口
 * @description 描述协调规则执行的结果
 */
export interface ICoordinationResult {
  /** 结果唯一标识符 */
  readonly id: string;
  /** 协调规则ID */
  readonly ruleId: string;
  /** 协调上下文ID */
  readonly contextId: string;
  /** 执行是否成功 */
  readonly success: boolean;
  /** 执行结果数据 */
  readonly data: unknown;
  /** 执行消息 */
  readonly message: string;
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
   * 获取执行摘要
   * @returns 执行摘要
   */
  getSummary(): CoordinationResultSummary;
}

/**
 * 协调规则元数据接口
 * @description 描述协调规则的元数据信息
 */
export interface CoordinationRuleMetadata {
  /** 规则类型 */
  readonly type: string;
  /** 规则分类 */
  readonly category: string;
  /** 规则标签 */
  readonly tags: string[];
  /** 规则作者 */
  readonly author: string;
  /** 规则维护者 */
  readonly maintainer: string;
  /** 规则文档URL */
  readonly documentationUrl?: string;
  /** 规则示例 */
  readonly examples: string[];
  /** 规则配置 */
  readonly configuration: Record<string, unknown>;
  /** 规则限制 */
  readonly constraints: CoordinationRuleConstraints;
}

/**
 * 协调规则约束接口
 * @description 描述协调规则的约束条件
 */
export interface CoordinationRuleConstraints {
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
  /** 依赖限制 */
  readonly dependencyConstraints: string[];
}

/**
 * 协调历史记录条目接口
 * @description 描述协调过程中的历史记录
 */
export interface CoordinationHistoryEntry {
  /** 记录唯一标识符 */
  readonly id: string;
  /** 记录时间戳 */
  readonly timestamp: Date;
  /** 记录类型 */
  readonly type: CoordinationHistoryType;
  /** 记录消息 */
  readonly message: string;
  /** 记录数据 */
  readonly data: unknown;
  /** 记录来源 */
  readonly source: string;
  /** 记录级别 */
  readonly level: CoordinationLogLevel;
}

/**
 * 协调结果摘要接口
 * @description 描述协调结果的摘要信息
 */
export interface CoordinationResultSummary {
  /** 执行状态 */
  readonly status: string;
  /** 执行耗时 */
  readonly duration: number;
  /** 错误数量 */
  readonly errorCount: number;
  /** 警告数量 */
  readonly warningCount: number;
  /** 参与服务数量 */
  readonly serviceCount: number;
  /** 执行规则数量 */
  readonly ruleCount: number;
  /** 成功率 */
  readonly successRate: number;
}

/**
 * 协调状态枚举
 * @description 定义协调过程的状态
 */
export enum CoordinationStatus {
  /** 初始化 */
  INITIALIZED = "initialized",
  /** 运行中 */
  RUNNING = "running",
  /** 暂停 */
  PAUSED = "paused",
  /** 完成 */
  COMPLETED = "completed",
  /** 失败 */
  FAILED = "failed",
  /** 取消 */
  CANCELLED = "cancelled",
  /** 超时 */
  TIMEOUT = "timeout",
}

/**
 * 协调历史记录类型枚举
 * @description 定义协调历史记录的类型
 */
export enum CoordinationHistoryType {
  /** 规则执行 */
  RULE_EXECUTION = "rule_execution",
  /** 服务调用 */
  SERVICE_CALL = "service_call",
  /** 状态变更 */
  STATUS_CHANGE = "status_change",
  /** 错误发生 */
  ERROR_OCCURRED = "error_occurred",
  /** 警告发生 */
  WARNING_OCCURRED = "warning_occurred",
  /** 用户操作 */
  USER_ACTION = "user_action",
  /** 系统事件 */
  SYSTEM_EVENT = "system_event",
}

/**
 * 协调日志级别枚举
 * @description 定义协调日志的级别
 */
export enum CoordinationLogLevel {
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
