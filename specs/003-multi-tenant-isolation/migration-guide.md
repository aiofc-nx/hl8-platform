# 多租户隔离迁移指南

本文档提供将现有系统迁移到多租户和多层级数据隔离架构的详细指南。

## 📋 目录

1. [迁移概述](#迁移概述)
2. [代码迁移步骤](#代码迁移步骤)
3. [数据迁移步骤](#数据迁移步骤)
4. [迁移检查清单](#迁移检查清单)
5. [常见问题](#常见问题)

---

## 迁移概述

### 迁移目标

将现有系统迁移到支持多租户和多层级（租户 → 组织 → 部门）数据隔离的架构，确保：
- 数据完全隔离：不同租户的数据严格分离
- 向后兼容：现有功能不受影响
- 平滑迁移：支持逐步迁移，不影响现有业务

### 迁移原则

1. **向后兼容**：保持现有 `Entity` 和 `AggregateRoot` 基类不变
2. **逐步迁移**：可以按模块逐步迁移，不需要一次性完成
3. **数据安全**：迁移过程中确保数据不丢失、不泄露
4. **测试先行**：每个迁移步骤都需要完整的测试验证

---

## 代码迁移步骤

### 步骤 1: 识别需要迁移的实体和聚合根

首先，识别需要支持租户隔离的实体和聚合根：

```typescript
// 需要迁移的实体示例
class Product extends Entity {
  // ...现有代码
}

// 需要迁移的聚合根示例
class Order extends AggregateRoot {
  // ...现有代码
}
```

**迁移决策**：
- ✅ **需要迁移**：包含业务数据的实体/聚合根（如 Product、Order、User 等）
- ❌ **不需要迁移**：配置实体、系统元数据（使用特殊系统租户）

### 步骤 2: 迁移实体到 TenantIsolatedEntity

#### 2.1 修改类继承

```typescript
// ❌ 迁移前
import { Entity, EntityId, AuditInfo, EntityLifecycle } from "@hl8/domain-kernel";

class Product extends Entity {
  constructor(
    public readonly name: string,
    public readonly price: number,
    id?: EntityId,
    auditInfo?: AuditInfo,
    lifecycleState?: EntityLifecycle,
    version?: number,
  ) {
    super(id, auditInfo, lifecycleState, version);
  }

  clone(): Product {
    return new Product(
      this.name,
      this.price,
      this.id,
      this.auditInfo?.clone(),
      this.lifecycleState,
      this.version,
    );
  }
}
```

```typescript
// ✅ 迁移后
import {
  TenantIsolatedEntity,
  TenantId,
  OrganizationId,
  DepartmentId,
  EntityId,
  AuditInfo,
  EntityLifecycle,
} from "@hl8/domain-kernel";

class Product extends TenantIsolatedEntity {
  constructor(
    tenantId: TenantId,
    public readonly name: string,
    public readonly price: number,
    organizationId?: OrganizationId,
    departmentId?: DepartmentId,
    id?: EntityId,
    auditInfo?: AuditInfo,
    lifecycleState?: EntityLifecycle,
    version?: number,
  ) {
    super(
      tenantId,
      organizationId,
      departmentId,
      id,
      auditInfo,
      lifecycleState,
      version,
    );
  }

  clone(): Product {
    return new Product(
      this.tenantId,
      this.name,
      this.price,
      this.organizationId,
      this.departmentId,
      this.id,
      this.auditInfo?.clone(),
      this.lifecycleState,
      this.version,
    );
  }
}
```

#### 2.2 更新创建代码

```typescript
// ❌ 迁移前
const product = new Product("产品名称", 100);

// ✅ 迁移后
const tenantId = TenantId.generate();
const organizationId = new OrganizationId(tenantId);
const product = new Product(tenantId, "产品名称", 100, organizationId);
```

#### 2.3 更新测试代码

```typescript
// ❌ 迁移前
describe("Product", () => {
  it("应该创建产品", () => {
    const product = new Product("产品", 100);
    expect(product.name).toBe("产品");
  });
});

// ✅ 迁移后
describe("Product", () => {
  it("应该创建产品", () => {
    const tenantId = TenantId.generate();
    const product = new Product(tenantId, "产品", 100);
    expect(product.name).toBe("产品");
    expect(product.tenantId.equals(tenantId)).toBe(true);
  });
});
```

### 步骤 3: 迁移聚合根到 TenantIsolatedAggregateRoot

#### 3.1 修改类继承

```typescript
// ❌ 迁移前
import { AggregateRoot, EntityId, AuditInfo, EntityLifecycle } from "@hl8/domain-kernel";

class Order extends AggregateRoot {
  constructor(
    public readonly orderNumber: string,
    id?: EntityId,
    auditInfo?: AuditInfo,
    lifecycleState?: EntityLifecycle,
    version?: number,
  ) {
    super(id, auditInfo, lifecycleState, version);
  }

  clone(): Order {
    return new Order(
      this.orderNumber,
      this.id,
      this.auditInfo?.clone(),
      this.lifecycleState,
      this.version,
    );
  }
}
```

```typescript
// ✅ 迁移后
import {
  TenantIsolatedAggregateRoot,
  TenantId,
  OrganizationId,
  DepartmentId,
  EntityId,
  AuditInfo,
  EntityLifecycle,
} from "@hl8/domain-kernel";

class Order extends TenantIsolatedAggregateRoot {
  constructor(
    tenantId: TenantId,
    public readonly orderNumber: string,
    organizationId?: OrganizationId,
    departmentId?: DepartmentId,
    id?: EntityId,
    auditInfo?: AuditInfo,
    lifecycleState?: EntityLifecycle,
    version?: number,
  ) {
    super(
      tenantId,
      organizationId,
      departmentId,
      id,
      auditInfo,
      lifecycleState,
      version,
    );
  }

  clone(): Order {
    return new Order(
      this.tenantId,
      this.orderNumber,
      this.organizationId,
      this.departmentId,
      this.id,
      this.auditInfo?.clone(),
      this.lifecycleState,
      this.version,
    );
  }
}
```

#### 3.2 领域事件自动包含租户信息

迁移后，使用 `addDomainEvent` 添加的领域事件会自动包含租户信息：

```typescript
// ✅ 迁移后（自动包含租户信息）
class Order extends TenantIsolatedAggregateRoot {
  addItem(productId: string): void {
    // 添加领域事件（自动包含 tenantId, organizationId, departmentId）
    this.addDomainEvent({
      type: "OrderItemAdded",
      aggregateRootId: this.id,
      timestamp: new Date(),
      data: { orderNumber: this.orderNumber, productId },
    });
  }
}

// 事件数据会自动包含：
// {
//   type: "OrderItemAdded",
//   data: {
//     orderNumber: "ORD-001",
//     productId: "prod-123",
//     tenantId: "...",
//     organizationId: {...},
//     departmentId: {...}
//   }
// }
```

### 步骤 4: 更新仓储接口

#### 4.1 更新仓储接口

```typescript
// ❌ 迁移前
import { IRepository } from "@hl8/domain-kernel";

interface IProductRepository extends IRepository<Product> {
  findByName(name: string): Promise<Product | null>;
}
```

```typescript
// ✅ 迁移后
import {
  ITenantIsolatedRepository,
  TenantContext,
} from "@hl8/domain-kernel";

interface IProductRepository
  extends ITenantIsolatedRepository<Product> {
  findByName(
    name: string,
    context: TenantContext,
  ): Promise<Product | null>;
}
```

#### 4.2 更新仓储实现

```typescript
// ✅ 迁移后（仓储实现示例）
class ProductRepository implements IProductRepository {
  async findByIdWithContext(
    id: EntityId,
    context: TenantContext,
  ): Promise<Product | null> {
    // 仓储实现会自动应用租户隔离过滤
    // 实现细节由基础设施层提供
  }

  async findAllByContext(
    context: TenantContext,
  ): Promise<Product[]> {
    // 根据上下文自动应用多层级过滤
  }

  async findByName(
    name: string,
    context: TenantContext,
  ): Promise<Product | null> {
    // 在查询中自动应用租户过滤
  }
}
```

### 步骤 5: 更新命令和查询处理器

#### 5.1 更新命令处理器

```typescript
// ❌ 迁移前
@CommandHandler(CreateProductCommand)
class CreateProductHandler {
  async handle(command: CreateProductCommand): Promise<CommandResult> {
    const product = new Product(command.productName, command.price);
    await this.repository.save(product);
    return CommandResult.success({ productId: product.id.value });
  }
}
```

```typescript
// ✅ 迁移后
@CommandHandler(CreateProductCommand)
class CreateProductHandler {
  async handle(command: CreateProductCommand): Promise<CommandResult> {
    // 检查租户上下文（由中间件自动注入）
    if (!command.tenantContext) {
      return CommandResult.failure(
        "MISSING_TENANT_CONTEXT",
        "命令缺少租户上下文",
      );
    }

    // 使用租户上下文创建实体
    const product = new Product(
      command.tenantContext.tenantId,
      command.productName,
      command.price,
      command.tenantContext.organizationId,
      command.tenantContext.departmentId,
    );

    await this.repository.save(product);
    return CommandResult.success({ productId: product.id.value });
  }
}
```

#### 5.2 更新查询处理器

```typescript
// ❌ 迁移前
@QueryHandler(GetProductQuery)
class GetProductHandler {
  async handle(query: GetProductQuery): Promise<QueryResult> {
    const product = await this.repository.findById(
      EntityId.fromString(query.productId),
    );
    return QueryResult.successItem(product);
  }
}
```

```typescript
// ✅ 迁移后
@QueryHandler(GetProductQuery)
class GetProductHandler {
  async handle(query: GetProductQuery): Promise<QueryResult> {
    // 检查租户上下文（由中间件自动注入）
    if (!query.tenantContext) {
      return QueryResult.failure(
        "MISSING_TENANT_CONTEXT",
        "查询缺少租户上下文",
      );
    }

    // 使用上下文查询（自动应用租户隔离过滤）
    const product = await this.repository.findByIdWithContext(
      EntityId.fromString(query.productId),
      query.tenantContext,
    );

    if (!product) {
      return QueryResult.failure("PRODUCT_NOT_FOUND", "产品不存在");
    }

    return QueryResult.successItem(product);
  }
}
```

### 步骤 6: 配置应用层中间件

#### 6.1 确保中间件已注册

```typescript
import { Module } from "@nestjs/common";
import { ApplicationKernelModule } from "@hl8/application-kernel";

@Module({
  imports: [
    // 应用内核模块（自动提供租户上下文中间件）
    ApplicationKernelModule.forRoot(),
  ],
})
export class AppModule {}
```

#### 6.2 配置租户上下文提取器（可选）

如果需要使用 JWT Token 或用户信息提取租户上下文：

```typescript
import { Module } from "@nestjs/common";
import {
  ApplicationKernelModule,
  IUserContextQuery,
  JwtConfig,
} from "@hl8/application-kernel";

// 实现用户上下文查询接口
class MyUserContextQuery implements IUserContextQuery {
  async queryUserTenantContext(userId: string): Promise<UserTenantContext> {
    // 查询用户的租户信息
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

@Module({
  imports: [ApplicationKernelModule.forRoot()],
  providers: [
    {
      provide: "IUserContextQuery",
      useClass: MyUserContextQuery,
    },
    {
      provide: "JWT_CONFIG",
      useValue: {
        secret: process.env.JWT_SECRET,
        algorithm: "HS256",
      },
    },
  ],
})
export class AppModule {}
```

---

## 数据迁移步骤

### 步骤 1: 数据库 Schema 迁移

#### 1.1 PostgreSQL 迁移脚本

```sql
-- 为现有表添加租户隔离字段
-- 示例：products 表

-- 添加租户隔离字段
ALTER TABLE products
  ADD COLUMN tenant_id VARCHAR(36) NOT NULL DEFAULT '',
  ADD COLUMN organization_id VARCHAR(36),
  ADD COLUMN department_id VARCHAR(36);

-- 创建索引（提升查询性能）
CREATE INDEX idx_products_tenant_id ON products(tenant_id);
CREATE INDEX idx_products_tenant_org ON products(tenant_id, organization_id);
CREATE INDEX idx_products_tenant_org_dept ON products(tenant_id, organization_id, department_id);

-- 如果表已有数据，需要为现有数据分配租户ID
-- 注意：这一步需要根据业务逻辑确定默认租户
UPDATE products
SET tenant_id = 'default-tenant-id'  -- 替换为实际的默认租户ID
WHERE tenant_id = '';

-- 添加外键约束（可选，根据业务需求）
-- ALTER TABLE products
--   ADD CONSTRAINT fk_products_tenant
--   FOREIGN KEY (tenant_id) REFERENCES tenants(id);

-- 将 tenant_id 设置为 NOT NULL（在数据迁移完成后）
-- ALTER TABLE products ALTER COLUMN tenant_id SET NOT NULL;
```

#### 1.2 MongoDB 迁移脚本

```javascript
// MongoDB 迁移脚本（使用 MongoDB Shell 或迁移工具）

// 为现有集合添加租户隔离字段
db.products.updateMany(
  { tenantId: { $exists: false } },
  {
    $set: {
      tenantId: "default-tenant-id",  // 替换为实际的默认租户ID
      organizationId: null,
      departmentId: null,
    },
  }
);

// 创建复合索引（提升查询性能）
db.products.createIndex({ tenantId: 1 });
db.products.createIndex({ tenantId: 1, organizationId: 1 });
db.products.createIndex({
  tenantId: 1,
  organizationId: 1,
  departmentId: 1,
});
```

### 步骤 2: 数据迁移策略

#### 2.1 识别现有数据的租户归属

根据业务逻辑确定现有数据的租户归属：

**场景 1：用户数据**
```typescript
// 用户数据通常属于用户所在的租户
// 迁移逻辑：
const users = await userRepository.findAll();
for (const user of users) {
  // 用户的租户ID可以从用户属性中获取，或使用默认租户
  const tenantId = user.tenantId || defaultTenantId;
  
  // 更新实体
  await productRepository.updateTenantId(user.id, tenantId);
}
```

**场景 2：订单数据**
```typescript
// 订单数据属于下单用户所在的租户
const orders = await orderRepository.findAll();
for (const order of orders) {
  const user = await userRepository.findById(order.userId);
  const tenantId = user.tenantId || defaultTenantId;
  
  await orderRepository.updateTenantId(order.id, tenantId);
}
```

**场景 3：系统配置数据**
```typescript
// 系统配置数据使用特殊的系统租户
const systemTenantId = TenantId.fromString("system-tenant-uuid");
await configRepository.updateTenantId(configId, systemTenantId);
```

#### 2.2 执行数据迁移

```typescript
// 数据迁移脚本示例
import { TenantId } from "@hl8/domain-kernel";

async function migrateProductsToTenantIsolation() {
  // 1. 获取所有现有产品（无租户ID）
  const products = await db.query(
    "SELECT * FROM products WHERE tenant_id = '' OR tenant_id IS NULL"
  );

  // 2. 为每个产品分配租户ID
  for (const product of products) {
    // 根据业务逻辑确定租户ID
    const tenantId = determineTenantId(product);
    
    // 3. 更新数据库
    await db.query(
      "UPDATE products SET tenant_id = ? WHERE id = ?",
      [tenantId.value, product.id]
    );
  }

  // 4. 验证迁移结果
  const unmigrated = await db.query(
    "SELECT COUNT(*) FROM products WHERE tenant_id = '' OR tenant_id IS NULL"
  );
  
  if (unmigrated > 0) {
    throw new Error(`还有 ${unmigrated} 条数据未迁移`);
  }
}

function determineTenantId(product: any): TenantId {
  // 根据业务逻辑确定租户ID
  // 例如：从产品创建者、所属组织等信息推断
  if (product.creatorTenantId) {
    return TenantId.fromString(product.creatorTenantId);
  }
  
  // 使用默认租户（仅用于遗留数据）
  return TenantId.fromString("default-tenant-id");
}
```

### 步骤 3: 验证数据迁移

#### 3.1 数据完整性验证

```typescript
// 验证所有数据都有租户ID
async function validateTenantIsolation() {
  // 检查是否有空租户ID的数据
  const nullTenantData = await db.query(`
    SELECT COUNT(*) as count 
    FROM products 
    WHERE tenant_id IS NULL OR tenant_id = ''
  `);
  
  if (nullTenantData.count > 0) {
    throw new Error(`发现 ${nullTenantData.count} 条数据缺少租户ID`);
  }

  // 检查租户ID格式
  const invalidTenantData = await db.query(`
    SELECT id 
    FROM products 
    WHERE tenant_id NOT SIMILAR TO '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
  `);
  
  if (invalidTenantData.length > 0) {
    throw new Error(`发现 ${invalidTenantData.length} 条数据的租户ID格式无效`);
  }

  // 检查层级一致性（如果使用了组织和部门）
  const inconsistentData = await db.query(`
    SELECT id 
    FROM products 
    WHERE department_id IS NOT NULL 
      AND organization_id IS NULL
  `);
  
  if (inconsistentData.length > 0) {
    throw new Error(`发现 ${inconsistentData.length} 条数据的层级关系不一致`);
  }
}
```

#### 3.2 功能验证

```typescript
// 验证租户隔离功能正常工作
async function validateTenantIsolationFunctionality() {
  const tenant1Id = TenantId.generate();
  const tenant2Id = TenantId.generate();

  // 1. 创建测试数据
  const product1 = new Product(tenant1Id, "产品1", 100);
  const product2 = new Product(tenant2Id, "产品2", 200);
  
  await repository.save(product1);
  await repository.save(product2);

  // 2. 使用租户1的上下文查询
  const context1 = new TenantContext(tenant1Id);
  const products1 = await repository.findAllByContext(context1);
  
  // 3. 验证只能查询到租户1的数据
  expect(products1).toHaveLength(1);
  expect(products1[0].name).toBe("产品1");

  // 4. 使用租户2的上下文查询
  const context2 = new TenantContext(tenant2Id);
  const products2 = await repository.findAllByContext(context2);
  
  // 5. 验证只能查询到租户2的数据
  expect(products2).toHaveLength(1);
  expect(products2[0].name).toBe("产品2");
}
```

---

## 迁移检查清单

### 代码迁移检查清单

- [ ] **实体迁移**
  - [ ] 所有需要隔离的实体已迁移到 `TenantIsolatedEntity`
  - [ ] 实体构造函数已更新，包含 `tenantId` 参数
  - [ ] `clone()` 方法已更新，包含租户隔离字段
  - [ ] 所有创建实体的代码已更新

- [ ] **聚合根迁移**
  - [ ] 所有需要隔离的聚合根已迁移到 `TenantIsolatedAggregateRoot`
  - [ ] 聚合根构造函数已更新，包含 `tenantId` 参数
  - [ ] `clone()` 方法已更新
  - [ ] 领域事件自动包含租户信息（使用 `addDomainEvent`）

- [ ] **仓储迁移**
  - [ ] 仓储接口已更新为 `ITenantIsolatedRepository`
  - [ ] 仓储实现已更新，支持上下文查询方法
  - [ ] 所有查询方法已更新，使用上下文参数

- [ ] **命令/查询迁移**
  - [ ] 命令处理器已更新，检查并使用 `command.tenantContext`
  - [ ] 查询处理器已更新，检查并使用 `query.tenantContext`
  - [ ] 所有处理器都已处理缺少上下文的情况

- [ ] **中间件配置**
  - [ ] `ApplicationKernelModule.forRoot()` 已配置
  - [ ] 租户上下文提取器已配置（如需要）
  - [ ] JWT 配置已提供（如使用 JWT）
  - [ ] 用户上下文查询接口已实现（如使用用户信息提取）

- [ ] **测试更新**
  - [ ] 所有单元测试已更新，包含租户上下文
  - [ ] 集成测试已更新，验证租户隔离功能
  - [ ] 端到端测试已更新，验证完整流程

### 数据迁移检查清单

- [ ] **数据库 Schema**
  - [ ] 所有表已添加 `tenant_id` 字段
  - [ ] 所有表已添加 `organization_id` 字段（如需要）
  - [ ] 所有表已添加 `department_id` 字段（如需要）
  - [ ] 索引已创建（单列索引和复合索引）

- [ ] **数据迁移**
  - [ ] 现有数据已分配租户ID
  - [ ] 数据迁移脚本已执行并验证
  - [ ] 所有数据都有有效的租户ID

- [ ] **数据验证**
  - [ ] 数据完整性验证通过
  - [ ] 租户ID格式验证通过
  - [ ] 层级一致性验证通过（如使用了组织/部门）
  - [ ] 功能验证通过（租户隔离正常工作）

- [ ] **性能验证**
  - [ ] 索引创建完成，查询性能满足要求
  - [ ] 查询延迟增加在可接受范围内（≤ 10%）
  - [ ] 系统吞吐量下降在可接受范围内（≤ 5%）

---

## 常见问题

### Q1: 如何为现有数据确定租户归属？

**A**: 根据业务逻辑确定：

1. **用户相关数据**：从用户属性中获取租户ID
2. **订单/交易数据**：从下单用户获取租户ID
3. **组织相关数据**：从组织属性中获取租户ID
4. **系统配置数据**：使用特殊的系统租户ID
5. **遗留数据**：创建默认租户或根据业务规则分配

### Q2: 迁移过程中如何保证数据安全？

**A**: 采用以下策略：

1. **备份数据**：迁移前完整备份数据库
2. **分阶段迁移**：按模块逐步迁移，每个模块验证通过后再继续
3. **回滚计划**：准备数据回滚脚本，迁移失败时可回滚
4. **监控验证**：迁移过程中持续监控数据完整性

### Q3: 迁移后性能会受到影响吗？

**A**: 正确配置索引后，性能影响很小：

1. **索引优化**：为 `tenant_id`、`(tenant_id, organization_id)` 等字段创建索引
2. **查询优化**：使用索引的查询性能损失 ≤ 10%
3. **监控性能**：迁移后持续监控查询性能，及时优化

### Q4: 如何迁移跨租户共享的数据？

**A**: 根据业务需求选择策略：

1. **使用系统租户**：共享数据使用特殊的系统租户
2. **数据复制**：为每个租户创建数据副本（适用于只读共享数据）
3. **显式共享表**：创建独立的共享表，通过关联表管理共享关系

### Q5: 迁移过程中现有功能会受影响吗？

**A**: 采用逐步迁移策略，最小化影响：

1. **向后兼容**：保持现有 `Entity` 和 `AggregateRoot` 基类不变
2. **逐步迁移**：可以按模块逐步迁移，不需要一次性完成
3. **双写模式**（可选）：迁移期间同时写入新旧字段，验证通过后移除旧字段

### Q6: 如何处理迁移失败的情况？

**A**: 准备完善的回滚方案：

1. **数据回滚脚本**：准备 SQL 脚本，可以移除租户隔离字段
2. **代码回滚**：使用 Git 版本控制，可以回滚到迁移前的代码版本
3. **监控告警**：迁移过程中设置监控告警，及时发现问题

---

## 迁移最佳实践

### 1. 制定详细的迁移计划

- 列出所有需要迁移的实体和聚合根
- 确定迁移顺序（建议从核心业务模块开始）
- 设置迁移里程碑和验收标准

### 2. 充分的测试

- 单元测试：验证实体和聚合根的租户隔离逻辑
- 集成测试：验证仓储查询的自动过滤
- 端到端测试：验证完整的业务流程

### 3. 数据迁移策略

- **小批量迁移**：分批处理数据，避免一次性迁移大量数据
- **验证每个批次**：每批数据迁移后立即验证
- **监控迁移进度**：记录迁移进度，及时发现问题

### 4. 性能优化

- **索引先行**：在数据迁移前创建索引（使用 `CONCURRENTLY` 避免锁表）
- **查询优化**：分析查询计划，确保使用索引
- **批量操作**：使用批量插入/更新，提升迁移效率

### 5. 文档和培训

- **更新文档**：更新 API 文档和使用指南
- **团队培训**：培训开发团队使用新的租户隔离 API
- **迁移记录**：详细记录迁移过程和遇到的问题

---

## 迁移示例：完整的产品管理模块迁移

### 步骤 1: 实体迁移

```typescript
// Product.ts - 迁移后的完整代码
import {
  TenantIsolatedEntity,
  TenantId,
  OrganizationId,
  DepartmentId,
  EntityId,
  AuditInfo,
  EntityLifecycle,
} from "@hl8/domain-kernel";

export class Product extends TenantIsolatedEntity {
  constructor(
    tenantId: TenantId,
    public readonly name: string,
    public readonly price: number,
    public readonly description: string,
    organizationId?: OrganizationId,
    departmentId?: DepartmentId,
    id?: EntityId,
    auditInfo?: AuditInfo,
    lifecycleState?: EntityLifecycle,
    version?: number,
  ) {
    super(
      tenantId,
      organizationId,
      departmentId,
      id,
      auditInfo,
      lifecycleState,
      version,
    );
  }

  clone(): Product {
    return new Product(
      this.tenantId,
      this.name,
      this.price,
      this.description,
      this.organizationId,
      this.departmentId,
      this.id,
      this.auditInfo?.clone(),
      this.lifecycleState,
      this.version,
    );
  }
}
```

### 步骤 2: 仓储迁移

```typescript
// IProductRepository.ts
import {
  ITenantIsolatedRepository,
  TenantContext,
} from "@hl8/domain-kernel";
import { Product } from "../entities/product.js";

export interface IProductRepository
  extends ITenantIsolatedRepository<Product> {
  findByName(
    name: string,
    context: TenantContext,
  ): Promise<Product | null>;

  findByPriceRange(
    minPrice: number,
    maxPrice: number,
    context: TenantContext,
  ): Promise<Product[]>;
}
```

### 步骤 3: 命令和查询迁移

```typescript
// CreateProductCommand.ts
import { BaseCommand } from "@hl8/application-kernel";

export class CreateProductCommand extends BaseCommand {
  static readonly commandType = "CreateProduct";

  constructor(
    aggregateId: string,
    public readonly name: string,
    public readonly price: number,
    public readonly description: string,
  ) {
    super(aggregateId, CreateProductCommand.commandType);
  }

  clone(): BaseCommand {
    return new CreateProductCommand(
      this.aggregateId,
      this.name,
      this.price,
      this.description,
    );
  }
}

// CreateProductHandler.ts
import { CommandHandler } from "@nestjs/cqrs";
import { CommandResult } from "@hl8/application-kernel";
import { CreateProductCommand } from "./create-product.command.js";
import { Product } from "../entities/product.js";
import { IProductRepository } from "../repositories/product-repository.interface.js";

@CommandHandler(CreateProductCommand)
export class CreateProductHandler {
  constructor(
    private readonly productRepository: IProductRepository,
  ) {}

  async handle(command: CreateProductCommand): Promise<CommandResult> {
    if (!command.tenantContext) {
      return CommandResult.failure(
        "MISSING_TENANT_CONTEXT",
        "命令缺少租户上下文",
      );
    }

    const product = new Product(
      command.tenantContext.tenantId,
      command.name,
      command.price,
      command.description,
      command.tenantContext.organizationId,
      command.tenantContext.departmentId,
    );

    await this.productRepository.save(product);

    return CommandResult.success({ productId: product.id.value });
  }
}
```

### 步骤 4: 数据库迁移脚本

```sql
-- migrations/001_add_tenant_isolation_to_products.sql

-- 1. 添加租户隔离字段
ALTER TABLE products
  ADD COLUMN tenant_id VARCHAR(36),
  ADD COLUMN organization_id VARCHAR(36),
  ADD COLUMN department_id VARCHAR(36);

-- 2. 为现有数据分配默认租户（根据业务逻辑调整）
UPDATE products
SET tenant_id = 'default-tenant-uuid'  -- 替换为实际的默认租户ID
WHERE tenant_id IS NULL;

-- 3. 设置 tenant_id 为 NOT NULL
ALTER TABLE products ALTER COLUMN tenant_id SET NOT NULL;

-- 4. 创建索引
CREATE INDEX CONCURRENTLY idx_products_tenant_id ON products(tenant_id);
CREATE INDEX CONCURRENTLY idx_products_tenant_org ON products(tenant_id, organization_id);
CREATE INDEX CONCURRENTLY idx_products_tenant_org_dept 
  ON products(tenant_id, organization_id, department_id);

-- 5. 验证数据完整性
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM products WHERE tenant_id IS NULL OR tenant_id = ''
  ) THEN
    RAISE EXCEPTION '存在缺少租户ID的产品数据';
  END IF;
END $$;
```

---

## 总结

迁移到多租户隔离架构需要：

1. **代码迁移**：更新实体、聚合根、仓储、命令/查询处理器
2. **数据迁移**：为现有数据添加租户ID字段并分配租户
3. **配置中间件**：确保租户上下文自动提取和注入
4. **充分测试**：验证租户隔离功能正常工作
5. **性能优化**：创建索引，确保查询性能

遵循本指南的步骤和最佳实践，可以安全、平滑地完成迁移。

---

**最后更新**: 2025-01-02  
**维护者**: 开发团队

