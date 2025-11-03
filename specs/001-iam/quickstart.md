# Quick Start: IAM模块开发

**Feature**: IAM业务模块开发（引入CASL）  
**Date**: 2024-12-19

## 📋 概述

本指南提供IAM模块的快速开始说明，包括项目初始化、依赖安装、CASL集成和基础开发流程。

## 🚀 快速开始

### 1. 项目初始化

```bash
# 创建IAM模块目录
mkdir -p libs/iam/src/{domain,application,infrastructure,interface}
mkdir -p libs/iam/src/domain/subdomains/{user-management,tenant-management,organization-management,department-management,role-management,permission-management}

# 初始化package.json
cd libs/iam
pnpm init
```

### 2. 安装依赖

```json
{
  "dependencies": {
    "@hl8/domain-kernel": "workspace:*",
    "@hl8/application-kernel": "workspace:*",
    "@hl8/infrastructure-kernel": "workspace:*",
    "@hl8/interface-kernel": "workspace:*",
    "@hl8/config": "workspace:*",
    "@hl8/logger": "workspace:*",
    "@hl8/cache": "workspace:*",
    "@casl/ability": "^6.0.0",
    "nest-casl": "^1.0.0",
    "@nestjs/common": "^11.0.0",
    "@nestjs/cqrs": "^11.0.0",
    "class-validator": "^0.14.1",
    "class-transformer": "^0.5.1"
  },
  "devDependencies": {
    "@jest/globals": "^30.2.0",
    "@types/node": "^22.16.0",
    "typescript": "^5.9.3",
    "jest": "^30.2.0",
    "ts-jest": "^29.4.5"
  }
}
```

### 3. TypeScript配置

```json
{
  "compilerOptions": {
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "target": "ES2022",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

### 4. package.json配置

```json
{
  "type": "module",
  "engines": {
    "node": ">=20"
  }
}
```

---

## 🏗️ 架构分层

### 领域层（Domain Layer）

**位置**: `libs/iam/src/domain/`

**职责**:
- 定义聚合根、实体、值对象
- 实现业务规则和领域逻辑
- 发布领域事件
- **保持纯净**：不依赖任何基础设施库

**标识符值对象使用规范**:
- **优先使用** `@hl8/domain-kernel/src/identifiers` 提供的值对象
- 从 `@hl8/domain-kernel` 导入：`EntityId`, `TenantId`, `OrganizationId`, `DepartmentId`
- **禁止**在IAM模块中重新定义这些标识符值对象

**示例导入**:
```typescript
import { EntityId, TenantId, OrganizationId, DepartmentId } from '@hl8/domain-kernel';
```

**示例结构**:
```
domain/
├── subdomains/
│   ├── user-management/
│   │   ├── aggregates/
│   │   │   └── platform-user.aggregate.ts
│   │   ├── entities/
│   │   │   └── verification-code.entity.ts
│   │   ├── value-objects/
│   │   │   ├── email.value-object.ts
│   │   │   └── phone-number.value-object.ts
│   │   └── events/
│   │       └── user-registered.event.ts
```

---

### 应用层（Application Layer）

**位置**: `libs/iam/src/application/`

**职责**:
- 实现用例（Use Cases）
- CQRS命令和查询处理
- 事件投影器
- **不依赖基础设施细节**

**示例结构**:
```
application/
├── commands/
│   ├── register-user.command.ts
│   └── create-tenant.command.ts
├── queries/
│   ├── get-user.query.ts
│   └── list-tenants.query.ts
├── handlers/
│   ├── register-user.handler.ts
│   └── create-tenant.handler.ts
└── projectors/
    └── tenant-projector.ts
```

---

### 基础设施层（Infrastructure Layer）

**位置**: `libs/iam/src/infrastructure/`

**职责**:
- 实现仓储（Repository）
- 实现事件存储（Event Store）
- **CASL集成**（权限管理）
- 外部服务集成（邮件、短信）

**CASL集成示例**:
```
infrastructure/
├── casl/
│   ├── ability-factory.ts      # 创建CASL Ability实例
│   ├── rules/
│   │   ├── role-based.rules.ts # 基于角色的规则
│   │   └── attribute-based.rules.ts # 基于属性的规则
│   └── adapters/
│       └── tenant-context-adapter.ts # TenantContext适配器
```

---

### 接口层（Interface Layer）

**位置**: `libs/iam/src/interface/`

**职责**:
- REST API控制器
- DTO定义
- **CASL守卫**（权限验证）

**示例结构**:
```
interface/
├── http/
│   ├── controllers/
│   │   ├── users.controller.ts
│   │   └── tenants.controller.ts
│   ├── dto/
│   │   ├── register-user.dto.ts
│   │   └── create-tenant.dto.ts
│   └── guards/
│       └── casl-permission.guard.ts # CASL权限守卫
```

---

## 🔐 CASL集成示例

### 1. 创建Ability工厂

```typescript
// infrastructure/casl/ability-factory.ts
import { Ability, AbilityBuilder } from '@casl/ability';
import type { TenantContext } from '@hl8/domain-kernel';

/**
 * CASL Ability工厂
 * @description 基于TenantContext创建CASL Ability实例
 */
export class CaslAbilityFactory {
  /**
   * 创建Ability实例
   * @param context 租户上下文
   * @returns CASL Ability实例
   */
  create(context: TenantContext): Ability {
    const { can, build } = new AbilityBuilder(Ability);

    // 基于角色定义权限规则
    if (context.hasPermission('tenant:manage')) {
      can('manage', 'Tenant', { tenantId: context.tenantId.value });
    }

    // 基于组织上下文定义权限
    if (context.organizationId) {
      can('read', 'Organization', { 
        tenantId: context.tenantId.value,
        organizationId: context.organizationId.value 
      });
    }

    return build();
  }
}
```

### 2. 权限验证器实现

```typescript
// infrastructure/casl/casl-permission-validator.ts
import { Injectable } from '@nestjs/common';
import { Ability } from '@casl/ability';
import type { ITenantPermissionValidator, TenantContext } from '@hl8/application-kernel';
import { CaslAbilityFactory } from './ability-factory.js';

/**
 * CASL权限验证器实现
 * @description 使用CASL实现权限验证
 */
@Injectable()
export class CaslPermissionValidator implements ITenantPermissionValidator {
  constructor(private readonly abilityFactory: CaslAbilityFactory) {}

  async validatePermission(
    context: TenantContext,
    permission: string,
  ): Promise<boolean> {
    const ability = this.abilityFactory.create(context);
    // 解析权限字符串（如 "read:User"）为CASL action和subject
    const [action, subject] = permission.split(':');
    return ability.can(action, subject);
  }
}
```

### 3. JWT Token包含权限（前端菜单权限控制）

在生成JWT时，将权限列表包含在token payload中，前端可以直接从token解析权限：

```typescript
// infrastructure/casl/ability-factory.ts (生成JWT时)
import { sign } from 'jsonwebtoken';

function generateJWT(user: User, tenantContext: TenantContext): string {
  const payload = {
    userId: user.userId.value,
    tenantId: tenantContext.tenantId.value,
    organizationId: tenantContext.organizationId?.value,
    departmentId: tenantContext.departmentId?.value,
    permissions: tenantContext.permissions, // 权限列表
    roles: tenantContext.roles, // 角色列表（可选）
  };
  
  return sign(payload, JWT_SECRET, { expiresIn: '15m' });
}
```

**前端使用**：
```typescript
// 前端从JWT解析权限
import { decode } from 'jsonwebtoken';
import { AbilityBuilder } from '@casl/ability';

const token = localStorage.getItem('accessToken');
const payload = decode(token);
const permissions = payload.permissions;

// 构建CASL Ability实例
const { can, build } = new AbilityBuilder();
permissions.forEach(perm => {
  const [action, subject] = perm.split(':');
  can(action, subject);
});
const ability = build();

// 菜单权限过滤
const visibleMenus = menus.filter(menu => 
  ability.can(menu.permission.action, menu.permission.subject)
);
```

### 4. 权限列表查询API（前端菜单权限控制）

```typescript
// interface/http/controllers/permissions.controller.ts
import { Controller, Get, UseGuards } from '@nestjs/common';
import { CaslGuard } from 'nest-casl';

@Controller('users')
@UseGuards(CaslGuard)
export class PermissionsController {
  @Get('me/permissions')
  async getMyPermissions(@Request() request) {
    const tenantContext = request.tenantContext;
    return {
      userId: tenantContext.userId?.value,
      tenantId: tenantContext.tenantId.value,
      organizationId: tenantContext.organizationId?.value,
      departmentId: tenantContext.departmentId?.value,
      permissions: tenantContext.permissions,
    };
  }
}
```

### 5. CASL守卫（使用 nest-casl）

```typescript
// interface/http/controllers/users.controller.ts
import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { CheckPolicies, CaslGuard } from 'nest-casl';
import { CaslAbilityFactory } from '../../infrastructure/casl/ability-factory.js';

/**
 * 用户管理控制器
 * @description 使用 nest-casl 装饰器进行权限检查
 */
@Controller('users')
@UseGuards(CaslGuard)
export class UsersController {
  constructor(private readonly abilityFactory: CaslAbilityFactory) {}

  @Post('register')
  // 不需要权限检查的公开端点
  async register(@Body() dto: RegisterUserDto) {
    // 处理注册请求
  }

  @Post('invite')
  @CheckPolicies((ability) => ability.can('manage', 'User'))
  // 需要 manage:User 权限
  async inviteUser(@Body() dto: InviteUserDto) {
    // 处理邀请请求
  }
}
```

**配置 CaslModule**:

```typescript
// infrastructure/casl/casl.module.ts
import { Module } from '@nestjs/common';
import { CaslModule as NestCaslModule } from 'nest-casl';
import { CaslAbilityFactory } from './ability-factory.js';

@Module({
  imports: [
    NestCaslModule.forRootAsync({
      useFactory: (abilityFactory: CaslAbilityFactory) => ({
        getAbility: (request) => {
          const tenantContext = request.tenantContext;
          return abilityFactory.create(tenantContext);
        },
      }),
      inject: [CaslAbilityFactory],
    }),
  ],
  providers: [CaslAbilityFactory],
  exports: [CaslAbilityFactory],
})
export class CaslModule {}
```

---

## 📝 开发流程

### 1. 创建聚合根

```typescript
// domain/subdomains/user-management/aggregates/user.aggregate.ts
import { AggregateRoot, EntityId } from '@hl8/domain-kernel';
import { UserEntity } from '../entities/user.entity.js';

/**
 * 用户聚合根
 * @description 管理用户的完整生命周期
 */
export class User extends AggregateRoot {
  private readonly _user: UserEntity;
  private readonly _userId: EntityId; // 使用domain-kernel的EntityId

  constructor(userId?: EntityId) {
    super();
    this._userId = userId || EntityId.generate(); // 使用EntityId的生成方法
  }

  /**
   * 注册用户
   * @description 创建新的用户账户
   */
  register(name: string, email: string, phoneNumber: string, password: string): void {
    // 委托给内部实体执行业务逻辑
    this._user.create(name, email, phoneNumber, password);
    // 发布领域事件
    this.publishEvent(new UserRegisteredEvent(this._userId));
  }

  /**
   * 获取用户ID
   * @returns 用户标识符
   */
  get userId(): EntityId {
    return this._userId;
  }
}
```

### 2. 创建命令和处理器

```typescript
// application/commands/register-user.command.ts
import { BaseCommand } from '@hl8/interface-kernel';

/**
 * 注册用户命令
 */
export class RegisterUserCommand extends BaseCommand {
  constructor(
    public readonly name: string,
    public readonly email: string,
    public readonly phoneNumber: string,
    public readonly password: string,
  ) {
    super();
  }
}

// application/handlers/register-user.handler.ts
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { RegisterUserCommand } from '../commands/register-user.command.js';

/**
 * 注册用户命令处理器
 */
@CommandHandler(RegisterUserCommand)
export class RegisterUserHandler implements ICommandHandler<RegisterUserCommand> {
  async execute(command: RegisterUserCommand): Promise<void> {
    // 实现用例逻辑
  }
}
```

### 3. 创建API控制器

```typescript
// interface/http/controllers/users.controller.ts
import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { CaslPermissionGuard } from '../guards/casl-permission.guard.js';
import { RegisterUserDto } from '../dto/register-user.dto.js';

/**
 * 用户管理控制器
 */
@Controller('users')
export class UsersController {
  @Post('register')
  async register(@Body() dto: RegisterUserDto) {
    // 处理注册请求
  }
}
```

---

## 🧪 测试

### 单元测试示例

```typescript
// domain/subdomains/user-management/aggregates/platform-user.aggregate.spec.ts
import { describe, it, expect } from '@jest/globals';
import { PlatformUser } from './platform-user.aggregate.js';

describe('PlatformUser', () => {
  it('应该能够注册新用户', () => {
    const user = new PlatformUser();
    user.register('张三', 'zhangsan@example.com', '13800138000', 'password123');
    
    expect(user.email).toBe('zhangsan@example.com');
    expect(user.status).toBe('UNVERIFIED');
  });
});
```

---

## 📚 下一步

1. ✅ 完成项目初始化和依赖安装
2. ⏳ 实现第一个子领域（用户管理）
3. ⏳ 集成CASL权限验证
4. ⏳ 实现API接口
5. ⏳ 编写测试用例

---

**文档生成时间**: 2024-12-19  
**状态**: ✅ 快速开始指南完成

