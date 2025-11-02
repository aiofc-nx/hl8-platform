/**
 * 数据库配置类
 *
 * @description 类型安全的数据库配置，集成 @hl8/config
 *
 * ## 业务规则
 *
 * ### 配置验证规则
 * - 所有必需字段必须提供
 * - 端口号必须在有效范围内（1-65535）
 * - 连接池配置必须合理（min <= max）
 * - 超时时间必须 >= 1000 毫秒
 *
 * ### 默认值规则
 * - 提供合理的默认值确保开箱即用
 * - 默认值适用于中小型应用
 * - 生产环境应根据实际负载调整
 *
 * ## 使用场景
 *
 * - 从环境变量加载数据库配置
 * - 配置验证和类型转换
 * - 提供辅助方法（如获取连接字符串）
 *
 * @example
 * ```typescript
 * import { TypedConfigModule, dotenvLoader } from '@hl8/config';
 * import { DatabaseConfig } from '@hl8/database';
 *
 * @Module({
 *   imports: [
 *     TypedConfigModule.forRoot({
 *       schema: DatabaseConfig,
 *       load: [dotenvLoader()],
 *     }),
 *   ],
 * })
 * export class AppModule {}
 * ```
 *
 * @since 1.0.0
 */

import { Type } from "class-transformer";
import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from "class-validator";
import {
  CONNECTION_DEFAULTS,
  MONITORING_DEFAULTS,
  POOL_DEFAULTS,
} from "../constants/defaults.js";

/**
 * 数据库配置类
 *
 * @description 完整的数据库连接和行为配置
 */
export class DatabaseConfig {
  /**
   * 数据库类型
   *
   * @default 'postgresql'
   */
  @IsString()
  @IsOptional()
  type: "postgresql" | "mongodb" = "postgresql";

  /**
   * 数据库主机地址
   *
   * @default 'localhost'
   * @envVar DB_HOST
   */
  @IsString()
  host: string = "localhost";

  /**
   * 数据库端口
   *
   * @default 5432 (PostgreSQL)
   * @envVar DB_PORT
   */
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  @Max(65535)
  port: number = 5432;

  /**
   * 数据库名称
   *
   * @envVar DB_DATABASE
   */
  @IsString()
  database!: string;

  /**
   * 数据库用户名
   *
   * @envVar DB_USERNAME
   */
  @IsString()
  username!: string;

  /**
   * 数据库密码
   *
   * @envVar DB_PASSWORD
   */
  @IsString()
  password!: string;

  /**
   * 连接池最小连接数
   *
   * @default 5
   * @envVar DB_POOL_MIN
   */
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  @IsOptional()
  poolMin: number = POOL_DEFAULTS.MIN;

  /**
   * 连接池最大连接数
   *
   * @default 20
   * @envVar DB_POOL_MAX
   */
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  @IsOptional()
  poolMax: number = POOL_DEFAULTS.MAX;

  /**
   * 连接空闲超时（毫秒）
   *
   * @default 600000 (10 分钟)
   * @envVar DB_IDLE_TIMEOUT
   */
  @IsNumber()
  @Type(() => Number)
  @Min(1000)
  @IsOptional()
  idleTimeoutMillis: number = POOL_DEFAULTS.IDLE_TIMEOUT;

  /**
   * 获取连接超时（毫秒）
   *
   * @default 10000 (10 秒)
   * @envVar DB_ACQUIRE_TIMEOUT
   */
  @IsNumber()
  @Type(() => Number)
  @Min(1000)
  @IsOptional()
  acquireTimeoutMillis: number = POOL_DEFAULTS.ACQUIRE_TIMEOUT;

  /**
   * 慢查询阈值（毫秒）
   *
   * @default 1000 (1 秒)
   * @envVar DB_SLOW_QUERY_THRESHOLD
   */
  @IsNumber()
  @Type(() => Number)
  @Min(100)
  @IsOptional()
  slowQueryThreshold: number = MONITORING_DEFAULTS.SLOW_QUERY_THRESHOLD;

  /**
   * 是否启用调试模式
   *
   * @default false
   * @envVar DB_DEBUG
   */
  @IsBoolean()
  @Type(() => Boolean)
  @IsOptional()
  debug: boolean = false;

  /**
   * 获取数据库连接字符串
   *
   * @description 构建 PostgreSQL 连接字符串
   * @returns 连接字符串
   *
   * @example
   * ```typescript
   * const config = new DatabaseConfig();
   * const url = config.getConnectionString();
   * // postgresql://user:pass@localhost:5432/dbname
   * ```
   */
  getConnectionString(): string {
    if (this.type === "postgresql") {
      return `postgresql://${this.username}:${this.password}@${this.host}:${this.port}/${this.database}`;
    }

    if (this.type === "mongodb") {
      return `mongodb://${this.username}:${this.password}@${this.host}:${this.port}/${this.database}`;
    }

    throw new Error(`不支持的数据库类型: ${this.type}`);
  }

  /**
   * 获取连接配置对象
   *
   * @description 返回用于 MikroORM 的连接配置
   * @returns 连接配置对象
   */
  getConnectionConfig() {
    return {
      type: this.type,
      host: this.host,
      port: this.port,
      database: this.database,
      username: this.username,
      password: this.password,
    };
  }

  /**
   * 获取连接池配置对象
   *
   * @description 返回连接池配置
   * @returns 连接池配置对象
   */
  getPoolConfig() {
    return {
      min: this.poolMin,
      max: this.poolMax,
      idleTimeoutMillis: this.idleTimeoutMillis,
      acquireTimeoutMillis: this.acquireTimeoutMillis,
      createTimeoutMillis: CONNECTION_DEFAULTS.CONNECT_TIMEOUT,
    };
  }
}
