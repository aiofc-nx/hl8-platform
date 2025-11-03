/**
 * @fileoverview 用户状态变更事件
 * @description 当用户状态发生变化时触发的事件
 */

import { DomainEvent, EntityId } from "@hl8/domain-kernel";

/**
 * 用户状态枚举
 */
export enum UserStatus {
  /** 未验证 */
  UNVERIFIED = "UNVERIFIED",
  /** 已验证 */
  VERIFIED = "VERIFIED",
  /** 活跃 */
  ACTIVE = "ACTIVE",
  /** 禁用 */
  DISABLED = "DISABLED",
  /** 锁定 */
  LOCKED = "LOCKED",
}

/**
 * 用户状态变更事件数据
 */
export interface UserStatusChangedEventData {
  /** 用户ID */
  userId: EntityId;
  /** 旧状态 */
  oldStatus: UserStatus;
  /** 新状态 */
  newStatus: UserStatus;
  /** 变更原因 */
  reason?: string;
  /** 变更时间 */
  changedAt: Date;
}

/**
 * 用户状态变更事件
 * @description 当用户状态发生变化时触发
 * @example
 * ```typescript
 * const event = new UserStatusChangedEvent(
 *   userId,
 *   {
 *     userId,
 *     oldStatus: UserStatus.UNVERIFIED,
 *     newStatus: UserStatus.ACTIVE,
 *     reason: "用户激活账户",
 *     changedAt: new Date()
 *   }
 * );
 * ```
 */
export class UserStatusChangedEvent extends DomainEvent {
  /**
   * 创建用户状态变更事件
   * @param aggregateRootId 聚合根ID（用户ID）
   * @param data 事件数据
   * @param metadata 事件元数据，可选
   */
  constructor(
    aggregateRootId: EntityId,
    data: UserStatusChangedEventData,
    metadata: Record<string, unknown> = {},
  ) {
    super(
      aggregateRootId,
      "UserStatusChanged",
      data,
      metadata,
      undefined,
      undefined,
      1,
    );
  }

  /**
   * 获取事件数据
   * @returns 事件数据
   */
  get eventData(): UserStatusChangedEventData {
    return this.data as UserStatusChangedEventData;
  }

  /**
   * 验证事件
   * @throws {Error} 当事件无效时抛出异常
   */
  protected validateEvent(): void {
    const eventData = this.data as UserStatusChangedEventData;
    if (!eventData.userId) {
      throw new Error("用户ID不能为空");
    }
    if (!eventData.oldStatus || !eventData.newStatus) {
      throw new Error("用户状态不能为空");
    }
    if (!Object.values(UserStatus).includes(eventData.oldStatus)) {
      throw new Error("旧状态无效");
    }
    if (!Object.values(UserStatus).includes(eventData.newStatus)) {
      throw new Error("新状态无效");
    }
  }

  /**
   * 克隆事件
   * @returns 新的事件实例
   */
  public clone(): UserStatusChangedEvent {
    return new UserStatusChangedEvent(
      this.aggregateRootId,
      this.eventData,
      this.metadata,
    );
  }
}

