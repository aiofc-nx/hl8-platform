# 快速开始指南

本文档提供 @hl8/cache 的快速入门示例。

## 基本使用

### 1. 基础缓存操作

```typescript
import { InMemoryCache } from "@hl8/cache";
import { CacheConfig } from "@hl8/cache";
import { Logger } from "@hl8/logger";

// 配置缓存
const config: CacheConfig = {
  defaultTtl: 3600000, // 默认 1 小时
  maxSize: 1000, // 最大 1000 项
  enableStats: true, // 启用统计
  enableEventInvalidation: false,
  cleanupInterval: 60000, // 每分钟清理
  evictionStrategy: "LRU", // LRU 淘汰策略
};

const logger = new Logger("CacheDemo");
const cache = new InMemoryCache(config, logger);

// 设置缓存
await cache.set("key1", { name: "Alice", age: 30 });
await cache.set("key2", { name: "Bob", age: 25 }, 5000); // 5秒过期
await cache.set("key3", "value3", undefined, ["tag1", "tag2"]);

// 获取缓存
const value1 = await cache.get("key1");
console.log(value1); // { name: 'Alice', age: 30 }

// 获取不存在或已过期的值
const value2 = await cache.get("nonexistent");
console.log(value2); // undefined

// 删除缓存
await cache.delete("key1");

// 批量删除
await cache.deleteMany(["key2", "key3"]);

// 清空所有缓存
await cache.clear();

// 清理资源
cache.destroy();
```

### 2. 使用 NestJS 模块

```typescript
import { Module } from "@nestjs/common";
import { CacheModule, CacheConfig } from "@hl8/cache";
import { LoggerModule, Logger } from "@hl8/logger";

@Module({
  imports: [LoggerModule.forRoot(), CacheModule.forRoot(CacheConfig)],
})
export class AppModule {}

// 在服务中使用
import { Injectable, Inject } from "@nestjs/common";
import { ICache } from "@hl8/cache";

@Injectable()
export class CacheDemoService {
  constructor(@Inject("CacheService") private readonly cache: ICache) {}

  async demo() {
    await this.cache.set("demo", { data: "test" });
    const result = await this.cache.get("demo");
    console.log(result);
  }
}
```

### 3. 使用缓存键构建器

```typescript
import { CacheKeyBuilder } from "@hl8/cache";

const keyBuilder = new CacheKeyBuilder();

// 构建实体缓存键
const userKey = keyBuilder.buildEntityKey("user", "123");
// 'repo:user:123'

const orderKey = keyBuilder.buildEntityKey("order", "456", "tenant1");
// 'tenant1:repo:order:456'

// 构建查询缓存键
const queryParams = { userId: "123", page: 1, pageSize: 20 };
const queryKey = keyBuilder.buildQueryKey("GetUserOrders", queryParams);
// 'query:GetUserOrders:base64_encoded_params'
```

## 进阶使用

### 1. TTL 和过期管理

```typescript
// 设置不过期的缓存
await cache.set("static-data", data, 0);

// 设置短期缓存
await cache.set("temporary", data, 5000); // 5秒

// 设置长期缓存
await cache.set("long-term", data, 86400000); // 24小时

// 检查元数据
const metadata = await cache.getMetadata("static-data");
if (metadata) {
  console.log(`过期时间: ${new Date(metadata.expiresAt)}`);
  console.log(`访问次数: ${metadata.accessCount}`);
}
```

### 2. 标签失效

```typescript
// 设置带标签的缓存
await cache.set("user:123", userData, 3600000, ["entity:user"]);
await cache.set("user:123:profile", profile, 3600000, ["entity:user", "entity:profile"]);
await cache.set("user:456", userData2, 3600000, ["entity:user"]);

// 失效所有用户实体缓存
await cache.invalidateByTags(["entity:user"]);

// 验证失效
const result1 = await cache.get("user:123"); // undefined
const result2 = await cache.get("user:456"); // undefined
const result3 = await cache.get("user:123:profile"); // undefined
```

### 3. 模式匹配失效

```typescript
// 设置多个相关缓存
await cache.set("repo:user:1", user1);
await cache.set("repo:user:2", user2);
await cache.set("repo:order:100", order);

// 失效所有用户实体缓存
await cache.invalidateByPattern("repo:user:*");

// 验证
console.log(await cache.get("repo:user:1")); // undefined
console.log(await cache.get("repo:user:2")); // undefined
console.log(await cache.get("repo:order:100")); // 仍有值
```

### 4. 缓存统计

```typescript
// 执行一些操作
await cache.set("key1", "value1");
await cache.set("key2", "value2");
await cache.get("key1");
await cache.get("key1");
await cache.get("key3"); // miss

// 获取统计信息
const stats = await cache.getStats();

console.log("总命中数:", stats.hits); // 2
console.log("总未命中数:", stats.misses); // 1
console.log("命中率:", stats.hitRate.toFixed(2)); // 0.67
console.log("当前大小:", stats.currentSize); // 2
console.log("最大大小:", stats.maxSize); // 1000
console.log("设置次数:", stats.sets); // 2

// 重置统计
await cache.resetStats();
```

### 5. null 值缓存防穿透

```typescript
// 启用 null 值缓存
const config: CacheConfig = {
  defaultTtl: 3600000,
  maxSize: 1000,
  enableStats: true,
  enableEventInvalidation: false,
  cleanupInterval: 60000,
  evictionStrategy: "LRU",
  enableNullValueCache: true, // 启用防穿透
  nullValueCacheTtl: 30000, // null 值缓存 30 秒
};

const protectedCache = new InMemoryCache(config, logger);

// 查询不存在的用户
const user = await userRepository.findById("nonexistent");

if (user === null) {
  // 缓存 null 值，防止穿透
  await protectedCache.set("repo:user:nonexistent", null);
}

// 后续查询会命中 null 值缓存，不会查询数据库
const cached = await protectedCache.get("repo:user:nonexistent");
console.log(cached); // null

// 30 秒后过期，允许重新查询
```

### 6. 缓存协调服务

```typescript
import { CacheCoordinationService } from "@hl8/cache";

const coordinationService = new CacheCoordinationService(cache, logger);

// 设置多层缓存
await cache.set("repo:user:123", user, 3600000, ["entity:user"]);
await cache.set("query:GetUserProfile:abc", profile, 3600000, ["entity:user"]);

// 用户更新时，自动失效相关缓存
await coordinationService.invalidateEntityUpdate("user", "123");

// 验证所有相关缓存都已失效
console.log(await cache.get("repo:user:123")); // undefined
console.log(await cache.get("query:GetUserProfile:abc")); // undefined
```

### 7. 事件驱动失效

```typescript
import { EventDrivenCacheInvalidation } from "@hl8/cache";

const invalidation = new EventDrivenCacheInvalidation(cache, logger);

// 注册失效规则
invalidation.registerRule({
  id: "user-update-rule",
  eventType: "UserUpdatedEvent",
  keyGenerator: (event) => [`repo:user:${(event.data as any).userId}`],
  tags: ["entity:user"],
  enabled: true,
  priority: 100,
  description: "用户更新失效用户缓存",
});

// 模拟发布事件
await invalidation.handleEvent({
  eventType: "UserUpdatedEvent",
  data: { userId: "123", name: "Alice Updated" },
  timestamp: new Date(),
});

// 验证缓存失效
const user = await cache.get("repo:user:123"); // undefined
```

## 完整示例

### 用户服务缓存

```typescript
import { Injectable, Inject } from "@nestjs/common";
import { ICache, CacheKeyBuilder } from "@hl8/cache";

@Injectable()
export class UserService {
  private readonly keyBuilder = new CacheKeyBuilder();

  constructor(
    @Inject("CacheService") private readonly cache: ICache,
    private readonly userRepository: UserRepository,
  ) {}

  async getUser(userId: string): Promise<User | null> {
    const cacheKey = this.keyBuilder.buildEntityKey("user", userId);

    // 尝试从缓存获取
    const cached = await this.cache.get<User>(cacheKey);
    if (cached !== undefined) {
      return cached; // 包括 null 值
    }

    // 从数据库查询
    const user = await this.userRepository.findById(userId);

    // 缓存结果
    await this.cache.set(cacheKey, user, 3600000, ["entity:user"]);

    return user;
  }

  async updateUser(userId: string, updates: Partial<User>): Promise<void> {
    // 更新数据库
    await this.userRepository.update(userId, updates);

    // 失效缓存
    await this.cache.delete(this.keyBuilder.buildEntityKey("user", userId));
  }

  async deleteUser(userId: string): Promise<void> {
    // 删除数据库记录
    await this.userRepository.delete(userId);

    // 失效所有相关缓存
    await this.cache.delete(this.keyBuilder.buildEntityKey("user", userId));
    await this.cache.invalidateByTags(["entity:user"]);
  }
}
```

## 性能建议

1. **合理设置 TTL**: 根据数据更新频率调整
2. **使用标签**: 便于批量失效
3. **启用统计**: 定期分析缓存性能
4. **防止穿透**: 启用 null 值缓存
5. **监控内存**: 关注内存使用情况
