# Research: Interface Kernel Alignment

## Decisions

1. Versioning strategy for Interface Layer

- Decision: URI path versioning (/v{MAJOR}) aligned with interface-kernel SemVer MAJOR
- Rationale: Simple, cache-friendly, gateway/doc tooling support; ties API to contract version
- Alternatives: Header-based, media type versioning, no explicit version (rejected for complexity/ambiguity)

2. Initial scope of alignment

- Decision: Core contract subset only (Identifiers, TenantContext, Repository interfaces, Command/Query bases, Event interfaces, Results, Pagination/Sorting/Filtering, Error model)
- Rationale: Fast iteration, reduced risk, establishes stable baseline
- Alternatives: Full alignment upfront; include CQRS+events full set (rejected due to scope/time)

3. Deprecation and removal policy

- Decision: Deprecated spans ≥2 MINOR versions; no leap removal; migration guides required per MINOR
- Rationale: Protect consumers, predictable migration windows
- Alternatives: 1 MINOR or time-window only (rejected for consumer risk)

4. SemVer governance

- Decision: Strict SemVer; MAJOR freeze ≥3 months; MINOR non‑breaking additive; PATCH bugfixes
- Rationale: Ecosystem stability; planned breaking changes
- Alternatives: Flexible MAJOR cadence (rejected for risk)

5. Infrastructure usage preference

- Decision: Prefer organization `libs/infra/*` adapters for DB/Cache/MQ integration; interface-kernel exposes contracts only
- Rationale: Avoid third‑party coupling; centralize adapters
- Alternatives: Direct third‑party exposure (rejected)

## Notes

- Non-functional coverage in spec: tests ≥90% for public APIs; change reports for breaking changes.
- Interface-kernel must remain framework-agnostic at contract level; NestJS only in interface consumers, not in contracts.
