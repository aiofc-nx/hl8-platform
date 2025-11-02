# Feature Specification: Infrastructure Kernel Enhancement and Alignment

**Feature Branch**: `005-infrastructure-kernel-enhancement`  
**Created**: 2025-01-22  
**Status**: Draft  
**Input**: User description: "对齐libs/kernel/domain-kernel和libs/kernel/application-kernel，全面完善libs/kernel/infrastructure-kernel"

## User Scenarios & Testing _(mandatory)_

### User Story 1 - 正式实现 ITenantIsolatedRepository 接口 (Priority: P1)

作为业务模块开发者，我需要 infrastructure-kernel 正式实现 domain-kernel 定义的 ITenantIsolatedRepository 接口，确保类型安全和使用一致性。

**Why this priority**: ITenantIsolatedRepository 接口是 domain-kernel 定义的标准租户隔离仓储契约，infrastructure-kernel 必须正式实现该接口才能确保类型安全和接口一致性，这是与其他 kernel 对齐的基础。

**Independent Test**: 可以独立测试仓储类是否实现 ITenantIsolatedRepository 接口，验证所有接口方法都已实现，确保类型系统能正确识别实现关系。

**Acceptance Scenarios**:

1. **Given** 开发人员导入 ITenantIsolatedRepository 接口和 MikroORMTenantIsolatedRepository，**When** 创建仓储实例并赋值给接口类型变量，**Then** TypeScript 编译器不应报错，类型检查通过
2. **Given** 开发人员调用 ITenantIsolatedRepository 定义的所有方法，**When** 使用 MikroORMTenantIsolatedRepository 实例，**Then** 所有方法都能正确执行，返回符合接口定义的返回值
3. **Given** 开发人员在 application-kernel 的命令处理器中使用租户隔离仓储，**When** 通过 ITenantIsolatedRepository 接口类型注入，**Then** 系统能正确解析并执行仓储操作

---

### User Story 2 - 完善领域实体到持久化实体的映射器 (Priority: P1)

作为业务模块开发者，我需要 infrastructure-kernel 提供完整的实体映射器，能够将 domain-kernel 的领域实体转换为 infrastructure-kernel 的持久化实体，并在持久化后转换回领域实体。

**Why this priority**: 领域实体和持久化实体是 Clean Architecture 中的不同层概念，必须提供标准化的映射机制才能在保持架构分层的同时实现数据持久化，这是与 domain-kernel 集成的核心组件。

**Independent Test**: 可以独立测试实体映射器的转换功能，验证领域实体的所有属性都能正确映射到持久化实体，持久化实体也能正确映射回领域实体，确保数据完整性和业务逻辑不丢失。

**Acceptance Scenarios**:

1. **Given** 开发人员有一个 domain-kernel 的 TenantIsolatedEntity 实例，**When** 调用映射器的 toPersistence 方法，**Then** 系统返回对应的 TenantIsolatedPersistenceEntity 实例，所有属性值正确映射
2. **Given** 开发人员从数据库检索到 TenantIsolatedPersistenceEntity 实例，**When** 调用映射器的 toDomain 方法，**Then** 系统返回对应的 TenantIsolatedEntity 实例，所有属性值正确还原
3. **Given** 领域实体包含聚合根和内部实体，**When** 调用映射器进行转换，**Then** 系统正确处理嵌套实体的映射，保持聚合结构的完整性

---

### User Story 3 - 完善基础仓储的 IRepository 接口实现 (Priority: P1)

作为业务模块开发者，我需要 infrastructure-kernel 的基础仓储完整实现 domain-kernel 定义的 IRepository 接口的所有方法，包括 findAll、count 等缺失方法。

**Why this priority**: IRepository 接口是标准仓储契约，所有基础设施层仓储实现都必须完整支持该接口定义的所有操作，确保业务代码可以统一使用仓储接口而不依赖具体实现。

**Independent Test**: 可以独立测试基础仓储的所有 IRepository 方法，验证 findAll、count 等方法都已实现并正确工作，确保与 domain-kernel 接口定义完全一致。

**Acceptance Scenarios**:

1. **Given** 开发人员使用基础仓储，**When** 调用 findAll 方法，**Then** 系统返回所有实体的列表
2. **Given** 开发人员需要统计实体数量，**When** 调用 count 方法，**Then** 系统返回数据库中实体的总数
3. **Given** 开发人员需要批量操作，**When** 调用批量保存或删除方法（如果接口支持），**Then** 系统能够高效处理批量操作

---

### User Story 4 - 完善事务管理支持 (Priority: P1)

作为业务模块开发者，我需要 infrastructure-kernel 提供完整的事务管理能力，支持事务的开始、提交、回滚和嵌套事务。

**Why this priority**: 复杂业务场景需要事务保证数据一致性，基础设施层必须提供标准化的事务管理接口，确保命令处理器和用例可以安全地执行需要原子性的操作。

**Independent Test**: 可以独立测试事务管理功能，验证事务的开始、提交、回滚操作，测试嵌套事务的支持，确保并发场景下事务隔离级别的正确性。

**Acceptance Scenarios**:

1. **Given** 开发人员需要执行多个数据库操作，**When** 在事务中执行这些操作，**Then** 所有操作要么全部成功要么全部回滚，保持数据一致性
2. **Given** 操作过程中发生错误，**When** 触发事务回滚，**Then** 系统撤销所有已执行的操作，数据库状态恢复到事务开始前
3. **Given** 多个仓储操作需要在同一事务中执行，**When** 使用事务管理器，**Then** 系统确保所有操作共享同一事务上下文

---

### User Story 5 - 完善查询构建器和规范模式支持 (Priority: P2)

作为业务模块开发者，我需要 infrastructure-kernel 提供查询构建器，支持 domain-kernel 的规范模式（Specification Pattern），能够将业务规则规范转换为数据库查询。

**Why this priority**: 规范模式是 DDD 中的重要模式，允许将业务规则封装为可组合的规范对象，基础设施层需要支持将规范转换为数据库查询，实现业务逻辑与数据访问的解耦。

**Independent Test**: 可以独立测试查询构建器和规范支持，验证简单规范和组合规范（AND、OR、NOT）都能正确转换为数据库查询，查询结果符合规范定义的业务规则。

**Acceptance Scenarios**:

1. **Given** 开发人员定义了业务规范（如"价格大于100的产品"），**When** 使用查询构建器执行规范，**Then** 系统生成并执行对应的数据库查询，返回符合规范的所有实体
2. **Given** 开发人员定义了组合规范（AND、OR、NOT），**When** 使用查询构建器执行规范，**Then** 系统正确组合查询条件，返回符合组合规范的结果
3. **Given** 查询涉及租户隔离，**When** 执行规范查询，**Then** 系统自动应用租户过滤条件，确保只返回当前租户的数据

---

### User Story 6 - 完善与 application-kernel 的事件存储集成 (Priority: P2)

作为业务模块开发者，我需要 infrastructure-kernel 提供对 application-kernel 事件存储的数据持久化支持，确保领域事件能够持久化到数据库。

**Why this priority**: 事件溯源（Event Sourcing）是 application-kernel 的核心功能，需要 infrastructure-kernel 提供事件存储的数据库实现，确保领域事件能够可靠持久化和查询。

**Independent Test**: 可以独立测试事件存储集成，验证领域事件的保存、查询、重放功能，确保事件能够正确持久化到数据库并支持按聚合根ID查询事件流。

**Acceptance Scenarios**:

1. **Given** application-kernel 需要保存领域事件，**When** 调用事件存储接口，**Then** infrastructure-kernel 将事件持久化到数据库，并返回保存结果
2. **Given** 需要查询聚合根的事件历史，**When** 调用事件存储的查询方法，**Then** 系统返回该聚合根的所有事件，按版本号排序
3. **Given** 需要重放事件重建聚合根，**When** 调用事件存储的查询方法获取事件流，**Then** 系统返回完整的事件序列，支持从指定版本开始查询

---

### User Story 7 - 完善仓储工厂和依赖注入支持 (Priority: P2)

作为业务模块开发者，我需要 infrastructure-kernel 提供仓储工厂，支持 NestJS 依赖注入，能够方便地创建和注入仓储实例。

**Why this priority**: NestJS 是 application-kernel 的基础框架，infrastructure-kernel 必须提供 NestJS 模块和依赖注入支持，确保仓储可以在应用层方便地使用。

**Independent Test**: 可以独立测试仓储工厂和 NestJS 模块，验证仓储可以通过依赖注入获取，确保不同类型实体（普通实体、租户隔离实体）的仓储都能正确创建和注入。

**Acceptance Scenarios**:

1. **Given** 开发人员需要在 NestJS 模块中使用仓储，**When** 导入 InfrastructureKernelModule，**Then** 系统自动注册仓储工厂和提供者，支持依赖注入
2. **Given** 开发人员在命令处理器中注入仓储，**When** 通过构造函数参数声明依赖，**Then** NestJS 能正确解析并提供仓储实例
3. **Given** 需要为不同类型实体创建仓储，**When** 使用仓储工厂，**Then** 系统根据实体类型返回对应的仓储实现（普通仓储或租户隔离仓储）

---

### User Story 8 - 完善错误处理和异常体系对齐 (Priority: P2)

作为业务模块开发者，我需要 infrastructure-kernel 的异常体系与 domain-kernel 和 application-kernel 完全对齐，确保异常类型、错误码和错误信息的一致性。

**Why this priority**: 统一的异常体系是跨层协作的基础，必须确保所有 kernel 使用一致的异常类型和错误码，便于上层统一处理和错误追踪。

**Independent Test**: 可以独立测试异常体系，验证 infrastructure-kernel 抛出的异常符合 domain-kernel 定义的异常类型，确保异常能够被 application-kernel 正确捕获和处理。

**Acceptance Scenarios**:

1. **Given** 仓储操作失败（如数据库连接错误），**When** 抛出异常，**Then** 系统抛出符合 domain-kernel 定义的 RepositoryException 子类，包含完整的错误信息和上下文
2. **Given** application-kernel 捕获基础设施层异常，**When** 处理异常，**Then** 系统能够根据异常类型和错误码采取适当的处理策略（重试、记录日志、返回错误响应等）
3. **Given** 跨租户访问被阻止，**When** 抛出权限异常，**Then** 系统抛出符合 domain-kernel 定义的 BusinessException，包含明确的权限错误信息

---

### Edge Cases

- What happens when domain entity and persistence entity have different property types?
- How does system handle mapping when domain entity contains nested aggregates?
- What happens when transaction is nested and inner transaction fails?
- How does system handle specification queries with complex nested conditions?
- What happens when event store query returns large number of events (performance)?
- How does system handle repository factory when multiple entity types are registered?
- What happens when database connection is lost during transaction commit?
- How does system handle optimistic locking conflicts in concurrent updates?
- What happens when mapping fails due to missing required fields?
- How does system handle tenant context validation when entity isolation level doesn't match context?
- How does system handle MikroORM OptimisticLockException and convert it to domain-kernel exception?
- What happens when database connection fails during repository operation?

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST formally implement ITenantIsolatedRepository interface from domain-kernel, ensuring type safety and interface compatibility
- **FR-002**: System MUST provide entity mappers that convert domain entities (from domain-kernel) to persistence entities and vice versa, using automatic mapping for simple properties with manual configuration override for complex scenarios (nested aggregates, custom transformations)
- **FR-003**: System MUST complete IRepository interface implementation with all methods including findAll, count, and other standard operations
- **FR-004**: System MUST provide independent transaction management interface supporting begin, commit, rollback, and nested transactions, defined within infrastructure-kernel without direct dependency on @hl8/database TransactionService
- **FR-005**: System MUST support Specification Pattern from domain-kernel, converting business rules to database queries with support for common combinations (AND, OR, NOT) but limiting extreme nesting depth (>5 levels not supported)
- **FR-006**: System MUST implement IEventStore interface from application-kernel, providing event store persistence support for event sourcing
- **FR-007**: System MUST provide repository factory with NestJS dependency injection support
- **FR-008**: System MUST align exception hierarchy with domain-kernel and application-kernel, using consistent exception types and error codes
- **FR-021**: System MUST provide unified exception converter (ExceptionConverter) that converts MikroORM exceptions and database exceptions to domain-kernel exceptions, automatically identifying specific scenarios (optimistic locking conflicts, connection failures, query errors, etc.)
- **FR-009**: System MUST ensure all exported types and interfaces match domain-kernel and application-kernel contracts
- **FR-010**: System MUST support batch operations for repositories including batch save (saveMany) and batch delete (deleteMany) operations
- **FR-011**: System MUST provide query builder that supports complex queries with type safety
- **FR-012**: System MUST handle optimistic locking conflicts and provide clear error messages
- **FR-013**: System MUST support soft delete operations for entities when applicable
- **FR-014**: System MUST ensure all repository operations automatically apply tenant isolation filters when using tenant-isolated repositories
- **FR-015**: System MUST provide migration support for database schema changes
- **FR-016**: System MUST ensure entity mappers preserve all business logic and invariants during conversion
- **FR-017**: System MUST support pagination for findAll and query operations
- **FR-018**: System MUST provide logging integration with @hl8/logger for all database operations
- **FR-019**: System MUST ensure repository implementations are fully testable with unit and integration tests
- **FR-020**: System MUST document all public APIs with TSDoc comments in Chinese following project conventions
- **FR-022**: System MUST NOT provide caching functionality (caching is handled by application-kernel, infrastructure-kernel focuses solely on data persistence)

### Key Entities _(include if feature involves data)_

- **Entity Mapper**: Converts domain entities to persistence entities and vice versa using automatic mapping for simple properties with manual configuration override support, preserves business logic and validates entity invariants during mapping
- **Transaction Manager**: Manages database transactions, supports nested transactions, provides transaction isolation control
- **Query Builder**: Constructs database queries from specifications, supports complex query composition with type safety
- **Repository Factory**: Creates repository instances based on entity types, supports dependency injection registration
- **Event Store Repository**: Persists domain events to database, supports event querying and streaming for event sourcing
- **Specification Query Converter**: Converts domain-kernel specifications to database query filters, supports AND/OR/NOT composition with limitation on extreme nesting depth (>5 levels)
- **Batch Operation Manager**: Handles batch save (saveMany) and batch delete (deleteMany) operations efficiently with transaction support
- **Exception Converter**: Unified exception converter that transforms MikroORM exceptions (OptimisticLockException, ValidationError, etc.) and database exceptions (connection failures, query errors, etc.) to appropriate domain-kernel exceptions (RepositoryException, BusinessException, SystemException) with automatic scenario identification

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: MikroORMTenantIsolatedRepository class formally implements ITenantIsolatedRepository interface, TypeScript compiler validates interface compliance with zero errors
- **SC-002**: Entity mappers successfully convert 100% of domain entity properties to persistence entities and vice versa without data loss
- **SC-003**: All IRepository interface methods (findById, findAll, save, delete, exists, count) are implemented and tested with 90%+ test coverage
- **SC-004**: Transaction management supports nested transactions up to 5 levels deep with correct rollback behavior
- **SC-005**: Specification Pattern queries execute with same business logic validation as in-memory specification evaluation, with 100% accuracy for specifications with nesting depth ≤ 5 levels
- **SC-006**: Event store integration supports saving and querying events for aggregates with 100,000+ events per aggregate without performance degradation
- **SC-007**: Repository factory creates correct repository instances for all entity types, dependency injection resolves repositories with 100% success rate
- **SC-008**: All exceptions thrown by infrastructure-kernel are instances of domain-kernel exception types, error codes match domain-kernel definitions
- **SC-015**: Exception converter successfully converts 100% of MikroORM and database exceptions to domain-kernel exceptions with correct exception type mapping (optimistic lock conflicts → OptimisticLockException, connection failures → RepositoryConnectionException, etc.)
- **SC-009**: Infrastructure-kernel exports all required types and interfaces, application modules can use them without importing from domain-kernel directly
- **SC-010**: Repository operations with tenant isolation prevent 100% of unauthorized cross-tenant access attempts
- **SC-011**: Query builder generates type-safe queries that compile without errors and execute correctly against PostgreSQL and MongoDB
- **SC-012**: Entity mappers handle all edge cases (nested aggregates, optional fields, computed properties) with 100% property mapping accuracy
- **SC-013**: All public APIs have complete TSDoc documentation in Chinese, documentation coverage reaches 100%
- **SC-014**: Infrastructure-kernel passes all integration tests with domain-kernel and application-kernel, demonstrating full alignment

## Assumptions

- domain-kernel 和 application-kernel 的接口定义已经稳定，不会在本次增强过程中发生重大变更
- PostgreSQL 和 MongoDB 数据库已正确配置，支持事务和索引功能
- MikroORM 版本兼容当前项目需求，支持所需的 ORM 功能
- NestJS 框架版本兼容，支持依赖注入和模块系统
- 所有实体类型都有对应的持久化实体类定义
- 领域实体和持久化实体之间的映射关系是确定的
- 测试环境支持 testcontainers 或类似的数据库测试工具
- 开发团队熟悉 Clean Architecture、DDD 模式和事件溯源概念
- 缓存功能由 application-kernel 负责（infrastructure-kernel 不提供缓存实现或缓存抽象）

## Clarifications

### Session 2025-01-22

- Q: 实体映射器的实现策略应该采用哪种方式？ → A: 自动映射 + 手动配置覆盖（简单属性自动映射，复杂场景如嵌套聚合、自定义转换可手动配置）
- Q: 事务管理接口应该如何与 @hl8/database 的 TransactionService 集成？ → A: 重新实现独立的事务管理接口（infrastructure-kernel 定义自己的事务接口，不直接依赖 @hl8/database）
- Q: 事件存储集成应该采用哪种实现方式？ → A: 实现 IEventStore 接口（infrastructure-kernel 直接实现 application-kernel 定义的 IEventStore 接口）
- Q: 规范模式查询转换应该支持多高的复杂度？ → A: 支持常见组合（支持 AND、OR、NOT 组合，但不支持极端嵌套如 >5 层）
- Q: 批量操作应该包括哪些仓储方法？ → A: 批量保存和删除（支持 saveMany 和 deleteMany 操作）
- Q: 如何处理infrastructure层的异常？ → A: 统一异常转换器（创建 ExceptionConverter 统一转换 MikroORM/数据库异常到 domain-kernel 异常，自动识别乐观锁、连接失败等场景）
- Q: infrastructure层是否涉及缓存问题？ → A: 不提供缓存（缓存由 application-kernel 负责，infrastructure-kernel 专注数据持久化，不涉及缓存逻辑）
- Q: 是否优先使用了libs/infra/config和libs/infra/logger？ → A: 明确使用包名（优先使用 @hl8/config 和 @hl8/logger 包名，与代码一致，符合依赖管理规范）

## Dependencies

- **@hl8/domain-kernel**: 依赖 IRepository、ITenantIsolatedRepository 接口定义，依赖 TenantContext、异常类型、规范模式接口
- **@hl8/application-kernel**: 依赖命令/查询基类、事件存储接口、租户上下文中间件接口
- **@hl8/config**: 依赖配置管理和环境变量读取（来自 libs/infra/config）
- **@hl8/logger**: 依赖日志记录和结构化日志功能（来自 libs/infra/logger）
- **@hl8/database**: 可选依赖数据库连接管理和健康检查（事务管理不直接依赖）
- **MikroORM**: 依赖 ORM 核心功能和实体管理器
- **NestJS**: 依赖依赖注入容器和模块系统