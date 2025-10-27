/**
 * 简化的配置测试
 *
 * @description 测试环境变量替换功能，避免复杂的配置验证
 * @author HL8 SAAS Platform Team
 * @since 1.0.0
 */

import * as fs from "fs";
import * as path from "path";
import { fileLoader } from "../src/lib/loader/file.loader.js";
import { cleanupTempFiles, createTempDir } from "./test-utils.js";

describe("环境变量替换功能测试", () => {
  let tempDir: string;
  let tempFiles: string[] = [];

  beforeEach(() => {
    tempDir = createTempDir();
    tempFiles = [tempDir];

    // 清理环境变量
    delete process.env["TEST_VAR"];
    delete process.env["DB_HOST"];
    delete process.env["DB_PORT"];
    delete process.env["JWT_SECRET"];
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

    it("应该使用默认值当环境变量不存在时", () => {
      const jsonContent = JSON.stringify({
        value: "${UNDEFINED_VAR:-default-value}",
      });
      const filePath = path.join(tempDir, "config.json");
      fs.writeFileSync(filePath, jsonContent);
      tempFiles.push(filePath);

      const loader = fileLoader({ path: filePath });
      const config = loader();

      expect(config["value"]).toBe("default-value");
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

      expect(config["value"]).toBe("");
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

      expect(config["value"]).toBe(
        "your-super-secret-jwt-key-change-in-production",
      );
    });
  });

  describe("复杂配置场景", () => {
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

      expect(config["database"]["host"]).toBe("production-db");
      expect(config["database"]["port"]).toBe("5432");
      expect(config["database"]["ssl"]).toBe(false);
    });

    it("应该处理YAML文件中的环境变量", () => {
      process.env["JWT_SECRET"] = "production-secret";

      const yamlContent = `
auth:
  jwtSecret: "\${JWT_SECRET:-your-super-secret-jwt-key-change-in-production}"
  jwtExpirationTime: 3600
`;
      const filePath = path.join(tempDir, "config.yaml");
      fs.writeFileSync(filePath, yamlContent);
      tempFiles.push(filePath);

      const loader = fileLoader({ path: filePath });
      const config = loader();

      expect(config["auth"]["jwtSecret"]).toBe("production-secret");
      expect(config["auth"]["jwtExpirationTime"]).toBe(3600);
    });
  });

  describe("边界情况", () => {
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

      expect(config["url"]).toBe("http://example.com:8080");
    });

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
      expect(config["value"]).toBe("${INVALID_SYNTAX");
    });
  });
});
