/**
 * @fileoverview 仓储查询缓存使用示例
 * @description 展示基础设施层仓储缓存的集成与使用方式
 */

import { Module, Injectable } from "@nestjs/common";
import { TypedConfigModule, fileLoader } from "@hl8/config";
import { LoggerModule } from "@hl8/logger";
import { CacheModule, CacheConfig } from "@hl8/cache";
import {
  createCachedRepository,
  RepositoryCacheConfig,
  CacheInvalidationService,
  MikroORMRepository,
} from "@hl8/infrastructure-kernel";
import type { ICache, TenantContextProvider } from "@hl8/cache";
import type { EntityId, IRepository } from "@hl8/domain-kernel";
import type { EntityManager } from "@mikro-orm/core";

// ==================== 配置示例 ====================

/**
 * 应用根配置（包含仓储缓存配置）
 */
export class AppConfig {
  repositoryCache!: RepositoryCacheConfig;
}

// config/app.yml 示例：
// repositoryCache:
//   enabled: true
//   defaultTtlMs: 60000  # 1分钟
//   keyPrefix: "infra"

// ==================== 模块配置示例 ====================

@Module({
  imports: [
    // 使用 @hl8/config 加载配置
    TypedConfigModule.forRoot({
      schema: AppConfig,
      load: [fileLoader({ path: "./config/app.yml" })],
    }),
    // 使用 @hl8/logger
    LoggerModule.forRoot(),
    // 缓存模块
    CacheModule.forRoot(CacheConfig),
    // 基础设施内核模块
    InfrastructureKernelModule.forRoot({
      // ... 其他配置
    }),
  ],
  providers: [
    // 创建带缓存的仓储
    {
      provide: "UserRepository",
      useFactory: (
        em: EntityManager,
        cache: ICache,
        tenantContext: TenantContextProvider,
        config: RepositoryCacheConfig,
      ): IRepository<User> => {
        // 创建基础仓储
        const inner = new MikroORMRepository<UserEntity>(em, "UserEntity");

        // 包装为带缓存的仓储
        return createCachedRepository(
          inner,
          "user",
          { cache, tenantContext },
          {
            enabled: config.enabled,
            defaultTtlMs: config.defaultTtlMs,
            keyPrefix: config.keyPrefix,
          },
        );
      },
      inject: [
        "EntityManager",
        "CacheService",
        "TenantContextProvider",
        RepositoryCacheConfig,
      ],
    },
  ],
})
export class AppModule {}

// ==================== 服务使用示例 ====================

interface User {
  id: string;
  name: string;
  email: string;
}

@Injectable()
export class UserService {
  constructor(
    private readonly userRepo: IRepository<User>,
    private readonly cacheInvalidation: CacheInvalidationService,
  ) {}

  /**
   * 查询用户（自动缓存）
   */
  async getUser(id: string): Promise<User | null> {
    // CachedRepository 自动处理：
    // 1. 先查缓存，命中直接返回
    // 2. 未命中查数据库，写入缓存
    // 3. 日志记录命中/未命中
    return await this.userRepo.findById(EntityId.from(id));
  }

  /**
   * 检查用户是否存在（自动缓存）
   */
  async userExists(id: string): Promise<boolean> {
    // exists 结果也会被缓存
    return await this.userRepo.exists(EntityId.from(id));
  }

  /**
   * 更新用户（自动失效缓存）
   */
  async updateUser(id: string, data: Partial<User>): Promise<void> {
    const user = await this.userRepo.findById(EntityId.from(id));
    if (!user) throw new Error("User not found");

    Object.assign(user, data);
    // save 操作会自动失效该实体类型的缓存
    await this.userRepo.save(user);
  }

  /**
   * 删除用户（自动失效缓存）
   */
  async deleteUser(id: string): Promise<void> {
    // delete 操作会自动失效相关缓存
    await this.userRepo.delete(EntityId.from(id));
  }

  /**
   * 手动失效缓存示例
   */
  async invalidateUserCache(id: string, tenantId?: string): Promise<void> {
    // 方式1：按实体ID失效（精确）
    await this.cacheInvalidation.invalidateEntityId("user", id, tenantId);

    // 方式2：按实体类型失效（粗粒度，失效所有 user 实体缓存）
    await this.cacheInvalidation.invalidateEntity("user", tenantId);

    // 方式3：按模式失效（灵活）
    const pattern = tenantId ? `${tenantId}:repo:user:*` : "repo:user:*";
    await this.cacheInvalidation.invalidateByPattern(pattern);
  }

  /**
   * 批量失效示例
   */
  async bulkInvalidate(ids: string[], tenantId?: string): Promise<void> {
    // 批量失效多个实体ID的缓存
    for (const id of ids) {
      await this.cacheInvalidation.invalidateEntityId("user", id, tenantId);
    }
  }
}

// ==================== 事件驱动失效示例 ====================

import { EventsHandler, IEventHandler } from "@nestjs/cqrs";

/**
 * 用户更新事件
 */
export class UserUpdatedEvent {
  constructor(
    public readonly userId: string,
    public readonly tenantId?: string,
  ) {}
}

/**
 * 事件处理器：自动失效缓存
 */
@EventsHandler(UserUpdatedEvent)
export class UserUpdatedEventHandler
  implements IEventHandler<UserUpdatedEvent>
{
  constructor(private readonly cacheInvalidation: CacheInvalidationService) {}

  async handle(event: UserUpdatedEvent): Promise<void> {
    // 事件触发时自动失效缓存
    await this.cacheInvalidation.invalidateEntityId(
      "user",
      event.userId,
      event.tenantId,
    );

    // 也可以失效相关查询缓存
    await this.cacheInvalidation.invalidateEntity("user", event.tenantId);
  }
}

// ==================== 多租户场景示例 ====================

@Injectable()
export class TenantUserService {
  constructor(
    private readonly userRepo: IRepository<User>,
    private readonly cacheInvalidation: CacheInvalidationService,
  ) {}

  async getUserForTenant(
    tenantId: string,
    userId: string,
  ): Promise<User | null> {
    // CachedRepository 会自动从 TenantContextProvider 获取 tenantId
    // 构建租户隔离的缓存键：{tenantId}:repo:user:{userId}
    return await this.userRepo.findById(EntityId.from(userId));
  }

  async invalidateTenantCache(tenantId: string): Promise<void> {
    // 失效特定租户的所有 user 缓存
    await this.cacheInvalidation.invalidateEntity("user", tenantId);

    // 或使用模式匹配
    await this.cacheInvalidation.invalidateByPattern(`${tenantId}:repo:user:*`);
  }
}
