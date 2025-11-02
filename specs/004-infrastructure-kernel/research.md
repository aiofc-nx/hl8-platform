# Research: Infrastructure Kernel Core Module

**Feature**: 004-infrastructure-kernel  
**Date**: 2025-11-02  
**Status**: Complete

## Research Scope

本次研究关注基础设施层核心模块的技术选型和架构决策，重点在于数据库 ORM 选择、连接管理、查询构建和多租户数据隔离的实现策略。

## Findings

### 1. ORM/ODM 技术选型

**Decision**: 统一使用 MikroORM 作为 PostgreSQL 和 MongoDB 的统一 ORM 框架

**Rationale**:

- **统一接口**: MikroORM 支持 PostgreSQL 和 MongoDB，API 一致，降低学习成本
- **TypeScript 原生**: 完全使用 TypeScript 编写，类型支持优秀
- **Unit of Work 模式**: 提供自动变更追踪，减少手动管理
- **优秀的类型安全**: 编译时类型检查，减少运行时错误
- **活跃维护**: 社区活跃，文档完善
- **与 Clean Architecture 兼容**: 支持仓储模式，不强制侵入领域层

**Alternatives Considered**:

- **TypeORM**: 主要支持关系数据库，MongoDB 支持较弱 - 拒绝原因：双数据库支持不完善
- **Prisma**: 优秀的类型生成，但 MongoDB 支持实验性 - 拒绝原因：MongoDB 支持不稳定
- **原生驱动 (pg + mongodb)**: 完全控制 - 拒绝原因：需要大量样板代码，开发效率低
- **Mongoose**: 仅支持 MongoDB - 拒绝原因：无法统一 PostgreSQL 和 MongoDB 接口
- **MikroORM**: 统一接口，双数据库原生支持 - **选择**：最佳平衡

**Reference**:

- [MikroORM Documentation](https://mikro-orm.io/docs/)
- 项目 turbo.json 已包含 MikroORM 配置引用

### 2. 连接池管理策略

**Decision**: 使用 MikroORM 内置连接池 + 自定义健康检查

**Rationale**:

- MikroORM 使用 `pg-pool` 和 MongoDB 原生连接池，成熟稳定
- 自定义健康检查包装器提供监控和日志
- 避免引入额外的连接池抽象层
- 配置简单，易于维护

**Implementation**:

```typescript
// 连接池配置通过 MikroORM config
{
  pool: {
    min: 2,
    max: 10,
    acquireTimeoutMillis: 30000,
    createTimeoutMillis: 30000,
  }
}

// 健康检查作为封装层
class DatabaseHealthChecker {
  async checkConnection(em: EntityManager): Promise<boolean>
  async checkPostgreSQL(em: EntityManager): Promise<boolean>
  async checkMongoDB(em: EntityManager): Promise<boolean>
}
```

### 3. 多租户数据隔离实现

**Decision**: 通过 MikroORM Filter 机制自动应用租户过滤

**Rationale**:

- MikroORM 提供全局过滤器（Global Filters）机制
- 自动应用到所有查询，无需手动添加条件
- 支持参数化过滤，与 TenantContext 集成
- 性能可控，通过索引优化

**Implementation**:

```typescript
// 定义租户过滤器
@Filter({
  name: 'tenant',
  cond: (args: {tenantId: string}) => ({ tenantId: args.tenantId })
})

// 在查询时启用
em.find(Entity, {}, {
  filters: { tenant: { tenantId: context.tenantId.value } }
})
```

**Alternatives Considered**:

- **手动添加 WHERE 条件**: 拒绝原因：容易遗漏，维护成本高
- **数据库级 RLS**: 拒绝原因：MongoDB 不支持
- **Middleware 拦截**: 拒绝原因：实现复杂，性能开销大
- **MikroORM Filter**: **选择**：自动、类型安全、性能好

### 4. 乐观锁定实现

**Decision**: 使用 MikroORM @Version() 装饰器和 Unit of Work

**Rationale**:

- MikroORM 原生支持乐观锁定
- 自动处理并发冲突
- 版本号自动递增
- 与 Clean Architecture 兼容

**Implementation**:

```typescript
@Property({ type: 'number', version: true })
version!: number;

// MikroORM 自动检查 version，冲突时抛出 OptimisticLockException
```

**Reference**:

- [MikroORM Optimistic Locking](https://mikro-orm.io/docs/unit-of-work/#optimistic-locking)

### 5. 查询构建器设计

**Decision**: 使用 MikroORM QueryBuilder + 自定义租户过滤封装

**Rationale**:

- MikroORM QueryBuilder 提供完整的 SQL/MongoDB 查询能力
- 类型安全，编译时检查
- 自定义封装层提供更高级的抽象
- 支持复杂查询和聚合

**Implementation**:

```typescript
// 基础查询构建
const qb = em.createQueryBuilder(Entity);

// 租户隔离查询构建
class TenantIsolatedQueryBuilder {
  static build(em: EntityManager, context: TenantContext) {
    return em.createQueryBuilder(Entity)
      .where({ tenantId: context.tenantId.value });
  }
}
```

### 6. 实体映射策略

**Decision**: 在基础设施层定义 MikroORM Entity，映射领域实体

**Rationale**:

- Clean Architecture: 领域层保持纯净，不依赖 ORM
- 基础设施层负责持久化细节
- 使用 Mapper 模式转换领域实体和持久化实体
- 灵活处理两个层的差异

**Implementation**:

```typescript
// 领域实体（domain-kernel）
export class User extends TenantIsolatedEntity { ... }

// 持久化实体（infrastructure-kernel）
@Entity({ tableName: 'users' })
export class UserModel implements TenantIsolatedEntity {
  @PrimaryKey()
  id!: string;
  
  @Property()
  tenantId!: string;
  
  // ...
}

// Mapper
class UserMapper {
  static toDomain(model: UserModel): User
  static toPersistence(entity: User): UserModel
}
```

**Reference**:

- Clean Architecture: Repository 模式
- Domain Model vs Data Model 分离

### 7. 数据库迁移策略

**Decision**: 使用 MikroORM Migrator + SQL 脚本

**Rationale**:

- MikroORM 自动生成迁移脚本
- 支持向前和向后迁移
- 复杂迁移可以手动编写 SQL
- 与 CI/CD 流程集成

**Implementation**:

```bash
# MikroORM 自动生成迁移
pnpm mikro-orm migration:create

# 执行迁移
pnpm mikro-orm migration:up

# 回滚
pnpm mikro-orm migration:down
```

**Complex Migrations**:

- 手动编写 SQL 脚本放在 migrations/ 目录
- 通过 custom migrations 机制执行

### 8. 事务管理

**Decision**: 使用 MikroORM Unit of Work + 显式事务管理

**Rationale**:

- MikroORM Unit of Work 自动管理事务
- 支持嵌套事务
- 提供 flush() 和 commit() 控制
- 与 Clean Architecture 事务边界一致

**Implementation**:

```typescript
// 自动事务
await em.transactional(async (em) => {
  await em.persistAndFlush(entity);
});

// 显式事务
const trx = await em.transaction(async (trx) => {
  await trx.persist(entity);
  return trx.flush();
});
```

### 9. 错误处理和日志

**Decision**: 使用 @hl8/logger 集成 MikroORM 查询日志

**Rationale**:

- 统一的日志格式
- 结构化日志便于分析
- 性能监控和审计追踪
- 与平台日志系统一致

**Implementation**:

```typescript
// MikroORM 配置
{
  logger: (message: string) => logger.debug(message),
  debug: ['query', 'query-params'],
}
```

### 10. 性能优化策略

**Decision**: 索引优化 + 查询优化 + 连接池调优

**Rationale**:

- 为租户隔离字段创建复合索引
- 使用 MikroORM 查询缓存
- 连接池参数调优
- 批量操作优化

**Implementation**:

```sql
-- PostgreSQL 复合索引
CREATE INDEX idx_users_tenant_org_dept 
ON users(tenant_id, organization_id, department_id);

-- MongoDB 复合索引
db.users.createIndex(
  { tenantId: 1, organizationId: 1, departmentId: 1 }
);
```

### 11. 测试策略

**Decision**: 使用 TestContainers + 内存数据库

**Rationale**:

- TestContainers 提供真实的数据库环境
- 集成测试接近生产环境
- 支持并行测试
- 易于 CI/CD 集成

**Implementation**:

```typescript
// 集成测试设置
beforeAll(async () => {
  postgresContainer = await new PostgreSqlContainer().start();
  mongodbContainer = await new MongoContainer().start();
});
```

**Alternatives Considered**:

- **SQLite**: 拒绝原因：与 PostgreSQL 差异大
- **内存数据库**: 拒绝原因：测试不真实
- **Mock 数据库**: 拒绝原因：无法测试真实查询
- **TestContainers**: **选择**：真实、可并行、易集成

## Summary

通过上述研究和决策，我们选择 MikroORM 作为统一的 ORM 框架，实现了以下优势：

1. **统一接口**: PostgreSQL 和 MongoDB 使用相同的 API
2. **类型安全**: 完整的 TypeScript 支持
3. **自动过滤**: 通过 Filter 机制实现租户隔离
4. **简化开发**: Unit of Work 模式减少样板代码
5. **性能可控**: 索引优化和查询缓存
6. **易于测试**: TestContainers 提供真实环境
7. **平台集成**: 与 @hl8/logger、@hl8/config 无缝集成

所有技术决策都经过评估，选择了最适合 Clean Architecture + 多租户场景的方案。

