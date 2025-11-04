/**
 * @fileoverview 部门路径值对象
 * @description 表示部门路径，用于层级路径表示（如：/1/2/3）
 */

import { ValueObject } from "@hl8/domain-kernel";

/**
 * 部门路径值对象
 * @description 封装部门路径，提供格式验证
 * @example
 * ```typescript
 * const path = new DepartmentPathValueObject("/1/2/3");
 * console.log(path.value); // "/1/2/3"
 * ```
 */
export class DepartmentPathValueObject extends ValueObject<string> {
  /**
   * 创建部门路径值对象
   * @param value 部门路径字符串（如：/1/2/3）
   * @param createdAt 创建时间，默认为当前时间
   * @param version 版本号，默认为1
   * @throws {Error} 当部门路径格式无效时抛出异常
   */
  constructor(value: string, createdAt?: Date, version?: number) {
    super(value, createdAt, version);
  }

  /**
   * 验证部门路径格式
   * @param value 部门路径
   * @throws {Error} 当部门路径格式无效时抛出异常
   */
  protected validateValue(value: string): void {
    if (!value || typeof value !== "string") {
      throw new Error("部门路径不能为空");
    }

    const trimmedValue = value.trim();
    if (trimmedValue.length === 0) {
      throw new Error("部门路径不能为空");
    }

    // 格式验证：必须以 / 开头，格式为 /数字/数字/...
    const pathRegex = /^\/\d+(\/\d+)*$/;
    if (!pathRegex.test(trimmedValue)) {
      throw new Error(`部门路径格式无效: ${trimmedValue}。应为格式如 /1/2/3`);
    }
  }

  /**
   * 创建克隆实例
   * @param value 部门路径
   * @param createdAt 创建时间
   * @param version 版本号
   * @returns 新的部门路径值对象实例
   */
  protected createClone(
    value: string,
    createdAt: Date,
    version: number,
  ): DepartmentPathValueObject {
    return new DepartmentPathValueObject(value, createdAt, version);
  }
}
