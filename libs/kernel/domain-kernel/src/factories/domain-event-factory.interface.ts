/**
 * @fileoverview Domain Event Factory Interface - 领域事件工厂接口
 * @description 领域事件创建工厂的通用接口定义
 */

import { DomainEvent } from "../events/base/domain-event.base.js";
import { EntityId } from "../identifiers/entity-id.js";
import { ValidationResult } from "../validation/index.js";

/**
 * 领域事件创建参数接口
 * @description 领域事件创建时的参数
 */
export interface DomainEventCreationParams {
  /** 事件标识符 */
  eventId: string;
  /** 聚合根标识符 */
  aggregateId: EntityId;
  /** 事件版本 */
  version: number;
  /** 事件数据 */
  data: unknown;
  /** 事件元数据 */
  metadata?: DomainEventMetadata;
  /** 创建选项 */
  options?: DomainEventCreationOptions;
}

/**
 * 领域事件元数据接口
 * @description 领域事件的元数据信息
 */
export interface DomainEventMetadata {
  /** 事件类型 */
  eventType: string;
  /** 聚合根类型 */
  aggregateType: string;
  /** 事件时间戳 */
  timestamp: Date;
  /** 事件来源 */
  source?: string;
  /** 事件标签 */
  tags?: string[];
  /** 相关性标识符 */
  correlationId?: string;
  /** 因果关系标识符 */
  causationId?: string;
  /** 用户标识符 */
  userId?: string;
  /** 会话标识符 */
  sessionId?: string;
  /** 自定义元数据 */
  customData?: Record<string, unknown>;
}

/**
 * 领域事件创建选项接口
 * @description 领域事件创建时的选项
 */
export interface DomainEventCreationOptions {
  /** 是否自动生成事件标识符 */
  autoGenerateEventId?: boolean;
  /** 是否自动生成时间戳 */
  autoGenerateTimestamp?: boolean;
  /** 是否严格验证 */
  strictValidation?: boolean;
  /** 是否允许重复事件 */
  allowDuplicateEvents?: boolean;
  /** 事件优先级 */
  priority?: EventPriority;
  /** 事件过期时间 */
  expirationTime?: Date;
  /** 重试次数 */
  retryCount?: number;
  /** 最大重试次数 */
  maxRetryCount?: number;
}

/**
 * 事件优先级枚举
 * @description 领域事件的优先级
 */
export enum EventPriority {
  /** 低优先级 */
  LOW = "LOW",
  /** 普通优先级 */
  NORMAL = "NORMAL",
  /** 高优先级 */
  HIGH = "HIGH",
  /** 紧急优先级 */
  URGENT = "URGENT",
  /** 关键优先级 */
  CRITICAL = "CRITICAL",
}

/**
 * 领域事件工厂接口
 * @description 提供领域事件创建和重构的工厂方法
 * @template T 领域事件类型
 */
export interface IDomainEventFactory<T extends DomainEvent> {
  /**
   * 创建新领域事件
   * @description 根据创建参数创建新的领域事件实例
   * @param params 领域事件创建参数
   * @returns 新创建的领域事件实例
   * @throws {FactoryException} 当创建失败时抛出
   */
  create(params: DomainEventCreationParams): T;

  /**
   * 重构领域事件
   * @description 从持久化数据重构领域事件实例
   * @param eventData 事件数据
   * @param metadata 事件元数据
   * @returns 重构的领域事件实例
   * @throws {FactoryException} 当重构失败时抛出
   */
  reconstitute(eventData: unknown, metadata: DomainEventMetadata): T;

  /**
   * 克隆领域事件
   * @description 创建领域事件的深拷贝
   * @param domainEvent 要克隆的领域事件
   * @returns 克隆的领域事件实例
   * @throws {FactoryException} 当克隆失败时抛出
   */
  clone(domainEvent: T): T;

  /**
   * 验证创建参数
   * @description 验证领域事件创建参数的有效性
   * @param params 领域事件创建参数
   * @returns 验证结果
   */
  validateCreationParams(params: DomainEventCreationParams): ValidationResult;

  /**
   * 获取领域事件类型名称
   * @description 获取工厂处理的领域事件类型名称
   * @returns 领域事件类型名称
   */
  getDomainEventTypeName(): string;

  /**
   * 检查是否支持领域事件类型
   * @description 检查工厂是否支持指定的领域事件类型
   * @param eventType 领域事件类型
   * @returns 是否支持
   */
  supportsDomainEventType(eventType: string): boolean;

  /**
   * 生成事件标识符
   * @description 生成唯一的事件标识符
   * @returns 事件标识符
   */
  generateEventId(): string;

  /**
   * 生成时间戳
   * @description 生成当前时间戳
   * @returns 时间戳
   */
  generateTimestamp(): Date;
}

/**
 * 领域事件工厂构建器接口
 * @description 用于构建领域事件工厂的构建器
 * @template T 领域事件类型
 */
export interface IDomainEventFactoryBuilder<T extends DomainEvent> {
  /**
   * 设置领域事件类型
   * @param eventType 领域事件类型
   * @returns 构建器实例
   */
  setDomainEventType(eventType: string): IDomainEventFactoryBuilder<T>;

  /**
   * 设置创建函数
   * @param createFn 创建函数
   * @returns 构建器实例
   */
  setCreateFunction(
    createFn: (params: DomainEventCreationParams) => T,
  ): IDomainEventFactoryBuilder<T>;

  /**
   * 设置重构函数
   * @param reconstituteFn 重构函数
   * @returns 构建器实例
   */
  setReconstituteFunction(
    reconstituteFn: (eventData: unknown, metadata: DomainEventMetadata) => T,
  ): IDomainEventFactoryBuilder<T>;

  /**
   * 设置克隆函数
   * @param cloneFn 克隆函数
   * @returns 构建器实例
   */
  setCloneFunction(
    cloneFn: (domainEvent: T) => T,
  ): IDomainEventFactoryBuilder<T>;

  /**
   * 设置验证函数
   * @param validateFn 验证函数
   * @returns 构建器实例
   */
  setValidationFunction(
    validateFn: (params: DomainEventCreationParams) => ValidationResult,
  ): IDomainEventFactoryBuilder<T>;

  /**
   * 设置事件标识符生成器
   * @param generatorFn 生成器函数
   * @returns 构建器实例
   */
  setEventIdGenerator(generatorFn: () => string): IDomainEventFactoryBuilder<T>;

  /**
   * 设置时间戳生成器
   * @param generatorFn 生成器函数
   * @returns 构建器实例
   */
  setTimestampGenerator(generatorFn: () => Date): IDomainEventFactoryBuilder<T>;

  /**
   * 构建领域事件工厂
   * @returns 领域事件工厂实例
   */
  build(): IDomainEventFactory<T>;
}

/**
 * 领域事件工厂注册表接口
 * @description 管理多个领域事件工厂的注册表
 */
export interface IDomainEventFactoryRegistry {
  /**
   * 注册领域事件工厂
   * @param eventType 领域事件类型
   * @param factory 领域事件工厂
   */
  registerFactory<T extends DomainEvent>(
    eventType: string,
    factory: IDomainEventFactory<T>,
  ): void;

  /**
   * 获取领域事件工厂
   * @param eventType 领域事件类型
   * @returns 领域事件工厂或undefined
   */
  getFactory<T extends DomainEvent>(
    eventType: string,
  ): IDomainEventFactory<T> | undefined;

  /**
   * 检查是否已注册
   * @param eventType 领域事件类型
   * @returns 是否已注册
   */
  isRegistered(eventType: string): boolean;

  /**
   * 注销领域事件工厂
   * @param eventType 领域事件类型
   */
  unregisterFactory(eventType: string): void;

  /**
   * 获取所有已注册的领域事件类型
   * @returns 领域事件类型列表
   */
  getRegisteredDomainEventTypes(): string[];

  /**
   * 清空所有注册
   */
  clear(): void;
}
