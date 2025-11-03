/**
 * @fileoverview 租户代码值对象
 * @description 表示租户代码，确保格式有效性（3-20字符，字母数字开头/结尾，可包含连字符和下划线）
 */

import { ValueObject } from "@hl8/domain-kernel";

/**
 * 租户代码值对象
 * @description 封装租户代码，提供格式验证和唯一性支持
 * @example
 * ```typescript
 * const code = new TenantCodeValueObject("acme-corp");
 * console.log(code.value); // "acme-corp"
 * ```
 */
export class TenantCodeValueObject extends ValueObject<string> {
  /**
   * 创建租户代码值对象
   * @param value 租户代码字符串
   * @param createdAt 创建时间，默认为当前时间
   * @param version 版本号，默认为1
   * @throws {Error} 当租户代码格式无效时抛出异常
   */
  constructor(value: string, createdAt?: Date, version?: number) {
    super(value, createdAt, version);
  }

  /**
   * 验证租户代码格式
   * @param value 租户代码
   * @throws {Error} 当租户代码格式无效时抛出异常
   */
  protected validateValue(value: string): void {
    if (!value || typeof value !== "string") {
      throw new Error("租户代码不能为空");
    }

    const trimmedValue = value.trim();
    if (trimmedValue.length === 0) {
      throw new Error("租户代码不能为空");
    }

    // 长度验证：3-20字符
    if (trimmedValue.length < 3) {
      throw new Error("租户代码长度不能少于3个字符");
    }

    if (trimmedValue.length > 20) {
      throw new Error("租户代码长度不能超过20个字符");
    }

    // 格式验证：字母数字开头/结尾，可包含连字符和下划线
    const codeRegex = /^[a-zA-Z0-9][a-zA-Z0-9_-]*[a-zA-Z0-9]$|^[a-zA-Z0-9]$/;

    if (!codeRegex.test(trimmedValue)) {
      throw new Error(
        `租户代码格式无效: ${trimmedValue}。应为3-20个字符，字母数字开头/结尾，可包含连字符和下划线`,
      );
    }
  }

  /**
   * 创建克隆实例
   * @param value 租户代码
   * @param createdAt 创建时间
   * @param version 版本号
   * @returns 新的租户代码值对象实例
   */
  protected createClone(
    value: string,
    createdAt: Date,
    version: number,
  ): TenantCodeValueObject {
    return new TenantCodeValueObject(value, createdAt, version);
  }
}
