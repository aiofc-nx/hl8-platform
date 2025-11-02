# Repository Interface Contracts

**Feature**: Infrastructure Kernel Enhancement and Alignment  
**Date**: 2025-01-22  
**Purpose**: 定义 infrastructure-kernel 必须实现的仓储接口契约

## Overview

Infrastructure Kernel 必须实现以下 domain-kernel 定义的接口：

1. **IRepository<T>** - 基础仓储接口
2. **ITenantIsolatedRepository<T>** - 租户隔离仓储接口
3. **IQueryRepository<T>** - 查询仓储接口（可选，如果支持规范模式）

## IRepository<T> Contract

### Interface Definition

```typescript
export interface IRepository<T> {
  findById(id: EntityId): Promise<T | null>;
  save(entity: T): Promise<void>;
  delete(id: EntityId): Promise<void>;
  exists(id: EntityId): Promise<boolean>;
}
```

### Required Implementation

**Infrastructure-kernel MUST implement**:

- `MikroORMRepository<T>` 类必须实现 `IRepository<T>` 接口
- 所有方法必须正确实现，不能抛出未捕获的异常（异常必须包装为 RepositoryException）
- `findAll()` 和 `count()` 方法虽然不在接口中，但应该在实现中提供（FR-003）

### Contract Compliance

- ✅ TypeScript 编译器必须验证实现符合接口
- ✅ 所有方法签名必须与接口完全匹配
- ✅ 返回类型必须符合接口定义
- ✅ 异常类型必须符合 domain-kernel 异常体系

---

## ITenantIsolatedRepository<T> Contract

### Interface Definition

```typescript
export interface ITenantIsolatedRepository<T extends TenantIsolatedEntity>
  extends IRepository<T> {
  findByIdWithContext(id: EntityId, context: TenantContext): Promise<T | null>;
  findAllByContext(context: TenantContext): Promise<T[]>;
  findByTenant(tenantId: TenantId, context: TenantContext): Promise<T[]>;
  findByOrganization(orgId: OrganizationId, context: TenantContext): Promise<T[]>;
  findByDepartment(deptId: DepartmentId, context: TenantContext): Promise<T[]>;
  belongsToTenant(id: EntityId, tenantId: TenantId): Promise<boolean>;
  belongsToOrganization(id: EntityId, orgId: OrganizationId): Promise<boolean>;
  belongsToDepartment(id: EntityId, deptId: DepartmentId): Promise<boolean>;
  findByIdCrossTenant(id: EntityId, context: TenantContext): Promise<T | null>;
  countByTenant(tenantId: TenantId, context: TenantContext): Promise<number>;
  countByOrganization(orgId: OrganizationId, context: TenantContext): Promise<number>;
  countByDepartment(deptId: DepartmentId, context: TenantContext): Promise<number>;
}
```

### Required Implementation

**Infrastructure-kernel MUST implement**:

- `MikroORMTenantIsolatedRepository<T>` 类必须正式实现 `ITenantIsolatedRepository<T>` 接口
- 解决类型约束冲突：通过泛型和类型转换处理领域实体和持久化实体的类型差异
- 所有方法必须自动应用租户隔离过滤
- 跨租户访问必须验证权限（context.isCrossTenant）

### Contract Compliance

- ✅ TypeScript 编译器必须验证实现符合接口（零错误）
- ✅ 所有方法必须正确实现
- ✅ 租户隔离过滤必须 100% 准确
- ✅ 跨租户访问必须 100% 阻止（除非有权限）

---

## IEventStore Contract

### Interface Definition

见 `libs/kernel/application-kernel/src/events/store/event-store.interface.ts`

### Required Implementation

**Infrastructure-kernel MUST implement**:

- `MikroORMEventStore` 类必须实现 `IEventStore` 接口（来自 application-kernel）
- 所有方法必须使用数据库持久化（PostgreSQL 或 MongoDB）
- 事件必须持久化到 `event_store` 表/集合
- 快照必须持久化到 `event_snapshots` 表/集合

### Contract Compliance

- ✅ 必须支持 100,000+ 事件/聚合
- ✅ 查询性能必须 < 100ms（10万条记录内）
- ✅ 乐观并发控制必须通过 expectedVersion 实现
- ✅ 事件流必须按版本号排序返回

---

## Transaction Manager Contract

### Interface Definition

**Infrastructure-kernel 定义的接口**（独立于 @hl8/database）：

```typescript
export interface ITransactionManager {
  begin(): Promise<TransactionContext>;
  commit(context: TransactionContext): Promise<void>;
  rollback(context: TransactionContext): Promise<void>;
  runInTransaction<T>(
    callback: (em: EntityManager) => Promise<T>
  ): Promise<T>;
  getCurrentContext(): TransactionContext | null;
}
```

### Required Implementation

- `MikroORMTransactionManager` 类必须实现 `ITransactionManager` 接口
- 支持嵌套事务（最多 5 层）
- 自动回滚机制：异常时自动回滚
- 事务上下文管理：使用 CLS（Continuation Local Storage）或类似机制

---

## Entity Mapper Contract

### Interface Definition

```typescript
export interface IEntityMapper<TDomain, TPersistence> {
  toDomain(persistence: TPersistence): TDomain;
  toPersistence(domain: TDomain): TPersistence;
  toDomainList(persistenceList: TPersistence[]): TDomain[];
  toPersistenceList(domainList: TDomain[]): TPersistence[];
}
```

### Required Implementation

- 自动映射：简单属性自动映射（同名同类型）
- 手动配置：复杂场景（嵌套聚合、自定义转换）通过配置覆盖
- 数据完整性：映射后必须验证领域实体不变量
- 100% 属性映射准确率（无数据丢失）

---

## Specification Query Converter Contract

### Interface Definition

```typescript
export interface ISpecificationConverter<T> {
  convertToQuery(spec: ISpecification<T>): QueryCriteria;
  convertAnd(
    left: ISpecification<T>,
    right: ISpecification<T>
  ): QueryCriteria;
  convertOr(
    left: ISpecification<T>,
    right: ISpecification<T>
  ): QueryCriteria;
  convertNot(spec: ISpecification<T>): QueryCriteria;
}
```

### Required Implementation

- 支持规范嵌套深度 ≤ 5 层
- 自动应用租户过滤（如果规范用于租户隔离仓储）
- 查询结果必须与内存评估结果 100% 一致

---

## Repository Factory Contract

### Interface Definition

```typescript
export interface IRepositoryFactory {
  createRepository<T>(
    entityType: string,
    em: EntityManager
  ): IRepository<T> | ITenantIsolatedRepository<T>;
  registerMapper<TDomain, TPersistence>(
    mapper: IEntityMapper<TDomain, TPersistence>
  ): void;
  getMapper<TDomain, TPersistence>(): IEntityMapper<TDomain, TPersistence>;
}
```

### Required Implementation

- 根据实体类型自动选择仓储类型（普通或租户隔离）
- 支持 NestJS 依赖注入注册
- 映射器注册和获取

---

## Compliance Verification

### Type Safety

- ✅ 所有接口实现必须通过 TypeScript 编译检查
- ✅ 接口方法签名必须完全匹配
- ✅ 泛型约束必须正确

### Runtime Behavior

- ✅ 异常类型必须符合 domain-kernel 定义
- ✅ 租户隔离必须 100% 准确
- ✅ 事务管理必须保证 ACID 特性

### Integration Tests

- ✅ 与 domain-kernel 接口对齐测试
- ✅ 与 application-kernel 接口对齐测试
- ✅ 端到端集成测试

