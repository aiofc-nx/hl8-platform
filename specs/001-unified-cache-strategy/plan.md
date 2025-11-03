# Implementation Plan: 统一缓存策略

**Branch**: `001-unified-cache-strategy` | **Date**: 2024-12-03 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-unified-cache-strategy/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

创建统一的基础设施层缓存库 `@hl8/cache`，提供完整的缓存抽象（ICache 接口）和多种实现（InMemoryCache、RedisCache 等），支持 TTL、标签失效、模式匹配失效、事件驱动失效等高级功能。所有 Kernel 模块（Application Kernel、Infrastructure Kernel、Domain Kernel）通过依赖注入使用该库，实现缓存的一致性和可维护性。为 Infrastructure Kernel 的 Repository 添加自动缓存支持，与应用层缓存协同工作，最大化缓存收益。

## Technical Context

**Language/Version**: TypeScript 5.9.3, Node.js >=20  
**Primary Dependencies**: 
- @nestjs/common, @nestjs/core - NestJS 框架支持
- **@hl8/config** - **必须使用**，用于类型安全的缓存配置管理（TypedConfigModule）
- **@hl8/logger** - **必须使用**，用于缓存操作日志记录（LoggerModule）
**Storage**: 内存缓存（Map），可选 Redis（未来实现）  
**Testing**: Jest 30.2.0, ts-jest 29.4.5  
**Target Platform**: Node.js 服务器环境，支持分布式部署  
**Project Type**: 库（Library）- 基础设施层模块

**重要设计原则**:
- ⚠️ **配置管理**: 必须使用 `@hl8/config` 的 `TypedConfigModule` 管理缓存配置，不得自行实现配置管理
- ⚠️ **日志记录**: 必须使用 `@hl8/logger` 的 `Logger` 记录缓存操作日志，不得使用其他日志库
- ✅ **依赖复用**: 优先使用现有基础设施库，避免重复实现  
**Performance Goals**: 
- 缓存读取操作 <1ms（p95）
- 支持 10,000 并发缓存操作
- 缓存失效操作 <100ms
- 支持至少 100 万个缓存项

**Constraints**: 
- 内存开销不超过系统总内存的 10%
- 必须支持多租户场景下的缓存隔离
- 缓存失效操作必须非阻塞
- 分布式环境下缓存一致性保证率 ≥99.9%

**Scale/Scope**: 
- 支持 100 万个不同的缓存项
- 支持多租户隔离
- 集成到 Application Kernel、Infrastructure Kernel、Domain Kernel

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

### Phase 0 检查结果

✅ **NodeNext 模块系统**: 所有代码必须使用 ES Modules，module: "NodeNext", moduleResolution: "NodeNext"

✅ **测试驱动**: 核心业务逻辑测试覆盖率 ≥80%，关键路径 ≥90%，所有公共 API 必须有测试用例

✅ **代码即文档**: 所有公共 API、类、方法、接口、枚举必须添加完整的 TSDoc 注释（中文），包含 @description、@param、@returns、@throws、@example

✅ **Clean Architecture**: 缓存库位于基础设施层（libs/infra/cache），遵循依赖倒置原则，提供接口抽象

✅ **依赖管理**: 使用 pnpm workspace 管理依赖，遵循 monorepo 规范

✅ **ESLint/Prettier**: 统一代码风格，遵循项目 ESLint 配置

✅ **基础设施复用**: **必须优先使用 `@hl8/config` 进行配置管理，必须优先使用 `@hl8/logger` 进行日志记录**，不得重复实现配置和日志功能

### Phase 1 检查结果（设计完成后）

✅ **接口设计**: ICache 接口已定义，符合依赖倒置原则

✅ **数据结构**: CacheItem、CacheConfig、CacheStats 等实体已明确，符合数据模型要求

✅ **API 契约**: contracts/cache-api.ts 已生成，定义了完整的 API 接口

✅ **模块集成**: CacheModule 设计符合 NestJS 最佳实践

✅ **多租户支持**: 缓存键设计支持租户隔离

**结论**: 所有宪法检查项均通过，可以进入 Phase 2 任务分解阶段

## Project Structure

### Documentation (this feature)

```text
specs/001-unified-cache-strategy/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
libs/infra/cache/
├── src/
│   ├── cache.interface.ts      # ICache 接口定义
│   ├── implementations/
│   │   ├── in-memory-cache.ts  # InMemoryCache 实现
│   │   └── redis-cache.ts     # RedisCache 实现（Phase 2）
│   ├── providers/
│   │   └── cache-provider.ts   # 缓存提供者工厂
│   ├── invalidation/
│   │   ├── event-driven-invalidation.ts  # 事件驱动失效
│   │   ├── tag-based-invalidation.ts    # 标签失效
│   │   └── pattern-based-invalidation.ts # 模式匹配失效
│   ├── module/
│   │   └── cache.module.ts     # NestJS 模块
│   ├── decorators/
│   │   └── cacheable.decorator.ts # @Cacheable 装饰器
│   ├── utils/
│   │   ├── cache-key-builder.ts    # 缓存键构建器
│   │   └── cache-stats-collector.ts # 统计信息收集器
│   └── index.ts                  # 导出
├── test/
│   ├── integration/
│   │   └── cache.integration.spec.ts
│   └── e2e/
│       └── multi-tenant-cache.e2e.spec.ts
├── package.json
├── tsconfig.json
├── tsconfig.build.json
├── jest.config.ts
└── eslint.config.mjs
```

**Structure Decision**: 采用库项目结构，位于 `libs/infra/cache`。源代码按功能模块组织（接口、实现、失效策略、模块集成、工具类），测试文件按类型分离（单元测试与源代码同目录，集成测试和端到端测试在 test 目录）。

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

无需填写 - 无宪法违规
