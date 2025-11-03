# Feature Specification: Multi-Tenant and Multi-Level Data Isolation

**Feature Branch**: `003-multi-tenant-isolation`  
**Created**: 2024-12-20  
**Status**: Draft  
**Input**: User description: "我们已经完成了libs/kernel/domain-kernel和libs/kernel/application-kernel的开发，这是一个SAAS平台，我们需要增加多租户和多层级数据隔离的机制"

## Overview

本文档阐述 hl8-platform SAAS 平台的多租户和多层级数据隔离设计方案。该方案旨在确保不同租户的数据完全隔离，同时支持租户内部的多层级数据隔离（如组织、部门等层级）。

### 设计目标

1. **数据隔离安全性**：确保不同租户的数据完全隔离，防止数据泄露
2. **多层级隔离支持**：支持租户内多层级数据隔离（租户 → 组织 → 部门等）
3. **透明隔离机制**：开发者在业务代码中无需关心隔离细节，框架自动处理
4. **性能优化**：隔离机制不应显著影响系统性能
5. **架构一致性**：与现有 Clean Architecture + CQRS + ES + EDA 架构无缝集成

## User Scenarios & Testing _(mandatory)_

### User Story 1 - 租户级别数据隔离 (Priority: P1)

作为SAAS平台管理者，我需要确保不同租户的数据完全隔离，租户A的用户无法访问租户B的任何数据，确保数据安全性和合规性。

**Why this priority**: 租户隔离是SAAS平台的基础安全要求，是其他功能的前提条件。

**Independent Test**: 可以独立测试租户标识符的生成、验证、查询过滤和权限验证功能。

**Acceptance Scenarios**:

1. **Given** 租户A创建了用户数据，**When** 租户B尝试访问该数据，**Then** 系统拒绝访问并返回权限错误
2. **Given** 租户A执行查询操作，**When** 查询返回结果，**Then** 系统自动过滤，仅返回租户A的数据
3. **Given** 租户A创建聚合根，**When** 保存到数据库，**Then** 系统自动标记租户ID，确保数据隔离
4. **Given** 命令中包含租户上下文，**When** 执行命令，**Then** 系统验证租户权限并自动应用租户过滤

---

### User Story 2 - 多层级数据隔离 (Priority: P1)

作为企业用户，我需要在租户内部实现多层级数据隔离，支持三层隔离：租户 → 组织 → 部门，确保组织A的数据对组织B不可见，部门A的数据对部门B不可见，同时支持跨层级数据共享的场景。

**Why this priority**: 多层级隔离是企业SAAS平台的核心需求，支持复杂的组织结构管理。数据首先按租户隔离，租户内按组织隔离，组织内按部门隔离。

**Independent Test**: 可以独立测试组织标识符、部门标识符的管理、层级隔离验证、跨层级数据访问控制功能。

**Acceptance Scenarios**:

1. **Given** 组织A创建了业务数据，**When** 组织B的用户尝试访问，**Then** 系统根据隔离规则决定是否允许访问
2. **Given** 部门A创建了业务数据，**When** 部门B的用户尝试访问，**Then** 系统根据隔离规则决定是否允许访问
3. **Given** 用户在组织A中执行查询，**When** 查询返回结果，**Then** 系统自动过滤，仅返回该组织及其下级组织的数据（根据配置）
4. **Given** 用户在部门A中执行查询，**When** 查询返回结果，**Then** 系统自动过滤，仅返回该部门及其下级部门的数据（根据配置）
5. **Given** 系统需要跨组织或跨部门共享数据，**When** 配置共享权限，**Then** 系统支持跨组织、跨部门数据访问
6. **Given** 多层级隔离规则已配置（租户→组织→部门），**When** 执行数据操作，**Then** 系统自动应用所有层级的隔离规则

---

### User Story 3 - 租户上下文自动注入 (Priority: P1)

作为应用层开发者，我需要框架自动从请求中提取租户上下文信息，并在整个请求生命周期中自动应用，无需在每个业务方法中手动传递租户信息。

**Why this priority**: 自动注入机制确保隔离机制的一致性，减少开发者错误，提高开发效率。

**Independent Test**: 可以独立测试上下文提取、注入、验证和传递功能。

**Acceptance Scenarios**:

1. **Given** 请求包含租户标识信息，**When** 请求到达应用层，**Then** 系统自动提取并创建租户上下文
2. **Given** 租户上下文已创建，**When** 执行命令或查询，**Then** 系统自动将租户上下文注入到命令/查询对象
3. **Given** 租户上下文在请求生命周期中，**When** 调用仓储方法，**Then** 系统自动应用租户过滤条件
4. **Given** 请求缺少租户信息，**When** 执行操作，**Then** 系统立即拒绝请求并返回 403 Forbidden，记录安全审计日志

---

### User Story 4 - 仓储自动过滤 (Priority: P1)

作为基础设施层开发者，我需要仓储实现自动应用租户和多层级隔离过滤条件，确保所有数据查询都自动包含隔离条件，防止数据泄露。

**Why this priority**: 仓储是数据访问的唯一入口，在仓储层实现自动过滤可以确保隔离机制的彻底性。

**Independent Test**: 可以独立测试仓储查询的自动过滤、条件组合、性能优化功能。

**Acceptance Scenarios**:

1. **Given** 执行仓储查询方法，**When** 查询数据库，**Then** 系统自动添加租户ID过滤条件
2. **Given** 执行仓储查询方法，**When** 查询包含多层级隔离，**Then** 系统自动添加所有层级的过滤条件
3. **Given** 需要查询跨租户数据（系统管理员），**When** 显式指定跨租户权限，**Then** 系统允许跨租户查询
4. **Given** 仓储查询自动过滤，**When** 检查查询性能，**Then** 系统确保过滤条件不影响查询性能（使用索引）

---

### User Story 5 - 租户上下文传递和验证 (Priority: P1)

作为系统架构师，我需要确保租户上下文在整个请求处理链路中正确传递，包括命令/查询处理、事件处理、仓储操作等各个环节，并自动验证上下文的有效性。

**Why this priority**: 上下文传递的一致性确保隔离机制的可靠性，防止上下文丢失导致的数据泄露。

**Independent Test**: 可以独立测试上下文的传递链路、验证机制、异常处理功能。

**Acceptance Scenarios**:

1. **Given** 命令包含租户上下文，**When** 命令处理器执行，**Then** 系统验证上下文有效性并传递给仓储
2. **Given** 领域事件包含租户信息，**When** 事件被处理，**Then** 系统确保事件处理器使用正确的租户上下文
3. **Given** 聚合根发布领域事件，**When** 事件被存储，**Then** 系统自动将租户信息添加到事件中
4. **Given** 上下文在传递过程中丢失，**When** 执行操作，**Then** 系统检测并拒绝操作，返回上下文错误

---

### User Story 6 - 跨租户管理员支持 (Priority: P2)

作为平台管理员，我需要支持跨租户的数据访问能力，用于平台级别的监控、审计和管理操作，同时确保普通用户无法获得此权限。

**Why this priority**: 平台管理员需要跨租户访问能力进行平台运维，但需要严格权限控制。

**Independent Test**: 可以独立测试管理员权限验证、跨租户访问控制、审计日志功能。

**Acceptance Scenarios**:

1. **Given** 平台管理员执行查询，**When** 显式指定跨租户权限，**Then** 系统允许查询所有租户数据
2. **Given** 普通用户尝试跨租户访问，**When** 执行操作，**Then** 系统拒绝并记录审计日志
3. **Given** 平台管理员执行跨租户操作，**When** 操作完成，**Then** 系统记录详细的审计日志
4. **Given** 需要临时授予跨租户权限，**When** 配置权限，**Then** 系统支持临时权限授予和撤销

---

## Architecture Design

### 核心组件设计

#### 1. 租户标识符 (TenantId)

**位置**: `libs/kernel/domain-kernel/src/identifiers/tenant-id.ts`

租户标识符是一个值对象，封装租户的唯一标识。类似于 `EntityId`，使用 UUID v4 格式。

**职责**:

- 封装租户唯一标识
- 提供租户ID的验证和比较功能
- 支持从字符串创建和序列化

**接口设计**:

```typescript
export class TenantId {
  private readonly _value: string;

  constructor(value?: string);
  get value(): string;
  equals(other: TenantId): boolean;
  isValid(): boolean;
  clone(): TenantId;
  toString(): string;
  toJSON(): string;
  static fromString(value: string): TenantId;
  static generate(): TenantId;
}
```

#### 2. 组织标识符 (OrganizationId)

**位置**: `libs/kernel/domain-kernel/src/identifiers/organization-id.ts`

组织标识符用于标识租户内的组织层级。支持多层级组织结构。

**职责**:

- 封装组织唯一标识
- 提供组织ID的验证和比较功能
- 支持组织层级关系管理

**接口设计**:

```typescript
export class OrganizationId {
  private readonly _value: string;
  private readonly _tenantId: TenantId;
  private readonly _parentId?: OrganizationId;

  constructor(tenantId: TenantId, value?: string, parentId?: OrganizationId);
  get value(): string;
  get tenantId(): TenantId;
  get parentId(): OrganizationId | undefined;
  equals(other: OrganizationId): boolean;
  belongsTo(tenantId: TenantId): boolean;
  isAncestorOf(other: OrganizationId): boolean;
  isDescendantOf(other: OrganizationId): boolean;
  clone(): OrganizationId;
}
```

#### 2.1 部门标识符 (DepartmentId)

**位置**: `libs/kernel/domain-kernel/src/identifiers/department-id.ts`

部门标识符用于标识组织内的部门层级。支持多层级部门结构。

**职责**:

- 封装部门唯一标识
- 提供部门ID的验证和比较功能
- 支持部门层级关系管理
- 确保部门属于指定的组织

**接口设计**:

```typescript
export class DepartmentId {
  private readonly _value: string;
  private readonly _organizationId: OrganizationId;
  private readonly _parentId?: DepartmentId;

  constructor(organizationId: OrganizationId, value?: string, parentId?: DepartmentId);
  get value(): string;
  get organizationId(): OrganizationId;
  get parentId(): DepartmentId | undefined;
  equals(other: DepartmentId): boolean;
  belongsTo(organizationId: OrganizationId): boolean;
  belongsToTenant(tenantId: TenantId): boolean;
  isAncestorOf(other: DepartmentId): boolean;
  isDescendantOf(other: DepartmentId): boolean;
  clone(): DepartmentId;
}
```

#### 3. 租户上下文 (TenantContext)

**位置**: `libs/kernel/domain-kernel/src/context/tenant-context.ts`

租户上下文值对象，承载当前请求的租户和多层级隔离信息。

**职责**:

- 封装租户、组织和部门信息
- 提供隔离规则验证
- 支持上下文序列化和传递

**接口设计**:

```typescript
export class TenantContext {
  private readonly _tenantId: TenantId;
  private readonly _organizationId?: OrganizationId;
  private readonly _departmentId?: DepartmentId;
  private readonly _isCrossTenant: boolean;
  private readonly _permissions: string[];

  constructor(tenantId: TenantId, organizationId?: OrganizationId, departmentId?: DepartmentId, isCrossTenant?: boolean, permissions?: string[]);

  get tenantId(): TenantId;
  get organizationId(): OrganizationId | undefined;
  get departmentId(): DepartmentId | undefined;
  get isCrossTenant(): boolean;
  get permissions(): string[];

  hasPermission(permission: string): boolean;
  canAccessTenant(tenantId: TenantId): boolean;
  canAccessOrganization(orgId: OrganizationId): boolean;
  canAccessDepartment(deptId: DepartmentId): boolean;
  validate(): boolean;
  clone(): TenantContext;
  toJSON(): object;
}
```

#### 4. 租户隔离实体基类 (TenantIsolatedEntity)

**位置**: `libs/kernel/domain-kernel/src/entities/base/tenant-isolated-entity.base.ts`

支持租户隔离的实体基类，扩展自 `Entity` 基类。

**职责**:

- 为实体添加租户ID、组织ID和部门ID属性
- 提供租户隔离验证
- 确保实体创建时自动设置租户信息

**接口设计**:

```typescript
export abstract class TenantIsolatedEntity extends Entity {
  protected readonly _tenantId: TenantId;
  protected readonly _organizationId?: OrganizationId;
  protected readonly _departmentId?: DepartmentId;

  constructor(tenantId: TenantId, organizationId?: OrganizationId, departmentId?: DepartmentId, id?: EntityId, auditInfo?: AuditInfo, lifecycleState?: EntityLifecycle, version?: number);

  get tenantId(): TenantId;
  get organizationId(): OrganizationId | undefined;
  get departmentId(): DepartmentId | undefined;
  belongsToTenant(tenantId: TenantId): boolean;
  belongsToOrganization(orgId: OrganizationId): boolean;
  belongsToDepartment(deptId: DepartmentId): boolean;
  validateTenantIsolation(context: TenantContext): boolean;
}
```

#### 5. 租户隔离聚合根基类 (TenantIsolatedAggregateRoot)

**位置**: `libs/kernel/domain-kernel/src/aggregates/base/tenant-isolated-aggregate-root.base.ts`

支持租户隔离的聚合根基类，扩展自 `AggregateRoot` 基类。

**职责**:

- 为聚合根添加租户隔离能力
- 确保领域事件包含租户信息
- 协调内部实体的租户隔离验证

**接口设计**:

```typescript
export abstract class TenantIsolatedAggregateRoot extends AggregateRoot {
  protected readonly _tenantId: TenantId;
  protected readonly _organizationId?: OrganizationId;
  protected readonly _departmentId?: DepartmentId;

  constructor(tenantId: TenantId, organizationId?: OrganizationId, departmentId?: DepartmentId, id?: EntityId, auditInfo?: AuditInfo, lifecycleState?: EntityLifecycle, version?: number);

  get tenantId(): TenantId;
  get organizationId(): OrganizationId | undefined;
  get departmentId(): DepartmentId | undefined;
  belongsToTenant(tenantId: TenantId): boolean;
  belongsToOrganization(orgId: OrganizationId): boolean;
  belongsToDepartment(deptId: DepartmentId): boolean;
  validateTenantIsolation(context: TenantContext): boolean;

  // 重写 addDomainEvent，自动添加租户、组织、部门信息
  protected addDomainEventWithTenant(event: DomainEvent): void;
}
```

#### 6. 租户隔离仓储接口 (ITenantIsolatedRepository)

**位置**: `libs/kernel/domain-kernel/src/repositories/tenant-isolated-repository.interface.ts`

支持租户隔离的仓储接口，扩展自 `IRepository` 接口。

**职责**:

- 定义租户隔离查询方法
- 支持跨租户查询（管理员权限）
- 自动应用隔离过滤条件

**接口设计**:

```typescript
export interface ITenantIsolatedRepository<T extends TenantIsolatedEntity> extends IRepository<T> {
  /**
   * 根据ID和租户上下文查找实体
   */
  findByIdWithContext(id: EntityId, context: TenantContext): Promise<T | null>;

  /**
   * 根据租户上下文查找所有实体
   */
  findAllByContext(context: TenantContext): Promise<T[]>;

  /**
   * 检查实体是否属于指定租户
   */
  belongsToTenant(id: EntityId, tenantId: TenantId): Promise<boolean>;

  /**
   * 跨租户查询（需要管理员权限）
   */
  findByIdCrossTenant(id: EntityId, context: TenantContext): Promise<T | null>;
}
```

#### 7. 租户上下文中间件 (TenantContextMiddleware)

**位置**: `libs/kernel/application-kernel/src/middleware/tenant-context.middleware.ts`

应用层中间件，自动提取和注入租户上下文。

**职责**:

- 从HTTP请求中提取租户信息
- 创建租户上下文对象
- 将上下文注入到命令/查询对象
- 验证租户权限

**接口设计**:

```typescript
export class TenantContextMiddleware implements BusMiddleware {
  constructor(
    private readonly tenantExtractor: ITenantContextExtractor,
    private readonly permissionValidator: ITenantPermissionValidator,
    private readonly logger: Hl8Logger
  );

  async before(
    commandOrQuery: BaseCommand | BaseQuery,
    context: ExecutionContext
  ): Promise<boolean>;

  async after(
    commandOrQuery: BaseCommand | BaseQuery,
    result: CommandResult | QueryResult,
    context: ExecutionContext
  ): Promise<boolean>;
}
```

#### 8. 租户上下文提取器 (ITenantContextExtractor)

**位置**: `libs/kernel/application-kernel/src/context/tenant-context-extractor.interface.ts`

定义从各种来源提取租户上下文的接口。

**职责**:

- 从HTTP请求头提取租户信息
- 从JWT Token提取租户信息
- 从请求参数提取租户信息
- 创建租户上下文对象

**接口设计**:

```typescript
export interface ITenantContextExtractor {
  /**
   * 从请求中提取租户上下文
   */
  extractFromRequest(request: any): Promise<TenantContext | null>;

  /**
   * 从JWT Token提取租户上下文
   */
  extractFromToken(token: string): Promise<TenantContext | null>;

  /**
   * 从用户信息提取租户上下文
   */
  extractFromUser(userId: string): Promise<TenantContext | null>;
}
```

### 数据模型增强

#### Entity 数据模型增强

```typescript
// 基础 Entity 保持不变
// 新增 TenantIsolatedEntity 继承 Entity

TenantIsolatedEntity {
  // 继承 Entity 的所有属性
  id: EntityId;
  auditInfo: AuditInfo;
  lifecycleState: EntityLifecycle;
  version: number;

  // 新增租户隔离属性
  tenantId: TenantId;              // 必需：租户ID
  organizationId?: OrganizationId;  // 可选：组织ID（支持多层级）
  departmentId?: DepartmentId;     // 可选：部门ID（支持多层级）
}
```

#### AggregateRoot 数据模型增强

```typescript
// 基础 AggregateRoot 保持不变
// 新增 TenantIsolatedAggregateRoot 继承 AggregateRoot

TenantIsolatedAggregateRoot {
  // 继承 AggregateRoot 的所有属性
  id: EntityId;
  internalEntities: Map<string, InternalEntity>;
  domainEvents: DomainEvent[];

  // 新增租户隔离属性
  tenantId: TenantId;              // 必需：租户ID
  organizationId?: OrganizationId;  // 可选：组织ID
  departmentId?: DepartmentId;     // 可选：部门ID
}
```

#### Command/Query 数据模型增强

```typescript
// BaseCommand 增强
BaseCommand {
  // 现有属性
  commandId: string;
  aggregateId: string;
  commandType: string;
  userId?: string;

  // 新增租户上下文
  tenantContext?: TenantContext;  // 自动注入的租户上下文
}

// BaseQuery 增强
BaseQuery {
  // 现有属性
  queryId: string;
  queryType: string;
  userId?: string;

  // 新增租户上下文
  tenantContext?: TenantContext;  // 自动注入的租户上下文
}
```

### 数据隔离策略

#### 1. 租户级别隔离

- **隔离粒度**: 所有数据按租户ID隔离
- **隔离方式**: 数据库查询自动添加 `WHERE tenant_id = ?` 条件
- **默认行为**: 严格隔离，不允许跨租户访问（除非管理员权限）

#### 2. 组织级别隔离

- **隔离粒度**: 租户内按组织ID隔离
- **隔离方式**: 数据库查询添加 `AND organization_id = ?` 条件
- **层级支持**: 支持组织层级关系，可配置是否包含子组织数据
- **默认行为**: 严格隔离 - 仅访问当前组织数据，不会自动包含子组织或父组织数据
- **权限模型**: 默认严格隔离，必须显式授予权限才能跨组织访问（访问父组织或子组织数据）
- **查询行为**: 严格匹配原则 - 如果上下文指定了组织ID，只查询属于该组织的数据（不论数据是否有部门ID），不会自动包含下级部门数据，除非显式配置权限

#### 3. 部门级别隔离

- **隔离粒度**: 组织内按部门ID隔离
- **隔离方式**: 数据库查询添加 `AND department_id = ?` 条件
- **层级支持**: 支持部门层级关系，可配置是否包含子部门数据
- **默认行为**: 严格隔离 - 仅访问当前部门数据，不会自动包含子部门或父部门数据
- **权限模型**: 默认严格隔离，必须显式授予权限才能跨部门访问（访问父部门或子部门数据）
- **层级一致性**: 部门必须属于指定组织，组织必须属于指定租户
- **查询行为**: 严格匹配原则 - 如果上下文指定了部门ID，只查询属于该部门的数据，不会自动包含下级部门数据，除非显式配置权限

#### 4. 跨层级数据访问

- **场景**: 某些业务场景需要跨组织或跨部门访问数据
- **默认策略**: 严格隔离，默认不允许跨层级访问
- **权限授予**: 必须通过权限配置显式授予跨层级访问权限
- **实现**: 通过权限配置控制跨组织、跨部门访问
- **验证**: 在仓储层自动验证跨层级访问权限，未授权访问将被拒绝

### 数据隔离实现机制

#### 1. 自动过滤机制

所有仓储查询操作自动添加租户和组织过滤条件：

```sql
-- 自动生成的查询示例（三层隔离，严格匹配）
-- 场景1：上下文包含租户、组织、部门
SELECT * FROM entities
WHERE tenant_id = ?
  AND organization_id = ?
  AND department_id = ?
  AND lifecycle_state != 'DELETED'

-- 场景2：上下文包含租户、组织（无部门）
SELECT * FROM entities
WHERE tenant_id = ?
  AND organization_id = ?
  AND (department_id IS NULL OR department_id IS NOT NULL)  -- 属于该组织的所有数据
  AND lifecycle_state != 'DELETED'

-- 场景3：上下文仅包含租户（无组织、无部门）
SELECT * FROM entities
WHERE tenant_id = ?
  AND (organization_id IS NULL OR organization_id IS NOT NULL)  -- 租户下所有数据
  AND lifecycle_state != 'DELETED'
```

#### 2. 上下文传递机制

租户上下文在以下链路中自动传递：

- HTTP 请求 → 中间件提取
- 中间件 → Command/Query 注入
- Command/Query → 仓储自动应用
- 仓储 → 数据库查询过滤
- 聚合根 → 领域事件包含租户信息

#### 3. 权限验证机制

- **请求入口**: 如果无法提取租户上下文，立即拒绝请求并返回 403 Forbidden，记录安全审计日志
- **命令执行前**: 验证租户上下文有效性，无效则拒绝执行
- **仓储操作前**: 验证实体是否属于当前租户
- **跨租户操作**: 验证管理员权限（严格限制）
- **跨组织操作**: 验证组织访问权限（默认拒绝，需显式授权）
- **跨部门操作**: 验证部门访问权限（默认拒绝，需显式授权）
- **上下文丢失**: 如果在处理链路中发现上下文丢失，立即终止操作并返回错误

## Implementation Plan

### Phase 1: 基础标识符和上下文 (P1)

1. **创建租户标识符 (TenantId)**
   - 实现 `TenantId` 值对象
   - 实现验证和比较逻辑
   - 编写单元测试

2. **创建组织标识符 (OrganizationId)**
   - 实现 `OrganizationId` 值对象
   - 实现层级关系管理
   - 编写单元测试

3. **创建部门标识符 (DepartmentId)**
   - 实现 `DepartmentId` 值对象
   - 实现层级关系管理和组织关联
   - 编写单元测试

4. **创建租户上下文 (TenantContext)**
   - 实现 `TenantContext` 值对象（支持租户、组织、部门）
   - 实现权限验证逻辑
   - 编写单元测试

### Phase 2: 实体和聚合根增强 (P1)

4. **创建租户隔离实体基类**
   - 实现 `TenantIsolatedEntity` 基类
   - 实现租户验证逻辑
   - 编写单元测试

5. **创建租户隔离聚合根基类**
   - 实现 `TenantIsolatedAggregateRoot` 基类
   - 确保领域事件包含租户信息
   - 编写单元测试

### Phase 3: 仓储增强 (P1)

6. **扩展仓储接口**
   - 定义 `ITenantIsolatedRepository` 接口
   - 定义租户隔离查询方法
   - 编写接口文档

### Phase 4: 应用层中间件 (P1)

7. **实现租户上下文提取器**
   - 实现 `ITenantContextExtractor` 接口
   - 支持多种提取方式（HTTP Header、JWT Token等）
   - 编写单元测试

8. **实现租户上下文中间件**
   - 实现 `TenantContextMiddleware`
   - 集成到命令查询总线
   - 编写单元测试和集成测试

### Phase 5: 命令和查询增强 (P1)

9. **增强 BaseCommand**
   - 添加 `tenantContext` 属性
   - 更新构造函数和验证逻辑
   - 编写单元测试

10. **增强 BaseQuery**
    - 添加 `tenantContext` 属性
    - 更新构造函数和验证逻辑
    - 编写单元测试

### Phase 6: 权限和验证 (P2)

11. **实现权限验证器**
    - 实现 `ITenantPermissionValidator` 接口
    - 支持跨租户权限验证
    - 编写单元测试

12. **实现跨租户访问支持**
    - 实现管理员权限验证
    - 实现跨租户查询方法
    - 编写单元测试和集成测试

## Technical Considerations

### 性能优化

#### 性能目标（可测量指标）

1. **查询延迟**: 租户过滤查询的延迟增加不超过 10%（相对于无隔离查询）
2. **系统吞吐量**: 系统整体吞吐量下降不超过 5%
3. **响应时间**: 95% 的租户隔离查询必须在 100ms 内完成（P95 ≤ 100ms）
4. **索引覆盖率**: 至少 90% 的租户过滤查询必须使用索引
5. **上下文提取性能**: 租户上下文提取和注入开销不超过 5ms（P95）

#### 优化策略

1. **数据库索引**: 为 `tenant_id`、`(tenant_id, organization_id)`、`(tenant_id, organization_id, department_id)` 创建联合索引，确保所有租户过滤查询都能使用索引
2. **查询优化**: 使用索引优化租户过滤查询，索引覆盖率目标 ≥90%
3. **上下文缓存**: 缓存租户上下文信息，减少重复查询，缓存命中率目标 ≥95%
4. **批量查询优化**: 批量查询时合并租户过滤条件，减少数据库往返

### 安全性

1. **输入验证**: 严格验证租户ID和组织ID的有效性
2. **权限验证**: 在所有数据访问点验证权限
3. **审计日志**: 记录所有跨租户访问操作
4. **系统数据管理**: 所有数据必须属于租户，平台配置和元数据使用特殊的系统租户，不允许存在无租户的数据实体

### 可扩展性

1. **多层级支持**: 设计支持未来扩展更多层级（部门、团队等）
2. **灵活配置**: 支持不同业务场景的隔离规则配置
3. **插件机制**: 支持自定义隔离规则插件

## Testing Strategy

### 单元测试

- TenantId、OrganizationId、TenantContext 的创建、验证、比较
- TenantIsolatedEntity 和 TenantIsolatedAggregateRoot 的租户隔离验证
- 中间件和提取器的上下文提取和注入逻辑

### 集成测试

- 完整的请求处理链路中的上下文传递
- 仓储查询的自动过滤机制
- 跨租户访问权限验证

### 端到端测试

- 多租户数据隔离的完整场景
- 多层级数据隔离的完整场景
- 跨租户管理员操作场景

## Migration Strategy

### 现有代码迁移

1. **逐步迁移**: 现有实体可以逐步迁移到 `TenantIsolatedEntity`
2. **向后兼容**: 保持现有 Entity 基类，新功能使用新基类
3. **数据迁移**: 为现有数据添加 `tenant_id` 字段（需要数据迁移脚本）

## Clarifications

### Session 2024-12-20

- Q: 是否需要支持系统级别的数据（无租户）？ → A: B - 禁止系统级别数据，所有数据必须属于租户（平台数据使用特殊系统租户）
- Q: 查询上下文不一致时的隔离行为（如指定组织但缺少部门ID）？ → A: C - 严格匹配：如果指定了组织，只查询属于该组织的数据（不论是否有部门ID）；如果指定了部门，只查询属于该部门的数据
- Q: 租户上下文提取失败时的错误处理？ → A: B - 立即拒绝请求并返回 403 Forbidden，记录安全审计日志
- Q: 性能目标和可测量指标？ → A: A - 定义具体性能目标：查询延迟增加 ≤10%，吞吐量下降 ≤5%，P95 查询时间 ≤100ms
- Q: 跨层级访问权限的默认模型？ → A: C - 默认严格隔离，必须显式授予权限才能跨层级访问

## Open Questions

1. ~~**默认租户**: 是否需要支持系统级别的数据（无租户）？~~ ✅ 已澄清：禁止系统级别数据，平台数据使用特殊系统租户
2. **层级深度**: 支持多少层级的组织层级？
3. **共享数据**: 如何实现租户间的数据共享需求？
4. **性能影响**: 租户过滤对查询性能的影响如何评估和优化？

## References

- Clean Architecture principles
- Domain-Driven Design patterns
- Multi-tenant architecture best practices
- Data isolation strategies for SAAS platforms
