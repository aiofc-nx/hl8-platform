/**
 * @fileoverview 仓储工厂单元测试
 * @description 验证 RepositoryFactory 的所有方法实现
 */

import { describe, it, expect, beforeEach } from "@jest/globals";
import { EntityManager } from "@mikro-orm/core";
import { RepositoryFactory } from "./repository-factory.js";
import { EntityMapper } from "../../mappers/entity-mapper.js";
import { BaseEntity } from "../../entities/base/base-entity.js";
import { TenantIsolatedPersistenceEntity } from "../../entities/base/tenant-isolated-persistence-entity.js";

// 测试用的基础实体
class TestEntity extends BaseEntity {
  name!: string;
}

// 测试用的租户隔离实体
class TestTenantEntity extends TenantIsolatedPersistenceEntity {
  name!: string;
}

describe("RepositoryFactory", () => {
  let mockEm: EntityManager;
  let factory: RepositoryFactory;

  beforeEach(() => {
    mockEm = {
      find: jest.fn(),
      findOne: jest.fn(),
      persist: jest.fn(),
      flush: jest.fn(),
      remove: jest.fn(),
      removeAndFlush: jest.fn(),
    } as any;

    factory = new RepositoryFactory(mockEm);
  });

  describe("constructor", () => {
    it("应该能够在提供 EntityManager 时创建实例", () => {
      const factory = new RepositoryFactory(mockEm);
      expect(factory).toBeDefined();
    });

    it("应该在 EntityManager 为空时抛出错误", () => {
      expect(() => {
        new RepositoryFactory(null as any);
      }).toThrow("EntityManager不能为空");
    });
  });

  describe("createRepository", () => {
    it("应该能够创建基础仓储实例", () => {
      const repository = factory.createRepository(TestEntity, "TestEntity");

      expect(repository).toBeDefined();
    });

    it("应该在实体类为空时抛出错误", () => {
      expect(() => {
        factory.createRepository(null as any, "TestEntity");
      }).toThrow("实体类不能为空");
    });

    it("应该在实体名称为空时抛出错误", () => {
      expect(() => {
        factory.createRepository(TestEntity, "");
      }).toThrow("实体类名称不能为空");
    });

    it("应该在实体类未继承 BaseEntity 时抛出错误", () => {
      class InvalidEntity {
        id!: string;
      }

      expect(() => {
        factory.createRepository(InvalidEntity as any, "InvalidEntity");
      }).toThrow("实体类 InvalidEntity 必须继承自 BaseEntity");
    });
  });

  describe("createTenantIsolatedRepository", () => {
    it("应该能够创建租户隔离仓储实例", () => {
      const repository = factory.createTenantIsolatedRepository<
        TestTenantEntity,
        any
      >(TestTenantEntity, "TestTenantEntity");

      expect(repository).toBeDefined();
    });

    it("应该在实体类为空时抛出错误", () => {
      expect(() => {
        factory.createTenantIsolatedRepository(null as any, "TestTenantEntity");
      }).toThrow("实体类不能为空");
    });

    it("应该在实体名称为空时抛出错误", () => {
      expect(() => {
        factory.createTenantIsolatedRepository(TestTenantEntity, "");
      }).toThrow("实体类名称不能为空");
    });

    it("应该在实体类未继承 TenantIsolatedPersistenceEntity 时抛出错误", () => {
      expect(() => {
        factory.createTenantIsolatedRepository(
          TestEntity as any,
          "TestEntity",
        );
      }).toThrow(
        "实体类 TestEntity 必须继承自 TenantIsolatedPersistenceEntity",
      );
    });
  });

  describe("registerMapper", () => {
    it("应该能够注册实体映射器", () => {
      const mapper = new EntityMapper<any, TestEntity>({
        autoMap: true,
      });

      factory.registerMapper("TestEntity", mapper);

      // 验证映射器已注册（通过 getMapper 验证）
      const retrievedMapper = factory.getMapper("TestEntity");
      expect(retrievedMapper).toBe(mapper);
    });

    it("应该在实体名称为空时抛出错误", () => {
      const mapper = new EntityMapper<any, TestEntity>({
        autoMap: true,
      });

      expect(() => {
        factory.registerMapper("", mapper);
      }).toThrow("实体类名称不能为空");
    });

    it("应该在映射器为空时抛出错误", () => {
      expect(() => {
        factory.registerMapper("TestEntity", null as any);
      }).toThrow("映射器不能为空");
    });
  });

  describe("getMapper", () => {
    it("应该能够获取已注册的映射器", () => {
      const mapper = new EntityMapper<any, TestEntity>({
        autoMap: true,
      });

      factory.registerMapper("TestEntity", mapper);
      const retrievedMapper = factory.getMapper("TestEntity");

      expect(retrievedMapper).toBe(mapper);
    });

    it("应该在映射器未注册时返回 null", () => {
      const mapper = factory.getMapper("NonExistentEntity");

      // getMapper 可能返回 null 或 undefined，取决于实现
      expect(mapper).toBeFalsy();
    });

    it("应该在实体名称为空时返回 null", () => {
      const mapper = factory.getMapper("");

      expect(mapper).toBeNull();
    });

    it("应该能够注册并获取多个不同的映射器", () => {
      const mapper1 = new EntityMapper<any, TestEntity>({
        autoMap: true,
      });
      const mapper2 = new EntityMapper<any, TestTenantEntity>({
        autoMap: true,
      });

      factory.registerMapper("TestEntity", mapper1);
      factory.registerMapper("TestTenantEntity", mapper2);

      expect(factory.getMapper("TestEntity")).toBe(mapper1);
      expect(factory.getMapper("TestTenantEntity")).toBe(mapper2);
    });
  });
});

