# Implementation Plan: IAM业务模块开发（引入CASL）

**Branch**: `001-iam` | **Date**: 2024-12-19 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-iam/spec.md` + User requirement: "引入CASL开发iam"

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

开发IAM（身份与访问管理）业务模块，实现多租户SAAS平台的核心身份认证、访问控制和权限管理功能。模块采用Clean Architecture + DDD + CQRS + ES + EDA架构，引入CASL（Class Access Specification Language）库实现细粒度的权限管理，支持RBAC和ABAC访问控制模型。模块划分为7个核心子领域：用户管理、认证、租户管理、组织管理、部门管理、角色管理、权限管理。

## Technical Context

**Language/Version**: TypeScript 5.9.3, Node.js >=20  
**Primary Dependencies**:

- @hl8/domain-kernel, @hl8/application-kernel, @hl8/infrastructure-kernel, @hl8/interface-kernel (kernel核心模块)
  - **标识符值对象**：优先使用 `@hl8/domain-kernel/src/identifiers` 中的值对象
    - `EntityId` - 通用实体标识符（用户ID、角色ID、权限ID、会话ID、令牌ID等）
    - `TenantId` - 租户标识符
    - `OrganizationId` - 组织标识符（包含租户关联和层级关系）
    - `DepartmentId` - 部门标识符（包含组织关联和层级关系）
  - **注意**：IAM模块不得重新定义标识符值对象，必须使用domain-kernel提供的值对象
  - **领域层核心架构**（基于 @hl8/domain-kernel）：
    - **聚合根（AggregateRoot）**：必须实现 `performCoordination(operation: string, params: unknown): unknown` 和 `performBusinessInvariantValidation(): boolean` 抽象方法
    - **业务操作协调**：聚合根的业务方法应通过 `coordinateBusinessOperation(operation: string, params: unknown)` 调用，在 `performCoordination` 中实现具体逻辑
    - **实体-聚合分离原则**：聚合根应委托业务逻辑给内部实体（InternalEntity），不直接执行业务逻辑
    - **内部实体（InternalEntity）**：聚合根内部管理的实体必须继承 `InternalEntity` 基类，通过 `addInternalEntity` 添加到聚合根
    - **租户隔离聚合根（TenantIsolatedAggregateRoot）**：Organization 和 Department 等需要租户隔离的聚合根应继承 `TenantIsolatedAggregateRoot`，自动包含租户信息到领域事件
    - **领域事件发布**：使用 `addDomainEvent(event: DomainEvent)` 方法添加领域事件，租户隔离聚合根会自动包含租户信息
    - **仓储接口（IRepository）**：领域层定义 `IRepository<T>` 接口，基础设施层实现具体仓储
    - **业务规则验证**：可选使用 `BusinessRuleManager` 进行业务规则验证
    - **领域服务协调**：可选使用 `CoordinationManager` 进行跨实体业务逻辑协调
  - **应用层核心架构**（基于 @hl8/application-kernel）：
    - **用例（UseCase）是应用层核心**：所有业务逻辑必须通过用例实现，用例继承自 `UseCase<UseCaseInput, UseCaseOutput>`
    - **命令处理器（CommandHandler）**：负责适配和转换，将 Command 转换为 UseCase Input，调用 UseCase 执行，将 UseCase Output 转换为 Command Result
    - **查询处理器（QueryHandler）**：负责适配和转换，将 Query 转换为 UseCase Input，调用 UseCase 执行，将 UseCase Output 转换为 Query Result
    - **职责分离**：Handler 负责 CQRS 框架适配，UseCase 负责核心业务逻辑
- @hl8/config, @hl8/logger, @hl8/cache (基础设施模块)
- @hl8/infrastructure-kernel (基础设施层核心模块)
  - **仓储实现**：使用 `MikroORMRepository` 或 `MikroORMTenantIsolatedRepository` 实现领域层的 `IRepository` 接口
  - **持久化实体**：继承 `BaseEntity` 或 `TenantIsolatedPersistenceEntity`，使用 MikroORM 装饰器
  - **实体映射器**：使用 `EntityMapper` 进行领域实体和持久化实体的双向转换
  - **异常转换**：仓储自动使用 `ExceptionConverter` 将数据库异常转换为领域异常
  - **事务管理**：使用 `ITransactionManager` 的 `runInTransaction` 方法管理事务
  - **事件存储**：使用 `IEventStore`（MikroORMEventStore）存储领域事件，支持事件溯源
  - **查询构建**：使用 `QueryBuilder` 和 `SpecificationConverter` 将业务规范转换为数据库查询
  - **查询缓存**：可选使用 `CachedRepository` 提供查询缓存
  - **租户隔离**：租户隔离仓储自动应用租户、组织、部门三级过滤
- @casl/ability (CASL权限管理核心库)
- nest-casl (NestJS CASL集成包，提供装饰器和守卫)
- @nestjs/common, @nestjs/cqrs (NestJS框架)
- class-validator, class-transformer (验证和转换)
- PostgreSQL with row-level security (RLS) support

**Storage**: PostgreSQL数据库，支持行级安全（ROW_LEVEL_SECURITY）实现租户数据隔离  
**Testing**: Jest 30.2.0, @nestjs/testing，测试覆盖率要求：核心业务逻辑≥80%，关键路径≥90%  
**Target Platform**: Node.js服务器环境（Linux/Windows/macOS），支持多租户SAAS架构  
**Project Type**: 业务模块（business module），位于libs目录下  
**Performance Goals**:

- 租户创建请求成功率≥99.9%
- 典型查询响应时间<200ms（1-5层级）
- 用户注册完成时间<5分钟
- 租户创建初始化<30秒

**Constraints**:

- 必须遵循Clean Architecture四层架构
- 领域层必须保持纯净（无数据库/ORM依赖）
- 必须使用充血模型，禁止贫血模型
- 必须实现实体与聚合根分离
- **聚合根必须实现抽象方法**：`performCoordination` 和 `performBusinessInvariantValidation`
- **业务操作通过协调方法执行**：使用 `coordinateBusinessOperation` 调用业务方法，在 `performCoordination` 中实现逻辑
- **内部实体使用 InternalEntity**：聚合根内部管理的实体必须继承 `InternalEntity` 基类
- **租户隔离聚合根**：需要租户隔离的聚合根应继承 `TenantIsolatedAggregateRoot`
- **基础设施层架构要求**：
  - 持久化实体继承 `BaseEntity` 或 `TenantIsolatedPersistenceEntity`
  - 仓储实现使用 `MikroORMRepository` 或 `MikroORMTenantIsolatedRepository`
  - 使用 `EntityMapper` 进行领域实体和持久化实体的双向转换
  - 使用 `ITransactionManager` 管理事务，使用 `IEventStore` 存储事件
  - 异常由 `ExceptionConverter` 自动转换，无需手动处理
  - 使用 `QueryBuilder` 和 `SpecificationConverter` 构建查询
- 必须支持CQRS、事件溯源和事件驱动架构
- **应用层必须使用用例驱动设计**：所有业务逻辑必须通过 UseCase 实现，CommandHandler/QueryHandler 仅负责适配
- 必须使用NodeNext模块系统
- 所有代码注释和文档使用中文

**Scale/Scope**:

- 7个核心子领域（用户管理、认证、租户管理、组织管理、部门管理、角色管理、权限管理）
- 82个功能需求（FR-001至FR-082）
- 支持企业级多租户架构（最多10,000用户/租户）
- 支持8层部门嵌套结构

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

根据项目宪章 (`.specify/memory/constitution.md`)，以下检查项必须满足：

### I. 中文优先原则检查

- [x] 所有文档和注释使用中文
- [x] API 文档和接口说明使用中文
- [x] 错误消息和日志使用中文
- **状态**: ✅ 符合要求 - 所有文档、注释、错误消息将使用中文

### II. 代码即文档原则检查

- [x] 所有公共 API 有完整的 TSDoc 注释（中文）
- [x] 注释包含 @description、@param、@returns、@throws、@example
- [x] 业务规则在注释中详细描述
- **状态**: ✅ 符合要求 - 将遵循TSDoc规范，所有公共API包含完整中文注释

### III. 架构原则检查

- [x] 采用 Clean Architecture 四层架构（领域层、应用层、基础设施层、接口层）
- [x] 领域层保持纯净（无数据库/ORM 依赖）
- [x] 使用充血模型（Rich Domain Model），禁止贫血模型
- [x] 实体与聚合根分离（entities/ 和 aggregates/）
- [x] 聚合根委托业务逻辑给内部实体，不直接执行业务逻辑
- [x] **聚合根必须实现抽象方法**：`performCoordination` 和 `performBusinessInvariantValidation`
- [x] **业务操作通过协调方法执行**：使用 `coordinateBusinessOperation` 调用业务方法，在 `performCoordination` 中实现逻辑
- [x] **内部实体使用 InternalEntity**：聚合根内部管理的实体必须继承 `InternalEntity` 基类
- [x] **租户隔离聚合根**：需要租户隔离的聚合根（Organization、Department）应继承 `TenantIsolatedAggregateRoot`
- [x] CQRS 模式：命令和查询分离
- [x] 事件溯源：状态变更通过事件记录
- [x] 事件驱动架构：系统组件通过事件通信
- [x] **用例驱动设计**：应用层使用用例（UseCase）作为核心，CommandHandler/QueryHandler 委托给 UseCase
- **状态**: ✅ 符合要求 - 规范明确采用Clean Architecture + DDD + CQRS + ES + EDA架构，应用层使用用例驱动设计

### 技术栈检查

- [x] 使用 NodeNext 模块系统
- [x] TypeScript 配置：module: "NodeNext", moduleResolution: "NodeNext"
- [x] package.json：type: "module", engines: { "node": ">=20" }
- **状态**: ✅ 符合要求 - 将使用NodeNext模块系统，配置与项目其他模块一致

### 模块使用规范检查

- [x] 优先使用 @hl8/config 配置模块（libs/infra/config）
- [x] 优先使用 @hl8/logger 日志模块（libs/infra/logger）
- [x] 优先使用 @hl8/cache 缓存模块（libs/infra/cache）
- [x] 业务模块基于 libs/kernel/domain-kernel 开发领域层
  - **领域层架构要求**：
    - 聚合根必须实现 `performCoordination` 和 `performBusinessInvariantValidation` 抽象方法
    - 业务方法通过 `coordinateBusinessOperation` 调用，在 `performCoordination` 中实现
    - 内部实体继承 `InternalEntity` 基类，通过 `addInternalEntity` 添加到聚合根
    - 需要租户隔离的聚合根继承 `TenantIsolatedAggregateRoot`
    - 领域事件使用 `addDomainEvent` 方法发布
    - 仓储接口在领域层定义，基础设施层实现
- [x] 业务模块基于 libs/kernel/application-kernel 开发应用层
  - **应用层架构要求**：
    - 使用 `UseCase<UseCaseInput, UseCaseOutput>` 基类实现所有业务逻辑
    - CommandHandler/QueryHandler 仅负责适配和转换，委托给 UseCase 执行
    - UseCase 包含完整的业务规则验证和领域对象协调
- [x] 业务模块基于 libs/kernel/infrastructure-kernel 开发基础设施层
  - **基础设施层架构要求**：
    - 持久化实体继承 `BaseEntity` 或 `TenantIsolatedPersistenceEntity`
    - 仓储实现使用 `MikroORMRepository` 或 `MikroORMTenantIsolatedRepository`
    - 使用 `EntityMapper` 进行领域实体和持久化实体的转换
    - 使用 `ITransactionManager` 管理事务，使用 `IEventStore` 存储事件
    - 使用 `ExceptionConverter` 统一异常处理（仓储自动集成）
    - 使用 `QueryBuilder` 和 `SpecificationConverter` 构建查询
    - 租户隔离仓储自动应用租户、组织、部门三级过滤
- [x] 业务模块基于 libs/kernel/interface-kernel 开发接口层
- **状态**: ✅ 符合要求 - 将基于kernel模块和基础设施模块开发，应用层遵循用例驱动设计

### 测试要求检查

- [x] 单元测试文件命名：`{被测试文件名}.spec.ts`，与源代码同目录
- [x] 集成测试位于 `test/integration/`
- [x] 端到端测试位于 `test/e2e/`
- [x] 测试覆盖率要求：核心业务逻辑 ≥ 80%，关键路径 ≥ 90%
- **状态**: ✅ 符合要求 - 将遵循测试分层架构和覆盖率要求

**总体评估**: ✅ **PASSED** - 所有检查项符合项目宪章要求

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
libs/iam/
├── src/
│   ├── domain/                    # 领域层（基于@hl8/domain-kernel）
│   │   ├──            # 7个子领域
│   │   │   ├── user/  # 子领域1：用户管理
│   │   │   │   ├── aggregates/   # 聚合根
│   │   │   │   ├── entities/     # 内部实体
│   │   │   │   ├── value-objects/ # 值对象
│   │   │   │   ├── events/        # 领域事件
│   │   │   │   └── services/     # 领域服务
│   │   │   ├── authentication/   # 子领域2：认证
│   │   │   │   ├── aggregates/   # LoginSession, AuthenticationToken
│   │   │   │   ├── entities/     # 内部实体
│   │   │   │   ├── value-objects/ # 值对象
│   │   │   │   ├── events/        # UserLoggedIn, LoginFailed等
│   │   │   │   └── services/     # 认证服务
│   │   │   ├── tenant/ # 子领域3：租户管理
│   │   │   ├── organization/ # 子领域4：组织管理
│   │   │   ├── department/   # 子领域5：部门管理
│   │   │   ├── role/         # 子领域6：角色管理
│   │   │   └── permission/   # 子领域7：权限管理（集成CASL）
│   │   └── shared/               # 共享内核
│   │       ├── identifiers/      # 标识符
│   │       └── context/          # 租户上下文
│   │
│   ├── application/              # 应用层（基于@hl8/application-kernel）
│   │   ├── user/                 # 子领域1：用户管理
│   │   │   ├── use-cases/        # 用例（核心业务逻辑层）
│   │   │   │   ├── register-user.use-case.ts
│   │   │   │   ├── verify-email.use-case.ts
│   │   │   │   ├── verify-phone.use-case.ts
│   │   │   │   └── ...
│   │   │   ├── commands/         # 命令（CQRS写模型）
│   │   │   │   ├── register-user.command.ts
│   │   │   │   ├── verify-email.command.ts
│   │   │   │   └── ...
│   │   │   ├── queries/          # 查询（CQRS读模型）
│   │   │   ├── handlers/         # 命令和查询处理器（适配层）
│   │   │   │   ├── register-user.handler.ts  # 委托给 RegisterUserUseCase
│   │   │   │   ├── verify-email.handler.ts  # 委托给 VerifyEmailUseCase
│   │   │   │   └── ...
│   │   │   └── projectors/        # 事件投影器
│   │   ├── authentication/       # 子领域2：认证
│   │   │   ├── use-cases/
│   │   │   ├── commands/
│   │   │   ├── queries/
│   │   │   ├── handlers/
│   │   │   └── projectors/
│   │   ├── tenant/              # 子领域3：租户管理
│   │   │   ├── use-cases/
│   │   │   │   ├── create-tenant.use-case.ts
│   │   │   │   └── ...
│   │   │   ├── commands/
│   │   │   │   ├── create-tenant.command.ts
│   │   │   │   └── ...
│   │   │   ├── queries/
│   │   │   ├── handlers/
│   │   │   │   ├── create-tenant.handler.ts  # 委托给 CreateTenantUseCase
│   │   │   │   └── ...
│   │   │   └── projectors/
│   │   ├── organization/         # 子领域4：组织管理
│   │   │   ├── use-cases/
│   │   │   ├── commands/
│   │   │   ├── queries/
│   │   │   ├── handlers/
│   │   │   └── projectors/
│   │   ├── department/           # 子领域5：部门管理
│   │   │   ├── use-cases/
│   │   │   ├── commands/
│   │   │   ├── queries/
│   │   │   ├── handlers/
│   │   │   └── projectors/
│   │   ├── role/                 # 子领域6：角色管理
│   │   │   ├── use-cases/
│   │   │   ├── commands/
│   │   │   ├── queries/
│   │   │   ├── handlers/
│   │   │   └── projectors/
│   │   ├── permission/           # 子领域7：权限管理
│   │   │   ├── use-cases/
│   │   │   ├── commands/
│   │   │   ├── queries/
│   │   │   ├── handlers/
│   │   │   └── projectors/
│   │   └── shared/               # 共享应用服务（协调多个子领域）
│   │       └── services/         # 跨子领域的应用服务
│   │           ├── tenant-creation.service.ts  # 租户创建服务（协调租户、组织、部门）
│   │           └── ...
│   │
│   ├── infrastructure/          # 基础设施层（基于@hl8/infrastructure-kernel）
│   │   ├── user/                # 子领域1：用户管理
│   │   │   ├── persistence/     # 持久化
│   │   │   │   ├── entities/   # 持久化实体
│   │   │   │   │   └── user.persistence-entity.ts
│   │   │   │   ├── repositories/  # 仓储实现
│   │   │   │   │   └── user.repository.ts
│   │   │   │   └── mappers/    # 领域-持久化实体映射器
│   │   │   │       └── user.mapper.ts
│   │   │   └── event-store/    # 事件存储（用户领域事件）
│   │   ├── authentication/     # 子领域2：认证
│   │   │   ├── persistence/
│   │   │   │   ├── entities/
│   │   │   │   │   ├── login-session.persistence-entity.ts
│   │   │   │   │   └── authentication-token.persistence-entity.ts
│   │   │   │   ├── repositories/
│   │   │   │   │   ├── login-session.repository.ts
│   │   │   │   │   └── authentication-token.repository.ts
│   │   │   │   └── mappers/
│   │   │   │       ├── login-session.mapper.ts
│   │   │   │       └── authentication-token.mapper.ts
│   │   │   └── event-store/
│   │   ├── tenant/              # 子领域3：租户管理
│   │   │   ├── persistence/
│   │   │   │   ├── entities/
│   │   │   │   │   └── tenant.persistence-entity.ts
│   │   │   │   ├── repositories/
│   │   │   │   │   └── tenant.repository.ts
│   │   │   │   └── mappers/
│   │   │   │       └── tenant.mapper.ts
│   │   │   └── event-store/
│   │   ├── organization/        # 子领域4：组织管理
│   │   │   ├── persistence/
│   │   │   │   ├── entities/
│   │   │   │   │   └── organization.persistence-entity.ts
│   │   │   │   ├── repositories/
│   │   │   │   │   └── organization.repository.ts
│   │   │   │   └── mappers/
│   │   │   │       └── organization.mapper.ts
│   │   │   └── event-store/
│   │   ├── department/          # 子领域5：部门管理
│   │   │   ├── persistence/
│   │   │   │   ├── entities/
│   │   │   │   │   └── department.persistence-entity.ts
│   │   │   │   ├── repositories/
│   │   │   │   │   └── department.repository.ts
│   │   │   │   └── mappers/
│   │   │   │       └── department.mapper.ts
│   │   │   └── event-store/
│   │   ├── role/                # 子领域6：角色管理
│   │   │   ├── persistence/
│   │   │   │   ├── entities/
│   │   │   │   │   └── role.persistence-entity.ts
│   │   │   │   ├── repositories/
│   │   │   │   │   └── role.repository.ts
│   │   │   │   └── mappers/
│   │   │   │       └── role.mapper.ts
│   │   │   └── event-store/
│   │   ├── permission/          # 子领域7：权限管理
│   │   │   ├── persistence/
│   │   │   │   ├── entities/
│   │   │   │   │   └── permission.persistence-entity.ts
│   │   │   │   ├── repositories/
│   │   │   │   │   └── permission.repository.ts
│   │   │   │   └── mappers/
│   │   │   │       └── permission.mapper.ts
│   │   │   └── event-store/
│   │   └── shared/              # 共享基础设施组件
│   │       ├── casl/            # CASL集成（权限管理相关）
│   │       │   ├── ability-factory.ts  # Ability工厂
│   │       │   ├── rules/       # CASL规则定义
│   │       │   └── adapters/   # CASL适配器
│   │       └── external/        # 外部服务集成（跨子领域）
│   │           ├── email/      # 邮件服务
│   │           │   └── email.service.ts
│   │           └── sms/        # 短信服务
│   │               └── sms.service.ts
│   │
│   └── interface/               # 接口层（基于@hl8/interface-kernel）
│       ├── http/               # REST API
│       │   ├── controllers/   # 控制器
│       │   ├── dto/           # 数据传输对象
│       │   └── guards/        # 守卫（权限验证）
│       └── events/            # 事件订阅者

test/
├── integration/                # 集成测试
│   └── iam/
└── e2e/                        # 端到端测试
    └── iam/
```

**Structure Decision**:
采用业务模块结构，位于`libs/iam/`目录下。遵循Clean Architecture四层架构：

- **领域层** (`domain/`): 包含7个子领域，每个子领域独立管理聚合根、实体、值对象、领域事件和领域服务
  - **聚合根架构**：
    - 所有聚合根继承 `AggregateRoot` 或 `TenantIsolatedAggregateRoot`
    - 必须实现 `performCoordination` 和 `performBusinessInvariantValidation` 抽象方法
    - 业务方法通过 `coordinateBusinessOperation` 调用，在 `performCoordination` 中实现具体逻辑
    - 遵循实体-聚合分离原则，委托业务逻辑给内部实体
  - **内部实体**：
    - 聚合根内部管理的实体（如 VerificationCodeEntity）继承 `InternalEntity`
    - 通过 `addInternalEntity` 添加到聚合根，由聚合根统一管理生命周期
  - **租户隔离**：
    - Organization 和 Department 等需要租户隔离的聚合根继承 `TenantIsolatedAggregateRoot`
    - 自动将租户信息添加到领域事件中
  - **领域事件**：
    - 使用 `addDomainEvent(event: DomainEvent)` 方法发布事件
    - 租户隔离聚合根自动包含 tenantId、organizationId、departmentId 到事件数据
  - **仓储接口**：
    - 领域层定义 `IRepository<T>` 接口，扩展标准仓储方法
    - 基础设施层实现具体仓储，遵循依赖倒置原则
- **应用层** (`application/`): 按子领域组织，每个子领域包含完整的应用层组件
  - **子领域目录结构**（user/, authentication/, tenant/, organization/, department/, role/, permission/）：
    - **用例（use-cases/）是核心**：所有业务逻辑通过 UseCase 实现，继承自 `UseCase<UseCaseInput, UseCaseOutput>`
    - **命令和查询（commands/, queries/）**：CQRS 模式的命令和查询定义
    - **处理器（handlers/）**：负责适配和转换，将 Command/Query 转换为 UseCase Input，调用 UseCase 执行，将 UseCase Output 转换为 CommandResult/QueryResult
    - **事件投影器（projectors/）**：基于事件构建读模型
  - **共享应用服务（shared/services/）**：协调多个子领域的复杂业务流程（如租户创建服务协调租户、组织、部门三个子领域）
- **基础设施层** (`infrastructure/`): 按子领域组织，每个子领域包含完整的持久化组件
  - **子领域目录结构**（user/, authentication/, tenant/, organization/, department/, role/, permission/）：
    - **持久化（persistence/）**：
      - **持久化实体（entities/）**：
        - 继承 `BaseEntity`（非租户隔离）或 `TenantIsolatedPersistenceEntity`（租户隔离）
        - 使用 MikroORM 装饰器（@Entity, @Property, @Index 等）定义数据库映射
        - 包含 id、createdAt、updatedAt、version、deletedAt 等基础字段
      - **仓储实现（repositories/）**：
        - 实现领域层定义的 `IRepository` 或 `ITenantIsolatedRepository` 接口
        - 内部使用 `MikroORMRepository` 或 `MikroORMTenantIsolatedRepository` 进行数据访问
        - 使用 `EntityMapper` 进行领域实体和持久化实体的转换
        - 异常由 `ExceptionConverter` 自动转换，无需手动处理
      - **实体映射器（mappers/）**：
        - 使用 `EntityMapper` 基类，配置自动映射和自定义映射规则
        - 实现 `toDomain` 和 `toPersistence` 方法
        - 支持嵌套聚合和值对象的映射
    - **事件存储（event-store/）**：
      - 使用 `IEventStore` 接口（由 `MikroORMEventStore` 实现）
      - 保存领域事件时使用乐观并发控制（版本号）
      - 支持事件流查询和快照管理
  - **共享基础设施组件（shared/）**：
    - **CASL集成（casl/）**：权限管理相关的共享组件
      - Ability工厂、规则定义、适配器
    - **外部服务集成（external/）**：跨子领域的外部服务
      - 邮件服务、短信服务
  - **基础设施层通用能力**（由 @hl8/infrastructure-kernel 提供）：
    - **事务管理**：
      - 使用 `ITransactionManager` 的 `runInTransaction` 方法
      - 支持嵌套事务（最多5层）
      - 自动提交/回滚，支持事务超时控制
    - **查询构建**：
      - 使用 `QueryBuilder` 从规范构建查询
      - 使用 `SpecificationConverter` 将业务规范转换为数据库查询
      - 自动应用租户隔离过滤条件
    - **查询缓存（可选）**：
      - 使用 `CachedRepository` 包装仓储，提供查询缓存
      - 保存/删除时自动失效相关缓存
- **接口层** (`interface/`): 提供REST API接口和事件订阅

**应用层架构模式**：

- **用例驱动设计**：UseCase 是应用层核心，包含完整的业务逻辑和规则验证
- **职责分离**：Handler 负责 CQRS 框架适配，UseCase 负责业务逻辑
- **可测试性**：UseCase 可独立测试，不依赖 CQRS 框架
- **可重用性**：UseCase 可被多个 Handler 或服务调用

权限管理子领域将集成CASL库，在基础设施层提供CASL集成模块，在应用层使用CASL进行权限验证。认证子领域负责用户登录、会话管理和JWT令牌生成。

## Phase 0: Research & Outline

**Status**: ✅ **COMPLETED**

### Research Findings

已生成 `research.md`，包含以下技术决策：

1. **CASL集成方案**：
   - 采用 @casl/ability 作为权限管理核心库
   - CASL位于基础设施层，领域层保持纯净
   - 使用规则工厂模式 + 缓存策略

2. **架构集成**：
   - CASL与DDD领域模型解耦设计
   - 事件驱动架构支持权限规则动态更新
   - 多租户权限隔离通过TenantContext + CASL条件实现

3. **性能优化**：
   - Ability实例缓存
   - 规则预编译

**Research Output**: `specs/001-iam/research.md`

---

## Phase 1: Design & Contracts

**Status**: ✅ **COMPLETED**

### Data Model

已生成 `data-model.md`，定义：

- **9个核心聚合根**：User, UserAssignment, LoginSession, AuthenticationToken, Tenant, Organization, Department, Role, Permission
- **值对象**：标识符、业务值对象（Email, PhoneNumber, TenantCode等）
- **实体关系**：完整的实体关系图和关键关系说明
- **CASL集成数据模型**：Ability定义和规则映射

**Data Model Output**: `specs/001-iam/data-model.md`

### API Contracts

已生成 OpenAPI 规范，包含：

- **用户管理API**：注册、验证邮箱/手机
- **租户管理API**：创建租户、更新状态
- **用户分配API**：邀请用户、分配用户到组织/部门
- **权限验证API**：CASL权限检查

**Contracts Output**: `specs/001-iam/contracts/openapi.yaml`

### Quick Start Guide

已生成快速开始指南，包含：

- 项目初始化步骤
- 依赖安装说明
- 架构分层说明
- CASL集成示例代码
- 开发流程示例

**Quick Start Output**: `specs/001-iam/quickstart.md`

### Agent Context Update

已更新 Cursor IDE 上下文文件，添加：

- TypeScript 5.9.3, Node.js >=20
- PostgreSQL with RLS support

---

## Phase 2: Tasks (Next Step)

**Status**: ⏳ **PENDING** - 需要运行 `/speckit.tasks` 命令生成

下一步将根据用户故事和功能需求生成详细的任务分解。

---

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

**当前状态**: 无违反项 - 所有设计决策符合项目宪章要求

---

## Summary Report

**Branch**: `001-iam`  
**Implementation Plan**: `specs/001-iam/plan.md`  
**Generated Artifacts**:

- ✅ `research.md` - CASL集成技术决策
- ✅ `data-model.md` - 数据模型定义
- ✅ `contracts/openapi.yaml` - API契约规范
- ✅ `quickstart.md` - 快速开始指南

**Constitution Check**: ✅ **PASSED** - 所有检查项符合要求

**Next Command**: `/speckit.tasks` - 生成详细的任务分解
