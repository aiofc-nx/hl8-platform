# 迁移指南

**版本**: 1.0.0  
**更新日期**: 2024-12-19

本指南帮助您从现有的应用层实现迁移到 `@hl8/application-kernel`，实现标准化和架构统一。

---

## 📋 目录

1. [迁移概述](#迁移概述)
2. [迁移前准备](#迁移前准备)
3. [用例迁移](#用例迁移)
4. [命令和查询迁移](#命令和查询迁移)
5. [事件处理迁移](#事件处理迁移)
6. [配置迁移](#配置迁移)
7. [异常处理迁移](#异常处理迁移)
8. [测试迁移](#测试迁移)
9. [常见问题](#常见问题)
10. [迁移检查清单](#迁移检查清单)

---

## 迁移概述

### 为什么迁移？

迁移到 `@hl8/application-kernel` 可以：

- ✅ **标准化架构**: 统一应用层开发模式
- ✅ **提高可维护性**: 使用经过验证的框架和模式
- ✅ **增强功能**: 获得事件溯源、Saga、投影器等高级功能
- ✅ **减少代码**: 复用核心基础设施代码
- ✅ **类型安全**: 完整的 TypeScript 类型支持

### 迁移策略

**推荐迁移方式**:

1. **渐进式迁移**: 逐个模块迁移，而不是一次性全部迁移
2. **并行运行**: 新旧系统并行运行一段时间，确保稳定性
3. **充分测试**: 迁移后进行全面测试

---

## 迁移前准备

### 1. 评估现有代码

评估现有应用层代码：

```typescript
// 评估清单
const assessment = {
  // 用例数量
  useCaseCount: countUseCases(),

  // 命令和查询数量
  commandCount: countCommands(),
  queryCount: countQueries(),

  // 事件处理数量
  eventHandlerCount: countEventHandlers(),

  // 依赖关系
  dependencies: analyzeDependencies(),

  // 测试覆盖率
  testCoverage: calculateCoverage(),
};
```

### 2. 安装依赖

```bash
# 安装 application-kernel
pnpm add @hl8/application-kernel

# 确保安装相关依赖
pnpm add @hl8/domain-kernel @hl8/config @hl8/logger @nestjs/cqrs
```

### 3. 配置模块

```typescript
// 在根模块中配置
@Module({
  imports: [
    ApplicationKernelModule.forRoot({
      // 配置选项
    }),
  ],
})
export class AppModule {}
```

---

## 用例迁移

### 从传统服务迁移

**迁移前** (传统服务):

```typescript
@Injectable()
export class UserService {
  async createUser(data: CreateUserDto): Promise<UserDto> {
    // 验证
    if (!data.email) {
      throw new Error("Email is required");
    }

    // 业务逻辑
    const user = await this.repository.create({
      email: data.email,
      password: hashPassword(data.password),
    });

    // 发送事件
    await this.eventEmitter.emit("user.created", user);

    return user;
  }
}
```

**迁移后** (用例):

```typescript
// 1. 定义输入
class CreateUserInput extends UseCaseInput {
  @IsNotEmpty()
  @IsString()
  @IsEmail()
  public readonly email!: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(8)
  public readonly password!: string;
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
    // 业务逻辑
    const user = User.create(EntityId.generate(), Email.create(input.email), Password.create(input.password));

    await this.userRepository.save(user);

    // 发布领域事件
    await this.eventBus.publish(...user.getUncommittedEvents());

    return new CreateUserOutput({
      userId: user.getId().toString(),
      email: user.getEmail().getValue(),
      createdAt: user.getCreatedAt(),
    });
  }
}
```

### 迁移步骤

1. **创建输入类**: 继承 `UseCaseInput`，使用 `class-validator` 验证
2. **创建输出类**: 继承 `UseCaseOutput`
3. **实现用例**: 继承 `UseCase`，实现 `executeBusinessLogic`
4. **更新调用**: 将服务调用改为用例调用

---

## 命令和查询迁移

### 命令迁移

**迁移前** (REST Controller):

```typescript
@Controller("/users")
export class UserController {
  @Post()
  async createUser(@Body() data: CreateUserDto) {
    return await this.userService.createUser(data);
  }
}
```

**迁移后** (命令模式):

```typescript
// 1. 定义命令
class CreateUserCommand extends BaseCommand {
  public readonly email!: string;
  public readonly password!: string;

  constructor(aggregateId: string, data: { email: string; password: string }) {
    super(aggregateId, "CreateUser");
    this.email = data.email;
    this.password = data.password;
  }
}

// 2. 实现命令处理器
@Injectable()
export class CreateUserCommandHandler extends BaseCommandHandler<CreateUserCommand> {
  async handle(command: CreateUserCommand): Promise<CommandResult> {
    const user = User.create(EntityId.fromString(command.aggregateId), Email.create(command.email), Password.create(command.password));

    await this.userRepository.save(user);
    await this.eventBus.publish(...user.getUncommittedEvents());

    return CommandResult.success({
      userId: user.getId().toString(),
    });
  }
}

// 3. 使用命令总线
@Controller("/users")
export class UserController {
  constructor(private readonly commandBus: CommandQueryBusImpl) {}

  @Post()
  async createUser(@Body() data: CreateUserDto) {
    const command = new CreateUserCommand(EntityId.generate().toString(), data);
    const result = await this.commandBus.executeCommand(command);
    return result.data;
  }
}
```

### 查询迁移

**迁移前**:

```typescript
@Controller("/users")
export class UserController {
  @Get(":id")
  async getUser(@Param("id") id: string) {
    return await this.userService.findById(id);
  }
}
```

**迁移后**:

```typescript
// 1. 定义查询
class GetUserQuery extends BaseQuery {
  public readonly userId!: string;

  constructor(userId: string) {
    super("GetUser");
    this.userId = userId;
  }
}

// 2. 实现查询处理器
@Injectable()
export class GetUserQueryHandler extends BaseQueryHandler<GetUserQuery> {
  async handle(query: GetUserQuery): Promise<QueryResult> {
    const user = await this.userRepository.findById(EntityId.fromString(query.userId));

    if (!user) {
      return QueryResult.failure("用户不存在", "USER_NOT_FOUND");
    }

    return QueryResult.success({
      id: user.getId().toString(),
      email: user.getEmail().getValue(),
    });
  }
}

// 3. 使用查询总线
@Controller("/users")
export class UserController {
  constructor(private readonly queryBus: CommandQueryBusImpl) {}

  @Get(":id")
  async getUser(@Param("id") id: string) {
    const query = new GetUserQuery(id);
    const result = await this.queryBus.executeQuery(query);
    return result.data;
  }
}
```

---

## 事件处理迁移

### 从事件发射器迁移

**迁移前**:

```typescript
@Injectable()
export class UserService {
  constructor(private readonly eventEmitter: EventEmitter2) {}

  async createUser(data: CreateUserDto) {
    const user = await this.repository.create(data);

    // 发送事件
    this.eventEmitter.emit("user.created", user);

    return user;
  }
}

// 事件监听器
@Injectable()
export class UserEventListener {
  @OnEvent("user.created")
  handleUserCreated(user: User) {
    // 处理事件
  }
}
```

**迁移后**:

```typescript
// 1. 使用事件总线
@Injectable()
export class CreateUserUseCase extends UseCase<Input, Output> {
  constructor(
    private readonly eventBus: EventBusImpl,
    logger: Logger,
  ) {
    super(logger);
  }

  protected async executeBusinessLogic(input: Input): Promise<Output> {
    const user = User.create(...);

    // ✅ 发布领域事件
    await this.eventBus.publish(...user.getUncommittedEvents());

    return output;
  }
}

// 2. 事件处理器
@Injectable()
export class UserCreatedEventHandler {
  @OnEvent(UserCreatedEvent)
  async handle(event: UserCreatedEvent) {
    // ✅ 使用类型化事件
    const userId = event.aggregateId.toString();
    const email = event.email.getValue();

    // 处理事件
    await this.sendWelcomeEmail(email);
  }
}
```

### 事件存储迁移

**迁移前** (无事件存储):

```typescript
// 直接保存到数据库
await this.repository.save(user);
```

**迁移后** (事件溯源):

```typescript
// 1. 保存事件
const events = user.getUncommittedEvents();
await this.eventStore.saveEvents(user.getId(), events, user.getVersion());

// 2. 标记事件为已提交
user.markEventsAsCommitted();

// 3. 发布事件
await this.eventBus.publish(...events);
```

---

## 配置迁移

### 配置结构迁移

**迁移前** (简单配置):

```typescript
const config = {
  database: {
    host: "localhost",
    port: 5432,
  },
};
```

**迁移后** (类型化配置):

```typescript
import { ApplicationKernelConfig } from "@hl8/application-kernel";

const config: ApplicationKernelConfig = {
  eventStore: {
    type: "hybrid",
    connection: {
      host: "localhost",
      port: 5432,
      database: "events",
    },
  },
  eventBus: {
    deliveryGuarantee: "at-least-once",
    retryPolicy: {
      maxAttempts: 3,
      backoffMs: 1000,
    },
  },
  cache: {
    type: "memory",
    ttl: {
      default: 3600,
    },
  },
};

// 使用配置服务
const configService = new ApplicationKernelConfigService(logger);
await configService.updateConfig(config);
```

---

## 异常处理迁移

### 从通用异常迁移

**迁移前**:

```typescript
try {
  await this.service.createUser(data);
} catch (error) {
  throw new Error("创建用户失败"); // ❌ 通用错误
}
```

**迁移后**:

```typescript
import { UseCaseException, UseCaseValidationException, ExceptionCodes } from "@hl8/application-kernel";

try {
  await this.useCase.execute(input);
} catch (error) {
  // ✅ 使用应用层异常
  if (error instanceof UseCaseValidationException) {
    throw error; // 直接重新抛出
  }

  throw new UseCaseException("创建用户失败", ExceptionCodes.USE_CASE_EXECUTION_FAILED, "CreateUserUseCase", input, { originalError: error.message }, error);
}
```

### 异常代码迁移

**迁移前**:

```typescript
throw new Error("USER_ALREADY_EXISTS"); // ❌ 字符串错误码
```

**迁移后**:

```typescript
import { ExceptionCodes } from "@hl8/application-kernel";

throw new UseCaseValidationException(
  "用户已存在",
  ExceptionCodes.USE_CASE_VALIDATION_FAILED, // ✅ 使用枚举
  "CreateUserUseCase",
  input,
);
```

---

## 测试迁移

### 单元测试迁移

**迁移前**:

```typescript
describe("UserService", () => {
  it("should create user", async () => {
    const service = new UserService(mockRepository);
    const result = await service.createUser({ email: "test@example.com" });
    expect(result.email).toBe("test@example.com");
  });
});
```

**迁移后**:

```typescript
describe("CreateUserUseCase", () => {
  it("should create user", async () => {
    const useCase = new CreateUserUseCase(mockRepository, mockEventBus, logger);

    const input = new CreateUserInput({
      email: "test@example.com",
      password: "password123",
    });

    const output = await useCase.execute(input);

    expect(output.email).toBe("test@example.com");
  });
});
```

---

## 常见问题

### Q1: 迁移后性能会下降吗？

**A**: 不会。`@hl8/application-kernel` 经过性能优化，通常性能会提升。如果遇到性能问题，请参考 [性能调优指南](./PERFORMANCE.md)。

### Q2: 需要一次性迁移所有代码吗？

**A**: 不需要。建议渐进式迁移：

1. 先迁移新功能
2. 逐步迁移现有功能
3. 保持新旧系统并行运行

### Q3: 如何迁移数据库？

**A**: 如果使用事件溯源：

1. 保留现有数据库（作为读模型）
2. 新增事件存储表
3. 逐步将写入操作改为事件存储
4. 使用投影器更新读模型

### Q4: 如何处理依赖注入变化？

**A**:

1. 确保在模块中注册新的提供者
2. 更新构造函数注入
3. 使用 `ApplicationKernelModule` 提供的服务

---

## 迁移检查清单

### 准备阶段

- [ ] 评估现有代码复杂度
- [ ] 确定迁移范围
- [ ] 安装依赖包
- [ ] 配置 `ApplicationKernelModule`
- [ ] 创建测试环境

### 迁移阶段

- [ ] 迁移用例（Use Cases）
- [ ] 迁移命令（Commands）
- [ ] 迁移查询（Queries）
- [ ] 迁移事件处理
- [ ] 迁移异常处理
- [ ] 更新配置

### 测试阶段

- [ ] 单元测试通过
- [ ] 集成测试通过
- [ ] 性能测试通过
- [ ] 端到端测试通过

### 部署阶段

- [ ] 代码审查完成
- [ ] 文档更新完成
- [ ] 部署到测试环境
- [ ] 验证功能正常
- [ ] 监控性能指标
- [ ] 逐步发布到生产环境

---

## 迁移示例

### 完整迁移示例：用户管理模块

**迁移前结构**:

```
src/
├── services/
│   └── user.service.ts
├── controllers/
│   └── user.controller.ts
└── events/
    └── user.events.ts
```

**迁移后结构**:

```
src/
├── use-cases/
│   ├── create-user.use-case.ts
│   └── get-user.use-case.ts
├── commands/
│   ├── create-user.command.ts
│   └── create-user.command-handler.ts
├── queries/
│   ├── get-user.query.ts
│   └── get-user.query-handler.ts
├── events/
│   └── user-created.event-handler.ts
└── controllers/
    └── user.controller.ts
```

**迁移步骤**:

1. **创建用例**:

```typescript
// src/use-cases/create-user.use-case.ts
@Injectable()
export class CreateUserUseCase extends UseCase<CreateUserInput, CreateUserOutput> {
  // 实现
}
```

2. **创建命令**:

```typescript
// src/commands/create-user.command.ts
export class CreateUserCommand extends BaseCommand {
  // 定义
}

// src/commands/create-user.command-handler.ts
@Injectable()
export class CreateUserCommandHandler extends BaseCommandHandler<CreateUserCommand> {
  // 实现
}
```

3. **更新控制器**:

```typescript
@Controller("/users")
export class UserController {
  constructor(
    private readonly createUserUseCase: CreateUserUseCase,
    private readonly commandBus: CommandQueryBusImpl,
  ) {}

  @Post()
  async createUser(@Body() data: CreateUserDto) {
    // 使用用例或命令
    return await this.createUserUseCase.execute(new CreateUserInput(data));
  }
}
```

---

## 迁移工具和建议

### 代码转换工具

可以使用以下工具辅助迁移：

1. **TypeScript 重构工具**: 使用 IDE 的重构功能
2. **代码生成器**: 为新模块生成模板代码
3. **自动化测试**: 确保迁移后功能一致

### 迁移最佳实践

1. **小步迁移**: 每次迁移一个小模块
2. **保持测试**: 迁移前后测试保持一致
3. **文档同步**: 及时更新文档
4. **代码审查**: 确保代码质量
5. **监控指标**: 监控迁移后的性能

---

## 回滚策略

如果迁移遇到问题，可以：

1. **保留旧代码**: 迁移时保留旧代码，以便快速回滚
2. **特性开关**: 使用特性开关控制新旧代码路径
3. **版本控制**: 使用 Git 分支管理迁移过程
4. **监控告警**: 设置监控告警，及时发现问题

---

## 获取帮助

迁移过程中遇到问题：

1. 查看 [快速入门指南](./QUICKSTART.md)
2. 查看 [故障排除指南](./TROUBLESHOOTING.md)
3. 查看 [API 文档](./API.md)
4. 查看项目示例代码
5. 提交 Issue 获取帮助

---

**提示**: 迁移是一个逐步的过程，不要急于一次性完成所有迁移。确保每个步骤都经过充分测试。
