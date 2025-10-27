# NestJS + Fastify API 示例项目

这是一个基于 NestJS 和 Fastify 的简单 API 示例项目，展示了如何使用 NestJS 框架构建 RESTful API。

## 项目特性

- 🚀 **NestJS 框架** - 基于 TypeScript 的渐进式 Node.js 框架
- ⚡ **Fastify 适配器** - 高性能的 HTTP 服务器
- 📝 **数据验证** - 使用 class-validator 进行请求数据验证
- 🧪 **单元测试** - 完整的测试覆盖
- 📚 **TSDoc 注释** - 完整的中文文档注释
- 🏗️ **模块化架构** - 清晰的模块分离

## 项目结构

```
src/
├── app.controller.ts          # 应用主控制器
├── app.service.ts             # 应用主服务
├── app.module.ts              # 应用主模块
├── main.ts                    # 应用入口文件
└── users/                     # 用户模块
    ├── users.controller.ts    # 用户控制器
    ├── users.service.ts       # 用户服务
    ├── users.module.ts        # 用户模块
    ├── dto/                   # 数据传输对象
    │   ├── create-user.dto.ts
    │   └── update-user.dto.ts
    └── entities/              # 实体类
        └── user.entity.ts
```

## API 端点

### 应用基础端点

- `GET /` - 获取欢迎信息
- `GET /health` - 获取应用健康状态

### 用户管理端点

- `POST /users` - 创建新用户
- `GET /users` - 获取所有用户
- `GET /users/:id` - 根据ID获取用户
- `PATCH /users/:id` - 更新用户信息
- `DELETE /users/:id` - 删除用户

## 安装和运行

### 安装依赖

```bash
pnpm install
```

### 开发模式运行

```bash
pnpm run start:dev
```

### 生产模式运行

```bash
pnpm run build
pnpm run start:prod
```

### 运行测试

```bash
# 运行所有测试
pnpm run test

# 监听模式运行测试
pnpm run test:watch

# 生成测试覆盖率报告
pnpm run test:cov
```

### 代码检查

```bash
pnpm run lint
```

## API 使用示例

### 创建用户

```bash
curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d '{
    "name": "张三",
    "email": "zhangsan@example.com",
    "password": "password123"
  }'
```

### 获取所有用户

```bash
curl http://localhost:3000/users
```

### 获取特定用户

```bash
curl http://localhost:3000/users/1
```

### 更新用户

```bash
curl -X PATCH http://localhost:3000/users/1 \
  -H "Content-Type: application/json" \
  -d '{
    "name": "张三（已更新）"
  }'
```

### 删除用户

```bash
curl -X DELETE http://localhost:3000/users/1
```

## 技术栈

- **NestJS** - 11.1.7
- **Fastify** - 通过 @nestjs/platform-fastify
- **TypeScript** - 5.9.3
- **class-validator** - 0.14.2
- **class-transformer** - 0.5.1
- **Jest** - 30.2.0 (测试框架)

## 开发规范

- 使用 TSDoc 规范编写中文注释
- 遵循 Clean Architecture 架构模式
- 所有公共 API 必须有完整的文档注释
- 单元测试覆盖率要求 ≥ 80%

## 许可证

MIT License
