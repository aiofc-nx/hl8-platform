# Data Model: Infrastructure Kernel Enhancement and Alignment

**Feature**: Infrastructure Kernel Enhancement and Alignment  
**Date**: 2025-01-22  
**Phase**: Phase 1 - Design

## Overview

Infrastructure Kernel Enhancement 数据模型定义了增强后的基础设施层数据结构，包括：实体映射器、事务管理、查询构建器、事件存储、仓储工厂等核心组件的数据模型。所有数据模型必须与 domain-kernel 和 application-kernel 完全对齐。

## Core Persistent Entities

### BaseEntity (持久化基础实体)

**Purpose**: MikroORM 持久化实体的基类，提供审计和时间戳功能

**Key Attributes**:

- `id: string` - 实体唯一标识符（UUID v4，主键）
- `createdAt: Date` - 创建时间（自动设置）
- `updatedAt: Date` - 更新时间（自动更新）
- `version: number` - 乐观锁定版本号（自动递增）
- `deletedAt?: Date | null` - 软删除时间戳（可选）

**Validation Rules**:

- id 必须为有效的 UUID v4 格式
- version 必须 >= 1

**Relationships**: 被所有持久化实体继承

---

### TenantIsolatedPersistenceEntity (租户隔离持久化实体)

**Purpose**: 支持租户隔离的持久化实体基类

**Key Attributes**:

- 继承自 `BaseEntity`
- `tenantId: string` - 租户ID（必填，UUID v4格式）
- `organizationId?: string | null` - 组织ID（可选，UUID v4格式）
- `departmentId?: string | null` - 部门ID（可选，UUID v4格式）

**Validation Rules**:

- tenantId 必填且必须为有效 UUID
- organizationId 存在时必须为有效 UUID，且必须属于 tenantId（由业务逻辑验证）
- departmentId 存在时必须为有效 UUID，且必须属于 organizationId（由业务逻辑验证）

**Indexes**:

- `tenantId` - 单列索引（支持租户级查询）
- `organizationId` - 单列索引（支持组织级查询）
- `departmentId` - 单列索引（支持部门级查询）
- 复合索引：`(tenantId, organizationId)` 和 `(tenantId, organizationId, departmentId)` 用于多层级查询优化

**Relationships**: 被所有需要租户隔离的持久化实体继承

**Note**: 此实体映射到 Domain Kernel 的 `TenantIsolatedEntity` 领域实体，通过 EntityMapper 进行转换

---

## Event Store Entities

### EventEntity (事件持久化实体)

**Purpose**: 领域事件的数据库持久化实体

**Key Attributes**:

- `id: string` - 事件唯一标识符（UUID v4，主键）
- `aggregateId: string` - 聚合根ID（UUID v4，索引）
- `eventType: string` - 事件类型（索引）
- `version: number` - 事件版本号（与聚合根版本对应，复合索引）
- `eventData: Record<string, unknown>` - 事件数据（JSON/JSONB）
- `metadata: Record<string, unknown>` - 事件元数据（JSON/JSONB）
- `tenantId?: string` - 租户ID（可选，支持租户隔离查询）
- `organizationId?: string` - 组织ID（可选）
- `departmentId?: string` - 部门ID（可选）
- `timestamp: Date` - 事件时间戳（索引）
- `createdAt: Date` - 持久化时间

**Validation Rules**:

- aggregateId 必须为有效 UUID
- version 必须 >= 1
- eventType 必填且不能为空
- timestamp 必填

**Indexes**:

- `aggregateId` - 单列索引（按聚合根查询事件）
- `(aggregateId, version)` - 复合索引（事件流查询优化）
- `eventType` - 单列索引（按事件类型查询）
- `timestamp` - 单列索引（时间范围查询）
- `tenantId` - 单列索引（租户隔离查询，如果支持）

**Storage Strategy**:

- PostgreSQL: 使用 JSONB 类型存储 eventData 和 metadata
- MongoDB: 使用 Document 存储，原生支持嵌套结构

---

### EventSnapshotEntity (事件快照持久化实体)

**Purpose**: 事件快照的数据库持久化实体，用于优化事件重放性能

**Key Attributes**:

- `id: string` - 快照唯一标识符（UUID v4，主键）
- `aggregateId: string` - 聚合根ID（UUID v4，索引）
- `version: number` - 快照对应的聚合根版本号（复合索引）
- `snapshotData: Record<string, unknown>` - 快照数据（JSON/JSONB）
- `snapshotType: string` - 快照类型（用于反序列化）
- `metadata: Record<string, unknown>` - 快照元数据（JSON/JSONB）
- `createdAt: Date` - 快照创建时间

**Validation Rules**:

- aggregateId 必须为有效 UUID
- version 必须 >= 1
- snapshotType 必填

**Indexes**:

- `aggregateId` - 单列索引
- `(aggregateId, version)` - 复合索引（快照查询优化）

**Relationships**: 

- 与 EventEntity 通过 aggregateId 关联
- 一个聚合根可以有多个快照（不同版本）

---

## Entity Mapper Components

### EntityMappingConfig (实体映射配置)

**Purpose**: 配置实体映射器的行为

**Key Attributes**:

- `autoMap: boolean` - 是否启用自动映射（默认 true）
- `customMappings: Map<string, MappingRule>` - 自定义字段映射规则
- `nestedAggregates: NestedMappingConfig[]` - 嵌套聚合映射配置
- `transformers: Map<string, TransformFunction>` - 字段转换函数

**MappingRule**:

- `sourcePath: string` - 源字段路径（支持嵌套路径如 "user.name"）
- `targetPath: string` - 目标字段路径
- `transform?: TransformFunction` - 可选的转换函数
- `required: boolean` - 是否必需字段
- `defaultValue?: unknown` - 默认值（字段缺失时使用）

**NestedMappingConfig**:

- `aggregatePath: string` - 聚合字段路径（如 "orderItems"）
- `entityMapper: string` - 用于映射的映射器类名或实例
- `collection: boolean` - 是否为集合类型

---

### EntityMapper<TDomain, TPersistence> (实体映射器基类)

**Purpose**: 领域实体和持久化实体之间的转换器

**Key Methods**:

- `toDomain(persistence: TPersistence): TDomain` - 转换为领域实体
- `toPersistence(domain: TDomain): TPersistence` - 转换为持久化实体
- `toDomainList(persistenceList: TPersistence[]): TDomain[]` - 批量转换为领域实体
- `toPersistenceList(domainList: TDomain[]): TPersistence[]` - 批量转换为持久化实体
- `configure(config: EntityMappingConfig): void` - 配置映射规则

**Implementation Pattern**:

- 自动映射：使用反射自动映射同名同类型属性
- 手动配置：通过配置对象覆盖自动映射，处理复杂场景
- 嵌套聚合：递归调用对应映射器处理嵌套实体

---

## Transaction Management Components

### TransactionContext (事务上下文)

**Purpose**: 封装事务执行上下文

**Key Attributes**:

- `id: string` - 事务上下文ID（UUID）
- `entityManager: EntityManager` - MikroORM EntityManager 实例
- `isolationLevel: IsolationLevel` - 事务隔离级别
- `startTime: Date` - 事务开始时间
- `nestedLevel: number` - 嵌套层级（0 表示最外层事务）
- `parentContext?: TransactionContext` - 父事务上下文（嵌套事务）

**Validation Rules**:

- nestedLevel 最大为 5（根据规范限制）
- isolationLevel 必须有效

---

### TransactionResult<T> (事务结果)

**Purpose**: 封装事务执行结果

**Key Attributes**:

- `success: boolean` - 是否成功
- `result?: T` - 事务执行结果（如果成功）
- `error?: Error` - 错误信息（如果失败）
- `duration: number` - 执行耗时（毫秒）
- `rollbackReason?: string` - 回滚原因（如果回滚）

---

## Query Builder Components

### QueryCriteria (查询条件)

**Purpose**: 封装数据库查询条件

**Key Attributes**:

- `where: Record<string, unknown>` - WHERE 条件
- `orderBy: Record<string, "ASC" | "DESC">` - 排序条件
- `limit?: number` - 结果数量限制
- `offset?: number` - 结果偏移量
- `tenantFilters?: TenantFilterCriteria` - 租户过滤条件（自动注入）

**TenantFilterCriteria**:

- `tenantId: string` - 租户ID（必填）
- `organizationId?: string` - 组织ID（可选）
- `departmentId?: string` - 部门ID（可选）

---

### SpecificationQueryResult (规范查询结果)

**Purpose**: 规范模式查询的执行结果

**Key Attributes**:

- `entities: T[]` - 查询结果实体列表
- `total: number` - 总数量（分页场景）
- `specification: ISpecification<T>` - 执行的规范
- `queryCriteria: QueryCriteria` - 生成的查询条件
- `executionTime: number` - 执行耗时（毫秒）

---

## Repository Factory Components

### RepositoryFactoryConfig (仓储工厂配置)

**Purpose**: 配置仓储工厂的行为

**Key Attributes**:

- `entityTypeMap: Map<string, RepositoryType>` - 实体类型到仓储类型的映射
- `entityManagerProvider: () => EntityManager` - EntityManager 提供者
- `mapperRegistry: Map<string, EntityMapper>` - 映射器注册表
- `defaultRepositoryType: RepositoryType` - 默认仓储类型

**RepositoryType**:

- `BASIC` - 基础仓储（IRepository）
- `TENANT_ISOLATED` - 租户隔离仓储（ITenantIsolatedRepository）

---

## NestJS Module Components

### InfrastructureKernelModuleOptions (模块配置选项)

**Purpose**: InfrastructureKernelModule 的配置选项

**Key Attributes**:

- `mikroOrmConfig: MikroORMConfig` - MikroORM 配置
- `enableRepositoryFactory: boolean` - 是否启用仓储工厂（默认 true）
- `enableEventStore: boolean` - 是否启用事件存储（默认 true）
- `enableTransactionManager: boolean` - 是否启用事务管理器（默认 true）
- `logLevel: LogLevel` - 日志级别

---

## Validation Rules Summary

### Entity Validation

1. **BaseEntity**:
   - id: UUID v4 格式验证
   - version: >= 1 验证
   - deletedAt: 可为 null 或有效 Date

2. **TenantIsolatedPersistenceEntity**:
   - tenantId: UUID v4 格式，必填
   - organizationId: UUID v4 格式，可选，存在时必须属于 tenantId
   - departmentId: UUID v4 格式，可选，存在时必须属于 organizationId

3. **EventEntity**:
   - aggregateId: UUID v4 格式，必填
   - version: >= 1 验证
   - eventType: 非空字符串
   - timestamp: 有效 Date

### Mapping Validation

1. **自动映射规则**:
   - 源字段和目标字段名称相同
   - 源字段和目标字段类型兼容（或可通过转换函数转换）
   - 映射后的实体必须通过领域实体的不变量验证

2. **手动映射规则**:
   - 所有必需字段必须映射或提供默认值
   - 嵌套聚合必须配置映射器
   - 转换函数必须保证数据完整性

---

## Database Schema Design

### PostgreSQL Schema

```sql
-- 事件表
CREATE TABLE event_store (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aggregate_id UUID NOT NULL,
  event_type VARCHAR(255) NOT NULL,
  version INTEGER NOT NULL,
  event_data JSONB NOT NULL,
  metadata JSONB,
  tenant_id UUID,
  organization_id UUID,
  department_id UUID,
  timestamp TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_event_aggregate FOREIGN KEY (aggregate_id) REFERENCES aggregates(id),
  CONSTRAINT unique_aggregate_version UNIQUE (aggregate_id, version)
);

-- 索引
CREATE INDEX idx_event_aggregate ON event_store(aggregate_id);
CREATE INDEX idx_event_type ON event_store(event_type);
CREATE INDEX idx_event_timestamp ON event_store(timestamp);
CREATE INDEX idx_event_tenant ON event_store(tenant_id) WHERE tenant_id IS NOT NULL;
CREATE INDEX idx_event_aggregate_version ON event_store(aggregate_id, version);

-- 快照表
CREATE TABLE event_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aggregate_id UUID NOT NULL,
  version INTEGER NOT NULL,
  snapshot_data JSONB NOT NULL,
  snapshot_type VARCHAR(255) NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_snapshot_aggregate FOREIGN KEY (aggregate_id) REFERENCES aggregates(id),
  CONSTRAINT unique_aggregate_version UNIQUE (aggregate_id, version)
);

CREATE INDEX idx_snapshot_aggregate ON event_snapshots(aggregate_id);
CREATE INDEX idx_snapshot_aggregate_version ON event_snapshots(aggregate_id, version);
```

### MongoDB Schema

```javascript
// 事件集合
{
  _id: ObjectId,
  aggregateId: UUID,
  eventType: String,
  version: Number,
  eventData: Object,
  metadata: Object,
  tenantId: UUID (optional),
  organizationId: UUID (optional),
  departmentId: UUID (optional),
  timestamp: Date,
  createdAt: Date
}

// 索引
db.event_store.createIndex({ aggregateId: 1, version: 1 });
db.event_store.createIndex({ eventType: 1 });
db.event_store.createIndex({ timestamp: 1 });
db.event_store.createIndex({ tenantId: 1 });

// 快照集合
{
  _id: ObjectId,
  aggregateId: UUID,
  version: Number,
  snapshotData: Object,
  snapshotType: String,
  metadata: Object,
  createdAt: Date
}

// 索引
db.event_snapshots.createIndex({ aggregateId: 1, version: 1 });
```

---

## Relationships

### Entity Relationships

1. **EventEntity ↔ AggregateRoot**:
   - 一对多关系：一个聚合根可以有多条事件记录
   - 通过 aggregateId 关联

2. **EventSnapshotEntity ↔ AggregateRoot**:
   - 一对多关系：一个聚合根可以有多条快照记录（不同版本）
   - 通过 aggregateId 关联

3. **EventEntity ↔ EventSnapshotEntity**:
   - 间接关联：通过 aggregateId 关联
   - 快照版本对应事件流的特定版本点

### Mapping Relationships

1. **Domain Entity ↔ Persistence Entity**:
   - 通过 EntityMapper 进行双向转换
   - 映射关系配置在 EntityMappingConfig 中

2. **Nested Aggregates**:
   - 嵌套聚合通过 NestedMappingConfig 配置映射
   - 递归调用对应映射器进行转换

---

## Performance Considerations

### Indexing Strategy

1. **事件存储索引**:
   - `(aggregateId, version)` 复合索引：优化事件流查询（最常见查询）
   - `eventType` 索引：支持按事件类型查询
   - `timestamp` 索引：支持时间范围查询

2. **租户隔离索引**:
   - `tenantId` 单列索引：所有租户隔离查询的基础
   - `(tenantId, organizationId)` 复合索引：组织级查询优化
   - `(tenantId, organizationId, departmentId)` 复合索引：部门级查询优化

### Query Optimization

1. **批量操作**:
   - 批量保存：使用 MikroORM 的 persist 批量操作
   - 批量删除：使用 IN 查询或批量 delete 语句

2. **规范模式查询**:
   - 限制嵌套深度 ≤ 5 层，避免复杂查询性能问题
   - 自动应用索引优化查询计划

### Data Volume

- 支持 100,000+ 事件/聚合的事件存储
- 支持 10 万条租户隔离记录的查询
- 事件存储查询响应时间 < 100ms（10万条记录内）

---

## Migration Strategy

### Schema Migration

1. **初始迁移**:
   - 创建 event_store 表（PostgreSQL）
   - 创建 event_store 集合（MongoDB）
   - 创建 event_snapshots 表/集合
   - 创建所有索引

2. **版本迁移**:
   - 使用 MikroORM Migrator 管理版本迁移
   - 支持向前和向后迁移
   - 复杂迁移可手动编写 SQL/MongoDB 脚本

### Data Migration

1. **实体映射迁移**:
   - 现有持久化实体无需迁移
   - 新增映射器需要配置，无需数据迁移

2. **事件存储迁移**:
   - 如果从内存实现迁移到数据库实现，需要数据导入
   - 支持批量导入事件数据

