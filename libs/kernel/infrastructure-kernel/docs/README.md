# @hl8/infrastructure-kernel

基础设施层核心模块 - 为 HL8 SAAS 平台提供统一的数据持久化能力

---

## 📋 概述

`@hl8/infrastructure-kernel` 是 HL8 SAAS 平台的基础设施层核心模块，提供：

- ✅ **统一ORM接口**: 使用 MikroORM 统一 PostgreSQL 和 MongoDB
- ✅ **标准仓储实现**: 实现 IRepository 和 ITenantIsolatedRepository
- ✅ **租户数据隔离**: 自动应用租户过滤条件
- ✅ **多级隔离**: 租户 → 组织 → 部门三级隔离
- ✅ **实体映射**: 领域实体和持久化实体自动/手动转换
- ✅ **事务管理**: 支持嵌套事务、事务超时、自动提交/回滚
- ✅ **规范模式查询**: 将业务规范转换为数据库查询
- ✅ **事件存储**: 完整实现 IEventStore，支持事件溯源
- ✅ **异常处理**: 统一异常转换，自动识别异常类型
- ✅ **仓储工厂**: 提供仓储创建和 NestJS 依赖注入支持
- ✅ **连接管理**: 基于 @hl8/database 的连接池和健康检查
- ✅ **查询缓存**: 使用 @hl8/cache 提供仓储查询自动缓存
- ✅ **类型安全**: 完整的 TypeScript 类型定义

## 📦 安装

```bash
pnpm add @hl8/infrastructure-kernel
```

## 🏗️ 架构定位

```text
┌─────────────────────────────────────┐
│       Application Layer             │  应用层：用例编排
├─────────────────────────────────────┤
│       Domain Layer                  │  领域层：业务逻辑
├─────────────────────────────────────┤
│   Infrastructure Layer (本模块)      │  基础设施层：数据持久化
└─────────────────────────────────────┘
```

**依赖关系**:

- ✅ 依赖 `@hl8/domain-kernel` (领域模型、值对象、实体)
- ✅ 依赖 `@hl8/application-kernel` (用例接口)
- ✅ 依赖 `@hl8/database` (连接管理)
- ✅ 依赖 `@hl8/logger` (日志)
- ✅ 依赖 `@hl8/config` (配置)
- ✅ 依赖 `@hl8/cache` (缓存)

## 🚀 快速开始

### 1. 使用基础仓储

```typescript
import { MikroORMRepository, BaseEntity } from "@hl8/infrastructure-kernel";
import { EntityManager, Entity, Property } from "@mikro-orm/core";
import { EntityId } from "@hl8/domain-kernel";

// 定义实体类
@Entity({ tableName: "users", collection: "users" })
class UserEntity extends BaseEntity {
  @Property()
  name!: string;

  @Property()
  email!: string;
}

// 创建仓储实例
const repository = new MikroORMRepository<UserEntity>(entityManager, "UserEntity");

// 创建并保存实体
const user = new UserEntity();
user.id = "550e8400-e29b-41d4-a716-446655440000";
user.name = "John Doe";
user.email = "john@example.com";
await repository.save(user);

// 查找实体
const found = await repository.findById(new EntityId(user.id));

// 删除实体
await repository.delete(new EntityId(user.id));
```

### 2. 使用租户隔离仓储

```typescript
import { MikroORMTenantIsolatedRepository, TenantIsolatedPersistenceEntity } from "@hl8/infrastructure-kernel";
import { TenantContext, TenantId, OrganizationId, DepartmentId, EntityId } from "@hl8/domain-kernel";
import { EntityManager, Entity, Property } from "@mikro-orm/core";

// 定义租户隔离实体
@Entity({ tableName: "documents", collection: "documents" })
class DocumentEntity extends TenantIsolatedPersistenceEntity {
  @Property()
  title!: string;

  @Property()
  content!: string;
}

// 创建租户上下文
const tenantId = new TenantId();
const orgId = new OrganizationId(tenantId);
const context = new TenantContext(tenantId, { organizationId: orgId });

// 创建租户隔离仓储
const repository = new MikroORMTenantIsolatedRepository<DocumentEntity>(entityManager, "DocumentEntity");

// 自动应用租户过滤，仅返回当前租户的数据
const documents = await repository.findAllByContext(context);

// 按组织查找
const orgDocs = await repository.findByOrganization(orgId, context);

// 统计租户下的文档数量
const count = await repository.countByTenant(tenantId, context);
```

### 3. 使用实体映射器

```typescript
import { EntityMapper, MappingConfig } from "@hl8/infrastructure-kernel";
import { TenantIsolatedEntity, TenantId } from "@hl8/domain-kernel";
import { TenantIsolatedPersistenceEntity } from "@hl8/infrastructure-kernel";

// 定义映射配置（自动映射 + 手动配置）
const mapperConfig: MappingConfig<DomainProduct, ProductEntity> = {
  autoMap: true, // 启用自动映射同名同类型属性
  customMappings: new Map([
    [
      "price",
      {
        sourcePath: "price.value",
        targetPath: "price",
        transform: (value: Money) => value.amount,
      },
    ],
  ]),
};

// 创建映射器
const mapper = new EntityMapper<DomainProduct, ProductEntity>(mapperConfig);

// 领域实体 → 持久化实体
const domainProduct = new DomainProduct(tenantId, "商品名称", new Money(100));
const persistenceProduct = mapper.toPersistence(domainProduct);

// 持久化实体 → 领域实体
const retrievedEntity = await repository.findById(productId);
const domainProduct = mapper.toDomain(retrievedEntity);

// 批量转换
const domainProducts = mapper.toDomainList(entities);
const persistenceProducts = mapper.toPersistenceList(domainProducts);
```

### 4. 使用事务管理器

```typescript
import { MikroORMTransactionManager, ITransactionManager } from '@hl8/infrastructure-kernel';

// 注入事务管理器（NestJS）
constructor(
  @Inject('ITransactionManager')
  private readonly transactionManager: ITransactionManager
) {}

// 方式1：使用 runInTransaction（推荐，自动管理事务生命周期）
async createOrder(orderData: OrderData): Promise<Order> {
  return this.transactionManager.runInTransaction(async (em) => {
    // 在同一事务中执行多个操作
    const order = new OrderEntity(orderData);
    em.persist(order);

    for (const item of orderData.items) {
      const orderItem = new OrderItemEntity(item);
      em.persist(orderItem);
    }

    await em.flush();
    return order;
  });
}

// 方式2：手动管理事务
async createOrderManually(orderData: OrderData): Promise<Order> {
  const context = await this.transactionManager.begin({
    timeout: 30000, // 30秒超时
    isolationLevel: 'READ COMMITTED',
  });

  try {
    const order = new OrderEntity(orderData);
    context.entityManager.persist(order);
    await context.entityManager.flush();

    await this.transactionManager.commit(context);
    return order;
  } catch (error) {
    await this.transactionManager.rollback(context);
    throw error;
  }
}

// 嵌套事务（最多5层）
async complexOperation(): Promise<void> {
  await this.transactionManager.runInTransaction(async (em) => {
    // 内层事务（复用外层事务的 EntityManager）
    await this.transactionManager.runInTransaction(async (innerEm) => {
      // 嵌套事务操作
      const entity = new Entity();
      innerEm.persist(entity);
      await innerEm.flush();
    });
  });
}
```

### 5. 使用规范模式查询

```typescript
import { QueryBuilder, SpecificationConverter } from "@hl8/infrastructure-kernel";
import { ISpecification, IQuerySpecification } from "@hl8/domain-kernel";

// 定义业务规范
class PriceGreaterThanSpec implements IQuerySpecification<Product> {
  constructor(private readonly minPrice: number) {}

  isSatisfiedBy(product: Product): boolean {
    return product.price > this.minPrice;
  }

  toQueryCriteria(): QueryCriteria {
    return {
      conditions: [
        {
          field: "price",
          operator: QueryOperator.GREATER_THAN,
          value: this.minPrice,
        },
      ],
    };
  }
}

// 转换规范为查询
const converter = new SpecificationConverter<Product>();
const spec = new PriceGreaterThanSpec(100);
const queryOptions = converter.convertToQuery(spec, "ProductEntity");

// 使用查询构建器（自动应用租户过滤）
const queryBuilder = new QueryBuilder(em, tenantContext);
const queryOptions = queryBuilder.buildFromSpecification(spec, "ProductEntity");

// 执行查询
const products = await em.find("ProductEntity", queryOptions.where);

// 组合规范查询
const andSpec = priceSpec.and(nameSpec); // 价格 > 100 AND 名称包含 "商品"
const orSpec = priceSpec.or(categorySpec); // 价格 > 100 OR 类别 = "电子产品"
const notSpec = priceSpec.not(); // 价格 <= 100
```

### 6. 使用事件存储

```typescript
import { MikroORMEventStore, IEventStore } from '@hl8/infrastructure-kernel';
import { DomainEvent, EntityId } from '@hl8/domain-kernel';

// 注入事件存储（实现 application-kernel 的 IEventStore 接口）
constructor(private readonly eventStore: IEventStore) {}

// 保存事件（带乐观并发控制）
async saveOrderEvents(orderId: EntityId, events: DomainEvent[]): Promise<void> {
  const currentVersion = await this.eventStore.getCurrentVersion(orderId);
  const result = await this.eventStore.saveEvents(
    orderId,
    events,
    currentVersion // 期望版本号，用于乐观并发控制
  );

  if (!result.success) {
    throw new Error(`保存事件失败: ${result.error}`);
  }
}

// 查询事件
async getOrderEvents(orderId: EntityId): Promise<DomainEvent[]> {
  return await this.eventStore.getEvents(orderId);
}

// 查询事件流（带版本范围）
async getOrderEventStream(
  orderId: EntityId,
  fromVersion?: number
): Promise<EventStream> {
  return await this.eventStore.getEventStream(orderId, fromVersion);
}

// 使用快照优化重放
async rebuildOrder(orderId: EntityId): Promise<OrderAggregate> {
  // 1. 尝试获取快照
  const snapshot = await this.eventStore.getSnapshot(orderId);
  let order: OrderAggregate;
  let fromVersion = 0;

  if (snapshot) {
    order = OrderAggregate.fromSnapshot(snapshot);
    fromVersion = snapshot.version + 1;
  } else {
    order = new OrderAggregate(orderId);
  }

  // 2. 获取快照之后的事件
  const events = await this.eventStore.getEvents(orderId, fromVersion);

  // 3. 重放事件
  for (const event of events) {
    order.applyEvent(event);
  }

  return order;
}

// 获取事件统计
const stats = await this.eventStore.getStatistics(orderId);
console.log(`聚合ID: ${stats.aggregateId}, 事件数: ${stats.eventCount}`);
```

### 7. 使用仓储工厂和 NestJS 模块

```typescript
import { Module } from "@nestjs/common";
import { InfrastructureKernelModule } from "@hl8/infrastructure-kernel";

// 配置 NestJS 模块
@Module({
  imports: [
    InfrastructureKernelModule.forRoot({
      // MikroORM 配置已由 DatabaseModule 提供
    }),
    // 或使用异步配置
    InfrastructureKernelModule.forRootAsync({
      imports: [DatabaseModule],
      useFactory: (databaseModule) => ({
        // 配置选项
      }),
      inject: [
        /* 依赖 */
      ],
    }),
  ],
})
export class AppModule {}

// 在服务中注入仓储和事务管理器
import { Injectable, Inject } from "@nestjs/common";
import { IRepository, ITenantIsolatedRepository } from "@hl8/domain-kernel";
import { RepositoryFactory, ITransactionManager } from "@hl8/infrastructure-kernel";

@Injectable()
export class ProductService {
  constructor(
    @Inject("IRepositoryFactory")
    private readonly repositoryFactory: RepositoryFactory,
    @Inject("ITransactionManager")
    private readonly transactionManager: ITransactionManager,
  ) {}

  async createProduct(productData: ProductData): Promise<Product> {
    // 使用工厂创建仓储
    const repository = this.repositoryFactory.createRepository<ProductEntity>("ProductEntity", this.em);

    const product = new ProductEntity(productData);
    await repository.save(product);
    return product;
  }

  async createTenantIsolatedProduct(productData: ProductData, context: TenantContext): Promise<Product> {
    // 创建租户隔离仓储
    const repository = this.repositoryFactory.createTenantIsolatedRepository<ProductEntity, DomainProduct>("ProductEntity", this.em);

    const product = new ProductEntity(productData);
    await repository.save(product);
    return product;
  }
}
```

### 8. 使用仓储查询缓存

```typescript
import { createCachedRepository, CacheInvalidationService } from "@hl8/infrastructure-kernel";
import { InMemoryCache, ICache, TenantContextProvider } from "@hl8/cache";
import { IRepository } from "@hl8/domain-kernel";
import { Logger } from "@hl8/logger";

// 配置缓存
const cache: ICache = new InMemoryCache({
  defaultTtl: 3600000,
  maxSize: 10000,
  enableStats: true,
  enableEventInvalidation: true,
  cleanupInterval: 60000,
  evictionStrategy: 'LRU',
}, logger);

// 租户上下文提供者
const tenantContext: TenantContextProvider = {
  getTenantId: () => 'tenant1',
};

// 创建带缓存的仓储
const cachedRepo = createCachedRepository(
  baseRepository,
  'User',
  { cache, tenantContext, logger },
  {
    enabled: true,
    defaultTtlMs: 3600000,
  }
);

// 第一次查询 - 从数据库获取
const user1 = await cachedRepo.findById(new EntityId('123')); // 查询数据库

// 第二次查询 - 从缓存获取
const user2 = await cachedRepo.findById(new EntityId('123')); // 从缓存获取，快速！

// 更新时自动失效缓存
await cachedRepo.save(user);
// 自动失效所有 User 实体缓存

// 手动失效缓存
const invalidationService = new CacheInvalidationService(cache, tenantContext, logger);

// 失效特定实体缓存
await invalidationService.invalidateEntityId('User', '123');

// 失效所有用户实体缓存
await invalidationService.invalidateEntity('User');

// 使用模式失效
await invalidationService.invalidateByPattern('tenant1:repo:User:*');
```

### 9. 使用异常转换器

```typescript
import { AggregateVersionConflictException, RepositoryConnectionException, RepositoryQueryException, RepositoryTransactionException, EntityNotFoundException } from "@hl8/domain-kernel";

// 异常转换器会自动将 MikroORM 异常转换为领域异常
// 仓储方法已自动集成异常转换器

try {
  await repository.save(entity);
} catch (error) {
  // 异常转换器已自动转换异常类型
  if (error instanceof AggregateVersionConflictException) {
    // 乐观锁冲突
    console.error("并发更新冲突，请重试");
    // 重新加载实体并重试
  } else if (error instanceof RepositoryConnectionException) {
    // 数据库连接失败
    console.error("数据库连接失败，请检查连接配置");
  } else if (error instanceof RepositoryQueryException) {
    // 查询错误
    console.error("查询执行失败", error.message);
  } else {
    // 其他异常（RepositoryOperationFailedException）
    console.error("仓储操作失败", error.message);
  }
}
```

### 10. 批量操作

```typescript
// 批量保存
async createMultipleProducts(products: ProductEntity[]): Promise<void> {
  await repository.saveMany(products);
}

// 批量删除
async deleteProducts(productIds: EntityId[]): Promise<void> {
  await repository.deleteMany(productIds);
}

// 分页查询
const result = await repository.findAllPaginated(1, 10); // 第1页，每页10条
console.log(`总数: ${result.totalCount}, 当前页: ${result.page}`);
console.log(`是否有上一页: ${result.hasPrevious}, 是否有下一页: ${result.hasNext}`);
```

### 11. 完整示例：创建订单服务

```typescript
import { Injectable, Inject } from "@nestjs/common";
import { CommandHandler } from "@nestjs/cqrs";
import { CreateOrderCommand, CommandResult } from "@hl8/application-kernel";
import { ITransactionManager, IEntityMapper, RepositoryFactory, IEventStore } from "@hl8/infrastructure-kernel";
import { ITenantIsolatedRepository, Order, OrderEntity, DomainEvent, EntityId } from "@hl8/domain-kernel";

@CommandHandler(CreateOrderCommand)
@Injectable()
export class CreateOrderHandler {
  constructor(
    @Inject("ITransactionManager")
    private readonly transactionManager: ITransactionManager,
    @Inject("OrderRepository")
    private readonly orderRepository: ITenantIsolatedRepository<OrderEntity>,
    @Inject("OrderMapper")
    private readonly orderMapper: IEntityMapper<Order, OrderEntity>,
    @Inject("IEventStore")
    private readonly eventStore: IEventStore,
  ) {}

  async handle(command: CreateOrderCommand): Promise<CommandResult> {
    if (!command.tenantContext) {
      return CommandResult.failure("MISSING_TENANT_CONTEXT", "缺少租户上下文");
    }

    // 在事务中执行
    const order = await this.transactionManager.runInTransaction(async (em) => {
      // 1. 创建领域实体
      const domainOrder = new Order(command.tenantContext!.tenantId, command.orderNumber, command.items, command.tenantContext!.organizationId);

      // 2. 转换为持久化实体
      const orderEntity = this.orderMapper.toPersistence(domainOrder);

      // 3. 保存实体
      await this.orderRepository.save(orderEntity);

      // 4. 保存领域事件
      const events = domainOrder.getDomainEvents();
      const currentVersion = await this.eventStore.getCurrentVersion(domainOrder.id);
      await this.eventStore.saveEvents(domainOrder.id, events, currentVersion);

      return domainOrder;
    });

    return CommandResult.success({
      orderId: order.id.value,
      orderNumber: order.orderNumber,
    });
  }
}
```

## 📚 核心组件

### Repositories (仓储)

- **`MikroORMRepository<T>`** - 基础仓储实现
  - ✅ 完整实现 `IRepository` 接口的所有方法
  - ✅ CRUD 操作：save, findById, findAll, delete, exists
  - ✅ 批量操作：saveMany, deleteMany
  - ✅ 分页查询：findAllPaginated（支持 hasNext, hasPrevious, totalPages）
  - ✅ 统计：count（自动过滤软删除）
  - ✅ 兼容 PostgreSQL 和 MongoDB
  - ✅ 自动处理软删除
  - ✅ 乐观锁定支持
  - ✅ 统一异常处理（自动转换异常类型）

- **`MikroORMTenantIsolatedRepository<T>`** - 租户隔离仓储
  - ✅ 正式实现 `ITenantIsolatedRepository` 接口（类型安全）
  - ✅ 继承自 MikroORMRepository
  - ✅ 自动应用租户隔离过滤
  - ✅ 支持租户、组织、部门三级隔离
  - ✅ 跨租户访问保护
  - ✅ 提供 findByIdWithContext, findAllByContext 等方法
  - ✅ 支持按租户、组织、部门查询和统计

- **`RepositoryFactory`** - 仓储工厂
  - ✅ 创建 `IRepository` 和 `ITenantIsolatedRepository` 实例
  - ✅ 实体映射器注册和管理
  - ✅ 支持 NestJS 依赖注入

### Cache (查询缓存)

- **`CachedRepository<T>`** - 缓存仓储包装
  - ✅ 包装任意 `IRepository` 提供查询缓存
  - ✅ 自动缓存 `findById` 查询结果
  - ✅ 保存时自动失效相关缓存
  - ✅ 删除时自动失效相关缓存
  - ✅ 支持租户隔离的缓存键
  - ✅ 使用标签批量失效
  - ✅ null 值不缓存，防止穿透

- **`createCachedRepository`** - 缓存仓储工厂
  - ✅ 便捷创建带缓存的仓储实例
  - ✅ 支持配置 TTL 和键前缀
  - ✅ 可选择性启用/禁用缓存

- **`CacheInvalidationService`** - 缓存失效服务
  - ✅ 按实体类型失效
  - ✅ 按实体 ID 失效
  - ✅ 按模式匹配失效
  - ✅ 支持租户粒度失效
  - ✅ 预留事件驱动失效接口

- **`RepositoryCacheConfig`** - 缓存配置
  - ✅ 使用 @hl8/config 管理
  - ✅ 支持从配置文件加载
  - ✅ 可配置 TTL、键前缀等

### Entities (持久化实体)

- **`BaseEntity`** - 基础持久化实体
  - ✅ id: UUID 主键（自动生成）
  - ✅ createdAt, updatedAt: 自动时间戳
  - ✅ version: 乐观锁定版本号（自动递增）
  - ✅ deletedAt: 软删除标记
  - ✅ 兼容 PostgreSQL 和 MongoDB

- **`TenantIsolatedPersistenceEntity`** - 租户隔离实体
  - ✅ 继承自 BaseEntity
  - ✅ tenantId: 租户标识（必需）
  - ✅ organizationId: 组织标识（可选）
  - ✅ departmentId: 部门标识（可选）
  - ✅ 自动验证层级一致性

### Mappers (实体映射器)

- **`EntityMapper<TDomain, TPersistence>`** - 实体映射器
  - ✅ 自动映射：同名同类型属性自动映射
  - ✅ 手动配置：支持自定义字段映射和转换函数
  - ✅ 嵌套聚合：支持嵌套实体和聚合根的映射
  - ✅ 批量转换：toDomainList, toPersistenceList
  - ✅ 租户字段：自动映射租户隔离字段

### Transactions (事务管理)

- **`MikroORMTransactionManager`** - 事务管理器
  - ✅ 实现 `ITransactionManager` 接口
  - ✅ 嵌套事务支持（最多5层）
  - ✅ 事务超时控制
  - ✅ 自动提交/回滚（runInTransaction）
  - ✅ 手动事务管理（begin, commit, rollback）
  - ✅ 事务隔离级别配置
  - ✅ 基于 AsyncLocalStorage 的上下文管理

### Queries (查询构建器)

- **`SpecificationConverter`** - 规范转换器
  - ✅ 实现 `ISpecificationConverter` 接口
  - ✅ 将 `ISpecification` 转换为 MikroORM 查询
  - ✅ 支持 AND、OR、NOT 组合（最多5层嵌套）
  - ✅ 支持各种查询操作符（EQUALS, GREATER_THAN, CONTAINS, IN 等）
  - ✅ 自动计算嵌套深度

- **`QueryBuilder`** - 查询构建器
  - ✅ 从规范构建查询（buildFromSpecification）
  - ✅ 从查询条件构建查询（buildFromCriteria）
  - ✅ 自动注入租户过滤条件
  - ✅ 支持排序、分页、字段选择

### Events (事件存储)

- **`MikroORMEventStore`** - 事件存储实现
  - ✅ 实现 `IEventStore` 接口（application-kernel）
  - ✅ 保存事件：saveEvents（带乐观并发控制）
  - ✅ 查询事件：getEvents, getEventStream（支持版本范围）
  - ✅ 快照管理：saveSnapshot, getSnapshot, deleteSnapshot
  - ✅ 事件统计：getStatistics
  - ✅ 支持 100,000+ 事件/聚合

- **`EventEntity`** - 事件持久化实体
  - ✅ aggregateId, eventVersion, eventType
  - ✅ data, metadata（JSON 格式）
  - ✅ eventId, timestamp
  - ✅ 索引优化（aggregateId, eventVersion, timestamp）

- **`EventSnapshotEntity`** - 快照持久化实体
  - ✅ aggregateId, snapshotVersion
  - ✅ data, snapshotType
  - ✅ 唯一约束（aggregateId, snapshotVersion）

### Exceptions (异常处理)

- **`ExceptionConverter`** - 异常转换器
  - ✅ 实现 `IExceptionConverter` 接口
  - ✅ 自动识别异常类型（乐观锁、连接失败、查询错误、事务错误）
  - ✅ 统一转换为 domain-kernel 异常类型
  - ✅ 异常映射：
    - OptimisticLockError → AggregateVersionConflictException
    - 连接失败 → RepositoryConnectionException
    - 查询错误 → RepositoryQueryException
    - 事务错误 → RepositoryTransactionException
    - 实体未找到 → EntityNotFoundException
    - 其他 → RepositoryOperationFailedException

### Filters (过滤器)

- **`TenantFilter`** - 租户过滤器
  - ✅ 支持租户、组织、部门多层级过滤
  - ✅ 可配置过滤条件
  - ✅ 与 TenantContext 集成
  - ✅ enableTenantFilter, buildTenantFilterOptions

### Modules (NestJS 模块)

- **`InfrastructureKernelModule`** - NestJS 模块
  - ✅ 同步配置：forRoot
  - ✅ 异步配置：forRootAsync
  - ✅ 自动注册：RepositoryFactory, TransactionManager
  - ✅ 依赖注入支持
  - ✅ 全局模块（@Global）

## 🔍 特性详解

### 数据库兼容性

本模块完全兼容 PostgreSQL 和 MongoDB，通过 MikroORM 提供统一的 API：

- **PostgreSQL**: 使用原生 SQL，支持事务
- **MongoDB**: 使用 MongoDB 驱动，支持文档操作
- **无缝切换**: 相同的代码可以在两种数据库间切换

### 租户隔离

多层级租户隔离确保数据安全：

1. **租户级** - 基础隔离层，所有实体必须属于某个租户
2. **组织级** - 在租户内进一步隔离到组织
3. **部门级** - 在组织内隔离到部门

每层隔离都有权限验证，防止跨级访问。

### 软删除

支持软删除，数据不会被物理删除：

```typescript
const entity = await repository.findById(id);
// 软删除，deletedAt 会自动设置
await repository.delete(id);

// 查询时默认排除软删除的实体
const all = await repository.findAll(); // 不包含已删除的

// 如需包含已删除的实体，需要在仓储实现中特殊处理
```

### 乐观锁定

自动处理并发更新冲突，异常转换器会自动转换异常类型：

```typescript
try {
  await repository.save(entity);
} catch (error) {
  // 异常转换器自动将 OptimisticLockError 转换为 AggregateVersionConflictException
  if (error instanceof AggregateVersionConflictException) {
    // 处理版本冲突
    console.error("并发更新冲突，请重试");
    // 重新加载实体并重试
  }
}
```

### 异常处理

所有仓储操作都自动使用异常转换器，统一转换异常类型：

```typescript
try {
  await repository.save(entity);
  const entities = await repository.findAllPaginated(1, 10);
} catch (error) {
  // 异常已自动转换为 domain-kernel 异常类型
  if (error instanceof AggregateVersionConflictException) {
    // 乐观锁冲突
  } else if (error instanceof RepositoryConnectionException) {
    // 数据库连接失败
  } else if (error instanceof RepositoryQueryException) {
    // 查询错误
  } else if (error instanceof RepositoryTransactionException) {
    // 事务错误
  } else if (error instanceof EntityNotFoundException) {
    // 实体未找到
  }
}
```

## 🧪 测试

### 运行测试

```bash
# 运行所有测试
pnpm test

# 运行单元测试
pnpm test src

# 运行集成测试
pnpm test test/integration

# 代码覆盖率
pnpm test:cov

# Watch 模式
pnpm test:watch
```

### 测试覆盖

- **单元测试**: 所有核心组件都有单元测试
- **集成测试**: 使用 TestContainers 测试真实数据库
- **覆盖率**: 核心功能 >= 80% 代码覆盖率

## 🔧 配置

### NestJS 模块配置

```typescript
import { Module } from "@nestjs/common";
import { InfrastructureKernelModule } from "@hl8/infrastructure-kernel";
import { DatabaseModule } from "@hl8/database";

@Module({
  imports: [
    DatabaseModule, // 提供 EntityManager 和 MikroORM 实例
    InfrastructureKernelModule.forRoot({
      // 可选：如果 DatabaseModule 未提供 MikroORM，可在此配置
    }),
    // 或使用异步配置
    InfrastructureKernelModule.forRootAsync({
      imports: [DatabaseModule],
      useFactory: (databaseConfig) => ({
        // 配置选项
      }),
      inject: [
        /* 依赖 */
      ],
    }),
  ],
})
export class AppModule {}
```

### MikroORM 配置示例

```typescript
import { MikroORM } from "@mikro-orm/core";
import { PostgreSqlDriver } from "@mikro-orm/postgresql";
import { BaseEntity, TenantIsolatedPersistenceEntity, EventEntity, EventSnapshotEntity } from "@hl8/infrastructure-kernel";

const orm = await MikroORM.init({
  driver: PostgreSqlDriver,
  dbName: "hl8_saas",
  entities: [
    BaseEntity,
    TenantIsolatedPersistenceEntity,
    EventEntity, // 事件存储实体
    EventSnapshotEntity, // 快照实体
    /* 你的业务实体 */
    ,
  ],
  debug: process.env.NODE_ENV === "development",
});
```

### 事件存储表迁移

使用 SQL 迁移脚本创建事件存储表：

```sql
-- 运行迁移脚本
psql -d hl8_saas -f migrations/create-event-store-tables.sql
```

或使用 MikroORM 迁移：

```bash
# 创建迁移
pnpm migration:create

# 运行迁移
pnpm migration:up
```

## 📊 性能

- **连接池**: 基于 @hl8/database 的连接池管理
- **查询缓存**: 使用 @hl8/cache 提供自动查询缓存
- **索引**:
  - 自动为 tenantId, organizationId, departmentId 创建索引
  - 事件存储表为 aggregateId, eventVersion, timestamp 创建索引
- **查询优化**:
  - 使用条件构建器避免 N+1 查询
  - 规范模式查询自动优化
  - 分页查询性能优化（使用 findAndCount）
  - 缓存加速重复查询（CachedRepository）
- **批量操作**:
  - saveMany: 批量保存，单事务执行
  - deleteMany: 批量删除，单事务执行
- **性能指标**:
  - ✅ 查询响应时间 < 100ms（10万条记录内）
  - ✅ 事件存储支持 100,000+ 事件/聚合
  - ✅ 嵌套事务最多5层，防止性能问题
  - ✅ 缓存命中率 > 70%（典型场景）

## 🔗 与 domain-kernel 和 application-kernel 集成

### 三个 Kernel 的完整集成示例

```typescript
import { Module } from "@nestjs/common";
import { InfrastructureKernelModule } from "@hl8/infrastructure-kernel";
import { ApplicationKernelModule } from "@hl8/application-kernel";
// domain-kernel 作为依赖，无需单独配置模块

@Module({
  imports: [
    InfrastructureKernelModule.forRoot(),
    ApplicationKernelModule.forRoot({
      eventStore: "IEventStore", // 使用 infrastructure-kernel 的 EventStore
      transactionManager: "ITransactionManager", // 使用 infrastructure-kernel 的 TransactionManager
    }),
  ],
  providers: [
    // 命令处理器会自动使用 infrastructure-kernel 的仓储和事务管理器
  ],
})
export class AppModule {}
```

### 在 Command Handler 中使用

```typescript
import { CommandHandler } from "@nestjs/cqrs";
import { ITenantIsolatedRepository } from "@hl8/domain-kernel";
import { ITransactionManager, IEventStore } from "@hl8/infrastructure-kernel";
import { ICommandHandler } from "@hl8/application-kernel";

@CommandHandler(CreateProductCommand)
export class CreateProductHandler implements ICommandHandler<CreateProductCommand> {
  constructor(
    @Inject("ProductRepository")
    private readonly repository: ITenantIsolatedRepository<ProductEntity>,
    @Inject("ITransactionManager")
    private readonly transactionManager: ITransactionManager,
    @Inject("IEventStore")
    private readonly eventStore: IEventStore,
  ) {}

  async execute(command: CreateProductCommand): Promise<void> {
    // 三个 kernel 无缝集成
    await this.transactionManager.runInTransaction(async (em) => {
      // 1. 使用 domain-kernel 的实体和值对象
      const product = new Product(/* ... */);

      // 2. 使用 infrastructure-kernel 的仓储保存
      const entity = mapper.toPersistence(product);
      await this.repository.save(entity);

      // 3. 使用 infrastructure-kernel 的事件存储保存领域事件
      const events = product.getDomainEvents();
      await this.eventStore.saveEvents(product.id, events, product.version);
    });
  }
}
```

## 🎯 最佳实践

1. **始终使用接口类型**: 使用 `IRepository` 和 `ITenantIsolatedRepository` 接口，而不是具体实现类
2. **使用事务管理器**: 对于多步骤操作，使用 `runInTransaction` 确保原子性
3. **使用实体映射器**: 在领域层和基础设施层之间进行实体转换
4. **异常处理**: 捕获 domain-kernel 异常类型，利用异常转换器的自动转换
5. **规范模式查询**: 使用规范模式封装业务查询逻辑，而不是直接写 SQL
6. **事件存储**: 使用快照优化大量事件的重放性能
7. **租户隔离**: 始终使用带 Context 的查询方法，确保数据隔离
8. **批量操作**: 对于大量数据操作，使用 saveMany/deleteMany 提高性能
9. **分页查询**: 使用 findAllPaginated 而不是手动实现分页逻辑
10. **查询缓存**: 使用 CachedRepository 加速重复查询，注意失效策略

## 🤝 贡献

欢迎贡献！请遵循：

1. Fork 项目
2. 创建特性分支（从 `005-infrastructure-kernel-enhancement`）
3. 添加测试（单元测试 + 集成测试）
4. 确保所有测试通过（`pnpm test`）
5. 确保类型检查通过（`pnpm type-check`）
6. 确保代码格式正确（`pnpm lint`）
7. 提交 Pull Request

## 📄 许可证

MIT

## 📚 文档索引

完整的文档集合：

| 文档                                 | 说明                     |
| ------------------------------------ | ------------------------ |
| [快速入门指南](./QUICKSTART.md)      | 快速上手使用基础设施内核 |
| [故障排除指南](./TROUBLESHOOTING.md) | 常见问题解决方案         |

## 📞 支持

- 📖 **快速开始**: 查看 [快速入门指南](./QUICKSTART.md)
- 📖 **完整文档**: 查看 `specs/005-infrastructure-kernel-enhancement/` 目录
  - `spec.md` - 功能规格说明
  - `quickstart.md` - 快速入门指南
  - `data-model.md` - 数据模型设计
  - `contracts/` - API 契约定义
- 🐛 **问题报告**: [Issues](../../issues)
- 💬 **讨论**: [Discussions](../../discussions)
- 📚 **参考**:
  - [domain-kernel](../../kernel/domain-kernel) - 领域层核心模块
  - [application-kernel](../../kernel/application-kernel) - 应用层核心模块
  - [cache](../../infra/cache) - 统一缓存库
