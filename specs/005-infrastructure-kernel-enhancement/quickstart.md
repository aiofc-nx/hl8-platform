# Quick Start: Infrastructure Kernel Enhancement

**Feature**: Infrastructure Kernel Enhancement and Alignment  
**Date**: 2025-01-22

## 概述

本文档提供 infrastructure-kernel 增强功能的快速入门指南，包括：正式实现 ITenantIsolatedRepository 接口、实体映射器使用、事务管理、规范模式查询、事件存储、仓储工厂等核心功能的使用示例。

---

## 1. 使用正式实现的 ITenantIsolatedRepository 接口

### 基础用法

```typescript
import { MikroORMTenantIsolatedRepository, TenantIsolatedPersistenceEntity } from "@hl8/infrastructure-kernel";
import { ITenantIsolatedRepository, TenantContext, TenantId, OrganizationId, EntityId } from "@hl8/domain-kernel";
import { EntityManager, Entity, Property } from "@mikro-orm/core";

// 定义持久化实体
@Entity({ tableName: "products", collection: "products" })
class ProductEntity extends TenantIsolatedPersistenceEntity {
  @Property()
  name!: string;

  @Property({ type: "decimal" })
  price!: number;
}

// 类型安全：可以赋值给接口类型
const repository: ITenantIsolatedRepository<ProductEntity> = new MikroORMTenantIsolatedRepository<ProductEntity>(em, "ProductEntity");

// 创建租户上下文
const tenantId = TenantId.generate();
const orgId = new OrganizationId(tenantId);
const context = new TenantContext(tenantId, { organizationId: orgId });

// 使用接口方法（自动应用租户隔离）
const product = await repository.findByIdWithContext(productId, context);
const products = await repository.findAllByContext(context);
const count = await repository.countByTenant(tenantId, context);
```

### 在 NestJS 中注入使用

```typescript
import { Injectable } from "@nestjs/common";
import { CommandHandler } from "@nestjs/cqrs";
import { ITenantIsolatedRepository } from "@hl8/domain-kernel";
import { ProductEntity } from "./product.entity";

@CommandHandler(CreateProductCommand)
class CreateProductHandler {
  constructor(
    @Inject("PRODUCT_REPOSITORY")
    private readonly repository: ITenantIsolatedRepository<ProductEntity>,
  ) {}

  async handle(command: CreateProductCommand): Promise<CommandResult> {
    // 租户上下文已由中间件自动注入
    if (!command.tenantContext) {
      return CommandResult.failure("MISSING_TENANT_CONTEXT", "缺少租户上下文");
    }

    // 使用接口方法（类型安全）
    const product = new ProductEntity(/* ... */);
    await this.repository.save(product);

    return CommandResult.success({ productId: product.id });
  }
}
```

---

## 2. 使用实体映射器（自动映射 + 手动配置）

### 基础映射（自动映射）

```typescript
import { EntityMapper } from "@hl8/infrastructure-kernel";
import { Product, TenantId } from "@hl8/domain-kernel";
import { ProductEntity } from "./product.entity";

// 创建映射器（自动映射同名同类型属性）
const mapper = new EntityMapper<Product, ProductEntity>({
  autoMap: true, // 启用自动映射
});

// 领域实体 → 持久化实体
const domainProduct = new Product(tenantId, "商品名称", 100.0, organizationId);
const persistenceProduct = mapper.toPersistence(domainProduct);

// 持久化实体 → 领域实体
const retrievedEntity = await repository.findById(productId);
const domainProduct = mapper.toDomain(retrievedEntity);
```

### 复杂映射（手动配置）

```typescript
import { EntityMapper, MappingConfig } from "@hl8/infrastructure-kernel";

// 配置嵌套聚合映射
const mapper = new EntityMapper<Order, OrderEntity>({
  autoMap: true,
  customMappings: new Map([
    [
      "orderItems",
      {
        sourcePath: "orderItems",
        targetPath: "items",
        collection: true,
        entityMapper: "OrderItemMapper", // 使用专门的映射器
      },
    ],
    [
      "totalAmount",
      {
        sourcePath: "totalAmount.value",
        targetPath: "total",
        transform: (value: Money) => value.amount, // 自定义转换
      },
    ],
  ]),
  nestedAggregates: [
    {
      aggregatePath: "orderItems",
      entityMapper: orderItemMapper,
      collection: true,
    },
  ],
});

// 使用映射器
const orderEntity = mapper.toPersistence(orderDomain);
await repository.save(orderEntity);
```

---

## 3. 使用事务管理器

### 基本事务操作

```typescript
import { ITransactionManager } from "@hl8/infrastructure-kernel";

// 注入事务管理器
constructor(private readonly transactionManager: ITransactionManager) {}

// 方式1：使用 runInTransaction（推荐）
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
  const context = await this.transactionManager.begin();
  try {
    // 执行操作
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
```

### 嵌套事务

```typescript
async complexOperation(): Promise<void> {
  // 外层事务
  await this.transactionManager.runInTransaction(async (em) => {
    // 内层事务（复用外层事务的 EntityManager）
    await this.transactionManager.runInTransaction(async (innerEm) => {
      // 嵌套事务操作（最多5层）
      const entity = new Entity();
      innerEm.persist(entity);
      await innerEm.flush();
    });

    // 继续外层事务操作
    const anotherEntity = new Entity();
    em.persist(anotherEntity);
    await em.flush();
  });
}
```

---

## 4. 使用规范模式查询

### 简单规范查询

```typescript
import { QueryBuilder, SpecificationConverter } from "@hl8/infrastructure-kernel";
import { ISpecification } from "@hl8/domain-kernel";

// 定义业务规范
class PriceGreaterThanSpec implements ISpecification<Product> {
  constructor(private readonly minPrice: number) {}

  isSatisfiedBy(product: Product): boolean {
    return product.price > this.minPrice;
  }

  // 其他方法...
}

// 转换规范为查询
const converter = new SpecificationConverter<Product>();
const spec = new PriceGreaterThanSpec(100);
const queryCriteria = converter.convertToQuery(spec);

// 执行查询（自动应用租户过滤）
const products = await repository.findByQuery(queryCriteria);
```

### 组合规范查询

```typescript
// AND 组合
const andSpec = priceSpec.and(nameSpec); // 价格 > 100 AND 名称包含 "商品"
const andQuery = converter.convertToQuery(andSpec);

// OR 组合
const orSpec = priceSpec.or(categorySpec); // 价格 > 100 OR 类别 = "电子产品"
const orQuery = converter.convertToQuery(orSpec);

// NOT 组合
const notSpec = priceSpec.not(); // 价格 <= 100
const notQuery = converter.convertToQuery(notSpec);

// 复杂嵌套（最多5层）
const complexSpec = spec1.and(spec2).or(spec3.not());
const complexQuery = converter.convertToQuery(complexSpec);
```

### 在租户隔离仓储中使用规范

```typescript
// 规范查询自动应用租户过滤
const tenantContext = new TenantContext(tenantId);
const spec = new ProductSpecification(/* ... */);

// 查询构建器自动注入租户过滤条件
const queryBuilder = new QueryBuilder<ProductEntity>(em, tenantContext);
const query = queryBuilder.fromSpecification(spec);
const products = await query.getResults();
```

---

## 5. 使用事件存储（IEventStore 实现）

### 保存和查询事件

```typescript
import { IEventStore, MikroORMEventStore } from "@hl8/infrastructure-kernel";
import { DomainEvent, EntityId } from "@hl8/domain-kernel";

// 注入事件存储（实现 application-kernel 的 IEventStore 接口）
constructor(private readonly eventStore: IEventStore) {}

// 保存事件
async saveOrderEvents(orderId: EntityId, events: DomainEvent[]): Promise<void> {
  const currentVersion = await this.eventStore.getCurrentVersion(orderId);
  const result = await this.eventStore.saveEvents(
    orderId,
    events,
    currentVersion
  );

  if (!result.success) {
    throw new Error(`保存事件失败: ${result.error}`);
  }
}

// 查询事件
async getOrderEvents(orderId: EntityId): Promise<DomainEvent[]> {
  return await this.eventStore.getEvents(orderId);
}

// 查询事件流
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
```

---

## 6. 使用仓储工厂和 NestJS 依赖注入

### 配置模块

```typescript
import { Module } from "@nestjs/common";
import { InfrastructureKernelModule } from "@hl8/infrastructure-kernel";

@Module({
  imports: [
    InfrastructureKernelModule.forRoot({
      mikroOrmConfig: {
        // MikroORM 配置
      },
      enableRepositoryFactory: true,
      enableEventStore: true,
      enableTransactionManager: true,
    }),
  ],
})
export class AppModule {}
```

### 在服务中注入仓储

```typescript
import { Injectable, Inject } from "@nestjs/common";
import { IRepository, ITenantIsolatedRepository } from "@hl8/domain-kernel";
import { RepositoryFactory } from "@hl8/infrastructure-kernel";

@Injectable()
export class ProductService {
  constructor(
    @Inject("RepositoryFactory")
    private readonly factory: RepositoryFactory,
    @Inject("EntityManager")
    private readonly em: EntityManager,
  ) {}

  async createProduct(productData: ProductData): Promise<Product> {
    // 使用工厂创建仓储
    const repository = this.factory.createRepository<ProductEntity>("ProductEntity", this.em);

    const product = new ProductEntity(productData);
    await repository.save(product);
    return product;
  }
}
```

### 自动注册仓储提供者

```typescript
// InfrastructureKernelModule 自动注册常用仓储
@Module({
  imports: [InfrastructureKernelModule.forRoot()],
  providers: [
    // 自动注册：RepositoryFactory, TransactionManager, EventStore 等
  ],
})
export class AppModule {}

// 在服务中直接注入
@Injectable()
export class OrderService {
  constructor(
    private readonly repositoryFactory: RepositoryFactory,
    private readonly transactionManager: ITransactionManager,
    private readonly eventStore: IEventStore,
  ) {}
}
```

---

## 7. 批量操作

### 批量保存和删除

```typescript
// 批量保存
async createMultipleProducts(
  products: ProductEntity[]
): Promise<void> {
  await repository.saveMany(products);
}

// 批量删除
async deleteProducts(productIds: EntityId[]): Promise<void> {
  await repository.deleteMany(productIds);
}

// 在事务中批量操作
async bulkOperation(products: ProductEntity[], idsToDelete: EntityId[]): Promise<void> {
  await this.transactionManager.runInTransaction(async (em) => {
    const repo = new MikroORMRepository<ProductEntity>(em, "ProductEntity");
    await repo.saveMany(products);
    await repo.deleteMany(idsToDelete);
  });
}
```

---

## 8. 完整示例：创建订单服务

```typescript
import { Injectable, Inject } from "@nestjs/common";
import { CommandHandler } from "@nestjs/cqrs";
import { CreateOrderCommand, CommandResult } from "@hl8/application-kernel";
import { ITransactionManager, IEntityMapper, RepositoryFactory } from "@hl8/infrastructure-kernel";
import { ITenantIsolatedRepository, Order, OrderEntity } from "@hl8/domain-kernel";

@CommandHandler(CreateOrderCommand)
@Injectable()
export class CreateOrderHandler {
  constructor(
    @Inject("TransactionManager")
    private readonly transactionManager: ITransactionManager,
    @Inject("OrderRepository")
    private readonly orderRepository: ITenantIsolatedRepository<OrderEntity>,
    @Inject("OrderMapper")
    private readonly orderMapper: IEntityMapper<Order, OrderEntity>,
    @Inject("EventStore")
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
      await this.eventStore.saveEvents(domainOrder.id, events, domainOrder.version);

      return domainOrder;
    });

    return CommandResult.success({
      orderId: order.id.value,
      orderNumber: order.orderNumber,
    });
  }
}
```

---

## 9. 错误处理示例

```typescript
import { RepositoryException, OptimisticLockException, BusinessException } from "@hl8/domain-kernel";

try {
  await repository.save(entity);
} catch (error) {
  if (error instanceof OptimisticLockException) {
    // 处理乐观锁冲突
    console.error("并发更新冲突，请重试");
    // 重新加载实体并重试
  } else if (error instanceof BusinessException) {
    // 处理业务异常
    console.error(`业务错误: ${error.message}`);
  } else if (error instanceof RepositoryException) {
    // 处理仓储异常
    console.error(`仓储操作失败: ${error.message}`);
    // 记录日志、重试等
  } else {
    // 未知异常
    throw error;
  }
}
```

---

## 10. 测试示例

### 单元测试

```typescript
import { describe, it, expect, beforeEach } from "@jest/globals";
import { MikroORMRepository } from "@hl8/infrastructure-kernel";

describe("MikroORMRepository", () => {
  let repository: MikroORMRepository<TestEntity>;
  let em: EntityManager;

  beforeEach(() => {
    em = createTestEntityManager();
    repository = new MikroORMRepository<TestEntity>(em, "TestEntity");
  });

  it("应该实现 IRepository 接口", async () => {
    const entity = new TestEntity();
    await repository.save(entity);

    const found = await repository.findById(entity.id);
    expect(found).not.toBeNull();
  });
});
```

### 集成测试

```typescript
import { test, describe } from "@jest/globals";
import { MikroORM } from "@mikro-orm/core";
import { MikroORMTenantIsolatedRepository } from "@hl8/infrastructure-kernel";

describe("租户隔离仓储集成测试", () => {
  let orm: MikroORM;
  let repository: MikroORMTenantIsolatedRepository<ProductEntity>;

  beforeAll(async () => {
    orm = await MikroORM.init(/* 测试配置 */);
  });

  it("应该正确应用租户隔离", async () => {
    const tenant1 = TenantId.generate();
    const tenant2 = TenantId.generate();
    const context1 = new TenantContext(tenant1);

    // 创建不同租户的数据
    // ...

    // 查询时自动过滤，只返回 tenant1 的数据
    const products = await repository.findAllByContext(context1);
    expect(products.every((p) => p.tenantId === tenant1.value)).toBe(true);
  });
});
```

---

## 常见问题

### Q: 如何处理类型约束冲突？

A: 使用实体映射器在接口边界进行类型转换。领域实体和持久化实体通过映射器转换，接口使用领域实体类型。

### Q: 如何确保租户隔离 100% 准确？

A: 始终使用 `findByIdWithContext`、`findAllByContext` 等方法，这些方法自动应用租户过滤。不要直接使用 `findById`。

### Q: 规范模式查询性能如何？

A: 限制嵌套深度 ≤ 5 层，自动应用数据库索引优化查询。对于复杂查询，考虑使用数据库视图或读模型。

### Q: 事件存储支持多大的数据量？

A: 支持 100,000+ 事件/聚合，查询性能 < 100ms（10万条记录内）。对于更大数据量，使用快照机制优化。

---

## 下一步

- 查看 [data-model.md](./data-model.md) 了解详细的数据模型设计
- 查看 [contracts/](./contracts/) 了解接口契约定义
- 查看 [research.md](./research.md) 了解技术决策和实现策略
