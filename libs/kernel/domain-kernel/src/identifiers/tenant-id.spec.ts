/**
 * @fileoverview 租户标识符值对象单元测试
 */

import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import { TenantId } from "./tenant-id.js";

describe("TenantId", () => {
  beforeEach(() => {
    // 测试前清理
  });

  afterEach(() => {
    // 测试后清理
  });

  describe("构造函数", () => {
    it("应该自动生成UUID当没有提供值", () => {
      const tenantId = new TenantId();
      expect(tenantId.value).toBeDefined();
      expect(tenantId.isValid()).toBe(true);
    });

    it("应该接受有效的UUID字符串", () => {
      const uuid = "f47ac10b-58cc-4372-a567-0e02b2c3d479";
      const tenantId = new TenantId(uuid);
      expect(tenantId.value).toBe(uuid);
    });

    it("应该抛出错误当提供的值不是有效的UUID", () => {
      expect(() => new TenantId("invalid-uuid")).toThrow(
        "无效的租户标识符格式: invalid-uuid",
      );
    });

    it("应该抛出错误当提供null", () => {
      expect(() => new TenantId(null as unknown as string)).toThrow(
        "无效的租户标识符格式",
      );
    });
  });

  describe("equals方法", () => {
    it("应该返回true当两个标识符相等", () => {
      const uuid = "f47ac10b-58cc-4372-a567-0e02b2c3d479";
      const id1 = new TenantId(uuid);
      const id2 = new TenantId(uuid);
      expect(id1.equals(id2)).toBe(true);
    });

    it("应该返回false当两个标识符不相等", () => {
      const id1 = new TenantId("f47ac10b-58cc-4372-a567-0e02b2c3d479");
      const id2 = new TenantId("a1b2c3d4-e5f6-4a3b-8c9d-0e1f2a3b4c5d");
      expect(id1.equals(id2)).toBe(false);
    });

    it("应该返回false当比较null", () => {
      const id = new TenantId();
      expect(id.equals(null)).toBe(false);
    });

    it("应该返回false当比较undefined", () => {
      const id = new TenantId();
      expect(id.equals(undefined)).toBe(false);
    });
  });

  describe("isValid方法", () => {
    it("应该返回true对于有效的UUID", () => {
      const tenantId = new TenantId("f47ac10b-58cc-4372-a567-0e02b2c3d479");
      expect(tenantId.isValid()).toBe(true);
    });

    it("应该返回true对于自动生成的UUID", () => {
      const tenantId = new TenantId();
      expect(tenantId.isValid()).toBe(true);
    });
  });

  describe("clone方法", () => {
    it("应该创建标识符的副本", () => {
      const original = new TenantId("f47ac10b-58cc-4372-a567-0e02b2c3d479");
      const cloned = original.clone();
      expect(cloned.equals(original)).toBe(true);
      expect(cloned).not.toBe(original);
    });
  });

  describe("toString方法", () => {
    it("应该返回UUID字符串", () => {
      const uuid = "f47ac10b-58cc-4372-a567-0e02b2c3d479";
      const tenantId = new TenantId(uuid);
      expect(tenantId.toString()).toBe(uuid);
    });
  });

  describe("toJSON方法", () => {
    it("应该返回UUID字符串", () => {
      const uuid = "f47ac10b-58cc-4372-a567-0e02b2c3d479";
      const tenantId = new TenantId(uuid);
      expect(tenantId.toJSON()).toBe(uuid);
    });
  });

  describe("静态方法fromString", () => {
    it("应该从字符串创建标识符", () => {
      const uuid = "f47ac10b-58cc-4372-a567-0e02b2c3d479";
      const tenantId = TenantId.fromString(uuid);
      expect(tenantId.value).toBe(uuid);
    });

    it("应该抛出错误对于无效的字符串", () => {
      expect(() => TenantId.fromString("invalid")).toThrow();
    });
  });

  describe("静态方法generate", () => {
    it("应该生成新的标识符", () => {
      const tenantId = TenantId.generate();
      expect(tenantId.isValid()).toBe(true);
    });

    it("应该生成唯一的标识符", () => {
      const id1 = TenantId.generate();
      const id2 = TenantId.generate();
      expect(id1.equals(id2)).toBe(false);
    });
  });

  describe("静态方法isValid", () => {
    it("应该返回true对于有效的UUID", () => {
      expect(TenantId.isValid("f47ac10b-58cc-4372-a567-0e02b2c3d479")).toBe(
        true,
      );
    });

    it("应该返回false对于无效的UUID", () => {
      expect(TenantId.isValid("invalid-uuid")).toBe(false);
    });
  });

  describe("静态方法compare", () => {
    it("应该正确比较两个标识符", () => {
      const id1 = new TenantId("f47ac10b-58cc-4372-a567-0e02b2c3d001");
      const id2 = new TenantId("f47ac10b-58cc-4372-a567-0e02b2c3d002");
      expect(TenantId.compare(id1, id2)).toBeLessThan(0);
      expect(TenantId.compare(id2, id1)).toBeGreaterThan(0);
    });

    it("应该返回0当两个标识符相等", () => {
      const uuid = "f47ac10b-58cc-4372-a567-0e02b2c3d479";
      const id1 = new TenantId(uuid);
      const id2 = new TenantId(uuid);
      expect(TenantId.compare(id1, id2)).toBe(0);
    });
  });

  describe("hashCode方法", () => {
    it("应该返回相同的哈希值对于相同的标识符", () => {
      const uuid = "f47ac10b-58cc-4372-a567-0e02b2c3d479";
      const id1 = new TenantId(uuid);
      const id2 = new TenantId(uuid);
      expect(id1.hashCode()).toBe(id2.hashCode());
    });

    it("应该返回数字值", () => {
      const tenantId = new TenantId();
      expect(typeof tenantId.hashCode()).toBe("number");
    });
  });
});
