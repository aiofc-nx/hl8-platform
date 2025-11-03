# 模块开发优先级分析

## ❓ 问题

是否应该延后IAM的开发，优先开发其他业务模块（订阅管理、组织结构管理等）？

## 📊 依赖关系分析

### IAM模块的依赖关系

#### IAM → 其他模块（查询接口调用）

| IAM需要查询的接口 | 模块 | 用途 | 是否阻塞 |
|------------------|------|------|---------|
| `getTenantQuota(tenantId)` | 订阅管理模块 | 检查用户数/组织数配额 | **是，阻塞用户邀请** |
| `checkUserQuota(tenantId)` | 订阅管理模块 | 验证是否可以添加用户 | **是，阻塞用户邀请** |
| `validateOrganizationExists(orgId)` | 组织结构模块 | 验证组织存在性 | **是，阻塞用户分配** |
| `validateDepartmentExists(deptId)` | 组织结构模块 | 验证部门存在性 | **是，阻塞用户分配** |

#### IAM → 其他模块（订阅事件）

| IAM订阅的事件 | 模块 | 用途 | 是否阻塞 |
|--------------|------|------|---------|
| `QuotaExceeded` | 订阅管理模块 | 阻止超出配额的操作 | 否（同步接口已覆盖） |
| `TenantNameApproved` | 内容审核模块 | 更新租户名称 | 否（可异步） |
| `NotificationSent` | 通知模块 | 确认通知发送 | 否（可忽略） |

---

### 其他模块 → IAM（订阅事件）

| 其他模块订阅的事件 | IAM发布 | 用途 | 是否阻塞 |
|------------------|---------|------|---------|
| `TenantCreated` | IAM | 初始化订阅计划 | **是，阻塞租户创建后的初始化** |
| `TenantCreated` | IAM | 创建默认组织和部门 | **是，阻塞租户初始化** |
| `UserInvited` | IAM | 检查用户配额 | **是，阻塞用户邀请流程** |
| `UserInvited` | IAM | 发送邀请通知 | 否（可异步） |
| `VerificationCodeRequested` | IAM | 发送验证码 | 否（IAM可先实现基础通知） |

---

## 🎯 结论：不应该延后IAM开发

### 理由1：IAM是基础模块，提供核心能力

**IAM的核心功能（独立于其他模块）**：
- 用户注册和认证（FR-001~FR-011）
- 租户创建的基础部分（FR-012~FR-016, FR-023）
- 租户状态管理（FR-024~FR-030）
- 用户分配关系管理（FR-044~FR-054）
- 权限和角色管理（子领域5和6）
- 数据隔离和安全（FR-073~FR-077）
- 审计日志生成（FR-078~FR-082）

**这些功能占IAM需求的约55%，可以独立开发**。

---

### 理由2：通过接口抽象和Mock，IAM可以先行开发

**策略：接口驱动开发（Interface-Driven Development）**

```typescript
// 1. 先定义接口契约（所有模块都可以看到）
interface ISubscriptionService {
  getTenantQuota(tenantId: TenantId): Promise<QuotaInfo>;
  checkUserQuota(tenantId: TenantId): Promise<boolean>;
}

interface IOrganizationStructureService {
  validateOrganizationExists(orgId: OrganizationId): Promise<boolean>;
  validateDepartmentExists(deptId: DepartmentId): Promise<boolean>;
}

// 2. IAM开发时使用Mock实现
class MockSubscriptionService implements ISubscriptionService {
  async getTenantQuota(tenantId: TenantId): Promise<QuotaInfo> {
    // Mock实现：返回默认配额（如用户数：无限制）
    return { userLimit: -1, organizationLimit: -1 };
  }
}

// 3. 后续替换为真实实现
class SubscriptionService implements ISubscriptionService {
  // 真实实现
}
```

**优势**：
- IAM可以独立开发和测试
- 接口契约已定义，其他模块可以并行开发
- 后续集成时只需替换Mock实现

---

### 理由3：事件驱动架构支持异步解耦

**策略：事件契约先行**

```typescript
// 1. 先定义领域事件（所有模块都可以看到）
export class TenantCreatedEvent extends DomainEvent {
  constructor(
    public readonly tenantId: TenantId,
    public readonly tenantCode: string,
    public readonly creatorId: UserId,
    // ...
  ) {
    super();
  }
}

// 2. IAM发布事件（即使没有订阅者，事件总线也会记录）
tenantCreatedAggregate.publishEvent(new TenantCreatedEvent(...));

// 3. 其他模块可以在后续实现时订阅这些事件
@EventHandler(TenantCreatedEvent)
class SubscriptionInitializationHandler {
  async handle(event: TenantCreatedEvent) {
    // 初始化订阅计划
  }
}
```

**优势**：
- IAM可以独立开发，事件发布不影响功能
- 其他模块可以后续实现事件处理器
- 支持事件重放和最终一致性

---

## 📋 推荐的开发顺序

### 阶段1：IAM核心开发（当前，P0）

**目标**：实现IAM的核心功能，建立基础能力

**开发内容**：
1. ✅ 用户注册和认证（FR-001~FR-011）
2. ✅ 租户创建的基础部分（FR-012~FR-016, FR-023）
3. ✅ 租户状态管理的基础部分（FR-024~FR-025, FR-027~FR-030）
4. ✅ 用户分配关系管理（FR-044~FR-054）
5. ✅ 权限和角色管理（子领域5和6）
6. ✅ 数据隔离和安全（FR-073~FR-077）

**Mock实现**：
- `MockSubscriptionService`：返回无限制配额
- `MockOrganizationStructureService`：总是返回true（验证通过）

**事件发布**：
- 发布所有领域事件（即使没有订阅者）

**独立测试**：
- IAM功能可以完全独立测试
- 不依赖其他业务模块

---

### 阶段2：基础设施模块（P0，可与IAM并行）

**通知基础设施模块**：
- 实现通知发送、重试、降级
- 订阅IAM的通知事件
- 替换IAM中的基础通知实现

**优先级**：P0（平台级基础设施）

---

### 阶段3：订阅管理模块（P1，IAM开发后）

**开发内容**：
- 订阅计划和租户类型管理
- 试用期管理
- 资源配额管理和监控

**集成点**：
- 订阅 `TenantCreated` 事件
- 实现 `ISubscriptionService` 接口
- 替换IAM中的Mock实现

**优先级**：P1（核心业务功能）

**开发时机**：IAM核心功能完成后，或与IAM并行（如果接口已定义）

---

### 阶段4：组织结构管理模块（P2）

**开发内容**：
- 组织和部门的CRUD管理
- 层级结构管理

**集成点**：
- 订阅 `TenantCreated` 事件
- 实现 `IOrganizationStructureService` 接口
- 替换IAM中的Mock实现

**优先级**：P2（独立业务领域）

---

### 阶段5：内容审核模块（P3）

**开发内容**：
- 租户名称审核工作流

**集成点**：
- 订阅 `TenantNameChangeRequested` 事件
- 发布审核结果事件

**优先级**：P3（可延后）

---

## ✅ 最终建议

### **不应该延后IAM开发**

**推荐策略**：

1. **IAM优先开发（P0）**
   - 实现IAM核心功能（约55%的需求）
   - 使用Mock实现其他模块的接口
   - 发布所有领域事件

2. **接口契约先行**
   - 定义所有接口契约（`ISubscriptionService`、`IOrganizationStructureService`等）
   - 定义所有领域事件（`TenantCreated`、`UserInvited`等）
   - 其他模块可以并行设计

3. **其他模块后续实现（P1~P3）**
   - 替换Mock实现
   - 实现事件处理器
   - 逐步完善功能

---

## 📐 开发架构图

```
阶段1：IAM核心开发（当前）
├─ IAM模块（完整实现核心功能）
├─ MockSubscriptionService（无限制配额）
├─ MockOrganizationStructureService（总是验证通过）
└─ 事件发布（TenantCreated、UserInvited等）

阶段2：基础设施模块（并行或后续）
└─ 通知基础设施模块（实现真实通知发送）

阶段3：订阅管理模块（后续）
├─ 实现 ISubscriptionService
├─ 订阅 TenantCreated 事件
└─ 替换Mock实现

阶段4：组织结构管理模块（后续）
├─ 实现 IOrganizationStructureService
├─ 订阅 TenantCreated 事件
└─ 替换Mock实现
```

---

## 🎯 关键决策点

### 如果延后IAM开发会怎样？

**问题**：
1. 其他模块需要IAM的事件和接口才能完整开发
2. 没有身份认证和租户隔离，其他模块无法独立运行
3. 整体交付时间不会提前，反而可能延后

### 如果IAM先行开发会怎样？

**优势**：
1. 建立平台的核心能力（身份认证、租户隔离）
2. 其他模块可以基于稳定的接口开发
3. 支持增量集成，降低风险

---

**结论**：**IAM应该优先开发，其他模块可以并行设计接口和事件契约，后续实现并集成**。

