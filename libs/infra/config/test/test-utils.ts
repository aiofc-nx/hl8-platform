/**
 * 测试工具函数
 *
 * @description 测试中使用的工具函数和辅助类
 * @author HL8 SAAS Platform Team
 * @since 1.0.0
 */

import { ConfigRecord } from "../src/lib/types/config.types.js";
import * as os from "os";
import * as path from "path";
import * as fs from "fs";

import "reflect-metadata";
import { IsString, IsNumber, ValidateNested } from "class-validator";
import { Type } from "class-transformer";

/**
 * 测试数据库配置类
 *
 * @description 用于测试的数据库配置类
 * @class TestDatabaseConfig
 * @since 1.0.0
 */
export class TestDatabaseConfig {
  @IsString()
  public readonly host!: string;

  @IsNumber()
  public readonly port!: number;

  @IsString()
  public readonly username!: string;

  @IsString()
  public readonly password!: string;
}

/**
 * 测试配置类
 *
 * @description 用于测试的配置类
 * @class TestConfig
 * @since 1.0.0
 */
export class TestConfig {
  @IsString()
  public readonly name!: string;

  @IsString()
  public readonly version!: string;

  @IsNumber()
  public readonly port!: number;

  @ValidateNested()
  public readonly database!: TestDatabaseConfig;

  [key: string]: unknown;
}

/**
 * 创建测试配置数据
 *
 * @description 创建用于测试的配置数据
 * @returns 测试配置数据
 * @since 1.0.0
 */
export function createTestConfig(): ConfigRecord {
  return {
    name: "Test App",
    version: "1.0.0",
    port: 3000,
    database: {
      host: "localhost",
      port: 5432,
      username: "testuser",
      password: "testpass",
    },
  };
}

/**
 * 创建测试环境变量
 *
 * @description 创建用于测试的环境变量
 * @returns 环境变量对象
 * @since 1.0.0
 */
export function createTestEnvVars(): Record<string, string> {
  return {
    name: "Test App",
    version: "1.0.0",
    port: "3000",
    DATABASE__HOST: "localhost",
    DATABASE__PORT: "5432",
    DATABASE__USERNAME: "testuser",
    DATABASE__PASSWORD: "testpass",
  };
}

/**
 * 创建测试文件内容
 *
 * @description 创建用于测试的文件内容
 * @param format 文件格式
 * @returns 文件内容
 * @since 1.0.0
 */
export function createTestFileContent(format: "json" | "yaml"): string {
  const config = createTestConfig();

  switch (format) {
    case "json":
      return JSON.stringify(config, null, 2);
    case "yaml":
      return `name: ${config["name"] || "N/A"}
version: ${config["version"] || "N/A"}
port: ${config["port"] || "N/A"}
database:
  host: ${config["database"]?.["host"] || "N/A"}
  port: ${config["database"]?.["port"] || "N/A"}
  username: ${config["database"]?.["username"] || "N/A"}
  password: ${config["database"]?.["password"] || "N/A"}`;
    default:
      throw new Error(`Unsupported format: ${format}`);
  }
}

/**
 * 等待指定时间
 *
 * @description 等待指定的毫秒数
 * @param ms 毫秒数
 * @returns Promise
 * @since 1.0.0
 */
export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 创建临时目录
 *
 * @description 创建临时目录用于测试
 * @param prefix 目录前缀
 * @returns 临时目录路径
 * @since 1.0.0
 */
export function createTempDir(prefix: string = "test"): string {
  const tempDir = path.join(
    os.tmpdir(),
    `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  );

  // 实际创建目录
  fs.mkdirSync(tempDir, { recursive: true });

  return tempDir;
}

/**
 * 清理临时文件
 *
 * @description 清理测试中创建的临时文件
 * @param paths 文件路径数组
 * @since 1.0.0
 */
export async function cleanupTempFiles(paths: string[]): Promise<void> {
  for (const filePath of paths) {
    try {
      const stat = await fs.promises.stat(filePath);
      if (stat.isDirectory()) {
        await fs.promises.rm(filePath, { recursive: true });
      } else {
        await fs.promises.unlink(filePath);
      }
    } catch (_error) {
      // 忽略文件不存在错误
    }
  }
}

/**
 * 模拟网络请求
 *
 * @description 模拟网络请求用于测试
 * @param url 请求URL
 * @param response 响应数据
 * @param status 状态码
 * @since 1.0.0
 */
export function mockFetch(
  url: string,
  response: unknown,
  status: number = 200,
): void {
  const originalFetch = global.fetch;

  global.fetch = jest.fn().mockImplementation((requestUrl: string) => {
    if (requestUrl === url) {
      return Promise.resolve({
        ok: status >= 200 && status < 300,
        status,
        json: () => Promise.resolve(response),
        text: () => Promise.resolve(JSON.stringify(response)),
      } as Response);
    }
    return originalFetch(requestUrl);
  });
}

/**
 * 恢复网络请求
 *
 * @description 恢复原始的网络请求函数
 * @since 1.0.0
 */
export function restoreFetch(): void {
  if (
    global.fetch &&
    (global.fetch as unknown as { mockRestore?: () => void }).mockRestore
  ) {
    (global.fetch as unknown as { mockRestore: () => void }).mockRestore();
  }
}

/**
 * 测试断言辅助函数
 *
 * @description 提供常用的测试断言辅助函数
 * @since 1.0.0
 */
export const testAssertions = {
  /**
   * 断言配置对象结构
   *
   * @description 断言配置对象具有预期的结构
   * @param config 配置对象
   * @param expected 预期结构
   * @since 1.0.0
   */
  assertConfigStructure(config: unknown, expected: unknown): void {
    for (const [key, value] of Object.entries(expected)) {
      expect(config).toHaveProperty(key);
      if (typeof value === "object" && value !== null) {
        expect(config[key]).toMatchObject(value);
      } else {
        expect(config[key]).toBe(value);
      }
    }
  },

  /**
   * 断言错误类型
   *
   * @description 断言错误具有预期的类型和消息
   * @param error 错误对象
   * @param expectedType 预期错误类型
   * @param expectedMessage 预期错误消息
   * @since 1.0.0
   */
  assertErrorType(
    error: unknown,
    expectedType: string,
    expectedMessage?: string,
  ): void {
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).name).toBe(expectedType);
    if (expectedMessage) {
      expect((error as Error).message).toContain(expectedMessage);
    }
  },

  /**
   * 断言缓存统计
   *
   * @description 断言缓存统计信息
   * @param stats 缓存统计
   * @param expected 预期统计
   * @since 1.0.0
   */
  assertCacheStats(stats: unknown, expected: unknown): void {
    for (const [key, value] of Object.entries(expected)) {
      expect(stats).toHaveProperty(key);
      if (typeof value === "number") {
        expect(stats[key]).toBeCloseTo(value, 2);
      } else {
        expect(stats[key]).toBe(value);
      }
    }
  },
};
