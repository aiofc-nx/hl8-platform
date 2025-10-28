/**
 * @fileoverview Factory Interfaces - 工厂接口定义
 * @description 定义对象创建的抽象接口，支持复杂对象构建和验证
 */

import { EntityId } from "@hl8/domain-kernel";
import { AggregateRoot } from "@hl8/domain-kernel";
import { Entity } from "@hl8/domain-kernel";
import { ValueObject } from "@hl8/domain-kernel";
import { DomainEvent } from "@hl8/domain-kernel";
import { ValidationResult } from "@hl8/domain-kernel";
import { ValidationRule } from "@hl8/domain-kernel";

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

/**
 * 实体工厂接口
 * @description 创建实体的工厂接口，支持依赖注入和验证
 * @template T 实体类型
 */
export interface IEntityFactory<T extends Entity> {
  /**
   * 创建实体
   * @param params 创建参数
   * @returns 实体实例
   * @throws {FactoryException} 当创建失败时抛出
   */
  create(params: EntityCreationParams): T;

  /**
   * 使用依赖创建实体
   * @param params 创建参数
   * @param dependencies 依赖映射
   * @returns 实体实例
   * @throws {FactoryException} 当创建失败时抛出
   */
  createWithDependencies(
    params: EntityCreationParams,
    dependencies: Map<string, unknown>,
  ): T;

  /**
   * 验证创建参数
   * @param params 创建参数
   * @returns 验证结果
   */
  validateCreationParams(params: EntityCreationParams): ValidationResult;
}

/**
 * 值对象工厂接口
 * @description 创建值对象的工厂接口，支持验证和规则
 * @template T 值对象类型
 */
export interface IValueObjectFactory<T extends ValueObject> {
  /**
   * 创建值对象
   * @param value 值对象的值
   * @returns 值对象实例
   * @throws {FactoryException} 当创建失败时抛出
   */
  create(value: unknown): T;

  /**
   * 使用验证规则创建值对象
   * @param value 值对象的值
   * @param rules 验证规则列表
   * @returns 值对象实例
   * @throws {FactoryException} 当创建失败时抛出
   */
  createWithValidation(value: unknown, rules: ValidationRule[]): T;

  /**
   * 验证值
   * @param value 要验证的值
   * @returns 验证结果
   */
  validateValue(value: unknown): ValidationResult;
}

/**
 * 领域事件工厂接口
 * @description 创建领域事件的工厂接口，支持元数据和版本控制
 */
export interface IDomainEventFactory {
  /**
   * 创建领域事件
   * @param eventType 事件类型
   * @param aggregateId 聚合根ID
   * @param data 事件数据
   * @param metadata 事件元数据
   * @returns 领域事件实例
   * @throws {FactoryException} 当创建失败时抛出
   */
  createEvent(
    eventType: string,
    aggregateId: EntityId,
    data: unknown,
    metadata?: Record<string, unknown>,
  ): DomainEvent;

  /**
   * 创建带版本的领域事件
   * @param eventType 事件类型
   * @param aggregateId 聚合根ID
   * @param data 事件数据
   * @param version 事件版本
   * @param metadata 事件元数据
   * @returns 领域事件实例
   * @throws {FactoryException} 当创建失败时抛出
   */
  createEventWithVersion(
    eventType: string,
    aggregateId: EntityId,
    data: unknown,
    version: number,
    metadata?: Record<string, unknown>,
  ): DomainEvent;
}

/**
 * 聚合重建工厂接口
 * @description 从事件重建聚合的工厂接口，支持快照和事件重放
 * @template T 聚合根类型
 */
export interface IAggregateReconstructionFactory<T extends AggregateRoot> {
  /**
   * 从事件重建聚合
   * @param events 领域事件列表
   * @returns 聚合根实例
   * @throws {FactoryException} 当重建失败时抛出
   */
  reconstructFromEvents(events: DomainEvent[]): T;

  /**
   * 从快照和事件重建聚合
   * @param snapshot 聚合快照
   * @param events 领域事件列表
   * @returns 聚合根实例
   * @throws {FactoryException} 当重建失败时抛出
   */
  reconstructFromSnapshot(
    snapshot: AggregateSnapshot,
    events: DomainEvent[],
  ): T;

  /**
   * 验证重建数据
   * @param events 领域事件列表
   * @returns 验证结果
   */
  validateReconstructionData(events: DomainEvent[]): ValidationResult;
}

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
 * 实体创建参数
 * @description 实体创建的参数
 */
export interface EntityCreationParams {
  /** 实体类型 */
  entityType: string;
  /** 创建数据 */
  data: Record<string, unknown>;
  /** 依赖映射 */
  dependencies: Map<string, unknown>;
  /** 创建元数据 */
  metadata: Record<string, unknown>;
}

/**
 * 聚合快照
 * @description 聚合根的快照数据
 */
export interface AggregateSnapshot {
  /** 聚合根ID */
  aggregateId: EntityId;
  /** 快照版本 */
  version: number;
  /** 快照数据 */
  data: Record<string, unknown>;
  /** 创建时间 */
  createdAt: Date;
  /** 快照类型 */
  type: string;
  /** 元数据 */
  metadata: Record<string, unknown>;
}
