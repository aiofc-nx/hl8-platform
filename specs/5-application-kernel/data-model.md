# Data Model: Application Kernel Core Module

**Feature**: Application Kernel Core Module  
**Date**: 2024-12-19  
**Phase**: 1 - Design & Contracts

## Core Entities

### UseCase (用例基类)

**Purpose**: 应用层核心实体，所有业务操作的入口点

**Attributes**:

- `useCaseName: string` - 用例名称，唯一标识
- `version: string` - 用例版本，支持版本管理
- `enabled: boolean` - 是否启用，支持动态控制
- `inputValidation: ValidationRule[]` - 输入验证规则
- `outputFormat: OutputFormat` - 输出格式定义
- `businessRules: BusinessRule[]` - 业务规则定义
- `metadata: Record<string, unknown>` - 元数据信息

**Relationships**:

- 继承自 `BaseUseCase`
- 包含 `UseCaseInput` 和 `UseCaseOutput`
- 关联 `UseCaseException` 异常处理

**Validation Rules**:

- 用例名称不能为空且必须唯一
- 版本必须符合语义化版本规范
- 输入验证规则必须完整定义

### Command (命令基类)

**Purpose**: CQRS写操作实体，负责改变系统状态

**Attributes**:

- `commandId: EntityId` - 命令唯一标识
- `commandType: string` - 命令类型，用于路由
- `aggregateId: EntityId` - 聚合根ID
- `correlationId: string` - 关联ID，用于追踪
- `userId: EntityId` - 操作用户ID
- `timestamp: Date` - 命令时间戳
- `version: number` - 命令版本
- `metadata: Record<string, unknown>` - 命令元数据
- `payload: unknown` - 命令载荷数据

**Relationships**:

- 继承自 `BaseCommand`
- 关联 `CommandHandler` 处理器
- 产生 `DomainEvent` 领域事件
- 返回 `CommandResult` 执行结果

**Validation Rules**:

- 命令ID必须唯一且不为空
- 命令类型必须符合命名规范
- 聚合根ID必须有效
- 载荷数据必须通过业务规则验证

### Query (查询基类)

**Purpose**: CQRS读操作实体，负责数据检索

**Attributes**:

- `queryId: EntityId` - 查询唯一标识
- `queryType: string` - 查询类型，用于路由
- `correlationId: string` - 关联ID，用于追踪
- `userId: EntityId` - 查询用户ID
- `timestamp: Date` - 查询时间戳
- `version: number` - 查询版本
- `pagination: PaginationInfo` - 分页信息
- `sorting: SortingInfo[]` - 排序信息
- `filters: FilterInfo[]` - 过滤条件
- `metadata: Record<string, unknown>` - 查询元数据

**Relationships**:

- 继承自 `BaseQuery`
- 关联 `QueryHandler` 处理器
- 返回 `QueryResult` 查询结果
- 支持 `QueryCache` 缓存机制

**Validation Rules**:

- 查询ID必须唯一且不为空
- 查询类型必须符合命名规范
- 分页参数必须合理（页码>0，页大小>0且<1000）
- 排序字段必须存在于目标实体中

### DomainEvent (领域事件)

**Purpose**: 事件溯源核心实体，记录所有状态变更

**Attributes**:

- `eventId: EntityId` - 事件唯一标识
- `aggregateRootId: EntityId` - 聚合根ID
- `eventType: string` - 事件类型
- `data: unknown` - 事件数据
- `version: number` - 事件版本
- `timestamp: Date` - 事件时间戳
- `metadata: Record<string, unknown>` - 事件元数据
- `causationId: EntityId` - 因果关系ID
- `correlationId: string` - 关联ID

**Relationships**:

- 继承自 `BaseDomainEvent`
- 存储到 `EventStore` 事件存储
- 发布到 `EventBus` 事件总线
- 处理 by `EventHandler` 事件处理器

**Validation Rules**:

- 事件ID必须唯一且不为空
- 聚合根ID必须有效
- 事件类型必须符合命名规范
- 事件数据必须可序列化

### EventStore (事件存储)

**Purpose**: 事件持久化存储，支持混合存储策略

**Attributes**:

- `storeId: EntityId` - 存储唯一标识
- `storageType: StorageType` - 存储类型（PostgreSQL/MongoDB/Hybrid）
- `connectionConfig: ConnectionConfig` - 连接配置
- `retentionPolicy: RetentionPolicy` - 保留策略
- `compressionEnabled: boolean` - 是否启用压缩
- `encryptionEnabled: boolean` - 是否启用加密
- `backupConfig: BackupConfig` - 备份配置

**Relationships**:

- 存储 `DomainEvent` 事件
- 支持 `EventSnapshot` 快照
- 关联 `EventStoreException` 异常

**Validation Rules**:

- 存储类型必须有效
- 连接配置必须完整
- 保留策略必须合理

### EventBus (事件总线)

**Purpose**: 事件发布和订阅机制

**Attributes**:

- `busId: EntityId` - 总线唯一标识
- `deliveryGuarantee: DeliveryGuarantee` - 传递保证（at-least-once/exactly-once/at-most-once）
- `retryPolicy: RetryPolicy` - 重试策略
- `deadLetterQueue: DeadLetterQueue` - 死信队列配置
- `monitoringEnabled: boolean` - 是否启用监控
- `metricsConfig: MetricsConfig` - 指标配置

**Relationships**:

- 发布 `DomainEvent` 事件
- 关联 `EventHandler` 处理器
- 支持 `EventMiddleware` 中间件

**Validation Rules**:

- 传递保证策略必须有效
- 重试策略必须合理
- 监控配置必须完整

### CommandQueryBus (命令查询总线)

**Purpose**: 命令和查询的统一分发机制

**Attributes**:

- `busId: EntityId` - 总线唯一标识
- `commandHandlers: Map<string, CommandHandler>` - 命令处理器映射
- `queryHandlers: Map<string, QueryHandler>` - 查询处理器映射
- `middleware: BusMiddleware[]` - 中间件列表
- `timeoutConfig: TimeoutConfig` - 超时配置
- `circuitBreakerConfig: CircuitBreakerConfig` - 熔断器配置

**Relationships**:

- 分发 `Command` 命令
- 分发 `Query` 查询
- 关联 `CommandHandler` 和 `QueryHandler`
- 支持 `BusMiddleware` 中间件

**Validation Rules**:

- 处理器映射不能为空
- 超时配置必须合理
- 中间件必须按顺序执行

### Projector (事件投影器)

**Purpose**: 将领域事件投影为读模型

**Attributes**:

- `projectorId: EntityId` - 投影器唯一标识
- `projectorName: string` - 投影器名称
- `eventTypes: string[]` - 处理的事件类型
- `readModelType: string` - 读模型类型
- `projectionConfig: ProjectionConfig` - 投影配置
- `batchSize: number` - 批处理大小
- `enabled: boolean` - 是否启用

**Relationships**:

- 处理 `DomainEvent` 事件
- 更新 `ReadModel` 读模型
- 关联 `ProjectionException` 异常

**Validation Rules**:

- 投影器名称必须唯一
- 事件类型列表不能为空
- 批处理大小必须合理

### Saga (Saga模式)

**Purpose**: 协调跨聚合的长时间运行业务流程

**Attributes**:

- `sagaId: EntityId` - Saga唯一标识
- `sagaName: string` - Saga名称
- `sagaType: SagaType` - Saga类型
- `currentStep: number` - 当前步骤
- `totalSteps: number` - 总步骤数
- `state: SagaState` - Saga状态
- `compensationSteps: CompensationStep[]` - 补偿步骤
- `timeoutConfig: TimeoutConfig` - 超时配置

**Relationships**:

- 协调多个 `Command` 命令
- 关联 `SagaStep` 步骤
- 支持 `CompensationStep` 补偿
- 关联 `SagaException` 异常

**Validation Rules**:

- Saga名称必须唯一
- 步骤数量必须合理
- 补偿步骤必须完整定义

## Value Objects

### PaginationInfo (分页信息)

**Attributes**:

- `page: number` - 当前页码
- `pageSize: number` - 页大小
- `total: number` - 总记录数
- `totalPages: number` - 总页数
- `hasNext: boolean` - 是否有下一页
- `hasPrevious: boolean` - 是否有上一页

### SortingInfo (排序信息)

**Attributes**:

- `field: string` - 排序字段
- `direction: SortDirection` - 排序方向（ASC/DESC）
- `priority: number` - 排序优先级

### FilterInfo (过滤信息)

**Attributes**:

- `field: string` - 过滤字段
- `operator: FilterOperator` - 过滤操作符
- `value: unknown` - 过滤值
- `dataType: DataType` - 数据类型

### CommandResult (命令结果)

**Attributes**:

- `success: boolean` - 执行是否成功
- `data: unknown` - 结果数据
- `message: string` - 结果消息
- `errorCode: string` - 错误代码
- `events: DomainEvent[]` - 产生的事件
- `executionTime: number` - 执行时间
- `timestamp: Date` - 结果时间戳
- `metadata: Record<string, unknown>` - 元数据

### QueryResult (查询结果)

**Attributes**:

- `success: boolean` - 查询是否成功
- `data: unknown[]` - 查询数据
- `item: unknown` - 单个查询项
- `message: string` - 结果消息
- `errorCode: string` - 错误代码
- `pagination: PaginationInfo` - 分页信息
- `cacheInfo: CacheInfo` - 缓存信息
- `executionTime: number` - 执行时间
- `timestamp: Date` - 结果时间戳
- `metadata: Record<string, unknown>` - 元数据

## Configuration Entities

### ApplicationKernelConfig (应用层核心配置)

**Purpose**: 应用层核心模块的统一配置

**Attributes**:

- `eventStore: EventStoreConfig` - 事件存储配置
- `eventBus: EventBusConfig` - 事件总线配置
- `cache: CacheConfig` - 缓存配置
- `monitoring: MonitoringConfig` - 监控配置
- `performance: PerformanceConfig` - 性能配置
- `logging: LoggingConfig` - 日志配置

**Integration with @hl8/config**:

- 使用 `TypedConfigModule` 进行类型安全的配置管理
- 支持环境变量覆盖和配置文件加载
- 集成 `ConfigValidator` 进行配置验证
- 支持配置热重载和缓存

## Exception Hierarchy

### ApplicationException (应用层异常基类)

**Purpose**: 所有应用层异常的基类

**Attributes**:

- `message: string` - 异常消息
- `errorCode: string` - 错误代码
- `component: string` - 组件名称
- `operation: string` - 操作名称
- `context: Record<string, unknown>` - 异常上下文
- `cause: Error` - 原始异常
- `exceptionId: EntityId` - 异常ID
- `timestamp: Date` - 异常时间戳

**Integration with @hl8/logger**:

- 使用 `Logger` 进行结构化日志记录
- 支持错误上下文和关联ID追踪
- 集成 `LoggerErrorInterceptor` 进行自动错误日志记录

## State Transitions

### UseCase State Transitions

1. **Created** → **Validated** (输入验证通过)
2. **Validated** → **Executing** (开始执行业务逻辑)
3. **Executing** → **Completed** (执行成功)
4. **Executing** → **Failed** (执行失败)
5. **Failed** → **Retrying** (重试执行)
6. **Retrying** → **Completed** (重试成功)
7. **Retrying** → **Failed** (重试失败)

### Command State Transitions

1. **Created** → **Validated** (命令验证通过)
2. **Validated** → **Executing** (开始执行命令)
3. **Executing** → **Completed** (命令执行成功)
4. **Executing** → **Failed** (命令执行失败)
5. **Failed** → **Compensated** (执行补偿操作)

### Saga State Transitions

1. **Created** → **Running** (开始执行Saga)
2. **Running** → **StepExecuting** (执行当前步骤)
3. **StepExecuting** → **StepCompleted** (步骤执行成功)
4. **StepExecuting** → **StepFailed** (步骤执行失败)
5. **StepCompleted** → **Running** (继续下一步)
6. **StepFailed** → **Compensating** (开始补偿)
7. **Compensating** → **Compensated** (补偿完成)
8. **Compensating** → **Failed** (补偿失败)
9. **Running** → **Completed** (Saga完成)
10. **Compensated** → **Failed** (Saga失败)

## Testing Architecture

### 测试分层结构

**单元测试（就近原则）**:

- 位置：与源代码同目录，命名格式：`{被测试文件名}.spec.ts`
- 覆盖：所有公共API、核心业务逻辑、关键路径
- 要求：核心业务逻辑 ≥ 80%，关键路径 ≥ 90%，公共API 100%

**集成测试（集中管理）**:

- 位置：`test/integration/` 目录
- 覆盖：模块间集成、外部服务集成、数据库集成
- 组织：按模块组织（cqrs.integration.spec.ts, event-sourcing.integration.spec.ts）

**端到端测试（集中管理）**:

- 位置：`test/e2e/` 目录
- 覆盖：完整业务流程、性能测试、压力测试
- 组织：按功能组织（application-kernel.e2e.spec.ts, performance.e2e.spec.ts）

**契约测试（集中管理）**:

- 位置：`test/contract/` 目录
- 覆盖：API契约、领域契约、外部接口契约
- 组织：按契约类型组织（api.contract.spec.ts, domain.contract.spec.ts）

### 测试配置

**Jest配置**:

- 多配置模式支持不同测试类型
- 单元测试：`src/**/*.spec.ts`
- 集成测试：`test/integration/**/*.spec.ts`
- 端到端测试：`test/e2e/**/*.spec.ts`
- 契约测试：`test/contract/**/*.spec.ts`

**覆盖率要求**:

- 全局覆盖率：80% 分支、函数、行、语句
- 核心模块覆盖率：90% 关键路径
- 公共API覆盖率：100% 必须覆盖
- 按目录分组覆盖率报告

### 测试数据管理

**测试数据工厂**:

- 位置：`test/factories/` 目录
- 功能：生成测试数据、Mock对象、测试环境
- 模式：工厂模式、建造者模式

**Mock管理**:

- 位置：`test/mocks/` 目录
- 功能：外部依赖Mock、服务Mock、数据库Mock
- 类型：使用 `jest.Mocked<T>` 类型

**测试环境隔离**:

- 独立的测试数据库
- 独立的测试配置
- 每个测试后自动清理

## Data Integrity Rules

1. **唯一性约束**: 所有实体ID必须全局唯一
2. **引用完整性**: 外键引用必须指向有效实体
3. **版本控制**: 所有实体必须支持版本管理
4. **审计追踪**: 所有状态变更必须记录审计信息
5. **数据一致性**: 相关实体状态必须保持一致
6. **事务边界**: 聚合根内的操作必须在同一事务中
7. **事件顺序**: 事件必须按时间顺序存储和处理
8. **配置验证**: 所有配置必须通过验证才能生效
9. **测试覆盖**: 所有公共API必须有测试用例
10. **测试隔离**: 测试之间必须完全独立，无相互影响
