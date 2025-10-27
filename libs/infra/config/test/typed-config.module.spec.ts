/**
 * 类型化配置模块测试
 *
 * @description 测试类型化配置模块的功能
 * @author HL8 SAAS Platform Team
 * @since 1.0.0
 */

import { Test, TestingModule } from "@nestjs/testing";
import { TypedConfigModule } from "../src/lib/typed-config.module.js";
import { TestConfig, createTestConfig } from "./test-utils.js";

describe("TypedConfigModule", () => {
  let module: TestingModule;

  afterEach(async () => {
    if (module) {
      await module.close();
    }
  });

  describe("forRoot", () => {
    it("应该创建配置模块", () => {
      const configModule = TypedConfigModule.forRoot({
        schema: TestConfig,
        load: () => createTestConfig(),
      });

      expect(configModule).toBeDefined();
      expect(configModule.module).toBe(TypedConfigModule);
      expect(configModule.global).toBe(true);
      expect(configModule.providers).toBeDefined();
      expect(configModule.exports).toBeDefined();
    });

    it("应该支持自定义配置加载器", () => {
      const customLoader = jest.fn().mockReturnValue(createTestConfig());

      const configModule = TypedConfigModule.forRoot({
        schema: TestConfig,
        load: customLoader,
      });

      expect(configModule).toBeDefined();
      expect(customLoader).toHaveBeenCalled();
    });

    it("应该支持配置标准化", () => {
      const normalize = jest.fn().mockImplementation((config) => ({
        ...config,
        normalized: true,
      }));

      const configModule = TypedConfigModule.forRoot({
        schema: TestConfig,
        load: () => createTestConfig(),
        normalize,
      });

      expect(configModule).toBeDefined();
    });

    it("应该支持缓存选项", () => {
      const configModule = TypedConfigModule.forRoot({
        schema: TestConfig,
        load: () => createTestConfig(),
        cacheOptions: {
          strategy: "memory" as any,
          ttl: 300000,
          enabled: true,
        },
      });

      expect(configModule).toBeDefined();
      expect(configModule.providers).toHaveLength(3); // Config + CacheManager + TestDatabaseConfig
    });

    it("应该处理无效配置", () => {
      expect(() => {
        TypedConfigModule.forRoot({
          schema: TestConfig,
          load: () => "invalid config" as any,
        });
      }).toThrow();
    });
  });

  describe("forRootAsync", () => {
    it("应该支持异步配置加载", async () => {
      const asyncLoader = jest.fn().mockResolvedValue(createTestConfig());

      const configModule = await TypedConfigModule.forRootAsync({
        schema: TestConfig,
        load: asyncLoader,
      });

      expect(configModule).toBeDefined();
      expect(asyncLoader).toHaveBeenCalled();
    });

    it("应该处理异步加载错误", async () => {
      const asyncLoader = jest
        .fn()
        .mockRejectedValue(new Error("Async load failed"));

      await expect(
        TypedConfigModule.forRootAsync({
          schema: TestConfig,
          load: asyncLoader,
        }),
      ).rejects.toThrow("Async load failed");
    });
  });

  describe("配置验证", () => {
    it("应该验证配置结构", () => {
      const invalidConfig = { invalid: "config" };

      expect(() => {
        TypedConfigModule.forRoot({
          schema: TestConfig,
          load: () => invalidConfig,
        });
      }).toThrow();
    });

    it("应该支持自定义验证器", () => {
      const customValidator = jest.fn().mockImplementation((config) => config);

      const configModule = TypedConfigModule.forRoot({
        schema: TestConfig,
        load: () => createTestConfig(),
        validate: customValidator,
      });

      expect(configModule).toBeDefined();
      expect(customValidator).toHaveBeenCalled();
    });
  });

  describe("模块集成", () => {
    it("应该正确注入配置", async () => {
      module = await Test.createTestingModule({
        imports: [
          TypedConfigModule.forRoot({
            schema: TestConfig,
            load: () => createTestConfig(),
          }),
        ],
      }).compile();

      const config = module.get<TestConfig>(TestConfig);
      expect(config).toBeDefined();
      expect(config.name).toBe("Test App");
      expect(config.version).toBe("1.0.0");
      expect(config.port).toBe(3000);
    });

    it("应该支持非全局模块", async () => {
      const configModule = TypedConfigModule.forRoot({
        schema: TestConfig,
        load: () => createTestConfig(),
        isGlobal: false,
      });

      expect(configModule.global).toBe(false);
    });
  });
});
