/**
 * @fileoverview 审计信息值对象
 * @description 记录实体的审计信息，包括创建时间、更新时间、创建者、更新者等
 */

import { EntityId } from "../identifiers/entity-id.js";
import { createHash } from "crypto";

/**
 * 审计信息值对象
 * @description 记录实体的审计信息，提供数据完整性验证
 */
export class AuditInfo {
  private readonly _createdAt: Date;
  private readonly _updatedAt: Date;
  private readonly _createdBy: EntityId;
  private readonly _updatedBy: EntityId;
  private readonly _version: number;
  private readonly _checksum: string;

  /**
   * 创建审计信息
   * @param createdAt 创建时间
   * @param updatedAt 更新时间
   * @param createdBy 创建者ID
   * @param updatedBy 更新者ID
   * @param version 版本号
   */
  constructor(
    createdAt: Date,
    updatedAt: Date,
    createdBy: EntityId,
    updatedBy: EntityId,
    version: number,
  ) {
    this._createdAt = new Date(createdAt.getTime());
    this._updatedAt = new Date(updatedAt.getTime());
    this._createdBy = createdBy.clone();
    this._updatedBy = updatedBy.clone();
    this._version = version;
    this._checksum = this.calculateChecksum();

    this.validateIntegrity();
  }

  /**
   * 获取创建时间
   * @returns 创建时间
   */
  public get createdAt(): Date {
    return new Date(this._createdAt.getTime());
  }

  /**
   * 获取更新时间
   * @returns 更新时间
   */
  public get updatedAt(): Date {
    return new Date(this._updatedAt.getTime());
  }

  /**
   * 获取创建者ID
   * @returns 创建者ID
   */
  public get createdBy(): EntityId {
    return this._createdBy.clone();
  }

  /**
   * 获取更新者ID
   * @returns 更新者ID
   */
  public get updatedBy(): EntityId {
    return this._updatedBy.clone();
  }

  /**
   * 获取版本号
   * @returns 版本号
   */
  public get version(): number {
    return this._version;
  }

  /**
   * 获取校验和
   * @returns 校验和
   */
  public get checksum(): string {
    return this._checksum;
  }

  /**
   * 更新审计信息
   * @param updatedBy 更新者ID
   * @returns 新的审计信息实例
   */
  public update(updatedBy: EntityId): AuditInfo {
    const now = new Date();
    return new AuditInfo(
      this._createdAt,
      now,
      this._createdBy,
      updatedBy,
      this._version + 1,
    );
  }

  /**
   * 获取校验和
   * @returns 校验和字符串
   */
  public getChecksum(): string {
    return this._checksum;
  }

  /**
   * 验证数据完整性
   * @returns 是否完整
   */
  public validateIntegrity(): boolean {
    const expectedChecksum = this.calculateChecksum();
    const isValid = this._checksum === expectedChecksum;
    const isTimeValid = this._createdAt <= this._updatedAt;
    const isVersionValid = this._version >= 1;
    const isCreatedByValid = this._createdBy.isValid();
    const isUpdatedByValid = this._updatedBy.isValid();

    if (!isValid) {
      throw new Error("审计信息校验和验证失败");
    }

    if (!isTimeValid) {
      throw new Error("创建时间不能晚于更新时间");
    }

    if (!isVersionValid) {
      throw new Error("版本号必须大于等于1");
    }

    if (!isCreatedByValid) {
      throw new Error("创建者ID无效");
    }

    if (!isUpdatedByValid) {
      throw new Error("更新者ID无效");
    }

    return (
      isValid &&
      isTimeValid &&
      isVersionValid &&
      isCreatedByValid &&
      isUpdatedByValid
    );
  }

  /**
   * 验证审计信息是否被篡改
   * @returns 是否被篡改
   */
  public isTampered(): boolean {
    const expectedChecksum = this.calculateChecksum();
    return this._checksum !== expectedChecksum;
  }

  /**
   * 获取审计信息的完整性报告
   * @returns 完整性报告
   */
  public getIntegrityReport(): {
    isValid: boolean;
    checksumValid: boolean;
    timeValid: boolean;
    versionValid: boolean;
    createdByValid: boolean;
    updatedByValid: boolean;
    errors: string[];
  } {
    const expectedChecksum = this.calculateChecksum();
    const checksumValid = this._checksum === expectedChecksum;
    const timeValid = this._createdAt <= this._updatedAt;
    const versionValid = this._version >= 1;
    const createdByValid = this._createdBy.isValid();
    const updatedByValid = this._updatedBy.isValid();

    const errors: string[] = [];
    if (!checksumValid) errors.push("校验和不匹配");
    if (!timeValid) errors.push("创建时间晚于更新时间");
    if (!versionValid) errors.push("版本号小于1");
    if (!createdByValid) errors.push("创建者ID无效");
    if (!updatedByValid) errors.push("更新者ID无效");

    return {
      isValid:
        checksumValid &&
        timeValid &&
        versionValid &&
        createdByValid &&
        updatedByValid,
      checksumValid,
      timeValid,
      versionValid,
      createdByValid,
      updatedByValid,
      errors,
    };
  }

  /**
   * 转换为JSON表示
   * @returns JSON对象
   */
  public toJSON(): object {
    return {
      createdAt: this._createdAt.toISOString(),
      updatedAt: this._updatedAt.toISOString(),
      createdBy: this._createdBy.toJSON(),
      updatedBy: this._updatedBy.toJSON(),
      version: this._version,
      checksum: this._checksum,
    };
  }

  /**
   * 比较两个审计信息是否相等
   * @param other 要比较的另一个审计信息
   * @returns 是否相等
   */
  public equals(other: AuditInfo | null | undefined): boolean {
    if (!other) {
      return false;
    }

    if (!(other instanceof AuditInfo)) {
      return false;
    }

    return (
      this._createdAt.getTime() === other._createdAt.getTime() &&
      this._updatedAt.getTime() === other._updatedAt.getTime() &&
      this._createdBy.equals(other._createdBy) &&
      this._updatedBy.equals(other._updatedBy) &&
      this._version === other._version &&
      this._checksum === other._checksum
    );
  }

  /**
   * 计算校验和
   * @returns 校验和字符串
   */
  private calculateChecksum(): string {
    const data = {
      createdAt: this._createdAt.toISOString(),
      updatedAt: this._updatedAt.toISOString(),
      createdBy: this._createdBy.value,
      updatedBy: this._updatedBy.value,
      version: this._version,
    };

    const dataString = JSON.stringify(data, Object.keys(data).sort());
    return createHash("sha256").update(dataString).digest("hex");
  }

  /**
   * 克隆审计信息
   * @returns 新的审计信息实例
   */
  public clone(): AuditInfo {
    return new AuditInfo(
      this._createdAt,
      this._updatedAt,
      this._createdBy,
      this._updatedBy,
      this._version,
    );
  }

  /**
   * 创建初始审计信息
   * @param createdBy 创建者ID
   * @returns 初始审计信息
   */
  public static create(createdBy: EntityId): AuditInfo {
    const now = new Date();
    return new AuditInfo(now, now, createdBy, createdBy, 1);
  }

  /**
   * 从JSON创建审计信息
   * @param data JSON数据
   * @returns 审计信息实例
   */
  public static fromJSON(data: unknown): AuditInfo {
    const dataObj = data as {
      createdAt: string;
      updatedAt: string;
      createdBy: string;
      updatedBy: string;
      version: number;
    };
    return new AuditInfo(
      new Date(dataObj.createdAt),
      new Date(dataObj.updatedAt),
      EntityId.fromString(dataObj.createdBy),
      EntityId.fromString(dataObj.updatedBy),
      dataObj.version,
    );
  }
}
