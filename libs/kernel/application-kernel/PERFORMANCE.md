# 性能调优指南

**版本**: 1.0.0  
**更新日期**: 2024-12-19

本文档提供 `@hl8/application-kernel` 的性能调优指南，帮助您优化应用性能，达到性能目标。

---

## 📋 目录

1. [性能目标](#性能目标)
2. [性能监控](#性能监控)
3. [用例性能优化](#用例性能优化)
4. [命令和查询优化](#命令和查询优化)
5. [事件处理优化](#事件处理优化)
6. [缓存策略](#缓存策略)
7. [数据库优化](#数据库优化)
8. [并发处理](#并发处理)
9. [内存管理](#内存管理)
10. [最佳实践](#最佳实践)

---

## 性能目标

根据规格要求，系统应达到以下性能目标：

### 核心指标

| 指标            | 目标值     | 说明                           |
| --------------- | ---------- | ------------------------------ |
| 并发用例执行    | ≥ 1000     | 支持至少 1000 个并发用例       |
| 命令执行成功率  | ≥ 99.9%    | 命令执行的成功率               |
| 查询响应延迟    | ≤ 100ms    | 查询平均响应时间               |
| 事件存储容量    | ≥ 100万条  | 支持至少 100 万条事件          |
| 事件重放性能    | 提升 ≥ 50% | 通过快照机制提升               |
| 事件总线延迟    | ≤ 50ms     | 消息处理延迟                   |
| 总线并发请求    | ≥ 10000    | 支持至少 10000 个并发请求      |
| 投影器处理延迟  | ≤ 20ms     | 处理单个事件的延迟             |
| Saga 步骤成功率 | ≥ 99.5%    | Saga 步骤执行成功率            |
| Saga 类型支持   | ≥ 100个    | 支持至少 100 种不同类型的 Saga |

---

## 性能监控

### 启用性能监控

```typescript
import { MonitoringService } from "@hl8/application-kernel";

// 配置监控服务
const monitoring = new MonitoringService(
  {
    enabled: true,
    collectionInterval: 1000, // 1秒收集一次
    alertCheckInterval: 5000, // 5秒检查一次警报
    dataRetentionTime: 24 * 60 * 60 * 1000, // 保留24小时
  },
  logger,
);

// 启动监控
await monitoring.start();
```

### 监控指标

```typescript
// 获取性能指标
const metrics = await monitoring.getMetrics();

metrics.forEach((metric) => {
  console.log(`${metric.name}: ${metric.value}`, {
    type: metric.type,
    labels: metric.labels,
    timestamp: metric.timestamp,
  });
});

// 获取警报
const alerts = await monitoring.getAlerts();
alerts.forEach((alert) => {
  console.warn("性能警报:", {
    metric: alert.metricName,
    threshold: alert.threshold,
    current: alert.currentValue,
    severity: alert.severity,
  });
});
```

### 自定义指标

```typescript
import { PerformanceMetric, PerformanceMetricType } from "@hl8/application-kernel";

// 创建自定义指标
const responseTimeMetric = new PerformanceMetric({
  name: "api_response_time",
  type: PerformanceMetricType.HISTOGRAM,
  description: "API响应时间",
  labels: ["endpoint", "method"],
  buckets: [10, 50, 100, 200, 500, 1000], // 毫秒
});

// 记录指标
responseTimeMetric.record(150, {
  endpoint: "/users",
  method: "GET",
});
```

---

## 用例性能优化

### 优化输入验证

```typescript
class OptimizedInput extends UseCaseInput {
  // ✅ 使用简单的验证规则
  @IsNotEmpty()
  @IsString()
  @MaxLength(100) // 限制长度，避免过大的输入
  public readonly field!: string;
}

// ❌ 避免复杂的验证逻辑
class SlowInput extends UseCaseInput {
  // 复杂验证会降低性能
  @CustomValidator({ complex: true })
  public readonly field!: string;
}
```

### 批量处理

```typescript
class BatchCreateUsersUseCase extends UseCase<BatchInput, BatchOutput> {
  protected async executeBusinessLogic(input: BatchInput): Promise<BatchOutput> {
    // ✅ 批量处理，而不是逐个处理
    const users = await Promise.all(input.users.map((userData) => this.createUser(userData)));

    // ✅ 批量保存
    await this.userRepository.saveMany(users);

    return new BatchOutput({ count: users.length });
  }
}
```

### 异步处理

```typescript
class AsyncUseCase extends UseCase<Input, Output> {
  protected async executeBusinessLogic(input: Input): Promise<Output> {
    // ✅ 使用异步处理非关键操作
    const result = await this.doCriticalWork(input);

    // ✅ 非关键操作异步执行，不阻塞响应
    setImmediate(async () => {
      await this.sendNotification(result);
      await this.updateAnalytics(result);
    });

    return result;
  }
}
```

---

## 命令和查询优化

### 命令优化

```typescript
// ✅ 1. 使用命令去重
class IdempotentCommand extends BaseCommand {
  public readonly idempotencyKey!: string; // 使用幂等键

  async execute() {
    // 检查是否已执行
    if (await this.isAlreadyExecuted(this.idempotencyKey)) {
      return CommandResult.success({ cached: true });
    }

    // 执行命令
    const result = await this.doWork();

    // 标记为已执行
    await this.markAsExecuted(this.idempotencyKey, result);

    return CommandResult.success(result);
  }
}

// ✅ 2. 批量执行命令
async function executeBatch(commands: BaseCommand[]) {
  // 并行执行独立的命令
  const results = await Promise.all(commands.map((cmd) => commandBus.executeCommand(cmd)));
  return results;
}
```

### 查询优化

```typescript
// ✅ 1. 使用缓存
class CachedQueryHandler extends BaseQueryHandler<GetUserQuery> {
  async handle(query: GetUserQuery): Promise<QueryResult> {
    const cacheKey = `user:${query.userId}`;

    // 检查缓存
    const cached = await this.cache.get<UserDto>(cacheKey);
    if (cached) {
      return QueryResult.success(cached);
    }

    // 查询数据库
    const user = await this.repository.findById(query.userId);

    // 缓存结果
    await this.cache.set(cacheKey, user, 3600); // 1小时

    return QueryResult.success(user);
  }
}

// ✅ 2. 使用分页
class PaginatedQuery extends BaseQuery {
  public readonly pagination = {
    page: 1,
    limit: 20, // ✅ 限制每页数量
  };
}

// ✅ 3. 限制返回字段
class OptimizedQueryHandler extends BaseQueryHandler<GetUserQuery> {
  async handle(query: GetUserQuery): Promise<QueryResult> {
    // ✅ 只查询需要的字段
    const user = await this.repository.findById(query.userId, {
      fields: ["id", "email", "name"], // 只返回必要字段
    });

    return QueryResult.success(user);
  }
}
```

---

## 事件处理优化

### 事件存储优化

```typescript
// ✅ 1. 使用快照
async function optimizeEventReplay(aggregateId: string): Promise<Aggregate> {
  // 先尝试获取快照
  const snapshot = await eventStore.getSnapshot(aggregateId);

  if (snapshot) {
    // ✅ 从快照恢复，只重放之后的事件
    const aggregate = restoreFromSnapshot(snapshot);
    const events = await eventStore.getEvents(aggregateId, snapshot.version + 1);
    events.forEach((e) => aggregate.applyDomainEvent(e));
    return aggregate;
  }

  // 如果没有快照，重放所有事件
  const allEvents = await eventStore.getEvents(aggregateId);
  // ...
}

// ✅ 2. 批量保存事件
async function saveEventsBatch(events: DomainEvent[]): Promise<void> {
  // ✅ 批量保存，减少数据库交互
  await eventStore.saveEventsBatch(events);
}

// ✅ 3. 异步保存非关键事件
async function publishEvents(events: DomainEvent[]): Promise<void> {
  const critical = events.filter((e) => e.isCritical());
  const nonCritical = events.filter((e) => !e.isCritical());

  // ✅ 关键事件同步保存
  await eventStore.saveEvents(critical);

  // ✅ 非关键事件异步保存
  setImmediate(async () => {
    await eventStore.saveEvents(nonCritical);
  });
}
```

### 事件总线优化

```typescript
// ✅ 1. 配置并发处理
ApplicationKernelModule.forRoot({
  eventBus: {
    maxConcurrency: 20, // ✅ 增加并发数
    processingTimeout: 30000,
  },
});

// ✅ 2. 批量发布事件
await eventBus.publishMany(events); // 批量处理

// ✅ 3. 使用事件路由
@OnEvent(UserCreatedEvent)
async handle(event: UserCreatedEvent) {
  // ✅ 快速处理，将耗时操作异步化
  const userId = event.aggregateId.toString();

  // 快速响应
  await this.updateCache(userId);

  // 耗时操作异步处理
  setImmediate(async () => {
    await this.sendWelcomeEmail(userId);
    await this.updateAnalytics(userId);
  });
}
```

---

## 缓存策略

### 缓存配置

```typescript
// ✅ 1. 配置合理的 TTL
ApplicationKernelModule.forRoot({
  cache: {
    type: "memory",
    ttl: {
      default: 3600, // 1小时
      users: 7200, // 用户数据 2小时
      queries: 300, // 查询结果 5分钟
    },
  },
});

// ✅ 2. 使用事件驱动失效
const cache = new InMemoryCache({
  enableEventInvalidation: true, // ✅ 启用事件驱动失效
  defaultTtl: 3600,
}, logger);

// 当用户更新时，自动失效相关缓存
@OnEvent(UserUpdatedEvent)
async handle(event: UserUpdatedEvent) {
  // 缓存会自动失效 `user:${event.userId}` 相关的缓存
  await this.cache.delete(`user:${event.userId}`);
}
```

### 缓存模式

```typescript
// ✅ 1. Cache-Aside 模式
async function getUser(userId: string): Promise<User> {
  // 检查缓存
  const cached = await cache.get<User>(`user:${userId}`);
  if (cached) {
    return cached;
  }

  // 查询数据库
  const user = await repository.findById(userId);

  // 写入缓存
  await cache.set(`user:${userId}`, user, 3600);

  return user;
}

// ✅ 2. Write-Through 模式
async function updateUser(userId: string, data: Partial<User>): Promise<void> {
  // 更新数据库
  await repository.update(userId, data);

  // 更新缓存
  const updated = await repository.findById(userId);
  await cache.set(`user:${userId}`, updated, 3600);
}

// ✅ 3. Write-Behind 模式（异步写入）
async function createUser(data: CreateUserData): Promise<User> {
  const user = await repository.create(data);

  // ✅ 异步更新缓存，不阻塞响应
  setImmediate(async () => {
    await cache.set(`user:${user.id}`, user, 3600);
  });

  return user;
}
```

---

## 数据库优化

### 查询优化

```typescript
// ✅ 1. 使用索引
// 确保数据库表有适当的索引
// CREATE INDEX idx_user_email ON users(email);
// CREATE INDEX idx_event_aggregate_id ON events(aggregate_id, version);

// ✅ 2. 限制查询结果
class OptimizedQuery extends BaseQuery {
  public readonly pagination = {
    page: 1,
    limit: 20, // ✅ 限制每页数量
  };
}

// ✅ 3. 使用投影（只查询需要的字段）
const users = await repository.findMany({
  fields: ["id", "email", "name"], // ✅ 只查询必要字段
  limit: 20,
});

// ✅ 4. 避免 N+1 查询
// ❌ 低效
for (const userId of userIds) {
  const user = await repository.findById(userId); // N+1 查询
}

// ✅ 高效
const users = await repository.findByIds(userIds); // 批量查询
```

### 连接池配置

```typescript
// ✅ 配置数据库连接池
const dbConfig = {
  pool: {
    min: 2, // ✅ 最小连接数
    max: 10, // ✅ 最大连接数
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  },
};
```

---

## 并发处理

### 并发控制

```typescript
// ✅ 1. 使用信号量控制并发
import { Semaphore } from "async-sema";

const semaphore = new Semaphore(10); // 最多10个并发

async function processWithLimit(items: unknown[]) {
  await Promise.all(
    items.map(async (item) => {
      await semaphore.acquire();
      try {
        await processItem(item);
      } finally {
        semaphore.release();
      }
    }),
  );
}

// ✅ 2. 使用队列
import { Queue } from "bull";

const queue = new Queue("tasks", {
  redis: { port: 6379, host: "localhost" },
  limiter: {
    max: 100, // ✅ 每秒最多100个任务
    duration: 1000,
  },
});
```

### Saga 并发优化

```typescript
// ✅ 配置 Saga 并发处理
const saga = new OrderProcessingSaga(logger, {
  name: "OrderProcessing",
  performance: {
    maxConcurrency: 10, // ✅ 最大并发数
    batchSize: 20, // ✅ 批处理大小
  },
});
```

---

## 内存管理

### 内存优化

```typescript
// ✅ 1. 及时清理缓存
const cache = new InMemoryCache(
  {
    maxSize: 10000, // ✅ 限制缓存大小
    cleanupInterval: 60000, // ✅ 每分钟清理一次
  },
  logger,
);

// ✅ 2. 限制事件存储
// 定期归档旧事件
async function archiveOldEvents() {
  const cutoffDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000); // 90天前
  await eventStore.archiveEvents(cutoffDate);
}

// ✅ 3. 流式处理大结果集
async function* streamUsers(): AsyncGenerator<User> {
  let offset = 0;
  const limit = 100;

  while (true) {
    const users = await repository.findMany({ offset, limit });
    if (users.length === 0) break;

    for (const user of users) {
      yield user;
    }

    offset += limit;
  }
}
```

---

## 最佳实践

### 1. 性能测试

```typescript
// ✅ 定期进行性能测试
describe("性能测试", () => {
  it("应该支持1000个并发用例", async () => {
    const startTime = Date.now();
    const promises = Array.from({ length: 1000 }, (_, i) => useCase.execute(new Input({ id: i.toString() })));

    await Promise.all(promises);
    const duration = Date.now() - startTime;

    expect(duration).toBeLessThan(10000); // 应该在10秒内完成
  });
});
```

### 2. 性能监控仪表板

```typescript
// ✅ 创建性能监控端点
@Controller("/metrics")
export class MetricsController {
  constructor(private readonly monitoring: MonitoringService) {}

  @Get()
  async getMetrics() {
    const metrics = await this.monitoring.getMetrics();
    return {
      metrics: metrics.map((m) => ({
        name: m.name,
        value: m.value,
        type: m.type,
        timestamp: m.timestamp,
      })),
    };
  }
}
```

### 3. 性能基准测试

```typescript
// ✅ 建立性能基准
const benchmarks = {
  useCaseExecution: 100, // 用例执行应该在100ms内
  queryResponse: 50, // 查询响应应该在50ms内
  eventProcessing: 20, // 事件处理应该在20ms内
};

// 定期检查性能是否达标
async function checkPerformance() {
  const metrics = await monitoring.getMetrics();

  metrics.forEach((metric) => {
    const benchmark = benchmarks[metric.name];
    if (benchmark && metric.value > benchmark) {
      console.warn(`性能警告: ${metric.name} = ${metric.value}ms (目标: ${benchmark}ms)`);
    }
  });
}
```

### 4. 代码优化技巧

```typescript
// ✅ 1. 避免不必要的序列化
// ❌ 低效：多次序列化
const json1 = JSON.stringify(data);
const json2 = JSON.stringify(data);

// ✅ 高效：缓存序列化结果
const json = JSON.stringify(data);

// ✅ 2. 使用对象池（对于频繁创建的对象）
class ObjectPool<T> {
  private pool: T[] = [];

  acquire(): T {
    return this.pool.pop() || this.create();
  }

  release(obj: T): void {
    this.pool.push(obj);
  }
}

// ✅ 3. 使用批量操作
// ❌ 低效：逐个操作
for (const item of items) {
  await repository.save(item);
}

// ✅ 高效：批量操作
await repository.saveMany(items);
```

---

## 性能调优检查清单

### 开发阶段

- [ ] 启用性能监控
- [ ] 设置性能指标和警报
- [ ] 进行性能基准测试
- [ ] 优化数据库查询
- [ ] 实现缓存策略
- [ ] 优化事件处理
- [ ] 配置合理的并发数

### 部署阶段

- [ ] 监控生产环境性能
- [ ] 设置性能警报阈值
- [ ] 定期检查性能指标
- [ ] 优化缓存策略
- [ ] 调整连接池大小
- [ ] 配置事件归档策略

### 维护阶段

- [ ] 定期检查性能指标
- [ ] 分析性能瓶颈
- [ ] 优化慢查询
- [ ] 清理过期数据
- [ ] 更新缓存策略
- [ ] 优化数据库索引

---

## 性能问题诊断

### 性能问题诊断步骤

1. **识别瓶颈**:

```typescript
// ✅ 使用性能分析工具
const startTime = Date.now();
await expensiveOperation();
const duration = Date.now() - startTime;

if (duration > threshold) {
  console.warn("性能警告:", {
    operation: "expensiveOperation",
    duration,
    threshold,
  });
}
```

2. **分析原因**:
   - 检查数据库查询是否优化
   - 检查是否有 N+1 查询问题
   - 检查缓存命中率
   - 检查事件处理延迟

3. **应用优化**:
   - 添加缓存
   - 优化查询
   - 批量处理
   - 异步处理

4. **验证改进**:
   - 对比优化前后的性能指标
   - 确保达到性能目标

---

## 性能指标参考

### 推荐配置

```typescript
const recommendedConfig = {
  // 事件总线
  eventBus: {
    maxConcurrency: 20, // 根据服务器资源调整
    processingTimeout: 30000,
  },

  // 缓存
  cache: {
    defaultTtl: 3600, // 1小时
    maxSize: 100000, // 根据内存调整
  },

  // 数据库连接池
  database: {
    pool: {
      min: 5,
      max: 20, // 根据数据库服务器调整
    },
  },

  // Saga
  saga: {
    maxConcurrency: 10,
    batchSize: 20,
  },
};
```

---

## 总结

性能调优是一个持续的过程，需要：

1. ✅ **持续监控**: 定期检查性能指标
2. ✅ **识别瓶颈**: 找出性能问题所在
3. ✅ **优化策略**: 应用合适的优化技术
4. ✅ **验证改进**: 确保优化有效果
5. ✅ **文档记录**: 记录优化过程和结果

遵循本指南的建议，可以显著提升应用性能，达到性能目标。

---

**提示**: 更多性能相关的问题，请参考 [故障排除指南](./TROUBLESHOOTING.md) 的性能问题部分。
