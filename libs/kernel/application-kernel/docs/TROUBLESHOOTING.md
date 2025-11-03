# 故障排除指南

**版本**: 1.0.0  
**更新日期**: 2024-12-19

本文档帮助您诊断和解决使用 `@hl8/application-kernel` 时遇到的常见问题。

---

## 📋 目录

1. [快速诊断](#快速诊断)
2. [常见错误](#常见错误)
3. [用例相关问题](#用例相关问题)
4. [命令和查询问题](#命令和查询问题)
5. [事件相关问题](#事件相关问题)
6. [Saga 问题](#saga-问题)
7. [配置问题](#配置问题)
8. [性能问题](#性能问题)
9. [集成问题](#集成问题)
10. [调试技巧](#调试技巧)

---

## 快速诊断

### 检查清单

遇到问题时，先检查以下内容：

- [ ] 是否正确安装所有依赖？
- [ ] TypeScript 版本是否符合要求（>= 5.9.3）？
- [ ] Node.js 版本是否符合要求（>= 20）？
- [ ] 是否正确配置了 `ApplicationKernelModule`？
- [ ] 日志中是否有相关错误信息？
- [ ] 是否在正确的模块中注入了所需的服务？

### 启用调试日志

```typescript
// 在配置中启用详细日志
LoggerModule.forRoot({
  level: "debug", // 或 "trace"
});
```

---

## 常见错误

### 错误：模块未找到

**症状**:

```
Error: Cannot find module '@hl8/application-kernel'
```

**原因**: 依赖未正确安装或路径配置错误。

**解决方案**:

```bash
# 1. 确保使用 pnpm（推荐）
pnpm install

# 2. 检查 package.json 中的依赖
# 确保包含：
# "@hl8/application-kernel": "workspace:*"

# 3. 清理并重新安装
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

---

### 错误：类型错误

**症状**:

```
error TS2307: Cannot find module '...'
error TS2339: Property '...' does not exist
```

**原因**: TypeScript 配置不正确或类型定义缺失。

**解决方案**:

1. **检查 tsconfig.json**:

```json
{
  "compilerOptions": {
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true
  }
}
```

2. **确保导入路径使用 `.js` 扩展名**:

```typescript
// ✅ 正确
import { UseCase } from "@hl8/application-kernel";

// ✅ 正确（相对路径）
import { MyClass } from "./my-class.js";

// ❌ 错误
import { MyClass } from "./my-class"; // 缺少 .js
```

3. **重新构建类型定义**:

```bash
cd libs/kernel/application-kernel
pnpm run build
```

---

### 错误：依赖注入失败

**症状**:

```
Error: Nest can't resolve dependencies of the UseCase
```

**原因**: 缺少必要的依赖或未正确注册提供者。

**解决方案**:

1. **检查构造函数参数**:

```typescript
// ✅ 正确
@Injectable()
export class MyUseCase extends UseCase<Input, Output> {
  constructor(
    private readonly repository: IRepository,
    logger: Logger, // Logger 必须注入
  ) {
    super(logger); // 必须调用 super
  }
}
```

2. **确保在模块中注册**:

```typescript
@Module({
  providers: [
    MyUseCase, // ✅ 注册用例
    MyRepository, // ✅ 注册依赖
  ],
})
export class MyModule {}
```

3. **检查模块导入**:

```typescript
@Module({
  imports: [
    ApplicationKernelModule, // ✅ 必须导入
  ],
})
export class AppModule {}
```

---

## 用例相关问题

### 用例执行失败但无详细错误

**症状**: 用例返回失败但错误信息不明确。

**解决方案**:

1. **检查日志**:

```typescript
// 用例会自动记录详细日志
// 查看日志输出获取更多信息
```

2. **捕获并记录异常**:

```typescript
try {
  const output = await useCase.execute(input);
} catch (error) {
  console.error("用例执行失败:", {
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    input: input.getSummary(),
  });
  throw error;
}
```

3. **验证输入**:

```typescript
// 使用 class-validator 验证输入
class MyInput extends UseCaseInput {
  @IsNotEmpty()
  @IsString()
  public readonly field!: string;
}
```

---

### 用例输入验证失败

**症状**:

```
UseCaseValidationException: 输入验证失败
```

**解决方案**:

1. **检查验证装饰器**:

```typescript
class MyInput extends UseCaseInput {
  @IsNotEmpty() // ✅ 确保使用正确的验证装饰器
  @IsString()
  @MinLength(3)
  public readonly field!: string;
}
```

2. **查看验证详情**:

```typescript
try {
  await useCase.execute(input);
} catch (error) {
  if (error instanceof UseCaseValidationException) {
    console.error("验证失败:", error.getContext());
  }
}
```

---

## 命令和查询问题

### 命令处理器未找到

**症状**:

```
Error: No handler for command CreateUserCommand
```

**解决方案**:

1. **确保正确注册处理器**:

```typescript
@Module({
  providers: [
    CreateUserCommandHandler, // ✅ 必须注册
  ],
})
export class UserModule {}
```

2. **使用命令总线注册**:

```typescript
@Injectable()
export class UserService {
  constructor(private readonly commandBus: CommandQueryBusImpl) {}

  async onModuleInit() {
    // 手动注册处理器
    await this.commandBus.registerCommandHandler("CreateUser", this.commandHandler);
  }
}
```

3. **检查命令类型匹配**:

```typescript
class CreateUserCommand extends BaseCommand {
  constructor(aggregateId: string) {
    super(aggregateId, "CreateUser"); // ✅ 类型必须匹配
  }
}
```

---

### 查询结果为空或错误

**症状**: 查询返回空结果或错误数据。

**解决方案**:

1. **检查查询处理器实现**:

```typescript
async handle(query: GetUserQuery): Promise<QueryResult> {
  // ✅ 确保返回正确格式
  const user = await this.repository.findById(query.userId);

  if (!user) {
    return QueryResult.failure("用户不存在", "USER_NOT_FOUND");
  }

  return QueryResult.success(user); // ✅ 使用 success 方法
}
```

2. **验证查询参数**:

```typescript
async handle(query: GetUserQuery): Promise<QueryResult> {
  // ✅ 验证查询参数
  if (!query.userId) {
    return QueryResult.failure("用户ID不能为空", "INVALID_QUERY");
  }
  // ...
}
```

3. **检查缓存**:

```typescript
// 如果使用缓存，检查缓存是否过期或无效
const cached = await this.cache.get(key);
if (cached) {
  return QueryResult.success(cached);
}
```

---

## 事件相关问题

### 事件未发布

**症状**: 领域事件未触发或未被处理。

**解决方案**:

1. **确保标记事件为已提交**:

```typescript
const user = User.create(...);
const events = user.getUncommittedEvents();

// ✅ 发布事件
await this.eventBus.publish(...events);

// ✅ 标记为已提交
user.markEventsAsCommitted();
```

2. **检查事件订阅**:

```typescript
@OnEvent(UserCreatedEvent)
async handle(event: UserCreatedEvent) {
  // ✅ 确保正确订阅
  console.log("事件处理:", event);
}
```

3. **验证事件总线配置**:

```typescript
ApplicationKernelModule.forRoot({
  eventBus: {
    deliveryGuarantee: "at-least-once", // ✅ 确保配置正确
    retryPolicy: {
      maxRetries: 3,
      backoffMs: 1000,
    },
  },
});
```

---

### 事件存储失败

**症状**:

```
EventStoreException: 事件存储失败
```

**解决方案**:

1. **检查数据库连接**:

```typescript
// ✅ 确保数据库连接配置正确
ApplicationKernelModule.forRoot({
  eventStore: {
    type: "hybrid",
    postgresql: process.env.POSTGRES_URL, // ✅ 检查环境变量
    mongodb: process.env.MONGODB_URL,
  },
});
```

2. **检查版本冲突**:

```typescript
// ✅ 使用乐观并发控制
await this.eventStore.saveEvents(
  aggregateId,
  events,
  expectedVersion, // ✅ 确保版本正确
);
```

3. **查看详细错误**:

```typescript
try {
  await this.eventStore.saveEvents(...);
} catch (error) {
  if (error instanceof EventStoreException) {
    console.error("事件存储失败:", {
      aggregateId: error.getContext().aggregateId,
      error: error.message,
    });
  }
}
```

---

### 事件重放失败

**症状**: 从事件重建聚合状态失败。

**解决方案**:

1. **确保正确应用事件**:

```typescript
async getUserById(userId: string): Promise<User> {
  const events = await this.eventStore.getEvents(userId);

  // ✅ 创建聚合实例
  const user = new User(EntityId.fromString(userId));

  // ✅ 按顺序应用事件
  events.forEach((event) => {
    user.applyDomainEvent(event);
  });

  return user;
}
```

2. **检查事件顺序**:

```typescript
// ✅ 确保事件按版本顺序排列
const events = await this.eventStore.getEvents(aggregateId);
events.sort((a, b) => a.version - b.version);
```

---

## Saga 问题

### Saga 执行失败

**症状**: Saga 执行过程中失败或卡住。

**解决方案**:

1. **检查步骤实现**:

```typescript
class MySagaStep extends BaseSagaStep {
  async execute(context: SagaContext): Promise<void> {
    try {
      // ✅ 确保正确处理错误
      await this.doWork();
    } catch (error) {
      // ✅ 记录错误并重新抛出
      this.logger.error("步骤执行失败", { error });
      throw error;
    }
  }
}
```

2. **检查超时配置**:

```typescript
const saga = new MySaga(logger, {
  name: "MySaga",
  timeout: 300000, // ✅ 设置合理的超时时间（5分钟）
  // ...
});
```

3. **查看 Saga 状态**:

```typescript
// ✅ 查询 Saga 状态
const state = await this.sagaStateManager.getSagaState(sagaId);
console.log("Saga 状态:", {
  status: state.status,
  currentStep: state.currentStepIndex,
  error: state.error,
});
```

---

### Saga 补偿失败

**症状**: Saga 补偿操作未正确执行。

**解决方案**:

1. **实现补偿方法**:

```typescript
class MySagaStep extends BaseSagaStep {
  async execute(context: SagaContext): Promise<void> {
    // 执行操作
    await this.service.doWork();
  }

  async compensate(context: SagaContext): Promise<void> {
    // ✅ 实现补偿逻辑
    try {
      await this.service.undoWork();
    } catch (error) {
      this.logger.error("补偿失败", { error });
      throw error;
    }
  }
}
```

2. **检查补偿配置**:

```typescript
const saga = new MySaga(logger, {
  name: "MySaga",
  compensation: {
    enabled: true, // ✅ 启用补偿
    timeout: 60000,
    maxAttempts: 3,
  },
});
```

---

### Saga 状态丢失

**症状**: Saga 状态未正确持久化。

**解决方案**:

1. **确保保存状态**:

```typescript
await saga.execute(data);

// ✅ 保存 Saga 状态
const state = saga.getState();
await this.sagaStateManager.saveSagaState(state);
```

2. **检查状态存储配置**:

```typescript
// ✅ 确保使用正确的状态存储
const stateManager = new SagaStateManager(
  logger,
  stateStore, // ✅ 检查 stateStore 实现
);
```

---

## 配置问题

### 配置验证失败

**症状**:

```
ConfigValidationException: 配置验证失败
```

**解决方案**:

1. **检查配置格式**:

```typescript
// ✅ 确保配置符合接口定义
const config: ApplicationKernelConfig = {
  eventStore: {
    type: "hybrid", // ✅ 必须是 "postgresql" | "mongodb" | "hybrid"
    connection: {
      host: "localhost",
      port: 5432,
      database: "events",
    },
  },
  // ...
};
```

2. **查看验证错误**:

```typescript
const result = await configService.updateConfig(newConfig);
if (!result.valid) {
  console.error("配置验证失败:", result.errors);
}
```

---

### 配置未生效

**症状**: 修改配置后未生效。

**解决方案**:

1. **重新加载配置**:

```typescript
// ✅ 确保调用 updateConfig
await configService.updateConfig(newConfig);

// ✅ 如果有回调，确保注册
configService.onConfigUpdate((newConfig) => {
  console.log("配置已更新:", newConfig);
});
```

2. **检查热重载**:

```typescript
// ✅ 如果使用热重载，确保服务重启
ApplicationKernelModule.forRoot({
  // 配置会自动验证
});
```

---

## 性能问题

### 用例执行缓慢

**症状**: 用例执行时间过长。

**解决方案**:

1. **检查数据库查询**:

```typescript
// ✅ 优化数据库查询
const user = await this.repository.findById(id); // 使用索引
const users = await this.repository.findMany({
  limit: 100, // ✅ 限制结果数量
  offset: 0,
});
```

2. **使用缓存**:

```typescript
// ✅ 缓存常用数据
const cacheKey = `user:${id}`;
const cached = await this.cache.get<User>(cacheKey);
if (cached) {
  return cached;
}

const user = await this.repository.findById(id);
await this.cache.set(cacheKey, user, 3600); // 缓存 1 小时
```

3. **检查日志级别**:

```typescript
// ✅ 生产环境使用 info 级别
LoggerModule.forRoot({
  level: process.env.NODE_ENV === "production" ? "info" : "debug",
});
```

---

### 事件处理延迟

**症状**: 事件处理缓慢或积压。

**解决方案**:

1. **增加并发数**:

```typescript
ApplicationKernelModule.forRoot({
  eventBus: {
    maxConcurrency: 20, // ✅ 增加并发处理数
  },
});
```

2. **使用批处理**:

```typescript
// ✅ 批量处理事件
await this.eventBus.publishMany(events);
```

3. **检查事件处理器**:

```typescript
@OnEvent(UserCreatedEvent)
async handle(event: UserCreatedEvent) {
  // ✅ 使用异步处理
  setImmediate(async () => {
    await this.processEvent(event);
  });
}
```

---

## 集成问题

### 与 domain-kernel 集成问题

**症状**: 无法正确使用领域层功能。

**解决方案**:

1. **检查依赖**:

```typescript
// ✅ 确保安装了 domain-kernel
import { EntityId, DomainEvent } from "@hl8/domain-kernel";
```

2. **使用正确的类型**:

```typescript
// ✅ 使用 EntityId 而不是字符串
const userId = EntityId.generate();
const user = await this.repository.findById(EntityId.fromString(id));
```

3. **检查事件类型**:

```typescript
// ✅ 使用 DomainEvent 类型
const event: DomainEvent = new UserCreatedEvent(userId, email);
```

---

### 与 NestJS 集成问题

**症状**: NestJS 相关功能不工作。

**解决方案**:

1. **检查模块导入**:

```typescript
@Module({
  imports: [
    ApplicationKernelModule.forRoot({...}), // ✅ 正确导入
  ],
})
export class AppModule {}
```

2. **使用正确的装饰器**:

```typescript
// ✅ 使用 @Injectable() 装饰器
@Injectable()
export class MyUseCase extends UseCase<Input, Output> {
  // ...
}
```

3. **检查依赖注入**:

```typescript
// ✅ 确保在构造函数中正确注入
constructor(
  private readonly service: MyService,
  logger: Logger, // ✅ Logger 必须注入
) {
  super(logger);
}
```

---

## 调试技巧

### 启用详细日志

```typescript
// 在开发环境中启用详细日志
LoggerModule.forRoot({
  level: "debug", // 或 "trace"
  prettyPrint: true,
});
```

### 使用调试器

```typescript
// 在代码中设置断点
debugger; // 或使用 IDE 断点

// 检查对象状态
console.log("UseCase 状态:", {
  input: input.getSummary(),
  context: useCase.context,
});
```

### 查看内部状态

```typescript
// 查看事件总线统计
const stats = await eventBus.getStatistics();
console.log("事件总线统计:", stats);

// 查看命令总线统计
const busStats = await commandBus.getStatistics();
console.log("命令总线统计:", busStats);

// 查看缓存统计
const cacheStats = await cache.getStatistics();
console.log("缓存统计:", cacheStats);
```

---

## 获取帮助

如果以上方法都无法解决问题，请：

1. **查看日志**: 检查应用日志中的详细错误信息
2. **查看文档**: 参考 [快速入门指南](./QUICKSTART.md) 和 [API 文档](./API.md)
3. **检查示例**: 查看项目中的测试用例和示例代码
4. **提交 Issue**: 在项目仓库提交包含详细信息的 Issue

---

**提示**: 本文档会持续更新，如果您发现新的问题或解决方案，欢迎贡献。
