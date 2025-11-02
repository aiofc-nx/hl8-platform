# 多租户隔离最佳实践指南

本文档提供在 HL8 平台中使用多租户和多层级数据隔离功能的最佳实践、性能优化建议和安全注意事项。

**版本**: 1.0.0  
**更新日期**: 2025-01-02  
**维护者**: 开发团队

---

## 📋 目录

1. [租户隔离使用最佳实践](#租户隔离使用最佳实践)
2. [JWT Token 配置和使用建议](#jwt-token-配置和使用建议)
3. [用户上下文查询接口实现建议](#用户上下文查询接口实现建议)
4. [性能优化建议](#性能优化建议)
5. [安全注意事项](#安全注意事项)
6. [常见问题和解决方案](#常见问题和解决方案)

---

## 租户隔离使用最佳实践

### 1. 实体和聚合根使用

#### ✅ 正确使用 TenantIsolatedEntity 和 TenantIsolatedAggregateRoot

```typescript
// ✅ 正确：使用租户隔离实体
import {
  TenantIsolatedEntity,
  TenantId,
  OrganizationId,
  DepartmentId,
} from "@hl8/domain-kernel";

class Product extends TenantIsolatedEntity {
  constructor(
    tenantId: TenantId,
    public readonly name: string,
    public readonly price: number,
    organizationId?: OrganizationId,
    departmentId?: DepartmentId,
  ) {
    super(tenantId, organizationId, departmentId);
  }

  clone(): Product {
    return new Product(
      this.tenantId,
      this.name,
      this.price,
      this.organizationId,
      this.departmentId,
    );
  }
}

// ✅ 正确：使用租户隔离聚合根
class Order extends TenantIsolatedAggregateRoot {
  constructor(
    tenantId: TenantId,
    public readonly orderNumber: string,
    organizationId?: OrganizationId,
  ) {
    super(tenantId, organizationId);
  }

  addItem(productId: string): void {
    // 领域事件会自动包含租户信息
    this.addDomainEvent({
      type: "OrderItemAdded",
      aggregateRootId: this.id,
      timestamp: new Date(),
      data: { orderNumber: this.orderNumber, productId },
    });
  }
}
```

#### ❌ 避免的错误做法

```typescript
// ❌ 错误：直接在实体中存储租户ID字符串
class Product {
  public tenantId: string; // 应该使用 TenantId 值对象
}

// ❌ 错误：忘记在构造函数中传递租户ID
class Product extends TenantIsolatedEntity {
  constructor(name: string) { // 缺少 tenantId 参数
    // ...
  }
}

// ❌ 错误：手动设置租户信息而不是通过构造函数
class Product extends TenantIsolatedEntity {
  constructor() {
    super(...);
    this.tenantId = someTenantId; // 无法设置，因为 tenantId 是只读的
  }
}
```

### 2. 命令和查询处理器使用

#### ✅ 正确检查租户上下文

```typescript
// ✅ 正确：始终检查租户上下文
@CommandHandler(CreateProductCommand)
class CreateProductHandler {
  async handle(command: CreateProductCommand): Promise<CommandResult> {
    // 1. 检查租户上下文是否存在
    if (!command.tenantContext) {
      return CommandResult.failure(
        "MISSING_TENANT_CONTEXT",
        "命令缺少租户上下文",
      );
    }

    // 2. 使用租户上下文创建实体
    const product = new Product(
      command.tenantContext.tenantId,
      command.productName,
      command.price,
      command.tenantContext.organizationId,
      command.tenantContext.departmentId,
    );

    // 3. 使用租户隔离仓储保存
    await this.repository.save(product);

    return CommandResult.success({ productId: product.id.value });
  }
}

// ✅ 正确：在查询中使用上下文过滤
@QueryHandler(GetProductQuery)
class GetProductHandler {
  async handle(query: GetProductQuery): Promise<QueryResult> {
    if (!query.tenantContext) {
      return QueryResult.failure(
        "MISSING_TENANT_CONTEXT",
        "查询缺少租户上下文",
      );
    }

    // 使用 findByIdWithContext（自动应用租户隔离）
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

#### ❌ 避免的错误做法

```typescript
// ❌ 错误：不检查租户上下文
@CommandHandler(CreateProductCommand)
class CreateProductHandler {
  async handle(command: CreateProductCommand): Promise<CommandResult> {
    // 直接使用，如果 tenantContext 为 undefined 会报错
    const product = new Product(
      command.tenantContext.tenantId, // 可能为 undefined
      command.productName,
    );
  }
}

// ❌ 错误：使用非租户隔离的查询方法
@QueryHandler(GetProductQuery)
class GetProductHandler {
  async handle(query: GetProductQuery): Promise<QueryResult> {
    // 没有应用租户过滤，可能返回其他租户的数据
    const product = await this.repository.findById(
      EntityId.fromString(query.productId),
    );
  }
}
```

### 3. 仓储使用

#### ✅ 正确使用租户隔离仓储

```typescript
// ✅ 正确：使用租户隔离仓储方法
class ProductRepository implements ITenantIsolatedRepository<Product> {
  // 使用 findByIdWithContext 而不是 findById
  async findByIdWithContext(
    id: EntityId,
    context: TenantContext,
  ): Promise<Product | null> {
    // 实现会自动应用租户过滤
    return await this.db.findOne({
      id: id.value,
      tenantId: context.tenantId.value,
      // 可选：应用组织和部门过滤
      ...(context.organizationId && {
        organizationId: context.organizationId.value,
      }),
      ...(context.departmentId && {
        departmentId: context.departmentId.value,
      }),
    });
  }

  // 使用 findAllByContext 而不是 findAll
  async findAllByContext(context: TenantContext): Promise<Product[]> {
    // 实现会自动应用多层级过滤
    return await this.db.find({
      tenantId: context.tenantId.value,
      // 根据上下文层级自动应用过滤
    });
  }
}
```

### 4. 跨租户访问控制

#### ✅ 正确实现跨租户访问

```typescript
// ✅ 正确：验证跨租户访问权限
@QueryHandler(GetCrossTenantResourceQuery)
class GetCrossTenantResourceHandler {
  constructor(
    private readonly repository: ITenantIsolatedRepository<Resource>,
    private readonly permissionValidator: ITenantPermissionValidator,
  ) {}

  async handle(query: GetCrossTenantResourceQuery): Promise<QueryResult> {
    if (!query.tenantContext) {
      return QueryResult.failure(
        "MISSING_TENANT_CONTEXT",
        "查询缺少租户上下文",
      );
    }

    // 1. 验证是否允许跨租户访问
    const canAccess = await this.permissionValidator.validateCrossTenantAccess(
      query.tenantContext,
    );

    if (!canAccess) {
      return QueryResult.failure(
        "CROSS_TENANT_ACCESS_DENIED",
        "跨租户访问被拒绝",
      );
    }

    // 2. 验证是否可以访问目标租户
    const targetTenantId = TenantId.fromString(query.targetTenantId);
    const canAccessTenant =
      await this.permissionValidator.validateTenantAccess(
        query.tenantContext,
        targetTenantId,
      );

    if (!canAccessTenant) {
      return QueryResult.failure(
        "TENANT_ACCESS_DENIED",
        "无权访问该租户",
      );
    }

    // 3. 执行跨租户查询
    const resource = await this.repository.findById(targetResourceId);

    // 4. 记录审计日志
    await this.auditLogService.log({
      action: "CROSS_TENANT_ACCESS",
      tenantId: targetTenantId.value,
      userId: query.tenantContext.userId?.value,
      resourceId: resource.id.value,
    });

    return QueryResult.successItem(resource);
  }
}
```

---

## JWT Token 配置和使用建议

### 1. JWT Token 配置

#### ✅ 推荐配置

```typescript
import { Module } from "@nestjs/common";
import { ApplicationKernelModule } from "@hl8/application-kernel";

@Module({
  imports: [ApplicationKernelModule.forRoot()],
  providers: [
    {
      provide: "JWT_CONFIG",
      useValue: {
        // ✅ 使用强密钥（至少32个字符）
        secret: process.env.JWT_SECRET || (() => {
          throw new Error("JWT_SECRET 必须配置");
        })(),
        // ✅ 明确指定算法（推荐 HS256 或 RS256）
        algorithm: process.env.JWT_ALGORITHM || "HS256",
      },
    },
  ],
})
export class AppModule {}
```

#### JWT Token Payload 格式

```typescript
// ✅ 推荐：完整的 JWT Payload 结构
interface JWTPayload {
  // 必需字段
  tenantId: string; // UUID v4 格式的租户ID

  // 可选字段（支持多层级）
  organizationId?: string; // 组织ID（UUID v4）
  departmentId?: string; // 部门ID（UUID v4）

  // 权限和访问控制
  permissions?: string[]; // 权限列表，如 ["read", "write", "admin"]
  isCrossTenant?: boolean; // 是否允许跨租户访问

  // 标准 JWT 字段
  sub?: string; // 用户ID
  exp?: number; // 过期时间
  iat?: number; // 签发时间
  jti?: string; // JWT ID（用于防重放）
}
```

#### 生成 JWT Token 示例

```typescript
import jwt from "jsonwebtoken";

// ✅ 正确：生成包含租户信息的 JWT Token
function generateJWT(user: User, tenant: Tenant): string {
  const payload: JWTPayload = {
    tenantId: tenant.id.value,
    organizationId: user.organizationId?.value,
    departmentId: user.departmentId?.value,
    permissions: user.permissions,
    isCrossTenant: user.role === "super-admin",
    sub: user.id.value,
    exp: Math.floor(Date.now() / 1000) + 3600, // 1小时后过期
    iat: Math.floor(Date.now() / 1000),
    jti: generateUUID(), // 用于防重放
  };

  return jwt.sign(payload, process.env.JWT_SECRET!, {
    algorithm: "HS256",
    expiresIn: "1h",
  });
}
```

### 2. JWT Token 验证最佳实践

#### ✅ 安全验证

```typescript
// ✅ 正确：验证 JWT Token 并提取租户上下文
import { TenantContextExtractorImpl } from "@hl8/application-kernel";

class AuthService {
  constructor(
    private readonly extractor: TenantContextExtractorImpl,
  ) {}

  async authenticate(token: string): Promise<TenantContext | null> {
    try {
      // 1. 提取租户上下文
      const context = await this.extractor.extractFromToken(token);

      if (!context) {
        return null;
      }

      // 2. 验证上下文有效性
      if (!context.validate()) {
        return null;
      }

      // 3. 验证租户是否仍然有效（可选）
      const tenant = await this.tenantRepository.findById(
        context.tenantId,
      );
      if (!tenant || !tenant.isActive()) {
        return null;
      }

      return context;
    } catch (error) {
      // 记录错误但不泄露详细信息
      this.logger.error("JWT Token 验证失败", {
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }
}
```

### 3. JWT Token 安全建议

#### ⚠️ 安全注意事项

1. **密钥管理**
   ```typescript
   // ✅ 使用环境变量或密钥管理系统
   const secret = process.env.JWT_SECRET;

   // ❌ 不要在代码中硬编码密钥
   // const secret = "my-secret-key"; // 危险！
   ```

2. **密钥强度**
   ```typescript
   // ✅ 使用强密钥（至少32个字符）
   const secret = generateStrongSecret(32);

   // ❌ 避免使用弱密钥
   // const secret = "123456"; // 太弱！
   ```

3. **Token 过期时间**
   ```typescript
   // ✅ 设置合理的过期时间（推荐1-24小时）
   const expiresIn = "1h";

   // ❌ 避免设置过长的过期时间
   // const expiresIn = "365d"; // 太长，安全风险高
   ```

4. **算法选择**
   ```typescript
   // ✅ 使用安全的算法（HS256 或 RS256）
   algorithm: "HS256", // 对称加密，适合单服务
   // 或
   algorithm: "RS256", // 非对称加密，适合微服务

   // ❌ 避免使用不安全的算法（如 HS1）
   // algorithm: "HS1", // 不安全！
   ```

---

## 用户上下文查询接口实现建议

### 1. 实现 IUserContextQuery 接口

#### ✅ 推荐实现

```typescript
import {
  IUserContextQuery,
  UserTenantContext,
} from "@hl8/application-kernel";
import { Injectable } from "@nestjs/common";

@Injectable()
class UserContextQueryImpl implements IUserContextQuery {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly tenantRepository: ITenantRepository,
    private readonly logger: Logger,
  ) {}

  async queryUserTenantContext(userId: string): Promise<UserTenantContext> {
    try {
      // 1. 验证用户ID格式
      if (!this.isValidUserId(userId)) {
        throw new Error(`无效的用户ID格式: ${userId}`);
      }

      // 2. 查询用户信息
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw new Error(`用户不存在: ${userId}`);
      }

      // 3. 验证用户状态
      if (!user.isActive()) {
        throw new Error(`用户未激活: ${userId}`);
      }

      // 4. 查询租户信息（验证租户是否有效）
      const tenant = await this.tenantRepository.findById(user.tenantId);
      if (!tenant || !tenant.isActive()) {
        throw new Error(`租户无效或未激活: ${user.tenantId.value}`);
      }

      // 5. 构建用户租户上下文
      const context: UserTenantContext = {
        tenantId: user.tenantId.value,
        organizationId: user.organizationId?.value,
        departmentId: user.departmentId?.value,
        permissions: user.permissions || [],
        isCrossTenant: user.role === "super-admin" || user.role === "admin",
        userId: user.id.value,
      };

      // 6. 验证层级一致性
      this.validateHierarchy(context);

      return context;
    } catch (error) {
      this.logger.error("查询用户租户上下文失败", {
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  private isValidUserId(userId: string): boolean {
    // 验证 UUID 格式
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(userId);
  }

  private validateHierarchy(context: UserTenantContext): void {
    // 验证层级一致性：如果有部门ID，必须有组织ID
    if (context.departmentId && !context.organizationId) {
      throw new Error("部门ID必须关联组织ID");
    }

    // 验证组织是否属于租户（在数据库层面验证）
    // ...
  }
}
```

### 2. 缓存用户上下文

#### ✅ 性能优化：缓存用户上下文

```typescript
import { Injectable } from "@nestjs/common";
import { InMemoryCache } from "@hl8/application-kernel";

@Injectable()
class CachedUserContextQueryImpl implements IUserContextQuery {
  private readonly cache: InMemoryCache<UserTenantContext>;

  constructor(
    private readonly userContextQuery: IUserContextQuery,
  ) {
    // 缓存5分钟
    this.cache = new InMemoryCache<UserTenantContext>({
      defaultTtl: 5 * 60 * 1000, // 5分钟
    });
  }

  async queryUserTenantContext(userId: string): Promise<UserTenantContext> {
    // 1. 尝试从缓存获取
    const cached = await this.cache.get(userId);
    if (cached) {
      return cached;
    }

    // 2. 从数据库查询
    const context = await this.userContextQuery.queryUserTenantContext(userId);

    // 3. 写入缓存
    await this.cache.set(userId, context);

    return context;
  }

  // 清除用户上下文缓存（当用户信息更新时调用）
  async invalidateCache(userId: string): Promise<void> {
    await this.cache.delete(userId);
  }
}
```

---

## 性能优化建议

### 1. 数据库索引优化

#### ✅ 创建必要的索引

```sql
-- PostgreSQL 索引
-- 1. 单列索引（租户ID）
CREATE INDEX CONCURRENTLY idx_products_tenant_id 
  ON products(tenant_id);

-- 2. 复合索引（租户 + 组织）
CREATE INDEX CONCURRENTLY idx_products_tenant_org 
  ON products(tenant_id, organization_id);

-- 3. 复合索引（租户 + 组织 + 部门）
CREATE INDEX CONCURRENTLY idx_products_tenant_org_dept 
  ON products(tenant_id, organization_id, department_id);

-- 4. 部分索引（仅索引活跃租户）
CREATE INDEX CONCURRENTLY idx_products_active_tenant 
  ON products(tenant_id) 
  WHERE deleted_at IS NULL;
```

```javascript
// MongoDB 索引
db.products.createIndex({ tenantId: 1 });
db.products.createIndex({ tenantId: 1, organizationId: 1 });
db.products.createIndex({
  tenantId: 1,
  organizationId: 1,
  departmentId: 1,
});

// 部分索引（仅索引活跃数据）
db.products.createIndex(
  { tenantId: 1 },
  { partialFilterExpression: { deletedAt: null } }
);
```

### 2. 查询优化

#### ✅ 优化查询性能

```typescript
// ✅ 正确：使用索引字段查询
class ProductRepository {
  async findAllByContext(context: TenantContext): Promise<Product[]> {
    // 构建查询条件，充分利用索引
    const query: any = {
      tenantId: context.tenantId.value,
      deletedAt: null, // 过滤软删除的数据
    };

    // 根据上下文层级添加过滤条件
    if (context.departmentId) {
      // 部门级别：精确匹配
      query.departmentId = context.departmentId.value;
    } else if (context.organizationId) {
      // 组织级别：匹配组织及其所有部门
      query.organizationId = context.organizationId.value;
    }

    // 使用索引字段查询
    return await this.db.find(query).exec();
  }
}

// ❌ 错误：使用非索引字段查询
class ProductRepository {
  async findAllByContext(context: TenantContext): Promise<Product[]> {
    // 使用非索引字段查询，性能差
    return await this.db.find({
      name: "某个名称", // name 字段可能没有索引
      tenantId: context.tenantId.value,
    });
  }
}
```

### 3. 上下文提取性能优化

#### ✅ 优化上下文提取

```typescript
// ✅ 正确：缓存上下文提取结果
class OptimizedTenantContextExtractor {
  private readonly contextCache = new Map<string, TenantContext>();

  async extractFromToken(token: string): Promise<TenantContext | null> {
    // 1. 使用 Token 的哈希值作为缓存键
    const cacheKey = this.hashToken(token);

    // 2. 检查缓存
    const cached = this.contextCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // 3. 提取上下文
    const context = await this.baseExtractor.extractFromToken(token);
    if (!context) {
      return null;
    }

    // 4. 缓存结果（设置合理的过期时间）
    this.contextCache.set(cacheKey, context);
    setTimeout(() => {
      this.contextCache.delete(cacheKey);
    }, 5 * 60 * 1000); // 5分钟后过期

    return context;
  }

  private hashToken(token: string): string {
    // 使用简单的哈希算法（如 SHA256）
    // 这里简化示例
    return token.substring(0, 20);
  }
}
```

### 4. 批量操作优化

#### ✅ 批量查询优化

```typescript
// ✅ 正确：批量查询，减少数据库往返
class ProductService {
  async findMultipleProducts(
    productIds: string[],
    context: TenantContext,
  ): Promise<Product[]> {
    // 一次性查询多个产品，应用租户过滤
    const products = await this.repository.findMany({
      ids: productIds.map((id) => EntityId.fromString(id)),
      tenantContext: context,
    });

    return products;
  }
}

// ❌ 错误：循环查询，性能差
class ProductService {
  async findMultipleProducts(
    productIds: string[],
    context: TenantContext,
  ): Promise<Product[]> {
    const products: Product[] = [];
    for (const id of productIds) {
      // 多次数据库往返
      const product = await this.repository.findByIdWithContext(
        EntityId.fromString(id),
        context,
      );
      if (product) {
        products.push(product);
      }
    }
    return products;
  }
}
```

---

## 安全注意事项

### 1. 租户上下文验证

#### ✅ 始终验证租户上下文

```typescript
// ✅ 正确：在处理器中验证租户上下文
@CommandHandler(CreateProductCommand)
class CreateProductHandler {
  async handle(command: CreateProductCommand): Promise<CommandResult> {
    // 1. 检查租户上下文是否存在
    if (!command.tenantContext) {
      return CommandResult.failure(
        "MISSING_TENANT_CONTEXT",
        "命令缺少租户上下文",
      );
    }

    // 2. 验证租户上下文有效性
    if (!command.tenantContext.validate()) {
      return CommandResult.failure(
        "INVALID_TENANT_CONTEXT",
        "租户上下文无效",
      );
    }

    // 3. 验证租户是否仍然有效（可选，用于高安全场景）
    const tenant = await this.tenantRepository.findById(
      command.tenantContext.tenantId,
    );
    if (!tenant || !tenant.isActive()) {
      return CommandResult.failure(
        "TENANT_INACTIVE",
        "租户无效或未激活",
      );
    }

    // 4. 执行业务逻辑
    // ...
  }
}
```

### 2. 防止租户上下文注入

#### ✅ 安全提取租户上下文

```typescript
// ✅ 正确：验证提取的租户上下文
class SecureTenantContextExtractor {
  async extractFromHeader(
    headers: Record<string, string>,
  ): Promise<TenantContext | null> {
    const tenantIdStr = headers["x-tenant-id"];

    // 1. 验证租户ID格式
    if (!tenantIdStr || !this.isValidUUID(tenantIdStr)) {
      return null;
    }

    // 2. 验证租户ID是否在允许的列表中（可选，用于白名单）
    // const allowedTenants = await this.getAllowedTenants();
    // if (!allowedTenants.includes(tenantIdStr)) {
    //   return null;
    // }

    // 3. 创建租户上下文
    try {
      const tenantId = TenantId.fromString(tenantIdStr);
      return new TenantContext(tenantId, /* ... */);
    } catch (error) {
      // 记录错误但不泄露详细信息
      this.logger.warn("无效的租户ID", { tenantId: tenantIdStr });
      return null;
    }
  }

  private isValidUUID(str: string): boolean {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  }
}
```

### 3. 跨租户访问审计

#### ✅ 记录所有跨租户访问

```typescript
// ✅ 正确：记录跨租户访问审计日志
@QueryHandler(GetCrossTenantResourceQuery)
class GetCrossTenantResourceHandler {
  async handle(query: GetCrossTenantResourceQuery): Promise<QueryResult> {
    // 执行跨租户查询
    const resource = await this.repository.findById(targetResourceId);

    // 记录审计日志
    await this.auditLogService.log({
      action: "CROSS_TENANT_ACCESS",
      sourceTenantId: query.tenantContext.tenantId.value,
      targetTenantId: targetResource.tenantId.value,
      userId: query.tenantContext.userId?.value,
      resourceId: resource.id.value,
      timestamp: new Date(),
      ipAddress: query.metadata?.ipAddress,
      userAgent: query.metadata?.userAgent,
    });

    return QueryResult.successItem(resource);
  }
}
```

### 4. 敏感数据脱敏

#### ✅ 查询结果中脱敏敏感数据

```typescript
// ✅ 正确：在返回结果前脱敏敏感数据
@QueryHandler(GetUserQuery)
class GetUserHandler {
  async handle(query: GetUserQuery): Promise<QueryResult> {
    const user = await this.repository.findByIdWithContext(
      EntityId.fromString(query.userId),
      query.tenantContext,
    );

    if (!user) {
      return QueryResult.failure("USER_NOT_FOUND", "用户不存在");
    }

    // 脱敏敏感数据
    const sanitizedUser = {
      ...user,
      password: undefined, // 移除密码
      email: this.maskEmail(user.email), // 脱敏邮箱
      phone: this.maskPhone(user.phone), // 脱敏手机号
    };

    return QueryResult.successItem(sanitizedUser);
  }

  private maskEmail(email: string): string {
    const [local, domain] = email.split("@");
    const maskedLocal = local.substring(0, 2) + "***";
    return `${maskedLocal}@${domain}`;
  }

  private maskPhone(phone: string): string {
    return phone.substring(0, 3) + "****" + phone.substring(7);
  }
}
```

---

## 常见问题和解决方案

### Q1: 如何为现有数据迁移租户ID？

**A**: 参考 [迁移指南](./migration-guide.md) 中的数据迁移章节。主要步骤：

1. 识别数据的租户归属
2. 为现有数据分配租户ID
3. 验证数据完整性
4. 创建必要的索引

### Q2: JWT Token 提取失败怎么办？

**A**: 检查以下几个方面：

```typescript
// 1. 检查 JWT 配置是否正确注入
const jwtConfig = module.get<JwtConfig>("JWT_CONFIG");
if (!jwtConfig || !jwtConfig.secret) {
  throw new Error("JWT_CONFIG 未配置");
}

// 2. 检查 Token 格式是否正确
const token = request.headers.authorization?.replace("Bearer ", "");
if (!token || token.trim().length === 0) {
  throw new Error("JWT Token 缺失");
}

// 3. 检查 Token 是否过期
try {
  const context = await extractor.extractFromToken(token);
  if (!context) {
    // Token 无效或过期
    throw new Error("JWT Token 无效或过期");
  }
} catch (error) {
  // 处理错误
}
```

### Q3: 如何优化多层级查询性能？

**A**: 使用以下策略：

1. **创建复合索引**
   ```sql
   CREATE INDEX idx_products_tenant_org_dept 
     ON products(tenant_id, organization_id, department_id);
   ```

2. **使用正确的查询方法**
   ```typescript
   // ✅ 使用 findByContext（自动应用层级过滤）
   const products = await repository.findAllByContext(context);

   // ❌ 避免手动构建查询条件（可能无法使用索引）
   const products = await repository.find({
     // 手动构建可能无法充分利用索引
   });
   ```

3. **限制查询结果数量**
   ```typescript
   const products = await repository.findAllByContext(context, {
     limit: 100, // 限制返回数量
     offset: 0,
   });
   ```

### Q4: 如何处理跨租户管理员权限？

**A**: 使用 `ITenantPermissionValidator` 验证权限：

```typescript
// 1. 检查是否允许跨租户访问
const canAccess = await permissionValidator.validateCrossTenantAccess(
  context,
);

// 2. 检查是否可以访问特定租户
if (canAccess) {
  const canAccessTenant = await permissionValidator.validateTenantAccess(
    context,
    targetTenantId,
  );

  if (!canAccessTenant) {
    throw new Error("无权访问该租户");
  }
}
```

### Q5: 如何测试租户隔离功能？

**A**: 参考集成测试示例：

```typescript
// 1. 创建测试租户上下文
const tenant1Id = TenantId.generate();
const context1 = new TenantContext(tenant1Id);

// 2. 创建测试数据
const product = new Product(tenant1Id, "产品", 100);
await repository.save(product);

// 3. 使用不同租户的上下文查询
const tenant2Id = TenantId.generate();
const context2 = new TenantContext(tenant2Id);

// 4. 验证租户隔离
const result = await repository.findByIdWithContext(
  product.id,
  context2,
);
expect(result).toBeNull(); // 应该返回 null
```

### Q6: 性能目标是什么？

**A**: 根据规格要求，性能目标如下：

| 指标              | 目标值 | 说明                           |
| ----------------- | ------ | ------------------------------ |
| 查询延迟增加      | ≤ 10%  | 相比无隔离查询的延迟增加       |
| 系统吞吐量下降    | ≤ 5%   | 相比无隔离系统的吞吐量下降     |
| P95 查询时间      | ≤ 100ms | 95% 的查询在 100ms 内完成    |
| 上下文提取开销    | ≤ 5ms  | 从请求提取上下文的 P95 时间    |

---

## 总结

遵循本指南的最佳实践可以：

1. ✅ **提高开发效率**：减少常见错误，加快开发速度
2. ✅ **提升系统性能**：通过索引优化和查询优化提升性能
3. ✅ **增强安全性**：通过验证和审计保障数据安全
4. ✅ **降低维护成本**：清晰的代码结构和规范降低维护成本

如有其他问题，请参考：
- [迁移指南](./migration-guide.md)
- [Domain Kernel README](../../../libs/kernel/domain-kernel/README.md)
- [Application Kernel README](../../../libs/kernel/application-kernel/README.md)

---

**最后更新**: 2025-01-02  
**维护者**: 开发团队

