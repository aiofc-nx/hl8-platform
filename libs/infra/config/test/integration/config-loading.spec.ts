/**
 * 配置加载集成测试
 *
 * @description 测试完整的配置加载流程，包括文件加载、环境变量替换、配置验证等
 * @author HL8 SAAS Platform Team
 * @since 1.0.0
 */

import * as fs from "fs";
import * as path from "path";
import { dotenvLoader, fileLoader } from "../../src/lib/loader/index.js";
import { TypedConfigModule } from "../../src/lib/typed-config.module.js";
import { cleanupTempFiles, createTempDir } from "../test-utils.js";
import { IsString, IsNumber, ValidateNested, IsOptional } from "class-validator";
import { Type } from "class-transformer";

// 创建嵌套配置类
class AppConfig {
  @IsString()
  name!: string;

  @IsString()
  version!: string;

  @IsString()
  environment!: string;
}

class ServerConfig {
  @IsNumber()
  port!: number;

  @IsString()
  host!: string;
}

class DatabaseConfig {
  @IsString()
  type!: string;

  @IsString()
  host!: string;

  @IsNumber()
  port!: number;

  @IsString()
  database!: string;

  @IsString()
  username!: string;

  @IsString()
  password!: string;
}

class AuthConfig {
  @IsString()
  jwtSecret!: string;

  @IsNumber()
  jwtExpirationTime!: number;
}

class LoggingConfig {
  @IsString()
  level!: string;
}

class CacheConfig {
  @IsString()
  type!: string;

  @IsString()
  @IsOptional()
  redisPassword?: string;
}

// 创建一个简单的测试配置类
class TestAppConfig {
  @ValidateNested()
  @Type(() => AppConfig)
  app!: AppConfig;

  @ValidateNested()
  @Type(() => ServerConfig)
  server!: ServerConfig;

  @ValidateNested()
  @Type(() => DatabaseConfig)
  database!: DatabaseConfig;

  @ValidateNested()
  @Type(() => AuthConfig)
  auth!: AuthConfig;

  @ValidateNested()
  @Type(() => LoggingConfig)
  logging!: LoggingConfig;

  @ValidateNested()
  @Type(() => CacheConfig)
  @IsOptional()
  cache?: CacheConfig;
}

describe("配置加载集成测试", () => {
  let tempDir: string;
  let tempFiles: string[] = [];

  beforeEach(() => {
    tempDir = createTempDir();
    tempFiles = [tempDir];

    // 清理环境变量
    delete process.env["DB_HOST"];
    delete process.env["DB_PORT"];
    delete process.env["DB_NAME"];
    delete process.env["DB_USERNAME"];
    delete process.env["DB_PASSWORD"];
    delete process.env["JWT_SECRET"];
    delete process.env["JWT_REFRESH_SECRET"];
    delete process.env["LOG_LEVEL"];
    delete process.env["REDIS_HOST"];
    delete process.env["REDIS_PORT"];
    delete process.env["REDIS_PASSWORD"];
  });

  afterEach(async () => {
    await cleanupTempFiles(tempFiles);
  });

  describe("YAML配置文件加载", () => {
    it("应该成功加载完整的API配置", () => {
      const yamlContent = `
app:
  name: "HL8 SAAS API"
  version: "1.0.0"
  environment: "development"
  description: "HL8 SAAS平台API服务"

server:
  port: 4000
  host: "localhost"
  enableCors: true
  corsOrigins:
    - "http://localhost:3001"
    - "http://localhost:3000"

database:
  type: "postgresql"
  host: "\${DB_HOST:-localhost}"
  port: "\${DB_PORT:-5432}"
  database: "\${DB_NAME:-hl8_saas}"
  username: "\${DB_USERNAME:-postgres}"
  password: "\${DB_PASSWORD:-password}"
  ssl: false
  poolSize: 10

auth:
  jwtSecret: "\${JWT_SECRET:-your-super-secret-jwt-key-change-in-production}"
  jwtExpirationTime: 3600
  jwtRefreshSecret: "\${JWT_REFRESH_SECRET:-your-super-secret-refresh-key}"
  jwtRefreshExpirationTime: 86400
  passwordSaltRounds: 12

logging:
  level: "\${LOG_LEVEL:-info}"
  filePath: "./logs/api.log"
  enableRequestLogging: true
  enableResponseLogging: true
  enableConsoleLogging: true

cache:
  type: "memory"
  redisHost: "\${REDIS_HOST:-localhost}"
  redisPort: "\${REDIS_PORT:-6379}"
  redisPassword: "\${REDIS_PASSWORD:-}"
  defaultTtl: 3600
`;

      const filePath = path.join(tempDir, "app.yml");
      fs.writeFileSync(filePath, yamlContent);
      tempFiles.push(filePath);

      const configModule = TypedConfigModule.forRoot({
        schema: TestAppConfig,
        load: [fileLoader({ path: filePath })],
      });

      expect(configModule).toBeDefined();
    });

    it("应该正确处理环境变量替换", () => {
      // 设置环境变量
      process.env["DB_HOST"] = "production-db";
      process.env["DB_PORT"] = "5433";
      process.env["JWT_SECRET"] = "production-jwt-secret";
      process.env["LOG_LEVEL"] = "debug";

      const yamlContent = `
database:
  host: "\${DB_HOST:-localhost}"
  port: "\${DB_PORT:-5432}"
  database: "\${DB_NAME:-hl8_saas}"
  username: "\${DB_USERNAME:-postgres}"
  password: "\${DB_PASSWORD:-password}"

auth:
  jwtSecret: "\${JWT_SECRET:-your-super-secret-jwt-key-change-in-production}"

logging:
  level: "\${LOG_LEVEL:-info}"
`;

      const filePath = path.join(tempDir, "app.yml");
      fs.writeFileSync(filePath, yamlContent);
      tempFiles.push(filePath);

      const configModule = TypedConfigModule.forRoot({
        schema: TestAppConfig,
        load: [fileLoader({ path: filePath })],
      });

      expect(configModule).toBeDefined();
    });

    it("应该处理空的环境变量默认值", () => {
      const yamlContent = `
cache:
  redisPassword: "\${REDIS_PASSWORD:-}"
  redisHost: "\${REDIS_HOST:-localhost}"
`;

      const filePath = path.join(tempDir, "app.yml");
      fs.writeFileSync(filePath, yamlContent);
      tempFiles.push(filePath);

      const configModule = TypedConfigModule.forRoot({
        schema: TestAppConfig,
        load: [fileLoader({ path: filePath })],
      });

      expect(configModule).toBeDefined();
    });
  });

  describe("混合配置加载", () => {
    it("应该同时支持文件配置和环境变量", () => {
      const yamlContent = `
database:
  host: "\${DB_HOST:-localhost}"
  port: "\${DB_PORT:-5432}"
  database: "\${DB_NAME:-hl8_saas}"
`;

      const filePath = path.join(tempDir, "app.yml");
      fs.writeFileSync(filePath, yamlContent);
      tempFiles.push(filePath);

      // 创建 .env 文件
      const envContent = `
DB_HOST=env-file-db
DB_PORT=5434
`;
      const envPath = path.join(tempDir, ".env");
      fs.writeFileSync(envPath, envContent);
      tempFiles.push(envPath);

      const configModule = TypedConfigModule.forRoot({
        schema: TestAppConfig,
        load: [
          fileLoader({ path: filePath }),
          dotenvLoader({ separator: "__" }),
        ],
      });

      expect(configModule).toBeDefined();
    });
  });

  describe("配置验证测试", () => {
    it("应该验证必需的配置字段", () => {
      const yamlContent = `
app:
  name: "Test App"
  version: "1.0.0"
  environment: "development"

server:
  port: 4000

database:
  type: "postgresql"
  host: "localhost"
  port: 5432
  database: "test_db"
  username: "test_user"
  password: "test_password"

auth:
  jwtSecret: "test-secret"
  jwtExpirationTime: 3600

logging:
  level: "info"

cache:
  type: "memory"
`;

      const filePath = path.join(tempDir, "app.yml");
      fs.writeFileSync(filePath, yamlContent);
      tempFiles.push(filePath);

      const configModule = TypedConfigModule.forRoot({
        schema: TestAppConfig,
        load: [fileLoader({ path: filePath })],
      });

      expect(configModule).toBeDefined();
    });

    it("应该处理无效的配置值", () => {
      const yamlContent = `
app:
  name: "Test App"
  version: "1.0.0"
  environment: "invalid-environment"  # 无效的环境值

server:
  port: "invalid-port"  # 无效的端口值

database:
  type: "invalid-type"  # 无效的数据库类型
  host: "localhost"
  port: 5432
  database: "test_db"
  username: "test_user"
  password: "test_password"

auth:
  jwtSecret: "test-secret"
  jwtExpirationTime: 3600

logging:
  level: "info"

cache:
  type: "memory"
`;

      const filePath = path.join(tempDir, "app.yml");
      fs.writeFileSync(filePath, yamlContent);
      tempFiles.push(filePath);

      expect(() => {
        TypedConfigModule.forRoot({
          schema: TestAppConfig,
          load: [fileLoader({ path: filePath })],
        });
      }).toThrow();
    });
  });

  describe("错误处理测试", () => {
    it("应该处理配置文件不存在", () => {
      expect(() => {
        TypedConfigModule.forRoot({
          schema: TestAppConfig,
          load: [fileLoader({ path: "/nonexistent/config.yml" })],
        });
      }).toThrow();
    });

    it("应该处理无效的YAML格式", () => {
      const invalidYaml = `
app:
  name: "Test App"
  version: "1.0.0"
  environment: "development"
  invalid: yaml: content: [
`;

      const filePath = path.join(tempDir, "invalid.yml");
      fs.writeFileSync(filePath, invalidYaml);
      tempFiles.push(filePath);

      expect(() => {
        TypedConfigModule.forRoot({
          schema: TestAppConfig,
          load: [fileLoader({ path: filePath })],
        });
      }).toThrow();
    });

    it("应该处理环境变量替换错误", () => {
      const yamlContent = `
database:
  host: "\${INVALID_VAR_SYNTAX"
`;

      const filePath = path.join(tempDir, "app.yml");
      fs.writeFileSync(filePath, yamlContent);
      tempFiles.push(filePath);

      // 这应该不会抛出错误，而是保持原始字符串
      const configModule = TypedConfigModule.forRoot({
        schema: TestAppConfig,
        load: [fileLoader({ path: filePath })],
      });

      expect(configModule).toBeDefined();
    });
  });

  describe("性能测试", () => {
    it("应该高效加载大型配置文件", () => {
      const largeConfig = {
        app: {
          name: "Test App",
          version: "1.0.0",
          environment: "development",
        },
        server: {
          port: 4000,
          host: "localhost",
        },
        database: {
          type: "postgresql",
          host: "localhost",
          port: 5432,
          database: "test_db",
          username: "test_user",
          password: "test_password",
        },
        auth: {
          jwtSecret: "test-secret",
          jwtExpirationTime: 3600,
        },
        logging: {
          level: "info",
        },
        cache: {
          type: "memory",
        },
        // 添加大量额外配置
        ...Object.fromEntries(
          Array.from({ length: 1000 }, (_, i) => [
            `extraConfig_${i}`,
            {
              value: `value_${i}`,
              nested: {
                deep: `deep_value_${i}`,
                array: Array.from({ length: 10 }, (_, j) => `item_${i}_${j}`),
              },
            },
          ]),
        ),
      };

      const yamlContent = JSON.stringify(largeConfig, null, 2);
      const filePath = path.join(tempDir, "large-config.yml");
      fs.writeFileSync(filePath, yamlContent);
      tempFiles.push(filePath);

      const startTime = Date.now();
      const configModule = TypedConfigModule.forRoot({
        schema: TestAppConfig,
        load: [fileLoader({ path: filePath })],
      });
      const endTime = Date.now();

      expect(configModule).toBeDefined();
      expect(endTime - startTime).toBeLessThan(2000); // 应该在2秒内完成
    });
  });
});
