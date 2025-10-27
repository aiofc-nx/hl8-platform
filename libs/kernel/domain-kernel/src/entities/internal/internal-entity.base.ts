/**
 * @fileoverview 内部实体基类
 * @description 聚合根内部的实体，执行具体业务操作
 */

import { Entity } from "../base/entity.base.js";
import { EntityId } from "../../identifiers/entity-id.js";
import { AuditInfo } from "../../audit/audit-info.js";
import { EntityLifecycle } from "../base/entity-lifecycle.enum.js";

/**
 * 内部实体基类
 * @description 聚合根内部的实体，执行具体业务操作
 */
export abstract class InternalEntity extends Entity {
  protected readonly _aggregateRootId: EntityId;

  /**
   * 创建内部实体
   * @param aggregateRootId 所属聚合根标识符
   * @param id 实体标识符，如果未提供则自动生成
   * @param auditInfo 审计信息
   * @param lifecycleState 生命周期状态，默认为CREATED
   * @param version 版本号，默认为1
   */
  constructor(
    aggregateRootId: EntityId,
    id?: EntityId,
    auditInfo?: AuditInfo,
    lifecycleState: EntityLifecycle = EntityLifecycle.CREATED,
    version: number = 1,
  ) {
    super(id, auditInfo, lifecycleState, version);
    this._aggregateRootId = aggregateRootId.clone();

    this.validateInternalEntity();
  }

  /**
   * 获取所属聚合根标识符
   * @returns 聚合根标识符
   */
  public get aggregateRootId(): EntityId {
    return this._aggregateRootId.clone();
  }

  /**
   * 执行业务逻辑
   * @param params 业务逻辑参数
   * @returns 业务逻辑结果
   */
  public executeBusinessLogic(params: unknown): unknown {
    this.validateBusinessRules();
    return this.performBusinessOperation(params);
  }

  /**
   * 验证业务规则
   * @returns 是否通过验证
   */
  public validateBusinessRules(): boolean {
    if (!this.canPerformOperations()) {
      throw new Error("实体状态不允许执行业务操作");
    }

    return this.performBusinessRuleValidation();
  }

  /**
   * 更新状态
   * @param newState 新状态
   * @param updatedBy 更新者ID
   */
  public updateState(newState: unknown, updatedBy: EntityId): void {
    this.validateBusinessRules();
    this.performStateUpdate(newState);
    this.updateEntity(updatedBy);
  }

  /**
   * 通知聚合根
   * @param event 领域事件
   */
  public notifyAggregateRoot(event: unknown): void {
    // 这里应该通过事件总线或直接调用聚合根的方法来通知
    // 具体实现取决于架构设计
    this.performNotification(event);
  }

  /**
   * 转换为JSON表示
   * @returns JSON对象
   */
  public toJSON(): object {
    return {
      ...super.toJSON(),
      aggregateRootId: this._aggregateRootId.toJSON(),
    };
  }

  /**
   * 比较两个内部实体是否相等
   * @param other 要比较的另一个内部实体
   * @returns 是否相等
   */
  public equals(other: InternalEntity | null | undefined): boolean {
    if (!other) {
      return false;
    }

    if (!(other instanceof InternalEntity)) {
      return false;
    }

    if (!super.equals(other)) {
      return false;
    }

    return this._aggregateRootId.equals(other._aggregateRootId);
  }

  /**
   * 检查是否属于指定聚合根
   * @param aggregateRootId 聚合根标识符
   * @returns 是否属于指定聚合根
   */
  public belongsTo(aggregateRootId: EntityId): boolean {
    return this._aggregateRootId.equals(aggregateRootId);
  }

  /**
   * 获取业务状态
   * @returns 业务状态
   */
  public abstract getBusinessState(): unknown;

  /**
   * 设置业务状态
   * @param state 业务状态
   */
  public abstract setBusinessState(state: unknown): void;

  /**
   * 执行具体的业务操作
   * @param params 操作参数
   * @returns 操作结果
   */
  protected abstract performBusinessOperation(params: unknown): unknown;

  /**
   * 执行具体的业务规则验证
   * @returns 是否通过验证
   */
  protected abstract performBusinessRuleValidation(): boolean;

  /**
   * 执行状态更新
   * @param newState 新状态
   */
  protected abstract performStateUpdate(newState: unknown): void;

  /**
   * 执行通知操作
   * @param event 事件
   */
  protected abstract performNotification(event: unknown): void;

  /**
   * 验证内部实体
   * @throws {Error} 当内部实体无效时抛出异常
   */
  private validateInternalEntity(): void {
    if (!this._aggregateRootId.isValid()) {
      throw new Error("聚合根标识符无效");
    }

    // 注意：这里不检查ID是否相同，因为EntityId.generate()会生成不同的ID
    // 只有在明确传入相同ID时才需要检查
  }
}
