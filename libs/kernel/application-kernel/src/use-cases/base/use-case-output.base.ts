/**
 * @fileoverview 用例输出基类
 * @description 提供用例输出的基础功能和标准化
 */

import {
  IsOptional,
  IsBoolean,
  IsString,
  IsNumber,
  IsDate,
} from "class-validator";
import { Transform } from "class-transformer";

/**
 * 用例输出基类
 * @description 所有用例输出都应该继承此类
 */
export abstract class UseCaseOutput {
  /** 执行是否成功 */
  @IsBoolean()
  public success: boolean = true;

  /** 结果消息 */
  @IsOptional()
  @IsString()
  public message?: string;

  /** 错误代码，仅在失败时使用 */
  @IsOptional()
  @IsString()
  public errorCode?: string;

  /** 执行时间（毫秒） */
  @IsOptional()
  @IsNumber()
  public executionTime?: number;

  /** 结果时间戳 */
  @IsOptional()
  @IsDate()
  @Transform(({ value }) => (value ? new Date(value) : new Date()))
  public timestamp?: Date;

  /** 结果元数据 */
  @IsOptional()
  public metadata?: Record<string, unknown>;

  /**
   * 创建成功结果
   * @param data 结果数据
   * @param message 成功消息
   * @param metadata 元数据
   * @returns 成功结果
   */
  public static success<T extends UseCaseOutput>(
    this: new () => T,
    data: Partial<T>,
    message?: string,
    metadata?: Record<string, unknown>,
  ): T {
    const result = new this();
    Object.assign(result, {
      ...data,
      success: true,
      message: message || "操作成功",
      timestamp: new Date(),
      metadata,
    });
    return result;
  }

  /**
   * 创建失败结果
   * @param errorCode 错误代码
   * @param message 错误消息
   * @param metadata 元数据
   * @returns 失败结果
   */
  public static failure<T extends UseCaseOutput>(
    this: new () => T,
    errorCode: string,
    message: string,
    metadata?: Record<string, unknown>,
  ): T {
    const result = new this();
    Object.assign(result, {
      success: false,
      errorCode,
      message,
      timestamp: new Date(),
      metadata,
    });
    return result;
  }

  /**
   * 设置执行时间
   * @param startTime 开始时间
   * @returns 当前实例
   */
  public setExecutionTime(startTime: number): this {
    this.executionTime = Date.now() - startTime;
    return this;
  }

  /**
   * 获取结果摘要
   * @returns 结果摘要
   */
  public getSummary(): Record<string, unknown> {
    return {
      type: this.constructor.name,
      success: this.success,
      message: this.message,
      errorCode: this.errorCode,
      executionTime: this.executionTime,
      timestamp: this.timestamp,
      hasMetadata: !!this.metadata,
    };
  }

  /**
   * 序列化输出数据
   * @returns 序列化后的数据
   */
  public toJSON(): Record<string, unknown> {
    return {
      success: this.success,
      message: this.message,
      timestamp: this.timestamp?.toISOString(),
      metadata: this.metadata,
    };
  }

  /**
   * 克隆输出对象
   * @returns 新的输出对象实例
   */
  public abstract clone(): UseCaseOutput;
}
