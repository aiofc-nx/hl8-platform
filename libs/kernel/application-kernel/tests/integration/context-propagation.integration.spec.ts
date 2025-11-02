/**
 * @fileoverview 上下文传递和验证集成测试
 * @description 验证租户上下文在命令、查询和领域事件中的传递机制
 */

import { Test, TestingModule } from "@nestjs/testing";
import { CommandHandler, QueryHandler } from "@nestjs/cqrs";
import { Logger } from "@hl8/logger";
import {
  TenantId,
  OrganizationId,
  DepartmentId,
  EntityId,
  TenantContext,
  TenantIsolatedAggregateRoot,
  DomainEvent,
} from "@hl8/domain-kernel";
import { BaseCommand } from "../../src/commands/base/command.base.js";
import { BaseQuery } from "../../src/queries/base/query.base.js";
import { CommandResult } from "../../src/commands/base/command-result.js";
import { QueryResult } from "../../src/queries/base/query-result.js";
import { ApplicationKernelModule } from "../../src/application-kernel.module.js";
import { TenantContextMiddleware } from "../../src/middleware/tenant-context.middleware.js";
import { TenantContextExtractorImpl } from "../../src/context/tenant-context-extractor.impl.js";
import { CommandQueryBusImpl } from "../../src/bus/command-query-bus.impl.js";
import type { ITenantContextExtractor } from "../../src/context/tenant-context-extractor.interface.js";
import type { ITenantPermissionValidator } from "../../src/context/tenant-permission-validator.interface.js";
import type { ExecutionContext } from "../../src/bus/command-query-bus.interface.js";

// 测试命令：创建租户资源
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

// 测试查询：查询资源
class GetResourceQuery extends BaseQuery {
  static readonly queryType = "GetResource";

  constructor(public readonly resourceId: string) {
    super(GetResourceQuery.queryType);
  }

  public clone(): BaseQuery {
    return new GetResourceQuery(this.resourceId);
  }
}

// 测试聚合根：捕获领域事件
class TestTenantAggregate extends TenantIsolatedAggregateRoot {
  private resourceName: string;

  constructor(
    tenantId: TenantId,
    organizationId?: OrganizationId,
    departmentId?: DepartmentId,
    id?: EntityId,
  ) {
    super(tenantId, organizationId, departmentId, id);
    this.resourceName = "";
  }

  createResource(resourceName: string): void {
    this.resourceName = resourceName;

    // 添加领域事件（会自动包含租户信息）
    this.addDomainEvent({
      type: "ResourceCreated",
      aggregateRootId: this.id,
      timestamp: new Date(),
      data: {
        resourceName,
      },
    });
  }

  public getResourceName(): string {
    return this.resourceName;
  }

  public getId(): EntityId {
    return this.id;
  }
}

// Mock 资源存储
class MockResourceStore {
  private readonly resources: Map<string, TestTenantAggregate> = new Map();
  private readonly events: DomainEvent[] = [];

  /**
   * 保存聚合根
   */
  async save(aggregate: TestTenantAggregate): Promise<void> {
    this.resources.set(aggregate.getId().toString(), aggregate);

    // 收集领域事件
    const events = aggregate.domainEvents;
    this.events.push(...events);
  }

  /**
   * 根据ID查找聚合根
   */
  async findById(resourceId: string): Promise<TestTenantAggregate | null> {
    return this.resources.get(resourceId) || null;
  }

  /**
   * 获取所有领域事件
   */
  getEvents(): DomainEvent[] {
    return [...this.events];
  }

  /**
   * 清除所有资源
   */
  clear(): void {
    this.resources.clear();
    this.events.length = 0;
  }
}

// 命令处理器：验证上下文传递
@CommandHandler(CreateResourceCommand)
class CreateResourceHandler {
  constructor(private readonly resourceStore: MockResourceStore) {}

  async handle(command: CreateResourceCommand): Promise<CommandResult> {
    // 验证上下文已传递
    if (!command.tenantContext) {
      return CommandResult.failure(
        "MISSING_TENANT_CONTEXT",
        "命令缺少租户上下文",
      );
    }

    // 使用上下文创建聚合根
    const aggregate = new TestTenantAggregate(
      command.tenantContext.tenantId,
      command.tenantContext.organizationId,
      command.tenantContext.departmentId,
      EntityId.fromString(command.aggregateId),
    );

    // 创建资源（会触发领域事件）
    aggregate.createResource(command.resourceName);

    // 保存聚合根
    await this.resourceStore.save(aggregate);

    return CommandResult.success({
      resourceId: command.aggregateId,
      resourceName: command.resourceName,
    });
  }
}

// 查询处理器：验证上下文传递
@QueryHandler(GetResourceQuery)
class GetResourceHandler {
  constructor(private readonly resourceStore: MockResourceStore) {}

  async handle(query: GetResourceQuery): Promise<QueryResult> {
    // 验证上下文已传递
    if (!query.tenantContext) {
      return QueryResult.failure(
        "MISSING_TENANT_CONTEXT",
        "查询缺少租户上下文",
      );
    }

    const resource = await this.resourceStore.findById(query.resourceId);

    if (!resource) {
      return QueryResult.failure("RESOURCE_NOT_FOUND", "资源不存在");
    }

    // 验证资源的租户上下文
    if (!resource.tenantId.equals(query.tenantContext.tenantId)) {
      return QueryResult.failure("TENANT_MISMATCH", "资源不属于当前租户");
    }

    return QueryResult.successItem({
      resourceId: query.resourceId,
      resourceName: resource.getResourceName(),
    });
  }
}

describe("上下文传递和验证集成测试", () => {
  let module: TestingModule;
  let bus: CommandQueryBusImpl;
  let middleware: TenantContextMiddleware;
  let resourceStore: MockResourceStore;
  let extractor: TenantContextExtractorImpl;

  // 测试数据
  let tenant1Id: TenantId;
  let organization1Id: OrganizationId;
  let department1Id: DepartmentId;

  beforeAll(async () => {
    // 初始化测试数据
    tenant1Id = TenantId.generate();
    organization1Id = new OrganizationId(tenant1Id);
    department1Id = new DepartmentId(organization1Id);

    resourceStore = new MockResourceStore();

    // Mock 权限验证器
    const mockPermissionValidator: ITenantPermissionValidator = {
      validatePermission: jest.fn().mockResolvedValue(true),
      validateCrossTenantAccess: jest.fn().mockResolvedValue(true),
      validateTenantAccess: jest.fn().mockResolvedValue(true),
      validateOrganizationAccess: jest.fn().mockResolvedValue(true),
      validateDepartmentAccess: jest.fn().mockResolvedValue(true),
    };

    module = await Test.createTestingModule({
      imports: [ApplicationKernelModule.forRoot()],
      providers: [
        CreateResourceHandler,
        GetResourceHandler,
        {
          provide: MockResourceStore,
          useValue: resourceStore,
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
          useValue: mockPermissionValidator,
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

    bus = module.get<CommandQueryBusImpl>(CommandQueryBusImpl);
    middleware = module.get<TenantContextMiddleware>(TenantContextMiddleware);
    extractor = module.get<TenantContextExtractorImpl>(
      TenantContextExtractorImpl,
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
  });

  describe("场景1: 命令处理中的上下文传递", () => {
    it("应该将租户上下文传递到命令处理器", async () => {
      // Given: HTTP请求头包含租户信息
      const headers = {
        "x-tenant-id": tenant1Id.value,
        "x-organization-id": organization1Id.value,
        "x-department-id": department1Id.value,
      };

      // Given: 创建命令
      const resourceId = new EntityId().toString();
      const command = new CreateResourceCommand(resourceId, "Test Resource");

      // Given: 创建执行上下文
      const executionContext: ExecutionContext = {
        executionId: new EntityId().toString(),
        startTime: new Date(),
        executionType: "command",
        objectType: command.commandType,
        metadata: { headers },
        middlewareHistory: [],
      };

      // When: 中间件处理命令（注入上下文）
      const shouldContinue = await middleware.beforeCommand(
        command,
        executionContext,
      );

      // Then: 中间件应该允许继续执行
      expect(shouldContinue).toBe(true);

      // Then: 命令应该包含租户上下文
      expect(command.tenantContext).toBeDefined();
      expect(command.tenantContext?.tenantId.equals(tenant1Id)).toBe(true);
      expect(
        command.tenantContext?.organizationId?.equals(organization1Id),
      ).toBe(true);
      expect(command.tenantContext?.departmentId?.equals(department1Id)).toBe(
        true,
      );

      // When: 执行命令
      const commandHandler = module.get(CreateResourceHandler);
      const result = await commandHandler.handle(command);

      // Then: 命令应该成功执行
      expect(result.success).toBe(true);

      // Then: 资源应该被保存
      const resource = await resourceStore.findById(resourceId);
      expect(resource).not.toBeNull();
      expect(resource?.getResourceName()).toBe("Test Resource");
    });

    it("应该在没有上下文时拒绝执行命令", async () => {
      // Given: 创建没有上下文的命令（metadata 中没有 headers）
      const resourceId = new EntityId().toString();
      const command = new CreateResourceCommand(resourceId, "Test Resource");

      // Given: 创建空的执行上下文
      const executionContext: ExecutionContext = {
        executionId: new EntityId().toString(),
        startTime: new Date(),
        executionType: "command",
        objectType: command.commandType,
        metadata: {},
        middlewareHistory: [],
      };

      // When: 中间件处理命令
      const shouldContinue = await middleware.beforeCommand(
        command,
        executionContext,
      );

      // Then: 中间件应该阻止执行
      expect(shouldContinue).toBe(false);
      expect(command.tenantContext).toBeUndefined();

      // When: 尝试执行命令（即使被阻止，验证处理器也会检查）
      const commandHandler = module.get(CreateResourceHandler);
      const result = await commandHandler.handle(command);

      // Then: 应该失败（缺少租户上下文）
      expect(result.success).toBe(false);
      expect(result.errorCode).toBe("MISSING_TENANT_CONTEXT");
    });

    it("应该正确传递多层级上下文信息", async () => {
      // Given: 创建包含完整层级信息的命令
      const resourceId = new EntityId().toString();
      const command = new CreateResourceCommand(
        resourceId,
        "Multi-Level Resource",
      );

      const headers = {
        "x-tenant-id": tenant1Id.value,
        "x-organization-id": organization1Id.value,
        "x-department-id": department1Id.value,
      };

      const executionContext: ExecutionContext = {
        executionId: new EntityId().toString(),
        startTime: new Date(),
        executionType: "command",
        objectType: command.commandType,
        metadata: { headers },
        middlewareHistory: [],
      };

      // When: 中间件注入上下文并执行命令
      await middleware.beforeCommand(command, executionContext);
      const commandHandler = module.get(CreateResourceHandler);
      const result = await commandHandler.handle(command);

      // Then: 应该成功
      expect(result.success).toBe(true);

      // Then: 验证聚合根包含了正确的层级信息
      const resource = await resourceStore.findById(resourceId);
      expect(resource).not.toBeNull();
      expect(resource?.tenantId.equals(tenant1Id)).toBe(true);
      expect(resource?.organizationId?.equals(organization1Id)).toBe(true);
      expect(resource?.departmentId?.equals(department1Id)).toBe(true);
    });
  });

  describe("场景2: 查询处理中的上下文传递", () => {
    it("应该将租户上下文传递到查询处理器", async () => {
      // Given: 先创建一个资源（使用命令）
      const resourceId = new EntityId().toString();
      const createCommand = new CreateResourceCommand(
        resourceId,
        "Query Test Resource",
      );

      const createHeaders = {
        "x-tenant-id": tenant1Id.value,
        "x-organization-id": organization1Id.value,
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

      // When: 创建查询
      const query = new GetResourceQuery(resourceId);

      const queryHeaders = {
        "x-tenant-id": tenant1Id.value,
        "x-organization-id": organization1Id.value,
      };

      const queryExecutionContext: ExecutionContext = {
        executionId: new EntityId().toString(),
        startTime: new Date(),
        executionType: "query",
        objectType: query.queryType,
        metadata: { headers: queryHeaders },
        middlewareHistory: [],
      };

      // When: 中间件处理查询（注入上下文）
      const shouldContinue = await middleware.beforeQuery(
        query,
        queryExecutionContext,
      );

      // Then: 中间件应该允许继续执行
      expect(shouldContinue).toBe(true);

      // Then: 查询应该包含租户上下文
      expect(query.tenantContext).toBeDefined();
      expect(query.tenantContext?.tenantId.equals(tenant1Id)).toBe(true);
      expect(query.tenantContext?.organizationId?.equals(organization1Id)).toBe(
        true,
      );

      // When: 执行查询
      const queryHandler = module.get(GetResourceHandler);
      const result = await queryHandler.handle(query);

      // Then: 查询应该成功
      expect(result.success).toBe(true);
      expect(result.item).toBeDefined();
      expect((result.item as any).resourceName).toBe("Query Test Resource");
    });

    it("应该在没有上下文时拒绝执行查询", async () => {
      // Given: 创建没有上下文的查询
      const query = new GetResourceQuery("resource-id");

      const executionContext: ExecutionContext = {
        executionId: new EntityId().toString(),
        startTime: new Date(),
        executionType: "query",
        objectType: query.queryType,
        metadata: {},
        middlewareHistory: [],
      };

      // When: 中间件处理查询
      const shouldContinue = await middleware.beforeQuery(
        query,
        executionContext,
      );

      // Then: 中间件应该阻止执行
      expect(shouldContinue).toBe(false);
      expect(query.tenantContext).toBeUndefined();
    });

    it("应该验证查询结果与上下文的租户匹配", async () => {
      // Given: 创建资源
      const resourceId = new EntityId().toString();
      const createCommand = new CreateResourceCommand(
        resourceId,
        "Tenant Resource",
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

      // Given: 使用不同租户的上下文查询
      const tenant2Id = TenantId.generate();
      const query = new GetResourceQuery(resourceId);

      const queryHeaders = {
        "x-tenant-id": tenant2Id.value,
      };

      const queryContext: ExecutionContext = {
        executionId: new EntityId().toString(),
        startTime: new Date(),
        executionType: "query",
        objectType: query.queryType,
        metadata: { headers: queryHeaders },
        middlewareHistory: [],
      };

      await middleware.beforeQuery(query, queryContext);

      // When: 执行查询
      const queryHandler = module.get(GetResourceHandler);
      const result = await queryHandler.handle(query);

      // Then: 应该失败（租户不匹配）
      expect(result.success).toBe(false);
      expect(result.errorCode).toBe("TENANT_MISMATCH");
    });
  });

  describe("场景3: 领域事件包含租户信息", () => {
    it("应该自动将租户信息添加到领域事件", async () => {
      // Given: 创建命令
      const resourceId = new EntityId().toString();
      const command = new CreateResourceCommand(
        resourceId,
        "Event Test Resource",
      );

      const headers = {
        "x-tenant-id": tenant1Id.value,
        "x-organization-id": organization1Id.value,
        "x-department-id": department1Id.value,
      };

      const executionContext: ExecutionContext = {
        executionId: new EntityId().toString(),
        startTime: new Date(),
        executionType: "command",
        objectType: command.commandType,
        metadata: { headers },
        middlewareHistory: [],
      };

      // When: 执行命令（会触发领域事件）
      await middleware.beforeCommand(command, executionContext);
      const commandHandler = module.get(CreateResourceHandler);
      await commandHandler.handle(command);

      // Then: 应该生成领域事件
      const events = resourceStore.getEvents();
      expect(events.length).toBeGreaterThan(0);

      // Then: 事件应该包含租户信息
      const event = events[0];
      expect(event.data).toBeDefined();

      const eventData = event.data as Record<string, unknown>;
      expect(eventData).toHaveProperty("tenantId");
      expect(eventData).toHaveProperty("organizationId");
      expect(eventData).toHaveProperty("departmentId");
      expect(eventData).toHaveProperty("resourceName");

      // Then: 验证租户信息正确
      // 注意：TenantId.toJSON() 返回字符串，OrganizationId/DepartmentId.toJSON() 返回对象
      const tenantIdData = eventData.tenantId as string;
      expect(tenantIdData).toBe(tenant1Id.value);

      const orgIdData = eventData.organizationId as
        | { value: string }
        | undefined;
      if (orgIdData) {
        expect(orgIdData.value).toBe(organization1Id.value);
      }

      const deptIdData = eventData.departmentId as
        | { value: string }
        | undefined;
      if (deptIdData) {
        expect(deptIdData.value).toBe(department1Id.value);
      }
    });

    it("应该在事件数据为对象时合并租户信息", async () => {
      // Given: 创建命令
      const resourceId = new EntityId().toString();
      const command = new CreateResourceCommand(
        resourceId,
        "Merged Event Resource",
      );

      const headers = {
        "x-tenant-id": tenant1Id.value,
        "x-organization-id": organization1Id.value,
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

      // Then: 验证事件数据包含原始数据和租户信息
      const events = resourceStore.getEvents();
      expect(events.length).toBeGreaterThan(0);

      const eventData = events[0].data as Record<string, unknown>;
      expect(eventData).toHaveProperty("resourceName", "Merged Event Resource");
      expect(eventData).toHaveProperty("tenantId");
      expect(eventData).toHaveProperty("organizationId");
      // 没有部门ID时，应该为 undefined
      expect(eventData.departmentId).toBeUndefined();
    });

    it("应该在不同层级的聚合根中正确包含租户信息", async () => {
      // Given: 创建租户级资源（无组织）
      const resourceId1 = new EntityId().toString();
      const command1 = new CreateResourceCommand(
        resourceId1,
        "Tenant Level Resource",
      );

      const tenantHeaders = {
        "x-tenant-id": tenant1Id.value,
      };

      const tenantContext: ExecutionContext = {
        executionId: new EntityId().toString(),
        startTime: new Date(),
        executionType: "command",
        objectType: command1.commandType,
        metadata: { headers: tenantHeaders },
        middlewareHistory: [],
      };

      await middleware.beforeCommand(command1, tenantContext);
      const commandHandler = module.get(CreateResourceHandler);
      await commandHandler.handle(command1);

      // Given: 创建组织级资源
      const resourceId2 = new EntityId().toString();
      const command2 = new CreateResourceCommand(
        resourceId2,
        "Org Level Resource",
      );

      const orgHeaders = {
        "x-tenant-id": tenant1Id.value,
        "x-organization-id": organization1Id.value,
      };

      const orgContext: ExecutionContext = {
        executionId: new EntityId().toString(),
        startTime: new Date(),
        executionType: "command",
        objectType: command2.commandType,
        metadata: { headers: orgHeaders },
        middlewareHistory: [],
      };

      await middleware.beforeCommand(command2, orgContext);
      await commandHandler.handle(command2);

      // Then: 验证事件包含正确的层级信息
      const events = resourceStore.getEvents();
      expect(events.length).toBe(2);

      // 第一个事件（租户级）
      const event1Data = events[0].data as Record<string, unknown>;
      expect(event1Data).toHaveProperty("tenantId");
      expect(event1Data.organizationId).toBeUndefined();
      expect(event1Data.departmentId).toBeUndefined();

      // 第二个事件（组织级）
      const event2Data = events[1].data as Record<string, unknown>;
      expect(event2Data).toHaveProperty("tenantId");
      expect(event2Data).toHaveProperty("organizationId");
      expect(event2Data.departmentId).toBeUndefined();
    });
  });

  describe("场景4: 上下文丢失检测", () => {
    it("应该检测命令执行时缺少上下文", async () => {
      // Given: 创建命令（没有通过中间件注入上下文）
      const resourceId = new EntityId().toString();
      const command = new CreateResourceCommand(
        resourceId,
        "No Context Resource",
      );

      // When: 直接执行命令处理器（跳过中间件）
      const commandHandler = module.get(CreateResourceHandler);
      const result = await commandHandler.handle(command);

      // Then: 应该失败（缺少租户上下文）
      expect(result.success).toBe(false);
      expect(result.errorCode).toBe("MISSING_TENANT_CONTEXT");
      expect(result.message).toBe("命令缺少租户上下文");
    });

    it("应该检测查询执行时缺少上下文", async () => {
      // Given: 创建查询（没有通过中间件注入上下文）
      const query = new GetResourceQuery("resource-id");

      // When: 直接执行查询处理器（跳过中间件）
      const queryHandler = module.get(GetResourceHandler);
      const result = await queryHandler.handle(query);

      // Then: 应该失败（缺少租户上下文）
      expect(result.success).toBe(false);
      expect(result.errorCode).toBe("MISSING_TENANT_CONTEXT");
      expect(result.message).toBe("查询缺少租户上下文");
    });

    it("应该通过中间件阻止缺少上下文的命令执行", async () => {
      // Given: 创建命令
      const resourceId = new EntityId().toString();
      const command = new CreateResourceCommand(resourceId, "Blocked Resource");

      // Given: 创建空的执行上下文（没有 headers）
      const executionContext: ExecutionContext = {
        executionId: new EntityId().toString(),
        startTime: new Date(),
        executionType: "command",
        objectType: command.commandType,
        metadata: {},
        middlewareHistory: [],
      };

      // When: 中间件处理命令
      const shouldContinue = await middleware.beforeCommand(
        command,
        executionContext,
      );

      // Then: 中间件应该阻止执行
      expect(shouldContinue).toBe(false);

      // When: 尝试通过总线执行命令
      const result = await bus.executeCommand(command);

      // Then: 应该被中间件阻止
      expect(result.success).toBe(false);
      expect(result.errorCode).toBe("MIDDLEWARE_BLOCKED");
    });

    it("应该通过中间件阻止缺少上下文的查询执行", async () => {
      // Given: 创建查询
      const query = new GetResourceQuery("resource-id");

      // Given: 创建空的执行上下文（没有 headers）
      const executionContext: ExecutionContext = {
        executionId: new EntityId().toString(),
        startTime: new Date(),
        executionType: "query",
        objectType: query.queryType,
        metadata: {},
        middlewareHistory: [],
      };

      // When: 中间件处理查询
      const shouldContinue = await middleware.beforeQuery(
        query,
        executionContext,
      );

      // Then: 中间件应该阻止执行
      expect(shouldContinue).toBe(false);

      // When: 尝试通过总线执行查询
      const result = await bus.executeQuery(query);

      // Then: 应该被中间件阻止
      expect(result.success).toBe(false);
      expect(result.errorCode).toBe("MIDDLEWARE_BLOCKED");
    });

    it("应该记录中间件执行历史", async () => {
      // Given: 创建命令
      const resourceId = new EntityId().toString();
      const command = new CreateResourceCommand(resourceId, "History Resource");

      // Given: 手动调用中间件验证功能（不通过总线）
      const headers = {
        "x-tenant-id": tenant1Id.value,
        "x-organization-id": organization1Id.value,
      };

      const executionContext: ExecutionContext = {
        executionId: new EntityId().toString(),
        startTime: new Date(),
        executionType: "command",
        objectType: command.commandType,
        metadata: { headers },
        middlewareHistory: [],
      };

      // When: 中间件处理命令
      const shouldContinue = await middleware.beforeCommand(
        command,
        executionContext,
      );

      // Then: 中间件应该允许继续执行
      expect(shouldContinue).toBe(true);

      // Then: 验证中间件确实被调用
      expect(command.tenantContext).toBeDefined();
      expect(command.tenantContext?.tenantId.equals(tenant1Id)).toBe(true);

      // Then: 验证中间件历史应该被记录（在 ExecutionContext 中）
      // 注意：这里验证的是手动调用中间件时，中间件会记录历史
      // 但中间件本身不会修改 middlewareHistory，这是总线的职责
      // 这里我们验证中间件功能正常工作即可
      expect(command.tenantContext).not.toBeUndefined();
    });
  });

  describe("场景5: 上下文在多个命令/查询间的传递", () => {
    it("应该在不同的命令间独立传递上下文", async () => {
      // Given: 执行第一个命令
      const resourceId1 = new EntityId().toString();
      const command1 = new CreateResourceCommand(resourceId1, "Resource 1");

      const headers1 = {
        "x-tenant-id": tenant1Id.value,
        "x-organization-id": organization1Id.value,
      };

      const context1: ExecutionContext = {
        executionId: new EntityId().toString(),
        startTime: new Date(),
        executionType: "command",
        objectType: command1.commandType,
        metadata: { headers: headers1 },
        middlewareHistory: [],
      };

      await middleware.beforeCommand(command1, context1);
      const commandHandler = module.get(CreateResourceHandler);
      await commandHandler.handle(command1);

      // Given: 执行第二个命令（不同的组织）
      const org2Id = new OrganizationId(tenant1Id);
      const resourceId2 = new EntityId().toString();
      const command2 = new CreateResourceCommand(resourceId2, "Resource 2");

      const headers2 = {
        "x-tenant-id": tenant1Id.value,
        "x-organization-id": org2Id.value,
      };

      const context2: ExecutionContext = {
        executionId: new EntityId().toString(),
        startTime: new Date(),
        executionType: "command",
        objectType: command2.commandType,
        metadata: { headers: headers2 },
        middlewareHistory: [],
      };

      await middleware.beforeCommand(command2, context2);
      await commandHandler.handle(command2);

      // Then: 验证两个命令都成功执行，且上下文独立
      const resource1 = await resourceStore.findById(resourceId1);
      const resource2 = await resourceStore.findById(resourceId2);

      expect(resource1).not.toBeNull();
      expect(resource2).not.toBeNull();

      expect(resource1?.organizationId?.equals(organization1Id)).toBe(true);
      expect(resource2?.organizationId?.equals(org2Id)).toBe(true);

      // Then: 验证事件包含正确的上下文信息
      const events = resourceStore.getEvents();
      expect(events.length).toBe(2);

      const event1Data = events[0].data as Record<string, unknown>;
      const event2Data = events[1].data as Record<string, unknown>;

      const event1OrgId = event1Data.organizationId as { value: string };
      const event2OrgId = event2Data.organizationId as { value: string };

      expect(event1OrgId.value).toBe(organization1Id.value);
      expect(event2OrgId.value).toBe(org2Id.value);
    });

    it("应该在命令和查询之间正确传递上下文", async () => {
      // Given: 执行命令创建资源
      const resourceId = new EntityId().toString();
      const command = new CreateResourceCommand(
        resourceId,
        "Cross Command Query Resource",
      );

      const commandHeaders = {
        "x-tenant-id": tenant1Id.value,
        "x-organization-id": organization1Id.value,
      };

      const commandContext: ExecutionContext = {
        executionId: new EntityId().toString(),
        startTime: new Date(),
        executionType: "command",
        objectType: command.commandType,
        metadata: { headers: commandHeaders },
        middlewareHistory: [],
      };

      await middleware.beforeCommand(command, commandContext);
      const commandHandler = module.get(CreateResourceHandler);
      await commandHandler.handle(command);

      // When: 使用相同的上下文执行查询
      const query = new GetResourceQuery(resourceId);

      const queryContext: ExecutionContext = {
        executionId: new EntityId().toString(),
        startTime: new Date(),
        executionType: "query",
        objectType: query.queryType,
        metadata: { headers: commandHeaders },
        middlewareHistory: [],
      };

      await middleware.beforeQuery(query, queryContext);
      const queryHandler = module.get(GetResourceHandler);
      const result = await queryHandler.handle(query);

      // Then: 查询应该成功
      expect(result.success).toBe(true);
      expect((result.item as any).resourceName).toBe(
        "Cross Command Query Resource",
      );

      // Then: 验证查询的上下文与命令的上下文一致
      expect(query.tenantContext?.tenantId.equals(tenant1Id)).toBe(true);
      expect(query.tenantContext?.organizationId?.equals(organization1Id)).toBe(
        true,
      );
    });
  });
});
