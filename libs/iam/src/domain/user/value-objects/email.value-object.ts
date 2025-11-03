/**
 * @fileoverview 邮箱值对象
 * @description 表示用户邮箱地址，确保格式有效性
 */

import { ValueObject } from "@hl8/domain-kernel";

/**
 * 邮箱值对象
 * @description 封装邮箱地址，提供格式验证和唯一性支持
 * @example
 * ```typescript
 * const email = new EmailValueObject("user@example.com");
 * console.log(email.value); // "user@example.com"
 * ```
 */
export class EmailValueObject extends ValueObject<string> {
  /**
   * 创建邮箱值对象
   * @param value 邮箱地址字符串
   * @param createdAt 创建时间，默认为当前时间
   * @param version 版本号，默认为1
   * @throws {Error} 当邮箱格式无效时抛出异常
   */
  constructor(value: string, createdAt?: Date, version?: number) {
    super(value, createdAt, version);
  }

  /**
   * 验证邮箱格式
   * @param value 邮箱地址
   * @throws {Error} 当邮箱格式无效时抛出异常
   */
  protected validateValue(value: string): void {
    if (!value || typeof value !== "string") {
      throw new Error("邮箱地址不能为空");
    }

    const trimmedValue = value.trim();
    if (trimmedValue.length === 0) {
      throw new Error("邮箱地址不能为空");
    }

    // RFC 5322 简化的邮箱格式验证
    const emailRegex =
      /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

    if (!emailRegex.test(trimmedValue)) {
      throw new Error(`邮箱格式无效: ${trimmedValue}`);
    }

    // 长度限制（RFC 5321）
    if (trimmedValue.length > 254) {
      throw new Error("邮箱地址长度不能超过254个字符");
    }
  }

  /**
   * 创建克隆实例
   * @param value 邮箱地址
   * @param createdAt 创建时间
   * @param version 版本号
   * @returns 新的邮箱值对象实例
   */
  protected createClone(
    value: string,
    createdAt: Date,
    version: number,
  ): EmailValueObject {
    return new EmailValueObject(value, createdAt, version);
  }
}
