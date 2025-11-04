# 接口内核对齐矩阵

本文档映射 `@hl8/interface-kernel` 的稳定契约到各个内核（`domain-kernel`、`application-kernel`、`infrastructure-kernel`）的实现者。

**版本**: 1.0.0  
**最后更新**: 2025-01-XX  
**对齐状态**: Phase 1（核心能力对齐）

---

## 📋 概述

| 契约类别       | interface-kernel 契约 | domain-kernel | application-kernel | infrastructure-kernel |
| -------------- | --------------------- | ------------- | ------------------ | --------------------- |
| **标识符**     | ✅ 对齐               | ✅ 实现       | ✅ 消费            | ✅ 消费               |
| **租户上下文** | ✅ 对齐               | ✅ 实现       | ✅ 消费            | ✅ 消费               |
| **仓储接口**   | ✅ 对齐               | ✅ 定义       | ⚠️ 间接使用        | ✅ 实现               |
| **CQRS 基础**  | ✅ 对齐               | -             | ✅ 定义            | -                     |
| **事件存储**   | ✅ 对齐               | ✅ 定义       | ✅ 消费            | ✅ 实现               |
| **结果类型**   | ✅ 对齐               | -             | ✅ 定义            | -                     |
| **分页/排序**  | ✅ 对齐               | ✅ 定义       | ✅ 消费            | ✅ 实现               |
| **错误模型**   | ✅ 对齐               | ✅ 定义       | ✅ 消费            | ✅ 消费               |

**图例**:

- ✅ = 已对齐/实现/消费
- ⚠️ = 间接使用（通过其他层）
- - = 不适用

---

## 🔍 详细映射

### 1. 标识符（Identifiers）

| interface-kernel | domain-kernel                           | application-kernel | infrastructure-kernel |
| ---------------- | --------------------------------------- | ------------------ | --------------------- |
| `EntityId`       | ✅ `src/identifiers/entity-id.ts`       | ✅ 类型引用        | ✅ 类型引用           |
| `TenantId`       | ✅ `src/identifiers/tenant-id.ts`       | ✅ 类型引用        | ✅ 类型引用           |
| `OrganizationId` | ✅ `src/identifiers/organization-id.ts` | ✅ 类型引用        | ✅ 类型引用           |
| `DepartmentId`   | ✅ `src/identifiers/department-id.ts`   | ✅ 类型引用        | ✅ 类型引用           |

**对齐说明**:

- `interface-kernel` 从 `domain-kernel` 重新导出这些标识符类型
- 其他内核通过 `interface-kernel` 统一引用，确保类型一致性

---

### 2. 租户上下文（Tenant Context）

| interface-kernel       | domain-kernel                      | application-kernel | infrastructure-kernel |
| ---------------------- | ---------------------------------- | ------------------ | --------------------- |
| `TenantContext`        | ✅ `src/context/tenant-context.ts` | ✅ 类型引用        | ✅ 类型引用           |
| `TenantContextOptions` | ✅ `src/context/tenant-context.ts` | ✅ 类型引用        | ✅ 类型引用           |

**对齐说明**:

- `interface-kernel` 从 `domain-kernel` 重新导出租户上下文类型
- 所有涉及租户隔离的层都需要使用此上下文

---

### 3. 仓储接口（Repository Contracts）

| interface-kernel               | domain-kernel                                                 | application-kernel  | infrastructure-kernel |
| ------------------------------ | ------------------------------------------------------------- | ------------------- | --------------------- |
| `IRepository<T>`               | ✅ `src/repositories/repository.interface.ts`                 | ⚠️ 通过用例间接使用 | ✅ 实现（MikroORM）   |
| `ITenantIsolatedRepository<T>` | ✅ `src/repositories/tenant-isolated-repository.interface.ts` | ⚠️ 通过用例间接使用 | ✅ 实现（MikroORM）   |
| `IQueryRepository<T>`          | ✅ `src/repositories/query-repository.interface.ts`           | ⚠️ 通过用例间接使用 | ✅ 实现（MikroORM）   |

**对齐说明**:

- `domain-kernel` 定义仓储接口契约
- `infrastructure-kernel` 提供具体实现（如 `MikroORMRepository`）
- `application-kernel` 通过用例（UseCase）间接使用仓储接口

---

### 4. CQRS 基础（CQRS Base Contracts）

| interface-kernel        | domain-kernel | application-kernel                          | infrastructure-kernel |
| ----------------------- | ------------- | ------------------------------------------- | --------------------- |
| `IBaseCommand<TResult>` | -             | ✅ `src/commands/base-command.interface.ts` | -                     |
| `IBaseQuery<TResult>`   | -             | ✅ `src/queries/base-query.interface.ts`    | -                     |
| `CommandOptions`        | -             | ✅ `src/commands/base-command.interface.ts` | -                     |
| `QueryOptions`          | -             | ✅ `src/queries/base-query.interface.ts`    | -                     |

**对齐说明**:

- `interface-kernel` 定义框架无关的 CQRS 基础接口
- `application-kernel` 可基于这些接口实现具体的命令/查询处理器
- `domain-kernel` 不直接涉及 CQRS（属于应用层职责）

---

### 5. 事件存储（Event Store）

| interface-kernel   | domain-kernel                                  | application-kernel | infrastructure-kernel |
| ------------------ | ---------------------------------------------- | ------------------ | --------------------- |
| `IEventStore`      | ✅ `src/events/store/event-store.interface.ts` | ✅ 消费            | ✅ 实现（MikroORM）   |
| `DomainEvent`      | ✅ `src/events/domain-event.base.ts`           | ✅ 消费            | ✅ 消费               |
| `EventStoreResult` | ✅ `src/events/store/event-store.interface.ts` | ✅ 消费            | ✅ 实现               |

**对齐说明**:

- `domain-kernel` 定义事件存储接口和领域事件基类
- `infrastructure-kernel` 提供事件存储的具体实现（如 `MikroORMEventStore`）
- `application-kernel` 通过事件总线消费事件存储接口

---

### 6. 结果类型（Result Types）

| interface-kernel    | domain-kernel                                       | application-kernel                           | infrastructure-kernel |
| ------------------- | --------------------------------------------------- | -------------------------------------------- | --------------------- |
| `ICommandResult<T>` | -                                                   | ✅ `src/results/command-result.interface.ts` | -                     |
| `IQueryResult<T>`   | -                                                   | ✅ `src/results/query-result.interface.ts`   | -                     |
| `PaginationInfo`    | ✅ `src/repositories/paginated-result.interface.ts` | ✅ 消费                                      | ✅ 实现               |

**对齐说明**:

- `interface-kernel` 定义通用的命令/查询结果接口
- `application-kernel` 可基于这些接口实现具体的结果类型
- `infrastructure-kernel` 在实现仓储时使用 `PaginationInfo`

---

### 7. 分页/排序/过滤（Pagination/Sorting/Filtering）

| interface-kernel | domain-kernel                                         | application-kernel | infrastructure-kernel |
| ---------------- | ----------------------------------------------------- | ------------------ | --------------------- |
| `Pagination`     | ✅ `src/repositories/paginated-result.interface.ts`   | ✅ 消费            | ✅ 实现               |
| `Sorting`        | ✅ `src/specifications/sorting-criteria.interface.ts` | ✅ 消费            | ✅ 实现               |
| `Filtering`      | ✅ `src/specifications/query-criteria.interface.ts`   | ✅ 消费            | ✅ 实现               |

**对齐说明**:

- `interface-kernel` 统一定义分页/排序/过滤模型
- `domain-kernel` 提供规范模式（Specification）的实现
- `infrastructure-kernel` 在查询实现中使用这些模型

---

### 8. 错误模型（Error Models）

| interface-kernel    | domain-kernel                             | application-kernel | infrastructure-kernel |
| ------------------- | ----------------------------------------- | ------------------ | --------------------- |
| `DomainException`   | ✅ `src/exceptions/domain-exception.ts`   | ✅ 消费            | ✅ 消费               |
| `BusinessException` | ✅ `src/exceptions/business-exception.ts` | ✅ 消费            | ✅ 消费               |

**对齐说明**:

- `interface-kernel` 定义通用的领域异常和业务异常基类
- 所有内核都可以抛出和捕获这些异常
- 确保异常类型的一致性和可追溯性

---

## 🔄 对齐流程

1. **识别阶段**: 分析各内核的公共契约需求
2. **定义阶段**: 在 `interface-kernel` 中定义或重新导出稳定契约
3. **对齐阶段**: 更新各内核以使用 `interface-kernel` 的契约
4. **验证阶段**: 运行对齐矩阵检查，确保一致性

---

## 📝 版本对齐规则

- **MAJOR 版本**: 所有内核的 MAJOR 版本应该与 `interface-kernel` 的 MAJOR 版本对齐
- **MINOR 版本**: 可以独立演进，但新增契约需要经过评估
- **PATCH 版本**: 可以独立修复，不影响契约对齐

---

## 🔍 检查清单

在每次发布前，确认：

- [ ] 所有映射的契约在对应内核中已实现或消费
- [ ] 类型定义与 `interface-kernel` 保持一致
- [ ] 版本号符合对齐规则
- [ ] 破坏性变更已记录在 `CHANGE-POLICY.md`

---

## 📚 相关文档

- [变更策略](CHANGE-POLICY.md) - SemVer 策略和变更报告模板
- [Quickstart](../quickstart.md) - 快速开始指南
- [Specification](../spec.md) - 功能规格说明
