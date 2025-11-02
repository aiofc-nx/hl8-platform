/**
 * 模块配置类型定义
 *
 * @description Database 模块的配置接口
 *
 * @since 1.0.0
 */

import type { Options as MikroORMOptions } from "@mikro-orm/core";
import type { ConnectionConfig, PoolConfig } from "./connection.types.js";

/**
 * 数据库模块配置选项
 *
 * @description Database 模块的完整配置接口
 */
export interface DatabaseModuleOptions {
  /** 数据库类型 */
  type: "postgresql" | "mongodb";

  /** 数据库连接配置 */
  connection: ConnectionConfig;

  /** 连接池配置（可选） */
  pool?: Partial<PoolConfig>;

  /** 实体类数组 */
  entities: (new (...args: any[]) => any)[];

  /** MikroORM 额外配置（可选） */
  mikroORM?: Partial<MikroORMOptions>;

  /** 监控配置（可选） */
  monitoring?: {
    /** 是否启用慢查询记录 */
    enableSlowQueryLog?: boolean;

    /** 慢查询阈值（毫秒） */
    slowQueryThreshold?: number;

    /** 是否启用查询指标 */
    enableQueryMetrics?: boolean;
  };

  /** 是否启用调试模式（可选） */
  debug?: boolean;
}

/**
 * 数据库模块异步配置选项
 *
 * @description 使用工厂函数进行异步配置
 */
export interface DatabaseModuleAsyncOptions {
  /**
   * 工厂函数
   *
   * @description 返回模块配置的工厂函数
   */
  useFactory: (
    ...args: any[]
  ) => Promise<DatabaseModuleOptions> | DatabaseModuleOptions;

  /**
   * 依赖注入
   *
   * @description 工厂函数需要注入的依赖
   */
  inject?: any[];
}
