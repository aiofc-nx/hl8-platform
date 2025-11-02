/**
 * @fileoverview 租户上下文测试
 * @description 测试 TenantContext 值对象的各种功能
 */

import { TenantContext } from "./tenant-context.js";
import { TenantId } from "../identifiers/tenant-id.js";
import { OrganizationId } from "../identifiers/organization-id.js";
import { DepartmentId } from "../identifiers/department-id.js";
import { EntityId } from "../identifiers/entity-id.js";

describe("TenantContext", () => {
  let tenantId: TenantId;
  let organizationId: OrganizationId;
  let departmentId: DepartmentId;

  beforeEach(() => {
    tenantId = TenantId.generate();
    organizationId = new OrganizationId(tenantId);
    departmentId = new DepartmentId(organizationId);
  });

  describe("构造函数", () => {
    it("应该能够使用租户ID创建租户上下文", () => {
      const context = new TenantContext(tenantId);

      expect(context.tenantId.equals(tenantId)).toBe(true);
      expect(context.organizationId).toBeUndefined();
      expect(context.departmentId).toBeUndefined();
      expect(context.isCrossTenant).toBe(false);
      expect(context.permissions).toEqual([]);
    });

    it("应该能够使用完整选项创建租户上下文", () => {
      const userId = EntityId.generate();
      const context = new TenantContext(tenantId, {
        organizationId,
        departmentId,
        isCrossTenant: true,
        permissions: ["read", "write"],
        userId,
      });

      expect(context.tenantId.equals(tenantId)).toBe(true);
      expect(context.organizationId?.equals(organizationId)).toBe(true);
      expect(context.departmentId?.equals(departmentId)).toBe(true);
      expect(context.isCrossTenant).toBe(true);
      expect(context.permissions).toEqual(["read", "write"]);
      expect(context.userId?.equals(userId)).toBe(true);
    });

    it("应该拒绝空租户ID", () => {
      expect(() => new TenantContext(null as unknown as TenantId)).toThrow(
        "租户ID不能为空",
      );
    });

    it("应该拒绝无效的租户ID", () => {
      // 创建一个看起来像 TenangId 但实际上无效的对象
      const invalidTenantId = {
        value: "not-a-valid-uuid",
        isValid: () => false,
      } as unknown as TenantId;

      expect(() => new TenantContext(invalidTenantId)).toThrow("租户ID无效");
    });

    it("应该拒绝未指定组织但指定部门的情况", () => {
      expect(
        () =>
          new TenantContext(tenantId, {
            departmentId,
          }),
      ).toThrow("指定部门时必须同时指定组织");
    });

    it("应该拒绝不属于租户的组织", () => {
      const otherTenantId = TenantId.generate();
      const otherOrganizationId = new OrganizationId(otherTenantId);

      expect(
        () =>
          new TenantContext(tenantId, {
            organizationId: otherOrganizationId,
          }),
      ).toThrow("组织必须属于指定租户");
    });

    it("应该拒绝不属于组织的部门", () => {
      const otherOrganizationId = new OrganizationId(tenantId);
      const otherDepartmentId = new DepartmentId(otherOrganizationId);

      expect(
        () =>
          new TenantContext(tenantId, {
            organizationId,
            departmentId: otherDepartmentId,
          }),
      ).toThrow("部门必须属于指定组织");
    });

    it("应该支持字符串类型的用户ID", () => {
      const userIdString = "550e8400-e29b-41d4-a716-446655440000";
      const context = new TenantContext(tenantId, {
        userId: userIdString,
      });

      expect(context.userId).toBeDefined();
      expect(context.userId?.value).toBe(userIdString);
    });
  });

  describe("hasPermission", () => {
    it("应该正确检查权限", () => {
      const context = new TenantContext(tenantId, {
        permissions: ["read", "write"],
      });

      expect(context.hasPermission("read")).toBe(true);
      expect(context.hasPermission("write")).toBe(true);
      expect(context.hasPermission("delete")).toBe(false);
    });

    it("应该在无权限时返回false", () => {
      const context = new TenantContext(tenantId);

      expect(context.hasPermission("read")).toBe(false);
    });
  });

  describe("canAccessTenant", () => {
    it("应该允许访问自己的租户", () => {
      const context = new TenantContext(tenantId);

      expect(context.canAccessTenant(tenantId)).toBe(true);
    });

    it("应该拒绝访问其他租户（除非有跨租户权限）", () => {
      const context = new TenantContext(tenantId);
      const otherTenantId = TenantId.generate();

      expect(context.canAccessTenant(otherTenantId)).toBe(false);
    });

    it("应该允许跨租户访问（如果有跨租户权限）", () => {
      const context = new TenantContext(tenantId, { isCrossTenant: true });
      const otherTenantId = TenantId.generate();

      expect(context.canAccessTenant(otherTenantId)).toBe(true);
    });
  });

  describe("canAccessOrganization", () => {
    let context: TenantContext;

    beforeEach(() => {
      context = new TenantContext(tenantId, { organizationId });
    });

    it("应该允许访问自己的组织", () => {
      expect(context.canAccessOrganization(organizationId)).toBe(true);
    });

    it("应该允许访问自己组织的父组织", () => {
      const parentOrg = new OrganizationId(tenantId);
      const childOrg = new OrganizationId(tenantId, undefined, parentOrg);
      const childContext = new TenantContext(tenantId, {
        organizationId: childOrg,
      });

      expect(childContext.canAccessOrganization(parentOrg)).toBe(true);
      expect(childContext.canAccessOrganization(childOrg)).toBe(true);
    });

    it("应该拒绝访问其他租户的组织", () => {
      const otherTenantId = TenantId.generate();
      const otherOrgId = new OrganizationId(otherTenantId);

      expect(context.canAccessOrganization(otherOrgId)).toBe(false);
    });

    it("应该在没有指定组织时允许访问任何属于租户的组织", () => {
      const contextWithoutOrg = new TenantContext(tenantId);
      const anotherOrg = new OrganizationId(tenantId);

      expect(contextWithoutOrg.canAccessOrganization(anotherOrg)).toBe(true);
    });

    it("应该在有跨租户权限时允许访问任何组织", () => {
      const crossTenantContext = new TenantContext(tenantId, {
        isCrossTenant: true,
      });
      const otherTenantId = TenantId.generate();
      const otherOrgId = new OrganizationId(otherTenantId);

      expect(crossTenantContext.canAccessOrganization(otherOrgId)).toBe(true);
    });
  });

  describe("canAccessDepartment", () => {
    let context: TenantContext;

    beforeEach(() => {
      context = new TenantContext(tenantId, {
        organizationId,
        departmentId,
      });
    });

    it("应该允许访问自己的部门", () => {
      expect(context.canAccessDepartment(departmentId)).toBe(true);
    });

    it("应该允许访问自己部门的父部门", () => {
      const parentDept = new DepartmentId(organizationId);
      const childDept = new DepartmentId(organizationId, undefined, parentDept);
      const childContext = new TenantContext(tenantId, {
        organizationId,
        departmentId: childDept,
      });

      expect(childContext.canAccessDepartment(parentDept)).toBe(true);
      expect(childContext.canAccessDepartment(childDept)).toBe(true);
    });

    it("应该拒绝访问其他组织的部门", () => {
      const otherOrgId = new OrganizationId(tenantId);
      const otherDeptId = new DepartmentId(otherOrgId);

      expect(context.canAccessDepartment(otherDeptId)).toBe(false);
    });

    it("应该拒绝访问其他租户的部门", () => {
      const otherTenantId = TenantId.generate();
      const otherOrgId = new OrganizationId(otherTenantId);
      const otherDeptId = new DepartmentId(otherOrgId);

      expect(context.canAccessDepartment(otherDeptId)).toBe(false);
    });

    it("应该在没有指定部门时允许访问任何属于组织的部门", () => {
      const contextWithoutDept = new TenantContext(tenantId, {
        organizationId,
      });
      const anotherDept = new DepartmentId(organizationId);

      expect(contextWithoutDept.canAccessDepartment(anotherDept)).toBe(true);
    });

    it("应该在有跨租户权限时允许访问任何部门", () => {
      const crossTenantContext = new TenantContext(tenantId, {
        isCrossTenant: true,
      });
      const otherTenantId = TenantId.generate();
      const otherOrgId = new OrganizationId(otherTenantId);
      const otherDeptId = new DepartmentId(otherOrgId);

      expect(crossTenantContext.canAccessDepartment(otherDeptId)).toBe(true);
    });
  });

  describe("validate", () => {
    it("应该验证有效上下文", () => {
      const context = new TenantContext(tenantId, {
        organizationId,
        departmentId,
      });

      expect(context.validate()).toBe(true);
    });

    it("应该验证仅租户的上下文", () => {
      const context = new TenantContext(tenantId);

      expect(context.validate()).toBe(true);
    });
  });

  describe("clone", () => {
    it("应该创建完全相同的副本", () => {
      const userId = EntityId.generate();
      const context = new TenantContext(tenantId, {
        organizationId,
        departmentId,
        isCrossTenant: true,
        permissions: ["read", "write"],
        userId,
      });

      const cloned = context.clone();

      expect(cloned.equals(context)).toBe(true);
      expect(cloned).not.toBe(context); // 应该是不同的实例
    });
  });

  describe("toJSON", () => {
    it("应该正确序列化为JSON", () => {
      const userId = EntityId.generate();
      const context = new TenantContext(tenantId, {
        organizationId,
        departmentId,
        isCrossTenant: true,
        permissions: ["read"],
        userId,
      });

      const json = context.toJSON();

      expect(json).toEqual({
        tenantId: tenantId.toJSON(),
        organizationId: organizationId.toJSON(),
        departmentId: departmentId.toJSON(),
        isCrossTenant: true,
        permissions: ["read"],
        userId: userId.toJSON(),
        extractedAt: expect.any(String),
      });
    });
  });

  describe("equals", () => {
    it("应该正确比较相等的上下文", () => {
      const userId = EntityId.generate();
      const context1 = new TenantContext(tenantId, {
        organizationId,
        departmentId,
        permissions: ["read"],
        userId,
      });
      const context2 = new TenantContext(tenantId, {
        organizationId,
        departmentId,
        permissions: ["read"],
        userId,
      });

      expect(context1.equals(context2)).toBe(true);
    });

    it("应该正确比较不相等的上下文（不同租户）", () => {
      const otherTenantId = TenantId.generate();
      const context1 = new TenantContext(tenantId);
      const context2 = new TenantContext(otherTenantId);

      expect(context1.equals(context2)).toBe(false);
    });

    it("应该正确处理null和undefined", () => {
      const context = new TenantContext(tenantId);

      expect(context.equals(null)).toBe(false);
      expect(context.equals(undefined)).toBe(false);
    });
  });

  describe("getter方法", () => {
    it("应该返回权限列表的副本", () => {
      const context = new TenantContext(tenantId, {
        permissions: ["read", "write"],
      });

      const permissions = context.permissions;
      permissions.push("delete");

      expect(context.permissions).toEqual(["read", "write"]);
    });

    it("应该返回提取时间的副本", () => {
      const context = new TenantContext(tenantId);
      const extractedAt = context.extractedAt;

      // 修改返回的Date对象不应该影响原上下文
      extractedAt.setFullYear(2000);

      expect(context.extractedAt).not.toEqual(extractedAt);
    });
  });
});
