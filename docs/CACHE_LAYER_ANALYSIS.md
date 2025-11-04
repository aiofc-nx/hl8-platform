# 应用层缓存 vs 基础设施层缓存 - 职责分析

## 问题

应用层（Application Kernel）已经有了缓存功能，基础设施层（Infrastructure Kernel）为什么还要缓存？

**重要说明**: 根据最新架构决策，缓存功能已作为独立的基础设施库 `@hl8/cache` 实现，位于 `libs/infra/cache`。Application Kernel 和 Infrastructure Kernel 都通过依赖注入使用 `@hl8/cache` 提供的 ICache 接口，共享同一个缓存服务实例。

---

## 一、缓存层次分析

### 1.1 当前架构中的缓存位置

```
┌─────────────────────────────────────────────────┐
│  Application Layer (应用层)                     │
│  ✅ CacheMiddleware - 缓存 Query 结果            │
│     缓存键: query:QueryType:base64(params)       │
│     缓存值: QueryResult (业务查询结果)           │
│     使用: @hl8/cache 的 ICache 接口              │
└─────────────────────────────────────────────────┘
                    ↓ (调用)           ↑ (共享缓存)
┌─────────────────────────────────────────────────┐
│  Infrastructure Layer (基础设施层)              │
│  ❌ 无缓存 - 直接访问数据库                      │
│     每次调用 Repository.findById() 都查询数据库   │
│     应使用: @hl8/cache 的 ICache 接口             │
└─────────────────────────────────────────────────┘
                    ↓ (查询)           ↑ (依赖)
┌─────────────────────────────────────────────────┐
│  Database (数据库)                               │
└─────────────────────────────────────────────────┘
                    ↑
                    │ (所有模块共享)
┌─────────────────────────────────────────────────┐
│  @hl8/cache (独立缓存库)                         │
│  ✅ ICache 接口                                  │
│  ✅ InMemoryCache 实现                           │
│  ✅ RedisCache 实现（待实现）                    │
└─────────────────────────────────────────────────┘
```

### 1.2 缓存粒度对比

| 层次               | 缓存粒度 | 缓存内容                      | 缓存键格式               | 共享性         |
| ------------------ | -------- | ----------------------------- | ------------------------ | -------------- |
| **应用层缓存**     | 粗粒度   | 完整的 Query 结果（业务结果） | `query:QueryType:params` | 仅限相同 Query |
| **基础设施层缓存** | 细粒度   | 单个实体数据（原始数据）      | `repo:EntityName:id`     | 跨多个用例共享 |

---

## 二、是否重复？

### 2.1 场景分析

#### 场景 1：单一用例场景

```typescript
// 用例 1: GetUserProfileQuery
// Application Layer 缓存: query:GetUserProfile:userId=123
// → 调用 Infrastructure Layer: repository.findById(123)
// → 如果 Infrastructure Layer 有缓存: repo:user:123
```

**问题**: 看起来重复了，两次缓存？

**实际情况**:

- **应用层缓存**: 缓存的是完整的用户资料（可能包含多个关联实体）
- **基础设施层缓存**: 缓存的是单个 User 实体

**是否重复？**: ⚠️ **部分重复，但有不同价值**

#### 场景 2：多个用例共享实体场景

```typescript
// 用例 1: GetUserProfileQuery
// → 缓存 query:GetUserProfile:123
// → 查询 repo:user:123 (未缓存，查询数据库)

// 用例 2: UpdateUserCommand
// → 不经过应用层缓存（Command 不缓存）
// → 直接查询 repo:user:123
// → 如果基础设施层有缓存，可以直接使用
```

**结论**: ✅ **不重复，基础设施层缓存可以被多个用例共享**

#### 场景 3：复杂查询场景

```typescript
// 查询: GetUsersByDepartmentQuery
// Application Layer 缓存: query:GetUsersByDepartment:deptId=456
// 缓存值: [{userId: 1}, {userId: 2}, {userId: 3}]

// 如果后续需要获取用户详细信息：
// → GetUserDetailQuery (userId: 1)
// → 如果基础设施层有缓存 repo:user:1，可以直接使用
```

**结论**: ✅ **不重复，基础设施层缓存可以优化后续查询**

---

## 三、职责划分

### 3.1 应用层缓存的职责

**✅ 应该缓存**:

- 业务查询结果（Query 结果）
- 聚合数据（多个实体的组合）
- 计算密集型的结果
- 需要业务逻辑处理后的数据

**❌ 不应该缓存**:

- 单个实体的原始数据（应该由基础设施层缓存）
- Command 的执行结果（写操作不缓存）

**缓存特性**:

- **粒度**: 粗（业务操作级别）
- **生命周期**: 短（基于业务需求）
- **失效策略**: 基于业务事件
- **共享性**: 低（特定查询结果）

### 3.2 基础设施层缓存的职责

**✅ 应该缓存**:

- 单个实体的原始数据
- 常用的数据库查询结果
- 跨用例共享的基础数据

**❌ 不应该缓存**:

- 业务逻辑处理后的结果（应该由应用层缓存）
- 聚合查询结果（应该由应用层缓存）

**缓存特性**:

- **粒度**: 细（实体级别）
- **生命周期**: 长（基于数据变化频率）
- **失效策略**: 基于数据变更事件
- **共享性**: 高（跨多个用例共享）

---

## 四、是否需要两层缓存？

### 4.1 答案：**取决于场景**

#### ✅ **需要两层缓存的情况**

1. **多用例共享实体**

   ```
   GetUserProfileQuery → 应用层缓存查询结果
   UpdateUserCommand  → 不缓存，但可以使用基础设施层缓存的实体
   GetUserDetailQuery  → 可以使用基础设施层缓存的实体
   ```

2. **复杂业务查询 + 实体详情查询**

   ```
   GetUsersByDepartmentQuery → 应用层缓存用户列表
   后续 GetUserDetailQuery    → 使用基础设施层缓存的单个用户
   ```

3. **高频单实体访问**

   ```
   多个不同的业务查询都需要同一个用户实体
   → 基础设施层缓存可以避免重复数据库查询
   ```

4. **分布式系统**

   ```
   应用层缓存：进程内缓存（快速）
   基础设施层缓存：Redis 缓存（共享）
   ```

#### ⚠️ **可以只有应用层缓存的情况**

1. **简单场景**
   - 查询模式固定，不频繁访问单个实体
   - 业务查询结果已经足够高效

2. **内存受限环境**
   - 两层缓存可能导致内存浪费
   - 只在应用层缓存已能满足性能需求

3. **数据变化频繁**
   - 实体数据变化频繁，基础设施层缓存命中率低
   - 缓存失效开销大于缓存收益

---

## 五、推荐方案

### 5.1 当前架构的改进建议

#### 方案 A：应用层缓存优先（推荐用于简单场景）

```typescript
// ✅ 优点：简单、易维护
// ❌ 缺点：无法跨用例共享、可能重复查询

// 只在 Application Layer 缓存 Query 结果
// Infrastructure Layer 不实现缓存
```

**适用场景**:

- 中小型应用
- 查询模式相对固定
- 不需要高频访问单个实体

#### 方案 B：基础设施层缓存优先（推荐用于复杂场景）

```typescript
// ✅ 优点：跨用例共享、减少数据库压力
// ❌ 缺点：实现复杂、需要缓存一致性管理

// Application Layer: 缓存复杂查询结果（可选）
// Infrastructure Layer: 缓存实体数据（必须）
```

**适用场景**:

- 大型应用
- 多个用例共享同一实体
- 高频访问单个实体
- 需要减少数据库压力

#### 方案 C：两层缓存协同（推荐用于高性能场景）

```typescript
// ✅ 优点：最佳性能、灵活失效策略
// ❌ 缺点：实现复杂、需要协调两层缓存

// Application Layer: 缓存业务查询结果
// Infrastructure Layer: 缓存实体数据
// 两层缓存协同，智能失效
```

**适用场景**:

- 高性能要求
- 复杂的业务场景
- 分布式系统

### 5.2 推荐实现（方案 C）

```typescript
// Infrastructure Layer Repository 实现
import { ICache } from "@hl8/cache";

export class CachedRepository<T extends BaseEntity> {
  constructor(
    private readonly repository: MikroORMRepository<T>,
    @Inject("CacheService")
    private readonly cache: ICache, // 使用独立缓存库 @hl8/cache
  ) {}

  async findById(id: EntityId): Promise<T | null> {
    const cacheKey = `repo:${this.entityName}:${id.value}`;

    // 1. 先查基础设施层缓存（实体级别）
    const cached = await this.cache.get<T>(cacheKey);
    if (cached) {
      this.logger.debug("实体缓存命中", { entityName: this.entityName, id });
      return cached;
    }

    // 2. 查数据库
    const entity = await this.repository.findById(id);

    // 3. 缓存实体（细粒度，可被多个用例共享）
    if (entity) {
      await this.cache.set(cacheKey, entity, 3600000, [`entity:${this.entityName}`]);
    }

    return entity;
  }
}

// Application Layer CacheMiddleware 实现
import { ICache } from "@hl8/cache";

export class CacheMiddleware {
  async beforeQuery(query: BaseQuery, context: ExecutionContext): Promise<boolean> {
    const cacheKey = `query:${query.queryType}:${this.hashParams(query)}`;

    // 1. 先查应用层缓存（查询结果级别）
    const cached = await this.cache.get<QueryResult>(cacheKey);
    if (cached) {
      context.metadata.cachedResult = cached;
      return false; // 不执行查询
    }

    return true; // 继续执行查询（可能会使用基础设施层的实体缓存）
  }
}
```

**缓存失效策略**:

```typescript
// 当实体更新时，失效相关缓存
@EventHandler(UserUpdatedEvent)
async handleUserUpdated(event: UserUpdatedEvent) {
  // 1. 失效基础设施层缓存（实体级别）
  await this.cache.delete(`repo:user:${event.userId}`);

  // 2. 失效应用层缓存（查询结果级别）
  await this.cache.invalidateByPattern('query:*:user:*');
  await this.cache.invalidateByTags([`entity:user`]);
}
```

---

## 六、结论

### 6.1 是否重复？

**答案：不完全是重复，但有重叠**

1. **缓存粒度不同**:
   - 应用层：业务查询结果（粗粒度）
   - 基础设施层：实体数据（细粒度）

2. **共享性不同**:
   - 应用层：仅限特定查询
   - 基础设施层：跨多个用例共享

3. **使用场景不同**:
   - 应用层：缓存业务处理后的结果
   - 基础设施层：缓存原始数据，减少数据库访问

### 6.2 是否需要基础设施层缓存？

**建议：视场景而定**

**✅ 需要的情况**:

- 多个用例共享同一实体
- 高频访问单个实体
- 需要减少数据库压力
- 分布式系统

**⚠️ 可以不要的情况**:

- 简单应用，查询模式固定
- 内存受限
- 数据变化频繁

### 6.3 推荐方案

**对于 HL8 平台（SAAS 多租户系统）**:

推荐使用 **方案 C（两层缓存协同）**：

1. **基础设施层缓存实体数据**:
   - 减少数据库访问
   - 跨用例共享
   - 支持高频访问

2. **应用层缓存查询结果**:
   - 缓存复杂查询结果
   - 业务逻辑处理后的数据

3. **协调失效策略**:
   - 实体更新时，同时失效两层缓存
   - 使用标签和模式匹配失效

### 6.4 实现建议

1. **创建独立缓存库 `@hl8/cache`**
   - 位于 `libs/infra/cache`
   - 提供统一的 ICache 接口和实现
   - 提供 NestJS 模块集成（CacheModule）

2. **所有 Kernel 模块使用 `@hl8/cache`**

   ```typescript
   // 所有模块（Application Kernel、Infrastructure Kernel）都使用独立缓存库
   import { ICache } from '@hl8/cache';

   @Inject('CacheService')
   private readonly cache: ICache  // 通过依赖注入共享同一个缓存实例
   ```

3. **为 Repository 添加缓存装饰器或中间件**

   ```typescript
   @Cacheable({ keyPrefix: 'repo', ttl: 3600 })
   async findById(id: EntityId): Promise<T | null>
   ```

4. **实现智能缓存失效**

   ```typescript
   // 实体更新 → 失效实体缓存 + 相关查询缓存
   await cache.delete(`repo:user:${id}`);
   await cache.invalidateByTags([`entity:user`]);
   ```

---

**总结**: 应用层缓存和基础设施层缓存**不完全是重复**，它们有**不同的职责和粒度**。在复杂的业务场景下，**两层缓存协同工作**可以带来更好的性能和更灵活的缓存策略。**关键架构决策**: 缓存功能应作为独立的基础设施库 `@hl8/cache` 实现，所有模块（Application Kernel、Infrastructure Kernel）都通过依赖注入使用该库，确保缓存的一致性和可维护性。

---

**文档生成时间**: 2024年
**分析范围**: Application Kernel vs Infrastructure Kernel 缓存职责
