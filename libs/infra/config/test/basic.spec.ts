/**
 * 基础测试
 *
 * @description 测试配置模块的基本功能
 * @author HL8 SAAS Platform Team
 * @since 1.0.0
 */

import { TypedConfigModule } from "../src/lib/typed-config.module.js";
import { TestConfig, createTestConfig } from "./test-utils.js";

describe("配置模块基础测试", () => {
  describe("基本功能", () => {
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
      expect(configModule.providers).toHaveLength(3); // TestConfig + CacheManager + TestDatabaseConfig
    });
  });

  describe("错误处理", () => {
    it("应该处理无效配置", () => {
      expect(() => {
        TypedConfigModule.forRoot({
          schema: Object,
          load: () => "invalid config" as any,
        });
      }).toThrow();
    });
  });
});
