/**
 * @fileoverview 协调上下文接口定义
 * @description 定义领域服务协调上下文的数据结构和行为
 */

import {
  ICoordinationContext,
  CoordinationHistoryEntry,
  CoordinationStatus,
  CoordinationHistoryType,
  CoordinationLogLevel,
} from "./coordination-rule.interface.js";

/**
 * 协调上下文实现类
 * @description 提供协调规则执行时的上下文信息的具体实现
 */
export class CoordinationContext implements ICoordinationContext {
  public readonly id: string;
  public readonly operationType: string;
  public readonly operationData: unknown;
  public readonly participatingServices: string[];
  public readonly startTime: Date;
  public readonly timeout: number;
  public readonly priority: number;
  public readonly tags: string[];
  public readonly metadata: Record<string, unknown>;
  public readonly history: CoordinationHistoryEntry[];
  public status: CoordinationStatus;

  constructor(
    id: string,
    operationType: string,
    operationData: unknown,
    participatingServices: string[] = [],
    timeout: number = 30000,
    priority: number = 0,
    tags: string[] = [],
    metadata: Record<string, unknown> = {},
  ) {
    this.id = id;
    this.operationType = operationType;
    this.operationData = operationData;
    this.participatingServices = participatingServices;
    this.startTime = new Date();
    this.timeout = timeout;
    this.priority = priority;
    this.tags = tags;
    this.metadata = metadata;
    this.history = [];
    this.status = CoordinationStatus.INITIALIZED;
  }

  /**
   * 添加历史记录
   * @param entry 历史记录条目
   */
  addHistoryEntry(entry: CoordinationHistoryEntry): void {
    this.history.push(entry);
  }

  /**
   * 更新协调状态
   * @param status 新状态
   */
  updateStatus(status: CoordinationStatus): void {
    this.status = status;
    this.addHistoryEntry({
      id: this.generateId(),
      timestamp: new Date(),
      type: CoordinationHistoryType.STATUS_CHANGE,
      message: `Status changed to ${status}`,
      data: { oldStatus: this.status, newStatus: status },
      source: "CoordinationContext",
      level: CoordinationLogLevel.INFO,
    });
  }

  /**
   * 检查是否超时
   * @returns 是否超时
   */
  isTimeout(): boolean {
    const now = new Date();
    const elapsed = now.getTime() - this.startTime.getTime();
    return elapsed > this.timeout;
  }

  /**
   * 获取剩余时间
   * @returns 剩余时间（毫秒）
   */
  getRemainingTime(): number {
    const now = new Date();
    const elapsed = now.getTime() - this.startTime.getTime();
    return Math.max(0, this.timeout - elapsed);
  }

  /**
   * 生成唯一ID
   * @returns 唯一ID
   */
  private generateId(): string {
    return `entry_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * 协调上下文构建器接口
 * @description 提供链式API构建协调上下文
 */
export interface ICoordinationContextBuilder {
  /**
   * 设置操作类型
   * @param operationType 操作类型
   * @returns 构建器实例
   */
  withOperationType(operationType: string): ICoordinationContextBuilder;

  /**
   * 设置操作数据
   * @param operationData 操作数据
   * @returns 构建器实例
   */
  withOperationData(operationData: unknown): ICoordinationContextBuilder;

  /**
   * 添加参与服务
   * @param service 服务类型
   * @returns 构建器实例
   */
  withParticipatingService(service: string): ICoordinationContextBuilder;

  /**
   * 设置参与服务列表
   * @param services 服务类型列表
   * @returns 构建器实例
   */
  withParticipatingServices(services: string[]): ICoordinationContextBuilder;

  /**
   * 设置超时时间
   * @param timeout 超时时间（毫秒）
   * @returns 构建器实例
   */
  withTimeout(timeout: number): ICoordinationContextBuilder;

  /**
   * 设置优先级
   * @param priority 优先级
   * @returns 构建器实例
   */
  withPriority(priority: number): ICoordinationContextBuilder;

  /**
   * 添加标签
   * @param tag 标签
   * @returns 构建器实例
   */
  withTag(tag: string): ICoordinationContextBuilder;

  /**
   * 设置标签列表
   * @param tags 标签列表
   * @returns 构建器实例
   */
  withTags(tags: string[]): ICoordinationContextBuilder;

  /**
   * 添加元数据
   * @param key 元数据键
   * @param value 元数据值
   * @returns 构建器实例
   */
  withMetadata(key: string, value: unknown): ICoordinationContextBuilder;

  /**
   * 设置元数据
   * @param metadata 元数据对象
   * @returns 构建器实例
   */
  withMetadataObject(
    metadata: Record<string, unknown>,
  ): ICoordinationContextBuilder;

  /**
   * 构建协调上下文
   * @returns 协调上下文实例
   */
  build(): ICoordinationContext;
}

/**
 * 协调上下文构建器实现类
 * @description 提供链式API构建协调上下文的具体实现
 */
export class CoordinationContextBuilder implements ICoordinationContextBuilder {
  private id: string;
  private operationType: string = "";
  private operationData: unknown = {};
  private participatingServices: string[] = [];
  private timeout: number = 30000;
  private priority: number = 0;
  private tags: string[] = [];
  private metadata: Record<string, unknown> = {};

  constructor(id?: string) {
    this.id = id || this.generateId();
  }

  withOperationType(operationType: string): ICoordinationContextBuilder {
    this.operationType = operationType;
    return this;
  }

  withOperationData(operationData: unknown): ICoordinationContextBuilder {
    this.operationData = operationData;
    return this;
  }

  withParticipatingService(service: string): ICoordinationContextBuilder {
    if (!this.participatingServices.includes(service)) {
      this.participatingServices.push(service);
    }
    return this;
  }

  withParticipatingServices(services: string[]): ICoordinationContextBuilder {
    this.participatingServices = [...services];
    return this;
  }

  withTimeout(timeout: number): ICoordinationContextBuilder {
    this.timeout = timeout;
    return this;
  }

  withPriority(priority: number): ICoordinationContextBuilder {
    this.priority = priority;
    return this;
  }

  withTag(tag: string): ICoordinationContextBuilder {
    if (!this.tags.includes(tag)) {
      this.tags.push(tag);
    }
    return this;
  }

  withTags(tags: string[]): ICoordinationContextBuilder {
    this.tags = [...tags];
    return this;
  }

  withMetadata(key: string, value: unknown): ICoordinationContextBuilder {
    this.metadata[key] = value;
    return this;
  }

  withMetadataObject(
    metadata: Record<string, unknown>,
  ): ICoordinationContextBuilder {
    this.metadata = { ...this.metadata, ...metadata };
    return this;
  }

  build(): ICoordinationContext {
    return new CoordinationContext(
      this.id,
      this.operationType,
      this.operationData,
      this.participatingServices,
      this.timeout,
      this.priority,
      this.tags,
      this.metadata,
    );
  }

  /**
   * 生成唯一ID
   * @returns 唯一ID
   */
  private generateId(): string {
    return `context_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
