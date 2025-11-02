/**
 * @fileoverview MongoDB租户隔离仓储集成测试
 * @description 验证MikroORMTenantIsolatedRepository在MongoDB上的租户隔离功能
 */

import { MikroORM, EntityManager } from "@mikro-orm/core";
import { MongoDriver } from "@mikro-orm/mongodb";
import { MongoMemoryServer } from "mongodb-memory-server";
import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
} from "@jest/globals";
import { v4 as uuidv4 } from "uuid";
import { MikroORMTenantIsolatedRepository } from "../../src/repositories/tenant-isolated/tenant-isolated-repository.js";
import {
  EntityId,
  TenantId,
  OrganizationId,
  DepartmentId,
  TenantContext,
  BusinessException,
} from "@hl8/domain-kernel";
import { TestTenantEntity } from "../fixtures/test-entities.js";

describe("MongoDB Tenant Isolation Integration Tests", () => {
  let orm: MikroORM;
  let em: EntityManager;
  let mongoServer: MongoMemoryServer;
  let repository: MikroORMTenantIsolatedRepository<TestTenantEntity>;
  let tenant1Id: TenantId;
  let tenant2Id: TenantId;
  let org1Id: OrganizationId;
  let org2Id: OrganizationId;
  let dept1Id: DepartmentId;
  let dept2Id: DepartmentId;

  beforeAll(async () => {
    // 使用MongoDB内存服务器进行测试
    mongoServer = await MongoMemoryServer.create({
      instance: {
        dbName: "test_db",
      },
    });
    const mongoUri = mongoServer.getUri();

    orm = await MikroORM.init({
      driver: MongoDriver,
      dbName: "test_db",
      entities: [TestTenantEntity],
      clientUrl: mongoUri,
      debug: false,
      discovery: {
        disableDynamicFileAccess: true,
        requireEntitiesArray: true,
      },
    });

    em = orm.em.fork();

    repository = new MikroORMTenantIsolatedRepository(em, "TestTenantEntity");

    // 初始化测试数据
    tenant1Id = TenantId.generate();
    tenant2Id = TenantId.generate();
    org1Id = new OrganizationId(tenant1Id);
    org2Id = new OrganizationId(tenant1Id); // 同一个租户下的不同组织
    dept1Id = new DepartmentId(org1Id);
    dept2Id = new DepartmentId(org1Id); // 同一个组织下的不同部门
  }, 60000); // 60秒超时

  afterAll(async () => {
    if (orm) {
      await orm.close();
    }
    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  beforeEach(async () => {
    // 清理所有数据
    if (orm) {
      await em.nativeDelete(TestTenantEntity, {});
    }
  });

  describe("租户隔离基础功能", () => {
    it("应该能够根据租户上下文查找实体", async () => {
      const entityId = uuidv4();
      const entity = new TestTenantEntity();
      entity.id = entityId;
      entity.tenantId = tenant1Id.value;
      entity.name = "Tenant 1 Entity";
      await repository.save(entity);

      const context = new TenantContext(tenant1Id);
      const found = await repository.findByIdWithContext(
        new EntityId(entityId),
        context,
      );

      expect(found).toBeTruthy();
      expect(found!.name).toBe("Tenant 1 Entity");
    });

    it("应该阻止跨租户访问", async () => {
      const entityId = uuidv4();
      const entity = new TestTenantEntity();
      entity.id = entityId;
      entity.tenantId = tenant1Id.value;
      entity.name = "Tenant 1 Entity";
      await repository.save(entity);

      const context = new TenantContext(tenant2Id);

      await expect(
        repository.findByIdWithContext(new EntityId(entityId), context),
      ).rejects.toThrow(BusinessException);
    });

    it("应该能够查找租户下的所有实体", async () => {
      // 创建租户1的两个实体
      const entity1 = new TestTenantEntity();
      entity1.id = uuidv4();
      entity1.tenantId = tenant1Id.value;
      entity1.name = "Entity 1";
      await repository.save(entity1);

      const entity2 = new TestTenantEntity();
      entity2.id = uuidv4();
      entity2.tenantId = tenant1Id.value;
      entity2.name = "Entity 2";
      await repository.save(entity2);

      // 创建租户2的一个实体
      const entity3 = new TestTenantEntity();
      entity3.id = uuidv4();
      entity3.tenantId = tenant2Id.value;
      entity3.name = "Entity 3";
      await repository.save(entity3);

      const context = new TenantContext(tenant1Id);
      const entities = await repository.findByTenant(tenant1Id, context);

      expect(entities).toHaveLength(2);
      expect(entities.map((e) => e.name)).toEqual(
        expect.arrayContaining(["Entity 1", "Entity 2"]),
      );
    });
  });

  describe("组织级隔离", () => {
    it("应该能够根据组织查找实体", async () => {
      const entity1 = new TestTenantEntity();
      entity1.id = uuidv4();
      entity1.tenantId = tenant1Id.value;
      entity1.organizationId = org1Id.value;
      entity1.name = "Org 1 Entity";
      await repository.save(entity1);

      const entity2 = new TestTenantEntity();
      entity2.id = uuidv4();
      entity2.tenantId = tenant1Id.value;
      entity2.organizationId = org2Id.value; // 不同的组织
      entity2.name = "Org 2 Entity";
      await repository.save(entity2);

      const context = new TenantContext(tenant1Id, { organizationId: org1Id });
      const entities = await repository.findByOrganization(org1Id, context);

      expect(entities).toHaveLength(1);
      expect(entities[0].name).toBe("Org 1 Entity");
    });

    it("应该阻止跨组织访问", async () => {
      const entityId = uuidv4();
      const entity = new TestTenantEntity();
      entity.id = entityId;
      entity.tenantId = tenant1Id.value;
      entity.organizationId = org1Id.value;
      entity.name = "Org 1 Entity";
      await repository.save(entity);

      const context = new TenantContext(tenant1Id, { organizationId: org2Id });

      await expect(
        repository.findByOrganization(org1Id, context),
      ).rejects.toThrow(BusinessException);
    });
  });

  describe("部门级隔离", () => {
    it("应该能够根据部门查找实体", async () => {
      const entity1 = new TestTenantEntity();
      entity1.id = uuidv4();
      entity1.tenantId = tenant1Id.value;
      entity1.organizationId = org1Id.value;
      entity1.departmentId = dept1Id.value;
      entity1.name = "Dept 1 Entity";
      await repository.save(entity1);

      const entity2 = new TestTenantEntity();
      entity2.id = uuidv4();
      entity2.tenantId = tenant1Id.value;
      entity2.organizationId = org1Id.value;
      entity2.departmentId = dept2Id.value; // 不同的部门
      entity2.name = "Dept 2 Entity";
      await repository.save(entity2);

      const context = new TenantContext(tenant1Id, {
        organizationId: org1Id,
        departmentId: dept1Id,
      });
      const entities = await repository.findByDepartment(dept1Id, context);

      expect(entities).toHaveLength(1);
      expect(entities[0].name).toBe("Dept 1 Entity");
    });

    it("应该阻止跨部门访问", async () => {
      const entityId = uuidv4();
      const entity = new TestTenantEntity();
      entity.id = entityId;
      entity.tenantId = tenant1Id.value;
      entity.organizationId = org1Id.value;
      entity.departmentId = dept1Id.value;
      entity.name = "Dept 1 Entity";
      await repository.save(entity);

      const context = new TenantContext(tenant1Id, {
        organizationId: org1Id,
        departmentId: dept2Id,
      });

      await expect(
        repository.findByDepartment(dept1Id, context),
      ).rejects.toThrow(BusinessException);
    });
  });

  describe("跨租户访问", () => {
    it("应该允许跨租户访问（如果上下文允许）", async () => {
      const entityId = uuidv4();
      const entity = new TestTenantEntity();
      entity.id = entityId;
      entity.tenantId = tenant1Id.value;
      entity.name = "Tenant 1 Entity";
      await repository.save(entity);

      const context = new TenantContext(tenant2Id, { isCrossTenant: true });

      const found = await repository.findByIdCrossTenant(
        new EntityId(entityId),
        context,
      );

      expect(found).toBeTruthy();
      expect(found!.name).toBe("Tenant 1 Entity");
    });
  });

  describe("统计功能", () => {
    it("应该正确统计租户下的实体数量", async () => {
      // 创建租户1的两个实体
      const entity1 = new TestTenantEntity();
      entity1.id = uuidv4();
      entity1.tenantId = tenant1Id.value;
      entity1.name = "Entity 1";
      await repository.save(entity1);

      const entity2 = new TestTenantEntity();
      entity2.id = uuidv4();
      entity2.tenantId = tenant1Id.value;
      entity2.name = "Entity 2";
      await repository.save(entity2);

      // 创建租户2的一个实体
      const entity3 = new TestTenantEntity();
      entity3.id = uuidv4();
      entity3.tenantId = tenant2Id.value;
      entity3.name = "Entity 3";
      await repository.save(entity3);

      const context = new TenantContext(tenant1Id);
      const count = await repository.countByTenant(tenant1Id, context);

      expect(count).toBe(2);
    });
  });
});
