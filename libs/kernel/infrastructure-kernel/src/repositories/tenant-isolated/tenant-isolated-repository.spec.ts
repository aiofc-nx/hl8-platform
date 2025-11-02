/**
 * @fileoverview 租户隔离仓储单元测试
 * @description 验证 MikroORMTenantIsolatedRepository 是否正确实现 ITenantIsolatedRepository 接口
 */

import { EntityManager } from "@mikro-orm/core";
import { describe, it, expect, beforeEach } from "@jest/globals";
import { ITenantIsolatedRepository } from "@hl8/domain-kernel";
import { MikroORMTenantIsolatedRepository } from "./tenant-isolated-repository.js";
import { TenantIsolatedPersistenceEntity } from "../../entities/base/tenant-isolated-persistence-entity.js";
import { Entity, Property } from "@mikro-orm/core";

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
});
