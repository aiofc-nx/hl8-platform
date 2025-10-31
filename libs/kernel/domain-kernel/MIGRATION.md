# Domain Kernel 迁移指南

## 📋 概述

本文档提供了从原始 domain kernel 迁移到增强版本的详细指南。增强版本添加了完整的 DDD 模式支持，包括仓储模式、工厂模式、规约模式、业务规则验证、领域服务协调、业务操作管理等。

**版本对比**:

- **原始版本**: 基础 DDD 组件（值对象、实体、聚合根、领域事件、领域服务）
- **增强版本**: 完整的 DDD 模式支持 + 增强的异常处理 + 增强的事件处理

---

## 🎯 迁移概览

### 主要变化

#### ✅ 新增功能

1. **仓储模式 (Repository Pattern)**
   - `IRepository<T>` 接口
   - `IRepositoryFactory<T>` 接口
   - 统一的持久化抽象

2. **工厂模式 (Factory Pattern)**
   - `IFactory<T>` 接口
   - `IFactoryBuilder<T>` 接口
   - 复杂对象创建支持

3. **规约模式 (Specification Pattern)**
   - `ISpecification<T>` 接口
   - 可组合的业务规则查询
   - `AndSpecification`, `OrSpecification`, `NotSpecification`

4. **业务规则验证 (Business Rule Validation)**
   - `BusinessRuleManager` 管理器
   - `BusinessRule` 接口
   - 规则优先级和执行策略

5. **领域服务注册表 (Domain Service Registry)**
   - `DomainServiceRegistry` 实现
   - 服务依赖管理
   - 服务生命周期管理

6. **服务协调 (Service Coordination)**
   - `CoordinationManager` 管理器
   - `ICoordinationRule` 接口
   - 多服务协作支持

7. **业务操作管理 (Business Operations)**
   - `OperationManager` 管理器
   - `IBusinessOperation` 接口
   - 操作验证和执行监控

8. **增强的事件处理 (Enhanced Event Processing)**
   - `EventProcessor` 处理器
   - `EventRegistry` 注册表
   - 处理器优先级和重试机制

9. **增强的异常处理 (Enhanced Exception Handling)**
   - `ExceptionHandler` 工具类
   - 分层的异常体系
   - 详细的错误上下文

10. **值对象验证框架 (Value Object Validation)**
    - 增强的值对象验证
    - 验证规则和错误消息

---

## 📦 依赖更新

### package.json

```json
{
  "dependencies": {
    "@hl8/domain-kernel": "^1.0.0"  // 使用增强版本
  }
}
```

---

## 🔄 迁移步骤

### 步骤 1: 更新导入路径

#### 原始版本

```typescript
import { Entity, AggregateRoot, DomainEvent } from "@hl8/domain-kernel";
```

#### 增强版本

```typescript
// 基础组件（不变）
import { Entity, AggregateRoot, DomainEvent } from "@hl8/domain-kernel";

// 新增的 DDD 模式
import {
  IRepository,
  IRepositoryFactory,
  IFactory,
  ISpecification,
  BusinessRuleManager,
  DomainServiceRegistry,
  CoordinationManager,
  OperationManager,
  EventProcessor,
  ExceptionHandler,
} from "@hl8/domain-kernel";
```

---

### 步骤 2: 聚合根变化

#### 原始版本

```typescript
class User extends AggregateRoot {
  constructor(
    id?: EntityId,
    auditInfo?: AuditInfo,
    lifecycleState: EntityLifecycle = EntityLifecycle.CREATED,
    version: number = 1,
  ) {
    super(id, auditInfo, lifecycleState, version);
  }

  // 业务逻辑直接写在聚合根中
  changeEmail(newEmail: string): void {
    this.email = newEmail;
  }
}
```

#### 增强版本

```typescript
class User extends AggregateRoot {
  constructor(
    id?: EntityId,
    auditInfo?: AuditInfo,
    lifecycleState: EntityLifecycle = EntityLifecycle.CREATED,
    version: number = 1,
  ) {
    super(id, auditInfo, lifecycleState, version);
  }

  // 使用业务操作管理器执行操作
  async changeEmail(
    newEmail: string,
    operationManager: OperationManager,
  ): Promise<void> {
    const result = await operationManager.executeOperation(
      "changeEmail",
      this,
      { newEmail },
    );
    
    if (!result.success) {
      throw new Error(result.error?.message);
    }
  }

  // 必须实现协调方法
  protected performCoordination(
    operation: string,
    params: unknown,
  ): unknown {
    // 协调逻辑
    return { success: true };
  }

  // 必须实现业务不变量验证
  protected performBusinessInvariantValidation(): boolean {
    // 验证业务不变量
    return true;
  }
}
```

---

### 步骤 3: 异常处理迁移

#### 原始版本

```typescript
try {
  // 业务逻辑
} catch (error) {
  throw new Error(`操作失败: ${error.message}`);
}
```

#### 增强版本

```typescript
import { ExceptionHandler } from "@hl8/domain-kernel";

try {
  // 业务逻辑
} catch (error) {
  // 使用统一的异常处理工具
  throw ExceptionHandler.toDomainException(
    error,
    "OPERATION_FAILED",
    ExceptionHandler.createErrorContext("operationName", {
      param1: value1,
    }),
    "操作失败",
  );
}
```

或者使用包装器：

```typescript
// 异步操作包装
const result = await ExceptionHandler.wrapAsync(
  async () => {
    // 业务逻辑
  },
  "OPERATION_ERROR",
  { context: "value" },
);

// 同步操作包装
const result = ExceptionHandler.wrapSync(
  () => {
    // 业务逻辑
  },
  "OPERATION_ERROR",
  { context: "value" },
);
```

---

### 步骤 4: 领域事件处理迁移

#### 原始版本

```typescript
// 手动处理事件
class UserCreatedEvent extends DomainEvent {
  constructor(userId: string) {
    super("UserCreated", { userId });
  }
}

// 在应用层手动订阅
eventBus.subscribe("UserCreated", (event) => {
  // 处理事件
});
```

#### 增强版本

```typescript
import { EventProcessor, EventRegistry } from "@hl8/domain-kernel";

// 定义事件处理器
class UserCreatedEventHandler implements IDomainEventHandler {
  async handle(event: UserCreatedEvent, context: EventHandlerContext): Promise<EventHandlerResult> {
    // 处理事件
    return { success: true };
  }

  getMetadata() {
    return {
      eventType: "UserCreated",
      priority: 100,
      enabled: true,
    };
  }
}

// 注册事件处理器
const eventRegistry = new EventRegistry();
eventRegistry.registerHandler(new UserCreatedEventHandler());

// 使用事件处理器
const eventProcessor = new EventProcessor(eventRegistry, {
  continueOnError: true,
  processByPriority: true,
  defaultTimeout: 5000,
  enableRetry: true,
  maxRetries: 3,
  retryDelay: 1000,
});

await eventProcessor.processEvent(userCreatedEvent);
```

---

### 步骤 5: 业务规则验证迁移

#### 原始版本

```typescript
// 手动验证
class User {
  validate(): boolean {
    if (!this.email.includes("@")) {
      return false;
    }
    if (this.age < 18) {
      return false;
    }
    return true;
  }
}
```

#### 增强版本

```typescript
import { BusinessRuleManager, BusinessRule } from "@hl8/domain-kernel";

// 定义业务规则
class EmailFormatRule implements BusinessRule<User> {
  name = "EmailFormatRule";
  description = "验证邮箱格式";
  priority = 100;
  enabled = true;

  validate(entity: User): BusinessRuleValidationResult {
    if (!entity.email.includes("@")) {
      return BusinessRuleValidationResult.failure(
        "User",
        entity.id.value,
        [
          BusinessRuleViolation.error(
            "无效的邮箱格式",
            "INVALID_EMAIL",
            this.name,
          ),
        ],
      );
    }
    return BusinessRuleValidationResult.success("User", entity.id.value);
  }

  isApplicable(entity: unknown): boolean {
    return entity instanceof User;
  }
}

// 使用业务规则管理器
const ruleManager = new BusinessRuleManager<User>();
ruleManager.registerRule(new EmailFormatRule());

const result = ruleManager.validateEntity(user, {
  entityType: "User",
  entityId: user.id.value,
});

if (!result.isValid) {
  // 处理验证失败
}
```

---

### 步骤 6: 仓储模式集成

#### 原始版本

```typescript
// 直接使用数据访问层
class UserRepository {
  async findById(id: string): Promise<User | null> {
    return await db.users.findOne({ id });
  }
}
```

#### 增强版本

```typescript
import { IRepository, IRepositoryFactory } from "@hl8/domain-kernel";

// 实现仓储接口
class UserRepository implements IRepository<User> {
  async findById(id: EntityId): Promise<User | null> {
    // 实现查找逻辑
  }

  async save(aggregate: User): Promise<void> {
    // 实现保存逻辑
  }

  async delete(id: EntityId): Promise<void> {
    // 实现删除逻辑
  }

  // ... 其他方法
}

// 使用仓储工厂
class UserRepositoryFactory implements IRepositoryFactory<User> {
  create(): IRepository<User> {
    return new UserRepository();
  }
}
```

---

### 步骤 7: 领域服务协调迁移

#### 原始版本

```typescript
// 手动协调服务
class OrderService {
  async createOrder(orderData: OrderData): Promise<Order> {
    // 调用用户服务
    const user = await userService.getUser(orderData.userId);
    
    // 调用库存服务
    const available = await inventoryService.checkAvailability(orderData.items);
    
    // 调用支付服务
    const payment = await paymentService.processPayment(orderData.payment);
    
    // 创建订单
    return new Order(orderData);
  }
}
```

#### 增强版本

```typescript
import { CoordinationManager, ICoordinationRule } from "@hl8/domain-kernel";

// 定义协调规则
class CreateOrderCoordinationRule implements ICoordinationRule {
  id = "create-order-rule";
  name = "Create Order Rule";
  description = "协调创建订单的多个服务";
  priority = 0;
  enabled = true;

  async execute(context: ICoordinationContext): Promise<ICoordinationResult> {
    // 协调逻辑
    return {
      success: true,
      data: {},
    };
  }

  // ... 其他方法
}

// 使用协调管理器
const coordinationManager = new CoordinationManager();
coordinationManager.registerRule(new CreateOrderCoordinationRule());

const context = coordinationManager
  .createContext("createOrder", orderData, [
    "UserService",
    "InventoryService",
    "PaymentService",
  ])
  .build();

const results = await coordinationManager.executeCoordination(context);
```

---

### 步骤 8: 工厂模式集成

#### 原始版本

```typescript
// 直接创建对象
const user = new User(
  new EntityId(),
  AuditInfo.create(new EntityId()),
  EntityLifecycle.CREATED,
  1,
);
```

#### 增强版本

```typescript
import { IFactory, IFactoryBuilder } from "@hl8/domain-kernel";

// 实现工厂接口
class UserFactory implements IFactory<User> {
  create(config: UserFactoryConfig): User {
    // 复杂的创建逻辑
    return new User(
      config.id || new EntityId(),
      config.auditInfo || AuditInfo.create(new EntityId()),
      config.lifecycleState || EntityLifecycle.CREATED,
      config.version || 1,
    );
  }
}

// 使用工厂构建器
const userFactory = new UserFactory();
const user = userFactory.create({
  id: new EntityId(),
  auditInfo: AuditInfo.create(new EntityId()),
});
```

---

## 🔧 常见迁移场景

### 场景 1: 聚合根操作迁移

**原始版本**:

```typescript
class Order extends AggregateRoot {
  addItem(item: OrderItem): void {
    this.items.push(item);
  }
}
```

**增强版本**:

```typescript
import { OperationManager } from "@hl8/domain-kernel";

class Order extends AggregateRoot {
  async addItem(
    item: OrderItem,
    operationManager: OperationManager,
  ): Promise<void> {
    const result = await operationManager.executeOperation(
      "addItem",
      this,
      { item },
    );

    if (!result.success) {
      throw result.error;
    }
  }
}
```

---

### 场景 2: 值对象验证增强

**原始版本**:

```typescript
class Email extends ValueObject {
  validateValue(value: string): void {
    if (!value.includes("@")) {
      throw new Error("无效的邮箱");
    }
  }
}
```

**增强版本**:

```typescript
import { ValueObjectValidator } from "@hl8/domain-kernel";

class Email extends ValueObject {
  validateValue(value: string): void {
    const validator = new ValueObjectValidator();
    validator
      .required(value, "邮箱不能为空")
      .pattern(value, /^[^\s@]+@[^\s@]+\.[^\s@]+$/, "无效的邮箱格式")
      .length(value, 1, 255, "邮箱长度必须在1-255之间");

    if (!validator.isValid()) {
      throw new ValueObjectValidationFailedException(
        validator.getAllErrors().join(", "),
      );
    }
  }
}
```

---

### 场景 3: 规约模式集成

**原始版本**:

```typescript
// 手动查询
function findActiveUsers(users: User[]): User[] {
  return users.filter(
    (user) => user.status === "active" && user.emailVerified,
  );
}
```

**增强版本**:

```typescript
import { ISpecification, AndSpecification } from "@hl8/domain-kernel";

class ActiveUserSpecification implements ISpecification<User> {
  isSatisfiedBy(entity: User): boolean {
    return entity.status === "active";
  }
}

class EmailVerifiedSpecification implements ISpecification<User> {
  isSatisfiedBy(entity: User): boolean {
    return entity.emailVerified;
  }
}

// 组合规约
const activeAndVerifiedSpec = new AndSpecification(
  new ActiveUserSpecification(),
  new EmailVerifiedSpecification(),
);

// 使用规约查询
function findActiveUsers(users: User[]): User[] {
  return users.filter((user) => activeAndVerifiedSpec.isSatisfiedBy(user));
}
```

---

## ⚠️ 破坏性变化

### 1. 聚合根必须实现新方法

所有聚合根现在必须实现以下抽象方法：

```typescript
protected abstract performCoordination(
  operation: string,
  params: unknown,
): unknown;

protected abstract performBusinessInvariantValidation(): boolean;
```

### 2. 异常处理统一

所有异常都应该使用 `ExceptionHandler` 或继承 `DomainException`：

```typescript
// ❌ 旧方式
throw new Error("操作失败");

// ✅ 新方式
throw new BusinessException("操作失败", "OPERATION_FAILED", {});
```

### 3. 事件处理机制变化

事件处理现在必须通过 `EventProcessor` 和 `EventRegistry`：

```typescript
// ❌ 旧方式：手动订阅
eventBus.subscribe("UserCreated", handler);

// ✅ 新方式：注册处理器
eventRegistry.registerHandler(handler);
await eventProcessor.processEvent(event);
```

---

## 🐛 常见问题

### Q1: 如何处理现有的自定义异常？

**A**: 使用 `ExceptionHandler.toDomainException()` 转换：

```typescript
try {
  // 现有代码
} catch (error) {
  throw ExceptionHandler.toDomainException(
    error,
    "CUSTOM_ERROR",
    { context: "value" },
  );
}
```

---

### Q2: 业务规则验证是必需的吗？

**A**: 不是必需的，但是强烈推荐。如果不想使用，可以继续使用原有的验证方式。

---

### Q3: 如何迁移现有的事件处理代码？

**A**: 逐步迁移：

1. 创建实现 `IDomainEventHandler` 的处理器类
2. 在 `EventRegistry` 中注册处理器
3. 使用 `EventProcessor` 处理事件
4. 移除旧的事件订阅代码

---

### Q4: 仓储模式是必需的吗？

**A**: 不是必需的，但推荐使用。如果你有现有的数据访问层，可以：

1. 实现 `IRepository` 接口
2. 在现有实现上包装接口
3. 逐步迁移到新接口

---

## 📚 参考资源

- [README.md](./README.md) - 完整的 API 文档和示例
- [快速开始指南](./README.md#快速开始) - 新功能的使用示例
- [测试文件](./test) - 查看测试用例了解用法

---

## 🚀 迁移检查清单

- [ ] 更新 `package.json` 依赖版本
- [ ] 更新导入语句
- [ ] 为聚合根实现新的抽象方法
- [ ] 迁移异常处理到 `ExceptionHandler`
- [ ] 迁移事件处理到 `EventProcessor` 和 `EventRegistry`
- [ ] （可选）集成业务规则验证
- [ ] （可选）集成仓储模式
- [ ] （可选）集成工厂模式
- [ ] （可选）集成规约模式
- [ ] （可选）集成服务协调
- [ ] （可选）集成业务操作管理
- [ ] 运行测试确保功能正常
- [ ] 更新文档和注释

---

## 📞 获取帮助

如果在迁移过程中遇到问题：

1. 查看本文档的常见问题部分
2. 查看 [README.md](./README.md) 中的 API 文档
3. 查看测试文件中的示例代码
4. 提交 Issue 到项目仓库

---

**祝迁移顺利！** 🎉
