# 事件驱动缓存失效指南

本文档介绍如何使用事件驱动失效机制实现自动缓存同步。

## 概述

事件驱动缓存失效通过监听领域事件，自动失效相关缓存：

- **自动同步**: 实体更新时自动失效缓存
- **跨层协调**: 同时失效基础设施层和应用层缓存
- **灵活规则**: 支持复杂的失效规则配置

## 基本使用

### 1. 注册失效规则

```typescript
import { EventDrivenCacheInvalidation } from '@hl8/cache';

const invalidation = new EventDrivenCacheInvalidation(cache, logger);

// 注册简单规则
invalidation.registerRule({
  id: 'user-update-rule',
  eventType: 'UserUpdatedEvent',
  keyGenerator: (event) => [`repo:user:${(event.data as any).userId}`],
  enabled: true,
  priority: 100,
});

// 注册标签规则
invalidation.registerRule({
  id: 'order-cancel-rule',
  eventType: 'OrderCancelledEvent',
  tags: ['entity:order', 'entity:payment'],
  enabled: true,
  priority: 100,
});

// 注册模式规则
invalidation.registerRule({
  id: 'batch-update-rule',
  eventType: 'UserBatchUpdateEvent',
  patterns: ['repo:user:*', 'query:GetUser:*'],
  enabled: true,
  priority: 100,
});
```

### 2. 处理事件

```typescript
// 监听领域事件
eventBus.subscribe('UserUpdatedEvent', async (event) => {
  await invalidation.handleEvent(event);
});

// 手动触发
await invalidation.handleEvent({
  eventType: 'UserUpdatedEvent',
  data: { userId: '123', name: 'Alice' },
  timestamp: new Date(),
});
```

## 高级用法

### 1. 通配符匹配

```typescript
// 匹配所有 user 相关事件
invalidation.registerRule({
  id: 'user-all-events',
  eventType: 'user.*',
  tags: ['entity:user'],
  enabled: true,
  priority: 100,
});

// 这会匹配：
// - user.created
// - user.updated
// - user.deleted
// - user.activated
```

### 2. 条件失效

```typescript
// 只在满足条件时失效
invalidation.registerRule({
  id: 'conditional-invalidation',
  eventType: 'OrderStatusChangedEvent',
  condition: (event) => (event.data as any).newStatus === 'CANCELLED',
  tags: ['entity:order'],
  enabled: true,
  priority: 200,
});

// 只有订单取消时才失效缓存
await invalidation.handleEvent({
  eventType: 'OrderStatusChangedEvent',
  data: { orderId: '123', newStatus: 'CANCELLED' },
});
```

### 3. 优先级排序

```typescript
// 高优先级规则先执行
invalidation.registerRule({
  id: 'high-priority',
  eventType: 'CriticalUpdateEvent',
  tags: ['entity:user'],
  enabled: true,
  priority: 1000, // 最高优先级
});

invalidation.registerRule({
  id: 'low-priority',
  eventType: 'SoftUpdateEvent',
  tags: ['entity:user'],
  enabled: true,
  priority: 10, // 低优先级
});
```

### 4. 组合失效策略

```typescript
// 使用多种失效方式
invalidation.registerRule({
  id: 'comprehensive-invalidation',
  eventType: 'UserDeletedEvent',
  keyGenerator: (event) => [`repo:user:${(event.data as any).userId}`],
  tags: ['entity:user', 'entity:profile'],
  patterns: ['query:GetUser:*', 'query:GetUserProfile:*'],
  enabled: true,
  priority: 100,
});
```

### 5. 批量处理

```typescript
// 批量处理多个事件
await invalidation.handleEvents([
  {
    eventType: 'UserUpdatedEvent',
    data: { userId: '1' },
  },
  {
    eventType: 'UserUpdatedEvent',
    data: { userId: '2' },
  },
]);
```

## 集成示例

### 与事件总线集成

```typescript
import { EventBus } from '@nestjs/cqrs';
import { Injectable } from '@nestjs/common';

@Injectable()
export class CacheInvalidationHandler {
  constructor(
    private readonly invalidation: EventDrivenCacheInvalidation,
    private readonly eventBus: EventBus,
  ) {
    this.setupSubscriptions();
  }

  private setupSubscriptions(): void {
    // 注册事件监听
    this.eventBus.subscribe('UserUpdatedEvent', (event) => 
      this.invalidation.handleEvent(event)
    );
    
    this.eventBus.subscribe('OrderCreatedEvent', (event) =>
      this.invalidation.handleEvent(event)
    );
  }
}
```

### 与 CachedRepository 集成

```typescript
class CachedUserRepository extends CachedRepository<User> {
  async save(entity: User): Promise<void> {
    // 保存实体
    await this.dbRepository.save(entity);
    
    // 自动失效缓存
    await this.cache.delete(`repo:User:${entity.id}`);
    
    // 发布事件触发其他失效
    await this.eventBus.publish({
      eventType: 'UserSavedEvent',
      data: { userId: entity.id },
    });
  }
}
```

## 最佳实践

1. **明确规则**: 为每个事件类型定义清晰的失效规则
2. **合理优先级**: 重要更新使用高优先级
3. **条件检查**: 避免不必要的失效操作
4. **性能监控**: 关注失效操作的性能影响
5. **错误处理**: 确保失效失败不影响主业务流程

## 故障排除

### 缓存未失效

检查：

- 事件类型是否匹配
- 规则是否启用
- 条件是否满足

### 性能问题

优化：

- 减少不必要的规则
- 合并相关规则
- 使用批量处理
