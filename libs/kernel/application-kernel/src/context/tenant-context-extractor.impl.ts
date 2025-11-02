/**
 * @fileoverview 租户上下文提取器实现
 * @description 从HTTP请求、JWT Token等来源提取租户上下文
 */

import { Injectable, Optional, Inject } from "@nestjs/common";
import {
  TenantId,
  OrganizationId,
  DepartmentId,
  EntityId,
} from "@hl8/domain-kernel";
import { TenantContext } from "@hl8/domain-kernel";
import type { ITenantContextExtractor } from "./tenant-context-extractor.interface.js";
import type { IUserContextQuery } from "./user-context-query.interface.js";

/**
 * JWT配置选项
 * @description JWT token解析的配置
 */
export interface JwtConfig {
  /** JWT签名密钥（必需） */
  secret: string;
  /** JWT算法（可选，默认HS256） */
  algorithm?: string;
}

/**
 * 租户上下文提取器实现
 * @description 从各种来源提取租户上下文信息
 */
@Injectable()
export class TenantContextExtractorImpl implements ITenantContextExtractor {
  private readonly jwtConfig: JwtConfig | null;

  /**
   * 创建租户上下文提取器实例
   * @param userContextQuery 用户上下文查询接口（可选，用于从用户ID提取租户上下文）
   * @param jwtConfig JWT配置（可选，用于从JWT token提取租户上下文）
   * @description
   * - 如果未提供jwtConfig，extractFromToken将始终返回null
   * - 如果未提供userContextQuery，extractFromUser将始终返回null
   */
  constructor(
    @Optional()
    @Inject("IUserContextQuery")
    private readonly userContextQuery?: IUserContextQuery,
    @Optional()
    @Inject("JWT_CONFIG")
    jwtConfig?: JwtConfig,
  ) {
    this.jwtConfig = jwtConfig || null;
  }
  /**
   * 从HTTP请求头中提取租户上下文
   * @param headers HTTP请求头对象
   * @returns 租户上下文或null
   */
  async extractFromHeader(
    headers: Record<string, string>,
  ): Promise<TenantContext | null> {
    try {
      const tenantIdStr = headers["x-tenant-id"] || headers["X-Tenant-Id"];
      if (!tenantIdStr) {
        return null;
      }

      const tenantId = TenantId.fromString(tenantIdStr);

      const options: {
        organizationId?: OrganizationId;
        departmentId?: DepartmentId;
        permissions?: string[];
      } = {};

      // 提取组织ID
      const organizationIdStr =
        headers["x-organization-id"] || headers["X-Organization-Id"];
      if (organizationIdStr) {
        options.organizationId = new OrganizationId(
          tenantId,
          organizationIdStr,
        );
      }

      // 提取部门ID
      const departmentIdStr =
        headers["x-department-id"] || headers["X-Department-Id"];
      if (departmentIdStr && options.organizationId) {
        options.departmentId = new DepartmentId(
          options.organizationId,
          departmentIdStr,
        );
      }

      // 提取权限
      const permissionsStr =
        headers["x-permissions"] || headers["X-Permissions"];
      if (permissionsStr) {
        options.permissions = permissionsStr.split(",").map((p) => p.trim());
      }

      return new TenantContext(tenantId, options);
    } catch (_error) {
      // 提取失败返回null
      return null;
    }
  }

  /**
   * 从JWT Token中提取租户上下文
   * @param token JWT Token字符串
   * @returns 租户上下文或null
   * @description
   * 从JWT token的payload中提取租户上下文信息。
   * 期望的JWT payload格式：
   * {
   *   tenantId: string (必需),
   *   organizationId?: string (可选),
   *   departmentId?: string (可选),
   *   permissions?: string[] (可选),
   *   isCrossTenant?: boolean (可选)
   * }
   * @throws 不会抛出异常，所有错误都会被捕获并返回null
   * @example
   * ```typescript
   * const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...";
   * const context = await extractor.extractFromToken(token);
   * if (context) {
   *   console.log(context.tenantId.value);
   * }
   * ```
   */
  async extractFromToken(token: string): Promise<TenantContext | null> {
    if (!token || typeof token !== "string" || token.trim().length === 0) {
      return null;
    }

    // 如果未配置JWT，返回null
    if (!this.jwtConfig || !this.jwtConfig.secret) {
      return null;
    }

    try {
      // 动态导入 jsonwebtoken
      // 如果项目中未安装 jsonwebtoken，此代码会抛出错误并返回null
      const jwtModule = await import("jsonwebtoken");
      // jsonwebtoken 可能是 CommonJS 模块，需要处理 default 导出

      const jwt = jwtModule.default || jwtModule;

      const { verify } = jwt;

      // 验证并解析JWT token
      // 允许所有常见算法，不限制单一算法

      const decoded = verify(token, this.jwtConfig.secret, {
        algorithms: [
          "HS256",
          "HS384",
          "HS512",
          "RS256",
          "RS384",
          "RS512",
          "ES256",
          "ES384",
          "ES512",
          "PS256",
          "PS384",
          "PS512",
        ],
      }) as Record<string, unknown>;

      // 从payload中提取租户ID（必需）
      const tenantIdStr = decoded.tenantId;
      if (
        !tenantIdStr ||
        typeof tenantIdStr !== "string" ||
        tenantIdStr.trim().length === 0
      ) {
        return null;
      }

      const tenantId = TenantId.fromString(tenantIdStr);

      // 构建租户上下文选项
      const options: {
        organizationId?: OrganizationId;
        departmentId?: DepartmentId;
        permissions?: string[];
        isCrossTenant?: boolean;
      } = {};

      // 提取组织ID（可选）
      const organizationIdStr = decoded.organizationId;
      if (
        organizationIdStr &&
        typeof organizationIdStr === "string" &&
        organizationIdStr.trim().length > 0
      ) {
        try {
          options.organizationId = new OrganizationId(
            tenantId,
            organizationIdStr,
          );
        } catch {
          // 组织ID格式无效，忽略
        }
      }

      // 提取部门ID（可选，但需要组织ID）
      // 如果没有组织ID，部门ID会被忽略（不抛出错误，保持上下文有效）
      const departmentIdStr = decoded.departmentId;
      if (
        departmentIdStr &&
        typeof departmentIdStr === "string" &&
        departmentIdStr.trim().length > 0 &&
        options.organizationId
      ) {
        try {
          options.departmentId = new DepartmentId(
            options.organizationId,
            departmentIdStr,
          );
        } catch {
          // 部门ID格式无效，忽略
        }
      }

      // 提取权限列表（可选）
      const permissions = decoded.permissions;
      if (Array.isArray(permissions)) {
        options.permissions = permissions
          .filter((p) => typeof p === "string")
          .map((p) => p.trim())
          .filter((p) => p.length > 0);
      } else if (typeof permissions === "string") {
        // 支持逗号分隔的字符串格式
        options.permissions = permissions
          .split(",")
          .map((p) => p.trim())
          .filter((p) => p.length > 0);
      }

      // 提取跨租户访问权限（可选）
      if (typeof decoded.isCrossTenant === "boolean") {
        options.isCrossTenant = decoded.isCrossTenant;
      }

      try {
        return new TenantContext(tenantId, options);
      } catch (_contextError) {
        // TenantContext创建失败（如层级验证失败），也返回null
        return null;
      }
    } catch (_error) {
      // 捕获所有错误（token无效、过期、格式错误、缺少依赖等）
      // 静默返回null，不抛出异常
      return null;
    }
  }

  /**
   * 从用户信息中提取租户上下文
   * @param userId 用户ID（字符串格式的UUID）
   * @returns 租户上下文或null
   * @description
   * 通过用户上下文查询接口查询用户的租户上下文信息。
   * 如果未配置用户上下文查询接口，此方法将始终返回null。
   * @throws 不会抛出异常，所有错误都会被捕获并返回null
   * @example
   * ```typescript
   * const userId = "550e8400-e29b-41d4-a716-446655440000";
   * const context = await extractor.extractFromUser(userId);
   * if (context) {
   *   console.log(context.tenantId.value);
   * }
   * ```
   */
  async extractFromUser(userId: string): Promise<TenantContext | null> {
    if (!userId || typeof userId !== "string" || userId.trim().length === 0) {
      return null;
    }

    // 如果未配置用户上下文查询接口，返回null
    if (!this.userContextQuery) {
      return null;
    }

    try {
      // 查询用户的租户上下文信息
      const userContext = await this.userContextQuery.queryUserTenantContext(
        userId.trim(),
      );

      if (!userContext || !userContext.tenantId) {
        return null;
      }

      // 验证租户ID格式
      const tenantId = TenantId.fromString(userContext.tenantId);

      // 构建租户上下文选项
      const options: {
        organizationId?: OrganizationId;
        departmentId?: DepartmentId;
        permissions?: string[];
        isCrossTenant?: boolean;
        userId?: EntityId;
      } = {};

      // 添加用户ID
      try {
        options.userId = EntityId.fromString(userId.trim());
      } catch {
        // 如果用户ID格式无效，继续处理但不设置userId
      }

      // 添加组织ID（可选）
      if (
        userContext.organizationId &&
        typeof userContext.organizationId === "string" &&
        userContext.organizationId.trim().length > 0
      ) {
        try {
          options.organizationId = new OrganizationId(
            tenantId,
            userContext.organizationId.trim(),
          );
        } catch {
          // 组织ID格式无效，忽略
        }
      }

      // 添加部门ID（可选，但需要组织ID）
      if (
        userContext.departmentId &&
        typeof userContext.departmentId === "string" &&
        userContext.departmentId.trim().length > 0 &&
        options.organizationId
      ) {
        try {
          options.departmentId = new DepartmentId(
            options.organizationId,
            userContext.departmentId.trim(),
          );
        } catch {
          // 部门ID格式无效，忽略
        }
      }

      // 添加权限列表（可选）
      if (Array.isArray(userContext.permissions)) {
        options.permissions = userContext.permissions
          .filter((p) => typeof p === "string")
          .map((p) => p.trim())
          .filter((p) => p.length > 0);
      }

      // 添加跨租户访问权限（可选）
      if (typeof userContext.isCrossTenant === "boolean") {
        options.isCrossTenant = userContext.isCrossTenant;
      }

      try {
        return new TenantContext(tenantId, options);
      } catch (_contextError) {
        // TenantContext创建失败（如层级验证失败），也返回null
        return null;
      }
    } catch (_error) {
      // 捕获所有错误（查询失败、格式错误等）
      // 静默返回null，不抛出异常
      return null;
    }
  }

  /**
   * 从HTTP请求中提取租户上下文
   * @param request HTTP请求对象
   * @returns 租户上下文或null
   */
  async extractFromRequest(request: unknown): Promise<TenantContext | null> {
    try {
      // 尝试从请求中提取headers
      if (
        typeof request === "object" &&
        request !== null &&
        "headers" in request
      ) {
        const headers = request.headers as Record<string, string>;
        return await this.extractFromHeader(headers);
      }

      return null;
    } catch (_error) {
      return null;
    }
  }
}
