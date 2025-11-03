# Tasks: Infrastructure Kernel Core Module

**Feature**: Infrastructure Kernel Core Module  
**Date**: 2025-11-02  
**Status**: Ready for Implementation  
**Total Tasks**: 82  
**Estimated Duration**: 4-5 weeks

## Overview

基于Clean Architecture开发基础设施层核心模块，使用MikroORM统一PostgreSQL和MongoDB接口，实现标准化的仓储和租户隔离功能。为domain-kernel和application-kernel提供数据持久化支持，确保数据访问层的稳定性和一致性。

## Implementation Strategy

**MVP Scope**: User Story 1-2 (P1) - 基础仓储实现  
**Incremental Delivery**: 每个用户故事独立实现和测试  
**Parallel Opportunities**: 基础仓储、租户隔离仓储、配置管理可并行开发

## Dependencies

### User Story Completion Order

1. **US1**: PostgreSQL 仓储实现 (P1) - 基础，无依赖
2. **US2**: MongoDB 仓储实现 (P1) - 与US1并行
3. **US3**: PostgreSQL 租户隔离仓储 (P1) - 依赖US1
4. **US4**: MongoDB 租户隔离仓储 (P1) - 依赖US2
5. ~~**US5**: 数据库连接管理~~ - **已由 @hl8/database 提供**
6. **US6**: 查询性能优化和索引管理 (P2) - 依赖US3, US4

**Note**: 连接管理和健康检查功能已由 `@hl8/database` 模块提供，infrastructure-kernel 将直接使用这些能力。

### Parallel Execution Opportunities

- **Setup Phase**: 项目初始化可完全并行
- **Foundational Phase**: 异常、配置、健康检查可并行
- **US1 & US2**: PostgreSQL和MongoDB基础仓储可并行
- **US3 & US4**: 租户隔离仓储可并行
- **US6**: 索引优化可独立并行

## Phase 1: Setup (Project Initialization)

### T001-T020: Project Structure Setup

- [x] T001 Create project directory structure in libs/kernel/infrastructure-kernel/
- [x] T002 [P] Initialize package.json with dependencies in libs/kernel/infrastructure-kernel/package.json
- [x] T003 [P] Configure TypeScript with NodeNext module system in libs/kernel/infrastructure-kernel/tsconfig.json
- [x] T004 [P] Setup Jest configuration for testing in libs/kernel/infrastructure-kernel/jest.config.js
- [x] T005 [P] Create source directory structure in libs/kernel/infrastructure-kernel/src/
- [x] T006 [P] Create test directory structure in libs/kernel/infrastructure-kernel/test/
- [x] T007 [P] Setup ESLint configuration extending root config
- [x] T008 [P] Create main index.ts export file in libs/kernel/infrastructure-kernel/src/index.ts
- [x] T009 [P] Setup build scripts in package.json
- [x] T010 [P] Create README.md with basic documentation
- [x] T011 [P] Configure MikroORM dependencies (@mikro-orm/core, @mikro-orm/postgresql, @mikro-orm/mongodb)
- [x] T012 [P] Setup testcontainers for integration tests
- [x] T013 [P] Create mikro-orm.config.ts skeleton in libs/kernel/infrastructure-kernel/src/config/
- [x] T014 [P] Setup migration scripts in package.json
- [x] T015 [P] Create migrations directory in libs/kernel/infrastructure-kernel/migrations/
- [x] T016 [P] Configure tsconfig.build.json for production builds
- [x] T017 [P] Setup Prettier configuration
- [x] T018 [P] Create .gitignore for infrastructure-kernel
- [x] T019 [P] Setup module exports in libs/kernel/infrastructure-kernel/src/index.ts
- [ ] T020 [P] Create infrastructure-kernel.module.ts NestJS module wrapper

---

## Phase 2: Foundational (Blocking Prerequisites)

**⚠️ CRITICAL**: 所有用户故事依赖此阶段的基础设施

### T021-T035: Core Components

- [x] T021 [P] Create BaseEntity MikroORM base class in libs/kernel/infrastructure-kernel/src/entities/base/base-entity.ts
- [x] T022 [P] Create BaseEntity unit tests in libs/kernel/infrastructure-kernel/src/entities/base/base-entity.spec.ts
- [x] T023 [P] Create TenantIsolatedPersistenceEntity base class in libs/kernel/infrastructure-kernel/src/entities/base/tenant-isolated-persistence-entity.ts
- [x] T024 [P] Create TenantIsolatedPersistenceEntity unit tests in libs/kernel/infrastructure-kernel/src/entities/base/tenant-isolated-persistence-entity.spec.ts
- [x] T025 [P] Create entities index exports in libs/kernel/infrastructure-kernel/src/entities/index.ts
- [ ] T026 [P] Create MikroORM configuration in libs/kernel/infrastructure-kernel/src/config/mikro-orm.config.ts
- [ ] T027 [P] Create MikroORM configuration tests in libs/kernel/infrastructure-kernel/src/config/mikro-orm.config.spec.ts
- [x] T028 [P] Create RepositoryException in libs/kernel/infrastructure-kernel/src/errors/repository.exception.ts
- [ ] T029 [P] Create RepositoryException tests in libs/kernel/infrastructure-kernel/src/errors/repository.exception.spec.ts
- [x] T030 [P] Create errors index exports in libs/kernel/infrastructure-kernel/src/errors/index.ts
- ~~T031-T033: 已由 @hl8/database 提供健康检查功能~~

**Checkpoint**: 基础组件完成，可以开始仓储实现

---

## Phase 3: User Story 1 - PostgreSQL 仓储实现 (Priority: P1) 🎯 MVP

**Goal**: 实现标准化的PostgreSQL仓储，提供基本的CRUD操作，支持实体持久化和检索

**Independent Test**: 可以独立测试PostgreSQL仓储的实体保存、查询、更新、删除操作，验证数据库连接和事务处理

### Tests for User Story 1

> **NOTE: 遵循TDD原则，先写测试，确保失败后再实现**

- [x] T036 [US1] Create integration test for PostgreSQL repository in libs/kernel/infrastructure-kernel/test/integration/postgresql-repository.integration.spec.ts
- [x] T037 [US1] Create test fixtures in libs/kernel/infrastructure-kernel/test/fixtures/test-entities.ts

### Implementation for User Story 1

- [x] T038 [US1] Create MikroORMRepository base class in libs/kernel/infrastructure-kernel/src/repositories/base/repository.base.ts
- [ ] T039 [US1] Create MikroORMRepository unit tests in libs/kernel/infrastructure-kernel/src/repositories/base/repository.base.spec.ts
- [x] T040 [US1] Implement save method in MikroORMRepository
- [x] T041 [US1] Implement findById method in MikroORMRepository
- [x] T042 [US1] Implement findAll method in MikroORMRepository
- [x] T043 [US1] Implement delete method in MikroORMRepository
- [x] T044 [US1] Implement exists method in MikroORMRepository
- [ ] T045 [US1] Implement count method in MikroORMRepository
- [x] T046 [US1] Add error handling and logging to repository methods
- [x] T047 [US1] Create repositories index exports in libs/kernel/infrastructure-kernel/src/repositories/index.ts

**Checkpoint**: PostgreSQL仓储可以独立使用，支持基本CRUD操作

---

## Phase 4: User Story 2 - MongoDB 仓储实现 (Priority: P1)

**Goal**: 实现标准化的MongoDB仓储，使用相同的接口提供文档数据库的CRUD操作

**Independent Test**: 可以独立测试MongoDB仓储的实体保存、查询、更新、删除操作，验证文档存储

### Tests for User Story 2

- [x] T048 [US2] Create integration test for MongoDB repository in libs/kernel/infrastructure-kernel/test/integration/mongodb-repository.integration.spec.ts

### Implementation for User Story 2

- [x] T049 [US2] Verify MikroORMRepository works with MongoDB in libs/kernel/infrastructure-kernel/test/integration/mongodb-repository.integration.spec.ts
- [ ] T050 [US2] Add MongoDB-specific configuration in libs/kernel/infrastructure-kernel/src/config/mikro-orm.config.ts
- [x] T051 [US2] Test document operations with MikroORM MongoDB driver
- [x] T052 [US2] Verify transaction support for MongoDB
- [x] T053 [US2] Add MongoDB collection creation handling
- [x] T054 [US2] Test optimistic locking with MongoDB

**Checkpoint**: MongoDB仓储与PostgreSQL仓储使用相同接口，行为一致

---

## Phase 5: User Story 3 - PostgreSQL 租户隔离仓储实现 (Priority: P1)

**Goal**: 实现支持租户隔离的PostgreSQL仓储，自动应用租户过滤条件，确保数据安全隔离

**Independent Test**: 可以独立测试租户隔离仓储的查询过滤、权限验证、跨租户访问阻止

### Tests for User Story 3

- [x] T055 [US3] Create integration test for tenant isolation in libs/kernel/infrastructure-kernel/test/integration/tenant-isolation.integration.spec.ts

### Implementation for User Story 3

- [x] T056 [US3] Create TenantFilter MikroORM filter in libs/kernel/infrastructure-kernel/src/repositories/tenant-isolated/tenant-filter.ts
- [x] T057 [US3] Create TenantFilter unit tests in libs/kernel/infrastructure-kernel/src/repositories/tenant-isolated/tenant-filter.spec.ts
- [x] T058 [US3] Create MikroORMTenantIsolatedRepository class in libs/kernel/infrastructure-kernel/src/repositories/tenant-isolated/tenant-isolated-repository.ts
- [ ] T059 [US3] Create MikroORMTenantIsolatedRepository unit tests in libs/kernel/infrastructure-kernel/src/repositories/tenant-isolated/tenant-isolated-repository.spec.ts
- [x] T060 [US3] Implement findByIdWithContext method
- [x] T061 [US3] Implement findAllByContext method
- [x] T062 [US3] Implement findByTenant method
- [x] T063 [US3] Implement findByOrganization method
- [x] T064 [US3] Implement findByDepartment method
- [x] T065 [US3] Implement belongsToTenant method
- [x] T066 [US3] Implement belongsToOrganization method
- [x] T067 [US3] Implement belongsToDepartment method
- [x] T068 [US3] Implement cross-tenant access blocking
- [x] T069 [US3] Add permission validation logic
- [x] T070 [US3] Create tenant-isolated repositories index exports

**Checkpoint**: 租户隔离仓储确保100%的数据隔离，跨租户访问被阻止

---

## Phase 6: User Story 4 - MongoDB 租户隔离仓储实现 (Priority: P1)

**Goal**: 实现支持租户隔离的MongoDB仓储，与PostgreSQL隔离机制保持一致

**Independent Test**: 可以独立测试MongoDB租户隔离仓储的查询过滤和访问控制

### Tests for User Story 4

- [x] T071 [US4] Create integration test for MongoDB tenant isolation

### Implementation for User Story 4

- [x] T072 [US4] Verify TenantFilter works with MongoDB
- [x] T073 [US4] Test tenant-isolated queries in MongoDB
- [x] T074 [US4] Verify cross-tenant access blocking in MongoDB
- [x] T075 [US4] Test multi-level isolation in MongoDB

**Checkpoint**: MongoDB和PostgreSQL租户隔离机制行为一致

---

## Phase 7: User Story 6 - 查询性能优化和索引管理 (Priority: P2)

**Goal**: 为租户隔离查询创建数据库索引，确保查询性能符合SLA要求

**Independent Test**: 可以独立测试索引创建、查询性能验证、索引选择优化

### Tests for User Story 6

- [ ] T083 [US6] Create performance benchmark test in libs/kernel/infrastructure-kernel/test/integration/performance.integration.spec.ts

### Implementation for User Story 6

- [ ] T084 [US6] Create migration script for tenant isolation indexes in libs/kernel/infrastructure-kernel/migrations/Migration20250101000000.ts
- [ ] T085 [US6] Create PostgreSQL composite indexes (tenant_id, organization_id, department_id)
- [ ] T086 [US6] Create MongoDB composite indexes (tenantId, organizationId, departmentId)
- [ ] T087 [US6] Test query performance with 100k records
- [ ] T088 [US6] Verify query response time <100ms
- [ ] T089 [US6] Document index optimization best practices

**Checkpoint**: 租户隔离查询性能达标，响应时间<100ms

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: 完善和优化，影响多个用户故事的改进

- [ ] T090 Create entity mappers in libs/kernel/infrastructure-kernel/src/mappers/
- [x] T091 Add comprehensive documentation in README.md
- [ ] T092 Add migration guide for using infrastructure-kernel
- [ ] T093 Create quickstart guide examples
- [ ] T094 Add performance tuning documentation
- [x] T095 Run full test suite and verify all tests pass
- [ ] T096 Code cleanup and refactoring
- [ ] T097 Security review and hardening
- [x] T098 Update infrastructure-kernel exports in src/index.ts
- [x] T099 Add JSDoc comments to all public APIs
- [ ] T100 Run quickstart.md validation
- [ ] T101 Create change log

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: 无依赖，可立即开始
- **Foundational (Phase 2)**: 依赖Setup完成，阻塞所有用户故事
- **User Stories (Phase 3+)**: 依赖Foundational完成
  - US1和US2可并行
  - US3依赖US1
  - US4依赖US2
  - ~~US5 (连接管理)~~: 已由 @hl8/database 提供
  - US6依赖US3和US4
- **Polish (Phase 9)**: 依赖所有用户故事完成

### User Story Dependencies

- **US1 (PostgreSQL仓储)**: Foundational后可开始，无其他依赖
- **US2 (MongoDB仓储)**: Foundational后可开始，与US1并行
- **US3 (PostgreSQL租户隔离)**: 依赖US1
- **US4 (MongoDB租户隔离)**: 依赖US2
- ~~**US5 (连接管理)**: 依赖US1和US2~~ - **已由 @hl8/database 提供**
- **US6 (性能优化)**: 依赖US3和US4

### Within Each User Story

- 测试必须先于实现
- 基础类先于具体实现
- 核心方法先于扩展方法
- 验证错误处理

### Parallel Opportunities

- Setup任务（标记[P]）可并行
- Foundational任务（标记[P]）可并行
- US1和US2可并行实施
- US3和US4可并行实施
- 各用户故事的测试可并行

---

## Parallel Example: Setup Phase

```bash
# Launch all setup tasks together:
Task: "Initialize package.json with dependencies"
Task: "Configure TypeScript with NodeNext module system"
Task: "Setup Jest configuration for testing"
Task: "Create source directory structure"
Task: "Create test directory structure"
Task: "Setup ESLint configuration"
```

---

## Parallel Example: Foundational Phase

```bash
# Launch all foundational tasks together:
Task: "Create BaseEntity MikroORM base class"
Task: "Create TenantIsolatedPersistenceEntity base class"
Task: "Create database configuration"
Task: "Create MikroORM configuration"
Task: "Create DatabaseHealthChecker"
Task: "Create RepositoryException"
```

---

## Parallel Example: User Stories 1 & 2

```bash
# Launch PostgreSQL and MongoDB repositories in parallel:
Task: "Create MikroORMRepository base class" (US1)
Task: "Verify MikroORMRepository works with MongoDB" (US2)
Task: "Create integration test for PostgreSQL repository" (US1)
Task: "Create integration test for MongoDB repository" (US2)
```

---

## Implementation Strategy

### MVP First (User Stories 1-2 Only)

1. 完成Phase 1: Setup
2. 完成Phase 2: Foundational（阻塞所有故事）
3. 完成Phase 3: US1 (PostgreSQL仓储)
4. 完成Phase 4: US2 (MongoDB仓储)
5. **STOP and VALIDATE**: 独立测试仓储功能
6. Deploy/demo if ready

### Incremental Delivery

1. Setup + Foundational → 基础就绪
2. 添加US1 → 独立测试 → Deploy/Demo
3. 添加US2 → 独立测试 → Deploy/Demo
4. 添加US3 → 独立测试 → Deploy/Demo
5. 添加US4 → 独立测试 → Deploy/Demo
6. 添加US5 → 独立测试 → Deploy/Demo
7. 添加US6 → 性能验证 → Deploy/Demo

每个故事独立交付，不影响之前的故事。

### Parallel Team Strategy

多人协作策略：

1. 团队共同完成Setup + Foundational
2. Foundational完成后：
   - 开发者A: US1 (PostgreSQL基础仓储)
   - 开发者B: US2 (MongoDB基础仓储)
   - 开发者C: US3 (PostgreSQL租户隔离)
   - 开发者D: US4 (MongoDB租户隔离)
3. 各故事独立完成并集成

---

## Notes

- [P]标记的任务 = 不同文件，无依赖
- [US?]标记映射到特定用户故事
- 每个用户故事应独立完成和测试
- 验证测试失败后再实现（TDD）
- 每个任务或逻辑组后提交
- 任何检查点停止以验证故事
- 避免：模糊任务、文件冲突、破坏独立性的跨故事依赖

---

## Task Summary

**Total Tasks**: 101  
**Tasks per Phase**:

- Phase 1 Setup: 20 tasks (T001-T020)
- Phase 2 Foundational: 15 tasks (T021-T035)
- Phase 3 US1: 12 tasks (T036-T047)
- Phase 4 US2: 6 tasks (T048-T054)
- Phase 5 US3: 16 tasks (T055-T070)
- Phase 6 US4: 6 tasks (T071-T075)
- Phase 7 US5: 7 tasks (T076-T082)
- Phase 8 US6: 6 tasks (T083-T089)
- Phase 9 Polish: 12 tasks (T090-T101)

**Parallel Opportunities Identified**: 35 tasks marked with [P]

**MVP Scope (User Stories 1-2)**:

- T001-T035: Setup and Foundational
- T036-T054: PostgreSQL and MongoDB repositories
- Core data persistence functionality

**Independent Test Criteria per Story**:

- US1: 独立测试PostgreSQL仓储的CRUD操作
- US2: 独立测试MongoDB仓储的CRUD操作
- US3: 独立测试PostgreSQL租户隔离查询过滤
- US4: 独立测试MongoDB租户隔离查询过滤
- US5: 独立测试连接池和健康检查
- US6: 独立测试索引创建和查询性能
