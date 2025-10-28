/**
 * @fileoverview 配置热重载服务
 * @description 支持配置的动态更新和热重载
 */

import { Injectable, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import { Logger } from "@hl8/logger";
import { EventEmitter } from "events";
import {
  ApplicationKernelConfig,
  ConfigUpdateCallback,
} from "./config.interface.js";
import { ApplicationKernelConfigService } from "./application-kernel.config.js";
import { ConfigLoaderService } from "./config-loader.service.js";

/**
 * 配置热重载服务
 * @description 支持配置的动态更新和热重载
 */
@Injectable()
export class ConfigHotReloadService
  extends EventEmitter
  implements OnModuleInit, OnModuleDestroy
{
  private isWatching = false;
  private watchInterval?: NodeJS.Timeout;
  private lastConfigHash?: string;

  constructor(
    private readonly logger: Logger,
    private readonly configService: ApplicationKernelConfigService,
    private readonly configLoader: ConfigLoaderService,
  ) {
    super();
  }

  /**
   * 模块初始化
   */
  async onModuleInit(): Promise<void> {
    this.logger.log("配置热重载服务初始化");
    await this.startWatching();
  }

  /**
   * 模块销毁
   */
  async onModuleDestroy(): Promise<void> {
    this.logger.log("配置热重载服务销毁");
    await this.stopWatching();
  }

  /**
   * 开始监听配置变化
   */
  public async startWatching(): Promise<void> {
    if (this.isWatching) {
      this.logger.warn("配置监听已在运行中");
      return;
    }

    this.logger.log("开始监听配置变化");
    this.isWatching = true;

    // 记录初始配置哈希
    this.lastConfigHash = this.getConfigHash(this.configService.getConfig());

    // 设置定时检查（每30秒检查一次）
    this.watchInterval = setInterval(async () => {
      await this.checkForConfigChanges();
    }, 30000);

    this.emit("watching-started");
  }

  /**
   * 停止监听配置变化
   */
  public async stopWatching(): Promise<void> {
    if (!this.isWatching) {
      this.logger.warn("配置监听未在运行");
      return;
    }

    this.logger.log("停止监听配置变化");
    this.isWatching = false;

    if (this.watchInterval) {
      clearInterval(this.watchInterval);
      this.watchInterval = undefined;
    }

    this.emit("watching-stopped");
  }

  /**
   * 手动触发配置重载
   * @param source 重载源
   */
  public async reloadConfig(
    source: "environment" | "file" | "manual" = "manual",
  ): Promise<boolean> {
    this.logger.log("手动触发配置重载", { source });

    try {
      let newConfig: ApplicationKernelConfig;

      switch (source) {
        case "environment":
          newConfig = await this.configLoader.loadFromEnvironment();
          break;
        case "file":
          // 这里需要配置文件路径，暂时使用环境变量
          throw new Error("文件重载功能需要配置文件路径");
        case "manual":
        default:
          // 从当前环境重新加载
          newConfig = await this.configLoader.loadFromEnvironment();
          break;
      }

      // 验证新配置
      const validationResult =
        await this.configLoader.validateConfig(newConfig);
      if (!validationResult.valid) {
        this.logger.error("配置重载失败：配置验证不通过", {
          errors: validationResult.errors,
        });
        this.emit("reload-failed", {
          reason: "validation-failed",
          errors: validationResult.errors,
        });
        return false;
      }

      // 更新配置
      const updateResult = await this.configService.updateConfig(newConfig);
      if (!updateResult.valid) {
        this.logger.error("配置重载失败：配置更新不通过", {
          errors: updateResult.errors,
        });
        this.emit("reload-failed", {
          reason: "update-failed",
          errors: updateResult.errors,
        });
        return false;
      }

      this.logger.log("配置重载成功");
      this.emit("config-reloaded", { source, config: newConfig });
      return true;
    } catch (error) {
      this.logger.error("配置重载过程中发生错误", {
        error: error instanceof Error ? error.message : String(error),
      });
      this.emit("reload-failed", { reason: "error", error });
      return false;
    }
  }

  /**
   * 注册配置更新回调
   * @param callback 回调函数
   */
  public onConfigUpdate(callback: ConfigUpdateCallback): void {
    this.configService.onConfigUpdate(callback);
  }

  /**
   * 检查配置是否发生变化
   */
  private async checkForConfigChanges(): Promise<void> {
    try {
      // 从环境变量重新加载配置
      const newConfig = await this.configLoader.loadFromEnvironment();
      const newConfigHash = this.getConfigHash(newConfig);

      if (newConfigHash !== this.lastConfigHash) {
        this.logger.log("检测到配置变化，开始重载");
        this.lastConfigHash = newConfigHash;

        const success = await this.reloadConfig("environment");
        if (success) {
          this.emit("config-changed", { config: newConfig });
        }
      }
    } catch (error) {
      this.logger.error("检查配置变化时发生错误", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * 获取配置的哈希值
   * @param config 配置对象
   * @returns 哈希值
   */
  private getConfigHash(config: ApplicationKernelConfig): string {
    // 简单的哈希算法，实际项目中可以使用更复杂的算法
    const configString = JSON.stringify(config, Object.keys(config).sort());
    return this.simpleHash(configString);
  }

  /**
   * 简单哈希函数
   * @param str 字符串
   * @returns 哈希值
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // 转换为32位整数
    }
    return hash.toString(36);
  }

  /**
   * 获取当前监听状态
   * @returns 是否正在监听
   */
  public isWatchingConfig(): boolean {
    return this.isWatching;
  }

  /**
   * 获取配置变化统计
   * @returns 统计信息
   */
  public getWatchStats(): {
    isWatching: boolean;
    lastCheckTime?: Date;
    totalReloads: number;
  } {
    return {
      isWatching: this.isWatching,
      lastCheckTime: this.lastCheckTime,
      totalReloads: this.totalReloads,
    };
  }

  private lastCheckTime?: Date;
  private totalReloads = 0;

  /**
   * 更新检查时间
   */
  private updateCheckTime(): void {
    this.lastCheckTime = new Date();
  }

  /**
   * 增加重载计数
   */
  private incrementReloadCount(): void {
    this.totalReloads++;
  }
}
