/**
 * @fileoverview Aggregate Reconstruction Factory Interface - 聚合重构工厂接口
 * @description 聚合重构工厂的通用接口定义
 */

import { AggregateRoot } from "../aggregates/base/aggregate-root.base.js";
import { EntityId } from "../identifiers/entity-id.js";
import { DomainEvent } from "../events/base/domain-event.base.js";
import { AggregateSnapshot } from "./aggregate-snapshot.interface.js";
import { ValidationResult } from "../validation/index.js";

/**
 * 聚合重构参数接口
 * @description 聚合重构时的参数
 */
export interface AggregateReconstructionParams {
  /** 聚合根标识符 */
  aggregateId: EntityId;
  /** 聚合根类型 */
  aggregateType: string;
  /** 领域事件列表 */
  events: DomainEvent[];
  /** 快照数据 */
  snapshot?: AggregateSnapshot;
  /** 重构选项 */
  options?: AggregateReconstructionOptions;
}

/**
 * 聚合重构选项接口
 * @description 聚合重构时的选项
 */
export interface AggregateReconstructionOptions {
  /** 是否严格验证事件顺序 */
  strictEventOrder?: boolean;
  /** 是否验证事件版本连续性 */
  validateEventVersionContinuity?: boolean;
  /** 是否应用快照 */
  applySnapshot?: boolean;
  /** 是否验证聚合状态 */
  validateAggregateState?: boolean;
  /** 最大事件数量 */
  maxEventCount?: number;
  /** 事件过滤器 */
  eventFilter?: (event: DomainEvent) => boolean;
  /** 事件转换器 */
  eventTransformer?: (event: DomainEvent) => DomainEvent;
  /** 验证上下文 */
  validationContext?: Record<string, unknown>;
}

/**
 * 聚合重构结果接口
 * @description 聚合重构的结果
 */
export interface AggregateReconstructionResult<T extends AggregateRoot> {
  /** 重构的聚合根 */
  aggregate: T;
  /** 应用的事件数量 */
  appliedEventCount: number;
  /** 跳过的事件数量 */
  skippedEventCount: number;
  /** 重构统计信息 */
  statistics: ReconstructionStatistics;
  /** 警告信息 */
  warnings: string[];
  /** 错误信息 */
  errors: string[];
}

/**
 * 重构统计信息接口
 * @description 聚合重构过程的统计信息
 */
export interface ReconstructionStatistics {
  /** 重构开始时间 */
  startTime: Date;
  /** 重构结束时间 */
  endTime: Date;
  /** 重构耗时（毫秒） */
  duration: number;
  /** 处理的事件总数 */
  totalEvents: number;
  /** 成功应用的事件数 */
  appliedEvents: number;
  /** 跳过的事件数 */
  skippedEvents: number;
  /** 失败的事件数 */
  failedEvents: number;
  /** 快照应用状态 */
  snapshotApplied: boolean;
  /** 最终版本号 */
  finalVersion: number;
  /** 初始版本号 */
  initialVersion: number;
}

/**
 * 聚合重构工厂接口
 * @description 提供聚合重构的工厂方法
 * @template T 聚合根类型
 */
export interface IAggregateReconstructionFactory<T extends AggregateRoot> {
  /**
   * 重构聚合根
   * @description 从领域事件重构聚合根实例
   * @param params 聚合重构参数
   * @returns 聚合重构结果
   * @throws {FactoryException} 当重构失败时抛出
   */
  reconstruct(
    params: AggregateReconstructionParams,
  ): Promise<AggregateReconstructionResult<T>>;

  /**
   * 从快照重构聚合根
   * @description 从快照数据重构聚合根实例
   * @param snapshot 聚合快照
   * @param options 重构选项
   * @returns 聚合重构结果
   * @throws {FactoryException} 当重构失败时抛出
   */
  reconstructFromSnapshot(
    snapshot: AggregateSnapshot,
    options?: AggregateReconstructionOptions,
  ): Promise<AggregateReconstructionResult<T>>;

  /**
   * 验证重构参数
   * @description 验证聚合重构参数的有效性
   * @param params 聚合重构参数
   * @returns 验证结果
   */
  validateReconstructionParams(
    params: AggregateReconstructionParams,
  ): ValidationResult;

  /**
   * 获取聚合根类型名称
   * @description 获取工厂处理的聚合根类型名称
   * @returns 聚合根类型名称
   */
  getAggregateTypeName(): string;

  /**
   * 检查是否支持聚合根类型
   * @description 检查工厂是否支持指定的聚合根类型
   * @param aggregateType 聚合根类型
   * @returns 是否支持
   */
  supportsAggregateType(aggregateType: string): boolean;

  /**
   * 获取支持的事件类型
   * @description 获取工厂支持的所有事件类型
   * @returns 事件类型列表
   */
  getSupportedEventTypes(): string[];

  /**
   * 检查是否支持事件类型
   * @description 检查工厂是否支持指定的事件类型
   * @param eventType 事件类型
   * @returns 是否支持
   */
  supportsEventType(eventType: string): boolean;

  /**
   * 创建空聚合根
   * @description 创建空的聚合根实例
   * @param aggregateId 聚合根标识符
   * @returns 空的聚合根实例
   */
  createEmptyAggregate(aggregateId: EntityId): T;

  /**
   * 应用单个事件
   * @description 将单个事件应用到聚合根
   * @param aggregate 聚合根实例
   * @param event 领域事件
   * @returns 更新后的聚合根实例
   */
  applyEvent(aggregate: T, event: DomainEvent): T;
}

/**
 * 聚合重构工厂构建器接口
 * @description 用于构建聚合重构工厂的构建器
 * @template T 聚合根类型
 */
export interface IAggregateReconstructionFactoryBuilder<
  T extends AggregateRoot,
> {
  /**
   * 设置聚合根类型
   * @param aggregateType 聚合根类型
   * @returns 构建器实例
   */
  setAggregateType(
    aggregateType: string,
  ): IAggregateReconstructionFactoryBuilder<T>;

  /**
   * 设置重构函数
   * @param reconstructFn 重构函数
   * @returns 构建器实例
   */
  setReconstructFunction(
    reconstructFn: (
      params: AggregateReconstructionParams,
    ) => Promise<AggregateReconstructionResult<T>>,
  ): IAggregateReconstructionFactoryBuilder<T>;

  /**
   * 设置快照重构函数
   * @param snapshotReconstructFn 快照重构函数
   * @returns 构建器实例
   */
  setSnapshotReconstructFunction(
    snapshotReconstructFn: (
      snapshot: AggregateSnapshot,
      options?: AggregateReconstructionOptions,
    ) => Promise<AggregateReconstructionResult<T>>,
  ): IAggregateReconstructionFactoryBuilder<T>;

  /**
   * 设置验证函数
   * @param validateFn 验证函数
   * @returns 构建器实例
   */
  setValidationFunction(
    validateFn: (params: AggregateReconstructionParams) => ValidationResult,
  ): IAggregateReconstructionFactoryBuilder<T>;

  /**
   * 设置空聚合根创建函数
   * @param createEmptyFn 空聚合根创建函数
   * @returns 构建器实例
   */
  setCreateEmptyFunction(
    createEmptyFn: (aggregateId: EntityId) => T,
  ): IAggregateReconstructionFactoryBuilder<T>;

  /**
   * 设置事件应用函数
   * @param applyEventFn 事件应用函数
   * @returns 构建器实例
   */
  setApplyEventFunction(
    applyEventFn: (aggregate: T, event: DomainEvent) => T,
  ): IAggregateReconstructionFactoryBuilder<T>;

  /**
   * 添加支持的事件类型
   * @param eventType 事件类型
   * @returns 构建器实例
   */
  addSupportedEventType(
    eventType: string,
  ): IAggregateReconstructionFactoryBuilder<T>;

  /**
   * 构建聚合重构工厂
   * @returns 聚合重构工厂实例
   */
  build(): IAggregateReconstructionFactory<T>;
}

/**
 * 聚合重构工厂注册表接口
 * @description 管理多个聚合重构工厂的注册表
 */
export interface IAggregateReconstructionFactoryRegistry {
  /**
   * 注册聚合重构工厂
   * @param aggregateType 聚合根类型
   * @param factory 聚合重构工厂
   */
  registerFactory<T extends AggregateRoot>(
    aggregateType: string,
    factory: IAggregateReconstructionFactory<T>,
  ): void;

  /**
   * 获取聚合重构工厂
   * @param aggregateType 聚合根类型
   * @returns 聚合重构工厂或undefined
   */
  getFactory<T extends AggregateRoot>(
    aggregateType: string,
  ): IAggregateReconstructionFactory<T> | undefined;

  /**
   * 检查是否已注册
   * @param aggregateType 聚合根类型
   * @returns 是否已注册
   */
  isRegistered(aggregateType: string): boolean;

  /**
   * 注销聚合重构工厂
   * @param aggregateType 聚合根类型
   */
  unregisterFactory(aggregateType: string): void;

  /**
   * 获取所有已注册的聚合根类型
   * @returns 聚合根类型列表
   */
  getRegisteredAggregateTypes(): string[];

  /**
   * 清空所有注册
   */
  clear(): void;
}
