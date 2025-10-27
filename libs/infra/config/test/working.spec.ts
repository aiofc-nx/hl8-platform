/**
 * 工作测试
 *
 * @description 测试配置模块的基本功能，不使用验证
 * @author HL8 SAAS Platform Team
 * @since 1.0.0
 */

import { dotenvLoader, fileLoader } from "../src/lib/loader/index.js";
import { TypedConfigModule } from "../src/lib/typed-config.module.js";

describe("配置模块工作测试", () => {
  describe("基本功能", () => {
    it("应该创建配置模块（无验证）", () => {
      const configModule = TypedConfigModule.forRoot({
        schema: Object as any,
        load: () => ({ name: "Test App", version: "1.0.0" }),
        validate: (config) => config, // 跳过验证
      });

      expect(configModule).toBeDefined();
      expect(configModule.module).toBe(TypedConfigModule);
      expect(configModule.global).toBe(true);
      expect(configModule.providers).toBeDefined();
      expect(configModule.exports).toBeDefined();
    });

    it("应该支持自定义配置加载器", () => {
      const customLoader = jest.fn().mockReturnValue({ name: "Test App" });

      const configModule = TypedConfigModule.forRoot({
        schema: Object as any,
        load: customLoader,
        validate: (config) => config, // 跳过验证
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
        schema: Object as any,
        load: () => ({ name: "Test App" }),
        normalize,
        validate: (config) => config, // 跳过验证
      });

      expect(configModule).toBeDefined();
    });

    it("应该支持缓存选项", () => {
      const configModule = TypedConfigModule.forRoot({
        schema: Object as any,
        load: () => ({ name: "Test App" }),
        cacheOptions: {
          strategy: "memory" as any,
          ttl: 300000,
          enabled: true,
        },
        validate: (config) => config, // 跳过验证
      });

      expect(configModule).toBeDefined();
      expect(configModule.providers).toHaveLength(2); // Config + CacheManager
    });
  });

  describe("加载器测试", () => {
    it("应该支持文件加载器", () => {
      const loader = fileLoader({
        path: "./test-config.json",
      });

      expect(loader).toBeDefined();
      expect(typeof loader).toBe("function");
    });

    it("应该支持环境变量加载器", () => {
      const loader = dotenvLoader({
        separator: "__",
      });

      expect(loader).toBeDefined();
      expect(typeof loader).toBe("function");
    });
  });

  describe("错误处理", () => {
    it("应该处理无效配置", () => {
      expect(() => {
        TypedConfigModule.forRoot({
          schema: Object as any,
          load: () => "invalid config" as any,
          validate: (config) => {
            if (typeof config === "string") {
              throw new Error("Invalid config type");
            }
            return config;
          },
        });
      }).toThrow("Configuration should be an object");
    });
  });
});
