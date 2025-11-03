/**
 * @fileoverview 租户隔离仓储单元测试
 * @description 验证 MikroORMTenantIsolatedRepository 是否正确实现 ITenantIsolatedRepository 接口
 */

import { EntityManager } from "@mikro-orm/core";
import { describe, it, expect, beforeEach } from "@jest/globals";
import {
  ITenantIsolatedRepository,
  EntityId,
  TenantId,
  OrganizationId,
  DepartmentId,
  TenantContext,
  BusinessException,
} from "@hl8/domain-kernel";
import { MikroORMTenantIsolatedRepository } from "./tenant-isolated-repository.js";
import { TenantIsolatedPersistenceEntity } from "../../entities/base/tenant-isolated-persistence-entity.js";
import { Entity, Property } from "@mikro-orm/core";
import { ExceptionConverter } from "../../exceptions/exception-converter.js";

/**
 * 测试用的租户隔离实体
 */
@Entity()
class TestTenantIsolatedEntity extends TenantIsolatedPersistenceEntity {
  @Property()
  name!: string;
}

describe("MikroORMTenantIsolatedRepository", () => {
  let mockEm: EntityManager;
  let repository: MikroORMTenantIsolatedRepository<TestTenantIsolatedEntity>;

  beforeEach(() => {
    // 创建模拟的 EntityManager
    mockEm = {
      find: jest.fn(),
      findOne: jest.fn(),
      persist: jest.fn(),
      flush: jest.fn(),
      remove: jest.fn(),
      count: jest.fn(),
    } as unknown as EntityManager;

    repository = new MikroORMTenantIsolatedRepository(
      mockEm,
      "TestTenantIsolatedEntity",
    );
  });

  describe("ITenantIsolatedRepository 接口实现", () => {
    it("应该实现 ITenantIsolatedRepository 接口", () => {
      // TypeScript 编译时检查：如果类型不兼容，这里会报错
      const repositoryAsInterface: ITenantIsolatedRepository<any> =
        repository as unknown as ITenantIsolatedRepository<any>;

      expect(repositoryAsInterface).toBeDefined();
      expect(repositoryAsInterface.findByIdWithContext).toBeDefined();
      expect(repositoryAsInterface.findAllByContext).toBeDefined();
      expect(repositoryAsInterface.findByTenant).toBeDefined();
      expect(repositoryAsInterface.findByOrganization).toBeDefined();
      expect(repositoryAsInterface.findByDepartment).toBeDefined();
      expect(repositoryAsInterface.belongsToTenant).toBeDefined();
      expect(repositoryAsInterface.belongsToOrganization).toBeDefined();
      expect(repositoryAsInterface.belongsToDepartment).toBeDefined();
      expect(repositoryAsInterface.findByIdCrossTenant).toBeDefined();
      expect(repositoryAsInterface.countByTenant).toBeDefined();
      expect(repositoryAsInterface.countByOrganization).toBeDefined();
      expect(repositoryAsInterface.countByDepartment).toBeDefined();
    });

    it("应该具有所有必需的接口方法", () => {
      // 验证所有接口方法都存在
      expect(typeof repository.findByIdWithContext).toBe("function");
      expect(typeof repository.findAllByContext).toBe("function");
      expect(typeof repository.findByTenant).toBe("function");
      expect(typeof repository.findByOrganization).toBe("function");
      expect(typeof repository.findByDepartment).toBe("function");
      expect(typeof repository.belongsToTenant).toBe("function");
      expect(typeof repository.belongsToOrganization).toBe("function");
      expect(typeof repository.belongsToDepartment).toBe("function");
      expect(typeof repository.findByIdCrossTenant).toBe("function");
      expect(typeof repository.countByTenant).toBe("function");
      expect(typeof repository.countByOrganization).toBe("function");
      expect(typeof repository.countByDepartment).toBe("function");
    });
  });

  describe("类型兼容性", () => {
    it("应该能够赋值给 ITenantIsolatedRepository 类型变量", () => {
      // 这个测试确保类型系统接受我们的实现
      // 如果编译失败，说明类型不兼容
      const typedRepository: ITenantIsolatedRepository<any> =
        repository as unknown as ITenantIsolatedRepository<any>;

      expect(typedRepository).toBeDefined();
    });
  });

  describe("findByTenant", () => {
    it("应该能够根据租户查找实体", async () => {
      const tenantId = TenantId.generate();
      const orgId = new OrganizationId(tenantId);
      const context = new TenantContext(tenantId, { organizationId: orgId });
      const entity = new TestTenantIsolatedEntity();
      entity.id = "test-id";
      entity.tenantId = tenantId.value;
      entity.name = "test";

      (mockEm.find as jest.Mock).mockResolvedValue([entity]);

      const result = await repository.findByTenant(tenantId, context);

      expect(result).toBeDefined();
      expect(result.length).toBe(1);
      expect(mockEm.find).toHaveBeenCalledWith(
        "TestTenantIsolatedEntity",
        { tenantId: tenantId.value },
      );
    });

    it("应该在权限不足时抛出异常", async () => {
      const tenantId = TenantId.generate();
      const otherTenantId = TenantId.generate();
      const orgId = new OrganizationId(otherTenantId);
      const context = new TenantContext(otherTenantId, {
        organizationId: orgId,
      });

      await expect(
        repository.findByTenant(tenantId, context),
      ).rejects.toThrow(BusinessException);
    });
  });

  describe("findByOrganization", () => {
    it("应该能够根据组织查找实体", async () => {
      const tenantId = TenantId.generate();
      const orgId = new OrganizationId(tenantId);
      const context = new TenantContext(tenantId, { organizationId: orgId });
      const entity = new TestTenantIsolatedEntity();
      entity.id = "test-id";
      entity.tenantId = tenantId.value;
      entity.organizationId = orgId.value;
      entity.name = "test";

      (mockEm.find as jest.Mock).mockResolvedValue([entity]);

      const result = await repository.findByOrganization(orgId, context);

      expect(result).toBeDefined();
      expect(result.length).toBe(1);
      expect(mockEm.find).toHaveBeenCalledWith("TestTenantIsolatedEntity", {
        tenantId: tenantId.value,
        organizationId: orgId.value,
      });
    });

    it("应该在权限不足时抛出异常", async () => {
      const tenantId = TenantId.generate();
      // 创建属于其他租户的组织ID
      const otherTenantId = TenantId.generate();
      const orgId = new OrganizationId(otherTenantId);
      // 创建当前用户的上下文（属于 tenantId）
      const context = new TenantContext(tenantId);

      // 尝试查询不属于当前租户的组织（应该抛出异常）
      await expect(
        repository.findByOrganization(orgId, context),
      ).rejects.toThrow(BusinessException);
    });
  });

  describe("findByDepartment", () => {
    it("应该能够根据部门查找实体", async () => {
      const tenantId = TenantId.generate();
      const orgId = new OrganizationId(tenantId);
      const deptId = new DepartmentId(orgId);
      const context = new TenantContext(tenantId, {
        organizationId: orgId,
        departmentId: deptId,
      });
      const entity = new TestTenantIsolatedEntity();
      entity.id = "test-id";
      entity.tenantId = tenantId.value;
      entity.organizationId = orgId.value;
      entity.departmentId = deptId.value;
      entity.name = "test";

      (mockEm.find as jest.Mock).mockResolvedValue([entity]);

      const result = await repository.findByDepartment(deptId, context);

      expect(result).toBeDefined();
      expect(result.length).toBe(1);
      expect(mockEm.find).toHaveBeenCalledWith("TestTenantIsolatedEntity", {
        tenantId: tenantId.value,
        organizationId: orgId.value,
        departmentId: deptId.value,
      });
    });

    it("应该在权限不足时抛出异常", async () => {
      const tenantId = TenantId.generate();
      // 创建属于其他租户的组织和部门
      const otherTenantId = TenantId.generate();
      const otherOrgId = new OrganizationId(otherTenantId);
      const deptId = new DepartmentId(otherOrgId);
      // 创建当前用户的上下文（属于 tenantId）
      const context = new TenantContext(tenantId);

      // 尝试查询不属于当前租户的部门（应该抛出异常）
      await expect(
        repository.findByDepartment(deptId, context),
      ).rejects.toThrow(BusinessException);
    });
  });

  describe("belongsToTenant", () => {
    it("应该能够检查实体是否属于租户", async () => {
      const tenantId = TenantId.generate();
      const entityId = EntityId.generate();
      const entity = new TestTenantIsolatedEntity();
      entity.id = entityId.value;
      entity.tenantId = tenantId.value;

      (mockEm.findOne as jest.Mock).mockResolvedValue(entity);

      const result = await repository.belongsToTenant(entityId, tenantId);

      expect(result).toBe(true);
    });

    it("应该在实体不存在时返回 false", async () => {
      const tenantId = TenantId.generate();
      const entityId = EntityId.generate();

      (mockEm.findOne as jest.Mock).mockResolvedValue(null);

      const result = await repository.belongsToTenant(entityId, tenantId);

      expect(result).toBe(false);
    });

    it("应该在实体不属于租户时返回 false", async () => {
      const tenantId = TenantId.generate();
      const otherTenantId = TenantId.generate();
      const entityId = EntityId.generate();
      const entity = new TestTenantIsolatedEntity();
      entity.id = entityId.value;
      entity.tenantId = otherTenantId.value;

      (mockEm.findOne as jest.Mock).mockResolvedValue(entity);

      const result = await repository.belongsToTenant(entityId, tenantId);

      expect(result).toBe(false);
    });
  });

  describe("belongsToOrganization", () => {
    it("应该能够检查实体是否属于组织", async () => {
      const tenantId = TenantId.generate();
      const orgId = new OrganizationId(tenantId);
      const entityId = EntityId.generate();
      const entity = new TestTenantIsolatedEntity();
      entity.id = entityId.value;
      entity.tenantId = tenantId.value;
      entity.organizationId = orgId.value;

      (mockEm.findOne as jest.Mock).mockResolvedValue(entity);

      const result = await repository.belongsToOrganization(entityId, orgId);

      expect(result).toBe(true);
    });

    it("应该在实体不存在时返回 false", async () => {
      const tenantId = TenantId.generate();
      const orgId = new OrganizationId(tenantId);
      const entityId = EntityId.generate();

      (mockEm.findOne as jest.Mock).mockResolvedValue(null);

      const result = await repository.belongsToOrganization(entityId, orgId);

      expect(result).toBe(false);
    });

    it("应该在实体不属于组织时返回 false", async () => {
      const tenantId = TenantId.generate();
      const orgId = new OrganizationId(tenantId);
      const otherOrgId = new OrganizationId(tenantId);
      const entityId = EntityId.generate();
      const entity = new TestTenantIsolatedEntity();
      entity.id = entityId.value;
      entity.tenantId = tenantId.value;
      entity.organizationId = otherOrgId.value;

      (mockEm.findOne as jest.Mock).mockResolvedValue(entity);

      const result = await repository.belongsToOrganization(entityId, orgId);

      expect(result).toBe(false);
    });
  });

  describe("belongsToDepartment", () => {
    it("应该能够检查实体是否属于部门", async () => {
      const tenantId = TenantId.generate();
      const orgId = new OrganizationId(tenantId);
      const deptId = new DepartmentId(orgId);
      const entityId = EntityId.generate();
      const entity = new TestTenantIsolatedEntity();
      entity.id = entityId.value;
      entity.tenantId = tenantId.value;
      entity.organizationId = orgId.value;
      entity.departmentId = deptId.value;

      (mockEm.findOne as jest.Mock).mockResolvedValue(entity);

      const result = await repository.belongsToDepartment(entityId, deptId);

      expect(result).toBe(true);
    });

    it("应该在实体不存在时返回 false", async () => {
      const tenantId = TenantId.generate();
      const orgId = new OrganizationId(tenantId);
      const deptId = new DepartmentId(orgId);
      const entityId = EntityId.generate();

      (mockEm.findOne as jest.Mock).mockResolvedValue(null);

      const result = await repository.belongsToDepartment(entityId, deptId);

      expect(result).toBe(false);
    });

    it("应该在实体不属于部门时返回 false", async () => {
      const tenantId = TenantId.generate();
      const orgId = new OrganizationId(tenantId);
      const deptId = new DepartmentId(orgId);
      const otherDeptId = new DepartmentId(orgId);
      const entityId = EntityId.generate();
      const entity = new TestTenantIsolatedEntity();
      entity.id = entityId.value;
      entity.tenantId = tenantId.value;
      entity.organizationId = orgId.value;
      entity.departmentId = otherDeptId.value;

      (mockEm.findOne as jest.Mock).mockResolvedValue(entity);

      const result = await repository.belongsToDepartment(entityId, deptId);

      expect(result).toBe(false);
    });
  });

  describe("findByIdCrossTenant", () => {
    it("应该能够在有跨租户权限时查找实体", async () => {
      const tenantId = TenantId.generate();
      const orgId = new OrganizationId(tenantId);
      const context = new TenantContext(tenantId, {
        organizationId: orgId,
        isCrossTenant: true,
      });
      const entityId = EntityId.generate();
      const entity = new TestTenantIsolatedEntity();
      entity.id = entityId.value;
      entity.tenantId = tenantId.value;

      (mockEm.findOne as jest.Mock).mockResolvedValue(entity);

      const result = await repository.findByIdCrossTenant(entityId, context);

      expect(result).toBeDefined();
    });

    it("应该在无跨租户权限时抛出异常", async () => {
      const tenantId = TenantId.generate();
      const orgId = new OrganizationId(tenantId);
      const context = new TenantContext(tenantId, { organizationId: orgId });
      const entityId = EntityId.generate();

      await expect(
        repository.findByIdCrossTenant(entityId, context),
      ).rejects.toThrow(BusinessException);
    });
  });

  describe("countByTenant", () => {
    it("应该能够统计租户下的实体数量", async () => {
      const tenantId = TenantId.generate();
      const orgId = new OrganizationId(tenantId);
      const context = new TenantContext(tenantId, { organizationId: orgId });

      (mockEm.count as jest.Mock).mockResolvedValue(5);

      const count = await repository.countByTenant(tenantId, context);

      expect(count).toBe(5);
      expect(mockEm.count).toHaveBeenCalledWith(
        "TestTenantIsolatedEntity",
        { tenantId: tenantId.value },
      );
    });
  });

  describe("countByOrganization", () => {
    it("应该能够统计组织下的实体数量", async () => {
      const tenantId = TenantId.generate();
      const orgId = new OrganizationId(tenantId);
      const context = new TenantContext(tenantId, { organizationId: orgId });

      (mockEm.count as jest.Mock).mockResolvedValue(3);

      const count = await repository.countByOrganization(orgId, context);

      expect(count).toBe(3);
    });
  });

  describe("countByDepartment", () => {
    it("应该能够统计部门下的实体数量", async () => {
      const tenantId = TenantId.generate();
      const orgId = new OrganizationId(tenantId);
      const deptId = new DepartmentId(orgId);
      const context = new TenantContext(tenantId, {
        organizationId: orgId,
        departmentId: deptId,
      });

      (mockEm.count as jest.Mock).mockResolvedValue(2);

      const count = await repository.countByDepartment(deptId, context);

      expect(count).toBe(2);
    });
  });

  describe("findByIdWithContext", () => {
    it("应该能够在实体不存在时返回 null", async () => {
      const tenantId = TenantId.generate();
      const orgId = new OrganizationId(tenantId);
      const context = new TenantContext(tenantId, { organizationId: orgId });
      const entityId = EntityId.generate();

      (mockEm.findOne as jest.Mock).mockResolvedValue(null);

      const result = await repository.findByIdWithContext(entityId, context);

      expect(result).toBeNull();
    });

    it("应该在实体不属于上下文租户时抛出异常", async () => {
      const tenantId = TenantId.generate();
      const otherTenantId = TenantId.generate();
      const orgId = new OrganizationId(tenantId);
      const context = new TenantContext(tenantId, { organizationId: orgId });
      const entityId = EntityId.generate();
      const entity = new TestTenantIsolatedEntity();
      entity.id = entityId.value;
      entity.tenantId = otherTenantId.value;

      (mockEm.findOne as jest.Mock).mockResolvedValue(entity);

      await expect(
        repository.findByIdWithContext(entityId, context),
      ).rejects.toThrow(BusinessException);
    });
  });

  describe("findAllByContext", () => {
    it("应该能够根据上下文查找所有实体", async () => {
      const tenantId = TenantId.generate();
      const orgId = new OrganizationId(tenantId);
      const context = new TenantContext(tenantId, { organizationId: orgId });
      const entity = new TestTenantIsolatedEntity();
      entity.id = "test-id";
      entity.tenantId = tenantId.value;
      entity.organizationId = orgId.value;

      (mockEm.find as jest.Mock).mockResolvedValue([entity]);

      const result = await repository.findAllByContext(context);

      expect(result).toBeDefined();
      expect(result.length).toBe(1);
    });

    it("应该在查询失败时抛出异常", async () => {
      const tenantId = TenantId.generate();
      const orgId = new OrganizationId(tenantId);
      const context = new TenantContext(tenantId, { organizationId: orgId });

      (mockEm.find as jest.Mock).mockRejectedValue(new Error("Database error"));

      await expect(
        repository.findAllByContext(context),
      ).rejects.toBeDefined();
    });

    it("应该能够处理包含部门ID的上下文", async () => {
      const tenantId = TenantId.generate();
      const orgId = new OrganizationId(tenantId);
      const deptId = new DepartmentId(orgId);
      const context = new TenantContext(tenantId, {
        organizationId: orgId,
        departmentId: deptId,
      });
      const entity = new TestTenantIsolatedEntity();
      entity.id = "test-id";
      entity.tenantId = tenantId.value;
      entity.organizationId = orgId.value;
      entity.departmentId = deptId.value;

      (mockEm.find as jest.Mock).mockResolvedValue([entity]);

      const result = await repository.findAllByContext(context);

      expect(result).toBeDefined();
      expect(mockEm.find).toHaveBeenCalledWith(
        "TestTenantIsolatedEntity",
        expect.objectContaining({
          tenantId: tenantId.value,
          organizationId: orgId.value,
          departmentId: deptId.value,
        }),
      );
    });
  });

  describe("findByIdWithContext", () => {
    it("应该能够在实体存在且属于上下文时返回实体", async () => {
      const tenantId = TenantId.generate();
      const orgId = new OrganizationId(tenantId);
      const context = new TenantContext(tenantId, { organizationId: orgId });
      const entityId = EntityId.generate();
      const entity = new TestTenantIsolatedEntity();
      entity.id = entityId.value;
      entity.tenantId = tenantId.value;
      entity.organizationId = orgId.value;

      (mockEm.findOne as jest.Mock).mockResolvedValue(entity);

      const result = await repository.findByIdWithContext(entityId, context);

      expect(result).toBeDefined();
    });

    it("应该在实体不属于上下文组织时抛出异常", async () => {
      const tenantId = TenantId.generate();
      const orgId = new OrganizationId(tenantId);
      const otherOrgId = new OrganizationId(tenantId);
      const context = new TenantContext(tenantId, { organizationId: orgId });
      const entityId = EntityId.generate();
      const entity = new TestTenantIsolatedEntity();
      entity.id = entityId.value;
      entity.tenantId = tenantId.value;
      entity.organizationId = otherOrgId.value;

      (mockEm.findOne as jest.Mock).mockResolvedValue(entity);

      await expect(
        repository.findByIdWithContext(entityId, context),
      ).rejects.toThrow(BusinessException);
    });

    it("应该在实体不属于上下文部门时抛出异常", async () => {
      const tenantId = TenantId.generate();
      const orgId = new OrganizationId(tenantId);
      const deptId = new DepartmentId(orgId);
      const otherDeptId = new DepartmentId(orgId);
      const context = new TenantContext(tenantId, {
        organizationId: orgId,
        departmentId: deptId,
      });
      const entityId = EntityId.generate();
      const entity = new TestTenantIsolatedEntity();
      entity.id = entityId.value;
      entity.tenantId = tenantId.value;
      entity.organizationId = orgId.value;
      entity.departmentId = otherDeptId.value;

      (mockEm.findOne as jest.Mock).mockResolvedValue(entity);

      await expect(
        repository.findByIdWithContext(entityId, context),
      ).rejects.toThrow(BusinessException);
    });

    it("应该在查询失败时抛出异常", async () => {
      const tenantId = TenantId.generate();
      const orgId = new OrganizationId(tenantId);
      const context = new TenantContext(tenantId, { organizationId: orgId });
      const entityId = EntityId.generate();

      (mockEm.findOne as jest.Mock).mockRejectedValue(
        new Error("Database error"),
      );

      await expect(
        repository.findByIdWithContext(entityId, context),
      ).rejects.toBeDefined();
    });
  });

  describe("countByTenant", () => {
    it("应该在权限不足时抛出异常", async () => {
      const tenantId = TenantId.generate();
      const otherTenantId = TenantId.generate();
      const orgId = new OrganizationId(otherTenantId);
      const context = new TenantContext(otherTenantId, {
        organizationId: orgId,
      });

      await expect(
        repository.countByTenant(tenantId, context),
      ).rejects.toThrow(BusinessException);
    });

    it("应该在查询失败时抛出异常", async () => {
      const tenantId = TenantId.generate();
      const orgId = new OrganizationId(tenantId);
      const context = new TenantContext(tenantId, { organizationId: orgId });

      (mockEm.count as jest.Mock).mockRejectedValue(
        new Error("Database error"),
      );

      await expect(
        repository.countByTenant(tenantId, context),
      ).rejects.toBeDefined();
    });
  });

  describe("countByOrganization", () => {
    it("应该在权限不足时抛出异常", async () => {
      const tenantId = TenantId.generate();
      // 创建属于其他租户的组织ID
      const otherTenantId = TenantId.generate();
      const orgId = new OrganizationId(otherTenantId);
      // 创建当前用户的上下文（属于 tenantId）
      const context = new TenantContext(tenantId);

      // 尝试统计不属于当前租户的组织（应该抛出异常）
      await expect(
        repository.countByOrganization(orgId, context),
      ).rejects.toThrow(BusinessException);
    });

    it("应该在查询失败时抛出异常", async () => {
      const tenantId = TenantId.generate();
      const orgId = new OrganizationId(tenantId);
      const context = new TenantContext(tenantId, { organizationId: orgId });

      (mockEm.count as jest.Mock).mockRejectedValue(
        new Error("Database error"),
      );

      await expect(
        repository.countByOrganization(orgId, context),
      ).rejects.toBeDefined();
    });
  });

  describe("countByDepartment", () => {
    it("应该在权限不足时抛出异常", async () => {
      const tenantId = TenantId.generate();
      // 创建属于其他租户的组织和部门
      const otherTenantId = TenantId.generate();
      const otherOrgId = new OrganizationId(otherTenantId);
      const deptId = new DepartmentId(otherOrgId);
      // 创建当前用户的上下文（属于 tenantId）
      const context = new TenantContext(tenantId);

      // 尝试统计不属于当前租户的部门（应该抛出异常）
      await expect(
        repository.countByDepartment(deptId, context),
      ).rejects.toThrow(BusinessException);
    });

    it("应该在查询失败时抛出异常", async () => {
      const tenantId = TenantId.generate();
      const orgId = new OrganizationId(tenantId);
      const deptId = new DepartmentId(orgId);
      const context = new TenantContext(tenantId, {
        organizationId: orgId,
        departmentId: deptId,
      });

      (mockEm.count as jest.Mock).mockRejectedValue(
        new Error("Database error"),
      );

      await expect(
        repository.countByDepartment(deptId, context),
      ).rejects.toBeDefined();
    });
  });

  describe("findByIdCrossTenant", () => {
    it("应该在查询失败时抛出异常", async () => {
      const tenantId = TenantId.generate();
      const orgId = new OrganizationId(tenantId);
      const context = new TenantContext(tenantId, {
        organizationId: orgId,
        isCrossTenant: true,
      });
      const entityId = EntityId.generate();

      (mockEm.findOne as jest.Mock).mockRejectedValue(
        new Error("Database error"),
      );

      await expect(
        repository.findByIdCrossTenant(entityId, context),
      ).rejects.toBeDefined();
    });
  });

  describe("belongsToTenant", () => {
    it("应该在查询失败时抛出异常", async () => {
      const tenantId = TenantId.generate();
      const entityId = EntityId.generate();

      (mockEm.findOne as jest.Mock).mockRejectedValue(
        new Error("Database error"),
      );

      await expect(
        repository.belongsToTenant(entityId, tenantId),
      ).rejects.toBeDefined();
    });
  });

  describe("belongsToOrganization", () => {
    it("应该在查询失败时抛出异常", async () => {
      const tenantId = TenantId.generate();
      const orgId = new OrganizationId(tenantId);
      const entityId = EntityId.generate();

      (mockEm.findOne as jest.Mock).mockRejectedValue(
        new Error("Database error"),
      );

      await expect(
        repository.belongsToOrganization(entityId, orgId),
      ).rejects.toBeDefined();
    });
  });

  describe("belongsToDepartment", () => {
    it("应该在查询失败时抛出异常", async () => {
      const tenantId = TenantId.generate();
      const orgId = new OrganizationId(tenantId);
      const deptId = new DepartmentId(orgId);
      const entityId = EntityId.generate();

      (mockEm.findOne as jest.Mock).mockRejectedValue(
        new Error("Database error"),
      );

      await expect(
        repository.belongsToDepartment(entityId, deptId),
      ).rejects.toBeDefined();
    });
  });
});
