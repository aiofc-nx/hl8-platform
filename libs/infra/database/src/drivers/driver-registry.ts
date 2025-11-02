/**
 * 数据库驱动注册表
 *
 * @description 管理数据库驱动的注册和发现
 *
 * @since 1.0.0
 */

import { Injectable } from "@nestjs/common";
import { Logger } from "@hl8/logger";
import {
  DatabaseDriver,
  // DatabaseDriverFactory,
} from "./database-driver.interface.js";
import { PostgreSQLDriver } from "./postgresql.driver.js";
import { MongoDBDriver } from "./mongodb.driver.js";
import type { DatabaseDriverConfig } from "./database-driver.interface.js";

/**
 * 驱动注册信息
 */
export interface DriverRegistration {
  /** 驱动类型 */
  type: string;
  /** 驱动类 */
  driverClass: new (
    config: DatabaseDriverConfig,
    logger: Logger,
  ) => DatabaseDriver;
  /** 是否默认 */
  isDefault: boolean;
  /** 描述信息 */
  description: string;
  /** 版本 */
  version: string;
}

/**
 * 数据库驱动注册表
 *
 * @description 负责管理数据库驱动的注册、发现和创建
 */
@Injectable()
export class DriverRegistry {
  private readonly drivers = new Map<string, DriverRegistration>();
  private readonly defaultDriver: string;

  constructor(private readonly logger: Logger) {
    this.defaultDriver = "postgresql";
    this.registerBuiltinDrivers();
  }

  /**
   * 注册数据库驱动
   *
   * @description 注册一个新的数据库驱动
   *
   * @param registration 驱动注册信息
   *
   * @throws {Error} 驱动类型已存在时抛出
   *
   * @example
   * ```typescript
   * registry.registerDriver({
   *   type: 'custom-db',
   *   driverClass: CustomDatabaseDriver,
   *   isDefault: false,
   *   description: '自定义数据库驱动',
   *   version: '1.0.0',
   * });
   * ```
   */
  registerDriver(registration: DriverRegistration): void {
    if (this.drivers.has(registration.type)) {
      throw new Error(`驱动类型 '${registration.type}' 已存在`);
    }

    this.drivers.set(registration.type, registration);
    this.logger.log(`注册数据库驱动: ${registration.type}`, {
      type: registration.type,
      description: registration.description,
      version: registration.version,
    });
  }

  /**
   * 注销数据库驱动
   *
   * @description 从注册表中移除指定的数据库驱动
   *
   * @param type 驱动类型
   *
   * @returns 是否成功注销
   */
  unregisterDriver(type: string): boolean {
    const removed = this.drivers.delete(type);
    if (removed) {
      this.logger.log(`注销数据库驱动: ${type}`);
    }
    return removed;
  }

  /**
   * 获取数据库驱动
   *
   * @description 根据类型获取数据库驱动类
   *
   * @param type 驱动类型
   * @returns 驱动类或 undefined
   */
  getDriver(type: string): DriverRegistration | undefined {
    return this.drivers.get(type);
  }

  /**
   * 获取所有已注册的驱动
   *
   * @description 返回所有已注册的驱动信息
   *
   * @returns 驱动注册信息数组
   */
  getAllDrivers(): DriverRegistration[] {
    return Array.from(this.drivers.values());
  }

  /**
   * 获取支持的驱动类型
   *
   * @description 返回所有支持的驱动类型列表
   *
   * @returns 驱动类型数组
   */
  getSupportedTypes(): string[] {
    return Array.from(this.drivers.keys());
  }

  /**
   * 检查驱动是否已注册
   *
   * @description 检查指定类型的驱动是否已注册
   *
   * @param type 驱动类型
   * @returns 是否已注册
   */
  isDriverRegistered(type: string): boolean {
    return this.drivers.has(type);
  }

  /**
   * 创建数据库驱动实例
   *
   * @description 根据配置创建数据库驱动实例
   *
   * @param config 数据库配置
   * @returns 数据库驱动实例
   *
   * @throws {Error} 驱动类型不存在时抛出
   */
  createDriver(config: DatabaseDriverConfig): DatabaseDriver {
    const registration = this.getDriver(config.type);
    if (!registration) {
      throw new Error(`未注册的数据库驱动类型: ${config.type}`);
    }

    this.logger.log(`创建数据库驱动实例: ${config.type}`, {
      type: config.type,
      host: config.connection.host,
      database: config.connection.database,
    });

    return new registration.driverClass(config, this.logger);
  }

  /**
   * 获取默认驱动类型
   *
   * @description 返回默认的数据库驱动类型
   *
   * @returns 默认驱动类型
   */
  getDefaultDriverType(): string {
    return this.defaultDriver;
  }

  /**
   * 注册内置驱动
   *
   * @description 注册系统内置的数据库驱动
   */
  private registerBuiltinDrivers(): void {
    // 注册 PostgreSQL 驱动
    this.drivers.set("postgresql", {
      type: "postgresql",
      driverClass: PostgreSQLDriver,
      isDefault: true,
      description: "PostgreSQL 数据库驱动",
      version: "1.0.0",
    });

    // 注册 MongoDB 驱动
    this.drivers.set("mongodb", {
      type: "mongodb",
      driverClass: MongoDBDriver,
      isDefault: false,
      description: "MongoDB 数据库驱动",
      version: "1.0.0",
    });

    this.logger.log("注册内置数据库驱动完成", {
      drivers: Array.from(this.drivers.keys()),
    });
  }

  /**
   * 获取驱动统计信息
   *
   * @description 获取驱动注册表的统计信息
   *
   * @returns 统计信息
   */
  getRegistryStats(): {
    totalDrivers: number;
    supportedTypes: string[];
    defaultDriver: string;
  } {
    return {
      totalDrivers: this.drivers.size,
      supportedTypes: this.getSupportedTypes(),
      defaultDriver: this.defaultDriver,
    };
  }
}
