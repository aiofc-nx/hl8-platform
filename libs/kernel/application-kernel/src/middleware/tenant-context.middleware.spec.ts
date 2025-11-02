/**
 * @fileoverview 租户上下文中间件测试
 * @description 测试 TenantContextMiddleware 的各种功能
 */

import { Test, TestingModule } from "@nestjs/testing";
import { Logger } from "@hl8/logger";
import { TenantContextMiddleware } from "./tenant-context.middleware.js";
import type { ITenantContextExtractor } from "../context/tenant-context-extractor.interface.js";
import type { ITenantPermissionValidator } from "../context/tenant-permission-validator.interface.js";
import type { ExecutionContext } from "../bus/command-query-bus.interface.js";
import { BaseCommand } from "../commands/base/command.base.js";
import { BaseQuery } from "../queries/base/query.base.js";
import {
  TenantContext,
  TenantId,
  OrganizationId,
  DepartmentId,
} from "@hl8/domain-kernel";

/**
 * 测试命令类
 */
class TestCommand extends BaseCommand {
  constructor(
    public readonly data: { name: string },
    userId?: string,
  ) {
    super("test-aggregate-id", "TestCommand", { userId });
  }

  public clone(): TestCommand {
    return new TestCommand(this.data, this.userId);
  }
}

/**
 * 测试查询类
 */
class TestQuery extends BaseQuery {
  constructor(
    public readonly filters: { name?: string },
    userId?: string,
  ) {
    super("TestQuery", { userId });
  }

  public clone(): TestQuery {
    return new TestQuery(this.filters, this.userId);
  }
}

describe("TenantContextMiddleware", () => {
  let middleware: TenantContextMiddleware;
  let mockLogger: jest.Mocked<Logger>;
  let mockExtractor: jest.Mocked<ITenantContextExtractor>;
  let mockValidator: jest.Mocked<ITenantPermissionValidator>;

  beforeEach(() => {
    mockLogger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    } as any;

    mockExtractor = {
      extractFromRequest: jest.fn(),
      extractFromToken: jest.fn(),
      extractFromUser: jest.fn(),
      extractFromHeader: jest.fn(),
    };

    mockValidator = {
      validateTenantAccess: jest.fn(),
      validateOrganizationAccess: jest.fn(),
      validateDepartmentAccess: jest.fn(),
      validateCrossTenantAccess: jest.fn(),
      validatePermission: jest.fn(),
    };

    middleware = new TenantContextMiddleware(
      mockLogger,
      mockExtractor,
      mockValidator,
    );
  });

  describe("基本信息", () => {
    it("应该返回正确的名称", () => {
      expect(middleware.getName()).toBe("TenantContextMiddleware");
    });

    it("应该返回正确的描述", () => {
      expect(middleware.getDescription()).toBe(
        "自动提取和注入租户上下文到命令和查询中",
      );
    });

    it("应该返回正确的版本", () => {
      expect(middleware.getVersion()).toBe("1.0.0");
    });

    it("应该返回正确的优先级", () => {
      expect(middleware.getPriority()).toBe(50);
    });
  });

  describe("命令处理", () => {
    it("应该成功提取并注入租户上下文", async () => {
      const tenantId = TenantId.generate();
      const tenantContext = new TenantContext(tenantId);

      mockExtractor.extractFromHeader.mockResolvedValue(tenantContext);

      const command = new TestCommand({ name: "Test" });
      const context: ExecutionContext = {
        executionId: "test-id",
        startTime: new Date(),
        executionType: "command",
        objectType: "TestCommand",
        metadata: {
          headers: {},
        },
        middlewareHistory: [],
      };

      const result = await middleware.beforeCommand!(command, context);

      expect(result).toBe(true);
      expect(mockExtractor.extractFromHeader).toHaveBeenCalled();
      expect(mockLogger.debug).toHaveBeenCalled();
    });

    it("应该在无法提取上下文时拒绝执行", async () => {
      mockExtractor.extractFromHeader.mockResolvedValue(null);

      const command = new TestCommand({ name: "Test" });
      const context: ExecutionContext = {
        executionId: "test-id",
        startTime: new Date(),
        executionType: "command",
        objectType: "TestCommand",
        metadata: {
          headers: {},
        },
        middlewareHistory: [],
      };

      const result = await middleware.beforeCommand!(command, context);

      expect(result).toBe(false);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        "无法提取租户上下文，拒绝执行命令",
        {
          commandType: "TestCommand",
          executionId: "test-id",
        },
      );
    });

    it("应该在提取失败时拒绝执行", async () => {
      mockExtractor.extractFromHeader.mockRejectedValue(new Error("提取失败"));

      const command = new TestCommand({ name: "Test" });
      const context: ExecutionContext = {
        executionId: "test-id",
        startTime: new Date(),
        executionType: "command",
        objectType: "TestCommand",
        metadata: {
          headers: {},
        },
        middlewareHistory: [],
      };

      const result = await middleware.beforeCommand!(command, context);

      expect(result).toBe(false);
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it("应该在没有headers时拒绝执行", async () => {
      const command = new TestCommand({ name: "Test" });
      const context: ExecutionContext = {
        executionId: "test-id",
        startTime: new Date(),
        executionType: "command",
        objectType: "TestCommand",
        metadata: {},
        middlewareHistory: [],
      };

      const result = await middleware.beforeCommand!(command, context);

      expect(result).toBe(false);
      expect(mockExtractor.extractFromHeader).not.toHaveBeenCalled();
    });
  });

  describe("查询处理", () => {
    it("应该成功提取并注入租户上下文", async () => {
      const tenantId = TenantId.generate();
      const tenantContext = new TenantContext(tenantId);

      mockExtractor.extractFromHeader.mockResolvedValue(tenantContext);

      const query = new TestQuery({ name: "Test" });
      const context: ExecutionContext = {
        executionId: "test-id",
        startTime: new Date(),
        executionType: "query",
        objectType: "TestQuery",
        metadata: {
          headers: {},
        },
        middlewareHistory: [],
      };

      const result = await middleware.beforeQuery!(query, context);

      expect(result).toBe(true);
      expect(mockExtractor.extractFromHeader).toHaveBeenCalled();
      expect(mockLogger.debug).toHaveBeenCalled();
    });

    it("应该在无法提取上下文时拒绝执行", async () => {
      mockExtractor.extractFromHeader.mockResolvedValue(null);

      const query = new TestQuery({ name: "Test" });
      const context: ExecutionContext = {
        executionId: "test-id",
        startTime: new Date(),
        executionType: "query",
        objectType: "TestQuery",
        metadata: {
          headers: {},
        },
        middlewareHistory: [],
      };

      const result = await middleware.beforeQuery!(query, context);

      expect(result).toBe(false);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        "无法提取租户上下文，拒绝执行查询",
        {
          queryType: "TestQuery",
          executionId: "test-id",
        },
      );
    });

    it("应该在提取失败时拒绝执行", async () => {
      mockExtractor.extractFromHeader.mockRejectedValue(new Error("提取失败"));

      const query = new TestQuery({ name: "Test" });
      const context: ExecutionContext = {
        executionId: "test-id",
        startTime: new Date(),
        executionType: "query",
        objectType: "TestQuery",
        metadata: {
          headers: {},
        },
        middlewareHistory: [],
      };

      const result = await middleware.beforeQuery!(query, context);

      expect(result).toBe(false);
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });
});
