# 领域层对基础设施层的支持作用 - 培训文档

## 📋 目录

1. [概述](#概述)
2. [架构关系](#架构关系)
3. [核心支持组件](#核心支持组件)
4. [基础设施层实现模式](#基础设施层实现模式)
5. [实际应用示例](#实际应用示例)
6. [最佳实践](#最佳实践)
7. [总结](#总结)

---

## 概述

本文档阐述 `@hl8/domain-kernel`（领域层核心模块）对 `@hl8/infrastructure-kernel`（基础设施层核心模块）的支持作用，帮助开发者理解领域层如何为基础设施层提供接口定义、类型约束和业务抽象，确保数据持久化层的稳定性和一致性。

### 核心观点

- **领域层定义接口**：基础设施层实现领域层定义的接口（如 `IRepository`、`ITenantIsolatedRepository`）
- **依赖倒置原则**：基础设施层依赖领域层的抽象，而不是领域层依赖基础设施层
- **类型安全保证**：领域层提供完整的类型定义，确保基础设施层实现时的类型安全
- **业务语义保持**：基础设施层在持久化过程中保持业务语义的完整性
- **异常体系统一**：基础设施层将技术异常转换为领域层的异常类型

---

## 架构关系

### Clean Architecture 分层

```
┌─────────────────────────────────────┐
│      Interface Layer                │  接口层：API、DTO
├─────────────────────────────────────┤
│      Application Layer              │  应用层：用例编排
│      ↓ 依赖                         │
│      @hl8/application-kernel       │
├─────────────────────────────────────┤
│      Domain Layer                   │  领域层：业务逻辑和接口定义（本文档重点）
│      ↓ 提供接口和类型               │
│      @hl8/domain-kernel             │
├─────────────────────────────────────┤
│      Infrastructure Layer           │  基础设施层：技术实现（实现领域层接口）
│      ↓ 实现                         │
│      @hl8/infrastructure-kernel     │
└─────────────────────────────────────┘
```

### 依赖关系

**领域层 (Domain Layer)**:

- ✅ **定义接口**：定义仓储、工厂等核心接口
- ✅ **类型抽象**：提供实体、值对象等类型抽象
- ✅ **异常体系**：定义统一的异常类型体系
- ✅ **业务语义**：保持业务概念的完整性

**基础设施层 (Infrastructure Layer)**:

- ✅ **实现接口**：实现领域层定义的接口（如 `IRepository`）
- ✅ **技术适配**：将技术实现（MikroORM）适配到领域层接口
- ✅ **异常转换**：将技术异常转换为领域层异常
- ✅ **数据映射**：在持久化实体和领域实体之间转换

### 支持关系图谱

```
领域层 (domain-kernel)
├── 接口定义
│   ├── IRepository ──────────────→ 基础设施层仓储实现
│   ├── ITenantIsolatedRepository ─→ 基础设施层租户隔离仓储实现
│   ├── IFactory ──────────────────→ 基础设施层对象创建
│   └── ISpecification ────────────→ 基础设施层查询规范转换
│
├── 类型系统
│   ├── EntityId ──────────────────→ 基础设施层标识符处理
│   ├── Entity ────────────────────→ 基础设施层实体映射
│   ├── TenantIsolatedEntity ──────→ 基础设施层租户隔离实体映射
│   └── DomainEvent ───────────────→ 基础设施层事件存储
│
├── 标识符系统
│   ├── TenantId ───────────────────→ 基础设施层租户隔离
│   ├── OrganizationId ─────────────→ 基础设施层组织隔离
│   ├── DepartmentId ──────────────→ 基础设施层部门隔离
│   └── TenantContext ──────────────→ 基础设施层上下文管理
│
├── 查询抽象
│   ├── QueryCriteria ──────────────→ 基础设施层查询构建
│   ├── ISpecification ─────────────→ 基础设施层规范查询
│   └── QueryOperator ──────────────→ 基础设施层查询操作符
│
└── 异常体系
    ├── RepositoryException ────────→ 基础设施层异常转换
    ├── DomainException ────────────→ 基础设施层异常基类
    └── AggregateVersionConflictException ─→ 基础设施层乐观锁处理
```

---

## 核心支持组件

### 1. 仓储接口定义 (Repository Interface Definitions)

#### IRepository - 基础仓储接口

领域层定义仓储的核心接口，基础设施层实现这些接口。

**领域层定义**:

```typescript
// @hl8/domain-kernel
export interface IRepository<T extends AggregateRoot> {
  findById(id: EntityId): Promise<T | null>;
  save(aggregate: T): Promise<void>;
  delete(id: EntityId): Promise<void>;
  exists(id: EntityId): Promise<boolean>;
  findAll(): Promise<T[]>;
  count(): Promise<number>;
}
```

**基础设施层实现**:

```typescript
// @hl8/infrastructure-kernel - MikroORM仓储实现
import { IRepository, EntityId } from "@hl8/domain-kernel";
import { EntityManager } from "@mikro-orm/core";
import { BaseEntity } from "../entities/base/base-entity.js";

export class MikroORMRepository<T extends BaseEntity> implements IRepository<T> {
  constructor(
    protected readonly em: EntityManager,
    protected readonly entityName: string,
  ) {}

  async findById(id: EntityId): Promise<T | null> {
    try {
      const entity = await this.em.findOne(this.entityName, {
        id: id.value,
      });
      return entity as T | null;
    } catch (error) {
      // 转换为领域层异常
      throw this.exceptionConverter.convertToDomainException(error, "findById", this.entityName, id.value);
    }
  }

  async save(entity: T): Promise<void> {
    try {
      this.em.persist(entity);
      await this.em.flush();
    } catch (error) {
      throw this.exceptionConverter.convertToDomainException(error, "save", this.entityName, entity.id?.value);
    }
  }

  // ... 其他方法实现
}
```

**支持作用**:

- ✅ **接口契约**：定义清晰的仓储契约，基础设施层必须遵守
- ✅ **类型安全**：通过 TypeScript 泛型确保类型安全
- ✅ **抽象封装**：隐藏 MikroORM 等具体技术细节

---

#### ITenantIsolatedRepository - 租户隔离仓储接口

领域层定义租户隔离仓储接口，基础设施层实现多层级数据隔离。

**领域层定义**:

```typescript
// @hl8/domain-kernel
export interface ITenantIsolatedRepository<T extends TenantIsolatedAggregateRoot> extends IRepository<T> {
  findByIdWithContext(id: EntityId, context: TenantContext): Promise<T | null>;

  findAllByContext(context: TenantContext): Promise<T[]>;

  findByTenant(tenantId: TenantId, context: TenantContext): Promise<T[]>;

  belongsToTenant(id: EntityId, tenantId: TenantId): Promise<boolean>;

  belongsToOrganization(id: EntityId, organizationId: OrganizationId): Promise<boolean>;
}
```

**基础设施层实现**:

```typescript
// @hl8/infrastructure-kernel - 租户隔离仓储实现
import { ITenantIsolatedRepository, TenantContext, TenantId, OrganizationId, EntityId, BusinessException } from "@hl8/domain-kernel";
import { MikroORMRepository } from "../base/repository.base.js";

export class MikroORMTenantIsolatedRepository<T extends TenantIsolatedPersistenceEntity> extends MikroORMRepository<T> implements ITenantIsolatedRepository<T> {
  async findByIdWithContext(id: EntityId, context: TenantContext): Promise<T | null> {
    const entity = await super.findById(id);
    if (!entity) {
      return null;
    }

    // 验证租户访问权限（使用领域层提供的验证逻辑）
    this.validateTenantAccess(entity, context);

    return entity;
  }

  async findAllByContext(context: TenantContext): Promise<T[]> {
    // 构建租户隔离查询条件
    const where: Record<string, unknown> = {
      tenantId: context.tenantId.value,
    };

    if (context.organizationId) {
      where.organizationId = context.organizationId.value;
    }

    if (context.departmentId) {
      where.departmentId = context.departmentId.value;
    }

    return await this.em.find(this.entityName, where);
  }

  protected validateTenantAccess(entity: T, context: TenantContext): void {
    // 使用领域层的租户上下文验证
    if (entity.tenantId.value !== context.tenantId.value) {
      throw new BusinessException("跨租户访问被拒绝", "CROSS_TENANT_ACCESS_DENIED", {
        entityTenantId: entity.tenantId.value,
        contextTenantId: context.tenantId.value,
      });
    }

    // 验证组织和部门层级（如果指定）
    if (context.organizationId && entity.organizationId) {
      if (entity.organizationId.value !== context.organizationId.value) {
        throw new BusinessException("跨组织访问被拒绝", "CROSS_ORGANIZATION_ACCESS_DENIED");
      }
    }
  }
}
```

**支持作用**:

- ✅ **隔离抽象**：定义租户、组织、部门三级隔离的抽象接口
- ✅ **安全保证**：通过接口强制实现访问控制
- ✅ **业务语义**：保持租户隔离的业务语义

---

### 2. 标识符系统 (Identifier System)

#### EntityId - 实体标识符

领域层提供统一的标识符类型，基础设施层使用该类型进行数据操作。

**领域层定义**:

```typescript
// @hl8/domain-kernel
export class EntityId {
  public static generate(): EntityId;
  public static fromString(value: string): EntityId;
  public toString(): string;
  public isValid(): boolean;
  public equals(other: EntityId): boolean;
}
```

**基础设施层使用**:

```typescript
// @hl8/infrastructure-kernel - 仓储中的标识符使用
import { EntityId } from "@hl8/domain-kernel";

export class MikroORMRepository<T extends BaseEntity> {
  async findById(id: EntityId): Promise<T | null> {
    // 使用领域层的 EntityId，确保类型安全
    const entity = await this.em.findOne(this.entityName, {
      id: id.value, // EntityId 提供 value 属性
    });
    return entity as T | null;
  }

  async delete(id: EntityId): Promise<void> {
    // EntityId 确保标识符的有效性
    if (!id.isValid()) {
      throw new Error("无效的实体标识符");
    }

    const entity = await this.findById(id);
    if (entity) {
      await this.em.removeAndFlush(entity);
    }
  }
}
```

**基础设施层实体映射**:

```typescript
// @hl8/infrastructure-kernel - 实体映射器
import { EntityId } from "@hl8/domain-kernel";

export class EntityMapper<TDomain extends Entity, TPersistence extends BaseEntity> {
  toDomain(persistence: TPersistence): TDomain {
    // 将持久化实体的 ID 转换为领域层的 EntityId
    const domainData = {
      id: EntityId.fromString(persistence.id), // 使用领域层类型
      // ... 其他字段映射
    };

    return this.createDomainEntity(domainData);
  }

  toPersistence(domain: TDomain): TPersistence {
    // 将领域层的 EntityId 转换为持久化实体的 ID
    const persistenceData = {
      id: domain.id.value, // 使用 EntityId 的 value 属性
      // ... 其他字段映射
    };

    return this.createPersistenceEntity(persistenceData);
  }
}
```

**支持作用**:

- ✅ **类型安全**：避免字符串 ID 的类型混淆
- ✅ **格式统一**：确保整个系统使用一致的标识符格式
- ✅ **验证能力**：提供标识符有效性验证

---

#### 租户隔离标识符

领域层提供租户、组织、部门标识符，基础设施层用于多层级数据隔离。

**领域层定义**:

```typescript
// @hl8/domain-kernel
export class TenantId extends EntityId;
export class OrganizationId extends EntityId;
export class DepartmentId extends EntityId;

export class TenantContext {
  public readonly tenantId: TenantId;
  public readonly organizationId?: OrganizationId;
  public readonly departmentId?: DepartmentId;

  public validate(): boolean;
  public toJSON(): Record<string, unknown>;
}
```

**基础设施层使用**:

```typescript
// @hl8/infrastructure-kernel - 租户隔离实体
import { TenantId, OrganizationId, DepartmentId } from "@hl8/domain-kernel";

export class TenantIsolatedPersistenceEntity extends BaseEntity {
  // 使用领域层的租户标识符类型
  tenantId!: TenantId;
  organizationId?: OrganizationId;
  departmentId?: DepartmentId;

  // 在数据库层面存储为字符串，但使用领域层类型进行业务处理
  @Property({ type: "string" })
  get tenantIdValue(): string {
    return this.tenantId.value;
  }

  set tenantIdValue(value: string) {
    this.tenantId = TenantId.fromString(value);
  }
}
```

**支持作用**:

- ✅ **多层级隔离**：支持租户、组织、部门三级隔离
- ✅ **类型安全**：通过类型系统确保隔离字段的类型正确
- ✅ **业务语义**：保持租户隔离的业务语义

---

### 3. 实体映射系统 (Entity Mapping System)

#### Entity 和 AggregateRoot - 领域实体基类

领域层定义实体和聚合根的基类，基础设施层需要将持久化实体映射到这些类型。

**领域层定义**:

```typescript
// @hl8/domain-kernel
export abstract class Entity {
  protected readonly _id: EntityId;
  protected readonly _auditInfo: AuditInfo;
  protected readonly _lifecycle: EntityLifecycle;
  protected readonly _version: number;

  public get id(): EntityId;
  public get version(): number;
  public clone(): Entity;
}

export abstract class AggregateRoot extends Entity {
  protected _domainEvents: DomainEvent[] = [];

  public getDomainEvents(): DomainEvent[];
  public clearDomainEvents(): void;
}
```

**基础设施层实体映射**:

```typescript
// @hl8/infrastructure-kernel - 实体映射器
import { Entity, AggregateRoot, EntityId, AuditInfo, EntityLifecycle } from "@hl8/domain-kernel";

export class EntityMapper<TDomain extends Entity, TPersistence extends BaseEntity> {
  toDomain(persistence: TPersistence): TDomain {
    // 1. 基础字段映射（使用领域层类型）
    const domainData: Partial<TDomain> = {
      id: EntityId.fromString(persistence.id),
      version: persistence.version,
      // AuditInfo 需要从持久化实体构造
      auditInfo: this.mapAuditInfo(persistence),
      lifecycle: this.mapLifecycle(persistence),
    };

    // 2. 业务字段映射
    this.mapBusinessFields(persistence, domainData);

    // 3. 创建领域实体
    return this.createDomainEntity(domainData);
  }

  toPersistence(domain: TDomain): TPersistence {
    // 1. 基础字段映射
    const persistenceData = {
      id: domain.id.value,
      version: domain.version,
      createdAt: domain.auditInfo.createdAt,
      updatedAt: domain.auditInfo.updatedAt,
      // ... 其他审计字段
    };

    // 2. 业务字段映射
    this.mapBusinessFields(domain, persistenceData);

    // 3. 创建持久化实体
    return this.createPersistenceEntity(persistenceData);
  }

  protected mapAuditInfo(persistence: TPersistence): AuditInfo {
    // 使用领域层的 AuditInfo 构造
    return new AuditInfo(persistence.createdAt, persistence.updatedAt, persistence.createdBy, persistence.updatedBy, persistence.version);
  }

  protected mapLifecycle(persistence: TPersistence): EntityLifecycle {
    // 使用领域层的 EntityLifecycle 枚举
    if (persistence.deletedAt) {
      return EntityLifecycle.DELETED;
    }
    return EntityLifecycle.ACTIVE;
  }
}
```

**支持作用**:

- ✅ **类型保证**：确保映射后的实体符合领域层类型定义
- ✅ **业务完整性**：保持领域实体的业务逻辑完整性
- ✅ **生命周期管理**：正确映射实体的生命周期状态

---

### 4. 查询抽象系统 (Query Abstraction System)

#### QueryCriteria 和 ISpecification - 查询抽象

领域层提供查询抽象，基础设施层将其转换为具体数据库查询。

**领域层定义**:

```typescript
// @hl8/domain-kernel
export interface QueryCriteria {
  conditions?: QueryCondition[];
  sortBy?: { field: string; direction: "asc" | "desc" };
  pagination?: { page: number; pageSize: number };
  selectFields?: string[];
  distinct?: boolean;
}

export interface QueryCondition {
  field: string;
  operator: QueryOperator;
  value: unknown;
}

export enum QueryOperator {
  EQUALS = "equals",
  NOT_EQUALS = "not_equals",
  GREATER_THAN = "greater_than",
  LESS_THAN = "less_than",
  LIKE = "like",
  IN = "in",
  // ... 更多操作符
}

export interface ISpecification<T> {
  isSatisfiedBy(entity: T): boolean;
  and(other: ISpecification<T>): ISpecification<T>;
  or(other: ISpecification<T>): ISpecification<T>;
  not(): ISpecification<T>;
}

export interface IQuerySpecification<T> extends ISpecification<T> {
  getQueryCriteria(): QueryCriteria;
}
```

**基础设施层实现**:

```typescript
// @hl8/infrastructure-kernel - 规范转换器
import { ISpecification, IQuerySpecification, QueryCriteria, QueryOperator, AndSpecification, OrSpecification, NotSpecification } from "@hl8/domain-kernel";

export class SpecificationConverter implements ISpecificationConverter {
  convertToQuery<T>(spec: ISpecification<T>, entityName: string): MikroORMQueryOptions {
    // 如果规范实现了 IQuerySpecification，使用其查询条件
    if (this.isQuerySpecification(spec)) {
      return this.convertCriteriaToQuery(spec.getQueryCriteria());
    }

    // 否则递归转换组合规范
    return this.convertSpecificationToQuery(spec, 0);
  }

  convertCriteriaToQuery(criteria: QueryCriteria): MikroORMQueryOptions {
    const options: MikroORMQueryOptions = {};

    // 转换查询条件（使用领域层的 QueryOperator）
    if (criteria.conditions && criteria.conditions.length > 0) {
      options.where = this.convertConditionsToWhere(criteria.conditions);
    }

    // 转换排序
    if (criteria.sortBy) {
      options.orderBy = {
        [criteria.sortBy.field]: criteria.sortBy.direction,
      };
    }

    // 转换分页
    if (criteria.pagination) {
      options.limit = criteria.pagination.pageSize;
      options.offset = (criteria.pagination.page - 1) * criteria.pagination.pageSize;
    }

    return options;
  }

  protected convertConditionsToWhere(conditions: QueryCondition[]): Record<string, unknown> {
    const where: Record<string, unknown> = {};

    for (const condition of conditions) {
      // 使用领域层的 QueryOperator 映射到 MikroORM 操作符
      switch (condition.operator) {
        case QueryOperator.EQUALS:
          where[condition.field] = condition.value;
          break;
        case QueryOperator.NOT_EQUALS:
          where[condition.field] = { $ne: condition.value };
          break;
        case QueryOperator.GREATER_THAN:
          where[condition.field] = { $gt: condition.value };
          break;
        case QueryOperator.LESS_THAN:
          where[condition.field] = { $lt: condition.value };
          break;
        case QueryOperator.LIKE:
          where[condition.field] = { $like: `%${condition.value}%` };
          break;
        case QueryOperator.IN:
          where[condition.field] = { $in: condition.value };
          break;
        // ... 更多操作符映射
      }
    }

    return where;
  }

  protected convertSpecificationToQuery(spec: ISpecification<unknown>, depth: number): MikroORMQueryOptions {
    // 处理组合规范（使用领域层的组合规范类）
    if (spec instanceof AndSpecification) {
      const leftQuery = this.convertSpecificationToQuery(spec.left, depth + 1);
      const rightQuery = this.convertSpecificationToQuery(spec.right, depth + 1);
      return {
        ...leftQuery,
        where: { ...leftQuery.where, ...rightQuery.where },
      };
    }

    if (spec instanceof OrSpecification) {
      // OR 查询需要特殊处理（使用 $or 操作符）
      return {
        where: {
          $or: [this.convertSpecificationToQuery(spec.left, depth + 1).where, this.convertSpecificationToQuery(spec.right, depth + 1).where],
        },
      };
    }

    if (spec instanceof NotSpecification) {
      // NOT 查询需要特殊处理
      const innerQuery = this.convertSpecificationToQuery(spec.spec, depth + 1);
      return {
        where: {
          $not: innerQuery.where,
        },
      };
    }

    // 其他规范类型的转换...
    return {};
  }
}
```

**支持作用**:

- ✅ **查询抽象**：提供与技术无关的查询抽象
- ✅ **规范组合**：支持复杂的业务规则查询组合
- ✅ **类型安全**：通过接口确保查询的类型安全

---

### 5. 异常转换系统 (Exception Conversion System)

#### 领域异常体系

领域层定义统一的异常体系，基础设施层将技术异常转换为领域异常。

**领域层定义**:

```typescript
// @hl8/domain-kernel
export class DomainException extends Error {
  constructor(
    message: string,
    code: string,
    context?: Record<string, unknown>,
    cause?: Error
  );
}

export class RepositoryException extends DomainException;
export class RepositoryOperationFailedException extends RepositoryException;
export class RepositoryConnectionException extends RepositoryException;
export class RepositoryQueryException extends RepositoryException;
export class RepositoryTransactionException extends RepositoryException;

export class AggregateVersionConflictException extends DomainException {
  constructor(
    entityType: string,
    entityId: string,
    expectedVersion: number,
    actualVersion: number,
    cause?: Error
  );
}

export class EntityNotFoundException extends DomainException;
```

**基础设施层实现**:

```typescript
// @hl8/infrastructure-kernel - 异常转换器
import { DomainException, RepositoryOperationFailedException, RepositoryConnectionException, RepositoryQueryException, RepositoryTransactionException, AggregateVersionConflictException, EntityNotFoundException } from "@hl8/domain-kernel";
import { OptimisticLockError } from "@mikro-orm/core";

export class ExceptionConverter implements IExceptionConverter {
  convertToDomainException(error: unknown, operation: string, entityType: string, entityId?: string): DomainException {
    const originalError = error instanceof Error ? error : new Error(String(error));

    // 1. 检查乐观锁冲突（转换为领域层的版本冲突异常）
    if (this.isOptimisticLockException(error)) {
      let expectedVersion = 0;
      let actualVersion = 0;

      if (error instanceof OptimisticLockError) {
        // 从 OptimisticLockError 提取版本信息
        expectedVersion = 0; // 需要从上下文获取
        actualVersion = 0; // 需要从上下文获取
      }

      return new AggregateVersionConflictException(entityType, entityId || "unknown", expectedVersion, actualVersion, originalError);
    }

    // 2. 检查数据库连接失败
    if (this.isConnectionException(error)) {
      return new RepositoryConnectionException(entityType, originalError);
    }

    // 3. 检查查询错误
    if (this.isQueryException(error)) {
      return new RepositoryQueryException(originalError.message || operation, entityType, originalError);
    }

    // 4. 检查事务错误
    if (this.isTransactionException(error)) {
      return new RepositoryTransactionException(entityType, originalError);
    }

    // 5. 默认转换为通用仓储异常
    return new RepositoryOperationFailedException(`操作 ${operation} 失败`, operation, { entityType, entityId }, originalError);
  }

  protected isOptimisticLockException(error: unknown): boolean {
    return error instanceof OptimisticLockError;
  }

  protected isConnectionException(error: unknown): boolean {
    const errorMessage = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
    return errorMessage.includes("connection") || errorMessage.includes("network") || errorMessage.includes("timeout") || errorMessage.includes("econnrefused");
  }

  protected isQueryException(error: unknown): boolean {
    const errorMessage = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
    return errorMessage.includes("syntax error") || errorMessage.includes("invalid query") || errorMessage.includes("column") || errorMessage.includes("table");
  }

  protected isTransactionException(error: unknown): boolean {
    const errorMessage = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
    return errorMessage.includes("transaction") || errorMessage.includes("rollback") || errorMessage.includes("deadlock");
  }
}
```

**支持作用**:

- ✅ **异常标准化**：统一异常类型和结构
- ✅ **业务语义**：技术异常转换为业务语义的异常
- ✅ **上下文信息**：异常包含丰富的上下文信息

---

### 6. 领域事件支持 (Domain Event Support)

#### DomainEvent - 领域事件基类

领域层定义领域事件结构，基础设施层负责事件存储和恢复。

**领域层定义**:

```typescript
// @hl8/domain-kernel
export class DomainEvent {
  public readonly eventId: EntityId;
  public readonly aggregateRootId: EntityId;
  public readonly eventType: string;
  public readonly data: unknown;
  public readonly metadata: Record<string, unknown>;
  public readonly timestamp: Date;
  public readonly version: number;

  public toJSON(): Record<string, unknown>;
  public clone(): DomainEvent;
}
```

**基础设施层事件存储实现**:

```typescript
// @hl8/infrastructure-kernel - 事件存储实现
import { EntityId, DomainEvent as DomainEventBase } from "@hl8/domain-kernel";
import { IEventStore, DomainEvent as ApplicationDomainEvent } from "@hl8/application-kernel";

export class MikroORMEventStore implements IEventStore {
  async saveEvents(aggregateId: EntityId, events: ApplicationDomainEvent[], expectedVersion: number): Promise<EventStoreResult> {
    try {
      // 验证版本号（使用领域层的 EntityId）
      const currentVersion = await this.getCurrentVersion(aggregateId);
      if (currentVersion !== expectedVersion) {
        throw new AggregateVersionConflictException("EventStore", aggregateId.value, expectedVersion, currentVersion);
      }

      // 创建事件实体并保存（使用领域层的事件结构）
      const eventEntities: EventEntity[] = [];
      let nextVersion = expectedVersion;

      for (const event of events) {
        nextVersion++;
        const eventEntity = new EventEntity();
        eventEntity.aggregateId = aggregateId.value; // 使用领域层的 EntityId
        eventEntity.eventVersion = nextVersion;
        eventEntity.eventType = event.eventType;
        eventEntity.eventId = event.eventId.value; // 使用领域层的 EntityId
        eventEntity.data = this.serializeEventData(event.data);
        eventEntity.metadata = event.metadata;
        eventEntity.timestamp = event.timestamp;

        eventEntities.push(eventEntity);
        this.em.persist(eventEntity);
      }

      await this.em.flush();

      return {
        success: true,
        eventsCount: events.length,
        newVersion: nextVersion,
        timestamp: new Date(),
      };
    } catch (error) {
      // 转换为领域层异常
      throw this.exceptionConverter.convertToDomainException(error, "saveEvents", "EventStore", aggregateId.value);
    }
  }

  async getEvents(aggregateId: EntityId): Promise<DomainEventBase[]> {
    try {
      const eventEntities = await this.em.find(EventEntity, {
        aggregateId: aggregateId.value, // 使用领域层的 EntityId
      });

      // 将数据库实体转换为领域层的 DomainEvent
      return eventEntities.map((entity) => this.convertToDomainEvent(entity));
    } catch (error) {
      throw this.exceptionConverter.convertToDomainException(error, "getEvents", "EventStore", aggregateId.value);
    }
  }

  protected convertToDomainEvent(entity: EventEntity): DomainEventBase {
    // 使用领域层的 DomainEvent 构造
    return new DomainEventBase(EntityId.fromString(entity.aggregateId), entity.eventType, this.deserializeEventData(entity.data), entity.metadata || {}, EntityId.fromString(entity.eventId), entity.timestamp, entity.eventVersion);
  }
}
```

**支持作用**:

- ✅ **事件结构**：提供统一的事件数据结构
- ✅ **版本管理**：支持事件版本和乐观并发控制
- ✅ **类型安全**：使用领域层的类型确保事件数据的正确性

---

## 基础设施层实现模式

### 模式 1: 仓储接口实现模式

```typescript
// 基础设施层：实现领域层定义的仓储接口
import { IRepository, ITenantIsolatedRepository, EntityId, TenantContext } from "@hl8/domain-kernel";
import { EntityManager } from "@mikro-orm/core";

// 基础仓储实现
export class MikroORMRepository<T extends BaseEntity> implements IRepository<T> {
  constructor(
    protected readonly em: EntityManager,
    protected readonly entityName: string,
    protected readonly exceptionConverter: ExceptionConverter,
  ) {}

  async findById(id: EntityId): Promise<T | null> {
    // 使用领域层的 EntityId
    const entity = await this.em.findOne(this.entityName, {
      id: id.value,
    });

    // 异常转换
    if (error) {
      throw this.exceptionConverter.convertToDomainException(error, "findById", this.entityName, id.value);
    }

    return entity as T | null;
  }

  // ... 实现其他接口方法
}

// 租户隔离仓储实现
export class MikroORMTenantIsolatedRepository<T extends TenantIsolatedPersistenceEntity> extends MikroORMRepository<T> implements ITenantIsolatedRepository<T> {
  async findByIdWithContext(id: EntityId, context: TenantContext): Promise<T | null> {
    const entity = await super.findById(id);
    if (!entity) {
      return null;
    }

    // 使用领域层的租户上下文验证访问权限
    this.validateTenantAccess(entity, context);

    return entity;
  }

  // ... 实现其他租户隔离方法
}
```

**领域层支持点**:

1. ✅ `IRepository` 接口：定义仓储契约
2. ✅ `ITenantIsolatedRepository` 接口：定义租户隔离契约
3. ✅ `EntityId` 类型：统一标识符类型
4. ✅ `TenantContext` 类型：租户上下文管理

---

### 模式 2: 实体映射模式

```typescript
// 基础设施层：领域实体和持久化实体的双向映射
import { Entity, AggregateRoot, EntityId, AuditInfo, TenantIsolatedEntity } from "@hl8/domain-kernel";

export class EntityMapper<TDomain extends Entity, TPersistence extends BaseEntity> implements IEntityMapper<TDomain, TPersistence> {
  toDomain(persistence: TPersistence): TDomain {
    // 1. 基础字段映射（使用领域层类型）
    const domainData: Partial<TDomain> = {
      id: EntityId.fromString(persistence.id),
      version: persistence.version,
      auditInfo: new AuditInfo(persistence.createdAt, persistence.updatedAt, persistence.createdBy, persistence.updatedBy, persistence.version),
    };

    // 2. 租户隔离字段映射（如果适用）
    if (this.isTenantIsolated(persistence)) {
      domainData.tenantId = TenantId.fromString(persistence.tenantId);
      // ... 其他租户字段
    }

    // 3. 业务字段映射
    this.mapBusinessFields(persistence, domainData);

    // 4. 创建领域实体
    return this.createDomainEntity(domainData);
  }

  toPersistence(domain: TDomain): TPersistence {
    // 1. 基础字段映射
    const persistenceData = {
      id: domain.id.value, // 使用 EntityId 的 value 属性
      version: domain.version,
      createdAt: domain.auditInfo.createdAt,
      updatedAt: domain.auditInfo.updatedAt,
      createdBy: domain.auditInfo.createdBy,
      updatedBy: domain.auditInfo.updatedBy,
    };

    // 2. 租户隔离字段映射
    if (this.isTenantIsolatedDomain(domain)) {
      persistenceData.tenantId = domain.tenantId.value;
      // ... 其他租户字段
    }

    // 3. 业务字段映射
    this.mapBusinessFields(domain, persistenceData);

    // 4. 创建持久化实体
    return this.createPersistenceEntity(persistenceData);
  }
}
```

**领域层支持点**:

1. ✅ `Entity` 基类：领域实体基类
2. ✅ `AggregateRoot` 基类：聚合根基类
3. ✅ `EntityId` 类型：标识符类型
4. ✅ `AuditInfo` 类型：审计信息类型
5. ✅ `TenantIsolatedEntity` 类型：租户隔离实体类型

---

### 模式 3: 查询规范转换模式

```typescript
// 基础设施层：将领域层规范转换为数据库查询
import { ISpecification, IQuerySpecification, QueryCriteria, QueryOperator, AndSpecification, OrSpecification, NotSpecification } from "@hl8/domain-kernel";

export class SpecificationConverter implements ISpecificationConverter {
  convertToQuery<T>(spec: ISpecification<T>, entityName: string): MikroORMQueryOptions {
    // 如果规范实现了 IQuerySpecification，使用其查询条件
    if (this.isQuerySpecification(spec)) {
      return this.convertCriteriaToQuery(spec.getQueryCriteria());
    }

    // 否则递归转换组合规范
    return this.convertSpecificationToQuery(spec, 0);
  }

  protected convertCriteriaToQuery(criteria: QueryCriteria): MikroORMQueryOptions {
    const options: MikroORMQueryOptions = {};

    // 转换查询条件（使用领域层的 QueryOperator）
    if (criteria.conditions && criteria.conditions.length > 0) {
      options.where = this.convertConditionsToWhere(criteria.conditions);
    }

    // 转换排序和分页
    // ...

    return options;
  }

  protected convertConditionsToWhere(conditions: QueryCondition[]): Record<string, unknown> {
    const where: Record<string, unknown> = {};

    for (const condition of conditions) {
      // 使用领域层的 QueryOperator 映射到数据库操作符
      switch (condition.operator) {
        case QueryOperator.EQUALS:
          where[condition.field] = condition.value;
          break;
        case QueryOperator.GREATER_THAN:
          where[condition.field] = { $gt: condition.value };
          break;
        // ... 更多操作符
      }
    }

    return where;
  }
}
```

**领域层支持点**:

1. ✅ `ISpecification` 接口：规范接口
2. ✅ `IQuerySpecification` 接口：查询规范接口
3. ✅ `QueryCriteria` 类型：查询条件类型
4. ✅ `QueryOperator` 枚举：查询操作符枚举
5. ✅ 组合规范类：`AndSpecification`、`OrSpecification`、`NotSpecification`

---

### 模式 4: 异常转换模式

```typescript
// 基础设施层：将技术异常转换为领域异常
import { DomainException, RepositoryException, AggregateVersionConflictException, RepositoryConnectionException, RepositoryQueryException } from "@hl8/domain-kernel";
import { OptimisticLockError } from "@mikro-orm/core";

export class ExceptionConverter implements IExceptionConverter {
  convertToDomainException(error: unknown, operation: string, entityType: string, entityId?: string): DomainException {
    // 识别异常类型并转换为领域层异常
    if (this.isOptimisticLockException(error)) {
      return new AggregateVersionConflictException(entityType, entityId || "unknown", expectedVersion, actualVersion, originalError);
    }

    if (this.isConnectionException(error)) {
      return new RepositoryConnectionException(entityType, originalError);
    }

    // ... 更多异常类型转换
  }
}
```

**领域层支持点**:

1. ✅ `DomainException` 基类：异常基类
2. ✅ `RepositoryException` 类：仓储异常
3. ✅ `AggregateVersionConflictException` 类：版本冲突异常
4. ✅ 其他特定异常类

---

## 实际应用示例

### 示例 1: 完整的仓储实现流程

```typescript
// 领域层：定义用户聚合根
import { AggregateRoot, EntityId, DomainEvent } from "@hl8/domain-kernel";

export class User extends AggregateRoot {
  private _email: Email;
  private _password: Password;

  constructor(email: Email, password: Password, id?: EntityId) {
    super(id);
    this._email = email;
    this._password = password;

    this.addDomainEvent({
      type: "UserCreated",
      aggregateRootId: this.id,
      timestamp: new Date(),
      data: { email: email.value },
    });
  }

  // ... 其他业务方法
}

// 基础设施层：实现用户仓储
import { IRepository, EntityId, AggregateRoot } from "@hl8/domain-kernel";
import { EntityManager } from "@mikro-orm/core";
import { UserEntity } from "./entities/user.entity.js";
import { EntityMapper } from "./mappers/entity-mapper.js";

export class UserRepository implements IRepository<User> {
  constructor(
    private readonly em: EntityManager,
    private readonly mapper: EntityMapper<User, UserEntity>,
  ) {}

  async findById(id: EntityId): Promise<User | null> {
    try {
      const entity = await this.em.findOne(UserEntity, {
        id: id.value, // 使用领域层的 EntityId
      });

      if (!entity) {
        return null;
      }

      // 使用实体映射器转换为领域实体
      return this.mapper.toDomain(entity);
    } catch (error) {
      throw this.exceptionConverter.convertToDomainException(error, "findById", "User", id.value);
    }
  }

  async save(aggregate: User): Promise<void> {
    try {
      // 将领域实体转换为持久化实体
      const entity = this.mapper.toPersistence(aggregate);

      this.em.persist(entity);
      await this.em.flush();
    } catch (error) {
      throw this.exceptionConverter.convertToDomainException(error, "save", "User", aggregate.id.value);
    }
  }

  // ... 其他方法实现
}
```

**领域层支持点**:

1. ✅ `IRepository` 接口：定义仓储契约
2. ✅ `EntityId` 类型：标识符类型
3. ✅ `AggregateRoot` 类型：聚合根类型
4. ✅ `DomainEvent` 类型：领域事件类型
5. ✅ 异常转换：技术异常转换为领域异常

---

### 示例 2: 租户隔离查询

```typescript
// 基础设施层：租户隔离查询实现
import { ITenantIsolatedRepository, TenantContext, TenantId, OrganizationId, EntityId, BusinessException } from "@hl8/domain-kernel";

export class ProductRepository extends MikroORMTenantIsolatedRepository<ProductEntity> implements ITenantIsolatedRepository<Product> {
  async findAllByContext(context: TenantContext): Promise<Product[]> {
    // 使用领域层的租户上下文构建查询
    const where: Record<string, unknown> = {
      tenantId: context.tenantId.value, // 使用领域层的 TenantId
      deletedAt: null,
    };

    // 如果指定了组织，添加组织过滤
    if (context.organizationId) {
      where.organizationId = context.organizationId.value; // 使用领域层的 OrganizationId
    }

    // 如果指定了部门，添加部门过滤
    if (context.departmentId) {
      where.departmentId = context.departmentId.value; // 使用领域层的 DepartmentId
    }

    try {
      const entities = await this.em.find(ProductEntity, where);

      // 映射为领域实体
      return entities.map((entity) => this.mapper.toDomain(entity));
    } catch (error) {
      throw this.exceptionConverter.convertToDomainException(error, "findAllByContext", "Product");
    }
  }

  async belongsToTenant(id: EntityId, tenantId: TenantId): Promise<boolean> {
    try {
      const entity = await this.em.findOne(ProductEntity, {
        id: id.value, // 使用领域层的 EntityId
      });

      if (!entity) {
        return false;
      }

      // 使用领域层的 TenantId 进行比较
      return entity.tenantId.value === tenantId.value;
    } catch (error) {
      throw this.exceptionConverter.convertToDomainException(error, "belongsToTenant", "Product", id.value);
    }
  }
}
```

**领域层支持点**:

1. ✅ `ITenantIsolatedRepository` 接口：租户隔离仓储接口
2. ✅ `TenantContext` 类型：租户上下文
3. ✅ `TenantId`、`OrganizationId`、`DepartmentId` 类型：租户标识符
4. ✅ `EntityId` 类型：实体标识符

---

### 示例 3: 规范查询转换

```typescript
// 领域层：定义业务规范
import { ISpecification, IQuerySpecification, QueryCriteria } from "@hl8/domain-kernel";

export class ActiveProductSpecification implements IQuerySpecification<Product> {
  getQueryCriteria(): QueryCriteria {
    return {
      conditions: [
        {
          field: "isActive",
          operator: QueryOperator.EQUALS,
          value: true,
        },
        {
          field: "deletedAt",
          operator: QueryOperator.EQUALS,
          value: null,
        },
      ],
    };
  }

  isSatisfiedBy(entity: Product): boolean {
    return entity.isActive && !entity.deletedAt;
  }
}

// 基础设施层：使用规范查询
import { ISpecification, QueryOperator } from "@hl8/domain-kernel";

export class ProductRepository {
  constructor(private readonly specificationConverter: SpecificationConverter) {}

  async findBySpecification(spec: ISpecification<Product>): Promise<Product[]> {
    // 将领域层的规范转换为 MikroORM 查询
    const queryOptions = this.specificationConverter.convertToQuery(spec, ProductEntity.name);

    try {
      const entities = await this.em.find(ProductEntity, queryOptions.where, queryOptions);

      return entities.map((entity) => this.mapper.toDomain(entity));
    } catch (error) {
      throw this.exceptionConverter.convertToDomainException(error, "findBySpecification", "Product");
    }
  }
}
```

**领域层支持点**:

1. ✅ `ISpecification` 接口：规范接口
2. ✅ `IQuerySpecification` 接口：查询规范接口
3. ✅ `QueryCriteria` 类型：查询条件
4. ✅ `QueryOperator` 枚举：查询操作符

---

## 最佳实践

### 1. 接口实现

**✅ 正确做法**:

```typescript
// 基础设施层实现领域层定义的接口
import { IRepository, EntityId } from "@hl8/domain-kernel";

export class MikroORMRepository<T extends BaseEntity> implements IRepository<T> {
  async findById(id: EntityId): Promise<T | null> {
    // 实现接口方法
  }
}
```

**❌ 错误做法**:

```typescript
// 不要绕过领域层接口直接实现
export class MikroORMRepository<T> {
  async findById(id: string): Promise<T | null> {
    // ❌ 不应该直接使用 string
    // ...
  }
}
```

### 2. 类型使用

**✅ 正确做法**:

```typescript
// 使用领域层的类型
import { EntityId, TenantContext, TenantId } from "@hl8/domain-kernel";

async findById(id: EntityId): Promise<User | null> {
  const entity = await this.em.findOne(UserEntity, {
    id: id.value, // 使用 EntityId 的 value 属性
  });
}
```

**❌ 错误做法**:

```typescript
// 不要直接使用原始类型
async findById(id: string): Promise<User | null> { // ❌
  // ...
}
```

### 3. 异常转换

**✅ 正确做法**:

```typescript
// 将所有技术异常转换为领域层异常
import { DomainException } from "@hl8/domain-kernel";

try {
  // 数据库操作
} catch (error) {
  throw this.exceptionConverter.convertToDomainException(error, "save", "User", entity.id.value);
}
```

**❌ 错误做法**:

```typescript
// 不要直接抛出技术异常
try {
  // 数据库操作
} catch (error) {
  throw error; // ❌ 应该转换为领域层异常
}
```

### 4. 实体映射

**✅ 正确做法**:

```typescript
// 使用实体映射器进行双向转换
const domainEntity = this.mapper.toDomain(persistenceEntity);
const persistenceEntity = this.mapper.toPersistence(domainEntity);
```

**❌ 错误做法**:

```typescript
// 不要直接使用持久化实体作为领域实体
const domainEntity = persistenceEntity as DomainEntity; // ❌
```

### 5. 租户隔离

**✅ 正确做法**:

```typescript
// 使用领域层的租户上下文进行查询
import { TenantContext, TenantId } from "@hl8/domain-kernel";

async findByContext(context: TenantContext): Promise<Product[]> {
  const where = {
    tenantId: context.tenantId.value, // 使用领域层的 TenantId
  };
  // ...
}
```

**❌ 错误做法**:

```typescript
// 不要直接使用字符串作为租户ID
async findByTenant(tenantId: string): Promise<Product[]> { // ❌
  // ...
}
```

---

## 总结

### 核心支持作用总结

| 领域层组件                                   | 基础设施层使用场景 | 关键支持作用                   |
| -------------------------------------------- | ------------------ | ------------------------------ |
| **IRepository**                              | 仓储实现           | 定义仓储契约，确保实现一致性   |
| **ITenantIsolatedRepository**                | 租户隔离仓储实现   | 定义租户隔离契约，确保安全隔离 |
| **EntityId**                                 | 标识符处理         | 统一标识符格式，类型安全       |
| **Entity / AggregateRoot**                   | 实体映射           | 提供领域实体类型定义           |
| **TenantContext**                            | 租户隔离查询       | 多层级数据隔离上下文           |
| **TenantId / OrganizationId / DepartmentId** | 租户隔离字段       | 租户标识符类型，确保隔离正确性 |
| **ISpecification / QueryCriteria**           | 查询转换           | 提供查询抽象，技术无关         |
| **QueryOperator**                            | 查询条件构建       | 统一查询操作符枚举             |
| **DomainException**                          | 异常转换           | 统一异常体系，业务语义         |
| **DomainEvent**                              | 事件存储           | 统一事件结构，版本管理         |

### 设计原则体现

1. **依赖倒置原则 (DIP)**:
   - ✅ 基础设施层依赖领域层的抽象接口
   - ✅ 领域层定义接口，基础设施层实现接口

2. **接口隔离原则 (ISP)**:
   - ✅ 领域层提供细粒度的接口（如 `IRepository`、`ITenantIsolatedRepository`）
   - ✅ 基础设施层可以根据需要选择实现哪个接口

3. **单一职责原则 (SRP)**:
   - ✅ 领域层：定义接口和业务类型
   - ✅ 基础设施层：实现接口和技术适配

4. **开放封闭原则 (OCP)**:
   - ✅ 领域层接口对扩展开放（可以添加新方法）
   - ✅ 基础设施层实现对修改封闭（只需实现接口）

### 关键收益

1. **接口契约明确**:
   - 领域层定义的接口明确了基础设施层的实现要求
   - 确保不同实现（PostgreSQL、MongoDB）的一致性

2. **类型安全保证**:
   - 领域层提供完整的类型定义
   - 基础设施层实现时获得类型检查和自动补全

3. **业务语义保持**:
   - 通过类型系统和接口约束，确保业务语义在持久化过程中不丢失
   - 实体映射保证领域模型的完整性

4. **异常体系统一**:
   - 技术异常统一转换为领域异常
   - 应用层和领域层看到的是统一的异常类型

5. **技术无关性**:
   - 通过接口抽象，基础设施层可以切换不同的实现（PostgreSQL ↔ MongoDB）
   - 查询抽象使查询逻辑与技术无关

6. **可测试性**:
   - 基础设施层可以 Mock 领域层接口进行测试
   - 领域层接口可以独立测试

---

## 下一步学习

1. **深入学习领域层**:
   - 阅读 [DOMAIN_LAYER_GUIDE.md](../DOMAIN_LAYER_GUIDE.md) 了解领域层开发指引
   - 阅读 [README.md](../README.md) 了解完整的 API 文档

2. **深入学习基础设施层**:
   - 阅读 `@hl8/infrastructure-kernel` 的文档了解基础设施层实现
   - 学习 MikroORM 的使用和最佳实践

3. **实践项目**:
   - 根据本文档的示例实现一个完整的仓储
   - 体验领域层对基础设施层的支持作用

**祝你开发顺利！** 🚀
