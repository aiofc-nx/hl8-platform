/**
 * @fileoverview 聚合根基类
 * @description 管理聚合边界，协调内部实体，发布领域事件
 */

import { Entity } from "../../entities/base/entity.base.js";
import { InternalEntity } from "../../entities/internal/internal-entity.base.js";
import { EntityId } from "../../identifiers/entity-id.js";
import { AuditInfo } from "../../audit/audit-info.js";
import { EntityLifecycle } from "../../entities/base/entity-lifecycle.enum.js";

/**
 * 聚合根基类
 * @description 管理聚合边界，协调内部实体，发布领域事件
 * 遵循实体分离原则，不能直接执行业务逻辑
 */
export abstract class AggregateRoot extends Entity {
  private readonly _internalEntities: Map<string, InternalEntity> = new Map();
  private readonly _domainEvents: DomainEvent[] = [];

  /**
   * 创建聚合根
   * @param id 聚合根标识符，可选，默认自动生成
   * @param auditInfo 审计信息，可选，默认自动创建
   * @param lifecycleState 生命周期状态，默认为CREATED
   * @param version 版本号，默认为1
   */
  constructor(
    id?: EntityId,
    auditInfo?: AuditInfo,
    lifecycleState: EntityLifecycle = EntityLifecycle.CREATED,
    version: number = 1,
  ) {
    super(id, auditInfo, lifecycleState, version);
  }

  /**
   * 获取内部实体集合
   * @returns 内部实体映射的副本
   */
  public get internalEntities(): Map<string, InternalEntity> {
    return new Map(this._internalEntities);
  }

  /**
   * 获取待发布领域事件
   * @returns 领域事件数组的副本
   */
  public get domainEvents(): DomainEvent[] {
    return [...this._domainEvents];
  }

  /**
   * 添加内部实体
   * @param entity 内部实体
   * @throws {Error} 当实体无效或已存在时抛出异常
   */
  public addInternalEntity(entity: InternalEntity): void {
    this.validateEntityCanBeAdded(entity);

    const entityId = entity.id.value;
    if (this._internalEntities.has(entityId)) {
      throw new Error(`内部实体已存在: ${entityId}`);
    }

    this._internalEntities.set(entityId, entity);
    this.addDomainEvent({
      type: "InternalEntityAdded",
      entityId: entity.id,
      aggregateRootId: this.id,
      timestamp: new Date(),
      data: { entityType: entity.constructor.name },
    });
  }

  /**
   * 移除内部实体
   * @param entityId 实体标识符
   * @throws {Error} 当实体不存在时抛出异常
   */
  public removeInternalEntity(entityId: EntityId): void {
    const entityIdStr = entityId.value;
    if (!this._internalEntities.has(entityIdStr)) {
      throw new Error(`内部实体不存在: ${entityIdStr}`);
    }

    const entity = this._internalEntities.get(entityIdStr)!;
    this._internalEntities.delete(entityIdStr);

    this.addDomainEvent({
      type: "InternalEntityRemoved",
      entityId: entityId,
      aggregateRootId: this.id,
      timestamp: new Date(),
      data: { entityType: entity.constructor.name },
    });
  }

  /**
   * 获取内部实体
   * @param entityId 实体标识符
   * @returns 内部实体，如果不存在则返回undefined
   */
  public getInternalEntity(entityId: EntityId): InternalEntity | undefined {
    return this._internalEntities.get(entityId.value);
  }

  /**
   * 协调业务操作
   * @param operation 操作名称
   * @param params 操作参数
   * @returns 操作结果
   * @throws {Error} 当聚合根状态不允许执行业务操作时抛出异常
   */
  public coordinateBusinessOperation(
    operation: string,
    params: unknown,
  ): unknown {
    if (!this.canExecuteBusinessOperation()) {
      throw new Error("聚合根状态不允许执行业务操作");
    }

    // 验证分离原则
    this.validateSeparationPrinciple();

    this.validateBusinessInvariants();

    const result = this.performCoordination(operation, params);

    this.addDomainEvent({
      type: "BusinessOperationCoordinated",
      aggregateRootId: this.id,
      timestamp: new Date(),
      data: { operation, params, result },
    });

    return result;
  }

  /**
   * 添加领域事件
   * @param event 领域事件
   */
  public addDomainEvent(event: DomainEvent): void {
    this._domainEvents.push(event);
  }

  /**
   * 获取待发布领域事件
   * @returns 领域事件数组
   */
  public getDomainEvents(): DomainEvent[] {
    return [...this._domainEvents];
  }

  /**
   * 清空待发布领域事件
   */
  public clearDomainEvents(): void {
    this._domainEvents.length = 0;
  }

  /**
   * 验证业务不变量
   * @returns 是否满足业务不变量
   */
  public validateBusinessInvariants(): boolean {
    return this.performBusinessInvariantValidation();
  }

  /**
   * 验证分离原则
   * @throws {Error} 当违反分离原则时抛出异常
   */
  protected validateSeparationPrinciple(): void {
    // 检查聚合根是否直接执行业务逻辑
    if (this.hasDirectBusinessLogic()) {
      throw new Error("聚合根不能直接执行业务逻辑，必须通过协调方法执行");
    }

    // 检查内部实体访问控制
    this.validateInternalEntityAccess();
  }

  /**
   * 检查是否有直接执行业务逻辑
   * @returns 是否有直接执行业务逻辑
   */
  protected hasDirectBusinessLogic(): boolean {
    // 这里可以添加更复杂的检查逻辑
    // 目前这是一个占位符实现
    return false;
  }

  /**
   * 验证内部实体访问控制
   * @throws {Error} 当内部实体访问控制违反时抛出异常
   */
  protected validateInternalEntityAccess(): void {
    for (const entity of this._internalEntities.values()) {
      if (!entity.belongsTo(this.id)) {
        throw new Error("内部实体不属于此聚合根");
      }
    }
  }

  /**
   * 检查是否可以执行业务操作
   * @returns 是否可以执行业务操作
   */
  protected canExecuteBusinessOperation(): boolean {
    return this.lifecycleState === EntityLifecycle.ACTIVE;
  }

  /**
   * 验证实体是否可以添加
   * @param entity 内部实体
   * @throws {Error} 当实体无效时抛出异常
   */
  protected validateEntityCanBeAdded(entity: InternalEntity): void {
    if (!entity) {
      throw new Error("内部实体不能为空");
    }

    if (!entity.belongsTo(this.id)) {
      throw new Error("内部实体不属于此聚合根");
    }

    if (!entity.validateBusinessRules()) {
      throw new Error("内部实体业务规则验证失败");
    }
  }

  /**
   * 执行协调操作
   * @param operation 操作名称
   * @param params 操作参数
   * @returns 操作结果
   */
  protected abstract performCoordination(
    operation: string,
    params: unknown,
  ): unknown;

  /**
   * 执行业务不变量验证
   * @returns 是否满足业务不变量
   */
  protected abstract performBusinessInvariantValidation(): boolean;

  /**
   * 克隆聚合根
   * @returns 新的聚合根实例
   */
  public abstract clone(): AggregateRoot;

  /**
   * 比较两个聚合根是否相等
   * @param other 要比较的另一个聚合根
   * @returns 是否相等
   */
  public equals(other: AggregateRoot | null | undefined): boolean {
    if (!other) {
      return false;
    }

    if (!(other instanceof AggregateRoot)) {
      return false;
    }

    if (!super.equals(other)) {
      return false;
    }

    if (this._internalEntities.size !== other._internalEntities.size) {
      return false;
    }

    for (const [key, entity] of this._internalEntities) {
      const otherEntity = other._internalEntities.get(key);
      if (!otherEntity || !entity.equals(otherEntity)) {
        return false;
      }
    }

    return true;
  }

  /**
   * 转换为JSON表示
   * @returns JSON对象
   */
  public toJSON(): object {
    return {
      ...super.toJSON(),
      internalEntities: Array.from(this._internalEntities.entries()).map(
        ([id, entity]) => ({
          id,
          entity: entity.toJSON(),
        }),
      ),
      domainEvents: this._domainEvents.map((event) => ({
        type: event.type,
        entityId: event.entityId?.toJSON(),
        aggregateRootId: event.aggregateRootId.toJSON(),
        timestamp: event.timestamp.toISOString(),
        data: event.data,
      })),
    };
  }
}

/**
 * 领域事件接口
 * @description 表示聚合根中发生的事件
 */
export interface DomainEvent {
  /** 事件类型 */
  type: string;
  /** 相关实体ID（可选） */
  entityId?: EntityId;
  /** 聚合根ID */
  aggregateRootId: EntityId;
  /** 事件时间戳 */
  timestamp: Date;
  /** 事件数据 */
  data: unknown;
}
