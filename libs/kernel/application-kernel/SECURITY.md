# 安全考虑文档

**版本**: 1.0.0  
**更新日期**: 2024-12-19

本文档阐述使用 `@hl8/application-kernel` 时需要考虑的安全问题和最佳实践，帮助构建安全可靠的应用。

---

## 📋 目录

1. [安全概述](#安全概述)
2. [输入验证](#输入验证)
3. [身份认证和授权](#身份认证和授权)
4. [数据安全](#数据安全)
5. [事件安全](#事件安全)
6. [Saga 安全](#saga-安全)
7. [缓存安全](#缓存安全)
8. [日志安全](#日志安全)
9. [配置安全](#配置安全)
10. [最佳实践](#最佳实践)

---

## 安全概述

### 安全原则

应用层安全应遵循以下原则：

1. **最小权限原则**: 只授予必要的权限
2. **深度防御**: 多层安全防护
3. **输入验证**: 所有输入必须验证
4. **输出编码**: 防止注入攻击
5. **安全默认值**: 默认采用最安全的配置
6. **审计追踪**: 记录所有安全相关操作

### 安全责任

- **应用层**: 输入验证、授权检查、数据脱敏
- **领域层**: 业务规则验证、领域约束
- **基础设施层**: 网络加密、数据库安全

---

## 输入验证

### 用例输入验证

**关键点**: 所有用例输入必须经过严格验证。

```typescript
import { IsNotEmpty, IsString, IsEmail, MinLength, MaxLength } from "class-validator";

class CreateUserInput extends UseCaseInput {
  // ✅ 使用验证装饰器
  @IsNotEmpty()
  @IsEmail()
  @MaxLength(100) // ✅ 限制长度，防止DoS
  public readonly email!: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(8) // ✅ 密码最小长度
  @MaxLength(100)
  public readonly password!: string;

  // ✅ 验证用户ID
  @IsOptional()
  @IsString()
  @IsUUID()
  public readonly userId?: string;
}
```

### 命令验证

```typescript
class CreateUserCommand extends BaseCommand {
  // ✅ 验证聚合ID格式
  @IsNotEmpty()
  @IsString()
  @IsUUID()
  public readonly aggregateId!: string;

  // ✅ 验证命令数据
  @IsNotEmpty()
  @IsEmail()
  public readonly email!: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(8)
  public readonly password!: string;
}

// ✅ 在处理器中再次验证
@Injectable()
export class CreateUserCommandHandler extends BaseCommandHandler<CreateUserCommand> {
  async handle(command: CreateUserCommand): Promise<CommandResult> {
    // ✅ 再次验证命令
    await this.validateCommand(command);

    // ✅ 业务规则验证
    if (await this.isEmailExists(command.email)) {
      return CommandResult.failure("邮箱已存在", "EMAIL_ALREADY_EXISTS");
    }

    // 执行业务逻辑
    // ...
  }
}
```

### 查询验证

```typescript
class GetUserQuery extends BaseQuery {
  // ✅ 验证查询参数
  @IsNotEmpty()
  @IsString()
  @IsUUID()
  public readonly userId!: string;

  // ✅ 限制分页大小，防止DoS
  public readonly pagination = {
    page: 1,
    limit: 100, // ✅ 最大限制
  };
}

// ✅ 在处理器中验证权限
@Injectable()
export class GetUserQueryHandler extends BaseQueryHandler<GetUserQuery> {
  async handle(query: GetUserQuery): Promise<QueryResult> {
    // ✅ 验证用户权限
    if (!(await this.hasPermission(query.userId, "read"))) {
      return QueryResult.failure("无权限访问", "PERMISSION_DENIED");
    }

    // 执行查询
    // ...
  }
}
```

---

## 身份认证和授权

### 用户身份验证

```typescript
// ✅ 在用例中验证用户身份
class CreateUserUseCase extends UseCase<CreateUserInput, CreateUserOutput> {
  protected async executeBusinessLogic(input: CreateUserInput): Promise<CreateUserOutput> {
    // ✅ 验证用户身份
    if (!input.userId) {
      throw new UseCaseValidationException("用户未认证", ExceptionCodes.USE_CASE_VALIDATION_FAILED, this.useCaseName, input);
    }

    // ✅ 验证用户是否存在且有效
    const user = await this.userRepository.findById(EntityId.fromString(input.userId));

    if (!user || !user.isActive()) {
      throw new UseCaseValidationException("用户无效", ExceptionCodes.USE_CASE_VALIDATION_FAILED, this.useCaseName, input);
    }

    // 执行业务逻辑
    // ...
  }
}
```

### 权限验证

```typescript
// ✅ 创建权限验证装饰器
function RequirePermission(permission: string) {
  return function (target: unknown, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: unknown[]) {
      const input = args[0] as UseCaseInput;

      // ✅ 验证权限
      if (!(await this.permissionService.hasPermission(input.userId, permission))) {
        throw new UseCaseValidationException("权限不足", ExceptionCodes.USE_CASE_VALIDATION_FAILED, target.constructor.name, input);
      }

      return originalMethod.apply(this, args);
    };
  };
}

// 使用装饰器
@Injectable()
export class DeleteUserUseCase extends UseCase<Input, Output> {
  @RequirePermission("user:delete")
  protected async executeBusinessLogic(input: Input): Promise<Output> {
    // 执行业务逻辑
    // ...
  }
}
```

### 资源所有权验证

```typescript
// ✅ 验证资源所有权
class UpdateUserUseCase extends UseCase<UpdateUserInput, UpdateUserOutput> {
  protected async executeBusinessLogic(input: UpdateUserInput): Promise<UpdateUserOutput> {
    const user = await this.userRepository.findById(EntityId.fromString(input.userId));

    // ✅ 验证资源所有权或管理员权限
    if (user.getId().toString() !== input.currentUserId && !(await this.isAdmin(input.currentUserId))) {
      throw new UseCaseValidationException("无权限修改此用户", ExceptionCodes.USE_CASE_VALIDATION_FAILED, this.useCaseName, input);
    }

    // 执行业务逻辑
    // ...
  }
}
```

---

## 数据安全

### 敏感数据保护

```typescript
// ✅ 密码加密
class CreateUserUseCase extends UseCase<Input, Output> {
  protected async executeBusinessLogic(input: Input): Promise<Output> {
    // ✅ 使用强加密算法
    const hashedPassword = await this.passwordService.hash(input.password);

    const user = User.create(
      EntityId.generate(),
      Email.create(input.email),
      Password.create(hashedPassword), // ✅ 存储加密后的密码
    );

    // ✅ 不要将密码包含在输出中
    return new CreateUserOutput({
      userId: user.getId().toString(),
      email: user.getEmail().getValue(),
      // ❌ 不要返回密码
      // password: user.getPassword(), // 错误！
    });
  }
}
```

### 数据脱敏

```typescript
// ✅ 在输出中脱敏敏感数据
class GetUserOutput extends UseCaseOutput {
  public readonly userId!: string;
  public readonly email!: string;
  public readonly phone?: string; // ✅ 部分脱敏：138****1234

  // ❌ 不要输出敏感信息
  // public readonly password?: string; // 错误！
  // public readonly idCard?: string; // 错误！
}

// ✅ 实现脱敏逻辑
function maskPhone(phone: string): string {
  if (phone.length < 7) return phone;
  return phone.slice(0, 3) + "****" + phone.slice(-4);
}
```

### SQL 注入防护

```typescript
// ✅ 使用参数化查询
class UserRepository implements IUserRepository {
  async findByEmail(email: string): Promise<User | null> {
    // ✅ 使用参数化查询，防止SQL注入
    const result = await this.db.query(
      "SELECT * FROM users WHERE email = $1",
      [email], // ✅ 参数化
    );

    // ❌ 不要拼接SQL
    // const sql = `SELECT * FROM users WHERE email = '${email}'`; // 危险！
    // ...
  }
}
```

### NoSQL 注入防护

```typescript
// ✅ 使用类型安全的查询构建器
class EventRepository {
  async findByAggregateId(aggregateId: EntityId): Promise<DomainEvent[]> {
    // ✅ 使用类型安全的查询
    return await this.mongo
      .collection("events")
      .find({
        aggregateId: aggregateId.toString(), // ✅ 直接使用值，不要拼接
      })
      .toArray();

    // ❌ 不要拼接查询
    // const query = `{ aggregateId: "${aggregateId.toString()}" }`; // 危险！
    // ...
  }
}
```

---

## 事件安全

### 事件验证

```typescript
// ✅ 验证事件数据
class UserCreatedEvent extends DomainEvent {
  constructor(
    aggregateId: EntityId,
    email: Email, // ✅ 使用值对象，自动验证
    timestamp?: Date,
  ) {
    super(aggregateId, "UserCreated", timestamp);
    this.email = email;
  }
}

// ✅ 验证事件发布权限
@Injectable()
export class CreateUserUseCase extends UseCase<Input, Output> {
  protected async executeBusinessLogic(input: Input): Promise<Output> {
    const user = User.create(...);

    // ✅ 验证可以发布事件
    if (!user.canPublishEvents()) {
      throw new UseCaseException(
        "不允许发布事件",
        ExceptionCodes.USE_CASE_EXECUTION_FAILED,
        this.useCaseName,
        input,
      );
    }

    // 发布事件
    await this.eventBus.publish(...user.getUncommittedEvents());
    // ...
  }
}
```

### 事件存储安全

```typescript
// ✅ 事件存储访问控制
class SecureEventStore implements IEventStore {
  async saveEvents(aggregateId: EntityId, events: DomainEvent[], expectedVersion: number): Promise<EventStoreResult> {
    // ✅ 验证用户权限
    const context = this.getCurrentContext();
    if (!(await this.hasPermission(context.userId, "event:write"))) {
      throw new EventStoreException("无权限保存事件", ExceptionCodes.EVENT_STORE_ERROR);
    }

    // ✅ 验证事件数据
    events.forEach((event) => {
      this.validateEvent(event);
    });

    // 保存事件
    // ...
  }

  private validateEvent(event: DomainEvent): void {
    // ✅ 验证事件类型
    if (!this.isAllowedEventType(event.eventType)) {
      throw new EventStoreException(`不允许的事件类型: ${event.eventType}`, ExceptionCodes.EVENT_VALIDATION_FAILED);
    }

    // ✅ 验证事件数据
    // ...
  }
}
```

---

## Saga 安全

### Saga 授权

```typescript
// ✅ 验证 Saga 执行权限
class OrderProcessingSaga extends Saga<OrderData> {
  async execute(data: OrderData): Promise<void> {
    // ✅ 验证用户权限
    if (!(await this.hasPermission(data.userId, "order:create"))) {
      throw new SagaExecutionException("无权限创建订单", ExceptionCodes.SAGA_EXECUTION_FAILED);
    }

    // 执行 Saga
    // ...
  }
}
```

### Saga 状态安全

```typescript
// ✅ 保护 Saga 状态数据
class SecureSagaStateManager extends SagaStateManager {
  async saveSagaState(snapshot: SagaStateSnapshot): Promise<void> {
    // ✅ 加密敏感数据
    const encryptedData = await this.encryptSensitiveData(snapshot.data);

    const secureSnapshot: SagaStateSnapshot = {
      ...snapshot,
      data: encryptedData, // ✅ 加密后的数据
    };

    await super.saveSagaState(secureSnapshot);
  }

  async getSagaState(sagaId: string): Promise<SagaStateSnapshot | undefined> {
    const snapshot = await super.getSagaState(sagaId);

    if (!snapshot) {
      return undefined;
    }

    // ✅ 解密数据
    const decryptedData = await this.decryptSensitiveData(snapshot.data);

    return {
      ...snapshot,
      data: decryptedData,
    };
  }
}
```

---

## 缓存安全

### 缓存数据安全

```typescript
// ✅ 不要在缓存中存储敏感数据
class SecureCacheHandler extends BaseQueryHandler<GetUserQuery> {
  async handle(query: GetUserQuery): Promise<QueryResult> {
    const cacheKey = `user:${query.userId}`;
    const cached = await this.cache.get<UserDto>(cacheKey);

    if (cached) {
      // ✅ 移除敏感信息
      return QueryResult.success(this.sanitizeUserData(cached));
    }

    const user = await this.repository.findById(query.userId);
    const userDto = this.toDto(user);

    // ✅ 缓存时移除敏感信息
    const sanitized = this.sanitizeUserData(userDto);
    await this.cache.set(cacheKey, sanitized, 3600);

    return QueryResult.success(sanitized);
  }

  private sanitizeUserData(user: UserDto): UserDto {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      // ❌ 不要缓存敏感信息
      // password: user.password, // 错误！
      // idCard: user.idCard, // 错误！
    };
  }
}
```

### 缓存键安全

```typescript
// ✅ 使用安全的缓存键生成
function generateCacheKey(userId: string): string {
  // ✅ 使用哈希防止键冲突和注入
  const hash = crypto.createHash("sha256").update(`user:${userId}`).digest("hex");

  return `user:${hash}`;
}

// ❌ 不要直接使用用户输入作为缓存键
// const key = `user:${userId}`; // 可能不安全
```

### 缓存失效安全

```typescript
// ✅ 安全地失效缓存
@OnEvent(UserUpdatedEvent)
async handle(event: UserUpdatedEvent) {
  // ✅ 验证事件来源
  if (!this.isValidEvent(event)) {
    return; // 忽略无效事件
  }

  // ✅ 安全地失效缓存
  const cacheKey = this.generateSecureCacheKey(event.aggregateId.toString());
  await this.cache.delete(cacheKey);
}
```

---

## 日志安全

### 敏感信息脱敏

```typescript
// ✅ 在日志中脱敏敏感信息
class SecureUseCase extends UseCase<Input, Output> {
  protected async executeBusinessLogic(input: Input): Promise<Output> {
    // ✅ 记录日志时脱敏
    this.logger.log("用例执行", {
      useCase: this.useCaseName,
      input: {
        // ✅ 移除敏感字段
        email: this.maskEmail(input.email),
        // ❌ 不要记录密码
        // password: input.password, // 错误！
      },
    });

    // 执行业务逻辑
    // ...
  }

  private maskEmail(email: string): string {
    const [local, domain] = email.split("@");
    if (!domain) return email;
    return `${local[0]}***@${domain}`;
  }
}
```

### 日志访问控制

```typescript
// ✅ 配置日志访问控制
LoggerModule.forRoot({
  level: process.env.NODE_ENV === "production" ? "info" : "debug",

  // ✅ 生产环境不记录敏感信息
  redact: ["password", "token", "secret", "apiKey", "creditCard"],
});
```

---

## 配置安全

### 敏感配置保护

```typescript
// ✅ 使用环境变量存储敏感配置
const config: ApplicationKernelConfig = {
  eventStore: {
    type: "hybrid",
    connection: {
      // ✅ 从环境变量读取，不要硬编码
      host: process.env.DB_HOST || "localhost",
      port: parseInt(process.env.DB_PORT || "5432", 10),
      // ✅ 密码从密钥管理系统获取
      password: process.env.DB_PASSWORD, // 必须设置
    },
  },
};

// ❌ 不要在代码中硬编码密码
// password: "mySecretPassword", // 危险！
```

### 配置验证

```typescript
// ✅ 验证配置安全性
class SecureConfigService extends ApplicationKernelConfigService {
  validateConfig(candidate: Partial<ApplicationKernelConfig>): ConfigValidationResult {
    const errors: string[] = [];

    // ✅ 验证数据库密码强度
    if (candidate.eventStore?.connection?.password) {
      const password = candidate.eventStore.connection.password;
      if (password.length < 12) {
        errors.push("数据库密码长度至少12个字符");
      }
    }

    // ✅ 验证连接字符串安全性
    if (candidate.eventStore?.connection?.host) {
      const host = candidate.eventStore.connection.host;
      if (host.includes("password") || host.includes("secret")) {
        errors.push("连接字符串不应包含敏感信息");
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings: [],
    };
  }
}
```

---

## 最佳实践

### 1. 输入验证清单

- [ ] 所有输入都使用 `class-validator` 验证
- [ ] 限制输入长度，防止DoS攻击
- [ ] 验证输入格式（邮箱、URL、UUID等）
- [ ] 拒绝不可预期的输入类型
- [ ] 在业务逻辑中再次验证

### 2. 身份认证清单

- [ ] 所有需要认证的操作都验证用户身份
- [ ] 验证用户是否有效且激活
- [ ] 使用 JWT 或其他安全令牌
- [ ] 实现令牌过期和刷新机制
- [ ] 记录认证失败尝试

### 3. 授权检查清单

- [ ] 实现基于角色的访问控制（RBAC）
- [ ] 验证资源所有权
- [ ] 检查操作权限
- [ ] 实现细粒度权限控制
- [ ] 记录授权失败尝试

### 4. 数据安全清单

- [ ] 敏感数据加密存储
- [ ] 传输中的数据加密（HTTPS/TLS）
- [ ] 密码使用强哈希算法（bcrypt、argon2）
- [ ] 输出中移除敏感信息
- [ ] 实现数据脱敏

### 5. 事件安全清单

- [ ] 验证事件数据完整性
- [ ] 验证事件发布权限
- [ ] 使用事件签名验证来源
- [ ] 限制事件类型
- [ ] 审计事件操作

### 6. 缓存安全清单

- [ ] 不在缓存中存储敏感数据
- [ ] 使用安全的缓存键
- [ ] 实现缓存访问控制
- [ ] 及时失效敏感缓存
- [ ] 验证缓存数据完整性

### 7. 日志安全清单

- [ ] 日志中不记录敏感信息
- [ ] 实现日志访问控制
- [ ] 定期清理旧日志
- [ ] 加密日志文件
- [ ] 审计日志访问

---

## 安全测试

### 安全测试示例

```typescript
describe("安全测试", () => {
  it("应该拒绝未认证的请求", async () => {
    const input = new CreateUserInput({
      email: "test@example.com",
      password: "password123",
      // ❌ 没有 userId
    });

    await expect(useCase.execute(input)).rejects.toThrow(UseCaseValidationException);
  });

  it("应该拒绝无效的输入", async () => {
    const input = new CreateUserInput({
      email: "invalid-email", // ❌ 无效邮箱
      password: "123", // ❌ 密码太短
    });

    await expect(useCase.execute(input)).rejects.toThrow(UseCaseValidationException);
  });

  it("应该拒绝SQL注入攻击", async () => {
    const input = new GetUserQuery({
      userId: "'; DROP TABLE users; --", // ❌ SQL注入尝试
    });

    // ✅ 应该被验证拒绝或安全处理
    await expect(queryHandler.handle(input)).resolves.toMatchObject({
      success: false,
    });
  });

  it("应该拒绝XSS攻击", async () => {
    const input = new CreateUserInput({
      email: "<script>alert('xss')</script>@example.com",
      password: "password123",
    });

    // ✅ 应该被验证拒绝
    await expect(useCase.execute(input)).rejects.toThrow(UseCaseValidationException);
  });
});
```

---

## 安全漏洞报告

如果发现安全漏洞，请：

1. **不要公开披露**: 不要在任何公开渠道披露漏洞
2. **联系维护者**: 通过安全渠道报告漏洞
3. **提供详细信息**: 包括漏洞描述、影响范围、复现步骤
4. **等待修复**: 在漏洞修复前不要公开

---

## 合规性考虑

### GDPR 合规

```typescript
// ✅ 实现数据删除权
class DeleteUserUseCase extends UseCase<Input, Output> {
  protected async executeBusinessLogic(input: Input): Promise<Output> {
    // ✅ 删除用户数据（GDPR要求）
    await this.userRepository.delete(input.userId);

    // ✅ 删除相关事件（可能需要匿名化）
    await this.eventStore.anonymizeEvents(input.userId);

    // ✅ 失效相关缓存
    await this.cache.delete(`user:${input.userId}`);

    return new DeleteUserOutput({ success: true });
  }
}
```

### 数据保留策略

```typescript
// ✅ 实现数据保留策略
class DataRetentionService {
  async cleanupOldData(): Promise<void> {
    const cutoffDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000); // 1年前

    // ✅ 归档或删除旧数据
    await this.eventStore.archiveEvents(cutoffDate);
    await this.userRepository.deleteInactiveUsers(cutoffDate);
  }
}
```

---

## 总结

安全是一个持续的过程，需要：

1. ✅ **持续监控**: 定期检查安全配置和日志
2. ✅ **及时更新**: 及时更新依赖和补丁
3. ✅ **安全测试**: 定期进行安全测试
4. ✅ **培训团队**: 确保团队了解安全最佳实践
5. ✅ **文档记录**: 记录安全决策和措施

遵循本指南的建议，可以显著提升应用安全性。

---

**提示**: 更多安全相关的问题，请参考 [故障排除指南](./TROUBLESHOOTING.md) 和安全最佳实践。
