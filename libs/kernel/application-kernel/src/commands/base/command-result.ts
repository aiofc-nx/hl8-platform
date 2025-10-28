/**
 * @fileoverview 命令结果类
 * @description 提供命令执行结果的标准格式
 */

import {
  IsBoolean,
  IsOptional,
  IsString,
  IsArray,
  IsObject,
  IsNumber,
  IsDate,
} from "class-validator";
import { Type, Transform } from "class-transformer";
import { DomainEvent } from "../../events/types/domain-event.js";

/**
 * 命令结果类
 * @description 命令执行结果的标准格式
 */
export class CommandResult<TData = unknown> {
  /** 执行是否成功 */
  @IsBoolean()
  public readonly success: boolean;

  /** 结果数据 */
  @IsOptional()
  @IsObject()
  public readonly data?: TData;

  /** 结果消息 */
  @IsOptional()
  @IsString()
  public readonly message?: string;

  /** 错误代码，仅在失败时使用 */
  @IsOptional()
  @IsString()
  public readonly errorCode?: string;

  /** 产生的事件列表 */
  @IsOptional()
  @IsArray()
  @Type(() => Object)
  public events?: DomainEvent[];

  /** 执行时间（毫秒） */
  @IsOptional()
  @IsNumber()
  public executionTime?: number;

  /** 结果时间戳 */
  @IsOptional()
  @IsDate()
  @Transform(({ value }) => (value ? new Date(value) : new Date()))
  public readonly timestamp?: Date;

  /** 结果元数据 */
  @IsOptional()
  @IsObject()
  public readonly metadata?: Record<string, unknown>;

  /**
   * 创建命令结果
   * @param success 是否成功
   * @param data 结果数据
   * @param message 结果消息
   * @param errorCode 错误代码
   * @param events 产生的事件
   * @param executionTime 执行时间
   * @param metadata 元数据
   */
  constructor(
    success: boolean,
    data?: TData,
    message?: string,
    errorCode?: string,
    events?: DomainEvent[],
    executionTime?: number,
    metadata?: Record<string, unknown>,
  ) {
    this.success = success;
    this.data = data;
    this.message = message;
    this.errorCode = errorCode;
    this.events = events;
    this.executionTime = executionTime;
    this.timestamp = new Date();
    this.metadata = metadata;
  }

  /**
   * 创建成功结果
   * @param data 结果数据
   * @param message 成功消息
   * @param events 产生的事件
   * @param executionTime 执行时间
   * @param metadata 元数据
   * @returns 成功结果
   */
  public static success<TData = unknown>(
    data?: TData,
    message?: string,
    events?: DomainEvent[],
    executionTime?: number,
    metadata?: Record<string, unknown>,
  ): CommandResult<TData> {
    return new CommandResult(
      true,
      data,
      message || "命令执行成功",
      undefined,
      events,
      executionTime,
      metadata,
    );
  }

  /**
   * 创建失败结果
   * @param errorCode 错误代码
   * @param message 错误消息
   * @param executionTime 执行时间
   * @param metadata 元数据
   * @returns 失败结果
   */
  public static failure<TData = unknown>(
    errorCode: string,
    message: string,
    executionTime?: number,
    metadata?: Record<string, unknown>,
  ): CommandResult<TData> {
    return new CommandResult(
      false,
      undefined,
      message,
      errorCode,
      undefined,
      executionTime,
      metadata,
    );
  }

  /**
   * 设置执行时间
   * @param startTime 开始时间
   * @returns 当前实例
   */
  public setExecutionTime(startTime: number): CommandResult<TData> {
    this.executionTime = Date.now() - startTime;
    return this;
  }

  /**
   * 添加事件
   * @param event 事件
   * @returns 当前实例
   */
  public addEvent(event: DomainEvent): CommandResult<TData> {
    if (!this.events) {
      this.events = [];
    }
    this.events.push(event);
    return this;
  }

  /**
   * 添加多个事件
   * @param events 事件列表
   * @returns 当前实例
   */
  public addEvents(events: DomainEvent[]): CommandResult<TData> {
    if (!this.events) {
      this.events = [];
    }
    this.events.push(...events);
    return this;
  }

  /**
   * 获取结果摘要
   * @returns 结果摘要
   */
  public getSummary(): Record<string, unknown> {
    return {
      success: this.success,
      message: this.message,
      errorCode: this.errorCode,
      eventCount: this.events?.length || 0,
      executionTime: this.executionTime,
      timestamp: this.timestamp,
      hasMetadata: !!this.metadata,
    };
  }

  /**
   * 序列化结果数据
   * @returns 序列化后的数据
   */
  public toJSON(): Record<string, unknown> {
    return {
      success: this.success,
      data: this.data,
      message: this.message,
      errorCode: this.errorCode,
      events: this.events?.map((event) => event.toJSON()),
      executionTime: this.executionTime,
      timestamp: this.timestamp?.toISOString(),
      metadata: this.metadata,
    };
  }

  /**
   * 克隆结果对象
   * @returns 新的结果对象实例
   */
  public clone(): CommandResult<TData> {
    return new CommandResult(
      this.success,
      this.data,
      this.message,
      this.errorCode,
      this.events ? [...this.events] : undefined,
      this.executionTime,
      this.metadata ? { ...this.metadata } : undefined,
    );
  }
}
