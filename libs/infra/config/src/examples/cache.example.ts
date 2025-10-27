/**
 * 缓存使用示例
 *
 * @description 展示如何使用配置缓存功能
 * @author HL8 SAAS Platform Team
 * @since 1.0.0
 */

import { CacheManager, CacheStrategy } from "../lib/cache/index.js";
import { dotenvLoader, fileLoader } from "../lib/loader/index.js";
import { TypedConfigModule } from "../lib/typed-config.module.js";

/**
 * 数据库配置类
 *
 * @description 数据库配置示例
 * @class DatabaseConfig
 * @since 1.0.0
 */
export class DatabaseConfig {
  public readonly host!: string;
  public readonly port!: number;
  public readonly username!: string;
  public readonly password!: string;
}

/**
 * 应用配置类
 *
 * @description 应用配置示例
 * @class AppConfig
 * @since 1.0.0
 */
export class AppConfig {
  public readonly name!: string;
  public readonly version!: string;
  public readonly database!: DatabaseConfig;
}

/**
 * 基本缓存使用示例
 *
 * @description 展示基本的缓存使用方式
 * @since 1.0.0
 */
export function basicCacheExample() {
  return TypedConfigModule.forRoot({
    schema: AppConfig,
    load: [
      fileLoader({ path: "./config/app.yml" }),
      dotenvLoader({ separator: "__" }),
    ],
    cacheOptions: {
      strategy: CacheStrategy.MEMORY,
      ttl: 300000, // 5 分钟
      maxSize: 1000,
      enabled: true,
    },
  });
}

/**
 * 文件缓存使用示例
 *
 * @description 展示文件缓存的使用方式
 * @since 1.0.0
 */
export function fileCacheExample() {
  return TypedConfigModule.forRoot({
    schema: AppConfig,
    load: [
      fileLoader({ path: "./config/app.yml" }),
      dotenvLoader({ separator: "__" }),
    ],
    cacheOptions: {
      strategy: CacheStrategy.FILE,
      cacheDir: "./.cache/config",
      ttl: 600000, // 10 分钟
      // compress: true, // 暂时注释掉，因为 CacheOptions 中没有这个属性
      enabled: true,
    },
  });
}

/**
 * 缓存管理器使用示例
 *
 * @description 展示如何直接使用缓存管理器
 * @since 1.0.0
 */
export async function cacheManagerExample() {
  // 创建缓存管理器
  const cacheManager = new CacheManager({
    strategy: CacheStrategy.MEMORY,
    ttl: 300000,
    maxSize: 1000,
    enabled: true,
  });

  // 添加事件监听器

  cacheManager.on("hit", (event: { key: string }) => {
    console.log(`Cache hit: ${event.key}`);
  });

  cacheManager.on("miss", (event: { key: string }) => {
    console.log(`Cache miss: ${event.key}`);
  });

  // 设置缓存
  await cacheManager.set("app.config", {
    name: "My App",
    version: "1.0.0",
    database: {
      host: "localhost",
      port: 5432,
      username: "user",
      password: "password",
    },
  });

  // 获取缓存
  const config = await cacheManager.get("app.config");
  console.log("Cached config:", config);

  // 获取统计信息
  const stats = await cacheManager.getStats();
  console.log("Cache stats:", stats);

  // 清理资源
  cacheManager.destroy();
}

/**
 * 高级缓存配置示例
 *
 * @description 展示高级缓存配置选项
 * @since 1.0.0
 */
export function advancedCacheExample() {
  return TypedConfigModule.forRoot({
    schema: AppConfig,
    load: [
      fileLoader({ path: "./config/app.yml" }),
      dotenvLoader({ separator: "__" }),
    ],
    cacheOptions: {
      strategy: CacheStrategy.MEMORY,
      keyPrefix: "myapp",
      ttl: 300000,
      maxSize: 5000,
      // maxMemory: 50 * 1024 * 1024, // 50MB - 暂时注释掉，因为 CacheOptions 中没有这个属性
      // cleanupInterval: 60000, // 1 分钟 - 暂时注释掉，因为 CacheOptions 中没有这个属性
      keyGenerator: (key: string) => `config:${key}:${Date.now()}`,
      enabled: true,
    },
  });
}

/**
 * 缓存性能监控示例
 *
 * @description 展示如何监控缓存性能
 * @since 1.0.0
 */
export async function cacheMonitoringExample() {
  const cacheManager = new CacheManager({
    strategy: CacheStrategy.MEMORY,
    ttl: 300000,
    maxSize: 1000,
    enabled: true,
  });

  // 监控所有缓存事件
  const eventTypes = [
    "hit",
    "miss",
    "set",
    "delete",
    "expire",
    "clear",
  ] as const;

  for (const eventType of eventTypes) {
    cacheManager.on(
      eventType,
      (event: {
        timestamp: Date;
        type: string;
        key: string;
        data?: unknown;
      }) => {
        console.log(
          `[${event.timestamp.toISOString()}] ${event.type.toUpperCase()}: ${
            event.key
          }`,
        );
        if (event.data) {
          console.log("Event data:", event.data);
        }
      },
    );
  }

  // 定期输出统计信息
  setInterval(async () => {
    const stats = await cacheManager.getStats();
    console.log("Cache Performance:", {
      hitRate: `${(stats.hitRate * 100).toFixed(2)}%`,
      totalEntries: stats.totalEntries,
      totalSize: `${(stats.totalSize / 1024).toFixed(2)} KB`,
      averageAccessTime: `${stats.averageAccessTime.toFixed(2)} ms`,
    });
  }, 30000); // 每30秒输出一次

  return cacheManager;
}
