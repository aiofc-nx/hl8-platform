# Clean Architecture中领域层支持应用层的机制

## 📋 文档概述

本文档详细阐述了在Clean Architecture架构模式中，领域层如何通过提供业务逻辑、领域模型、业务规则和领域服务来支持应用层的实现。基于hl8-platform项目中的domain-kernel和application-kernel模块的实际实现进行分析。

## 🎯 核心概念

### Clean Architecture中领域层与应用层的关系

在Clean Architecture中，**领域层（Domain Layer）** 是业务逻辑的核心，为**应用层（Application Layer）** 提供：

- **业务逻辑实现** - 核心业务规则和领域逻辑
- **领域模型** - 实体、值对象、聚合根等核心概念
- **领域服务** - 跨实体的业务逻辑封装
- **业务规则** - 领域约束和验证规则
- **领域事件** - 业务事件的标准化表示

应用层则负责：

- **协调领域对象** - 编排领域层的业务逻辑
- **处理用例** - 实现具体的业务用例
- **管理事务** - 协调多个领域对象的操作
- **事件处理** - 处理领域事件和集成事件

## 🏗️ 领域层支持应用层的机制

### 1. 业务逻辑封装 (Business Logic Encapsulation)

领域层将核心业务逻辑封装在领域对象中，为应用层提供标准化的业务操作接口。

#### 示例：聚合根的业务协调

```typescript
// 领域层定义：libs/kernel/domain-kernel/src/aggregates/base/aggregate-root.base.ts
export abstract class AggregateRoot extends Entity {
  private readonly _internalEntities: Map<string, InternalEntity> = new Map();
  private readonly _domainEvents: DomainEvent[] = [];

  /**
   * 协调业务操作
   * @param operation 操作名称
   * @param params 操作参数
   * @returns 操作结果
   * @throws {Error} 当聚合根状态不允许执行业务操作时抛出异常
   */
  public coordinateBusinessOperation(operation: string, params: unknown): unknown {
    if (!this.canExecuteBusinessOperation()) {
      throw new Error("聚合根状态不允许执行业务操作");
    }

    // 验证分离原则
    this.validateSeparationPrinciple();

    // 验证业务不变量
    this.validateBusinessInvariants();

    // 执行具体的协调逻辑
    const result = this.performCoordination(operation, params);

    // 发布领域事件
    this.addDomainEvent({
      type: "BusinessOperationCoordinated",
      aggregateRootId: this.id,
      timestamp: new Date(),
      data: { operation, params, result },
    });

    return result;
  }

  /**
   * 添加领域事件
   * @param event 领域事件
   */
  public addDomainEvent(event: DomainEvent): void {
    this._domainEvents.push(event);
  }

  /**
   * 获取所有领域事件
   * @returns 领域事件数组
   */
  public getDomainEvents(): DomainEvent[] {
    return [...this._domainEvents];
  }

  /**
   * 清空领域事件
   */
  public clearDomainEvents(): void {
    this._domainEvents.length = 0;
  }

  /**
   * 执行具体的协调逻辑（由子类实现）
   * @param operation 操作名称
   * @param params 操作参数
   * @returns 操作结果
   */
  protected abstract performCoordination(operation: string, params: unknown): unknown;

  /**
   * 验证业务不变量（由子类实现）
   * @returns 是否通过验证
   */
  protected abstract validateBusinessInvariants(): boolean;
}
```

#### 示例：实体的业务逻辑

```typescript
// 领域层定义：libs/kernel/domain-kernel/src/entities/base/entity.base.ts
export abstract class Entity {
  protected readonly _id: EntityId;
  protected readonly _auditInfo: AuditInfo;
  protected readonly _lifecycleState: EntityLifecycle;
  protected readonly _version: number;

  /**
   * 执行业务逻辑
   * @param operation 操作名称
   * @param params 操作参数
   * @returns 操作结果
   */
  public executeBusinessLogic(operation: string, params: unknown): unknown {
    // 验证实体状态
    if (!this.canExecuteBusinessLogic()) {
      throw new Error("实体状态不允许执行业务操作");
    }

    // 验证业务规则
    if (!this.validateBusinessRules()) {
      throw new Error("实体业务规则验证失败");
    }

    // 执行具体的业务逻辑
    return this.performBusinessLogic(operation, params);
  }

  /**
   * 验证业务规则（由子类实现）
   * @returns 是否通过验证
   */
  public abstract validateBusinessRules(): boolean;

  /**
   * 执行具体的业务逻辑（由子类实现）
   * @param operation 操作名称
   * @param params 操作参数
   * @returns 操作结果
   */
  public abstract performBusinessLogic(operation: string, params: unknown): unknown;

  /**
   * 检查是否可以执行业务逻辑
   * @returns 是否可以执行业务逻辑
   */
  protected canExecuteBusinessLogic(): boolean {
    return this._lifecycleState === EntityLifecycle.ACTIVE;
  }
}
```

### 2. 领域服务 (Domain Services)

领域层提供领域服务来封装跨实体的业务逻辑，为应用层提供复杂的业务操作。

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
   * 执行业务逻辑
   * @param operation 操作名称
   * @param params 操作参数
   * @returns 操作结果
   * @throws {Error} 当服务状态不允许执行业务操作时抛出异常
   */
  public executeBusinessLogic(operation: string, params: unknown): unknown {
    if (!this.canExecuteBusinessLogic()) {
      throw new Error("服务状态不允许执行业务操作");
    }

    this.validateDependencies();
    return this.performBusinessLogic(operation, params);
  }

  /**
   * 添加依赖项
   * @param name 依赖项名称
   * @param dependency 依赖项实例
   */
  public addDependency(name: string, dependency: unknown): void {
    this._dependencies.set(name, dependency);
  }

  /**
   * 获取依赖项
   * @param name 依赖项名称
   * @returns 依赖项实例
   */
  public getDependency<T>(name: string): T | undefined {
    return this._dependencies.get(name) as T | undefined;
  }

  /**
   * 执行具体的业务逻辑（由子类实现）
   * @param operation 操作名称
   * @param params 操作参数
   * @returns 操作结果
   */
  protected abstract performBusinessLogic(operation: string, params: unknown): unknown;

  /**
   * 获取必需的依赖项列表（由子类实现）
   * @returns 依赖项名称列表
   */
  protected abstract getRequiredDependencies(): string[];

  /**
   * 验证服务（由子类实现）
   * @throws {Error} 当服务无效时抛出异常
   */
  protected abstract validateService(): void;
}
```

#### 示例：具体领域服务实现

```typescript
// 领域层实现：用户领域服务
export class UserDomainService extends DomainService {
  protected getRequiredDependencies(): string[] {
    return ["userRepository", "emailService"];
  }

  protected performBusinessLogic(operation: string, params: unknown): unknown {
    switch (operation) {
      case "createUser":
        return this.createUser(params as CreateUserParams);
      case "validateEmail":
        return this.validateEmail(params as string);
      case "generateUserId":
        return this.generateUserId();
      case "checkEmailUniqueness":
        return this.checkEmailUniqueness(params as string);
      default:
        throw new Error(`Unknown operation: ${operation}`);
    }
  }

  protected validateService(): void {
    const requiredDeps = this.getRequiredDependencies();
    for (const dep of requiredDeps) {
      if (!this._dependencies.has(dep)) {
        throw new Error(`Missing required dependency: ${dep}`);
      }
    }
  }

  private async createUser(params: CreateUserParams): Promise<UserCreationResult> {
    // 验证邮箱格式
    if (!this.validateEmail(params.email)) {
      throw new BusinessException("邮箱格式无效", "INVALID_EMAIL");
    }

    // 检查邮箱唯一性
    const isEmailUnique = await this.checkEmailUniqueness(params.email);
    if (!isEmailUnique) {
      throw new BusinessException("邮箱已存在", "EMAIL_ALREADY_EXISTS");
    }

    // 生成用户ID
    const userId = this.generateUserId();

    // 创建用户聚合根
    const user = new UserAggregate(userId, params.email, params.name);

    // 保存用户
    const userRepository = this.getDependency<IUserRepository>("userRepository");
    await userRepository.save(user);

    return {
      userId: userId.toString(),
      email: params.email,
      name: params.name,
      createdAt: new Date(),
    };
  }

  private validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private generateUserId(): EntityId {
    return EntityId.generate();
  }

  private async checkEmailUniqueness(email: string): Promise<boolean> {
    const userRepository = this.getDependency<IUserRepository>("userRepository");
    const existingUser = await userRepository.findByEmail(email);
    return existingUser === null;
  }
}
```

### 3. 业务规则管理 (Business Rules Management)

领域层提供强大的业务规则管理机制，为应用层提供灵活的规则验证能力。

#### 示例：业务规则管理器

```typescript
// 领域层定义：libs/kernel/domain-kernel/src/business-rules/business-rule-manager.ts
export class BusinessRuleManager implements IBusinessRuleManager {
  private rules: Map<string, BusinessRule> = new Map();
  private validationStats: BusinessRuleValidationStats = new BusinessRuleValidationStats();

  /**
   * 注册业务规则
   * @param rule 业务规则
   * @returns 是否注册成功
   */
  public registerRule(rule: BusinessRule): boolean {
    try {
      if (this.rules.has(rule.name)) {
        throw new Error(`Rule with name '${rule.name}' already exists`);
      }

      this.rules.set(rule.name, rule);
      return true;
    } catch (error) {
      throw new BusinessRuleManagerException(`Failed to register rule '${rule.name}': ${error instanceof Error ? error.message : String(error)}`, { ruleName: rule.name, originalError: error });
    }
  }

  /**
   * 验证实体
   * @param entity 要验证的实体
   * @param context 验证上下文
   * @returns 验证结果
   */
  public validateEntity(entity: unknown, context?: BusinessRuleContext): BusinessRuleValidationResult {
    const startTime = Date.now();
    const violations: BusinessRuleViolation[] = [];

    try {
      // 获取启用的规则
      const enabledRules = Array.from(this.rules.values())
        .filter((rule) => rule.enabled)
        .sort((a, b) => a.priority - b.priority);

      // 执行规则验证
      for (const rule of enabledRules) {
        try {
          const ruleResult = rule.validate(entity, context);
          if (!ruleResult.isValid) {
            violations.push(...ruleResult.violations);
          }
        } catch (error) {
          violations.push({
            ruleName: rule.name,
            message: `Rule execution failed: ${error instanceof Error ? error.message : String(error)}`,
            severity: BusinessRuleSeverity.ERROR,
            context: context,
            timestamp: new Date(),
          });
        }
      }

      // 更新统计信息
      this.updateValidationStats(startTime, violations.length);

      return new BusinessRuleValidationResultImpl(violations.length === 0, violations, {
        executionTime: Date.now() - startTime,
        rulesExecuted: enabledRules.length,
        violationsCount: violations.length,
      });
    } catch (error) {
      return new BusinessRuleValidationResultImpl(
        false,
        [
          {
            ruleName: "BusinessRuleManager",
            message: `Validation failed: ${error instanceof Error ? error.message : String(error)}`,
            severity: BusinessRuleSeverity.ERROR,
            context: context,
            timestamp: new Date(),
          },
        ],
        {
          executionTime: Date.now() - startTime,
          rulesExecuted: 0,
          violationsCount: 1,
        },
      );
    }
  }

  /**
   * 获取规则列表
   * @returns 规则列表
   */
  public getRules(): BusinessRule[] {
    return Array.from(this.rules.values());
  }

  /**
   * 获取规则
   * @param ruleName 规则名称
   * @returns 规则实例
   */
  public getRule(ruleName: string): BusinessRule | undefined {
    return this.rules.get(ruleName);
  }

  /**
   * 启用规则
   * @param ruleName 规则名称
   * @returns 是否启用成功
   */
  public enableRule(ruleName: string): boolean {
    const rule = this.rules.get(ruleName);
    if (rule) {
      rule.enabled = true;
      return true;
    }
    return false;
  }

  /**
   * 禁用规则
   * @param ruleName 规则名称
   * @returns 是否禁用成功
   */
  public disableRule(ruleName: string): boolean {
    const rule = this.rules.get(ruleName);
    if (rule) {
      rule.enabled = false;
      return true;
    }
    return false;
  }
}
```

#### 示例：具体业务规则实现

```typescript
// 领域层实现：用户业务规则
export class UserBusinessRules {
  /**
   * 用户邮箱格式规则
   */
  public static createEmailFormatRule(): BusinessRule {
    return {
      name: "UserEmailFormat",
      description: "用户邮箱必须符合标准格式",
      priority: 1,
      enabled: true,
      validate: (entity: unknown, context?: BusinessRuleContext): BusinessRuleValidationResult => {
        const user = entity as UserAggregate;
        const violations: BusinessRuleViolation[] = [];

        if (!user.email || !this.isValidEmail(user.email)) {
          violations.push({
            ruleName: "UserEmailFormat",
            message: "用户邮箱格式无效",
            severity: BusinessRuleSeverity.ERROR,
            context: context,
            timestamp: new Date(),
          });
        }

        return {
          isValid: violations.length === 0,
          violations,
        };
      },
    };
  }

  /**
   * 用户年龄规则
   */
  public static createAgeRule(): BusinessRule {
    return {
      name: "UserAge",
      description: "用户年龄必须在18-120岁之间",
      priority: 2,
      enabled: true,
      validate: (entity: unknown, context?: BusinessRuleContext): BusinessRuleValidationResult => {
        const user = entity as UserAggregate;
        const violations: BusinessRuleViolation[] = [];

        if (user.age < 18 || user.age > 120) {
          violations.push({
            ruleName: "UserAge",
            message: "用户年龄必须在18-120岁之间",
            severity: BusinessRuleSeverity.ERROR,
            context: context,
            timestamp: new Date(),
          });
        }

        return {
          isValid: violations.length === 0,
          violations,
        };
      },
    };
  }

  /**
   * 用户状态规则
   */
  public static createStatusRule(): BusinessRule {
    return {
      name: "UserStatus",
      description: "用户状态必须有效",
      priority: 3,
      enabled: true,
      validate: (entity: unknown, context?: BusinessRuleContext): BusinessRuleValidationResult => {
        const user = entity as UserAggregate;
        const violations: BusinessRuleViolation[] = [];

        if (!user.status || !["ACTIVE", "INACTIVE", "SUSPENDED"].includes(user.status)) {
          violations.push({
            ruleName: "UserStatus",
            message: "用户状态无效",
            severity: BusinessRuleSeverity.ERROR,
            context: context,
            timestamp: new Date(),
          });
        }

        return {
          isValid: violations.length === 0,
          violations,
        };
      },
    };
  }

  private static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}
```

### 4. 领域事件 (Domain Events)

领域层提供标准化的领域事件机制，为应用层提供事件驱动的业务逻辑支持。

#### 示例：领域事件基类

```typescript
// 领域层定义：libs/kernel/domain-kernel/src/events/base/domain-event.base.ts
export abstract class DomainEvent {
  private readonly _eventId: EntityId;
  private readonly _aggregateRootId: EntityId;
  private readonly _timestamp: Date;
  private readonly _version: number;
  private readonly _eventType: string;
  private readonly _data: unknown;
  private readonly _metadata: Record<string, unknown>;

  constructor(aggregateRootId: EntityId, eventType: string, data: unknown, metadata: Record<string, unknown> = {}, eventId?: EntityId, timestamp?: Date, version: number = 1) {
    this._eventId = eventId || new EntityId();
    this._aggregateRootId = aggregateRootId ? aggregateRootId.clone() : new EntityId();
    this._timestamp = timestamp || new Date();
    this._version = version;
    this._eventType = eventType;
    this._data = this.deepClone(data);
    this._metadata = { ...metadata };

    // 验证事件
    this.validateEvent();
  }

  /**
   * 获取事件标识符
   * @returns 事件标识符
   */
  public get eventId(): EntityId {
    return this._eventId.clone();
  }

  /**
   * 获取聚合根标识符
   * @returns 聚合根标识符
   */
  public get aggregateRootId(): EntityId {
    return this._aggregateRootId.clone();
  }

  /**
   * 获取事件时间戳
   * @returns 事件时间戳
   */
  public get timestamp(): Date {
    return new Date(this._timestamp.getTime());
  }

  /**
   * 获取事件版本
   * @returns 事件版本
   */
  public get version(): number {
    return this._version;
  }

  /**
   * 获取事件类型
   * @returns 事件类型
   */
  public get eventType(): string {
    return this._eventType;
  }

  /**
   * 获取事件数据
   * @returns 事件数据
   */
  public get data(): unknown {
    return this.deepClone(this._data);
  }

  /**
   * 获取事件元数据
   * @returns 事件元数据
   */
  public get metadata(): Record<string, unknown> {
    return { ...this._metadata };
  }

  /**
   * 验证事件
   * @throws {Error} 当事件无效时抛出异常
   */
  protected validateEvent(): void {
    if (!this._eventType) {
      throw new Error("事件类型不能为空");
    }
    if (!this._aggregateRootId) {
      throw new Error("聚合根标识符不能为空");
    }
  }

  /**
   * 深度克隆对象
   * @param obj 要克隆的对象
   * @returns 克隆后的对象
   */
  private deepClone(obj: unknown): unknown {
    if (obj === null || typeof obj !== "object") {
      return obj;
    }

    if (obj instanceof Date) {
      return new Date(obj.getTime());
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.deepClone(item));
    }

    const cloned: Record<string, unknown> = {};
    for (const key in obj as Record<string, unknown>) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        cloned[key] = this.deepClone((obj as Record<string, unknown>)[key]);
      }
    }

    return cloned;
  }
}
```

#### 示例：具体领域事件实现

```typescript
// 领域层实现：用户相关领域事件
export class UserCreatedEvent extends DomainEvent {
  constructor(userId: EntityId, email: string, name: string, metadata: Record<string, unknown> = {}) {
    super(
      userId,
      "UserCreated",
      {
        email,
        name,
        createdAt: new Date(),
      },
      metadata,
    );
  }
}

export class UserEmailChangedEvent extends DomainEvent {
  constructor(userId: EntityId, oldEmail: string, newEmail: string, metadata: Record<string, unknown> = {}) {
    super(
      userId,
      "UserEmailChanged",
      {
        oldEmail,
        newEmail,
        changedAt: new Date(),
      },
      metadata,
    );
  }
}

export class UserStatusChangedEvent extends DomainEvent {
  constructor(userId: EntityId, oldStatus: string, newStatus: string, reason: string, metadata: Record<string, unknown> = {}) {
    super(
      userId,
      "UserStatusChanged",
      {
        oldStatus,
        newStatus,
        reason,
        changedAt: new Date(),
      },
      metadata,
    );
  }
}
```

## 🔄 应用层如何利用领域层的支持

### 1. 用例实现 (Use Case Implementation)

应用层通过用例来协调领域层的业务逻辑。

#### 示例：用例基类

```typescript
// 应用层定义：libs/kernel/application-kernel/src/use-cases/base/use-case.base.ts
@Injectable()
export abstract class UseCase<TInput extends UseCaseInput, TOutput extends UseCaseOutput> {
  protected readonly logger: Hl8Logger;
  protected readonly useCaseName: string;

  constructor(logger: Hl8Logger) {
    this.logger = logger;
    this.useCaseName = this.constructor.name;
  }

  /**
   * 执行用例
   * @param input 输入数据
   * @returns 输出结果
   */
  public async execute(input: TInput): Promise<TOutput> {
    const startTime = Date.now();
    const correlationId = input.correlationId || this.generateCorrelationId();

    this.logger.log("用例开始执行", {
      useCase: this.useCaseName,
      correlationId,
      input: input.getSummary(),
    });

    try {
      // 验证输入
      await this.validateInput(input);

      // 执行业务逻辑
      const result = await this.executeBusinessLogic(input);

      // 设置执行时间
      result.setExecutionTime(startTime);

      this.logger.log("用例执行成功", {
        useCase: this.useCaseName,
        correlationId,
        executionTime: result.executionTime,
        result: result.getSummary(),
      });

      return result;
    } catch (error) {
      const executionTime = Date.now() - startTime;

      this.logger.error("用例执行失败", {
        useCase: this.useCaseName,
        correlationId,
        executionTime,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });

      // 处理异常
      if (error instanceof UseCaseException || error instanceof UseCaseValidationException) {
        throw error;
      }

      throw new UseCaseException(
        `用例执行失败: ${error instanceof Error ? error.message : String(error)}`,
        "USE_CASE_EXECUTION_FAILED" as any,
        this.useCaseName,
        input,
        {
          originalError: error instanceof Error ? error.message : String(error),
          executionTime,
        },
        error instanceof Error ? error : undefined,
      );
    }
  }

  /**
   * 执行业务逻辑（由子类实现）
   * @param input 输入数据
   * @returns 输出结果
   */
  protected abstract executeBusinessLogic(input: TInput): Promise<TOutput>;

  /**
   * 验证输入数据
   * @param input 输入数据
   * @throws UseCaseValidationException 验证失败时抛出
   */
  protected async validateInput(input: TInput): Promise<void> {
    try {
      await input.validate();
    } catch (error) {
      if (error instanceof UseCaseValidationException) {
        throw error;
      }

      throw new UseCaseValidationException(
        `输入验证失败: ${error instanceof Error ? error.message : String(error)}`,
        this.useCaseName,
        input,
        [error instanceof Error ? error.message : String(error)],
        {
          originalError: error instanceof Error ? error.message : String(error),
        },
        error instanceof Error ? error : undefined,
      );
    }
  }
}
```

#### 示例：具体用例实现

```typescript
// 应用层实现：创建用户用例
export class CreateUserUseCase extends UseCase<CreateUserInput, CreateUserOutput> {
  constructor(
    private readonly userDomainService: UserDomainService,
    private readonly businessRuleManager: BusinessRuleManager,
    private readonly eventBus: IEventBus,
    logger: Hl8Logger,
  ) {
    super(logger);
  }

  protected async executeBusinessLogic(input: CreateUserInput): Promise<CreateUserOutput> {
    // 1. 使用领域服务执行业务逻辑
    const userCreationResult = (await this.userDomainService.executeBusinessLogic("createUser", {
      email: input.email,
      name: input.name,
      age: input.age,
    })) as UserCreationResult;

    // 2. 获取创建的用户聚合根
    const user = await this.getUserById(userCreationResult.userId);

    // 3. 使用业务规则管理器验证用户
    const validationResult = this.businessRuleManager.validateEntity(user, {
      operation: "createUser",
      userId: user.id.toString(),
    });

    if (!validationResult.isValid) {
      throw new UseCaseValidationException(
        "用户创建后验证失败",
        this.useCaseName,
        input,
        validationResult.violations.map((v) => v.message),
        { validationResult: validationResult.toJSON() },
      );
    }

    // 4. 发布领域事件
    const userCreatedEvent = new UserCreatedEvent(user.id, user.email, user.name, {
      correlationId: input.correlationId,
      userId: input.userId,
    });

    await this.eventBus.publish(userCreatedEvent);

    // 5. 返回结果
    return new CreateUserOutput(userCreationResult.userId, userCreationResult.email, userCreationResult.name, userCreationResult.createdAt, input.correlationId);
  }

  private async getUserById(userId: string): Promise<UserAggregate> {
    // 从仓储中获取用户聚合根
    const userRepository = this.userDomainService.getDependency<IUserRepository>("userRepository");
    const user = await userRepository.findById(new EntityId(userId));

    if (!user) {
      throw new UseCaseException("用户不存在", "USER_NOT_FOUND", this.useCaseName, { userId });
    }

    return user;
  }
}
```

### 2. 命令处理器 (Command Handlers)

应用层通过命令处理器来协调领域层的业务操作。

#### 示例：命令处理器基类

```typescript
// 应用层定义：libs/kernel/application-kernel/src/commands/base/command-handler.base.ts
export abstract class BaseCommandHandler<TCommand extends BaseCommand, TResult = unknown> {
  protected readonly logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * 处理命令
   * @param command 命令
   * @returns 处理结果
   */
  public async handle(command: TCommand): Promise<TResult> {
    const startTime = Date.now();
    const correlationId = command.correlationId || this.generateCorrelationId();

    this.logger.log("命令开始处理", {
      commandType: command.commandType,
      commandId: command.commandId,
      correlationId,
    });

    try {
      // 验证命令
      await this.validateCommand(command);

      // 执行业务逻辑
      const result = await this.executeCommand(command);

      this.logger.log("命令处理成功", {
        commandType: command.commandType,
        commandId: command.commandId,
        correlationId,
        executionTime: Date.now() - startTime,
      });

      return result;
    } catch (error) {
      this.logger.error("命令处理失败", {
        commandType: command.commandType,
        commandId: command.commandId,
        correlationId,
        executionTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error),
      });

      throw error;
    }
  }

  /**
   * 执行命令（由子类实现）
   * @param command 命令
   * @returns 处理结果
   */
  protected abstract executeCommand(command: TCommand): Promise<TResult>;

  /**
   * 验证命令（由子类实现）
   * @param command 命令
   * @throws CommandValidationException 验证失败时抛出
   */
  protected abstract validateCommand(command: TCommand): Promise<void>;
}
```

#### 示例：具体命令处理器实现

```typescript
// 应用层实现：创建用户命令处理器
@CommandHandler(CreateUserCommand)
export class CreateUserCommandHandler extends BaseCommandHandler<CreateUserCommand, CreateUserResult> {
  constructor(
    private readonly userDomainService: UserDomainService,
    private readonly businessRuleManager: BusinessRuleManager,
    private readonly eventBus: IEventBus,
    logger: Logger,
  ) {
    super(logger);
  }

  protected async executeCommand(command: CreateUserCommand): Promise<CreateUserResult> {
    // 1. 使用领域服务创建用户
    const userCreationResult = (await this.userDomainService.executeBusinessLogic("createUser", {
      email: command.email,
      name: command.name,
      age: command.age,
    })) as UserCreationResult;

    // 2. 获取创建的用户聚合根
    const user = await this.getUserById(userCreationResult.userId);

    // 3. 验证用户业务规则
    const validationResult = this.businessRuleManager.validateEntity(user, {
      operation: "createUser",
      commandId: command.commandId,
      correlationId: command.correlationId,
    });

    if (!validationResult.isValid) {
      throw new CommandValidationException(
        "用户创建后验证失败",
        command,
        validationResult.violations.map((v) => v.message),
        { validationResult: validationResult.toJSON() },
      );
    }

    // 4. 发布领域事件
    const userCreatedEvent = new UserCreatedEvent(user.id, user.email, user.name, {
      commandId: command.commandId,
      correlationId: command.correlationId,
      userId: command.userId,
    });

    await this.eventBus.publish(userCreatedEvent);

    // 5. 返回结果
    return new CreateUserResult(userCreationResult.userId, userCreationResult.email, userCreationResult.name, userCreationResult.createdAt, command.commandId);
  }

  protected async validateCommand(command: CreateUserCommand): Promise<void> {
    // 验证命令基本属性
    if (!command.email || !command.name) {
      throw new CommandValidationException("邮箱和姓名不能为空", command, ["email", "name"]);
    }

    // 验证邮箱格式
    const emailValidation = (await this.userDomainService.executeBusinessLogic("validateEmail", command.email)) as { isValid: boolean };

    if (!emailValidation.isValid) {
      throw new CommandValidationException("邮箱格式无效", command, ["email"]);
    }

    // 验证年龄
    if (command.age && (command.age < 18 || command.age > 120)) {
      throw new CommandValidationException("年龄必须在18-120岁之间", command, ["age"]);
    }
  }

  private async getUserById(userId: string): Promise<UserAggregate> {
    const userRepository = this.userDomainService.getDependency<IUserRepository>("userRepository");
    const user = await userRepository.findById(new EntityId(userId));

    if (!user) {
      throw new CommandException("用户不存在", "USER_NOT_FOUND", { userId });
    }

    return user;
  }
}
```

### 3. 查询处理器 (Query Handlers)

应用层通过查询处理器来获取领域层的数据。

#### 示例：查询处理器基类

```typescript
// 应用层定义：libs/kernel/application-kernel/src/queries/base/query-handler.base.ts
export abstract class BaseQueryHandler<TQuery extends BaseQuery, TResult = unknown> {
  protected readonly logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * 处理查询
   * @param query 查询
   * @returns 查询结果
   */
  public async handle(query: TQuery): Promise<TResult> {
    const startTime = Date.now();
    const correlationId = query.correlationId || this.generateCorrelationId();

    this.logger.log("查询开始处理", {
      queryType: query.queryType,
      queryId: query.queryId,
      correlationId,
    });

    try {
      // 验证查询
      await this.validateQuery(query);

      // 执行查询
      const result = await this.executeQuery(query);

      this.logger.log("查询处理成功", {
        queryType: query.queryType,
        queryId: query.queryId,
        correlationId,
        executionTime: Date.now() - startTime,
      });

      return result;
    } catch (error) {
      this.logger.error("查询处理失败", {
        queryType: query.queryType,
        queryId: query.queryId,
        correlationId,
        executionTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error),
      });

      throw error;
    }
  }

  /**
   * 执行查询（由子类实现）
   * @param query 查询
   * @returns 查询结果
   */
  protected abstract executeQuery(query: TQuery): Promise<TResult>;

  /**
   * 验证查询（由子类实现）
   * @param query 查询
   * @throws QueryValidationException 验证失败时抛出
   */
  protected abstract validateQuery(query: TQuery): Promise<void>;
}
```

#### 示例：具体查询处理器实现

```typescript
// 应用层实现：获取用户查询处理器
@QueryHandler(GetUserQuery)
export class GetUserQueryHandler extends BaseQueryHandler<GetUserQuery, GetUserResult> {
  constructor(
    private readonly userDomainService: UserDomainService,
    private readonly businessRuleManager: BusinessRuleManager,
    logger: Logger,
  ) {
    super(logger);
  }

  protected async executeQuery(query: GetUserQuery): Promise<GetUserResult> {
    // 1. 从仓储中获取用户聚合根
    const userRepository = this.userDomainService.getDependency<IUserRepository>("userRepository");
    const user = await userRepository.findById(new EntityId(query.userId));

    if (!user) {
      throw new QueryException("用户不存在", "USER_NOT_FOUND", { userId: query.userId });
    }

    // 2. 验证用户业务规则
    const validationResult = this.businessRuleManager.validateEntity(user, {
      operation: "getUser",
      queryId: query.queryId,
      correlationId: query.correlationId,
    });

    if (!validationResult.isValid) {
      this.logger.warn("用户数据验证失败", {
        userId: query.userId,
        violations: validationResult.violations.map((v) => v.message),
      });
    }

    // 3. 返回查询结果
    return new GetUserResult(user.id.toString(), user.email, user.name, user.age, user.status, user.auditInfo.createdAt, user.auditInfo.updatedAt, query.queryId);
  }

  protected async validateQuery(query: GetUserQuery): Promise<void> {
    // 验证查询基本属性
    if (!query.userId) {
      throw new QueryValidationException("用户ID不能为空", query, ["userId"]);
    }

    // 验证用户ID格式
    try {
      new EntityId(query.userId);
    } catch (error) {
      throw new QueryValidationException("用户ID格式无效", query, ["userId"]);
    }
  }
}
```

### 4. 事件处理器 (Event Handlers)

应用层通过事件处理器来处理领域事件。

#### 示例：事件处理器基类

```typescript
// 应用层定义：libs/kernel/application-kernel/src/events/handlers/event-handler.base.ts
export abstract class BaseEventHandler<TEvent extends DomainEvent> {
  protected readonly logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * 处理事件
   * @param event 事件
   * @returns 处理结果
   */
  public async handle(event: TEvent): Promise<void> {
    const startTime = Date.now();
    const correlationId = (event.metadata.correlationId as string) || this.generateCorrelationId();

    this.logger.log("事件开始处理", {
      eventType: event.eventType,
      eventId: event.eventId.toString(),
      aggregateRootId: event.aggregateRootId.toString(),
      correlationId,
    });

    try {
      // 验证事件
      await this.validateEvent(event);

      // 处理事件
      await this.processEvent(event);

      this.logger.log("事件处理成功", {
        eventType: event.eventType,
        eventId: event.eventId.toString(),
        aggregateRootId: event.aggregateRootId.toString(),
        correlationId,
        executionTime: Date.now() - startTime,
      });
    } catch (error) {
      this.logger.error("事件处理失败", {
        eventType: event.eventType,
        eventId: event.eventId.toString(),
        aggregateRootId: event.aggregateRootId.toString(),
        correlationId,
        executionTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error),
      });

      throw error;
    }
  }

  /**
   * 处理事件（由子类实现）
   * @param event 事件
   * @returns 处理结果
   */
  protected abstract processEvent(event: TEvent): Promise<void>;

  /**
   * 验证事件（由子类实现）
   * @param event 事件
   * @throws EventProcessingException 验证失败时抛出
   */
  protected abstract validateEvent(event: TEvent): Promise<void>;
}
```

#### 示例：具体事件处理器实现

```typescript
// 应用层实现：用户创建事件处理器
@EventHandler(UserCreatedEvent)
export class UserCreatedEventHandler extends BaseEventHandler<UserCreatedEvent> {
  constructor(
    private readonly emailService: IEmailService,
    private readonly notificationService: INotificationService,
    private readonly auditService: IAuditService,
    logger: Logger,
  ) {
    super(logger);
  }

  protected async processEvent(event: UserCreatedEvent): Promise<void> {
    const { email, name } = event.data as { email: string; name: string };

    try {
      // 1. 发送欢迎邮件
      await this.emailService.sendWelcomeEmail(email, name);

      // 2. 发送系统通知
      await this.notificationService.notifyUserCreated({
        userId: event.aggregateRootId.toString(),
        email,
        name,
        createdAt: event.timestamp,
      });

      // 3. 记录审计日志
      await this.auditService.logUserCreated({
        userId: event.aggregateRootId.toString(),
        email,
        name,
        eventId: event.eventId.toString(),
        timestamp: event.timestamp,
        correlationId: event.metadata.correlationId as string,
      });

      this.logger.log("用户创建事件处理完成", {
        userId: event.aggregateRootId.toString(),
        email,
        name,
        eventId: event.eventId.toString(),
      });
    } catch (error) {
      this.logger.error("用户创建事件处理失败", {
        userId: event.aggregateRootId.toString(),
        email,
        name,
        eventId: event.eventId.toString(),
        error: error instanceof Error ? error.message : String(error),
      });

      throw new EventProcessingException(`用户创建事件处理失败: ${error instanceof Error ? error.message : String(error)}`, event, { originalError: error });
    }
  }

  protected async validateEvent(event: UserCreatedEvent): Promise<void> {
    // 验证事件数据
    if (!event.data || typeof event.data !== "object") {
      throw new EventProcessingException("事件数据无效", event, { reason: "missing_data" });
    }

    const { email, name } = event.data as { email: string; name: string };

    if (!email || !name) {
      throw new EventProcessingException("事件数据不完整", event, { reason: "missing_email_or_name" });
    }

    // 验证邮箱格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new EventProcessingException("邮箱格式无效", event, { reason: "invalid_email_format" });
    }
  }
}
```

## 🎯 支持机制的优势

### 1. 业务逻辑集中化

- **领域层封装核心业务逻辑** - 所有业务规则和逻辑都在领域层
- **应用层专注于协调** - 应用层只负责协调领域对象，不包含业务逻辑
- **易于维护和测试** - 业务逻辑集中，便于维护和单元测试

### 2. 高度可重用性

- **领域服务可重用** - 同一个领域服务可以被多个用例使用
- **业务规则可配置** - 业务规则可以动态配置和重用
- **领域事件标准化** - 标准化的领域事件可以被多个处理器处理

### 3. 类型安全和验证

- **编译时类型检查** - 通过TypeScript提供编译时类型安全
- **运行时验证** - 通过业务规则管理器提供运行时验证
- **数据完整性** - 通过领域模型确保数据完整性

### 4. 事件驱动架构

- **松耦合** - 通过领域事件实现松耦合
- **可扩展性** - 可以轻松添加新的事件处理器
- **异步处理** - 支持异步事件处理

## 📊 架构层次关系图

```
┌─────────────────────────────────────────────────────────────┐
│                    应用层 (Application)                      │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐  │
│  │   Use Cases     │  │  Command/Query  │  │   Event      │  │
│  │   Handlers      │  │    Handlers     │  │  Handlers    │  │
│  └─────────────────┘  └─────────────────┘  └──────────────┘  │
│           │                    │                    │        │
│           └────────────────────┼────────────────────┘        │
│                                │                             │
│          协调领域对象            │                             │
│          使用领域服务            │                             │
│          处理领域事件            │                             │
└─────────────────────────────────┼─────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────┐
│                    领域层 (Domain)                          │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐  │
│  │   聚合根        │  │   领域服务       │  │   业务规则    │  │
│  │  AggregateRoot  │  │ DomainService   │  │ BusinessRule │  │
│  └─────────────────┘  └─────────────────┘  └──────────────┘  │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐  │
│  │     实体        │  │   值对象         │  │   领域事件    │  │
│  │     Entity      │  │  ValueObject    │  │ DomainEvent  │  │
│  └─────────────────┘  └─────────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## 📋 最佳实践

### 1. 领域层设计原则

- **单一职责** - 每个领域对象只负责一个业务概念
- **高内聚低耦合** - 领域对象内部高内聚，对象间低耦合
- **不可变性** - 值对象和关键属性应该是不可变的
- **业务规则封装** - 将业务规则封装在领域对象中

### 2. 应用层设计原则

- **用例驱动** - 以用例为中心设计应用层
- **协调而非实现** - 应用层协调领域对象，不实现业务逻辑
- **事务管理** - 在应用层管理事务边界
- **异常处理** - 统一处理应用层异常

### 3. 事件驱动设计

- **领域事件优先** - 优先使用领域事件进行解耦
- **事件命名规范** - 使用清晰的领域事件命名
- **事件版本管理** - 支持事件版本演进
- **事件幂等性** - 确保事件处理的幂等性

### 4. 测试策略

- **单元测试** - 为领域对象编写单元测试
- **集成测试** - 为用例编写集成测试
- **契约测试** - 为事件处理器编写契约测试
- **端到端测试** - 为完整业务流程编写端到端测试

## 🎯 总结

Clean Architecture中领域层通过以下机制支持应用层：

1. **业务逻辑封装** - 在聚合根、实体、领域服务中封装核心业务逻辑
2. **领域服务提供** - 提供跨实体的业务逻辑服务
3. **业务规则管理** - 提供灵活的业务规则验证机制
4. **领域事件支持** - 提供标准化的事件驱动架构支持
5. **数据模型定义** - 提供标准化的领域数据模型

这种设计确保了：

- ✅ **业务逻辑集中** - 所有业务逻辑都在领域层
- ✅ **应用层简洁** - 应用层只负责协调和编排
- ✅ **高度可重用** - 领域服务可以被多个用例重用
- ✅ **易于测试** - 清晰的职责分离便于测试
- ✅ **事件驱动** - 支持松耦合的事件驱动架构

通过这种机制，我们能够构建出既灵活又稳定的企业级应用架构，为hl8-platform项目提供了坚实的业务逻辑基础。
