# Domain Kernel Core Module - 领域核心模块

基于 Clean Architecture 的领域核心模块，提供值对象、实体、聚合根等核心领域层组件。

## 功能特性

### 🏗️ 核心组件

- **值对象 (ValueObject)**: 不可变的值对象基类，提供相等性比较、序列化等功能
- **实体 (Entity)**: 具有身份标识的实体基类，支持生命周期管理和审计
- **内部实体 (InternalEntity)**: 聚合根内部管理的实体，遵循实体-聚合分离原则
- **聚合根 (AggregateRoot)**: 聚合根基类，管理内部实体和领域事件
- **领域事件 (DomainEvent)**: 领域事件基类，支持事件发布和订阅
- **领域服务 (DomainService)**: 领域服务基类，封装跨实体的业务逻辑

### 🎨 DDD 模式支持

- **Repository Pattern**: 仓储模式接口，提供聚合根的持久化抽象
- **Factory Pattern**: 工厂模式接口，支持复杂对象的创建和配置
- **Specification Pattern**: 规约模式，提供可组合的业务规则查询
- **Business Rule Validation**: 业务规则验证框架，支持规则组合和执行策略
- **Domain Service Registry**: 领域服务注册表，管理服务的生命周期和依赖
- **Service Coordination**: 领域服务协调管理器，支持多服务协作和规则执行
- **Business Operations**: 业务操作管理器，支持操作的验证、执行和监控
- **Enhanced Event Processing**: 增强的事件处理系统，支持处理器注册、优先级和重试

### 🔧 基础设施

- **标识符系统**: UUID v4 生成器和实体标识符
- **审计系统**: 完整的审计信息跟踪和变更记录
- **增强异常处理**: 分层的异常体系，支持上下文信息和严重程度分类
- **验证系统**: 实体-聚合分离原则验证器和值对象验证框架

### 📊 审计能力

- **审计信息 (AuditInfo)**: 创建时间、更新时间、创建者、更新者、版本号
- **审计变更 (AuditChange)**: 详细的变更记录，包括变更类型、字段、旧值、新值
- **审计轨迹 (AuditTrail)**: 实体的完整变更历史

### 🎯 设计原则

- **Clean Architecture**: 遵循清洁架构原则，领域层独立于基础设施层
- **Rich Domain Model**: 富领域模型，业务逻辑封装在领域对象中
- **实体-聚合分离**: 严格的实体和聚合根分离原则
- **事件驱动**: 支持领域事件的发布和订阅
- **不可变性**: 值对象和关键属性不可变
- **类型安全**: 完整的 TypeScript 类型支持

## 安装使用

### 安装依赖

```bash
pnpm install
```

### 构建

```bash
pnpm build
```

### 测试

```bash
pnpm test
```

## 快速开始

### 创建值对象

```typescript
import { ValueObject } from "@hl8/domain-kernel";

class Email extends ValueObject {
  constructor(value: string) {
    super(value);
  }

  validateValue(value: string): void {
    if (!value || !value.includes("@")) {
      throw new Error("无效的邮箱地址");
    }
  }

  get value(): string {
    return this._value;
  }
}
```

### 创建实体

```typescript
import { Entity, EntityId, AuditInfo, EntityLifecycle } from "@hl8/domain-kernel";

class User extends Entity {
  constructor(
    public readonly email: string,
    public readonly name: string,
    id?: EntityId,
    auditInfo?: AuditInfo,
    lifecycleState?: EntityLifecycle,
    version?: number,
  ) {
    super(id, auditInfo, lifecycleState, version);
  }

  clone(): User {
    return new User(this.email, this.name, this.id, this.auditInfo.clone(), this.lifecycleState, this.version);
  }
}
```

### 创建聚合根

```typescript
import { AggregateRoot, EntityId, AuditInfo, EntityLifecycle } from "@hl8/domain-kernel";

class UserAggregate extends AggregateRoot {
  constructor(
    public readonly email: string,
    public readonly name: string,
    id?: EntityId,
    auditInfo?: AuditInfo,
    lifecycleState?: EntityLifecycle,
    version?: number,
  ) {
    super(id, auditInfo, lifecycleState, version);
  }

  setProfile(email: string, name: string): { success: boolean; message: string } {
    return this.coordinateBusinessOperation("setProfile", { email, name });
  }

  protected performCoordination(operation: string, params: any): any {
    switch (operation) {
      case "setProfile":
        const { email, name } = params;
        // 执行业务逻辑
        return { success: true, message: "用户资料更新成功" };
      default:
        return { success: false, error: "未知操作" };
    }
  }

  protected performBusinessInvariantValidation(): boolean {
    return this.email && this.name;
  }

  clone(): UserAggregate {
    return new UserAggregate(this.email, this.name, this.id, this.auditInfo.clone(), this.lifecycleState, this.version);
  }
}
```

### 使用领域事件

```typescript
import { DomainEvent, EntityId } from "@hl8/domain-kernel";

// 创建领域事件
const event: DomainEvent = {
  type: "UserCreated",
  aggregateRootId: userId,
  timestamp: new Date(),
  data: { email: "user@example.com", name: "张三" },
};

// 添加到聚合根
aggregateRoot.addDomainEvent(event);

// 获取所有事件
const events = aggregateRoot.getDomainEvents();
```

### 异常处理

```typescript
import { BusinessException, SystemException } from "@hl8/domain-kernel";

// 业务异常
throw new BusinessException("用户不存在", "USER_NOT_FOUND");

// 系统异常
throw new SystemException("数据库连接失败", "DATABASE_CONNECTION_ERROR");
```

### 验证分离原则

```typescript
import { SeparationValidator } from "@hl8/domain-kernel";

// 验证聚合根是否符合分离原则
const result = SeparationValidator.validateAggregateRoot(aggregateRoot);

if (result.isValid) {
  console.log("分离原则验证通过");
} else {
  console.log("分离原则验证失败:", result.errors);
}
```

### 使用仓储模式

```typescript
import { IRepository, IRepositoryFactory } from "@hl8/domain-kernel";

// 定义仓储接口
interface IUserRepository extends IRepository<UserAggregate> {
  findByEmail(email: string): Promise<UserAggregate | null>;
}

// 使用仓储工厂创建仓储实例
class UserRepositoryFactory implements IRepositoryFactory<UserAggregate> {
  create(): IUserRepository {
    // 返回具体的仓储实现
    return new UserRepositoryImpl();
  }
}

// 使用仓储
const repository = factory.create();
const user = await repository.findById(userId);
await repository.save(user);
```

### 使用业务规则验证

```typescript
import { BusinessRuleManager, BusinessRuleSeverity } from "@hl8/domain-kernel";

// 创建业务规则管理器
const ruleManager = new BusinessRuleManager<UserAggregate>();

// 定义业务规则
class EmailFormatRule implements BusinessRule<UserAggregate> {
  readonly name = "EmailFormatRule";
  readonly description = "验证邮箱格式";
  readonly priority = 100;
  readonly enabled = true;
  readonly type = BusinessRuleType.VALIDATION;
  readonly severity = BusinessRuleSeverity.ERROR;

  validate(entity: UserAggregate): BusinessRuleValidationResult {
    // 验证逻辑
    if (!entity.email.includes("@")) {
      return BusinessRuleValidationResult.failure(
        "User",
        entity.id.value,
        [BusinessRuleViolation.error("无效邮箱格式", "INVALID_EMAIL", this.name)],
      );
    }
    return BusinessRuleValidationResult.success("User", entity.id.value);
  }
}

// 注册和使用规则
ruleManager.registerRule(new EmailFormatRule());
const result = ruleManager.validateEntity(user);
if (!result.isValid) {
  console.log("验证失败:", result.violations);
}
```

### 使用领域服务协调

```typescript
import { CoordinationManager } from "@hl8/domain-kernel";

// 创建协调管理器
const coordinationManager = new CoordinationManager();

// 定义协调规则
class ValidationRule implements ICoordinationRule {
  // 实现接口...
  async execute(context: ICoordinationContext): Promise<ICoordinationResult> {
    // 执行验证逻辑
    return { success: true, /* ... */ };
  }
}

// 注册规则并执行协调
coordinationManager.registerRule(new ValidationRule());
const context = coordinationManager
  .createContext("user-operation", { userId: "123" }, ["UserService", "EmailService"])
  .build();
const results = await coordinationManager.executeCoordination(context);
```

### 使用业务操作管理

```typescript
import { OperationManager, BusinessOperationType } from "@hl8/domain-kernel";

// 创建操作管理器
const operationManager = new OperationManager();

// 定义业务操作
class UpdateUserOperation implements IBusinessOperation<UserAggregate> {
  readonly id = "update-user";
  readonly name = "更新用户";
  readonly operationType = BusinessOperationType.UPDATE;
  // 实现接口方法...
  
  async execute(
    aggregate: UserAggregate,
    parameters: OperationParameters,
    context: OperationContext,
  ): Promise<OperationResult> {
    // 执行操作逻辑
    return { success: true, /* ... */ };
  }
}

// 注册并执行操作
operationManager.registerOperation(new UpdateUserOperation());
const context = operationManager.createContext("admin", "更新用户资料").build();
const result = await operationManager.executeOperation(
  "update-user",
  user,
  { name: "新名称" },
  context,
);
```

### 使用增强的事件处理

```typescript
import { EventRegistry, EventProcessor, IDomainEventHandler } from "@hl8/domain-kernel";

// 创建事件注册表和处理器
const eventRegistry = new EventRegistry();
const eventProcessor = new EventProcessor(eventRegistry, {
  continueOnError: true,
  defaultTimeout: 5000,
  enableRetry: true,
  maxRetries: 3,
});

// 定义事件处理器
class UserCreatedHandler implements IDomainEventHandler {
  getMetadata() {
    return {
      handlerId: "user-created-handler",
      handlerName: "User Created Handler",
      supportedEventTypes: ["UserCreated"],
      priority: 0,
      enabled: true,
      version: "1.0.0",
    };
  }

  canHandle(eventType: string): boolean {
    return eventType === "UserCreated";
  }

  async handle(event: DomainEvent): Promise<EventProcessingResult> {
    // 处理事件逻辑
    return { success: true, /* ... */ };
  }

  validateEvent(event: DomainEvent): boolean {
    return true;
  }

  getDependencies(): string[] {
    return [];
  }
}

// 注册处理器并处理事件
await eventRegistry.registerHandler(new UserCreatedHandler());
const results = await eventProcessor.processEvent(userCreatedEvent);
```

### 使用领域服务注册表

```typescript
import { DomainServiceRegistry } from "@hl8/domain-kernel";

// 创建服务注册表
const serviceRegistry = new DomainServiceRegistry();

// 注册服务
await serviceRegistry.registerService({
  serviceId: "email-service",
  serviceType: "EmailService",
  version: "1.0.0",
  dependencies: [],
});

// 获取服务
const service = await serviceRegistry.getService("email-service");

// 验证服务依赖
const validation = await serviceRegistry.validateDependencies("email-service");
```

## API 参考

### 值对象 (ValueObject)

- `constructor(value: T, createdAt?: Date, version?: number)`: 创建值对象
- `get value(): T`: 获取值
- `equals(other: ValueObject<T>): boolean`: 比较相等性
- `toJSON(): object`: 序列化为 JSON
- `clone(): ValueObject<T>`: 克隆值对象
- `validateValue(value: T): void`: 验证值（子类实现）

### 实体 (Entity)

- `constructor(id?: EntityId, auditInfo?: AuditInfo, lifecycleState?: EntityLifecycle, version?: number)`: 创建实体
- `get id(): EntityId`: 获取标识符
- `get auditInfo(): AuditInfo`: 获取审计信息
- `get lifecycleState(): EntityLifecycle`: 获取生命周期状态
- `get version(): number`: 获取版本号
- `activate(): void`: 激活实体
- `deactivate(): void`: 停用实体
- `suspend(): void`: 暂停实体
- `resume(): void`: 恢复实体
- `equals(other: Entity): boolean`: 比较相等性
- `toJSON(): object`: 序列化为 JSON
- `clone(): Entity`: 克隆实体（子类实现）

### 聚合根 (AggregateRoot)

- `constructor(id?: EntityId, auditInfo?: AuditInfo, lifecycleState?: EntityLifecycle, version?: number)`: 创建聚合根
- `addInternalEntity(entity: InternalEntity): void`: 添加内部实体
- `removeInternalEntity(entityId: EntityId): void`: 移除内部实体
- `getInternalEntity(entityId: EntityId): InternalEntity | undefined`: 获取内部实体
- `coordinateBusinessOperation(operation: string, params: any): any`: 协调业务操作
- `addDomainEvent(event: DomainEvent): void`: 添加领域事件
- `getDomainEvents(): DomainEvent[]`: 获取领域事件
- `clearDomainEvents(): void`: 清空领域事件
- `validateBusinessInvariants(): boolean`: 验证业务不变量
- `clone(): AggregateRoot`: 克隆聚合根（子类实现）

### 领域事件 (DomainEvent)

- `type: string`: 事件类型
- `aggregateRootId: EntityId`: 聚合根标识符
- `timestamp: Date`: 时间戳
- `data: any`: 事件数据
- `metadata?: Record<string, any>`: 元数据
- `eventId?: EntityId`: 事件标识符
- `version?: number`: 版本号

### 仓储接口 (IRepository)

- `findById(id: EntityId): Promise<T | null>`: 根据 ID 查找聚合根
- `findAll(): Promise<T[]>`: 查找所有聚合根
- `save(entity: T): Promise<void>`: 保存聚合根
- `delete(id: EntityId): Promise<void>`: 删除聚合根
- `exists(id: EntityId): Promise<boolean>`: 检查聚合根是否存在
- `count(): Promise<number>`: 获取聚合根数量

### 业务规则管理器 (BusinessRuleManager)

- `registerRule(rule: BusinessRule<T>): boolean`: 注册业务规则
- `unregisterRule(ruleName: string): void`: 注销业务规则
- `validateEntity(entity: T, context?: any): BusinessRuleValidationResult`: 验证实体
- `validateEntityProperty(entity: T, property: string, context?: any): BusinessRuleValidationResult`: 验证实体属性
- `getValidationStats(): BusinessRuleValidationStats`: 获取验证统计信息

### 协调管理器 (CoordinationManager)

- `registerRule(rule: ICoordinationRule): void`: 注册协调规则
- `executeCoordination(context: ICoordinationContext): Promise<ICoordinationResult[]>`: 执行协调
- `createContext(operationType: string, operationData?: unknown, services?: string[]): ICoordinationContextBuilder`: 创建协调上下文
- `getCoordinationStats(): CoordinationStats`: 获取协调统计信息

### 操作管理器 (OperationManager)

- `registerOperation(operation: IBusinessOperation<T>): void`: 注册业务操作
- `executeOperation(operationId: string, aggregate: T, parameters: OperationParameters, context: OperationContext): Promise<OperationResult>`: 执行操作
- `createContext(initiator: string, reason?: string): OperationContextBuilder`: 创建操作上下文
- `getActiveOperation(contextId: string): OperationExecutionContext | null`: 获取活跃操作

### 事件处理器 (EventProcessor)

- `processEvent(event: DomainEvent): Promise<EventProcessingResult[]>`: 处理单个事件
- `processEvents(events: DomainEvent[]): Promise<Map<string, EventProcessingResult[]>>`: 批量处理事件
- `getProcessingHistory(eventId?: string): EventProcessingHistory[]`: 获取处理历史

### 事件注册表 (EventRegistry)

- `registerHandler(handler: IDomainEventHandler): Promise<void>`: 注册事件处理器
- `unregisterHandler(handlerId: string): Promise<boolean>`: 注销事件处理器
- `getHandlersForEvent(eventType: string): IDomainEventHandler[]`: 获取事件的所有处理器
- `getAllHandlers(): IDomainEventHandler[]`: 获取所有处理器

## 测试

项目包含完整的测试套件：

- **单元测试**: 每个组件的独立测试
- **集成测试**: 组件间的协作测试
- **端到端测试**: 完整业务流程测试

运行测试：

```bash
# 运行所有测试
pnpm test

# 运行单元测试
pnpm test:unit

# 运行集成测试
pnpm test:integration

# 运行端到端测试
pnpm test:e2e
```

## 示例

查看 `examples/` 目录中的完整使用示例：

```bash
node examples/basic-usage.cjs
```

## 贡献

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

## 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 作者

hl8-platform 团队

## 迁移指南

如果你正在从原始版本的 domain kernel 迁移到增强版本，请查看 [MIGRATION.md](./MIGRATION.md) 获取详细的迁移指南。

## 版本历史

- **1.0.0** - 增强版本
  - ✅ 实现核心领域组件（值对象、实体、聚合根）
  - ✅ 完整的审计和事件系统
  - ✅ 分离原则验证器
  - ✅ **Repository Pattern** - 仓储模式接口支持
  - ✅ **Factory Pattern** - 工厂模式接口支持
  - ✅ **Specification Pattern** - 规约模式支持
  - ✅ **Business Rule Validation** - 业务规则验证框架
  - ✅ **Domain Service Registry** - 领域服务注册表
  - ✅ **Service Coordination** - 领域服务协调管理器
  - ✅ **Business Operations** - 业务操作管理器
  - ✅ **Enhanced Event Processing** - 增强的事件处理系统
  - ✅ 增强的异常处理体系
  - ✅ 值对象验证框架
  - ✅ 完整的单元测试和集成测试
