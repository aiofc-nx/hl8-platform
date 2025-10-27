/**
 * @fileoverview 领域事件基类
 * @description 提供领域事件的基础功能，包括事件标识、时间戳、数据等
 */

import { EntityId } from "../../identifiers/entity-id.js";

/**
 * 领域事件基类
 * @description 提供领域事件的基础功能，遵循事件存储模式
 */
export abstract class DomainEvent {
  private readonly _eventId: EntityId;
  private readonly _aggregateRootId: EntityId;
  private readonly _timestamp: Date;
  private readonly _version: number;
  private readonly _eventType: string;
  private readonly _data: unknown;
  private readonly _metadata: Record<string, unknown>;

  /**
   * 创建领域事件
   * @param aggregateRootId 聚合根标识符
   * @param eventType 事件类型
   * @param data 事件数据
   * @param metadata 事件元数据
   * @param eventId 事件标识符，可选，默认自动生成
   * @param timestamp 事件时间戳，可选，默认为当前时间
   * @param version 事件版本，默认为1
   */
  constructor(
    aggregateRootId: EntityId,
    eventType: string,
    data: unknown,
    metadata: Record<string, unknown> = {},
    eventId?: EntityId,
    timestamp?: Date,
    version: number = 1,
  ) {
    this._eventId = eventId || new EntityId();
    this._aggregateRootId = aggregateRootId
      ? aggregateRootId.clone()
      : new EntityId();
    this._timestamp = timestamp || new Date();
    this._version = version;
    this._eventType = eventType;
    this._data = this.deepClone(data);
    this._metadata = { ...metadata };

    // 在构造函数中直接验证
    if (!eventType) {
      throw new Error("事件类型不能为空");
    }
    if (!aggregateRootId) {
      throw new Error("聚合根标识符不能为空");
    }
  }

  /**
   * 获取事件标识符
   * @returns 事件标识符
   */
  public get eventId(): EntityId {
    return this._eventId.clone();
  }

  /**
   * 获取聚合根标识符
   * @returns 聚合根标识符
   */
  public get aggregateRootId(): EntityId {
    return this._aggregateRootId.clone();
  }

  /**
   * 获取事件时间戳
   * @returns 事件时间戳
   */
  public get timestamp(): Date {
    return new Date(this._timestamp.getTime());
  }

  /**
   * 获取事件版本
   * @returns 事件版本
   */
  public get version(): number {
    return this._version;
  }

  /**
   * 获取事件类型
   * @returns 事件类型
   */
  public get eventType(): string {
    return this._eventType;
  }

  /**
   * 获取事件数据
   * @returns 事件数据的副本
   */
  public get data(): unknown {
    return this.deepClone(this._data);
  }

  /**
   * 获取事件元数据
   * @returns 事件元数据的副本
   */
  public get metadata(): Record<string, unknown> {
    return { ...this._metadata };
  }

  /**
   * 比较两个事件是否相等
   * @param other 要比较的另一个事件
   * @returns 是否相等
   */
  public equals(other: DomainEvent | null | undefined): boolean {
    if (!other) {
      return false;
    }

    if (!(other instanceof DomainEvent)) {
      return false;
    }

    return (
      this._eventId.equals(other._eventId) &&
      this._aggregateRootId.equals(other._aggregateRootId) &&
      this._timestamp.getTime() === other._timestamp.getTime() &&
      this._version === other._version &&
      this._eventType === other._eventType &&
      this.deepEquals(this._data, other._data) &&
      this.deepEquals(this._metadata, other._metadata)
    );
  }

  /**
   * 转换为字符串表示
   * @returns 字符串表示
   */
  public toString(): string {
    return `${this._eventType}[${this._eventId.value}]@${this._timestamp.toISOString()}`;
  }

  /**
   * 转换为JSON表示
   * @returns JSON对象
   */
  public toJSON(): object {
    return {
      eventId: this._eventId.toJSON(),
      aggregateRootId: this._aggregateRootId.toJSON(),
      timestamp: this._timestamp.toISOString(),
      version: this._version,
      eventType: this._eventType,
      data: this._data,
      metadata: this._metadata,
    };
  }

  /**
   * 克隆事件
   * @returns 新的事件实例
   */
  public abstract clone(): DomainEvent;

  /**
   * 验证事件
   * @throws {Error} 当事件无效时抛出异常
   */
  protected abstract validateEvent(): void;

  /**
   * 深度克隆值
   * @param value 要克隆的值
   * @returns 克隆后的值
   */
  protected deepClone(value: unknown): unknown {
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
  protected deepEquals(a: unknown, b: unknown): boolean {
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
