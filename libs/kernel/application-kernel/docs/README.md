# Application Kernel

本库提供在 HL8 平台中实现 Clean Architecture + CQRS + 事件溯源(ES) + 事件驱动架构(EDA) + 多租户和多层级数据隔离 的应用层核心能力，基于 NestJS 与 `@nestjs/cqrs` 实现，集成平台级配置与日志能力（`@hl8/config`, `@hl8/logger`）。支持租户 → 组织 → 部门三级数据隔离，确保不同租户、组织、部门的数据完全隔离，同时支持跨租户管理员访问控制。

## 安装

```bash
pnpm add @hl8/application-kernel @hl8/domain-kernel @hl8/config @hl8/logger @hl8/cache @nestjs/cqrs

# 如果需要使用 JWT Token 提取租户上下文（可选）
pnpm add jsonwebtoken @types/jsonwebtoken
```

## 快速开始

查看 [快速入门指南](./QUICKSTART.md) 了解如何使用应用内核：

- ✅ 用例（Use Cases）基础用法
- ✅ 命令（Commands）和查询（Queries）实现
- ✅ 事件存储和事件总线使用
- ✅ 投影器（Projectors）和 Saga 模式
- ✅ 缓存服务使用
- ✅ 完整示例代码

或参考功能规格的 `quickstart.md`，在应用模块中引入 `ApplicationKernelModule` 并完成配置加载与校验。

---

## 🏢 租户隔离支持

本库提供完整的**多租户和多层级数据隔离**支持，确保不同租户、组织、部门的数据完全隔离，同时支持跨租户管理员访问控制。

### 核心组件

- **租户上下文中间件 (TenantContextMiddleware)**: 自动从请求中提取租户上下文并注入到命令/查询中，支持执行前验证和权限检查
- **租户上下文提取器 (TenantContextExtractorImpl)**: 支持从 HTTP Header、JWT Token、用户信息等多种来源提取租户上下文，实现统一的上下文提取策略
- **租户权限验证器 (TenantPermissionValidatorImpl)**: 验证跨租户访问权限和层级访问权限（租户、组织、部门），支持权限粒度控制
- **用户上下文查询接口 (IUserContextQuery)**: 定义从用户信息查询租户上下文的接口，支持自定义实现
- **命令/查询基类增强**: `BaseCommand` 和 `BaseQuery` 自动包含 `tenantContext` 属性，由中间件自动注入
- **领域事件自动包含租户信息**: 使用 `TenantIsolatedAggregateRoot` 的聚合根在添加领域事件时自动包含租户、组织、部门信息
- **JWT 配置支持 (JwtConfig)**: 支持可选的 JWT Token 配置，用于从 Token 中提取租户上下文

---

## ⚡ CQRS（命令查询职责分离）支持

本库提供完整的**CQRS（Command Query Responsibility Segregation）**支持，通过命令和查询的分离实现更好的职责划分、可扩展性和性能优化。

### CQRS 核心组件

- **命令 (Command)**: 表示修改系统状态的操作，继承自 `BaseCommand`
- **查询 (Query)**: 表示读取数据的操作，继承自 `BaseQuery`
- **命令查询总线 (CommandQueryBus)**: 统一分发和执行命令/查询，支持中间件管道
- **命令处理器 (CommandHandler)**: 使用 `@CommandHandler` 装饰器标记，处理命令业务逻辑
- **查询处理器 (QueryHandler)**: 使用 `@QueryHandler` 装饰器标记，处理查询业务逻辑
- **中间件 (Middleware)**: 支持日志、性能监控、验证、重试等中间件
- **缓存服务 (Cache)**: 集成 @hl8/cache 统一缓存服务
- **执行结果 (CommandResult/QueryResult)**: 统一的执行结果封装

### CQRS 快速开始

#### 1. 创建命令和命令处理器

```typescript
import { BaseCommand, CommandResult } from "@hl8/application-kernel";
import { CommandHandler } from "@nestjs/cqrs";
import { ITenantIsolatedRepository } from "@hl8/domain-kernel";

// 定义命令
class CreateProductCommand extends BaseCommand {
  static readonly commandType = "CreateProduct";

  constructor(
    aggregateId: string,
    public readonly productName: string,
    public readonly price: number,
    public readonly description: string,
  ) {
    super(aggregateId, CreateProductCommand.commandType);
  }

  clone(): BaseCommand {
    return new CreateProductCommand(this.aggregateId, this.productName, this.price, this.description);
  }
}

// 实现命令处理器
@CommandHandler(CreateProductCommand)
class CreateProductHandler {
  constructor(private readonly productRepository: ITenantIsolatedRepository<Product>) {}

  async handle(command: CreateProductCommand): Promise<CommandResult> {
    // 检查租户上下文（由中间件自动注入）
    if (!command.tenantContext) {
      return CommandResult.failure("MISSING_TENANT_CONTEXT", "命令缺少租户上下文");
    }

    // 创建产品实体
    const product = new Product(command.tenantContext.tenantId, command.productName, command.price, command.description, command.tenantContext.organizationId, command.tenantContext.departmentId);

    // 保存到仓储
    await this.productRepository.save(product);

    // 返回成功结果
    return CommandResult.success({
      productId: product.id.value,
      message: "产品创建成功",
    });
  }
}
```

#### 2. 创建查询和查询处理器

```typescript
import { BaseQuery, QueryResult } from "@hl8/application-kernel";
import { QueryHandler } from "@nestjs/cqrs";
import { ITenantIsolatedRepository, EntityId } from "@hl8/domain-kernel";

// 定义查询
class GetProductQuery extends BaseQuery {
  static readonly queryType = "GetProduct";

  constructor(public readonly productId: string) {
    super(GetProductQuery.queryType);
  }

  clone(): BaseQuery {
    return new GetProductQuery(this.productId);
  }
}

// 定义列表查询
class ListProductsQuery extends BaseQuery {
  static readonly queryType = "ListProducts";

  constructor(
    public readonly page: number = 1,
    public readonly pageSize: number = 10,
    public readonly filters?: Record<string, unknown>,
  ) {
    super(ListProductsQuery.queryType);
  }

  clone(): BaseQuery {
    return new ListProductsQuery(this.page, this.pageSize, this.filters);
  }
}

// 实现查询处理器
@QueryHandler(GetProductQuery)
class GetProductHandler {
  constructor(private readonly productRepository: ITenantIsolatedRepository<Product>) {}

  async handle(query: GetProductQuery): Promise<QueryResult> {
    // 检查租户上下文
    if (!query.tenantContext) {
      return QueryResult.failure("MISSING_TENANT_CONTEXT", "查询缺少租户上下文");
    }

    // 使用上下文查询（自动应用租户隔离）
    const product = await this.productRepository.findByIdWithContext(EntityId.fromString(query.productId), query.tenantContext);

    if (!product) {
      return QueryResult.failure("PRODUCT_NOT_FOUND", "产品不存在");
    }

    // 返回单个结果
    return QueryResult.successItem(product);
  }
}

@QueryHandler(ListProductsQuery)
class ListProductsHandler {
  constructor(private readonly productRepository: ITenantIsolatedRepository<Product>) {}

  async handle(query: ListProductsQuery): Promise<QueryResult> {
    if (!query.tenantContext) {
      return QueryResult.failure("MISSING_TENANT_CONTEXT", "查询缺少租户上下文");
    }

    // 使用上下文查询所有产品（自动应用租户隔离）
    const products = await this.productRepository.findAllByContext(query.tenantContext);

    // 应用分页和过滤
    const filteredProducts = this.applyFilters(products, query.filters);
    const paginatedProducts = this.applyPagination(filteredProducts, query.page, query.pageSize);

    // 返回列表结果
    return QueryResult.success(paginatedProducts, {
      total: filteredProducts.length,
      page: query.page,
      pageSize: query.pageSize,
    });
  }

  private applyFilters(products: Product[], filters?: Record<string, unknown>): Product[] {
    if (!filters) return products;
    // 实现过滤逻辑
    return products;
  }

  private applyPagination<T>(items: T[], page: number, pageSize: number): T[] {
    const start = (page - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }
}
```

#### 3. 执行命令和查询

```typescript
import { CommandQueryBusImpl } from "@hl8/application-kernel";

// 在控制器或服务中注入命令查询总线
class ProductController {
  constructor(private readonly bus: CommandQueryBusImpl) {}

  // 执行命令
  async createProduct(productName: string, price: number, description: string): Promise<void> {
    const command = new CreateProductCommand(EntityId.generate().value, productName, price, description);

    const result = await this.bus.executeCommand(command);

    if (!result.success) {
      throw new Error(`创建产品失败: ${result.message}`);
    }

    console.log("产品创建成功:", result.data);
  }

  // 执行查询
  async getProduct(productId: string): Promise<Product | null> {
    const query = new GetProductQuery(productId);
    const result = await this.bus.executeQuery(query);

    if (!result.success) {
      throw new Error(`查询产品失败: ${result.message}`);
    }

    return result.item as Product;
  }

  // 执行列表查询
  async listProducts(page: number = 1, pageSize: number = 10): Promise<{ products: Product[]; total: number }> {
    const query = new ListProductsQuery(page, pageSize);
    const result = await this.bus.executeQuery(query);

    if (!result.success) {
      throw new Error(`查询产品列表失败: ${result.message}`);
    }

    return {
      products: (result.data || []) as Product[],
      total: result.metadata?.total || 0,
    };
  }
}
```

#### 4. 使用中间件

```typescript
import { Module } from "@nestjs/common";
import { ApplicationKernelModule } from "@hl8/application-kernel";
import { LoggingMiddleware, PerformanceMonitoringMiddleware, ValidationMiddleware, RetryMiddleware } from "@hl8/application-kernel";

@Module({
  imports: [ApplicationKernelModule.forRoot()],
  providers: [
    // 中间件会自动注册到命令查询总线
    LoggingMiddleware, // 日志记录
    PerformanceMonitoringMiddleware, // 性能监控
    ValidationMiddleware, // 输入验证
    RetryMiddleware, // 重试机制
  ],
})
export class AppModule {}
```

**注意**: `CacheMiddleware` 已弃用，缓存功能由 `@hl8/cache` 统一提供。请直接使用 `ICache` 服务进行缓存操作。参见下文"缓存服务使用"章节。

#### 5. 自定义中间件

```typescript
import { BaseBusMiddleware, BaseCommand, BaseQuery, CommandResult, QueryResult, ExecutionContext } from "@hl8/application-kernel";
import { Logger } from "@hl8/logger";

// 创建自定义中间件
class CustomMiddleware extends BaseBusMiddleware {
  constructor(logger: Logger) {
    super(logger);
  }

  getName(): string {
    return "CustomMiddleware";
  }

  // 命令执行前的处理
  async beforeCommand(command: BaseCommand, context: ExecutionContext): Promise<boolean> {
    this.logger.debug("执行命令前的自定义处理", {
      commandType: command.commandType,
      commandId: command.commandId,
    });

    // 返回 true 继续执行，返回 false 阻止执行
    return true;
  }

  // 命令执行后的处理
  async afterCommand(command: BaseCommand, result: CommandResult, context: ExecutionContext): Promise<CommandResult> {
    if (!result.success) {
      this.logger.warn("命令执行失败", {
        commandType: command.commandType,
        error: result.message,
      });
    }

    // 可以修改结果或返回原结果
    return result;
  }

  // 查询执行前的处理
  async beforeQuery(query: BaseQuery, context: ExecutionContext): Promise<boolean> {
    this.logger.debug("执行查询前的自定义处理", {
      queryType: query.queryType,
      queryId: query.queryId,
    });

    return true;
  }

  // 查询执行后的处理
  async afterQuery(query: BaseQuery, result: QueryResult, context: ExecutionContext): Promise<QueryResult> {
    // 可以添加查询结果的处理逻辑
    return result;
  }
}
```

#### 6. 获取总线统计信息

```typescript
import { CommandQueryBusImpl } from "@hl8/application-kernel";

class BusMonitoringService {
  constructor(private readonly bus: CommandQueryBusImpl) {}

  async getStatistics(): Promise<void> {
    const stats = await this.bus.getStatistics();

    console.log("命令查询总线统计信息:");
    console.log(`总命令数: ${stats.totalCommands}`);
    console.log(`总查询数: ${stats.totalQueries}`);
    console.log(`成功命令数: ${stats.successfulCommands}`);
    console.log(`成功查询数: ${stats.successfulQueries}`);
    console.log(`平均命令执行时间: ${stats.averageCommandTime}ms`);
    console.log(`平均查询执行时间: ${stats.averageQueryTime}ms`);

    // 按命令类型查看统计
    for (const [commandType, typeStats] of Object.entries(stats.byCommandType)) {
      console.log(`命令类型 ${commandType}:`);
      console.log(`  执行次数: ${typeStats.totalExecutions}`);
      console.log(`  成功次数: ${typeStats.successfulExecutions}`);
      console.log(`  平均时间: ${typeStats.averageExecutionTime}ms`);
    }

    // 查看处理器统计
    for (const [handlerName, handlerStats] of Object.entries(stats.byHandler)) {
      console.log(`处理器 ${handlerName}:`);
      console.log(`  处理次数: ${handlerStats.totalExecutions}`);
      console.log(`  成功次数: ${handlerStats.successfulExecutions}`);
      console.log(`  平均时间: ${handlerStats.averageExecutionTime}ms`);
    }
  }
}
```

### CQRS 优势

1. **职责分离**: 命令和查询完全分离，各自专注于不同的职责
2. **独立扩展**: 读模型和写模型可以独立扩展和优化
3. **性能优化**: 查询可以使用优化的读模型，不受写操作影响
4. **可维护性**: 命令和查询的逻辑清晰分离，易于理解和维护
5. **可测试性**: 命令处理器和查询处理器可以独立测试
6. **中间件支持**: 通过中间件实现横切关注点（日志、监控、验证等）

---

## 📦 事件溯源（Event Sourcing）支持

本库提供完整的**事件溯源**支持，基于混合存储策略（PostgreSQL + MongoDB），支持事件的持久化、重放和快照功能。

### 事件溯源核心组件

- **事件存储 (EventStore)**: 持久化领域事件，支持混合存储策略（PostgreSQL/MongoDB/Hybrid）
- **事件总线 (EventBus)**: 发布和订阅领域事件、集成事件，支持异步处理和重试
- **事件快照 (EventSnapshot)**: 支持事件快照，优化重放性能
- **投影器 (Projectors)**: 基于事件构建读模型

### 事件溯源快速开始

#### 1. 使用事件存储保存和查询事件

```typescript
import { EventStore, DomainEvent, EntityId } from "@hl8/application-kernel";

// 在服务中注入事件存储
class OrderService {
  constructor(private readonly eventStore: EventStore) {}

  // 保存事件
  async saveOrderEvents(orderId: EntityId, events: DomainEvent[]): Promise<void> {
    const result = await this.eventStore.saveEvents(
      orderId,
      events,
      expectedVersion, // 乐观并发控制
    );

    if (!result.success) {
      throw new Error(`保存事件失败: ${result.error}`);
    }
  }

  // 查询事件
  async getOrderEvents(orderId: EntityId): Promise<DomainEvent[]> {
    return await this.eventStore.getEvents(orderId);
  }

  // 查询事件流（支持版本范围）
  async getOrderEventStream(orderId: EntityId, fromVersion?: number, toVersion?: number): Promise<EventStream> {
    return await this.eventStore.getEventStream(orderId, fromVersion, toVersion);
  }

  // 获取事件快照
  async getOrderSnapshot(orderId: EntityId): Promise<EventSnapshot | null> {
    return await this.eventStore.getSnapshot(orderId);
  }

  // 保存事件快照
  async saveOrderSnapshot(orderId: EntityId, snapshot: EventSnapshot): Promise<void> {
    await this.eventStore.saveSnapshot(snapshot);
  }
}
```

#### 2. 使用事件总线发布和订阅事件

```typescript
import { EventBus, DomainEvent } from "@hl8/application-kernel";

// 在服务中注入事件总线
class OrderEventService {
  constructor(private readonly eventBus: EventBus) {}

  // 发布领域事件
  async publishOrderCreated(orderId: EntityId, orderData: any): Promise<void> {
    const event: DomainEvent = {
      type: "OrderCreated",
      aggregateRootId: orderId,
      timestamp: new Date(),
      data: orderData,
    };

    const result = await this.eventBus.publishDomainEvent(event);
    if (!result.success) {
      throw new Error(`发布事件失败: ${result.error}`);
    }
  }

  // 订阅事件
  async subscribeToOrderEvents(): Promise<void> {
    await this.eventBus.subscribeToDomainEvent("OrderCreated", async (event) => {
      // 处理订单创建事件
      console.log("订单已创建:", event.data);
      return { success: true };
    });

    await this.eventBus.subscribeToDomainEvent("OrderCancelled", async (event) => {
      // 处理订单取消事件
      console.log("订单已取消:", event.data);
      return { success: true };
    });
  }

  // 批量发布事件
  async publishMultipleEvents(events: DomainEvent[]): Promise<void> {
    const results = await this.eventBus.publishEvents(events);
    const failed = results.filter((r) => !r.success);
    if (failed.length > 0) {
      throw new Error(`${failed.length} 个事件发布失败`);
    }
  }
}
```

#### 3. 事件重放和聚合重建

```typescript
import { EventStore, DomainEvent, EntityId, AggregateRoot } from "@hl8/application-kernel";

// 通过事件重放重建聚合根
class OrderAggregateService {
  constructor(private readonly eventStore: EventStore) {}

  async rebuildOrderFromEvents(orderId: EntityId): Promise<OrderAggregate> {
    // 1. 尝试获取快照（提升性能）
    const snapshot = await this.eventStore.getSnapshot(orderId);
    let order: OrderAggregate;
    let fromVersion = 0;

    if (snapshot) {
      // 从快照恢复
      order = OrderAggregate.fromSnapshot(snapshot);
      fromVersion = snapshot.version + 1;
    } else {
      // 创建新的聚合根
      order = new OrderAggregate(orderId);
    }

    // 2. 获取快照版本之后的所有事件
    const events = await this.eventStore.getEvents(orderId, fromVersion);

    // 3. 重放事件重建聚合根状态
    for (const event of events) {
      order.applyEvent(event);
    }

    return order;
  }
}

// 聚合根应用事件
class OrderAggregate extends AggregateRoot {
  private status: string = "PENDING";

  applyEvent(event: DomainEvent): void {
    switch (event.type) {
      case "OrderCreated":
        this.status = "CREATED";
        break;
      case "OrderConfirmed":
        this.status = "CONFIRMED";
        break;
      case "OrderCancelled":
        this.status = "CANCELLED";
        break;
    }
  }
}
```

#### 4. 配置事件存储和事件总线

```typescript
import { Module } from "@nestjs/common";
import { ApplicationKernelModule } from "@hl8/application-kernel";

@Module({
  imports: [
    ApplicationKernelModule.forRoot({
      // 事件存储配置
      eventStore: {
        type: "hybrid", // PostgreSQL + MongoDB 混合存储
        postgresql: process.env.DATABASE_URL,
        mongodb: process.env.MONGODB_URL,
      },
      // 事件总线配置
      eventBus: {
        deliveryGuarantee: "at-least-once", // 至少一次投递
        retryPolicy: {
          maxRetries: 3,
          backoffMs: 1000,
        },
      },
    }),
  ],
})
export class AppModule {}
```

---

## 💾 缓存服务使用

Application Kernel 集成 `@hl8/cache` 提供统一缓存服务，支持查询结果缓存、事件驱动失效等功能。

### 缓存服务核心组件

- **ICache**: 统一缓存接口，提供 get、set、delete、invalidateByTags 等操作
- **InMemoryCache**: 内存缓存实现
- **CacheKeyBuilder**: 缓存键构建工具
- **CacheCoordinationService**: 跨层缓存协调服务
- **EventDrivenCacheInvalidation**: 事件驱动失效处理器

### 缓存服务快速开始

#### 1. 注入缓存服务

```typescript
import { Injectable, Inject } from "@nestjs/common";
import { ICache, CacheKeyBuilder } from "@hl8/application-kernel";

@Injectable()
export class UserService {
  private readonly keyBuilder = new CacheKeyBuilder();

  constructor(@Inject("CacheService") private readonly cache: ICache) {}

  async getUserProfile(userId: string): Promise<UserProfile | null> {
    // 构建缓存键
    const cacheKey = this.keyBuilder.buildQueryKey("GetUserProfile", { userId });

    // 先查缓存
    const cached = await this.cache.get<UserProfile>(cacheKey);
    if (cached !== undefined) {
      return cached;
    }

    // 查询数据库
    const profile = await this.userRepository.getProfile(userId);

    // 缓存结果
    await this.cache.set(cacheKey, profile, 3600000, ["entity:User"]);

    return profile;
  }
}
```

#### 2. 使用缓存配置

```typescript
import { Module } from "@nestjs/common";
import { ApplicationKernelModule } from "@hl8/application-kernel";
import { TypedConfigModule, fileLoader } from "@hl8/config";

@Module({
  imports: [
    TypedConfigModule.forRoot({
      schema: ApplicationKernelConfig,
      load: [fileLoader({ path: "./config/app.yml" })],
    }),
    ApplicationKernelModule.forRoot(),
  ],
})
export class AppModule {}
```

配置示例 (`config/app.yml`):

```yaml
cache:
  type: memory
  ttl:
    default: 3600 # 默认 1 小时（秒）
  invalidation:
    strategy: event-based
    events:
      - UserUpdatedEvent
  performance:
    maxSize: 10000
```

#### 3. 事件驱动缓存失效

```typescript
import { Injectable, Inject } from "@nestjs/common";
import { ICache, EventDrivenCacheInvalidation, Logger } from "@hl8/application-kernel";
import { EventBus } from "@nestjs/cqrs";

@Injectable()
export class CacheEventHandler {
  private invalidation: EventDrivenCacheInvalidation;

  constructor(
    @Inject("CacheService") private readonly cache: ICache,
    private readonly logger: Logger,
  ) {}

  onModuleInit() {
    this.invalidation = new EventDrivenCacheInvalidation(this.cache, this.logger);

    // 注册失效规则
    this.invalidation.registerRule({
      id: "user-update-invalidation",
      eventType: "UserUpdatedEvent",
      keyGenerator: (event) => [`repo:User:${(event.data as any).userId}`],
      tags: ["entity:User"],
      enabled: true,
      priority: 100,
    });

    // 监听事件
    this.eventBus.subscribe("UserUpdatedEvent", (event) => {
      this.invalidation.handleEvent(event);
    });
  }
}
```

#### 4. 监控缓存统计

```typescript
import { Injectable, Inject } from "@nestjs/common";
import { ICache } from "@hl8/application-kernel";

@Injectable()
export class CacheMonitoringService {
  constructor(@Inject("CacheService") private readonly cache: ICache) {}

  async getStats() {
    const stats = await this.cache.getStats();

    console.log(`命中率: ${(stats.hitRate * 100).toFixed(2)}%`);
    console.log(`当前大小: ${stats.currentSize}/${stats.maxSize}`);
    console.log(`命中次数: ${stats.hits}`);
    console.log(`未命中次数: ${stats.misses}`);

    return stats;
  }
}
```

### 注意事项

1. **CacheMiddleware 已弃用**: 请直接使用 `ICache` 服务进行缓存操作
2. **配置映射**: Application Kernel 自动将配置映射到 `@hl8/cache`
3. **自动注入**: 使用 `@Inject('CacheService')` 注入缓存服务
4. **跨层协调**: 使用 `CacheCoordinationService` 实现跨层缓存失效

更多详细信息请参考 [@hl8/cache 文档](../../infra/cache/README.md)。

---

## 🔄 事件驱动架构（Event-Driven Architecture）支持

本库提供完整的**事件驱动架构**支持，通过事件总线、事件处理器、投影器等组件实现松耦合、可扩展的事件驱动系统。

### 事件驱动架构核心组件

- **事件总线 (EventBus)**: 发布订阅模式的事件总线，支持领域事件和集成事件
- **事件处理器 (EventHandler)**: 定义统一的事件处理接口，支持异步处理和重试
- **投影器 (Projector)**: 基于事件构建读模型，支持实时数据视图
- **读模型管理器 (ReadModelManager)**: 管理读模型的更新、查询和缓存
- **事件处理管道 (EventProcessingPipeline)**: 支持事件处理的管道化处理流程
- **集成事件 (IntegrationEvent)**: 跨服务边界的事件通信，支持微服务间解耦

### 事件驱动架构快速开始

#### 1. 创建事件处理器

```typescript
import { EventHandler, DomainEvent, EventHandlerResult } from "@hl8/application-kernel";

// 定义订单创建事件处理器
class OrderCreatedHandler implements EventHandler<DomainEvent> {
  getHandlerName(): string {
    return "OrderCreatedHandler";
  }

  getDescription(): string {
    return "处理订单创建事件，发送通知邮件";
  }

  getVersion(): string {
    return "1.0.0";
  }

  isAvailable(): boolean {
    return true;
  }

  async handle(event: DomainEvent): Promise<EventHandlerResult> {
    const startTime = Date.now();

    try {
      // 处理订单创建事件
      if (event.eventType === "OrderCreated") {
        const orderData = event.data;

        // 发送通知邮件
        await this.sendNotificationEmail(orderData.customerEmail, orderData);

        // 更新库存
        await this.updateInventory(orderData.items);

        return {
          success: true,
          processingTime: Date.now() - startTime,
          handlerName: this.getHandlerName(),
        };
      }

      return {
        success: false,
        error: "不支持的事件类型",
        processingTime: Date.now() - startTime,
        handlerName: this.getHandlerName(),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        processingTime: Date.now() - startTime,
        handlerName: this.getHandlerName(),
      };
    }
  }

  private async sendNotificationEmail(email: string, orderData: any): Promise<void> {
    // 发送邮件逻辑
  }

  private async updateInventory(items: any[]): Promise<void> {
    // 更新库存逻辑
  }
}
```

#### 2. 订阅事件

```typescript
import { EventBusImpl } from "@hl8/application-kernel";

// 在服务中注入事件总线
class OrderEventService {
  constructor(private readonly eventBus: EventBusImpl) {}

  async setupEventHandlers(): Promise<void> {
    // 创建事件处理器
    const orderCreatedHandler = new OrderCreatedHandler();
    const orderCancelledHandler = new OrderCancelledHandler();

    // 订阅领域事件
    await this.eventBus.subscribeToDomainEvent("OrderCreated", orderCreatedHandler);

    await this.eventBus.subscribeToDomainEvent("OrderCancelled", orderCancelledHandler);
  }
}
```

#### 3. 使用投影器构建读模型

```typescript
import { Projector, ProjectorHandler, DomainEvent, ReadModelManager } from "@hl8/application-kernel";

// 定义订单读模型
interface OrderReadModel {
  orderId: string;
  customerEmail: string;
  totalAmount: number;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

// 创建投影器处理器
class OrderProjectorHandler extends ProjectorHandler<DomainEvent> {
  supportsEventType(eventType: string): boolean {
    return ["OrderCreated", "OrderStatusUpdated", "OrderCancelled"].includes(eventType);
  }

  getSupportedEventTypes(): string[] {
    return ["OrderCreated", "OrderStatusUpdated", "OrderCancelled"];
  }

  protected async processEvent(event: DomainEvent, readModel: OrderReadModel): Promise<OrderReadModel> {
    switch (event.eventType) {
      case "OrderCreated":
        return {
          ...readModel,
          orderId: event.aggregateRootId.toString(),
          customerEmail: event.data.customerEmail,
          totalAmount: event.data.totalAmount,
          status: "CREATED",
          createdAt: event.timestamp,
          updatedAt: event.timestamp,
        };

      case "OrderStatusUpdated":
        return {
          ...readModel,
          status: event.data.status,
          updatedAt: event.timestamp,
        };

      case "OrderCancelled":
        return {
          ...readModel,
          status: "CANCELLED",
          updatedAt: event.timestamp,
        };

      default:
        return readModel;
    }
  }
}

// 使用投影器
class OrderProjector extends Projector<OrderReadModel> {
  constructor(logger: Logger, config: ProjectorConfig) {
    super(logger, config);
    this.handler = new OrderProjectorHandler(logger, {
      name: "OrderProjectorHandler",
      enabled: true,
    });
  }

  supportsEventType(eventType: string): boolean {
    return this.handler.supportsEventType(eventType);
  }

  getSupportedEventTypes(): string[] {
    return this.handler.getSupportedEventTypes();
  }

  async getReadModel(): Promise<OrderReadModel> {
    // 从存储中获取读模型
    // 这里简化示例
    return {} as OrderReadModel;
  }

  async updateReadModel(readModel: OrderReadModel): Promise<void> {
    // 更新读模型到存储
    // 这里简化示例
  }
}
```

#### 4. 发布集成事件（跨服务通信）

```typescript
import { IntegrationEvent, EventBusImpl } from "@hl8/application-kernel";

// 发布集成事件
class IntegrationEventService {
  constructor(private readonly eventBus: EventBusImpl) {}

  async publishOrderCreatedEvent(orderData: any): Promise<void> {
    // 创建集成事件
    const integrationEvent = new IntegrationEvent(
      "OrderCreated",
      orderData,
      "order-service", // 源服务
      {
        target: "notification-service", // 目标服务（可选）
        correlationId: orderData.correlationId,
        userId: orderData.userId,
      },
    );

    // 发布集成事件
    const result = await this.eventBus.publishIntegrationEvent(integrationEvent);

    if (!result.success) {
      throw new Error(`发布集成事件失败: ${result.error}`);
    }
  }

  // 订阅其他服务的集成事件
  async subscribeToPaymentEvents(): Promise<void> {
    await this.eventBus.subscribeToIntegrationEvent("PaymentCompleted", {
      handle: async (event: IntegrationEvent) => {
        // 处理支付完成事件
        console.log("支付完成:", event.data);
        return {
          success: true,
          processingTime: 0,
          handlerName: "PaymentCompletedHandler",
        };
      },
      getHandlerName: () => "PaymentCompletedHandler",
      getDescription: () => "处理支付完成事件",
      getVersion: () => "1.0.0",
      isAvailable: () => true,
    });
  }
}
```

#### 5. 配置事件总线

```typescript
import { Module } from "@nestjs/common";
import { ApplicationKernelModule } from "@hl8/application-kernel";

@Module({
  imports: [
    ApplicationKernelModule.forRoot({
      // 事件总线配置
      eventBus: {
        deliveryGuarantee: "at-least-once", // 至少一次投递
        retryPolicy: {
          maxRetries: 3, // 最大重试次数
          backoffMs: 1000, // 重试延迟（毫秒）
        },
        // 其他配置...
        maxConcurrency: 10, // 最大并发处理数
        processingTimeout: 30000, // 处理超时（毫秒）
        enableDeadLetterQueue: true, // 启用死信队列
        enablePerformanceMonitoring: true, // 启用性能监控
      },
    }),
  ],
})
export class AppModule {}
```

#### 6. 监控事件处理

```typescript
import { EventBusImpl } from "@hl8/application-kernel";

// 获取事件总线统计信息
class EventMonitoringService {
  constructor(private readonly eventBus: EventBusImpl) {}

  async getEventStatistics(): Promise<void> {
    const stats = await this.eventBus.getStatistics();

    console.log("事件统计信息:");
    console.log(`总发布数: ${stats.totalPublished}`);
    console.log(`总处理数: ${stats.totalProcessed}`);
    console.log(`活跃订阅数: ${stats.activeSubscriptions}`);
    console.log(`平均处理时间: ${stats.averageProcessingTime}ms`);
    console.log(`成功率: ${stats.successRate * 100}%`);

    // 按事件类型查看统计
    for (const [eventType, typeStats] of Object.entries(stats.byEventType)) {
      console.log(`事件类型 ${eventType}:`);
      console.log(`  发布次数: ${typeStats.published}`);
      console.log(`  处理次数: ${typeStats.processed}`);
      console.log(`  成功次数: ${typeStats.success}`);
    }
  }

  // 获取所有订阅
  async getSubscriptions(): Promise<void> {
    const subscriptions = await this.eventBus.getSubscriptions();

    for (const subscription of subscriptions) {
      console.log(`订阅ID: ${subscription.id}`);
      console.log(`事件类型: ${subscription.eventType}`);
      console.log(`处理器: ${subscription.handlerName}`);
      console.log(`是否活跃: ${subscription.active}`);
      console.log(`处理次数: ${subscription.processCount}`);
      console.log(`成功次数: ${subscription.successCount}`);
    }
  }
}
```

### 事件驱动架构优势

1. **松耦合**: 事件发布者和订阅者互不依赖，易于扩展和维护
2. **异步处理**: 支持异步事件处理，提升系统响应性能
3. **可扩展性**: 轻松添加新的事件处理器，无需修改现有代码
4. **可观测性**: 完整的事件统计和监控，便于系统运维
5. **可靠性**: 支持事件重试、死信队列，确保事件不丢失
6. **跨服务通信**: 通过集成事件实现微服务间的解耦通信

---

### 租户隔离快速开始

#### 1. 配置模块

```typescript
import { Module } from "@nestjs/common";
import { ApplicationKernelModule } from "@hl8/application-kernel";
import { TypedConfigModule } from "@hl8/config";

@Module({
  imports: [
    // 配置加载（如果使用）
    TypedConfigModule.forRoot({
      // ...
    }),

    // 应用内核模块（自动提供租户隔离功能）
    ApplicationKernelModule.forRoot(),
  ],
})
export class AppModule {}
```

#### 2. 配置租户上下文提取器（可选）

如果需要使用 JWT Token 或用户信息提取租户上下文，需要提供相应的配置：

```typescript
import { Module } from "@nestjs/common";
import { ApplicationKernelModule } from "@hl8/application-kernel";

// 实现用户上下文查询接口（用于从用户ID提取租户上下文）
class MyUserContextQuery implements IUserContextQuery {
  async queryUserTenantContext(userId: string): Promise<UserTenantContext> {
    // 从数据库或服务中查询用户的租户信息
    const user = await this.userService.findById(userId);
    return {
      tenantId: user.tenantId,
      organizationId: user.organizationId,
      departmentId: user.departmentId,
      permissions: user.permissions,
      isCrossTenant: user.isAdmin,
    };
  }
}

@Module({
  imports: [ApplicationKernelModule.forRoot()],
  providers: [
    // 提供用户上下文查询实现
    {
      provide: "IUserContextQuery",
      useClass: MyUserContextQuery,
    },
    // 提供JWT配置（如果使用JWT）
    {
      provide: "JWT_CONFIG",
      useValue: {
        secret: process.env.JWT_SECRET || "your-secret-key",
        algorithm: "HS256",
      },
    },
  ],
})
export class AppModule {}
```

#### 3. 在命令中使用租户上下文

```typescript
import { BaseCommand, CommandResult } from "@hl8/application-kernel";
import { CommandHandler } from "@nestjs/cqrs";
import { ITenantIsolatedRepository } from "@hl8/domain-kernel";

// 定义命令
class CreateProductCommand extends BaseCommand {
  static readonly commandType = "CreateProduct";

  constructor(
    aggregateId: string,
    public readonly productName: string,
    public readonly price: number,
  ) {
    super(aggregateId, CreateProductCommand.commandType);
  }

  clone(): BaseCommand {
    return new CreateProductCommand(this.aggregateId, this.productName, this.price);
  }
}

// 实现命令处理器
@CommandHandler(CreateProductCommand)
class CreateProductHandler {
  constructor(private readonly productRepository: ITenantIsolatedRepository<Product>) {}

  async handle(command: CreateProductCommand): Promise<CommandResult> {
    // 租户上下文已由中间件自动注入到 command.tenantContext
    if (!command.tenantContext) {
      return CommandResult.failure("MISSING_TENANT_CONTEXT", "命令缺少租户上下文");
    }

    // 创建产品实体（自动包含租户信息）
    const product = new Product(command.tenantContext.tenantId, command.productName, command.price, command.tenantContext.organizationId, command.tenantContext.departmentId);

    // 保存到仓储（自动应用租户隔离）
    await this.productRepository.save(product);

    return CommandResult.success({ productId: product.id.value });
  }
}
```

#### 4. 在查询中使用租户上下文

```typescript
import { BaseQuery, QueryResult } from "@hl8/application-kernel";
import { QueryHandler } from "@nestjs/cqrs";
import { ITenantIsolatedRepository } from "@hl8/domain-kernel";

// 定义查询
class GetProductQuery extends BaseQuery {
  static readonly queryType = "GetProduct";

  constructor(public readonly productId: string) {
    super(GetProductQuery.queryType);
  }

  clone(): BaseQuery {
    return new GetProductQuery(this.productId);
  }
}

// 实现查询处理器
@QueryHandler(GetProductQuery)
class GetProductHandler {
  constructor(private readonly productRepository: ITenantIsolatedRepository<Product>) {}

  async handle(query: GetProductQuery): Promise<QueryResult> {
    // 租户上下文已由中间件自动注入到 query.tenantContext
    if (!query.tenantContext) {
      return QueryResult.failure("MISSING_TENANT_CONTEXT", "查询缺少租户上下文");
    }

    // 使用上下文查询（自动应用租户隔离过滤）
    const product = await this.productRepository.findByIdWithContext(EntityId.fromString(query.productId), query.tenantContext);

    if (!product) {
      return QueryResult.failure("PRODUCT_NOT_FOUND", "产品不存在");
    }

    return QueryResult.successItem(product);
  }
}
```

#### 5. 从不同来源提取租户上下文

框架支持从多种来源提取租户上下文：

##### 从 HTTP Header 提取（默认）

```typescript
// 在 HTTP 请求头中设置：
// x-tenant-id: <租户UUID>
// x-organization-id: <组织UUID> (可选)
// x-department-id: <部门UUID> (可选)
// x-permissions: read,write (可选)
```

##### 从 JWT Token 提取

```typescript
import { TenantContextExtractorImpl } from "@hl8/application-kernel";

// JWT Token payload 格式：
{
  tenantId: string,        // 必需
  organizationId?: string, // 可选
  departmentId?: string,   // 可选
  permissions?: string[],  // 可选
  isCrossTenant?: boolean  // 可选（是否允许跨租户访问）
}

// 使用
const extractor = new TenantContextExtractorImpl(null, {
  secret: "your-jwt-secret",
  algorithm: "HS256",
});

const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...";
const context = await extractor.extractFromToken(token);
```

##### 从用户信息提取

```typescript
import { IUserContextQuery } from "@hl8/application-kernel";

// 实现用户上下文查询接口
class MyUserContextQuery implements IUserContextQuery {
  async queryUserTenantContext(userId: string): Promise<UserTenantContext> {
    // 从数据库或服务查询用户的租户信息
    const user = await this.userService.findById(userId);

    return {
      tenantId: user.tenantId,
      organizationId: user.organizationId,
      departmentId: user.departmentId,
      permissions: user.permissions,
      isCrossTenant: user.role === "admin",
    };
  }
}

// 使用
const extractor = new TenantContextExtractorImpl(userContextQuery);
const context = await extractor.extractFromUser("user-id-123");
```

#### 6. 验证跨租户访问权限

```typescript
import { ITenantPermissionValidator } from "@hl8/application-kernel";
import { TenantContext, TenantId } from "@hl8/domain-kernel";

// 在服务中注入权限验证器
class CrossTenantService {
  constructor(private readonly permissionValidator: ITenantPermissionValidator) {}

  async accessOtherTenant(context: TenantContext, targetTenantId: TenantId): Promise<boolean> {
    // 验证是否可以跨租户访问
    const canAccess = await this.permissionValidator.validateCrossTenantAccess(context);

    if (!canAccess) {
      throw new Error("不允许跨租户访问，需要管理员权限");
    }

    // 验证是否可以访问特定租户
    const canAccessTenant = await this.permissionValidator.validateTenantAccess(context, targetTenantId);

    return canAccessTenant;
  }
}
```

---

### 异常处理文档（T020）

本库提供统一的应用层异常体系，所有公共 API 的异常均应为类型化异常，便于上层捕获、日志关联与契约稳定。

- 核心构件：
  - `src/exceptions/base/application-exception.base.ts` 应用层异常基类
  - `src/exceptions/base/exception-codes.ts` 异常代码常量（稳定契约）
  - 功能域异常：`use-case/`、`command/`、`query/`、`event/`、`saga/`

- 基本约定：
  - 仅抛出继承自应用层异常基类的异常；避免抛出裸 `Error`
  - 必须携带错误码、组件名、操作名与上下文，支持链路追踪
  - 与 `@hl8/logger` 集成，记录结构化错误日志，包含 `correlationId`

- 使用示例：

```ts
// 以命令校验失败为例（示意）
import { ApplicationException, ExceptionCodes } from "@hl8/application-kernel";

export class CommandValidationException extends ApplicationException {
  constructor(message: string, details: unknown) {
    super(message, ExceptionCodes.COMMAND_VALIDATION_FAILED, "Command", "validate", { details });
  }
}
```

- 最佳实践：
  - 入口层统一捕获应用层异常并转换为稳定的 HTTP/消息响应
  - 为每个公共 API 定义可预期的异常集合，并在契约测试中验证

---

### 配置文档（T028）

应用内所有可变行为通过配置驱动，采用 `@hl8/config` 提供的类型化配置与校验机制。

- 主要文件：
  - `src/config/config.interface.ts` 配置接口定义
  - `src/config/application-kernel.config.ts` 配置实现与默认值
  - 结合 `class-validator`、`class-transformer` 做强校验

- 关键配置项：
  - 事件存储：存储类型（PostgreSQL/MongoDB/Hybrid）、连接与保留策略
  - 事件总线：投递保障、重试策略、死信与监控
  - 缓存与性能监控：缓存类型、TTL、指标采集与报警

- 加载与校验：

```ts
import { TypedConfigModule } from "@hl8/config";

TypedConfigModule.forRoot({
  schema: ApplicationKernelConfig,
  load: [
    /* 文件/环境加载器 */
  ],
});
```

- 注意事项：
  - 所有配置变更需通过校验后方可生效；建议在启动阶段失败即终止
  - 支持热重载时，确保与缓存/总线/存储的幂等与重连策略

---

### 测试约定

- 单元测试与源代码同目录（就近原则）：`*.spec.ts`
- 集成测试集中在 `tests/integration/`
- 端到端测试集中在 `tests/e2e/`
- 契约测试集中在 `tests/contract/`

### 集成测试文档

本库提供全面的集成测试套件，验证应用内核在不同场景下的功能：

#### 测试分类

1. **基础集成测试** (`tests/integration/basic.integration.spec.ts`)
   - 实体ID创建和验证
   - 基础数据操作
   - 性能基准测试
   - 类型安全验证

2. **CQRS集成测试** (`tests/integration/cqrs.integration.spec.ts`)
   - 命令和查询执行
   - 命令/查询总线集成
   - 错误处理和验证
   - 性能测试

3. **事件溯源集成测试** (`tests/integration/event-sourcing.integration.spec.ts`)
   - 事件存储操作
   - 事件总线发布和处理
   - 事件重放和快照
   - 性能和并发测试

4. **Saga集成测试** (`tests/integration/saga.integration.spec.ts`)
   - Saga执行和补偿
   - 状态管理和持久化
   - 错误处理和恢复
   - 性能和并发执行

5. **API契约测试** (`tests/contract/api.contract.spec.ts`)
   - API兼容性验证
   - 类型安全验证
   - 性能特征
   - 错误处理契约

#### 运行测试

```bash
# 运行所有集成测试
pnpm test --testPathPatterns="integration|contract"

# 运行特定测试分类
pnpm test --testPathPatterns="basic.integration"
pnpm test --testPathPatterns="cqrs.integration"
pnpm test --testPathPatterns="event-sourcing.integration"
pnpm test --testPathPatterns="saga.integration"
pnpm test --testPathPatterns="api.contract"
```

#### 测试覆盖

集成测试提供全面的覆盖范围：

- ✅ 模块初始化和配置
- ✅ 实体ID创建和验证
- ✅ 基础操作和性能
- ✅ 错误处理和恢复
- ✅ 类型安全和API契约
- ✅ 性能基准和阈值

### 版本与兼容

- Node.js >= 20，TypeScript 5.9+
- 严格遵循语义化版本；公共异常码、公共类型与装饰器为稳定契约

### 版本历史

- **v1.0.0** - 核心功能
  - ✅ CQRS 支持（命令和查询总线）
  - ✅ 事件溯源支持（事件存储、事件总线、快照）
  - ✅ 事件驱动架构（EDA）支持
  - ✅ 投影器（Projectors）和 Saga 模式
  - ✅ 缓存和监控支持

- **v1.1.0** - 租户隔离支持
  - ✅ 租户上下文中间件（自动提取和注入）
  - ✅ 租户上下文提取器（支持 HTTP Header、JWT Token、用户信息）
  - ✅ 租户权限验证器（跨租户访问控制）
  - ✅ 命令/查询基类增强（自动包含 tenantContext）
  - ✅ 领域事件自动包含租户信息
  - ✅ 完整的集成测试（端到端测试、多层级隔离测试、上下文传递测试、跨租户访问测试）

## 评价报告

详细的项目评价报告请查看 [EVALUATION.md](./EVALUATION.md)，包含：

- 架构设计评价
- 代码质量分析
- 模块实现完整性
- 测试覆盖情况
- 改进建议和优先级

## 改进总结

基于规格文档 `specs/002-application-kernel` 的改进工作已完成，详细内容请查看：

- [改进计划](./IMPROVEMENT_PLAN.md) - 完整的改进计划
- [改进总结](./IMPROVEMENT_SUMMARY.md) - 已完成的改进工作详情

### 主要改进成果

- ✅ 所有模块导出已启用（projectors, sagas, bus, monitoring）
- ✅ 缓存功能集成 `@hl8/cache` 统一缓存库
- ✅ 所有类型错误已修复（TypeScript 严格模式通过）
- ✅ 所有测试通过（42 个测试套件，537 个测试用例）
- ✅ 代码质量提升（优化导出结构，避免命名冲突）

## API 参考

完整的 API 参考文档请查看 [API.md](./API.md)，包含：

- 所有公共类和接口的详细说明
- 方法、属性、参数和返回值
- 类型定义和枚举
- 使用示例和最佳实践

### 租户隔离相关 API

#### TenantContextMiddleware

- `constructor(logger: Logger, tenantExtractor: ITenantContextExtractor, permissionValidator: ITenantPermissionValidator)`: 创建中间件实例
- `getName(): string`: 获取中间件名称
- `beforeCommand(command: BaseCommand, context: ExecutionContext): Promise<boolean>`: 命令执行前的处理（提取并注入租户上下文）
- `beforeQuery(query: BaseQuery, context: ExecutionContext): Promise<boolean>`: 查询执行前的处理（提取并注入租户上下文）

#### ITenantContextExtractor

- `extractFromRequest(request: unknown): Promise<TenantContext | null>`: 从 HTTP 请求提取租户上下文
- `extractFromToken(token: string): Promise<TenantContext | null>`: 从 JWT Token 提取租户上下文
- `extractFromUser(userId: string): Promise<TenantContext | null>`: 从用户信息提取租户上下文
- `extractFromHeader(headers: Record<string, string>): Promise<TenantContext | null>`: 从 HTTP Header 提取租户上下文

#### TenantContextExtractorImpl

- `constructor(userContextQuery?: IUserContextQuery, jwtConfig?: JwtConfig)`: 创建提取器实例
- `extractFromHeader(headers: Record<string, string>): Promise<TenantContext | null>`: 从 HTTP Header 提取（支持 x-tenant-id, x-organization-id, x-department-id, x-permissions）
- `extractFromToken(token: string): Promise<TenantContext | null>`: 从 JWT Token 提取（需要配置 JWT_CONFIG）
- `extractFromUser(userId: string): Promise<TenantContext | null>`: 从用户信息提取（需要提供 IUserContextQuery）

#### ITenantPermissionValidator

- `validateTenantAccess(context: TenantContext, tenantId: TenantId): Promise<boolean>`: 验证是否可以访问指定租户
- `validateOrganizationAccess(context: TenantContext, orgId: OrganizationId): Promise<boolean>`: 验证是否可以访问指定组织
- `validateDepartmentAccess(context: TenantContext, deptId: DepartmentId): Promise<boolean>`: 验证是否可以访问指定部门
- `validateCrossTenantAccess(context: TenantContext): Promise<boolean>`: 验证是否允许跨租户访问
- `validatePermission(context: TenantContext, permission: string): Promise<boolean>`: 验证是否拥有指定权限

#### BaseCommand 和 BaseQuery

- `tenantContext?: TenantContext`: 租户上下文属性（由中间件自动注入）

#### IUserContextQuery

- `queryUserTenantContext(userId: string): Promise<UserTenantContext>`: 查询用户的租户上下文信息

#### UserTenantContext

```typescript
interface UserTenantContext {
  tenantId: string;
  organizationId?: string;
  departmentId?: string;
  permissions?: string[];
  isCrossTenant?: boolean;
  userId?: string;
}
```

#### JwtConfig

```typescript
interface JwtConfig {
  secret: string; // JWT 签名密钥（必需）
  algorithm?: string; // JWT 算法（可选，默认 HS256）
}
```

### 事件溯源相关 API

#### IEventStore

- `saveEvents(aggregateId: EntityId, events: DomainEvent[], expectedVersion: number): Promise<EventStoreResult>`: 保存事件（支持乐观并发控制）
- `getEvents(aggregateId: EntityId, fromVersion?: number, toVersion?: number): Promise<DomainEvent[]>`: 获取聚合根的事件列表
- `getEventStream(aggregateId: EntityId, fromVersion?: number, toVersion?: number): Promise<EventStream>`: 获取事件流
- `getAllEvents(fromTimestamp?: Date, toTimestamp?: Date, limit?: number): Promise<DomainEvent[]>`: 获取所有事件（支持时间范围）
- `getSnapshot(aggregateId: EntityId, version?: number): Promise<EventSnapshot | null>`: 获取事件快照
- `saveSnapshot(snapshot: EventSnapshot): Promise<void>`: 保存事件快照
- `getStatistics(): Promise<EventStoreStatistics>`: 获取存储统计信息

#### IEventBus

- `publishDomainEvent(event: DomainEvent): Promise<EventPublishResult>`: 发布领域事件
- `publishIntegrationEvent(event: IntegrationEvent): Promise<EventPublishResult>`: 发布集成事件
- `publishEvents(events: (DomainEvent | IntegrationEvent)[]): Promise<EventPublishResult[]>`: 批量发布事件
- `subscribeToDomainEvent(eventType: string, handler: EventHandler<DomainEvent>): Promise<string>`: 订阅领域事件
- `subscribeToIntegrationEvent(eventType: string, handler: EventHandler<IntegrationEvent>): Promise<string>`: 订阅集成事件
- `unsubscribe(subscriptionId: string): Promise<boolean>`: 取消订阅
- `getSubscriptions(): Promise<EventSubscription[]>`: 获取所有订阅
- `getStatistics(): Promise<EventBusStatistics>`: 获取总线统计信息
- `start(): Promise<void>`: 启动事件总线
- `stop(): Promise<void>`: 停止事件总线

## 故障排除

遇到问题时，请查看 [故障排除指南](./TROUBLESHOOTING.md)，包含：

- 常见错误和解决方案
- 用例、命令、查询问题诊断
- 事件和 Saga 问题处理
- 配置和性能问题排查
- 集成问题解决
- 调试技巧和工具

## 性能调优

性能优化指南请查看 [性能调优指南](./PERFORMANCE.md)，包含：

- 性能目标和指标
- 性能监控和诊断
- 用例、命令、查询优化
- 事件处理和缓存策略
- 数据库和并发优化
- 性能调优最佳实践

## 迁移指南

从现有系统迁移到 application-kernel 的指南请查看 [迁移指南](./MIGRATION.md)，包含：

- 迁移概述和策略
- 用例、命令、查询迁移步骤
- 事件处理和配置迁移
- 异常处理和测试迁移
- 迁移检查清单和示例

## 安全考虑

安全最佳实践和考虑事项请查看 [安全考虑文档](./SECURITY.md)，包含：

- 输入验证和身份认证
- 数据安全和加密
- 事件和 Saga 安全
- 缓存和日志安全
- 配置安全
- 安全测试和合规性

## 部署和配置

部署和配置指南请查看 [部署和配置指南](./DEPLOYMENT.md)，包含：

- 环境配置和模块配置
- 事件存储和总线配置
- 缓存和监控配置
- 生产环境部署
- 容器化和 Kubernetes 部署
- 配置管理和健康检查

---

## 📚 文档索引

完整的文档集合：

| 文档                                 | 说明                 |
| ------------------------------------ | -------------------- |
| [快速入门指南](./QUICKSTART.md)      | 快速上手使用应用内核 |
| [API 参考](./API.md)                 | 完整的 API 文档      |
| [故障排除指南](./TROUBLESHOOTING.md) | 常见问题解决方案     |
| [性能调优指南](./PERFORMANCE.md)     | 性能优化最佳实践     |
| [迁移指南](./MIGRATION.md)           | 从现有系统迁移       |
| [安全考虑文档](./SECURITY.md)        | 安全最佳实践         |
| [部署和配置指南](./DEPLOYMENT.md)    | 部署和配置详解       |
| [项目评价报告](./EVALUATION.md)      | 项目评价和改进建议   |

---

## 🚀 快速链接

- [开始使用](./QUICKSTART.md) - 5分钟快速上手
- [查看 API](./API.md) - 完整 API 参考
- [解决问题](./TROUBLESHOOTING.md) - 遇到问题？看这里
- [优化性能](./PERFORMANCE.md) - 提升应用性能
