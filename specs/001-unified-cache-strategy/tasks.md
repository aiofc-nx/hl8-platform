# Tasks: 统一缓存策略

**Input**: Design documents from `/specs/001-unified-cache-strategy/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4, US5)
- Include exact file paths in descriptions

## Path Conventions

- **Library project**: `libs/infra/cache/src/` at repository root
- Tests: Unit tests in same directory as source, integration tests in `test/integration/`

---

## Phase 1: Setup (Project Initialization)

**Purpose**: Initialize cache library project structure

- [X] T001 Create project directory structure in libs/infra/cache/
- [X] T002 Initialize TypeScript project with tsconfig.json and tsconfig.build.json in libs/infra/cache/
- [X] T003 [P] Configure ESLint in libs/infra/cache/eslint.config.mjs
- [X] T004 [P] Configure Jest in libs/infra/cache/jest.config.ts
- [X] T005 [P] Create package.json with dependencies (@hl8/config, @hl8/logger, @nestjs/common, @nestjs/core) in libs/infra/cache/
- [X] T006 [P] Create README.md with basic documentation in libs/infra/cache/

---

## Phase 2: Foundational - 缓存库作为独立基础设施 (Priority: P1) 🎯 MVP Foundation

**Goal**: 创建独立的基础设施层缓存库 `@hl8/cache`，提供统一的 ICache 接口和基础实现，支持通过依赖注入在所有模块中使用。

**Independent Test**: 可以通过创建独立的缓存库模块，验证 Application Kernel 和 Infrastructure Kernel 都能成功依赖和使用它。可以通过依赖注入验证所有模块共享同一个缓存实例。

⚠️ **CRITICAL**: 这是基础阶段，所有后续用户故事都依赖此阶段完成。

### Implementation for User Story 4

- [X] T007 [US4] Create ICache interface definition in libs/infra/cache/src/cache.interface.ts
- [ ] T008 [US4] Create CacheConfig class using @hl8/config decorators in libs/infra/cache/src/config/cache.config.ts
- [X] T008 [US4] Create CacheConfig class using @hl8/config decorators in libs/infra/cache/src/config/cache.config.ts
- [ ] T009 [US4] Create CacheStats interface in libs/infra/cache/src/cache.interface.ts
- [ ] T010 [US4] Create CacheItemMetadata interface in libs/infra/cache/src/cache.interface.ts
- [X] T011 [P] [US4] Create CacheKeyBuilder utility in libs/infra/cache/src/utils/cache-key-builder.ts
- [X] T012 [P] [US4] Create CacheStatsCollector utility in libs/infra/cache/src/utils/cache-stats-collector.ts

* [Note] Utilities created; tests pending

- [X] T013 [US4] Implement InMemoryCache class implementing ICache in libs/infra/cache/src/implementations/in-memory-cache.ts
- [X] T014 [US4] Integrate @hl8/logger for logging in libs/infra/cache/src/implementations/in-memory-cache.ts
- [X] T015 [US4] Create CacheModule using TypedConfigModule from @hl8/config in libs/infra/cache/src/module/cache.module.ts
- [X] T016 [US4] Export all public APIs in libs/infra/cache/src/index.ts

* [Note] InMemoryCache/CacheModule/index created; tests next

- [ ] T017 [US4] Write unit tests for InMemoryCache in libs/infra/cache/src/implementations/in-memory-cache.spec.ts
- [ ] T018 [US4] Write unit tests for CacheKeyBuilder in libs/infra/cache/src/utils/cache-key-builder.spec.ts
- [ ] T019 [US4] Write unit tests for CacheStatsCollector in libs/infra/cache/src/utils/cache-stats-collector.spec.ts
- [ ] T020 [US4] Create integration test verifying CacheModule DI setup in test/integration/cache-module.integration.spec.ts

**Checkpoint**: 缓存库基础功能完成，可以被其他模块依赖和导入使用。

---

## Phase 3: User Story 1 - 基础设施层仓储查询缓存 (Priority: P1) 🎯 MVP

**Goal**: 为 Infrastructure Kernel 的 Repository 接口添加自动缓存支持，使得仓储查询实体时自动缓存结果，后续相同查询从缓存返回。

**Independent Test**: 可以通过调用仓储的 `findById` 方法两次，验证第二次调用是否从缓存返回，并且不访问数据库。可以通过缓存统计接口验证缓存命中率。

### Implementation for User Story 1

- [ ] T021 [US1] Create CacheableRepository decorator in libs/infra/cache/src/decorators/cacheable.decorator.ts
- [ ] T022 [US1] Create repository cache interceptor in libs/infra/cache/src/interceptors/repository-cache.interceptor.ts
- [ ] T023 [US1] Implement entity cache key generation logic in libs/infra/cache/src/utils/cache-key-builder.ts (repo:{entityName}:{entityId} format)
- [ ] T024 [US1] Add support for findById method caching in libs/infra/cache/src/interceptors/repository-cache.interceptor.ts
- [ ] T025 [US1] Implement cache miss handler (query database, then cache result) in libs/infra/cache/src/interceptors/repository-cache.interceptor.ts
- [ ] T026 [US1] Implement automatic cache invalidation on Repository.save() in libs/infra/cache/src/interceptors/repository-cache.interceptor.ts
- [ ] T027 [US1] Implement automatic cache invalidation on Repository.delete() in libs/infra/cache/src/interceptors/repository-cache.interceptor.ts
- [ ] T028 [US1] Add tenant isolation support (tenantId in cache key) in libs/infra/cache/src/utils/cache-key-builder.ts
- [ ] T029 [US1] Write unit tests for repository cache interceptor in libs/infra/cache/src/interceptors/repository-cache.interceptor.spec.ts
- [ ] T030 [US1] Write integration test for findById caching in test/integration/repository-cache.integration.spec.ts
- [ ] T031 [US1] Write integration test for cache invalidation on save in test/integration/repository-cache.integration.spec.ts

**Checkpoint**: Infrastructure Kernel 的 Repository 现在支持自动缓存，查询结果可以被缓存和共享。

---

## Phase 4: User Story 2 - 应用层与基础设施层缓存协同 (Priority: P2)

**Goal**: 应用层缓存业务查询结果，基础设施层缓存实体数据，两层缓存协同工作。当实体更新时，两层缓存能够协调失效。

**Independent Test**: 可以通过执行复杂业务查询（触发应用层缓存）后，再执行简单实体查询（使用基础设施层缓存），验证两层缓存的协同工作。可以通过更新实体验证两层缓存同时失效。

### Implementation for User Story 2

- [ ] T032 [US2] Integrate @hl8/cache into Application Kernel CacheMiddleware in libs/kernel/application-kernel/src/bus/middleware/bus-middleware.ts
- [ ] T033 [US2] Update Application Kernel to use @hl8/cache ICache instead of internal implementation in libs/kernel/application-kernel/src/cache/
- [ ] T034 [US2] Migrate Application Kernel cache implementation to @hl8/cache in libs/kernel/application-kernel/src/cache/
- [ ] T035 [US2] Implement query cache key generation (query:{queryType}:{paramsHash}) in libs/infra/cache/src/utils/cache-key-builder.ts
- [ ] T036 [US2] Create cache coordination service for cross-layer cache invalidation in libs/infra/cache/src/services/cache-coordination.service.ts
- [ ] T037 [US2] Implement coordinated cache invalidation (infrastructure + application layers) in libs/infra/cache/src/services/cache-coordination.service.ts
- [ ] T038 [US2] Write integration test for cross-layer cache sharing in test/integration/cross-layer-cache.integration.spec.ts
- [ ] T039 [US2] Write integration test for coordinated cache invalidation in test/integration/cache-coordination.integration.spec.ts

**Checkpoint**: 应用层和基础设施层缓存现在可以协同工作，实体更新时两层缓存同时失效。

---

## Phase 5: User Story 3 - 缓存失效策略 (Priority: P2)

**Goal**: 实现多种缓存失效策略，包括 TTL、事件驱动失效、标签失效和模式匹配失效。

**Independent Test**: 可以通过设置缓存 TTL，验证缓存是否在过期后自动失效。可以通过发布领域事件验证事件驱动的缓存失效。可以通过标签失效验证批量缓存失效。

### Implementation for User Story 3

- [ ] T040 [US3] Implement TTL-based expiration in libs/infra/cache/src/implementations/in-memory-cache.ts
- [ ] T041 [US3] Implement automatic cleanup timer for expired items in libs/infra/cache/src/implementations/in-memory-cache.ts
- [ ] T042 [US3] Create tag-based invalidation implementation in libs/infra/cache/src/invalidation/tag-based-invalidation.ts
- [ ] T043 [US3] Implement tag index (Map<string, Set<string>>) in libs/infra/cache/src/invalidation/tag-based-invalidation.ts
- [ ] T044 [US3] Create pattern-based invalidation implementation in libs/infra/cache/src/invalidation/pattern-based-invalidation.ts
- [ ] T045 [US3] Implement glob pattern matching for cache keys in libs/infra/cache/src/invalidation/pattern-based-invalidation.ts
- [ ] T046 [US3] Create event-driven invalidation handler in libs/infra/cache/src/invalidation/event-driven-invalidation.ts
- [ ] T047 [US3] Create CacheInvalidationRule interface in libs/infra/cache/src/invalidation/cache-invalidation-rule.interface.ts
- [ ] T048 [US3] Implement invalidation rule registry in libs/infra/cache/src/invalidation/invalidation-rule-registry.ts
- [ ] T049 [US3] Register entity tags automatically (entity:{entityName}) in libs/infra/cache/src/interceptors/repository-cache.interceptor.ts
- [ ] T050 [US3] Write unit tests for tag-based invalidation in libs/infra/cache/src/invalidation/tag-based-invalidation.spec.ts
- [ ] T051 [US3] Write unit tests for pattern-based invalidation in libs/infra/cache/src/invalidation/pattern-based-invalidation.spec.ts
- [ ] T052 [US3] Write unit tests for event-driven invalidation in libs/infra/cache/src/invalidation/event-driven-invalidation.spec.ts
- [ ] T053 [US3] Write integration test for TTL expiration in test/integration/ttl-expiration.integration.spec.ts
- [ ] T054 [US3] Write integration test for tag-based invalidation in test/integration/tag-invalidation.integration.spec.ts
- [ ] T055 [US3] Write integration test for pattern-based invalidation in test/integration/pattern-invalidation.integration.spec.ts
- [ ] T056 [US3] Write integration test for event-driven invalidation in test/integration/event-invalidation.integration.spec.ts

**Checkpoint**: 所有缓存失效策略已实现并测试通过，缓存数据可以智能失效。

---

## Phase 6: User Story 5 - 缓存配置和监控 (Priority: P3)

**Goal**: 支持可配置的缓存策略（TTL、最大缓存大小、淘汰策略等）和缓存统计信息（命中率、缓存大小等）。

**Independent Test**: 可以通过修改缓存配置验证配置生效。可以通过查询缓存统计接口验证统计信息的准确性。

### Implementation for User Story 5

- [ ] T057 [US5] Enhance CacheConfig class with evictionStrategy field in libs/infra/cache/src/config/cache.config.ts
- [ ] T058 [US5] Implement LRU eviction strategy in libs/infra/cache/src/implementations/in-memory-cache.ts
- [ ] T059 [US5] Implement FIFO eviction strategy in libs/infra/cache/src/implementations/in-memory-cache.ts
- [ ] T060 [US5] Implement LFU eviction strategy in libs/infra/cache/src/implementations/in-memory-cache.ts
- [ ] T061 [US5] Implement eviction when maxSize is reached in libs/infra/cache/src/implementations/in-memory-cache.ts
- [ ] T062 [US5] Enhance CacheStatsCollector to track all required metrics in libs/infra/cache/src/utils/cache-stats-collector.ts
- [ ] T063 [US5] Implement getStats() method returning CacheStats in libs/infra/cache/src/implementations/in-memory-cache.ts
- [ ] T064 [US5] Implement getMetadata() method returning CacheItemMetadata in libs/infra/cache/src/implementations/in-memory-cache.ts
- [ ] T065 [US5] Implement resetStats() method in libs/infra/cache/src/implementations/in-memory-cache.ts
- [ ] T066 [US5] Add configuration hot-reload support (if @hl8/config supports it) in libs/infra/cache/src/module/cache.module.ts
- [ ] T067 [US5] Write unit tests for LRU eviction in libs/infra/cache/src/implementations/in-memory-cache.spec.ts
- [ ] T068 [US5] Write unit tests for FIFO eviction in libs/infra/cache/src/implementations/in-memory-cache.spec.ts
- [ ] T069 [US5] Write unit tests for LFU eviction in libs/infra/cache/src/implementations/in-memory-cache.spec.ts
- [ ] T070 [US5] Write unit tests for cache statistics in libs/infra/cache/src/utils/cache-stats-collector.spec.ts
- [ ] T071 [US5] Write integration test for configuration changes in test/integration/cache-config.integration.spec.ts
- [ ] T072 [US5] Write integration test for cache statistics in test/integration/cache-stats.integration.spec.ts

**Checkpoint**: 缓存配置和监控功能完成，管理员可以配置缓存策略并查看统计信息。

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T073 [P] Add comprehensive TSDoc comments to all public APIs in libs/infra/cache/src/
- [ ] T074 [P] Update README.md with usage examples in libs/infra/cache/
- [ ] T075 [P] Add error handling for edge cases (cache invalidation failure, etc.) in libs/infra/cache/src/
- [ ] T076 [P] Implement null value caching to prevent cache penetration in libs/infra/cache/src/implementations/in-memory-cache.ts
- [ ] T077 [P] Add cache warming support (preload common entities) in libs/infra/cache/src/services/cache-warming.service.ts
- [ ] T078 [P] Add distributed cache invalidation support (for future Redis integration) in libs/infra/cache/src/invalidation/distributed-invalidation.ts
- [ ] T079 [P] Add cache monitoring and alerting hooks in libs/infra/cache/src/monitoring/cache-monitor.ts
- [ ] T080 [P] Run quickstart.md validation in test/e2e/quickstart-validation.e2e.spec.ts
- [ ] T081 [P] Performance testing for 10,000 concurrent operations in test/performance/cache-performance.benchmark.spec.ts
- [ ] T082 [P] Multi-tenant isolation testing in test/e2e/multi-tenant-isolation.e2e.spec.ts

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2 - US4)**: Depends on Setup completion - **BLOCKS all other user stories**
- **User Story 1 (Phase 3)**: Depends on Foundational (US4) completion
- **User Story 2 (Phase 4)**: Depends on Foundational (US4) completion, can partially work with US1
- **User Story 3 (Phase 5)**: Depends on Foundational (US4) completion, can work with US1/US2
- **User Story 5 (Phase 6)**: Depends on Foundational (US4) completion
- **Polish (Phase 7)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 4 (P1) - Foundational**: Must complete first - all other stories depend on this
- **User Story 1 (P1)**: Depends on US4 - can start immediately after US4 completes
- **User Story 2 (P2)**: Depends on US4 - can start after US4, benefits from US1 but independently testable
- **User Story 3 (P2)**: Depends on US4 - can start after US4, integrates with US1/US2 but independently testable
- **User Story 5 (P3)**: Depends on US4 - can start after US4, enhances all previous stories

### Within Each User Story

- Interfaces before implementations
- Core implementation before integration
- Unit tests before integration tests
- Story complete before moving to next priority

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- Within US4: CacheKeyBuilder and CacheStatsCollector can be implemented in parallel (T011, T012)
- Once US4 completes, US1, US2, US3, US5 can theoretically start in parallel (if team capacity allows)
- Within US3: Tag-based, pattern-based, and event-driven invalidation can be implemented in parallel (T042, T044, T046)
- Within US5: Different eviction strategies can be implemented in parallel (T058, T059, T060)
- Polish phase tasks marked [P] can all run in parallel

---

## Parallel Example: User Story 4

```bash
# Launch utilities in parallel:
Task: "Create CacheKeyBuilder utility in libs/infra/cache/src/utils/cache-key-builder.ts"
Task: "Create CacheStatsCollector utility in libs/infra/cache/src/utils/cache-stats-collector.ts"
```

## Parallel Example: User Story 3

```bash
# Launch invalidation strategies in parallel:
Task: "Create tag-based invalidation implementation in libs/infra/cache/src/invalidation/tag-based-invalidation.ts"
Task: "Create pattern-based invalidation implementation in libs/infra/cache/src/invalidation/pattern-based-invalidation.ts"
Task: "Create event-driven invalidation handler in libs/infra/cache/src/invalidation/event-driven-invalidation.ts"
```

## Parallel Example: User Story 5

```bash
# Launch eviction strategies in parallel:
Task: "Implement LRU eviction strategy in libs/infra/cache/src/implementations/in-memory-cache.ts"
Task: "Implement FIFO eviction strategy in libs/infra/cache/src/implementations/in-memory-cache.ts"
Task: "Implement LFU eviction strategy in libs/infra/cache/src/implementations/in-memory-cache.ts"
```

---

## Implementation Strategy

### MVP First (User Story 4 + User Story 1)

1. Complete Phase 1: Setup
2. Complete Phase 2: User Story 4 (Foundational - **CRITICAL**)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Test User Story 1 independently
5. Deploy/demo if ready

This MVP delivers: A working cache library that Infrastructure Kernel can use to cache repository queries.

### Incremental Delivery

1. Complete Setup → Foundation ready
2. Add User Story 4 → Cache library ready → Test independently
3. Add User Story 1 → Repository caching → Test independently → Deploy/Demo (MVP!)
4. Add User Story 3 → Cache invalidation → Test independently → Deploy/Demo
5. Add User Story 2 → Cross-layer cache coordination → Test independently → Deploy/Demo
6. Add User Story 5 → Configuration and monitoring → Test independently → Deploy/Demo
7. Polish phase → Final improvements

Each story adds value without breaking previous stories.

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup together
2. Once Setup is done:
   - Developer A: User Story 4 (Foundational - must complete first)
3. Once US4 is complete:
   - Developer A: User Story 1
   - Developer B: User Story 3 (invalidation strategies)
   - Developer C: User Story 5 (eviction strategies)
4. Once US1, US3, US5 are complete:
   - Developer A + B: User Story 2 (coordination)
5. All developers: Polish phase

---

## Task Summary

- **Total Tasks**: 82
- **Setup Tasks**: 6 (Phase 1)
- **Foundational Tasks (US4)**: 14 (Phase 2)
- **User Story 1 Tasks**: 11 (Phase 3)
- **User Story 2 Tasks**: 8 (Phase 4)
- **User Story 3 Tasks**: 17 (Phase 5)
- **User Story 5 Tasks**: 16 (Phase 6)
- **Polish Tasks**: 10 (Phase 7)

### Parallel Opportunities

- **Phase 1**: 4 parallel tasks (T003-T006)
- **Phase 2**: 2 parallel utility tasks (T011, T012)
- **Phase 5**: 3 parallel invalidation implementations (T042, T044, T046)
- **Phase 6**: 3 parallel eviction strategies (T058, T059, T060)
- **Phase 7**: 10 parallel polish tasks (T073-T082)

### Suggested MVP Scope

**Minimum Viable Product**: Phase 1 + Phase 2 (US4) + Phase 3 (US1)

This delivers:

- ✅ Working cache library as independent infrastructure
- ✅ Repository query caching for Infrastructure Kernel
- ✅ Basic cache operations (get, set, delete)
- ✅ Automatic cache invalidation on entity updates

Total MVP tasks: 31 tasks

### Independent Test Criteria

- **US4**: Cache library can be imported and used via DI in other modules
- **US1**: Repository findById() caches results, second call uses cache
- **US2**: Application and infrastructure caches coordinate invalidation
- **US3**: TTL, tags, patterns, and events can invalidate cache
- **US5**: Configuration changes apply, statistics are accurate

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence
- **CRITICAL**: US4 (Foundational) must complete before any other user story can begin
