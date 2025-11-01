# 多租户和多层级数据隔离设计方案

## 概述

本文档阐述 hl8-platform SAAS 平台的多租户和多层级数据隔离完整设计方案。

## 文档结构

### 1. [规范文档 (spec.md)](./spec.md)

完整的特性规范文档，包含：

- **用户场景**: 6个核心用户故事，涵盖租户隔离、多层级隔离、上下文注入等场景
- **架构设计**: 9个核心组件的详细设计
  - TenantId（租户标识符）
  - OrganizationId（组织标识符）
  - DepartmentId（部门标识符）
  - TenantContext（租户上下文）
  - TenantIsolatedEntity（租户隔离实体）
  - TenantIsolatedAggregateRoot（租户隔离聚合根）
  - ITenantIsolatedRepository（租户隔离仓储接口）
  - TenantContextMiddleware（上下文中间件）
  - ITenantContextExtractor（上下文提取器）
- **实现计划**: 6个阶段的详细实施计划
- **技术考虑**: 性能优化、安全性、可扩展性

### 2. [数据模型文档 (data-model.md)](./data-model.md)

详细的数据模型和接口定义，包含：

- **值对象**: TenantId、OrganizationId、DepartmentId、TenantContext 的完整属性、方法和验证规则
- **实体增强**: TenantIsolatedEntity 和 TenantIsolatedAggregateRoot 的数据模型
- **命令查询增强**: BaseCommand 和 BaseQuery 的租户上下文支持
- **仓储接口**: ITenantIsolatedRepository 的方法定义
- **中间件组件**: 各种中间件和接口的定义
- **数据库设计**: 表结构和索引设计建议

## 核心设计理念

### 1. 透明隔离机制

开发者在使用框架时无需关心租户隔离的细节，框架自动处理：

- 自动从请求中提取租户信息
- 自动将租户上下文注入到命令/查询
- 自动在仓储查询中应用租户过滤
- 自动在领域事件中包含租户信息

### 2. 多层隔离支持

支持多层级的数据隔离：

- **租户级别**: 所有数据按租户隔离（必需）
- **组织级别**: 租户内按组织隔离（可选）
- **部门级别**: 组织内按部门隔离（可选）
- **数据隔离顺序**: 数据首先按租户隔离，租户内按组织隔离，组织内按部门隔离
- **可扩展**: 支持未来扩展更多层级（团队等）

### 3. 安全性保障

确保数据隔离的安全性：

- 多层验证：请求层、命令层、仓储层
- 权限控制：跨租户访问需要管理员权限
- 审计日志：记录所有跨租户操作

### 4. 性能优化

确保隔离机制不影响系统性能：

- 数据库索引：为租户和组织字段创建索引
- 查询优化：使用索引优化过滤查询
- 上下文缓存：缓存租户上下文信息

## 快速开始

### 阶段1: 基础组件（P1）

1. 实现 TenantId 和 OrganizationId 值对象
2. 实现 TenantContext 值对象
3. 编写单元测试

### 阶段2: 实体增强（P1）

1. 创建 TenantIsolatedEntity 基类
2. 创建 TenantIsolatedAggregateRoot 基类
3. 编写单元测试

### 阶段3: 仓储增强（P1）

1. 定义 ITenantIsolatedRepository 接口
2. 编写接口文档和示例实现

### 阶段4: 应用层中间件（P1）

1. 实现 ITenantContextExtractor 接口
2. 实现 TenantContextMiddleware
3. 集成到命令查询总线
4. 编写集成测试

### 阶段5: 命令查询增强（P1）

1. 增强 BaseCommand，添加 tenantContext 属性
2. 增强 BaseQuery，添加 tenantContext 属性
3. 更新验证逻辑
4. 编写单元测试

### 阶段6: 权限和验证（P2）

1. 实现 ITenantPermissionValidator 接口
2. 实现跨租户访问支持
3. 编写单元测试和集成测试

## 使用示例

### 创建租户隔离实体

```typescript
// 定义租户隔离实体
class User extends TenantIsolatedEntity {
  constructor(
    tenantId: TenantId,
    organizationId: OrganizationId,
    private readonly email: string,
    private readonly name: string
  ) {
    super(tenantId, organizationId);
  }
  
  // 实现抽象方法
  clone(): User {
    return new User(
      this.tenantId,
      this.organizationId!,
      this.email,
      this.name
    );
  }
  
  validateBusinessRules(): boolean {
    // 业务规则验证
    return this.email.includes('@') && this.name.length > 0;
  }
  
  executeBusinessLogic(operation: string, params: unknown): unknown {
    // 业务逻辑执行
    return {};
  }
}
```

### 创建租户隔离聚合根

```typescript
// 定义租户隔离聚合根
class Order extends TenantIsolatedAggregateRoot {
  constructor(
    tenantId: TenantId,
    organizationId: OrganizationId,
    private readonly items: OrderItem[]
  ) {
    super(tenantId, organizationId);
  }
  
  // 实现抽象方法
  protected performCoordination(operation: string, params: unknown): unknown {
    // 协调业务操作
    return {};
  }
  
  protected performBusinessInvariantValidation(): boolean {
    // 业务不变量验证
    return this.items.length > 0;
  }
  
  clone(): Order {
    return new Order(
      this.tenantId,
      this.organizationId!,
      [...this.items]
    );
  }
  
  validateBusinessRules(): boolean {
    return true;
  }
  
  executeBusinessLogic(operation: string, params: unknown): unknown {
    return {};
  }
}
```

### 使用租户隔离仓储

```typescript
// 仓储实现自动应用租户过滤
class UserRepository implements ITenantIsolatedRepository<User> {
  async findByIdWithContext(
    id: EntityId,
    context: TenantContext
  ): Promise<User | null> {
    // 自动添加租户过滤条件
    const user = await db.query(
      'SELECT * FROM users WHERE id = ? AND tenant_id = ?',
      [id.value, context.tenantId.value]
    );
    return user ? this.mapToEntity(user) : null;
  }
  
  async findAllByContext(context: TenantContext): Promise<User[]> {
    // 自动应用租户和组织过滤
    let query = 'SELECT * FROM users WHERE tenant_id = ?';
    const params = [context.tenantId.value];
    
    if (context.organizationId) {
      query += ' AND organization_id = ?';
      params.push(context.organizationId.value);
    }
    
    const users = await db.query(query, params);
    return users.map(u => this.mapToEntity(u));
  }
}
```

## 架构集成

该设计方案与现有架构无缝集成：

- **Clean Architecture**: 租户隔离机制在各层正确实现
- **CQRS**: 命令和查询都支持租户上下文
- **事件溯源**: 领域事件自动包含租户信息
- **事件驱动**: 事件处理自动应用租户过滤

## 关键特性

✅ **自动隔离**: 框架自动处理租户隔离，无需手动编码  
✅ **多层支持**: 支持租户、组织等多层级隔离  
✅ **安全可靠**: 多层验证确保数据安全  
✅ **性能优化**: 索引和查询优化确保性能  
✅ **透明使用**: 开发者无需关心隔离细节  
✅ **可扩展性**: 支持未来扩展更多层级和功能  

## 相关文档

- [规范文档](./spec.md) - 完整的设计规范
- [数据模型](./data-model.md) - 详细的数据模型定义
- [Domain Kernel README](../../libs/kernel/domain-kernel/README.md) - 领域核心模块文档
- [Application Kernel README](../../libs/kernel/application-kernel/README.md) - 应用核心模块文档
