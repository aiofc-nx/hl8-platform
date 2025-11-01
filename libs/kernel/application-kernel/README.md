# Application Kernel

本库提供在 HL8 平台中实现 Clean Architecture + CQRS + 事件溯源(ES) + 事件驱动架构(EDA) 的应用层核心能力，基于 NestJS 与 `@nestjs/cqrs` 实现，集成平台级配置与日志能力（`@hl8/config`, `@hl8/logger`）。

### 安装

```bash
pnpm add @hl8/application-kernel @hl8/domain-kernel @hl8/config @hl8/logger @nestjs/cqrs
```

### 快速开始

查看 [快速入门指南](./QUICKSTART.md) 了解如何使用应用内核：

- ✅ 用例（Use Cases）基础用法
- ✅ 命令（Commands）和查询（Queries）实现
- ✅ 事件存储和事件总线使用
- ✅ 投影器（Projectors）和 Saga 模式
- ✅ 完整示例代码

或参考功能规格的 `quickstart.md`，在应用模块中引入 `ApplicationKernelModule` 并完成配置加载与校验。

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

## 评价报告

详细的项目评价报告请查看 [EVALUATION.md](./EVALUATION.md)，包含：

- 架构设计评价
- 代码质量分析
- 模块实现完整性
- 测试覆盖情况
- 改进建议和优先级

## 改进总结

基于规格文档 `specs/002-application-kernel` 的改进工作已完成，详细内容请查看：

- [改进计划](./IMPROVEMENT_PLAN.md) - 完整的改进计划
- [改进总结](./IMPROVEMENT_SUMMARY.md) - 已完成的改进工作详情

### 主要改进成果

- ✅ 所有模块导出已启用（projectors, sagas, bus, cache, monitoring）
- ✅ 所有类型错误已修复（TypeScript 严格模式通过）
- ✅ 所有测试通过（42 个测试套件，537 个测试用例）
- ✅ 代码质量提升（优化导出结构，避免命名冲突）

## API 参考

完整的 API 参考文档请查看 [API.md](./API.md)，包含：

- 所有公共类和接口的详细说明
- 方法、属性、参数和返回值
- 类型定义和枚举
- 使用示例和最佳实践

## 故障排除

遇到问题时，请查看 [故障排除指南](./TROUBLESHOOTING.md)，包含：

- 常见错误和解决方案
- 用例、命令、查询问题诊断
- 事件和 Saga 问题处理
- 配置和性能问题排查
- 集成问题解决
- 调试技巧和工具

## 性能调优

性能优化指南请查看 [性能调优指南](./PERFORMANCE.md)，包含：

- 性能目标和指标
- 性能监控和诊断
- 用例、命令、查询优化
- 事件处理和缓存策略
- 数据库和并发优化
- 性能调优最佳实践

## 迁移指南

从现有系统迁移到 application-kernel 的指南请查看 [迁移指南](./MIGRATION.md)，包含：

- 迁移概述和策略
- 用例、命令、查询迁移步骤
- 事件处理和配置迁移
- 异常处理和测试迁移
- 迁移检查清单和示例

## 安全考虑

安全最佳实践和考虑事项请查看 [安全考虑文档](./SECURITY.md)，包含：

- 输入验证和身份认证
- 数据安全和加密
- 事件和 Saga 安全
- 缓存和日志安全
- 配置安全
- 安全测试和合规性

## 部署和配置

部署和配置指南请查看 [部署和配置指南](./DEPLOYMENT.md)，包含：

- 环境配置和模块配置
- 事件存储和总线配置
- 缓存和监控配置
- 生产环境部署
- 容器化和 Kubernetes 部署
- 配置管理和健康检查

---

## 📚 文档索引

完整的文档集合：

| 文档 | 说明 |
|------|------|
| [快速入门指南](./QUICKSTART.md) | 快速上手使用应用内核 |
| [API 参考](./API.md) | 完整的 API 文档 |
| [故障排除指南](./TROUBLESHOOTING.md) | 常见问题解决方案 |
| [性能调优指南](./PERFORMANCE.md) | 性能优化最佳实践 |
| [迁移指南](./MIGRATION.md) | 从现有系统迁移 |
| [安全考虑文档](./SECURITY.md) | 安全最佳实践 |
| [部署和配置指南](./DEPLOYMENT.md) | 部署和配置详解 |
| [项目评价报告](./EVALUATION.md) | 项目评价和改进建议 |

---

## 🚀 快速链接

- [开始使用](./QUICKSTART.md) - 5分钟快速上手
- [查看 API](./API.md) - 完整 API 参考
- [解决问题](./TROUBLESHOOTING.md) - 遇到问题？看这里
- [优化性能](./PERFORMANCE.md) - 提升应用性能
