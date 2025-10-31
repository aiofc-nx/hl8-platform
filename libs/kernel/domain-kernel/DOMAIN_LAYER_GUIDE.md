# 领域层开发指引 - 用户管理示例

## 📋 目录

1. [概述](#概述)
2. [开发原则](#开发原则)
3. [领域模型设计](#领域模型设计)
4. [值对象 (Value Object)](#值对象-value-object)
5. [实体 (Entity)](#实体-entity)
6. [聚合根 (Aggregate Root)](#聚合根-aggregate-root)
7. [领域事件 (Domain Event)](#领域事件-domain-event)
8. [业务规则 (Business Rule)](#业务规则-business-rule)
9. [仓储模式 (Repository)](#仓储模式-repository)
10. [工厂模式 (Factory)](#工厂模式-factory)
11. [规约模式 (Specification)](#规约模式-specification)
12. [领域服务 (Domain Service)](#领域服务-domain-service)
13. [服务协调 (Coordination)](#服务协调-coordination)
14. [业务操作 (Business Operation)](#业务操作-business-operation)
15. [事件处理 (Event Processing)](#事件处理-event-processing)
16. [异常处理](#异常处理)
17. [完整示例](#完整示例)
18. [最佳实践](#最佳实践)

---

## 概述

本文档以用户管理模块为例，详细阐述如何使用 `@hl8/domain-kernel` 进行领域层开发。这是培训手册，帮助开发者快速掌握领域驱动设计（DDD）在项目中的实践。

### 核心概念

领域层开发遵循以下核心原则：

- **Clean Architecture**: 领域层独立于基础设施和应用层
- **富领域模型**: 业务逻辑封装在领域对象中
- **实体-聚合分离**: 聚合根协调业务操作，内部实体执行业务逻辑
- **事件驱动**: 使用领域事件实现解耦和可追溯性
- **类型安全**: 完整的 TypeScript 类型支持

---

## 开发原则

### 1. 分层原则

```
┌─────────────────────────────────────┐
│       Application Layer             │  应用层：用例编排
├─────────────────────────────────────┤
│       Domain Layer                  │  领域层：业务逻辑（本文档重点）
├─────────────────────────────────────┤
│       Infrastructure Layer          │  基础设施层：技术实现
└─────────────────────────────────────┘
```

**规则**: 领域层不应该依赖任何外部框架或基础设施。

### 2. 实体-聚合分离原则

- **聚合根**: 管理聚合边界，协调业务操作，不直接执行业务逻辑
- **内部实体**: 执行具体的业务逻辑操作
- **分离**: 聚合根通过 `performCoordination` 协调，内部实体通过 `executeBusinessLogic` 执行

### 3. 不可变性原则

- **值对象**: 完全不可变
- **实体标识符**: 创建后不可变
- **审计信息**: 只读，通过审计轨迹追踪变更

---

## 领域模型设计

### 用户管理领域模型

```
User (Aggregate Root)
├── UserId (Value Object)
├── Email (Value Object)
├── Password (Value Object)
├── UserProfile (Internal Entity)
│   ├── Name (Value Object)
│   ├── Phone (Value Object)
│   └── Address (Value Object)
├── UserRole (Internal Entity)
│   └── Role (Value Object)
└── Domain Events
    ├── UserCreated
    ├── UserActivated
    ├── UserDeactivated
    └── ProfileUpdated
```

---

## 值对象 (Value Object)

值对象是不可变的，通过值相等性进行比较。

### 示例：Email 值对象

```typescript
import { ValueObject } from "@hl8/domain-kernel";
import { ValueObjectValidator } from "@hl8/domain-kernel";
import { ValueObjectValidationFailedException } from "@hl8/domain-kernel";

/**
 * 邮箱值对象
 * @description 表示用户邮箱地址，确保格式有效性
 */
export class Email extends ValueObject<string> {
  /**
   * 创建邮箱值对象
   * @param value 邮箱地址字符串
   * @throws {ValueObjectValidationFailedException} 当邮箱格式无效时抛出
   */
  constructor(value: string) {
    super(value);
    this.validateEmail(value);
  }

  /**
   * 验证邮箱格式
   * @param value 邮箱地址
   * @throws {ValueObjectValidationFailedException} 当验证失败时抛出
   */
  private validateEmail(value: string): void {
    const validator = new ValueObjectValidator();
    
    validator
      .required(value, "邮箱不能为空")
      .pattern(
        value,
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        "邮箱格式无效，必须包含 @ 和域名"
      )
      .length(value, 5, 255, "邮箱长度必须在5-255个字符之间");

    if (!validator.isValid()) {
      throw new ValueObjectValidationFailedException(
        validator.getAllErrors().join(", "),
        {
          email: value,
        },
      );
    }
  }

  /**
   * 获取邮箱值
   * @returns 邮箱地址字符串
   */
  public get value(): string {
    return this._value;
  }

  /**
   * 获取邮箱域名
   * @returns 邮箱域名
   */
  public get domain(): string {
    const parts = this._value.split("@");
    return parts.length > 1 ? parts[1] : "";
  }

  /**
   * 克隆值对象
   * @returns 新的邮箱值对象实例
   */
  public clone(): Email {
    return new Email(this._value);
  }
}
```

### 示例：Password 值对象

```typescript
import { ValueObject } from "@hl8/domain-kernel";
import { ValueObjectValidator } from "@hl8/domain-kernel";

/**
 * 密码值对象
 * @description 表示用户密码，确保强度和安全性
 */
export class Password extends ValueObject<string> {
  /**
   * 创建密码值对象
   * @param value 密码字符串
   * @throws {ValueObjectValidationFailedException} 当密码不符合强度要求时抛出
   */
  constructor(value: string) {
    super(value);
    this.validatePassword(value);
  }

  /**
   * 验证密码强度
   * @param value 密码字符串
   */
  private validatePassword(value: string): void {
    const validator = new ValueObjectValidator();

    validator
      .required(value, "密码不能为空")
      .length(value, 8, 128, "密码长度必须在8-128个字符之间")
      .pattern(
        value,
        /(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        "密码必须包含大小写字母和数字",
      );

    if (!validator.isValid()) {
      throw new ValueObjectValidationFailedException(
        validator.getAllErrors().join(", "),
        {
          passwordLength: value.length,
        },
      );
    }
  }

  /**
   * 获取密码值（注意：实际应用中不应该直接暴露明文密码）
   * @returns 密码字符串
   */
  public get value(): string {
    return this._value;
  }

  /**
   * 克隆值对象
   * @returns 新的密码值对象实例
   */
  public clone(): Password {
    return new Password(this._value);
  }
}
```

### 最佳实践

1. **总是验证**: 值对象构造函数中必须进行验证
2. **不可变**: 值对象创建后不能修改
3. **值相等性**: 通过 `equals()` 方法比较值而不是引用
4. **业务语义**: 值对象应该体现业务概念

---

## 实体 (Entity)

实体具有唯一标识符，通过标识符进行比较。

### 示例：UserProfile 内部实体

```typescript
import { InternalEntity } from "@hl8/domain-kernel";
import { EntityId } from "@hl8/domain-kernel";
import { AuditInfo } from "@hl8/domain-kernel";
import { EntityLifecycle } from "@hl8/domain-kernel";

/**
 * 用户资料内部实体
 * @description 用户聚合根内部的实体，存储用户的详细资料信息
 */
export class UserProfile extends InternalEntity {
  private _name: string = "";
  private _phone: string = "";
  private _address: string = "";

  /**
   * 创建用户资料实体
   * @param aggregateRootId 所属用户聚合根标识符
   * @param name 用户姓名
   * @param phone 电话号码
   * @param address 地址
   * @param id 实体标识符，可选
   * @param auditInfo 审计信息，可选
   */
  constructor(
    aggregateRootId: EntityId,
    name: string,
    phone: string,
    address: string,
    id?: EntityId,
    auditInfo?: AuditInfo,
  ) {
    super(
      aggregateRootId,
      id,
      auditInfo,
      EntityLifecycle.CREATED,
      1,
    );
    this._name = name;
    this._phone = phone;
    this._address = address;
  }

  public get name(): string {
    return this._name;
  }

  public get phone(): string {
    return this._phone;
  }

  public get address(): string {
    return this._address;
  }

  /**
   * 更新用户资料
   * @param name 新姓名
   * @param phone 新电话
   * @param address 新地址
   */
  public updateProfile(
    name: string,
    phone: string,
    address: string,
  ): void {
    this._name = name;
    this._phone = phone;
    this._address = address;
  }

  /**
   * 克隆实体
   * @returns 新的用户资料实体实例
   */
  public clone(): UserProfile {
    return new UserProfile(
      this.aggregateRootId,
      this._name,
      this._phone,
      this._address,
      this.id.clone(),
      this.auditInfo.clone(),
    );
  }
}
```

---

## 聚合根 (Aggregate Root)

聚合根管理聚合边界，协调业务操作，不直接执行业务逻辑。

### 示例：User 聚合根

```typescript
import { AggregateRoot } from "@hl8/domain-kernel";
import { EntityId } from "@hl8/domain-kernel";
import { AuditInfo } from "@hl8/domain-kernel";
import { EntityLifecycle } from "@hl8/domain-kernel";
import { DomainEvent } from "@hl8/domain-kernel";
import { Email } from "./value-objects/email.js";
import { Password } from "./value-objects/password.js";
import { UserProfile } from "./entities/user-profile.js";
import { OperationManager } from "@hl8/domain-kernel";

/**
 * 用户聚合根
 * @description 管理用户相关的所有业务操作和状态
 */
export class User extends AggregateRoot {
  private _email: Email;
  private _password: Password;
  private _isActive: boolean = false;
  private _profile: UserProfile | null = null;

  /**
   * 创建用户聚合根
   * @param email 邮箱值对象
   * @param password 密码值对象
   * @param id 用户标识符，可选
   * @param auditInfo 审计信息，可选
   */
  constructor(
    email: Email,
    password: Password,
    id?: EntityId,
    auditInfo?: AuditInfo,
  ) {
    super(id, auditInfo, EntityLifecycle.CREATED, 1);
    this._email = email.clone();
    this._password = password.clone();
  }

  /**
   * 获取邮箱
   */
  public get email(): Email {
    return this._email.clone();
  }

  /**
   * 获取激活状态
   */
  public get isActive(): boolean {
    return this._isActive;
  }

  /**
   * 获取用户资料
   */
  public get profile(): UserProfile | null {
    return this._profile?.clone() || null;
  }

  /**
   * 激活用户（通过操作管理器）
   * @param operationManager 操作管理器
   * @returns Promise<操作结果>
   */
  public async activate(
    operationManager: OperationManager,
  ): Promise<{ success: boolean; error?: Error }> {
    const context = operationManager.createContext("activate-user").build();
    const parameters = { userId: this.id.value };

    const result = await operationManager.executeOperation(
      "activateUser",
      this,
      parameters,
      context,
    );

    if (result.success) {
      this._isActive = true;
      this.addDomainEvent({
        type: "UserActivated",
        aggregateRootId: this.id,
        timestamp: new Date(),
        data: {
          userId: this.id.value,
          activatedAt: new Date().toISOString(),
        },
      });
    }

    return {
      success: result.success,
      error: result.error,
    };
  }

  /**
   * 更新用户资料（通过操作管理器）
   * @param operationManager 操作管理器
   * @param name 姓名
   * @param phone 电话
   * @param address 地址
   * @returns Promise<操作结果>
   */
  public async updateProfile(
    operationManager: OperationManager,
    name: string,
    phone: string,
    address: string,
  ): Promise<{ success: boolean; error?: Error }> {
    const context = operationManager.createContext("update-profile").build();
    const parameters = {
      userId: this.id.value,
      name,
      phone,
      address,
    };

    const result = await operationManager.executeOperation(
      "updateUserProfile",
      this,
      parameters,
      context,
    );

    if (result.success && this._profile) {
      this._profile.updateProfile(name, phone, address);
      this.addDomainEvent({
        type: "ProfileUpdated",
        aggregateRootId: this.id,
        timestamp: new Date(),
        data: {
          userId: this.id.value,
          name,
          phone,
          address,
        },
      });
    }

    return {
      success: result.success,
      error: result.error,
    };
  }

  /**
   * 执行协调业务操作（必需实现的抽象方法）
   * @param operation 操作名称
   * @param params 操作参数
   * @returns 操作结果
   */
  protected performCoordination(
    operation: string,
    params: unknown,
  ): unknown {
    switch (operation) {
      case "activateUser":
        // 协调激活操作：验证业务规则、检查前置条件等
        return { success: true, canActivate: true };
      
      case "updateUserProfile":
        // 协调更新资料操作
        const { name, phone, address } = params as {
          name: string;
          phone: string;
          address: string;
        };
        // 可以在这里调用领域服务进行验证
        return { success: true, validated: true };
      
      default:
        return { success: false, error: "未知操作" };
    }
  }

  /**
   * 验证业务不变量（必需实现的抽象方法）
   * @returns 是否满足业务不变量
   */
  protected performBusinessInvariantValidation(): boolean {
    // 业务不变量：
    // 1. 用户必须有有效的邮箱
    // 2. 如果已激活，必须有用户资料
    return (
      this._email.value.length > 0 &&
      (!this._isActive || this._profile !== null)
    );
  }

  /**
   * 克隆聚合根
   * @returns 新的用户聚合根实例
   */
  public clone(): User {
    const cloned = new User(
      this._email.clone(),
      this._password.clone(),
      this.id.clone(),
      this.auditInfo.clone(),
    );
    cloned._isActive = this._isActive;
    cloned._profile = this._profile?.clone() || null;
    return cloned;
  }
}
```

---

## 领域事件 (Domain Event)

领域事件表示业务中发生的值得注意的事情。

### 示例：用户创建事件

```typescript
import { DomainEvent } from "@hl8/domain-kernel";
import { EntityId } from "@hl8/domain-kernel";

/**
 * 用户创建事件
 * @description 当新用户被创建时发布此事件
 */
export class UserCreatedEvent extends DomainEvent {
  /**
   * 创建用户创建事件
   * @param aggregateRootId 用户聚合根标识符
   * @param email 用户邮箱
   * @param createdAt 创建时间
   */
  constructor(
    aggregateRootId: EntityId,
    email: string,
    createdAt: Date = new Date(),
  ) {
    super(
      aggregateRootId,
      "UserCreated",
      {
        email,
        createdAt: createdAt.toISOString(),
      },
      {},
      undefined,
      createdAt,
      1,
    );
  }
}
```

### 使用领域事件

```typescript
// 在聚合根中发布事件
const user = new User(email, password);
user.addDomainEvent(new UserCreatedEvent(user.id, email.value));

// 获取待发布的事件
const events = user.getDomainEvents();
```

---

## 业务规则 (Business Rule)

业务规则封装可重用的验证逻辑。

### 示例：邮箱格式规则

```typescript
import { BusinessRule } from "@hl8/domain-kernel";
import { BusinessRuleValidationResult } from "@hl8/domain-kernel";
import { BusinessRuleViolation } from "@hl8/domain-kernel";
import { BusinessRuleType, BusinessRuleSeverity } from "@hl8/domain-kernel";
import { User } from "./aggregates/user.js";

/**
 * 邮箱格式业务规则
 * @description 验证用户邮箱格式是否正确
 */
export class EmailFormatRule implements BusinessRule<User> {
  public readonly name = "EmailFormatRule";
  public readonly description = "验证邮箱格式";
  public readonly priority = 100;
  public readonly enabled = true;
  public readonly type = BusinessRuleType.VALIDATION;
  public readonly severity = BusinessRuleSeverity.ERROR;

  /**
   * 验证邮箱格式
   * @param entity 用户实体
   * @returns 验证结果
   */
  public validate(entity: User): BusinessRuleValidationResult {
    if (!this.enabled) {
      return BusinessRuleValidationResult.success(
        "User",
        entity.id.value,
      );
    }

    const email = entity.email.value;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      return BusinessRuleValidationResult.failure(
        "User",
        entity.id.value,
        [
          this.createViolation(
            "邮箱格式无效",
            "INVALID_EMAIL_FORMAT",
            { email },
          ),
        ],
      );
    }

    return BusinessRuleValidationResult.success("User", entity.id.value);
  }

  /**
   * 检查规则是否适用
   * @param entity 实体
   * @returns 是否适用
   */
  public isApplicable(entity: unknown): boolean {
    return entity instanceof User;
  }

  /**
   * 获取规则依赖
   * @returns 依赖的规则名称列表
   */
  public getDependencies(): string[] {
    return [];
  }

  /**
   * 创建规则违反
   * @param message 违反消息
   * @param code 违反代码
   * @param details 违反详情
   * @returns 规则违反对象
   */
  public createViolation(
    message: string,
    code: string = "BUSINESS_RULE_VIOLATION",
    details?: Record<string, unknown>,
  ): BusinessRuleViolation {
    return BusinessRuleViolation.error(message, code, this.name);
  }

  /**
   * 检查规则冲突
   * @param other 其他规则
   * @returns 是否冲突
   */
  public conflictsWith(_other: BusinessRule<User>): boolean {
    return false;
  }

  /**
   * 启用规则
   */
  public enable(): void {
    (this as any).enabled = true;
  }

  /**
   * 禁用规则
   */
  public disable(): void {
    (this as any).enabled = false;
  }
}
```

### 使用业务规则管理器

```typescript
import { BusinessRuleManager } from "@hl8/domain-kernel";

// 创建规则管理器
const ruleManager = new BusinessRuleManager<User>();

// 注册业务规则
ruleManager.registerRule(new EmailFormatRule());
ruleManager.registerRule(new PasswordStrengthRule());
ruleManager.registerRule(new AgeValidationRule());

// 验证实体
const validationResult = ruleManager.validateEntity(user, {
  entityType: "User",
  entityId: user.id.value,
});

if (!validationResult.isValid) {
  // 处理验证失败
  const violations = validationResult.violations;
  violations.forEach((violation) => {
    console.error(`违反规则: ${violation.message}`);
  });
}
```

---

## 仓储模式 (Repository)

仓储提供聚合根的持久化抽象。

### 示例：用户仓储接口

```typescript
import { IRepository } from "@hl8/domain-kernel";
import { EntityId } from "@hl8/domain-kernel";
import { User } from "./aggregates/user.js";
import { Email } from "./value-objects/email.js";

/**
 * 用户仓储接口
 * @description 定义用户聚合根的持久化操作
 */
export interface IUserRepository extends IRepository<User> {
  /**
   * 根据邮箱查找用户
   * @param email 邮箱值对象
   * @returns 用户聚合根，如果不存在则返回 null
   */
  findByEmail(email: Email): Promise<User | null>;

  /**
   * 检查邮箱是否已存在
   * @param email 邮箱值对象
   * @returns 如果邮箱已存在返回 true
   */
  emailExists(email: Email): Promise<boolean>;

  /**
   * 根据激活状态查找用户列表
   * @param isActive 是否激活
   * @returns 用户列表
   */
  findByActiveStatus(isActive: boolean): Promise<User[]>;
}
```

### 示例：用户仓储实现（基础设施层）

```typescript
import { IUserRepository } from "./interfaces/user-repository.interface.js";
import { User } from "./aggregates/user.js";
import { Email } from "./value-objects/email.js";
import { EntityId } from "@hl8/domain-kernel";
import { RepositoryOperationFailedException } from "@hl8/domain-kernel";

/**
 * 用户仓储实现（示例 - 实际应在基础设施层）
 * @description 提供用户聚合根的数据访问实现
 */
export class UserRepository implements IUserRepository {
  // 实际实现应该使用数据库或其他持久化机制
  private readonly users = new Map<string, User>();

  async findById(id: EntityId): Promise<User | null> {
    try {
      const user = this.users.get(id.value);
      return user ? user.clone() : null;
    } catch (error) {
      throw new RepositoryOperationFailedException(
        `查找用户失败: ${error instanceof Error ? error.message : String(error)}`,
        "findById",
        { userId: id.value },
        error instanceof Error ? error : undefined,
      );
    }
  }

  async save(aggregate: User): Promise<void> {
    try {
      this.users.set(aggregate.id.value, aggregate.clone());
    } catch (error) {
      throw new RepositoryOperationFailedException(
        `保存用户失败: ${error instanceof Error ? error.message : String(error)}`,
        "save",
        { userId: aggregate.id.value },
        error instanceof Error ? error : undefined,
      );
    }
  }

  async delete(id: EntityId): Promise<void> {
    try {
      this.users.delete(id.value);
    } catch (error) {
      throw new RepositoryOperationFailedException(
        `删除用户失败: ${error instanceof Error ? error.message : String(error)}`,
        "delete",
        { userId: id.value },
        error instanceof Error ? error : undefined,
      );
    }
  }

  async findByEmail(email: Email): Promise<User | null> {
    try {
      for (const user of this.users.values()) {
        if (user.email.value === email.value) {
          return user.clone();
        }
      }
      return null;
    } catch (error) {
      throw new RepositoryOperationFailedException(
        `根据邮箱查找用户失败: ${error instanceof Error ? error.message : String(error)}`,
        "findByEmail",
        { email: email.value },
        error instanceof Error ? error : undefined,
      );
    }
  }

  async emailExists(email: Email): Promise<boolean> {
    const user = await this.findByEmail(email);
    return user !== null;
  }

  async findByActiveStatus(isActive: boolean): Promise<User[]> {
    try {
      const users: User[] = [];
      for (const user of this.users.values()) {
        if (user.isActive === isActive) {
          users.push(user.clone());
        }
      }
      return users;
    } catch (error) {
      throw new RepositoryOperationFailedException(
        `根据激活状态查找用户失败: ${error instanceof Error ? error.message : String(error)}`,
        "findByActiveStatus",
        { isActive },
        error instanceof Error ? error : undefined,
      );
    }
  }
}
```

---

## 工厂模式 (Factory)

工厂封装复杂对象的创建逻辑。

### 示例：用户工厂

```typescript
import { IFactory } from "@hl8/domain-kernel";
import { User } from "./aggregates/user.js";
import { Email } from "./value-objects/email.js";
import { Password } from "./value-objects/password.js";
import { EntityId } from "@hl8/domain-kernel";
import { AuditInfo } from "@hl8/domain-kernel";

/**
 * 用户工厂配置
 */
export interface UserFactoryConfig {
  email: string;
  password: string;
  id?: EntityId;
  auditInfo?: AuditInfo;
}

/**
 * 用户工厂
 * @description 负责创建用户聚合根实例，封装复杂的创建逻辑
 */
export class UserFactory implements IFactory<User, UserFactoryConfig> {
  /**
   * 创建用户聚合根
   * @param config 工厂配置
   * @returns 用户聚合根实例
   * @throws {FactoryCreationFailedException} 当创建失败时抛出
   */
  public create(config: UserFactoryConfig): User {
    try {
      // 创建值对象
      const email = new Email(config.email);
      const password = new Password(config.password);

      // 创建用户聚合根
      const user = new User(
        email,
        password,
        config.id,
        config.auditInfo,
      );

      // 添加创建事件
      user.addDomainEvent({
        type: "UserCreated",
        aggregateRootId: user.id,
        timestamp: new Date(),
        data: {
          email: email.value,
          createdAt: new Date().toISOString(),
        },
      });

      return user;
    } catch (error) {
      throw new FactoryCreationFailedException(
        "User",
        `创建用户失败: ${error instanceof Error ? error.message : String(error)}`,
        config,
        error instanceof Error ? error : undefined,
      );
    }
  }

  /**
   * 验证配置
   * @param config 工厂配置
   * @returns 是否有效
   */
  public validateConfig(config: UserFactoryConfig): boolean {
    return (
      typeof config.email === "string" &&
      config.email.length > 0 &&
      typeof config.password === "string" &&
      config.password.length > 0
    );
  }
}
```

---

## 规约模式 (Specification)

规约封装可组合的业务规则查询。

### 示例：活跃用户规约

```typescript
import { ISpecification } from "@hl8/domain-kernel";
import { User } from "./aggregates/user.js";

/**
 * 活跃用户规约
 * @description 检查用户是否为活跃状态
 */
export class ActiveUserSpecification implements ISpecification<User> {
  /**
   * 检查用户是否满足规约
   * @param entity 用户实体
   * @returns 是否满足规约
   */
  public isSatisfiedBy(entity: User): boolean {
    return entity.isActive;
  }

  /**
   * 与另一个规约组合（AND）
   * @param other 其他规约
   * @returns 组合后的规约
   */
  public and(other: ISpecification<User>): ISpecification<User> {
    return new AndSpecification(this, other);
  }

  /**
   * 与另一个规约组合（OR）
   * @param other 其他规约
   * @returns 组合后的规约
   */
  public or(other: ISpecification<User>): ISpecification<User> {
    return new OrSpecification(this, other);
  }

  /**
   * 取反
   * @returns 取反后的规约
   */
  public not(): ISpecification<User> {
    return new NotSpecification(this);
  }
}

/**
 * 已验证邮箱用户规约
 */
export class VerifiedEmailSpecification implements ISpecification<User> {
  public isSatisfiedBy(entity: User): boolean {
    // 假设用户有 emailVerified 属性
    return (entity as any).emailVerified === true;
  }
}

// 使用规约
const activeUserSpec = new ActiveUserSpecification();
const verifiedEmailSpec = new VerifiedEmailSpecification();

// 组合规约：活跃且已验证邮箱
const activeAndVerifiedSpec = activeUserSpec.and(verifiedEmailSpec);

// 查询满足规约的用户
const activeUsers = allUsers.filter((user) =>
  activeAndVerifiedSpec.isSatisfiedBy(user),
);
```

---

## 领域服务 (Domain Service)

领域服务封装跨实体的业务逻辑。

### 示例：用户验证服务

```typescript
import { DomainService } from "@hl8/domain-kernel";
import { EntityId } from "@hl8/domain-kernel";
import { User } from "./aggregates/user.js";
import { Email } from "./value-objects/email.js";
import { IUserRepository } from "./interfaces/user-repository.interface.js";

/**
 * 用户验证服务
 * @description 提供用户相关的验证逻辑，跨聚合的业务逻辑
 */
export class UserValidationService extends DomainService {
  private readonly userRepository: IUserRepository;

  constructor(userRepository: IUserRepository, serviceId?: EntityId) {
    super(serviceId);
    this.userRepository = userRepository;
  }

  /**
   * 验证邮箱是否可用
   * @param email 邮箱值对象
   * @returns 如果邮箱可用返回 true
   */
  public async isEmailAvailable(email: Email): Promise<boolean> {
    const existingUser = await this.userRepository.findByEmail(email);
    return existingUser === null;
  }

  /**
   * 验证用户是否可以激活
   * @param user 用户聚合根
   * @returns 如果用户可以激活返回 true
   */
  public async canActivateUser(user: User): Promise<boolean> {
    // 业务逻辑：用户必须有资料才能激活
    return user.profile !== null;
  }
}
```

---

## 服务协调 (Coordination)

服务协调管理多个领域服务的协作。

### 示例：用户注册协调规则

```typescript
import { ICoordinationRule, ICoordinationContext, ICoordinationResult } from "@hl8/domain-kernel";
import { DomainServiceRegistry } from "@hl8/domain-kernel";
import { UserValidationService } from "./services/user-validation-service.js";

/**
 * 用户注册协调规则
 * @description 协调用户注册过程中的多个服务
 */
export class UserRegistrationCoordinationRule implements ICoordinationRule {
  public readonly id = "user-registration-rule";
  public readonly name = "User Registration Rule";
  public readonly description = "协调用户注册流程";
  public readonly priority = 0;
  public readonly enabled = true;
  public readonly version = "1.0.0";
  public readonly createdAt: Date = new Date();
  public readonly updatedAt: Date = new Date();

  private readonly serviceRegistry: DomainServiceRegistry;

  constructor(serviceRegistry: DomainServiceRegistry) {
    this.serviceRegistry = serviceRegistry;
  }

  async execute(context: ICoordinationContext): Promise<ICoordinationResult> {
    const startTime = new Date();
    
    try {
      // 获取服务
      const validationService = this.serviceRegistry.get<UserValidationService>(
        "UserValidationService",
      );

      if (!validationService) {
        throw new Error("UserValidationService not found");
      }

      // 执行协调逻辑
      const { email } = context.operationData as { email: string };
      const emailAvailable = await validationService.isEmailAvailable(
        new Email(email),
      );

      if (!emailAvailable) {
        return {
          id: `result_${this.id}`,
          ruleId: this.id,
          contextId: context.id,
          success: false,
          data: {},
          message: "邮箱已被使用",
          startTime,
          endTime: new Date(),
          duration: Date.now() - startTime.getTime(),
          warnings: [],
          metadata: {},
          hasError: () => true,
          hasWarnings: () => false,
          getSummary: () => ({
            status: "failed",
            duration: 0,
            errorCount: 1,
            warningCount: 0,
            serviceCount: 1,
            ruleCount: 1,
            successRate: 0,
          }),
        };
      }

      return {
        id: `result_${this.id}`,
        ruleId: this.id,
        contextId: context.id,
        success: true,
        data: { emailAvailable: true },
        message: "邮箱验证通过",
        startTime,
        endTime: new Date(),
        duration: Date.now() - startTime.getTime(),
        warnings: [],
        metadata: {},
        hasError: () => false,
        hasWarnings: () => false,
        getSummary: () => ({
          status: "success",
          duration: 0,
          errorCount: 0,
          warningCount: 0,
          serviceCount: 1,
          ruleCount: 1,
          successRate: 100,
        }),
      };
    } catch (error) {
      return {
        id: `result_${this.id}`,
        ruleId: this.id,
        contextId: context.id,
        success: false,
        data: {},
        message: `协调失败: ${error instanceof Error ? error.message : String(error)}`,
        startTime,
        endTime: new Date(),
        duration: Date.now() - startTime.getTime(),
        warnings: [],
        metadata: {},
        error: error instanceof Error ? error : new Error(String(error)),
        hasError: () => true,
        hasWarnings: () => false,
        getSummary: () => ({
          status: "failed",
          duration: 0,
          errorCount: 1,
          warningCount: 0,
          serviceCount: 0,
          ruleCount: 1,
          successRate: 0,
        }),
      };
    }
  }

  // ... 其他必需的方法实现
  validate(): ValidationResult { /* ... */ }
  isApplicable(context: ICoordinationContext): boolean { return true; }
  getDependencies(): string[] { return []; }
  getMetadata() { /* ... */ }
}
```

---

## 业务操作 (Business Operation)

业务操作封装可验证、可监控的业务操作。

### 示例：激活用户操作

```typescript
import {
  IBusinessOperation,
  OperationParameters,
  OperationResult,
  OperationContext,
  ValidationResult,
  BusinessOperationType,
} from "@hl8/domain-kernel";
import { User } from "./aggregates/user.js";

/**
 * 激活用户业务操作
 * @description 负责激活用户账户的业务操作
 */
export class ActivateUserOperation implements IBusinessOperation<User> {
  public readonly id = "activateUser";
  public readonly name = "Activate User";
  public readonly description = "激活用户账户";
  public readonly version = "1.0.0";
  public readonly type = BusinessOperationType.MUTATION;
  public readonly enabled = true;
  public readonly createdAt: Date = new Date();
  public readonly updatedAt: Date = new Date();

  /**
   * 验证操作参数
   * @param parameters 操作参数
   * @param aggregate 聚合根
   * @returns 验证结果
   */
  public validateParameters(
    parameters: OperationParameters,
    aggregate: User | null,
  ): ValidationResult {
    // 实现验证逻辑
    if (!aggregate) {
      return {
        isValid: false,
        errors: [{ message: "用户不存在", code: "USER_NOT_FOUND" }],
        // ... 其他字段
      };
    }

    return {
      isValid: true,
      errors: [],
      warnings: [],
      info: [],
      executionTime: 0,
      rulesExecuted: 0,
      fieldsValidated: 0,
      hasErrors: () => false,
      hasWarnings: () => false,
      hasInfo: () => false,
      getAllMessages: () => [],
      getMessagesByLevel: () => [],
      getErrorsForField: () => [],
      getErrorsForRule: () => [],
      merge: () => ({} as ValidationResult),
      toJSON: () => ({}),
      toString: () => "",
    };
  }

  /**
   * 检查前置条件
   * @param aggregate 聚合根
   * @param parameters 操作参数
   * @returns 验证结果
   */
  public checkPreconditions(
    aggregate: User,
    parameters: OperationParameters,
  ): ValidationResult {
    // 实现前置条件检查
    if (aggregate.isActive) {
      return {
        isValid: false,
        errors: [{ message: "用户已激活", code: "USER_ALREADY_ACTIVE" }],
        // ... 其他字段
      };
    }

    return { /* ... 成功验证结果 */ };
  }

  /**
   * 执行操作
   * @param aggregate 聚合根
   * @param parameters 操作参数
   * @param context 操作上下文
   * @returns 操作结果
   */
  public async execute(
    aggregate: User,
    parameters: OperationParameters,
    context: OperationContext,
  ): Promise<OperationResult> {
    // 执行激活逻辑
    return {
      id: `result_${context.id}`,
      operationId: this.id,
      contextId: context.id,
      success: true,
      data: {
        userId: aggregate.id.value,
        activatedAt: new Date().toISOString(),
      },
      timestamp: new Date(),
    };
  }

  /**
   * 检查后置条件
   * @param aggregate 聚合根
   * @param result 操作结果
   * @returns 验证结果
   */
  public checkPostconditions(
    aggregate: User,
    result: OperationResult,
  ): ValidationResult {
    // 实现后置条件检查
    return { /* ... 成功验证结果 */ };
  }

  /**
   * 获取操作依赖
   * @returns 依赖的操作ID列表
   */
  public getDependencies(): string[] {
    return [];
  }
}
```

---

## 事件处理 (Event Processing)

事件处理系统管理领域事件的发布和处理。

### 示例：用户创建事件处理器

```typescript
import {
  IDomainEventHandler,
  EventHandlerMetadata,
  EventHandlerResult,
  EventHandlerContext,
} from "@hl8/domain-kernel";
import { DomainEvent } from "@hl8/domain-kernel";
import { UserCreatedEvent } from "./events/user-created-event.js";

/**
 * 用户创建事件处理器
 * @description 处理用户创建事件，例如发送欢迎邮件
 */
export class UserCreatedEventHandler implements IDomainEventHandler {
  /**
   * 处理事件
   * @param event 领域事件
   * @param context 处理器上下文
   * @returns 处理结果
   */
  public async handle(
    event: DomainEvent,
    context: EventHandlerContext,
  ): Promise<EventHandlerResult> {
    try {
      const userCreatedEvent = event as UserCreatedEvent;
      const email = (userCreatedEvent.data as { email: string }).email;

      // 处理逻辑（例如发送欢迎邮件）
      console.log(`发送欢迎邮件给: ${email}`);

      return {
        success: true,
        message: "欢迎邮件发送成功",
        processedAt: new Date(),
        metadata: {
          email,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: `处理失败: ${error instanceof Error ? error.message : String(error)}`,
        error: error instanceof Error ? error : new Error(String(error)),
        processedAt: new Date(),
      };
    }
  }

  /**
   * 获取处理器元数据
   * @returns 元数据
   */
  public getMetadata(): EventHandlerMetadata {
    return {
      eventType: "UserCreated",
      priority: 100,
      enabled: true,
      description: "处理用户创建事件，发送欢迎邮件",
      tags: ["user", "notification"],
      timeout: 5000,
      retryPolicy: {
        maxRetries: 3,
        retryDelay: 1000,
      },
    };
  }
}
```

### 使用事件处理器

```typescript
import { EventProcessor, EventRegistry } from "@hl8/domain-kernel";

// 创建事件注册表
const eventRegistry = new EventRegistry();

// 注册事件处理器
eventRegistry.registerHandler(new UserCreatedEventHandler());

// 创建事件处理器
const eventProcessor = new EventProcessor(eventRegistry, {
  continueOnError: true,
  processByPriority: true,
  defaultTimeout: 5000,
  enableRetry: true,
  maxRetries: 3,
  retryDelay: 1000,
});

// 处理事件
const event = new UserCreatedEvent(userId, email.value);
const results = await eventProcessor.processEvent(event);

results.forEach((result) => {
  if (result.success) {
    console.log(`事件处理成功: ${result.message}`);
  } else {
    console.error(`事件处理失败: ${result.error?.message}`);
  }
});
```

---

## 异常处理

使用统一的异常处理体系。

### 示例：业务异常处理

```typescript
import { ExceptionHandler, BusinessException } from "@hl8/domain-kernel";

// 方式1：使用异常处理工具转换错误
try {
  // 业务逻辑
  await userRepository.save(user);
} catch (error) {
  throw ExceptionHandler.toDomainException(
    error,
    "USER_SAVE_ERROR",
    ExceptionHandler.createErrorContext("saveUser", {
      userId: user.id.value,
    }),
    "保存用户失败",
  );
}

// 方式2：直接抛出业务异常
if (!user.isActive) {
  throw new BusinessException(
    "用户未激活，无法执行此操作",
    "USER_NOT_ACTIVE",
    {
      userId: user.id.value,
    },
  );
}

// 方式3：使用包装器
const result = await ExceptionHandler.wrapAsync(
  async () => {
    return await userRepository.save(user);
  },
  "USER_SAVE_ERROR",
  { userId: user.id.value },
);
```

---

## 完整示例

### 用户注册完整流程

```typescript
import { UserFactory } from "./factories/user-factory.js";
import { BusinessRuleManager } from "@hl8/domain-kernel";
import { OperationManager } from "@hl8/domain-kernel";
import { CoordinationManager } from "@hl8/domain-kernel";
import { EventProcessor, EventRegistry } from "@hl8/domain-kernel";
import { IUserRepository } from "./interfaces/user-repository.interface.js";
import { ExceptionHandler } from "@hl8/domain-kernel";

/**
 * 用户注册服务（应用层使用示例）
 */
export class UserRegistrationService {
  private readonly userFactory: UserFactory;
  private readonly userRepository: IUserRepository;
  private readonly ruleManager: BusinessRuleManager<User>;
  private readonly operationManager: OperationManager;
  private readonly coordinationManager: CoordinationManager;
  private readonly eventProcessor: EventProcessor;

  constructor(
    userFactory: UserFactory,
    userRepository: IUserRepository,
    ruleManager: BusinessRuleManager<User>,
    operationManager: OperationManager,
    coordinationManager: CoordinationManager,
    eventProcessor: EventProcessor,
  ) {
    this.userFactory = userFactory;
    this.userRepository = userRepository;
    this.ruleManager = ruleManager;
    this.operationManager = operationManager;
    this.coordinationManager = coordinationManager;
    this.eventProcessor = eventProcessor;
  }

  /**
   * 注册新用户
   * @param email 邮箱
   * @param password 密码
   * @returns 注册结果
   */
  public async registerUser(
    email: string,
    password: string,
  ): Promise<{ success: boolean; userId?: string; error?: string }> {
    try {
      // 1. 使用工厂创建用户
      const user = this.userFactory.create({
        email,
        password,
      });

      // 2. 业务规则验证
      const validationResult = this.ruleManager.validateEntity(user, {
        entityType: "User",
        entityId: user.id.value,
      });

      if (!validationResult.isValid) {
        const errors = validationResult.violations
          .map((v) => v.message)
          .join(", ");
        return { success: false, error: errors };
      }

      // 3. 服务协调（例如验证邮箱可用性）
      const coordinationContext = this.coordinationManager
        .createContext("registerUser", { email }, ["UserValidationService"])
        .build();

      const coordinationResults =
        await this.coordinationManager.executeCoordination(coordinationContext);

      if (!coordinationResults.every((r) => r.success)) {
        return {
          success: false,
          error: "服务协调失败",
        };
      }

      // 4. 执行业务操作（如果需要）
      // const operationResult = await this.operationManager.executeOperation(...);

      // 5. 保存用户
      await this.userRepository.save(user);

      // 6. 处理领域事件
      const events = user.getDomainEvents();
      for (const event of events) {
        await this.eventProcessor.processEvent(event);
      }

      return {
        success: true,
        userId: user.id.value,
      };
    } catch (error) {
      // 统一异常处理
      const domainException = ExceptionHandler.toDomainException(
        error,
        "USER_REGISTRATION_ERROR",
        ExceptionHandler.createErrorContext("registerUser", {
          email,
        }),
        "用户注册失败",
      );

      return {
        success: false,
        error: domainException.message,
      };
    }
  }
}
```

---

## 最佳实践

### 1. 值对象设计

- ✅ **总是验证**: 构造函数中验证所有输入
- ✅ **不可变**: 创建后不能修改
- ✅ **业务语义**: 命名应该体现业务概念
- ❌ **避免原始类型**: 不要直接使用 `string`、`number`，创建值对象

### 2. 聚合根设计

- ✅ **最小聚合**: 聚合应该尽可能小
- ✅ **通过标识符引用**: 不同聚合之间通过ID引用，不要直接引用对象
- ✅ **事务边界**: 一个事务只修改一个聚合根
- ✅ **协调而非执行**: 聚合根协调操作，不直接执行业务逻辑

### 3. 领域事件设计

- ✅ **表达业务意图**: 事件名称应该表达业务含义
- ✅ **包含足够信息**: 事件数据应该包含处理所需的所有信息
- ✅ **不可变**: 事件创建后不可修改
- ✅ **幂等性**: 事件处理应该是幂等的

### 4. 业务规则设计

- ✅ **可组合**: 规则应该可以组合使用
- ✅ **可配置**: 规则应该可以启用/禁用
- ✅ **有优先级**: 规则应该有明确的优先级
- ✅ **单一职责**: 每个规则只负责一个验证点

### 5. 异常处理

- ✅ **使用领域异常**: 使用 `BusinessException` 或 `SystemException`
- ✅ **提供上下文**: 异常应该包含足够的上下文信息
- ✅ **统一处理**: 使用 `ExceptionHandler` 统一处理错误
- ✅ **区分业务和系统异常**: 正确区分业务异常和系统异常

### 6. 测试策略

- ✅ **单元测试**: 为每个领域对象编写单元测试
- ✅ **集成测试**: 测试多个模式的协同工作
- ✅ **性能测试**: 对关键路径进行性能测试
- ✅ **边界测试**: 测试边界条件和异常情况

---

## 总结

本文档以用户管理为例，展示了如何使用 `@hl8/domain-kernel` 进行领域层开发。关键要点：

1. **分层清晰**: 领域层独立于其他层
2. **模式完整**: 充分利用各种 DDD 模式
3. **类型安全**: 充分利用 TypeScript 类型系统
4. **可测试性**: 领域层易于测试
5. **可维护性**: 代码结构清晰，易于维护

### 下一步

- 阅读 [MIGRATION.md](./MIGRATION.md) 了解迁移指南
- 阅读 [README.md](./README.md) 了解完整的 API 文档
- 查看测试文件了解实际使用示例
- 根据本文档开始开发你的业务模块

**祝你开发顺利！** 🚀
