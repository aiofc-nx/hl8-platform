/**
 * @fileoverview 组织持久化实体
 * @description 组织聚合根的数据库持久化表示
 */

import { Entity, Property, Index } from "@mikro-orm/core";
import { TenantIsolatedPersistenceEntity } from "@hl8/infrastructure-kernel";

/**
 * 组织类型枚举（持久化层）
 */
export enum OrganizationTypeEnum {
  COMMITTEE = "COMMITTEE",
  PROJECT_TEAM = "PROJECT_TEAM",
  FUNCTIONAL_DEPARTMENT = "FUNCTIONAL_DEPARTMENT",
  OTHER = "OTHER",
}

/**
 * 组织持久化实体
 * @description 组织聚合根在数据库中的持久化表示
 * @note 组织是租户隔离的实体，需要继承TenantIsolatedPersistenceEntity
 */
@Entity({ tableName: "iam_organizations" })
export class OrganizationPersistenceEntity extends TenantIsolatedPersistenceEntity {
  /**
   * 组织名称（在租户内唯一）
   */
  @Index()
  @Property({ type: "string", length: 100 })
  name!: string;

  /**
   * 组织描述
   */
  @Property({ type: "text", nullable: true })
  description: string | null = null;

  /**
   * 组织类型
   */
  @Index()
  @Property({
    type: "string",
    default: OrganizationTypeEnum.OTHER,
  })
  type: OrganizationTypeEnum = OrganizationTypeEnum.OTHER;

  /**
   * 是否默认组织
   */
  @Index()
  @Property({ type: "boolean", default: false })
  isDefault = false;
}
