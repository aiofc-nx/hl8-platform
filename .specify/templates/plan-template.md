# Implementation Plan: [FEATURE]

**Branch**: `[###-feature-name]` | **Date**: [DATE] | **Spec**: [link]
**Input**: Feature specification from `/specs/[###-feature-name]/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

[Extract from feature spec: primary requirement + technical approach from research]

## Technical Context

<!--
  ACTION REQUIRED: Replace the content in this section with the technical details
  for the project. The structure here is presented in advisory capacity to guide
  the iteration process.
-->

**Language/Version**: [e.g., Python 3.11, Swift 5.9, Rust 1.75 or NEEDS CLARIFICATION]  
**Primary Dependencies**: [e.g., FastAPI, UIKit, LLVM or NEEDS CLARIFICATION]  
**Storage**: [if applicable, e.g., PostgreSQL, CoreData, files or N/A]  
**Testing**: [e.g., pytest, XCTest, cargo test or NEEDS CLARIFICATION]  
**Target Platform**: [e.g., Linux server, iOS 15+, WASM or NEEDS CLARIFICATION]
**Project Type**: [single/web/mobile - determines source structure]  
**Performance Goals**: [domain-specific, e.g., 1000 req/s, 10k lines/sec, 60 fps or NEEDS CLARIFICATION]  
**Constraints**: [domain-specific, e.g., <200ms p95, <100MB memory, offline-capable or NEEDS CLARIFICATION]  
**Scale/Scope**: [domain-specific, e.g., 10k users, 1M LOC, 50 screens or NEEDS CLARIFICATION]

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

根据项目宪章 (`.specify/memory/constitution.md`)，以下检查项必须满足：

### I. 中文优先原则检查
- [ ] 所有文档和注释使用中文
- [ ] API 文档和接口说明使用中文
- [ ] 错误消息和日志使用中文

### II. 代码即文档原则检查
- [ ] 所有公共 API 有完整的 TSDoc 注释（中文）
- [ ] 注释包含 @description、@param、@returns、@throws、@example
- [ ] 业务规则在注释中详细描述

### III. 架构原则检查
- [ ] 采用 Clean Architecture 四层架构（领域层、应用层、基础设施层、接口层）
- [ ] 领域层保持纯净（无数据库/ORM 依赖）
- [ ] 使用充血模型（Rich Domain Model），禁止贫血模型
- [ ] 实体与聚合根分离（entities/ 和 aggregates/）
- [ ] 聚合根委托业务逻辑给内部实体，不直接执行业务逻辑
- [ ] CQRS 模式：命令和查询分离
- [ ] 事件溯源：状态变更通过事件记录
- [ ] 事件驱动架构：系统组件通过事件通信

### 技术栈检查
- [ ] 使用 NodeNext 模块系统
- [ ] TypeScript 配置：module: "NodeNext", moduleResolution: "NodeNext"
- [ ] package.json：type: "module", engines: { "node": ">=20" }

### 模块使用规范检查
- [ ] 优先使用 @hl8/config 配置模块（libs/infra/config）
- [ ] 优先使用 @hl8/logger 日志模块（libs/infra/logger）
- [ ] 优先使用 @hl8/cache 缓存模块（libs/infra/cache）
- [ ] 业务模块基于 libs/kernel/domain-kernel 开发领域层
- [ ] 业务模块基于 libs/kernel/application-kernel 开发应用层
- [ ] 业务模块基于 libs/kernel/infrastructure-kernel 开发基础设施层
- [ ] 业务模块基于 libs/kernel/interface-kernel 开发接口层

### 测试要求检查
- [ ] 单元测试文件命名：`{被测试文件名}.spec.ts`，与源代码同目录
- [ ] 集成测试位于 `test/integration/`
- [ ] 端到端测试位于 `test/e2e/`
- [ ] 测试覆盖率要求：核心业务逻辑 ≥ 80%，关键路径 ≥ 90%

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
# [REMOVE IF UNUSED] Option 1: Single project (DEFAULT)
src/
├── models/
├── services/
├── cli/
└── lib/

tests/
├── contract/
├── integration/
└── unit/

# [REMOVE IF UNUSED] Option 2: Web application (when "frontend" + "backend" detected)
backend/
├── src/
│   ├── models/
│   ├── services/
│   └── api/
└── tests/

frontend/
├── src/
│   ├── components/
│   ├── pages/
│   └── services/
└── tests/

# [REMOVE IF UNUSED] Option 3: Mobile + API (when "iOS/Android" detected)
api/
└── [same as backend above]

ios/ or android/
└── [platform-specific structure: feature modules, UI flows, platform tests]
```

**Structure Decision**: [Document the selected structure and reference the real
directories captured above]

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation                  | Why Needed         | Simpler Alternative Rejected Because |
| -------------------------- | ------------------ | ------------------------------------ |
| [e.g., 4th project]        | [current need]     | [why 3 projects insufficient]        |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient]  |
