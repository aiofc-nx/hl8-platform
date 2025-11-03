# 部署和配置指南

**版本**: 1.0.0  
**更新日期**: 2024-12-19

本文档提供 `@hl8/application-kernel` 的部署和配置指南，帮助您在不同环境中正确配置和部署应用。

---

## 📋 目录

1. [部署概述](#部署概述)
2. [环境配置](#环境配置)
3. [模块配置](#模块配置)
4. [事件存储配置](#事件存储配置)
5. [事件总线配置](#事件总线配置)
6. [缓存配置](#缓存配置)
7. [监控配置](#监控配置)
8. [生产环境部署](#生产环境部署)
9. [容器化部署](#容器化部署)
10. [配置管理](#配置管理)

---

## 部署概述

### 系统要求

- **Node.js**: >= 20.0.0
- **TypeScript**: >= 5.9.3
- **内存**: 建议 >= 2GB
- **磁盘空间**: 根据事件存储需求
- **数据库**: PostgreSQL (>= 12) 和/或 MongoDB (>= 4.4)

### 部署架构

```
┌─────────────────────────────────────┐
│      Application Service            │
│  ┌───────────────────────────────┐ │
│  │  ApplicationKernelModule      │ │
│  └───────────────────────────────┘ │
└─────────────────────────────────────┘
           │              │
           ▼              ▼
    ┌──────────┐    ┌──────────┐
    │PostgreSQL│    │ MongoDB  │
    │EventStore│    │EventStore│
    └──────────┘    └──────────┘
           │              │
           ▼              ▼
    ┌──────────┐    ┌──────────┐
    │   Redis  │    │  Cache   │
    │   Cache  │    │  Service  │
    └──────────┘    └──────────┘
```

---

## 环境配置

### 开发环境

```bash
# .env.development
NODE_ENV=development

# 数据库配置
POSTGRES_URL=postgresql://localhost:5432/hl8_dev
MONGODB_URL=mongodb://localhost:27017/hl8_dev

# 缓存配置
REDIS_URL=redis://localhost:6379

# 日志级别
LOG_LEVEL=debug
```

### 测试环境

```bash
# .env.test
NODE_ENV=test

POSTGRES_URL=postgresql://test-db:5432/hl8_test
MONGODB_URL=mongodb://test-db:27017/hl8_test
REDIS_URL=redis://test-redis:6379

LOG_LEVEL=info
```

### 生产环境

```bash
# .env.production
NODE_ENV=production

# ✅ 使用环境变量，不要硬编码
POSTGRES_URL=${DB_CONNECTION_STRING}
MONGODB_URL=${MONGO_CONNECTION_STRING}
REDIS_URL=${REDIS_CONNECTION_STRING}

# ✅ 生产环境使用 info 级别
LOG_LEVEL=info

# ✅ 性能配置
EVENT_BUS_MAX_CONCURRENCY=20
CACHE_MAX_SIZE=100000
```

---

## 模块配置

### 基本配置

```typescript
import { Module } from "@nestjs/common";
import { ApplicationKernelModule } from "@hl8/application-kernel";

@Module({
  imports: [
    ApplicationKernelModule.forRoot({
      // 基本配置
    }),
  ],
})
export class AppModule {}
```

### 完整配置示例

```typescript
@Module({
  imports: [
    ApplicationKernelModule.forRoot({
      // ✅ 事件存储配置
      eventStore: {
        type: "hybrid", // "postgresql" | "mongodb" | "hybrid"
        postgresql: process.env.POSTGRES_URL,
        mongodb: process.env.MONGODB_URL,
      },

      // ✅ 事件总线配置
      eventBus: {
        deliveryGuarantee: "at-least-once",
        retryPolicy: {
          maxRetries: 3,
          backoffMs: 1000,
        },
      },

      // ✅ 缓存配置
      cache: {
        type: "memory", // "memory" | "redis"
        connectionString: process.env.REDIS_URL,
        ttl: {
          default: 3600, // 1小时
        },
      },

      // ✅ 监控配置
      monitoring: {
        enabled: true,
        metricsInterval: 1000, // 1秒
      },
    }),
  ],
})
export class AppModule {}
```

### 异步配置

```typescript
@Module({
  imports: [
    ApplicationKernelModule.forRootAsync({
      useFactory: async (configService: ConfigService) => {
        // ✅ 从配置服务获取配置
        return {
          eventStore: {
            type: configService.get("EVENT_STORE_TYPE"),
            postgresql: configService.get("POSTGRES_URL"),
            mongodb: configService.get("MONGODB_URL"),
          },
          eventBus: {
            deliveryGuarantee: configService.get("EVENT_BUS_GUARANTEE"),
            retryPolicy: {
              maxRetries: configService.get("EVENT_BUS_MAX_RETRIES"),
              backoffMs: configService.get("EVENT_BUS_BACKOFF_MS"),
            },
          },
        };
      },
      inject: [ConfigService],
    }),
  ],
})
export class AppModule {}
```

---

## 事件存储配置

### PostgreSQL 配置

```typescript
eventStore: {
  type: "postgresql",
  connection: {
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "5432", 10),
    database: process.env.DB_NAME || "events",
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD, // ✅ 从环境变量获取
    ssl: process.env.NODE_ENV === "production" ? {
      rejectUnauthorized: true, // ✅ 生产环境启用SSL
    } : false,
  },
  snapshots: {
    enabled: true,
    interval: 100, // 每100个事件创建一个快照
  },
  performance: {
    connectionPoolSize: 20, // ✅ 连接池大小
    queryTimeout: 30000, // 30秒
  },
},
```

### MongoDB 配置

```typescript
eventStore: {
  type: "mongodb",
  connection: {
    uri: process.env.MONGODB_URL,
    options: {
      // ✅ MongoDB 连接选项
      maxPoolSize: 50,
      minPoolSize: 5,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      ssl: process.env.NODE_ENV === "production",
      sslValidate: true,
    },
  },
  snapshots: {
    enabled: true,
    interval: 100,
  },
},
```

### 混合存储配置

```typescript
eventStore: {
  type: "hybrid",
  // ✅ PostgreSQL 存储关键事件
  postgresql: {
    connection: process.env.POSTGRES_URL,
    eventTypes: ["UserCreated", "UserUpdated", "OrderCreated"],
  },
  // ✅ MongoDB 存储非关键事件
  mongodb: {
    connection: process.env.MONGODB_URL,
    eventTypes: ["*"], // 所有其他事件
  },
},
```

---

## 事件总线配置

### 基本配置

```typescript
eventBus: {
  deliveryGuarantee: "at-least-once", // "at-least-once" | "exactly-once" | "at-most-once"
  retryPolicy: {
    maxAttempts: 3,
    backoffMs: 1000,
    maxBackoffMs: 10000,
  },
  deadLetterQueue: {
    enabled: true,
    maxSize: 1000,
  },
},
```

### 性能优化配置

```typescript
eventBus: {
  deliveryGuarantee: "at-least-once",
  retryPolicy: {
    maxAttempts: 3,
    backoffMs: 1000,
  },
  performance: {
    maxConcurrency: 20, // ✅ 增加并发数
    batchSize: 100, // ✅ 批量处理
    processingTimeout: 30000, // 30秒超时
  },
  monitoring: {
    enabled: true,
    samplingRate: 0.1, // ✅ 10%采样率
  },
},
```

### 可靠性配置

```typescript
eventBus: {
  deliveryGuarantee: "exactly-once", // ✅ 精确一次交付
  retryPolicy: {
    maxAttempts: 5, // ✅ 增加重试次数
    backoffMs: 2000,
    maxBackoffMs: 30000,
  },
  deadLetterQueue: {
    enabled: true,
    maxSize: 5000, // ✅ 增大死信队列
  },
},
```

---

## 缓存配置

### 内存缓存配置

```typescript
cache: {
  type: "memory",
  ttl: {
    default: 3600, // 1小时
    users: 7200, // 用户数据2小时
    queries: 300, // 查询结果5分钟
  },
  performance: {
    maxSize: 100000, // ✅ 最大缓存项数
    cleanupInterval: 60000, // 每分钟清理一次
  },
  invalidation: {
    strategy: "event-based", // "event-based" | "time-based" | "manual"
    enableEventInvalidation: true,
  },
},
```

### Redis 缓存配置

```typescript
cache: {
  type: "redis",
  connectionString: process.env.REDIS_URL,
  ttl: {
    default: 3600,
  },
  performance: {
    maxRetries: 3,
    retryDelayOnFailover: 100,
    enableReadyCheck: true,
    enableOfflineQueue: false, // ✅ 禁用离线队列，避免内存积累
  },
  cluster: {
    enabled: false, // ✅ 如需要高可用，启用集群
    nodes: process.env.REDIS_CLUSTER_NODES?.split(",") || [],
  },
},
```

### 缓存策略配置

```typescript
cache: {
  type: "memory",
  ttl: {
    default: 3600,
  },
  invalidation: {
    strategy: "event-based",
    rules: [
      {
        eventType: "UserUpdated",
        pattern: "user:*", // ✅ 匹配用户相关缓存
      },
      {
        eventType: "OrderCreated",
        pattern: "order:list:*", // ✅ 失效订单列表缓存
      },
    ],
  },
},
```

---

## 监控配置

### 基本监控配置

```typescript
monitoring: {
  enabled: true,
  collectionInterval: 1000, // 1秒收集一次
  alertCheckInterval: 5000, // 5秒检查一次警报
  dataRetentionTime: 24 * 60 * 60 * 1000, // 保留24小时
},
```

### 详细监控配置

```typescript
monitoring: {
  enabled: true,
  collectionInterval: 1000,
  alertCheckInterval: 5000,
  dataRetentionTime: 7 * 24 * 60 * 60 * 1000, // ✅ 保留7天
  maxMetrics: 10000, // ✅ 最大指标数
  metrics: {
    enabled: ["useCase", "command", "query", "event", "saga"],
    samplingRate: 0.1, // ✅ 10%采样率
  },
  alerts: {
    enabled: true,
    thresholds: {
      useCaseExecutionTime: 1000, // 用例执行超过1秒报警
      queryResponseTime: 500, // 查询响应超过500ms报警
      eventProcessingTime: 200, // 事件处理超过200ms报警
    },
  },
},
```

---

## 生产环境部署

### 环境变量配置

```bash
# 生产环境变量
export NODE_ENV=production
export LOG_LEVEL=info

# 数据库连接
export POSTGRES_URL=postgresql://user:password@db-host:5432/hl8_prod
export MONGODB_URL=mongodb://user:password@mongo-host:27017/hl8_prod

# Redis 连接
export REDIS_URL=redis://redis-host:6379

# 应用配置
export APP_PORT=3000
export APP_HOST=0.0.0.0
```

### 启动脚本

```bash
#!/bin/bash
# start.sh

# ✅ 检查环境变量
if [ -z "$POSTGRES_URL" ]; then
  echo "错误: POSTGRES_URL 未设置"
  exit 1
fi

if [ -z "$MONGODB_URL" ]; then
  echo "错误: MONGODB_URL 未设置"
  exit 1
fi

# ✅ 启动应用
node dist/main.js
```

### PM2 配置

```json
// ecosystem.config.js
{
  "apps": [
    {
      "name": "hl8-app",
      "script": "dist/main.js",
      "instances": "max", // ✅ 使用所有CPU核心
      "exec_mode": "cluster",
      "env": {
        "NODE_ENV": "production"
      },
      "env_production": {
        "NODE_ENV": "production",
        "LOG_LEVEL": "info"
      },
      "error_file": "./logs/err.log",
      "out_file": "./logs/out.log",
      "log_date_format": "YYYY-MM-DD HH:mm:ss Z",
      "merge_logs": true,
      "max_memory_restart": "1G" // ✅ 内存超过1G重启
    }
  ]
}
```

启动命令：

```bash
pm2 start ecosystem.config.js --env production
```

---

## 容器化部署

### Dockerfile

```dockerfile
# ✅ 使用多阶段构建
FROM node:20-alpine AS builder

WORKDIR /app

# ✅ 复制依赖文件
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && corepack prepare pnpm@latest --activate
RUN pnpm install --frozen-lockfile

# ✅ 复制源代码
COPY . .
RUN pnpm run build

# ✅ 生产镜像
FROM node:20-alpine

WORKDIR /app

# ✅ 只复制必要文件
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && corepack prepare pnpm@latest --activate
RUN pnpm install --prod --frozen-lockfile

COPY --from=builder /app/dist ./dist

# ✅ 非root用户运行
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001
USER nodejs

EXPOSE 3000

CMD ["node", "dist/main.js"]
```

### Docker Compose

```yaml
# docker-compose.yml
version: "3.8"

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - POSTGRES_URL=postgresql://postgres:password@db:5432/hl8
      - MONGODB_URL=mongodb://mongo:27017/hl8
      - REDIS_URL=redis://redis:6379
    depends_on:
      - db
      - mongo
      - redis
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=hl8
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

  mongo:
    image: mongo:6-alpine
    environment:
      - MONGO_INITDB_DATABASE=hl8
    volumes:
      - mongo_data:/data/db
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
    restart: unless-stopped

volumes:
  postgres_data:
  mongo_data:
  redis_data:
```

### Kubernetes 部署

```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: hl8-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: hl8-app
  template:
    metadata:
      labels:
        app: hl8-app
    spec:
      containers:
        - name: app
          image: hl8/app:latest
          ports:
            - containerPort: 3000
          env:
            - name: NODE_ENV
              value: "production"
            - name: POSTGRES_URL
              valueFrom:
                secretKeyRef:
                  name: app-secrets
                  key: postgres-url
            - name: MONGODB_URL
              valueFrom:
                secretKeyRef:
                  name: app-secrets
                  key: mongodb-url
          resources:
            requests:
              memory: "512Mi"
              cpu: "500m"
            limits:
              memory: "2Gi"
              cpu: "2000m"
          livenessProbe:
            httpGet:
              path: /health
              port: 3000
            initialDelaySeconds: 30
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /ready
              port: 3000
            initialDelaySeconds: 5
            periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: hl8-app
spec:
  selector:
    app: hl8-app
  ports:
    - port: 80
      targetPort: 3000
  type: LoadBalancer
```

---

## 配置管理

### 配置文件结构

```
config/
├── default.yml          # 默认配置
├── development.yml      # 开发环境配置
├── test.yml            # 测试环境配置
└── production.yml      # 生产环境配置
```

### 配置文件示例

```yaml
# config/default.yml
application:
  kernel:
    eventStore:
      type: hybrid
      postgresql:
        host: localhost
        port: 5432
        database: events
      mongodb:
        uri: mongodb://localhost:27017/events
    eventBus:
      deliveryGuarantee: at-least-once
      retryPolicy:
        maxAttempts: 3
        backoffMs: 1000
    cache:
      type: memory
      ttl:
        default: 3600
```

### 环境特定配置

```yaml
# config/production.yml
application:
  kernel:
    eventStore:
      postgresql:
        host: ${DB_HOST}
        port: ${DB_PORT}
        database: ${DB_NAME}
        ssl: true
    eventBus:
      performance:
        maxConcurrency: 50
    cache:
      type: redis
      connectionString: ${REDIS_URL}
```

### 配置加载

```typescript
import { TypedConfigModule } from "@hl8/config";
import { ApplicationKernelConfig } from "@hl8/application-kernel";

@Module({
  imports: [
    TypedConfigModule.forRoot({
      schema: ApplicationKernelConfig,
      load: [
        fileLoader({ path: "./config/default.yml" }),
        fileLoader({ path: `./config/${process.env.NODE_ENV}.yml` }),
        envLoader(), // ✅ 环境变量覆盖
      ],
    }),
  ],
})
export class AppModule {}
```

---

## 健康检查

### 健康检查端点

```typescript
@Controller("/health")
export class HealthController {
  constructor(
    private readonly eventStore: EventStore,
    private readonly eventBus: EventBusImpl,
    private readonly cache: InMemoryCache,
  ) {}

  @Get()
  async healthCheck() {
    const checks = {
      status: "ok",
      timestamp: new Date().toISOString(),
      services: {
        eventStore: await this.checkEventStore(),
        eventBus: await this.checkEventBus(),
        cache: await this.checkCache(),
      },
    };

    const allHealthy = Object.values(checks.services).every((s) => s.status === "ok");

    return {
      ...checks,
      status: allHealthy ? "ok" : "degraded",
    };
  }

  private async checkEventStore(): Promise<{ status: string; message?: string }> {
    try {
      await this.eventStore.getEvents(EntityId.generate(), 0, 0);
      return { status: "ok" };
    } catch (error) {
      return { status: "error", message: error.message };
    }
  }

  private async checkEventBus(): Promise<{ status: string; message?: string }> {
    try {
      const stats = this.eventBus.getStatistics();
      return { status: stats.totalPublished > 0 ? "ok" : "warning" };
    } catch (error) {
      return { status: "error", message: error.message };
    }
  }

  private async checkCache(): Promise<{ status: string; message?: string }> {
    try {
      await this.cache.has("health-check");
      return { status: "ok" };
    } catch (error) {
      return { status: "error", message: error.message };
    }
  }
}
```

---

## 部署检查清单

### 部署前检查

- [ ] 环境变量已正确配置
- [ ] 数据库连接正常
- [ ] Redis 连接正常（如使用）
- [ ] 配置文件已验证
- [ ] 依赖已安装
- [ ] 代码已构建
- [ ] 测试已通过

### 部署后检查

- [ ] 应用启动成功
- [ ] 健康检查通过
- [ ] 日志正常输出
- [ ] 事件存储连接正常
- [ ] 事件总线工作正常
- [ ] 缓存工作正常
- [ ] 监控指标正常

### 生产环境检查

- [ ] SSL/TLS 已配置
- [ ] 数据库连接使用加密
- [ ] 敏感信息使用环境变量
- [ ] 日志级别设置为 info
- [ ] 监控和告警已配置
- [ ] 备份策略已实施
- [ ] 灾难恢复计划已准备

---

## 常见部署问题

### 问题：数据库连接失败

**解决方案**:

```typescript
// ✅ 检查连接配置
const config = {
  eventStore: {
    connection: {
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || "5432", 10),
      database: process.env.DB_NAME,
      // ✅ 确保用户名和密码正确
      username: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
    },
  },
};
```

### 问题：内存泄漏

**解决方案**:

```typescript
// ✅ 限制缓存大小
cache: {
  type: "memory",
  performance: {
    maxSize: 100000, // ✅ 限制最大缓存项
    cleanupInterval: 60000, // ✅ 定期清理
  },
},
```

### 问题：事件积压

**解决方案**:

```typescript
// ✅ 增加并发处理数
eventBus: {
  performance: {
    maxConcurrency: 50, // ✅ 增加并发数
    batchSize: 200, // ✅ 批量处理
  },
},
```

---

## 总结

部署和配置是一个关键过程，需要：

1. ✅ **环境准备**: 确保所有依赖和基础设施就绪
2. ✅ **配置验证**: 验证所有配置正确
3. ✅ **健康检查**: 部署后验证所有服务正常
4. ✅ **监控配置**: 配置监控和告警
5. ✅ **文档记录**: 记录部署过程和配置

遵循本指南的建议，可以确保应用正确部署和运行。

---

**提示**: 更多部署相关问题，请参考 [故障排除指南](./TROUBLESHOOTING.md) 和 [性能调优指南](./PERFORMANCE.md)。
