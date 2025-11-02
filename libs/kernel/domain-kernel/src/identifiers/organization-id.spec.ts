/**
 * @fileoverview 组织标识符值对象单元测试
 */

import { describe, it, expect, beforeEach } from "@jest/globals";
import { OrganizationId } from "./organization-id.js";
import { TenantId } from "./tenant-id.js";

describe("OrganizationId", () => {
  let tenantId: TenantId;

  beforeEach(() => {
    tenantId = new TenantId("f47ac10b-58cc-4372-a567-0e02b2c3d479");
  });

  describe("构造函数", () => {
    it("应该自动生成UUID当没有提供值", () => {
      const orgId = new OrganizationId(tenantId);
      expect(orgId.value).toBeDefined();
      expect(orgId.isValid()).toBe(true);
      expect(orgId.tenantId.equals(tenantId)).toBe(true);
    });

    it("应该接受有效的UUID字符串", () => {
      const uuid = "a1b2c3d4-e5f6-4a3b-8c9d-0e1f2a3b4c5d";
      const orgId = new OrganizationId(tenantId, uuid);
      expect(orgId.value).toBe(uuid);
    });

    it("应该接受父组织ID", () => {
      const parentOrgId = new OrganizationId(tenantId);
      const orgId = new OrganizationId(tenantId, undefined, parentOrgId);
      expect(orgId.parentId).toBeDefined();
      expect(orgId.parentId!.equals(parentOrgId)).toBe(true);
    });

    it("应该抛出错误当租户ID为空", () => {
      expect(() => new OrganizationId(null as unknown as TenantId)).toThrow(
        "租户ID不能为空",
      );
    });

    it("应该抛出错误当提供的值不是有效的UUID", () => {
      expect(() => new OrganizationId(tenantId, "invalid-uuid")).toThrow(
        "无效的组织标识符格式: invalid-uuid",
      );
    });

    it("应该抛出错误当父组织不属于同一租户", () => {
      const otherTenantId = new TenantId();
      const parentOrgId = new OrganizationId(otherTenantId);
      expect(
        () => new OrganizationId(tenantId, undefined, parentOrgId),
      ).toThrow("父组织必须属于同一租户");
    });
  });

  describe("equals方法", () => {
    it("应该返回true当两个标识符相等", () => {
      const uuid = "a1b2c3d4-e5f6-4a3b-8c9d-0e1f2a3b4c5d";
      const id1 = new OrganizationId(tenantId, uuid);
      const id2 = new OrganizationId(tenantId, uuid);
      expect(id1.equals(id2)).toBe(true);
    });

    it("应该返回false当两个标识符不相等", () => {
      const id1 = new OrganizationId(
        tenantId,
        "a1b2c3d4-e5f6-4a3b-8c9d-0e1f2a3b4c5d",
      );
      const id2 = new OrganizationId(
        tenantId,
        "b2c3d4e5-f6a7-4b5c-9d0e-1f2a3b4c5d6e",
      );
      expect(id1.equals(id2)).toBe(false);
    });

    it("应该返回false当比较null", () => {
      const id = new OrganizationId(tenantId);
      expect(id.equals(null)).toBe(false);
    });
  });

  describe("belongsTo方法", () => {
    it("应该返回true当属于指定租户", () => {
      const orgId = new OrganizationId(tenantId);
      expect(orgId.belongsTo(tenantId)).toBe(true);
    });

    it("应该返回false当不属于指定租户", () => {
      const orgId = new OrganizationId(tenantId);
      const otherTenantId = new TenantId();
      expect(orgId.belongsTo(otherTenantId)).toBe(false);
    });
  });

  describe("isAncestorOf方法", () => {
    it("应该返回true当是祖先组织", () => {
      const parent = new OrganizationId(tenantId);
      const child = new OrganizationId(tenantId, undefined, parent);
      expect(parent.isAncestorOf(child)).toBe(true);
    });

    it("应该返回false当不是祖先组织", () => {
      const org1 = new OrganizationId(tenantId);
      const org2 = new OrganizationId(tenantId);
      expect(org1.isAncestorOf(org2)).toBe(false);
    });

    it("应该支持多层级祖先检查", () => {
      const grandParent = new OrganizationId(tenantId);
      const parent = new OrganizationId(tenantId, undefined, grandParent);
      const child = new OrganizationId(tenantId, undefined, parent);
      expect(grandParent.isAncestorOf(child)).toBe(true);
    });
  });

  describe("isDescendantOf方法", () => {
    it("应该返回true当是后代组织", () => {
      const parent = new OrganizationId(tenantId);
      const child = new OrganizationId(tenantId, undefined, parent);
      expect(child.isDescendantOf(parent)).toBe(true);
    });

    it("应该返回false当不是后代组织", () => {
      const org1 = new OrganizationId(tenantId);
      const org2 = new OrganizationId(tenantId);
      expect(org1.isDescendantOf(org2)).toBe(false);
    });
  });

  describe("clone方法", () => {
    it("应该创建标识符的副本", () => {
      const original = new OrganizationId(
        tenantId,
        "a1b2c3d4-e5f6-4a3b-8c9d-0e1f2a3b4c5d",
      );
      const cloned = original.clone();
      expect(cloned.equals(original)).toBe(true);
      expect(cloned).not.toBe(original);
    });

    it("应该包含父组织信息", () => {
      const parent = new OrganizationId(tenantId);
      const original = new OrganizationId(tenantId, undefined, parent);
      const cloned = original.clone();
      expect(cloned.parentId).toBeDefined();
      expect(cloned.parentId!.equals(parent)).toBe(true);
    });
  });

  describe("toJSON方法", () => {
    it("应该返回完整的JSON对象", () => {
      const orgId = new OrganizationId(tenantId);
      const json = orgId.toJSON();
      expect(json).toHaveProperty("value");
      expect(json).toHaveProperty("tenantId");
      expect(json).toHaveProperty("parentId");
    });
  });

  describe("静态方法", () => {
    it("fromString应该从字符串创建标识符", () => {
      const uuid = "a1b2c3d4-e5f6-4a3b-8c9d-0e1f2a3b4c5d";
      const orgId = OrganizationId.fromString(tenantId, uuid);
      expect(orgId.value).toBe(uuid);
    });

    it("generate应该生成新的标识符", () => {
      const orgId = OrganizationId.generate(tenantId);
      expect(orgId.isValid()).toBe(true);
    });
  });
});
