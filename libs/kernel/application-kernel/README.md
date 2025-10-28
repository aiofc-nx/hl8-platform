## Application Kernel

本库提供在 HL8 平台中实现 Clean Architecture + CQRS + 事件溯源(ES) + 事件驱动架构(EDA) 的应用层核心能力，基于 NestJS 与 `@nestjs/cqrs` 实现，集成平台级配置与日志能力（`@hl8/config`, `@hl8/logger`）。

### 安装

```bash
pnpm add @hl8/application-kernel @hl8/domain-kernel @hl8/config @hl8/logger @nestjs/cqrs
```

### 快速开始

参考功能规格的 `quickstart.md`，在应用模块中引入 `ApplicationKernelModule` 并完成配置加载与校验。

---

### 异常处理文档（T020）

本库提供统一的应用层异常体系，所有公共 API 的异常均应为类型化异常，便于上层捕获、日志关联与契约稳定。

- 核心构件：
  - `src/exceptions/base/application-exception.base.ts` 应用层异常基类
  - `src/exceptions/base/exception-codes.ts` 异常代码常量（稳定契约）
  - 功能域异常：`use-case/`、`command/`、`query/`、`event/`、`saga/`

- 基本约定：
  - 仅抛出继承自应用层异常基类的异常；避免抛出裸 `Error`
  - 必须携带错误码、组件名、操作名与上下文，支持链路追踪
  - 与 `@hl8/logger` 集成，记录结构化错误日志，包含 `correlationId`

- 使用示例：

```ts
// 以命令校验失败为例（示意）
import { ApplicationException, ExceptionCodes } from "@hl8/application-kernel";

export class CommandValidationException extends ApplicationException {
  constructor(message: string, details: unknown) {
    super(message, ExceptionCodes.COMMAND_VALIDATION_FAILED, "Command", "validate", { details });
  }
}
```

- 最佳实践：
  - 入口层统一捕获应用层异常并转换为稳定的 HTTP/消息响应
  - 为每个公共 API 定义可预期的异常集合，并在契约测试中验证

---

### 配置文档（T028）

应用内所有可变行为通过配置驱动，采用 `@hl8/config` 提供的类型化配置与校验机制。

- 主要文件：
  - `src/config/config.interface.ts` 配置接口定义
  - `src/config/application-kernel.config.ts` 配置实现与默认值
  - 结合 `class-validator`、`class-transformer` 做强校验

- 关键配置项：
  - 事件存储：存储类型（PostgreSQL/MongoDB/Hybrid）、连接与保留策略
  - 事件总线：投递保障、重试策略、死信与监控
  - 缓存与性能监控：缓存类型、TTL、指标采集与报警

- 加载与校验：

```ts
import { TypedConfigModule } from "@hl8/config";

TypedConfigModule.forRoot({
  schema: ApplicationKernelConfig,
  load: [
    /* 文件/环境加载器 */
  ],
});
```

- 注意事项：
  - 所有配置变更需通过校验后方可生效；建议在启动阶段失败即终止
  - 支持热重载时，确保与缓存/总线/存储的幂等与重连策略

---

### 测试约定

- 单元测试与源代码同目录（就近原则）：`*.spec.ts`
- 集成测试集中在 `tests/integration/`
- 端到端测试集中在 `tests/e2e/`
- 契约测试集中在 `tests/contract/`

### 集成测试文档

本库提供全面的集成测试套件，验证应用内核在不同场景下的功能：

#### 测试分类

1. **基础集成测试** (`tests/integration/basic.integration.spec.ts`)
   - 实体ID创建和验证
   - 基础数据操作
   - 性能基准测试
   - 类型安全验证

2. **CQRS集成测试** (`tests/integration/cqrs.integration.spec.ts`)
   - 命令和查询执行
   - 命令/查询总线集成
   - 错误处理和验证
   - 性能测试

3. **事件溯源集成测试** (`tests/integration/event-sourcing.integration.spec.ts`)
   - 事件存储操作
   - 事件总线发布和处理
   - 事件重放和快照
   - 性能和并发测试

4. **Saga集成测试** (`tests/integration/saga.integration.spec.ts`)
   - Saga执行和补偿
   - 状态管理和持久化
   - 错误处理和恢复
   - 性能和并发执行

5. **API契约测试** (`tests/contract/api.contract.spec.ts`)
   - API兼容性验证
   - 类型安全验证
   - 性能特征
   - 错误处理契约

#### 运行测试

```bash
# 运行所有集成测试
pnpm test --testPathPatterns="integration|contract"

# 运行特定测试分类
pnpm test --testPathPatterns="basic.integration"
pnpm test --testPathPatterns="cqrs.integration"
pnpm test --testPathPatterns="event-sourcing.integration"
pnpm test --testPathPatterns="saga.integration"
pnpm test --testPathPatterns="api.contract"
```

#### 测试覆盖

集成测试提供全面的覆盖范围：

- ✅ 模块初始化和配置
- ✅ 实体ID创建和验证
- ✅ 基础操作和性能
- ✅ 错误处理和恢复
- ✅ 类型安全和API契约
- ✅ 性能基准和阈值

### 版本与兼容

- Node.js >= 20，TypeScript 5.9+
- 严格遵循语义化版本；公共异常码、公共类型与装饰器为稳定契约
