/**
 * @fileoverview 部门名称值对象
 * @description 表示部门名称，确保格式有效性
 */

import { ValueObject } from "@hl8/domain-kernel";

/**
 * 部门名称值对象
 * @description 封装部门名称，提供格式验证
 * @example
 * ```typescript
 * const name = new DepartmentNameValueObject("研发部");
 * console.log(name.value); // "研发部"
 * ```
 */
export class DepartmentNameValueObject extends ValueObject<string> {
  /**
   * 创建部门名称值对象
   * @param value 部门名称字符串
   * @param createdAt 创建时间，默认为当前时间
   * @param version 版本号，默认为1
   * @throws {Error} 当部门名称格式无效时抛出异常
   */
  constructor(value: string, createdAt?: Date, version?: number) {
    super(value, createdAt, version);
  }

  /**
   * 验证部门名称格式
   * @param value 部门名称
   * @throws {Error} 当部门名称格式无效时抛出异常
   */
  protected validateValue(value: string): void {
    if (!value || typeof value !== "string") {
      throw new Error("部门名称不能为空");
    }

    const trimmedValue = value.trim();
    if (trimmedValue.length === 0) {
      throw new Error("部门名称不能为空");
    }

    // 长度验证：1-100字符
    if (trimmedValue.length > 100) {
      throw new Error("部门名称长度不能超过100个字符");
    }
  }

  /**
   * 创建克隆实例
   * @param value 部门名称
   * @param createdAt 创建时间
   * @param version 版本号
   * @returns 新的部门名称值对象实例
   */
  protected createClone(
    value: string,
    createdAt: Date,
    version: number,
  ): DepartmentNameValueObject {
    return new DepartmentNameValueObject(value, createdAt, version);
  }
}
