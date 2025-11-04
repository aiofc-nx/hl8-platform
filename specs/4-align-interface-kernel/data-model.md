# Data Model: Interface Kernel Contracts

## Entities & Types

### Identifiers

- EntityId: string (UUID) — 唯一标识领域实体
- TenantId: string — 租户标识
- OrganizationId: string — 组织标识（可选，属于Tenant）
- DepartmentId: string — 部门标识（可选，属于Organization）

### TenantContext

- tenantId: TenantId (required)
- organizationId?: OrganizationId
- departmentId?: DepartmentId
- permissions?: string[] (含跨租户/层级权限)

### Repository Contracts

- IRepository<T>
  - save(entity: T): Promise<T>
  - findById(id: EntityId): Promise<T|null>
  - findAll(): Promise<T[]>
  - delete(id: EntityId): Promise<void>
  - exists(id: EntityId): Promise<boolean>
- ITenantIsolatedRepository<T>
  - findByIdWithContext(id: EntityId, ctx: TenantContext): Promise<T|null>
  - findAllByContext(ctx: TenantContext): Promise<T[]>
  - findByTenant(tenantId: TenantId, ctx: TenantContext): Promise<T[]>
  - findByOrganization(orgId: OrganizationId, ctx: TenantContext): Promise<T[]>
  - findByDepartment(deptId: DepartmentId, ctx: TenantContext): Promise<T[]>
- IQueryRepository<T>
  - queryBySpecification(spec): Promise<T[]>
  - countBySpecification(spec): Promise<number>

### CQRS Base Contracts

- BaseCommand
  - commandId: string; aggregateId: string; commandType: string
  - correlationId?: string; userId?: string; timestamp?: Date; version?: string
  - metadata?: Record<string, unknown>; tenantContext?: TenantContext
- BaseQuery
  - queryId: string; queryType: string
  - correlationId?: string; userId?: string; timestamp?: Date; version?: string
  - pagination?: { page: number; limit: number; offset?: number }
  - sorting?: Array<{ field: string; direction: "asc"|"desc" }>
  - filters?: Record<string, unknown>; metadata?: Record<string, unknown>

### Event Store Contracts

- IEventStore
  - saveEvents(aggregateId: EntityId, events: DomainEvent[], expectedVersion: number)
  - getEventsForAggregate(aggregateId: EntityId)

### Result Contracts

- CommandResult: success | data | error | code | timestamp | executionTime
- QueryResult: success | data | error | code | timestamp | executionTime

### Pagination/Sorting/Filtering

- Pagination: page, limit, offset?
- Sorting: field, direction
- Filtering: Record<string, unknown>

### Error Model

- DomainException: code, message, details?
- BusinessException: code, message, details?

## Relationships & Constraints

- OrganizationId 属于 TenantId；DepartmentId 属于 OrganizationId
- ITenantIsolatedRepository 所有读取均须应用 TenantContext 过滤
- 同一 MAJOR 版本下契约后向兼容；破坏性变更仅在 MAJOR 提升

## State & Lifecycle

- Contracts versioned via SemVer; deprecations span ≥2 MINOR versions; removal only after window
