# @hl8/config

**类型安全的配置管理模块** - 适用于任何 Node.js 和 NestJS 应用

[![Version](https://img.shields.io/badge/version-0.1.0-blue.svg)](https://github.com/hl8/config)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![NestJS](https://img.shields.io/badge/NestJS-11-red.svg)](https://nestjs.com/)

---

## ⚠️ 重要说明

### 本模块的缓存功能

本模块内置了**配置缓存机制**（CacheManager），用于缓存配置加载结果，提升性能。

**关键点**：

- ✅ 本模块的缓存是**配置缓存**（缓存 AppConfig 实例）
- ✅ 缓存实现**独立完成**，不依赖任何外部缓存库
- ✅ 对使用者**完全透明**，自动管理
- ❌ **与 `@hl8/caching` 模块无关**

### 与 @hl8/caching 的区别

| 模块             | 用途         | 缓存对象             | 使用方式   |
| ---------------- | ------------ | -------------------- | ---------- |
| **@hl8/config**  | 配置管理     | AppConfig 实例       | 自动、透明 |
| **@hl8/caching** | 业务数据缓存 | 用户数据、查询结果等 | 手动调用   |

**两者完全独立，互不依赖，职责不同！**

---

## ⚡ 特性

### 完全类型安全 ✅

- TypeScript 类型推断和自动补全
- 编译时类型检查
- 运行时类型验证

### 多格式支持 📦

- `.env` 环境变量
- `.json` JSON 配置
- `.yml/.yaml` YAML 配置
- 远程配置服务

### 强大的验证 🛡️

- 基于 `class-validator`
- 自定义验证规则
- 详细的错误信息

### 灵活的加载器 🔧

- File Loader - 文件加载
- Dotenv Loader - 环境变量
- Remote Loader - 远程配置
- Directory Loader - 目录批量加载

### 变量扩展 🔄

- `${VAR}` 环境变量替换
- `${VAR:-DEFAULT}` 默认值语法
- 嵌套对象变量引用

### 缓存支持 💾

- 内存缓存
- 配置热更新
- 缓存统计

---

## 🚀 快速开始

### 安装

```bash
pnpm add @hl8/config
```

### 基础使用

```typescript
import { TypedConfigModule, fileLoader, dotenvLoader } from "@hl8/config";
import { Module } from "@nestjs/common";
import { Type } from "class-transformer";
import { IsString, IsNumber, ValidateNested } from "class-validator";

// 1. 定义配置类
export class DatabaseConfig {
  @IsString()
  host!: string;

  @IsNumber()
  @Type(() => Number)
  port!: number;
}

export class AppConfig {
  @ValidateNested()
  @Type(() => DatabaseConfig)
  database!: DatabaseConfig;
}

// 2. 配置模块
@Module({
  imports: [
    TypedConfigModule.forRoot({
      schema: AppConfig,
      load: [fileLoader({ path: "./config/app.yml" }), dotenvLoader({ separator: "__" })],
    }),
  ],
})
export class AppModule {}

// 3. 使用配置 - 完全类型安全
@Injectable()
export class DatabaseService {
  constructor(private readonly config: AppConfig) {}

  connect() {
    // 完整的类型推断和自动补全 ✅
    console.log(`${this.config.database.host}:${this.config.database.port}`);
  }
}
```

---

## 📖 核心概念

### TypedConfigModule

核心配置模块，提供类型安全的配置管理。

```typescript
TypedConfigModule.forRoot({
  schema: RootConfig,        // 配置类型
  load: [...],               // 加载器列表
  validate: true,            // 启用验证
  cache: true,               // 启用缓存
})
```

### 加载器 (Loaders)

#### fileLoader - 文件加载器

```typescript
fileLoader({
  path: "./config/app.yml", // 文件路径
  encoding: "utf8", // 编码
});
```

支持格式：`.json`, `.yml`, `.yaml`

#### dotenvLoader - 环境变量加载器

```typescript
dotenvLoader({
  path: ".env", // .env 文件路径
  separator: "__", // 嵌套分隔符
  expandVariables: true, // 变量扩展
});
```

变量扩展示例：

```bash
DB_HOST=${HOST:-localhost}     # 默认值
DB_PORT=${PORT}                # 环境变量
```

#### remoteLoader - 远程配置加载器

```typescript
remoteLoader({
  url: "https://config-server.com/api/config",
  headers: { Authorization: "Bearer token" },
  timeout: 5000,
});
```

#### directoryLoader - 目录批量加载器

```typescript
directoryLoader({
  path: "./config",
  pattern: "**/*.yml",
});
```

---

## 🔧 高级功能

### 配置验证

```typescript
export class ServerConfig {
  @IsString()
  @IsNotEmpty()
  host!: string;

  @IsNumber()
  @Min(1)
  @Max(65535)
  @Type(() => Number)
  port!: number;
}
```

### 变量扩展

**配置文件** (`app.yml`):

```yaml
database:
  host: ${DB_HOST:-localhost}
  port: ${DB_PORT:-5432}
  url: postgres://${DB_HOST}:${DB_PORT}/mydb
```

**环境变量** (`.env`):

```bash
DB_HOST=prod-server
DB_PORT=5432
```

**结果**:

```typescript
config.database.host; // → 'prod-server'
config.database.port; // → 5432
config.database.url; // → 'postgres://prod-server:5432/mydb'
```

### 配置缓存

```typescript
TypedConfigModule.forRoot({
  schema: AppConfig,
  cache: {
    enabled: true,
    ttl: 3600, // 1小时
  },
});
```

---

## 📊 使用场景

### ✅ 适用场景

- NestJS 应用配置管理
- Node.js 应用配置加载
- 微服务配置中心
- 多环境配置管理
- 类型安全配置验证

### 🎯 核心优势

| 特性     | 传统方式       | @hl8/config        |
| -------- | -------------- | ------------------ |
| 类型安全 | ❌ any         | ✅ 完全类型        |
| 验证     | ❌ 手动        | ✅ class-validator |
| 环境变量 | ⚠️ process.env | ✅ 类型安全注入    |
| 多格式   | ❌ 手动解析    | ✅ 自动支持        |
| 变量扩展 | ❌ 不支持      | ✅ ${VAR} 语法     |

---

## 📚 相关文档

- [完整文档](./docs/README.md)
- [API 参考](./docs/api.md)
- [使用示例](./src/examples/)
- [测试用例](./src/__tests__/)

---

**独立、通用、类型安全的配置管理解决方案！** 🎯
