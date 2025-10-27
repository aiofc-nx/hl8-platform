/**
 * 文件加载器测试
 *
 * @description 测试文件加载器的功能
 * @author HL8 SAAS Platform Team
 * @since 1.0.0
 */

import * as fs from "fs";
import * as path from "path";
import { fileLoader } from "../../src/lib/loader/file.loader.js";
import {
  cleanupTempFiles,
  createTempDir,
  createTestFileContent,
  testAssertions,
} from "../test-utils.js";

describe("fileLoader", () => {
  let tempDir: string;
  let tempFiles: string[] = [];

  beforeEach(() => {
    tempDir = createTempDir();
    tempFiles = [tempDir];
  });

  afterEach(async () => {
    await cleanupTempFiles(tempFiles);
  });

  describe("JSON 文件加载", () => {
    it("应该加载 JSON 配置文件", () => {
      const jsonContent = createTestFileContent("json");
      const filePath = path.join(tempDir, "config.json");
      fs.writeFileSync(filePath, jsonContent);
      tempFiles.push(filePath);

      const loader = fileLoader({ path: filePath });
      const config = loader();

      expect(config).toBeDefined();
      testAssertions.assertConfigStructure(config, {
        name: "Test App",
        version: "1.0.0",
        port: 3000,
      });
    });

    it("应该处理嵌套的 JSON 配置", () => {
      const jsonContent = createTestFileContent("json");
      const filePath = path.join(tempDir, "config.json");
      fs.writeFileSync(filePath, jsonContent);
      tempFiles.push(filePath);

      const loader = fileLoader({ path: filePath });
      const config = loader();

      expect(config.database).toBeDefined();
      expect(config.database.host).toBe("localhost");
      expect(config.database.port).toBe(5432);
    });
  });

  describe("YAML 文件加载", () => {
    it("应该加载 YAML 配置文件", () => {
      const yamlContent = createTestFileContent("yaml");
      const filePath = path.join(tempDir, "config.yaml");
      fs.writeFileSync(filePath, yamlContent);
      tempFiles.push(filePath);

      const loader = fileLoader({ path: filePath });
      const config = loader();

      expect(config).toBeDefined();
      testAssertions.assertConfigStructure(config, {
        name: "Test App",
        version: "1.0.0",
        port: 3000,
      });
    });

    it("应该处理 YML 文件扩展名", () => {
      const yamlContent = createTestFileContent("yaml");
      const filePath = path.join(tempDir, "config.yml");
      fs.writeFileSync(filePath, yamlContent);
      tempFiles.push(filePath);

      const loader = fileLoader({ path: filePath });
      const config = loader();

      expect(config).toBeDefined();
      expect(config.name).toBe("Test App");
    });
  });

  describe("文件搜索", () => {
    it("应该从指定目录搜索配置文件", () => {
      const jsonContent = createTestFileContent("json");
      const configFile = path.join(tempDir, "app.json");
      fs.writeFileSync(configFile, jsonContent);
      tempFiles.push(configFile);

      const loader = fileLoader({
        searchFrom: tempDir,
        basename: "app",
      });
      const config = loader();

      expect(config).toBeDefined();
      expect(config.name).toBe("Test App");
    });

    it("应该按优先级搜索文件格式", () => {
      const jsonContent = createTestFileContent("json");
      const yamlContent = createTestFileContent("yaml");

      const jsonFile = path.join(tempDir, "config.json");
      const yamlFile = path.join(tempDir, "config.yaml");

      fs.writeFileSync(jsonFile, jsonContent);
      fs.writeFileSync(yamlFile, yamlContent);
      tempFiles.push(jsonFile, yamlFile);

      const loader = fileLoader({
        searchFrom: tempDir,
        basename: "config",
      });
      const config = loader();

      expect(config).toBeDefined();
      // 应该优先加载 JSON 文件
      expect(config.name).toBe("Test App");
    });
  });

  describe("环境变量替换", () => {
    it("应该替换配置中的环境变量", () => {
      process.env["DB_HOST"] = "production-db";
      process.env["DB_PORT"] = "5432";

      const jsonContent = JSON.stringify({
        database: {
          host: "${DB_HOST}",
          port: "${DB_PORT}",
        },
      });
      const filePath = path.join(tempDir, "config.json");
      fs.writeFileSync(filePath, jsonContent);
      tempFiles.push(filePath);

      const loader = fileLoader({ path: filePath });
      const config = loader();

      expect(config).toBeDefined();
      expect(config.database.host).toBe("production-db");
      expect(config.database.port).toBe("5432");
    });

    it("应该处理默认值语法", () => {
      const jsonContent = JSON.stringify({
        port: "${APP_PORT:-3000}",
        host: "${APP_HOST:-localhost}",
      });
      const filePath = path.join(tempDir, "config.json");
      fs.writeFileSync(filePath, jsonContent);
      tempFiles.push(filePath);

      const loader = fileLoader({ path: filePath });
      const config = loader();

      expect(config).toBeDefined();
      expect(config.port).toBe("3000");
      expect(config.host).toBe("localhost");
    });

    it("应该禁用环境变量替换", () => {
      process.env["DB_HOST"] = "production-db";

      const jsonContent = JSON.stringify({
        database: {
          host: "${DB_HOST}",
        },
      });
      const filePath = path.join(tempDir, "config.json");
      fs.writeFileSync(filePath, jsonContent);
      tempFiles.push(filePath);

      const loader = fileLoader({
        path: filePath,
        ignoreEnvironmentVariableSubstitution: true,
      });
      const config = loader();

      expect(config).toBeDefined();
      expect(config.database.host).toBe("${DB_HOST}");
    });
  });

  describe("错误处理", () => {
    it("应该处理文件不存在错误", () => {
      const loader = fileLoader({
        path: "/nonexistent/config.json",
      });

      expect(() => loader()).toThrow();
    });

    it("应该处理无效的 JSON 格式", () => {
      const invalidJson = "{ invalid json }";
      const filePath = path.join(tempDir, "invalid.json");
      fs.writeFileSync(filePath, invalidJson);
      tempFiles.push(filePath);

      const loader = fileLoader({ path: filePath });

      expect(() => loader()).toThrow();
    });

    it("应该处理无效的 YAML 格式", () => {
      const invalidYaml = "invalid: yaml: content: [";
      const filePath = path.join(tempDir, "invalid.yaml");
      fs.writeFileSync(filePath, invalidYaml);
      tempFiles.push(filePath);

      const loader = fileLoader({ path: filePath });

      expect(() => loader()).toThrow();
    });

    it("应该处理不支持的文件格式", () => {
      const filePath = path.join(tempDir, "config.txt");
      fs.writeFileSync(filePath, "plain text");
      tempFiles.push(filePath);

      const loader = fileLoader({ path: filePath });

      expect(() => loader()).toThrow();
    });

    it("应该处理文件读取权限错误", () => {
      const filePath = path.join(tempDir, "config.json");
      fs.writeFileSync(filePath, "{}");
      fs.chmodSync(filePath, 0o000); // 移除所有权限
      tempFiles.push(filePath);

      const loader = fileLoader({ path: filePath });

      expect(() => loader()).toThrow();
    });
  });

  describe("性能测试", () => {
    it("应该高效处理大型配置文件", () => {
      const largeConfig = {
        ...JSON.parse(createTestFileContent("json")),
        largeArray: new Array(1000)
          .fill(0)
          .map((_, i) => ({ id: i, value: `item_${i}` })),
        largeObject: Object.fromEntries(
          new Array(1000).fill(0).map((_, i) => [`key_${i}`, `value_${i}`]),
        ),
      };

      const filePath = path.join(tempDir, "large-config.json");
      fs.writeFileSync(filePath, JSON.stringify(largeConfig));
      tempFiles.push(filePath);

      const loader = fileLoader({ path: filePath });
      const startTime = Date.now();
      const config = loader();
      const endTime = Date.now();

      expect(config).toBeDefined();
      expect(config.largeArray).toHaveLength(1000);
      expect(Object.keys(config.largeObject)).toHaveLength(1000);
      expect(endTime - startTime).toBeLessThan(1000); // 应该在1秒内完成
    });
  });

  describe("并发测试", () => {
    it("应该支持并发文件加载", async () => {
      const jsonContent = createTestFileContent("json");
      const filePath = path.join(tempDir, "config.json");
      fs.writeFileSync(filePath, jsonContent);
      tempFiles.push(filePath);

      const loader = fileLoader({ path: filePath });

      const promises = Array.from({ length: 10 }, () =>
        Promise.resolve(loader()),
      );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(10);
      results.forEach((config) => {
        expect(config).toBeDefined();
        expect(config.name).toBe("Test App");
      });
    });
  });
});
