/**
 * @fileoverview 测试实体定义
 * @description 为集成测试提供测试用的实体类
 */

import { Entity, Property } from "@mikro-orm/core";
import { BaseEntity } from "../../src/entities/base/base-entity.js";
import { TenantIsolatedPersistenceEntity } from "../../src/entities/base/tenant-isolated-persistence-entity.js";

/**
 * 简单的测试实体（兼容MongoDB和PostgreSQL）
 * @description 用于基础仓储测试
 */
@Entity({ tableName: "test_entities", collection: "test_entities" })
export class TestEntity extends BaseEntity {
  @Property({ type: "string" })
  name!: string;

  @Property({ type: "string", nullable: true })
  description?: string;
}

/**
 * 租户隔离测试实体（兼容MongoDB和PostgreSQL）
 * @description 用于租户隔离仓储测试
 */

@Entity({
  tableName: "test_tenant_entities",
  collection: "test_tenant_entities",
})
export class TestTenantEntity extends TenantIsolatedPersistenceEntity {
  @Property({ type: "string" })
  name!: string;

  @Property({ type: "string", nullable: true })
  description?: string;
}
