# Implementation Plan: [FEATURE]

**Branch**: `[###-feature-name]` | **Date**: [DATE] | **Spec**: [link]
**Input**: Feature specification from `/specs/[###-feature-name]/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

统一三内核（domain/application/infrastructure）的公共契约，创建 `@hl8/interface-kernel` 输出的稳定接口层（标识符、租户上下文、仓储接口、CQRS基类、事件接口、结果、分页/排序/过滤与错误模型）。按 SemVer 管理版本，接口层（外部 API）采用 `/v{MAJOR}` 路径与合约 MAJOR 对齐，破坏性变更仅随 MAJOR 发布；废弃跨 ≥2 MINOR，不允许跳版移除。优先通过组织自研 `libs/infra/*` 适配第三方。

## Technical Context

**Language/Version**: TypeScript 5.9.3 (ES2022, NodeNext)  
**Primary Dependencies**: `@hl8/domain-kernel`, `@hl8/application-kernel`（类型/契约引用）；不直接依赖第三方实现；外部适配优先 `libs/infra/*`  
**Storage**: N/A（契约层不落地存储）  
**Testing**: Jest 30，覆盖率：公共API≥90%，关键路径≥95%  
**Target Platform**: Node.js >= 20（Linux）  
**Project Type**: Monorepo library (`libs/kernel/interface-kernel`)  
**Performance Goals**: 合约解析/编译稳定；不定义运行时SLO（由使用方承担）  
**Constraints**: 严格SemVer；MAJOR冻结≥3个月；Deprecated跨≥2 MINOR；禁止CommonJS；中文TSDoc齐备  
**Scale/Scope**: 初始对齐核心能力子集；逐步迭代扩展

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- Library-first: 符合（输出契约库，独立可测）
- Test-first: 规划覆盖率门槛（公共API≥90%，关键路径≥95%）
- Versioning & Breaking Changes: 严格SemVer + 冻结期 + 废弃策略已定义
- Simplicity: 契约最小可行子集，避免实现细节外泄

Status: PASS

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
