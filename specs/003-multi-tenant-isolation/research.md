# Research: Multi-Tenant and Multi-Level Data Isolation

**Feature**: 003-multi-tenant-isolation  
**Date**: 2024-12-20  
**Status**: Complete

## Research Scope

由于规范文档已经相当详细，且项目已有 domain-kernel 和 application-kernel 的成熟实现作为参考，本次研究主要关注：

1. 参考现有实现的最佳实践
2. 设计决策验证
3. 性能优化策略确认

## Findings

### 1. 多租户数据隔离模式

**Decision**: 采用行级安全（Row-Level Security）模式，所有数据通过租户ID字段隔离

**Rationale**:
- 与现有 PostgreSQL + MongoDB 混合存储兼容
- 性能影响可控（通过索引优化）
- 实现简单，维护成本低
- 支持灵活的查询和报告需求

**Alternatives Considered**:
- **独立数据库模式**: 每个租户独立数据库 - 拒绝原因：运维复杂度高，成本高
- **独立Schema模式**: 每个租户独立Schema - 拒绝原因：PostgreSQL Schema管理复杂，不适合大规模租户
- **行级安全模式**: 所有租户共享表和Schema，通过字段隔离 - **选择**：平衡了安全性和实现复杂度

**Reference**: 
- 项目现有的 Entity 和 AggregateRoot 实现已使用 UUID v4 标识符，可直接复用

### 2. 标识符设计

**Decision**: 复用现有 EntityId 模式，创建 TenantId、OrganizationId、DepartmentId 值对象

**Rationale**:
- 与现有代码风格一致
- 值对象模式确保类型安全
- UUID v4 提供全局唯一性
- 支持层级关系验证

**Reference**:
- 参考 `libs/kernel/domain-kernel/src/identifiers/entity-id.ts` 的实现模式

### 3. 上下文传递机制

**Decision**: 通过中间件自动提取和注入租户上下文到命令/查询对象

**Rationale**:
- 与现有 CQRS 架构无缝集成
- 开发者无需手动传递上下文
- 确保隔离机制的一致性
- 支持多种提取方式（HTTP Header、JWT Token、用户上下文）

**Reference**:
- 参考 `libs/kernel/application-kernel/src/bus/command-query-bus.impl.ts` 的中间件机制

### 4. 数据库索引策略

**Decision**: 创建联合索引 `(tenant_id)`, `(tenant_id, organization_id)`, `(tenant_id, organization_id, department_id)`

**Rationale**:
- 支持所有查询场景的索引优化
- 遵循数据库索引最佳实践（最左前缀原则）
- 满足性能目标（索引覆盖率 ≥90%）
- 查询性能可预测

**Performance Impact Analysis**:
- 索引大小：预计每个索引增加约 5-10% 存储空间
- 写入性能：联合索引对 INSERT/UPDATE 略有影响（预计 <5%）
- 查询性能：显著提升（预计查询时间减少 50-80%）

**Reference**:
- PostgreSQL 官方文档：Composite Indexes
- 项目现有索引策略（参考其他模块的数据库设计）

### 5. 权限验证模型

**Decision**: 默认严格隔离，必须显式授予权限才能跨层级访问

**Rationale**:
- 安全性优先：默认拒绝，避免数据泄露
- 符合最小权限原则
- 可审计：所有权限授予都有明确记录
- 灵活性：通过配置支持跨层级访问场景

**Alternatives Considered**:
- **默认宽松模型**: 自动包含子级数据 - 拒绝原因：安全风险高，难以控制数据泄露
- **角色基础模型**: 按角色决定默认行为 - 拒绝原因：增加了复杂性，默认严格更安全

### 6. 性能目标验证

**Decision**: 设定可测量性能目标（查询延迟增加 ≤10%，吞吐量下降 ≤5%，P95 ≤100ms）

**Rationale**:
- 基于现有系统性能基线
- 可测试和验证
- 为性能优化提供明确目标
- 符合业务需求（用户体验不受显著影响）

**Validation Plan**:
- 创建性能基准测试
- 测量无隔离查询的性能基线
- 对比添加隔离后的性能差异
- 确保所有指标在目标范围内

## Implementation Reference

### 现有代码参考

1. **值对象模式**: 
   - `libs/kernel/domain-kernel/src/identifiers/entity-id.ts`
   - `libs/kernel/domain-kernel/src/audit/audit-info.ts`

2. **实体基类模式**:
   - `libs/kernel/domain-kernel/src/entities/base/entity.base.ts`
   - `libs/kernel/domain-kernel/src/aggregates/base/aggregate-root.base.ts`

3. **中间件集成**:
   - `libs/kernel/application-kernel/src/bus/command-query-bus.impl.ts`
   - 查看 BusMiddleware 接口的使用方式

4. **命令/查询基类**:
   - `libs/kernel/application-kernel/src/commands/base/command.base.ts`
   - `libs/kernel/application-kernel/src/queries/base/query.base.ts`

## Open Questions Resolved

1. ✅ **系统级别数据**: 已明确 - 禁止系统级别数据，平台数据使用特殊系统租户
2. ✅ **查询行为**: 已明确 - 严格匹配原则
3. ✅ **错误处理**: 已明确 - 立即拒绝并返回 403
4. ✅ **性能目标**: 已明确 - 可测量指标已定义
5. ✅ **权限模型**: 已明确 - 默认严格隔离

## Conclusion

所有关键技术决策已基于现有架构和最佳实践确定。实施将遵循现有代码模式和项目规范，确保一致性和可维护性。

**Ready for Phase 1**: ✅ All research complete, proceed to design and contracts.

