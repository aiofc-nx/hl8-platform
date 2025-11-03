/**
 * @fileoverview CacheKeyBuilder 单元测试
 * @description 测试缓存键构建器的功能
 */

import { CacheKeyBuilder } from "./cache-key-builder.js";

describe("CacheKeyBuilder", () => {
  let builder: CacheKeyBuilder;

  beforeEach(() => {
    builder = new CacheKeyBuilder();
  });

  describe("buildEntityKey", () => {
    it("应该构建实体缓存键（不含租户ID）", () => {
      const key = builder.buildEntityKey("user", "123");
      expect(key).toBe("repo:user:123");
    });

    it("应该构建实体缓存键（含租户ID）", () => {
      const key = builder.buildEntityKey("user", "123", "tenant1");
      expect(key).toBe("tenant1:repo:user:123");
    });

    it("应该抛出错误当实体名称为空时", () => {
      expect(() => {
        builder.buildEntityKey("", "123");
      }).toThrow("Entity name and ID cannot be empty");
    });

    it("应该抛出错误当实体ID为空时", () => {
      expect(() => {
        builder.buildEntityKey("user", "");
      }).toThrow("Entity name and ID cannot be empty");
    });

    it("应该抛出错误当租户ID为空字符串时", () => {
      expect(() => {
        builder.buildEntityKey("user", "123", "");
      }).toThrow("Tenant ID cannot be empty when provided");
    });

    it("应该正确处理包含特殊字符的实体ID", () => {
      const key = builder.buildEntityKey("user", "user-123-abc");
      expect(key).toBe("repo:user:user-123-abc");
    });
  });

  describe("buildQueryKey", () => {
    it("应该构建查询缓存键", () => {
      const key = builder.buildQueryKey("GetUserProfile", { userId: "123" });
      expect(key).toMatch(/^query:GetUserProfile:/);
    });

    it("应该对相同参数生成相同键", () => {
      const params = { userId: "123", role: "admin" };
      const key1 = builder.buildQueryKey("GetUserProfile", params);
      const key2 = builder.buildQueryKey("GetUserProfile", params);
      expect(key1).toBe(key2);
    });

    it("应该对参数顺序不敏感", () => {
      const params1 = { userId: "123", role: "admin" };
      const params2 = { role: "admin", userId: "123" };
      const key1 = builder.buildQueryKey("GetUserProfile", params1);
      const key2 = builder.buildQueryKey("GetUserProfile", params2);
      expect(key1).toBe(key2);
    });

    it("应该对不同参数生成不同键", () => {
      const key1 = builder.buildQueryKey("GetUserProfile", { userId: "123" });
      const key2 = builder.buildQueryKey("GetUserProfile", { userId: "456" });
      expect(key1).not.toBe(key2);
    });

    it("应该对不同查询类型生成不同键", () => {
      const params = { userId: "123" };
      const key1 = builder.buildQueryKey("GetUserProfile", params);
      const key2 = builder.buildQueryKey("GetUserList", params);
      expect(key1).not.toBe(key2);
    });

    it("应该抛出错误当查询类型为空时", () => {
      expect(() => {
        builder.buildQueryKey("", { userId: "123" });
      }).toThrow("Query type cannot be empty");
    });

    it("应该处理空参数对象", () => {
      const key = builder.buildQueryKey("GetUserList", {});
      expect(key).toMatch(/^query:GetUserList:/);
    });

    it("应该正确处理复杂参数", () => {
      const params = {
        userId: "123",
        filters: { role: "admin", status: "active" },
        page: 1,
        size: 10,
      };
      const key = builder.buildQueryKey("GetUserList", params);
      expect(key).toMatch(/^query:GetUserList:/);
    });
  });
});
