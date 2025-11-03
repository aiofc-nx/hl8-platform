/**
 * @fileoverview MikroORM 配置
 * @description 提供 MikroORM 连接和 EntityManager 配置支持，兼容 PostgreSQL 和 MongoDB
 */

import { Options } from "@mikro-orm/core";
import { PostgreSqlDriver } from "@mikro-orm/postgresql";
import { MongoDriver } from "@mikro-orm/mongodb";
import type { Logger } from "@hl8/logger";

/**
 * MikroORM 配置选项接口
 * @description 定义 MikroORM 初始化的配置选项，支持 PostgreSQL 和 MongoDB
 */
export interface MikroORMConfigOptions {
  /** 数据库类型：postgresql 或 mongodb */
  type: "postgresql" | "mongodb";
  /** 数据库名称 */
  dbName: string;
  /** 实体类路径数组或实体类构造函数数组 */
  entities: string[] | (new (...args: any[]) => any)[];
  /** 是否启用调试模式（默认 false） */
  debug?: boolean;
  /** 连接URL（可选，优先使用），PostgreSQL 格式：postgresql://user:pass@host:port/db */
  connectionUrl?: string;
  /** 连接选项（可选），当不提供 connectionUrl 时使用 */
  connectionOptions?: Record<string, unknown>;
}

/**
 * 创建 MikroORM 配置
 * @description 根据配置选项创建 MikroORM 配置对象，支持 PostgreSQL 和 MongoDB
 * @param options - 配置选项，包含数据库类型、名称、实体类等
 * @returns MikroORM 配置对象，可直接用于 MikroORM.init()
 * @throws {Error} 当配置选项无效时抛出
 * @example
 * ```typescript
 * const config = createMikroORMConfig({
 *   type: 'postgresql',
 *   dbName: 'hl8_saas',
 *   entities: ['./dist/entities'],
 *   connectionUrl: 'postgresql://user:pass@localhost:5432/db'
 * });
 * const orm = await MikroORM.init(config);
 * ```
 */
export function createMikroORMConfig(options: MikroORMConfigOptions): Options {
  const baseConfig: Options = {
    dbName: options.dbName,
    entities: options.entities,
    debug: options.debug ?? false,
    discovery: {
      disableDynamicFileAccess: true,
      requireEntitiesArray: true,
    },
    migrations: {
      path: "./migrations",
    },
  };

  if (options.type === "postgresql") {
    return {
      ...baseConfig,
      driver: PostgreSqlDriver,
      driverOptions: {
        connection: options.connectionUrl
          ? { connectionString: options.connectionUrl }
          : options.connectionOptions,
      },
    } as unknown as Options<PostgreSqlDriver>;
  } else {
    return {
      ...baseConfig,
      driver: MongoDriver,
      clientUrl: options.connectionUrl,
    } as unknown as Options<MongoDriver>;
  }
}

/**
 * 从配置模块加载 MikroORM 配置
 * @description 使用 @hl8/config 加载数据库配置并创建 MikroORM 配置
 * 注意：此函数需要在 NestJS 应用中通过依赖注入获取配置，当前为占位实现
 * @param logger - 日志记录器（可选），用于记录警告信息
 * @returns MikroORM 配置对象，如果配置不可用则返回 null
 * @example
 * ```typescript
 * // 在 NestJS 中使用
 * @Injectable()
 * class ConfigService {
 *   constructor(@Inject(ConfigService) private config: ConfigService) {}
 *   getMikroORMConfig() {
 *     return loadMikroORMConfigFromConfig(this.logger);
 *   }
 * }
 * ```
 */
export function loadMikroORMConfigFromConfig(logger?: Logger): Options | null {
  // 注意：此函数需要在 NestJS 应用中通过依赖注入获取配置
  // 这里提供一个占位实现，实际使用时应通过 TypedConfigModule 注入配置对象
  logger?.warn(
    "loadMikroORMConfigFromConfig 需要使用依赖注入获取配置，当前返回 null",
  );
  return null;
}
