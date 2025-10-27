# Implementation Plan: Domain Kernel Core Module

**Branch**: `001-domain-kernel` | **Date**: 2024-12-19 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-domain-kernel/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

基于Clean Architecture的领域核心模块，提供值对象、实体（充血模型+UUID+审计）、聚合根（实体分离原则）等核心领域层组件，统一各业务模块的开发模式。采用TypeScript实现，支持事件存储模式、版本号乐观锁、业务异常+系统异常分类等特性。

## Technical Context

**Language/Version**: TypeScript 5.9.3, Node.js >=20  
**Primary Dependencies**: @hl8/config, class-validator, class-transformer, uuid  
**Storage**: 事件存储模式（按时间顺序持久化所有领域事件）  
**Testing**: Jest, 单元测试、集成测试、端到端测试  
**Target Platform**: Node.js 运行时环境  
**Project Type**: 库项目（domain-kernel包）  
**Performance Goals**: UUID生成成功率99.99%，审计记录成功率99.99%，值对象比较<1ms，聚合根协调<5ms  
**Constraints**: 实体与聚合根必须分离，充血模型模式，UUID v4标识符，版本号乐观锁  
**Scale/Scope**: 支持1000个并发领域事件，10000个不同领域事件类型，100%聚合实现分离模式

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

### ✅ Architecture Compliance

- **Clean Architecture**: 领域核心模块遵循Clean Architecture原则，领域层独立于基础设施层
- **充血模型**: 实体采用充血模型模式，承载业务逻辑和状态管理
- **实体分离原则**: 严格遵循实体与聚合根分离原则，确保架构一致性

### ✅ Technical Standards

- **TypeScript**: 使用TypeScript 5.9.3，确保类型安全
- **测试驱动**: 采用TDD模式，单元测试、集成测试、端到端测试全覆盖
- **代码质量**: 遵循ESLint配置，TSDoc注释规范

### ✅ Performance Requirements

- **UUID生成**: 99.99%成功率，确保全局唯一性
- **审计记录**: 99.99%成功率，确保数据可追溯性
- **响应时间**: 值对象比较<1ms，聚合根协调<5ms

### ✅ Security & Compliance

- **数据完整性**: 审计信息具备防篡改能力
- **并发控制**: 版本号乐观锁，冲突时抛出异常
- **异常处理**: 业务异常+系统异常分类处理

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
libs/kernel/domain-kernel/
├── src/
│   ├── value-objects/
│   │   ├── base/
│   │   │   ├── value-object.base.ts
│   │   │   └── value-object.base.spec.ts
│   │   └── index.ts
│   ├── entities/
│   │   ├── base/
│   │   │   ├── entity.base.ts
│   │   │   ├── entity.base.spec.ts
│   │   │   └── entity-lifecycle.enum.ts
│   │   ├── internal/
│   │   │   ├── internal-entity.base.ts
│   │   │   └── internal-entity.base.spec.ts
│   │   └── index.ts
│   ├── aggregates/
│   │   ├── base/
│   │   │   ├── aggregate-root.base.ts
│   │   │   └── aggregate-root.base.spec.ts
│   │   └── index.ts
│   ├── events/
│   │   ├── base/
│   │   │   ├── domain-event.base.ts
│   │   │   └── domain-event.base.spec.ts
│   │   ├── store/
│   │   │   ├── event-store.interface.ts
│   │   │   └── event-store.interface.spec.ts
│   │   └── index.ts
│   ├── services/
│   │   ├── base/
│   │   │   ├── domain-service.base.ts
│   │   │   └── domain-service.base.spec.ts
│   │   └── index.ts
│   ├── exceptions/
│   │   ├── base/
│   │   │   ├── domain-exception.base.ts
│   │   │   ├── business-exception.ts
│   │   │   ├── system-exception.ts
│   │   │   └── domain-exception.base.spec.ts
│   │   └── index.ts
│   ├── audit/
│   │   ├── audit-info.ts
│   │   ├── audit-trail.ts
│   │   ├── audit-info.spec.ts
│   │   └── audit-trail.spec.ts
│   ├── identifiers/
│   │   ├── entity-id.ts
│   │   ├── uuid-generator.ts
│   │   ├── entity-id.spec.ts
│   │   └── uuid-generator.spec.ts
│   ├── validation/
│   │   ├── separation-validator.ts
│   │   └── separation-validator.spec.ts
│   └── index.ts
├── test/
│   ├── integration/
│   │   ├── domain-kernel.integration.spec.ts
│   │   └── event-store.integration.spec.ts
│   └── e2e/
│       └── domain-kernel.e2e.spec.ts
├── package.json
├── tsconfig.json
└── jest.config.js
```

**Structure Decision**: 采用库项目结构，按功能模块组织代码。每个模块包含base类、具体实现、测试文件。遵循Clean Architecture原则，领域层独立于基础设施层。测试采用分层架构：单元测试与源代码同目录，集成测试和端到端测试集中管理。

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation                  | Why Needed         | Simpler Alternative Rejected Because |
| -------------------------- | ------------------ | ------------------------------------ |
| [e.g., 4th project]        | [current need]     | [why 3 projects insufficient]        |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient]  |
