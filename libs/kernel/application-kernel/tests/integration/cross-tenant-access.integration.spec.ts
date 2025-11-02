/**
 * @fileoverview 跨租户管理员集成测试
 * @description 验证跨租户访问权限控制和审计日志记录
 */

import { Test, TestingModule } from "@nestjs/testing";
import { Inject } from "@nestjs/common";
import { CommandHandler, QueryHandler } from "@nestjs/cqrs";
import { Logger } from "@hl8/logger";
import {
  TenantId,
  OrganizationId,
  DepartmentId,
  EntityId,
  TenantContext,
} from "@hl8/domain-kernel";
import { BaseCommand } from "../../src/commands/base/command.base.js";
import { BaseQuery } from "../../src/queries/base/query.base.js";
import { CommandResult } from "../../src/commands/base/command-result.js";
import { QueryResult } from "../../src/queries/base/query-result.js";
import { ApplicationKernelModule } from "../../src/application-kernel.module.js";
import { TenantContextMiddleware } from "../../src/middleware/tenant-context.middleware.js";
import { TenantContextExtractorImpl } from "../../src/context/tenant-context-extractor.impl.js";
import { TenantPermissionValidatorImpl } from "../../src/context/tenant-permission-validator.impl.js";
import { CommandQueryBusImpl } from "../../src/bus/command-query-bus.impl.js";
import type { ITenantContextExtractor } from "../../src/context/tenant-context-extractor.interface.js";
import type { ITenantPermissionValidator } from "../../src/context/tenant-permission-validator.interface.js";
import type { ExecutionContext } from "../../src/bus/command-query-bus.interface.js";

/**
 * 审计日志条目
 */
interface AuditLogEntry {
  timestamp: Date;
  userId?: string;
  tenantId: string;
  action: string;
  resourceId?: string;
  isCrossTenant: boolean;
  success: boolean;
  errorCode?: string;
}

/**
 * Mock 审计日志服务
 */
class MockAuditLogService {
  private readonly logs: AuditLogEntry[] = [];

  /**
   * 记录操作日志
   */
  log(entry: AuditLogEntry): void {
    this.logs.push(entry);
  }

  /**
   * 获取所有日志
   */
  getLogs(): AuditLogEntry[] {
    return [...this.logs];
  }

  /**
   * 获取跨租户访问日志
   */
  getCrossTenantLogs(): AuditLogEntry[] {
    return this.logs.filter((log) => log.isCrossTenant);
  }

  /**
   * 清除所有日志
   */
  clear(): void {
    this.logs.length = 0;
  }
}

/**
 * Mock 资源存储（支持跨租户访问）
 */
class MockCrossTenantResourceStore {
  private readonly resources: Map<
    string,
    {
      resourceId: string;
      resourceName: string;
      tenantId: string;
      organizationId?: string;
      departmentId?: string;
    }
  > = new Map();

  /**
   * 保存资源
   */
  async save(
    resourceId: string,
    resourceName: string,
    context: TenantContext,
  ): Promise<void> {
    this.resources.set(resourceId, {
      resourceId,
      resourceName,
      tenantId: context.tenantId.value,
      organizationId: context.organizationId?.value,
      departmentId: context.departmentId?.value,
    });
  }

  /**
   * 根据ID查找资源（支持跨租户访问）
   */
  async findById(
    resourceId: string,
    context: TenantContext,
    permissionValidator: ITenantPermissionValidator,
  ): Promise<{
    resourceId: string;
    resourceName: string;
    tenantId: string;
  } | null> {
    const resource = this.resources.get(resourceId);
    if (!resource) {
      return null;
    }

    const targetTenantId = TenantId.fromString(resource.tenantId);

    // 验证跨租户访问权限
    if (!context.tenantId.equals(targetTenantId)) {
      // 尝试跨租户访问
      const canAccess =
        await permissionValidator.validateCrossTenantAccess(context);
      if (!canAccess) {
        throw new Error("跨租户访问被拒绝，需要管理员权限");
      }
    }

    return {
      resourceId: resource.resourceId,
      resourceName: resource.resourceName,
      tenantId: resource.tenantId,
    };
  }

  /**
   * 查找租户下的所有资源
   */
  async findByTenant(
    tenantId: TenantId,
    context: TenantContext,
    permissionValidator: ITenantPermissionValidator,
  ): Promise<
    Array<{
      resourceId: string;
      resourceName: string;
    }>
  > {
    // 验证跨租户访问权限
    if (!context.tenantId.equals(tenantId)) {
      const canAccess =
        await permissionValidator.validateCrossTenantAccess(context);
      if (!canAccess) {
        throw new Error("跨租户访问被拒绝，需要管理员权限");
      }
    }

    const results: Array<{ resourceId: string; resourceName: string }> = [];

    for (const resource of this.resources.values()) {
      if (resource.tenantId === tenantId.value) {
        results.push({
          resourceId: resource.resourceId,
          resourceName: resource.resourceName,
        });
      }
    }

    return results;
  }

  /**
   * 清除所有资源
   */
  clear(): void {
    this.resources.clear();
  }
}

// 测试命令：创建资源
class CreateResourceCommand extends BaseCommand {
  static readonly commandType = "CreateResource";

  constructor(
    aggregateId: string,
    public readonly resourceName: string,
  ) {
    super(aggregateId, CreateResourceCommand.commandType);
  }

  public clone(): BaseCommand {
    return new CreateResourceCommand(this.aggregateId, this.resourceName);
  }
}

// 测试查询：查询资源（跨租户）
class GetCrossTenantResourceQuery extends BaseQuery {
  static readonly queryType = "GetCrossTenantResource";

  constructor(public readonly resourceId: string) {
    super(GetCrossTenantResourceQuery.queryType);
  }

  public clone(): BaseQuery {
    return new GetCrossTenantResourceQuery(this.resourceId);
  }
}

// 测试查询：查询租户资源列表（跨租户）
class ListTenantResourcesQuery extends BaseQuery {
  static readonly queryType = "ListTenantResources";

  constructor(public readonly targetTenantId: string) {
    super(ListTenantResourcesQuery.queryType);
  }

  public clone(): BaseQuery {
    return new ListTenantResourcesQuery(this.targetTenantId);
  }
}

// 命令处理器：创建资源并记录审计日志
@CommandHandler(CreateResourceCommand)
class CreateResourceHandler {
  constructor(
    private readonly resourceStore: MockCrossTenantResourceStore,
    private readonly auditLog: MockAuditLogService,
  ) {
    // 依赖注入
  }

  async handle(command: CreateResourceCommand): Promise<CommandResult> {
    if (!command.tenantContext) {
      return CommandResult.failure(
        "MISSING_TENANT_CONTEXT",
        "命令缺少租户上下文",
      );
    }

    try {
      await this.resourceStore.save(
        command.aggregateId,
        command.resourceName,
        command.tenantContext,
      );

      // 记录审计日志
      this.auditLog.log({
        timestamp: new Date(),
        userId: command.tenantContext.userId?.value,
        tenantId: command.tenantContext.tenantId.value,
        action: "CREATE_RESOURCE",
        resourceId: command.aggregateId,
        isCrossTenant: command.tenantContext.isCrossTenant,
        success: true,
      });

      return CommandResult.success({
        resourceId: command.aggregateId,
        resourceName: command.resourceName,
      });
    } catch (error) {
      // 记录失败审计日志
      this.auditLog.log({
        timestamp: new Date(),
        userId: command.tenantContext.userId?.value,
        tenantId: command.tenantContext.tenantId.value,
        action: "CREATE_RESOURCE",
        resourceId: command.aggregateId,
        isCrossTenant: command.tenantContext.isCrossTenant,
        success: false,
        errorCode: error instanceof Error ? error.message : String(error),
      });

      return CommandResult.failure(
        "RESOURCE_SAVE_FAILED",
        error instanceof Error ? error.message : String(error),
      );
    }
  }
}

// 查询处理器：跨租户查询资源
@QueryHandler(GetCrossTenantResourceQuery)
class GetCrossTenantResourceHandler {
  constructor(
    private readonly resourceStore: MockCrossTenantResourceStore,
    @Inject("ITenantPermissionValidator")
    private readonly permissionValidator: ITenantPermissionValidator,
    private readonly auditLog: MockAuditLogService,
  ) {
    // 确保依赖注入正确
  }

  async handle(query: GetCrossTenantResourceQuery): Promise<QueryResult> {
    if (!query.tenantContext) {
      return QueryResult.failure(
        "MISSING_TENANT_CONTEXT",
        "查询缺少租户上下文",
      );
    }

    try {
      const resource = await this.resourceStore.findById(
        query.resourceId,
        query.tenantContext,
        this.permissionValidator,
      );

      if (!resource) {
        return QueryResult.failure("RESOURCE_NOT_FOUND", "资源不存在");
      }

      const isCrossTenant =
        resource.tenantId !== query.tenantContext.tenantId.value;

      // 记录审计日志
      this.auditLog.log({
        timestamp: new Date(),
        userId: query.tenantContext.userId?.value,
        tenantId: query.tenantContext.tenantId.value,
        action: "GET_CROSS_TENANT_RESOURCE",
        resourceId: query.resourceId,
        isCrossTenant,
        success: true,
      });

      return QueryResult.successItem(resource);
    } catch (error) {
      // 记录失败审计日志
      this.auditLog.log({
        timestamp: new Date(),
        userId: query.tenantContext.userId?.value,
        tenantId: query.tenantContext.tenantId.value,
        action: "GET_CROSS_TENANT_RESOURCE",
        resourceId: query.resourceId,
        isCrossTenant: query.tenantContext.isCrossTenant,
        success: false,
        errorCode: error instanceof Error ? error.message : String(error),
      });

      return QueryResult.failure(
        "RESOURCE_QUERY_FAILED",
        error instanceof Error ? error.message : String(error),
      );
    }
  }
}

// 查询处理器：跨租户查询租户资源列表
@QueryHandler(ListTenantResourcesQuery)
class ListTenantResourcesHandler {
  constructor(
    private readonly resourceStore: MockCrossTenantResourceStore,
    @Inject("ITenantPermissionValidator")
    private readonly permissionValidator: ITenantPermissionValidator,
    private readonly auditLog: MockAuditLogService,
  ) {}

  async handle(query: ListTenantResourcesQuery): Promise<QueryResult> {
    if (!query.tenantContext) {
      return QueryResult.failure(
        "MISSING_TENANT_CONTEXT",
        "查询缺少租户上下文",
      );
    }

    try {
      const targetTenantId = TenantId.fromString(query.targetTenantId);
      const resources = await this.resourceStore.findByTenant(
        targetTenantId,
        query.tenantContext,
        this.permissionValidator,
      );

      const isCrossTenant =
        query.targetTenantId !== query.tenantContext.tenantId.value;

      // 记录审计日志
      this.auditLog.log({
        timestamp: new Date(),
        userId: query.tenantContext.userId?.value,
        tenantId: query.tenantContext.tenantId.value,
        action: "LIST_TENANT_RESOURCES",
        isCrossTenant,
        success: true,
      });

      return QueryResult.success(resources);
    } catch (error) {
      // 记录失败审计日志
      this.auditLog.log({
        timestamp: new Date(),
        userId: query.tenantContext.userId?.value,
        tenantId: query.tenantContext.tenantId.value,
        action: "LIST_TENANT_RESOURCES",
        isCrossTenant: query.tenantContext.isCrossTenant,
        success: false,
        errorCode: error instanceof Error ? error.message : String(error),
      });

      return QueryResult.failure(
        "RESOURCE_QUERY_FAILED",
        error instanceof Error ? error.message : String(error),
      );
    }
  }
}

describe("跨租户管理员集成测试", () => {
  let module: TestingModule;
  let bus: CommandQueryBusImpl;
  let middleware: TenantContextMiddleware;
  let resourceStore: MockCrossTenantResourceStore;
  let auditLog: MockAuditLogService;
  let extractor: TenantContextExtractorImpl;
  let permissionValidator: ITenantPermissionValidator;

  // 测试数据
  let tenant1Id: TenantId;
  let tenant2Id: TenantId;
  let organization1Id: OrganizationId;
  let organization2Id: OrganizationId;
  let adminUserId: EntityId;
  let normalUserId: EntityId;

  beforeAll(async () => {
    // 初始化测试数据
    tenant1Id = TenantId.generate();
    tenant2Id = TenantId.generate();
    organization1Id = new OrganizationId(tenant1Id);
    organization2Id = new OrganizationId(tenant2Id);
    adminUserId = EntityId.generate();
    normalUserId = EntityId.generate();

    resourceStore = new MockCrossTenantResourceStore();
    auditLog = new MockAuditLogService();

    try {
      module = await Test.createTestingModule({
        imports: [ApplicationKernelModule.forRoot()],
        providers: [
          CreateResourceHandler,
          GetCrossTenantResourceHandler,
          ListTenantResourcesHandler,
          {
            provide: MockCrossTenantResourceStore,
            useValue: resourceStore,
          },
          {
            provide: MockAuditLogService,
            useValue: auditLog,
          },
          {
            provide: "IUserContextQuery",
            useValue: null,
          },
          {
            provide: "JWT_CONFIG",
            useValue: {
              secret: "test-secret",
              algorithm: "HS256",
            },
          },
          {
            provide: TenantContextExtractorImpl,
            useFactory: (logger: Logger) => {
              return new TenantContextExtractorImpl(null, {
                secret: "test-secret",
                algorithm: "HS256",
              });
            },
            inject: [Logger],
          },
          {
            provide: "ITenantContextExtractor",
            useExisting: TenantContextExtractorImpl,
          },
          {
            provide: "ITenantPermissionValidator",
            useFactory: () => {
              return new TenantPermissionValidatorImpl();
            },
          },
          {
            provide: TenantContextMiddleware,
            useFactory: (
              logger: Logger,
              extractor: ITenantContextExtractor,
              validator: ITenantPermissionValidator,
            ) => {
              return new TenantContextMiddleware(logger, extractor, validator);
            },
            inject: [
              Logger,
              "ITenantContextExtractor",
              "ITenantPermissionValidator",
            ],
          },
        ],
      }).compile();
    } catch (error) {
      console.error("模块编译失败:", error);
      throw error;
    }

    if (!module) {
      throw new Error("模块编译失败，module为undefined");
    }

    bus = module.get<CommandQueryBusImpl>(CommandQueryBusImpl);
    middleware = module.get<TenantContextMiddleware>(TenantContextMiddleware);
    extractor = module.get<TenantContextExtractorImpl>(
      TenantContextExtractorImpl,
    );
    permissionValidator = module.get<ITenantPermissionValidator>(
      "ITenantPermissionValidator",
    );

    // 将中间件添加到总线
    bus.addMiddleware(middleware);

    // 启动总线
    await bus.start();
  });

  afterAll(async () => {
    await module.close();
  });

  beforeEach(() => {
    resourceStore.clear();
    auditLog.clear();
  });

  describe("场景1: 管理员跨租户访问", () => {
    it("应该允许管理员访问其他租户的资源", async () => {
      // Given: 租户1创建了资源
      const resourceId = new EntityId().toString();
      const createCommand = new CreateResourceCommand(
        resourceId,
        "Tenant1 Resource",
      );

      const createHeaders = {
        "x-tenant-id": tenant1Id.value,
      };

      const createContext: ExecutionContext = {
        executionId: new EntityId().toString(),
        startTime: new Date(),
        executionType: "command",
        objectType: createCommand.commandType,
        metadata: { headers: createHeaders },
        middlewareHistory: [],
      };

      await middleware.beforeCommand(createCommand, createContext);
      const createHandler = module.get(CreateResourceHandler);
      await createHandler.handle(createCommand);

      // Given: 管理员（租户2）尝试访问租户1的资源
      const adminContext = new TenantContext(tenant2Id, {
        isCrossTenant: true,
        userId: adminUserId,
      });

      const query = new GetCrossTenantResourceQuery(resourceId);
      (query as any).tenantContext = adminContext;

      // When: 执行查询
      const queryHandler = module.get(GetCrossTenantResourceHandler);
      const result = await queryHandler.handle(query);

      // Then: 应该成功
      expect(result.success).toBe(true);
      expect(result.item).toBeDefined();
      expect((result.item as any).resourceName).toBe("Tenant1 Resource");

      // Then: 审计日志应该记录跨租户访问
      const crossTenantLogs = auditLog.getCrossTenantLogs();
      expect(crossTenantLogs.length).toBeGreaterThan(0);
      expect(crossTenantLogs[0].isCrossTenant).toBe(true);
      expect(crossTenantLogs[0].success).toBe(true);
    });

    it("应该允许管理员查询其他租户的资源列表", async () => {
      // Given: 租户1创建了多个资源
      const resource1Id = new EntityId().toString();
      const resource2Id = new EntityId().toString();

      const createCommand1 = new CreateResourceCommand(
        resource1Id,
        "Resource 1",
      );
      const createCommand2 = new CreateResourceCommand(
        resource2Id,
        "Resource 2",
      );

      const headers = {
        "x-tenant-id": tenant1Id.value,
      };

      const createContext: ExecutionContext = {
        executionId: new EntityId().toString(),
        startTime: new Date(),
        executionType: "command",
        objectType: createCommand1.commandType,
        metadata: { headers },
        middlewareHistory: [],
      };

      await middleware.beforeCommand(createCommand1, createContext);
      const createHandler = module.get(CreateResourceHandler);
      await createHandler.handle(createCommand1);

      const createContext2: ExecutionContext = {
        executionId: new EntityId().toString(),
        startTime: new Date(),
        executionType: "command",
        objectType: createCommand2.commandType,
        metadata: { headers },
        middlewareHistory: [],
      };

      await middleware.beforeCommand(createCommand2, createContext2);
      await createHandler.handle(createCommand2);

      // Given: 管理员（租户2）尝试查询租户1的资源列表
      const adminContext = new TenantContext(tenant2Id, {
        isCrossTenant: true,
        userId: adminUserId,
      });

      const query = new ListTenantResourcesQuery(tenant1Id.value);
      (query as any).tenantContext = adminContext;

      // When: 执行查询
      const queryHandler = module.get(ListTenantResourcesHandler);
      const result = await queryHandler.handle(query);

      // Then: 应该成功
      expect(result.success).toBe(true);
      // QueryResult.success 返回多个项目时使用 data 属性
      expect((result as any).data).toBeDefined();
      expect((result as any).data.length).toBe(2);

      // Then: 审计日志应该记录跨租户访问
      const crossTenantLogs = auditLog.getCrossTenantLogs();
      expect(crossTenantLogs.length).toBeGreaterThan(0);
      const listLog = crossTenantLogs.find(
        (log) => log.action === "LIST_TENANT_RESOURCES",
      );
      expect(listLog).toBeDefined();
      expect(listLog?.isCrossTenant).toBe(true);
      expect(listLog?.success).toBe(true);
    });

    it("应该验证权限验证器的跨租户访问方法", async () => {
      // Given: 管理员上下文
      const adminContext = new TenantContext(tenant2Id, {
        isCrossTenant: true,
      });

      // When: 验证跨租户访问权限
      const canAccess =
        await permissionValidator.validateCrossTenantAccess(adminContext);

      // Then: 应该允许访问
      expect(canAccess).toBe(true);

      // Given: 普通用户上下文
      const normalContext = new TenantContext(tenant1Id, {
        isCrossTenant: false,
      });

      // When: 验证跨租户访问权限
      const cannotAccess =
        await permissionValidator.validateCrossTenantAccess(normalContext);

      // Then: 应该拒绝访问
      expect(cannotAccess).toBe(false);
    });
  });

  describe("场景2: 普通用户跨租户访问被拒绝", () => {
    it("应该拒绝普通用户访问其他租户的资源", async () => {
      // Given: 租户1创建了资源
      const resourceId = new EntityId().toString();
      const createCommand = new CreateResourceCommand(
        resourceId,
        "Tenant1 Resource",
      );

      const createHeaders = {
        "x-tenant-id": tenant1Id.value,
      };

      const createContext: ExecutionContext = {
        executionId: new EntityId().toString(),
        startTime: new Date(),
        executionType: "command",
        objectType: createCommand.commandType,
        metadata: { headers: createHeaders },
        middlewareHistory: [],
      };

      await middleware.beforeCommand(createCommand, createContext);
      const createHandler = module.get(CreateResourceHandler);
      await createHandler.handle(createCommand);

      // Given: 普通用户（租户2）尝试访问租户1的资源
      const normalContext = new TenantContext(tenant2Id, {
        isCrossTenant: false,
        userId: normalUserId,
      });

      const query = new GetCrossTenantResourceQuery(resourceId);
      (query as any).tenantContext = normalContext;

      // When: 执行查询
      const queryHandler = module.get(GetCrossTenantResourceHandler);
      const result = await queryHandler.handle(query);

      // Then: 应该失败
      expect(result.success).toBe(false);
      expect(result.errorCode).toBe("RESOURCE_QUERY_FAILED");
      expect(result.message).toContain("跨租户访问被拒绝");

      // Then: 审计日志应该记录失败的跨租户访问
      const logs = auditLog.getLogs();
      const failedLog = logs.find(
        (log) => log.action === "GET_CROSS_TENANT_RESOURCE" && !log.success,
      );
      expect(failedLog).toBeDefined();
      expect(failedLog?.isCrossTenant).toBe(false);
      expect(failedLog?.success).toBe(false);
    });

    it("应该拒绝普通用户查询其他租户的资源列表", async () => {
      // Given: 租户1创建了资源
      const resourceId = new EntityId().toString();
      const createCommand = new CreateResourceCommand(
        resourceId,
        "Tenant1 Resource",
      );

      const createHeaders = {
        "x-tenant-id": tenant1Id.value,
      };

      const createContext: ExecutionContext = {
        executionId: new EntityId().toString(),
        startTime: new Date(),
        executionType: "command",
        objectType: createCommand.commandType,
        metadata: { headers: createHeaders },
        middlewareHistory: [],
      };

      await middleware.beforeCommand(createCommand, createContext);
      const createHandler = module.get(CreateResourceHandler);
      await createHandler.handle(createCommand);

      // Given: 普通用户（租户2）尝试查询租户1的资源列表
      const normalContext = new TenantContext(tenant2Id, {
        isCrossTenant: false,
        userId: normalUserId,
      });

      const query = new ListTenantResourcesQuery(tenant1Id.value);
      (query as any).tenantContext = normalContext;

      // When: 执行查询
      const queryHandler = module.get(ListTenantResourcesHandler);
      const result = await queryHandler.handle(query);

      // Then: 应该失败
      expect(result.success).toBe(false);
      expect(result.errorCode).toBe("RESOURCE_QUERY_FAILED");
      expect(result.message).toContain("跨租户访问被拒绝");

      // Then: 审计日志应该记录失败的访问
      const logs = auditLog.getLogs();
      const failedLog = logs.find(
        (log) => log.action === "LIST_TENANT_RESOURCES" && !log.success,
      );
      expect(failedLog).toBeDefined();
      expect(failedLog?.success).toBe(false);
    });

    it("应该允许普通用户访问自己租户的资源", async () => {
      // Given: 租户1创建了资源
      const resourceId = new EntityId().toString();
      const createCommand = new CreateResourceCommand(
        resourceId,
        "Tenant1 Resource",
      );

      const createHeaders = {
        "x-tenant-id": tenant1Id.value,
      };

      const createContext: ExecutionContext = {
        executionId: new EntityId().toString(),
        startTime: new Date(),
        executionType: "command",
        objectType: createCommand.commandType,
        metadata: { headers: createHeaders },
        middlewareHistory: [],
      };

      await middleware.beforeCommand(createCommand, createContext);
      const createHandler = module.get(CreateResourceHandler);
      await createHandler.handle(createCommand);

      // Given: 普通用户（租户1）尝试访问自己租户的资源
      const normalContext = new TenantContext(tenant1Id, {
        isCrossTenant: false,
        userId: normalUserId,
      });

      const query = new GetCrossTenantResourceQuery(resourceId);
      (query as any).tenantContext = normalContext;

      // When: 执行查询
      const queryHandler = module.get(GetCrossTenantResourceHandler);
      const result = await queryHandler.handle(query);

      // Then: 应该成功（因为访问的是自己的租户）
      expect(result.success).toBe(true);
      expect(result.item).toBeDefined();

      // Then: 审计日志不应该标记为跨租户访问
      const logs = auditLog.getLogs();
      const accessLog = logs.find(
        (log) => log.action === "GET_CROSS_TENANT_RESOURCE" && log.success,
      );
      expect(accessLog).toBeDefined();
      expect(accessLog?.isCrossTenant).toBe(false);
    });
  });

  describe("场景3: 审计日志记录", () => {
    it("应该记录管理员跨租户访问的审计日志", async () => {
      // Given: 租户1创建了资源
      const resourceId = new EntityId().toString();
      const createCommand = new CreateResourceCommand(
        resourceId,
        "Tenant1 Resource",
      );

      const createHeaders = {
        "x-tenant-id": tenant1Id.value,
      };

      const createContext: ExecutionContext = {
        executionId: new EntityId().toString(),
        startTime: new Date(),
        executionType: "command",
        objectType: createCommand.commandType,
        metadata: { headers: createHeaders },
        middlewareHistory: [],
      };

      await middleware.beforeCommand(createCommand, createContext);
      const createHandler = module.get(CreateResourceHandler);
      await createHandler.handle(createCommand);

      // Given: 管理员跨租户访问
      const adminContext = new TenantContext(tenant2Id, {
        isCrossTenant: true,
        userId: adminUserId,
      });

      const query = new GetCrossTenantResourceQuery(resourceId);
      (query as any).tenantContext = adminContext;

      const queryHandler = module.get(GetCrossTenantResourceHandler);
      await queryHandler.handle(query);

      // Then: 审计日志应该包含跨租户访问记录
      const crossTenantLogs = auditLog.getCrossTenantLogs();
      expect(crossTenantLogs.length).toBeGreaterThan(0);

      const accessLog = crossTenantLogs.find(
        (log) =>
          log.action === "GET_CROSS_TENANT_RESOURCE" &&
          log.isCrossTenant &&
          log.success,
      );
      expect(accessLog).toBeDefined();
      expect(accessLog?.userId).toBe(adminUserId.value);
      expect(accessLog?.tenantId).toBe(tenant2Id.value);
      expect(accessLog?.resourceId).toBe(resourceId);
      expect(accessLog?.timestamp).toBeInstanceOf(Date);
    });

    it("应该记录失败的跨租户访问尝试", async () => {
      // Given: 租户1创建了资源
      const resourceId = new EntityId().toString();
      const createCommand = new CreateResourceCommand(
        resourceId,
        "Tenant1 Resource",
      );

      const createHeaders = {
        "x-tenant-id": tenant1Id.value,
      };

      const createContext: ExecutionContext = {
        executionId: new EntityId().toString(),
        startTime: new Date(),
        executionType: "command",
        objectType: createCommand.commandType,
        metadata: { headers: createHeaders },
        middlewareHistory: [],
      };

      await middleware.beforeCommand(createCommand, createContext);
      const createHandler = module.get(CreateResourceHandler);
      await createHandler.handle(createCommand);

      // Given: 普通用户尝试跨租户访问
      const normalContext = new TenantContext(tenant2Id, {
        isCrossTenant: false,
        userId: normalUserId,
      });

      const query = new GetCrossTenantResourceQuery(resourceId);
      (query as any).tenantContext = normalContext;

      const queryHandler = module.get(GetCrossTenantResourceHandler);
      await queryHandler.handle(query);

      // Then: 审计日志应该包含失败的访问记录
      const logs = auditLog.getLogs();
      const failedLog = logs.find(
        (log) => log.action === "GET_CROSS_TENANT_RESOURCE" && !log.success,
      );
      expect(failedLog).toBeDefined();
      expect(failedLog?.userId).toBe(normalUserId.value);
      expect(failedLog?.errorCode).toBeDefined();
      expect(failedLog?.errorCode).toContain("跨租户访问被拒绝");
    });

    it("应该记录命令执行的审计日志", async () => {
      // Given: 创建资源命令
      const resourceId = new EntityId().toString();
      const command = new CreateResourceCommand(resourceId, "Test Resource");

      const headers = {
        "x-tenant-id": tenant1Id.value,
      };

      const executionContext: ExecutionContext = {
        executionId: new EntityId().toString(),
        startTime: new Date(),
        executionType: "command",
        objectType: command.commandType,
        metadata: { headers },
        middlewareHistory: [],
      };

      // When: 执行命令
      await middleware.beforeCommand(command, executionContext);
      const commandHandler = module.get(CreateResourceHandler);
      await commandHandler.handle(command);

      // Then: 审计日志应该包含命令执行记录
      const logs = auditLog.getLogs();
      const createLog = logs.find(
        (log) => log.action === "CREATE_RESOURCE" && log.success,
      );
      expect(createLog).toBeDefined();
      expect(createLog?.tenantId).toBe(tenant1Id.value);
      expect(createLog?.resourceId).toBe(resourceId);
      expect(createLog?.isCrossTenant).toBe(false);
    });
  });

  describe("场景4: 权限验证器集成", () => {
    it("应该验证canAccessTenant方法对跨租户管理员的支持", async () => {
      // Given: 管理员上下文
      const adminContext = new TenantContext(tenant1Id, {
        isCrossTenant: true,
      });

      // When: 验证访问其他租户
      const canAccess = adminContext.canAccessTenant(tenant2Id);

      // Then: 应该允许访问
      expect(canAccess).toBe(true);

      // Given: 普通用户上下文
      const normalContext = new TenantContext(tenant1Id, {
        isCrossTenant: false,
      });

      // When: 验证访问其他租户
      const cannotAccess = normalContext.canAccessTenant(tenant2Id);

      // Then: 应该拒绝访问
      expect(cannotAccess).toBe(false);

      // When: 验证访问自己的租户
      const canAccessOwn = normalContext.canAccessTenant(tenant1Id);

      // Then: 应该允许访问
      expect(canAccessOwn).toBe(true);
    });

    it("应该验证canAccessOrganization方法对跨租户管理员的支持", async () => {
      // Given: 管理员上下文
      const adminContext = new TenantContext(tenant1Id, {
        isCrossTenant: true,
      });

      // When: 验证访问其他租户的组织
      const canAccess = adminContext.canAccessOrganization(organization2Id);

      // Then: 应该允许访问
      expect(canAccess).toBe(true);

      // Given: 普通用户上下文
      const normalContext = new TenantContext(tenant1Id, {
        isCrossTenant: false,
      });

      // When: 验证访问其他租户的组织
      const cannotAccess = normalContext.canAccessOrganization(organization2Id);

      // Then: 应该拒绝访问
      expect(cannotAccess).toBe(false);
    });

    it("应该验证权限验证器接口的所有方法", async () => {
      // Given: 管理员上下文和普通用户上下文
      const adminContext = new TenantContext(tenant1Id, {
        isCrossTenant: true,
        permissions: ["admin", "read", "write"],
      });

      const normalContext = new TenantContext(tenant1Id, {
        isCrossTenant: false,
        permissions: ["read"],
      });

      // When & Then: 验证跨租户访问
      expect(
        await permissionValidator.validateCrossTenantAccess(adminContext),
      ).toBe(true);
      expect(
        await permissionValidator.validateCrossTenantAccess(normalContext),
      ).toBe(false);

      // When & Then: 验证权限
      expect(
        await permissionValidator.validatePermission(adminContext, "admin"),
      ).toBe(true);
      expect(
        await permissionValidator.validatePermission(normalContext, "admin"),
      ).toBe(false);
      expect(
        await permissionValidator.validatePermission(normalContext, "read"),
      ).toBe(true);

      // When & Then: 验证租户访问
      expect(
        await permissionValidator.validateTenantAccess(adminContext, tenant2Id),
      ).toBe(true);
      expect(
        await permissionValidator.validateTenantAccess(
          normalContext,
          tenant2Id,
        ),
      ).toBe(false);
      expect(
        await permissionValidator.validateTenantAccess(
          normalContext,
          tenant1Id,
        ),
      ).toBe(true);
    });
  });
});
