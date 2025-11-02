/**
 * @fileoverview 租户隔离持久化实体测试
 * @description 测试TenantIsolatedPersistenceEntity的各种功能
 */

import { describe, it, expect } from "@jest/globals";
import { Property } from "@mikro-orm/core";
import { TenantIsolatedPersistenceEntity } from "./tenant-isolated-persistence-entity.js";
import { TenantId, OrganizationId, DepartmentId } from "@hl8/domain-kernel";

/**
 * 测试用的具体实体实现
 * @description 继承TenantIsolatedPersistenceEntity用于测试
 */
class TestTenantEntity extends TenantIsolatedPersistenceEntity {
  @Property({ type: "varchar", length: 255 })
  name!: string;
}

describe("TenantIsolatedPersistenceEntity", () => {
  describe("基本功能", () => {
    it("应该正确设置和获取租户ID", () => {
      const entity = new TestTenantEntity();
      const tenantId = new TenantId();

      entity.setTenantId(tenantId);

      expect(entity.tenantId).toBe(tenantId.value);
      expect(entity.toTenantId().equals(tenantId)).toBe(true);
    });

    it("应该正确设置和获取组织ID", () => {
      const entity = new TestTenantEntity();
      const tenantId = new TenantId();
      const orgId = new OrganizationId(tenantId);

      entity.setTenantId(tenantId);
      entity.setOrganizationId(orgId);

      expect(entity.organizationId).toBe(orgId.value);
    });

    it("应该正确设置和获取部门ID", () => {
      const entity = new TestTenantEntity();
      const tenantId = new TenantId();
      const orgId = new OrganizationId(tenantId);
      const deptId = new DepartmentId(orgId);

      entity.setTenantId(tenantId);
      entity.setOrganizationId(orgId);
      entity.setDepartmentId(deptId);

      expect(entity.departmentId).toBe(deptId.value);
    });
  });

  describe("验证规则", () => {
    it("应该拒绝无效的租户ID", () => {
      const entity = new TestTenantEntity();
      // 创建一个无效的TenantId（直接设置无效的UUID）
      const invalidTenantId = {
        value: "invalid-uuid",
        isValid: () => false,
      } as unknown as TenantId;

      expect(() => {
        entity.setTenantId(invalidTenantId);
      }).toThrow("租户ID无效");
    });

    it("应该在设置组织ID之前要求租户ID", () => {
      const entity = new TestTenantEntity();
      const tenantId = new TenantId();
      const orgId = new OrganizationId(tenantId);

      expect(() => entity.setOrganizationId(orgId)).toThrow("必须先设置租户ID");
    });

    it("应该在设置部门ID之前要求组织ID", () => {
      const entity = new TestTenantEntity();
      const tenantId = new TenantId();
      const orgId = new OrganizationId(tenantId);
      const deptId = new DepartmentId(orgId);

      entity.setTenantId(tenantId);

      expect(() => entity.setDepartmentId(deptId)).toThrow(
        "部门必须属于某个组织",
      );
    });

    it("应该验证租户隔离层级一致性", () => {
      const entity = new TestTenantEntity();
      const tenantId = new TenantId();
      const orgId = new OrganizationId(tenantId);
      const deptId = new DepartmentId(orgId);

      entity.setTenantId(tenantId);
      entity.setOrganizationId(orgId);
      entity.setDepartmentId(deptId);

      expect(() => entity.validateTenantIsolation()).not.toThrow();
    });

    it("应该拒绝不完整的租户隔离数据", () => {
      const entity = new TestTenantEntity();
      const tenantId = new TenantId();
      entity.setTenantId(tenantId);
      entity.departmentId = "some-dept-id";

      expect(() => entity.validateTenantIsolation()).toThrow(
        "设置部门ID时必须同时设置组织ID",
      );
    });

    it("应该拒绝空的租户ID", () => {
      const entity = new TestTenantEntity();

      expect(() => entity.validateTenantIsolation()).toThrow("租户ID不能为空");
    });
  });

  describe("清除设置", () => {
    it("应该允许清除组织ID", () => {
      const entity = new TestTenantEntity();
      const tenantId = new TenantId();
      const orgId = new OrganizationId(tenantId);

      entity.setTenantId(tenantId);
      entity.setOrganizationId(orgId);
      expect(entity.organizationId).toBeDefined();

      entity.setOrganizationId(undefined);
      expect(entity.organizationId).toBeNull();
    });

    it("应该允许清除部门ID", () => {
      const entity = new TestTenantEntity();
      const tenantId = new TenantId();
      const orgId = new OrganizationId(tenantId);
      const deptId = new DepartmentId(orgId);

      entity.setTenantId(tenantId);
      entity.setOrganizationId(orgId);
      entity.setDepartmentId(deptId);
      expect(entity.departmentId).toBeDefined();

      entity.setDepartmentId(undefined);
      expect(entity.departmentId).toBeNull();
    });
  });
});
