# Changelog

所有重要的变更都会记录在此文件中。

本项目遵循 [Semantic Versioning](https://semver.org/lang/zh-CN/) 版本策略。

## 版本策略

### SemVer 规则

- **MAJOR** (X.0.0): 破坏性变更（Breaking Changes）
  - 移除公共 API
  - 改变公共接口签名
  - 改变公共类型的结构
  - **冻结期**: MAJOR 版本发布后，至少冻结 3 个月才能发布下一个 MAJOR 版本
  
- **MINOR** (0.X.0): 向后兼容的功能新增
  - 新增公共 API（接口、类型、枚举）
  - 新增可选参数
  - 废弃（Deprecated）标记（不立即移除）
  
- **PATCH** (0.0.X): 向后兼容的 Bug 修复
  - 修复缺陷
  - 优化性能（不影响公共 API）
  - 文档更新

### 废弃与移除策略

- **废弃周期**: 最少跨 **2 个 MINOR 版本**
  - 例如：在 1.2.0 中标记为 `@deprecated` 的接口，最早在 1.4.0 中移除
  - 不允许跳版移除（如 1.2.0 → 1.4.0 中间必须有 1.3.0）
  
- **迁移指南**: 每个包含废弃标记的 MINOR 版本必须提供：
  - 迁移指南（Migration Guide）
  - 替代方案说明
  - 使用示例对比

### 版本对齐策略

- **接口层 API 路径版本**: 采用 `/v{MAJOR}/...` 格式
- **与 interface-kernel SemVer 对齐**: API 路径的 MAJOR 版本必须与 `@hl8/interface-kernel` 的 MAJOR 版本一致
- **同一 MAJOR 内保证后向兼容**: 1.x.x 系列内所有版本必须保持 API 兼容

## [未发布]

### 新增

- 初始版本：核心契约对齐
  - 标识符类型（EntityId, TenantId, OrganizationId, DepartmentId）
  - 租户上下文（TenantContext）
  - 仓储接口（IRepository, ITenantIsolatedRepository, IQueryRepository）
  - CQRS 基类接口（BaseCommand, BaseQuery）
  - 事件接口（IEventStore, DomainEvent）
  - 结果类型（CommandResult, QueryResult）
  - 分页/排序/过滤模型
  - 错误模型（DomainException, BusinessException）

### 变更

- 无

### 废弃

- 无

### 移除

- 无

### 修复

- 无

### 安全

- 无

