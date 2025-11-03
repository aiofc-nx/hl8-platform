# Application Kernel 缓存集成指南

本文档介绍如何在 Application Kernel 中使用 @hl8/cache 进行缓存。

## 概述

Application Kernel 已完全集成 @hl8/cache，提供统一的缓存服务：

- **自动注入**: 通过 `CacheService` 提供者注入 `ICache` 实例
- **配置驱动**: 通过 `ApplicationKernelConfig` 配置缓存行为
- **透明使用**: 应用层代码通过依赖注入使用缓存

## 基本使用

### 1. 在模块中配置缓存

```typescript
import { Module } from '@nestjs/common';
import { ApplicationKernelModule } from '@hl8/application-kernel';
import { TypedConfigModule } from '@hl8/config';

@Module({
  imports: [
    // 配置模块
    TypedConfigModule.forRoot({
      schema: ApplicationKernelConfig,
      load: [
        // 从配置文件加载
        fileLoader({ path: './config/app.yml' }),
      ],
    }),
    
    // 应用内核模块（自动配置缓存）
    ApplicationKernelModule.forRoot({
      eventStore: {
        type: 'hybrid',
        postgresql: process.env.POSTGRES_URL,
        mongodb: process.env.MONGODB_URL,
      },
      eventBus: {
        deliveryGuarantee: 'at-least-once',
        retryPolicy: { maxRetries: 3, backoffMs: 1000 },
      },
      cache: {
        type: 'memory',
        ttl: {
          default: 3600,  // 默认 1 小时（秒）
        },
        invalidation: {
          strategy: 'event-based',
          events: ['UserUpdatedEvent', 'OrderCreatedEvent'],
        },
        performance: {
          maxSize: 10000,
        },
      },
    }),
  ],
})
export class AppModule {}
```

### 2. 在服务中注入缓存

```typescript
import { Injectable, Inject } from '@nestjs/common';
import { ICache, CacheKeyBuilder } from '@hl8/application-kernel';
import { Logger } from '@hl8/logger';

@Injectable()
export class UserQueryService {
  private readonly keyBuilder = new CacheKeyBuilder();

  constructor(
    @Inject('CacheService') private readonly cache: ICache,
    private readonly logger: Logger,
  ) {}

  async getUserProfile(userId: string): Promise<UserProfile | null> {
    // 构建缓存键
    const cacheKey = this.keyBuilder.buildQueryKey(
      'GetUserProfile',
      { userId },
    );

    // 先查缓存
    const cached = await this.cache.get<UserProfile>(cacheKey);
    if (cached !== undefined) {
      this.logger.debug('缓存命中', { cacheKey, userId });
      return cached;
    }

    // 查询数据库
    const profile = await this.userRepository.getProfile(userId);

    // 缓存结果
    await this.cache.set(cacheKey, profile, 3600000, ['entity:User']);

    return profile;
  }
}
```

### 3. 在用例中使用缓存

```typescript
import { Injectable, Inject } from '@nestjs/common';
import { UseCase, UseCaseInput, UseCaseOutput } from '@hl8/application-kernel';
import { ICache } from '@hl8/cache';
import { CacheKeyBuilder } from '@hl8/cache';

@Injectable()
export class GetUserListUseCase extends UseCase<GetUserListInput, GetUserListOutput> {
  private readonly keyBuilder = new CacheKeyBuilder();

  constructor(
    @Inject('CacheService') private readonly cache: ICache,
    private readonly userRepository: UserRepository,
  ) {
    super();
  }

  async execute(input: GetUserListInput): Promise<GetUserListOutput> {
    const { page, pageSize, filters } = input;

    // 构建缓存键
    const cacheKey = this.keyBuilder.buildQueryKey('GetUserList', {
      page,
      pageSize,
      filters,
    });

    // 尝试从缓存获取
    const cached = await this.cache.get<UserListResult>(cacheKey);
    if (cached !== undefined) {
      return cached;
    }

    // 查询数据库
    const users = await this.userRepository.findAll({
      page,
      pageSize,
      ...filters,
    });

    const result = new GetUserListOutput(users);

    // 缓存结果
    await this.cache.set(
      cacheKey,
      result,
      1800000, // 30分钟
      ['entity:User', 'query:GetUserList'],
    );

    return result;
  }
}
```

## 事件驱动失效

Application Kernel 配置支持事件驱动失效：

```yaml
# config/app.yml
cache:
  type: memory
  ttl:
    default: 3600
  invalidation:
    strategy: event-based
    events:
      - UserUpdatedEvent
      - OrderCreatedEvent
      - PaymentProcessedEvent
  performance:
    maxSize: 10000
```

```typescript
import { Injectable, Inject } from '@nestjs/common';
import { EventBus, DomainEvent } from '@hl8/application-kernel';
import { ICache } from '@hl8/cache';
import { EventDrivenCacheInvalidation } from '@hl8/cache';

@Injectable()
export class CacheEventHandler {
  constructor(
    private readonly eventBus: EventBus,
    @Inject('CacheService') private readonly cache: ICache,
    private readonly logger: Logger,
  ) {
    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    const invalidation = new EventDrivenCacheInvalidation(
      this.cache,
      this.logger,
    );

    // 注册用户更新失效规则
    invalidation.registerRule({
      id: 'user-update-invalidation',
      eventType: 'UserUpdatedEvent',
      keyGenerator: (event) => [
        `repo:User:${(event.data as any).userId}`,
      ],
      tags: ['entity:User'],
      enabled: true,
      priority: 100,
    });

    // 监听事件
    this.eventBus.subscribe('UserUpdatedEvent', (event) => {
      invalidation.handleEvent(event);
    });
  }
}
```

## 跨层缓存协调

Application Kernel 和 Infrastructure Kernel 共享同一个缓存实例：

```typescript
import { Injectable, Inject } from '@nestjs/common';
import { ICache, CacheCoordinationService } from '@hl8/application-kernel';
import { Logger } from '@hl8/logger';

@Injectable()
export class UserService {
  private readonly coordinationService: CacheCoordinationService;

  constructor(
    @Inject('CacheService') private readonly cache: ICache,
    private readonly logger: Logger,
  ) {
    this.coordinationService = new CacheCoordinationService(
      this.cache,
      this.logger,
    );
  }

  async updateUser(userId: string, updates: Partial<User>): Promise<void> {
    // 更新数据库
    await this.userRepository.update(userId, updates);

    // 自动失效相关缓存
    await this.coordinationService.invalidateEntityUpdate('User', userId);
    
    // 这会失效：
    // - Infrastructure 层: repo:User:123
    // - Application 层: 所有带有 entity:User 标签的查询缓存
  }
}
```

## 配置说明

### ApplicationKernelConfig 缓存配置

```typescript
interface CacheConfig {
  type: 'memory' | 'redis' | 'hybrid';
  connection?: {
    host: string;
    port: number;
    password?: string;
  };
  ttl: {
    default: number;      // 默认TTL（秒）
    max: number;          // 最大TTL（秒）
  };
  invalidation: {
    strategy: 'event-based' | 'time-based' | 'manual';
    events: string[];     // 触发失效的事件类型
  };
  performance: {
    maxSize: number;      // 最大缓存项数量
    maxMemoryUsage: number; // 最大内存使用量（字节）
  };
}
```

### 映射到 @hl8/cache CacheConfig

Application Kernel 将配置映射到 @hl8/cache：

```typescript
const cacheConfig: CacheConfig = {
  defaultTtl: cfg.ttl.default * 1000,  // 转换为毫秒
  maxSize: cfg.performance.maxSize,
  enableStats: true,
  enableEventInvalidation: cfg.invalidation.strategy !== 'manual',
  cleanupInterval: 60_000,
  evictionStrategy: 'LRU',
};
```

## 监控和统计

```typescript
import { Injectable, Inject } from '@nestjs/common';
import { ICache } from '@hl8/application-kernel';

@Injectable()
export class CacheMonitoringService {
  constructor(@Inject('CacheService') private readonly cache: ICache) {}

  async getCacheStats() {
    const stats = await this.cache.getStats();

    console.log(`缓存命中率: ${(stats.hitRate * 100).toFixed(2)}%`);
    console.log(`当前大小: ${stats.currentSize}/${stats.maxSize}`);
    console.log(`命中次数: ${stats.hits}`);
    console.log(`未命中次数: ${stats.misses}`);
    console.log(`设置次数: ${stats.sets}`);
    console.log(`清理次数: ${stats.cleanups}`);

    // 判断缓存健康状态
    if (stats.hitRate < 0.5) {
      console.warn('缓存命中率过低，建议检查TTL设置');
    }

    if (stats.currentSize === stats.maxSize) {
      console.warn('缓存已满，建议增加maxSize或检查淘汰策略');
    }

    return stats;
  }
}
```

## 最佳实践

### 1. 合理的 TTL 设置

```typescript
// 静态数据（用户信息）
await cache.set(key, userData, 3600000, ['entity:User']); // 1小时

// 动态数据（订单列表）
await cache.set(key, orders, 60000, ['entity:Order']); // 1分钟

// 实时数据（库存信息）
await cache.set(key, stock, 10000, ['entity:Stock']); // 10秒
```

### 2. 使用标签批量失效

```typescript
// 为用户相关查询添加标签
await cache.set('query:GetUserProfile:123', profile, 3600000, [
  'entity:User',
  'query:GetUserProfile',
]);

await cache.set('query:GetUserOrders:123', orders, 1800000, [
  'entity:User',
  'query:GetUserOrders',
]);

// 用户更新时，一次性失效所有相关缓存
await cache.invalidateByTags(['entity:User']);
```

### 3. 启用 null 值缓存防穿透

在配置中启用：

```yaml
# 注意：Application Kernel 配置映射到 @hl8/cache
# null 值缓存需要直接在 CacheConfig 中配置
```

### 4. 监控和优化

定期检查缓存统计：

```typescript
const stats = await cache.getStats();

if (stats.hitRate < 0.5) {
  // 考虑延长TTL或预热缓存
}

if (stats.currentSize === stats.maxSize) {
  // 考虑增加maxSize
}
```

## 注意事项

1. **配置映射**: Application Kernel 配置会自动映射到 @hl8/cache
2. **事件失效**: 需要手动注册失效规则
3. **多租户**: 使用 `CacheKeyBuilder` 构建带租户ID的缓存键
4. **性能**: 定期监控缓存统计，优化配置
5. **内存**: 注意 maxSize 设置，避免内存溢出

## 示例

完整的集成示例：

```typescript
import { Module, Injectable, Inject } from '@nestjs/common';
import {
  ApplicationKernelModule,
  ICache,
  CacheKeyBuilder,
  CommandQueryBus,
} from '@hl8/application-kernel';
import { Logger } from '@hl8/logger';

// 服务中使用缓存
@Injectable()
export class UserService {
  private readonly keyBuilder = new CacheKeyBuilder();

  constructor(
    @Inject('CacheService') private readonly cache: ICache,
    private readonly bus: CommandQueryBus,
    private readonly logger: Logger,
  ) {}

  async getUser(id: string): Promise<User | null> {
    const key = this.keyBuilder.buildQueryKey('GetUser', { id });
    
    const cached = await this.cache.get<User>(key);
    if (cached !== undefined) {
      return cached;
    }

    const user = await this.queryUser(id);
    
    await this.cache.set(key, user, 3600000, ['entity:User']);
    
    return user;
  }

  private async queryUser(id: string): Promise<User | null> {
    // 实现查询逻辑
    return null;
  }
}

// 模块配置
@Module({
  imports: [
    ApplicationKernelModule.forRoot({
      cache: {
        type: 'memory',
        ttl: { default: 3600 },
        invalidation: { strategy: 'event-based', events: [] },
        performance: { maxSize: 10000 },
      },
    }),
  ],
  providers: [UserService],
})
export class AppModule {}
```
