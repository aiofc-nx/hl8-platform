# Feature Specification: IAM业务模块开发

**Feature Branch**: `001-iam`  
**Created**: 2024-12-19  
**Status**: Draft  
**Input**: User description: "现在开发第一个业务模块iam，你需要了解.cursor/docs/definition-of-terms.mdc和.cursor/docs/iam-business-requirements.mdc"

## Clarifications

### Session 2024-12-19

- Q: 平台管理员角色定义：平台管理员是否在IAM模块内定义，还是系统级角色？ → A: 平台管理员不在IAM模块内定义，是系统级角色；IAM只提供管理接口供平台管理员使用
- Q: 用户邀请过期处理：用户邀请是否有过期时间，如何处理过期邀请？ → A: 邀请7天后自动过期，过期前发送提醒通知
- Q: 密码安全要求：用户注册时密码的复杂度、长度和验证要求是什么？ → A: 最小长度8，必须包含字母和数字，可选特殊字符
- Q: 账户锁定策略：用户账户在多次登录失败后如何锁定和解锁？ → A: 连续5次登录失败后锁定账户，30分钟后自动解锁
- Q: 外部服务失败处理：邮件和短信服务失败时如何处理？ → A: 外部服务失败时自动重试（最多3次，指数退避），最终失败时记录日志并降级处理

## User Scenarios & Testing _(mandatory)_

### User Story 1 - 用户注册 (Priority: P1)

作为潜在客户，我希望能够注册成为用户，以便了解平台功能并申请创建租户。

**Why this priority**: 用户注册是IAM模块的基础入口，所有后续功能都依赖于用户的存在。这是用户旅程的起点，必须首先实现。

**Independent Test**: 可以通过用户填写基本信息、完成邮箱和手机验证来独立测试。完成后用户可以浏览平台功能、申请创建租户，交付了"从访客到注册用户"的完整价值。

**Acceptance Scenarios**:

1. **Given** 我是一个访问平台的访客, **When** 我填写姓名、邮箱、手机号并设置符合要求的密码（最少8字符，包含字母和数字）, **Then** 系统创建我的账户并发送验证邮件和短信
2. **Given** 我收到验证邮件和短信, **When** 我点击邮件链接并输入短信验证码, **Then** 系统验证我的身份并激活账户，我成为已验证的用户
3. **Given** 我是一个已验证的用户, **When** 我登录平台, **Then** 我可以浏览平台功能介绍和价格方案，并可以申请创建租户
4. **Given** 我尝试注册时使用了已存在的邮箱, **When** 我提交注册表单, **Then** 系统提示邮箱已被使用，建议我登录或使用其他邮箱

---

### User Story 2 - 租户创建和初始化 (Priority: P1)

作为已验证的用户，我希望能够申请创建自己的租户，以便开始使用平台的业务功能。

**Why this priority**: 租户是多租户SAAS平台的核心概念，租户创建是用户开始使用业务功能的前提。与用户注册同等重要，是P1优先级。

**Independent Test**: 可以通过已验证用户申请创建租户来独立测试。完成后系统自动创建免费租户、默认组织和根部门，用户成为租户管理员，可以立即使用租户服务，交付了"从用户到租户管理员"的完整价值。

**Acceptance Scenarios**:

1. **Given** 我是一个已验证的用户且未创建过租户, **When** 我申请创建租户并填写租户名称、代码、域名等信息, **Then** 系统验证信息唯一性后创建免费租户（TRIAL状态），我自动成为租户管理员
2. **Given** 系统创建租户时, **When** 租户创建成功, **Then** 系统自动创建默认组织（"{租户名称}-默认组织"）和根部门，初始化租户配置为免费租户类型限制
3. **Given** 我申请的租户代码已存在, **When** 我提交创建申请, **Then** 系统提示代码冲突，建议可用的替代代码
4. **Given** 我申请的租户域名已存在, **When** 我提交创建申请, **Then** 系统提示域名不可用，建议可用的替代域名
5. **Given** 我已经创建过1个租户, **When** 我尝试创建第二个租户, **Then** 系统提示已达到创建限制，提供升级选项或联系管理员申请特殊权限

---

### User Story 3 - 租户用户邀请和分配 (Priority: P2)

作为租户管理员，我希望能够邀请用户加入我的租户并分配到组织和部门，以便组建团队并开始协作。

**Why this priority**: 租户的核心价值在于团队协作，用户邀请和分配是启用协作功能的基础。虽然不一定是MVP的第一阶段，但应该在早期实现。

**Independent Test**: 可以通过租户管理员邀请用户、分配到组织和部门来独立测试。完成后用户获得租户访问权限并在指定组织部门中工作，交付了"团队组建"的完整价值。

**Acceptance Scenarios**:

1. **Given** 我是租户管理员且租户用户数未达上限, **When** 我邀请一个用户加入租户, **Then** 系统发送邀请通知给用户，用户接受后成为租户用户；邀请在7天后自动过期，过期前1天发送提醒通知
2. **Given** 我是租户管理员, **When** 我邀请用户并分配其到技术委员会的前端开发部, **Then** 用户在技术委员会中只能属于前端开发部（单一部门归属）
3. **Given** 我邀请的用户被分配到多个组织, **When** 用户加入租户, **Then** 用户可以在不同组织中拥有不同角色和权限（跨组织兼职支持）
4. **Given** 租户用户数已达到上限, **When** 我尝试邀请新用户, **Then** 系统阻止操作并提示已达到用户限制，提供升级建议

---

### User Story 4 - 组织创建和管理 (Priority: P2)

作为租户管理员，我希望能够创建和管理组织，以便更好地组织团队和管理权限。

**Why this priority**: 组织是租户内的横向管理单位，支持复杂的组织结构。虽然不是MVP核心功能，但对于企业级客户至关重要。

**Independent Test**: 可以通过租户管理员在租户类型限制内创建组织来独立测试。完成后租户拥有多个组织，每个组织可以独立管理，交付了"横向组织结构管理"的价值。

**Acceptance Scenarios**:

1. **Given** 我是租户管理员且当前组织数未达上限, **When** 我创建新组织并填写组织信息, **Then** 系统创建组织并自动创建根部门，我可以设置组织管理员
2. **Given** 我是免费租户管理员, **When** 我尝试创建第二个组织, **Then** 系统提示免费租户只能有1个组织，提供升级建议
3. **Given** 我是专业租户管理员且有9个组织, **When** 我尝试创建第10个组织, **Then** 系统允许创建（专业租户限制为10个组织）
4. **Given** 我是专业租户管理员且有10个组织, **When** 我尝试创建第11个组织, **Then** 系统阻止创建并提示已达到组织限制，建议升级到企业版

---

### User Story 5 - 部门结构管理 (Priority: P3)

作为租户管理员或组织管理员，我希望能够创建多层级部门结构，以便匹配实际的组织架构。

**Why this priority**: 部门管理支持8层结构，功能复杂但并非MVP必需。可以作为后期增强功能实现。

**Independent Test**: 可以通过管理员创建多层级部门结构来独立测试。完成后组织拥有清晰的部门层级，用户可以分配到具体部门，交付了"纵向部门结构管理"的价值。

**Acceptance Scenarios**:

1. **Given** 我是组织管理员, **When** 我在组织内创建部门层级（最多8层）, **Then** 系统允许创建并验证层级不超过配置限制
2. **Given** 我尝试创建超过8层的部门, **When** 我提交创建申请, **Then** 系统提示超过层级限制，建议优化组织结构或联系管理员申请扩展
3. **Given** 我是企业租户管理员, **When** 我创建完整的8层部门结构（总部→事业部→区域→分公司→部门→组→小组→专项团队）, **Then** 系统成功创建并支持用户分配到任意层级部门
4. **Given** 系统默认配置为8层, **When** 我创建深层级部门后执行查询操作, **Then** 系统响应时间在可接受范围内（< 300ms）

---

### User Story 6 - 租户状态管理 (Priority: P2)

作为平台管理员（系统级角色）或租户管理员，我希望能够管理租户状态（激活、暂停、恢复），以便控制租户对服务的访问。

**Why this priority**: 状态管理是运营管理的基础功能，支持暂停违规租户、恢复服务等关键运营场景。

**Independent Test**: 可以通过管理员变更租户状态来独立测试。完成后租户状态正确更新，用户访问权限相应调整，交付了"租户生命周期管理"的价值。

**Acceptance Scenarios**:

1. **Given** 租户处于试用状态（TRIAL）, **When** 试用期到期, **Then** 系统自动将租户状态转为过期（EXPIRED）
2. **Given** 我是平台管理员（通过系统级管理接口）且发现租户有违规行为, **When** 我通过IAM提供的管理接口将租户状态改为暂停（SUSPENDED）, **Then** 租户用户无法登录，但数据保留，租户只能执行查看操作
3. **Given** 租户处于暂停状态, **When** 平台管理员通过IAM管理接口将状态恢复为活跃（ACTIVE）, **Then** 租户用户恢复正常访问权限，所有功能重新启用
4. **Given** 租户处于试用状态, **When** 租户管理员主动激活租户, **Then** 系统将状态转为活跃，租户可以正常使用所有功能

---

### Edge Cases

- **租户代码唯一性冲突**：当用户申请的租户代码与已删除租户的历史代码冲突时，系统如何处理？系统应在30天内保留已删除租户的代码，30天后允许重新使用
- **并发创建冲突**：两个用户同时申请相同的租户代码时，系统如何处理？系统使用数据库唯一约束和乐观锁机制，第一个成功，第二个收到冲突提示
- **试用期到期处理**：试用期到期时用户正在使用系统，如何处理？系统在试用期到期后给予7天宽限期，宽限期内允许数据导出和升级，之后限制大部分功能
- **组织数量边界**：租户创建时默认组织计入组织数量限制吗？默认组织不计入限制，免费租户可以拥有默认组织，但不能创建额外组织
- **部门层级性能**：当部门层级很深（接近8层）时，查询性能如何保证？系统使用路径压缩和缓存策略，深层级查询响应时间应保持在< 300ms
- **用户跨组织分配冲突**：用户在同一组织内尝试分配到多个部门时，如何处理？系统强制验证：用户在同一组织内只能属于一个部门，违反规则的操作被阻止并给出明确提示
- **租户删除后用户状态**：租户被删除后，租户内的用户如何处理？用户自动离开租户，但保持用户身份，可以加入其他租户或创建新租户
- **用户邀请过期处理**：用户邀请过期后如何处理？邀请在7天后自动过期，过期后用户无法接受邀请；租户管理员可以重新发送邀请；过期前1天系统发送提醒通知给被邀请用户
- **密码不符合要求**：用户设置密码时不符合安全要求，如何处理？系统在提交时验证密码，不符合要求（长度<8或未包含字母和数字）时阻止注册并提示具体的密码要求，允许用户修改后重新提交
- **账户锁定和解锁**：用户账户因登录失败被锁定后如何处理？连续5次登录失败后账户被锁定，30分钟后自动解锁；锁定期间用户无法登录，系统记录锁定时间和原因；解锁后用户可以正常登录
- **外部服务失败**：邮件或短信服务失败时如何处理？系统自动重试最多3次（指数退避），最终失败时记录日志并执行降级处理（如短信失败时仅发送邮件，不影响用户注册流程的核心功能）

## Requirements _(mandatory)_

### Functional Requirements

#### 用户管理

- **FR-001**: System MUST allow visitors to register as users by providing basic information (name, email, phone number, password)
- **FR-002**: System MUST enforce password security requirements: minimum length 8 characters, must contain both letters and numbers, special characters optional
- **FR-003**: System MUST lock user accounts after 5 consecutive failed login attempts
- **FR-004**: System MUST automatically unlock locked accounts after 30 minutes from the time of locking
- **FR-005**: System MUST validate email addresses and phone numbers through verification codes/links
- **FR-006**: System MUST automatically retry failed email/SMS service calls (maximum 3 retries with exponential backoff) before declaring final failure
- **FR-007**: System MUST log all external service failures and implement graceful degradation (e.g., send email only if SMS fails after retries)
- **FR-008**: System MUST ensure email addresses and phone numbers are unique across all users
- **FR-009**: System MUST activate user accounts only after successful email and phone verification
- **FR-010**: System MUST allow verified users to browse platform features and pricing plans
- **FR-011**: System MUST prevent unverified users from creating tenants

#### 租户创建和管理

- **FR-012**: System MUST allow verified users to apply for tenant creation
- **FR-013**: System MUST enforce uniqueness of tenant codes across all tenants in the platform
- **FR-014**: System MUST enforce uniqueness of tenant domains across all tenants in the platform
- **FR-015**: System MUST validate tenant code format (3-20 characters, alphanumeric start/end, can contain hyphens and underscores)
- **FR-016**: System MUST validate tenant domain format (standard domain format, supports subdomains)
- **FR-017**: System MUST create new tenants with default type FREE (free tenant) and status TRIAL (trial)
- **FR-018**: System MUST automatically assign ROW_LEVEL_SECURITY isolation strategy to all tenants (operational initial strategy)
- **FR-019**: System MUST automatically create a default organization ("{tenant name}-默认组织") when creating a tenant
- **FR-020**: System MUST automatically create a root department in the default organization when creating a tenant
- **FR-021**: System MUST automatically set the tenant creator as the tenant administrator
- **FR-022**: System MUST limit each user to create 1 tenant by default (configurable)
- **FR-023**: System MUST record audit logs for all tenant creation operations including creator and reason

#### 租户状态管理

- **FR-024**: System MUST support tenant status transitions: TRIAL→ACTIVE, TRIAL→EXPIRED, ACTIVE→SUSPENDED, SUSPENDED→ACTIVE, any status→DELETED
- **FR-025**: System MUST prevent status transitions from DELETED to any other status
- **FR-026**: System MUST automatically convert TRIAL status to EXPIRED when trial period ends
- **FR-027**: System MUST allow only ACTIVE and TRIAL tenants to perform normal operations
- **FR-028**: System MUST restrict SUSPENDED tenants to view-only operations
- **FR-029**: System MUST prohibit all business operations for EXPIRED and DELETED tenants
- **FR-030**: System MUST allow only platform administrators (system-level role accessing IAM management interfaces) and tenant administrators to change tenant status

#### 组织管理

- **FR-031**: System MUST enforce organization count limits based on tenant type (FREE: 1, BASIC: 2, PROFESSIONAL: 10, ENTERPRISE: 100, CUSTOM: unlimited)
- **FR-032**: System MUST prevent deletion of the default organization in any tenant
- **FR-033**: System MUST ensure organization names are unique within a tenant
- **FR-034**: System MUST automatically create a root department when creating an organization
- **FR-035**: System MUST prevent deletion of root departments
- **FR-036**: System MUST prevent deletion of organizations that contain departments (must delete or transfer departments first)

#### 部门管理

- **FR-037**: System MUST support unlimited department creation within organizations (no quantity limit)
- **FR-038**: System MUST support multi-level department nesting with default configuration limit of 8 levels
- **FR-039**: System MUST allow platform administrators (system-level role) to adjust the department level limit through system configuration (accessed via IAM management interfaces)
- **FR-040**: System MUST enforce the configured department level limit when creating new departments
- **FR-041**: System MUST ensure department names are unique within an organization
- **FR-042**: System MUST provide friendly error messages when department level limit is exceeded
- **FR-043**: System MUST maintain department hierarchy relationships and parent-child relationships

#### 用户分配管理

- **FR-044**: System MUST allow users to belong to multiple organizations simultaneously (cross-organization assignment)
- **FR-045**: System MUST enforce that users can only belong to one department within a single organization (single department assignment per organization)
- **FR-046**: System MUST allow users to belong to different departments in different organizations
- **FR-047**: System MUST prevent users from being assigned to multiple departments within the same organization
- **FR-048**: System MUST allow tenant administrators to invite users to join tenants
- **FR-049**: System MUST enforce tenant user count limits based on tenant type (FREE: 5, BASIC: 50, PROFESSIONAL: 500, ENTERPRISE: 10,000, CUSTOM: unlimited)
- **FR-050**: System MUST send invitation notifications to users when invited to join tenants
- **FR-051**: System MUST allow users to accept or decline tenant invitations
- **FR-052**: System MUST automatically expire tenant invitations after 7 days if not accepted or declined
- **FR-053**: System MUST send reminder notifications to invited users before invitation expiration (e.g., 1 day before expiration)
- **FR-054**: System MUST automatically remove users from tenants when tenants are deleted

#### 租户配置和资源限制

- **FR-055**: System MUST enforce resource limits based on tenant type (user count, storage, organization count)
- **FR-056**: System MUST prevent resource configurations that exceed tenant type limits
- **FR-057**: System MUST send warnings when resource usage reaches 80% of limits
- **FR-058**: System MUST block operations that would exceed resource limits (e.g., adding users when at limit)
- **FR-059**: System MUST provide upgrade suggestions when resource limits are reached or exceeded
- **FR-060**: System MUST record all configuration changes with audit logs including changer and reason

#### 租户名称审核

- **FR-061**: System MUST require tenant name changes to go through an approval process
- **FR-062**: System MUST ensure tenant names are unique across all tenants in the platform
- **FR-063**: System MUST perform automatic review for tenant name changes (uniqueness, similarity, basic compliance)
- **FR-064**: System MUST support manual review for tenant name changes when automatic review flags potential issues
- **FR-065**: System MUST complete tenant name reviews within 24 hours (8 hours during business days)
- **FR-066**: System MUST reject tenant names containing illegal, prohibited, or infringing content
- **FR-067**: System MUST provide name suggestions when tenant name conflicts are detected

#### 试用期管理

- **FR-068**: System MUST set default trial period to 30 days for FREE tenants (configurable, range: 7-365 days)
- **FR-069**: System MUST calculate trial period from tenant creation time
- **FR-070**: System MUST send reminder notifications at 7 days, 3 days, and 1 day before trial expiration
- **FR-071**: System MUST provide a 7-day grace period after trial expiration for data export and upgrade
- **FR-072**: System MUST automatically convert tenant status from TRIAL to EXPIRED when trial period ends

#### 数据隔离和安全

- **FR-073**: System MUST implement ROW_LEVEL_SECURITY for all tenants during operational initial phase
- **FR-074**: System MUST ensure complete data isolation between tenants using tenant_id in all queries
- **FR-075**: System MUST implement dual verification at application layer and database level (RLS) for tenant data access
- **FR-076**: System MUST record all cross-tenant data access attempts in audit logs
- **FR-077**: System MUST encrypt sensitive data (passwords, personal information) in storage

#### 审计和合规

- **FR-078**: System MUST record audit logs for all tenant creation, modification, and deletion operations
- **FR-079**: System MUST record audit logs for all user assignment and permission changes
- **FR-080**: System MUST record audit logs for all status changes including reason and operator
- **FR-081**: System MUST maintain audit log history for compliance requirements
- **FR-082**: System MUST record all configuration changes with timestamp, operator, and reason

## Domain Structure _(subdomain design)_

### Subdomain Overview

基于Clean Architecture + DDD + CQRS + ES + EDA架构原则，IAM模块划分为**7个核心子领域**，每个子领域具有独立的聚合根、业务规则和生命周期管理。

### Subdomain 1: 用户管理子领域 (User Management Subdomain)

**职责**: 管理平台用户的完整生命周期和用户在租户/组织/部门中的分配关系

**聚合根**:

- **User（用户聚合根）**
  - 用户注册和账户管理
  - 邮箱和手机验证
  - 用户状态管理（活跃、禁用、锁定）
  - 用户偏好设置
  - 平台级别的用户信息
  - 密码管理（密码哈希存储）

- **UserAssignment（用户分配聚合根）**
  - UserTenantAssignment：用户到租户的分配
  - UserOrganizationAssignment：用户到组织的分配
  - UserDepartmentAssignment：用户到部门的分配

**核心业务规则**:

- 用户必须先注册才能分配到租户
- 用户可以在多个租户中拥有不同身份
- 用户可以在多个组织中兼职，但在同一组织内只能属于一个部门
- 用户注销时自动清理所有分配关系
- 邮箱和手机号必须在平台范围内唯一

**与其他子领域的协作**:

- 依赖租户管理子领域（验证租户存在）
- 依赖组织管理子领域（验证组织存在）
- 依赖部门管理子领域（验证部门存在）
- 被认证子领域依赖（验证用户存在和状态）
- 发布事件：UserRegistered、UserVerified、UserStatusChanged、UserDeleted

### Subdomain 2: 认证子领域 (Authentication Subdomain)

**职责**: 管理用户身份验证、登录会话和认证令牌

**聚合根**:

- **LoginSession（登录会话聚合根）**
  - 用户登录认证（密码验证）
  - 登录会话管理
  - 登录失败追踪和账户锁定
  - 会话过期管理
  - 登出操作
  - 会话并发控制（同一用户最多N个活跃会话）

- **AuthenticationToken（认证令牌聚合根）**
  - JWT令牌生成和验证
  - 令牌刷新机制
  - 令牌撤销管理
  - 访问令牌（Access Token）和刷新令牌（Refresh Token）管理

**核心业务规则**:

- 连续5次登录失败后锁定账户，30分钟后自动解锁
- 会话30分钟无活动自动过期
- Access Token 15分钟过期，Refresh Token 7天过期
- 同一用户最多同时存在5个活跃会话
- 只有状态为ACTIVE的用户才能登录
- 租户状态为SUSPENDED或EXPIRED时，该租户用户无法登录
- 令牌撤销后立即失效，无法刷新

**与其他子领域的协作**:

- 依赖用户管理子领域（验证用户存在、获取用户状态、验证密码）
- 依赖租户管理子领域（验证租户状态，决定是否可以登录）
- 发布事件：UserLoggedIn、UserLoggedOut、LoginFailed、AccountLocked、SessionExpired、TokenRefreshed、TokenRevoked

### Subdomain 3: 租户管理子领域 (Tenant Management Subdomain)

**职责**: 管理租户的完整生命周期、状态、配置和资源限制

**聚合根**:

- **Tenant（租户聚合根）**
  - 租户创建和初始化
  - 租户状态管理（TRIAL/ACTIVE/SUSPENDED/EXPIRED/DELETED）
  - 租户类型管理（FREE/BASIC/PROFESSIONAL/ENTERPRISE/CUSTOM）
  - 租户配置管理
  - 租户名称审核流程
  - 试用期管理

**核心业务规则**:

- 租户代码和域名必须在平台范围内唯一
- 所有租户运营初期统一采用行级隔离策略（ROW_LEVEL_SECURITY）
- 创建租户时自动创建默认组织和根部门
- 租户状态转换必须遵循既定规则
- 租户删除前必须处理所有关联数据

**与其他子领域的协作**:

- 发布事件：TenantCreated、TenantStatusChanged、TenantDeleted
- 订阅事件：接收用户管理子领域发布的用户注销事件，清理租户用户关系

### Subdomain 4: 组织管理子领域 (Organization Management Subdomain)

**职责**: 管理租户内组织的创建、管理和生命周期

**聚合根**:

- **Organization（组织聚合根）**
  - 组织创建和管理
  - 组织数量限制验证（基于租户类型）
  - 组织类型管理（专业委员会、项目团队等）
  - 组织配置管理

**核心业务规则**:

- 组织必须属于某个租户
- 组织名称在租户内必须唯一
- 组织之间是平级关系，无上下级结构
- 创建组织时自动创建根部门
- 删除组织前必须先删除或转移所有部门
- 默认组织不可删除

**与其他子领域的协作**:

- 依赖租户管理子领域（验证租户存在和限制）
- 通过事件与部门管理子领域协作（创建组织时创建根部门）
- 发布事件：OrganizationCreated、OrganizationDeleted

### Subdomain 5: 部门管理子领域 (Department Management Subdomain)

**职责**: 管理部门的多层级结构、层级深度控制和性能优化

**聚合根**:

- **Department（部门聚合根）**
  - 部门创建和层级管理
  - 部门层级深度控制（默认8层，可配置）
  - 部门路径管理和优化
  - 部门父-child关系维护

**核心业务规则**:

- 部门必须属于某个组织
- 部门不能跨组织移动
- 部门支持多级嵌套（默认最多8层）
- 部门名称在同一组织内必须唯一
- 根部门不可删除
- 部门层级查询需要性能优化（路径压缩、缓存）

**与其他子领域的协作**:

- 依赖组织管理子领域（验证组织存在）
- 订阅事件：OrganizationCreated（创建根部门）
- 发布事件：DepartmentCreated、DepartmentDeleted

### Subdomain 6: 角色管理子领域 (Role Management Subdomain)

**职责**: 管理角色定义、角色层级关系和角色模板

**聚合根**:

- **Role（角色聚合根）**
  - 角色定义和管理
  - 角色类型（租户管理员、组织管理员、部门管理员、普通用户等）
  - 角色层级关系和继承
  - 角色模板管理

**核心业务规则**:

- 角色层级权限继承规则
- 角色不可循环依赖
- 角色删除前检查分配情况
- 角色模板可以快速创建角色实例

**与其他子领域的协作**:

- 依赖租户管理子领域（角色归属租户）
- 与权限管理子领域协作（角色包含权限集合）
- 发布事件：RoleCreated、RoleDeleted

### Subdomain 7: 权限管理子领域 (Permission Management Subdomain)

**职责**: 管理权限定义、权限分配、权限验证和权限审计

**聚合根**:

- **Permission（权限聚合根）**
  - 权限定义（权限代码、名称、分类、依赖关系）
  - 权限模板管理
  - 权限与租户类型的关联关系

- **PermissionAssignment（权限分配聚合根）**
  - 用户权限分配
  - 角色权限分配
  - 权限分配验证和冲突检测

**核心业务规则**:

- 权限不能超出租户类型的功能范围
- 权限依赖关系验证
- 权限分配冲突检测和处理
- 权限变更审计追踪
- 权限验证性能优化（缓存策略）

**与其他子领域的协作**:

- 依赖租户管理子领域（权限范围限制）
- 依赖角色管理子领域（角色权限聚合）
- 依赖用户管理子领域（用户权限分配）
- 提供权限验证服务供其他模块使用

### Subdomain Collaboration

**事件驱动架构**:

```text
用户管理子领域
  ↓ UserRegistered, UserVerified, UserStatusChanged, UserDeleted
认证子领域
  ↓ UserLoggedIn, UserLoggedOut, LoginFailed, AccountLocked
租户管理子领域
  ↓ TenantCreated, TenantStatusChanged, TenantDeleted
组织管理子领域
  ↓ OrganizationCreated, OrganizationDeleted
部门管理子领域
  ↓ DepartmentCreated, DepartmentDeleted
角色管理子领域
  ↓ RoleCreated, RoleDeleted
权限管理子领域
  ↓ PermissionGranted, PermissionRevoked
```

**共享内核**:

- TenantId、OrganizationId、DepartmentId标识符
- TenantContext租户上下文
- 租户隔离相关的基础设施

### Key Entities _(include if feature involves data)_

- **User（用户）**: 平台注册用户，是系统中最基本的身份单位。包含：用户ID、邮箱、手机号、姓名、验证状态、注册时间、密码哈希等属性。是租户用户的前置身份。

- **Tenant（租户）**: 独立的客户单位，拥有独立的数据空间和配置环境。包含：租户ID、代码、名称、域名、类型（FREE/BASIC/PROFESSIONAL/ENTERPRISE/CUSTOM）、状态（TRIAL/ACTIVE/SUSPENDED/EXPIRED/DELETED）、隔离策略、创建时间等属性。与用户是多对多关系。

- **Tenant User（租户用户）**: 从用户分配到租户的用户身份。包含：用户ID、租户ID、角色、加入时间等属性。表示用户在租户中的身份和权限。

- **Organization（组织）**: 租户内设的横向部门管理单位。包含：组织ID、租户ID、名称、描述、类型、创建时间等属性。一个租户可以有多个组织，组织之间是平级关系。

- **Department（部门）**: 组织内设的纵向管理机构。包含：部门ID、组织ID、父部门ID、名称、层级深度、路径等属性。支持多层级嵌套结构（默认最多8层），具有明确的上下级关系。

- **User Assignment（用户分配）**: 用户与租户、组织和部门的关系映射。包含：用户ID、租户ID、组织ID、部门ID、分配时间等属性。支持用户跨组织分配，但在同一组织内只能属于一个部门。

- **Role（角色）**: 定义用户在租户、组织或部门中的角色类型。包含：角色ID、租户ID、角色代码、角色名称、角色类型、权限集合、角色层级关系等属性。支持角色继承和角色模板。

- **Permission（权限）**: 定义系统功能和数据的访问权限。包含：权限ID、权限代码、权限名称、权限分类、依赖关系、所需租户类型等属性。权限分配包括用户权限分配和角色权限分配。

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: New users can complete registration (including email and phone verification) in under 5 minutes from start to finish
- **SC-002**: Verified users can successfully create a tenant (including default organization and root department initialization) in under 30 seconds after submitting the application
- **SC-003**: Tenant administrators can invite a user to join the tenant and complete the assignment to an organization and department in under 2 minutes
- **SC-004**: System successfully prevents data leakage between tenants with zero cross-tenant data access incidents
- **SC-005**: System handles tenant creation requests with 99.9% success rate (excluding user-caused validation failures)
- **SC-006**: 95% of tenant creation requests complete successfully on the first attempt without requiring user corrections
- **SC-007**: System enforces all tenant type resource limits (user count, organization count) with 100% accuracy - no tenant exceeds allowed limits
- **SC-008**: Users receive invitation notifications within 10 seconds of being invited to a tenant
- **SC-009**: System automatically converts TRIAL tenants to EXPIRED status within 1 hour of trial period expiration with 100% accuracy
- **SC-010**: Users can query tenant information, organization structure, and department hierarchy with response times under 200ms for typical queries (1-5 levels)
- **SC-011**: System maintains complete audit logs for all tenant and user management operations with 100% coverage - no operation is unlogged
- **SC-012**: 90% of users successfully complete their primary tenant management task (create tenant, invite user, create organization) on the first attempt without errors
- **SC-013**: System successfully enforces single department assignment per organization rule with zero violations - all multi-department assignments within the same organization are prevented
- **SC-014**: System successfully supports cross-organization user assignments - users can belong to multiple organizations simultaneously with independent roles and permissions in each

## Assumptions

- Platform has existing infrastructure for email and SMS sending services
- Database system supports row-level security (RLS) mechanisms (e.g., PostgreSQL)
- System has configuration management infrastructure for tenant type limits and trial period settings
- Audit logging infrastructure exists for recording all operations
- User authentication and authorization infrastructure exists (separate from IAM module but required)
- Platform supports tenant domain resolution and routing (subdomain or path-based routing)
- System has notification infrastructure for sending invitations and reminders
- Default trial period of 30 days is acceptable as initial configuration (can be adjusted later)
- Platform administrators are system-level roles managed outside the IAM module; IAM provides management interfaces for platform administrators to access tenant management functions
- Email and SMS services support retry mechanisms; IAM module implements graceful degradation when external services fail

## Dependencies

- Email service for sending verification emails and notifications
- SMS service for sending verification codes and notifications
- Database system with row-level security support
- Configuration management system for tenant type limits and trial period settings
- Audit logging system for operation tracking
- Authentication service (may be part of IAM module or separate)
- Domain routing system for tenant-specific domain access
- Notification service for user invitations and reminders

## Out of Scope

- Payment and billing functionality (tenant upgrades and subscription management)
- Advanced permission management beyond basic role assignment (detailed RBAC/ABAC will be implemented in future phases)
- Multi-factor authentication (MFA) for users (will be implemented in future security enhancements)
- Single Sign-On (SSO) integration (will be implemented in future phases)
- Advanced audit reporting and analytics dashboards (basic audit logging is in scope, advanced reporting is out)
- Tenant data export functionality (mentioned in grace period but detailed export tools are out of scope)
- Automatic tenant backup and recovery (basic data retention is in scope, backup/recovery tools are out)
- Tenant isolation strategy other than ROW_LEVEL_SECURITY (SCHEMA_PER_TENANT, DATABASE_PER_TENANT reserved for future)
- Tenant name review automation beyond basic rule-based checking (AI-powered content review is out of scope)
- Performance optimization for deep department hierarchies beyond 8 levels (8 levels is the default limit)
