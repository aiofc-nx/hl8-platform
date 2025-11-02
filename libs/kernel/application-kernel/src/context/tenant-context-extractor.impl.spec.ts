/**
 * @fileoverview 租户上下文提取器测试
 * @description 测试 TenantContextExtractorImpl 的各种提取功能
 */

import { TenantContextExtractorImpl } from "./tenant-context-extractor.impl.js";
import { TenantId, OrganizationId, DepartmentId } from "@hl8/domain-kernel";

describe("TenantContextExtractorImpl", () => {
  let extractor: TenantContextExtractorImpl;

  beforeEach(() => {
    extractor = new TenantContextExtractorImpl();
  });

  describe("extractFromHeader", () => {
    it("应该从HTTP Headers中提取租户上下文", async () => {
      const tenantId = TenantId.generate();
      const organizationId = new OrganizationId(tenantId);
      const departmentId = new DepartmentId(organizationId);

      const headers = {
        "x-tenant-id": tenantId.value,
        "x-organization-id": organizationId.value,
        "x-department-id": departmentId.value,
      };

      const context = await extractor.extractFromHeader(headers);

      expect(context).not.toBeNull();
      expect(context?.tenantId.equals(tenantId)).toBe(true);
      expect(context?.organizationId?.equals(organizationId)).toBe(true);
      expect(context?.departmentId?.equals(departmentId)).toBe(true);
    });

    it("应该从HTTP Headers中提取权限", async () => {
      const tenantId = TenantId.generate();
      const headers = {
        "x-tenant-id": tenantId.value,
        "x-permissions": "read, write, delete",
      };

      const context = await extractor.extractFromHeader(headers);

      expect(context).not.toBeNull();
      expect(context?.permissions).toEqual(["read", "write", "delete"]);
    });

    it("应该只从租户ID提取上下文", async () => {
      const tenantId = TenantId.generate();
      const headers = {
        "x-tenant-id": tenantId.value,
      };

      const context = await extractor.extractFromHeader(headers);

      expect(context).not.toBeNull();
      expect(context?.tenantId.equals(tenantId)).toBe(true);
      expect(context?.organizationId).toBeUndefined();
      expect(context?.departmentId).toBeUndefined();
    });

    it("应该在缺少租户ID时返回null", async () => {
      const headers = {};

      const context = await extractor.extractFromHeader(headers);

      expect(context).toBeNull();
    });

    it("应该在租户ID无效时返回null", async () => {
      const headers = {
        "x-tenant-id": "invalid-uuid",
      };

      const context = await extractor.extractFromHeader(headers);

      expect(context).toBeNull();
    });

    it("应该忽略没有对应组织的部门ID", async () => {
      const tenantId = TenantId.generate();
      const organizationId = new OrganizationId(tenantId);
      const departmentId = new DepartmentId(organizationId);

      const headers = {
        "x-tenant-id": tenantId.value,
        "x-department-id": departmentId.value, // 没有组织ID
      };

      const context = await extractor.extractFromHeader(headers);

      expect(context).not.toBeNull();
      expect(context?.organizationId).toBeUndefined();
      expect(context?.departmentId).toBeUndefined();
    });

    it("应该支持大写和小写的Header名称", async () => {
      const tenantId = TenantId.generate();

      const context1 = await extractor.extractFromHeader({
        "x-tenant-id": tenantId.value,
      });

      const context2 = await extractor.extractFromHeader({
        "X-Tenant-Id": tenantId.value,
      });

      expect(context1?.tenantId.equals(tenantId)).toBe(true);
      expect(context2?.tenantId.equals(tenantId)).toBe(true);
    });
  });

  describe("extractFromToken", () => {
    it("应该返回null（未实现）", async () => {
      const context = await extractor.extractFromToken("test-token");

      expect(context).toBeNull();
    });
  });

  describe("extractFromUser", () => {
    it("应该返回null（未实现）", async () => {
      const context = await extractor.extractFromUser("user-id");

      expect(context).toBeNull();
    });
  });

  describe("extractFromRequest", () => {
    it("应该从包含headers的请求中提取上下文", async () => {
      const tenantId = TenantId.generate();
      const request = {
        headers: {
          "x-tenant-id": tenantId.value,
        },
      };

      const context = await extractor.extractFromRequest(request);

      expect(context).not.toBeNull();
      expect(context?.tenantId.equals(tenantId)).toBe(true);
    });

    it("应该在请求没有headers时返回null", async () => {
      const request = {};

      const context = await extractor.extractFromRequest(request);

      expect(context).toBeNull();
    });

    it("应该在请求为null时返回null", async () => {
      const context = await extractor.extractFromRequest(null as unknown);

      expect(context).toBeNull();
    });
  });
});
