# 领域层对应用层的支持作用 - 培训文档

## 📋 目录

1. [概述](#概述)
2. [架构关系](#架构关系)
3. [核心支持组件](#核心支持组件)
4. [应用层使用模式](#应用层使用模式)
5. [实际应用示例](#实际应用示例)
6. [最佳实践](#最佳实践)
7. [总结](#总结)

---

## 概述

本文档阐述 `@hl8/domain-kernel`（领域层核心模块）对 `@hl8/application-kernel`（应用层核心模块）的支持作用，帮助开发者理解领域层如何为应用层提供坚实的基础和业务能力。

### 核心观点

- **领域层是应用层的基础**：应用层依赖于领域层提供的核心抽象和业务能力
- **依赖倒置原则**：领域层定义接口，应用层实现用例编排，符合 Clean Architecture 的依赖方向
- **业务逻辑分离**：领域层封装业务规则和业务逻辑，应用层负责用例编排和流程协调
- **类型安全**：领域层提供完整的类型定义，确保应用层使用时的类型安全

---

## 架构关系

### Clean Architecture 分层

```
┌─────────────────────────────────────┐
│      Interface Layer                │  接口层：API、DTO
├─────────────────────────────────────┤
│      Application Layer              │  应用层：用例编排（本模块）
│      ↓ 依赖                         │
│      @hl8/application-kernel       │
├─────────────────────────────────────┤
│      Domain Layer                   │  领域层：业务逻辑（本文档重点）
│      ↓ 提供支持                     │
│      @hl8/domain-kernel             │
├─────────────────────────────────────┤
│      Infrastructure Layer           │  基础设施层：技术实现
└─────────────────────────────────────┘
```

### 依赖关系

**领域层 (Domain Layer)**:
- ✅ **独立性强**：不依赖任何外部框架或基础设施
- ✅ **业务聚焦**：专注于业务规则和业务逻辑
- ✅ **接口定义**：定义核心抽象和接口

**应用层 (Application Layer)**:
- ✅ **依赖领域层**：通过 `@hl8/domain-kernel` 获取核心能力
- ✅ **用例编排**：编排业务用例，协调领域对象
- ✅ **框架集成**：基于 NestJS、CQRS 等框架

### 支持关系图谱

```
领域层 (domain-kernel)
├── 核心抽象
│   ├── EntityId ────────────────→ 应用层命令/查询中的标识符
│   ├── DomainEvent ──────────────→ 应用层事件系统中的领域事件
│   ├── TenantContext ────────────→ 应用层租户上下文提取和管理
│   └── AggregateRoot ────────────→ 应用层聚合根操作和管理
│
├── DDD 模式
│   ├── IRepository ──────────────→ 应用层仓储接口定义
│   ├── IFactory ──────────────────→ 应用层对象创建
│   ├── ISpecification ────────────→ 应用层业务规则查询
│   └── BusinessRuleManager ───────→ 应用层业务规则验证
│
├── 服务管理
│   ├── DomainService ────────────→ 应用层领域服务封装
│   ├── DomainServiceRegistry ─────→ 应用层服务注册和管理
│   ├── CoordinationManager ───────→ 应用层多服务协调
│   └── OperationManager ──────────→ 应用层业务操作管理
│
└── 基础设施
    ├── 异常体系 ───────────────────→ 应用层异常处理
    ├── 审计系统 ───────────────────→ 应用层审计跟踪
    └── 验证框架 ───────────────────→ 应用层数据验证
```

---

## 核心支持组件

### 1. 标识符系统 (Identifier System)

#### EntityId - 实体标识符

领域层提供统一的标识符生成和管理能力。

**领域层定义**:

```typescript
// @hl8/domain-kernel
export class EntityId {
  public static generate(): EntityId;
  public static fromString(value: string): EntityId;
  public toString(): string;
  public isValid(): boolean;
  public equals(other: EntityId): boolean;
}
```

**应用层使用**:

```typescript
// @hl8/application-kernel - 命令基类
import { EntityId } from "@hl8/domain-kernel";

export abstract class BaseCommand<TResult = unknown> {
  public readonly commandId: string;
  public readonly aggregateId: string;

  constructor(aggregateId: string, commandType: string, options = {}) {
    // 使用领域层的 EntityId 生成命令ID
    this.commandId = options.commandId || EntityId.generate().toString();
    this.aggregateId = aggregateId;
  }
}
```

**支持作用**:
- ✅ **统一标识符格式**：确保整个系统使用一致的标识符格式（UUID v4）
- ✅ **类型安全**：提供强类型的标识符，避免字符串误用
- ✅ **验证能力**：提供标识符有效性验证

#### 租户隔离标识符

领域层提供多层级租户隔离支持。

**领域层定义**:

```typescript
// @hl8/domain-kernel
export class TenantId extends EntityId;
export class OrganizationId extends EntityId;
export class DepartmentId extends EntityId;

export class TenantContext {
  public readonly tenantId: TenantId;
  public readonly organizationId?: OrganizationId;
  public readonly departmentId?: DepartmentId;
  
  public validate(): boolean;
  public toJSON(): Record<string, unknown>;
}
```

**应用层使用**:

```typescript
// @hl8/application-kernel - 查询基类
import { 
  EntityId, 
  TenantContext, 
  TenantId, 
  OrganizationId 
} from "@hl8/domain-kernel";

export abstract class BaseQuery<TResult = unknown> {
  public readonly tenantContext?: TenantContext;

  public getTenantId(): TenantId | undefined {
    return this.tenantContext?.tenantId;
  }

  public getOrganizationId(): OrganizationId | undefined {
    return this.tenantContext?.organizationId;
  }
}
```

**支持作用**:
- ✅ **多层级隔离**：支持租户、组织、部门三级数据隔离
- ✅ **上下文传递**：在应用层中自动传递租户上下文
- ✅ **权限控制**：为应用层的权限验证提供基础

---

### 2. 领域事件系统 (Domain Event System)

#### DomainEvent - 领域事件基类

领域层提供统一的事件定义和处理能力。

**领域层定义**:

```typescript
// @hl8/domain-kernel
export class DomainEvent {
  public readonly eventId: EntityId;
  public readonly aggregateRootId: EntityId;
  public readonly eventType: string;
  public readonly data: unknown;
  public readonly metadata: Record<string, unknown>;
  public readonly timestamp: Date;
  public readonly version: number;
  
  public toJSON(): Record<string, unknown>;
  public clone(): DomainEvent;
}
```

**应用层使用**:

```typescript
// @hl8/application-kernel - 领域事件包装
import { DomainEvent as BaseDomainEvent, EntityId } from "@hl8/domain-kernel";

export class DomainEvent extends BaseDomainEvent {
  constructor(
    aggregateRootId: EntityId,
    eventType: string,
    data: unknown,
    metadata: Record<string, unknown> = {},
    eventId?: EntityId,
    timestamp?: Date,
    version: number = 1,
  ) {
    super(aggregateRootId, eventType, data, metadata, eventId, timestamp, version);
  }
  
  public toJSON(): Record<string, unknown>;
  public clone(): DomainEvent;
}
```

**应用层事件存储**:

```typescript
// @hl8/application-kernel - 事件存储实现
import { EntityId, DomainEvent as DomainEventBase } from "@hl8/domain-kernel";

export class EventStore {
  async saveEvents(
    aggregateId: EntityId,
    events: DomainEventBase[],
    expectedVersion: number
  ): Promise<void>;
  
  async getEvents(aggregateId: EntityId): Promise<DomainEventBase[]>;
}
```

**支持作用**:
- ✅ **事件标准化**：提供统一的事件格式和结构
- ✅ **事件溯源支持**：为事件溯源提供基础数据结构
- ✅ **事件版本管理**：支持事件版本控制和演化

---

### 3. 聚合根管理 (Aggregate Root Management)

#### AggregateRoot - 聚合根基类

领域层提供聚合根的核心能力。

**领域层定义**:

```typescript
// @hl8/domain-kernel
export abstract class AggregateRoot {
  protected readonly _id: EntityId;
  protected readonly _auditInfo: AuditInfo;
  protected readonly _lifecycle: EntityLifecycle;
  protected readonly _version: number;
  private _domainEvents: DomainEvent[] = [];
  
  // 领域事件管理
  protected addDomainEvent(event: DomainEvent): void;
  public getDomainEvents(): DomainEvent[];
  public clearDomainEvents(): void;
  
  // 业务操作协调（实体-聚合分离原则）
  protected abstract performCoordination(operation: string, params: unknown): unknown;
  protected abstract performBusinessInvariantValidation(): boolean;
}
```

**应用层使用**:

```typescript
// @hl8/application-kernel - 用例中使用聚合根
import { AggregateRoot, EntityId, IRepository } from "@hl8/domain-kernel";

export class CreateUserUseCase {
  constructor(
    private readonly userRepository: IRepository<User>,
    private readonly userFactory: IFactory<User>
  ) {}

  async execute(input: CreateUserInput): Promise<CreateUserOutput> {
    // 1. 使用领域层工厂创建聚合根
    const user = this.userFactory.create({
      email: input.email,
      password: input.password,
    });

    // 2. 业务规则验证（使用领域层能力）
    const validationResult = await this.validateBusinessRules(user);
    if (!validationResult.isValid) {
      throw new UseCaseValidationException(/* ... */);
    }

    // 3. 保存聚合根（通过领域层仓储接口）
    await this.userRepository.save(user);

    // 4. 发布领域事件（从聚合根获取）
    const events = user.getDomainEvents();
    await this.eventBus.publishAll(events);

    return new CreateUserOutput(user.id.value);
  }
}
```

**支持作用**:
- ✅ **业务逻辑封装**：聚合根封装核心业务逻辑
- ✅ **事件管理**：自动管理领域事件的产生和发布
- ✅ **不变性验证**：确保业务不变量的满足

---

### 4. 仓储模式接口 (Repository Pattern Interfaces)

#### IRepository - 仓储接口

领域层定义仓储的抽象接口，应用层通过接口使用仓储。

**领域层定义**:

```typescript
// @hl8/domain-kernel
export interface IRepository<T extends AggregateRoot> {
  findById(id: EntityId): Promise<T | null>;
  save(aggregate: T): Promise<void>;
  delete(id: EntityId): Promise<void>;
}

export interface ITenantIsolatedRepository<T extends TenantIsolatedAggregateRoot> 
  extends IRepository<T> {
  findByIdWithContext(id: EntityId, context: TenantContext): Promise<T | null>;
  findAllByContext(context: TenantContext): Promise<T[]>;
  belongsToTenant(id: EntityId, tenantId: TenantId): Promise<boolean>;
}
```

**应用层使用**:

```typescript
// @hl8/application-kernel - 用例中使用仓储
import { 
  IRepository, 
  ITenantIsolatedRepository,
  TenantContext 
} from "@hl8/domain-kernel";

export class UpdateProductUseCase {
  constructor(
    private readonly productRepository: ITenantIsolatedRepository<Product>
  ) {}

  async execute(input: UpdateProductInput): Promise<UpdateProductOutput> {
    // 从命令中提取租户上下文
    const tenantContext = input.tenantContext;
    
    // 使用租户隔离仓储查找聚合根
    const product = await this.productRepository.findByIdWithContext(
      EntityId.fromString(input.productId),
      tenantContext
    );

    if (!product) {
      throw new EntityNotFoundException(/* ... */);
    }

    // 执行业务操作
    product.update(input.name, input.price);

    // 保存聚合根
    await this.productRepository.save(product);

    return new UpdateProductOutput(product.id.value);
  }
}
```

**支持作用**:
- ✅ **持久化抽象**：应用层不关心具体的持久化实现
- ✅ **租户隔离**：自动处理多层级数据隔离
- ✅ **接口契约**：定义清晰的仓储契约

---

### 5. 业务规则验证 (Business Rule Validation)

#### BusinessRuleManager - 业务规则管理器

领域层提供业务规则验证框架。

**领域层定义**:

```typescript
// @hl8/domain-kernel
export interface BusinessRule<T> {
  readonly name: string;
  readonly priority: number;
  validate(entity: T): BusinessRuleValidationResult;
  isApplicable(entity: unknown): boolean;
}

export class BusinessRuleManager<T> {
  registerRule(rule: BusinessRule<T>): void;
  validateEntity(
    entity: T, 
    context: BusinessRuleValidationContext
  ): BusinessRuleValidationResult;
}
```

**应用层使用**:

```typescript
// @hl8/application-kernel - 用例中验证业务规则
import { 
  BusinessRuleManager, 
  BusinessRuleValidationContext 
} from "@hl8/domain-kernel";

export class CreateOrderUseCase {
  constructor(
    private readonly orderRepository: IRepository<Order>,
    private readonly ruleManager: BusinessRuleManager<Order>
  ) {}

  async execute(input: CreateOrderInput): Promise<CreateOrderOutput> {
    const order = this.orderFactory.create({
      customerId: input.customerId,
      items: input.items,
    });

    // 使用领域层业务规则管理器验证
    const validationResult = this.ruleManager.validateEntity(order, {
      entityType: "Order",
      entityId: order.id.value,
    });

    if (!validationResult.isValid) {
      const errors = validationResult.violations
        .map(v => v.message)
        .join(", ");
      throw new UseCaseValidationException(errors, /* ... */);
    }

    await this.orderRepository.save(order);
    return new CreateOrderOutput(order.id.value);
  }
}
```

**支持作用**:
- ✅ **规则集中管理**：业务规则统一管理和执行
- ✅ **规则组合**：支持复杂的规则组合和优先级
- ✅ **可扩展性**：易于添加新的业务规则

---

### 6. 工厂模式接口 (Factory Pattern Interfaces)

#### IFactory - 工厂接口

领域层提供对象创建的抽象接口。

**领域层定义**:

```typescript
// @hl8/domain-kernel
export interface IFactory<T, TConfig = unknown> {
  create(config: TConfig): T;
  validateConfig(config: TConfig): boolean;
}
```

**应用层使用**:

```typescript
// @hl8/application-kernel - 用例中使用工厂
import { IFactory } from "@hl8/domain-kernel";

export class RegisterUserUseCase {
  constructor(
    private readonly userFactory: IFactory<User, UserFactoryConfig>,
    private readonly userRepository: IRepository<User>
  ) {}

  async execute(input: RegisterUserInput): Promise<RegisterUserOutput> {
    // 使用领域层工厂创建聚合根
    const user = this.userFactory.create({
      email: input.email,
      password: input.password,
    });

    await this.userRepository.save(user);
    return new RegisterUserOutput(user.id.value);
  }
}
```

**支持作用**:
- ✅ **复杂对象创建**：封装复杂的对象创建逻辑
- ✅ **配置验证**：在创建前验证配置的有效性
- ✅ **创建逻辑集中**：将创建逻辑集中在领域层

---

### 7. 规约模式 (Specification Pattern)

#### ISpecification - 规约接口

领域层提供可组合的业务规则查询。

**领域层定义**:

```typescript
// @hl8/domain-kernel
export interface ISpecification<T> {
  isSatisfiedBy(entity: T): boolean;
  and(other: ISpecification<T>): ISpecification<T>;
  or(other: ISpecification<T>): ISpecification<T>;
  not(): ISpecification<T>;
}
```

**应用层使用**:

```typescript
// @hl8/application-kernel - 查询中使用规约
import { ISpecification } from "@hl8/domain-kernel";

export class FindActiveUsersQuery {
  constructor(
    private readonly userRepository: IRepository<User>
  ) {}

  async execute(input: FindActiveUsersInput): Promise<FindActiveUsersOutput> {
    // 使用领域层规约模式查询
    const activeUserSpec = new ActiveUserSpecification();
    const verifiedEmailSpec = new VerifiedEmailSpecification();
    
    // 组合规约
    const combinedSpec = activeUserSpec.and(verifiedEmailSpec);

    // 在仓储中应用规约（仓储实现会处理）
    const users = await this.userRepository.findBySpecification(combinedSpec);

    return new FindActiveUsersOutput(users.map(u => u.id.value));
  }
}
```

**支持作用**:
- ✅ **业务规则查询**：提供声明式的业务规则查询
- ✅ **规约组合**：支持 AND、OR、NOT 等组合操作
- ✅ **可复用性**：规约可以在多处复用

---

### 8. 服务协调 (Service Coordination)

#### CoordinationManager - 协调管理器

领域层提供多领域服务协调能力。

**领域层定义**:

```typescript
// @hl8/domain-kernel
export class CoordinationManager {
  createContext(
    operationName: string,
    operationData: unknown,
    requiredServices: string[]
  ): ICoordinationContextBuilder;
  
  async executeCoordination(
    context: ICoordinationContext
  ): Promise<ICoordinationResult[]>;
}
```

**应用层使用**:

```typescript
// @hl8/application-kernel - 用例中使用服务协调
import { CoordinationManager } from "@hl8/domain-kernel";

export class ProcessOrderUseCase {
  constructor(
    private readonly coordinationManager: CoordinationManager,
    private readonly orderRepository: IRepository<Order>
  ) {}

  async execute(input: ProcessOrderInput): Promise<ProcessOrderOutput> {
    const order = await this.orderRepository.findById(
      EntityId.fromString(input.orderId)
    );

    // 使用领域层协调管理器协调多个服务
    const context = this.coordinationManager
      .createContext("processOrder", { orderId: order.id.value }, [
        "PaymentService",
        "InventoryService",
        "NotificationService"
      ])
      .build();

    const results = await this.coordinationManager.executeCoordination(context);

    if (!results.every(r => r.success)) {
      throw new UseCaseException("服务协调失败", /* ... */);
    }

    return new ProcessOrderOutput(order.id.value);
  }
}
```

**支持作用**:
- ✅ **服务编排**：协调多个领域服务的执行
- ✅ **依赖管理**：自动处理服务依赖关系
- ✅ **错误处理**：统一的错误处理和回滚机制

---

### 9. 业务操作管理 (Business Operations)

#### OperationManager - 操作管理器

领域层提供业务操作的验证和执行管理。

**领域层定义**:

```typescript
// @hl8/domain-kernel
export interface IBusinessOperation<T extends AggregateRoot> {
  readonly id: string;
  validateParameters(parameters: OperationParameters, aggregate: T | null): ValidationResult;
  checkPreconditions(aggregate: T, parameters: OperationParameters): ValidationResult;
  execute(aggregate: T, parameters: OperationParameters, context: OperationContext): Promise<OperationResult>;
}

export class OperationManager {
  registerOperation(operation: IBusinessOperation<AggregateRoot>): void;
  async executeOperation(
    operationId: string,
    aggregate: AggregateRoot,
    parameters: OperationParameters,
    context: OperationContext
  ): Promise<OperationResult>;
}
```

**应用层使用**:

```typescript
// @hl8/application-kernel - 聚合根中使用操作管理器
import { OperationManager } from "@hl8/domain-kernel";

export class User extends AggregateRoot {
  async activate(operationManager: OperationManager): Promise<{ success: boolean }> {
    const context = operationManager.createContext("activate-user").build();
    const parameters = { userId: this.id.value };

    // 使用领域层操作管理器执行操作
    const result = await operationManager.executeOperation(
      "activateUser",
      this,
      parameters,
      context
    );

    if (result.success) {
      this._isActive = true;
      this.addDomainEvent(/* ... */);
    }

    return { success: result.success };
  }
}
```

**支持作用**:
- ✅ **操作标准化**：统一业务操作的执行流程
- ✅ **验证管理**：自动执行参数验证和前置条件检查
- ✅ **监控能力**：提供操作的监控和追踪

---

### 10. 异常处理体系 (Exception Handling System)

#### 领域异常类

领域层提供完整的异常体系。

**领域层定义**:

```typescript
// @hl8/domain-kernel
export class DomainException extends Error {
  constructor(
    message: string,
    code: string,
    context?: Record<string, unknown>,
    cause?: Error
  );
}

export class BusinessException extends DomainException;
export class SystemException extends DomainException;
export class EntityNotFoundException extends DomainException;
export class ValueObjectValidationFailedException extends DomainException;
```

**应用层使用**:

```typescript
// @hl8/application-kernel - 用例中使用领域异常
import { 
  EntityNotFoundException,
  BusinessException 
} from "@hl8/domain-kernel";

export class UpdateUserUseCase {
  async execute(input: UpdateUserInput): Promise<UpdateUserOutput> {
    const user = await this.userRepository.findById(
      EntityId.fromString(input.userId)
    );

    // 使用领域层异常
    if (!user) {
      throw new EntityNotFoundException(
        "用户不存在",
        "USER_NOT_FOUND",
        { userId: input.userId }
      );
    }

    if (!user.isActive) {
      throw new BusinessException(
        "用户未激活",
        "USER_NOT_ACTIVE",
        { userId: input.userId }
      );
    }

    // ...
  }
}
```

**支持作用**:
- ✅ **异常标准化**：统一的异常类型和结构
- ✅ **上下文信息**：异常包含丰富的上下文信息
- ✅ **错误分类**：区分业务异常和系统异常

---

## 应用层使用模式

### 模式 1: 命令-处理器模式

```typescript
// 应用层：命令定义
import { EntityId, TenantContext } from "@hl8/domain-kernel";
import { BaseCommand } from "@hl8/application-kernel";

export class CreateUserCommand extends BaseCommand {
  constructor(
    public readonly email: string,
    public readonly password: string,
    tenantContext?: TenantContext
  ) {
    super(
      EntityId.generate().toString(),
      "CreateUser",
      { tenantContext }
    );
  }
}

// 应用层：命令处理器
import { IRepository, IFactory } from "@hl8/domain-kernel";
import { CommandHandler } from "@nestjs/cqrs";

@CommandHandler(CreateUserCommand)
export class CreateUserHandler {
  constructor(
    private readonly userRepository: IRepository<User>,
    private readonly userFactory: IFactory<User>
  ) {}

  async execute(command: CreateUserCommand): Promise<void> {
    const user = this.userFactory.create({
      email: command.email,
      password: command.password,
    });

    await this.userRepository.save(user);
    
    const events = user.getDomainEvents();
    await this.eventBus.publishAll(events);
  }
}
```

**领域层支持**:
- ✅ `EntityId`: 生成命令和聚合根标识符
- ✅ `TenantContext`: 传递租户上下文
- ✅ `IRepository`: 持久化聚合根
- ✅ `IFactory`: 创建聚合根
- ✅ `AggregateRoot.getDomainEvents()`: 获取领域事件

---

### 模式 2: 查询-处理器模式

```typescript
// 应用层：查询定义
import { EntityId, TenantContext } from "@hl8/domain-kernel";
import { BaseQuery } from "@hl8/application-kernel";

export class GetUserQuery extends BaseQuery<UserDto> {
  constructor(
    public readonly userId: string,
    tenantContext?: TenantContext
  ) {
    super({ tenantContext });
  }
}

// 应用层：查询处理器
import { ITenantIsolatedRepository } from "@hl8/domain-kernel";
import { QueryHandler } from "@nestjs/cqrs";

@QueryHandler(GetUserQuery)
export class GetUserHandler {
  constructor(
    private readonly userRepository: ITenantIsolatedRepository<User>
  ) {}

  async execute(query: GetUserQuery): Promise<UserDto> {
    const user = await this.userRepository.findByIdWithContext(
      EntityId.fromString(query.userId),
      query.tenantContext!
    );

    if (!user) {
      throw new EntityNotFoundException(/* ... */);
    }

    return this.mapToDto(user);
  }
}
```

**领域层支持**:
- ✅ `EntityId`: 标识符解析
- ✅ `TenantContext`: 租户隔离查询
- ✅ `ITenantIsolatedRepository`: 租户隔离仓储接口

---

### 模式 3: 用例模式

```typescript
// 应用层：用例实现
import { 
  IRepository, 
  BusinessRuleManager,
  CoordinationManager 
} from "@hl8/domain-kernel";
import { UseCase } from "@hl8/application-kernel";

export class ProcessOrderUseCase extends UseCase<
  ProcessOrderInput,
  ProcessOrderOutput
> {
  constructor(
    logger: Logger,
    private readonly orderRepository: IRepository<Order>,
    private readonly ruleManager: BusinessRuleManager<Order>,
    private readonly coordinationManager: CoordinationManager
  ) {
    super(logger);
  }

  async executeBusinessLogic(
    input: ProcessOrderInput
  ): Promise<ProcessOrderOutput> {
    // 1. 查找聚合根
    const order = await this.orderRepository.findById(
      EntityId.fromString(input.orderId)
    );

    // 2. 业务规则验证
    const validationResult = this.ruleManager.validateEntity(order, {
      entityType: "Order",
      entityId: order.id.value,
    });

    if (!validationResult.isValid) {
      throw new UseCaseValidationException(/* ... */);
    }

    // 3. 服务协调
    const context = this.coordinationManager
      .createContext("processOrder", { orderId: order.id.value }, [
        "PaymentService",
        "InventoryService"
      ])
      .build();

    const results = await this.coordinationManager.executeCoordination(context);

    // 4. 保存聚合根
    await this.orderRepository.save(order);

    // 5. 发布事件
    const events = order.getDomainEvents();
    await this.eventBus.publishAll(events);

    return new ProcessOrderOutput(order.id.value);
  }
}
```

**领域层支持**:
- ✅ `IRepository`: 聚合根持久化
- ✅ `BusinessRuleManager`: 业务规则验证
- ✅ `CoordinationManager`: 服务协调
- ✅ `AggregateRoot.getDomainEvents()`: 领域事件管理

---

### 模式 4: 事件处理器模式

```typescript
// 应用层：事件处理器
import { DomainEvent } from "@hl8/domain-kernel";
import { EventsHandler } from "@nestjs/cqrs";

@EventsHandler(UserCreatedEvent)
export class UserCreatedHandler {
  async handle(event: DomainEvent): Promise<void> {
    const userData = event.data as { email: string; userId: string };
    
    // 使用领域事件中的数据
    await this.sendWelcomeEmail(userData.email);
    await this.createUserProfile(userData.userId);
  }
}
```

**领域层支持**:
- ✅ `DomainEvent`: 统一的事件结构
- ✅ `EntityId`: 事件中的标识符

---

## 实际应用示例

### 示例 1: 用户注册完整流程

```typescript
// 领域层：用户聚合根
import { AggregateRoot, EntityId, DomainEvent } from "@hl8/domain-kernel";

export class User extends AggregateRoot {
  private _email: Email;
  private _password: Password;
  private _isActive: boolean = false;

  constructor(email: Email, password: Password, id?: EntityId) {
    super(id);
    this._email = email;
    this._password = password;
    
    // 发布领域事件
    this.addDomainEvent({
      type: "UserCreated",
      aggregateRootId: this.id,
      timestamp: new Date(),
      data: { email: email.value, userId: this.id.value },
    });
  }

  activate(): void {
    this._isActive = true;
    this.addDomainEvent({
      type: "UserActivated",
      aggregateRootId: this.id,
      timestamp: new Date(),
      data: { userId: this.id.value },
    });
  }

  protected performCoordination(operation: string, params: unknown): unknown {
    // 协调逻辑
    return { success: true };
  }

  protected performBusinessInvariantValidation(): boolean {
    return this._email.value.length > 0;
  }
}

// 应用层：注册用例
import { 
  IRepository, 
  IFactory, 
  BusinessRuleManager 
} from "@hl8/domain-kernel";
import { UseCase } from "@hl8/application-kernel";

export class RegisterUserUseCase extends UseCase<
  RegisterUserInput,
  RegisterUserOutput
> {
  constructor(
    logger: Logger,
    private readonly userRepository: IRepository<User>,
    private readonly userFactory: IFactory<User>,
    private readonly ruleManager: BusinessRuleManager<User>,
    private readonly eventBus: EventBus
  ) {
    super(logger);
  }

  async executeBusinessLogic(
    input: RegisterUserInput
  ): Promise<RegisterUserOutput> {
    // 1. 使用工厂创建聚合根
    const user = this.userFactory.create({
      email: input.email,
      password: input.password,
    });

    // 2. 业务规则验证
    const validationResult = this.ruleManager.validateEntity(user, {
      entityType: "User",
      entityId: user.id.value,
    });

    if (!validationResult.isValid) {
      throw new UseCaseValidationException(
        validationResult.violations.map(v => v.message).join(", ")
      );
    }

    // 3. 保存聚合根
    await this.userRepository.save(user);

    // 4. 发布领域事件
    const events = user.getDomainEvents();
    await this.eventBus.publishAll(events);

    return new RegisterUserOutput(user.id.value);
  }
}
```

**领域层支持点**:
1. ✅ `AggregateRoot`: 提供聚合根基类
2. ✅ `EntityId`: 生成用户标识符
3. ✅ `IFactory`: 创建用户聚合根
4. ✅ `IRepository`: 持久化用户
5. ✅ `BusinessRuleManager`: 验证业务规则
6. ✅ `DomainEvent`: 管理领域事件

---

### 示例 2: 租户隔离查询

```typescript
// 应用层：查询处理器（支持租户隔离）
import { 
  ITenantIsolatedRepository,
  EntityId,
  TenantContext 
} from "@hl8/domain-kernel";
import { QueryHandler } from "@nestjs/cqrs";

@QueryHandler(GetProductQuery)
export class GetProductHandler {
  constructor(
    private readonly productRepository: ITenantIsolatedRepository<Product>
  ) {}

  async execute(query: GetProductQuery): Promise<ProductDto> {
    // 从查询中获取租户上下文
    const tenantContext = query.tenantContext;
    
    if (!tenantContext) {
      throw new BusinessException("租户上下文缺失");
    }

    // 使用租户隔离仓储查询（自动应用隔离过滤）
    const product = await this.productRepository.findByIdWithContext(
      EntityId.fromString(query.productId),
      tenantContext
    );

    if (!product) {
      throw new EntityNotFoundException(
        "产品不存在或不属于当前租户",
        "PRODUCT_NOT_FOUND",
        { 
          productId: query.productId,
          tenantId: tenantContext.tenantId.value 
        }
      );
    }

    // 验证产品是否属于当前组织（如果需要）
    if (tenantContext.organizationId) {
      const belongsToOrg = await this.productRepository
        .belongsToOrganization(
          product.id,
          tenantContext.organizationId
        );
      
      if (!belongsToOrg) {
        throw new BusinessException("无权访问此产品");
      }
    }

    return this.mapToDto(product);
  }
}
```

**领域层支持点**:
1. ✅ `ITenantIsolatedRepository`: 租户隔离仓储接口
2. ✅ `TenantContext`: 租户上下文管理
3. ✅ `EntityId`: 标识符处理
4. ✅ 自动隔离过滤：仓储实现自动应用租户过滤

---

## 最佳实践

### 1. 依赖方向

**✅ 正确做法**:
```typescript
// 应用层依赖领域层
import { EntityId, IRepository } from "@hl8/domain-kernel";
```

**❌ 错误做法**:
```typescript
// 领域层不应该依赖应用层
// 不要这样做！
import { UseCase } from "@hl8/application-kernel"; // ❌
```

### 2. 标识符使用

**✅ 正确做法**:
```typescript
// 使用领域层的 EntityId
import { EntityId } from "@hl8/domain-kernel";

const userId = EntityId.generate();
const user = await repository.findById(EntityId.fromString(input.userId));
```

**❌ 错误做法**:
```typescript
// 不要直接使用字符串
const userId = "user-123"; // ❌
const user = await repository.findById(input.userId); // ❌
```

### 3. 异常处理

**✅ 正确做法**:
```typescript
// 使用领域层的异常类型
import { EntityNotFoundException, BusinessException } from "@hl8/domain-kernel";

if (!user) {
  throw new EntityNotFoundException("用户不存在", "USER_NOT_FOUND", {
    userId: input.userId
  });
}
```

**❌ 错误做法**:
```typescript
// 不要使用通用异常
if (!user) {
  throw new Error("用户不存在"); // ❌
}
```

### 4. 领域事件

**✅ 正确做法**:
```typescript
// 从聚合根获取领域事件
const events = aggregate.getDomainEvents();
await eventBus.publishAll(events);
aggregate.clearDomainEvents();
```

**❌ 错误做法**:
```typescript
// 不要在应用层直接创建领域事件
const event = new DomainEvent(/* ... */); // ❌ 应该在聚合根内创建
```

### 5. 业务规则验证

**✅ 正确做法**:
```typescript
// 使用业务规则管理器
const validationResult = ruleManager.validateEntity(aggregate, context);
if (!validationResult.isValid) {
  throw new UseCaseValidationException(/* ... */);
}
```

**❌ 错误做法**:
```typescript
// 不要在应用层直接验证业务规则
if (aggregate.email.includes("@")) { // ❌ 应该在领域层验证
  // ...
}
```

---

## 总结

### 核心支持作用总结

| 领域层组件 | 应用层使用场景 | 关键支持作用 |
|-----------|--------------|-------------|
| **EntityId** | 命令、查询、事件中的标识符 | 统一标识符格式，类型安全 |
| **DomainEvent** | 事件溯源、事件总线 | 统一事件结构，版本管理 |
| **AggregateRoot** | 用例中的业务对象 | 业务逻辑封装，事件管理 |
| **IRepository** | 用例中的持久化 | 持久化抽象，租户隔离 |
| **IFactory** | 用例中的对象创建 | 复杂对象创建，配置验证 |
| **BusinessRuleManager** | 用例中的业务规则验证 | 规则集中管理，可组合 |
| **ISpecification** | 查询中的业务规则查询 | 声明式查询，可复用 |
| **CoordinationManager** | 用例中的服务编排 | 多服务协调，依赖管理 |
| **OperationManager** | 聚合根中的操作执行 | 操作标准化，验证管理 |
| **异常体系** | 用例中的异常处理 | 异常标准化，上下文信息 |
| **TenantContext** | 命令、查询中的租户隔离 | 多层级隔离，权限控制 |

### 设计原则体现

1. **依赖倒置原则 (DIP)**:
   - ✅ 领域层定义接口（如 `IRepository`），应用层通过接口使用
   - ✅ 应用层依赖领域层的抽象，而不是具体实现

2. **单一职责原则 (SRP)**:
   - ✅ 领域层：业务逻辑和业务规则
   - ✅ 应用层：用例编排和流程协调

3. **开放封闭原则 (OCP)**:
   - ✅ 领域层提供扩展点（如 `BusinessRule` 接口），应用层可以扩展

4. **接口隔离原则 (ISP)**:
   - ✅ 领域层提供细粒度的接口（如 `IRepository`、`IFactory`）

### 关键收益

1. **类型安全**:
   - 领域层提供完整的 TypeScript 类型定义
   - 应用层使用时获得完整的类型检查和自动补全

2. **业务逻辑集中**:
   - 业务规则和业务逻辑封装在领域层
   - 应用层专注于用例编排，不包含业务逻辑

3. **可测试性**:
   - 领域层独立，易于单元测试
   - 应用层可以通过 Mock 领域层接口进行测试

4. **可维护性**:
   - 清晰的职责分离
   - 业务变更时只需修改领域层，应用层影响最小

5. **可扩展性**:
   - 领域层提供扩展点（规则、规约、服务等）
   - 应用层可以灵活组合使用

---

## 下一步学习

1. **深入学习领域层**:
   - 阅读 [DOMAIN_LAYER_GUIDE.md](../DOMAIN_LAYER_GUIDE.md) 了解领域层开发指引
   - 阅读 [README.md](../README.md) 了解完整的 API 文档

2. **深入学习应用层**:
   - 阅读 `@hl8/application-kernel` 的文档了解应用层架构
   - 学习 CQRS 和事件溯源模式

3. **实践项目**:
   - 根据本文档的示例实现一个完整的业务模块
   - 体验领域层对应用层的支持作用

**祝你开发顺利！** 🚀

