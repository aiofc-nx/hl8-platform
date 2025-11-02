# Tasks: Infrastructure Kernel Enhancement and Alignment

**Input**: Design documents from `/specs/005-infrastructure-kernel-enhancement/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: All tasks include unit tests and integration tests following the project's test architecture (单元测试就近原则，集成测试集中管理).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure validation

- [x] T001 Verify TypeScript 5.9.3 and Node.js >=20 configuration in libs/kernel/infrastructure-kernel/tsconfig.json
- [x] T002 [P] Verify all dependencies in libs/kernel/infrastructure-kernel/package.json (@nestjs/core, @nestjs/common, @nestjs/cqrs, mikro-orm, @mikro-orm/postgresql, @mikro-orm/mongodb, @hl8/domain-kernel, @hl8/application-kernel, @hl8/config, @hl8/logger)
- [x] T003 [P] Verify Jest and testcontainers configuration in libs/kernel/infrastructure-kernel/jest.config.ts
- [x] T004 [P] Verify project structure matches plan.md in libs/kernel/infrastructure-kernel/

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T005 Create exception converter interface in libs/kernel/infrastructure-kernel/src/exceptions/exception-converter.interface.ts
- [x] T006 [P] Create base entity mapper interface in libs/kernel/infrastructure-kernel/src/mappers/entity-mapper.interface.ts
- [x] T007 [P] Verify BaseEntity exists and is properly configured in libs/kernel/infrastructure-kernel/src/entities/base/base-entity.ts
- [x] T008 [P] Verify TenantIsolatedPersistenceEntity exists and is properly configured in libs/kernel/infrastructure-kernel/src/entities/base/tenant-isolated-persistence-entity.ts
- [x] T009 Configure MikroORM connection and EntityManager setup in libs/kernel/infrastructure-kernel/src/config/mikro-orm.config.ts

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - 正式实现 ITenantIsolatedRepository 接口 (Priority: P1) 🎯 MVP

**Goal**: 正式实现 domain-kernel 定义的 ITenantIsolatedRepository 接口，确保类型安全和使用一致性

**Independent Test**: 可以独立测试仓储类是否实现 ITenantIsolatedRepository 接口，验证所有接口方法都已实现，确保类型系统能正确识别实现关系

### Tests for User Story 1

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T010 [P] [US1] Create unit test for ITenantIsolatedRepository interface implementation in libs/kernel/infrastructure-kernel/src/repositories/tenant-isolated/tenant-isolated-repository.spec.ts
- [x] T011 [P] [US1] Create integration test for tenant isolation in libs/kernel/infrastructure-kernel/test/integration/tenant-isolation.integration.spec.ts

### Implementation for User Story 1

- [x] T012 [US1] Modify MikroORMTenantIsolatedRepository to formally implement ITenantIsolatedRepository interface in libs/kernel/infrastructure-kernel/src/repositories/tenant-isolated/tenant-isolated-repository.ts (resolve type constraint conflicts using entity mapper)
- [x] T013 [US1] Ensure all ITenantIsolatedRepository methods are implemented: findByIdWithContext, findAllByContext, findByTenant, findByOrganization, findByDepartment, belongsToTenant, belongsToOrganization, belongsToDepartment, findByIdCrossTenant, countByTenant, countByOrganization, countByDepartment
- [x] T014 [US1] Update exports to include ITenantIsolatedRepository interface in libs/kernel/infrastructure-kernel/src/repositories/index.ts
- [x] T015 [US1] Add TSDoc comments in Chinese for all public methods in libs/kernel/infrastructure-kernel/src/repositories/tenant-isolated/tenant-isolated-repository.ts

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently. TypeScript compiler should validate interface compliance with zero errors.

---

## Phase 4: User Story 2 - 完善领域实体到持久化实体的映射器 (Priority: P1)

**Goal**: 提供完整的实体映射器，能够将 domain-kernel 的领域实体转换为 infrastructure-kernel 的持久化实体，并在持久化后转换回领域实体

**Independent Test**: 可以独立测试实体映射器的转换功能，验证领域实体的所有属性都能正确映射到持久化实体，持久化实体也能正确映射回领域实体，确保数据完整性和业务逻辑不丢失

### Tests for User Story 2

- [x] T016 [P] [US2] Create unit test for EntityMapper in libs/kernel/infrastructure-kernel/src/mappers/entity-mapper.spec.ts
- [x] T017 [P] [US2] Create integration test for entity mapping in libs/kernel/infrastructure-kernel/test/integration/entity-mapper.integration.spec.ts

### Implementation for User Story 2

- [x] T018 [P] [US2] Create EntityMapper class with automatic mapping in libs/kernel/infrastructure-kernel/src/mappers/entity-mapper.ts
- [x] T019 [P] [US2] Create MappingConfig interface for manual mapping configuration in libs/kernel/infrastructure-kernel/src/mappers/mapping-config.ts
- [x] T020 [US2] Implement toDomain method with automatic + manual mapping in libs/kernel/infrastructure-kernel/src/mappers/entity-mapper.ts
- [x] T021 [US2] Implement toPersistence method with automatic + manual mapping in libs/kernel/infrastructure-kernel/src/mappers/entity-mapper.ts
- [x] T022 [US2] Implement toDomainList and toPersistenceList batch methods in libs/kernel/infrastructure-kernel/src/mappers/entity-mapper.ts
- [x] T023 [US2] Implement nested aggregate mapping support in libs/kernel/infrastructure-kernel/src/mappers/entity-mapper.ts
- [x] T024 [US2] Add TSDoc comments in Chinese for all public methods in libs/kernel/infrastructure-kernel/src/mappers/entity-mapper.ts

**Checkpoint**: At this point, User Story 2 should be fully functional. Entity mappers should successfully convert 100% of domain entity properties without data loss.

---

## Phase 5: User Story 3 - 完善基础仓储的 IRepository 接口实现 (Priority: P1)

**Goal**: 基础仓储完整实现 domain-kernel 定义的 IRepository 接口的所有方法，包括 findAll、count 等缺失方法

**Independent Test**: 可以独立测试基础仓储的所有 IRepository 方法，验证 findAll、count 等方法都已实现并正确工作，确保与 domain-kernel 接口定义完全一致

### Tests for User Story 3

- [x] T025 [P] [US3] Create unit test for findAll and count methods in libs/kernel/infrastructure-kernel/src/repositories/base/repository.base.spec.ts
- [x] T026 [P] [US3] Create integration test for IRepository interface completeness in libs/kernel/infrastructure-kernel/test/integration/repository.integration.spec.ts

### Implementation for User Story 3

- [x] T027 [US3] Implement findAll method in libs/kernel/infrastructure-kernel/src/repositories/base/repository.base.ts
- [x] T028 [US3] Implement count method in libs/kernel/infrastructure-kernel/src/repositories/base/repository.base.ts
- [x] T029 [US3] Implement saveMany batch operation in libs/kernel/infrastructure-kernel/src/repositories/base/repository.base.ts
- [x] T030 [US3] Implement deleteMany batch operation in libs/kernel/infrastructure-kernel/src/repositories/base/repository.base.ts
- [x] T031 [US3] Add pagination support for findAll in libs/kernel/infrastructure-kernel/src/repositories/base/repository.base.ts
- [x] T032 [US3] Add TSDoc comments in Chinese for all new methods in libs/kernel/infrastructure-kernel/src/repositories/base/repository.base.ts

**Checkpoint**: At this point, User Story 3 should be fully functional. All IRepository interface methods should be implemented with 90%+ test coverage.

---

## Phase 6: User Story 4 - 完善事务管理支持 (Priority: P1)

**Goal**: 提供完整的事务管理能力，支持事务的开始、提交、回滚和嵌套事务

**Independent Test**: 可以独立测试事务管理功能，验证事务的开始、提交、回滚操作，测试嵌套事务的支持，确保并发场景下事务隔离级别的正确性

### Tests for User Story 4

- [x] T033 [P] [US4] Create unit test for TransactionManager in libs/kernel/infrastructure-kernel/src/transactions/transaction-manager.spec.ts
- [x] T034 [P] [US4] Create integration test for nested transactions in libs/kernel/infrastructure-kernel/test/integration/transaction.integration.spec.ts

### Implementation for User Story 4

- [x] T035 [P] [US4] Create ITransactionManager interface in libs/kernel/infrastructure-kernel/src/transactions/transaction-manager.interface.ts
- [x] T036 [P] [US4] Create TransactionContext class in libs/kernel/infrastructure-kernel/src/transactions/transaction-context.ts
- [x] T037 [US4] Implement MikroORMTransactionManager class with begin, commit, rollback methods in libs/kernel/infrastructure-kernel/src/transactions/transaction-manager.ts
- [x] T038 [US4] Implement runInTransaction method in libs/kernel/infrastructure-kernel/src/transactions/transaction-manager.ts
- [x] T039 [US4] Implement nested transaction support (up to 5 levels) in libs/kernel/infrastructure-kernel/src/transactions/transaction-manager.ts
- [x] T040 [US4] Add TSDoc comments in Chinese for all public methods in libs/kernel/infrastructure-kernel/src/transactions/transaction-manager.ts

**Checkpoint**: At this point, User Story 4 should be fully functional. Transaction management should support nested transactions up to 5 levels deep with correct rollback behavior.

---

## Phase 7: User Story 5 - 完善查询构建器和规范模式支持 (Priority: P2)

**Goal**: 提供查询构建器，支持 domain-kernel 的规范模式（Specification Pattern），能够将业务规则规范转换为数据库查询

**Independent Test**: 可以独立测试查询构建器和规范支持，验证简单规范和组合规范（AND、OR、NOT）都能正确转换为数据库查询，查询结果符合规范定义的业务规则

### Tests for User Story 5

- [ ] T041 [P] [US5] Create unit test for SpecificationConverter in libs/kernel/infrastructure-kernel/src/queries/specification-converter.spec.ts
- [ ] T042 [P] [US5] Create integration test for specification pattern queries in libs/kernel/infrastructure-kernel/test/integration/specification-query.integration.spec.ts

### Implementation for User Story 5

- [ ] T043 [P] [US5] Create ISpecificationConverter interface in libs/kernel/infrastructure-kernel/src/queries/specification-converter.interface.ts
- [ ] T044 [P] [US5] Create QueryBuilder class in libs/kernel/infrastructure-kernel/src/queries/query-builder.ts
- [ ] T045 [US5] Implement SpecificationConverter with convertToQuery method in libs/kernel/infrastructure-kernel/src/queries/specification-converter.ts
- [ ] T046 [US5] Implement AND, OR, NOT combination support (nesting depth ≤ 5) in libs/kernel/infrastructure-kernel/src/queries/specification-converter.ts
- [ ] T047 [US5] Implement automatic tenant filter injection for tenant-isolated queries in libs/kernel/infrastructure-kernel/src/queries/query-builder.ts
- [ ] T048 [US5] Add TSDoc comments in Chinese for all public methods in libs/kernel/infrastructure-kernel/src/queries/specification-converter.ts

**Checkpoint**: At this point, User Story 5 should be fully functional. Specification Pattern queries should execute with 100% accuracy for specifications with nesting depth ≤ 5 levels.

---

## Phase 8: User Story 6 - 完善与 application-kernel 的事件存储集成 (Priority: P2)

**Goal**: 提供对 application-kernel 事件存储的数据持久化支持，确保领域事件能够持久化到数据库

**Independent Test**: 可以独立测试事件存储集成，验证领域事件的保存、查询、重放功能，确保事件能够正确持久化到数据库并支持按聚合根ID查询事件流

### Tests for User Story 6

- [ ] T049 [P] [US6] Create unit test for MikroORMEventStore in libs/kernel/infrastructure-kernel/src/events/event-store.impl.spec.ts
- [ ] T050 [P] [US6] Create integration test for event store in libs/kernel/infrastructure-kernel/test/integration/event-store.integration.spec.ts

### Implementation for User Story 6

- [ ] T051 [P] [US6] Create EventEntity persistence entity in libs/kernel/infrastructure-kernel/src/events/event-entity.ts
- [ ] T052 [P] [US6] Create EventSnapshotEntity persistence entity in libs/kernel/infrastructure-kernel/src/events/event-snapshot-entity.ts
- [ ] T053 [US6] Implement MikroORMEventStore class implementing IEventStore interface in libs/kernel/infrastructure-kernel/src/events/event-store.impl.ts
- [ ] T054 [US6] Implement saveEvents method with optimistic concurrency control in libs/kernel/infrastructure-kernel/src/events/event-store.impl.ts
- [ ] T055 [US6] Implement getEvents and getEventStream methods in libs/kernel/infrastructure-kernel/src/events/event-store.impl.ts
- [ ] T056 [US6] Implement getSnapshot and saveSnapshot methods in libs/kernel/infrastructure-kernel/src/events/event-store.impl.ts
- [ ] T057 [US6] Implement getAllEvents, getCurrentVersion, exists, getStatistics methods in libs/kernel/infrastructure-kernel/src/events/event-store.impl.ts
- [ ] T058 [US6] Create database migrations for event_store and event_snapshots tables in libs/kernel/infrastructure-kernel/migrations/
- [ ] T059 [US6] Add TSDoc comments in Chinese for all public methods in libs/kernel/infrastructure-kernel/src/events/event-store.impl.ts

**Checkpoint**: At this point, User Story 6 should be fully functional. Event store integration should support saving and querying events for aggregates with 100,000+ events per aggregate without performance degradation.

---

## Phase 9: User Story 7 - 完善仓储工厂和依赖注入支持 (Priority: P2)

**Goal**: 提供仓储工厂，支持 NestJS 依赖注入，能够方便地创建和注入仓储实例

**Independent Test**: 可以独立测试仓储工厂和 NestJS 模块，验证仓储可以通过依赖注入获取，确保不同类型实体（普通实体、租户隔离实体）的仓储都能正确创建和注入

### Tests for User Story 7

- [ ] T060 [P] [US7] Create unit test for RepositoryFactory in libs/kernel/infrastructure-kernel/src/repositories/factory/repository-factory.spec.ts
- [ ] T061 [P] [US7] Create integration test for NestJS DI in libs/kernel/infrastructure-kernel/test/integration/repository-factory.integration.spec.ts

### Implementation for User Story 7

- [ ] T062 [P] [US7] Create IRepositoryFactory interface in libs/kernel/infrastructure-kernel/src/repositories/factory/repository-factory.interface.ts
- [ ] T063 [US7] Implement RepositoryFactory class with createRepository method in libs/kernel/infrastructure-kernel/src/repositories/factory/repository-factory.ts
- [ ] T064 [US7] Implement mapper registry and getMapper method in libs/kernel/infrastructure-kernel/src/repositories/factory/repository-factory.ts
- [ ] T065 [US7] Create InfrastructureKernelModule NestJS module in libs/kernel/infrastructure-kernel/src/module/infrastructure-kernel.module.ts
- [ ] T066 [US7] Register RepositoryFactory and TransactionManager as providers in libs/kernel/infrastructure-kernel/src/module/infrastructure-kernel.module.ts
- [ ] T067 [US7] Add TSDoc comments in Chinese for all public methods in libs/kernel/infrastructure-kernel/src/repositories/factory/repository-factory.ts

**Checkpoint**: At this point, User Story 7 should be fully functional. Repository factory should create correct repository instances for all entity types with 100% success rate.

---

## Phase 10: User Story 8 - 完善错误处理和异常体系对齐 (Priority: P2)

**Goal**: 异常体系与 domain-kernel 和 application-kernel 完全对齐，确保异常类型、错误码和错误信息的一致性

**Independent Test**: 可以独立测试异常体系，验证 infrastructure-kernel 抛出的异常符合 domain-kernel 定义的异常类型，确保异常能够被 application-kernel 正确捕获和处理

### Tests for User Story 8

- [ ] T068 [P] [US8] Create unit test for ExceptionConverter in libs/kernel/infrastructure-kernel/src/exceptions/exception-converter.spec.ts
- [ ] T069 [P] [US8] Create integration test for exception alignment in libs/kernel/infrastructure-kernel/test/integration/exception-alignment.integration.spec.ts

### Implementation for User Story 8

- [ ] T070 [US8] Implement ExceptionConverter class with convertToDomainException method in libs/kernel/infrastructure-kernel/src/exceptions/exception-converter.ts
- [ ] T071 [US8] Implement MikroORM OptimisticLockException → OptimisticLockException mapping in libs/kernel/infrastructure-kernel/src/exceptions/exception-converter.ts
- [ ] T072 [US8] Implement database connection failures → RepositoryConnectionException mapping in libs/kernel/infrastructure-kernel/src/exceptions/exception-converter.ts
- [ ] T073 [US8] Implement query errors → RepositoryQueryException mapping in libs/kernel/infrastructure-kernel/src/exceptions/exception-converter.ts
- [ ] T074 [US8] Implement transaction errors → RepositoryTransactionException mapping in libs/kernel/infrastructure-kernel/src/exceptions/exception-converter.ts
- [ ] T075 [US8] Update all repository methods to use ExceptionConverter in libs/kernel/infrastructure-kernel/src/repositories/
- [ ] T076 [US8] Add TSDoc comments in Chinese for all public methods in libs/kernel/infrastructure-kernel/src/exceptions/exception-converter.ts

**Checkpoint**: At this point, User Story 8 should be fully functional. Exception converter should successfully convert 100% of MikroORM and database exceptions to domain-kernel exceptions with correct exception type mapping.

---

## Phase 11: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T077 [P] Update README.md with complete usage examples in libs/kernel/infrastructure-kernel/README.md
- [ ] T078 [P] Verify all public APIs have complete TSDoc documentation in Chinese across all modules
- [ ] T079 Run end-to-end integration test for kernel alignment in libs/kernel/infrastructure-kernel/test/e2e/kernel-alignment.e2e.spec.ts
- [ ] T080 [P] Run quickstart.md validation scenarios
- [ ] T081 Verify test coverage ≥ 80% (core business logic ≥ 90%) using coverage reports
- [ ] T082 [P] Performance testing for query response time < 100ms (10万条记录内)
- [ ] T083 [P] Performance testing for event store with 100,000+ events per aggregate
- [ ] T084 Final code review and refactoring across all modules
- [ ] T085 Update exports in libs/kernel/infrastructure-kernel/src/index.ts to include all new modules

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-10)**: All depend on Foundational phase completion
  - P1 stories (US1, US2, US3, US4) can proceed in parallel after Foundational
  - P2 stories (US5, US6, US7, US8) can proceed in parallel after Foundational, but may benefit from P1 completion
- **Polish (Phase 11)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P1)**: Can start after Foundational (Phase 2) - Independent but may share BaseEntity
- **User Story 3 (P1)**: Can start after Foundational (Phase 2) - Independent, extends existing repository
- **User Story 4 (P1)**: Can start after Foundational (Phase 2) - Independent, provides infrastructure
- **User Story 5 (P2)**: Can start after Foundational (Phase 2) - May benefit from US4 (TransactionManager)
- **User Story 6 (P2)**: Can start after Foundational (Phase 2) - Independent, implements IEventStore
- **User Story 7 (P2)**: Can start after Foundational (Phase 2) - Depends on US1, US2, US3, US4 (needs repositories and mappers)
- **User Story 8 (P2)**: Can start after Foundational (Phase 2) - Should be implemented early as it affects all repositories

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- Interfaces before implementations
- Core implementation before integration
- Story complete before moving to next priority
- All public APIs must have TSDoc comments in Chinese

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- All Foundational tasks marked [P] can run in parallel (within Phase 2)
- Once Foundational phase completes, all P1 user stories can start in parallel
- All P2 user stories can start in parallel after Foundational (with noted dependencies)
- All tests for a user story marked [P] can run in parallel
- Different user stories can be worked on in parallel by different team members

---

## Parallel Example: User Story 1

```bash
# Launch all tests for User Story 1 together:
Task T010: "Create unit test for ITenantIsolatedRepository interface implementation"
Task T011: "Create integration test for tenant isolation"

# All tests can be written in parallel before implementation
```

---

## Parallel Example: User Story 2

```bash
# Launch EntityMapper and MappingConfig in parallel:
Task T018: "Create EntityMapper class with automatic mapping"
Task T019: "Create MappingConfig interface for manual mapping configuration"

# Both can be implemented in parallel
```

---

## Parallel Example: Foundational Phase

```bash
# Launch all foundational tasks in parallel:
Task T005: "Create exception converter interface"
Task T006: "Create base entity mapper interface"
Task T007: "Verify BaseEntity exists"
Task T008: "Verify TenantIsolatedPersistenceEntity exists"
Task T009: "Configure MikroORM connection"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1 (正式实现 ITenantIsolatedRepository 接口)
4. **STOP and VALIDATE**: Test User Story 1 independently
5. Deploy/demo if ready

### Incremental Delivery (Recommended)

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Validate (MVP!)
3. Add User Story 2 → Test independently → Validate (Entity Mapping)
4. Add User Story 3 → Test independently → Validate (Complete IRepository)
5. Add User Story 4 → Test independently → Validate (Transaction Management)
6. Add User Story 8 → Test independently → Validate (Exception Alignment - affects all)
7. Add User Story 5 → Test independently → Validate (Specification Pattern)
8. Add User Story 6 → Test independently → Validate (Event Store)
9. Add User Story 7 → Test independently → Validate (Repository Factory)
10. Polish Phase → Final validation

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (ITenantIsolatedRepository)
   - Developer B: User Story 2 (Entity Mapper)
   - Developer C: User Story 3 (Complete IRepository)
   - Developer D: User Story 4 (Transaction Manager)
3. After P1 stories complete:
   - Developer A: User Story 8 (Exception Converter)
   - Developer B: User Story 5 (Specification Pattern)
   - Developer C: User Story 6 (Event Store)
   - Developer D: User Story 7 (Repository Factory)
4. Stories complete and integrate independently

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests fail before implementing
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- All public APIs must have complete TSDoc documentation in Chinese
- Follow test architecture: unit tests next to source files, integration tests in test/ directory
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence

---

## Task Summary

**Total Tasks**: 85

- Phase 1 (Setup): 4 tasks
- Phase 2 (Foundational): 5 tasks
- Phase 3 (US1): 5 tasks
- Phase 4 (US2): 9 tasks
- Phase 5 (US3): 8 tasks
- Phase 6 (US4): 8 tasks
- Phase 7 (US5): 8 tasks
- Phase 8 (US6): 11 tasks
- Phase 9 (US7): 8 tasks
- Phase 10 (US8): 9 tasks
- Phase 11 (Polish): 9 tasks

**Parallel Opportunities**:

- Setup phase: 3 parallel tasks
- Foundational phase: 4 parallel tasks
- User stories can be worked on in parallel after foundational phase

**MVP Scope**: User Story 1 only (正式实现 ITenantIsolatedRepository 接口)

**Independent Test Criteria**:

- US1: TypeScript compiler validates interface compliance with zero errors
- US2: Entity mappers successfully convert 100% of domain entity properties without data loss
- US3: All IRepository interface methods implemented with 90%+ test coverage
- US4: Transaction management supports nested transactions up to 5 levels deep
- US5: Specification Pattern queries execute with 100% accuracy for nesting depth ≤ 5 levels
- US6: Event store supports saving and querying events for aggregates with 100,000+ events per aggregate
- US7: Repository factory creates correct repository instances with 100% success rate
- US8: Exception converter successfully converts 100% of MikroORM and database exceptions with correct type mapping
