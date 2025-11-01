# Application Kernel API 参考

**版本**: 1.0.0  
**更新日期**: 2024-12-19

本文档提供 `@hl8/application-kernel` 的完整 API 参考，包含所有公共类、接口、类型和枚举。

---

## 📋 目录

1. [用例 (Use Cases)](#用例-use-cases)
2. [命令 (Commands)](#命令-commands)
3. [查询 (Queries)](#查询-queries)
4. [事件 (Events)](#事件-events)
5. [投影器 (Projectors)](#投影器-projectors)
6. [Saga](#saga)
7. [总线 (Bus)](#总线-bus)
8. [缓存 (Cache)](#缓存-cache)
9. [监控 (Monitoring)](#监控-monitoring)
10. [配置 (Config)](#配置-config)
11. [异常 (Exceptions)](#异常-exceptions)
12. [模块 (Module)](#模块-module)

---

## 用例 (Use Cases)

### UseCase

用例基类，封装业务逻辑的执行流程。

```typescript
abstract class UseCase<TInput extends UseCaseInput, TOutput extends UseCaseOutput>
```

**方法**:

- `execute(input: TInput): Promise<TOutput>` - 执行用例
- `validateInput(input: TInput): Promise<void>` - 验证输入（可重写）
- `executeBusinessLogic(input: TInput): Promise<TOutput>` - 执行业务逻辑（抽象方法）

**属性**:

- `protected readonly logger: Logger` - 日志记录器
- `protected readonly useCaseName: string` - 用例名称

**示例**:

```typescript
class CreateUserUseCase extends UseCase<CreateUserInput, CreateUserOutput> {
  protected async executeBusinessLogic(input: CreateUserInput): Promise<CreateUserOutput> {
    // 业务逻辑实现
  }
}
```

---

### UseCaseInput

用例输入基类。

```typescript
abstract class UseCaseInput
```

**属性**:

- `correlationId?: string` - 关联ID
- `userId?: string` - 用户ID
- `timestamp?: Date` - 时间戳

**方法**:

- `getSummary(): Record<string, unknown>` - 获取输入摘要

---

### UseCaseOutput

用例输出基类。

```typescript
abstract class UseCaseOutput
```

**属性**:

- `executionTime?: number` - 执行时间（毫秒）

**方法**:

- `setExecutionTime(startTime: number): void` - 设置执行时间
- `getSummary(): Record<string, unknown>` - 获取输出摘要

---

### UseCase Decorator

用例装饰器。

```typescript
function UseCase(options?: UseCaseConfig): ClassDecorator
```

**接口**:

```typescript
interface UseCaseConfig {
  name?: string;
  description?: string;
  version?: string;
  enabled?: boolean;
}
```

---

## 命令 (Commands)

### BaseCommand

命令基类，基于 `@nestjs/cqrs` 的 `Command`。

```typescript
abstract class BaseCommand<TResult = unknown> extends Command<TResult>
```

**属性**:

- `commandId: string` - 命令ID
- `aggregateId: string` - 聚合根ID
- `commandType: string` - 命令类型
- `correlationId?: string` - 关联ID
- `userId?: string` - 用户ID
- `timestamp?: Date` - 时间戳
- `version?: string` - 版本
- `metadata?: Record<string, unknown>` - 元数据

**构造函数**:

```typescript
constructor(
  aggregateId: string,
  commandType: string,
  options?: {
    commandId?: string;
    correlationId?: string;
    userId?: string;
    timestamp?: Date;
    version?: string;
    metadata?: Record<string, unknown>;
  }
)
```

---

### BaseCommandHandler

命令处理器基类。

```typescript
abstract class BaseCommandHandler<TCommand extends BaseCommand>
  implements ICommandHandler<TCommand>
```

**方法**:

- `handle(command: TCommand): Promise<CommandResult>` - 处理命令（抽象方法）
- `validateCommand(command: TCommand): Promise<void>` - 验证命令（可重写）

---

### CommandResult

命令执行结果。

```typescript
class CommandResult
```

**静态方法**:

- `success(data?: unknown): CommandResult` - 创建成功结果
- `failure(error: string, code?: string): CommandResult` - 创建失败结果

**属性**:

- `success: boolean` - 是否成功
- `data?: unknown` - 结果数据
- `error?: string` - 错误消息
- `code?: string` - 错误代码
- `timestamp: Date` - 时间戳

---

### Command Decorator

命令装饰器。

```typescript
function Command(options?: CommandConfig): ClassDecorator
```

**接口**:

```typescript
interface CommandConfig {
  name?: string;
  description?: string;
  version?: string;
}
```

---

## 查询 (Queries)

### BaseQuery

查询基类，基于 `@nestjs/cqrs` 的 `Query`。

```typescript
abstract class BaseQuery<TResult = unknown> extends Query<TResult>
```

**属性**:

- `queryId: string` - 查询ID
- `queryType: string` - 查询类型
- `correlationId?: string` - 关联ID
- `userId?: string` - 用户ID
- `timestamp?: Date` - 时间戳
- `version?: string` - 版本
- `pagination?: { page: number; limit: number; offset?: number }` - 分页参数
- `sorting?: Array<{ field: string; direction: "asc" | "desc" }>` - 排序参数
- `filters?: Record<string, unknown>` - 过滤参数
- `metadata?: Record<string, unknown>` - 元数据

---

### BaseQueryHandler

查询处理器基类。

```typescript
abstract class BaseQueryHandler<TQuery extends BaseQuery>
  implements IQueryHandler<TQuery>
```

**方法**:

- `handle(query: TQuery): Promise<QueryResult>` - 处理查询（抽象方法）
- `validateQuery(query: TQuery): Promise<void>` - 验证查询（可重写）

---

### QueryResult

查询执行结果。

```typescript
class QueryResult
```

**静态方法**:

- `success(data: unknown): QueryResult` - 创建成功结果
- `failure(error: string, code?: string): QueryResult` - 创建失败结果

**属性**:

- `success: boolean` - 是否成功
- `data: unknown` - 结果数据
- `error?: string` - 错误消息
- `code?: string` - 错误代码
- `timestamp: Date` - 时间戳
- `executionTime?: number` - 执行时间

---

### Query Decorator

查询装饰器。

```typescript
function Query(options?: QueryConfig): ClassDecorator
```

---

## 事件 (Events)

### IEventStore

事件存储接口。

```typescript
interface IEventStore
```

**方法**:

- `saveEvents(aggregateId: EntityId, events: DomainEvent[], expectedVersion: number): Promise<EventStoreResult>`
- `getEvents(aggregateId: EntityId, fromVersion?: number, toVersion?: number): Promise<DomainEvent[]>`
- `getEventStream(aggregateId: EntityId, fromVersion?: number, toVersion?: number): Promise<EventStream>`
- `getAllEvents(fromTimestamp?: Date, toTimestamp?: Date, limit?: number): Promise<DomainEvent[]>`
- `getSnapshot(aggregateId: EntityId, version?: number): Promise<EventSnapshot | null>`
- `saveSnapshot(snapshot: EventSnapshot): Promise<void>`
- `deleteSnapshot(aggregateId: EntityId, version?: number): Promise<void>`

---

### EventStore

事件存储实现。

```typescript
class EventStore implements IEventStore
```

**构造函数**:

```typescript
constructor(
  logger: Logger,
  config: EventStoreConfig,
  postgresqlClient?: unknown,
  mongodbClient?: unknown
)
```

---

### EventSnapshot

事件快照。

```typescript
class EventSnapshot implements IEventSnapshot
```

**属性**:

- `aggregateId: EntityId` - 聚合根ID
- `aggregateType: string` - 聚合类型
- `version: number` - 版本号
- `snapshot: unknown` - 快照数据
- `createdAt: Date` - 创建时间

---

### IEventBus

事件总线接口。

```typescript
interface IEventBus
```

**方法**:

- `publish(event: DomainEvent | IntegrationEvent): Promise<EventPublishResult>`
- `publishMany(events: Array<DomainEvent | IntegrationEvent>): Promise<EventPublishResult[]>`
- `subscribe(handler: EventHandler): Promise<string>`
- `subscribeToDomainEvent(eventType: string, handler: EventHandler<DomainEvent>): Promise<string>`
- `unsubscribe(subscriptionId: string): Promise<boolean>`
- `getStatistics(): EventBusStatistics`

---

### EventBusImpl

事件总线实现。

```typescript
class EventBusImpl implements IEventBus
```

**构造函数**:

```typescript
constructor(
  logger: Logger,
  nestEventBus: EventBus,
  config?: EventBusConfig
)
```

---

### DomainEvent

领域事件类型。

```typescript
interface DomainEvent
```

继承自 `@hl8/domain-kernel` 的 `DomainEvent`。

---

## 投影器 (Projectors)

### Projector

投影器基类。

```typescript
abstract class Projector<TReadModel = unknown>
```

**属性**:

- `protected readonly logger: Logger`
- `protected readonly config: ProjectorConfig`
- `protected status: ProjectorStatus`
- `protected statistics: ProjectorStatistics`

**方法**:

- `start(): Promise<void>` - 启动投影器
- `stop(): Promise<void>` - 停止投影器
- `processEvent(event: DomainEvent): Promise<void>` - 处理事件（抽象方法）

---

### ProjectorHandler

投影器处理器基类。

```typescript
abstract class ProjectorHandler
```

**方法**:

- `handle(event: DomainEvent): Promise<void>` - 处理事件（抽象方法）

---

### ProjectorStatus

投影器状态枚举。

```typescript
enum ProjectorStatus {
  UNINITIALIZED = "uninitialized",
  INITIALIZED = "initialized",
  RUNNING = "running",
  STOPPED = "stopped",
  ERROR = "error",
}
```

---

### ProjectorRegistry

投影器注册表。

```typescript
class ProjectorRegistry
```

**方法**:

- `register(projector: Projector): void` - 注册投影器
- `get(name: string): Projector | undefined` - 获取投影器
- `getAll(): Projector[]` - 获取所有投影器
- `registerHandler(handler: ProjectorHandler): void` - 注册处理器

---

### Projector Decorators

```typescript
function Projector(options: ProjectorOptions): ClassDecorator
function ProjectorHandler(options: ProjectorHandlerOptions): ClassDecorator
function Retry(retryConfig: {...}): MethodDecorator
function Performance(performanceConfig: {...}): MethodDecorator
```

---

## Saga

### Saga

Saga 基类。

```typescript
abstract class Saga<TData = unknown>
```

**属性**:

- `protected readonly logger: Logger`
- `protected readonly config: SagaConfig`
- `protected status: SagaStatus`
- `protected statistics: SagaStatistics`
- `protected context: SagaContext`
- `protected steps: BaseSagaStep[]`

**方法**:

- `execute(data: TData): Promise<void>` - 执行 Saga
- `compensate(): Promise<void>` - 补偿操作
- `pause(): Promise<void>` - 暂停
- `resume(): Promise<void>` - 恢复
- `cancel(reason?: string): Promise<void>` - 取消
- `addStep(step: BaseSagaStep): void` - 添加步骤
- `protected initializeSteps(): void` - 初始化步骤（抽象方法）

---

### BaseSagaStep

Saga 步骤基类。

```typescript
abstract class BaseSagaStep
```

**方法**:

- `execute(context: SagaContext): Promise<void>` - 执行步骤（抽象方法）
- `compensate(context: SagaContext): Promise<void>` - 补偿步骤（可重写）
- `getName(): string` - 获取步骤名称
- `isEnabled(): boolean` - 是否启用

---

### SagaStatus

Saga 状态枚举。

```typescript
enum SagaStatus {
  NOT_STARTED = "not_started",
  RUNNING = "running",
  COMPLETED = "completed",
  FAILED = "failed",
  COMPENSATED = "compensated",
  PAUSED = "paused",
  CANCELLED = "cancelled",
}
```

---

### SagaStateManager

Saga 状态管理器。

```typescript
class SagaStateManager
```

**方法**:

- `saveSagaState(snapshot: SagaStateSnapshot): Promise<void>`
- `getSagaState(sagaId: string): Promise<SagaStateSnapshot | undefined>`
- `getSagaStatesByAggregate(aggregateId: string): Promise<SagaStateSnapshot[]>`
- `querySagaStates(query: SagaStateQuery): Promise<SagaStateQueryResult>`
- `updateSagaState(sagaId: string, updates: Partial<SagaStateSnapshot>): Promise<void>`
- `deleteSagaState(sagaId: string): Promise<void>`

---

### SagaExecutionEngine

Saga 执行引擎。

```typescript
class SagaExecutionEngine implements ISagaExecutionEngine
```

**方法**:

- `execute(saga: Saga, data: unknown): Promise<SagaExecutionResult>`
- `getStatistics(): SagaExecutionStatistics`

---

### Saga Decorators

```typescript
function Saga(options: SagaOptions): ClassDecorator
function SagaStep(options: SagaStepOptions): MethodDecorator
function BeforeStep(stepName: string): MethodDecorator
function AfterStep(stepName: string): MethodDecorator
function OnError(stepName?: string): MethodDecorator
function OnCompensate(stepName?: string): MethodDecorator
function Retry(retryConfig: {...}): MethodDecorator
function Compensation(compensationConfig: {...}): MethodDecorator
```

---

## 总线 (Bus)

### ICommandQueryBus

命令查询总线接口。

```typescript
interface ICommandQueryBus
```

**方法**:

- `executeCommand<TCommand extends BaseCommand>(command: TCommand): Promise<CommandResult>`
- `executeQuery<TQuery extends BaseQuery>(query: TQuery): Promise<QueryResult>`
- `registerCommandHandler(commandType: string, handler: CommandHandler): Promise<boolean>`
- `registerQueryHandler(queryType: string, handler: QueryHandler): Promise<boolean>`
- `unregisterCommandHandler(commandType: string): Promise<boolean>`
- `unregisterQueryHandler(queryType: string): Promise<boolean>`
- `getStatistics(): BusStatistics`

---

### CommandQueryBusImpl

命令查询总线实现。

```typescript
class CommandQueryBusImpl implements ICommandQueryBus
```

**构造函数**:

```typescript
constructor(
  logger: Logger,
  commandBus: CommandBus,
  queryBus: QueryBus,
  config?: BusConfig
)
```

---

### BusMiddleware

总线中间件接口。

```typescript
interface BusMiddleware
```

**方法**:

- `beforeExecute(context: ExecutionContext): Promise<boolean>`
- `afterExecute(context: ExecutionContext, result: unknown): Promise<unknown>`
- `onError(context: ExecutionContext, error: Error): Promise<void>`

---

## 缓存 (Cache)

### ICache

缓存接口。

```typescript
interface ICache
```

**方法**:

- `get<T>(key: string): Promise<T | undefined>`
- `set<T>(key: string, value: T, ttl?: number): Promise<void>`
- `delete(key: string): Promise<boolean>`
- `clear(): Promise<void>`
- `has(key: string): Promise<boolean>`
- `getStatistics(): CacheStats`

---

### InMemoryCache

内存缓存实现。

```typescript
class InMemoryCache implements ICache
```

**构造函数**:

```typescript
constructor(config: CacheConfig, logger: Logger)
```

---

### CacheConfig

缓存配置。

```typescript
interface CacheConfig {
  defaultTtl: number;
  maxSize?: number;
  enableStats?: boolean;
  enableEventInvalidation?: boolean;
  cleanupInterval?: number;
  enableCompression?: boolean;
}
```

---

## 监控 (Monitoring)

### MonitoringService

监控服务。

```typescript
class MonitoringService
```

**方法**:

- `start(): Promise<void>` - 启动监控
- `stop(): Promise<void>` - 停止监控
- `collectMetrics(): Promise<PerformanceMetricData[]>`
- `getMetrics(type?: PerformanceMetricType): Promise<PerformanceMetricData[]>`
- `getAlerts(): Promise<PerformanceAlert[]>`

---

### PerformanceMetric

性能指标。

```typescript
class PerformanceMetric
```

**方法**:

- `record(value: number, labels?: PerformanceMetricLabel): void`
- `getData(): PerformanceMetricData`
- `reset(): void`

---

### PerformanceMetricType

性能指标类型枚举。

```typescript
enum PerformanceMetricType {
  COUNTER = "counter",
  GAUGE = "gauge",
  HISTOGRAM = "histogram",
  SUMMARY = "summary",
}
```

---

## 配置 (Config)

### ApplicationKernelConfig

应用内核配置接口。

```typescript
interface ApplicationKernelConfig {
  eventStore: EventStoreConfig;
  eventBus: EventBusConfig;
  cache: CacheConfig;
  monitoring: MonitoringConfig;
  performance: PerformanceConfig;
  logging: LoggingConfig;
}
```

---

### ApplicationKernelConfigService

配置服务。

```typescript
class ApplicationKernelConfigService
```

**方法**:

- `getConfig(): ApplicationKernelConfig` - 获取配置
- `updateConfig(partial: Partial<ApplicationKernelConfig>): Promise<ConfigValidationResult>` - 更新配置
- `validateConfig(candidate: Partial<ApplicationKernelConfig>): ConfigValidationResult` - 验证配置
- `onConfigUpdate(callback: ConfigUpdateCallback): void` - 注册配置更新回调

---

## 异常 (Exceptions)

### ApplicationException

应用层异常基类。

```typescript
abstract class ApplicationException extends DomainException
```

**属性**:

- `getComponent(): string` - 获取组件名称
- `getOperation(): string` - 获取操作名称
- `getSeverity(): ExceptionSeverity` - 获取严重程度

---

### UseCaseException

用例异常。

```typescript
class UseCaseException extends ApplicationException
```

### UseCaseValidationException

用例验证异常。

```typescript
class UseCaseValidationException extends UseCaseException
```

---

### CommandExecutionException

命令执行异常。

```typescript
class CommandExecutionException extends ApplicationException
```

### CommandValidationException

命令验证异常。

```typescript
class CommandValidationException extends CommandExecutionException
```

---

### QueryExecutionException

查询执行异常。

```typescript
class QueryExecutionException extends ApplicationException
```

### QueryValidationException

查询验证异常。

```typescript
class QueryValidationException extends QueryExecutionException
```

---

### EventProcessingException

事件处理异常。

```typescript
class EventProcessingException extends ApplicationException
```

### EventStoreException

事件存储异常。

```typescript
class EventStoreException extends EventProcessingException
```

---

### SagaExecutionException

Saga 执行异常。

```typescript
class SagaExecutionException extends ApplicationException
```

### SagaCompensationException

Saga 补偿异常。

```typescript
class SagaCompensationException extends SagaExecutionException
```

---

### ExceptionCodes

异常代码常量。

```typescript
class ExceptionCodes
```

**静态属性**:

- `USE_CASE_EXECUTION_FAILED`
- `USE_CASE_VALIDATION_FAILED`
- `COMMAND_EXECUTION_FAILED`
- `COMMAND_VALIDATION_FAILED`
- `QUERY_EXECUTION_FAILED`
- `QUERY_VALIDATION_FAILED`
- `EVENT_PROCESSING_FAILED`
- `EVENT_STORE_FAILED`
- `SAGA_EXECUTION_FAILED`
- `SAGA_COMPENSATION_FAILED`

---

## 模块 (Module)

### ApplicationKernelModule

应用内核 NestJS 模块。

```typescript
class ApplicationKernelModule
```

**静态方法**:

- `forRoot(options?: ApplicationKernelModuleOptions): DynamicModule`
- `forRootAsync(options: {...}): DynamicModule`

**选项**:

```typescript
interface ApplicationKernelModuleOptions {
  eventStore?: {
    type: "postgresql" | "mongodb" | "hybrid";
    postgresql?: string;
    mongodb?: string;
  };
  eventBus?: {
    deliveryGuarantee: "at-least-once" | "exactly-once" | "at-most-once";
    retryPolicy: {
      maxRetries: number;
      backoffMs: number;
    };
  };
  cache?: {
    type: "memory" | "redis";
    connectionString?: string;
    ttl: {
      default: number;
    };
  };
  monitoring?: {
    enabled: boolean;
    metricsInterval: number;
  };
}
```

---

## 类型别名

为了避免命名冲突，部分配置类型使用别名导出：

- `CacheConfigType` - 缓存配置类型别名
- `EventBusConfigType` - 事件总线配置类型别名
- `MonitoringConfigType` - 监控配置类型别名

---

## 使用示例

### 基本导入

```typescript
import {
  // 用例
  UseCase,
  UseCaseInput,
  UseCaseOutput,
  
  // 命令
  BaseCommand,
  BaseCommandHandler,
  CommandResult,
  
  // 查询
  BaseQuery,
  BaseQueryHandler,
  QueryResult,
  
  // 事件
  EventStore,
  EventBusImpl,
  
  // Saga
  Saga,
  BaseSagaStep,
  SagaStateManager,
  
  // 总线
  CommandQueryBusImpl,
  
  // 缓存
  InMemoryCache,
  type CacheConfigType,
  
  // 监控
  MonitoringService,
  type MonitoringConfigType,
  
  // 配置
  ApplicationKernelConfigService,
  
  // 异常
  ApplicationException,
  UseCaseException,
  ExceptionCodes,
  
  // 模块
  ApplicationKernelModule,
} from "@hl8/application-kernel";
```

---

## 版本信息

- **当前版本**: 1.0.0
- **TypeScript**: >= 5.9.3
- **Node.js**: >= 20
- **NestJS**: ^11.0.0

---

**提示**: 更多详细信息和使用示例，请参考 [快速入门指南](./QUICKSTART.md)。
