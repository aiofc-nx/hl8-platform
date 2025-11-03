/**
 * @fileoverview 实体映射器集成测试
 * @description 验证实体映射器在实际使用场景中的转换功能
 */

import { describe, it, expect, beforeEach } from "@jest/globals";
import { EntityMapper } from "../../src/mappers/entity-mapper.js";
import {
  TenantIsolatedEntity,
  EntityId,
  TenantId,
  OrganizationId,
  DepartmentId,
  AuditInfo,
} from "@hl8/domain-kernel";
import { TenantIsolatedPersistenceEntity } from "../../src/entities/base/tenant-isolated-persistence-entity.js";
import { Entity as MikroEntity, Property } from "@mikro-orm/core";
import { MappingConfig } from "../../src/mappers/mapping-config.js";

/**
 * 测试用的领域实体（包含复杂业务属性）
 */
class ComplexDomainEntity extends TenantIsolatedEntity {
  public name: string = "";
  public description?: string;
  public tags: string[] = [];
  public metadata: Record<string, unknown> = {};

  constructor(
    tenantId: TenantId,
    organizationId?: OrganizationId,
    departmentId?: DepartmentId,
    id?: EntityId,
    auditInfo?: AuditInfo,
    name: string = "",
    description?: string,
    tags: string[] = [],
    metadata: Record<string, unknown> = {},
  ) {
    super(tenantId, organizationId, departmentId, id, auditInfo);
    this.name = name;
    this.description = description;
    this.tags = tags;
    this.metadata = metadata;
  }

  public clone(): TenantIsolatedEntity {
    return new ComplexDomainEntity(
      this.tenantId,
      this.organizationId,
      this.departmentId,
      this.id,
      this.auditInfo,
      this.name,
      this.description,
      this.tags,
      this.metadata,
    );
  }

  public validateBusinessRules(): boolean {
    return this.name.length >= 0;
  }

  public executeBusinessLogic(_operation: string, _params: unknown): unknown {
    return { success: false };
  }
}

/**
 * 测试用的持久化实体（包含复杂属性）
 */
@MikroEntity()
class ComplexPersistenceEntity extends TenantIsolatedPersistenceEntity {
  @Property()
  name!: string;

  @Property({ nullable: true })
  description?: string;

  @Property({ type: "json" })
  tags: string[] = [];

  @Property({ type: "json" })
  metadata: Record<string, unknown> = {};
}

describe("EntityMapper 集成测试", () => {
  let mapper: EntityMapper<ComplexDomainEntity, ComplexPersistenceEntity>;
  let config: MappingConfig<ComplexDomainEntity, ComplexPersistenceEntity>;

  beforeEach(() => {
    config = {
      autoMap: true,
      domainEntityFactory: (data) => {
        const tenantId = (data as any)._tenantId as TenantId;
        const orgId = (data as any)._organizationId as
          | OrganizationId
          | undefined;
        const deptId = (data as any)._departmentId as DepartmentId | undefined;
        const id = (data as any)._id as EntityId | undefined;
        const auditInfo = (data as any)._auditInfo as AuditInfo | undefined;
        const name = ((data as any).name as string) || "";
        const description = (data as any).description as string | undefined;
        const tags = ((data as any).tags as string[]) || [];
        const metadata =
          ((data as any).metadata as Record<string, unknown>) || {};
        return new ComplexDomainEntity(
          tenantId,
          orgId,
          deptId,
          id,
          auditInfo,
          name,
          description,
          tags,
          metadata,
        );
      },
      persistenceEntityFactory: (data) => {
        const entity = new ComplexPersistenceEntity();
        Object.assign(entity, data);
        return entity;
      },
    };

    mapper = new EntityMapper(config);
  });

  describe("复杂实体映射", () => {
    it("应该完整保留所有字段在往返转换中", () => {
      const tenantId = TenantId.generate();
      const orgId = new OrganizationId(tenantId);
      const deptId = new DepartmentId(orgId);

      // 创建领域实体
      const originalDomain = new ComplexDomainEntity(
        tenantId,
        orgId,
        deptId,
        undefined,
        undefined,
        "Test Entity",
        "Test Description",
        ["tag1", "tag2"],
        { key1: "value1", key2: 123 },
      );

      // 转换为持久化实体
      const persistence = mapper.toPersistence(originalDomain);

      // 验证持久化实体
      expect(persistence.id).toBe(originalDomain.id.value);
      expect(persistence.tenantId).toBe(originalDomain.tenantId.value);
      expect(persistence.organizationId).toBe(
        originalDomain.organizationId?.value,
      );
      expect(persistence.departmentId).toBe(originalDomain.departmentId?.value);
      expect(persistence.name).toBe(originalDomain.name);
      expect(persistence.description).toBe(originalDomain.description);
      expect(persistence.tags).toEqual(originalDomain.tags);
      expect(persistence.metadata).toEqual(originalDomain.metadata);

      // 转换回领域实体
      const restoredDomain = mapper.toDomain(persistence);

      // 验证领域实体
      expect(restoredDomain.id.value).toBe(originalDomain.id.value);
      expect(restoredDomain.tenantId.value).toBe(originalDomain.tenantId.value);
      expect(restoredDomain.organizationId?.value).toBe(
        originalDomain.organizationId?.value,
      );
      expect(restoredDomain.departmentId?.value).toBe(
        originalDomain.departmentId?.value,
      );
      expect((restoredDomain as any).name).toBe(originalDomain.name);
      expect((restoredDomain as any).description).toBe(
        originalDomain.description,
      );
      expect((restoredDomain as any).tags).toEqual(originalDomain.tags);
      expect((restoredDomain as any).metadata).toEqual(originalDomain.metadata);
    });

    it("应该正确处理可选字段", () => {
      const tenantId = TenantId.generate();

      // 创建只有必需字段的领域实体
      const domain = new ComplexDomainEntity(
        tenantId,
        undefined,
        undefined,
        undefined,
        undefined,
        "Test",
      );

      const persistence = mapper.toPersistence(domain);

      expect(persistence.name).toBe("Test");
      expect(persistence.description).toBeUndefined();
      expect(persistence.organizationId).toBeNull();
      expect(persistence.departmentId).toBeNull();

      const restoredDomain = mapper.toDomain(persistence);

      expect((restoredDomain as any).name).toBe("Test");
      expect((restoredDomain as any).description).toBeUndefined();
      expect(restoredDomain.organizationId).toBeUndefined();
      expect(restoredDomain.departmentId).toBeUndefined();
    });

    it("应该正确处理数组和对象字段", () => {
      const tenantId = TenantId.generate();
      const domain = new ComplexDomainEntity(
        tenantId,
        undefined,
        undefined,
        undefined,
        undefined,
        "Test",
        undefined,
        ["a", "b", "c"],
        { nested: { key: "value" } },
      );

      const persistence = mapper.toPersistence(domain);

      expect(persistence.tags).toEqual(["a", "b", "c"]);
      expect(persistence.metadata).toEqual({ nested: { key: "value" } });

      const restoredDomain = mapper.toDomain(persistence);

      expect((restoredDomain as any).tags).toEqual(["a", "b", "c"]);
      expect((restoredDomain as any).metadata).toEqual({
        nested: { key: "value" },
      });
    });
  });

  describe("批量转换集成", () => {
    it("应该正确批量转换多个实体", () => {
      const tenantId = TenantId.generate();

      const domains = [
        new ComplexDomainEntity(
          tenantId,
          undefined,
          undefined,
          undefined,
          undefined,
          "Entity 1",
        ),
        new ComplexDomainEntity(
          tenantId,
          undefined,
          undefined,
          undefined,
          undefined,
          "Entity 2",
        ),
        new ComplexDomainEntity(
          tenantId,
          undefined,
          undefined,
          undefined,
          undefined,
          "Entity 3",
        ),
      ];

      const persistenceList = mapper.toPersistenceList(domains);
      expect(persistenceList).toHaveLength(3);
      expect(persistenceList[0].name).toBe("Entity 1");
      expect(persistenceList[1].name).toBe("Entity 2");
      expect(persistenceList[2].name).toBe("Entity 3");

      const restoredDomains = mapper.toDomainList(persistenceList);
      expect(restoredDomains).toHaveLength(3);
      expect((restoredDomains[0] as any).name).toBe("Entity 1");
      expect((restoredDomains[1] as any).name).toBe("Entity 2");
      expect((restoredDomains[2] as any).name).toBe("Entity 3");
    });
  });
});
