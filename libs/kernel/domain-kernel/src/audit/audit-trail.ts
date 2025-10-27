/**
 * @fileoverview 审计轨迹类
 * @description 管理实体的变更历史记录
 */

import { EntityId } from "../identifiers/entity-id.js";
import {
  AuditChange,
  AuditChangeBuilder,
  AuditChangeType,
} from "./audit-change.interface.js";

/**
 * 审计轨迹类
 * @description 管理实体的变更历史记录，提供查询和过滤功能
 */
export class AuditTrail {
  private readonly _entityId: EntityId;
  private readonly _changes: AuditChange[];
  private readonly _createdAt: Date;

  /**
   * 创建审计轨迹
   * @param entityId 实体ID
   * @param changes 变更记录数组
   * @param createdAt 创建时间
   */
  constructor(
    entityId: EntityId,
    changes: AuditChange[] = [],
    createdAt: Date = new Date(),
  ) {
    this._entityId = entityId.clone();
    this._changes = [...changes];
    this._createdAt = new Date(createdAt.getTime());

    this.validateChanges();
  }

  /**
   * 获取实体ID
   * @returns 实体ID
   */
  public get entityId(): EntityId {
    return this._entityId.clone();
  }

  /**
   * 获取变更记录
   * @returns 变更记录数组的副本
   */
  public get changes(): AuditChange[] {
    return [...this._changes];
  }

  /**
   * 获取创建时间
   * @returns 创建时间
   */
  public get createdAt(): Date {
    return new Date(this._createdAt.getTime());
  }

  /**
   * 添加变更记录
   * @param change 变更记录
   */
  public addChange(change: AuditChange): void {
    this.validateChange(change);
    this._changes.push(change);
  }

  /**
   * 获取所有变更记录
   * @returns 变更记录数组
   */
  public getChanges(): AuditChange[] {
    return [...this._changes];
  }

  /**
   * 按用户查询变更记录
   * @param userId 用户ID
   * @returns 该用户的变更记录
   */
  public getChangesByUser(userId: EntityId): AuditChange[] {
    return this._changes.filter((change) => change.changedBy.equals(userId));
  }

  /**
   * 按时间范围查询变更记录
   * @param start 开始时间
   * @param end 结束时间
   * @returns 时间范围内的变更记录
   */
  public getChangesByDateRange(start: Date, end: Date): AuditChange[] {
    return this._changes.filter((change) => {
      const changeTime = change.timestamp.getTime();
      return changeTime >= start.getTime() && changeTime <= end.getTime();
    });
  }

  /**
   * 按变更类型查询变更记录
   * @param changeType 变更类型
   * @returns 指定类型的变更记录
   */
  public getChangesByType(changeType: AuditChangeType): AuditChange[] {
    return this._changes.filter((change) => change.changeType === changeType);
  }

  /**
   * 按字段名查询变更记录
   * @param fieldName 字段名
   * @returns 指定字段的变更记录
   */
  public getChangesByField(fieldName: string): AuditChange[] {
    return this._changes.filter((change) => change.fieldName === fieldName);
  }

  /**
   * 获取最新的变更记录
   * @param count 记录数量，默认为1
   * @returns 最新的变更记录
   */
  public getLatestChanges(count: number = 1): AuditChange[] {
    return this._changes
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, count);
  }

  /**
   * 获取变更记录总数
   * @returns 变更记录总数
   */
  public getChangeCount(): number {
    return this._changes.length;
  }

  /**
   * 检查是否有变更记录
   * @returns 是否有变更记录
   */
  public hasChanges(): boolean {
    return this._changes.length > 0;
  }

  /**
   * 清空所有变更记录
   */
  public clearChanges(): void {
    this._changes.length = 0;
  }

  /**
   * 转换为JSON表示
   * @returns JSON对象
   */
  public toJSON(): object {
    return {
      entityId: this._entityId.toJSON(),
      changes: this._changes.map((change) => ({
        changeId: change.changeId.toJSON(),
        timestamp: change.timestamp.toISOString(),
        changedBy: change.changedBy.toJSON(),
        changeType: change.changeType,
        fieldName: change.fieldName,
        oldValue: change.oldValue,
        newValue: change.newValue,
        reason: change.reason,
        description: change.description,
        metadata: change.metadata,
      })),
      createdAt: this._createdAt.toISOString(),
    };
  }

  /**
   * 比较两个审计轨迹是否相等
   * @param other 要比较的另一个审计轨迹
   * @returns 是否相等
   */
  public equals(other: AuditTrail | null | undefined): boolean {
    if (!other) {
      return false;
    }

    if (!(other instanceof AuditTrail)) {
      return false;
    }

    if (!this._entityId.equals(other._entityId)) {
      return false;
    }

    if (this._changes.length !== other._changes.length) {
      return false;
    }

    for (let i = 0; i < this._changes.length; i++) {
      if (!this.compareChanges(this._changes[i], other._changes[i])) {
        return false;
      }
    }

    return true;
  }

  /**
   * 创建审计轨迹构建器
   * @param entityId 实体ID
   * @returns 审计轨迹构建器
   */
  public static builder(entityId: EntityId): AuditTrailBuilder {
    return new AuditTrailBuilder(entityId);
  }

  /**
   * 从JSON创建审计轨迹
   * @param data JSON数据
   * @returns 审计轨迹实例
   */
  public static fromJSON(data: unknown): AuditTrail {
    const dataObj = data as {
      entityId: string;
      changes: Array<{
        changeId: string;
        timestamp: string;
        changedBy: string;
        changeType: string;
        fieldName: string;
        oldValue: unknown;
        newValue: unknown;
        reason?: string;
        description?: string;
        metadata?: unknown;
      }>;
      createdAt: string;
    };

    const changes: AuditChange[] = dataObj.changes.map((changeData) => ({
      changeId: EntityId.fromString(changeData.changeId),
      timestamp: new Date(changeData.timestamp),
      changedBy: EntityId.fromString(changeData.changedBy),
      changeType: changeData.changeType as AuditChangeType,
      fieldName: changeData.fieldName,
      oldValue: changeData.oldValue,
      newValue: changeData.newValue,
      reason: changeData.reason,
      description: changeData.description,
      metadata: changeData.metadata as Record<string, unknown>,
    }));

    return new AuditTrail(
      EntityId.fromString(dataObj.entityId),
      changes,
      new Date(dataObj.createdAt),
    );
  }

  /**
   * 验证变更记录
   * @param change 变更记录
   * @throws {Error} 当变更记录无效时抛出异常
   */
  private validateChange(change: AuditChange): void {
    if (!change.changeId) {
      throw new Error("变更记录缺少变更ID");
    }

    if (!change.timestamp) {
      throw new Error("变更记录缺少时间戳");
    }

    if (!change.changedBy) {
      throw new Error("变更记录缺少变更者");
    }

    if (!change.changeType) {
      throw new Error("变更记录缺少变更类型");
    }

    if (!change.fieldName) {
      throw new Error("变更记录缺少字段名");
    }
  }

  /**
   * 验证所有变更记录
   * @throws {Error} 当变更记录无效时抛出异常
   */
  private validateChanges(): void {
    for (const change of this._changes) {
      this.validateChange(change);
    }
  }

  /**
   * 比较两个变更记录是否相等
   * @param change1 第一个变更记录
   * @param change2 第二个变更记录
   * @returns 是否相等
   */
  private compareChanges(change1: AuditChange, change2: AuditChange): boolean {
    return (
      change1.changeId.equals(change2.changeId) &&
      change1.timestamp.getTime() === change2.timestamp.getTime() &&
      change1.changedBy.equals(change2.changedBy) &&
      change1.changeType === change2.changeType &&
      change1.fieldName === change2.fieldName &&
      JSON.stringify(change1.oldValue) === JSON.stringify(change2.oldValue) &&
      JSON.stringify(change1.newValue) === JSON.stringify(change2.newValue) &&
      change1.reason === change2.reason &&
      change1.description === change2.description &&
      JSON.stringify(change1.metadata) === JSON.stringify(change2.metadata)
    );
  }
}

/**
 * 审计轨迹构建器
 * @description 提供构建审计轨迹的便利方法
 */
export class AuditTrailBuilder {
  private entityId: EntityId;
  private changes: AuditChange[] = [];
  private createdAt: Date = new Date();

  constructor(entityId: EntityId) {
    this.entityId = entityId.clone();
  }

  /**
   * 设置创建时间
   * @param createdAt 创建时间
   * @returns 构建器实例
   */
  public setCreatedAt(createdAt: Date): this {
    this.createdAt = new Date(createdAt.getTime());
    return this;
  }

  /**
   * 添加变更记录
   * @param change 变更记录
   * @returns 构建器实例
   */
  public addChange(change: AuditChange): this {
    this.changes.push(change);
    return this;
  }

  /**
   * 添加变更记录构建器
   * @param changeBuilder 变更记录构建器
   * @returns 构建器实例
   */
  public addChangeBuilder(changeBuilder: AuditChangeBuilder): this {
    this.changes.push(changeBuilder.build());
    return this;
  }

  /**
   * 构建审计轨迹
   * @returns 审计轨迹实例
   */
  public build(): AuditTrail {
    return new AuditTrail(this.entityId, this.changes, this.createdAt);
  }
}
