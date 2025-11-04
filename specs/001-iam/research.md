# Research: IAM模块开发（引入CASL）

**Date**: 2024-12-19  
**Feature**: IAM业务模块开发  
**Branch**: `001-iam`

## 研究目标

为IAM模块开发提供技术决策依据，特别关注CASL权限管理库的集成方案，以及如何在Clean Architecture + DDD架构下实现权限管理。

---

## 1. CASL权限管理库集成

### 决策：采用CASL (@casl/ability) + nest-casl 作为权限管理方案

**Rationale（理由）**：

- **灵活的权限定义**：CASL支持基于角色（RBAC）和基于属性（ABAC）的访问控制模型，符合IAM模块的复杂权限需求
- **TypeScript原生支持**：完整的TypeScript类型定义，与项目技术栈匹配
- **轻量级高性能**：权限检查算法高效，适合企业级应用
- **NestJS深度集成**：nest-casl提供装饰器和守卫，简化权限检查实现
- **活跃的社区**：成熟稳定的开源库，有良好的文档和社区支持

**技术栈组合**：

- `@casl/ability` - CASL核心库，提供权限定义和验证能力
- `nest-casl` - NestJS集成包，提供装饰器 `@CheckPolicies` 和 `CaslGuard`

**Alternatives considered（考虑的替代方案）**：

1. **仅使用 @casl/ability**：拒绝 - 需要手动实现守卫和装饰器，增加开发成本
2. **自定义权限实现**：拒绝 - 开发成本高，容易引入安全漏洞
3. **@nestjs/passport + JWT**：拒绝 - 主要用于认证而非权限管理
4. **AccessControl库**：拒绝 - TypeScript支持不如CASL完善

### 集成架构设计

**CASL在Clean Architecture中的位置**：

- **领域层**：定义权限规则接口（不依赖CASL）
- **基础设施层**：CASL Ability工厂和规则实现（使用 @casl/ability）
- **应用层**：使用CASL进行权限验证
- **接口层**：使用 nest-casl 的装饰器和守卫进行API权限检查

**实现策略**：

```typescript
// 基础设施层：CASL集成
libs/iam/src/infrastructure/casl/
├── ability-factory.ts      # 创建Ability实例
├── rules/                  # 权限规则定义
│   ├── role-based.rules.ts # 基于角色的规则
│   └── attribute-based.rules.ts # 基于属性的规则
└── adapters/              # 适配器
    └── tenant-context-adapter.ts # TenantContext到CASL的适配
```

---

## 2. CASL与DDD领域模型的集成

### 决策：CASL作为基础设施实现，领域层保持纯净

**Rationale（理由）**：

- 遵循Clean Architecture原则：领域层不依赖外部库
- CASL作为权限验证的技术实现，属于基础设施层
- 领域层定义权限接口，基础设施层实现CASL适配

**设计模式**：

- **领域接口**：`IPermissionValidator` 定义权限验证接口
- **CASL实现**：`CaslPermissionValidator` 实现接口，使用CASL进行验证
- **依赖注入**：应用层通过接口使用权限验证，不直接依赖CASL

---

## 3. CASL规则定义策略

### 决策：采用规则工厂模式 + 缓存策略

**Rationale（理由）**：

- 权限规则可能复杂（角色继承、属性条件等）
- 规则需要基于用户、角色、租户上下文动态生成
- 缓存Ability实例提升性能

**实现方案**：

```typescript
// 规则定义
interface PermissionRule {
  action: string; // 'manage', 'read', 'create', etc.
  subject: string; // 'Tenant', 'User', 'Organization', etc.
  conditions?: object; // 条件（如租户ID、组织ID等）
}

// 规则工厂
class CaslAbilityFactory {
  createAbility(context: TenantContext): Ability {
    // 基于上下文生成规则
    // 缓存Ability实例
  }
}
```

---

## 4. 事件驱动架构与CASL

### 决策：权限变更通过领域事件通知，CASL规则动态更新

**Rationale（理由）**：

- 权限变更（角色分配、权限更新）通过领域事件发布
- CASL规则订阅事件，更新缓存的能力实例
- 支持最终一致性

**事件流**：

```
权限变更事件 (RoleAssigned, PermissionGranted)
  ↓
CASL规则更新器订阅事件
  ↓
更新Ability缓存
```

---

## 5. 多租户权限隔离

### 决策：TenantContext + CASL条件实现租户隔离

**Rationale（理由）**：

- CASL支持条件（conditions）实现属性级权限控制
- TenantContext提供租户、组织、部门上下文
- 规则中自动包含租户隔离条件

**实现示例**：

```typescript
// CASL规则自动包含租户条件
{
  action: 'read',
  subject: 'User',
  conditions: { tenantId: context.tenantId.value } // 自动添加
}
```

---

## 6. 性能优化策略

### 决策：Ability实例缓存 + 规则预编译

**Rationale（理由）**：

- 权限检查是高频操作，需要高性能
- CASL Ability实例可以缓存
- 规则可以预编译优化

**缓存策略**：

- 基于用户ID + 租户ID + 角色集合缓存Ability实例
- 缓存失效：权限变更事件触发
- 使用@hl8/cache模块实现缓存

---

## 7. 测试策略

### 决策：CASL规则单元测试 + 权限验证集成测试

**Rationale（理由）**：

- 权限规则是安全关键，需要充分测试
- 单元测试验证规则定义正确性
- 集成测试验证权限验证流程

**测试覆盖**：

- 所有CASL规则定义有单元测试
- 权限验证场景有集成测试
- 边界情况（无权限、跨租户等）有测试

---

## 8. 与现有kernel模块的集成

### 决策：基于@hl8/application-kernel的权限验证器接口扩展

**Rationale（理由）**：

- 项目已有`ITenantPermissionValidator`接口
- CASL实现可以扩展此接口
- 保持与现有架构的一致性

**集成点**：

```typescript
// 扩展现有接口
class CaslPermissionValidator implements ITenantPermissionValidator {
  // 使用CASL实现权限验证
  async validatePermission(context: TenantContext, permission: string): Promise<boolean> {
    const ability = this.abilityFactory.create(context);
    return ability.can(permission.action, permission.subject);
  }
}
```

---

## 技术决策总结

| 决策项     | 选择                             | 理由                                                    |
| ---------- | -------------------------------- | ------------------------------------------------------- |
| 权限管理库 | CASL (@casl/ability) + nest-casl | 灵活、TypeScript支持好、性能高，nest-casl简化NestJS集成 |
| CASL位置   | 基础设施层                       | 遵循Clean Architecture原则                              |
| NestJS集成 | nest-casl装饰器和守卫            | 简化API权限检查实现                                     |
| 规则定义   | 规则工厂模式                     | 支持动态规则生成和缓存                                  |
| 租户隔离   | CASL条件 + TenantContext         | 自动注入租户隔离条件                                    |
| 性能优化   | Ability实例缓存                  | 高频操作需要缓存                                        |
| 测试策略   | 单元测试 + 集成测试              | 安全关键功能需要充分测试                                |

---

## 前端菜单权限控制支持

### 决策：采用JWT Token + API查询双重方案

**Rationale（理由）**：

- JWT Token包含权限：减少API调用，前端可直接解析
- API查询权限：支持权限实时更新，不依赖token刷新
- 批量权限检查：前端可以批量验证菜单权限

**实现方案**：

1. JWT Token包含权限列表（在token生成时）
2. GET /users/me/permissions API（权限列表查询）
3. POST /permissions/check-batch API（批量权限检查）

**前端集成**：

- 使用CASL前端库（@casl/ability）进行权限检查
- 菜单权限映射在前端配置（不属于IAM模块）

## 下一步行动

1. ✅ CASL集成方案已确定
2. ✅ 前端菜单权限控制方案已确定
3. ⏳ Phase 1: 设计数据模型和API契约
4. ⏳ 实现CASL集成模块
5. ⏳ 编写权限规则定义
6. ⏳ 实现权限验证器
7. ⏳ 实现权限列表查询API

---

**研究完成时间**: 2024-12-19  
**状态**: ✅ 所有技术决策已完成，包括前端菜单权限控制支持，可以进入Phase 1设计阶段
