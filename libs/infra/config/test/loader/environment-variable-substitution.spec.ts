/**
 * 环境变量替换测试
 *
 * @description 专门测试环境变量替换功能的各种场景
 * @author HL8 SAAS Platform Team
 * @since 1.0.0
 */

import * as fs from "fs";
import * as path from "path";
import { fileLoader } from "../../src/lib/loader/file.loader.js";
import { cleanupTempFiles, createTempDir } from "../test-utils.js";

describe("环境变量替换功能", () => {
  let tempDir: string;
  let tempFiles: string[] = [];

  beforeEach(() => {
    tempDir = createTempDir();
    tempFiles = [tempDir];
    // 清理环境变量
    delete process.env["TEST_VAR"];
    delete process.env["TEST_VAR_WITH_DEFAULT"];
    delete process.env["TEST_VAR_EMPTY"];
    delete process.env["TEST_VAR_WITH_HYPHENS"];
    delete process.env["DB_HOST"];
    delete process.env["DB_PORT"];
    delete process.env["JWT_SECRET"];
    delete process.env["LOG_LEVEL"];
    delete process.env["REDIS_PASSWORD"];
  });

  afterEach(async () => {
    await cleanupTempFiles(tempFiles);
  });

  describe("基础环境变量替换", () => {
    it("应该替换简单的环境变量", () => {
      process.env["TEST_VAR"] = "test-value";

      const jsonContent = JSON.stringify({
        value: "${TEST_VAR}",
      });
      const filePath = path.join(tempDir, "config.json");
      fs.writeFileSync(filePath, jsonContent);
      tempFiles.push(filePath);

      const loader = fileLoader({ path: filePath });
      const config = loader();

      expect(config["value"]).toBe("test-value");
    });

    it("应该保持未定义的环境变量不变", () => {
      const jsonContent = JSON.stringify({
        value: "${UNDEFINED_VAR}",
      });
      const filePath = path.join(tempDir, "config.json");
      fs.writeFileSync(filePath, jsonContent);
      tempFiles.push(filePath);

      const loader = fileLoader({ path: filePath });
      const config = loader();

      expect(config["value"]).toBe("${UNDEFINED_VAR}");
    });
  });

  describe("默认值语法测试", () => {
    it("应该使用环境变量值当变量存在时", () => {
      process.env["TEST_VAR_WITH_DEFAULT"] = "env-value";

      const jsonContent = JSON.stringify({
        value: "${TEST_VAR_WITH_DEFAULT:-default-value}",
      });
      const filePath = path.join(tempDir, "config.json");
      fs.writeFileSync(filePath, jsonContent);
      tempFiles.push(filePath);

      const loader = fileLoader({ path: filePath });
      const config = loader();

      expect(config.value).toBe("env-value");
    });

    it("应该使用默认值当环境变量不存在时", () => {
      const jsonContent = JSON.stringify({
        value: "${UNDEFINED_VAR:-default-value}",
      });
      const filePath = path.join(tempDir, "config.json");
      fs.writeFileSync(filePath, jsonContent);
      tempFiles.push(filePath);

      const loader = fileLoader({ path: filePath });
      const config = loader();

      expect(config.value).toBe("default-value");
    });

    it("应该处理空默认值", () => {
      const jsonContent = JSON.stringify({
        value: "${UNDEFINED_VAR:-}",
      });
      const filePath = path.join(tempDir, "config.json");
      fs.writeFileSync(filePath, jsonContent);
      tempFiles.push(filePath);

      const loader = fileLoader({ path: filePath });
      const config = loader();

      expect(config.value).toBe("");
    });

    it("应该处理包含连字符的默认值", () => {
      const jsonContent = JSON.stringify({
        value:
          "${UNDEFINED_VAR:-your-super-secret-jwt-key-change-in-production}",
      });
      const filePath = path.join(tempDir, "config.json");
      fs.writeFileSync(filePath, jsonContent);
      tempFiles.push(filePath);

      const loader = fileLoader({ path: filePath });
      const config = loader();

      expect(config.value).toBe(
        "your-super-secret-jwt-key-change-in-production",
      );
    });

    it("应该处理包含特殊字符的默认值", () => {
      const jsonContent = JSON.stringify({
        value: "${UNDEFINED_VAR:-default@value#with$special%chars}",
      });
      const filePath = path.join(tempDir, "config.json");
      fs.writeFileSync(filePath, jsonContent);
      tempFiles.push(filePath);

      const loader = fileLoader({ path: filePath });
      const config = loader();

      expect(config.value).toBe("default@value#with$special%chars");
    });
  });

  describe("复杂配置场景测试", () => {
    it("应该处理嵌套对象中的环境变量", () => {
      process.env["DB_HOST"] = "production-db";
      process.env["DB_PORT"] = "5432";

      const jsonContent = JSON.stringify({
        database: {
          host: "${DB_HOST:-localhost}",
          port: "${DB_PORT:-5432}",
          ssl: false,
        },
      });
      const filePath = path.join(tempDir, "config.json");
      fs.writeFileSync(filePath, jsonContent);
      tempFiles.push(filePath);

      const loader = fileLoader({ path: filePath });
      const config = loader();

      expect(config.database.host).toBe("production-db");
      expect(config.database.port).toBe("5432");
      expect(config.database.ssl).toBe(false);
    });

    it("应该处理数组中的环境变量", () => {
      process.env["CORS_ORIGIN_1"] = "https://app1.example.com";
      process.env["CORS_ORIGIN_2"] = "https://app2.example.com";

      const jsonContent = JSON.stringify({
        cors: {
          origins: [
            "${CORS_ORIGIN_1:-http://localhost:3000}",
            "${CORS_ORIGIN_2:-http://localhost:3001}",
            "http://localhost:3002",
          ],
        },
      });
      const filePath = path.join(tempDir, "config.json");
      fs.writeFileSync(filePath, jsonContent);
      tempFiles.push(filePath);

      const loader = fileLoader({ path: filePath });
      const config = loader();

      expect(config.cors.origins).toEqual([
        "https://app1.example.com",
        "https://app2.example.com",
        "http://localhost:3002",
      ]);
    });

    it("应该处理混合的环境变量和默认值", () => {
      process.env["JWT_SECRET"] = "production-secret";
      // LOG_LEVEL 未设置，应该使用默认值

      const jsonContent = JSON.stringify({
        auth: {
          jwtSecret:
            "${JWT_SECRET:-your-super-secret-jwt-key-change-in-production}",
          jwtExpirationTime: 3600,
        },
        logging: {
          level: "${LOG_LEVEL:-info}",
          filePath: "./logs/api.log",
        },
      });
      const filePath = path.join(tempDir, "config.json");
      fs.writeFileSync(filePath, jsonContent);
      tempFiles.push(filePath);

      const loader = fileLoader({ path: filePath });
      const config = loader();

      expect(config.auth.jwtSecret).toBe("production-secret");
      expect(config.logging.level).toBe("info");
    });
  });

  describe("YAML文件环境变量替换", () => {
    it("应该在YAML文件中处理环境变量替换", () => {
      process.env["DB_HOST"] = "yaml-db-host";
      process.env["DB_PORT"] = "5433";

      const yamlContent = `
database:
  host: "\${DB_HOST:-localhost}"
  port: "\${DB_PORT:-5432}"
  ssl: false
`;
      const filePath = path.join(tempDir, "config.yaml");
      fs.writeFileSync(filePath, yamlContent);
      tempFiles.push(filePath);

      const loader = fileLoader({ path: filePath });
      const config = loader();

      expect(config.database.host).toBe("yaml-db-host");
      expect(config.database.port).toBe("5433");
    });

    it("应该在YAML文件中处理复杂的默认值", () => {
      const yamlContent = `
auth:
  jwtSecret: "\${JWT_SECRET:-your-super-secret-jwt-key-change-in-production}"
  jwtRefreshSecret: "\${JWT_REFRESH_SECRET:-your-super-secret-refresh-key}"
  passwordSaltRounds: 12
`;
      const filePath = path.join(tempDir, "config.yaml");
      fs.writeFileSync(filePath, yamlContent);
      tempFiles.push(filePath);

      const loader = fileLoader({ path: filePath });
      const config = loader();

      expect(config.auth.jwtSecret).toBe(
        "your-super-secret-jwt-key-change-in-production",
      );
      expect(config.auth.jwtRefreshSecret).toBe(
        "your-super-secret-refresh-key",
      );
      expect(config.auth.passwordSaltRounds).toBe(12);
    });
  });

  describe("边界情况测试", () => {
    it("应该处理空字符串环境变量", () => {
      process.env["EMPTY_VAR"] = "";

      const jsonContent = JSON.stringify({
        value: "${EMPTY_VAR:-default}",
      });
      const filePath = path.join(tempDir, "config.json");
      fs.writeFileSync(filePath, jsonContent);
      tempFiles.push(filePath);

      const loader = fileLoader({ path: filePath });
      const config = loader();

      // 空字符串应该被视为已定义，所以使用空字符串而不是默认值
      expect(config.value).toBe("");
    });

    it("应该处理包含冒号的环境变量名", () => {
      process.env["VAR:WITH:COLONS"] = "colon-value";

      const jsonContent = JSON.stringify({
        value: "${VAR:WITH:COLONS:-default}",
      });
      const filePath = path.join(tempDir, "config.json");
      fs.writeFileSync(filePath, jsonContent);
      tempFiles.push(filePath);

      const loader = fileLoader({ path: filePath });
      const config = loader();

      // 由于环境变量名包含冒号，不符合标准环境变量命名规范，保持原样
      expect(config.value).toBe("${VAR:WITH:COLONS:-default}");
    });

    it("应该处理包含连字符的环境变量名", () => {
      process.env["VAR-WITH-HYPHENS"] = "hyphen-value";

      const jsonContent = JSON.stringify({
        value: "${VAR-WITH-HYPHENS:-default}",
      });
      const filePath = path.join(tempDir, "config.json");
      fs.writeFileSync(filePath, jsonContent);
      tempFiles.push(filePath);

      const loader = fileLoader({ path: filePath });
      const config = loader();

      // 由于环境变量名包含连字符，不符合标准环境变量命名规范，保持原样
      expect(config.value).toBe("${VAR-WITH-HYPHENS:-default}");
    });

    it("应该处理多个环境变量在同一字符串中", () => {
      process.env["HOST"] = "example.com";
      process.env["PORT"] = "8080";

      const jsonContent = JSON.stringify({
        url: "http://${HOST:-localhost}:${PORT:-3000}",
      });
      const filePath = path.join(tempDir, "config.json");
      fs.writeFileSync(filePath, jsonContent);
      tempFiles.push(filePath);

      const loader = fileLoader({ path: filePath });
      const config = loader();

      expect(config.url).toBe("http://example.com:8080");
    });
  });

  describe("错误处理测试", () => {
    it("应该处理无效的环境变量语法", () => {
      const jsonContent = JSON.stringify({
        value: "${INVALID_SYNTAX",
      });
      const filePath = path.join(tempDir, "config.json");
      fs.writeFileSync(filePath, jsonContent);
      tempFiles.push(filePath);

      const loader = fileLoader({ path: filePath });
      const config = loader();

      // 无效语法应该保持原样
      expect(config.value).toBe("${INVALID_SYNTAX");
    });

    it("应该处理嵌套的环境变量引用", () => {
      const jsonContent = JSON.stringify({
        value: "${${NESTED_VAR}}",
      });
      const filePath = path.join(tempDir, "config.json");
      fs.writeFileSync(filePath, jsonContent);
      tempFiles.push(filePath);

      const loader = fileLoader({ path: filePath });
      const config = loader();

      // 嵌套引用应该保持原样
      expect(config.value).toBe("${${NESTED_VAR}}");
    });
  });

  describe("性能测试", () => {
    it("应该高效处理大量环境变量替换", () => {
      // 设置大量环境变量
      for (let i = 0; i < 100; i++) {
        process.env[`VAR_${i}`] = `value_${i}`;
      }

      const configObject: Record<string, string> = {};
      for (let i = 0; i < 100; i++) {
        configObject[`key_${i}`] = `\${VAR_${i}:-default_${i}}`;
      }

      const jsonContent = JSON.stringify(configObject);
      const filePath = path.join(tempDir, "config.json");
      fs.writeFileSync(filePath, jsonContent);
      tempFiles.push(filePath);

      const loader = fileLoader({ path: filePath });
      const startTime = Date.now();
      const config = loader();
      const endTime = Date.now();

      expect(config).toBeDefined();
      expect(Object.keys(config)).toHaveLength(100);
      expect(config.key_0).toBe("value_0");
      expect(config.key_99).toBe("value_99");
      expect(endTime - startTime).toBeLessThan(1000); // 应该在1秒内完成
    });
  });
});
