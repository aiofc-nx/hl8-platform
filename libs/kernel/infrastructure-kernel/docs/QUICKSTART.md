# Infrastructure Kernel 快速入门指南

**版本**: 1.0.0  
**更新日期**: 2024-12-19

本指南将帮助您快速掌握 `@hl8/infrastructure-kernel` 的使用，通过完整的示例演示如何构建符合 Clean Architecture 的数据持久化层代码。

---

## 📋 目录

1. [概述](#概述)
2. [安装和配置](#安装和配置)
3. [核心概念](#核心概念)
4. [仓储（Repositories）](#仓储repositories)
5. [事务管理](#事务管理)
6. [实体映射](#实体映射)
7. [查询缓存](#查询缓存)
8. [事件存储](#事件存储)
9. [完整示例](#完整示例)

---

## 概述

`@hl8/infrastructure-kernel` 提供了基础设施层的核心能力，帮助您：

- ✅ **统一ORM**: 使用 MikroORM 统一 PostgreSQL 和 MongoDB
- ✅ **标准仓储**: 实现 IRepository 和 ITenantIsolatedRepository
- ✅ **租户隔离**: 自动应用租户、组织、部门三级过滤
- ✅ **查询缓存**: 集成 @hl8/cache 提供自动缓存
- ✅ **事件存储**: 完整支持事件溯源
- ✅ **事务管理**: 嵌套事务、超时控制、自动回滚

---

## 安装和配置

### 安装依赖

```bash
pnpm add @hl8/infrastructure-kernel @hl8/domain-kernel @hl8/config @hl8/logger @hl8/cache @hl8/database
```

### 配置 NestJS 模块

```typescript
import { Module } from "@nestjs/common";
import { InfrastructureKernelModule } from "@hl8/infrastructure-kernel";
import { DatabaseModule } from "@hl8/database";

@Module({
  imports: [
    DatabaseModule.forRoot({
      postgresql: {
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT || "5432"),
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
      },
    }),
    InfrastructureKernelModule.forRoot(),
  ],
})
export class AppModule {}
```

---

## 核心概念

### 持久化实体 (Persistence Entity)

持久化实体是映射到数据库表的类，继承自 `BaseEntity` 或 `TenantIsolatedPersistenceEntity`：

```typescript
import { BaseEntity } from "@hl8/infrastructure-kernel";
import { Entity, Property } from "@mikro-orm/core";

@Entity({ tableName: "products" })
export class ProductEntity extends BaseEntity {
  @Property()
  name!: string;

  @Property({ type: "decimal" })
  price!: number;

  @Property()
  description!: string;
}
```

### 租户隔离实体

对于需要多租户支持的数据，继承 `TenantIsolatedPersistenceEntity`：

```typescript
import { TenantIsolatedPersistenceEntity } from "@hl8/infrastructure-kernel";
import { Entity, Property } from "@mikro-orm/core";

@Entity({ tableName: "orders" })
export class OrderEntity extends TenantIsolatedPersistenceEntity {
  @Property()
  orderNumber!: string;

  @Property({ type: "json" })
  items!: OrderItem[];
}
```

### 仓储接口

仓储是数据访问的抽象层，提供 CRUD 操作：

- `IRepository<T>`: 基础仓储接口
- `ITenantIsolatedRepository<T>`: 租户隔离仓储接口

---

## 仓储（Repositories）

### 基础仓储

基础仓储实现标准 CRUD 操作：

```typescript
import { MikroORMRepository } from "@hl8/infrastructure-kernel";
import { EntityManager } from "@mikro-orm/core";

const repository = new MikroORMRepository<ProductEntity>(em, "ProductEntity");

// 创建
const product = new ProductEntity();
product.name = "Product A";
product.price = 99.99;
await repository.save(product);

// 查询
const found = await repository.findById(new EntityId(product.id));

// 批量查询
const all = await repository.findAll();
const paginated = await repository.findAllPaginated(1, 10);

// 删除
await repository.delete(new EntityId(product.id));
```

### 租户隔离仓储

租户隔离仓储自动应用租户过滤：

```typescript
import { MikroORMTenantIsolatedRepository } from "@hl8/infrastructure-kernel";
import { TenantContext, TenantId } from "@hl8/domain-kernel";

const repository = new MikroORMTenantIsolatedRepository<OrderEntity>(
  em,
  "OrderEntity"
);

const tenantId = new TenantId("tenant-123");
const context = new TenantContext(tenantId);

// 自动应用租户过滤
const orders = await repository.findAllByContext(context);

// 按组织过滤
const orgId = new OrganizationId(tenantId, "org-456");
const orgOrders = await repository.findByOrganization(orgId, context);

// 统计
const count = await repository.countByTenant(tenantId, context);
```

### 仓储工厂

使用工厂创建仓储，支持依赖注入：

```typescript
import { RepositoryFactory } from "@hl8/infrastructure-kernel";

@Injectable()
export class ProductService {
  constructor(
    @Inject("IRepositoryFactory")
    private readonly factory: RepositoryFactory
  ) {}

  async saveProduct(product: ProductEntity): Promise<void> {
    const repository = this.factory.createRepository<ProductEntity>(
      "ProductEntity",
      this.em
    );
    await repository.save(product);
  }
}
```

---

## 事务管理

使用事务管理器确保数据一致性：

```typescript
import { ITransactionManager } from "@hl8/infrastructure-kernel";

@Injectable()
export class OrderService {
  constructor(
    @Inject("ITransactionManager")
    private readonly transactionManager: ITransactionManager
  ) {}

  // 推荐：自动管理事务
  async createOrder(data: OrderData): Promise<Order> {
    return this.transactionManager.runInTransaction(async (em) => {
      const order = new OrderEntity(data);
      em.persist(order);

      for (const item of data.items) {
        const orderItem = new OrderItemEntity(item);
        em.persist(orderItem);
      }

      await em.flush();
      return order;
    });
  }

  // 手动管理事务
  async createOrderManually(data: OrderData): Promise<Order> {
    const context = await this.transactionManager.begin({
      timeout: 30000,
    });

    try {
      const order = new OrderEntity(data);
      context.entityManager.persist(order);
      await context.entityManager.flush();

      await this.transactionManager.commit(context);
      return order;
    } catch (error) {
      await this.transactionManager.rollback(context);
      throw error;
    }
  }
}
```

---

## 实体映射

在领域实体和持久化实体之间转换：

```typescript
import { EntityMapper, MappingConfig } from "@hl8/infrastructure-kernel";

const config: MappingConfig<DomainProduct, ProductEntity> = {
  autoMap: true,
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

const mapper = new EntityMapper<DomainProduct, ProductEntity>(config);

// 领域 → 持久化
const persistenceProduct = mapper.toPersistence(domainProduct);

// 持久化 → 领域
const domainProduct = mapper.toDomain(persistenceProduct);

// 批量转换
const domainProducts = mapper.toDomainList(entities);
```

---

## 查询缓存

使用缓存仓储加速查询：

```typescript
import { createCachedRepository, ICache } from "@hl8/infrastructure-kernel";

@Injectable()
export class UserService {
  private cachedRepo: IRepository<UserEntity>;

  constructor(
    private readonly cache: ICache,
    private readonly userRepo: IRepository<UserEntity>
  ) {
    this.cachedRepo = createCachedRepository(
      userRepo,
      "UserEntity",
      {
        cache,
        tenantContext: { getTenantId: () => "tenant-1" },
        logger,
      },
      {
        enabled: true,
        defaultTtlMs: 3600000,
      }
    );
  }

  async getUser(id: string): Promise<UserEntity | null> {
    // 第一次查询数据库，后续从缓存获取
    return this.cachedRepo.findById(new EntityId(id));
  }

  async updateUser(user: UserEntity): Promise<void> {
    // 更新时自动失效缓存
    await this.cachedRepo.save(user);
  }
}
```

---

## 事件存储

保存和查询领域事件：

```typescript
import { IEventStore } from "@hl8/infrastructure-kernel";

@Injectable()
export class OrderEventService {
  constructor(@Inject("IEventStore") private readonly eventStore: IEventStore) {}

  async saveEvents(orderId: EntityId, events: DomainEvent[]): Promise<void> {
    const version = await this.eventStore.getCurrentVersion(orderId);
    const result = await this.eventStore.saveEvents(orderId, events, version);

    if (!result.success) {
      throw new Error(`保存事件失败: ${result.error}`);
    }
  }

  async getEvents(orderId: EntityId): Promise<DomainEvent[]> {
    return await this.eventStore.getEvents(orderId);
  }

  async rebuildOrder(orderId: EntityId): Promise<OrderAggregate> {
    // 尝试获取快照
    const snapshot = await this.eventStore.getSnapshot(orderId);
    let order: OrderAggregate;
    let fromVersion = 0;

    if (snapshot) {
      order = OrderAggregate.fromSnapshot(snapshot);
      fromVersion = snapshot.version + 1;
    } else {
      order = new OrderAggregate(orderId);
    }

    // 获取并重放事件
    const events = await this.eventStore.getEvents(orderId, fromVersion);
    for (const event of events) {
      order.applyEvent(event);
    }

    return order;
  }
}
```

---

## 完整示例

### 订单创建服务

```typescript
import { Injectable, Inject } from "@nestjs/common";
import { CommandHandler } from "@nestjs/cqrs";
import { ITransactionManager, IEventStore } from "@hl8/infrastructure-kernel";
import { CreateOrderCommand, CommandResult } from "@hl8/application-kernel";
import { ITenantIsolatedRepository, EntityId } from "@hl8/domain-kernel";

@CommandHandler(CreateOrderCommand)
@Injectable()
export class CreateOrderHandler {
  constructor(
    @Inject("ITransactionManager")
    private readonly transactionManager: ITransactionManager,
    @Inject("OrderRepository")
    private readonly orderRepo: ITenantIsolatedRepository<OrderEntity>,
    @Inject("IEventStore")
    private readonly eventStore: IEventStore
  ) {}

  async handle(command: CreateOrderCommand): Promise<CommandResult> {
    if (!command.tenantContext) {
      return CommandResult.failure("MISSING_TENANT_CONTEXT");
    }

    const order = await this.transactionManager.runInTransaction(async (em) => {
      // 1. 创建领域实体
      const domainOrder = new Order(
        command.tenantContext!.tenantId,
        command.orderNumber,
        command.items
      );

      // 2. 转换为持久化实体
      const orderEntity = this.mapper.toPersistence(domainOrder);

      // 3. 保存实体
      await this.orderRepo.save(orderEntity);

      // 4. 保存事件
      const events = domainOrder.getDomainEvents();
      const version = await this.eventStore.getCurrentVersion(domainOrder.id);
      await this.eventStore.saveEvents(domainOrder.id, events, version);

      return domainOrder;
    });

    return CommandResult.success({
      orderId: order.id.value,
    });
  }
}
```

---

## 下一步

- 📖 查看 [完整文档](./README.md) 了解更多功能
- 🔧 了解 [配置说明](#配置)
- 🧪 参考 [测试示例](../../test/)
- 📚 阅读 [API 参考](./API.md)

