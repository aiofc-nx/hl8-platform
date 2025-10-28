# Clean Architecture中领域层支持基础设施层的机制

## 📋 文档概述

本文档详细阐述了在Clean Architecture架构模式中，领域层如何通过定义接口、抽象基类、数据模型和业务规则来支持基础设施层的实现。基于hl8-platform项目中的domain-kernel和application-kernel模块的实际实现进行分析。

## 🎯 核心概念

### Clean Architecture的依赖倒置原则

在Clean Architecture中，**领域层（Domain Layer）** 通过**依赖倒置原则（Dependency Inversion Principle）** 来支持基础设施层，而不是直接依赖具体实现。这种设计确保了：

- 领域层完全独立于技术实现
- 基础设施层必须遵循领域层定义的契约
- 系统具有高度的可测试性和可维护性

## 🏗️ 领域层支持基础设施层的机制

### 1. 接口定义 (Interface Definition)

领域层通过定义接口来告诉基础设施层"必须实现什么能力"，而不是"如何实现"。

#### 示例：事件存储接口

```typescript
// 领域层定义：libs/kernel/domain-kernel/src/events/store/event-store.interface.ts
export interface IEventStore {
  /**
   * 追加事件到存储
   * @param events 要存储的事件数组
   * @returns Promise<void>
   * @throws {Error} 当存储失败时抛出异常
   */
  appendEvents(events: DomainEvent[]): Promise<void>;

  /**
   * 获取聚合根的所有事件
   * @param aggregateRootId 聚合根标识符
   * @returns Promise<DomainEvent[]> 事件数组
   * @throws {Error} 当获取失败时抛出异常
   */
  getEvents(aggregateRootId: EntityId): Promise<DomainEvent[]>;

  /**
   * 获取聚合根的事件（从指定版本开始）
   * @param aggregateRootId 聚合根标识符
   * @param fromVersion 起始版本号
   * @returns Promise<DomainEvent[]> 事件数组
   * @throws {Error} 当获取失败时抛出异常
   */
  getEventsFromVersion(aggregateRootId: EntityId, fromVersion: number): Promise<DomainEvent[]>;

  /**
   * 获取聚合根的事件（在指定时间范围内）
   * @param aggregateRootId 聚合根标识符
   * @param fromDate 开始时间
   * @param toDate 结束时间
   * @returns Promise<DomainEvent[]> 事件数组
   * @throws {Error} 当获取失败时抛出异常
   */
  getEventsInTimeRange(aggregateRootId: EntityId, fromDate: Date, toDate: Date): Promise<DomainEvent[]>;

  /**
   * 获取所有事件（按时间顺序）
   * @param limit 限制数量，可选
   * @param offset 偏移量，可选
   * @returns Promise<DomainEvent[]> 事件数组
   * @throws {Error} 当获取失败时抛出异常
   */
  getAllEvents(limit?: number, offset?: number): Promise<DomainEvent[]>;

  /**
   * 获取指定类型的事件
   * @param eventType 事件类型
   * @param limit 限制数量，可选
   * @param offset 偏移量，可选
   * @returns Promise<DomainEvent[]> 事件数组
   * @throws {Error} 当获取失败时抛出异常
   */
  getEventsByType(eventType: string, limit?: number, offset?: number): Promise<DomainEvent[]>;

  /**
   * 获取聚合根的最新版本号
   * @param aggregateRootId 聚合根标识符
   * @returns Promise<number> 最新版本号
   * @throws {Error} 当获取失败时抛出异常
   */
  getLatestVersion(aggregateRootId: EntityId): Promise<number>;

  /**
   * 检查事件是否存在
   * @param eventId 事件标识符
   * @returns Promise<boolean> 是否存在
   * @throws {Error} 当检查失败时抛出异常
   */
  eventExists(eventId: EntityId): Promise<boolean>;

  /**
   * 删除聚合根的所有事件
   * @param aggregateRootId 聚合根标识符
   * @returns Promise<void>
   * @throws {Error} 当删除失败时抛出异常
   */
  deleteEvents(aggregateRootId: EntityId): Promise<void>;

  /**
   * 清空所有事件
   * @returns Promise<void>
   * @throws {Error} 当清空失败时抛出异常
   */
  clearAllEvents(): Promise<void>;

  /**
   * 获取事件存储统计信息
   * @returns Promise<EventStoreStats> 统计信息
   * @throws {Error} 当获取失败时抛出异常
   */
  getStats(): Promise<EventStoreStats>;
}
```

### 2. 抽象基类 (Abstract Base Classes)

领域层提供抽象基类，为基础设施层提供标准化的实现模式。

#### 示例：领域服务基类

```typescript
// 领域层定义：libs/kernel/domain-kernel/src/services/base/domain-service.base.ts
export abstract class DomainService {
  private readonly _serviceId: EntityId;
  private readonly _createdAt: Date;
  private readonly _version: number;
  private readonly _dependencies: Map<string, unknown>;

  constructor(serviceId?: EntityId, version: number = 1) {
    this._serviceId = serviceId || new EntityId();
    this._createdAt = new Date();
    this._version = version;
    this._dependencies = new Map();
    this.validateService();
  }

  /**
   * 获取服务标识符
   * @returns 服务标识符
   */
  public get serviceId(): EntityId {
    return this._serviceId.clone();
  }

  /**
   * 获取必需的依赖项列表
   * @returns 依赖项名称列表
   */
  protected abstract getRequiredDependencies(): string[];

  /**
   * 执行业务逻辑
   * @param operation 操作名称
   * @param params 操作参数
   * @returns 操作结果
   */
  protected abstract performBusinessLogic(operation: string, params: unknown): unknown;

  /**
   * 验证服务
   * @throws {Error} 当服务无效时抛出异常
   */
  protected abstract validateService(): void;

  /**
   * 比较两个服务是否相等
   * @param other 要比较的另一个服务
   * @returns 是否相等
   */
  public equals(other: DomainService | null | undefined): boolean {
    if (!other) return false;
    if (!(other instanceof DomainService)) return false;

    return this._serviceId.equals(other._serviceId) && this._version === other._version && this.constructor === other.constructor;
  }
}
```

#### 示例：实体基类

```typescript
// 领域层定义：libs/kernel/domain-kernel/src/entities/base/entity.base.ts
export abstract class Entity {
  protected readonly _id: EntityId;
  protected readonly _auditInfo: AuditInfo;
  protected readonly _lifecycleState: EntityLifecycle;
  protected readonly _version: number;

  constructor(id?: EntityId, auditInfo?: AuditInfo, lifecycleState: EntityLifecycle = EntityLifecycle.CREATED, version: number = 1) {
    this._id = id || new EntityId();
    this._auditInfo = auditInfo || new AuditInfo();
    this._lifecycleState = lifecycleState;
    this._version = version;
    this.validateEntity();
  }

  /**
   * 获取实体标识符
   * @returns 实体标识符
   */
  public get id(): EntityId {
    return this._id.clone();
  }

  /**
   * 获取审计信息
   * @returns 审计信息
   */
  public get auditInfo(): AuditInfo {
    return this._auditInfo.clone();
  }

  /**
   * 获取生命周期状态
   * @returns 生命周期状态
   */
  public get lifecycleState(): EntityLifecycle {
    return this._lifecycleState;
  }

  /**
   * 获取版本号
   * @returns 版本号
   */
  public get version(): number {
    return this._version;
  }

  /**
   * 创建实体的副本
   * @returns 新的实体实例
   */
  public abstract clone(): Entity;

  /**
   * 验证业务规则
   * @returns 是否通过验证
   */
  public abstract validateBusinessRules(): boolean;

  /**
   * 执行业务逻辑
   * @param operation 操作名称
   * @param params 操作参数
   * @returns 操作结果
   */
  public abstract executeBusinessLogic(operation: string, params: unknown): unknown;
}
```

### 3. 标准化数据模型 (Standardized Data Models)

领域层提供基础设施层使用的标准化数据结构。

#### 示例：实体标识符

```typescript
// 领域层定义：libs/kernel/domain-kernel/src/identifiers/entity-id.ts
export class EntityId {
  private readonly _value: string;

  constructor(value?: string) {
    this._value = value || UuidGenerator.generate();
    this.validateId();
  }

  /**
   * 生成新的实体标识符
   * @returns 新的实体标识符
   */
  public static generate(): EntityId {
    return new EntityId();
  }

  /**
   * 比较两个标识符是否相等
   * @param other 另一个标识符
   * @returns 是否相等
   */
  public equals(other: EntityId | null | undefined): boolean {
    if (!other) return false;
    return this._value === other._value;
  }

  /**
   * 转换为字符串
   * @returns 字符串表示
   */
  public toString(): string {
    return this._value;
  }

  /**
   * 验证标识符
   * @throws {Error} 当标识符无效时抛出异常
   */
  private validateId(): void {
    if (!this._value || this._value.trim() === "") {
      throw new Error("实体标识符不能为空");
    }
    if (!UuidGenerator.isValid(this._value)) {
      throw new Error("实体标识符格式无效");
    }
  }
}
```

#### 示例：审计信息

```typescript
// 领域层定义：libs/kernel/domain-kernel/src/audit/audit-info.ts
export class AuditInfo {
  public readonly createdAt: Date;
  public readonly updatedAt: Date;
  public readonly createdBy: string;
  public readonly updatedBy: string;
  public readonly version: number;

  constructor(createdAt?: Date, updatedAt?: Date, createdBy?: string, updatedBy?: string, version?: number) {
    this.createdAt = createdAt || new Date();
    this.updatedAt = updatedAt || this.createdAt;
    this.createdBy = createdBy || "system";
    this.updatedBy = updatedBy || this.createdBy;
    this.version = version || 1;
  }

  /**
   * 创建审计信息的副本
   * @returns 新的审计信息实例
   */
  public clone(): AuditInfo {
    return new AuditInfo(this.createdAt, this.updatedAt, this.createdBy, this.updatedBy, this.version);
  }

  /**
   * 更新审计信息
   * @param updatedBy 更新者
   * @returns 新的审计信息实例
   */
  public update(updatedBy: string): AuditInfo {
    return new AuditInfo(this.createdAt, new Date(), this.createdBy, updatedBy, this.version + 1);
  }
}
```

### 4. 业务规则和验证 (Business Rules and Validation)

领域层提供基础设施层必须遵循的业务规则和验证机制。

#### 示例：分离原则验证器

```typescript
// 领域层定义：libs/kernel/domain-kernel/src/validation/separation-validator.ts
export class SeparationValidator {
  /**
   * 验证聚合根是否符合分离原则
   * @param aggregateRoot 聚合根实例
   * @returns 验证结果
   */
  public static validateAggregateRoot(aggregateRoot: AggregateRoot): SeparationValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 验证聚合根不能直接执行业务逻辑
    if (this.hasDirectBusinessLogic(aggregateRoot)) {
      errors.push("聚合根不能直接执行业务逻辑，应通过协调操作实现");
    }

    // 验证聚合根不能直接访问外部服务
    if (this.hasExternalDependencies(aggregateRoot)) {
      errors.push("聚合根不能直接依赖外部服务");
    }

    // 验证内部实体管理
    const internalEntityValidation = this.validateInternalEntities(aggregateRoot);
    errors.push(...internalEntityValidation.errors);
    warnings.push(...internalEntityValidation.warnings);

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      timestamp: new Date(),
    };
  }

  /**
   * 验证实体是否符合分离原则
   * @param entity 实体实例
   * @returns 验证结果
   */
  public static validateEntity(entity: Entity): SeparationValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 验证实体不能直接访问外部服务
    if (this.hasExternalDependencies(entity)) {
      errors.push("实体不能直接依赖外部服务");
    }

    // 验证实体的业务规则
    if (!entity.validateBusinessRules()) {
      errors.push("实体业务规则验证失败");
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      timestamp: new Date(),
    };
  }
}
```

#### 示例：值对象验证器

```typescript
// 领域层定义：libs/kernel/domain-kernel/src/validation/value-object-validator.ts
export class ValueObjectValidator<T = unknown> {
  public readonly name: string;
  public readonly description: string;
  public readonly rules: readonly ValidationRule<T>[];
  public readonly enabled: boolean;

  constructor(name: string, description: string = "", rules: ValidationRule<T>[] = [], enabled: boolean = true) {
    this.name = name;
    this.description = description;
    this.rules = Object.freeze([...rules]);
    this.enabled = enabled;
  }

  /**
   * 执行验证
   * @param value 要验证的值对象
   * @param context 验证上下文
   * @returns 验证结果
   */
  public validate(value: T, context?: ValidationContext): ValidationResult {
    const startTime = Date.now();

    try {
      // 检查验证器是否启用
      if (!this.enabled) {
        return ValidationResultImpl.success({
          executionTime: Date.now() - startTime,
          rulesExecuted: 0,
          fieldsValidated: 1,
        });
      }

      // 如果没有规则，返回成功结果
      if (this.rules.length === 0) {
        return ValidationResultImpl.success({
          executionTime: Date.now() - startTime,
          rulesExecuted: 0,
          fieldsValidated: 1,
        });
      }

      // 按优先级排序规则
      const sortedRules = [...this.rules].sort((a, b) => a.priority - b.priority);

      // 执行所有规则
      const errors: ValidationError[] = [];
      let rulesExecuted = 0;

      for (const rule of sortedRules) {
        try {
          const ruleResult = rule.validate(value, context);
          rulesExecuted++;

          if (!ruleResult.isValid) {
            errors.push(...ruleResult.errors);
          }
        } catch (error) {
          errors.push({
            field: rule.field || "unknown",
            message: `规则执行失败: ${error instanceof Error ? error.message : String(error)}`,
            code: "RULE_EXECUTION_ERROR",
            level: ValidationErrorLevel.ERROR,
            value: value,
            rule: rule.name,
          });
        }
      }

      return new ValidationResultImpl(errors.length === 0, errors, {
        executionTime: Date.now() - startTime,
        rulesExecuted,
        fieldsValidated: 1,
      });
    } catch (error) {
      return ValidationResultImpl.error(`验证器执行失败: ${error instanceof Error ? error.message : String(error)}`, {
        executionTime: Date.now() - startTime,
        rulesExecuted: 0,
        fieldsValidated: 1,
      });
    }
  }

  /**
   * 添加验证规则
   * @param rule 验证规则
   * @returns 新的验证器实例
   */
  public addRule(rule: ValidationRule<T>): ValueObjectValidator<T> {
    const newRules = [...this.rules, rule];
    return new ValueObjectValidator(this.name, this.description, newRules, this.enabled);
  }
}
```

## 🔄 基础设施层如何利用领域层的支持

### 1. 实现领域层定义的接口

基础设施层必须实现领域层定义的接口，遵循"契约"。

```typescript
// 应用层实现：libs/kernel/application-kernel/src/events/store/event-store.impl.ts
@Injectable()
export class EventStore implements IEventStore {
  private readonly logger: Logger;
  private readonly snapshots = new Map<string, EventSnapshotClass[]>();
  private readonly events = new Map<string, DomainEvent[]>();
  private readonly statistics = new Map<string, EventStoreStatistics>();

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * 保存事件
   * @param aggregateId 聚合根ID
   * @param events 事件列表
   * @param expectedVersion 期望版本号
   * @returns 保存结果
   */
  public async saveEvents(aggregateId: EntityId, events: DomainEvent[], expectedVersion: number): Promise<EventStoreResult> {
    try {
      const aggregateKey = aggregateId.toString();
      const currentVersion = await this.getCurrentVersion(aggregateId);

      if (currentVersion !== expectedVersion) {
        return {
          success: false,
          error: `Version conflict: expected ${expectedVersion}, got ${currentVersion}`,
          eventsCount: 0,
          newVersion: currentVersion,
          timestamp: new Date(),
        };
      }

      const existingEvents = this.events.get(aggregateKey) || [];
      const newVersion = currentVersion + events.length;

      // 添加版本信息到事件
      const versionedEvents = events.map((event, index) => {
        const versionedEvent = new DomainEvent(aggregateId, event.eventType, event.data, { ...event.metadata, version: currentVersion + index + 1 }, event.eventId, event.timestamp, currentVersion + index + 1);
        return versionedEvent;
      });

      this.events.set(aggregateKey, [...existingEvents, ...versionedEvents]);

      this.logger.log(`Saved ${events.length} events for aggregate ${aggregateKey} at version ${newVersion}`);

      return {
        success: true,
        eventsCount: events.length,
        newVersion,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error("Failed to save events", {
        error,
        aggregateId: aggregateId.toString(),
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        eventsCount: 0,
        newVersion: expectedVersion,
        timestamp: new Date(),
      };
    }
  }

  // 实现其他接口方法...
}
```

### 2. 使用领域层提供的数据模型

基础设施层使用领域层定义的标准化数据结构。

```typescript
// 基础设施层使用领域层的数据模型
export class UserRepository {
  constructor(
    private readonly eventStore: IEventStore,
    private readonly logger: Logger,
  ) {}

  public async save(user: UserAggregate): Promise<void> {
    // 使用领域层提供的EntityId
    const userId = user.id.toString();

    // 使用领域层提供的AuditInfo
    const auditInfo = user.auditInfo.toJSON();

    // 使用领域层提供的领域事件
    const events = user.getDomainEvents();

    // 实现具体的持久化逻辑
    await this.eventStore.appendEvents(events);

    this.logger.log(`User ${userId} saved successfully`, {
      userId,
      version: user.version,
      eventsCount: events.length,
    });
  }

  public async findById(id: EntityId): Promise<UserAggregate | null> {
    // 使用领域层提供的EntityId
    const userId = id.toString();

    // 使用领域层提供的事件查询接口
    const events = await this.eventStore.getEvents(id);

    if (events.length === 0) {
      return null;
    }

    // 使用领域层提供的聚合根重建
    return UserAggregate.fromEvents(events);
  }
}
```

### 3. 遵循领域层定义的业务规则

基础设施层必须遵循领域层定义的业务规则和验证机制。

```typescript
// 基础设施层遵循领域层的业务规则
export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly validator: ValueObjectValidator<CreateUserData>,
    private readonly logger: Logger,
  ) {}

  public async createUser(userData: CreateUserData): Promise<UserAggregate> {
    // 使用领域层提供的验证器
    const validationResult = this.validator.validate(userData);
    if (!validationResult.isValid) {
      throw new ValidationException(validationResult.errors);
    }

    // 使用领域层提供的聚合根
    const user = new UserAggregate(userData.email, userData.name);

    // 使用领域层提供的分离原则验证
    const separationResult = SeparationValidator.validateAggregateRoot(user);
    if (!separationResult.isValid) {
      throw new BusinessException("聚合根不符合分离原则", "AGGREGATE_SEPARATION_VIOLATION", separationResult.errors);
    }

    // 保存到基础设施层
    await this.userRepository.save(user);

    this.logger.log("User created successfully", {
      userId: user.id.toString(),
      email: userData.email,
    });

    return user;
  }
}
```

## 🎯 支持机制的优势

### 1. 解耦和灵活性

- **领域层定义"做什么"**：通过接口和抽象定义能力需求
- **基础设施层决定"怎么做"**：可以自由选择技术实现
- **轻松替换实现**：可以轻松替换不同的基础设施实现（PostgreSQL → MongoDB）

### 2. 标准化和一致性

- **统一的接口契约**：所有基础设施实现都遵循相同的接口
- **一致的数据模型**：使用统一的数据结构和类型
- **统一的业务规则**：确保所有实现都遵循相同的领域规则

### 3. 可测试性

- **接口契约作为测试规范**：可以基于接口创建测试用例
- **领域逻辑独立测试**：可以独立测试领域逻辑，不依赖具体实现
- **模拟实现**：可以轻松创建测试用的基础设施实现

### 4. 类型安全

- **编译时类型检查**：通过TypeScript提供编译时类型安全
- **接口约束**：确保实现类必须实现所有接口方法
- **数据模型约束**：确保使用正确的数据结构和类型

## 📊 架构层次关系图

```
┌─────────────────────────────────────────────────────────────┐
│                    基础设施层 (Infrastructure)                │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐  │
│  │   PostgreSQL    │  │    MongoDB      │  │   Redis      │  │
│  │   EventStore    │  │   EventStore    │  │   Cache      │  │
│  └─────────────────┘  └─────────────────┘  └──────────────┘  │
│           │                    │                    │        │
│           └────────────────────┼────────────────────┘        │
│                                │                             │
│          实现领域层定义的接口     │                             │
│          使用领域层的数据模型     │                             │
│          遵循领域层的业务规则     │                             │
└─────────────────────────────────┼─────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────┐
│                    应用层 (Application)                      │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐  │
│  │   Command       │  │     Query       │  │   Event      │  │
│  │   Handlers      │  │    Handlers     │  │  Handlers    │  │
│  └─────────────────┘  └─────────────────┘  └──────────────┘  │
│           │                    │                    │        │
│           └────────────────────┼────────────────────┘        │
│                                │                             │
│          使用领域层的服务        │                             │
│          协调领域层的对象        │                             │
└─────────────────────────────────┼─────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────┐
│                    领域层 (Domain)                          │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐  │
│  │   接口定义       │  │   抽象基类       │  │   数据模型    │  │
│  │  IEventStore    │  │  DomainService  │  │   EntityId   │  │
│  │  IRepository    │  │     Entity      │  │  AuditInfo   │  │
│  └─────────────────┘  └─────────────────┘  └──────────────┘  │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐  │
│  │   业务规则       │  │   验证机制       │  │   领域事件    │  │
│  │ SeparationValidator │ ValueObjectValidator │ DomainEvent │  │
│  └─────────────────┘  └─────────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## 🔧 实际应用示例

### 示例1：事件存储的多种实现

```typescript
// 领域层定义接口
export interface IEventStore {
  appendEvents(events: DomainEvent[]): Promise<void>;
  getEvents(aggregateRootId: EntityId): Promise<DomainEvent[]>;
}

// PostgreSQL实现
@Injectable()
export class PostgreSQLEventStore implements IEventStore {
  constructor(private readonly dataSource: DataSource) {}

  async appendEvents(events: DomainEvent[]): Promise<void> {
    // PostgreSQL具体实现
  }

  async getEvents(aggregateRootId: EntityId): Promise<DomainEvent[]> {
    // PostgreSQL具体实现
  }
}

// MongoDB实现
@Injectable()
export class MongoEventStore implements IEventStore {
  constructor(private readonly mongoClient: MongoClient) {}

  async appendEvents(events: DomainEvent[]): Promise<void> {
    // MongoDB具体实现
  }

  async getEvents(aggregateRootId: EntityId): Promise<DomainEvent[]> {
    // MongoDB具体实现
  }
}

// 混合存储实现
@Injectable()
export class HybridEventStore implements IEventStore {
  constructor(
    private readonly postgresStore: PostgreSQLEventStore,
    private readonly mongoStore: MongoEventStore,
  ) {}

  async appendEvents(events: DomainEvent[]): Promise<void> {
    // 根据事件类型选择存储方式
    const postgresEvents = events.filter((e) => e.eventType.startsWith("user."));
    const mongoEvents = events.filter((e) => e.eventType.startsWith("system."));

    await Promise.all([this.postgresStore.appendEvents(postgresEvents), this.mongoStore.appendEvents(mongoEvents)]);
  }

  async getEvents(aggregateRootId: EntityId): Promise<DomainEvent[]> {
    // 从两个存储中获取事件并合并
    const [postgresEvents, mongoEvents] = await Promise.all([this.postgresStore.getEvents(aggregateRootId), this.mongoStore.getEvents(aggregateRootId)]);

    return [...postgresEvents, ...mongoEvents].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }
}
```

### 示例2：领域服务的多种实现

```typescript
// 领域层定义抽象基类
export abstract class DomainService {
  protected abstract performBusinessLogic(operation: string, params: unknown): unknown;
}

// 用户服务实现
export class UserDomainService extends DomainService {
  protected performBusinessLogic(operation: string, params: unknown): unknown {
    switch (operation) {
      case "validateEmail":
        return this.validateEmail(params as string);
      case "generateUserId":
        return EntityId.generate();
      default:
        throw new Error(`Unknown operation: ${operation}`);
    }
  }

  private validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}

// 订单服务实现
export class OrderDomainService extends DomainService {
  protected performBusinessLogic(operation: string, params: unknown): unknown {
    switch (operation) {
      case "calculateTotal":
        return this.calculateTotal(params as OrderItem[]);
      case "validateOrder":
        return this.validateOrder(params as Order);
      default:
        throw new Error(`Unknown operation: ${operation}`);
    }
  }

  private calculateTotal(items: OrderItem[]): number {
    return items.reduce((total, item) => total + item.price * item.quantity, 0);
  }

  private validateOrder(order: Order): boolean {
    return order.items.length > 0 && order.total > 0;
  }
}
```

## 📋 最佳实践

### 1. 接口设计原则

- **单一职责**：每个接口只负责一个特定的功能领域
- **最小化接口**：只定义必要的方法，避免过度设计
- **清晰的命名**：使用清晰、描述性的方法名
- **完整的文档**：为每个方法提供详细的TSDoc注释

### 2. 抽象基类设计

- **提供通用功能**：在基类中实现通用的、可复用的功能
- **定义抽象方法**：让子类实现特定的业务逻辑
- **验证和约束**：在基类中提供验证和约束机制
- **生命周期管理**：提供创建、更新、销毁等生命周期管理

### 3. 数据模型设计

- **不可变性**：值对象应该是不可变的
- **类型安全**：使用TypeScript提供编译时类型检查
- **验证机制**：内置数据验证和约束
- **序列化支持**：提供JSON序列化和反序列化能力

### 4. 业务规则设计

- **可配置性**：业务规则应该是可配置的
- **可扩展性**：支持添加新的业务规则
- **可测试性**：业务规则应该易于测试
- **性能考虑**：避免复杂的业务规则影响性能

## 🎯 总结

Clean Architecture中领域层通过以下机制支持基础设施层：

1. **接口定义** - 定义基础设施层必须实现的能力契约
2. **抽象基类** - 提供标准化的实现模式和通用功能
3. **数据模型** - 提供标准化的数据结构和类型
4. **业务规则** - 定义基础设施层必须遵循的领域规则
5. **验证机制** - 提供数据验证和约束机制

这种设计确保了：

- ✅ **领域层完全独立** - 不依赖任何基础设施实现
- ✅ **基础设施层灵活** - 可以自由选择技术实现
- ✅ **架构原则一致** - 所有实现都遵循相同的契约
- ✅ **易于测试和维护** - 清晰的职责分离和依赖关系

通过这种机制，我们能够构建出既灵活又稳定的企业级应用架构，为hl8-platform项目提供了坚实的架构基础。
