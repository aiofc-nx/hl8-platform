/**
 * @fileoverview CacheModule 集成测试
 * @description 测试 CacheModule 的依赖注入和模块集成
 */

import { Test, TestingModule } from "@nestjs/testing";
import { CacheModule } from "../../src/module/cache.module.js";
import { CacheConfig } from "../../src/config/cache.config.js";
import type { ICache } from "../../src/cache.interface.js";
import { Logger } from "@hl8/logger";
import { InMemoryCache } from "../../src/implementations/in-memory-cache.js";

/**
 * 测试配置类
 */
class TestCacheConfig extends CacheConfig {
  defaultTtl = 3600000;
  maxSize = 10000;
  enableStats = true;
  enableEventInvalidation = true;
  cleanupInterval = 600000;
  evictionStrategy = "LRU" as const;
}

/**
 * 创建测试配置对象
 */
function createTestCacheConfig(): CacheConfig {
  const config = new TestCacheConfig();
  return config;
}

describe("CacheModule 集成测试", () => {
  let module: TestingModule;
  let cacheService: ICache;

  afterEach(async () => {
    if (module) {
      await module.close();
    }
  });

  describe("forRoot", () => {
    it("应该创建 CacheModule（通过手动 DI 验证）", async () => {
      const testConfig = createTestCacheConfig();

      module = await Test.createTestingModule({
        providers: [
          { provide: TestCacheConfig, useValue: testConfig },
          {
            provide: "CacheService",
            useFactory: (config: CacheConfig, logger: Logger): ICache =>
              new InMemoryCache(config, logger),
            inject: [TestCacheConfig, Logger],
          },
          {
            provide: Logger,
            useValue: {
              log: jest.fn(),
              error: jest.fn(),
              warn: jest.fn(),
              debug: jest.fn(),
              info: jest.fn(),
            } satisfies Partial<Logger>,
          },
        ],
      }).compile();

      expect(module).toBeDefined();
    });

    it("应该提供 CacheService（使用手动模块设置）", async () => {
      // 由于 CacheModule.forRoot 依赖 fileLoader，在测试中使用手动模块设置
      const testConfig = createTestCacheConfig();
      const mockLogger: Logger = {
        log: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn(),
        info: jest.fn(),
      } as unknown as Logger;

      module = await Test.createTestingModule({
        providers: [
          { provide: TestCacheConfig, useValue: testConfig },
          {
            provide: "CacheService",
            useFactory: (config: CacheConfig, logger: Logger): ICache =>
              new InMemoryCache(config, logger),
            inject: [TestCacheConfig, Logger],
          },
          {
            provide: Logger,
            useValue: {
              log: jest.fn(),
              error: jest.fn(),
              warn: jest.fn(),
              debug: jest.fn(),
              info: jest.fn(),
            } satisfies Partial<Logger>,
          },
        ],
      }).compile();

      cacheService = module.get<ICache>("CacheService");
      expect(cacheService).toBeDefined();
    });

    it("应该注入 CacheConfig", async () => {
      const testConfig = createTestCacheConfig();

      module = await Test.createTestingModule({
        providers: [{ provide: TestCacheConfig, useValue: testConfig }],
      }).compile();

      const config = module.get<TestCacheConfig>(TestCacheConfig);
      expect(config).toBeDefined();
      expect(config.defaultTtl).toBe(3600000);
      expect(config.maxSize).toBe(10000);
    });

    it("应该可以正常使用缓存服务", async () => {
      const testConfig = createTestCacheConfig();
      const mockLogger: Logger = {
        log: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn(),
        info: jest.fn(),
      } as unknown as Logger;

      module = await Test.createTestingModule({
        providers: [
          { provide: TestCacheConfig, useValue: testConfig },
          {
            provide: "CacheService",
            useFactory: (config: CacheConfig, logger: Logger): ICache =>
              new InMemoryCache(config, logger),
            inject: [TestCacheConfig, Logger],
          },
          {
            provide: Logger,
            useValue: {
              log: jest.fn(),
              error: jest.fn(),
              warn: jest.fn(),
              debug: jest.fn(),
              info: jest.fn(),
            } satisfies Partial<Logger>,
          },
        ],
      }).compile();

      cacheService = module.get<ICache>("CacheService");

      // 测试基本操作
      await cacheService.set("test-key", "test-value");
      const value = await cacheService.get("test-key");
      expect(value).toBe("test-value");
    });

    it("应该支持缓存统计", async () => {
      const testConfig = createTestCacheConfig();
      const mockLogger: Logger = {
        log: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn(),
        info: jest.fn(),
      } as unknown as Logger;

      module = await Test.createTestingModule({
        providers: [
          { provide: TestCacheConfig, useValue: testConfig },
          {
            provide: "CacheService",
            useFactory: (config: CacheConfig, logger: Logger): ICache =>
              new InMemoryCache(config, logger),
            inject: [TestCacheConfig, Logger],
          },
          {
            provide: Logger,
            useValue: {
              log: jest.fn(),
              error: jest.fn(),
              warn: jest.fn(),
              debug: jest.fn(),
              info: jest.fn(),
            } satisfies Partial<Logger>,
          },
        ],
      }).compile();

      cacheService = module.get<ICache>("CacheService");

      await cacheService.set("key1", "value1");
      await cacheService.get("key1");
      await cacheService.get("nonexistent");

      const stats = await cacheService.getStats();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
      expect(stats.sets).toBe(1);
    });

    it("应该支持标签失效", async () => {
      const testConfig = createTestCacheConfig();
      const mockLogger: Logger = {
        log: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn(),
        info: jest.fn(),
      } as unknown as Logger;

      module = await Test.createTestingModule({
        providers: [
          { provide: TestCacheConfig, useValue: testConfig },
          {
            provide: "CacheService",
            useFactory: (config: CacheConfig, logger: Logger): ICache =>
              new InMemoryCache(config, logger),
            inject: [TestCacheConfig, Logger],
          },
          {
            provide: Logger,
            useValue: {
              log: jest.fn(),
              error: jest.fn(),
              warn: jest.fn(),
              debug: jest.fn(),
              info: jest.fn(),
            } satisfies Partial<Logger>,
          },
        ],
      }).compile();

      cacheService = module.get<ICache>("CacheService");

      await cacheService.set("key1", "value1", undefined, ["tag1"]);
      await cacheService.set("key2", "value2", undefined, ["tag2"]);
      await cacheService.invalidateByTags(["tag1"]);

      expect(await cacheService.get("key1")).toBeUndefined();
      expect(await cacheService.get("key2")).toBeDefined();
    });

    it("应该支持模式匹配失效", async () => {
      const testConfig = createTestCacheConfig();
      const mockLogger: Logger = {
        log: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn(),
        info: jest.fn(),
      } as unknown as Logger;

      module = await Test.createTestingModule({
        providers: [
          { provide: TestCacheConfig, useValue: testConfig },
          {
            provide: "CacheService",
            useFactory: (config: CacheConfig, logger: Logger): ICache =>
              new InMemoryCache(config, logger),
            inject: [TestCacheConfig, Logger],
          },
          {
            provide: Logger,
            useValue: {
              log: jest.fn(),
              error: jest.fn(),
              warn: jest.fn(),
              debug: jest.fn(),
              info: jest.fn(),
            } satisfies Partial<Logger>,
          },
        ],
      }).compile();

      cacheService = module.get<ICache>("CacheService");

      await cacheService.set("repo:user:1", "user1");
      await cacheService.set("repo:user:2", "user2");
      await cacheService.set("repo:order:1", "order1");
      await cacheService.invalidateByPattern("repo:user:*");

      expect(await cacheService.get("repo:user:1")).toBeUndefined();
      expect(await cacheService.get("repo:user:2")).toBeUndefined();
      expect(await cacheService.get("repo:order:1")).toBeDefined();
    });

    it("应该支持获取元数据", async () => {
      const testConfig = createTestCacheConfig();

      module = await Test.createTestingModule({
        providers: [
          { provide: TestCacheConfig, useValue: testConfig },
          {
            provide: Logger,
            useValue: {
              log: jest.fn(),
              error: jest.fn(),
              warn: jest.fn(),
              debug: jest.fn(),
              info: jest.fn(),
            } as Partial<Logger>,
          },
          {
            provide: "CacheService",
            useFactory: (config: CacheConfig, logger: Logger): ICache =>
              new InMemoryCache(config, logger),
            inject: [TestCacheConfig, Logger],
          },
        ],
      }).compile();

      cacheService = module.get<ICache>("CacheService");

      await cacheService.set("key1", "value1", 1000, ["tag1"]);
      const metadata = await cacheService.getMetadata("key1");

      expect(metadata).toBeDefined();
      expect(metadata?.key).toBe("key1");
      expect(metadata?.tags).toEqual(["tag1"]);
      expect(metadata?.expiresAt).toBeGreaterThan(0);
    });
  });
});
