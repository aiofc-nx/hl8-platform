/**
 * @fileoverview 用户登录事件
 * @description 当用户成功登录时触发的事件
 */

import { DomainEvent, EntityId, TenantId } from "@hl8/domain-kernel";

/**
 * 用户登录事件数据
 */
export interface UserLoggedInEventData {
  /** 用户ID */
  userId: EntityId;
  /** 租户ID（可选，多租户场景） */
  tenantId?: TenantId;
  /** 登录时间 */
  loginAt: Date;
  /** 登录IP地址 */
  ipAddress: string;
  /** 用户代理 */
  userAgent: string;
  /** 会话ID */
  sessionId: EntityId;
}

/**
 * 用户登录事件
 * @description 当用户成功登录时触发
 * @example
 * ```typescript
 * const event = new UserLoggedInEvent(
 *   userId,
 *   {
 *     userId,
 *     tenantId: tenantId,
 *     loginAt: new Date(),
 *     ipAddress: "192.168.1.1",
 *     userAgent: "Mozilla/5.0...",
 *     sessionId: sessionId
 *   }
 * );
 * ```
 */
export class UserLoggedInEvent extends DomainEvent {
  /**
   * 创建用户登录事件
   * @param aggregateRootId 聚合根ID（用户ID或会话ID）
   * @param data 事件数据
   * @param metadata 事件元数据，可选
   */
  constructor(
    aggregateRootId: EntityId,
    data: UserLoggedInEventData,
    metadata: Record<string, unknown> = {},
  ) {
    super(
      aggregateRootId,
      "UserLoggedIn",
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
  get eventData(): UserLoggedInEventData {
    return this.data as UserLoggedInEventData;
  }

  /**
   * 验证事件
   * @throws {Error} 当事件无效时抛出异常
   */
  protected validateEvent(): void {
    const eventData = this.data as UserLoggedInEventData;
    if (!eventData.userId) {
      throw new Error("用户ID不能为空");
    }
    if (!eventData.sessionId) {
      throw new Error("会话ID不能为空");
    }
  }

  /**
   * 克隆事件
   * @returns 新的事件实例
   */
  public clone(): UserLoggedInEvent {
    return new UserLoggedInEvent(
      this.aggregateRootId,
      this.eventData,
      this.metadata,
    );
  }
}

