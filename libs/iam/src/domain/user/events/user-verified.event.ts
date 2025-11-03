/**
 * @fileoverview 用户验证事件
 * @description 当用户验证邮箱或手机时触发的事件
 */

import { DomainEvent, EntityId } from "@hl8/domain-kernel";

/**
 * 用户验证事件数据
 */
export interface UserVerifiedEventData {
  /** 用户ID */
  userId: EntityId;
  /** 验证类型：EMAIL 或 PHONE */
  verificationType: "EMAIL" | "PHONE";
  /** 验证时间 */
  verifiedAt: Date;
  /** 邮箱是否已验证 */
  emailVerified: boolean;
  /** 手机是否已验证 */
  phoneVerified: boolean;
}

/**
 * 用户验证事件
 * @description 当用户验证邮箱或手机时触发
 * @example
 * ```typescript
 * const event = new UserVerifiedEvent(
 *   userId,
 *   {
 *     userId,
 *     verificationType: "EMAIL",
 *     verifiedAt: new Date(),
 *     emailVerified: true,
 *     phoneVerified: false
 *   }
 * );
 * ```
 */
export class UserVerifiedEvent extends DomainEvent {
  /**
   * 创建用户验证事件
   * @param aggregateRootId 聚合根ID（用户ID）
   * @param data 事件数据
   * @param metadata 事件元数据，可选
   */
  constructor(
    aggregateRootId: EntityId,
    data: UserVerifiedEventData,
    metadata: Record<string, unknown> = {},
  ) {
    super(
      aggregateRootId,
      "UserVerified",
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
  get eventData(): UserVerifiedEventData {
    return this.data as UserVerifiedEventData;
  }

  /**
   * 验证事件
   * @throws {Error} 当事件无效时抛出异常
   */
  protected validateEvent(): void {
    const eventData = this.data as UserVerifiedEventData;
    if (!eventData.userId) {
      throw new Error("用户ID不能为空");
    }
    if (!eventData.verificationType || !["EMAIL", "PHONE"].includes(eventData.verificationType)) {
      throw new Error("验证类型必须为EMAIL或PHONE");
    }
  }

  /**
   * 克隆事件
   * @returns 新的事件实例
   */
  public clone(): UserVerifiedEvent {
    return new UserVerifiedEvent(
      this.aggregateRootId,
      this.eventData,
      this.metadata,
    );
  }
}

