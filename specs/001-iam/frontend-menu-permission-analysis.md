# 前端菜单权限控制需求分析

**Date**: 2024-12-19  
**Purpose**: 分析前端菜单权限控制需求，评估当前IAM方案是否需要调整

## 前端菜单权限控制需求

### 核心需求

前端需要根据用户权限动态显示/隐藏菜单项，实现细粒度的菜单权限控制。

### 典型场景

1. **菜单项权限绑定**：每个菜单项关联一个或多个权限
2. **动态菜单渲染**：前端根据用户权限列表决定菜单显示/隐藏
3. **权限实时更新**：用户权限变更后，菜单自动更新
4. **多租户支持**：不同租户可能有不同的菜单结构

## 当前IAM方案分析

### 已有能力

1. **权限定义和管理**：权限管理子领域定义了权限
2. **权限验证**：后端API有权限验证接口 `/permissions/check`
3. **TenantContext**：包含用户权限列表（`permissions: string[]`）
4. **JWT Token**：可以包含权限信息（需要在实现时添加）

### 缺失的能力

1. **权限列表查询API**：前端需要获取当前用户的完整权限列表
2. **菜单权限映射**：菜单与权限的关联关系（可能属于前端配置或单独的菜单管理模块）
3. **权限变更通知**：前端如何感知权限变更（WebSocket或轮询）

## 方案调整建议

### 方案1：最小调整（推荐）

**在IAM模块中添加权限列表查询接口**，前端自行处理菜单权限映射。

**优点**：

- 最小侵入，IAM模块职责清晰
- 菜单管理属于前端配置，不混入IAM
- 前端灵活性高，可以自定义菜单权限映射

**实现**：

1. **添加权限列表查询API**：

   ```yaml
   GET /users/me/permissions
   # 返回当前用户的权限列表
   ```

2. **JWT Token包含权限**（可选）：
   - 在登录时生成JWT时，将权限列表放入token
   - 前端从token解析权限，无需额外API调用
   - 权限变更时需要重新登录或刷新token

3. **前端实现**：
   - 前端维护菜单-权限映射配置
   - 根据权限列表过滤菜单
   - 使用CASL前端库（可选）进行权限检查

### 方案2：扩展IAM模块（不推荐）

在IAM模块中增加菜单管理功能。

**缺点**：

- 菜单管理不属于IAM核心职责
- 增加IAM模块复杂度
- 菜单管理更适合作为独立的配置管理功能

## 推荐方案：最小调整

### 需要添加的内容

#### 1. 权限列表查询API

**位置**：`libs/iam/src/interface/http/controllers/permissions.controller.ts`

```typescript
GET /users/me/permissions
Response: {
  permissions: string[];
  tenantId: string;
  organizationId?: string;
  departmentId?: string;
}
```

#### 2. JWT Token增强（可选但推荐）

在认证子领域生成JWT时，将权限列表包含在token payload中：

```typescript
{
  userId: string;
  tenantId: string;
  organizationId?: string;
  departmentId?: string;
  permissions: string[]; // 权限列表
  roles: string[]; // 角色列表（可选）
}
```

#### 3. 权限变更事件

当用户权限变更时，发布事件通知前端（可选，通过WebSocket或SSE）。

### 前端集成方案

#### 方案A：JWT Token方式（推荐）

**优点**：

- 无需额外API调用
- 权限信息随token携带
- 实现简单

**实现**：

```typescript
// 前端从JWT解析权限
const token = getToken();
const payload = decodeJWT(token);
const permissions = payload.permissions;

// 使用CASL前端库检查权限
import { AbilityBuilder } from '@casl/ability';

const { can, build } = new AbilityBuilder();
permissions.forEach(perm => {
  const [action, subject] = perm.split(':');
  can(action, subject);
});
const ability = build();

// 菜单过滤
const visibleMenus = menus.filter(menu => 
  ability.can(menu.requiredPermission.action, menu.requiredPermission.subject)
);
```

#### 方案B：API查询方式

**优点**：

- 权限可以实时更新
- 不依赖JWT token大小限制

**实现**：

```typescript
// 前端调用API获取权限
const response = await fetch('/api/users/me/permissions');
const { permissions } = await response.json();

// 后续同方案A
```

### 菜单权限映射（前端配置）

菜单权限映射建议在前端配置，不属于IAM模块：

```typescript
// 前端菜单配置
const menuConfig = [
  {
    key: 'user-management',
    label: '用户管理',
    requiredPermission: { action: 'read', subject: 'User' }
  },
  {
    key: 'tenant-settings',
    label: '租户设置',
    requiredPermission: { action: 'manage', subject: 'Tenant' }
  }
];
```

## 修改建议

### 必须添加

1. **权限列表查询API**（GET /users/me/permissions）
2. **JWT Token包含权限**（在AuthenticationToken生成时）

### 可选添加

1. **权限变更通知机制**（WebSocket/SSE）
2. **批量权限检查API**（前端可以批量检查多个权限）

## 结论

**建议采用最小调整方案**：

- 添加权限列表查询API
- JWT Token包含权限信息
- 菜单权限映射在前端配置
- 菜单管理功能不属于IAM模块，应作为独立模块或前端配置

**IAM模块职责**：

- ✅ 定义和管理权限
- ✅ 分配权限给用户和角色
- ✅ 提供权限验证接口
- ✅ 提供权限列表查询接口（新增）
- ❌ 不管理菜单（菜单属于UI配置）

---

**文档生成时间**: 2024-12-19  
**状态**: ✅ 分析完成，建议采用最小调整方案
