/**
 * @fileoverview 租户域名值对象
 * @description 表示租户域名，确保格式有效性（标准域名格式）
 */

import { ValueObject } from "@hl8/domain-kernel";

/**
 * 租户域名值对象
 * @description 封装租户域名，提供格式验证和唯一性支持
 * @example
 * ```typescript
 * const domain = new TenantDomainValueObject("acme.example.com");
 * console.log(domain.value); // "acme.example.com"
 * ```
 */
export class TenantDomainValueObject extends ValueObject<string> {
  /**
   * 创建租户域名值对象
   * @param value 租户域名字符串
   * @param createdAt 创建时间，默认为当前时间
   * @param version 版本号，默认为1
   * @throws {Error} 当域名格式无效时抛出异常
   */
  constructor(
    value: string,
    createdAt?: Date,
    version?: number,
  ) {
    super(value, createdAt, version);
  }

  /**
   * 验证域名格式
   * @param value 域名
   * @throws {Error} 当域名格式无效时抛出异常
   */
  protected validateValue(value: string): void {
    if (!value || typeof value !== "string") {
      throw new Error("租户域名不能为空");
    }

    const trimmedValue = value.trim().toLowerCase();
    if (trimmedValue.length === 0) {
      throw new Error("租户域名不能为空");
    }

    // 长度验证：不超过253字符（RFC 1035）
    if (trimmedValue.length > 253) {
      throw new Error("租户域名长度不能超过253个字符");
    }

    // 域名格式验证（RFC 1035）
    // 允许：字母数字和连字符，点分隔，每个标签1-63字符
    const domainRegex =
      /^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)*[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/;

    if (!domainRegex.test(trimmedValue)) {
      throw new Error(`租户域名格式无效: ${trimmedValue}。应为标准域名格式`);
    }

    // 标签长度验证：每个标签不超过63字符
    const labels = trimmedValue.split(".");
    for (const label of labels) {
      if (label.length > 63) {
        throw new Error(
          `租户域名标签长度无效: ${label}。每个标签不能超过63个字符`,
        );
      }
    }
  }

  /**
   * 创建克隆实例
   * @param value 租户域名
   * @param createdAt 创建时间
   * @param version 版本号
   * @returns 新的租户域名值对象实例
   */
  protected createClone(
    value: string,
    createdAt: Date,
    version: number,
  ): TenantDomainValueObject {
    return new TenantDomainValueObject(value, createdAt, version);
  }
}

