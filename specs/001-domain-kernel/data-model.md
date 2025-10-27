# Data Model: Domain Kernel Core Module

**Date**: 2024-12-19  
**Feature**: Domain Kernel Core Module  
**Phase**: Phase 1 - Design

## Entity Overview

### ValueObject (值对象基类)

**Purpose**: 提供不可变值对象的基础功能

**Key Attributes**:

- `value`: `T` - 值对象的值（泛型）
- `createdAt`: `Date` - 创建时间
- `version`: `number` - 版本号

**Key Methods**:

- `equals(other: ValueObject<T>): boolean` - 相等性比较
- `toString(): string` - 字符串表示
- `toJSON(): object` - JSON序列化
- `clone(): ValueObject<T>` - 克隆对象

**Validation Rules**:

- 值不能为null或undefined
- 值必须通过业务规则验证
- 对象创建后不可修改

**State Transitions**: 无状态转换（不可变对象）

### Entity (实体基类)

**Purpose**: 提供充血模型实体的基础功能，包含UUID标识符和审计能力

**Key Attributes**:

- `id`: `EntityId` - 实体唯一标识符（UUID v4）
- `auditInfo`: `AuditInfo` - 审计信息
- `lifecycleState`: `EntityLifecycle` - 生命周期状态
- `version`: `number` - 版本号（乐观锁）
- `createdAt`: `Date` - 创建时间
- `updatedAt`: `Date` - 更新时间
- `deletedAt`: `Date | undefined` - 删除时间（软删除）
- `deletedBy`: `EntityId | undefined` - 删除者ID（软删除）

**Key Methods**:

- `getId(): EntityId` - 获取标识符
- `getAuditInfo(): AuditInfo` - 获取审计信息
- `getLifecycleState(): EntityLifecycle` - 获取生命周期状态
- `activate(): void` - 激活实体
- `deactivate(): void` - 停用实体
- `delete(deletedBy?: EntityId): void` - 删除实体（软删除）
- `restore(): void` - 恢复已删除的实体
- `isDeleted(): boolean` - 检查是否已删除
- `equals(other: Entity): boolean` - 相等性比较
- `toJSON(): object` - JSON序列化

**Validation Rules**:

- 标识符必须唯一
- 生命周期状态转换必须有效
- 审计信息必须完整
- 版本号必须递增
- 软删除信息一致性：删除状态下必须设置deletedAt和deletedBy
- 非删除状态下不应设置删除信息

**State Transitions**:

- `CREATED` → `ACTIVE` (激活)
- `ACTIVE` → `INACTIVE` (停用)
- `INACTIVE` → `ACTIVE` (重新激活)
- `ACTIVE` → `DELETED` (软删除)
- `INACTIVE` → `DELETED` (软删除)
- `DELETED` → `INACTIVE` (恢复)

**软删除特性**:

- 删除时自动记录删除时间和删除者
- 删除时间存储在`deletedAt`字段
- 删除者ID存储在`deletedBy`字段
- 支持通过`restore()`方法恢复实体
- 数据不会从数据库中物理删除

### InternalEntity (内部实体基类)

**Purpose**: 聚合根内部的实体，执行具体业务操作

**Key Attributes**:

- `id`: `EntityId` - 实体标识符
- `auditInfo`: `AuditInfo` - 审计信息
- `lifecycleState`: `EntityLifecycle` - 生命周期状态
- `version`: `number` - 版本号
- `aggregateRootId`: `EntityId` - 所属聚合根标识符

**Key Methods**:

- `executeBusinessLogic(params: any): any` - 执行业务逻辑
- `validateBusinessRules(): boolean` - 验证业务规则
- `updateState(newState: any): void` - 更新状态
- `notifyAggregateRoot(event: DomainEvent): void` - 通知聚合根

**Validation Rules**:

- 必须属于某个聚合根
- 业务逻辑执行必须通过验证
- 状态更新必须符合业务规则

**State Transitions**: 同Entity基类

### AggregateRoot (聚合根基类)

**Purpose**: 管理聚合边界，协调内部实体，发布领域事件

**Key Attributes**:

- `id`: `EntityId` - 聚合根标识符
- `version`: `number` - 版本号（乐观锁）
- `internalEntities`: `Map<string, InternalEntity>` - 内部实体集合
- `domainEvents`: `DomainEvent[]` - 待发布领域事件
- `auditInfo`: `AuditInfo` - 审计信息
- `createdAt`: `Date` - 创建时间
- `updatedAt`: `Date` - 更新时间

**Key Methods**:

- `addInternalEntity(entity: InternalEntity): void` - 添加内部实体
- `removeInternalEntity(entityId: EntityId): void` - 移除内部实体
- `getInternalEntity(entityId: EntityId): InternalEntity` - 获取内部实体
- `coordinateBusinessOperation(operation: string, params: any): any` - 协调业务操作
- `addDomainEvent(event: DomainEvent): void` - 添加领域事件
- `getDomainEvents(): DomainEvent[]` - 获取待发布事件
- `clearDomainEvents(): void` - 清空待发布事件
- `validateBusinessInvariants(): boolean` - 验证业务不变量

**Validation Rules**:

- 不能直接执行业务逻辑
- 必须协调内部实体执行
- 业务不变量必须得到维护
- 领域事件必须及时发布

**State Transitions**: 无特定状态转换（管理类）

## Value Objects

### EntityId (实体标识符)

**Purpose**: 封装UUID v4标识符，提供唯一性验证

**Key Attributes**:

- `value`: `string` - UUID v4字符串

**Key Methods**:

- `equals(other: EntityId): boolean` - 相等性比较
- `toString(): string` - 字符串表示
- `toJSON(): string` - JSON序列化
- `isValid(): boolean` - 验证格式

**Validation Rules**:

- 必须是有效的UUID v4格式
- 不能为空或null

### AuditInfo (审计信息)

**Purpose**: 记录实体的审计信息

**Key Attributes**:

- `createdAt`: `Date` - 创建时间
- `updatedAt`: `Date` - 更新时间
- `createdBy`: `EntityId` - 创建者UUID
- `updatedBy`: `EntityId` - 更新者UUID
- `version`: `number` - 版本号
- `checksum`: `string` - 数据校验和

**Key Methods**:

- `update(updatedBy: EntityId): void` - 更新审计信息
- `getChecksum(): string` - 获取校验和
- `validateIntegrity(): boolean` - 验证数据完整性
- `toJSON(): object` - JSON序列化

**Validation Rules**:

- 创建时间不能晚于更新时间
- 创建者和更新者必须有效
- 校验和必须正确

### AuditTrail (审计轨迹)

**Purpose**: 管理实体的变更历史记录

**Key Attributes**:

- `entityId`: `EntityId` - 实体标识符
- `changes`: `AuditChange[]` - 变更记录
- `createdAt`: `Date` - 创建时间

**Key Methods**:

- `addChange(change: AuditChange): void` - 添加变更记录
- `getChanges(): AuditChange[]` - 获取变更记录
- `getChangesByUser(userId: EntityId): AuditChange[]` - 按用户查询变更
- `getChangesByDateRange(start: Date, end: Date): AuditChange[]` - 按时间范围查询

**Validation Rules**:

- 变更记录必须按时间顺序
- 每个变更必须包含完整信息

## Enums

### EntityLifecycle (实体生命周期)

```typescript
enum EntityLifecycle {
  CREATED = "CREATED",
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
  DELETED = "DELETED",
}
```

### ExceptionType (异常类型)

```typescript
enum ExceptionType {
  BUSINESS = "BUSINESS",
  SYSTEM = "SYSTEM",
}
```

## Domain Events

### DomainEvent (领域事件基类)

**Purpose**: 领域事件的基类

**Key Attributes**:

- `eventId`: `EntityId` - 事件标识符
- `aggregateId`: `EntityId` - 聚合根标识符
- `eventType`: `string` - 事件类型
- `eventData`: `any` - 事件数据
- `timestamp`: `Date` - 时间戳
- `version`: `number` - 事件版本

**Key Methods**:

- `toJSON(): object` - JSON序列化
- `getEventType(): string` - 获取事件类型
- `getEventData(): any` - 获取事件数据
- `getTimestamp(): Date` - 获取时间戳

## Relationships

### Entity Relationships

- `Entity` 1:1 `EntityId` (标识符)
- `Entity` 1:1 `AuditInfo` (审计信息)
- `Entity` 1:1 `EntityLifecycle` (生命周期状态)

### AggregateRoot Relationships

- `AggregateRoot` 1:N `InternalEntity` (内部实体)
- `AggregateRoot` 1:N `DomainEvent` (领域事件)
- `AggregateRoot` 1:1 `AuditInfo` (审计信息)

### Audit Relationships

- `AuditTrail` 1:1 `EntityId` (实体标识符)
- `AuditTrail` 1:N `AuditChange` (变更记录)

## Data Integrity Rules

### Entity Integrity

- 每个实体必须有唯一标识符
- 实体状态转换必须有效
- 审计信息必须完整

### Aggregate Integrity

- 聚合根不能直接执行业务逻辑
- 内部实体只能通过聚合根访问
- 业务不变量必须得到维护

### Audit Integrity

- 审计记录不可修改
- 校验和必须正确
- 变更记录必须完整

## Performance Considerations

### UUID Generation

- 使用crypto.randomUUID()原生API
- 批量生成减少系统调用
- 内存冲突检测机制

### Event Storage

- 追加写入模式
- 批量持久化
- 异步处理

### Audit Recording

- 异步审计记录
- 批量写入优化
- 内存缓存机制
