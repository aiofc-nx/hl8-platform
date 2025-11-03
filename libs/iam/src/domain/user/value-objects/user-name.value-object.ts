/**
 * @fileoverview 用户名称值对象
 * @description 表示用户姓名，确保格式有效性
 */

import { ValueObject } from "@hl8/domain-kernel";

/**
 * 用户名称值对象
 * @description 封装用户姓名，提供格式验证
 * @example
 * ```typescript
 * const name = new UserNameValueObject("张三");
 * console.log(name.value); // "张三"
 * ```
 */
export class UserNameValueObject extends ValueObject<string> {
  /**
   * 创建用户名称值对象
   * @param value 用户姓名字符串
   * @param createdAt 创建时间，默认为当前时间
   * @param version 版本号，默认为1
   * @throws {Error} 当用户名称格式无效时抛出异常
   */
  constructor(value: string, createdAt?: Date, version?: number) {
    super(value, createdAt, version);
  }

  /**
   * 验证用户名称格式
   * @param value 用户名称
   * @throws {Error} 当用户名称格式无效时抛出异常
   */
  protected validateValue(value: string): void {
    if (!value || typeof value !== "string") {
      throw new Error("用户名称不能为空");
    }

    const trimmedValue = value.trim();
    if (trimmedValue.length === 0) {
      throw new Error("用户名称不能为空");
    }

    // 长度验证：1-50字符
    if (trimmedValue.length > 50) {
      throw new Error("用户名称长度不能超过50个字符");
    }

    // 不能只包含空白字符
    if (trimmedValue.length === 0) {
      throw new Error("用户名称不能只包含空白字符");
    }
  }

  /**
   * 创建克隆实例
   * @param value 用户名称
   * @param createdAt 创建时间
   * @param version 版本号
   * @returns 新的用户名称值对象实例
   */
  protected createClone(
    value: string,
    createdAt: Date,
    version: number,
  ): UserNameValueObject {
    return new UserNameValueObject(value, createdAt, version);
  }
}
