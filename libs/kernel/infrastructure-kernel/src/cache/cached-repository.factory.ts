/**
 * @fileoverview CachedRepository 工厂
 * @description 提供便捷方法将任意 IRepository<T> 包装为带缓存能力的仓储
 */

import type { IRepository } from "@hl8/domain-kernel";
import type { ICache, TenantContextProvider } from "@hl8/cache";
import type { Logger } from "@hl8/logger";
import { CachedRepository } from "./cached-repository.js";
import type { RepositoryCacheOptions } from "./repository-cache.interface.js";

/**
 * @description 创建带缓存能力的仓储包装
 */
export function createCachedRepository<T>(
  inner: IRepository<T>,
  entityName: string,
  deps: {
    cache: ICache;
    tenantContext: TenantContextProvider;
    logger?: Logger;
  },
  options?: RepositoryCacheOptions,
): IRepository<T> {
  return new CachedRepository<T>(
    inner,
    entityName,
    deps.cache,
    deps.tenantContext,
    deps.logger,
    options,
  );
}
