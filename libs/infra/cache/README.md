# @hl8/cache

统一缓存策略库 - 提供类型安全的缓存功能，支持 TTL、标签失效、模式匹配失效和跨层缓存协调。

## 特性

- ✅ **类型安全**: 完整的 TypeScript 支持和 TSDoc 注释
- ✅ **多种失效策略**: TTL、标签失效、模式匹配失效、事件驱动失效
- ✅ **三种淘汰策略**: LRU、FIFO、LFU
- ✅ **多租户支持**: 租户隔离的缓存键
- ✅ **性能监控**: 缓存统计信息（命中率、大小等）
- ✅ **跨层协调**: 应用层和基础设施层缓存协同工作
- ✅ **事件驱动**: 支持领域事件驱动的缓存失效
- ✅ **防穿透**: null 值缓存防止缓存穿透攻击
- ✅ **灵活配置**: 丰富的配置选项和统计功能

## 安装

```bash
pnpm add @hl8/cache
```

## 快速开始

### 1. 在 NestJS 模块中导入 CacheModule

```typescript
import { Module } from "@nestjs/common";
import { CacheModule, CacheConfig } from "@hl8/cache";
import { LoggerModule } from "@hl8/logger";

@Module({
  imports: [LoggerModule.forRoot(), CacheModule.forRoot(CacheConfig)],
})
export class AppModule {}
```

### 2. 在服务中注入缓存

```typescript
import { Injectable, Inject } from "@nestjs/common";
import { ICache } from "@hl8/cache";

@Injectable()
export class UserService {
  constructor(@Inject("CacheService") private readonly cache: ICache) {}

  async getUser(id: string): Promise<User | null> {
    const cacheKey = `repo:user:${id}`;

    // 先查缓存
    const cached = await this.cache.get<User>(cacheKey);
    if (cached !== undefined) {
      return cached;
    }

    // 查数据库
    const user = await this.userRepository.findById(id);

    // 缓存结果（包括 null 值）
    await this.cache.set(cacheKey, user, 3600000, ["entity:user"]);

    return user;
  }
}
```

### 3. 使用缓存键构建器

```typescript
import { CacheKeyBuilder } from "@hl8/cache";

const keyBuilder = new CacheKeyBuilder();

// 构建实体缓存键
const entityKey = keyBuilder.buildEntityKey("user", "123");
// 结果: 'repo:user:123'

// 多租户场景
const tenantKey = keyBuilder.buildEntityKey("user", "123", "tenant1");
// 结果: 'tenant1:repo:user:123'

// 构建查询缓存键
const queryKey = keyBuilder.buildQueryKey("GetUserProfile", { userId: "123" });
// 结果: 'query:GetUserProfile:dXNlcklkPTEyMw=='
```

### 4. 缓存失效

```typescript
// 删除单个缓存项
await cache.delete("repo:user:123");

// 批量删除
await cache.deleteMany(["key1", "key2", "key3"]);

// 通过标签失效
await cache.invalidateByTags(["entity:user"]);

// 通过模式匹配失效
await cache.invalidateByPattern("repo:user:*");

// 清空所有缓存
await cache.clear();
```

### 5. 缓存协调服务

```typescript
import { CacheCoordinationService } from "@hl8/cache";
import { Logger } from "@hl8/logger";

const coordinationService = new CacheCoordinationService(cache, logger);

// 实体更新时，自动失效相关缓存
await coordinationService.invalidateEntityUpdate("user", "123");

// 这会失效:
// - 基础设施层: repo:user:123
// - 应用层: 所有带有 entity:user 标签的查询缓存

// 实体删除时失效
await coordinationService.invalidateEntityDelete("user", "123");

// 批量更新
await coordinationService.invalidateBatchEntityUpdate("user", ["123", "456", "789"]);
```

## 高级功能

### 事件驱动缓存失效

```typescript
import { EventDrivenCacheInvalidation } from "@hl8/cache";
import { Logger } from "@hl8/logger";

const invalidation = new EventDrivenCacheInvalidation(cache, logger);

// 注册失效规则
invalidation.registerRule({
  id: "user-update-rule",
  eventType: "UserUpdatedEvent",
  keyGenerator: (event) => [`repo:user:${event.data.userId}`],
  tags: ["entity:user"],
  enabled: true,
  priority: 100,
  description: "用户更新时失效相关缓存",
});

// 处理事件
await invalidation.handleEvent({
  eventType: "UserUpdatedEvent",
  data: { userId: "123", name: "Alice" },
});

// 支持通配符事件类型
invalidation.registerRule({
  id: "user-all-events",
  eventType: "user.*",
  tags: ["entity:user"],
  enabled: true,
  priority: 50,
});

// 条件失效
invalidation.registerRule({
  id: "conditional-invalidation",
  eventType: "OrderCancelledEvent",
  condition: (event) => event.data.refundRequired === true,
  tags: ["entity:order", "entity:payment"],
  enabled: true,
  priority: 200,
});
```

### null 值缓存防穿透

```typescript
const config: CacheConfig = {
  defaultTtl: 3600000,
  maxSize: 10000,
  enableStats: true,
  enableEventInvalidation: true,
  cleanupInterval: 600000,
  evictionStrategy: "LRU",

  // 启用 null 值缓存防穿透
  enableNullValueCache: true,
  nullValueCacheTtl: 30000, // null 值缓存 30 秒
};

const cache = new InMemoryCache(config, logger);

// 查询不存在的用户
const user = await userRepository.findById("nonexistent");

if (user === null) {
  // 缓存 null 值，防止下次重复查询数据库
  await cache.set("repo:user:nonexistent", null, undefined, ["entity:user"]);
}

// 下次查询时，会直接返回 null，不会查询数据库
const cached = await cache.get("repo:user:nonexistent");
// 30 秒内返回 null
```

### 多租户支持

```typescript
const tenantId = 'tenant1';
const key = keyBuilder.buildEntityKey('user', '123', tenantId);
await cache.set(key, userData, 3600000, ['entity:user']);

// 失效特定租户的缓存
await cache.invalidateByPattern(`${tenantId}:repo:user:*`);

// 失效所有租户的某个实体类型缓存
await cache.invalidateByPattern('*:repo:user:*`);
await cache.invalidateByTags(['entity:user']);
```

### 缓存统计

```typescript
const stats = await cache.getStats();

console.log(`命中率: ${(stats.hitRate * 100).toFixed(2)}%`);
console.log(`当前大小: ${stats.currentSize}/${stats.maxSize}`);
console.log(`命中次数: ${stats.hits}`);
console.log(`未命中次数: ${stats.misses}`);
console.log(`设置次数: ${stats.sets}`);
console.log(`删除次数: ${stats.deletes}`);
console.log(`清理次数: ${stats.cleanups}`);

// 重置统计
await cache.resetStats();
```

### 元数据查询

```typescript
const metadata = await cache.getMetadata("repo:user:123");

if (metadata) {
  console.log("缓存键:", metadata.key);
  console.log("过期时间:", new Date(metadata.expiresAt));
  console.log("创建时间:", new Date(metadata.createdAt));
  console.log("最后访问:", new Date(metadata.lastAccessedAt));
  console.log("访问次数:", metadata.accessCount);
  console.log("标签:", metadata.tags);

  // 检查是否即将过期
  const timeUntilExpiry = metadata.expiresAt - Date.now();
  console.log(`距离过期还有: ${Math.round(timeUntilExpiry / 1000)} 秒`);
}
```

## 配置选项

| 选项                      | 类型                       | 默认值  | 说明                                      |
| ------------------------- | -------------------------- | ------- | ----------------------------------------- |
| `defaultTtl`              | `number`                   | -       | 默认过期时间（毫秒），0 表示不过期        |
| `maxSize`                 | `number`                   | -       | 最大缓存项数量，达到上限时按淘汰策略淘汰  |
| `enableStats`             | `boolean`                  | `true`  | 是否启用统计信息收集                      |
| `enableEventInvalidation` | `boolean`                  | `false` | 是否启用事件驱动的缓存失效                |
| `cleanupInterval`         | `number`                   | `60000` | 定期清理过期缓存项的间隔（毫秒）          |
| `evictionStrategy`        | `'LRU' \| 'FIFO' \| 'LFU'` | `'LRU'` | 缓存满时的淘汰策略                        |
| `enableNullValueCache`    | `boolean`                  | `false` | 是否启用 null 值缓存防穿透                |
| `nullValueCacheTtl`       | `number`                   | `30000` | null 值缓存的有效期（毫秒），建议 5-60 秒 |

### 淘汰策略说明

- **LRU (Least Recently Used)**: 淘汰最久未使用的项，适合大多数场景
- **FIFO (First In First Out)**: 淘汰最早添加的项，适合简单的缓存场景
- **LFU (Least Frequently Used)**: 淘汰访问频率最低的项，适合访问频率差异明显的场景

## 最佳实践

### 1. 合理设置 TTL

根据数据更新频率设置合适的过期时间：

```typescript
// 静态数据（用户信息）
await cache.set("user:123", userData, 3600000, ["entity:user"]); // 1小时

// 动态数据（订单列表）
await cache.set("orders:123", orders, 60000, ["entity:order"]); // 1分钟

// 频繁变化的数据（实时库存）
await cache.set("stock:123", stock, 10000, ["entity:stock"]); // 10秒
```

### 2. 使用标签批量失效

为相关缓存项添加标签，实现高效的批量失效：

```typescript
// 为用户相关的所有缓存添加标签
await cache.set("user:123", userData, 3600000, ["entity:user", "tenant:corp"]);
await cache.set("user:123:profile", profile, 3600000, ["entity:user", "entity:profile"]);

// 用户更新时，一次性失效所有相关缓存
await cache.invalidateByTags(["entity:user"]);
```

### 3. 启用 null 值缓存防穿透

对于查询不存在数据的高频操作，启用 null 值缓存：

```typescript
const config: CacheConfig = {
  // ...其他配置
  enableNullValueCache: true,
  nullValueCacheTtl: 30000, // 30秒
};

// 在查询服务中
const cacheKey = `repo:user:${id}`;
let user = await cache.get<User>(cacheKey);

if (user === undefined) {
  user = await userRepository.findById(id);
  // 缓存结果（包括 null）
  await cache.set(cacheKey, user, undefined, ["entity:user"]);
}

return user;
```

### 4. 使用模式匹配失效

对于复杂的内存布局，使用模式匹配：

```typescript
// 缓存键结构: query:GetUserOrders:{userId}:{page}
await cache.set("query:GetUserOrders:123:1", orders);
await cache.set("query:GetUserOrders:123:2", orders);

// 用户更新后，失效所有相关查询
await cache.invalidateByPattern("query:GetUserOrders:123:*");
```

### 5. 监控和优化

定期查看缓存统计，优化缓存策略：

```typescript
const stats = await cache.getStats();

if (stats.hitRate < 0.5) {
  console.warn("缓存命中率过低，考虑调整 TTL 或淘汰策略");
}

if (stats.currentSize === stats.maxSize) {
  console.warn("缓存已满，考虑增加 maxSize 或优化淘汰策略");
}

if (stats.misses / stats.hits > 0.2) {
  console.warn("未命中率较高，可能需要预热缓存");
}
```

### 6. 多租户隔离

多租户场景必须使用租户 ID 构建缓存键：

```typescript
const keyBuilder = new CacheKeyBuilder();
const tenantId = getTenantId();

// ✅ 正确：包含租户 ID
const key = keyBuilder.buildEntityKey("user", "123", tenantId);

// ❌ 错误：未包含租户 ID（可能导致数据泄露）
const key = "repo:user:123";

await cache.set(key, userData);
```

## 架构设计

### 分层缓存

```
┌─────────────────────────────────┐
│    Application Kernel            │
│  (业务查询缓存: query:*:*)        │
└──────────────┬──────────────────┘
               │ 跨层协调
┌──────────────▼──────────────────┐
│  Infrastructure Kernel           │
│  (实体缓存: repo:*:*)            │
└──────────────┬──────────────────┘
               │
┌──────────────▼──────────────────┐
│      @hl8/cache                  │
│  (统一缓存接口和实现)             │
└─────────────────────────────────┘
```

### 缓存键命名规范

```typescript
// 基础设施层 - 实体缓存
repo:{entityName}:{entityId}                  // repo:user:123
{tenantId}:repo:{entityName}:{entityId}      // tenant1:repo:user:123

// 应用层 - 查询缓存
query:{queryType}:{paramsHash}                // query:GetUserOrders:abc123
{tenantId}:query:{queryType}:{paramsHash}    // tenant1:query:GetUserOrders:abc123

// 标签命名
entity:{entityName}                           // entity:user
query:{queryType}                             // query:GetUserOrders
tenant:{tenantId}                             // tenant:corp
```

### 失效策略

```typescript
// 1. TTL 失效（自动）
await cache.set('key', value, 1000); // 1秒后自动过期

// 2. 手动删除
await cache.delete('repo:user:123');

// 3. 标签失效（批量）
await cache.invalidateByTags(['entity:user']);

// 4. 模式失效（灵活）
await cache.invalidateByPattern('repo:user:*');

// 5. 事件驱动失效（自动）
const handler = new EventDrivenCacheInvalidation(cache, logger);
await handler.registerRule({...});
await handler.handleEvent(event);
```

## 故障排除

### 缓存穿透

**现象**: 缓存命中率低，大量数据库查询

**解决方案**: 启用 null 值缓存

```typescript
const config: CacheConfig = {
  enableNullValueCache: true,
  nullValueCacheTtl: 30000,
};
```

### 缓存雪崩

**现象**: 大量缓存同时过期，导致数据库压力骤增

**解决方案**: 为 TTL 添加随机抖动

```typescript
const ttl = baseTtl + Math.random() * 60000; // ±1分钟随机
await cache.set(key, value, ttl);
```

### 内存占用过高

**现象**: 内存使用率持续增长

**解决方案**: 调整淘汰策略和 maxSize

```typescript
const config: CacheConfig = {
  maxSize: 5000, // 减少缓存大小
  evictionStrategy: "LFU", // 使用 LFU 淘汰不常用项
  defaultTtl: 1800000, // 缩短默认 TTL
};
```

### 缓存不一致

**现象**: 缓存数据与实际数据不同步

**解决方案**: 使用事件驱动失效确保一致性

```typescript
const invalidation = new EventDrivenCacheInvalidation(cache, logger);
await invalidation.registerRule({
  eventType: "UserUpdatedEvent",
  keyGenerator: (event) => [`repo:user:${event.data.userId}`],
  tags: ["entity:user"],
});
```

## API 参考

### ICache

核心缓存接口，提供所有缓存操作：

```typescript
interface ICache {
  // 获取缓存值
  get<T>(key: string): Promise<T | undefined>;

  // 设置缓存值
  set(key: string, value: unknown, ttl?: number, tags?: string[]): Promise<void>;

  // 删除单个缓存项
  delete(key: string): Promise<void>;

  // 批量删除
  deleteMany(keys: string[]): Promise<void>;

  // 通过标签失效
  invalidateByTags(tags: string[]): Promise<void>;

  // 通过模式失效
  invalidateByPattern(pattern: string): Promise<void>;

  // 清空所有缓存
  clear(): Promise<void>;

  // 获取统计信息
  getStats(): Promise<CacheStats>;

  // 获取元数据
  getMetadata(key: string): Promise<CacheItemMetadata | undefined>;

  // 重置统计
  resetStats(): Promise<void>;
}
```

### CacheKeyBuilder

缓存键构建工具：

```typescript
class CacheKeyBuilder {
  // 构建实体缓存键
  buildEntityKey(entityName: string, entityId: string, tenantId?: string): string;

  // 构建查询缓存键
  buildQueryKey(queryType: string, params: Record<string, unknown>, tenantId?: string): string;
}
```

### CacheCoordinationService

跨层缓存协调服务：

```typescript
class CacheCoordinationService {
  constructor(cache: ICache, logger: Logger);

  // 实体更新失效
  invalidateEntityUpdate(entityName: string, entityId: string, tenantId?: string): Promise<void>;

  // 实体删除失效
  invalidateEntityDelete(entityName: string, entityId: string, tenantId?: string): Promise<void>;

  // 批量更新失效
  invalidateBatchEntityUpdate(entityName: string, entityIds: string[], tenantId?: string): Promise<void>;
}
```

### EventDrivenCacheInvalidation

事件驱动失效处理器：

```typescript
class EventDrivenCacheInvalidation {
  constructor(cache: ICache, logger: Logger);

  // 注册失效规则
  registerRule(rule: CacheInvalidationRule): boolean;

  // 批量注册
  registerRules(rules: CacheInvalidationRule[]): void;

  // 处理事件
  handleEvent(event: GenericDomainEvent): Promise<InvalidationResult[]>;

  // 批量处理
  handleEvents(events: GenericDomainEvent[]): Promise<InvalidationResult[]>;

  // 获取统计
  getStats(): { totalRules: number; enabledRules: number; disabledRules: number };
}
```

### CacheConfig

缓存配置类：

```typescript
class CacheConfig {
  defaultTtl!: number;
  maxSize!: number;
  enableStats!: boolean;
  enableEventInvalidation!: boolean;
  cleanupInterval!: number;
  enableCompression?: boolean;
  enableNullValueCache?: boolean;
  nullValueCacheTtl?: number;
  evictionStrategy: "LRU" | "FIFO" | "LFU";
}
```

## 示例

查看完整的示例代码：

- [快速开始示例](./docs/quickstart.md)
- [仓储缓存示例](./docs/repository-cache-usage.md)
- [事件驱动失效示例](./docs/event-invalidation.md)
- [Application Kernel 集成示例](./docs/application-kernel-integration.md)

## License

MIT
