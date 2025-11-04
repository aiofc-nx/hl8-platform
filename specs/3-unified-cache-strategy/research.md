# Research: 统一缓存策略

**Feature**: 001-unified-cache-strategy  
**Date**: 2024-12-03

## 技术选型研究

### 1. 缓存接口设计

**Decision**: 采用策略模式，定义统一的 ICache 接口，支持多种实现

**Rationale**:

- 遵循依赖倒置原则，高层模块依赖抽象接口
- 支持运行时切换缓存实现（内存/Redis）
- 便于测试和 Mock
- 符合 Clean Architecture 设计原则

**Alternatives considered**:

- 单一实现类：灵活性不足，无法支持多种缓存后端
- 工厂模式直接返回具体类：违反依赖倒置原则

**Implementation**:

```typescript
export interface ICache {
  get<T>(key: string): Promise<T | undefined>;
  set(key: string, value: unknown, ttl?: number, tags?: string[]): Promise<void>;
  delete(key: string): Promise<void>;
  invalidateByTags(tags: string[]): Promise<void>;
  invalidateByPattern(pattern: string): Promise<void>;
  clear(): Promise<void>;
  getStats(): Promise<CacheStats>;
}
```

### 2. 缓存失效策略

**Decision**: 实现三种失效策略：TTL、标签失效、模式匹配失效

**Rationale**:

- TTL：自动过期，适用于大多数场景
- 标签失效：支持批量失效相关缓存（如所有用户实体）
- 模式匹配：支持灵活的失效规则（如所有用户相关查询）

**Alternatives considered**:

- 仅 TTL：无法精确控制失效时机
- 仅手动失效：增加使用复杂度，容易遗漏

**Implementation**:

- TTL：在缓存项中存储过期时间，定期清理
- 标签失效：维护标签到缓存键的索引（Map<string, Set<string>>）
- 模式匹配：使用 glob 或正则表达式匹配缓存键

### 3. 事件驱动缓存失效

**Decision**: 集成领域事件系统，监听实体相关事件自动失效缓存

**Rationale**:

- 确保缓存一致性，实体更新时自动失效相关缓存
- 降低使用复杂度，开发者无需手动管理缓存失效
- 支持跨模块的缓存协同失效

**Alternatives considered**:

- 手动失效：容易遗漏，导致数据不一致
- 基于时间的失效：无法及时失效，数据可能过时

**Implementation**:

- 监听领域事件（如 UserUpdatedEvent）
- 根据事件类型和实体类型，失效相关缓存
- 支持配置失效规则（CacheInvalidationRule）

### 4. 多租户缓存隔离

**Decision**: 在缓存键中包含租户 ID，确保不同租户的数据完全隔离

**Rationale**:

- 安全性：防止租户数据泄露
- 简单有效：不需要额外的隔离机制
- 性能：不影响缓存性能

**Alternatives considered**:

- 独立的缓存实例：增加资源消耗，管理复杂
- 命名空间隔离：实现复杂，仍需要租户 ID 检查

**Implementation**:

```typescript
// 缓存键格式：{tenantId}:{cacheKey}
const cacheKey = `${tenantId}:repo:${entityName}:${entityId}`;
```

### 5. NestJS 模块集成

**Decision**: 提供 CacheModule，通过依赖注入提供缓存服务，**优先使用 `@hl8/config` 和 `@hl8/logger`**

**Rationale**:

- 符合 NestJS 最佳实践
- **复用基础设施层的配置和日志能力，保持一致性**
- 支持配置驱动的缓存实现选择
- 确保所有模块共享同一个缓存实例

**Alternatives considered**:

- 单例模式：不够灵活，难以测试
- 工厂函数：不符合 NestJS 约定
- 自己实现配置和日志：违反 DRY 原则，增加维护成本

**Implementation**:

```typescript
import { TypedConfigModule } from "@hl8/config";
import { LoggerModule } from "@hl8/logger";

// 定义配置类（使用 @hl8/config）
export class CacheConfig {
  @IsNumber()
  @Min(0)
  defaultTtl!: number;

  @IsNumber()
  @Min(1)
  maxSize!: number;

  @IsBoolean()
  enableStats!: boolean;

  // ... 其他配置
}

@Module({
  imports: [
    TypedConfigModule.forRootAsync({
      useFactory: () => ({
        schema: CacheConfig,
        load: [
          /* 配置加载器 */
        ],
      }),
    }),
    LoggerModule.forRoot(),
  ],
  providers: [
    {
      provide: "CacheService",
      useFactory: (config: CacheConfig, logger: Logger) => {
        return new InMemoryCache(config, logger);
      },
      inject: [CacheConfig, Logger],
    },
  ],
  exports: ["CacheService"],
})
export class CacheModule {}
```

### 6. 缓存统计和监控

**Decision**: 内置缓存统计功能，记录命中率、缓存大小等指标

**Rationale**:

- 性能调优：帮助识别缓存热点和瓶颈
- 问题排查：了解缓存使用情况
- 生产监控：支持告警和监控集成

**Alternatives considered**:

- 外部监控：增加集成复杂度
- 无统计：无法评估缓存效果

**Implementation**:

- 在缓存操作时记录统计信息
- 提供 getStats() 方法返回统计信息
- 支持重置统计（用于测试）

### 7. 分布式缓存一致性

**Decision**: Phase 1 先实现单机缓存，Phase 2 实现 Redis 支持

**Rationale**:

- 遵循 YAGNI 原则，先满足当前需求
- 单机缓存已能满足大部分场景
- Redis 支持需要额外的依赖和复杂度

**Alternatives considered**:

- 直接实现 Redis：增加初始复杂度
- 混合缓存（L1+L2）：Phase 1 过于复杂

**Implementation Plan**:

- Phase 1: InMemoryCache
- Phase 2: RedisCache + 分布式失效通知（Redis 发布订阅）

### 8. 缓存穿透防护

**Decision**: 支持空值缓存，缓存"不存在"的查询结果

**Rationale**:

- 防止频繁查询不存在的实体导致数据库压力
- 简单的防护措施，成本低

**Alternatives considered**:

- 布隆过滤器：实现复杂，需要额外存储
- 不缓存空值：无法防止缓存穿透

**Implementation**:

```typescript
// 缓存空值，使用特殊标记
const NULL_VALUE = Symbol("NULL_VALUE");
if (entity === null) {
  await cache.set(key, NULL_VALUE, ttl);
}
```

### 9. 缓存键命名规范

**Decision**: 使用统一的命名格式：`{module}:{entity}:{operation}:{params}` 或 `{tenantId}:{module}:{entity}:{id}`

**Rationale**:

- 易于识别和管理
- 支持模式匹配失效
- 避免缓存键冲突

**Examples**:

- 实体缓存：`repo:user:123` 或 `tenant1:repo:user:123`
- 查询缓存：`query:GetUserProfile:userId=123`
- 标签：`entity:user`, `tenant:tenant1`

### 10. 事务环境下的缓存处理

**Decision**: 事务提交前不更新缓存，仅在事务提交后更新

**Rationale**:

- 确保缓存数据与数据库一致
- 防止事务回滚导致缓存数据不一致
- 遵循 ACID 原则

**Alternatives considered**:

- 事务内更新缓存：可能导致不一致
- 事务后统一更新：需要维护待更新列表，复杂度高

**Implementation**:

- 在 Repository.save() 时，先更新数据库
- 事务提交后（通过钩子或事件），再更新缓存
- 使用事务钩子或领域事件触发缓存更新

## 依赖关系

### 现有依赖（必须使用）

- **`@hl8/config`**: **必须使用** `TypedConfigModule` 管理缓存配置
  - 使用方式：定义 `CacheConfig` 类，使用 `TypedConfigModule.forRoot()` 注册
  - 好处：类型安全、自动验证、支持多格式配置文件
  - 示例：

    ```typescript
    import { TypedConfigModule, fileLoader, dotenvLoader } from "@hl8/config";
    import { IsNumber, IsBoolean, Min } from "class-validator";

    export class CacheConfig {
      @IsNumber()
      @Min(0)
      defaultTtl!: number;

      @IsNumber()
      @Min(1)
      maxSize!: number;

      @IsBoolean()
      enableStats!: boolean;
    }

    TypedConfigModule.forRoot({
      schema: CacheConfig,
      load: [fileLoader({ path: "./config/cache.yml" }), dotenvLoader()],
    });
    ```

- **`@hl8/logger`**: **必须使用** `Logger` 记录缓存操作日志
  - 使用方式：通过依赖注入使用 `Logger`，记录缓存命中、未命中、失效等操作
  - 好处：统一的日志格式、支持结构化日志、性能监控
  - 示例：

    ```typescript
    import { Logger } from '@hl8/logger';

    constructor(private readonly logger: Logger) {}

    async get<T>(key: string): Promise<T | undefined> {
      const value = await this.cache.get<T>(key);
      if (value) {
        this.logger.debug({ key, action: 'cache_hit' }, '缓存命中');
      } else {
        this.logger.debug({ key, action: 'cache_miss' }, '缓存未命中');
      }
      return value;
    }
    ```

- `@nestjs/common`, `@nestjs/core`: NestJS 框架支持

### 未来依赖（Phase 2）

- `ioredis`: Redis 客户端库（用于 RedisCache 实现）

## 集成点

1. **Application Kernel**: 需要将现有缓存实现迁移到 `@hl8/cache`
2. **Infrastructure Kernel**: 需要在 Repository 中添加缓存支持
3. **Domain Kernel**: 可选，将内部 Map 缓存迁移到 `@hl8/cache`
4. **领域事件系统**: 需要集成事件驱动的缓存失效

## 未解决的问题

无 - 所有技术决策已明确
