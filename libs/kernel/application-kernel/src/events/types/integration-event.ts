/**
 * @fileoverview 集成事件类型
 * @description 用于跨边界通信的集成事件实现
 */

import { EntityId } from "@hl8/domain-kernel";

/**
 * 集成事件类
 * @description 用于跨边界通信的集成事件，通常用于微服务间的事件传递
 */
export class IntegrationEvent {
  /** 事件ID */
  public readonly eventId: EntityId;
  /** 事件类型 */
  public readonly eventType: string;
  /** 事件数据 */
  public readonly data: unknown;
  /** 事件元数据 */
  public readonly metadata: Record<string, unknown>;
  /** 事件时间戳 */
  public readonly timestamp: Date;
  /** 事件版本 */
  public readonly version: string;
  /** 源服务 */
  public readonly source: string;
  /** 目标服务 */
  public readonly target?: string;
  /** 关联ID */
  public readonly correlationId?: string;
  /** 用户ID */
  public readonly userId?: string;

  /**
   * 创建集成事件
   * @param eventType 事件类型
   * @param data 事件数据
   * @param source 源服务
   * @param options 可选参数
   */
  constructor(
    eventType: string,
    data: unknown,
    source: string,
    options: {
      eventId?: EntityId;
      metadata?: Record<string, unknown>;
      timestamp?: Date;
      version?: string;
      target?: string;
      correlationId?: string;
      userId?: string;
    } = {},
  ) {
    this.eventId = options.eventId || new EntityId();
    this.eventType = eventType;
    this.data = this.deepClone(data);
    this.metadata = { ...options.metadata };
    this.timestamp = options.timestamp || new Date();
    this.version = options.version || "1.0.0";
    this.source = source;
    this.target = options.target;
    this.correlationId = options.correlationId;
    this.userId = options.userId;

    // 验证事件
    this.validateEvent();
  }

  /**
   * 验证事件
   * @throws {Error} 当事件无效时抛出异常
   */
  private validateEvent(): void {
    if (!this.eventType) {
      throw new Error("集成事件类型不能为空");
    }
    if (!this.source) {
      throw new Error("源服务不能为空");
    }
    if (!this.eventId) {
      throw new Error("事件ID不能为空");
    }
  }

  /**
   * 序列化事件数据
   * @returns 序列化后的数据
   */
  public toJSON(): Record<string, unknown> {
    return {
      eventId: this.eventId.toString(),
      eventType: this.eventType,
      data: this.data,
      metadata: this.metadata,
      timestamp: this.timestamp.toISOString(),
      version: this.version,
      source: this.source,
      target: this.target,
      correlationId: this.correlationId,
      userId: this.userId,
    };
  }

  /**
   * 从JSON创建集成事件
   * @param json JSON对象
   * @returns 集成事件实例
   */
  public static fromJSON(json: Record<string, unknown>): IntegrationEvent {
    return new IntegrationEvent(
      json.eventType as string,
      json.data,
      json.source as string,
      {
        eventId: new EntityId(json.eventId as string),
        metadata: json.metadata as Record<string, unknown>,
        timestamp: new Date(json.timestamp as string),
        version: json.version as string,
        target: json.target as string,
        correlationId: json.correlationId as string,
        userId: json.userId as string,
      },
    );
  }

  /**
   * 克隆事件对象
   * @returns 新的事件对象实例
   */
  public clone(): IntegrationEvent {
    return new IntegrationEvent(this.eventType, this.data, this.source, {
      eventId: this.eventId,
      metadata: { ...this.metadata },
      timestamp: this.timestamp,
      version: this.version,
      target: this.target,
      correlationId: this.correlationId,
      userId: this.userId,
    });
  }

  /**
   * 更新元数据
   * @param metadata 新的元数据
   * @returns 新的事件实例
   */
  public updateMetadata(metadata: Record<string, unknown>): IntegrationEvent {
    return new IntegrationEvent(this.eventType, this.data, this.source, {
      eventId: this.eventId,
      metadata: { ...this.metadata, ...metadata },
      timestamp: this.timestamp,
      version: this.version,
      target: this.target,
      correlationId: this.correlationId,
      userId: this.userId,
    });
  }

  /**
   * 比较两个事件是否相等
   * @param other 要比较的另一个事件
   * @returns 是否相等
   */
  public equals(other: IntegrationEvent | null | undefined): boolean {
    if (!other) {
      return false;
    }

    if (!(other instanceof IntegrationEvent)) {
      return false;
    }

    return (
      this.eventId.equals(other.eventId) &&
      this.eventType === other.eventType &&
      this.source === other.source &&
      this.timestamp.getTime() === other.timestamp.getTime() &&
      this.version === other.version &&
      this.deepEquals(this.data, other.data) &&
      this.deepEquals(this.metadata, other.metadata)
    );
  }

  /**
   * 转换为字符串表示
   * @returns 字符串表示
   */
  public toString(): string {
    return `${this.eventType}[${this.eventId.toString()}]@${this.timestamp.toISOString()}`;
  }

  /**
   * 深度克隆值
   * @param value 要克隆的值
   * @returns 克隆后的值
   */
  private deepClone(value: unknown): unknown {
    if (value === null || value === undefined) {
      return value;
    }

    if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
    ) {
      return value;
    }

    if (value instanceof Date) {
      return new Date(value.getTime());
    }

    if (Array.isArray(value)) {
      return value.map((item) => this.deepClone(item));
    }

    if (typeof value === "object") {
      const cloned = {} as Record<string, unknown>;
      for (const key in value) {
        if (Object.prototype.hasOwnProperty.call(value, key)) {
          cloned[key] = this.deepClone((value as Record<string, unknown>)[key]);
        }
      }
      return cloned;
    }

    return value;
  }

  /**
   * 深度比较两个值是否相等
   * @param a 第一个值
   * @param b 第二个值
   * @returns 是否相等
   */
  private deepEquals(a: unknown, b: unknown): boolean {
    if (a === b) {
      return true;
    }

    if (a === null || b === null || a === undefined || b === undefined) {
      return a === b;
    }

    if (typeof a !== typeof b) {
      return false;
    }

    if (typeof a === "object") {
      if (Array.isArray(a) && Array.isArray(b)) {
        if (a.length !== b.length) {
          return false;
        }
        for (let i = 0; i < a.length; i++) {
          if (!this.deepEquals(a[i], b[i])) {
            return false;
          }
        }
        return true;
      }

      if (a instanceof Date && b instanceof Date) {
        return a.getTime() === b.getTime();
      }

      const keysA = Object.keys(a as Record<string, unknown>);
      const keysB = Object.keys(b as Record<string, unknown>);

      if (keysA.length !== keysB.length) {
        return false;
      }

      for (const key of keysA) {
        if (!keysB.includes(key)) {
          return false;
        }
        if (
          !this.deepEquals(
            (a as Record<string, unknown>)[key],
            (b as Record<string, unknown>)[key],
          )
        ) {
          return false;
        }
      }

      return true;
    }

    return false;
  }
}
