/**
 * @fileoverview 部门持久化实体
 * @description 部门聚合根的数据库持久化表示
 */

import { Entity, Property, Index } from "@mikro-orm/core";
import { TenantIsolatedPersistenceEntity } from "@hl8/infrastructure-kernel";

/**
 * 部门持久化实体
 * @description 部门聚合根在数据库中的持久化表示
 * @note 部门是租户隔离的实体，需要继承TenantIsolatedPersistenceEntity
 */
@Entity({ tableName: "iam_departments" })
export class DepartmentPersistenceEntity extends TenantIsolatedPersistenceEntity {
  /**
   * 组织ID（在租户内，部门属于组织）
   * @description 覆盖基类的可选organizationId，使其成为必需字段
   */
  @Index()
  @Property({ type: "uuid" })
  declare organizationId: string; // 使用 declare 覆盖基类的可选属性

  /**
   * 父部门ID（可为空，根部门没有父部门）
   */
  @Index()
  @Property({ type: "uuid", nullable: true })
  parentDepartmentId: string | null = null;

  /**
   * 部门名称（在组织内唯一）
   */
  @Index()
  @Property({ type: "string", length: 100 })
  name!: string;

  /**
   * 层级深度（从1开始）
   */
  @Index()
  @Property({ type: "integer", default: 1 })
  level: number = 1;

  /**
   * 部门路径（如：/1/2/3）
   */
  @Index()
  @Property({ type: "string", length: 500 })
  path!: string;

  /**
   * 是否根部门
   */
  @Index()
  @Property({ type: "boolean", default: false })
  isRoot = false;
}
