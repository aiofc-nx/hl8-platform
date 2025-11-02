/**
 * @fileoverview 查询基类
 * @description 基于@nestjs/cqrs官方Query类实现的查询基类
 */

import { Query } from "@nestjs/cqrs";
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsDate,
  IsObject,
  IsArray,
} from "class-validator";
import { Transform } from "class-transformer";
import { EntityId } from "@hl8/domain-kernel";
import type {
  TenantContext,
  TenantId,
  OrganizationId,
  DepartmentId,
} from "@hl8/domain-kernel";

/**
 * 查询基类
 * @description 所有查询都应该继承此类，基于@nestjs/cqrs官方Query类
 * @template TResult 结果类型
 */
export abstract class BaseQuery<TResult = unknown> extends Query<TResult> {
  /** 查询ID */
  @IsNotEmpty()
  @IsString()
  public readonly queryId: string;

  /** 查询类型 */
  @IsNotEmpty()
  @IsString()
  public readonly queryType: string;

  /** 关联ID，用于追踪请求 */
  @IsOptional()
  @IsString()
  public readonly correlationId?: string;

  /** 用户ID，用于权限控制 */
  @IsOptional()
  @IsString()
  public readonly userId?: string;

  /** 查询时间戳 */
  @IsOptional()
  @IsDate()
  @Transform(({ value }) => (value ? new Date(value) : new Date()))
  public readonly timestamp?: Date;

  /** 查询版本 */
  @IsOptional()
  @IsString()
  public readonly version?: string;

  /** 分页参数 */
  @IsOptional()
  @IsObject()
  public readonly pagination?: {
    page: number;
    limit: number;
    offset?: number;
  };

  /** 排序参数 */
  @IsOptional()
  @IsArray()
  public readonly sorting?: Array<{
    field: string;
    direction: "asc" | "desc";
  }>;

  /** 过滤参数 */
  @IsOptional()
  @IsObject()
  public readonly filters?: Record<string, unknown>;

  /** 查询元数据 */
  @IsOptional()
  @IsObject()
  public readonly metadata?: Record<string, unknown>;

  /** 租户上下文（自动注入） */
  @IsOptional()
  public readonly tenantContext?: TenantContext;

  /**
   * 创建查询
   * @param queryType 查询类型
   * @param options 查询选项
   */
  constructor(
    queryType: string,
    options: {
      queryId?: string;
      correlationId?: string;
      userId?: string;
      timestamp?: Date;
      version?: string;
      pagination?: {
        page: number;
        limit: number;
        offset?: number;
      };
      sorting?: Array<{
        field: string;
        direction: "asc" | "desc";
      }>;
      filters?: Record<string, unknown>;
      metadata?: Record<string, unknown>;
      tenantContext?: TenantContext;
    } = {},
  ) {
    super();

    this.queryId = options.queryId || EntityId.generate().toString();
    this.queryType = queryType;
    this.correlationId = options.correlationId;
    this.userId = options.userId;
    this.timestamp = options.timestamp || new Date();
    this.version = options.version || "1.0.0";
    this.pagination = options.pagination;
    this.sorting = options.sorting;
    this.filters = options.filters;
    this.metadata = options.metadata;
    this.tenantContext = options.tenantContext;
  }

  /**
   * 获取租户ID
   * @returns 租户ID或undefined
   */
  public getTenantId(): TenantId | undefined {
    return this.tenantContext?.tenantId;
  }

  /**
   * 获取组织ID
   * @returns 组织ID或undefined
   */
  public getOrganizationId(): OrganizationId | undefined {
    return this.tenantContext?.organizationId;
  }

  /**
   * 获取部门ID
   * @returns 部门ID或undefined
   */
  public getDepartmentId(): DepartmentId | undefined {
    return this.tenantContext?.departmentId;
  }

  /**
   * 验证租户上下文（可重写）
   * @returns 是否有效
   */
  public validateTenantContext(): boolean {
    return this.tenantContext?.validate() ?? false;
  }

  /**
   * 构建租户过滤条件
   * @returns 过滤条件对象
   */
  public buildTenantFilter(): Record<string, unknown> {
    const filter: Record<string, unknown> = {};

    if (this.tenantContext) {
      filter.tenantId = this.tenantContext.tenantId.value;

      if (this.tenantContext.organizationId) {
        filter.organizationId = this.tenantContext.organizationId.value;
      }

      if (this.tenantContext.departmentId) {
        filter.departmentId = this.tenantContext.departmentId.value;
      }
    }

    return filter;
  }

  /**
   * 获取查询摘要
   * @returns 查询摘要
   */
  public getSummary(): Record<string, unknown> {
    return {
      queryId: this.queryId,
      queryType: this.queryType,
      correlationId: this.correlationId,
      userId: this.userId,
      timestamp: this.timestamp,
      version: this.version,
      pagination: this.pagination,
      sorting: this.sorting,
      hasFilters: !!this.filters,
      hasMetadata: !!this.metadata,
      hasTenantContext: !!this.tenantContext,
    };
  }

  /**
   * 序列化查询数据
   * @returns 序列化后的数据
   */
  public toJSON(): Record<string, unknown> {
    return {
      queryId: this.queryId,
      queryType: this.queryType,
      correlationId: this.correlationId,
      userId: this.userId,
      timestamp: this.timestamp?.toISOString(),
      version: this.version,
      pagination: this.pagination,
      sorting: this.sorting,
      filters: this.filters,
      metadata: this.metadata,
      tenantContext: this.tenantContext?.toJSON(),
    };
  }

  /**
   * 克隆查询对象
   * @returns 新的查询对象实例
   */
  public abstract clone(): BaseQuery<TResult>;
}
