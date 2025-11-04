# Feature Specification: 接口内核对齐与落地（Interface Kernel Alignment）

**Feature Branch**: `001-align-interface-kernel`  
**Created**: 2025-11-03  
**Status**: Draft  
**Input**: User description: "对齐libs/kernel/domain-kernel、libs/kernel/application-kernel、libs/kernel/infrastructure-kernel开发libs/kernel/interface-kernel"

## Background & Context

本项目是**SAAS平台**，kernel是核心基础，采用**混合架构模式**：Clean Architecture + DDD + CQRS + ES（事件溯源）+ EDA（事件驱动架构）。通过这一混合架构的有机结合，为业务模块开发提供统一的基础设施和开发模式。

目前已开发完成：

- **domain-kernel**: 领域层核心，提供实体、聚合根、值对象、仓储接口、规范模式等DDD核心能力
- **application-kernel**: 应用层核心，提供用例、命令/查询（CQRS）、事件总线、投影器、Saga等应用层能力
- **infrastructure-kernel**: 基础设施层核心，提供MikroORM实现的仓储、事件存储等持久化能力

**interface-kernel**的目标是：提取并统一三内核的公共契约，形成稳定的接口层，确保跨层协作的一致性和演进可控性。

## User Scenarios & Testing _(mandatory)_

### User Story 1 - 作为架构负责人，我需要统一接口内核契约（Priority: P1)

通过`interface-kernel`输出面向各内核（领域、应用、基础设施）的稳定契约层，确保跨模块协作一致、依赖清晰、演进可控。

**Why this priority**: 统一契约是后续各内核解耦与演进的基础，优先级最高。

**Independent Test**: 仅引入`interface-kernel`进行契约编译校验与静态检查即可验证接口一致性，不依赖具体实现。

**Acceptance Scenarios**:

1. Given 现有`domain-kernel`/`application-kernel`/`infrastructure-kernel`的公共能力清单，When 在`interface-kernel`中建立对应契约并发布预览，Then 三内核编译通过且无API命名冲突/语义冲突。
2. Given 新增或变更契约，When 触发对三内核的契约一致性检查，Then 报告包含破坏性变更、兼容性等级及影响范围评估。

---

### User Story 2 - 作为内核使用方，我需要稳定一致的接口消费体验（Priority: P2)

依赖`interface-kernel`提供的类型与契约，在业务服务中可以无感切换底层实现（内存/数据库/消息等），降低迁移成本。

**Why this priority**: 直接提升业务交付稳定性与可维护性。

**Independent Test**: 在样例服务中仅替换实现绑定，不改业务调用代码，运行端到端用例应保持一致结果。

**Acceptance Scenarios**:

1. Given 使用方仅依赖`interface-kernel`类型与接口，When 切换基础设施实现，Then 端到端行为一致且无需改动业务调用代码。

---

### User Story 3 - 作为质量与合规角色，我需要清晰可验证的对齐规则（Priority: P3)

具备可度量的契约覆盖率、破坏性变更提示、中文TSDoc文档与版本兼容策略，以满足组织规范与审计。

**Why this priority**: 保障长期演进下的质量与合规。

**Independent Test**: 基于自动化报告（契约对齐清单、API变更报告）即可独立判定是否合规。

**Acceptance Scenarios**:

1. Given 合约库版本升级，When 执行变更报告，Then 能明确标注语义化版本等级、破坏性变更点与迁移指南链接。

### Edge Cases

- 边界：某内核存在特定实现语义（如事务/一致性策略）难以抽象为稳态契约，如何处理？
- 错误：上游契约新增非兼容字段，如何标识影响并提供降级/迁移指引？
- 版本：多版本并存时，如何限定最小兼容范围与废弃周期？

## Requirements _(mandatory)_

### Functional Requirements

- FR-001: 必须提供覆盖三内核（领域/应用/基础设施）对齐的公共契约集合（类型、接口、枚举、错误模型）。
- FR-002: 必须以中文TSDoc提供完整业务注释，满足“代码即文档”要求（描述、前置/后置条件、使用示例、异常）。
- FR-003: 必须提供契约一致性检查清单，至少包含：命名一致性、语义一致性、破坏性变更检测、兼容性等级。
- FR-004: 必须提供变更报告能力，标注语义化版本（MAJOR/MINOR/PATCH）与影响范围，附迁移建议摘要。
- FR-005: 必须提供示例消费场景（最小可行），展示仅替换实现而不改业务调用代码即可运行。
- FR-006: 必须对齐组织约束：TypeScript 5.9+、NodeNext模块系统、严格模式、禁止CommonJS、`package.json` engines约束与`type: module`。
- FR-007: 必须提供契约稳定性基线：公共API需具备≥90%用例覆盖（单测/集成测合计），并纳入质量门禁。
- FR-008: 必须提供废弃（Deprecated）与移除策略：废弃需至少经历1个MINOR周期，提供替代方案与迁移示例。
- FR-009: 必须提供依赖三内核的对齐矩阵（契约->实现方映射），用于审计与回归检查。
- FR-010: 必须支持多版本并存的风险提示与最低兼容策略说明。
- FR-011v: 接口层对外版本策略采用 URI 路径版本化：`/v{MAJOR}/...`；与 `interface-kernel` 的 SemVer 同步对齐（MAJOR一致）。同一 MAJOR 下 MINOR/PATCH 需保持后向兼容；破坏性变更仅在提升 MAJOR 时允许，并遵循冻结与废弃策略（见 FR-012/FR-013）。

_需要澄清的关键点（最多3项）：_

_基于SAAS平台和混合架构特点，对关键决策的明确说明：_

- **FR-011 (已明确)**: 初始对齐范围限定在核心能力子集：**标识符类型**（EntityId, TenantId, OrganizationId, DepartmentId等）、**租户上下文**（TenantContext）、**仓储接口**（IRepository, ITenantIsolatedRepository, IQueryRepository）、**命令/查询基类接口**（BaseCommand, BaseQuery相关接口）、**事件接口**（IEventStore等）、**结果类型**（CommandResult, QueryResult）、**分页/排序/过滤类型**、**错误模型**（DomainException, BusinessException等）。后续迭代逐步扩展。
- **FR-012 (已明确)**: 版本策略强制SemVer严格语义，MAJOR版本需经历至少**3个月冻结期**（从发布到下一次MAJOR版本），确保生态稳定性。MINOR版本允许新增非破坏性功能，PATCH版本仅修复bug。
- **FR-013 (已明确)**: 废弃（Deprecated）周期最少跨**2个MINOR版本**，不允许跳版移除。例如：在1.2.0中标记为Deprecated的接口，最早在1.4.0中移除。每个MINOR版本必须提供迁移指南和替代方案。

### Key Entities _(include if feature involves data)_

- **接口契约（Interface Contracts）**：面向三内核的稳定抽象（类型/接口/错误/结果）。
  - **标识符契约**：EntityId, TenantId, OrganizationId, DepartmentId等
  - **租户上下文契约**：TenantContext类型定义
  - **仓储契约**：IRepository<T>, ITenantIsolatedRepository<T>, IQueryRepository<T>
  - **命令/查询契约**：BaseCommand, BaseQuery相关接口
  - **事件契约**：IEventStore, DomainEvent相关接口
  - **结果契约**：CommandResult, QueryResult
  - **分页/排序/过滤契约**：Pagination, Sorting, Filtering类型
  - **错误契约**：DomainException, BusinessException等错误类型
- **对齐矩阵（Alignment Matrix）**：契约到各内核实现/责任的映射清单。
- **变更报告（Change Report）**：版本号、变更类型、影响范围、迁移建议。

## Success Criteria _(mandatory)_

### Measurable Outcomes

- SC-001: 契约对齐覆盖基础能力（标识/错误/结果/分页/仓储）≥ 95%。
- SC-002: 三内核在仅依赖契约的情况下编译通过率100%，端到端样例在实现切换时行为一致。
- SC-003: 破坏性变更均能被报告识别，误报率< 5%，漏报率为0。
- SC-004: 契约公共API测试覆盖率≥ 90%，关键路径≥ 95%。
- SC-005: 变更发布后，消费方完成迁移的平均时间≤ 1 人日。
- SC-006: 中文TSDoc覆盖所有公共API（抽样检查合格率100%）。

## Assumptions

- 本项目是SAAS平台，kernel为核心基础设施，稳定性要求极高。
- 采用混合架构模式（Clean Architecture + DDD + CQRS + ES + EDA），interface-kernel需对齐三内核的核心契约。
- 初始迭代聚焦"最小可行契约集"，优先覆盖标识、租户上下文、错误、结果、分页、仓储接口、命令/查询接口、事件接口等基础能力。
- 采用语义化版本策略（SemVer），MAJOR版本需3个月冻结期，仅因破坏性变更发生。
- 废弃周期最少跨2个MINOR版本，不允许跳版移除。
- 组织约束（NodeNext、ES2022、严格模式、TypeScript 5.9+）是强制合规项。

## Out of Scope

- 具体实现细节（如存储引擎、队列中间件）不在本规格范围内。
- 性能优化与运行时治理策略不在本阶段要求（仅要求契约稳定与可验证）。

## Dependencies

- **domain-kernel**: 依赖领域层核心的实体、聚合根、值对象、仓储接口定义、标识符类型、租户上下文等。
- **application-kernel**: 依赖应用层核心的命令/查询基类、事件接口、用例接口、结果类型等。
- **infrastructure-kernel**: 依赖基础设施层核心的仓储实现接口、事件存储实现接口等。
- **libs/infra/**: 优先使用组织内自定义基础设施适配层（如数据库、缓存、消息队列等适配器），统一承载第三方依赖并对外暴露稳定接口。
- 依赖现有测试框架（Jest）与质量门禁策略。
- 依赖现有配置管理（@hl8/config）和日志（@hl8/logger）。

## Glossary

- 接口内核（Interface Kernel）：面向多内核的稳定契约集合。
- 对齐矩阵（Alignment Matrix）：契约到实现/责任的映射表。

## Clarifications

### Session 2025-11-03

- Q: 接口层对外版本策略采用哪种方式？ → A: A（URI 路径版本化 /v1，与 interface-kernel SemVer 对齐）

## Interface Layer（最外层）

- 职责：用户界面与外部接口适配层（呈现/交互/集成）。
- 特点：依赖所有内层，需保持对领域与应用契约的严格遵循，传输与协议无关（HTTP/GraphQL/WebSocket/CLI/测试）。
- 组件：Web API、GraphQL、WebSocket、CLI、测试。

interface-kernel 对接口层的支持与约束：

- 提供跨传输协议稳定的契约集合（DTO类型、错误码/错误模型、分页/排序/过滤模型、结果封装）。
- 为接口层适配器提供类型与接口约束，避免直接耦合领域与基础设施实现细节。
- 约束输入/输出的语义一致性：命名、必填/可选、边界值与错误语义与应用/领域层保持一致。
- 保障变更可控：通过契约变更报告与语义版本，指导接口层的演进与向后兼容策略。
- 版本化策略：对外 API 采用 URI 路径版本（`/v{MAJOR}/...`），与 interface-kernel 的 SemVer 同步对齐（MAJOR一致）；同一 MAJOR 内保证后向兼容，破坏性变更仅随 MAJOR 提升发布。

## 依赖关系图

```

┌─────────────────────────────────────────────────────────────┐

│                    Interface Layer                          │

│                  (接口层 - 最外层)                           │

│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐           │

│  │   Web API   │ │  GraphQL    │ │   WebSocket │           │

│  └─────────────┘ └─────────────┘ └─────────────┘           │

└─────────────────────┬───────────────────────────────────────┘

                      │ 依赖

┌─────────────────────▼───────────────────────────────────────┐

│                Infrastructure Layer                         │

│                (基础设施层 - 第三层)                          │

│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐           │

│  │  Database   │ │    Cache    │ │ Message Q   │           │

│  └─────────────┘ └─────────────┘ └─────────────┘           │

└─────────────────────┬───────────────────────────────────────┘

                      │ 依赖

┌─────────────────────▼───────────────────────────────────────┐

│                 Application Layer                           │

│                 (应用层 - 第二层)                            │

│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐           │

│  │ Use Cases   │ │   Services  │ │   Handlers  │           │

│  └─────────────┘ └─────────────┘ └─────────────┘           │

└─────────────────────┬───────────────────────────────────────┘

                      │ 依赖

┌─────────────────────▼───────────────────────────────────────┐

│                   Domain Layer                              │

│                  (领域层 - 最内层)                           │

│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐           │

│  │  Entities   │ │AggregateRoot│ │Domain Events│           │

│  └─────────────┘ └─────────────┘ └─────────────┘           │

└─────────────────────────────────────────────────────────────┘

```
