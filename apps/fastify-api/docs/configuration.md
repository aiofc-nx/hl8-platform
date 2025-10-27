# 配置管理文档

## 概述

本文档描述了 Fastify API 应用的配置管理系统，该系统基于 `@hl8/config` 库提供类型安全的配置管理功能。

## 功能特性

- **类型安全**: 完整的 TypeScript 类型支持
- **多格式支持**: 支持 YAML、JSON 和 .env 文件
- **环境变量**: 支持环境变量覆盖和默认值
- **验证**: 运行时配置验证和错误处理
- **健康检查**: 配置状态监控和健康检查端点
- **缓存**: 配置缓存以提高性能

## 配置结构

### 主配置文件

配置文件位于 `config/` 目录下：

- `app.yml` - 主配置文件（YAML 格式）
- `app.json` - JSON 格式配置文件（备选）
- `.env.example` - 环境变量模板

### 配置层次结构

```yaml
app:
  name: "fastify-api"
  version: "1.0.0"
  environment: "development"
  debug: true

database:
  host: "localhost"
  port: 5432
  username: "postgres"
  password: "password"
  database: "fastify_api"
  ssl: false

server:
  port: 3000
  host: "0.0.0.0"
  cors:
    enabled: true
    origins:
      - "http://localhost:3000"
      - "http://localhost:3001"
    methods:
      - "GET"
      - "POST"
      - "PUT"
      - "DELETE"
    credentials: true

logging:
  level: "info"
  format: "json"
  output:
    - "console"
```

## 配置类定义

### AppConfig

主配置类，包含所有配置节：

```typescript
export class AppConfig {
  app: AppConfigSection;
  database: DatabaseConfig;
  server: ServerConfig;
  logging: LoggingConfig;
}
```

### AppConfigSection

应用程序配置：

```typescript
export class AppConfigSection {
  name: string; // 应用名称
  version: string; // 应用版本
  environment: string; // 运行环境
  debug?: boolean; // 调试模式
}
```

### DatabaseConfig

数据库配置：

```typescript
export class DatabaseConfig {
  host: string; // 数据库主机
  port: number; // 数据库端口
  username: string; // 用户名
  password: string; // 密码
  database: string; // 数据库名
  ssl?: boolean; // SSL 连接
}
```

### ServerConfig

服务器配置：

```typescript
export class ServerConfig {
  port: number; // 服务器端口
  host: string; // 服务器主机
  cors: CorsConfig; // CORS 配置
}
```

### CorsConfig

CORS 配置：

```typescript
export class CorsConfig {
  enabled: boolean; // 是否启用 CORS
  origins: string[]; // 允许的源
  methods: string[]; // 允许的方法
  credentials?: boolean; // 是否允许凭据
}
```

### LoggingConfig

日志配置：

```typescript
export class LoggingConfig {
  level: string; // 日志级别
  format: string; // 日志格式
  output: string[]; // 输出目标
}
```

## 环境变量

支持通过环境变量覆盖配置值，使用双下划线分隔：

```bash
# 应用配置
APP__NAME=my-app
APP__VERSION=2.0.0
APP__ENVIRONMENT=production
APP__DEBUG=false

# 数据库配置
DATABASE__HOST=db.example.com
DATABASE__PORT=5432
DATABASE__USERNAME=user
DATABASE__PASSWORD=secret
DATABASE__DATABASE=myapp
DATABASE__SSL=true

# 服务器配置
SERVER__PORT=8080
SERVER__HOST=0.0.0.0

# CORS 配置
SERVER__CORS__ENABLED=true
SERVER__CORS__ORIGINS=https://example.com,https://app.example.com
SERVER__CORS__METHODS=GET,POST,PUT,DELETE
SERVER__CORS__CREDENTIALS=true

# 日志配置
LOGGING__LEVEL=warn
LOGGING__FORMAT=json
LOGGING__OUTPUT=console,file
```

## 使用方式

### 在服务中注入配置

```typescript
import { Injectable, Inject } from "@nestjs/common";
import { AppConfig } from "./config/app.config";

@Injectable()
export class MyService {
  constructor(@Inject(AppConfig) private readonly config: AppConfig) {}

  getDatabaseUrl(): string {
    return `postgresql://${this.config.database.username}:${this.config.database.password}@${this.config.database.host}:${this.config.database.port}/${this.config.database.database}`;
  }
}
```

### 在控制器中使用配置

```typescript
import { Controller, Get, Inject } from "@nestjs/common";
import { AppConfig } from "./config/app.config";

@Controller("api")
export class ApiController {
  constructor(@Inject(AppConfig) private readonly config: AppConfig) {}

  @Get("info")
  getAppInfo() {
    return {
      name: this.config.app.name,
      version: this.config.app.version,
      environment: this.config.app.environment,
    };
  }
}
```

## 健康检查

### 配置健康检查端点

- `GET /health/config` - 获取配置健康状态
- `GET /health/config/summary` - 获取配置摘要

### 健康检查响应示例

```json
{
  "status": "healthy",
  "message": "Configuration loaded successfully",
  "configLoaded": true,
  "validationPassed": true,
  "lastValidated": "2024-12-19T10:30:00.000Z",
  "app": {
    "name": "fastify-api",
    "version": "1.0.0",
    "environment": "development"
  }
}
```

## 验证规则

### 必需字段

- `app.name` - 应用名称（非空字符串）
- `app.version` - 应用版本（语义版本格式）
- `app.environment` - 运行环境（development/staging/production）
- `database.host` - 数据库主机（非空字符串）
- `database.port` - 数据库端口（1-65535）
- `database.username` - 数据库用户名（非空字符串）
- `database.password` - 数据库密码（非空字符串）
- `database.database` - 数据库名称（非空字符串）
- `server.port` - 服务器端口（1-65535）
- `server.host` - 服务器主机（非空字符串）
- `logging.level` - 日志级别（error/warn/info/debug）
- `logging.format` - 日志格式（json/text）

### 可选字段

- `app.debug` - 调试模式（布尔值）
- `database.ssl` - SSL 连接（布尔值）
- `server.cors.credentials` - CORS 凭据（布尔值）

## 错误处理

### 配置加载错误

当配置文件无法加载时，应用会：

1. 记录错误信息
2. 尝试使用默认配置
3. 如果验证失败，阻止应用启动

### 验证错误

配置验证失败时，会提供详细的错误信息：

```json
{
  "status": "unhealthy",
  "message": "Configuration validation failed",
  "configLoaded": true,
  "validationPassed": false,
  "errors": [
    {
      "field": "database.port",
      "message": "数据库端口必须是 1-65535 之间的数字",
      "value": 99999
    }
  ]
}
```

## 性能优化

### 配置缓存

配置在应用启动时加载并缓存，避免重复读取文件。

### 类型推断

利用 TypeScript 的类型系统，在编译时捕获配置错误。

### 懒加载

配置对象按需创建，减少内存占用。

## 最佳实践

### 1. 环境分离

为不同环境创建不同的配置文件：

- `config/app.development.yml`
- `config/app.staging.yml`
- `config/app.production.yml`

### 2. 敏感信息

敏感信息（如密码）应通过环境变量设置，不要写入配置文件。

### 3. 配置验证

在应用启动时验证所有配置，确保配置的完整性和正确性。

### 4. 健康检查

定期检查配置健康状态，及时发现配置问题。

### 5. 文档更新

配置变更时及时更新文档，保持文档与代码同步。

## 故障排除

### 常见问题

1. **配置文件未找到**
   - 检查文件路径是否正确
   - 确认文件存在于 `config/` 目录

2. **配置验证失败**
   - 检查必需字段是否缺失
   - 验证字段值是否符合要求

3. **环境变量未生效**
   - 检查环境变量名称格式（使用双下划线）
   - 确认环境变量已正确设置

4. **类型错误**
   - 检查 TypeScript 配置
   - 确认装饰器正确使用

### 调试技巧

1. 启用调试模式查看详细日志
2. 使用健康检查端点监控配置状态
3. 检查应用启动日志中的配置信息

## 更新日志

- **v1.0.0** - 初始版本，支持基本的配置管理功能
- **v1.1.0** - 添加健康检查端点
- **v1.2.0** - 增强错误处理和验证
