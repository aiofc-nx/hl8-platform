/**
 * 数据库驱动选择器
 *
 * @description 根据配置和运行时条件选择最适合的数据库驱动
 *
 * @since 1.0.0
 */

import { Injectable } from "@nestjs/common";
import { Logger } from "@hl8/logger";
import { DatabaseDriverFactory } from "./database-driver.factory.js";
import { DatabaseDriver } from "./database-driver.interface.js";
import type { DatabaseDriverConfig } from "./database-driver.interface.js";

/**
 * 驱动选择策略
 */
export enum DriverSelectionStrategy {
  /** 基于配置选择 */
  CONFIG_BASED = "config_based",
  /** 基于负载选择 */
  LOAD_BASED = "load_based",
  /** 基于性能选择 */
  PERFORMANCE_BASED = "performance_based",
  /** 基于可用性选择 */
  AVAILABILITY_BASED = "availability_based",
}

/**
 * 驱动选择器
 *
 * @description 负责根据各种条件选择最适合的数据库驱动
 */
@Injectable()
export class DriverSelector {
  constructor(
    private readonly driverFactory: DatabaseDriverFactory,
    private readonly logger: Logger,
  ) {}

  /**
   * 选择数据库驱动
   *
   * @description 根据配置和策略选择最适合的数据库驱动
   *
   * @param config 数据库配置
   * @param strategy 选择策略
   * @returns 数据库驱动实例
   *
   * @throws {Error} 无法选择驱动时抛出
   *
   * @example
   * ```typescript
   * const selector = new DriverSelector(factory, logger);
   * const driver = selector.selectDriver({
   *   type: 'postgresql',
   *   connection: { ... }
   * }, DriverSelectionStrategy.CONFIG_BASED);
   * ```
   */
  selectDriver(
    config: DatabaseDriverConfig,
    strategy: DriverSelectionStrategy = DriverSelectionStrategy.CONFIG_BASED,
  ): DatabaseDriver {
    this.logger.log(`选择数据库驱动: ${config.type}`, {
      type: config.type,
      strategy,
      host: config.connection.host,
    });

    switch (strategy) {
      case DriverSelectionStrategy.CONFIG_BASED:
        return this.selectByConfig(config);

      case DriverSelectionStrategy.LOAD_BASED:
        return this.selectByLoad(config);

      case DriverSelectionStrategy.PERFORMANCE_BASED:
        return this.selectByPerformance(config);

      case DriverSelectionStrategy.AVAILABILITY_BASED:
        return this.selectByAvailability(config);

      default:
        this.logger.warn(`未知的选择策略: ${strategy}，使用配置选择`);
        return this.selectByConfig(config);
    }
  }

  /**
   * 基于配置选择驱动
   *
   * @description 直接使用配置中指定的数据库类型
   *
   * @param config 数据库配置
   * @returns 数据库驱动实例
   */
  private selectByConfig(config: DatabaseDriverConfig): DatabaseDriver {
    if (!this.driverFactory.isSupportedType(config.type)) {
      throw new Error(`不支持的数据库类型: ${config.type}`);
    }

    return this.driverFactory.createDriver(config);
  }

  /**
   * 基于负载选择驱动
   *
   * @description 根据当前系统负载选择最适合的数据库类型
   *
   * @param config 数据库配置
   * @returns 数据库驱动实例
   */
  private selectByLoad(config: DatabaseDriverConfig): DatabaseDriver {
    // 这里可以实现负载均衡逻辑
    // 目前简化实现，直接使用配置类型
    this.logger.log("基于负载选择驱动（简化实现）");
    return this.selectByConfig(config);
  }

  /**
   * 基于性能选择驱动
   *
   * @description 根据性能指标选择最适合的数据库类型
   *
   * @param config 数据库配置
   * @returns 数据库驱动实例
   */
  private selectByPerformance(config: DatabaseDriverConfig): DatabaseDriver {
    // 这里可以实现性能分析逻辑
    // 目前简化实现，直接使用配置类型
    this.logger.log("基于性能选择驱动（简化实现）");
    return this.selectByConfig(config);
  }

  /**
   * 基于可用性选择驱动
   *
   * @description 根据数据库可用性选择驱动
   *
   * @param config 数据库配置
   * @returns 数据库驱动实例
   */
  private selectByAvailability(config: DatabaseDriverConfig): DatabaseDriver {
    // 这里可以实现可用性检查逻辑
    // 目前简化实现，直接使用配置类型
    this.logger.log("基于可用性选择驱动（简化实现）");
    return this.selectByConfig(config);
  }

  /**
   * 获取推荐策略
   *
   * @description 根据环境条件推荐最适合的选择策略
   *
   * @param environment 环境类型
   * @returns 推荐的选择策略
   */
  getRecommendedStrategy(
    environment: "development" | "staging" | "production",
  ): DriverSelectionStrategy {
    switch (environment) {
      case "development":
        return DriverSelectionStrategy.CONFIG_BASED;
      case "staging":
        return DriverSelectionStrategy.AVAILABILITY_BASED;
      case "production":
        return DriverSelectionStrategy.PERFORMANCE_BASED;
      default:
        return DriverSelectionStrategy.CONFIG_BASED;
    }
  }

  /**
   * 验证驱动选择
   *
   * @description 验证选择的驱动是否满足要求
   *
   * @param driver 数据库驱动
   * @param requirements 要求列表
   * @returns 是否满足要求
   */
  async validateDriverSelection(
    driver: DatabaseDriver,
    _requirements: string[],
  ): Promise<boolean> {
    try {
      const isConnected = await driver.isConnected();
      if (!isConnected) {
        this.logger.warn("驱动未连接，无法验证选择");
        return false;
      }

      // 这里可以实现更复杂的验证逻辑
      // 目前简化实现，只检查连接状态
      return true;
    } catch (error) {
      this.logger.error(error as Error);
      return false;
    }
  }
}
