/**
 * @fileoverview 登录失败事件
 * @description 当用户登录失败时触发的事件
 */

import { DomainEvent, EntityId } from "@hl8/domain-kernel";

/**
 * 登录失败事件数据
 */
export interface LoginFailedEventData {
  /** 用户ID（如果已知） */
  userId?: EntityId;
  /** 登录标识（邮箱或手机号） */
  loginIdentifier: string;
  /** 失败时间 */
  failedAt: Date;
  /** 失败原因 */
  reason: string;
  /** 登录IP地址 */
  ipAddress?: string;
  /** 用户代理 */
  userAgent?: string;
  /** 失败次数（本次会话） */
  failureCount: number;
}

/**
 * 登录失败事件
 * @description 当用户登录失败时触发
 * @example
 * ```typescript
 * const event = new LoginFailedEvent(
 *   userId || new EntityId(),
 *   {
 *     userId,
 *     loginIdentifier: "user@example.com",
 *     failedAt: new Date(),
 *     reason: "密码错误",
 *     ipAddress: "192.168.1.1",
 *     userAgent: "Mozilla/5.0...",
 *     failureCount: 1
 *   }
 * );
 * ```
 */
export class LoginFailedEvent extends DomainEvent {
  /**
   * 创建登录失败事件
   * @param aggregateRootId 聚合根ID（用户ID或临时ID）
   * @param data 事件数据
   * @param metadata 事件元数据，可选
   */
  constructor(
    aggregateRootId: EntityId,
    data: LoginFailedEventData,
    metadata: Record<string, unknown> = {},
  ) {
    super(
      aggregateRootId,
      "LoginFailed",
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
  get eventData(): LoginFailedEventData {
    return this.data as LoginFailedEventData;
  }

  /**
   * 验证事件
   * @throws {Error} 当事件无效时抛出异常
   */
  protected validateEvent(): void {
    const eventData = this.data as LoginFailedEventData;
    if (!eventData.loginIdentifier) {
      throw new Error("登录标识不能为空");
    }
    if (!eventData.reason) {
      throw new Error("失败原因不能为空");
    }
  }

  /**
   * 克隆事件
   * @returns 新的事件实例
   */
  public clone(): LoginFailedEvent {
    return new LoginFailedEvent(
      this.aggregateRootId,
      this.eventData,
      this.metadata,
    );
  }
}

