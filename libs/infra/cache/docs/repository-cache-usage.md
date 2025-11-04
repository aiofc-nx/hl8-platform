# 仓储缓存使用指南

本文档介绍如何在 Infrastructure Kernel 中使用缓存来加速仓储查询。

## 基本概念

仓储缓存通过 `CachedRepository` 实现自动缓存：

- **findById**: 自动缓存查询结果
- **exists**: 自动缓存存在性检查
- **save**: 保存时自动失效相关缓存
- **delete**: 删除时自动失效相关缓存

## 使用示例

### 1. 创建 CachedRepository

```typescript
import { CachedRepository } from "@hl8/infrastructure-kernel";
import { ICache } from "@hl8/cache";
import { Logger } from "@hl8/logger";

class UserRepository extends CachedRepository<User> {
  constructor(
    private readonly dbRepository: IRepository<User>,
    cache: ICache,
    logger: Logger,
  ) {
    super("User", cache, logger);
  }

  // 委托给底层仓储
  protected async findByIdInternal(id: EntityId): Promise<User | null> {
    return this.dbRepository.findById(id);
  }
}
```

### 2. 自动缓存查询

```typescript
const userRepo = new UserRepository(dbRepo, cache, logger);

// 第一次查询 - 从数据库获取
const user1 = await userRepo.findById(new EntityId("123")); // 查询数据库

// 第二次查询 - 从缓存获取
const user2 = await userRepo.findById(new EntityId("123")); // 从缓存获取，快速！

// 验证缓存
const cached = await cache.get("repo:User:123");
console.log(cached); // user data
```

### 3. 自动失效缓存

```typescript
// 更新用户
user.age = 31;
await userRepo.save(user);

// 验证缓存已失效
const cached = await cache.get("repo:User:123"); // undefined

// 下次查询会重新从数据库获取
const user3 = await userRepo.findById(new EntityId("123")); // 查询数据库
```

### 4. 多租户场景

```typescript
const tenantId = "tenant1";

// 创建带租户 ID 的缓存键
const key = `${tenantId}:repo:User:123`;
await cache.set(key, user);

// CachedRepository 自动处理租户隔离
const user = await cachedRepo.findById(id, { tenantId });
```

### 5. 配置缓存行为

```typescript
import { RepositoryCacheConfig } from "@hl8/infrastructure-kernel";

const cacheConfig: RepositoryCacheConfig = {
  enabled: true,
  defaultTtl: 3600000,
  tags: ["entity:User"],
};

const cachedRepo = new CachedRepository("User", cache, logger, cacheConfig);
```

## 高级用法

### 1. 自定义缓存键

```typescript
class CustomCachedRepository<T extends Entity> extends CachedRepository<T> {
  protected buildCacheKey(id: string, options?: { tenantId?: string }): string {
    const tenant = options?.tenantId;
    return tenant ? `${tenant}:custom:${this.entityName}:${id}` : `custom:${this.entityName}:${id}`;
  }
}
```

### 2. 批量操作

```typescript
// 批量查询 - 缓存每个结果
const users = await Promise.all([userRepo.findById(new EntityId("1")), userRepo.findById(new EntityId("2")), userRepo.findById(new EntityId("3"))]);

// 批量更新 - 自动失效所有相关缓存
await Promise.all([userRepo.save(user1), userRepo.save(user2), userRepo.save(user3)]);
```

### 3. 缓存失效策略

```typescript
// 手动失效单个实体缓存
await cache.delete("repo:User:123");

// 失效所有用户实体缓存
await cache.invalidateByTags(["entity:User"]);

// 使用模式失效
await cache.invalidateByPattern("repo:User:*");
```

## 性能优化

1. **合理设置 TTL**: 根据数据更新频率调整
2. **使用标签**: 为实体类型添加标签，便于批量失效
3. **监控命中率**: 定期检查缓存统计
4. **预热缓存**: 系统启动时预加载常用数据
