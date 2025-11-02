/**
 * @fileoverview 部门标识符值对象单元测试
 */

import { describe, it, expect, beforeEach } from "@jest/globals";
import { DepartmentId } from "./department-id.js";
import { OrganizationId } from "./organization-id.js";
import { TenantId } from "./tenant-id.js";

describe("DepartmentId", () => {
  let tenantId: TenantId;
  let organizationId: OrganizationId;

  beforeEach(() => {
    tenantId = new TenantId("f47ac10b-58cc-4372-a567-0e02b2c3d479");
    organizationId = new OrganizationId(tenantId);
  });

  describe("构造函数", () => {
    it("应该自动生成UUID当没有提供值", () => {
      const deptId = new DepartmentId(organizationId);
      expect(deptId.value).toBeDefined();
      expect(deptId.isValid()).toBe(true);
      expect(deptId.organizationId.equals(organizationId)).toBe(true);
    });

    it("应该接受有效的UUID字符串", () => {
      const uuid = "a1b2c3d4-e5f6-4a3b-8c9d-0e1f2a3b4c5d";
      const deptId = new DepartmentId(organizationId, uuid);
      expect(deptId.value).toBe(uuid);
    });

    it("应该接受父部门ID", () => {
      const parentDeptId = new DepartmentId(organizationId);
      const deptId = new DepartmentId(organizationId, undefined, parentDeptId);
      expect(deptId.parentId).toBeDefined();
      expect(deptId.parentId!.equals(parentDeptId)).toBe(true);
    });

    it("应该抛出错误当组织ID为空", () => {
      expect(() => new DepartmentId(null as unknown as OrganizationId)).toThrow(
        "组织ID不能为空",
      );
    });

    it("应该抛出错误当提供的值不是有效的UUID", () => {
      expect(() => new DepartmentId(organizationId, "invalid-uuid")).toThrow(
        "无效的部门标识符格式: invalid-uuid",
      );
    });

    it("应该抛出错误当父部门不属于同一组织", () => {
      const otherTenantId = new TenantId();
      const otherOrgId = new OrganizationId(otherTenantId);
      const parentDeptId = new DepartmentId(otherOrgId);
      expect(
        () => new DepartmentId(organizationId, undefined, parentDeptId),
      ).toThrow("父部门必须属于同一组织");
    });
  });

  describe("equals方法", () => {
    it("应该返回true当两个标识符相等", () => {
      const uuid = "a1b2c3d4-e5f6-4a3b-8c9d-0e1f2a3b4c5d";
      const id1 = new DepartmentId(organizationId, uuid);
      const id2 = new DepartmentId(organizationId, uuid);
      expect(id1.equals(id2)).toBe(true);
    });

    it("应该返回false当两个标识符不相等", () => {
      const id1 = new DepartmentId(
        organizationId,
        "a1b2c3d4-e5f6-4a3b-8c9d-0e1f2a3b4c5d",
      );
      const id2 = new DepartmentId(
        organizationId,
        "b2c3d4e5-f6a7-4b5c-9d0e-1f2a3b4c5d6e",
      );
      expect(id1.equals(id2)).toBe(false);
    });

    it("应该返回false当比较null", () => {
      const id = new DepartmentId(organizationId);
      expect(id.equals(null)).toBe(false);
    });
  });

  describe("belongsTo方法", () => {
    it("应该返回true当属于指定组织", () => {
      const deptId = new DepartmentId(organizationId);
      expect(deptId.belongsTo(organizationId)).toBe(true);
    });

    it("应该返回false当不属于指定组织", () => {
      const deptId = new DepartmentId(organizationId);
      const otherOrgId = new OrganizationId(tenantId);
      expect(deptId.belongsTo(otherOrgId)).toBe(false);
    });
  });

  describe("belongsToTenant方法", () => {
    it("应该返回true当属于指定租户", () => {
      const deptId = new DepartmentId(organizationId);
      expect(deptId.belongsToTenant(tenantId)).toBe(true);
    });

    it("应该返回false当不属于指定租户", () => {
      const deptId = new DepartmentId(organizationId);
      const otherTenantId = new TenantId();
      expect(deptId.belongsToTenant(otherTenantId)).toBe(false);
    });
  });

  describe("isAncestorOf方法", () => {
    it("应该返回true当是祖先部门", () => {
      const parent = new DepartmentId(organizationId);
      const child = new DepartmentId(organizationId, undefined, parent);
      expect(parent.isAncestorOf(child)).toBe(true);
    });

    it("应该返回false当不是祖先部门", () => {
      const dept1 = new DepartmentId(organizationId);
      const dept2 = new DepartmentId(organizationId);
      expect(dept1.isAncestorOf(dept2)).toBe(false);
    });

    it("应该支持多层级祖先检查", () => {
      const grandParent = new DepartmentId(organizationId);
      const parent = new DepartmentId(organizationId, undefined, grandParent);
      const child = new DepartmentId(organizationId, undefined, parent);
      expect(grandParent.isAncestorOf(child)).toBe(true);
    });
  });

  describe("isDescendantOf方法", () => {
    it("应该返回true当是后代部门", () => {
      const parent = new DepartmentId(organizationId);
      const child = new DepartmentId(organizationId, undefined, parent);
      expect(child.isDescendantOf(parent)).toBe(true);
    });

    it("应该返回false当不是后代部门", () => {
      const dept1 = new DepartmentId(organizationId);
      const dept2 = new DepartmentId(organizationId);
      expect(dept1.isDescendantOf(dept2)).toBe(false);
    });
  });

  describe("clone方法", () => {
    it("应该创建标识符的副本", () => {
      const original = new DepartmentId(
        organizationId,
        "a1b2c3d4-e5f6-4a3b-8c9d-0e1f2a3b4c5d",
      );
      const cloned = original.clone();
      expect(cloned.equals(original)).toBe(true);
      expect(cloned).not.toBe(original);
    });
  });

  describe("toJSON方法", () => {
    it("应该返回完整的JSON对象", () => {
      const deptId = new DepartmentId(organizationId);
      const json = deptId.toJSON();
      expect(json).toHaveProperty("value");
      expect(json).toHaveProperty("organizationId");
      expect(json).toHaveProperty("parentId");
    });
  });

  describe("静态方法", () => {
    it("fromString应该从字符串创建标识符", () => {
      const uuid = "a1b2c3d4-e5f6-4a3b-8c9d-0e1f2a3b4c5d";
      const deptId = DepartmentId.fromString(organizationId, uuid);
      expect(deptId.value).toBe(uuid);
    });

    it("generate应该生成新的标识符", () => {
      const deptId = DepartmentId.generate(organizationId);
      expect(deptId.isValid()).toBe(true);
    });
  });
});
