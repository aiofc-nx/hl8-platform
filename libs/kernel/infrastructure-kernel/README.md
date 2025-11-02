# @hl8/infrastructure-kernel

基础设施层核心模块 - 为 HL8 SAAS 平台提供统一的数据持久化能力

---

## 📋 概述

`@hl8/infrastructure-kernel` 是 HL8 SAAS 平台的基础设施层核心模块，提供：

- ✅ **统一ORM接口**: 使用 MikroORM 统一 PostgreSQL 和 MongoDB
- ✅ **标准仓储实现**: 实现 IRepository 和 ITenantIsolatedRepository
- ✅ **租户数据隔离**: 自动应用租户过滤条件
- ✅ **多级隔离**: 租户 → 组织 → 部门三级隔离
- ✅ **实体映射**: 领域实体和持久化实体转换
- ✅ **连接管理**: 基于 @hl8/database 的连接池和健康检查
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

## 🚀 快速开始

### 1. 使用基础仓储

```typescript
import { MikroORMRepository, BaseEntity } from '@hl8/infrastructure-kernel';
import { EntityManager, Entity, Property } from '@mikro-orm/core';
import { EntityId } from '@hl8/domain-kernel';

// 定义实体类
@Entity({ tableName: 'users', collection: 'users' })
class UserEntity extends BaseEntity {
  @Property()
  name!: string;
  
  @Property()
  email!: string;
}

// 创建仓储实例
const repository = new MikroORMRepository<UserEntity>(entityManager, 'UserEntity');

// 创建并保存实体
const user = new UserEntity();
user.id = '550e8400-e29b-41d4-a716-446655440000';
user.name = 'John Doe';
user.email = 'john@example.com';
await repository.save(user);

// 查找实体
const found = await repository.findById(new EntityId(user.id));

// 删除实体
await repository.delete(new EntityId(user.id));
```

### 2. 使用租户隔离仓储

```typescript
import { MikroORMTenantIsolatedRepository, TenantIsolatedPersistenceEntity } from '@hl8/infrastructure-kernel';
import { TenantContext, TenantId, OrganizationId, DepartmentId, EntityId } from '@hl8/domain-kernel';
import { EntityManager, Entity, Property } from '@mikro-orm/core';

// 定义租户隔离实体
@Entity({ tableName: 'documents', collection: 'documents' })
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
const repository = new MikroORMTenantIsolatedRepository<DocumentEntity>(entityManager, 'DocumentEntity');

// 自动应用租户过滤，仅返回当前租户的数据
const documents = await repository.findAllByContext(context);

// 按组织查找
const orgDocs = await repository.findByOrganization(orgId, context);

// 统计租户下的文档数量
const count = await repository.countByTenant(tenantId, context);
```

## 📚 核心组件

### Repositories (仓储)

- `MikroORMRepository<T>` - 基础仓储实现
  - 提供完整的 CRUD 操作（save, findById, findAll, delete, exists）
  - 兼容 PostgreSQL 和 MongoDB
  - 自动处理软删除
  - 乐观锁定支持
- `MikroORMTenantIsolatedRepository<T>` - 租户隔离仓储
  - 继承自 MikroORMRepository
  - 自动应用租户隔离过滤
  - 支持租户、组织、部门三级隔离
  - 跨租户访问保护

### Entities (持久化实体)

- `BaseEntity` - 基础持久化实体
  - id: UUID 主键
  - createdAt, updatedAt: 自动时间戳
  - version: 乐观锁定版本号
  - deletedAt: 软删除标记
  - 兼容 PostgreSQL 和 MongoDB
- `TenantIsolatedPersistenceEntity` - 租户隔离实体
  - 继承自 BaseEntity
  - tenantId: 租户标识（必需）
  - organizationId: 组织标识（可选）
  - departmentId: 部门标识（可选）
  - 自动验证层级一致性

### Filters (过滤器)

- `TenantFilter` - 租户过滤器
  - 支持租户、组织、部门多层级过滤
  - 可配置过滤条件
  - 与 TenantContext 集成

### Exceptions (异常)

- `InfrastructureRepositoryException` - 基础设施仓储异常基类
- 重新导出领域层仓储异常（RepositoryException 等）

### Health (健康检查)

- `DatabaseHealthChecker` - 数据库健康检查（由 @hl8/database 提供）

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

自动处理并发更新冲突：

```typescript
try {
  await repository.save(entity);
} catch (error) {
  if (error instanceof OptimisticLockError) {
    // 处理版本冲突
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

### MikroORM 配置示例

```typescript
import { MikroORM } from '@mikro-orm/core';
import { PostgreSqlDriver } from '@mikro-orm/postgresql';
import { BaseEntity, TenantIsolatedPersistenceEntity } from '@hl8/infrastructure-kernel';

const orm = await MikroORM.init({
  driver: PostgreSqlDriver,
  dbName: 'hl8_saas',
  entities: [BaseEntity, TenantIsolatedPersistenceEntity, /* 你的实体 */],
  debug: process.env.NODE_ENV === 'development',
});
```

## 📊 性能

- **连接池**: 基于 @hl8/database 的连接池管理
- **索引**: 自动为 tenantId, organizationId, departmentId 创建索引
- **查询优化**: 使用条件构建器避免 N+1 查询
- **批量操作**: 支持批量插入和更新

## 🤝 贡献

欢迎贡献！请遵循：

1. Fork 项目
2. 创建特性分支
3. 添加测试
4. 提交 Pull Request

## 📄 许可证

MIT

## 📞 支持

- 文档: 查看 [Wiki](../../wiki)
- 问题: [Issues](../../issues)
- 讨论: [Discussions](../../discussions)
