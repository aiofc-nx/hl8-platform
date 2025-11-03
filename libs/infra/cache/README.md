# @hl8/cache

统一缓存策略库 - 提供类型安全的缓存功能，支持 TTL、标签失效、模式匹配失效和跨层缓存协调。

## 特性

- ✅ **类型安全**: 完整的 TypeScript 支持和 TSDoc 注释
- ✅ **多种失效策略**: TTL、标签失效、模式匹配失效
- ✅ **三种淘汰策略**: LRU、FIFO、LFU
- ✅ **多租户支持**: 租户隔离的缓存键
- ✅ **性能监控**: 缓存统计信息（命中率、大小等）
- ✅ **跨层协调**: 应用层和基础设施层缓存协同工作
- ✅ **事件驱动**: 支持领域事件驱动的缓存失效

## 安装

```bash
pnpm add @hl8/cache
```

## 快速开始

### 1. 在 NestJS 模块中导入 CacheModule

```typescript
import { Module } from '@nestjs/common';
import { CacheModule } from '@hl8/cache';
import { LoggerModule } from '@hl8/logger';

@Module({
  imports: [
    LoggerModule.forRoot(),
    CacheModule.forRootAsync({
      useFactory: (logger) => ({
        config: {
          defaultTtl: 3600000, // 1 小时
          maxSize: 10000,
          enableStats: true,
          enableEventInvalidation: true,
          cleanupInterval: 600000, // 10 分钟
          evictionStrategy: 'LRU',
        },
        logger,
      }),
      inject: [Logger],
    }),
  ],
})
export class AppModule {}
```

### 2. 在服务中注入缓存

```typescript
import { Injectable, Inject } from '@nestjs/common';
import { ICache } from '@hl8/cache';

@Injectable()
export class UserService {
  constructor(@Inject('CacheService') private readonly cache: ICache) {}

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
      await this.cache.set(cacheKey, user, 3600000, ['entity:user']);
    }
    
    return user;
  }
}
```

### 3. 使用缓存键构建器

```typescript
import { CacheKeyBuilder } from '@hl8/cache';

const keyBuilder = new CacheKeyBuilder();

// 构建实体缓存键
const entityKey = keyBuilder.buildEntityKey('user', '123');
// 结果: 'repo:user:123'

// 多租户场景
const tenantKey = keyBuilder.buildEntityKey('user', '123', 'tenant1');
// 结果: 'tenant1:repo:user:123'

// 构建查询缓存键
const queryKey = keyBuilder.buildQueryKey('GetUserProfile', { userId: '123' });
// 结果: 'query:GetUserProfile:dXNlcklkPTEyMw=='
```

### 4. 缓存失效

```typescript
// 删除单个缓存项
await cache.delete('repo:user:123');

// 通过标签失效
await cache.invalidateByTags(['entity:user']);

// 通过模式匹配失效
await cache.invalidateByPattern('repo:user:*');
```

### 5. 缓存协调服务

```typescript
import { CacheCoordinationService } from '@hl8/cache';

const coordinationService = new CacheCoordinationService(cache, logger);

// 实体更新时，自动失效相关缓存
await coordinationService.invalidateEntityUpdate('user', '123');

// 这会失效:
// - 基础设施层: repo:user:123
// - 应用层: 所有带有 entity:user 标签的查询缓存
```

## 高级功能

### 多租户支持

```typescript
const tenantId = 'tenant1';
const key = keyBuilder.buildEntityKey('user', '123', tenantId);
await cache.set(key, userData);
await cache.invalidateByTags([`${tenantId}:entity:user`]);
```

### 缓存统计

```typescript
const stats = await cache.getStats();
console.log(`命中率: ${(stats.hitRate * 100).toFixed(2)}%`);
console.log(`当前大小: ${stats.currentSize}/${stats.maxSize}`);
console.log(`命中次数: ${stats.hits}`);
```

### 元数据查询

```typescript
const metadata = await cache.getMetadata('repo:user:123');
console.log(metadata?.tags);
console.log(metadata?.accessCount);
console.log(metadata?.lastAccessedAt);
```

## 配置选项

| 选项 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `defaultTtl` | `number` | - | 默认过期时间（毫秒），0 表示不过期 |
| `maxSize` | `number` | - | 最大缓存项数量 |
| `enableStats` | `boolean` | `true` | 是否启用统计 |
| `enableEventInvalidation` | `boolean` | `false` | 是否启用事件驱动失效 |
| `cleanupInterval` | `number` | `60000` | 清理间隔（毫秒） |
| `evictionStrategy` | `'LRU' \| 'FIFO' \| 'LFU'` | `'LRU'` | 淘汰策略 |

## 最佳实践

1. **合理设置 TTL**: 根据数据更新频率设置合适的过期时间
2. **使用标签**: 为缓存项添加标签，便于批量失效
3. **事件驱动失效**: 优先使用事件驱动失效，确保缓存一致性
4. **监控统计**: 定期查看缓存统计信息，优化缓存策略
5. **多租户隔离**: 多租户场景必须使用租户 ID 构建缓存键

## License

MIT
