# Tasks: Interface Kernel Alignment

## Phase 1 — Setup
- [ ] T001 Create project structure refs in specs/001-align-interface-kernel
- [X] T002 Add package scaffolding for libs/kernel/interface-kernel (ensure type: module, engines.node>=20)
- [X] T003 Configure tsconfig.build.json for NodeNext ES2022 in libs/kernel/interface-kernel
- [X] T004 Configure Jest in libs/kernel/interface-kernel with coverage thresholds (90%/95%)
- [ ] T005 Add ESLint integration extending monorepo config in libs/kernel/interface-kernel

## Phase 2 — Foundational
- [X] T006 Draft public API surface file libs/kernel/interface-kernel/src/index.ts
- [X] T007 Define version policy and release rules in libs/kernel/interface-kernel/CHANGELOG.md
- [X] T008 Add CI coverage gate placeholder (docs/scripts) for public API ≥90%
- [X] T009 [P] Add typed error model contracts (DomainException, BusinessException) in libs/kernel/interface-kernel/src/errors/

## Phase 3 — User Story 1 (P1): 统一接口内核契约
- [X] T010 [US1] Add identifier contracts (EntityId, TenantId, OrganizationId, DepartmentId) in libs/kernel/interface-kernel/src/identifiers/
- [X] T011 [P] [US1] Add TenantContext type in libs/kernel/interface-kernel/src/context/tenant-context.ts
- [X] T012 [US1] Add repository contracts (IRepository, ITenantIsolatedRepository, IQueryRepository) in libs/kernel/interface-kernel/src/repositories/
- [X] T013 [P] [US1] Add CQRS base contracts (BaseCommand/BaseQuery types/interfaces) in libs/kernel/interface-kernel/src/cqrs/
- [X] T014 [US1] Add event store interface (IEventStore + DomainEvent shape) in libs/kernel/interface-kernel/src/events/
- [X] T015 [P] [US1] Add result contracts (CommandResult, QueryResult) in libs/kernel/interface-kernel/src/results/
- [X] T016 [US1] Add pagination/sorting/filtering models in libs/kernel/interface-kernel/src/models/
- [X] T017 [US1] Export all public contracts from libs/kernel/interface-kernel/src/index.ts
- [X] T018 [US1] Add Chinese TSDoc to all public APIs per project rules
- [X] T019 [US1] Unit tests for all public contracts (≥90% coverage) in libs/kernel/interface-kernel/__tests__/

## Phase 4 — User Story 2 (P2): 稳定一致的接口消费体验
- [ ] T020 [US2] Create sample consumer demonstrating impl swap without call-site change in examples/interface-consumer/README.md
- [ ] T021 [P] [US2] Sample consumer: REST adapter using `/v{MAJOR}` path version in examples/interface-consumer/rest/
- [ ] T022 [P] [US2] Sample consumer: GraphQL adapter with schema version note in examples/interface-consumer/graphql/
- [ ] T023 [US2] E2E script: switch infra implementations with identical behavior in examples/interface-consumer/scripts/e2e-switch.sh

## Phase 5 — User Story 3 (P3): 对齐规则与合规
- [ ] T024 [US3] Generate alignment matrix doc mapping contracts → kernel implementers in specs/001-align-interface-kernel/contracts/MATRIX.md
- [ ] T025 [US3] Add change report template and SemVer policy doc in specs/001-align-interface-kernel/contracts/CHANGE-POLICY.md
- [ ] T026 [US3] Lint rule or script to detect breaking surface changes libs/kernel/interface-kernel/scripts/check-breaking.mjs

## Phase 6 — Polish & Cross-Cutting
- [ ] T027 Add quickstart sync: confirm examples align with quickstart.md
- [ ] T028 Ensure exports map completeness and tree-shaking in package.json
- [ ] T029 Validate NodeNext/CJS ban and strict mode in tsconfig.json
- [ ] T030 Add README.md for @hl8/interface-kernel with scope and versioning

## Dependencies (Story Order)
1) US1 → 2) US2 → 3) US3

## Parallel Opportunities
- T011, T013, T015 可并行（不同子目录，互不依赖）
- T021, T022 可并行（不同示例）

## MVP Scope
- 完成 Phase 3（US1）即形成可用契约基线，可独立验证编译与类型一致性。

