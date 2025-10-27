/**
 * @fileoverview 审计变更接口
 * @description 定义审计变更记录的数据结构
 */

import { EntityId } from "../identifiers/entity-id.js";

/**
 * 审计变更接口
 * @description 定义单个审计变更记录的数据结构
 */
export interface AuditChange {
  /** 变更ID */
  changeId: EntityId;

  /** 变更时间 */
  timestamp: Date;

  /** 变更者ID */
  changedBy: EntityId;

  /** 变更类型 */
  changeType: AuditChangeType;

  /** 变更字段名 */
  fieldName: string;

  /** 变更前的值 */
  oldValue: unknown;

  /** 变更后的值 */
  newValue: unknown;

  /** 变更原因 */
  reason?: string;

  /** 变更描述 */
  description?: string;

  /** 元数据 */
  metadata?: Record<string, unknown>;
}

/**
 * 审计变更类型枚举
 * @description 定义不同类型的审计变更
 */
export enum AuditChangeType {
  /** 创建 */
  CREATE = "CREATE",

  /** 更新 */
  UPDATE = "UPDATE",

  /** 删除 */
  DELETE = "DELETE",

  /** 激活 */
  ACTIVATE = "ACTIVATE",

  /** 停用 */
  DEACTIVATE = "DEACTIVATE",

  /** 状态变更 */
  STATE_CHANGE = "STATE_CHANGE",

  /** 关联变更 */
  ASSOCIATION_CHANGE = "ASSOCIATION_CHANGE",
}

/**
 * 审计变更构建器
 * @description 提供构建审计变更记录的便利方法
 */
export class AuditChangeBuilder {
  private change: Partial<AuditChange> = {};

  /**
   * 设置变更ID
   * @param changeId 变更ID
   * @returns 构建器实例
   */
  public setChangeId(changeId: EntityId): this {
    this.change.changeId = changeId;
    return this;
  }

  /**
   * 设置变更时间
   * @param timestamp 变更时间
   * @returns 构建器实例
   */
  public setTimestamp(timestamp: Date): this {
    this.change.timestamp = timestamp;
    return this;
  }

  /**
   * 设置变更者
   * @param changedBy 变更者ID
   * @returns 构建器实例
   */
  public setChangedBy(changedBy: EntityId): this {
    this.change.changedBy = changedBy;
    return this;
  }

  /**
   * 设置变更类型
   * @param changeType 变更类型
   * @returns 构建器实例
   */
  public setChangeType(changeType: AuditChangeType): this {
    this.change.changeType = changeType;
    return this;
  }

  /**
   * 设置变更字段
   * @param fieldName 字段名
   * @param oldValue 旧值
   * @param newValue 新值
   * @returns 构建器实例
   */
  public setFieldChange(
    fieldName: string,
    oldValue: unknown,
    newValue: unknown,
  ): this {
    this.change.fieldName = fieldName;
    this.change.oldValue = oldValue;
    this.change.newValue = newValue;
    return this;
  }

  /**
   * 设置变更原因
   * @param reason 变更原因
   * @returns 构建器实例
   */
  public setReason(reason: string): this {
    this.change.reason = reason;
    return this;
  }

  /**
   * 设置变更描述
   * @param description 变更描述
   * @returns 构建器实例
   */
  public setDescription(description: string): this {
    this.change.description = description;
    return this;
  }

  /**
   * 设置元数据
   * @param metadata 元数据
   * @returns 构建器实例
   */
  public setMetadata(metadata: Record<string, unknown>): this {
    this.change.metadata = metadata;
    return this;
  }

  /**
   * 构建审计变更记录
   * @returns 审计变更记录
   * @throws {Error} 当必需字段缺失时抛出异常
   */
  public build(): AuditChange {
    const requiredFields = [
      "changeId",
      "timestamp",
      "changedBy",
      "changeType",
      "fieldName",
    ];

    for (const field of requiredFields) {
      if (!this.change[field as keyof AuditChange]) {
        throw new Error(`审计变更记录缺少必需字段: ${field}`);
      }
    }

    return this.change as AuditChange;
  }
}
