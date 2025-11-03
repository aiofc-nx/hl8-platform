# Data Model: Infrastructure Kernel Core Module

**Feature**: Infrastructure Kernel Core Module  
**Date**: 2025-11-02  
**Phase**: Phase 1 - Design

## Overview

Infrastructure Kernel 数据模型定义了数据库持久化层的数据结构，使用 MikroORM 作为统一 ORM 框架。数据模型分为两个层次：

1. **持久化实体 (Persistence Entities)**: MikroORM 实体定义，映射到数据库表/集合
2. **仓储接口 (Repository Interfaces)**: 数据访问抽象，实现领域层定义的接口
3. **映射器 (Mappers)**: 领域实体和持久化实体之间的转换器

## Core Persistent Entities

### BaseEntity (持久化基础实体)

**Purpose**: MikroORM 持久化实体的基类，提供审计和时间戳功能

**Key Attributes**:

- `id: string` - 实体唯一标识符（UUID v4，主键）
- `createdAt: Date` - 创建时间（自动设置）
- `updatedAt: Date` - 更新时间（自动更新）
- `version: number` - 乐观锁定版本号
- `deletedAt?: Date` - 软删除时间戳（可选）

**Decorators**:

```typescript
@PrimaryKey()
id!: string;

@Property()
createdAt = new Date();

@Property({ onUpdate: () => new Date() })
updatedAt = new Date();

@Property({ version: true })
version!: number;

@Property({ nullable: true })
deletedAt?: Date;
```

**Relationships**: 被所有持久化实体继承

---

### TenantIsolatedPersistenceEntity (租户隔离持久化实体)

**Purpose**: 支持租户隔离的持久化实体基类

**Key Attributes**:

- 继承自 `BaseEntity`
- `tenantId: string` - 租户ID（必填）
- `organizationId?: string` - 组织ID（可选）
- `departmentId?: string` - 部门ID（可选）

**Decorators**:

```typescript
@Entity()
export abstract class TenantIsolatedPersistenceEntity extends BaseEntity {
  @Index()
  @Property()
  tenantId!: string;

  @Index()
  @Property({ nullable: true })
  organizationId?: string;

  @Index()
  @Property({ nullable: true })
  departmentId?: string;
}
```

**Validation Rules**:

- tenantId 必填
- organizationId 存在时必须属于 tenantId
- departmentId 存在时必须属于 organizationId

**Relationships**: 被所有需要租户隔离的持久化实体继承

**Note**: 此实体映射到 Domain Kernel 的 `TenantIsolatedEntity` 领域实体，通过 Mapper 进行转换

---

## Repository Interfaces

### Repository<T> (通用仓储基类)

**Purpose**: 通用仓储接口，提供基本的 CRUD 操作

**Key Methods**:

- `save(entity: T): Promise<T>` - 保存实体
- `findById(id: EntityId): Promise<T | null>` - 根据ID查找
- `findAll(): Promise<T[]>` - 查找所有实体
- `delete(id: EntityId): Promise<void>` - 删除实体
- `exists(id: EntityId): Promise<boolean>` - 检查实体是否存在
- `count(): Promise<number>` - 统计实体数量

**Implementation**:

```typescript
class MikroORMRepository<T extends BaseEntity> implements IRepository<T> {
  constructor(
    protected readonly em: EntityManager,
    protected readonly entityName: string,
  ) {}

  async save(entity: T): Promise<T> {
    this.em.persist(entity);
    await this.em.flush();
    return entity;
  }

  async findById(id: EntityId): Promise<T | null> {
    return this.em.findOne(this.entityName, { id: id.value });
  }

  // ... 其他方法实现
}
```

---

### TenantIsolatedRepository<T> (租户隔离仓储基类)

**Purpose**: 支持租户隔离的仓储接口，自动应用过滤条件

**Key Methods**:

- `findByIdWithContext(id: EntityId, context: TenantContext): Promise<T | null>` - 根据ID和上下文查找
- `findAllByContext(context: TenantContext): Promise<T[]>` - 根据上下文查找所有
- `findByTenant(tenantId: TenantId, context: TenantContext): Promise<T[]>` - 按租户查找
- `findByOrganization(orgId: OrganizationId, context: TenantContext): Promise<T[]>` - 按组织查找
- `findByDepartment(deptId: DepartmentId, context: TenantContext): Promise<T[]>` - 按部门查找

**Implementation**:

```typescript
class MikroORMTenantIsolatedRepository<T extends TenantIsolatedEntity> extends MikroORMRepository<T> implements ITenantIsolatedRepository<T> {
  async findByIdWithContext(id: EntityId, context: TenantContext): Promise<T | null> {
    const filters = this.buildTenantFilters(context);
    return this.em.findOne(this.entityName, {
      id: id.value,
      ...filters,
    });
  }

  async findAllByContext(context: TenantContext): Promise<T[]> {
    const filters = this.buildTenantFilters(context);
    return this.em.find(this.entityName, filters);
  }

  private buildTenantFilters(context: TenantContext): object {
    const filters: any = { tenantId: context.tenantId.value };

    if (context.organizationId) {
      filters.organizationId = context.organizationId.value;
    }

    if (context.departmentId) {
      filters.departmentId = context.departmentId.value;
    }

    return filters;
  }
}
```

---

## Tenant Filter (租户过滤器)

**Purpose**: MikroORM Filter 定义，自动为所有查询添加租户过滤

**Key Attributes**:

- `name: 'tenant'` - 过滤器名称
- `cond: (args: TenantFilterArgs) => object` - 过滤条件生成函数

**Implementation**:

```typescript
export interface TenantFilterArgs {
  tenantId: string;
  organizationId?: string;
  departmentId?: string;
}

@Filter({
  name: 'tenant',
  cond: (args: TenantFilterArgs) => ({
    tenantId: args.tenantId,
    ...(args.organizationId && { organizationId: args.organizationId }),
    ...(args.departmentId && { departmentId: args.departmentId }),
  }),
  default: false, // 默认不启用，需要显式启用
})
```

**Usage**:

```typescript
// 启用租户过滤器
const entities = await em.find(
  Entity,
  {},
  {
    filters: {
      tenant: {
        tenantId: context.tenantId.value,
        organizationId: context.organizationId?.value,
      },
    },
  },
);
```

---

## Entity Mapper (实体映射器)

**Purpose**: 领域实体和持久化实体之间的转换器

### GenericMapper<TDomain, TPersistence>

**Key Methods**:

- `toDomain(persistence: TPersistence): TDomain` - 转换为领域实体
- `toPersistence(domain: TDomain): TPersistence` - 转换为持久化实体
- `toDomainList(persistenceList: TPersistence[]): TDomain[]` - 批量转换领域实体
- `toPersistenceList(domainList: TDomain[]): TPersistence[]` - 批量转换持久化实体

**Implementation Pattern**:

```typescript
abstract class GenericMapper<TDomain, TPersistence> {
  abstract toDomain(persistence: TPersistence): TDomain;

  abstract toPersistence(domain: TDomain): TPersistence;

  toDomainList(persistenceList: TPersistence[]): TDomain[] {
    return persistenceList.map((p) => this.toDomain(p));
  }

  toPersistenceList(domainList: TDomain[]): TPersistence[] {
    return domainList.map((d) => this.toPersistence(d));
  }
}
```

**Example: UserMapper**:

```typescript
class UserMapper extends GenericMapper<User, UserEntity> {
  toDomain(persistence: UserEntity): User {
    return new User(TenantId.fromString(persistence.tenantId), persistence.id, persistence.email, persistence.name);
  }

  toPersistence(domain: User): UserEntity {
    const entity = new UserEntity();
    entity.id = domain.id.value;
    entity.tenantId = domain.tenantId.value;
    entity.email = domain.email;
    entity.name = domain.name;
    entity.version = domain.version;
    return entity;
  }
}
```

---

## Database Configuration

### MikroORM Config

**Purpose**: MikroORM 配置定义，支持 PostgreSQL 和 MongoDB

**Key Attributes**:

- `entities: string[]` - 实体文件路径
- `migrations: { path: string, glob: string }` - 迁移配置
- `dbName: string` - 数据库名称
- `type: 'postgresql' | 'mongo'` - 数据库类型
- `pool: ConnectionPoolConfig` - 连接池配置
- `debug: boolean` - 调试模式

**Implementation**:

```typescript
import { Options } from "@mikro-orm/core";
import { Config } from "@hl8/config";

const databaseConfig = Config.get("database");

export const mikroOrmConfig: Options = {
  entities: ["./dist/src/entities/**/*.js"],
  entitiesTs: ["./src/entities/**/*.ts"],
  migrations: {
    path: "./dist/migrations",
    pathTs: "./migrations",
    glob: "*.{js,ts}",
  },
  dbName: databaseConfig.name,
  type: databaseConfig.type,
  host: databaseConfig.host,
  port: databaseConfig.port,
  user: databaseConfig.user,
  password: databaseConfig.password,
  pool: {
    min: databaseConfig.pool.min,
    max: databaseConfig.pool.max,
  },
  debug: databaseConfig.debug,
  logger: (message) => Logger.debug(message),
};
```

---

## Database Schema

### PostgreSQL Schema

**Tables**:

- `users` - 用户表
- `organizations` - 组织表
- `departments` - 部门表

**Example: Users Table**:

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  organization_id UUID,
  department_id UUID,
  email VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  version INTEGER NOT NULL DEFAULT 1,
  deleted_at TIMESTAMP,

  CONSTRAINT fk_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  CONSTRAINT fk_organization FOREIGN KEY (organization_id) REFERENCES organizations(id),
  CONSTRAINT fk_department FOREIGN KEY (department_id) REFERENCES departments(id)
);

-- 索引
CREATE INDEX idx_users_tenant ON users(tenant_id);
CREATE INDEX idx_users_org ON users(tenant_id, organization_id);
CREATE INDEX idx_users_dept ON users(tenant_id, organization_id, department_id);
CREATE INDEX idx_users_email ON users(email);
```

**MongoDB Collections**:

- `users` - 用户集合
- `organizations` - 组织集合
- `departments` - 部门集合

**Example: Users Collection Index**:

```javascript
db.users.createIndex({ tenantId: 1 });
db.users.createIndex({ tenantId: 1, organizationId: 1 });
db.users.createIndex({ tenantId: 1, organizationId: 1, departmentId: 1 });
db.users.createIndex({ email: 1 });
```

---

## Migrations

### Migration Pattern

**Structure**:

```typescript
import { Migration } from "@mikro-orm/migrations";

export class Migration20250102000000 extends Migration {
  async up(): Promise<void> {
    // PostgreSQL
    this.addSql("CREATE TABLE users (...)");
    this.addSql("CREATE INDEX idx_users_tenant ON users(tenant_id)");

    // MongoDB (通过 raw queries)
    // MongoDB migrations handled via collection operations
  }

  async down(): Promise<void> {
    this.addSql("DROP TABLE users");
  }
}
```

**Migration Execution**:

```bash
# 生成迁移
pnpm mikro-orm migration:create

# 执行迁移
pnpm mikro-orm migration:up

# 回滚
pnpm mikro-orm migration:down

# 检查待执行迁移
pnpm mikro-orm migration:pending
```

---

## Validation Rules

### Entity Validation

- 所有ID必须为有效的 UUID v4 格式
- 时间戳必须为有效的 Date 对象
- version 必须为正整数
- 租户隔离字段必须符合层级关系：
  - organizationId 存在时，tenantId 必须有效
  - departmentId 存在时，organizationId 必须有效

### Repository Validation

- 所有查询操作必须包含租户过滤（对于租户隔离实体）
- 跨租户访问尝试必须被阻止
- 版本冲突必须抛出 OptimisticLockException
- 事务边界必须正确设置

---

## State Transitions

### Entity Lifecycle

```
[New] --persist()--> [Managed] --flush()--> [Persisted]
                                            |
                                            |--delete()--> [Removed]
                                            |--detach()--> [Detached]
```

### Transaction Lifecycle

```
[Idle] --begin()--> [Active] --commit()--> [Committed] --end()--> [Idle]
                                           |
                                           |--rollback()--> [RolledBack]
```

---

## Error Handling

### Exception Types

- `RepositoryException` - 仓储操作异常基类
- `ConnectionException` - 数据库连接异常
- `TransactionException` - 事务处理异常
- `OptimisticLockException` - 乐观锁定冲突
- `TenantAccessDeniedException` - 租户访问拒绝

---

## Summary

Infrastructure Kernel 数据模型通过 MikroORM 统一访问 PostgreSQL 和 MongoDB，提供：

1. **统一接口**: 两种数据库使用相同的 API
2. **自动过滤**: 通过 Filter 机制实现租户隔离
3. **类型安全**: 完整的 TypeScript 类型支持
4. **映射隔离**: 领域层和持久化层分离
5. **性能优化**: 索引和查询缓存
6. **事务管理**: Unit of Work 自动管理
