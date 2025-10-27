/**
 * @fileoverview 值对象基类
 * @description 提供不可变值对象的基础功能，包括相等性比较、序列化等
 */

/**
 * 值对象基类
 * @description 提供不可变值对象的基础功能，遵循值对象模式
 * @template T 值对象的值的类型
 */
export abstract class ValueObject<T> {
  protected readonly _value: T;
  protected readonly _createdAt: Date;
  protected readonly _version: number;

  /**
   * 创建值对象
   * @param value 值对象的值
   * @param createdAt 创建时间，默认为当前时间
   * @param version 版本号，默认为1
   */
  constructor(value: T, createdAt: Date = new Date(), version: number = 1) {
    this.validateValue(value);
    this._value = this.deepClone(value);
    this._createdAt = new Date(createdAt.getTime());
    this._version = version;
  }

  /**
   * 获取值对象的值
   * @returns 值的副本
   */
  public get value(): T {
    return this.deepClone(this._value);
  }

  /**
   * 获取创建时间
   * @returns 创建时间
   */
  public get createdAt(): Date {
    return new Date(this._createdAt.getTime());
  }

  /**
   * 获取版本号
   * @returns 版本号
   */
  public get version(): number {
    return this._version;
  }

  /**
   * 比较两个值对象是否相等
   * @param other 要比较的另一个值对象
   * @returns 是否相等
   */
  public equals(other: ValueObject<T> | null | undefined): boolean {
    if (!other) {
      return false;
    }

    if (!(other instanceof ValueObject)) {
      return false;
    }

    if (this.constructor !== other.constructor) {
      return false;
    }

    return this.deepEquals(this._value, other._value);
  }

  /**
   * 转换为字符串表示
   * @returns 字符串表示
   */
  public toString(): string {
    return this.serializeValue(this._value);
  }

  /**
   * 转换为JSON表示
   * @returns JSON对象
   */
  public toJSON(): object {
    return {
      value: this.serializeValue(this._value),
      createdAt: this._createdAt.toISOString(),
      version: this._version,
      type: this.constructor.name,
    };
  }

  /**
   * 克隆值对象
   * @returns 新的值对象实例
   */
  public clone(): ValueObject<T> {
    return this.createClone(this._value, this._createdAt, this._version);
  }

  /**
   * 获取值对象的哈希值
   * @returns 哈希值
   */
  public hashCode(): number {
    return this.calculateHashCode(this._value);
  }

  /**
   * 验证值是否有效
   * @param value 要验证的值
   * @throws {Error} 当值无效时抛出异常
   */
  protected abstract validateValue(value: T): void;

  /**
   * 序列化值
   * @param value 要序列化的值
   * @returns 序列化后的字符串
   */
  protected serializeValue(value: T): string {
    if (typeof value === "string") {
      return value;
    }

    if (typeof value === "number" || typeof value === "boolean") {
      return String(value);
    }

    if (value === null || value === undefined) {
      return String(value);
    }

    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }

  /**
   * 深度克隆值
   * @param value 要克隆的值
   * @returns 克隆后的值
   */
  protected deepClone(value: T): T {
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
      return new Date(value.getTime()) as T;
    }

    if (Array.isArray(value)) {
      return value.map((item) => this.deepClone(item)) as T;
    }

    if (typeof value === "object") {
      const cloned = {} as T;
      for (const key in value) {
        if (Object.prototype.hasOwnProperty.call(value, key)) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (cloned as any)[key] = this.deepClone(value[key] as any);
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
  protected deepEquals(a: T, b: T): boolean {
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

      const keysA = Object.keys(a);
      const keysB = Object.keys(b);

      if (keysA.length !== keysB.length) {
        return false;
      }

      for (const key of keysA) {
        if (!keysB.includes(key)) {
          return false;
        }
        if (!this.deepEquals(a[key], b[key])) {
          return false;
        }
      }

      return true;
    }

    return false;
  }

  /**
   * 计算值的哈希码
   * @param value 要计算哈希码的值
   * @returns 哈希码
   */
  protected calculateHashCode(value: T): number {
    const str = this.serializeValue(value);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // 转换为32位整数
    }
    return hash;
  }

  /**
   * 创建克隆实例
   * @param value 值
   * @param createdAt 创建时间
   * @param version 版本号
   * @returns 新的值对象实例
   */
  protected abstract createClone(
    value: T,
    createdAt: Date,
    version: number,
  ): ValueObject<T>;
}
