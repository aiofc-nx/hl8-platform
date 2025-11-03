/**
 * @fileoverview 用户注册事件
 * @description 当用户注册时触发的事件
 */

import { DomainEvent, EntityId } from "@hl8/domain-kernel";

/**
 * 用户注册事件数据
 */
export interface UserRegisteredEventData {
  /** 用户ID */
  userId: EntityId;
  /** 邮箱地址 */
  email: string;
  /** 手机号 */
  phoneNumber: string;
  /** 用户名称 */
  name: string;
  /** 注册时间 */
  registeredAt: Date;
}

/**
 * 用户注册事件
 * @description 当用户注册时触发，包含用户基本信息
 * @example
 * ```typescript
 * const event = new UserRegisteredEvent(
 *   userId,
 *   {
 *     userId,
 *     email: "user@example.com",
 *     phoneNumber: "13800138000",
 *     name: "张三",
 *     registeredAt: new Date()
 *   }
 * );
 * ```
 */
export class UserRegisteredEvent extends DomainEvent {
  /**
   * 创建用户注册事件
   * @param aggregateRootId 聚合根ID（用户ID）
   * @param data 事件数据
   * @param metadata 事件元数据，可选
   */
  constructor(
    aggregateRootId: EntityId,
    data: UserRegisteredEventData,
    metadata: Record<string, unknown> = {},
  ) {
    super(
      aggregateRootId,
      "UserRegistered",
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
  get eventData(): UserRegisteredEventData {
    return this.data as UserRegisteredEventData;
  }

  /**
   * 验证事件
   * @throws {Error} 当事件无效时抛出异常
   */
  protected validateEvent(): void {
    const eventData = this.data as UserRegisteredEventData;
    if (!eventData.userId) {
      throw new Error("用户ID不能为空");
    }
    if (!eventData.email) {
      throw new Error("邮箱地址不能为空");
    }
    if (!eventData.phoneNumber) {
      throw new Error("手机号不能为空");
    }
  }

  /**
   * 克隆事件
   * @returns 新的事件实例
   */
  public clone(): UserRegisteredEvent {
    return new UserRegisteredEvent(
      this.aggregateRootId,
      this.eventData,
      this.metadata,
    );
  }
}
