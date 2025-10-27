/**
 * @fileoverview 实体基类
 * @description 提供充血模型实体的基础功能，包含UUID标识符和审计能力
 */

import { EntityId } from "../../identifiers/entity-id.js";
import { AuditInfo } from "../../audit/audit-info.js";
import {
  EntityLifecycle,
  isValidLifecycleTransition,
} from "./entity-lifecycle.enum.js";

/**
 * 实体基类
 * @description 提供充血模型实体的基础功能，包含UUID标识符和审计能力
 */
export abstract class Entity {
  protected readonly _id: EntityId;
  protected _auditInfo: AuditInfo;
  protected _lifecycleState: EntityLifecycle;
  protected _version: number;
  protected readonly _createdAt: Date;
  protected _updatedAt: Date;
  protected _deletedAt?: Date;
  protected _deletedBy?: EntityId;

  /**
   * 创建实体
   * @param id 实体标识符，如果未提供则自动生成
   * @param auditInfo 审计信息
   * @param lifecycleState 生命周期状态，默认为CREATED
   * @param version 版本号，默认为1
   * @param deletedAt 删除时间（软删除时设置）
   * @param deletedBy 删除者ID（软删除时设置）
   */
  constructor(
    id?: EntityId,
    auditInfo?: AuditInfo,
    lifecycleState: EntityLifecycle = EntityLifecycle.CREATED,
    version: number = 1,
    deletedAt?: Date,
    deletedBy?: EntityId,
  ) {
    this._id = id || EntityId.generate();
    this._auditInfo = auditInfo || AuditInfo.create(this._id);
    this._lifecycleState = lifecycleState;
    this._version = version;
    this._createdAt = new Date();
    this._updatedAt = new Date();
    this._deletedAt = deletedAt;
    this._deletedBy = deletedBy;

    this.validateEntity();
  }

  /**
   * 获取实体标识符
   * @returns 实体标识符
   */
  public get id(): EntityId {
    return this._id.clone();
  }

  /**
   * 获取审计信息
   * @returns 审计信息
   */
  public get auditInfo(): AuditInfo {
    return this._auditInfo;
  }

  /**
   * 获取生命周期状态
   * @returns 生命周期状态
   */
  public get lifecycleState(): EntityLifecycle {
    return this._lifecycleState;
  }

  /**
   * 获取版本号
   * @returns 版本号
   */
  public get version(): number {
    return this._version;
  }

  /**
   * 获取创建时间
   * @returns 创建时间
   */
  public get createdAt(): Date {
    return new Date(this._createdAt.getTime());
  }

  /**
   * 获取更新时间
   * @returns 更新时间
   */
  public get updatedAt(): Date {
    return new Date(this._updatedAt.getTime());
  }

  /**
   * 激活实体
   * @description 将实体状态从CREATED或INACTIVE转换为ACTIVE
   * @throws {Error} 当状态转换无效时抛出异常
   */
  public activate(): void {
    this.changeLifecycleState(EntityLifecycle.ACTIVE);
  }

  /**
   * 停用实体
   * @description 将实体状态从ACTIVE转换为INACTIVE
   * @throws {Error} 当状态转换无效时抛出异常
   */
  public deactivate(): void {
    this.changeLifecycleState(EntityLifecycle.INACTIVE);
  }

  /**
   * 删除实体（软删除）
   * @description 将实体状态转换为DELETED，并记录删除时间和删除者
   * @param deletedBy 删除者ID，可选，如果不提供则使用当前审计信息的updatedBy
   * @throws {Error} 当状态转换无效时抛出异常
   */
  public delete(deletedBy?: EntityId): void {
    this.changeLifecycleState(EntityLifecycle.DELETED);
    this._deletedAt = new Date();
    this._deletedBy = deletedBy || this._auditInfo.updatedBy;
  }

  /**
   * 比较两个实体是否相等
   * @param other 要比较的另一个实体
   * @returns 是否相等
   */
  public equals(other: Entity | null | undefined): boolean {
    if (!other) {
      return false;
    }

    if (!(other instanceof Entity)) {
      return false;
    }

    if (this.constructor !== other.constructor) {
      return false;
    }

    return this._id.equals(other._id);
  }

  /**
   * 转换为JSON表示
   * @returns JSON对象
   */
  public toJSON(): object {
    return {
      id: this._id.toJSON(),
      auditInfo: this._auditInfo.toJSON(),
      lifecycleState: this._lifecycleState,
      version: this._version,
      createdAt: this._createdAt.toISOString(),
      updatedAt: this._updatedAt.toISOString(),
      deletedAt: this._deletedAt?.toISOString(),
      deletedBy: this._deletedBy?.toJSON(),
      type: this.constructor.name,
    };
  }

  /**
   * 获取实体的哈希值
   * @returns 哈希值
   */
  public hashCode(): number {
    return this._id.hashCode();
  }

  /**
   * 检查实体是否处于指定状态
   * @param state 要检查的状态
   * @returns 是否处于指定状态
   */
  public isInState(state: EntityLifecycle): boolean {
    return this._lifecycleState === state;
  }

  /**
   * 检查实体是否已激活
   * @returns 是否已激活
   */
  public isActive(): boolean {
    return this._lifecycleState === EntityLifecycle.ACTIVE;
  }

  /**
   * 获取删除时间
   * @returns 删除时间，如果实体未删除则返回undefined
   */
  public get deletedAt(): Date | undefined {
    return this._deletedAt ? new Date(this._deletedAt.getTime()) : undefined;
  }

  /**
   * 获取删除者ID
   * @returns 删除者ID，如果实体未删除则返回undefined
   */
  public get deletedBy(): EntityId | undefined {
    return this._deletedBy ? this._deletedBy.clone() : undefined;
  }

  /**
   * 检查实体是否已删除
   * @returns 是否已删除
   */
  public isDeleted(): boolean {
    return this._lifecycleState === EntityLifecycle.DELETED;
  }

  /**
   * 恢复实体
   * @description 从删除状态恢复实体
   * @throws {Error} 当实体未处于DELETED状态时抛出异常
   */
  public restore(): void {
    if (this._lifecycleState !== EntityLifecycle.DELETED) {
      throw new Error("只能恢复已删除的实体");
    }
    this._lifecycleState = EntityLifecycle.INACTIVE;
    this._deletedAt = undefined;
    this._deletedBy = undefined;
    this._updatedAt = new Date();
  }

  /**
   * 检查实体是否可以执行操作
   * @returns 是否可以执行操作
   */
  public canPerformOperations(): boolean {
    return this._lifecycleState === EntityLifecycle.ACTIVE;
  }

  /**
   * 更新实体
   * @description 更新实体的审计信息和版本号
   * @param updatedBy 更新者ID
   */
  protected updateEntity(updatedBy: EntityId): void {
    this._auditInfo = this._auditInfo.update(updatedBy);
    this._version++;
    this._updatedAt = new Date();
  }

  /**
   * 改变生命周期状态
   * @param newState 新状态
   * @throws {Error} 当状态转换无效时抛出异常
   */
  private changeLifecycleState(newState: EntityLifecycle): void {
    if (!isValidLifecycleTransition(this._lifecycleState, newState)) {
      throw new Error(`无效的状态转换: ${this._lifecycleState} -> ${newState}`);
    }

    this._lifecycleState = newState;
    this._updatedAt = new Date();
  }

  /**
   * 验证实体
   * @throws {Error} 当实体无效时抛出异常
   */
  private validateEntity(): void {
    if (!this._id.isValid()) {
      throw new Error("实体标识符无效");
    }

    if (!this._auditInfo.validateIntegrity()) {
      throw new Error("审计信息无效");
    }

    if (this._version < 1) {
      throw new Error("版本号必须大于等于1");
    }

    // 验证软删除信息的一致性
    if (this._lifecycleState === EntityLifecycle.DELETED) {
      if (!this._deletedAt) {
        throw new Error("删除状态下必须设置删除时间");
      }
      if (!this._deletedBy || !this._deletedBy.isValid()) {
        throw new Error("删除状态下必须设置有效的删除者ID");
      }
    } else {
      // 非删除状态下，删除信息应该为空
      if (this._deletedAt !== undefined) {
        throw new Error("非删除状态下不应设置删除时间");
      }
      if (this._deletedBy !== undefined) {
        throw new Error("非删除状态下不应设置删除者ID");
      }
    }
  }

  /**
   * 创建实体的副本
   * @returns 新的实体实例
   */
  public abstract clone(): Entity;

  /**
   * 验证业务规则
   * @returns 是否通过验证
   */
  public abstract validateBusinessRules(): boolean;

  /**
   * 执行业务逻辑
   * @param operation 操作名称
   * @param params 操作参数
   * @returns 操作结果
   */
  public abstract executeBusinessLogic(
    operation: string,
    params: unknown,
  ): unknown;
}
