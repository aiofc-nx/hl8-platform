/**
 * @fileoverview UUID生成器
 * @description 提供UUID v4生成功能，支持批量生成和冲突检测
 */

import { v4 as uuidv4, validate as validateUuid } from "uuid";

/**
 * UUID生成器类
 * @description 提供高性能的UUID v4生成功能，支持批量生成和冲突检测
 */
export class UuidGenerator {
  private static readonly MAX_RETRIES = 3;
  private static readonly BATCH_SIZE = 1000;
  private static generatedUuids = new Set<string>();

  /**
   * 生成单个UUID v4
   * @description 生成一个符合UUID v4标准的唯一标识符
   * @returns 生成的UUID字符串
   * @throws {Error} 当生成失败时抛出异常
   */
  public static generate(): string {
    let attempts = 0;

    while (attempts < this.MAX_RETRIES) {
      try {
        const uuid = uuidv4();

        // 验证UUID格式
        if (!validateUuid(uuid)) {
          attempts++;
          continue;
        }

        // 检查冲突
        if (this.generatedUuids.has(uuid)) {
          attempts++;
          continue;
        }

        // 记录生成的UUID
        this.generatedUuids.add(uuid);

        return uuid;
      } catch (error) {
        attempts++;
        if (attempts >= this.MAX_RETRIES) {
          throw new Error(
            `UUID生成失败，已重试${this.MAX_RETRIES}次: ${error}`,
          );
        }
      }
    }

    throw new Error(`UUID生成失败，无法生成唯一标识符`);
  }

  /**
   * 批量生成UUID v4
   * @description 批量生成指定数量的UUID，提高性能
   * @param count 要生成的UUID数量
   * @returns 生成的UUID数组
   * @throws {Error} 当生成失败时抛出异常
   */
  public static generateBatch(count: number): string[] {
    if (count <= 0) {
      throw new Error("批量生成数量必须大于0");
    }

    if (count > this.BATCH_SIZE) {
      throw new Error(`批量生成数量不能超过${this.BATCH_SIZE}`);
    }

    const uuids: string[] = [];
    const attempts = new Map<string, number>();

    while (uuids.length < count) {
      try {
        const uuid = uuidv4();

        // 验证UUID格式
        if (!validateUuid(uuid)) {
          continue;
        }

        // 检查冲突
        if (this.generatedUuids.has(uuid)) {
          const attemptCount = attempts.get(uuid) || 0;
          if (attemptCount >= this.MAX_RETRIES) {
            throw new Error(`UUID冲突检测失败: ${uuid}`);
          }
          attempts.set(uuid, attemptCount + 1);
          continue;
        }

        // 记录生成的UUID
        this.generatedUuids.add(uuid);
        uuids.push(uuid);
        attempts.delete(uuid);
      } catch (error) {
        throw new Error(`批量UUID生成失败: ${error}`);
      }
    }

    return uuids;
  }

  /**
   * 验证UUID格式
   * @description 验证字符串是否为有效的UUID v4格式
   * @param uuid 要验证的UUID字符串
   * @returns 是否为有效的UUID v4
   */
  public static validate(uuid: string): boolean {
    return validateUuid(uuid);
  }

  /**
   * 检查UUID是否已生成
   * @description 检查指定的UUID是否已经被生成过
   * @param uuid 要检查的UUID
   * @returns 是否已生成
   */
  public static isGenerated(uuid: string): boolean {
    return this.generatedUuids.has(uuid);
  }

  /**
   * 检测UUID冲突
   * @description 检测指定UUID是否与已生成的UUID冲突
   * @param uuid 要检测的UUID
   * @returns 是否冲突
   */
  public static detectConflict(uuid: string): boolean {
    return this.generatedUuids.has(uuid);
  }

  /**
   * 批量检测UUID冲突
   * @description 检测多个UUID是否与已生成的UUID冲突
   * @param uuids 要检测的UUID数组
   * @returns 冲突的UUID数组
   */
  public static detectConflicts(uuids: string[]): string[] {
    return uuids.filter((uuid) => this.generatedUuids.has(uuid));
  }

  /**
   * 清空已生成的UUID记录
   * @description 清空内存中的UUID记录，用于测试或重置
   */
  public static clearGenerated(): void {
    this.generatedUuids.clear();
  }

  /**
   * 获取已生成的UUID数量
   * @description 获取当前内存中记录的UUID数量
   * @returns 已生成的UUID数量
   */
  public static getGeneratedCount(): number {
    return this.generatedUuids.size;
  }
}
