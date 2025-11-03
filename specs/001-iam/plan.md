# Implementation Plan: IAM业务模块开发（引入CASL）

**Branch**: `001-iam` | **Date**: 2024-12-19 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-iam/spec.md` + User requirement: "引入CASL开发iam"

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

开发IAM（身份与访问管理）业务模块，实现多租户SAAS平台的核心身份认证、访问控制和权限管理功能。模块采用Clean Architecture + DDD + CQRS + ES + EDA架构，引入CASL（Class Access Specification Language）库实现细粒度的权限管理，支持RBAC和ABAC访问控制模型。模块划分为7个核心子领域：用户管理、认证、租户管理、组织管理、部门管理、角色管理、权限管理。

## Technical Context

<!--
  ACTION REQUIRED: Replace the content in this section with the technical details
  for the project. The structure here is presented in advisory capacity to guide
  the iteration process.
-->

**Language/Version**: TypeScript 5.9.3, Node.js >=20  
**Primary Dependencies**:

- @hl8/domain-kernel, @hl8/application-kernel, @hl8/infrastructure-kernel, @hl8/interface-kernel (kernel核心模块)
  - **标识符值对象**：优先使用 `@hl8/domain-kernel/src/identifiers` 中的值对象
    - `EntityId` - 通用实体标识符（用户ID、角色ID、权限ID、会话ID、令牌ID等）
    - `TenantId` - 租户标识符
    - `OrganizationId` - 组织标识符（包含租户关联和层级关系）
    - `DepartmentId` - 部门标识符（包含组织关联和层级关系）
  - **注意**：IAM模块不得重新定义标识符值对象，必须使用domain-kernel提供的值对象
- @hl8/config, @hl8/logger, @hl8/cache (基础设施模块)
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
- 必须支持CQRS、事件溯源和事件驱动架构
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
- [x] CQRS 模式：命令和查询分离
- [x] 事件溯源：状态变更通过事件记录
- [x] 事件驱动架构：系统组件通过事件通信
- **状态**: ✅ 符合要求 - 规范明确采用Clean Architecture + DDD + CQRS + ES + EDA架构

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
- [x] 业务模块基于 libs/kernel/application-kernel 开发应用层
- [x] 业务模块基于 libs/kernel/infrastructure-kernel 开发基础设施层
- [x] 业务模块基于 libs/kernel/interface-kernel 开发接口层
- **状态**: ✅ 符合要求 - 将基于kernel模块和基础设施模块开发

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

<!--
  ACTION REQUIRED: Replace the placeholder tree below with the concrete layout
  for this feature. Delete unused options and expand the chosen structure with
  real paths (e.g., apps/admin, packages/something). The delivered plan must
  not include Option labels.
-->

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
│   │   ├── commands/             # 命令（CQRS写模型）
│   │   ├── queries/             # 查询（CQRS读模型）
│   │   ├── handlers/            # 命令和查询处理器
│   │   ├── services/             # 应用服务
│   │   └── projectors/          # 事件投影器
│   │
│   ├── infrastructure/          # 基础设施层（基于@hl8/infrastructure-kernel）
│   │   ├── persistence/         # 持久化
│   │   │   ├── entities/       # 持久化实体
│   │   │   ├── repositories/  # 仓储实现
│   │   │   └── mappers/        # 领域-持久化实体映射器
│   │   ├── event-store/        # 事件存储
│   │   ├── casl/               # CASL集成
│   │   │   ├── ability-factory.ts  # Ability工厂
│   │   │   ├── rules/          # CASL规则定义
│   │   │   └── adapters/      # CASL适配器
│   │   └── external/           # 外部服务集成
│   │       ├── email/          # 邮件服务
│   │       └── sms/            # 短信服务
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
- **应用层** (`application/`): 实现CQRS模式，包含命令、查询、处理器和事件投影器
- **基础设施层** (`infrastructure/`): 包含持久化、事件存储、CASL集成和外部服务
- **接口层** (`interface/`): 提供REST API接口和事件订阅

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
