/**
 * @fileoverview 命令基类
 * @description 基于@nestjs/cqrs官方Command类实现的命令基类
 */

import { Command } from "@nestjs/cqrs";
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsDate,
  IsObject,
} from "class-validator";
import { Transform } from "class-transformer";
import { EntityId } from "@hl8/domain-kernel";

/**
 * 命令基类
 * @description 所有命令都应该继承此类，基于@nestjs/cqrs官方Command类
 * @template TResult 结果类型
 */
export abstract class BaseCommand<TResult = unknown> extends Command<TResult> {
  /** 命令ID */
  @IsNotEmpty()
  @IsString()
  public readonly commandId: string;

  /** 聚合根ID */
  @IsNotEmpty()
  @IsString()
  public readonly aggregateId: string;

  /** 命令类型 */
  @IsNotEmpty()
  @IsString()
  public readonly commandType: string;

  /** 关联ID，用于追踪请求 */
  @IsOptional()
  @IsString()
  public readonly correlationId?: string;

  /** 用户ID，用于权限控制 */
  @IsOptional()
  @IsString()
  public readonly userId?: string;

  /** 命令时间戳 */
  @IsOptional()
  @IsDate()
  @Transform(({ value }) => (value ? new Date(value) : new Date()))
  public readonly timestamp?: Date;

  /** 命令版本 */
  @IsOptional()
  @IsString()
  public readonly version?: string;

  /** 命令元数据 */
  @IsOptional()
  @IsObject()
  public readonly metadata?: Record<string, unknown>;

  /**
   * 创建命令
   * @param aggregateId 聚合根ID
   * @param commandType 命令类型
   * @param options 命令选项
   */
  constructor(
    aggregateId: string,
    commandType: string,
    options: {
      commandId?: string;
      correlationId?: string;
      userId?: string;
      timestamp?: Date;
      version?: string;
      metadata?: Record<string, unknown>;
    } = {},
  ) {
    super();

    this.commandId = options.commandId || EntityId.generate().toString();
    this.aggregateId = aggregateId;
    this.commandType = commandType;
    this.correlationId = options.correlationId;
    this.userId = options.userId;
    this.timestamp = options.timestamp || new Date();
    this.version = options.version || "1.0.0";
    this.metadata = options.metadata;
  }

  /**
   * 获取命令摘要
   * @returns 命令摘要
   */
  public getSummary(): Record<string, unknown> {
    return {
      commandId: this.commandId,
      aggregateId: this.aggregateId,
      commandType: this.commandType,
      correlationId: this.correlationId,
      userId: this.userId,
      timestamp: this.timestamp,
      version: this.version,
      hasMetadata: !!this.metadata,
    };
  }

  /**
   * 序列化命令数据
   * @returns 序列化后的数据
   */
  public toJSON(): Record<string, unknown> {
    return {
      commandId: this.commandId,
      aggregateId: this.aggregateId,
      commandType: this.commandType,
      correlationId: this.correlationId,
      userId: this.userId,
      timestamp: this.timestamp?.toISOString(),
      version: this.version,
      metadata: this.metadata,
    };
  }

  /**
   * 克隆命令对象
   * @returns 新的命令对象实例
   */
  public abstract clone(): BaseCommand<TResult>;
}
