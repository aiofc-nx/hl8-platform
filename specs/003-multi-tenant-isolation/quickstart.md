# Quick Start: Multi-Tenant and Multi-Level Data Isolation

本指南帮助你快速开始使用多租户和多层级数据隔离功能。

## 前提条件

- 已安装并配置 `@hl8/domain-kernel` 和 `@hl8/application-kernel`
- 项目使用 TypeScript 5.9.3+ 和 Node.js 20+
- 已配置 NodeNext 模块系统

## 基础使用

### 1. 创建租户隔离实体

```typescript
import { TenantId, OrganizationId, DepartmentId } from "@hl8/domain-kernel";
import { TenantIsolatedEntity } from "@hl8/domain-kernel";
import { EntityId, AuditInfo, EntityLifecycle } from "@hl8/domain-kernel";

/**
 * 用户实体示例
 */
export class User extends TenantIsolatedEntity {
  constructor(
    tenantId: TenantId,
    organizationId: OrganizationId,
    departmentId: DepartmentId,
    private readonly email: string,
    private readonly name: string,
    id?: EntityId,
    auditInfo?: AuditInfo,
    lifecycleState: EntityLifecycle = EntityLifecycle.CREATED,
    version: number = 1,
  ) {
    super(tenantId, organizationId, departmentId, id, auditInfo, lifecycleState, version);
  }

  /**
   * 实现抽象方法
   */
  clone(): User {
    return new User(this.tenantId, this.organizationId!, this.departmentId!, this.email, this.name, this.id, this.auditInfo, this.lifecycleState, this.version);
  }

  validateBusinessRules(): boolean {
    // 业务规则验证
    return this.email.includes("@") && this.name.length > 0;
  }

  executeBusinessLogic(operation: string, params: unknown): unknown {
    // 业务逻辑执行
    switch (operation) {
      case "updateEmail":
        // 更新邮箱逻辑
        return { success: true };
      default:
        throw new Error(`未知操作: ${operation}`);
    }
  }

  // 业务方法
  getEmail(): string {
    return this.email;
  }

  getName(): string {
    return this.name;
  }
}

// 使用示例
const tenantId = TenantId.generate();
const organizationId = new OrganizationId(tenantId);
const departmentId = new DepartmentId(organizationId);

const user = new User(tenantId, organizationId, departmentId, "user@example.com", "张三");
```

### 2. 创建租户隔离聚合根

```typescript
import { TenantIsolatedAggregateRoot } from "@hl8/domain-kernel";

/**
 * 订单聚合根示例
 */
export class Order extends TenantIsolatedAggregateRoot {
  constructor(
    tenantId: TenantId,
    organizationId: OrganizationId,
    departmentId: DepartmentId,
    private readonly items: OrderItem[],
    id?: EntityId,
    auditInfo?: AuditInfo,
    lifecycleState: EntityLifecycle = EntityLifecycle.CREATED,
    version: number = 1,
  ) {
    super(tenantId, organizationId, departmentId, id, auditInfo, lifecycleState, version);
  }

  /**
   * 实现抽象方法
   */
  protected performCoordination(operation: string, params: unknown): unknown {
    switch (operation) {
      case "addItem":
        // 协调添加订单项的逻辑
        return { success: true };
      case "calculateTotal":
        // 协调计算总价的逻辑
        return { total: 0 };
      default:
        throw new Error(`未知操作: ${operation}`);
    }
  }

  protected performBusinessInvariantValidation(): boolean {
    // 业务不变量验证：订单必须至少有一个订单项
    return this.items.length > 0;
  }

  clone(): Order {
    return new Order(this.tenantId, this.organizationId!, this.departmentId!, [...this.items], this.id, this.auditInfo, this.lifecycleState, this.version);
  }

  validateBusinessRules(): boolean {
    return this.items.length > 0;
  }

  executeBusinessLogic(operation: string, params: unknown): unknown {
    return {};
  }
}
```

### 3. 使用租户上下文

```typescript
import { TenantContext } from "@hl8/domain-kernel";

// 创建租户上下文
const context = new TenantContext(tenantId, {
  organizationId,
  departmentId,
  permissions: ["read", "write"],
});

// 验证权限
if (context.hasPermission("read")) {
  // 执行读取操作
}

// 检查访问权限
if (context.canAccessOrganization(organizationId)) {
  // 允许访问该组织数据
}
```

### 4. 实现租户隔离仓储

```typescript
import { ITenantIsolatedRepository } from "@hl8/domain-kernel";
import { User } from "./user.entity.js";

export class UserRepository implements ITenantIsolatedRepository<User> {
  async findByIdWithContext(id: EntityId, context: TenantContext): Promise<User | null> {
    // 自动应用租户过滤条件
    const query = `
      SELECT * FROM users 
      WHERE id = $1 
        AND tenant_id = $2
        AND organization_id = $3
        AND department_id = $4
        AND lifecycle_state != 'DELETED'
    `;

    const result = await db.query(query, [id.value, context.tenantId.value, context.organizationId?.value, context.departmentId?.value]);

    return result ? this.mapToEntity(result) : null;
  }

  async findAllByContext(context: TenantContext): Promise<User[]> {
    // 根据上下文构建查询
    let query = "SELECT * FROM users WHERE tenant_id = $1";
    const params = [context.tenantId.value];

    if (context.organizationId) {
      query += " AND organization_id = $2";
      params.push(context.organizationId.value);
    }

    if (context.departmentId) {
      query += " AND department_id = $3";
      params.push(context.departmentId.value);
    }

    query += " AND lifecycle_state != 'DELETED'";

    const results = await db.query(query, params);
    return results.map((r) => this.mapToEntity(r));
  }

  // 实现其他必需方法...
  async save(entity: User): Promise<void> {
    // 实现保存逻辑，自动验证租户隔离
  }

  async delete(id: EntityId): Promise<void> {
    // 实现删除逻辑，自动验证租户隔离
  }

  async exists(id: EntityId): Promise<boolean> {
    // 实现存在性检查，自动应用租户过滤
  }

  private mapToEntity(row: unknown): User {
    // 映射数据库行到实体
    // ...
  }
}
```

### 5. 在命令中使用租户上下文

```typescript
import { BaseCommand } from "@hl8/application-kernel";
import { TenantContext } from "@hl8/domain-kernel";

export class CreateUserCommand extends BaseCommand {
  public readonly email: string;
  public readonly name: string;
  public readonly tenantContext?: TenantContext; // 自动注入

  constructor(
    aggregateId: string,
    email: string,
    name: string,
    options?: {
      tenantContext?: TenantContext;
      correlationId?: string;
      userId?: string;
    },
  ) {
    super(aggregateId, "CreateUser", options);
    this.email = email;
    this.name = name;
    this.tenantContext = options?.tenantContext;
  }

  clone(): CreateUserCommand {
    return new CreateUserCommand(this.aggregateId, this.email, this.name, {
      tenantContext: this.tenantContext,
      correlationId: this.correlationId,
      userId: this.userId,
    });
  }
}

// 命令处理器
export class CreateUserHandler extends BaseCommandHandler<CreateUserCommand> {
  async executeCommand(command: CreateUserCommand): Promise<CommandResult> {
    // 验证租户上下文
    if (!command.tenantContext) {
      return CommandResult.failure("缺少租户上下文", "MISSING_TENANT_CONTEXT");
    }

    // 使用租户上下文创建用户
    const tenantId = command.tenantContext.tenantId;
    const organizationId = command.tenantContext.organizationId;
    const departmentId = command.tenantContext.departmentId;

    const user = new User(tenantId, organizationId!, departmentId!, command.email, command.name);

    // 保存用户（仓储自动验证租户隔离）
    await this.userRepository.save(user);

    return CommandResult.success(user.id, "用户创建成功");
  }
}
```

### 6. 在查询中使用租户上下文

```typescript
import { BaseQuery } from "@hl8/application-kernel";

export class GetUsersQuery extends BaseQuery<User[]> {
  public readonly tenantContext?: TenantContext; // 自动注入

  constructor(options?: { tenantContext?: TenantContext; pagination?: { page: number; limit: number } }) {
    super("GetUsers", options);
    this.tenantContext = options?.tenantContext;
  }

  clone(): GetUsersQuery {
    return new GetUsersQuery({
      tenantContext: this.tenantContext,
      pagination: this.pagination,
    });
  }
}

// 查询处理器
export class GetUsersHandler extends BaseQueryHandler<GetUsersQuery, User[]> {
  async executeQuery(query: GetUsersQuery): Promise<QueryResult<User[]>> {
    if (!query.tenantContext) {
      return QueryResult.failure("缺少租户上下文", "MISSING_TENANT_CONTEXT");
    }

    // 仓储自动应用租户过滤
    const users = await this.userRepository.findAllByContext(query.tenantContext);

    return QueryResult.success(users);
  }
}
```

## 中间件配置

租户上下文中间件会自动从 HTTP 请求中提取租户信息并注入到命令/查询中。确保在应用启动时注册中间件：

```typescript
import { TenantContextMiddleware } from "@hl8/application-kernel";
import { TenantContextExtractorImpl } from "@hl8/application-kernel";

// 在应用模块中配置
@Module({
  providers: [
    TenantContextExtractorImpl,
    TenantContextMiddleware,
    // ... 其他提供者
  ],
})
export class AppModule {
  constructor(
    private readonly commandQueryBus: ICommandQueryBus,
    private readonly tenantContextMiddleware: TenantContextMiddleware,
  ) {}

  onModuleInit() {
    // 注册中间件
    this.commandQueryBus.addMiddleware(this.tenantContextMiddleware);
  }
}
```

## 性能优化建议

1. **数据库索引**: 确保为 `tenant_id`、`organization_id`、`department_id` 创建了适当的索引
2. **上下文缓存**: 租户上下文信息会被自动缓存，减少重复查询
3. **批量查询**: 使用仓储的批量查询方法时，租户过滤条件会自动优化

## 安全注意事项

1. **默认严格隔离**: 默认情况下，系统严格隔离数据，不会自动包含跨层级数据
2. **权限验证**: 所有跨层级访问都需要显式授予权限
3. **上下文验证**: 如果无法提取租户上下文，请求会被立即拒绝（403 Forbidden）

## 更多示例

查看完整示例和最佳实践，请参考：

- [规范文档](./spec.md)
- [数据模型文档](./data-model.md)
- [Domain Kernel 文档](../../libs/kernel/domain-kernel/README.md)
- [Application Kernel 文档](../../libs/kernel/application-kernel/README.md)
