# Tasks: IAM业务模块开发（引入CASL）

**Feature**: IAM业务模块开发  
**Branch**: `001-iam`  
**Generated**: 2024-12-19  
**Total Tasks**: 159

## Summary

本功能实现IAM（身份与访问管理）业务模块，采用Clean Architecture + DDD + CQRS + ES + EDA架构，引入CASL权限管理库。模块划分为7个子领域：用户管理、认证、租户管理、组织管理、部门管理、角色管理、权限管理。实现多租户SAAS平台的核心身份认证、访问控制和权限管理功能。

## Dependencies

### User Story Completion Order

1. **Phase 1**: Setup (项目初始化和基础设施)
2. **Phase 2**: Foundational (阻塞性前置任务 - 所有用户故事的基础)
3. **Phase 3**: User Story 1 - 用户注册 (P1)
4. **Phase 4**: User Story 2 - 租户创建和初始化 (P1)
5. **Phase 5**: User Story 3 - 租户用户邀请和分配 (P2)
6. **Phase 6**: User Story 4 - 组织创建和管理 (P2)
7. **Phase 7**: User Story 6 - 租户状态管理 (P2)
8. **Phase 8**: User Story 5 - 部门结构管理 (P3)
9. **Phase 9**: Polish & Cross-Cutting Concerns (完善和跨领域关注点)

### Parallel Execution Opportunities

- **Phase 1**: 项目结构、配置文件、依赖安装可以并行
- **Phase 2**: 值对象、事件、共享内核可以并行开发
- **Phase 3**: 用户管理子领域的值对象、实体、聚合根可以并行开发
- **Phase 4**: 租户管理子领域的值对象、实体、聚合根可以并行开发
- **Phase 5**: 用户分配相关的命令处理器可以并行开发
- **Phase 6**: 组织管理子领域的值对象、实体、聚合根可以并行开发
- **Phase 8**: 部门管理子领域的值对象、实体、聚合根可以并行开发

## Phase 1: Setup

**Goal**: 初始化项目结构和配置

### Independent Test Criteria

- 项目结构符合实施计划
- TypeScript配置正确（NodeNext模块系统）
- 依赖正确安装
- 构建系统正常工作
- ESLint配置正确

### Tasks

- [X] T001 Create project directory structure in libs/iam/
- [X] T002 Create domain layer directories (7 subdomains: user, authentication, tenant, organization, department, role, permission)
- [X] T003 Create application layer directories (commands, queries, handlers, services, projectors)
- [X] T004 Create infrastructure layer directories (persistence, event-store, casl, external)
- [X] T005 Create interface layer directories (http/controllers, http/dto, http/guards, events)
- [X] T006 Initialize package.json in libs/iam/ with type: "module" and engines: { "node": ">=20" }
- [X] T007 Configure tsconfig.json extending root config with NodeNext module system
- [X] T008 Setup Jest configuration for testing in libs/iam/jest.config.ts
- [X] T009 Install dependencies: @hl8/domain-kernel, @hl8/application-kernel, @hl8/infrastructure-kernel, @hl8/interface-kernel
- [X] T010 Install dependencies: @hl8/config, @hl8/logger, @hl8/cache
- [X] T011 Install dependencies: @casl/ability, nest-casl, @nestjs/common, @nestjs/cqrs
- [X] T012 Install dependencies: class-validator, class-transformer
- [X] T013 Install dev dependencies: @jest/globals, @types/node, typescript, jest, ts-jest
- [X] T014 Create src/index.ts as main entry point in libs/iam/src/index.ts
- [X] T015 Setup ESLint configuration extending root rules in libs/iam/eslint.config.mjs
- [X] T016 Create .gitignore for TypeScript project
- [X] T017 Verify build system works with pnpm run build

## Phase 2: Foundational

**Goal**: 实现阻塞性前置任务，为所有用户故事提供基础

### Independent Test Criteria

- 共享值对象可用
- 领域事件基类可用
- 共享内核可用
- 事件总线可用

### Tasks

- [X] T018 [P] Create EmailValueObject in libs/iam/src/domain/user/value-objects/email.value-object.ts
- [X] T019 [P] Create PhoneNumberValueObject in libs/iam/src/domain/user/value-objects/phone-number.value-object.ts
- [X] T020 [P] Create PasswordHashValueObject in libs/iam/src/domain/user/value-objects/password-hash.value-object.ts
- [X] T021 [P] Create TenantCodeValueObject in libs/iam/src/domain/tenant/value-objects/tenant-code.value-object.ts
- [X] T022 [P] Create TenantNameValueObject in libs/iam/src/domain/tenant/value-objects/tenant-name.value-object.ts
- [X] T023 [P] Create TenantDomainValueObject in libs/iam/src/domain/tenant/value-objects/tenant-domain.value-object.ts
- [X] T024 [P] Create UserRegisteredEvent in libs/iam/src/domain/user/events/user-registered.event.ts
- [X] T025 [P] Create UserVerifiedEvent in libs/iam/src/domain/user/events/user-verified.event.ts
- [X] T026 [P] Create UserStatusChangedEvent in libs/iam/src/domain/user/events/user-status-changed.event.ts
- [X] T027 [P] Create UserLoggedInEvent in libs/iam/src/domain/authentication/events/user-logged-in.event.ts
- [X] T028 [P] Create LoginFailedEvent in libs/iam/src/domain/authentication/events/login-failed.event.ts
- [X] T029 [P] Create AccountLockedEvent in libs/iam/src/domain/authentication/events/account-locked.event.ts
- [X] T030 [P] Create TenantCreatedEvent in libs/iam/src/domain/tenant/events/tenant-created.event.ts
- [X] T031 [P] Create TenantStatusChangedEvent in libs/iam/src/domain/tenant/events/tenant-status-changed.event.ts
- [ ] T032 [P] Setup event bus infrastructure in libs/iam/src/infrastructure/event-store/

## Phase 3: User Story 1 - 用户注册 [US1]

**Goal**: 实现用户注册功能，包括邮箱和手机验证

### Independent Test Criteria

- 用户可以填写基本信息注册
- 系统发送验证邮件和短信
- 用户可以通过验证码激活账户
- 邮箱和手机号唯一性验证
- 密码安全要求验证

### Tasks

#### 领域层 - 用户管理子领域

- [X] T033 [P] [US1] Create UserNameValueObject in libs/iam/src/domain/user/value-objects/user-name.value-object.ts
- [X] T034 [P] [US1] Create VerificationCode entity in libs/iam/src/domain/user/entities/verification-code.entity.ts
- [X] T035 [US1] Create User entity in libs/iam/src/domain/user/entities/user.entity.ts
- [X] T036 [US1] Create User aggregate root in libs/iam/src/domain/user/aggregates/user.aggregate.ts
- [X] T037 [US1] Create UserRepository interface in libs/iam/src/domain/user/repositories/user.repository.interface.ts
- [X] T038 [US1] Create UserRegisteredEvent implementation
- [X] T039 [US1] Create UserVerifiedEvent implementation

#### 应用层 - 用户注册用例

- [X] T040 [US1] Create RegisterUserCommand in libs/iam/src/application/commands/register-user.command.ts
- [X] T041 [US1] Create VerifyEmailCommand in libs/iam/src/application/commands/verify-email.command.ts
- [X] T042 [US1] Create VerifyPhoneCommand in libs/iam/src/application/commands/verify-phone.command.ts
- [X] T043 [US1] Create RegisterUserHandler in libs/iam/src/application/handlers/register-user.handler.ts
- [X] T044 [US1] Create VerifyEmailHandler in libs/iam/src/application/handlers/verify-email.handler.ts
- [X] T045 [US1] Create VerifyPhoneHandler in libs/iam/src/application/handlers/verify-phone.handler.ts

#### 基础设施层 - 用户仓储和外部服务

- [X] T046 [P] [US1] Create User persistence entity in libs/iam/src/infrastructure/persistence/entities/user.persistence-entity.ts
- [X] T047 [P] [US1] Create UserRepository implementation in libs/iam/src/infrastructure/persistence/repositories/user.repository.ts
- [X] T048 [P] [US1] Create UserMapper in libs/iam/src/infrastructure/persistence/mappers/user.mapper.ts
- [X] T049 [P] [US1] Create EmailService interface in libs/iam/src/infrastructure/external/email/email.service.interface.ts
- [X] T050 [P] [US1] Create EmailService implementation in libs/iam/src/infrastructure/external/email/email.service.ts
- [X] T051 [P] [US1] Create SmsService interface in libs/iam/src/infrastructure/external/sms/sms.service.interface.ts
- [X] T052 [P] [US1] Create SmsService implementation in libs/iam/src/infrastructure/external/sms/sms.service.ts
- [X] T053 [US1] Implement retry mechanism with exponential backoff in external services

#### 接口层 - REST API

- [X] T054 [US1] Create RegisterUserDto in libs/iam/src/interface/http/dto/register-user.dto.ts
- [X] T055 [US1] Create VerifyEmailDto in libs/iam/src/interface/http/dto/verify-email.dto.ts
- [X] T056 [US1] Create VerifyPhoneDto in libs/iam/src/interface/http/dto/verify-phone.dto.ts
- [X] T057 [US1] Create UsersController in libs/iam/src/interface/http/controllers/users.controller.ts
- [X] T058 [US1] Implement POST /users/register endpoint
- [X] T059 [US1] Implement POST /users/verify-email endpoint
- [X] T060 [US1] Implement POST /users/verify-phone endpoint

## Phase 4: User Story 2 - 租户创建和初始化 [US2]

**Goal**: 实现租户创建功能，自动创建默认组织和根部门

### Independent Test Criteria

- 已验证用户可以申请创建租户
- 系统验证租户代码和域名唯一性
- 系统自动创建免费租户（TRIAL状态）
- 系统自动创建默认组织和根部门
- 用户自动成为租户管理员

### Tasks

#### 领域层 - 租户管理子领域

- [X] T061 [P] [US2] Create TenantType enum in libs/iam/src/domain/tenant/value-objects/tenant-type.enum.ts
- [X] T062 [P] [US2] Create TenantStatus enum in libs/iam/src/domain/tenant/value-objects/tenant-status.enum.ts
- [X] T063 [US2] Create Tenant entity in libs/iam/src/domain/tenant/entities/tenant.entity.ts (Tenant是聚合根，已创建TenantConfiguration entity)
- [X] T064 [US2] Create TenantConfiguration entity in libs/iam/src/domain/tenant/entities/tenant-configuration.entity.ts
- [X] T065 [US2] Create Tenant aggregate root in libs/iam/src/domain/tenant/aggregates/tenant.aggregate.ts
- [X] T066 [US2] Create TenantRepository interface in libs/iam/src/domain/tenant/repositories/tenant.repository.interface.ts
- [X] T067 [US2] Create TenantCreatedEvent implementation

#### 领域层 - 组织管理子领域（用于默认组织）

- [X] T068 [P] [US2] Create OrganizationNameValueObject in libs/iam/src/domain/organization/value-objects/organization-name.value-object.ts
- [X] T069 [US2] Create Organization entity in libs/iam/src/domain/organization/entities/organization.entity.ts (Organization是聚合根，无需单独实体)
- [X] T070 [US2] Create Organization aggregate root in libs/iam/src/domain/organization/aggregates/organization.aggregate.ts
- [X] T071 [US2] Create OrganizationRepository interface in libs/iam/src/domain/organization/repositories/organization.repository.interface.ts
- [X] T072 [US2] Create OrganizationCreatedEvent in libs/iam/src/domain/organization/events/organization-created.event.ts

#### 领域层 - 部门管理子领域（用于根部门）

- [X] T073 [P] [US2] Create DepartmentNameValueObject in libs/iam/src/domain/department/value-objects/department-name.value-object.ts
- [X] T074 [US2] Create Department entity in libs/iam/src/domain/department/entities/department.entity.ts (Department是聚合根，无需单独实体)
- [X] T075 [US2] Create Department aggregate root in libs/iam/src/domain/department/aggregates/department.aggregate.ts
- [X] T076 [US2] Create DepartmentRepository interface in libs/iam/src/domain/department/repositories/department.repository.interface.ts
- [X] T077 [US2] Create DepartmentCreatedEvent in libs/iam/src/domain/department/events/department-created.event.ts

#### 应用层 - 租户创建用例

- [ ] T078 [US2] Create CreateTenantCommand in libs/iam/src/application/commands/create-tenant.command.ts
- [ ] T079 [US2] Create CreateTenantHandler in libs/iam/src/application/handlers/create-tenant.handler.ts
- [ ] T080 [US2] Create TenantCreationService in libs/iam/src/application/services/tenant-creation.service.ts
- [ ] T081 [US2] Create event projector for default organization creation
- [ ] T082 [US2] Create event projector for root department creation

#### 基础设施层 - 租户仓储

- [ ] T083 [P] [US2] Create Tenant persistence entity in libs/iam/src/infrastructure/persistence/entities/tenant.persistence-entity.ts
- [ ] T084 [P] [US2] Create TenantRepository implementation in libs/iam/src/infrastructure/persistence/repositories/tenant.repository.ts
- [ ] T085 [P] [US2] Create TenantMapper in libs/iam/src/infrastructure/persistence/mappers/tenant.mapper.ts
- [ ] T086 [P] [US2] Create Organization persistence entity in libs/iam/src/infrastructure/persistence/entities/organization.persistence-entity.ts
- [ ] T087 [P] [US2] Create OrganizationRepository implementation in libs/iam/src/infrastructure/persistence/repositories/organization.repository.ts
- [ ] T088 [P] [US2] Create OrganizationMapper in libs/iam/src/infrastructure/persistence/mappers/organization.mapper.ts
- [ ] T089 [P] [US2] Create Department persistence entity in libs/iam/src/infrastructure/persistence/entities/department.persistence-entity.ts
- [ ] T090 [P] [US2] Create DepartmentRepository implementation in libs/iam/src/infrastructure/persistence/repositories/department.repository.ts
- [ ] T091 [P] [US2] Create DepartmentMapper in libs/iam/src/infrastructure/persistence/mappers/department.mapper.ts

#### 接口层 - REST API

- [ ] T092 [US2] Create CreateTenantDto in libs/iam/src/interface/http/dto/create-tenant.dto.ts
- [ ] T093 [US2] Create TenantsController in libs/iam/src/interface/http/controllers/tenants.controller.ts
- [ ] T094 [US2] Implement POST /tenants endpoint

## Phase 5: User Story 3 - 租户用户邀请和分配 [US3]

**Goal**: 实现用户邀请和分配到组织/部门的功能

### Independent Test Criteria

- 租户管理员可以邀请用户加入租户
- 系统发送邀请通知
- 用户可以接受邀请
- 用户可以被分配到组织和部门
- 同一组织内用户只能属于一个部门
- 邀请7天后自动过期

### Tasks

#### 领域层 - 用户分配子领域

- [ ] T095 [US3] Create UserAssignment entity in libs/iam/src/domain/user/entities/user-assignment.entity.ts
- [ ] T096 [US3] Create UserTenantAssignment entity in libs/iam/src/domain/user/entities/user-tenant-assignment.entity.ts
- [ ] T097 [US3] Create UserOrganizationAssignment entity in libs/iam/src/domain/user/entities/user-organization-assignment.entity.ts
- [ ] T098 [US3] Create UserDepartmentAssignment entity in libs/iam/src/domain/user/entities/user-department-assignment.entity.ts
- [ ] T099 [US3] Create UserAssignment aggregate root in libs/iam/src/domain/user/aggregates/user-assignment.aggregate.ts
- [ ] T100 [US3] Create Invitation entity with expiration logic
- [ ] T101 [US3] Create UserAssignmentRepository interface

#### 应用层 - 用户邀请和分配用例

- [ ] T102 [US3] Create InviteUserCommand in libs/iam/src/application/commands/invite-user.command.ts
- [ ] T103 [US3] Create CreateUserAssignmentCommand in libs/iam/src/application/commands/create-user-assignment.command.ts
- [ ] T104 [US3] Create InviteUserHandler in libs/iam/src/application/handlers/invite-user.handler.ts
- [ ] T105 [US3] Create CreateUserAssignmentHandler in libs/iam/src/application/handlers/create-user-assignment.handler.ts
- [ ] T106 [US3] Create invitation expiration scheduler

#### 基础设施层

- [ ] T107 [P] [US3] Create UserAssignment persistence entity
- [ ] T108 [P] [US3] Create UserAssignmentRepository implementation
- [ ] T109 [P] [US3] Create UserAssignmentMapper

#### 接口层 - REST API

- [ ] T110 [US3] Create InviteUserDto in libs/iam/src/interface/http/dto/invite-user.dto.ts
- [ ] T111 [US3] Create CreateUserAssignmentDto in libs/iam/src/interface/http/dto/create-user-assignment.dto.ts
- [ ] T112 [US3] Implement POST /tenants/{tenantId}/invitations endpoint
- [ ] T113 [US3] Implement POST /tenants/{tenantId}/users/{userId}/assignments endpoint

## Phase 6: User Story 4 - 组织创建和管理 [US4]

**Goal**: 实现组织创建和管理功能

### Independent Test Criteria

- 租户管理员可以在限制内创建组织
- 组织名称在租户内唯一
- 创建组织时自动创建根部门
- 组织数量限制验证
- 默认组织不可删除

### Tasks

#### 应用层 - 组织管理用例

- [ ] T114 [US4] Create CreateOrganizationCommand in libs/iam/src/application/commands/create-organization.command.ts
- [ ] T115 [US4] Create CreateOrganizationHandler in libs/iam/src/application/handlers/create-organization.handler.ts
- [ ] T116 [US4] Implement organization count limit validation

#### 基础设施层

- [ ] T117 [US4] Add organization count query to OrganizationRepository

#### 接口层 - REST API

- [ ] T118 [US4] Create CreateOrganizationDto in libs/iam/src/interface/http/dto/create-organization.dto.ts
- [ ] T119 [US4] Create OrganizationsController in libs/iam/src/interface/http/controllers/organizations.controller.ts
- [ ] T120 [US4] Implement POST /organizations endpoint

## Phase 7: User Story 6 - 租户状态管理 [US6]

**Goal**: 实现租户状态管理功能（激活、暂停、恢复）

### Independent Test Criteria

- 平台管理员可以暂停租户
- 平台管理员可以恢复租户
- 租户管理员可以激活租户
- 试用期到期自动转为EXPIRED
- 状态变更影响用户访问权限

### Tasks

#### 应用层 - 租户状态管理用例

- [ ] T121 [US6] Create UpdateTenantStatusCommand in libs/iam/src/application/commands/update-tenant-status.command.ts
- [ ] T122 [US6] Create UpdateTenantStatusHandler in libs/iam/src/application/handlers/update-tenant-status.handler.ts
- [ ] T123 [US6] Create tenant status transition validation
- [ ] T124 [US6] Create trial expiration scheduler

#### 接口层 - REST API

- [ ] T125 [US6] Create UpdateTenantStatusDto in libs/iam/src/interface/http/dto/update-tenant-status.dto.ts
- [ ] T126 [US6] Implement PATCH /tenants/{tenantId}/status endpoint

## Phase 8: User Story 5 - 部门结构管理 [US5]

**Goal**: 实现多层级部门结构管理（最多8层）

### Independent Test Criteria

- 组织管理员可以创建部门层级
- 部门层级深度限制验证（最多8层）
- 部门名称在同一组织内唯一
- 部门路径管理
- 深层级查询性能优化

### Tasks

#### 领域层 - 部门管理子领域增强

- [ ] T127 [US5] Create DepartmentPathValueObject in libs/iam/src/domain/department/value-objects/department-path.value-object.ts
- [ ] T128 [US5] Enhance Department entity with level and path management
- [ ] T129 [US5] Implement department hierarchy validation

#### 应用层 - 部门管理用例

- [ ] T130 [US5] Create CreateDepartmentCommand in libs/iam/src/application/commands/create-department.command.ts
- [ ] T131 [US5] Create CreateDepartmentHandler in libs/iam/src/application/handlers/create-department.handler.ts
- [ ] T132 [US5] Implement department level limit validation
- [ ] T133 [US5] Implement path compression for performance

#### 基础设施层 - 性能优化

- [ ] T134 [US5] Add department path indexing
- [ ] T135 [US5] Implement department query caching

#### 接口层 - REST API

- [ ] T136 [US5] Create CreateDepartmentDto in libs/iam/src/interface/http/dto/create-department.dto.ts
- [ ] T137 [US5] Create DepartmentsController in libs/iam/src/interface/http/controllers/departments.controller.ts
- [ ] T138 [US5] Implement POST /departments endpoint

## Phase 9: Polish & Cross-Cutting Concerns

**Goal**: 完善功能并实现跨领域关注点

### Tasks

#### 认证子领域实现

- [ ] T139 Create LoginSession aggregate root in libs/iam/src/domain/authentication/aggregates/login-session.aggregate.ts
- [ ] T140 Create AuthenticationToken aggregate root in libs/iam/src/domain/authentication/aggregates/authentication-token.aggregate.ts
- [ ] T141 Create LoginCommand and LoginHandler
- [ ] T142 Create LogoutCommand and LogoutHandler
- [ ] T143 Implement JWT token generation
- [ ] T144 Implement token refresh mechanism
- [ ] T145 Create authentication guards

#### CASL权限管理集成

- [ ] T146 Create CaslAbilityFactory in libs/iam/src/infrastructure/casl/ability-factory.ts
- [ ] T147 Create role-based rules in libs/iam/src/infrastructure/casl/rules/role-based.rules.ts
- [ ] T148 Create attribute-based rules in libs/iam/src/infrastructure/casl/rules/attribute-based.rules.ts
- [ ] T149 Create TenantContextAdapter in libs/iam/src/infrastructure/casl/adapters/tenant-context-adapter.ts
- [ ] T150 Create CaslPermissionValidator in libs/iam/src/infrastructure/casl/casl-permission-validator.ts
- [ ] T151 Configure CaslModule using nest-casl in libs/iam/src/infrastructure/casl/casl.module.ts
- [ ] T152 Use @CheckPolicies decorator in controllers for permission checks
- [ ] T153 Implement GET /users/me/permissions endpoint for frontend menu permission control
- [ ] T154 Implement POST /permissions/check-batch endpoint for batch permission checking
- [ ] T155 Include permissions in JWT token payload during token generation

#### 角色和权限管理子领域

- [ ] T156 Create Role aggregate root in libs/iam/src/domain/role/aggregates/role.aggregate.ts
- [ ] T157 Create Permission aggregate root in libs/iam/src/domain/permission/aggregates/permission.aggregate.ts
- [ ] T158 Create PermissionAssignment aggregate root
- [ ] T159 Create role and permission management commands and handlers

## Implementation Strategy

### MVP Scope

**第一阶段MVP（最小可行产品）**：

- Phase 1: Setup
- Phase 2: Foundational
- Phase 3: User Story 1 - 用户注册
- Phase 4: User Story 2 - 租户创建和初始化

**MVP交付价值**：

- 用户可以注册并验证账户
- 用户可以创建租户并开始使用平台
- 系统自动创建默认组织和根部门
- 基础的多租户数据隔离

### Incremental Delivery

1. **MVP交付**（Phase 1-4）：基础的用户和租户管理
2. **团队协作**（Phase 5）：用户邀请和分配
3. **组织结构**（Phase 6, 8）：组织和部门管理
4. **运营管理**（Phase 7）：租户状态管理
5. **权限完善**（Phase 9）：认证和权限管理完整实现

### Parallel Execution Recommendations

- **Phase 2**: 所有值对象可以并行开发
- **Phase 3**: 值对象、实体、聚合根可以并行开发
- **Phase 4**: 租户、组织、部门相关的值对象和实体可以并行开发
- **Phase 5**: 用户分配相关的实体可以并行开发
- **Phase 9**: CASL集成和角色权限管理可以并行开发

## Notes

- 所有标识符值对象必须从 `@hl8/domain-kernel` 导入（EntityId, TenantId, OrganizationId, DepartmentId）
- 所有代码注释使用中文，遵循TSDoc规范
- 领域层保持纯净，不依赖基础设施
- 使用充血模型，聚合根委托业务逻辑给内部实体
- 所有状态变更通过领域事件记录
- 实现CQRS模式，命令和查询分离
