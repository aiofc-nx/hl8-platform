# Implementation Plan: Infrastructure Kernel Enhancement and Alignment

**Branch**: `005-infrastructure-kernel-enhancement` | **Date**: 2025-01-22 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/005-infrastructure-kernel-enhancement/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

对齐 libs/kernel/domain-kernel 和 libs/kernel/application-kernel，全面完善 libs/kernel/infrastructure-kernel。主要工作包括：正式实现 ITenantIsolatedRepository 接口、完善实体映射器（自动映射+手动配置覆盖）、补充 IRepository 接口的缺失方法、实现独立的事务管理接口、支持规范模式查询转换（≤5层嵌套）、实现 IEventStore 接口、提供仓储工厂和 NestJS 依赖注入支持、对齐异常体系。确保 infrastructure-kernel 与 domain-kernel 和 application-kernel 完全对齐，提供完整的数据持久化支持。

## Technical Context

**Language/Version**: TypeScript 5.9.3, Node.js >=20  
**Primary Dependencies**: @nestjs/core, @nestjs/common, @nestjs/cqrs, mikro-orm, @mikro-orm/postgresql, @mikro-orm/mongodb, @hl8/domain-kernel, @hl8/application-kernel, @hl8/config, @hl8/logger, class-validator, class-transformer, uuid  
**Storage**: PostgreSQL (关系数据库), MongoDB (文档数据库) via MikroORM  
**Testing**: Jest, @nestjs/testing, testcontainers for integration tests - 遵循分层测试架构约定  
**Target Platform**: Node.js服务器环境，支持分布式部署  
**Project Type**: 库项目 - 基础设施层核心模块  
**Performance Goals**: 数据库查询响应时间<100ms（10万条记录内），事件存储支持100,000+事件/聚合，连接池可用性>99.9%，事务成功率>99.9%  
**Constraints**: 严格遵循Clean Architecture原则，使用MikroORM统一PostgreSQL和MongoDB接口，实现IRepository和ITenantIsolatedRepository接口，支持乐观锁定，规范模式查询嵌套深度≤5层，遵循分层测试架构约定，所有公共API必须有完整TSDoc中文注释  
**Scale/Scope**: 支持10万条租户隔离记录的查询，1000个并发数据库连接，100%跨租户访问阻止，事件存储支持100,000+事件/聚合

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

**✅ Library-First**: 基础设施层核心作为独立库开发，自包含且可独立测试  
**✅ Test-First**: 所有组件遵循TDD原则，测试覆盖率≥80%（核心业务逻辑≥90%），遵循分层测试架构约定（单元测试就近原则，集成测试集中管理）  
**✅ Integration Testing**: 重点测试与PostgreSQL、MongoDB的集成，验证仓储实现正确性，与domain-kernel和application-kernel的对齐验证  
**✅ Observability**: 集成@hl8/logger提供结构化日志和性能监控  
**✅ Versioning**: 遵循语义化版本控制，支持向后兼容  
**✅ Simplicity**: 基于标准ORM/ODM模式，避免过度设计  
**✅ Code as Documentation**: 所有公共API必须有完整TSDoc中文注释，遵循代码即文档原则

### Post-Design Validation

**✅ Library-First**: Infrastructure-kernel 作为独立库，提供完整的数据持久化能力，自包含且可独立测试  
**✅ Test-First**: 所有新增组件都有单元测试和集成测试，遵循分层测试架构约定  
**✅ Integration Testing**: 设计包含与 PostgreSQL、MongoDB 的集成测试，以及与 domain-kernel 和 application-kernel 的对齐验证测试  
**✅ Observability**: 集成 @hl8/logger 提供结构化日志，事件存储和事务管理都有性能监控  
**✅ Versioning**: 接口实现遵循语义化版本控制，确保向后兼容  
**✅ Simplicity**: 基于标准 ORM 模式（MikroORM）和 DDD 模式，避免过度设计  
**✅ Code as Documentation**: 所有公共 API 都有完整的 TSDoc 中文注释，遵循代码即文档原则

## Project Structure

### Documentation (this feature)

```text
specs/005-infrastructure-kernel-enhancement/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
libs/kernel/infrastructure-kernel/
├── src/
│   ├── repositories/            # 仓储实现
│   │   ├── base/
│   │   │   ├── repository.base.ts
│   │   │   └── repository.base.spec.ts  # 单元测试（就近原则）
│   │   ├── tenant-isolated/
│   │   │   ├── tenant-isolated-repository.ts
│   │   │   ├── tenant-isolated-repository.spec.ts  # 单元测试
│   │   │   ├── tenant-filter.ts
│   │   │   └── tenant-filter.spec.ts  # 单元测试
│   │   ├── factory/            # 仓储工厂
│   │   │   ├── repository-factory.ts
│   │   │   ├── repository-factory.spec.ts  # 单元测试
│   │   │   └── index.ts
│   │   └── index.ts
│   ├── entities/                # MikroORM 持久化实体
│   │   ├── base/
│   │   │   ├── base-entity.ts
│   │   │   ├── base-entity.spec.ts  # 单元测试
│   │   │   ├── tenant-isolated-persistence-entity.ts
│   │   │   └── tenant-isolated-persistence-entity.spec.ts  # 单元测试
│   │   └── index.ts
│   ├── mappers/                 # 实体映射器
│   │   ├── entity-mapper.ts
│   │   ├── entity-mapper.spec.ts  # 单元测试（就近原则）
│   │   ├── mapping-config.ts    # 映射配置
│   │   └── index.ts
│   ├── transactions/            # 事务管理
│   │   ├── transaction-manager.ts
│   │   ├── transaction-manager.spec.ts  # 单元测试
│   │   ├── transaction-context.ts
│   │   └── index.ts
│   ├── queries/                 # 查询构建器
│   │   ├── query-builder.ts
│   │   ├── query-builder.spec.ts  # 单元测试
│   │   ├── specification-converter.ts  # 规范模式转换器
│   │   ├── specification-converter.spec.ts  # 单元测试
│   │   └── index.ts
│   ├── events/                  # 事件存储实现
│   │   ├── event-store.impl.ts  # 实现 IEventStore 接口
│   │   ├── event-store.impl.spec.ts  # 单元测试
│   │   ├── event-entity.ts      # 事件持久化实体
│   │   └── index.ts
│   ├── exceptions/              # 异常转换器
│   │   ├── exception-converter.ts
│   │   ├── exception-converter.spec.ts  # 单元测试
│   │   └── index.ts
│   ├── module/                  # NestJS 模块
│   │   ├── infrastructure-kernel.module.ts
│   │   └── index.ts
│   ├── config/                  # 配置模块
│   │   ├── mikro-orm.config.ts
│   │   ├── database.config.ts
│   │   └── index.ts
│   ├── errors/                  # 异常定义
│   │   ├── repository.exception.ts
│   │   ├── repository.exception.spec.ts  # 单元测试
│   │   └── index.ts
│   └── index.ts                 # 模块导出
├── migrations/                  # MikroORM 迁移脚本
│   ├── Migration20250122000000.ts
│   └── ...
├── test/                        # 集中管理集成测试和端到端测试
│   ├── integration/
│   │   ├── repository.integration.spec.ts
│   │   ├── tenant-isolation.integration.spec.ts
│   │   ├── transaction.integration.spec.ts
│   │   ├── entity-mapper.integration.spec.ts
│   │   ├── specification-query.integration.spec.ts
│   │   ├── event-store.integration.spec.ts
│   │   └── repository-factory.integration.spec.ts
│   ├── e2e/
│   │   ├── kernel-alignment.e2e.spec.ts  # 与domain-kernel和application-kernel对齐验证
│   │   └── tenant-isolation.e2e.spec.ts
│   └── fixtures/                # 测试数据
│       ├── test-entities.ts
│       └── test-domain-entities.ts
├── package.json
├── tsconfig.json
├── tsconfig.build.json
├── jest.config.ts
└── README.md
```

**Structure Decision**: 基于现有 infrastructure-kernel 结构扩展，新增模块包括：mappers（实体映射器）、transactions（事务管理）、queries（查询构建器和规范模式转换）、events（事件存储实现）、exceptions（异常转换器）、module（NestJS模块）、factory（仓储工厂）。测试结构遵循分层测试架构约定：单元测试与源代码同目录，集成测试和端到端测试集中在test目录。

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation                  | Why Needed         | Simpler Alternative Rejected Because |
| -------------------------- | ------------------ | ------------------------------------ |
| N/A                        | N/A                | N/A                                  |
