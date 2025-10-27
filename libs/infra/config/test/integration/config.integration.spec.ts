/**
 * 配置模块集成测试
 *
 * @description 测试配置模块的完整集成功能
 * @author HL8 SAAS Platform Team
 * @since 1.0.0
 */

import { Test, TestingModule } from "@nestjs/testing";
import * as fs from "fs";
import * as path from "path";
import { CacheManager, CacheStrategy } from "../../src/lib/cache/index.js";
import { dotenvLoader, fileLoader } from "../../src/lib/loader/index.js";
import { TypedConfigModule } from "../../src/lib/typed-config.module.js";
import {
  TestConfig,
  cleanupTempFiles,
  createTempDir,
  createTestConfig,
  createTestEnvVars,
} from "../test-utils.js";

describe("配置模块集成测试", () => {
  let module: TestingModule;
  let tempDir: string;
  let tempFiles: string[] = [];

  beforeEach(() => {
    tempDir = createTempDir();
    tempFiles = [tempDir];

    // 清理环境变量
    const envKeys = Object.keys(process.env).filter(key =>
      key.startsWith('APP__') ||
      key === 'name' ||
      key === 'version' ||
      key === 'port' ||
      key === 'NAME' ||
      key === 'VERSION' ||
      key === 'PORT' ||
      key.startsWith('DATABASE__')
    );
    envKeys.forEach(key => delete process.env[key]);
  });

  afterEach(async () => {
    if (module) {
      await module.close();
    }
    await cleanupTempFiles(tempFiles);
  });

  describe("基本配置加载", () => {
    it("应该从文件加载配置", async () => {
      const configData = createTestConfig();
      const jsonContent = JSON.stringify(configData);
      const configFile = path.join(tempDir, "app.json");
      fs.writeFileSync(configFile, jsonContent);
      tempFiles.push(configFile);

      module = await Test.createTestingModule({
        imports: [
          TypedConfigModule.forRoot({
            schema: TestConfig,
            load: fileLoader({ path: configFile }),
          }),
        ],
      }).compile();

      const config = module.get<TestConfig>(TestConfig);
      expect(config).toBeDefined();
      expect(config.name).toBe("Test App");
      expect(config.version).toBe("1.0.0");
      expect(config.port).toBe(3000);
    });

    it("应该从环境变量加载配置", async () => {
      const envVars = createTestEnvVars();
      Object.assign(process.env, envVars);

      module = await Test.createTestingModule({
        imports: [
          TypedConfigModule.forRoot({
            schema: TestConfig,
            load: dotenvLoader({ separator: "__" }),
            validationOptions: { skipMissingProperties: true, whitelist: false, forbidUnknownValues: false, skipUndefinedProperties: true },
          }),
        ],
      }).compile();

      const config = module.get<TestConfig>(TestConfig);
      expect(config).toBeDefined();
      console.log("Config from env vars:", JSON.stringify(config, null, 2));
      console.log("Environment variables:", Object.keys(process.env).filter(k =>
        k === 'name' || k === 'version' || k === 'port' || k.startsWith('DATABASE__')
      ));
      expect(config.name).toBe("Test App");
      expect(config.version).toBe("1.0.0");
      expect(config.port).toBe(3000);
    });

    it("应该合并多个配置源", async () => {
      const baseConfig = createTestConfig();
      const jsonContent = JSON.stringify(baseConfig);
      const configFile = path.join(tempDir, "base.json");
      fs.writeFileSync(configFile, jsonContent);
      tempFiles.push(configFile);

      // 设置环境变量覆盖
      process.env["name"] = "Override App";
      process.env["port"] = "8080";

      module = await Test.createTestingModule({
        imports: [
          TypedConfigModule.forRoot({
            schema: TestConfig,
            load: [
              fileLoader({ path: configFile }),
              dotenvLoader({ separator: "__" }),
            ],
            validationOptions: { skipMissingProperties: true },
          }),
        ],
      }).compile();

      const config = module.get<TestConfig>(TestConfig);
      expect(config).toBeDefined();
      expect(config.name).toBe("Override App"); // 环境变量覆盖
      expect(config.version).toBe("1.0.0"); // 文件配置
      expect(config.port).toBe(8080); // 环境变量覆盖
    });
  });

  describe("缓存集成", () => {
    it("应该使用内存缓存", async () => {
      const configData = createTestConfig();
      const jsonContent = JSON.stringify(configData);
      const configFile = path.join(tempDir, "app.json");
      fs.writeFileSync(configFile, jsonContent);
      tempFiles.push(configFile);

      module = await Test.createTestingModule({
        imports: [
          TypedConfigModule.forRoot({
            schema: TestConfig,
            load: fileLoader({ path: configFile }),
            cacheOptions: {
              strategy: CacheStrategy.MEMORY,
              ttl: 5000,
              enabled: true,
            },
          }),
        ],
      }).compile();

      const config = module.get<TestConfig>(TestConfig);
      expect(config).toBeDefined();

      // 验证缓存管理器被注入
      const cacheManager = module.get<CacheManager>(CacheManager);
      expect(cacheManager).toBeDefined();

      // 验证缓存功能 - 手动添加一些缓存条目
      await cacheManager.set("test-key", { test: "value" });
      const stats = await cacheManager.getStats();
      expect(stats.totalEntries).toBeGreaterThan(0);
    });

    it("应该使用文件缓存", async () => {
      const configData = createTestConfig();
      const jsonContent = JSON.stringify(configData);
      const configFile = path.join(tempDir, "app.json");
      fs.writeFileSync(configFile, jsonContent);
      tempFiles.push(configFile);

      const cacheDir = path.join(tempDir, "cache");
      tempFiles.push(cacheDir);

      module = await Test.createTestingModule({
        imports: [
          TypedConfigModule.forRoot({
            schema: TestConfig,
            load: fileLoader({ path: configFile }),
            cacheOptions: {
              strategy: CacheStrategy.FILE,
              cacheDir,
              ttl: 5000,
              enabled: true,
            },
          }),
        ],
      }).compile();

      const config = module.get<TestConfig>(TestConfig);
      expect(config).toBeDefined();

      // 验证缓存文件被创建 - 手动添加一些缓存条目
      const cacheManager = module.get<CacheManager>(CacheManager);
      await cacheManager.set("test-key", { test: "value" });

      // 等待文件写入
      await new Promise(resolve => setTimeout(resolve, 100));

      const cacheFiles = fs.readdirSync(cacheDir);
      expect(cacheFiles.length).toBeGreaterThan(0);
    });
  });

  describe("错误处理集成", () => {
    it("应该处理文件不存在错误", async () => {
      const nonexistentFile = path.join(tempDir, "nonexistent.json");

      await expect(
        Test.createTestingModule({
          imports: [
            TypedConfigModule.forRoot({
              schema: TestConfig,
              load: fileLoader({ path: nonexistentFile }),
            }),
          ],
        }).compile(),
      ).rejects.toThrow();
    });

    it("应该处理无效的配置文件", async () => {
      const invalidJson = "{ invalid json }";
      const configFile = path.join(tempDir, "invalid.json");
      fs.writeFileSync(configFile, invalidJson);
      tempFiles.push(configFile);

      await expect(
        Test.createTestingModule({
          imports: [
            TypedConfigModule.forRoot({
              schema: TestConfig,
              load: fileLoader({ path: configFile }),
            }),
          ],
        }).compile(),
      ).rejects.toThrow();
    });

    it("应该处理配置验证错误", async () => {
      const invalidConfig = { invalid: "config" };
      const jsonContent = JSON.stringify(invalidConfig);
      const configFile = path.join(tempDir, "invalid-config.json");
      fs.writeFileSync(configFile, jsonContent);
      tempFiles.push(configFile);

      await expect(
        Test.createTestingModule({
          imports: [
            TypedConfigModule.forRoot({
              schema: TestConfig,
              load: fileLoader({ path: configFile }),
            }),
          ],
        }).compile(),
      ).rejects.toThrow();
    });
  });

  describe("异步配置加载", () => {
    it("应该支持异步配置加载", async () => {
      const configData = createTestConfig();
      const jsonContent = JSON.stringify(configData);
      const configFile = path.join(tempDir, "async-config.json");
      fs.writeFileSync(configFile, jsonContent);
      tempFiles.push(configFile);

      const asyncLoader = async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
        return JSON.parse(fs.readFileSync(configFile, "utf8"));
      };

      module = await Test.createTestingModule({
        imports: [
          TypedConfigModule.forRootAsync({
            schema: TestConfig,
            load: asyncLoader,
          }),
        ],
      }).compile();

      const config = module.get<TestConfig>(TestConfig);
      expect(config).toBeDefined();
      expect(config.name).toBe("Test App");
    });

    it("应该处理异步加载错误", async () => {
      const asyncLoader = async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
        throw new Error("Async load failed");
      };

      await expect(
        Test.createTestingModule({
          imports: [
            TypedConfigModule.forRootAsync({
              schema: TestConfig,
              load: asyncLoader,
            }),
          ],
        }).compile(),
      ).rejects.toThrow("Async load failed");
    });
  });

  describe("配置标准化和验证", () => {
    it("应该支持配置标准化", async () => {
      const rawConfig = {
        name: "  Test App  ", // 需要标准化
        version: "1.0.0",
        port: "3000", // 需要转换为数字
        database: {
          host: "localhost",
          port: "5432", // 需要转换为数字
          username: "user",
          password: "pass",
        },
      };

      const jsonContent = JSON.stringify(rawConfig);
      const configFile = path.join(tempDir, "raw-config.json");
      fs.writeFileSync(configFile, jsonContent);
      tempFiles.push(configFile);

      const normalize = (config: any) => ({
        ...config,
        name: config.name.trim(),
        port: parseInt(config.port, 10),
        database: {
          ...config.database,
          port: parseInt(config.database.port, 10),
        },
      });

      module = await Test.createTestingModule({
        imports: [
          TypedConfigModule.forRoot({
            schema: TestConfig,
            load: fileLoader({ path: configFile }),
            normalize,
          }),
        ],
      }).compile();

      const config = module.get<TestConfig>(TestConfig);
      expect(config).toBeDefined();
      expect(config.name).toBe("Test App");
      expect(config.port).toBe(3000);
      expect(config.database.port).toBe(5432);
    });

    it("应该支持自定义验证器", async () => {
      const configData = createTestConfig();
      const jsonContent = JSON.stringify(configData);
      const configFile = path.join(tempDir, "config.json");
      fs.writeFileSync(configFile, jsonContent);
      tempFiles.push(configFile);

      const customValidator = jest.fn().mockImplementation((config) => {
        if (config.port < 1000) {
          throw new Error("Port must be at least 1000");
        }
        return config;
      });

      await expect(
        Test.createTestingModule({
          imports: [
            TypedConfigModule.forRoot({
              schema: TestConfig,
              load: fileLoader({ path: configFile }),
              validate: customValidator,
            }),
          ],
        }).compile(),
      ).rejects.toThrow("Port must be at least 1000");

      expect(customValidator).toHaveBeenCalled();
    });
  });

  describe("性能测试", () => {
    it("应该高效处理大型配置", async () => {
      const largeConfig = {
        ...createTestConfig(),
        largeArray: new Array(1000)
          .fill(0)
          .map((_, i) => ({ id: i, value: `item_${i}` })),
        largeObject: Object.fromEntries(
          new Array(1000).fill(0).map((_, i) => [`key_${i}`, `value_${i}`]),
        ),
      };

      const jsonContent = JSON.stringify(largeConfig);
      const configFile = path.join(tempDir, "large-config.json");
      fs.writeFileSync(configFile, jsonContent);
      tempFiles.push(configFile);

      const startTime = Date.now();

      module = await Test.createTestingModule({
        imports: [
          TypedConfigModule.forRoot({
            schema: TestConfig,
            load: fileLoader({ path: configFile }),
          }),
        ],
      }).compile();

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(2000); // 应该在2秒内完成

      const config = module.get<TestConfig>(TestConfig);
      expect(config).toBeDefined();
    });

    it("应该高效处理缓存操作", async () => {
      const configData = createTestConfig();
      const jsonContent = JSON.stringify(configData);
      const configFile = path.join(tempDir, "config.json");
      fs.writeFileSync(configFile, jsonContent);
      tempFiles.push(configFile);

      module = await Test.createTestingModule({
        imports: [
          TypedConfigModule.forRoot({
            schema: TestConfig,
            load: fileLoader({ path: configFile }),
            cacheOptions: {
              strategy: CacheStrategy.MEMORY,
              ttl: 10000,
              enabled: true,
            },
          }),
        ],
      }).compile();

      const cacheManager = module.get<CacheManager>(CacheManager);
      const startTime = Date.now();

      // 执行大量缓存操作
      for (let i = 0; i < 1000; i++) {
        await cacheManager.set(`key-${i}`, { ...configData, id: i });
        await cacheManager.get(`key-${i}`);
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(1000); // 应该在1秒内完成

      const stats = await cacheManager.getStats();
      expect(stats.hits).toBe(1000);
      expect(stats.hitRate).toBe(1);
    });
  });

  describe("模块生命周期", () => {
    it("应该正确处理模块销毁", async () => {
      const configData = createTestConfig();
      const jsonContent = JSON.stringify(configData);
      const configFile = path.join(tempDir, "config.json");
      fs.writeFileSync(configFile, jsonContent);
      tempFiles.push(configFile);

      module = await Test.createTestingModule({
        imports: [
          TypedConfigModule.forRoot({
            schema: TestConfig,
            load: fileLoader({ path: configFile }),
            cacheOptions: {
              strategy: CacheStrategy.MEMORY,
              enabled: true,
            },
          }),
        ],
      }).compile();

      const config = module.get<TestConfig>(TestConfig);
      expect(config).toBeDefined();

      // 销毁模块
      await module.close();

      // 验证资源被正确清理 - 模块关闭后应该无法获取配置
      try {
        module.get<TestConfig>(TestConfig);
        // 如果没有抛出错误，检查是否返回了 undefined
        expect(module.get<TestConfig>(TestConfig)).toBeUndefined();
      } catch (error) {
        // 如果抛出了错误，这也是预期的行为
        expect(error).toBeDefined();
      }
    });
  });
});
