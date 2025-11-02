/**
 * @fileoverview 租户过滤器测试
 * @description 测试TenantFilter的条件生成和参数验证
 */

import { describe, it, expect } from "@jest/globals";
import { tenantFilter } from "./tenant-filter.js";
import type { TenantFilterArgs } from "./tenant-filter.js";

describe("TenantFilter", () => {
  describe("tenantFilterCondition", () => {
    it("应该能够生成仅包含租户ID的过滤条件", () => {
      const args: TenantFilterArgs = {
        tenantId: "550e8400-e29b-41d4-a716-446655440000",
      };

      const result = tenantFilter.cond(args);

      expect(result).toEqual({
        tenantId: "550e8400-e29b-41d4-a716-446655440000",
      });
    });

    it("应该能够生成包含租户ID和组织ID的过滤条件", () => {
      const args: TenantFilterArgs = {
        tenantId: "550e8400-e29b-41d4-a716-446655440000",
        organizationId: "660e8400-e29b-41d4-a716-446655440001",
      };

      const result = tenantFilter.cond(args);

      expect(result).toEqual({
        tenantId: "550e8400-e29b-41d4-a716-446655440000",
        organizationId: "660e8400-e29b-41d4-a716-446655440001",
      });
    });

    it("应该能够生成包含租户ID、组织ID和部门ID的过滤条件", () => {
      const args: TenantFilterArgs = {
        tenantId: "550e8400-e29b-41d4-a716-446655440000",
        organizationId: "660e8400-e29b-41d4-a716-446655440001",
        departmentId: "770e8400-e29b-41d4-a716-446655440002",
      };

      const result = tenantFilter.cond(args);

      expect(result).toEqual({
        tenantId: "550e8400-e29b-41d4-a716-446655440000",
        organizationId: "660e8400-e29b-41d4-a716-446655440001",
        departmentId: "770e8400-e29b-41d4-a716-446655440002",
      });
    });

    it("应该能够处理undefined的组织ID和部门ID", () => {
      const args: TenantFilterArgs = {
        tenantId: "550e8400-e29b-41d4-a716-446655440000",
        organizationId: undefined,
        departmentId: undefined,
      };

      const result = tenantFilter.cond(args);

      expect(result).toEqual({
        tenantId: "550e8400-e29b-41d4-a716-446655440000",
      });
    });

    it("应该能够忽略未定义的可选参数", () => {
      const args1: TenantFilterArgs = {
        tenantId: "550e8400-e29b-41d4-a716-446655440000",
        organizationId: "660e8400-e29b-41d4-a716-446655440001",
        // departmentId not specified
      };

      const result1 = tenantFilter.cond(args1);

      expect(result1).not.toHaveProperty("departmentId");
      expect(result1).toHaveProperty("tenantId");
      expect(result1).toHaveProperty("organizationId");

      const args2: TenantFilterArgs = {
        tenantId: "550e8400-e29b-41d4-a716-446655440000",
        departmentId: "770e8400-e29b-41d4-a716-446655440002",
        // organizationId not specified
      };

      const result2 = tenantFilter.cond(args2);

      expect(result2).not.toHaveProperty("organizationId");
      expect(result2).toHaveProperty("tenantId");
      expect(result2).toHaveProperty("departmentId");
    });
  });

  describe("tenantFilter配置", () => {
    it("应该有正确的名称", () => {
      expect(tenantFilter.name).toBe("tenant");
    });

    it("应该默认不启用", () => {
      expect(tenantFilter.default).toBe(false);
    });

    it("应该有cond函数", () => {
      expect(typeof tenantFilter.cond).toBe("function");
    });
  });
});

