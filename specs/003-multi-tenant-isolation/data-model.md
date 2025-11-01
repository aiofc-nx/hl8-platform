# Data Model: Multi-Tenant and Multi-Level Data Isolation

**Feature**: Multi-Tenant and Multi-Level Data Isolation  
**Date**: 2024-12-20  
**Phase**: Phase 1 - Design

## Core Value Objects

### TenantId (租户标识符)

**Purpose**: 封装租户的唯一标识符，使用 UUID v4 格式

**Key Attributes**:

- `value: string` - UUID v4 格式的租户标识符（只读）

**Key Methods**:

- `constructor(value?: string)` - 创建租户标识符，未提供时自动生成
- `get value(): string` - 获取标识符值
- `equals(other: TenantId): boolean` - 比较两个租户标识符是否相等
- `isValid(): boolean` - 验证标识符是否有效（UUID v4格式）
- `clone(): TenantId` - 创建标识符副本
- `toString(): string` - 转换为字符串
- `toJSON(): string` - 序列化为JSON
- `static fromString(value: string): TenantId` - 从字符串创建
- `static generate(): TenantId` - 生成新的租户标识符

**Validation Rules**:

- 必须是有效的 UUID v4 格式
- 不能为 null 或 undefined
- 创建后不可修改（不可变值对象）

**State Transitions**: 无状态转换（不可变对象）

---

### OrganizationId (组织标识符)

**Purpose**: 封装租户内组织的唯一标识符，支持多层级组织结构

**Key Attributes**:

- `value: string` - UUID v4 格式的组织标识符（只读）
- `tenantId: TenantId` - 所属租户ID（只读，必需）
- `parentId?: OrganizationId` - 父组织ID（可选，支持层级结构）

**Key Methods**:

- `constructor(tenantId: TenantId, value?: string, parentId?: OrganizationId)` - 创建组织标识符
- `get value(): string` - 获取标识符值
- `get tenantId(): TenantId` - 获取所属租户ID
- `get parentId(): OrganizationId | undefined` - 获取父组织ID
- `equals(other: OrganizationId): boolean` - 比较两个组织标识符是否相等
- `belongsTo(tenantId: TenantId): boolean` - 检查是否属于指定租户
- `isAncestorOf(other: OrganizationId): boolean` - 检查是否为指定组织的祖先
- `isDescendantOf(other: OrganizationId): boolean` - 检查是否为指定组织的后代
- `clone(): OrganizationId` - 创建标识符副本
- `toJSON(): object` - 序列化为JSON

**Validation Rules**:

- 必须是有效的 UUID v4 格式
- 租户ID必须有效且不能为空
- 如果指定了父组织，父组织必须属于同一个租户
- 创建后不可修改（不可变值对象）

**State Transitions**: 无状态转换（不可变对象）

**Relationships**:

- 属于一个租户（多对一）
- 可以有父组织（自引用，多对一）
- 可以有子组织（自引用，一对多）

---

### DepartmentId (部门标识符)

**Purpose**: 封装组织内部门的唯一标识符，支持多层级部门结构

**Key Attributes**:

- `value: string` - UUID v4 格式的部门标识符（只读）
- `organizationId: OrganizationId` - 所属组织ID（只读，必需）
- `parentId?: DepartmentId` - 父部门ID（可选，支持层级结构）

**Key Methods**:

- `constructor(organizationId: OrganizationId, value?: string, parentId?: DepartmentId)` - 创建部门标识符
- `get value(): string` - 获取标识符值
- `get organizationId(): OrganizationId` - 获取所属组织ID
- `get parentId(): DepartmentId | undefined` - 获取父部门ID
- `equals(other: DepartmentId): boolean` - 比较两个部门标识符是否相等
- `belongsTo(organizationId: OrganizationId): boolean` - 检查是否属于指定组织
- `belongsToTenant(tenantId: TenantId): boolean` - 检查是否属于指定租户
- `isAncestorOf(other: DepartmentId): boolean` - 检查是否为指定部门的祖先
- `isDescendantOf(other: DepartmentId): boolean` - 检查是否为指定部门的后代
- `clone(): DepartmentId` - 创建标识符副本
- `toJSON(): object` - 序列化为JSON

**Validation Rules**:

- 必须是有效的 UUID v4 格式
- 组织ID必须有效且不能为空
- 如果指定了父部门，父部门必须属于同一个组织
- 创建后不可修改（不可变值对象）

**State Transitions**: 无状态转换（不可变对象）

**Relationships**:

- 属于一个组织（多对一）
- 组织属于一个租户（通过组织关联）
- 可以有父部门（自引用，多对一）
- 可以有子部门（自引用，一对多）

---

### TenantContext (租户上下文)

**Purpose**: 封装当前请求的租户和多层级隔离信息，在整个请求生命周期中传递

**Key Attributes**:

- `tenantId: TenantId` - 当前租户ID（必需）
- `organizationId?: OrganizationId` - 当前组织ID（可选）
- `departmentId?: DepartmentId` - 当前部门ID（可选）
- `isCrossTenant: boolean` - 是否允许跨租户访问（默认false）
- `permissions: string[]` - 权限列表（用于权限验证）
- `userId?: EntityId` - 当前用户ID（可选）
- `extractedAt: Date` - 上下文提取时间

**Key Methods**:

- `constructor(tenantId: TenantId, options?: TenantContextOptions)` - 创建租户上下文
- `get tenantId(): TenantId` - 获取租户ID
- `get organizationId(): OrganizationId | undefined` - 获取组织ID
- `get departmentId(): DepartmentId | undefined` - 获取部门ID
- `get isCrossTenant(): boolean` - 是否允许跨租户访问
- `get permissions(): string[]` - 获取权限列表
- `hasPermission(permission: string): boolean` - 检查是否拥有指定权限
- `canAccessTenant(tenantId: TenantId): boolean` - 检查是否可以访问指定租户
- `canAccessOrganization(orgId: OrganizationId): boolean` - 检查是否可以访问指定组织
- `canAccessDepartment(deptId: DepartmentId): boolean` - 检查是否可以访问指定部门
- `validate(): boolean` - 验证上下文有效性
- `clone(): TenantContext` - 创建上下文副本
- `toJSON(): object` - 序列化为JSON

**Validation Rules**:

- 租户ID必须有效
- 如果指定了组织ID，组织ID必须属于当前租户
- 如果指定了部门ID，部门ID必须属于当前组织，且组织必须属于当前租户
- 跨租户访问必须明确设置且需要相应权限
- 权限列表不能包含无效权限

**State Transitions**: 无状态转换（不可变对象）

---

## Enhanced Entities

### TenantIsolatedEntity (租户隔离实体基类)

**Purpose**: 支持租户隔离的实体基类，扩展自 Entity 基类

**Key Attributes**:

- **继承自 Entity 的所有属性**:
  - `id: EntityId` - 实体标识符
  - `auditInfo: AuditInfo` - 审计信息
  - `lifecycleState: EntityLifecycle` - 生命周期状态
  - `version: number` - 版本号
  - `createdAt: Date` - 创建时间
  - `updatedAt: Date` - 更新时间
  - `deletedAt?: Date` - 删除时间
  - `deletedBy?: EntityId` - 删除者ID

- **新增租户隔离属性**:
  - `tenantId: TenantId` - 所属租户ID（必需，只读）
  - `organizationId?: OrganizationId` - 所属组织ID（可选，只读）
  - `departmentId?: DepartmentId` - 所属部门ID（可选，只读）

**Key Methods**:

- `constructor(tenantId: TenantId, organizationId?: OrganizationId, departmentId?: DepartmentId, ...)` - 创建租户隔离实体
- `get tenantId(): TenantId` - 获取租户ID
- `get organizationId(): OrganizationId | undefined` - 获取组织ID
- `get departmentId(): DepartmentId | undefined` - 获取部门ID
- `belongsToTenant(tenantId: TenantId): boolean` - 检查是否属于指定租户
- `belongsToOrganization(orgId: OrganizationId): boolean` - 检查是否属于指定组织
- `belongsToDepartment(deptId: DepartmentId): boolean` - 检查是否属于指定部门
- `validateTenantIsolation(context: TenantContext): boolean` - 验证租户隔离规则
- `clone(): TenantIsolatedEntity` - 克隆实体（抽象方法，子类实现）
- `validateBusinessRules(): boolean` - 验证业务规则（抽象方法，子类实现）
- `executeBusinessLogic(operation: string, params: unknown): unknown` - 执行业务逻辑（抽象方法，子类实现）

**Validation Rules**:

- 租户ID必须有效且不能为空
- 如果指定了组织ID，组织ID必须属于当前租户
- 如果指定了部门ID，部门ID必须属于当前组织，且组织必须属于当前租户
- 实体的租户ID必须与审计信息中的创建者所属租户一致
- 继承 Entity 的所有验证规则

**State Transitions**: 继承 Entity 的所有状态转换

---

### TenantIsolatedAggregateRoot (租户隔离聚合根基类)

**Purpose**: 支持租户隔离的聚合根基类，扩展自 AggregateRoot 基类

**Key Attributes**:

- **继承自 AggregateRoot 的所有属性**:
  - `id: EntityId` - 聚合根标识符
  - `internalEntities: Map<string, InternalEntity>` - 内部实体集合
  - `domainEvents: DomainEvent[]` - 待发布领域事件
  - `auditInfo: AuditInfo` - 审计信息
  - `lifecycleState: EntityLifecycle` - 生命周期状态
  - `version: number` - 版本号

- **新增租户隔离属性**:
  - `tenantId: TenantId` - 所属租户ID（必需，只读）
  - `organizationId?: OrganizationId` - 所属组织ID（可选，只读）
  - `departmentId?: DepartmentId` - 所属部门ID（可选，只读）

**Key Methods**:

- `constructor(tenantId: TenantId, organizationId?: OrganizationId, departmentId?: DepartmentId, ...)` - 创建租户隔离聚合根
- `get tenantId(): TenantId` - 获取租户ID
- `get organizationId(): OrganizationId | undefined` - 获取组织ID
- `get departmentId(): DepartmentId | undefined` - 获取部门ID
- `belongsToTenant(tenantId: TenantId): boolean` - 检查是否属于指定租户
- `belongsToOrganization(orgId: OrganizationId): boolean` - 检查是否属于指定组织
- `belongsToDepartment(deptId: DepartmentId): boolean` - 检查是否属于指定部门
- `validateTenantIsolation(context: TenantContext): boolean` - 验证租户隔离规则
- `addDomainEventWithTenant(event: DomainEvent): void` - 添加领域事件（自动包含租户信息）
- `coordinateBusinessOperation(operation: string, params: unknown, context: TenantContext): unknown` - 协调业务操作（增强版本，包含租户上下文）
- `clone(): TenantIsolatedAggregateRoot` - 克隆聚合根（抽象方法，子类实现）
- `validateBusinessInvariants(): boolean` - 验证业务不变量（抽象方法，子类实现）

**Validation Rules**:

- 租户ID必须有效且不能为空
- 如果指定了组织ID，组织ID必须属于当前租户
- 如果指定了部门ID，部门ID必须属于当前组织，且组织必须属于当前租户
- 所有内部实体的租户ID必须与聚合根一致
- 所有领域事件必须包含租户信息
- 继承 AggregateRoot 的所有验证规则

**State Transitions**: 继承 AggregateRoot 的所有状态转换

---

## Enhanced Commands and Queries

### BaseCommand with TenantContext

**Purpose**: 增强的命令基类，包含租户上下文信息

**Enhanced Attributes**:

- **现有属性**（继承自 BaseCommand）:
  - `commandId: string` - 命令ID
  - `aggregateId: string` - 聚合根ID
  - `commandType: string` - 命令类型
  - `userId?: string` - 用户ID
  - `correlationId?: string` - 关联ID
  - `timestamp?: Date` - 时间戳
  - `version?: string` - 版本
  - `metadata?: Record<string, unknown>` - 元数据

- **新增属性**:
  - `tenantContext?: TenantContext` - 租户上下文（自动注入）

**Enhanced Methods**:

- `constructor(aggregateId: string, commandType: string, options?: CommandOptions & { tenantContext?: TenantContext })` - 创建命令（支持租户上下文）
- `getTenantId(): TenantId | undefined` - 获取租户ID（便捷方法）
- `getOrganizationId(): OrganizationId | undefined` - 获取组织ID（便捷方法）
- `getDepartmentId(): DepartmentId | undefined` - 获取部门ID（便捷方法）
- `validateTenantContext(): boolean` - 验证租户上下文（可重写）

**Validation Rules**:

- 如果提供了租户上下文，必须有效
- 聚合根ID对应的实体必须属于当前租户（除非跨租户权限）

---

### BaseQuery with TenantContext

**Purpose**: 增强的查询基类，包含租户上下文信息

**Enhanced Attributes**:

- **现有属性**（继承自 BaseQuery）:
  - `queryId: string` - 查询ID
  - `queryType: string` - 查询类型
  - `userId?: string` - 用户ID
  - `correlationId?: string` - 关联ID
  - `timestamp?: Date` - 时间戳
  - `version?: string` - 版本
  - `pagination?: PaginationOptions` - 分页参数
  - `sorting?: SortingOptions[]` - 排序参数
  - `filters?: Record<string, unknown>` - 过滤参数
  - `metadata?: Record<string, unknown>` - 元数据

- **新增属性**:
  - `tenantContext?: TenantContext` - 租户上下文（自动注入）

**Enhanced Methods**:

- `constructor(queryType: string, options?: QueryOptions & { tenantContext?: TenantContext })` - 创建查询（支持租户上下文）
- `getTenantId(): TenantId | undefined` - 获取租户ID（便捷方法）
- `getOrganizationId(): OrganizationId | undefined` - 获取组织ID（便捷方法）
- `getDepartmentId(): DepartmentId | undefined` - 获取部门ID（便捷方法）
- `validateTenantContext(): boolean` - 验证租户上下文（可重写）
- `buildTenantFilter(): Record<string, unknown>` - 构建租户过滤条件（用于查询构建，包含租户、组织、部门）

**Validation Rules**:

- 如果提供了租户上下文，必须有效
- 查询结果必须自动应用租户过滤

---

## Repository Interfaces

### ITenantIsolatedRepository

**Purpose**: 支持租户隔离的仓储接口，扩展自 IRepository

**Key Methods**:

- **继承自 IRepository**:
  - `findById(id: EntityId): Promise<T | null>` - 根据ID查找（自动应用租户过滤）
  - `save(entity: T): Promise<void>` - 保存实体（自动验证租户隔离）
  - `delete(id: EntityId): Promise<void>` - 删除实体（自动验证租户隔离）
  - `exists(id: EntityId): Promise<boolean>` - 检查是否存在（自动应用租户过滤）

- **新增方法**:
  - `findByIdWithContext(id: EntityId, context: TenantContext): Promise<T | null>` - 根据ID和上下文查找
  - `findAllByContext(context: TenantContext): Promise<T[]>` - 根据上下文查找所有实体
  - `findByTenant(tenantId: TenantId, context: TenantContext): Promise<T[]>` - 查找租户下的所有实体
  - `findByOrganization(orgId: OrganizationId, context: TenantContext): Promise<T[]>` - 查找组织下的所有实体
  - `findByDepartment(deptId: DepartmentId, context: TenantContext): Promise<T[]>` - 查找部门下的所有实体
  - `belongsToTenant(id: EntityId, tenantId: TenantId): Promise<boolean>` - 检查实体是否属于指定租户
  - `belongsToOrganization(id: EntityId, orgId: OrganizationId): Promise<boolean>` - 检查实体是否属于指定组织
  - `belongsToDepartment(id: EntityId, deptId: DepartmentId): Promise<boolean>` - 检查实体是否属于指定部门
  - `findByIdCrossTenant(id: EntityId, context: TenantContext): Promise<T | null>` - 跨租户查找（需要管理员权限）
  - `countByTenant(tenantId: TenantId, context: TenantContext): Promise<number>` - 统计租户下的实体数量
  - `countByOrganization(orgId: OrganizationId, context: TenantContext): Promise<number>` - 统计组织下的实体数量
  - `countByDepartment(deptId: DepartmentId, context: TenantContext): Promise<number>` - 统计部门下的实体数量

**Validation Rules**:

- 所有查询方法必须自动应用租户过滤条件
- 保存实体时必须验证租户隔离规则
- 跨租户操作必须验证管理员权限

---

## Middleware Components

### TenantContextMiddleware

**Purpose**: 应用层中间件，自动提取和注入租户上下文

**Key Attributes**:

- `tenantExtractor: ITenantContextExtractor` - 租户上下文提取器
- `permissionValidator: ITenantPermissionValidator` - 权限验证器
- `logger: Hl8Logger` - 日志记录器

**Key Methods**:

- `constructor(tenantExtractor, permissionValidator, logger)` - 创建中间件
- `before(commandOrQuery: BaseCommand | BaseQuery, context: ExecutionContext): Promise<boolean>` - 前置处理（提取和注入上下文）
- `after(commandOrQuery: BaseCommand | BaseQuery, result: CommandResult | QueryResult, context: ExecutionContext): Promise<boolean>` - 后置处理（可选，用于清理）

**Behavior**:

1. 从请求中提取租户信息（通过 ITenantContextExtractor）
2. 创建 TenantContext 对象
3. 验证租户权限（通过 ITenantPermissionValidator）
4. 将 TenantContext 注入到 Command/Query 对象
5. 记录上下文提取日志

---

### ITenantContextExtractor

**Purpose**: 定义从各种来源提取租户上下文的接口

**Key Methods**:

- `extractFromRequest(request: any): Promise<TenantContext | null>` - 从HTTP请求提取
- `extractFromToken(token: string): Promise<TenantContext | null>` - 从JWT Token提取
- `extractFromUser(userId: string): Promise<TenantContext | null>` - 从用户信息提取
- `extractFromHeader(headers: Record<string, string>): Promise<TenantContext | null>` - 从请求头提取

**Extraction Strategies**:

1. **HTTP Header**: 从 `X-Tenant-Id`、`X-Organization-Id` 和 `X-Department-Id` 头提取
2. **JWT Token**: 从JWT的 `tenantId`、`organizationId` 和 `departmentId` claims提取
3. **User Context**: 从当前登录用户的上下文信息提取
4. **Query Parameter**: 从查询参数提取（不推荐，仅用于特殊情况）

---

### ITenantPermissionValidator

**Purpose**: 定义租户权限验证接口

**Key Methods**:

- `validateTenantAccess(context: TenantContext, tenantId: TenantId): Promise<boolean>` - 验证租户访问权限
- `validateOrganizationAccess(context: TenantContext, orgId: OrganizationId): Promise<boolean>` - 验证组织访问权限
- `validateDepartmentAccess(context: TenantContext, deptId: DepartmentId): Promise<boolean>` - 验证部门访问权限
- `validateCrossTenantAccess(context: TenantContext): Promise<boolean>` - 验证跨租户访问权限
- `validatePermission(context: TenantContext, permission: string): Promise<boolean>` - 验证指定权限

**Validation Rules**:

- 普通用户只能访问自己所属租户的数据
- 跨租户访问需要管理员权限
- 组织访问需要验证组织层级关系
- 部门访问需要验证部门所属组织层级关系
- 权限验证失败应记录审计日志

---

## Domain Events Enhancement

### DomainEvent with TenantInfo

**Purpose**: 领域事件增强，自动包含租户信息

**Enhanced Attributes**:

- **现有属性**（继承自 DomainEvent）:
  - `type: string` - 事件类型
  - `aggregateRootId: EntityId` - 聚合根ID
  - `timestamp: Date` - 时间戳
  - `data: unknown` - 事件数据

- **新增属性**:
  - `tenantId: TenantId` - 租户ID（自动添加）
  - `organizationId?: OrganizationId` - 组织ID（可选，自动添加）
  - `departmentId?: DepartmentId` - 部门ID（可选，自动添加）

**Behavior**:

- 当聚合根发布领域事件时，自动将租户、组织、部门信息添加到事件中
- 事件存储时保留所有层级隔离信息，支持按租户/组织/部门查询事件
- 事件重放时自动应用多层级过滤

---

## Database Schema Considerations

### Entity Tables

所有租户隔离的实体表需要添加以下字段：

```sql
-- 示例：租户隔离实体表结构
CREATE TABLE tenant_isolated_entities (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  organization_id UUID,  -- 可选
  department_id UUID,     -- 可选
  -- 其他实体字段...
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL,
  deleted_at TIMESTAMP,
  version INTEGER NOT NULL DEFAULT 1,

  -- 索引
  INDEX idx_tenant_id (tenant_id),
  INDEX idx_organization_id (organization_id),
  INDEX idx_department_id (department_id),
  INDEX idx_tenant_org (tenant_id, organization_id),
  INDEX idx_tenant_org_dept (tenant_id, organization_id, department_id),
  INDEX idx_tenant_lifecycle (tenant_id, lifecycle_state)
);
```

### Event Store Tables

事件存储表需要添加租户信息：

```sql
-- 示例：事件存储表结构
CREATE TABLE event_store (
  event_id UUID PRIMARY KEY,
  aggregate_id UUID NOT NULL,
  tenant_id UUID NOT NULL,
  organization_id UUID,
  department_id UUID,
  event_type VARCHAR(255) NOT NULL,
  event_data JSONB NOT NULL,
  event_version INTEGER NOT NULL,
  timestamp TIMESTAMP NOT NULL,

  -- 索引
  INDEX idx_aggregate_tenant (aggregate_id, tenant_id),
  INDEX idx_tenant_timestamp (tenant_id, timestamp),
  INDEX idx_tenant_event_type (tenant_id, event_type),
  INDEX idx_tenant_org_dept (tenant_id, organization_id, department_id)
);
```

---

## Relationships

### Tenant Isolation Hierarchy

```text
Tenant (租户) - 必需层级
  ├── Organization (组织) - 可选层级
  │   ├── Department (部门) - 可选层级
  │   │   └── [未来可扩展：Team (团队) 等]
  └── Direct Entities (直接实体，无组织和部门)
```

### Entity Relationships

- `TenantIsolatedEntity` belongs to `Tenant` (多对一，必需)
- `TenantIsolatedEntity` optionally belongs to `Organization` (多对一，可选)
- `TenantIsolatedEntity` optionally belongs to `Department` (多对一，可选)
- `Organization` belongs to `Tenant` (多对一，必需)
- `Organization` optionally has parent `Organization` (自引用，多对一)
- `Department` belongs to `Organization` (多对一，必需)
- `Department` optionally has parent `Department` (自引用，多对一)

### Context Flow

```text
HTTP Request
  ↓
TenantContextExtractor
  ↓
TenantContext (值对象)
  ↓
TenantContextMiddleware
  ↓
Command/Query (with TenantContext)
  ↓
Repository (自动应用过滤)
  ↓
Database Query (with WHERE tenant_id = ? AND organization_id = ? AND department_id = ?)
```

---

## Validation Rules Summary

### Required Validations

1. **租户ID验证**: 必须有效且不为空（必需）
2. **组织ID验证**: 如果提供，必须属于当前租户
3. **部门ID验证**: 如果提供，必须属于当前组织，且组织必须属于当前租户
4. **权限验证**: 跨租户访问需要管理员权限
5. **数据隔离验证**: 实体必须属于请求的租户，如果指定了组织/部门，还必须匹配
6. **上下文完整性**: 租户上下文在整个请求链路中必须完整

### Business Rules

1. **默认隔离**: 默认严格隔离，不允许跨租户访问
2. **组织层级**: 支持组织层级关系，可配置是否包含子组织数据
3. **部门层级**: 支持部门层级关系，可配置是否包含子部门数据
4. **层级一致性**: 如果指定了部门，必须同时指定组织；如果指定了组织，必须属于当前租户
5. **权限控制**: 所有数据访问都需要权限验证
6. **审计要求**: 所有跨租户操作必须记录审计日志

---

## Performance Considerations

### Database Indexes

必须为以下字段组合创建索引：

1. `(tenant_id)` - 租户查询
2. `(tenant_id, organization_id)` - 组织查询
3. `(tenant_id, organization_id, department_id)` - 部门查询（复合索引）
4. `(tenant_id, lifecycle_state)` - 活跃实体查询
5. `(tenant_id, created_at)` - 时间范围查询
6. `(organization_id, department_id)` - 部门查询（当已知组织时）

### Query Optimization

1. **索引使用**: 确保所有租户过滤查询使用索引
2. **分区策略**: 考虑按租户分区大表（PostgreSQL分区表）
3. **缓存策略**: 缓存租户上下文信息，减少重复查询

---

## Security Considerations

### Data Isolation Guarantees

1. **应用层过滤**: 所有查询自动应用租户过滤
2. **仓储层过滤**: 仓储实现必须强制应用过滤
3. **数据库层约束**: 数据库外键约束确保数据完整性

### Permission Validation

1. **多层验证**: 请求、命令、仓储多层验证
2. **权限缓存**: 权限信息可缓存但需及时失效
3. **审计日志**: 所有权限验证失败记录审计日志
