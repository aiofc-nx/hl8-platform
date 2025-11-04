# Data Model: IAM业务模块

**Feature**: IAM业务模块开发  
**Date**: 2024-12-19  
**Purpose**: 定义IAM模块的数据结构和实体关系

## 核心实体

### 1. User（用户聚合根）

**聚合根**: 用户管理子领域

**领域实体**:

- `User` (聚合根)
  - `userId`: EntityId - 用户唯一标识（来自 `@hl8/domain-kernel`）
  - `email`: EmailValueObject - 邮箱地址
  - `phoneNumber`: PhoneNumberValueObject - 手机号
  - `name`: UserNameValueObject - 姓名
  - `passwordHash`: PasswordHashValueObject - 密码哈希
  - `emailVerified`: boolean - 邮箱验证状态
  - `phoneVerified`: boolean - 手机验证状态
  - `status`: UserStatus (ACTIVE/DISABLED) - 用户状态
  - `registeredAt`: Date - 注册时间
  - `version`: number - 乐观锁版本号

**内部实体**:

- `VerificationCode` - 验证码实体
  - `code`: string - 验证码
  - `type`: 'EMAIL' | 'PHONE' - 验证类型
  - `expiresAt`: Date - 过期时间
  - `verified`: boolean - 是否已验证

**业务规则**:

- 邮箱和手机号必须在平台范围内唯一
- 密码必须符合安全要求（最小8字符，包含字母和数字）
- 邮箱和手机必须都验证后才能激活账户
- 用户状态只能由认证子领域通过事件更新（如锁定）

**状态转换**:

- UNVERIFIED → VERIFIED (邮箱和手机验证完成)
- VERIFIED → ACTIVE (账户激活)
- ACTIVE → DISABLED (管理员禁用)

---

### 2. LoginSession（登录会话聚合根）

**聚合根**: 认证子领域

**领域实体**:

- `LoginSession` (聚合根)
  - `sessionId`: EntityId - 会话唯一标识（来自 `@hl8/domain-kernel`）
  - `userId`: EntityId - 用户ID（关联User，来自 `@hl8/domain-kernel`）
  - `tenantId`: TenantId | null - 当前登录的租户（来自 `@hl8/domain-kernel`）
  - `loginAt`: Date - 登录时间
  - `lastActivityAt`: Date - 最后活动时间
  - `expiresAt`: Date - 会话过期时间
  - `ipAddress`: string - 登录IP地址
  - `userAgent`: string - 用户代理
  - `status`: SessionStatus (ACTIVE/EXPIRED/REVOKED) - 会话状态
  - `failedAttempts`: number - 本次会话的失败登录次数
  - `version`: number - 乐观锁版本号

**业务规则**:

- 会话30分钟无活动自动过期
- 同一用户最多同时存在5个活跃会话
- 登录失败5次后锁定账户（通过事件通知用户管理子领域）
- 只有状态为ACTIVE的用户才能创建会话
- 租户状态为SUSPENDED或EXPIRED时，该租户用户无法登录

**状态转换**:

- ACTIVE → EXPIRED (30分钟无活动)
- ACTIVE → REVOKED (用户登出或管理员撤销)
- EXPIRED → 不可恢复

---

### 3. AuthenticationToken（认证令牌聚合根）

**聚合根**: 认证子领域

**领域实体**:

- `AuthenticationToken` (聚合根)
  - `tokenId`: EntityId - 令牌唯一标识（来自 `@hl8/domain-kernel`）
  - `userId`: EntityId - 用户ID（来自 `@hl8/domain-kernel`）
  - `sessionId`: EntityId - 关联的会话ID（来自 `@hl8/domain-kernel`）
  - `accessToken`: string - JWT访问令牌（包含用户ID、租户ID、权限列表等）
  - `refreshToken`: string - 刷新令牌
  - `issuedAt`: Date - 签发时间
  - `expiresAt`: Date - 访问令牌过期时间（15分钟）
  - `refreshExpiresAt`: Date - 刷新令牌过期时间（7天）
  - `revoked`: boolean - 是否已撤销
  - `revokedAt`: Date | null - 撤销时间
  - `version`: number - 乐观锁版本号

**业务规则**:

- Access Token 15分钟过期
- Refresh Token 7天过期
- 令牌撤销后立即失效，无法刷新
- 令牌与会话绑定，会话过期时令牌也失效
- 刷新令牌时生成新的访问令牌和刷新令牌

**状态转换**:

- ACTIVE → EXPIRED (超过过期时间)
- ACTIVE → REVOKED (用户登出或管理员撤销)
- EXPIRED → 不可恢复
- REVOKED → 不可恢复

---

### 4. UserAssignment（用户分配聚合根）

**聚合根**: 用户管理子领域

**领域实体**:

- `UserAssignment` (聚合根)
  - `assignmentId`: EntityId - 分配唯一标识（来自 `@hl8/domain-kernel`）
  - `userId`: EntityId - 用户ID（来自 `@hl8/domain-kernel`）
  - `tenantId`: TenantId - 租户ID（来自 `@hl8/domain-kernel`）
  - `assignments`: UserAssignmentItem[] - 分配项列表

**内部实体**:

- `UserTenantAssignment` - 用户到租户的分配
  - `tenantId`: TenantId（来自 `@hl8/domain-kernel`）
  - `role`: RoleReference - 角色引用
  - `assignedAt`: Date

- `UserOrganizationAssignment` - 用户到组织的分配
  - `organizationId`: OrganizationId（来自 `@hl8/domain-kernel`）
  - `role`: RoleReference
  - `assignedAt`: Date

- `UserDepartmentAssignment` - 用户到部门的分配
  - `departmentId`: DepartmentId（来自 `@hl8/domain-kernel`）
  - `role`: RoleReference
  - `assignedAt`: Date

**业务规则**:

- 用户必须在平台用户存在后才能分配
- 用户可以在多个租户中拥有不同身份
- 用户可以在多个组织中兼职，但在同一组织内只能属于一个部门
- 用户注销时自动清理所有分配关系

---

### 5. Tenant（租户聚合根）

**聚合根**: 租户管理子领域

**领域实体**:

- `Tenant` (聚合根)
  - `tenantId`: TenantId - 租户唯一标识（来自 `@hl8/domain-kernel`）
  - `code`: TenantCodeValueObject - 租户代码（3-20字符，字母数字开头/结尾，可包含连字符和下划线）
  - `name`: TenantNameValueObject - 租户名称
  - `domain`: TenantDomainValueObject - 租户域名
  - `type`: TenantType (FREE/BASIC/PROFESSIONAL/ENTERPRISE/CUSTOM) - 租户类型
  - `status`: TenantStatus (TRIAL/ACTIVE/SUSPENDED/EXPIRED/DELETED) - 租户状态
  - `isolationStrategy`: IsolationStrategy (ROW_LEVEL_SECURITY) - 隔离策略
  - `createdBy`: EntityId - 创建者用户ID（来自 `@hl8/domain-kernel`）
  - `createdAt`: Date - 创建时间
  - `trialEndsAt`: Date | null - 试用期结束时间
  - `version`: number - 乐观锁版本号

**内部实体**:

- `TenantConfiguration` - 租户配置
  - `settings`: Map<string, any> - 配置项
  - `updatedAt`: Date

**业务规则**:

- 租户代码和域名必须在平台范围内唯一
- 所有租户运营初期统一采用行级隔离策略
- 创建租户时自动创建默认组织和根部门
- 租户状态转换必须遵循既定规则
- 租户删除前必须处理所有关联数据

**状态转换**:

- TRIAL → ACTIVE (激活)
- TRIAL → EXPIRED (试用期到期)
- ACTIVE → SUSPENDED (暂停)
- SUSPENDED → ACTIVE (恢复)
- any status → DELETED (删除)
- DELETED → any status (禁止)

---

### 6. Organization（组织聚合根）

**聚合根**: 组织管理子领域

**领域实体**:

- `Organization` (聚合根)
  - `organizationId`: OrganizationId - 组织唯一标识（来自 `@hl8/domain-kernel`）
  - `tenantId`: TenantId - 所属租户（来自 `@hl8/domain-kernel`，可通过organizationId.tenantId获取）
  - `name`: OrganizationNameValueObject - 组织名称
  - `description`: string | null - 描述
  - `type`: OrganizationType - 组织类型（专业委员会、项目团队等）
  - `isDefault`: boolean - 是否默认组织
  - `createdAt`: Date - 创建时间
  - `version`: number - 乐观锁版本号

**业务规则**:

- 组织必须属于某个租户
- 组织名称在租户内必须唯一
- 组织之间是平级关系，无上下级结构
- 创建组织时自动创建根部门
- 删除组织前必须先删除或转移所有部门
- 默认组织不可删除

---

### 7. Department（部门聚合根）

**聚合根**: 部门管理子领域

**领域实体**:

- `Department` (聚合根)
  - `departmentId`: DepartmentId - 部门唯一标识（来自 `@hl8/domain-kernel`）
  - `organizationId`: OrganizationId - 所属组织（来自 `@hl8/domain-kernel`，可通过departmentId.organizationId获取）
  - `parentDepartmentId`: DepartmentId | null - 父部门ID（来自 `@hl8/domain-kernel`，可通过departmentId.parentId获取）
  - `name`: DepartmentNameValueObject - 部门名称
  - `level`: number - 层级深度（从1开始）
  - `path`: DepartmentPathValueObject - 路径（如：/1/2/3）
  - `isRoot`: boolean - 是否根部门
  - `createdAt`: Date - 创建时间
  - `version`: number - 乐观锁版本号

**业务规则**:

- 部门必须属于某个组织
- 部门不能跨组织移动
- 部门支持多级嵌套（默认最多8层）
- 部门名称在同一组织内必须唯一
- 根部门不可删除
- 部门层级查询需要性能优化（路径压缩、缓存）

---

### 8. Role（角色聚合根）

**聚合根**: 角色管理子领域

**领域实体**:

- `Role` (聚合根)
  - `roleId`: EntityId - 角色唯一标识（来自 `@hl8/domain-kernel`）
  - `tenantId`: TenantId - 所属租户（来自 `@hl8/domain-kernel`）
  - `code`: RoleCodeValueObject - 角色代码
  - `name`: RoleNameValueObject - 角色名称
  - `type`: RoleType (TENANT_ADMIN/ORG_ADMIN/DEPT_ADMIN/USER) - 角色类型
  - `permissions`: PermissionReference[] - 权限集合
  - `parentRoleId`: EntityId | null - 父角色ID（角色继承，来自 `@hl8/domain-kernel`）
  - `isTemplate`: boolean - 是否角色模板
  - `createdAt`: Date - 创建时间
  - `version`: number - 乐观锁版本号

**业务规则**:

- 角色层级权限继承规则
- 角色不可循环依赖
- 角色删除前检查分配情况
- 角色模板可以快速创建角色实例

---

### 9. Permission（权限聚合根）

**聚合根**: 权限管理子领域

**领域实体**:

- `Permission` (聚合根)
  - `permissionId`: EntityId - 权限唯一标识（来自 `@hl8/domain-kernel`）
  - `code`: PermissionCodeValueObject - 权限代码
  - `name`: PermissionNameValueObject - 权限名称
  - `category`: PermissionCategory - 权限分类
  - `dependencies`: PermissionReference[] - 依赖的权限
  - `requiredTenantTypes`: TenantType[] - 所需租户类型
  - `createdAt`: Date - 创建时间

**内部实体**:

- `PermissionAssignment` - 权限分配
  - `assignmentId`: EntityId（来自 `@hl8/domain-kernel`）
  - `targetType`: 'USER' | 'ROLE' - 分配目标类型
  - `targetId`: EntityId - 目标ID（来自 `@hl8/domain-kernel`）
  - `permissionId`: EntityId - 权限ID（来自 `@hl8/domain-kernel`）
  - `assignedAt`: Date

**业务规则**:

- 权限不能超出租户类型的功能范围
- 权限依赖关系验证
- 权限分配冲突检测和处理
- 权限变更审计追踪
- 权限验证性能优化（缓存策略）

---

## 值对象（Value Objects）

### 标识符值对象

**优先使用 `@hl8/domain-kernel` 提供的标识符值对象**：

- `EntityId` - 通用实体标识符（UUID v4）
  - 来源：`libs/kernel/domain-kernel/src/identifiers/entity-id.ts`
  - 用途：用户ID、角色ID、权限ID、会话ID、令牌ID等通用实体标识符

- `TenantId` - 租户标识符（UUID v4）
  - 来源：`libs/kernel/domain-kernel/src/identifiers/tenant-id.ts`
  - 用途：租户唯一标识符

- `OrganizationId` - 组织标识符（包含租户关联和层级关系）
  - 来源：`libs/kernel/domain-kernel/src/identifiers/organization-id.ts`
  - 用途：组织唯一标识符，包含租户关联和父组织关系

- `DepartmentId` - 部门标识符（包含组织关联和层级关系）
  - 来源：`libs/kernel/domain-kernel/src/identifiers/department-id.ts`
  - 用途：部门唯一标识符，包含组织关联和父部门关系

**注意**：所有标识符值对象都从 `@hl8/domain-kernel` 导入，不得在IAM模块中重新定义。

### 业务值对象

- `EmailValueObject` - 邮箱地址（验证格式和唯一性）
- `PhoneNumberValueObject` - 手机号（验证格式和唯一性）
- `PasswordHashValueObject` - 密码哈希（加密存储）
- `TenantCodeValueObject` - 租户代码（3-20字符，格式验证）
- `TenantNameValueObject` - 租户名称（唯一性验证）
- `TenantDomainValueObject` - 租户域名（格式和唯一性验证）
- `OrganizationNameValueObject` - 组织名称（租户内唯一）
- `DepartmentNameValueObject` - 部门名称（组织内唯一）
- `DepartmentPathValueObject` - 部门路径（层级路径表示）

---

## 实体关系

### 关系图

```
User (1) ──< (N) LoginSession ──> (N) AuthenticationToken
  │
  ├─> (N) UserAssignment ──> (N) Tenant
  │                          │
  │                          ├─> (N) Organization
  │                          │     │
  │                          │     └─> (N) Department
  │                          │
  │                          └─> (N) Role ──> (N) Permission
  │                                  │
  │                                  └─> (N) PermissionAssignment
```

### 关键关系

1. **User → LoginSession**: 一对多
   - 一个用户可以有多个活跃会话（最多5个）
   - 会话过期或撤销时自动清理

2. **LoginSession → AuthenticationToken**: 一对多
   - 一个会话可以有多个令牌（刷新时生成新令牌）
   - 会话过期时令牌也失效

3. **User → UserAssignment**: 一对多
   - 一个用户可以有多个分配（多租户）
   - 用户注销时删除所有分配

4. **Tenant → Organization**: 一对多
   - 一个租户可以有多个组织
   - 组织数量受租户类型限制

5. **Organization → Department**: 一对多（树形结构）
   - 一个组织可以有多个部门
   - 部门支持多层级嵌套（最多8层）

6. **Tenant → Role**: 一对多
   - 一个租户可以有多个角色
   - 角色归属租户

7. **Role → Permission**: 多对多（通过PermissionAssignment）
   - 一个角色可以有多个权限
   - 一个权限可以分配给多个角色

8. **User → Permission**: 多对多（通过PermissionAssignment）
   - 用户可以直接分配权限
   - 也可以通过角色获得权限

---

## CASL集成数据模型

### Ability定义

**CASL Ability结构**:

```typescript
interface CaslAbility {
  actions: string[]; // ['manage', 'read', 'create', 'update', 'delete']
  subjects: string[]; // ['Tenant', 'User', 'Organization', 'Department', 'Role', 'Permission']
  conditions: object; // { tenantId: string, organizationId?: string, departmentId?: string }
  fields?: string[]; // 字段级权限（可选）
}
```

### 规则到CASL的映射

**领域权限 → CASL规则**:

- 权限代码 (`Permission.code`) → CASL action
- 资源类型 → CASL subject
- 租户上下文 → CASL conditions
- 角色权限集合 → CASL rules数组

---

## 验证规则

### User验证

- 邮箱格式验证（RFC 5322）
- 手机号格式验证（中国手机号格式）
- 密码复杂度验证（最小8字符，包含字母和数字）
- 邮箱唯一性验证（平台范围）
- 手机号唯一性验证（平台范围）

### Tenant验证

- 租户代码格式验证（3-20字符，字母数字开头/结尾）
- 租户代码唯一性验证（平台范围）
- 租户域名格式验证（标准域名格式）
- 租户域名唯一性验证（平台范围）
- 租户名称唯一性验证（平台范围）

### Organization验证

- 组织名称唯一性验证（租户内）
- 组织数量限制验证（基于租户类型）

### Department验证

- 部门名称唯一性验证（组织内）
- 部门层级深度验证（不超过配置限制，默认8层）
- 部门路径验证（路径格式正确）

---

## 状态管理

### PlatformUser状态

- `ACTIVE`: 活跃状态
- `DISABLED`: 禁用状态
- `LOCKED`: 锁定状态（登录失败导致）

### Tenant状态

- `TRIAL`: 试用状态
- `ACTIVE`: 活跃状态
- `SUSPENDED`: 暂停状态
- `EXPIRED`: 过期状态
- `DELETED`: 已删除状态

### 状态转换规则

详见各聚合根的"状态转换"部分。

---

## 数据隔离

### 租户级隔离

- 所有聚合根包含 `tenantId`
- 查询时自动过滤 `tenantId`
- 数据库行级安全（RLS）支持

### 组织级隔离

- Organization和Department包含 `organizationId`
- 查询时根据TenantContext自动过滤

### 部门级隔离

- Department包含 `departmentId` 和层级路径
- 支持部门层级查询和权限控制

---

**文档生成时间**: 2024-12-19  
**状态**: ✅ 数据模型定义完成，可以进入API契约设计阶段
