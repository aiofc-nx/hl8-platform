/**
 * @fileoverview 密码哈希值对象
 * @description 表示密码哈希值，确保格式有效性
 */

import { ValueObject } from "@hl8/domain-kernel";

/**
 * 密码哈希值对象
 * @description 封装密码哈希值，确保格式正确（通常为bcrypt哈希，60字符）
 * @example
 * ```typescript
 * const hash = new PasswordHashValueObject("$2b$10$...");
 * ```
 */
export class PasswordHashValueObject extends ValueObject<string> {
  /**
   * 创建密码哈希值对象
   * @param value 密码哈希字符串
   * @param createdAt 创建时间，默认为当前时间
   * @param version 版本号，默认为1
   * @throws {Error} 当哈希格式无效时抛出异常
   */
  constructor(
    value: string,
    createdAt?: Date,
    version?: number,
  ) {
    super(value, createdAt, version);
  }

  /**
   * 验证密码哈希格式
   * @param value 密码哈希
   * @throws {Error} 当哈希格式无效时抛出异常
   */
  protected validateValue(value: string): void {
    if (!value || typeof value !== "string") {
      throw new Error("密码哈希不能为空");
    }

    const trimmedValue = value.trim();
    if (trimmedValue.length === 0) {
      throw new Error("密码哈希不能为空");
    }

    // bcrypt哈希格式：$2a$, $2b$, $2y$ 开头，60字符
    // 也支持其他哈希算法（如argon2）
    const bcryptRegex = /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/;
    const argon2Regex = /^\$argon2(id|i|d)\$v=\d+\$m=\d+,t=\d+,p=\d+\$[./A-Za-z0-9]+$/;

    // 允许bcrypt、argon2或至少32字符的哈希（支持其他算法）
    if (
      !bcryptRegex.test(trimmedValue) &&
      !argon2Regex.test(trimmedValue) &&
      trimmedValue.length < 32
    ) {
      throw new Error(
        `密码哈希格式无效: ${trimmedValue}。应为bcrypt、argon2格式或至少32字符`,
      );
    }
  }

  /**
   * 创建克隆实例
   * @param value 密码哈希
   * @param createdAt 创建时间
   * @param version 版本号
   * @returns 新的密码哈希值对象实例
   */
  protected createClone(
    value: string,
    createdAt: Date,
    version: number,
  ): PasswordHashValueObject {
    return new PasswordHashValueObject(value, createdAt, version);
  }
}

