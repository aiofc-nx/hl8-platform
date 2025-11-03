# Contracts Overview (Interface Kernel)

This folder documents the public contracts to be produced by `@hl8/interface-kernel`.

## Scope (Phase 1)
- Identifiers: `EntityId`, `TenantId`, `OrganizationId`, `DepartmentId`
- Context: `TenantContext`
- Repositories: `IRepository<T>`, `ITenantIsolatedRepository<T>`, `IQueryRepository<T>`
- CQRS Bases: `BaseCommand`, `BaseQuery`, results `CommandResult`, `QueryResult`
- Events: `IEventStore`, `DomainEvent` base shapes
- Pagination / Sorting / Filtering models
- Error model: `DomainException`, `BusinessException`

## Versioning
- Contracts follow SemVer; API path version `/v{MAJOR}` MUST align with contracts MAJOR.
- Deprecations span ≥2 MINOR versions; no leap removals.

## Notes
- Contracts are framework-agnostic. NestJS types remain in application/integration layers, not here.

