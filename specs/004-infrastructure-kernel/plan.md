# Implementation Plan: Infrastructure Kernel Core Module

**Branch**: `004-infrastructure-kernel` | **Date**: 2025-11-02 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/004-infrastructure-kernel/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

基于Clean Architecture开发hl8-platform项目的基础设施层核心模块，为domain-kernel和application-kernel提供数据库仓储实现，支持PostgreSQL和MongoDB双数据库策略，实现完整的多租户数据隔离和连接管理能力。遵循分层测试架构约定，确保代码质量和快速反馈。

## Technical Context

**Language/Version**: TypeScript 5.9.3, Node.js >=20  
**Primary Dependencies**: @nestjs/core, @nestjs/common, mikro-orm, @mikro-orm/postgresql, @mikro-orm/mongodb, @hl8/domain-kernel, @hl8/application-kernel, @hl8/config, @hl8/logger, @hl8/database  
**Storage**: PostgreSQL (关系数据库), MongoDB (文档数据库) via MikroORM  
**Testing**: Jest, @nestjs/testing, testcontainers for integration tests - 遵循分层测试架构约定  
**Target Platform**: Node.js服务器环境，支持分布式部署  
**Project Type**: 库项目 - 基础设施层核心模块  
**Performance Goals**: 数据库查询响应时间<100ms（10万条记录内），连接池可用性>99.9%，事务成功率>99.9%  
**Constraints**: 严格遵循Clean Architecture原则，使用MikroORM统一PostgreSQL和MongoDB接口，实现IRepository和ITenantIsolatedRepository接口，支持乐观锁定，遵循分层测试架构约定  
**Scale/Scope**: 支持10万条租户隔离记录的查询，1000个并发数据库连接，100%跨租户访问阻止

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

**✅ Library-First**: 基础设施层核心作为独立库开发，自包含且可独立测试  
**✅ Test-First**: 所有组件遵循TDD原则，测试覆盖率≥80%，遵循分层测试架构约定  
**✅ Integration Testing**: 重点测试与PostgreSQL、MongoDB的集成，验证仓储实现正确性  
**✅ Observability**: 集成@hl8/logger提供结构化日志和性能监控  
**✅ Versioning**: 遵循语义化版本控制，支持向后兼容  
**✅ Simplicity**: 基于标准ORM/ODM模式，避免过度设计

### Post-Design Validation

_Will be filled after Phase 1 design_

## Project Structure

### Documentation (this feature)

```text
specs/004-infrastructure-kernel/
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
│   │   │   └── tenant-filter.ts
│   │   │   └── tenant-filter.spec.ts  # 单元测试
│   │   └── index.ts
│   ├── entities/                # MikroORM 持久化实体
│   │   ├── base/
│   │   │   ├── base-entity.ts
│   │   │   └── tenant-isolated-entity.ts
│   │   └── index.ts
│   ├── mappers/                 # 实体映射器
│   │   ├── entity-mapper.ts
│   │   ├── entity-mapper.spec.ts  # 单元测试（就近原则）
│   │   └── index.ts
│   ├── config/                  # 配置模块
│   │   ├── mikro-orm.config.ts
│   │   ├── database.config.ts
│   │   └── config.spec.ts  # 单元测试
│   ├── health/                  # 健康检查
│   │   ├── database-health-checker.ts
│   │   ├── database-health-checker.spec.ts  # 单元测试
│   │   └── index.ts
│   ├── errors/                  # 异常定义
│   │   ├── repository.exception.ts
│   │   ├── repository.exception.spec.ts  # 单元测试
│   │   └── index.ts
│   └── index.ts                 # 模块导出
├── migrations/                  # MikroORM 迁移脚本
│   ├── Migration20250101000000.ts
│   └── ...
├── test/                        # 集中管理集成测试和端到端测试
│   ├── integration/
│   │   ├── repository.integration.spec.ts
│   │   ├── tenant-isolation.integration.spec.ts
│   │   ├── mikro-orm.integration.spec.ts
│   │   └── transaction.integration.spec.ts
│   └── fixtures/                # 测试数据
│       ├── test-entities.ts
│       └── test-data.ts
├── package.json
├── tsconfig.json                # 继承根配置
├── tsconfig.build.json
├── jest.config.js
└── README.md
```

**Structure Decision**: 采用库项目结构，使用MikroORM统一PostgreSQL和MongoDB接口，避免两套实现代码。仓储通过MikroORM EntityManager统一访问，租户隔离通过Filter机制实现。遵循分层测试架构约定：单元测试与源代码同目录，集成测试集中在test目录。

## Complexity Tracking

| Violation                    | Why Needed         | Simpler Alternative Rejected Because            |
| ---------------------------- | ------------------ | ----------------------------------------------- |
| 双数据库支持（PostgreSQL+MongoDB） | 混合存储策略需求  | 单数据库无法满足文档和关系型数据的灵活存储需求  |
| 租户隔离仓储实现              | 多租户安全要求     | 单一仓储无法在非租户场景和租户场景间灵活切换    |
| MikroORM 抽象层             | 统一接口需求       | 原生驱动需要两套代码，维护成本高                |

**Note**: 通过选择 MikroORM 统一 ORM，显著降低了架构复杂度，避免了双数据库两套实现的问题。
