/**
 * 数据库驱动工厂
 *
 * @description 根据配置创建相应的数据库驱动实例
 *
 * @since 1.0.0
 */

import { Injectable } from "@nestjs/common";
// import { PostgreSqlDriver } from "@mikro-orm/postgresql";
// import { MongoDriver } from "@mikro-orm/mongodb";
import { Logger } from "@hl8/logger";
import { DatabaseDriver } from "./database-driver.interface.js";
import { PostgreSQLDriver } from "./postgresql.driver.js";
import { MongoDBDriver } from "./mongodb.driver.js";
import type { DatabaseDriverConfig } from "./database-driver.interface.js";

/**
 * 数据库驱动工厂
 *
 * @description 负责创建和管理数据库驱动实例
 */
@Injectable()
export class DatabaseDriverFactory {
  constructor(private readonly logger: Logger) {}

  /**
   * 创建数据库驱动
   *
   * @description 根据配置创建相应的数据库驱动实例
   *
   * @param config 数据库驱动配置
   * @returns 数据库驱动实例
   *
   * @throws {Error} 不支持的数据库类型时抛出
   *
   * @example
   * ```typescript
   * const factory = new DatabaseDriverFactory(logger);
   * const driver = factory.createDriver({
   *   type: 'postgresql',
   *   connection: { host: 'localhost', port: 5432, ... },
   * });
   * ```
   */
  createDriver(config: DatabaseDriverConfig): DatabaseDriver {
    this.logger.log(`创建数据库驱动: ${config.type}`, {
      type: config.type,
      host: config.connection.host,
      port: config.connection.port,
    });

    switch (config.type) {
      case "postgresql":
        return new PostgreSQLDriver(config, this.logger);

      case "mongodb":
        return new MongoDBDriver(config, this.logger);

      default:
        throw new Error(`不支持的数据库类型: ${config.type}`);
    }
  }

  /**
   * 获取支持的数据库类型
   *
   * @description 返回所有支持的数据库类型列表
   *
   * @returns 支持的数据库类型数组
   */
  getSupportedTypes(): string[] {
    return ["postgresql", "mongodb"];
  }

  /**
   * 验证数据库类型
   *
   * @description 检查指定的数据库类型是否支持
   *
   * @param type 数据库类型
   * @returns 是否支持该类型
   */
  isSupportedType(type: string): boolean {
    return this.getSupportedTypes().includes(type);
  }
}
