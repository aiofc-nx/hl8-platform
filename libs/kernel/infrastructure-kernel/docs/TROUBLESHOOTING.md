# 故障排除指南

**版本**: 1.0.0  
**更新日期**: 2024-12-19

本文档帮助您诊断和解决使用 `@hl8/infrastructure-kernel` 时遇到的常见问题。

---

## 📋 目录

1. [快速诊断](#快速诊断)
2. [常见错误](#常见错误)
3. [仓储问题](#仓储问题)
4. [事务问题](#事务问题)
5. [缓存问题](#缓存问题)
6. [事件存储问题](#事件存储问题)
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
- [ ] MikroORM 配置是否正确？
- [ ] 数据库连接是否正常？
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
Error: Cannot find module '@hl8/infrastructure-kernel'
```

**原因**: 依赖未正确安装或路径配置错误。

**解决方案**:

```bash
# 1. 确保使用 pnpm（推荐）
pnpm install

# 2. 检查 package.json 中的依赖
# 确保包含：
# "@hl8/infrastructure-kernel": "workspace:*"

# 3. 清理并重新安装
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

---

### 错误：数据库连接失败

**症状**:

```
ConnectionError: Unable to connect to database
```

**原因**: 数据库连接配置错误或数据库未启动。

**解决方案**:

1. **检查数据库配置**:

```typescript
// 确保 DatabaseModule 配置正确
DatabaseModule.forRoot({
  postgresql: {
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "5432"),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  },
});
```

2. **测试数据库连接**:

```bash
psql -h localhost -p 5432 -U postgres -d hl8_saas
```

3. **检查防火墙和网络**:

```bash
telnet localhost 5432
```

---

### 错误：实体未定义

**症状**:

```
Entity metadata not found for: ProductEntity
```

**原因**: 实体类未在 MikroORM 配置中注册。

**解决方案**:

```typescript
const orm = await MikroORM.init({
  entities: [
    // 确保注册所有实体
    BaseEntity,
    TenantIsolatedPersistenceEntity,
    EventEntity,
    EventSnapshotEntity,
    ProductEntity, // 你的实体
    OrderEntity, // 你的实体
  ],
});
```

---

## 仓储问题

### 问题：查询返回空结果

**症状**: 使用租户隔离仓储查询时，结果为空。

**原因**: 租户上下文未正确设置。

**解决方案**:

```typescript
// 错误示例
const documents = await repository.findAll(); // 缺少租户上下文

// 正确示例
const context = new TenantContext(tenantId, { organizationId, departmentId });
const documents = await repository.findAllByContext(context);
```

---

### 问题：跨租户数据泄露

**症状**: 查询返回了其他租户的数据。

**原因**: 使用了不带租户过滤的查询方法。

**解决方案**:

```typescript
// 危险：不使用租户上下文
const allDocs = await repository.findAll();

// 安全：使用租户上下文
const tenantDocs = await repository.findAllByContext(tenantContext);
```

**最佳实践**: 始终使用带 `Context` 的查询方法。

---

### 问题：乐观锁冲突

**症状**:

```
AggregateVersionConflictException: Version conflict
```

**原因**: 并发更新导致版本冲突。

**解决方案**:

```typescript
async updateProduct(id: string, data: Partial<Product>): Promise<Product> {
  let retries = 0;
  const maxRetries = 3;

  while (retries < maxRetries) {
    try {
      // 1. 重新加载最新版本
      const product = await repository.findById(new EntityId(id));
      if (!product) {
        throw new EntityNotFoundException("Product not found");
      }

      // 2. 应用更新
      Object.assign(product, data);

      // 3. 保存（自动递增版本号）
      await repository.save(product);
      return product;

    } catch (error) {
      if (error instanceof AggregateVersionConflictException && retries < maxRetries - 1) {
        retries++;
        await new Promise(resolve => setTimeout(resolve, 100 * retries)); // 退避重试
        continue;
      }
      throw error;
    }
  }
}
```

---

## 事务问题

### 问题：事务未提交

**症状**: 数据保存后立即查询为空。

**原因**: 忘记调用 `flush()` 或 `commit()`。

**解决方案**:

```typescript
// 错误示例
await this.transactionManager.runInTransaction(async (em) => {
  em.persist(entity);
  // 缺少 em.flush()
});

// 正确示例
await this.transactionManager.runInTransaction(async (em) => {
  em.persist(entity);
  await em.flush(); // 必须调用 flush
});
```

---

### 问题：嵌套事务回滚

**症状**: 外层事务回滚时内层事务也回滚。

**原因**: 这是正常行为，嵌套事务会共享同一个数据库事务。

**解决方案**: 了解嵌套事务的行为：

```typescript
// 如果内层事务失败，整个事务会回滚
await transactionManager.runInTransaction(async (em) => {
  em.persist(entity1);

  await transactionManager.runInTransaction(async (innerEm) => {
    em.persist(entity2);
    // 如果这里抛出异常，entity1 也会回滚
    throw new Error("Inner transaction failed");
  });
});
```

---

### 问题：事务超时

**症状**:

```
TransactionTimeoutException: Transaction timeout
```

**原因**: 事务执行时间超过配置的超时时间。

**解决方案**:

1. **增加超时时间**:

```typescript
const context = await this.transactionManager.begin({
  timeout: 60000, // 60 秒
});
```

2. **优化查询性能**:

```typescript
// 使用索引优化慢查询
@Entity({ tableName: "products" })
class ProductEntity extends BaseEntity {
  @Index() // 添加索引
  @Property()
  sku!: string;
}
```

---

## 缓存问题

### 问题：缓存未命中

**症状**: 每次查询都访问数据库。

**原因**:

1. 缓存已过期
2. 缓存 TTL 配置过短
3. 缓存存储空间已满

**解决方案**:

```typescript
// 调整缓存配置
const cacheConfig: CacheConfig = {
  defaultTtl: 3600000, // 增加到 1 小时
  maxSize: 100000, // 增加缓存大小
  enableStats: true,
};

// 监控缓存统计
const stats = await cache.getStats();
console.log(`命中率: ${(stats.hitRate * 100).toFixed(2)}%`);
```

---

### 问题：缓存数据过期

**症状**: 缓存返回过期数据。

**原因**: 缓存失效未正确触发。

**解决方案**:

```typescript
// 确保在更新时失效缓存
await cachedRepo.save(entity); // 自动失效

// 或手动失效
const invalidationService = new CacheInvalidationService(cache, tenantContext);
await invalidationService.invalidateEntity("Product");
```

---

### 问题：缓存键冲突

**症状**: 不同租户的数据互相覆盖。

**原因**: 缓存键未包含租户信息。

**解决方案**:

```typescript
// CachedRepository 会自动添加租户信息到缓存键
const tenantContext: TenantContextProvider = {
  getTenantId: () => tenantId, // 确保提供租户 ID
};

const cachedRepo = createCachedRepository(repo, "Product", { cache, tenantContext, logger });
```

---

## 事件存储问题

### 问题：事件保存失败

**症状**:

```
EventStoreException: Failed to save events
```

**原因**: 乐观并发控制冲突或数据库错误。

**解决方案**:

```typescript
// 1. 检查期望版本号
const currentVersion = await eventStore.getCurrentVersion(aggregateId);
const result = await eventStore.saveEvents(
  aggregateId,
  events,
  currentVersion, // 使用当前版本号
);

if (!result.success) {
  // 重新加载聚合并重试
  const aggregate = await rebuildAggregate(aggregateId);
  // ... 应用新的变更
}
```

---

### 问题：事件重放缓慢

**症状**: 重建聚合根花费很长时间。

**原因**: 事件数量过多。

**解决方案**:

```typescript
// 使用快照优化
async rebuildAggregate(id: EntityId): Promise<Aggregate> {
  // 1. 尝试获取快照
  const snapshot = await eventStore.getSnapshot(id);
  let aggregate: Aggregate;
  let fromVersion = 0;

  if (snapshot) {
    aggregate = Aggregate.fromSnapshot(snapshot);
    fromVersion = snapshot.version + 1;
  } else {
    aggregate = new Aggregate(id);
  }

  // 2. 只重放快照之后的事件
  const events = await eventStore.getEvents(id, fromVersion);
  for (const event of events) {
    aggregate.applyEvent(event);
  }

  return aggregate;
}
```

---

## 配置问题

### 问题：MikroORM 配置错误

**症状**:

```
ConfigException: Invalid ORM configuration
```

**原因**: 配置文件格式错误或缺少必需字段。

**解决方案**:

```typescript
// 使用环境变量配置
const orm = await MikroORM.init({
  driver: PostgreSqlDriver,
  dbName: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || "5432"),
  entities: ["./dist/**/*.entity.js"], // 确保路径正确
  debug: process.env.NODE_ENV === "development",
});
```

---

## 性能问题

### 问题：N+1 查询

**症状**: 查询变慢，数据库负载高。

**原因**: 循环中查询数据库。

**解决方案**:

```typescript
// 错误示例
const orders = await repository.findAll();
for (const order of orders) {
  // N+1 查询问题
  const items = await orderItemRepository.findByOrderId(order.id);
}

// 正确示例
const orders = await repository.findAll();
const orderIds = orders.map((o) => o.id);
// 一次查询获取所有数据
const items = await orderItemRepository.findByOrderIds(orderIds);
```

---

### 问题：内存泄漏

**症状**: 应用内存持续增长。

**原因**: 缓存未及时清理或事件监听器未移除。

**解决方案**:

```typescript
// 定期清理缓存
const cleanupInterval = setInterval(async () => {
  const stats = await cache.getStats();
  if (stats.currentSize > 80000) {
    await cache.clear(); // 或实现更智能的清理策略
  }
}, 3600000); // 每小时检查一次

// 应用关闭时清理
process.on("SIGTERM", () => {
  clearInterval(cleanupInterval);
  cache.destroy();
});
```

---

## 集成问题

### 问题：依赖注入失败

**症状**:

```
NullInjectorError: No provider for IRepositoryFactory
```

**原因**: 未正确注册模块。

**解决方案**:

```typescript
// 确保导入 InfrastructureKernelModule
@Module({
  imports: [
    InfrastructureKernelModule.forRoot(),
  ],
  providers: [...],
})
export class AppModule {}
```

---

### 问题：类型不匹配

**症状**:

```
Type mismatch: expected IRepository, got MikroORMRepository
```

**原因**: 使用了具体实现类而非接口。

**解决方案**:

```typescript
// 错误示例
constructor(
  private readonly repository: MikroORMRepository<ProductEntity>
) {}

// 正确示例
constructor(
  private readonly repository: IRepository<ProductEntity>
) {}
```

---

## 调试技巧

### 1. 启用 SQL 日志

```typescript
const orm = await MikroORM.init({
  // ...其他配置
  debug: true, // 输出 SQL 日志
  logger: (message) => console.log(message),
});
```

---

### 2. 使用事务日志

```typescript
await transactionManager.runInTransaction(async (em) => {
  console.log("Transaction started");
  try {
    // ...操作
    console.log("Transaction committed");
  } catch (error) {
    console.log("Transaction rolled back", error);
    throw error;
  }
});
```

---

### 3. 监控缓存性能

```typescript
setInterval(async () => {
  const stats = await cache.getStats();
  console.log({
    hitRate: `${(stats.hitRate * 100).toFixed(2)}%`,
    size: `${stats.currentSize}/${stats.maxSize}`,
    hits: stats.hits,
    misses: stats.misses,
  });
}, 60000); // 每分钟输出一次
```

---

## 获取帮助

如果以上解决方案无法解决您的问题，请：

1. **检查日志**: 查看详细错误堆栈
2. **查看文档**: 参考 [快速入门指南](./QUICKSTART.md)
3. **提交 Issue**: [GitHub Issues](https://github.com/your-org/hl8-platform/issues)
4. **社区讨论**: [GitHub Discussions](https://github.com/your-org/hl8-platform/discussions)
