# Application Kernel 快速入门指南

**版本**: 1.0.0  
**更新日期**: 2024-12-19

本指南将帮助您快速掌握 `@hl8/application-kernel` 的使用，通过完整的示例演示如何构建符合 Clean Architecture + CQRS + Event Sourcing + EDA 架构模式的应用层代码。

---

## 📋 目录

1. [概述](#概述)
2. [安装和配置](#安装和配置)
3. [核心概念](#核心概念)
4. [用例（Use Cases）](#用例use-cases)
5. [命令（Commands）](#命令commands)
6. [查询（Queries）](#查询queries)
7. [事件（Events）](#事件events)
8. [投影器（Projectors）](#投影器projectors)
9. [Saga](#saga)
10. [完整示例](#完整示例)

---

## 概述

`@hl8/application-kernel` 提供了应用层的核心基础设施，帮助您：

- ✅ **标准化用例**: 统一业务逻辑的入口和执行流程
- ✅ **CQRS 模式**: 分离命令和查询，优化读写性能
- ✅ **事件溯源**: 通过事件重建系统状态，支持审计和重放
- ✅ **事件驱动**: 松耦合的组件通信，支持异步处理
- ✅ **平台集成**: 与 `@hl8/domain-kernel`、`@hl8/config`、`@hl8/logger` 无缝集成

---

## 安装和配置

### 安装依赖

```bash
pnpm add @hl8/application-kernel @hl8/domain-kernel @hl8/config @hl8/logger @nestjs/cqrs
```

### 配置模块

```typescript
import { Module } from "@nestjs/common";
import { TypedConfigModule } from "@hl8/config";
import { LoggerModule } from "@hl8/logger";
import { ApplicationKernelModule } from "@hl8/application-kernel";

@Module({
  imports: [
    // 平台基础设施
    TypedConfigModule.forRoot({
      schema: ApplicationKernelConfig,
      load: [
        /* 配置加载器 */
      ],
    }),
    LoggerModule.forRoot(),

    // 应用内核模块
    ApplicationKernelModule.forRoot({
      eventStore: {
        type: "hybrid",
        postgresql: process.env.POSTGRES_URL,
        mongodb: process.env.MONGODB_URL,
      },
      eventBus: {
        deliveryGuarantee: "at-least-once",
        retryPolicy: { maxRetries: 3, backoffMs: 1000 },
      },
      cache: {
        type: "memory",
        ttl: { default: 3600 },
      },
    }),
  ],
})
export class AppModule {}
```

---

## 核心概念

### 应用层架构

```text
应用层（Application Layer）
├── 用例（Use Cases）- 业务逻辑编排
├── 命令（Commands）- 写操作
├── 查询（Queries）- 读操作
├── 事件（Events）- 状态变更通知
├── 投影器（Projectors）- 构建读模型
└── Saga - 协调分布式事务
```

### 工作流程

```text
用户请求 → 用例 → 命令/查询 → 领域层 → 事件 → 投影器 → 读模型
```

---

## 用例（Use Cases）

用例是应用层的核心，封装了完整的业务操作流程。

### 基础用例实现

```typescript
import { Injectable } from "@nestjs/common";
import { Logger } from "@hl8/logger";
import { UseCase, UseCaseInput, UseCaseOutput } from "@hl8/application-kernel";

// 1. 定义输入
class CreateUserInput extends UseCaseInput {
  @IsNotEmpty()
  @IsString()
  public readonly email!: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(8)
  public readonly password!: string;

  @IsOptional()
  @IsString()
  public readonly name?: string;
}

// 2. 定义输出
class CreateUserOutput extends UseCaseOutput {
  public readonly userId!: string;
  public readonly email!: string;
  public readonly createdAt!: Date;
}

// 3. 实现用例
@Injectable()
export class CreateUserUseCase extends UseCase<CreateUserInput, CreateUserOutput> {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly eventBus: EventBusImpl,
    logger: Logger,
  ) {
    super(logger);
  }

  protected async executeBusinessLogic(input: CreateUserInput): Promise<CreateUserOutput> {
    // 1. 检查用户是否已存在
    const existing = await this.userRepository.findByEmail(input.email);
    if (existing) {
      throw new UseCaseValidationException("用户已存在", "USER_ALREADY_EXISTS", this.useCaseName, input);
    }

    // 2. 创建用户聚合
    const user = User.create(EntityId.generate(), Email.create(input.email), Password.create(input.password), input.name ? UserName.create(input.name) : undefined);

    // 3. 保存到仓储
    await this.userRepository.save(user);

    // 4. 发布领域事件
    await this.eventBus.publish(...user.getUncommittedEvents());

    // 5. 返回结果
    return new CreateUserOutput({
      userId: user.getId().toString(),
      email: user.getEmail().getValue(),
      createdAt: user.getCreatedAt(),
    });
  }
}

// 4. 使用用例
@Injectable()
export class UserController {
  constructor(private readonly createUserUseCase: CreateUserUseCase) {}

  @Post("/users")
  async createUser(@Body() body: CreateUserDto) {
    const input = new CreateUserInput(body);
    const output = await this.createUserUseCase.execute(input);
    return output;
  }
}
```

### 用例最佳实践

1. **单一职责**: 每个用例只做一件事
2. **输入验证**: 使用 `class-validator` 验证输入
3. **异常处理**: 使用应用层异常类型
4. **日志记录**: 利用基类提供的日志功能
5. **事件发布**: 在用例中发布领域事件

---

## 命令（Commands）

命令用于改变系统状态，遵循 CQRS 模式。

### 命令实现

```typescript
import { BaseCommand, BaseCommandHandler, CommandResult } from "@hl8/application-kernel";
import { EntityId } from "@hl8/domain-kernel";

// 1. 定义命令
class CreateUserCommand extends BaseCommand {
  public readonly email!: string;
  public readonly password!: string;
  public readonly name?: string;

  constructor(aggregateId: string, data: { email: string; password: string; name?: string }) {
    super(aggregateId, "CreateUser", {
      correlationId: EntityId.generate().toString(),
    });
    this.email = data.email;
    this.password = data.password;
    this.name = data.name;
  }
}

// 2. 实现命令处理器
@Injectable()
export class CreateUserCommandHandler extends BaseCommandHandler<CreateUserCommand> {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly eventBus: EventBusImpl,
  ) {
    super();
  }

  async handle(command: CreateUserCommand): Promise<CommandResult> {
    try {
      // 1. 验证命令
      await this.validateCommand(command);

      // 2. 执行业务逻辑
      const user = User.create(EntityId.fromString(command.aggregateId), Email.create(command.email), Password.create(command.password), command.name ? UserName.create(command.name) : undefined);

      // 3. 保存
      await this.userRepository.save(user);

      // 4. 发布事件
      await this.eventBus.publish(...user.getUncommittedEvents());

      // 5. 返回结果
      return CommandResult.success({
        userId: user.getId().toString(),
      });
    } catch (error) {
      return CommandResult.failure(error instanceof Error ? error.message : String(error), "COMMAND_EXECUTION_FAILED");
    }
  }
}

// 3. 注册命令处理器
@Module({
  providers: [CreateUserCommandHandler],
})
export class UserModule {}

// 4. 使用命令总线执行
@Injectable()
export class UserController {
  constructor(private readonly commandBus: CommandQueryBusImpl) {}

  @Post("/users")
  async createUser(@Body() body: CreateUserDto) {
    const command = new CreateUserCommand(EntityId.generate().toString(), body);
    const result = await this.commandBus.executeCommand(command);

    if (!result.success) {
      throw new BadRequestException(result.error);
    }

    return result.data;
  }
}
```

---

## 查询（Queries）

查询用于读取数据，不改变系统状态。

### 查询实现

```typescript
import { BaseQuery, BaseQueryHandler, QueryResult } from "@hl8/application-kernel";

// 1. 定义查询
class GetUserQuery extends BaseQuery {
  public readonly userId!: string;

  constructor(userId: string) {
    super("GetUser", {
      correlationId: EntityId.generate().toString(),
    });
    this.userId = userId;
  }
}

// 2. 实现查询处理器
@Injectable()
export class GetUserQueryHandler extends BaseQueryHandler<GetUserQuery> {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly cache: InMemoryCache,
  ) {
    super();
  }

  async handle(query: GetUserQuery): Promise<QueryResult> {
    // 1. 检查缓存
    const cacheKey = `user:${query.userId}`;
    const cached = await this.cache.get<UserDto>(cacheKey);
    if (cached) {
      return QueryResult.success(cached);
    }

    // 2. 从仓储查询
    const user = await this.userRepository.findById(EntityId.fromString(query.userId));

    if (!user) {
      return QueryResult.failure("用户不存在", "USER_NOT_FOUND");
    }

    // 3. 转换为 DTO
    const dto: UserDto = {
      id: user.getId().toString(),
      email: user.getEmail().getValue(),
      name: user.getName()?.getValue(),
      createdAt: user.getCreatedAt(),
    };

    // 4. 缓存结果
    await this.cache.set(cacheKey, dto, 3600);

    // 5. 返回结果
    return QueryResult.success(dto);
  }
}

// 3. 使用查询总线执行
@Injectable()
export class UserController {
  constructor(private readonly queryBus: CommandQueryBusImpl) {}

  @Get("/users/:id")
  async getUser(@Param("id") id: string) {
    const query = new GetUserQuery(id);
    const result = await this.queryBus.executeQuery(query);

    if (!result.success) {
      throw new NotFoundException(result.error);
    }

    return result.data;
  }
}
```

---

## 事件（Events）

事件用于实现事件溯源和事件驱动架构。

### 事件存储

```typescript
import { EventStore, DomainEvent } from "@hl8/application-kernel";
import { EntityId } from "@hl8/domain-kernel";

@Injectable()
export class UserService {
  constructor(
    private readonly eventStore: EventStore,
    private readonly eventBus: EventBusImpl,
  ) {}

  async createUser(email: string, password: string): Promise<void> {
    // 1. 创建用户聚合
    const user = User.create(EntityId.generate(), Email.create(email), Password.create(password));

    // 2. 获取未提交的事件
    const events = user.getUncommittedEvents();

    // 3. 保存事件到事件存储
    await this.eventStore.appendEvents(user.getId().toString(), "User", events, user.getVersion());

    // 4. 提交事件（标记为已提交）
    user.markEventsAsCommitted();

    // 5. 发布事件到事件总线
    await this.eventBus.publish(...events);
  }

  async getUserById(userId: string): Promise<User> {
    // 1. 从事件存储获取所有事件
    const events = await this.eventStore.getEvents(userId, "User");

    // 2. 重放事件重建聚合状态
    const user = new User(EntityId.fromString(userId));
    events.forEach((event) => {
      user.applyDomainEvent(event);
    });

    return user;
  }
}
```

### 事件订阅

```typescript
import { EventBusImpl, DomainEvent } from "@hl8/application-kernel";

@Injectable()
export class UserCreatedEventHandler {
  constructor(
    private readonly emailService: EmailService,
    private readonly logger: Logger,
  ) {}

  @OnEvent(UserCreatedEvent)
  async handle(event: UserCreatedEvent) {
    this.logger.log("处理用户创建事件", {
      userId: event.aggregateId.toString(),
      email: event.email.getValue(),
    });

    // 发送欢迎邮件
    await this.emailService.sendWelcomeEmail(event.email.getValue(), event.name?.getValue());
  }
}
```

---

## 投影器（Projectors）

投影器用于将领域事件投影为读模型。

### 投影器实现

```typescript
import { Projector, ProjectorHandler } from "@hl8/application-kernel";

// 1. 定义读模型
interface UserReadModel {
  id: string;
  email: string;
  name?: string;
  createdAt: Date;
  updatedAt: Date;
}

// 2. 实现投影器处理器
@Injectable()
export class UserProjectorHandler extends ProjectorHandler {
  constructor(
    private readonly readModelStore: IReadModelStore,
    logger: Logger,
  ) {
    super(logger);
  }

  @ProjectorHandler({ eventType: "UserCreated" })
  async handleUserCreated(event: UserCreatedEvent): Promise<void> {
    const readModel: UserReadModel = {
      id: event.aggregateId.toString(),
      email: event.email.getValue(),
      name: event.name?.getValue(),
      createdAt: event.occurredOn,
      updatedAt: event.occurredOn,
    };

    await this.readModelStore.save("users", readModel);
  }

  @ProjectorHandler({ eventType: "UserUpdated" })
  async handleUserUpdated(event: UserUpdatedEvent): Promise<void> {
    const existing = await this.readModelStore.findById<UserReadModel>("users", event.aggregateId.toString());

    if (!existing) {
      return;
    }

    const updated: UserReadModel = {
      ...existing,
      name: event.name?.getValue(),
      updatedAt: event.occurredOn,
    };

    await this.readModelStore.update("users", updated);
  }
}

// 3. 注册投影器
@Module({
  providers: [UserProjectorHandler],
})
export class UserModule {}
```

---

## Saga

Saga 用于协调跨聚合的长时间运行业务流程。

### Saga 实现

```typescript
import { Saga, BaseSagaStep, SagaStateManager } from "@hl8/application-kernel";
import { EntityId } from "@hl8/domain-kernel";

// 1. 定义 Saga 数据
interface OrderProcessingSagaData {
  orderId: string;
  userId: string;
  amount: number;
  paymentId?: string;
  shippingId?: string;
}

// 2. 实现 Saga 步骤
class CreatePaymentStep extends BaseSagaStep {
  async execute(context: SagaContext): Promise<void> {
    const data = context.data as OrderProcessingSagaData;

    // 创建支付
    const payment = await this.paymentService.createPayment({
      orderId: data.orderId,
      amount: data.amount,
    });

    // 更新 Saga 数据
    context.data = {
      ...data,
      paymentId: payment.id,
    };
  }

  async compensate(context: SagaContext): Promise<void> {
    const data = context.data as OrderProcessingSagaData;

    // 取消支付
    if (data.paymentId) {
      await this.paymentService.cancelPayment(data.paymentId);
    }
  }
}

class CreateShippingStep extends BaseSagaStep {
  async execute(context: SagaContext): Promise<void> {
    const data = context.data as OrderProcessingSagaData;

    // 创建物流
    const shipping = await this.shippingService.createShipping({
      orderId: data.orderId,
    });

    // 更新 Saga 数据
    context.data = {
      ...data,
      shippingId: shipping.id,
    };
  }

  async compensate(context: SagaContext): Promise<void> {
    const data = context.data as OrderProcessingSagaData;

    // 取消物流
    if (data.shippingId) {
      await this.shippingService.cancelShipping(data.shippingId);
    }
  }
}

// 3. 实现 Saga
@Injectable()
export class OrderProcessingSaga extends Saga<OrderProcessingSagaData> {
  constructor(logger: Logger, aggregateId: EntityId) {
    super(
      logger,
      {
        name: "OrderProcessingSaga",
        description: "订单处理流程",
        enabled: true,
        timeout: 300000, // 5分钟
        retry: {
          maxAttempts: 3,
          backoffMs: 1000,
          maxBackoffMs: 10000,
        },
      },
      aggregateId,
    );
  }

  protected initializeSteps(): void {
    this.addStep(new CreatePaymentStep());
    this.addStep(new CreateShippingStep());
  }
}

// 4. 使用 Saga
@Injectable()
export class OrderService {
  constructor(
    private readonly sagaStateManager: SagaStateManager,
    private readonly logger: Logger,
  ) {}

  async processOrder(orderId: string, userId: string, amount: number): Promise<void> {
    const aggregateId = EntityId.fromString(orderId);
    const saga = new OrderProcessingSaga(this.logger, aggregateId);

    const sagaData: OrderProcessingSagaData = {
      orderId,
      userId,
      amount,
    };

    // 执行 Saga
    await saga.execute(sagaData);

    // 保存 Saga 状态
    await this.sagaStateManager.saveSagaState(saga.getState());
  }
}
```

---

## 完整示例

### 用户管理模块完整示例

```typescript
// user.module.ts
@Module({
  imports: [ApplicationKernelModule],
  controllers: [UserController],
  providers: [CreateUserUseCase, CreateUserCommandHandler, GetUserQueryHandler, UserProjectorHandler, UserRepository],
})
export class UserModule {}

// user.controller.ts
@Controller("/users")
export class UserController {
  constructor(
    private readonly createUserUseCase: CreateUserUseCase,
    private readonly commandBus: CommandQueryBusImpl,
    private readonly queryBus: CommandQueryBusImpl,
  ) {}

  @Post()
  async createUser(@Body() body: CreateUserDto) {
    // 方式1: 使用用例
    const input = new CreateUserInput(body);
    return await this.createUserUseCase.execute(input);

    // 方式2: 使用命令
    // const command = new CreateUserCommand(
    //   EntityId.generate().toString(),
    //   body,
    // );
    // const result = await this.commandBus.executeCommand(command);
    // return result.data;
  }

  @Get(":id")
  async getUser(@Param("id") id: string) {
    const query = new GetUserQuery(id);
    const result = await this.queryBus.executeQuery(query);
    return result.data;
  }
}
```

---

## 最佳实践

### 1. 用例优先

优先使用用例作为业务逻辑入口：

```typescript
// ✅ 推荐
const output = await this.createUserUseCase.execute(input);

// ⚠️ 不推荐直接操作聚合
const user = User.create(...);
await this.userRepository.save(user);
```

### 2. CQRS 分离

严格分离命令和查询：

```typescript
// ✅ 命令：改变状态
class CreateUserCommand extends BaseCommand { ... }

// ✅ 查询：读取数据
class GetUserQuery extends BaseQuery { ... }
```

### 3. 事件驱动

使用事件实现松耦合：

```typescript
// ✅ 发布事件
await this.eventBus.publish(...user.getUncommittedEvents());

// ✅ 订阅事件
@OnEvent(UserCreatedEvent)
async handle(event: UserCreatedEvent) { ... }
```

### 4. 异常处理

使用应用层异常类型：

```typescript
// ✅ 使用应用层异常
throw new UseCaseValidationException("用户已存在", "USER_ALREADY_EXISTS", this.useCaseName, input);
```

### 5. 日志记录

利用基类提供的日志功能：

```typescript
// ✅ 日志自动记录
// UseCase、Command、Query 基类自动记录执行日志
```

---

## 下一步

- 📖 查看 [完整 API 文档](./API.md)
- 🔧 了解 [配置选项](./CONFIG.md)
- 🐛 查看 [故障排除指南](./TROUBLESHOOTING.md)
- 🚀 阅读 [性能调优指南](./PERFORMANCE.md)

---

**提示**: 本指南提供了基础用法，更多高级功能请参考完整文档。
