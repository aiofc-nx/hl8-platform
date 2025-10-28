/**
 * @fileoverview Aggregate Factory Interface - 聚合根工厂接口
 * @description 创建聚合根的工厂接口，支持复杂初始化和事件重建
 */

import { AggregateRoot } from "../aggregates/base/aggregate-root.base.js";
import { DomainEvent } from "../events/base/domain-event.base.js";
import { ValidationResult } from "../validation/rules/validation-result.interface.js";

/**
 * 聚合创建参数
 * @description 聚合根创建的参数
 */
export interface AggregateCreationParams {
  /** 聚合根类型 */
  aggregateType: string;
  /** 创建数据 */
  data: Record<string, unknown>;
  /** 依赖映射 */
  dependencies: Map<string, unknown>;
  /** 创建元数据 */
  metadata: Record<string, unknown>;
}

/**
 * 聚合根工厂接口
 * @description 创建聚合根的工厂接口，支持复杂初始化和事件重建
 * @template T 聚合根类型
 */
export interface IAggregateFactory<T extends AggregateRoot> {
  /**
   * 创建聚合根
   * @param params 创建参数
   * @returns 聚合根实例
   * @throws {FactoryException} 当创建失败时抛出
   */
  create(params: AggregateCreationParams): T;

  /**
   * 从事件重建聚合根
   * @param events 领域事件列表
   * @returns 聚合根实例
   * @throws {FactoryException} 当重建失败时抛出
   */
  createFromEvents(events: DomainEvent[]): T;

  /**
   * 验证创建参数
   * @param params 创建参数
   * @returns 验证结果
   */
  validateCreationParams(params: AggregateCreationParams): ValidationResult;
}
