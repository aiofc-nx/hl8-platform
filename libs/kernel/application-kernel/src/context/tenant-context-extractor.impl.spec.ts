/**
 * @fileoverview 租户上下文提取器测试
 * @description 测试 TenantContextExtractorImpl 的各种提取功能
 */

import {
  TenantContextExtractorImpl,
  type JwtConfig,
} from "./tenant-context-extractor.impl.js";
import type {
  IUserContextQuery,
  UserTenantContext,
} from "./user-context-query.interface.js";
import {
  TenantId,
  OrganizationId,
  DepartmentId,
  EntityId,
} from "@hl8/domain-kernel";
import jwt from "jsonwebtoken";

describe("TenantContextExtractorImpl", () => {
  let extractor: TenantContextExtractorImpl;
  let mockUserContextQuery: jest.Mocked<IUserContextQuery>;
  let jwtConfig: JwtConfig;

  beforeEach(() => {
    // 创建 JWT 配置
    jwtConfig = {
      secret: "test-secret-key-for-jwt-signing",
      algorithm: "HS256",
    };

    // 创建 mock 用户上下文查询接口
    mockUserContextQuery = {
      queryUserTenantContext: jest.fn(),
    };

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
    it("应该在未配置JWT时返回null", async () => {
      const extractorWithoutJwt = new TenantContextExtractorImpl();
      const context = await extractorWithoutJwt.extractFromToken("test-token");

      expect(context).toBeNull();
    });

    it("应该在token为空时返回null", async () => {
      const extractorWithJwt = new TenantContextExtractorImpl(
        undefined,
        jwtConfig,
      );

      expect(await extractorWithJwt.extractFromToken("")).toBeNull();
      expect(await extractorWithJwt.extractFromToken("   ")).toBeNull();
      expect(
        await extractorWithJwt.extractFromToken(null as unknown as string),
      ).toBeNull();
      expect(
        await extractorWithJwt.extractFromToken(undefined as unknown as string),
      ).toBeNull();
    });

    it("应该从有效JWT token中提取完整租户上下文", async () => {
      const tenantId = TenantId.generate();
      const organizationId = new OrganizationId(tenantId);
      const departmentId = new DepartmentId(organizationId);

      const payload = {
        tenantId: tenantId.value,
        organizationId: organizationId.value,
        departmentId: departmentId.value,
        permissions: ["read", "write", "delete"],
        isCrossTenant: false,
      };

      const token = jwt.sign(payload, jwtConfig.secret, {
        algorithm: jwtConfig.algorithm as jwt.Algorithm,
      });

      const extractorWithJwt = new TenantContextExtractorImpl(
        undefined,
        jwtConfig,
      );
      const context = await extractorWithJwt.extractFromToken(token);

      expect(context).not.toBeNull();
      expect(context?.tenantId.equals(tenantId)).toBe(true);
      expect(context?.organizationId?.equals(organizationId)).toBe(true);
      expect(context?.departmentId?.equals(departmentId)).toBe(true);
      expect(context?.permissions).toEqual(["read", "write", "delete"]);
      expect(context?.isCrossTenant).toBe(false);
    });

    it("应该从JWT token中提取仅租户ID的上下文", async () => {
      const tenantId = TenantId.generate();

      const payload = {
        tenantId: tenantId.value,
      };

      const token = jwt.sign(payload, jwtConfig.secret, {
        algorithm: jwtConfig.algorithm as jwt.Algorithm,
      });

      const extractorWithJwt = new TenantContextExtractorImpl(
        undefined,
        jwtConfig,
      );
      const context = await extractorWithJwt.extractFromToken(token);

      expect(context).not.toBeNull();
      expect(context?.tenantId.equals(tenantId)).toBe(true);
      expect(context?.organizationId).toBeUndefined();
      expect(context?.departmentId).toBeUndefined();
      expect(context?.permissions).toEqual([]);
    });

    it("应该处理逗号分隔的权限字符串", async () => {
      const tenantId = TenantId.generate();

      const payload = {
        tenantId: tenantId.value,
        permissions: "read,write,delete",
      };

      const token = jwt.sign(payload, jwtConfig.secret, {
        algorithm: jwtConfig.algorithm as jwt.Algorithm,
      });

      const extractorWithJwt = new TenantContextExtractorImpl(
        undefined,
        jwtConfig,
      );
      const context = await extractorWithJwt.extractFromToken(token);

      expect(context).not.toBeNull();
      expect(context?.permissions).toEqual(["read", "write", "delete"]);
    });

    it("应该在token无效时返回null", async () => {
      const extractorWithJwt = new TenantContextExtractorImpl(
        undefined,
        jwtConfig,
      );

      const invalidToken = "invalid.jwt.token";
      const context = await extractorWithJwt.extractFromToken(invalidToken);

      expect(context).toBeNull();
    });

    it("应该在token签名错误时返回null", async () => {
      const tenantId = TenantId.generate();
      const payload = { tenantId: tenantId.value };

      // 使用错误的密钥签名
      const token = jwt.sign(payload, "wrong-secret", {
        algorithm: jwtConfig.algorithm as jwt.Algorithm,
      });

      const extractorWithJwt = new TenantContextExtractorImpl(
        undefined,
        jwtConfig,
      );
      const context = await extractorWithJwt.extractFromToken(token);

      expect(context).toBeNull();
    });

    it("应该在token过期时返回null", async () => {
      const tenantId = TenantId.generate();
      const payload = { tenantId: tenantId.value };

      // 创建一个已过期的token（1秒前过期）
      const expiredPayload = {
        ...payload,
        exp: Math.floor(Date.now() / 1000) - 1, // 1秒前过期
      };
      const token = jwt.sign(expiredPayload, jwtConfig.secret, {
        algorithm: jwtConfig.algorithm as jwt.Algorithm,
      });

      const extractorWithJwt = new TenantContextExtractorImpl(
        undefined,
        jwtConfig,
      );
      const context = await extractorWithJwt.extractFromToken(token);

      expect(context).toBeNull();
    });

    it("应该在token缺少tenantId时返回null", async () => {
      const payload = {
        // 缺少 tenantId
        organizationId: "some-org-id",
      };

      const token = jwt.sign(payload, jwtConfig.secret, {
        algorithm: jwtConfig.algorithm as jwt.Algorithm,
      });

      const extractorWithJwt = new TenantContextExtractorImpl(
        undefined,
        jwtConfig,
      );
      const context = await extractorWithJwt.extractFromToken(token);

      expect(context).toBeNull();
    });

    it("应该忽略无效的组织ID格式", async () => {
      const tenantId = TenantId.generate();

      const payload = {
        tenantId: tenantId.value,
        organizationId: "invalid-org-id",
      };

      const token = jwt.sign(payload, jwtConfig.secret, {
        algorithm: jwtConfig.algorithm as jwt.Algorithm,
      });

      const extractorWithJwt = new TenantContextExtractorImpl(
        undefined,
        jwtConfig,
      );
      const context = await extractorWithJwt.extractFromToken(token);

      // 无效的组织ID应该被忽略，但上下文仍然有效（只有租户ID）
      expect(context).not.toBeNull();
      expect(context?.tenantId.equals(tenantId)).toBe(true);
      // 组织ID格式无效，应该被忽略
      expect(context?.organizationId).toBeUndefined();
      expect(context?.permissions).toEqual([]);
    });

    it("应该忽略没有组织的部门ID", async () => {
      const tenantId = TenantId.generate();
      const organizationId = new OrganizationId(tenantId);
      const departmentId = new DepartmentId(organizationId);

      // 提供部门ID但没有组织ID
      const payload = {
        tenantId: tenantId.value,
        departmentId: departmentId.value,
        // 没有 organizationId
      };

      const token = jwt.sign(payload, jwtConfig.secret, {
        algorithm: jwtConfig.algorithm as jwt.Algorithm,
      });

      const extractorWithJwt = new TenantContextExtractorImpl(
        undefined,
        jwtConfig,
      );
      const context = await extractorWithJwt.extractFromToken(token);

      expect(context).not.toBeNull();
      expect(context?.tenantId.equals(tenantId)).toBe(true);
      // 没有组织ID，部门ID应该被忽略
      expect(context?.departmentId).toBeUndefined();
    });

    it("应该支持不同的JWT算法", async () => {
      const tenantId = TenantId.generate();
      const payload = { tenantId: tenantId.value };

      // 测试 HS384 算法
      const configHS384: JwtConfig = {
        secret: jwtConfig.secret,
        algorithm: "HS384",
      };

      const token = jwt.sign(payload, configHS384.secret, {
        algorithm: configHS384.algorithm as jwt.Algorithm,
      });

      const extractorWithJwt = new TenantContextExtractorImpl(
        undefined,
        configHS384,
      );
      const context = await extractorWithJwt.extractFromToken(token);

      expect(context).not.toBeNull();
      expect(context?.tenantId.equals(tenantId)).toBe(true);
    });
  });

  describe("extractFromUser", () => {
    it("应该在未配置用户查询接口时返回null", async () => {
      const extractorWithoutUserQuery = new TenantContextExtractorImpl();
      const context =
        await extractorWithoutUserQuery.extractFromUser("user-id");

      expect(context).toBeNull();
    });

    it("应该在userId为空时返回null", async () => {
      const extractorWithUserQuery = new TenantContextExtractorImpl(
        mockUserContextQuery,
      );

      expect(await extractorWithUserQuery.extractFromUser("")).toBeNull();
      expect(await extractorWithUserQuery.extractFromUser("   ")).toBeNull();
      expect(
        await extractorWithUserQuery.extractFromUser(null as unknown as string),
      ).toBeNull();
      expect(
        await extractorWithUserQuery.extractFromUser(
          undefined as unknown as string,
        ),
      ).toBeNull();
    });

    it("应该从用户信息中提取完整租户上下文", async () => {
      const tenantId = TenantId.generate();
      const organizationId = new OrganizationId(tenantId);
      const departmentId = new DepartmentId(organizationId);
      const userId = EntityId.generate();

      const userContext: UserTenantContext = {
        tenantId: tenantId.value,
        organizationId: organizationId.value,
        departmentId: departmentId.value,
        permissions: ["read", "write"],
        isCrossTenant: false,
      };

      mockUserContextQuery.queryUserTenantContext.mockResolvedValue(
        userContext,
      );

      const extractorWithUserQuery = new TenantContextExtractorImpl(
        mockUserContextQuery,
      );
      const context = await extractorWithUserQuery.extractFromUser(
        userId.value,
      );

      expect(context).not.toBeNull();
      expect(context?.tenantId.equals(tenantId)).toBe(true);
      expect(context?.organizationId?.equals(organizationId)).toBe(true);
      expect(context?.departmentId?.equals(departmentId)).toBe(true);
      expect(context?.permissions).toEqual(["read", "write"]);
      expect(context?.isCrossTenant).toBe(false);
      expect(context?.userId?.equals(userId)).toBe(true);

      expect(mockUserContextQuery.queryUserTenantContext).toHaveBeenCalledWith(
        userId.value,
      );
      expect(mockUserContextQuery.queryUserTenantContext).toHaveBeenCalledTimes(
        1,
      );
    });

    it("应该从用户信息中提取仅租户ID的上下文", async () => {
      const tenantId = TenantId.generate();
      const userId = EntityId.generate();

      const userContext: UserTenantContext = {
        tenantId: tenantId.value,
      };

      mockUserContextQuery.queryUserTenantContext.mockResolvedValue(
        userContext,
      );

      const extractorWithUserQuery = new TenantContextExtractorImpl(
        mockUserContextQuery,
      );
      const context = await extractorWithUserQuery.extractFromUser(
        userId.value,
      );

      expect(context).not.toBeNull();
      expect(context?.tenantId.equals(tenantId)).toBe(true);
      expect(context?.organizationId).toBeUndefined();
      expect(context?.departmentId).toBeUndefined();
      expect(context?.permissions).toEqual([]);
      expect(context?.userId?.equals(userId)).toBe(true);
    });

    it("应该在用户不存在时返回null", async () => {
      mockUserContextQuery.queryUserTenantContext.mockResolvedValue(null);

      const extractorWithUserQuery = new TenantContextExtractorImpl(
        mockUserContextQuery,
      );
      const context = await extractorWithUserQuery.extractFromUser(
        "non-existent-user-id",
      );

      expect(context).toBeNull();
    });

    it("应该在用户上下文缺少tenantId时返回null", async () => {
      const userContext = {
        tenantId: undefined,
        organizationId: "some-org-id",
      } as unknown as UserTenantContext;

      mockUserContextQuery.queryUserTenantContext.mockResolvedValue(
        userContext,
      );

      const extractorWithUserQuery = new TenantContextExtractorImpl(
        mockUserContextQuery,
      );
      const context = await extractorWithUserQuery.extractFromUser("user-id");

      expect(context).toBeNull();
    });

    it("应该在查询失败时返回null", async () => {
      mockUserContextQuery.queryUserTenantContext.mockRejectedValue(
        new Error("查询失败"),
      );

      const extractorWithUserQuery = new TenantContextExtractorImpl(
        mockUserContextQuery,
      );
      const context = await extractorWithUserQuery.extractFromUser("user-id");

      expect(context).toBeNull();
    });

    it("应该忽略无效的组织ID格式", async () => {
      const tenantId = TenantId.generate();
      const userId = EntityId.generate();

      const userContext: UserTenantContext = {
        tenantId: tenantId.value,
        organizationId: "invalid-org-id",
      };

      mockUserContextQuery.queryUserTenantContext.mockResolvedValue(
        userContext,
      );

      const extractorWithUserQuery = new TenantContextExtractorImpl(
        mockUserContextQuery,
      );
      const context = await extractorWithUserQuery.extractFromUser(
        userId.value,
      );

      // 无效的组织ID应该被忽略，但上下文仍然有效（只有租户ID）
      expect(context).not.toBeNull();
      expect(context?.tenantId.equals(tenantId)).toBe(true);
      // 组织ID格式无效，应该被忽略
      expect(context?.organizationId).toBeUndefined();
      expect(context?.permissions).toEqual([]);
    });

    it("应该忽略没有组织的部门ID", async () => {
      const tenantId = TenantId.generate();
      const organizationId = new OrganizationId(tenantId);
      const departmentId = new DepartmentId(organizationId);
      const userId = EntityId.generate();

      // 提供部门ID但没有组织ID
      const userContext: UserTenantContext = {
        tenantId: tenantId.value,
        departmentId: departmentId.value,
        // 没有 organizationId
      };

      mockUserContextQuery.queryUserTenantContext.mockResolvedValue(
        userContext,
      );

      const extractorWithUserQuery = new TenantContextExtractorImpl(
        mockUserContextQuery,
      );
      const context = await extractorWithUserQuery.extractFromUser(
        userId.value,
      );

      expect(context).not.toBeNull();
      expect(context?.tenantId.equals(tenantId)).toBe(true);
      // 没有组织ID，部门ID应该被忽略
      expect(context?.departmentId).toBeUndefined();
    });

    it("应该处理无效的用户ID格式", async () => {
      const tenantId = TenantId.generate();

      const userContext: UserTenantContext = {
        tenantId: tenantId.value,
      };

      mockUserContextQuery.queryUserTenantContext.mockResolvedValue(
        userContext,
      );

      const extractorWithUserQuery = new TenantContextExtractorImpl(
        mockUserContextQuery,
      );
      // 使用无效的UUID格式
      const context =
        await extractorWithUserQuery.extractFromUser("invalid-user-id");

      expect(context).not.toBeNull();
      expect(context?.tenantId.equals(tenantId)).toBe(true);
      // 用户ID格式无效，userId应该未设置
      expect(context?.userId).toBeUndefined();
    });

    it("应该处理跨租户权限", async () => {
      const tenantId = TenantId.generate();
      const userId = EntityId.generate();

      const userContext: UserTenantContext = {
        tenantId: tenantId.value,
        isCrossTenant: true,
      };

      mockUserContextQuery.queryUserTenantContext.mockResolvedValue(
        userContext,
      );

      const extractorWithUserQuery = new TenantContextExtractorImpl(
        mockUserContextQuery,
      );
      const context = await extractorWithUserQuery.extractFromUser(
        userId.value,
      );

      expect(context).not.toBeNull();
      expect(context?.isCrossTenant).toBe(true);
    });

    it("应该自动trim用户ID", async () => {
      const tenantId = TenantId.generate();
      const userId = EntityId.generate();

      const userContext: UserTenantContext = {
        tenantId: tenantId.value,
      };

      mockUserContextQuery.queryUserTenantContext.mockResolvedValue(
        userContext,
      );

      const extractorWithUserQuery = new TenantContextExtractorImpl(
        mockUserContextQuery,
      );
      // 用户ID带有空格
      await extractorWithUserQuery.extractFromUser(`  ${userId.value}  `);

      expect(mockUserContextQuery.queryUserTenantContext).toHaveBeenCalledWith(
        userId.value,
      );
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
