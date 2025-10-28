/**
 * @fileoverview 查询结果类
 * @description 提供查询结果的标准格式
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
import { Transform } from "class-transformer";

/**
 * 查询结果类
 * @description 查询结果的标准格式
 */
export class QueryResult<TData = unknown> {
  /** 执行是否成功 */
  @IsBoolean()
  public readonly success: boolean;

  /** 查询数据 */
  @IsOptional()
  @IsArray()
  public readonly data?: TData[];

  /** 单个结果数据 */
  @IsOptional()
  @IsObject()
  public readonly item?: TData;

  /** 结果消息 */
  @IsOptional()
  @IsString()
  public readonly message?: string;

  /** 错误代码，仅在失败时使用 */
  @IsOptional()
  @IsString()
  public readonly errorCode?: string;

  /** 分页信息 */
  @IsOptional()
  @IsObject()
  public readonly pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };

  /** 缓存信息 */
  @IsOptional()
  @IsObject()
  public cacheInfo?: {
    hit: boolean;
    key?: string;
    ttl?: number;
    expiresAt?: Date;
  };

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
   * 创建查询结果
   * @param success 是否成功
   * @param data 查询数据
   * @param item 单个结果数据
   * @param message 结果消息
   * @param errorCode 错误代码
   * @param pagination 分页信息
   * @param cacheInfo 缓存信息
   * @param executionTime 执行时间
   * @param metadata 元数据
   */
  constructor(
    success: boolean,
    data?: TData[],
    item?: TData,
    message?: string,
    errorCode?: string,
    pagination?: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrevious: boolean;
    },
    cacheInfo?: {
      hit: boolean;
      key?: string;
      ttl?: number;
      expiresAt?: Date;
    },
    executionTime?: number,
    metadata?: Record<string, unknown>,
  ) {
    this.success = success;
    this.data = data;
    this.item = item;
    this.message = message;
    this.errorCode = errorCode;
    this.pagination = pagination;
    this.cacheInfo = cacheInfo;
    this.executionTime = executionTime;
    this.timestamp = new Date();
    this.metadata = metadata;
  }

  /**
   * 创建成功结果
   * @param data 查询数据
   * @param message 成功消息
   * @param pagination 分页信息
   * @param cacheInfo 缓存信息
   * @param executionTime 执行时间
   * @param metadata 元数据
   * @returns 成功结果
   */
  public static success<TData = unknown>(
    data?: TData[],
    message?: string,
    pagination?: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrevious: boolean;
    },
    cacheInfo?: {
      hit: boolean;
      key?: string;
      ttl?: number;
      expiresAt?: Date;
    },
    executionTime?: number,
    metadata?: Record<string, unknown>,
  ): QueryResult<TData> {
    return new QueryResult(
      true,
      data,
      undefined,
      message || "查询执行成功",
      undefined,
      pagination,
      cacheInfo,
      executionTime,
      metadata,
    );
  }

  /**
   * 创建单个结果成功
   * @param item 单个结果数据
   * @param message 成功消息
   * @param cacheInfo 缓存信息
   * @param executionTime 执行时间
   * @param metadata 元数据
   * @returns 成功结果
   */
  public static successItem<TData = unknown>(
    item: TData,
    message?: string,
    cacheInfo?: {
      hit: boolean;
      key?: string;
      ttl?: number;
      expiresAt?: Date;
    },
    executionTime?: number,
    metadata?: Record<string, unknown>,
  ): QueryResult<TData> {
    return new QueryResult(
      true,
      undefined,
      item,
      message || "查询执行成功",
      undefined,
      undefined,
      cacheInfo,
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
  ): QueryResult<TData> {
    return new QueryResult(
      false,
      undefined,
      undefined,
      message,
      errorCode,
      undefined,
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
  public setExecutionTime(startTime: number): QueryResult<TData> {
    this.executionTime = Date.now() - startTime;
    return this;
  }

  /**
   * 设置缓存信息
   * @param cacheInfo 缓存信息
   * @returns 当前实例
   */
  public setCacheInfo(cacheInfo: {
    hit: boolean;
    key?: string;
    ttl?: number;
    expiresAt?: Date;
  }): QueryResult<TData> {
    this.cacheInfo = cacheInfo;
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
      dataCount: this.data?.length || (this.item ? 1 : 0),
      pagination: this.pagination,
      cacheHit: this.cacheInfo?.hit,
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
      item: this.item,
      message: this.message,
      errorCode: this.errorCode,
      pagination: this.pagination,
      cacheInfo: this.cacheInfo
        ? {
            ...this.cacheInfo,
            expiresAt: this.cacheInfo.expiresAt?.toISOString(),
          }
        : undefined,
      executionTime: this.executionTime,
      timestamp: this.timestamp?.toISOString(),
      metadata: this.metadata,
    };
  }

  /**
   * 克隆结果对象
   * @returns 新的结果对象实例
   */
  public clone(): QueryResult<TData> {
    return new QueryResult(
      this.success,
      this.data ? [...this.data] : undefined,
      this.item,
      this.message,
      this.errorCode,
      this.pagination ? { ...this.pagination } : undefined,
      this.cacheInfo ? { ...this.cacheInfo } : undefined,
      this.executionTime,
      this.metadata ? { ...this.metadata } : undefined,
    );
  }
}
