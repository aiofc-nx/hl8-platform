/**
 * @fileoverview 租户持久化实体
 * @description 租户聚合根的数据库持久化表示
 */

import { Entity, Property, Index, Unique } from "@mikro-orm/core";
import { BaseEntity } from "@hl8/infrastructure-kernel";

/**
 * 租户类型枚举（持久化层）
 */
export enum TenantTypeEnum {
  TRIAL = "TRIAL",
  BASIC = "BASIC",
  PROFESSIONAL = "PROFESSIONAL",
  ENTERPRISE = "ENTERPRISE",
}

/**
 * 租户状态枚举（持久化层）
 */
export enum TenantStatusEnum {
  TRIAL = "TRIAL",
  ACTIVE = "ACTIVE",
  SUSPENDED = "SUSPENDED",
  EXPIRED = "EXPIRED",
  DISABLED = "DISABLED",
  DELETED = "DELETED",
}

/**
 * 隔离策略枚举（持久化层）
 */
export enum IsolationStrategyEnum {
  ROW_LEVEL_SECURITY = "ROW_LEVEL_SECURITY",
}

/**
 * 租户持久化实体
 * @description 租户聚合根在数据库中的持久化表示
 * @note 租户是平台级别的实体，不需要租户隔离
 */
@Entity({ tableName: "iam_tenants" })
export class TenantPersistenceEntity extends BaseEntity {
  /**
   * 租户代码（唯一索引）
   */
  @Index()
  @Unique()
  @Property({ type: "string", length: 20 })
  code!: string;

  /**
   * 租户名称
   */
  @Property({ type: "string", length: 100 })
  name!: string;

  /**
   * 租户域名（唯一索引）
   */
  @Index()
  @Unique()
  @Property({ type: "string", length: 253 })
  domain!: string;

  /**
   * 租户类型
   */
  @Index()
  @Property({
    type: "string",
    default: TenantTypeEnum.TRIAL,
  })
  type: TenantTypeEnum = TenantTypeEnum.TRIAL;

  /**
   * 租户状态
   */
  @Index()
  @Property({
    type: "string",
    default: TenantStatusEnum.TRIAL,
  })
  status: TenantStatusEnum = TenantStatusEnum.TRIAL;

  /**
   * 隔离策略
   */
  @Property({
    type: "string",
    default: IsolationStrategyEnum.ROW_LEVEL_SECURITY,
  })
  isolationStrategy: IsolationStrategyEnum =
    IsolationStrategyEnum.ROW_LEVEL_SECURITY;

  /**
   * 创建者用户ID
   */
  @Property({ type: "string" })
  createdBy!: string;

  /**
   * 试用期结束时间
   */
  @Property({ type: "date", nullable: true })
  trialEndsAt: Date | null = null;
}
