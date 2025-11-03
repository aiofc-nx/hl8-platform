/**
 * @fileoverview 手机号值对象
 * @description 表示用户手机号码，确保格式有效性（支持中国手机号格式）
 */

import { ValueObject } from "@hl8/domain-kernel";

/**
 * 手机号值对象
 * @description 封装手机号码，提供格式验证（支持中国手机号11位数字格式）
 * @example
 * ```typescript
 * const phone = new PhoneNumberValueObject("13800138000");
 * console.log(phone.value); // "13800138000"
 * ```
 */
export class PhoneNumberValueObject extends ValueObject<string> {
  /**
   * 创建手机号值对象
   * @param value 手机号字符串
   * @param createdAt 创建时间，默认为当前时间
   * @param version 版本号，默认为1
   * @throws {Error} 当手机号格式无效时抛出异常
   */
  constructor(
    value: string,
    createdAt?: Date,
    version?: number,
  ) {
    super(value, createdAt, version);
  }

  /**
   * 验证手机号格式
   * @param value 手机号
   * @throws {Error} 当手机号格式无效时抛出异常
   */
  protected validateValue(value: string): void {
    if (!value || typeof value !== "string") {
      throw new Error("手机号不能为空");
    }

    const trimmedValue = value.trim();
    if (trimmedValue.length === 0) {
      throw new Error("手机号不能为空");
    }

    // 移除所有非数字字符
    const digitsOnly = trimmedValue.replace(/\D/g, "");

    // 中国手机号格式：11位数字，以1开头，第二位为3-9
    const phoneRegex = /^1[3-9]\d{9}$/;

    if (!phoneRegex.test(digitsOnly)) {
      throw new Error(`手机号格式无效: ${trimmedValue}。应为11位数字，以1开头，第二位为3-9`);
    }
  }

  /**
   * 创建克隆实例
   * @param value 手机号
   * @param createdAt 创建时间
   * @param version 版本号
   * @returns 新的手机号值对象实例
   */
  protected createClone(
    value: string,
    createdAt: Date,
    version: number,
  ): PhoneNumberValueObject {
    return new PhoneNumberValueObject(value, createdAt, version);
  }
}

