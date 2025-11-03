/**
 * @fileoverview 数据库配置
 * @description 提供数据库连接和健康检查配置
 */

/**
 * 数据库配置接口
 * @description 定义数据库连接和管理的配置选项
 */
export interface DatabaseConfig {
  /** 数据库类型 */
  type: "postgresql" | "mongodb";
  /** 数据库名称 */
  dbName: string;
  /** 连接URL */
  connectionUrl?: string;
  /** 连接池配置 */
  pool?: {
    min?: number;
    max?: number;
    idleTimeoutMillis?: number;
  };
  /** 是否启用健康检查 */
  healthCheck?: boolean;
  /** 健康检查超时时间（毫秒） */
  healthCheckTimeout?: number;
}

/**
 * 获取数据库配置
 * @description 从配置对象创建标准化的数据库配置，支持连接池和健康检查配置
 * @param config - 配置对象（通常通过依赖注入获取），包含数据库连接信息
 * @returns 数据库配置对象，如果配置无效则返回 null
 * @example
 * ```typescript
 * const dbConfig = getDatabaseConfig({
 *   type: 'postgresql',
 *   dbName: 'hl8_saas',
 *   connectionUrl: 'postgresql://...',
 *   pool: { min: 2, max: 10 },
 *   healthCheck: true
 * });
 * ```
 */
export function getDatabaseConfig(config?: {
  type?: string;
  dbName?: string;
  database?: string;
  connectionUrl?: string;
  pool?: {
    min?: number;
    max?: number;
    idleTimeoutMillis?: number;
  };
  healthCheck?: boolean;
  healthCheckTimeout?: number;
}): DatabaseConfig | null {
  if (!config) {
    return null;
  }

  return {
    type: (config.type || "postgresql") as "postgresql" | "mongodb",
    dbName: config.dbName || config.database || "hl8_platform",
    connectionUrl: config.connectionUrl,
    pool: config.pool,
    healthCheck: config.healthCheck ?? true,
    healthCheckTimeout: config.healthCheckTimeout || 5000,
  };
}
