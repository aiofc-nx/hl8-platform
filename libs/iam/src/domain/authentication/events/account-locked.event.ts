/**
 * @fileoverview 账户锁定事件
 * @description 当用户账户因登录失败过多而被锁定时触发的事件
 */

import { DomainEvent, EntityId } from "@hl8/domain-kernel";

/**
 * 账户锁定事件数据
 */
export interface AccountLockedEventData {
  /** 用户ID */
  userId: EntityId;
  /** 锁定时间 */
  lockedAt: Date;
  /** 锁定原因 */
  reason: string;
  /** 失败次数 */
  failureCount: number;
  /** 锁定IP地址 */
  ipAddress?: string;
  /** 解锁时间（可选，自动解锁） */
  unlockAt?: Date;
}

/**
 * 账户锁定事件
 * @description 当用户账户因登录失败过多而被锁定时触发
 * @example
 * ```typescript
 * const event = new AccountLockedEvent(
 *   userId,
 *   {
 *     userId,
 *     lockedAt: new Date(),
 *     reason: "登录失败次数过多",
 *     failureCount: 5,
 *     ipAddress: "192.168.1.1",
 *     unlockAt: new Date(Date.now() + 30 * 60 * 1000) // 30分钟后解锁
 *   }
 * );
 * ```
 */
export class AccountLockedEvent extends DomainEvent {
  /**
   * 创建账户锁定事件
   * @param aggregateRootId 聚合根ID（用户ID）
   * @param data 事件数据
   * @param metadata 事件元数据，可选
   */
  constructor(
    aggregateRootId: EntityId,
    data: AccountLockedEventData,
    metadata: Record<string, unknown> = {},
  ) {
    super(
      aggregateRootId,
      "AccountLocked",
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
  get eventData(): AccountLockedEventData {
    return this.data as AccountLockedEventData;
  }

  /**
   * 验证事件
   * @throws {Error} 当事件无效时抛出异常
   */
  protected validateEvent(): void {
    const eventData = this.data as AccountLockedEventData;
    if (!eventData.userId) {
      throw new Error("用户ID不能为空");
    }
    if (!eventData.reason) {
      throw new Error("锁定原因不能为空");
    }
  }

  /**
   * 克隆事件
   * @returns 新的事件实例
   */
  public clone(): AccountLockedEvent {
    return new AccountLockedEvent(
      this.aggregateRootId,
      this.eventData,
      this.metadata,
    );
  }
}
