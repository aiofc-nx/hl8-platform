# Quickstart Guide: Application Kernel Core Module

**Feature**: Application Kernel Core Module  
**Date**: 2024-12-19  
**Phase**: 1 - Design & Contracts

## Overview

The Application Kernel Core Module provides a standardized foundation for implementing Clean Architecture principles in the HL8 platform. It integrates CQRS + Event Sourcing + Event-Driven Architecture patterns with platform infrastructure services.

## Key Features

- **Use Cases**: Central business logic orchestration
- **CQRS**: Command Query Responsibility Segregation
- **Event Sourcing**: Immutable event storage and replay
- **Event-Driven Architecture**: Loose coupling through events
- **Platform Integration**: Uses @hl8/config and @hl8/logger

## Installation

```bash
# Install the application kernel
npm install @hl8/application-kernel

# Install peer dependencies
npm install @hl8/domain-kernel @hl8/config @hl8/logger @nestjs/cqrs
```

## Basic Setup

### 1. Module Configuration

```typescript
import { Module } from "@nestjs/common";
import { TypedConfigModule } from "@hl8/config";
import { LoggerModule } from "@hl8/logger";
import { ApplicationKernelModule } from "@hl8/application-kernel";

@Module({
  imports: [
    // Platform infrastructure
    TypedConfigModule.forRoot({
      schema: ApplicationKernelConfig,
      load: [fileLoader({ path: "./config/app.yml" })],
    }),
    LoggerModule.forRoot(),

    // Application kernel
    ApplicationKernelModule.forRoot({
      eventStore: {
        type: "hybrid",
        postgresql: { connectionString: process.env.POSTGRES_URL },
        mongodb: { connectionString: process.env.MONGODB_URL },
      },
      eventBus: {
        deliveryGuarantee: "at-least-once",
        retryPolicy: { maxRetries: 3, backoffMs: 1000 },
      },
      cache: {
        type: "redis",
        connectionString: process.env.REDIS_URL,
        ttl: { default: 3600 },
      },
    }),
  ],
})
export class AppModule {}
```

### 2. Configuration Class

```typescript
import { IsString, IsNumber, ValidateNested } from "class-validator";
import { Type } from "class-transformer";

export class EventStoreConfig {
  @IsString()
  type!: "postgresql" | "mongodb" | "hybrid";

  @IsString()
  postgresql?: string;

  @IsString()
  mongodb?: string;
}

export class EventBusConfig {
  @IsString()
  deliveryGuarantee!: "at-least-once" | "exactly-once" | "at-most-once";

  @ValidateNested()
  @Type(() => Object)
  retryPolicy!: {
    maxRetries: number;
    backoffMs: number;
  };
}

export class ApplicationKernelConfig {
  @ValidateNested()
  @Type(() => EventStoreConfig)
  eventStore!: EventStoreConfig;

  @ValidateNested()
  @Type(() => EventBusConfig)
  eventBus!: EventBusConfig;
}
```

## Use Cases

### Creating a Use Case

```typescript
import { Injectable } from "@nestjs/common";
import { UseCase, UseCaseInput, UseCaseOutput } from "@hl8/application-kernel";
import { InjectPinoLogger } from "@hl8/logger";
import { Logger } from "pino";

// Input definition
export class CreateUserInput extends UseCaseInput {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;
}

// Output definition
export class CreateUserOutput extends UseCaseOutput {
  @IsString()
  userId!: string;

  @IsString()
  name!: string;

  @IsString()
  email!: string;

  @IsDate()
  createdAt!: Date;
}

// Use case implementation
@Injectable()
@UseCase({
  name: "CreateUser",
  version: "1.0.0",
  description: "Create a new user account",
})
export class CreateUserUseCase extends BaseUseCase<CreateUserInput, CreateUserOutput> {
  constructor(
    @InjectPinoLogger(CreateUserUseCase.name) private readonly logger: Logger,
    private readonly userRepository: UserRepository,
    private readonly eventBus: EventBus,
  ) {
    super(logger);
  }

  protected async executeUseCase(input: CreateUserInput): Promise<CreateUserOutput> {
    this.logger.info("Creating user", { email: input.email });

    // Business logic
    const user = new User(input.name, input.email, input.password);
    await this.userRepository.save(user);

    // Publish domain event
    const event = new UserCreatedEvent(user.id, user.name, user.email);
    await this.eventBus.publish(event);

    this.logger.info("User created successfully", { userId: user.id });

    return CreateUserOutput.success({
      userId: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
    });
  }
}
```

### Using a Use Case

```typescript
import { Injectable } from "@nestjs/common";
import { UseCaseBus } from "@hl8/application-kernel";

@Injectable()
export class UserController {
  constructor(private readonly useCaseBus: UseCaseBus) {}

  async createUser(request: CreateUserRequest) {
    const input = new CreateUserInput(request.name, request.email, request.password, request.correlationId, request.userId);

    const result = await this.useCaseBus.execute("CreateUser", input);

    if (result.success) {
      return { success: true, data: result.output };
    } else {
      throw new Error(result.message);
    }
  }
}
```

## Commands

### Creating a Command

```typescript
import { Injectable } from "@nestjs/common";
import { Command, CommandHandler, BaseCommand, CommandResult } from "@hl8/application-kernel";
import { InjectPinoLogger } from "@hl8/logger";
import { Logger } from "pino";

// Command definition
@Command({
  name: "UpdateUserProfile",
  version: "1.0.0",
  description: "Update user profile information",
})
export class UpdateUserProfileCommand extends BaseCommand {
  @IsString()
  @IsNotEmpty()
  userId!: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  bio?: string;
}

// Command handler
@Injectable()
@CommandHandler(UpdateUserProfileCommand)
export class UpdateUserProfileHandler extends BaseCommandHandler<UpdateUserProfileCommand> {
  constructor(
    @InjectPinoLogger(UpdateUserProfileHandler.name) private readonly logger: Logger,
    private readonly userRepository: UserRepository,
    private readonly eventBus: EventBus,
  ) {
    super(logger);
  }

  protected async executeCommand(command: UpdateUserProfileCommand): Promise<CommandResult> {
    this.logger.info("Updating user profile", { userId: command.userId });

    const user = await this.userRepository.findById(command.userId);
    if (!user) {
      throw new UserNotFoundException(command.userId);
    }

    // Update user profile
    if (command.name) user.updateName(command.name);
    if (command.email) user.updateEmail(command.email);
    if (command.bio) user.updateBio(command.bio);

    await this.userRepository.save(user);

    // Publish domain event
    const event = new UserProfileUpdatedEvent(user.id, command.name, command.email, command.bio);
    await this.eventBus.publish(event);

    this.logger.info("User profile updated successfully", { userId: user.id });

    return CommandResult.success(
      {
        userId: user.id,
        updatedAt: new Date(),
      },
      "User profile updated successfully",
      [event],
    );
  }
}
```

## Queries

### Creating a Query

```typescript
import { Injectable } from "@nestjs/common";
import { Query, QueryHandler, BaseQuery, QueryResult } from "@hl8/application-kernel";
import { InjectPinoLogger } from "@hl8/logger";
import { Logger } from "pino";

// Query definition
@Query({
  name: "GetUserProfile",
  version: "1.0.0",
  description: "Get user profile information",
  cacheable: true,
  cacheTtl: 300, // 5 minutes
})
export class GetUserProfileQuery extends BaseQuery {
  @IsString()
  @IsNotEmpty()
  userId!: string;

  @IsBoolean()
  @IsOptional()
  includePrivateInfo?: boolean;
}

// Query handler
@Injectable()
@QueryHandler(GetUserProfileQuery)
export class GetUserProfileHandler extends BaseQueryHandler<GetUserProfileQuery> {
  constructor(
    @InjectPinoLogger(GetUserProfileHandler.name) private readonly logger: Logger,
    private readonly userRepository: UserRepository,
    private readonly cacheService: CacheService,
  ) {
    super(logger);
  }

  protected async executeQuery(query: GetUserProfileQuery): Promise<QueryResult> {
    this.logger.info("Getting user profile", { userId: query.userId });

    // Check cache first
    const cacheKey = `user:profile:${query.userId}`;
    const cached = await this.cacheService.get(cacheKey);
    if (cached) {
      return QueryResult.successItem(cached, "User profile retrieved from cache", {
        hit: true,
        key: cacheKey,
        ttl: 300,
      });
    }

    // Fetch from repository
    const user = await this.userRepository.findById(query.userId);
    if (!user) {
      throw new UserNotFoundException(query.userId);
    }

    // Build response
    const profile = {
      userId: user.id,
      name: user.name,
      email: user.email,
      bio: user.bio,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    // Cache the result
    await this.cacheService.set(cacheKey, profile, 300);

    this.logger.info("User profile retrieved successfully", { userId: user.id });

    return QueryResult.successItem(profile, "User profile retrieved successfully", {
      hit: false,
      key: cacheKey,
      ttl: 300,
    });
  }
}
```

## Event Sourcing

### Creating Domain Events

```typescript
import { DomainEvent } from "@hl8/application-kernel";
import { EntityId } from "@hl8/domain-kernel";

export class UserCreatedEvent extends DomainEvent {
  constructor(aggregateRootId: EntityId, name: string, email: string, version: number = 1) {
    super(aggregateRootId, "UserCreated", { name, email }, version, { timestamp: new Date() });
  }
}

export class UserProfileUpdatedEvent extends DomainEvent {
  constructor(aggregateRootId: EntityId, name?: string, email?: string, bio?: string, version: number = 1) {
    super(aggregateRootId, "UserProfileUpdated", { name, email, bio }, version, { timestamp: new Date() });
  }
}
```

### Event Handlers

```typescript
import { Injectable } from "@nestjs/common";
import { EventHandler, BaseEventHandler } from "@hl8/application-kernel";
import { InjectPinoLogger } from "@hl8/logger";
import { Logger } from "pino";

@Injectable()
@EventHandler(UserCreatedEvent)
export class UserCreatedEventHandler extends BaseEventHandler<UserCreatedEvent> {
  constructor(
    @InjectPinoLogger(UserCreatedEventHandler.name) private readonly logger: Logger,
    private readonly emailService: EmailService,
    private readonly analyticsService: AnalyticsService,
  ) {
    super(logger);
  }

  protected async handleEvent(event: UserCreatedEvent): Promise<void> {
    this.logger.info("Handling user created event", {
      userId: event.aggregateRootId,
      email: event.data.email,
    });

    // Send welcome email
    await this.emailService.sendWelcomeEmail(event.data.email, event.data.name);

    // Track analytics
    await this.analyticsService.trackUserRegistration(event.aggregateRootId);

    this.logger.info("User created event handled successfully");
  }
}
```

## Configuration Management

### Using @hl8/config

```typescript
import { Injectable } from "@nestjs/common";
import { TypedConfigModule, ConfigValidator } from "@hl8/config";
import { InjectPinoLogger } from "@hl8/logger";
import { Logger } from "pino";

@Injectable()
export class ApplicationKernelConfigService {
  constructor(
    @InjectPinoLogger(ApplicationKernelConfigService.name) private readonly logger: Logger,
    private readonly config: ApplicationKernelConfig,
  ) {}

  async validateConfiguration(): Promise<boolean> {
    try {
      const validator = new ConfigValidator();
      const result = await validator.validate(this.config);

      if (result.isValid) {
        this.logger.info("Configuration validation successful");
        return true;
      } else {
        this.logger.error("Configuration validation failed", {
          errors: result.errors,
        });
        return false;
      }
    } catch (error) {
      this.logger.error("Configuration validation error", { error: error.message });
      return false;
    }
  }

  getEventStoreConfig(): EventStoreConfig {
    return this.config.eventStore;
  }

  getEventBusConfig(): EventBusConfig {
    return this.config.eventBus;
  }
}
```

## Error Handling

### Custom Exceptions

```typescript
import { ApplicationException, ExceptionCodes } from "@hl8/application-kernel";
import { EntityId } from "@hl8/domain-kernel";

export class UserNotFoundException extends ApplicationException {
  constructor(userId: EntityId) {
    super(`User not found: ${userId}`, ExceptionCodes.USER_NOT_FOUND, "User", "findById", { userId: userId.toString() });
  }
}

export class UserValidationException extends ApplicationException {
  constructor(message: string, validationErrors: string[]) {
    super(`User validation failed: ${message}`, ExceptionCodes.USER_VALIDATION_FAILED, "User", "validate", { validationErrors });
  }
}
```

### Global Exception Filter

```typescript
import { Injectable, ExceptionFilter, Catch, ArgumentsHost } from "@nestjs/common";
import { ApplicationException } from "@hl8/application-kernel";
import { InjectPinoLogger } from "@hl8/logger";
import { Logger } from "pino";

@Injectable()
@Catch(ApplicationException)
export class ApplicationExceptionFilter implements ExceptionFilter {
  constructor(@InjectPinoLogger(ApplicationExceptionFilter.name) private readonly logger: Logger) {}

  catch(exception: ApplicationException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    this.logger.error("Application exception caught", {
      error: exception.message,
      code: exception.errorCode,
      component: exception.getComponent(),
      operation: exception.getOperation(),
      context: exception.context,
      correlationId: request.correlationId,
    });

    response.status(400).json({
      error: exception.errorCode,
      message: exception.message,
      details: exception.context,
      correlationId: request.correlationId,
      timestamp: new Date().toISOString(),
    });
  }
}
```

## Monitoring and Logging

### Performance Metrics

```typescript
import { Injectable } from "@nestjs/common";
import { MonitoringService } from "@hl8/application-kernel";
import { InjectPinoLogger } from "@hl8/logger";
import { Logger } from "pino";

@Injectable()
export class UserService {
  constructor(
    @InjectPinoLogger(UserService.name) private readonly logger: Logger,
    private readonly monitoring: MonitoringService,
  ) {}

  async createUser(userData: CreateUserData): Promise<User> {
    const startTime = Date.now();

    try {
      this.logger.info("Creating user", { email: userData.email });

      const user = await this.performUserCreation(userData);

      const executionTime = Date.now() - startTime;
      this.monitoring.recordMetric("user.creation.time", executionTime);
      this.monitoring.incrementCounter("user.creation.success");

      this.logger.info("User created successfully", {
        userId: user.id,
        executionTime,
      });

      return user;
    } catch (error) {
      this.monitoring.incrementCounter("user.creation.error");
      this.logger.error("User creation failed", {
        error: error.message,
        executionTime: Date.now() - startTime,
      });
      throw error;
    }
  }
}
```

## 测试架构

### 分层测试架构约定

本项目遵循分层测试架构约定，确保代码质量和快速反馈：

- **就近原则**：单元测试文件与被测试文件在同一目录，命名格式：`{被测试文件名}.spec.ts`
- **集中管理**：集成测试、端到端测试统一放置在项目根目录下的 **test** 目录（src目录外）
- **类型分离**：单元测试与源代码同目录，集成测试按模块组织，端到端测试按功能组织
- **测试覆盖率要求**：核心业务逻辑 ≥ 80%，关键路径 ≥ 90%，所有公共 API 必须有测试用例

### 单元测试（就近原则）

```typescript
// src/use-cases/create-user.use-case.spec.ts
import { Test, TestingModule } from "@nestjs/testing";
import { CreateUserUseCase } from "./create-user.use-case";
import { UserRepository } from "../repositories/user.repository";
import { EventBus } from "@nestjs/cqrs";

describe("CreateUserUseCase", () => {
  let useCase: CreateUserUseCase;
  let userRepository: jest.Mocked<UserRepository>;
  let eventBus: jest.Mocked<EventBus>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateUserUseCase,
        {
          provide: UserRepository,
          useValue: {
            save: jest.fn(),
            findByEmail: jest.fn(),
          },
        },
        {
          provide: EventBus,
          useValue: {
            publish: jest.fn(),
          },
        },
      ],
    }).compile();

    useCase = module.get<CreateUserUseCase>(CreateUserUseCase);
    userRepository = module.get(UserRepository);
    eventBus = module.get(EventBus);
  });

  it("should create user successfully", async () => {
    // Given
    const input = new CreateUserInput("John Doe", "john@example.com", "password123");
    const user = new User("user-1", "John Doe", "john@example.com");

    userRepository.save.mockResolvedValue(user);
    eventBus.publish.mockResolvedValue(undefined);

    // When
    const result = await useCase.execute(input);

    // Then
    expect(result.success).toBe(true);
    expect(result.output.userId).toBe("user-1");
    expect(userRepository.save).toHaveBeenCalledWith(user);
    expect(eventBus.publish).toHaveBeenCalledWith(expect.any(UserCreatedEvent));
  });
});
```

### 集成测试（集中管理）

```typescript
// test/integration/cqrs.integration.spec.ts
import { Test, TestingModule } from "@nestjs/testing";
import { ApplicationKernelModule } from "../../src/application-kernel.module";
import { CreateUserUseCase } from "../../src/use-cases/create-user.use-case";
import { CreateUserCommand } from "../../src/commands/create-user.command";
import { CommandBus } from "../../src/bus/command-bus";

describe("CQRS Integration Tests", () => {
  let module: TestingModule;
  let createUserUseCase: CreateUserUseCase;
  let commandBus: CommandBus;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [ApplicationKernelModule],
    }).compile();

    createUserUseCase = module.get<CreateUserUseCase>(CreateUserUseCase);
    commandBus = module.get<CommandBus>(CommandBus);
  });

  afterAll(async () => {
    await module.close();
  });

  it("should create user with real dependencies", async () => {
    // Given
    const input = new CreateUserInput("test@example.com", "Test User");

    // When
    const result = await createUserUseCase.execute(input);

    // Then
    expect(result.isSuccess).toBe(true);
    expect(result.data).toBeDefined();
  });

  it("should execute command through command bus", async () => {
    // Given
    const command = new CreateUserCommand("test@example.com", "Test User");

    // When
    const result = await commandBus.execute(command);

    // Then
    expect(result.isSuccess).toBe(true);
    expect(result.data).toBeDefined();
  });
});
```

### 端到端测试（集中管理）

```typescript
// test/e2e/application-kernel.e2e.spec.ts
import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import { ApplicationKernelModule } from "../../src/application-kernel.module";
import { CommandBus } from "../../src/bus/command-bus";
import { QueryBus } from "../../src/bus/query-bus";

describe("Application Kernel E2E Tests", () => {
  let app: INestApplication;
  let commandBus: CommandBus;
  let queryBus: QueryBus;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ApplicationKernelModule],
    }).compile();

    app = module.createNestApplication();
    await app.init();

    commandBus = module.get<CommandBus>(CommandBus);
    queryBus = module.get<QueryBus>(QueryBus);
  });

  afterAll(async () => {
    await app.close();
  });

  it("should complete full user management workflow", async () => {
    // Given
    const createCommand = new CreateUserCommand("e2e@example.com", "E2E User");
    const query = new GetUserQuery("e2e@example.com");

    // When
    const createResult = await commandBus.execute(createCommand);
    const queryResult = await queryBus.execute(query);

    // Then
    expect(createResult.isSuccess).toBe(true);
    expect(queryResult.isSuccess).toBe(true);
    expect(queryResult.data).toBeDefined();
  });
});
```

### 契约测试（集中管理）

```typescript
// test/contract/api.contract.spec.ts
import { Test, TestingModule } from "@nestjs/testing";
import { ApplicationKernelModule } from "../../src/application-kernel.module";
import { CommandBus } from "../../src/bus/command-bus";
import { QueryBus } from "../../src/bus/query-bus";

describe("API Contract Tests", () => {
  let module: TestingModule;
  let commandBus: CommandBus;
  let queryBus: QueryBus;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [ApplicationKernelModule],
    }).compile();

    commandBus = module.get<CommandBus>(CommandBus);
    queryBus = module.get<QueryBus>(QueryBus);
  });

  afterAll(async () => {
    await module.close();
  });

  it("should maintain command contract compatibility", async () => {
    // Given
    const command = new CreateUserCommand("contract@example.com", "Contract User");

    // When
    const result = await commandBus.execute(command);

    // Then
    expect(result).toHaveProperty("isSuccess");
    expect(result).toHaveProperty("data");
    expect(result).toHaveProperty("error");
    expect(result).toHaveProperty("executionTime");
  });

  it("should maintain query contract compatibility", async () => {
    // Given
    const query = new GetUserQuery("contract@example.com");

    // When
    const result = await queryBus.execute(query);

    // Then
    expect(result).toHaveProperty("isSuccess");
    expect(result).toHaveProperty("data");
    expect(result).toHaveProperty("error");
    expect(result).toHaveProperty("executionTime");
    expect(result).toHaveProperty("cacheInfo");
  });
});
```

### 测试数据管理

```typescript
// test/factories/user.factory.ts
import { User } from "../../src/entities/user";
import { CreateUserInput } from "../../src/use-cases/create-user.use-case";

export class UserFactory {
  static create(overrides: Partial<User> = {}): User {
    return new User(overrides.id || "user-123", overrides.email || "test@example.com", overrides.name || "Test User", overrides.createdAt || new Date(), overrides.updatedAt || new Date());
  }

  static createInput(overrides: Partial<CreateUserInput> = {}): CreateUserInput {
    return new CreateUserInput(overrides.email || "test@example.com", overrides.name || "Test User");
  }
}
```

### 测试配置

```typescript
// jest.config.ts
export default {
  displayName: "Application Kernel",
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/src", "<rootDir>/test"],
  testMatch: ["**/src/**/*.spec.ts", "**/test/integration/**/*.spec.ts", "**/test/e2e/**/*.spec.ts", "**/test/contract/**/*.spec.ts"],
  collectCoverageFrom: ["src/**/*.ts", "!src/**/*.spec.ts", "!src/**/*.interface.ts", "!src/**/*.d.ts"],
  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov", "html"],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
    "src/use-cases/": {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90,
    },
    "src/commands/": {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90,
    },
    "src/queries/": {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90,
    },
  },
};
```

## Best Practices

1. **Use Platform Services**: Always use @hl8/config and @hl8/logger for consistency
2. **Structured Logging**: Include correlation IDs and context in all log messages
3. **Error Handling**: Use typed exceptions with proper error codes
4. **Configuration**: Validate all configuration at startup
5. **Testing Architecture**: 遵循分层测试架构约定，确保代码质量和快速反馈
   - 单元测试：与源代码同目录，使用 `.spec.ts` 后缀
   - 集成测试：集中在 `test/integration/` 目录
   - 端到端测试：集中在 `test/e2e/` 目录
   - 契约测试：集中在 `test/contract/` 目录
6. **Test Coverage**: 核心业务逻辑 ≥ 80%，关键路径 ≥ 90%，公共API 100%
7. **Test Data Management**: 使用工厂模式管理测试数据，确保测试独立性
8. **Performance**: Monitor execution times and cache frequently accessed data
9. **Events**: Publish domain events for all state changes
10. **Validation**: Validate all inputs using class-validator decorators

## Next Steps

- Explore advanced CQRS patterns
- Implement Saga patterns for distributed transactions
- Set up event projection for read models
- Configure monitoring and alerting
- Implement caching strategies
