# Data Model: 统一缓存策略

**Feature**: 001-unified-cache-strategy  
**Date**: 2024-12-03

## 核心实体

### CacheItem

**描述**: 表示单个缓存项，包含缓存值、元数据和失效信息

**属性**:
- `key: string` - 缓存键（唯一标识）
- `value: unknown` - 缓存值（任意类型）
- `ttl: number` - 过期时间（毫秒），0 表示不过期
- `expiresAt: number` - 过期时间戳（毫秒）
- `createdAt: number` - 创建时间戳（毫秒）
- `lastAccessedAt: number` - 最后访问时间戳（毫秒）
- `accessCount: number` - 访问次数
- `tags: string[]` - 标签列表（用于批量失效）
- `metadata: Record<string, unknown>` - 元数据（扩展属性）

**验证规则**:
- `key` 不能为空
- `ttl` 必须 >= 0
- `expiresAt` 必须 >= `createdAt`（如果 ttl > 0）
- `tags` 数组中的标签不能为空字符串

**状态转换**:
- 创建 → 有效：创建时设置 `createdAt` 和 `expiresAt`
- 有效 → 过期：当 `Date.now() > expiresAt` 时
- 有效 → 失效：通过 `delete()` 或 `invalidateByTags()` 删除

### CacheConfig

**描述**: 缓存系统的全局配置（**必须使用 `@hl8/config` 的 TypedConfigModule 进行管理**）

**属性**:
- `defaultTtl: number` - 默认过期时间（毫秒）
- `maxSize: number` - 最大缓存项数量
- `enableStats: boolean` - 是否启用统计
- `enableEventInvalidation: boolean` - 是否启用事件驱动失效
- `cleanupInterval: number` - 清理间隔（毫秒）
- `enableCompression: boolean` - 是否启用压缩（未来功能）
- `evictionStrategy: 'LRU' | 'FIFO' | 'LFU'` - 淘汰策略

**验证规则**（使用 class-validator）:
- `defaultTtl`: `@IsNumber()`, `@Min(0)` - 必须 >= 0（0 表示不过期，需要显式指定）
- `maxSize`: `@IsNumber()`, `@Min(1)` - 必须 > 0
- `cleanupInterval`: `@IsNumber()`, `@Min(1)` - 必须 > 0
- `enableStats`: `@IsBoolean()` - 必须为布尔值
- `enableEventInvalidation`: `@IsBoolean()` - 必须为布尔值
- `evictionStrategy`: `@IsIn(['LRU', 'FIFO', 'LFU'])` - 必须是枚举值之一

**配置类定义**（使用 `@hl8/config`）:
```typescript
import { Type } from 'class-transformer';
import { IsBoolean, IsIn, IsNumber, Min } from 'class-validator';

export class CacheConfig {
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  defaultTtl!: number;
  
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  maxSize!: number;
  
  @IsBoolean()
  enableStats!: boolean;
  
  @IsBoolean()
  enableEventInvalidation!: boolean;
  
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  cleanupInterval!: number;
  
  @IsIn(['LRU', 'FIFO', 'LFU'])
  evictionStrategy: 'LRU' | 'FIFO' | 'LFU' = 'LRU';
}
```

### CacheStats

**描述**: 缓存系统的性能统计信息

**属性**:
- `hits: number` - 命中次数
- `misses: number` - 未命中次数
- `sets: number` - 设置次数
- `deletes: number` - 删除次数
- `cleanups: number` - 清理次数
- `currentSize: number` - 当前缓存项数量
- `maxSize: number` - 最大缓存项数量
- `hitRate: number` - 命中率（0-1）
- `lastUpdated: Date` - 最后更新时间

**计算规则**:
- `hitRate = hits / (hits + misses)`，如果 `hits + misses === 0` 则为 0

### CacheInvalidationRule

**描述**: 缓存失效规则配置

**属性**:
- `id: string` - 规则 ID（唯一标识）
- `eventType: string` - 领域事件类型（如 "UserUpdatedEvent"）
- `invalidationStrategy: 'tag' | 'pattern' | 'key'` - 失效策略
- `keyPattern: string` - 缓存键模式（用于模式匹配，支持 glob）
- `tags: string[]` - 标签列表（用于标签失效）
- `condition?: (event: unknown) => boolean` - 条件函数（可选）
- `keyGenerator?: (event: unknown) => string` - 键生成函数（可选）
- `enabled: boolean` - 是否启用
- `priority: number` - 优先级（数字越小优先级越高）

**验证规则**:
- `id` 不能为空
- `eventType` 不能为空
- `invalidationStrategy` 必须是 'tag' | 'pattern' | 'key' 之一
- 至少提供一种失效策略（tag 或 pattern 或 keyGenerator）
- `priority` 必须 >= 0

### EntityCacheKey

**描述**: 实体缓存的键结构

**格式**: `{tenantId?}:repo:{entityName}:{entityId}`

**属性**:
- `tenantId?: string` - 租户 ID（可选，多租户场景）
- `entityName: string` - 实体名称（如 "user"）
- `entityId: string` - 实体 ID

**验证规则**:
- `entityName` 不能为空
- `entityId` 不能为空
- 如果启用多租户，`tenantId` 不能为空

**示例**:
- 单租户：`repo:user:123`
- 多租户：`tenant1:repo:user:123`

### QueryCacheKey

**描述**: 查询缓存的键结构

**格式**: `query:{queryType}:{paramsHash}`

**属性**:
- `queryType: string` - 查询类型（如 "GetUserProfile"）
- `paramsHash: string` - 查询参数的哈希值（base64 编码）

**验证规则**:
- `queryType` 不能为空
- `paramsHash` 不能为空

**示例**:
- `query:GetUserProfile:dXNlcklkPTEyMw==`
- `query:GetUsersByDepartment:ZGVwdElkPTQ1Ng==`

## 关系

### CacheItem ↔ CacheInvalidationRule

**关系**: 多对多（通过标签和模式匹配）

**说明**: 
- 一个缓存项可以有多个标签，可能匹配多个失效规则
- 一个失效规则可以失效多个缓存项（通过标签或模式匹配）

### CacheItem ↔ CacheStats

**关系**: 聚合

**说明**:
- `CacheStats` 聚合了所有 `CacheItem` 的统计信息
- 统计信息通过缓存操作实时更新

### EntityCacheKey ↔ QueryCacheKey

**关系**: 独立（但可以通过标签关联）

**说明**:
- 实体缓存和查询缓存是独立的缓存项
- 可以通过标签关联（如实体缓存标签 `entity:user` 可以用于失效相关查询缓存）

## 状态图

### CacheItem 生命周期

```
[创建] → [有效]
          ↓
       [访问] → [有效] (更新 lastAccessedAt)
          ↓
       [过期检查]
          ↓
       [过期] → [清理]
          ↓
       [失效] → [删除]
```

### CacheInvalidationRule 执行流程

```
[领域事件发布]
    ↓
[匹配规则] (根据 eventType)
    ↓
[条件检查] (如果提供了 condition)
    ↓
[执行失效] (根据 invalidationStrategy)
    ├─ tag → invalidateByTags(tags)
    ├─ pattern → invalidateByPattern(keyPattern)
    └─ key → delete(keyGenerator(event))
```

