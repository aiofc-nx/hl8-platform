# Quick Start: 统一缓存策略

**Feature**: 001-unified-cache-strategy  
**Date**: 2024-12-03

## 快速开始

### 1. 安装依赖

```bash
# 在项目根目录
pnpm install
```

### 2. 在 NestJS 模块中导入 CacheModule（使用 @hl8/config）

```typescript
import { Module } from '@nestjs/common';
import { TypedConfigModule, fileLoader, dotenvLoader } from '@hl8/config';
import { LoggerModule } from '@hl8/logger';
import { CacheModule } from '@hl8/cache';
import { CacheConfig } from '@hl8/cache';

// 定义配置类（类型安全）
export class CacheConfig {
  defaultTtl = 3600000; // 1 小时
  maxSize = 10000;
  enableStats = true;
  enableEventInvalidation = true;
  cleanupInterval = 600000; // 10 分钟
  evictionStrategy: 'LRU' | 'FIFO' | 'LFU' = 'LRU';
}

@Module({
  imports: [
    // 使用 @hl8/config 进行配置管理
    TypedConfigModule.forRoot({
      schema: CacheConfig,
      load: [
        fileLoader({ path: './config/cache.yml' }), // 从配置文件加载
        dotenvLoader({ separator: '__' }), // 从环境变量加载
      ],
    }),
    // 使用 @hl8/logger 进行日志记录
    LoggerModule.forRoot(),
    // 导入缓存模块（自动使用配置和日志）
    CacheModule.forRootAsync({
      useFactory: (config: CacheConfig, logger: Logger) => ({
        config,
        logger,
      }),
      inject: [CacheConfig, Logger],
    }),
  ],
})
export class AppModule {}
```

### 3. 在服务中注入缓存（使用 @hl8/logger 记录日志）

```typescript
import { Injectable, Inject } from '@nestjs/common';
import { Logger } from '@hl8/logger';
import { ICache } from '@hl8/cache';

@Injectable()
export class UserService {
  constructor(
    @Inject('CacheService')
    private readonly cache: ICache,
    private readonly logger: Logger, // 注入 @hl8/logger
  ) {}

  async getUser(id: string): Promise<User | null> {
    const cacheKey = `repo:user:${id}`;
    
    // 先查缓存
    const cached = await this.cache.get<User>(cacheKey);
    if (cached) {
      return cached;
    }
    
    // 查数据库
    const user = await this.userRepository.findById(id);
    
    // 缓存结果
    if (user) {
      await this.cache.set(
        cacheKey,
        user,
        3600000, // 1 小时
        ['entity:user'], // 标签
      );
    }
    
    return user;
  }
}
```

### 4. 使用 @Cacheable 装饰器（高级用法）

```typescript
import { Injectable } from '@nestjs/common';
import { Cacheable } from '@hl8/cache';

@Injectable()
export class UserRepository {
  @Cacheable({
    keyPrefix: 'repo:user',
    ttl: 3600000,
    tags: ['entity:user'],
  })
  async findById(id: string): Promise<User | null> {
    // 实现查询逻辑
    // 装饰器会自动处理缓存
  }
}
```

### 5. 缓存失效

#### 手动失效

```typescript
// 删除单个缓存项
await cache.delete('repo:user:123');

// 通过标签失效
await cache.invalidateByTags(['entity:user']);

// 通过模式匹配失效
await cache.invalidateByPattern('query:*:user:*');
```

#### 事件驱动失效

```typescript
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { ICache } from '@hl8/cache';

@EventsHandler(UserUpdatedEvent)
export class UserUpdatedHandler implements IEventHandler<UserUpdatedEvent> {
  constructor(
    @Inject('CacheService')
    private readonly cache: ICache,
  ) {}

  async handle(event: UserUpdatedEvent) {
    // 失效实体缓存
    await this.cache.delete(`repo:user:${event.userId}`);
    
    // 失效相关查询缓存
    await this.cache.invalidateByTags(['entity:user']);
    await this.cache.invalidateByPattern('query:*:user:*');
  }
}
```

### 6. 查看缓存统计

```typescript
const stats = await cache.getStats();
console.log(`命中率: ${(stats.hitRate * 100).toFixed(2)}%`);
console.log(`当前缓存大小: ${stats.currentSize}/${stats.maxSize}`);
console.log(`命中次数: ${stats.hits}`);
console.log(`未命中次数: ${stats.misses}`);
```

### 7. 基础设施层仓储查询缓存（US1）

```typescript
import { Module } from '@nestjs/common';
import { TypedConfigModule, fileLoader } from '@hl8/config';
import { LoggerModule } from '@hl8/logger';
import { CacheModule } from '@hl8/cache';
import { InfrastructureKernelModule } from '@hl8/infrastructure-kernel';
import { 
  createCachedRepository,
  RepositoryCacheConfig,
  CacheInvalidationService 
} from '@hl8/infrastructure-kernel';
import { MikroORMRepository } from '@hl8/infrastructure-kernel';
import type { ICache, TenantContextProvider } from '@hl8/cache';

// 配置类（使用 @hl8/config）
export class RootConfig {
  repositoryCache!: RepositoryCacheConfig;
}

@Module({
  imports: [
    TypedConfigModule.forRoot({
      schema: RootConfig,
      load: fileLoader({ path: './config/app.yml' }),
    }),
    LoggerModule.forRoot(),
    CacheModule.forRoot(CacheConfig),
    InfrastructureKernelModule.forRoot({ /* ... */ }),
  ],
  providers: [
    {
      provide: 'UserRepository',
      useFactory: (
        em: EntityManager,
        cache: ICache,
        tenantContext: TenantContextProvider,
        config: RepositoryCacheConfig,
      ) => {
        const inner = new MikroORMRepository<UserEntity>(em, 'UserEntity');
        return createCachedRepository(
          inner,
          'user',
          { cache, tenantContext },
          {
            enabled: config.enabled,
            defaultTtlMs: config.defaultTtlMs,
            keyPrefix: config.keyPrefix,
          },
        );
      },
      inject: ['EntityManager', 'CacheService', 'TenantContextProvider', RepositoryCacheConfig],
    },
  ],
})
export class AppModule {}
```

#### 使用示例

```typescript
import { Injectable } from '@nestjs/common';
import { CacheInvalidationService } from '@hl8/infrastructure-kernel';
import type { IRepository } from '@hl8/domain-kernel';

@Injectable()
export class UserService {
  constructor(
    private readonly userRepo: IRepository<User>,
    private readonly cacheInvalidation: CacheInvalidationService,
  ) {}

  async getUser(id: string): Promise<User | null> {
    // CachedRepository 自动处理缓存
    return await this.userRepo.findById(EntityId.from(id));
  }

  async updateUser(id: string, data: Partial<User>): Promise<void> {
    const user = await this.userRepo.findById(EntityId.from(id));
    if (!user) throw new Error('User not found');
    
    Object.assign(user, data);
    await this.userRepo.save(user);
    // save 操作会自动失效缓存，无需手动调用
  }

  async invalidateUserCache(id: string, tenantId?: string): Promise<void> {
    // 手动失效：按实体ID
    await this.cacheInvalidation.invalidateEntityId('user', id, tenantId);
    
    // 或按实体类型失效（失效所有 user 实体缓存）
    await this.cacheInvalidation.invalidateEntity('user', tenantId);
    
    // 或按模式失效
    await this.cacheInvalidation.invalidateByPattern(`${tenantId}:repo:user:*`);
  }
}
```

### 8. 多租户场景

```typescript
import { CacheKeyBuilder } from '@hl8/cache';

@Injectable()
export class UserService {
  constructor(
    @Inject('CacheService')
    private readonly cache: ICache,
    private readonly keyBuilder: CacheKeyBuilder,
    @Inject('TenantContext')
    private readonly tenantId: string,
  ) {}

  async getUser(id: string): Promise<User | null> {
    // 使用租户 ID 构建缓存键
    const cacheKey = this.keyBuilder.buildEntityKey(
      'user',
      id,
      this.tenantId,
    );
    
    // 缓存操作同单租户场景
    // ...
  }
}
```

## 最佳实践

1. **合理设置 TTL**: 根据数据更新频率设置合适的过期时间
2. **使用标签**: 为缓存项添加标签，便于批量失效
3. **事件驱动失效**: 优先使用事件驱动失效，确保缓存一致性
4. **监控统计**: 定期查看缓存统计信息，优化缓存策略
5. **多租户隔离**: 多租户场景必须使用租户 ID 构建缓存键

## 常见问题

### Q: 如何处理缓存穿透？

A: 缓存空值，使用特殊标记表示"不存在"：

```typescript
const NULL_VALUE = Symbol('NULL_VALUE');
if (entity === null) {
  await cache.set(key, NULL_VALUE, ttl);
}
```

### Q: 如何处理缓存雪崩？

A: 使用随机 TTL 或在 TTL 基础上添加随机偏移：

```typescript
const ttl = baseTtl + Math.random() * 60000; // 随机 0-60 秒偏移
```

### Q: 如何处理缓存击穿？

A: 使用分布式锁或单进程锁：

```typescript
// 使用单进程锁（简化示例）
const lockKey = `lock:${key}`;
if (await this.cache.get(lockKey)) {
  // 其他进程正在加载，等待或返回默认值
  return null;
}
await this.cache.set(lockKey, true, 1000); // 锁 1 秒
// 加载数据
```

## 下一步

- 查看 [data-model.md](./data-model.md) 了解数据模型
- 查看 [research.md](./research.md) 了解技术决策
- 查看 [plan.md](./plan.md) 了解实施计划
