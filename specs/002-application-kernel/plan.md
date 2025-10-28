# Implementation Plan: Application Kernel Core Module

**Branch**: `002-application-kernel` | **Date**: 2024-12-19 | **Spec**: [link]
**Input**: Feature specification from `/specs/002-application-kernel/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

基于Clean Architecture开发hl8-platform项目的应用层核心模块，实现CQRS + 事件溯源(ES) + 事件驱动架构(EDA)的混合架构。遵循分层测试架构约定，确保代码质量和快速反馈。

## Technical Context

**Language/Version**: TypeScript 5.9.3, Node.js >=20  
**Primary Dependencies**: @nestjs/core, @nestjs/cqrs, @hl8/domain-kernel, @hl8/config, @hl8/logger, class-validator, class-transformer, uuid  
**Storage**: 混合存储策略（PostgreSQL + MongoDB），事件存储支持关系型数据库和NoSQL  
**Testing**: Jest, Supertest, @nestjs/testing - 遵循分层测试架构约定  
**Target Platform**: Node.js服务器环境，支持分布式部署  
**Project Type**: 库项目 - 应用层核心模块  
**Performance Goals**: 支持1000个并发用例执行，命令执行成功率99.9%，查询响应延迟<100ms  
**Constraints**: 严格遵循Clean Architecture原则，与@nestjs/cqrs官方实现兼容，支持类型安全，遵循分层测试架构约定  
**Scale/Scope**: 支持100万条事件存储，10000个并发总线请求，100个不同类型Saga

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

**✅ Library-First**: 应用层核心作为独立库开发，自包含且可独立测试  
**✅ Test-First**: 所有组件遵循TDD原则，测试覆盖率≥80%，遵循分层测试架构约定  
**✅ Integration Testing**: 重点测试与@nestjs/cqrs、@hl8/domain-kernel的集成  
**✅ Observability**: 集成@hl8/logger提供结构化日志和性能监控  
**✅ Versioning**: 遵循语义化版本控制，支持向后兼容  
**✅ Simplicity**: 基于@nestjs/cqrs官方模式，避免过度设计

### Post-Design Validation

**✅ Platform Integration**: 优先使用@hl8/config和@hl8/logger，确保平台一致性  
**✅ Type Safety**: 基于TypeScript 5.9.3和class-validator实现完全类型安全  
**✅ Clean Architecture**: 严格遵循分层架构，应用层不依赖基础设施层  
**✅ CQRS Compliance**: 完全兼容@nestjs/cqrs官方实现模式  
**✅ Event Sourcing**: 实现混合存储策略，支持PostgreSQL和MongoDB  
**✅ Error Handling**: 建立完整的异常层次结构，集成平台日志系统  
**✅ Testing Architecture**: 遵循分层测试架构约定，确保代码质量和快速反馈

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
libs/kernel/application-kernel/
├── src/
│   ├── use-cases/           # 用例基础架构
│   │   ├── base/
│   │   │   ├── use-case.base.ts
│   │   │   ├── use-case.base.spec.ts        # 单元测试（就近原则）
│   │   │   ├── use-case-input.base.ts
│   │   │   ├── use-case-input.base.spec.ts  # 单元测试（就近原则）
│   │   │   ├── use-case-output.base.ts
│   │   │   └── use-case-output.base.spec.ts # 单元测试（就近原则）
│   │   └── decorators/
│   │       ├── use-case.decorator.ts
│   │       └── use-case.decorator.spec.ts   # 单元测试（就近原则）
│   ├── commands/            # CQRS命令模式
│   │   ├── base/
│   │   │   ├── command.base.ts
│   │   │   ├── command.base.spec.ts         # 单元测试（就近原则）
│   │   │   ├── command-handler.base.ts
│   │   │   ├── command-handler.base.spec.ts # 单元测试（就近原则）
│   │   │   ├── command-result.ts
│   │   │   └── command-result.spec.ts       # 单元测试（就近原则）
│   │   └── decorators/
│   │       ├── command.decorator.ts
│   │       └── command.decorator.spec.ts    # 单元测试（就近原则）
│   ├── queries/             # CQRS查询模式
│   │   ├── base/
│   │   │   ├── query.base.ts
│   │   │   ├── query.base.spec.ts           # 单元测试（就近原则）
│   │   │   ├── query-handler.base.ts
│   │   │   ├── query-handler.base.spec.ts   # 单元测试（就近原则）
│   │   │   ├── query-result.ts
│   │   │   └── query-result.spec.ts         # 单元测试（就近原则）
│   │   └── decorators/
│   │       ├── query.decorator.ts
│   │       └── query.decorator.spec.ts      # 单元测试（就近原则）
│   ├── events/              # 事件溯源机制
│   │   ├── types/
│   │   │   ├── domain-event.ts
│   │   │   └── domain-event.spec.ts         # 单元测试（就近原则）
│   │   ├── store/
│   │   │   ├── event-store.interface.ts
│   │   │   ├── event-store.interface.spec.ts # 单元测试（就近原则）
│   │   │   ├── event-store.impl.ts
│   │   │   └── event-store.impl.spec.ts     # 单元测试（就近原则）
│   │   └── bus/
│   │       ├── event-bus.interface.ts
│   │       ├── event-bus.interface.spec.ts  # 单元测试（就近原则）
│   │       ├── event-bus.impl.ts
│   │       └── event-bus.impl.spec.ts       # 单元测试（就近原则）
│   ├── projectors/          # 事件投影器
│   │   ├── base/
│   │   │   ├── projector.base.ts
│   │   │   ├── projector.base.spec.ts       # 单元测试（就近原则）
│   │   │   ├── projector-handler.base.ts
│   │   │   └── projector-handler.base.spec.ts # 单元测试（就近原则）
│   │   └── decorators/
│   │       ├── projector.decorator.ts
│   │       └── projector.decorator.spec.ts  # 单元测试（就近原则）
│   ├── sagas/               # Saga模式
│   │   ├── base/
│   │   │   ├── saga.base.ts
│   │   │   ├── saga.base.spec.ts            # 单元测试（就近原则）
│   │   │   ├── saga-state.ts
│   │   │   ├── saga-state.spec.ts           # 单元测试（就近原则）
│   │   │   ├── saga-step.ts
│   │   │   └── saga-step.spec.ts            # 单元测试（就近原则）
│   │   └── decorators/
│   │       ├── saga.decorator.ts
│   │       └── saga.decorator.spec.ts       # 单元测试（就近原则）
│   ├── bus/                 # 命令查询总线
│   │   ├── command-query-bus.interface.ts
│   │   ├── command-query-bus.interface.spec.ts # 单元测试（就近原则）
│   │   ├── command-query-bus.impl.ts
│   │   ├── command-query-bus.impl.spec.ts   # 单元测试（就近原则）
│   │   └── middleware/
│   │       ├── bus-middleware.ts
│   │       └── bus-middleware.spec.ts       # 单元测试（就近原则）
│   ├── cache/               # 查询缓存
│   │   ├── cache.interface.ts
│   │   ├── cache.interface.spec.ts          # 单元测试（就近原则）
│   │   ├── cache.impl.ts
│   │   ├── cache.impl.spec.ts               # 单元测试（就近原则）
│   │   └── invalidation/
│   │       ├── event-based-invalidation.ts
│   │       └── event-based-invalidation.spec.ts # 单元测试（就近原则）
│   ├── monitoring/          # 性能监控
│   │   ├── performance-metrics.ts
│   │   ├── performance-metrics.spec.ts      # 单元测试（就近原则）
│   │   ├── monitoring.service.ts
│   │   └── monitoring.service.spec.ts       # 单元测试（就近原则）
│   ├── config/              # 配置管理（基于@hl8/config）
│   │   ├── config.interface.ts
│   │   ├── config.interface.spec.ts         # 单元测试（就近原则）
│   │   ├── application-kernel.config.ts
│   │   └── application-kernel.config.spec.ts # 单元测试（就近原则）
│   └── exceptions/          # 异常处理
│       ├── base/
│       │   ├── application-exception.base.ts
│       │   ├── application-exception.base.spec.ts # 单元测试（就近原则）
│       │   ├── exception-codes.ts
│       │   └── exception-codes.spec.ts      # 单元测试（就近原则）
│       ├── use-case/
│       │   ├── use-case-exception.ts
│       │   ├── use-case-exception.spec.ts   # 单元测试（就近原则）
│       │   ├── use-case-validation-exception.ts
│       │   └── use-case-validation-exception.spec.ts # 单元测试（就近原则）
│       ├── command/
│       │   ├── command-execution-exception.ts
│       │   ├── command-execution-exception.spec.ts # 单元测试（就近原则）
│       │   ├── command-validation-exception.ts
│       │   └── command-validation-exception.spec.ts # 单元测试（就近原则）
│       ├── query/
│       │   ├── query-execution-exception.ts
│       │   ├── query-execution-exception.spec.ts # 单元测试（就近原则）
│       │   ├── query-validation-exception.ts
│       │   └── query-validation-exception.spec.ts # 单元测试（就近原则）
│       ├── event/
│       │   ├── event-processing-exception.ts
│       │   ├── event-processing-exception.spec.ts # 单元测试（就近原则）
│       │   ├── event-store-exception.ts
│       │   └── event-store-exception.spec.ts # 单元测试（就近原则）
│       └── saga/
│           ├── saga-execution-exception.ts
│           ├── saga-execution-exception.spec.ts # 单元测试（就近原则）
│           ├── saga-compensation-exception.ts
│           └── saga-compensation-exception.spec.ts # 单元测试（就近原则）
├── test/                    # 集中管理测试（src目录外）
│   ├── integration/         # 集成测试
│   │   ├── cqrs.integration.spec.ts
│   │   ├── event-sourcing.integration.spec.ts
│   │   ├── saga.integration.spec.ts
│   │   └── bus.integration.spec.ts
│   ├── e2e/                 # 端到端测试
│   │   ├── application-kernel.e2e.spec.ts
│   │   └── performance.e2e.spec.ts
│   └── contract/            # 契约测试
│       ├── api.contract.spec.ts
│       └── domain.contract.spec.ts
├── package.json
├── tsconfig.json
├── jest.config.ts
└── README.md
```

**Structure Decision**: 采用库项目结构，基于Clean Architecture分层，遵循分层测试架构约定：

- **就近原则**：单元测试文件与被测试文件在同一目录，命名格式：`{被测试文件名}.spec.ts`
- **集中管理**：集成测试、端到端测试统一放置在项目根目录下的 **test** 目录（src目录外）
- **类型分离**：单元测试与源代码同目录，集成测试按模块组织，端到端测试按功能组织
- **测试覆盖率要求**：核心业务逻辑 ≥ 80%，关键路径 ≥ 90%，所有公共 API 必须有测试用例

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation                  | Why Needed         | Simpler Alternative Rejected Because |
| -------------------------- | ------------------ | ------------------------------------ |
| [e.g., 4th project]        | [current need]     | [why 3 projects insufficient]        |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient]  |
