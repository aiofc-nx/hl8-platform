/**
 * @fileoverview 实体映射器单元测试
 * @description 验证 EntityMapper 的转换功能和映射配置
 */

import { describe, it, expect, beforeEach } from "@jest/globals";
import { EntityMapper } from "./entity-mapper.js";
import {
  TenantIsolatedEntity,
  EntityId,
  TenantId,
  OrganizationId,
  DepartmentId,
  AuditInfo,
} from "@hl8/domain-kernel";
import { TenantIsolatedPersistenceEntity } from "../entities/base/tenant-isolated-persistence-entity.js";
import { Entity as MikroEntity, Property } from "@mikro-orm/core";
import { MappingConfig } from "./mapping-config.js";

/**
 * 测试用的领域实体
 */
class TestDomainEntity extends TenantIsolatedEntity {
  public name: string = "";

  constructor(
    tenantId: TenantId,
    organizationId?: OrganizationId,
    departmentId?: DepartmentId,
    id?: EntityId,
    auditInfo?: AuditInfo,
    name: string = "",
  ) {
    super(tenantId, organizationId, departmentId, id, auditInfo);
    this.name = name;
  }

  public clone(): TenantIsolatedEntity {
    return new TestDomainEntity(
      this.tenantId,
      this.organizationId,
      this.departmentId,
      this.id,
      this.auditInfo,
      this.name,
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
 * 测试用的持久化实体
 */
@MikroEntity()
class TestPersistenceEntity extends TenantIsolatedPersistenceEntity {
  @Property()
  name!: string;
}

describe("EntityMapper", () => {
  let mapper: EntityMapper<TestDomainEntity, TestPersistenceEntity>;
  let config: MappingConfig<TestDomainEntity, TestPersistenceEntity>;

  beforeEach(() => {
    // 创建映射配置
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
        return new TestDomainEntity(
          tenantId,
          orgId,
          deptId,
          id,
          auditInfo,
          name,
        );
      },
      persistenceEntityFactory: (data) => {
        const entity = new TestPersistenceEntity();
        Object.assign(entity, data);
        return entity;
      },
    };

    mapper = new EntityMapper(config);
  });

  describe("toDomain", () => {
    it("应该将持久化实体转换为领域实体", () => {
      const tenantId = TenantId.generate();
      const persistence = new TestPersistenceEntity();
      persistence.id = EntityId.generate().value;
      persistence.tenantId = tenantId.value;
      persistence.name = "Test Entity";
      persistence.createdAt = new Date();
      persistence.updatedAt = new Date();
      persistence.version = 1;

      const domain = mapper.toDomain(persistence);

      expect(domain).toBeDefined();
      expect(domain.id.value).toBe(persistence.id);
      expect(domain.tenantId.value).toBe(persistence.tenantId);
      expect((domain as any).name).toBe(persistence.name);
    });

    it("应该映射租户隔离字段", () => {
      const tenantId = TenantId.generate();
      const orgId = new OrganizationId(tenantId);
      const persistence = new TestPersistenceEntity();
      persistence.id = EntityId.generate().value;
      persistence.tenantId = tenantId.value;
      persistence.organizationId = orgId.value;
      persistence.name = "Test";

      const domain = mapper.toDomain(persistence);

      expect(domain.tenantId.value).toBe(persistence.tenantId);
      expect(domain.organizationId?.value).toBe(persistence.organizationId);
    });
  });

  describe("toPersistence", () => {
    it("应该将领域实体转换为持久化实体", () => {
      const tenantId = TenantId.generate();
      const domain = new TestDomainEntity(
        tenantId,
        undefined,
        undefined,
        undefined,
        undefined,
        "Test Entity",
      );

      const persistence = mapper.toPersistence(domain);

      expect(persistence).toBeDefined();
      expect(persistence.id).toBe(domain.id.value);
      expect(persistence.tenantId).toBe(domain.tenantId.value);
      expect(persistence.name).toBe((domain as any).name);
    });

    it("应该映射租户隔离字段", () => {
      const tenantId = TenantId.generate();
      const orgId = new OrganizationId(tenantId);
      const domain = new TestDomainEntity(
        tenantId,
        orgId,
        undefined,
        undefined,
        undefined,
        "Test",
      );

      const persistence = mapper.toPersistence(domain);

      expect(persistence.tenantId).toBe(domain.tenantId.value);
      expect(persistence.organizationId).toBe(domain.organizationId?.value);
    });
  });

  describe("批量转换", () => {
    it("应该批量转换持久化实体列表为领域实体列表", () => {
      const tenantId = TenantId.generate();
      const persistence1 = new TestPersistenceEntity();
      persistence1.id = EntityId.generate().value;
      persistence1.tenantId = tenantId.value;
      persistence1.name = "Entity 1";

      const persistence2 = new TestPersistenceEntity();
      persistence2.id = EntityId.generate().value;
      persistence2.tenantId = tenantId.value;
      persistence2.name = "Entity 2";

      const domainList = mapper.toDomainList([persistence1, persistence2]);

      expect(domainList).toHaveLength(2);
      expect((domainList[0] as any).name).toBe("Entity 1");
      expect((domainList[1] as any).name).toBe("Entity 2");
    });

    it("应该批量转换领域实体列表为持久化实体列表", () => {
      const tenantId = TenantId.generate();
      const domain1 = new TestDomainEntity(
        tenantId,
        undefined,
        undefined,
        undefined,
        undefined,
        "Entity 1",
      );
      const domain2 = new TestDomainEntity(
        tenantId,
        undefined,
        undefined,
        undefined,
        undefined,
        "Entity 2",
      );

      const persistenceList = mapper.toPersistenceList([domain1, domain2]);

      expect(persistenceList).toHaveLength(2);
      expect(persistenceList[0].name).toBe("Entity 1");
      expect(persistenceList[1].name).toBe("Entity 2");
    });
  });
});
