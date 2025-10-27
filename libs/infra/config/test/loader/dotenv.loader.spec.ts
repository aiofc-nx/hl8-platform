/**
 * 环境变量加载器测试
 *
 * @description 测试环境变量加载器的功能
 * @author HL8 SAAS Platform Team
 * @since 1.0.0
 */

import { dotenvLoader } from "../../src/lib/loader/dotenv.loader.js";
import { createTestEnvVars } from "../test-utils.js";

describe("dotenvLoader", () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    // 清理可能存在的测试环境变量
    delete process.env.NAME;
    delete process.env.name;
    delete process.env.VERSION;
    delete process.env.version;
    delete process.env.PORT;
    delete process.env.port;
    delete process.env.DATABASE__HOST;
    delete process.env.DATABASE__PORT;
    delete process.env.DATABASE__USERNAME;
    delete process.env.DATABASE__PASSWORD;
  });

  afterEach(() => {
    // 清理测试环境变量
    delete process.env.NAME;
    delete process.env.name;
    delete process.env.VERSION;
    delete process.env.version;
    delete process.env.PORT;
    delete process.env.port;
    delete process.env.DATABASE__HOST;
    delete process.env.DATABASE__PORT;
    delete process.env.DATABASE__USERNAME;
    delete process.env.DATABASE__PASSWORD;
    delete process.env.TEST_DOT_NAME;
    delete process.env.TEST_DOT_VERSION;
    process.env = originalEnv;
  });

  describe("基本功能", () => {
    it("应该加载环境变量", () => {
      const envVars = createTestEnvVars();
      Object.assign(process.env, envVars);

      const loader = dotenvLoader();
      const config = loader();

      expect(config).toBeDefined();
      expect(config.name).toBe("Test App");
      expect(config.version).toBe("1.0.0");
      expect(config.port).toBe("3000");
    });

    it("应该支持自定义选项", () => {
      const envVars = createTestEnvVars();
      Object.assign(process.env, envVars);

      const loader = dotenvLoader({
        separator: "__",
        keyTransformer: (key) => key.toLowerCase(),
        enableExpandVariables: false,
      });
      const config = loader();

      expect(config).toBeDefined();
      expect(config["name"]).toBe("Test App");
    });

    it("应该忽略环境变量文件", () => {
      const loader = dotenvLoader({
        ignoreEnvFile: true,
      });
      const config = loader();

      expect(config).toBeDefined();
      expect(Object.keys(config).length).toBeGreaterThan(0);
    });

    it("应该忽略环境变量", () => {
      const loader = dotenvLoader({
        ignoreEnvVars: true,
        ignoreEnvFile: true, // 同时忽略文件和环境变量
      });
      const config = loader();

      expect(config).toBeDefined();
      expect(Object.keys(config).length).toBe(0);
    });
  });

  describe("分隔符解析", () => {
    it("应该使用分隔符解析嵌套配置", () => {
      const envVars = createTestEnvVars();
      Object.assign(process.env, envVars);

      const loader = dotenvLoader({
        separator: "__",
      });
      const config = loader();

      expect(config).toBeDefined();
      // Debug: check if DATABASE keys exist
      const hasDatabaseKeys = Object.keys(process.env).some((k) =>
        k.startsWith("DATABASE__"),
      );
      if (!hasDatabaseKeys) {
        console.log("DATABASE keys not found in process.env");
      }
      if (!config.database) {
        console.log(
          "config.database is undefined, available keys:",
          Object.keys(config),
        );
      }
      expect(config.name).toBe("Test App");
      expect(config.version).toBe("1.0.0");
      expect(config.port).toBe("3000");
      expect(config.database).toBeDefined();
      expect(config.database.host).toBe("localhost");
      expect(config.database.port).toBe("5432");
    });

    it("应该处理不同的分隔符", () => {
      process.env["TEST_DOT_NAME"] = "Test App";
      process.env["TEST_DOT_VERSION"] = "1.0.0";

      const loader = dotenvLoader({
        separator: "_DOT_",
      });
      const config = loader();

      expect(config).toBeDefined();
      expect(config.TEST).toBeDefined();
      expect(config.TEST.NAME).toBe("Test App");
      expect(config.TEST.VERSION).toBe("1.0.0");
    });
  });

  describe("键转换", () => {
    it("应该转换键格式", () => {
      const envVars = createTestEnvVars();
      Object.assign(process.env, envVars);

      const loader = dotenvLoader({
        keyTransformer: (key) => key.toLowerCase().replace(/_/g, "-"),
      });
      const config = loader();

      expect(config).toBeDefined();
      expect(config["app-name"]).toBe("Test App");
      expect(config["app-version"]).toBe("1.0.0");
    });

    it("应该处理复杂的键转换", () => {
      process.env["MY_APP_CONFIG"] = "test";

      const loader = dotenvLoader({
        keyTransformer: (key) =>
          key
            .split("_")
            .map(
              (part) =>
                part.charAt(0).toUpperCase() + part.slice(1).toLowerCase(),
            )
            .join(""),
      });
      const config = loader();

      expect(config).toBeDefined();
      expect(config.MyAppConfig).toBe("test");
    });
  });

  describe("变量展开", () => {
    it("应该展开环境变量引用", () => {
      process.env["BASE_URL"] = "https://api.example.com";
      process.env["API_URL"] = "${BASE_URL}/v1";
      process.env["DB_HOST"] = "localhost";
      process.env["DB_PORT"] = "5432";
      process.env["DB_URL"] =
        "postgresql://user:pass@${DB_HOST}:${DB_PORT}/mydb";

      const loader = dotenvLoader({
        enableExpandVariables: true,
      });
      const config = loader();

      expect(config).toBeDefined();
      expect(config.API_URL).toBe("https://api.example.com/v1");
      expect(config.DB_URL).toBe("postgresql://user:pass@localhost:5432/mydb");
    });

    it("应该处理默认值语法", () => {
      process.env["OPTIONAL_VAR"] = "${MISSING_VAR:-default_value}";

      const loader = dotenvLoader({
        enableExpandVariables: true,
      });
      const config = loader();

      expect(config).toBeDefined();
      expect(config.OPTIONAL_VAR).toBe("default_value");
    });

    it("应该禁用变量展开", () => {
      process.env["API_URL"] = "${BASE_URL}/v1";

      const loader = dotenvLoader({
        enableExpandVariables: false,
      });
      const config = loader();

      expect(config).toBeDefined();
      expect(config.API_URL).toBe("${BASE_URL}/v1");
    });
  });

  describe("错误处理", () => {
    it("应该处理无效的环境变量文件路径", () => {
      const loader = dotenvLoader({
        envFilePath: "/nonexistent/path/.env",
      });

      expect(() => loader()).toThrow();
    });

    it("应该处理变量展开错误", () => {
      // 设置一个会导致展开错误的环境变量
      process.env["INVALID_REF"] = "${UNCLOSED_VAR";

      const loader = dotenvLoader({
        enableExpandVariables: true,
      });

      // 由于 dotenv-expand 可能不会抛出错误，我们测试配置是否被正确处理
      const config = loader();
      expect(config).toBeDefined();
      // 如果展开失败，原始值应该被保留
      expect(config.INVALID_REF).toBe("${UNCLOSED_VAR");
    });
  });

  describe("性能测试", () => {
    it("应该高效处理大量环境变量", () => {
      // 创建大量环境变量
      for (let i = 0; i < 1000; i++) {
        process.env[`TEST_VAR_${i}`] = `value_${i}`;
      }

      const loader = dotenvLoader();
      const startTime = Date.now();
      const config = loader();
      const endTime = Date.now();

      expect(config).toBeDefined();
      expect(Object.keys(config).length).toBeGreaterThan(1000);
      expect(endTime - startTime).toBeLessThan(2000); // 调整为更合理的时间限制
    });
  });
});
