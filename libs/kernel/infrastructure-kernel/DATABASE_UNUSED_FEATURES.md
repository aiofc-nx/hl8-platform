# Database 模块未使用功能清单

## 概述

本文档列出了 `@hl8/database` 模块中所有未被 `@hl8/infrastructure-kernel` 使用的功能。

**分析结论**：虽然 `infrastructure-kernel` 在 `package.json` 中声明了依赖 `@hl8/database`，但实际上**完全没有使用**该模块的任何功能。`infrastructure-kernel` 自己实现了事务管理机制（基于 MikroORM 的 `MikroORMTransactionManager`），直接使用 MikroORM 进行数据库连接和操作。

---

## 一、连接管理模块（完全未使用）

### 1.1 ConnectionManager（连接管理器）

- **位置**：`libs/infra/database/src/connection/connection.manager.ts`
- **功能**：
  - 管理数据库连接的生命周期
  - 自动建立和维护数据库连接
  - 连接健康检查和自动重连
  - 支持多数据库类型（PostgreSQL、MongoDB）
  - 连接失败时的指数退避重试机制（最多5次）
- **状态**：❌ **未使用**

### 1.2 ConnectionPoolAdapter（连接池适配器）

- **位置**：`libs/infra/database/src/connection/connection-pool.adapter.ts`
- **功能**：
  - 统一的连接池管理接口
  - 适配不同数据库类型的连接池
  - 连接池统计（总连接数、活跃连接数、空闲连接数、等待连接数等）
  - 连接使用率计算
  - 平均响应时间统计
- **状态**：❌ **未使用**

### 1.3 ConnectionHealthService（连接健康服务）

- **位置**：`libs/infra/database/src/connection/connection-health.service.ts`
- **功能**：
  - 定期检查连接状态（每分钟）
  - 检测不健康的连接并标记
  - 提供健康检查接口
- **状态**：❌ **未使用**

### 1.4 ConnectionStatsService（连接统计服务）

- **位置**：`libs/infra/database/src/connection/connection-stats.service.ts`
- **功能**：
  - 收集连接池统计信息
  - 记录连接创建、销毁、获取、释放等事件
  - 提供连接池性能指标
- **状态**：❌ **未使用**

### 1.5 ConnectionLifecycleService（连接生命周期服务）

- **位置**：`libs/infra/database/src/connection/connection-lifecycle.service.ts`
- **功能**：
  - 管理连接的生命周期（初始化、关闭、清理）
  - 优雅关闭所有连接
  - 确保资源正确释放
- **状态**：❌ **未使用**

---

## 二、事务管理模块（完全未使用）

### 2.1 TransactionService（事务服务）

- **位置**：`libs/infra/database/src/transaction/transaction.service.ts`
- **功能**：
  - 编程式事务管理
  - 使用 nestjs-cls 存储事务上下文
  - 支持嵌套事务（复用父事务的 EntityManager）
  - 默认事务超时 60 秒，超时后自动回滚
- **状态**：❌ **未使用**
- **替代方案**：`infrastructure-kernel` 使用 `MikroORMTransactionManager`，基于 `AsyncLocalStorage` 实现

### 2.2 @Transactional 装饰器（声明式事务）

- **位置**：`libs/infra/database/src/transaction/transactional.decorator.ts`
- **功能**：
  - 声明式事务管理装饰器
  - 自动开启事务，成功时提交，失败时回滚
  - 支持嵌套事务检测
  - 将事务 EntityManager 存储到 CLS
- **状态**：❌ **未使用**

### 2.3 UnifiedTransactionManager（统一事务管理器）

- **位置**：`libs/infra/database/src/transaction/unified-transaction.manager.ts`
- **功能**：
  - 跨数据库类型的事务管理统一接口
  - 自动选择 PostgreSQL 或 MongoDB 事务适配器
  - 支持事务重试机制
  - 提供事务执行结果（包含执行时间、重试次数、隔离级别等）
- **状态**：❌ **未使用**

### 2.4 PostgreSQLTransactionAdapter（PostgreSQL 事务适配器）

- **位置**：`libs/infra/database/src/transaction/postgresql-transaction.adapter.ts`
- **功能**：
  - PostgreSQL 特定的事务实现
  - 支持隔离级别设置
  - 处理 PostgreSQL 特定的事务选项
- **状态**：❌ **未使用**

### 2.5 MongoDBTransactionAdapter（MongoDB 事务适配器）

- **位置**：`libs/infra/database/src/transaction/mongodb-transaction.adapter.ts`
- **功能**：
  - MongoDB 特定的事务实现
  - 处理 MongoDB 特定的事务选项
  - 支持 MongoDB 会话管理
- **状态**：❌ **未使用**

### 2.6 TransactionFactory（事务工厂）

- **位置**：`libs/infra/database/src/transaction/transaction.factory.ts`
- **功能**：
  - 根据数据库类型创建对应的事务适配器
  - 工厂模式实现
- **状态**：❌ **未使用**

### 2.7 TransactionMonitor（事务监控）

- **位置**：`libs/infra/database/src/transaction/transaction-monitor.ts`
- **功能**：
  - 监控事务执行状态
  - 记录事务性能指标
  - 事务超时监控
- **状态**：❌ **未使用**

---

## 三、数据库驱动模块（完全未使用）

### 3.1 DatabaseDriverFactory（数据库驱动工厂）

- **位置**：`libs/infra/database/src/drivers/database-driver.factory.ts`
- **功能**：
  - 根据配置创建对应的数据库驱动实例
  - 支持 PostgreSQL 和 MongoDB 驱动创建
- **状态**：❌ **未使用**

### 3.2 DriverSelector（驱动选择器）

- **位置**：`libs/infra/database/src/drivers/driver-selector.ts`
- **功能**：
  - 根据数据库类型选择对应的驱动
  - 支持驱动选择策略
- **状态**：❌ **未使用**

### 3.3 DriverRegistry（驱动注册表）

- **位置**：`libs/infra/database/src/drivers/driver-registry.ts`
- **功能**：
  - 注册和管理可用的数据库驱动
  - 驱动查找和获取
- **状态**：❌ **未使用**

### 3.4 AbstractDatabaseDriver（抽象数据库驱动）

- **位置**：`libs/infra/database/src/drivers/abstract.database-driver.ts`
- **功能**：
  - 数据库驱动的抽象基类
  - 定义驱动接口规范
- **状态**：❌ **未使用**

### 3.5 PostgreSQLDriver（PostgreSQL 驱动）

- **位置**：`libs/infra/database/src/drivers/postgresql.driver.ts`
- **功能**：
  - PostgreSQL 数据库驱动实现
  - 封装 PostgreSQL 特定操作
- **状态**：❌ **未使用**

### 3.6 MongoDBDriver（MongoDB 驱动）

- **位置**：`libs/infra/database/src/drivers/mongodb.driver.ts`
- **功能**：
  - MongoDB 数据库驱动实现
  - 封装 MongoDB 特定操作
- **状态**：❌ **未使用**

---

## 四、监控模块（完全未使用）

### 4.1 HealthCheckService（健康检查服务）

- **位置**：`libs/infra/database/src/monitoring/health-check.service.ts`
- **功能**：
  - 数据库健康检查功能
  - 健康状态判断（healthy、degraded、unhealthy）
  - 检查数据库连通性
  - 检查连接池状态
  - 检查响应时间
  - 记录检查结果
- **状态**：❌ **未使用**

### 4.2 MetricsService（性能指标服务）

- **位置**：`libs/infra/database/src/monitoring/metrics.service.ts`
- **功能**：
  - 收集和报告数据库性能指标
  - 慢查询记录（FIFO 队列，默认上限 100 条）
  - 查询统计（平均、最大、最小执行时间）
  - 统计慢查询数量
  - 查询 SQL 脱敏
- **状态**：❌ **未使用**

---

## 五、实体映射模块（完全未使用）

### 5.1 EntityMapper（实体映射器）

- **位置**：`libs/infra/database/src/mapping/entity-mapper.ts`
- **功能**：
  - 跨数据库类型的实体映射和转换
  - 支持 PostgreSQL 和 MongoDB 之间的实体转换
  - 自定义映射规则
  - 自动映射支持
- **状态**：❌ **未使用**
- **说明**：`infrastructure-kernel` 有自己的 `EntityMapper` 实现

---

## 六、配置模块（完全未使用）

### 6.1 DatabaseConfig（数据库配置类）

- **位置**：`libs/infra/database/src/config/database.config.ts`
- **功能**：
  - 数据库配置管理
  - 连接配置、连接池配置
  - 健康检查配置
- **状态**：❌ **未使用**
- **说明**：`infrastructure-kernel` 有自己的 `DatabaseConfig` 接口定义

---

## 七、异常模块（完全未使用）

### 7.1 DatabaseConnectionException（数据库连接异常）

- **位置**：`libs/infra/database/src/exceptions/database-connection.exception.ts`
- **功能**：
  - 数据库连接相关的异常定义
- **状态**：❌ **未使用**
- **说明**：`infrastructure-kernel` 有自己的异常处理机制

### 7.2 DatabaseTransactionException（数据库事务异常）

- **位置**：`libs/infra/database/src/exceptions/database-transaction.exception.ts`
- **功能**：
  - 数据库事务相关的异常定义
- **状态**：❌ **未使用**

### 7.3 DatabaseQueryException（数据库查询异常）

- **位置**：`libs/infra/database/src/exceptions/database-query.exception.ts`
- **功能**：
  - 数据库查询相关的异常定义
- **状态**：❌ **未使用**

### 7.4 HealthCheckException（健康检查异常）

- **位置**：`libs/infra/database/src/exceptions/health-check.exception.ts`
- **功能**：
  - 健康检查相关的异常定义
- **状态**：❌ **未使用**

---

## 八、类型定义模块（部分未使用）

### 8.1 ConnectionTypes（连接类型定义）

- **位置**：`libs/infra/database/src/types/connection.types.ts`
- **功能**：
  - 连接相关的类型定义（ConnectionConfig、PoolConfig、PoolStats 等）
- **状态**：❌ **未使用**

### 8.2 TransactionTypes（事务类型定义）

- **位置**：`libs/infra/database/src/types/transaction.types.ts`
- **功能**：
  - 事务相关的类型定义（TransactionOptions 等）
- **状态**：❌ **未使用**

### 8.3 ModuleTypes（模块类型定义）

- **位置**：`libs/infra/database/src/types/module.types.ts`
- **功能**：
  - 模块配置相关的类型定义
- **状态**：❌ **未使用**

### 8.4 MonitoringTypes（监控类型定义）

- **位置**：`libs/infra/database/src/types/monitoring.types.ts`
- **功能**：
  - 监控相关的类型定义（HealthCheckResult 等）
- **状态**：❌ **未使用**

---

## 九、DatabaseModule（完全未使用）

### 9.1 DatabaseModule（数据库模块）

- **位置**：`libs/infra/database/src/database.module.ts`
- **功能**：
  - NestJS 模块定义
  - 提供所有服务的依赖注入
  - 集成 MikroORM 和 nestjs-cls
  - 支持同步和异步配置（forRoot、forRootAsync）
- **状态**：❌ **未使用**
- **说明**：虽然 README 中提到可以使用 `DatabaseModule`，但实际代码中并没有导入和使用

---

## 十、MikroORM 类型重新导出（部分未使用）

### 10.1 核心类型重新导出

- **内容**：`EntityManager`、`EntityRepository`、`wrap`、`EntityData`、`FilterQuery`、`FindOptions`、`QueryOrderMap`
- **位置**：`libs/infra/database/src/index.ts`
- **状态**：⚠️ **部分使用**
- **说明**：`infrastructure-kernel` 直接依赖 `@mikro-orm/core`，不通过 `@hl8/database` 导入这些类型

### 10.2 实体装饰器重新导出

- **内容**：`@Entity`、`@Property`、`@PrimaryKey`、`@OneToOne`、`@OneToMany`、`@ManyToOne`、`@ManyToMany` 等
- **位置**：`libs/infra/database/src/index.ts`
- **状态**：⚠️ **部分使用**
- **说明**：`infrastructure-kernel` 直接依赖 `@mikro-orm/core`，不通过 `@hl8/database` 导入这些装饰器

### 10.3 NestJS 集成装饰器重新导出

- **内容**：`@InjectEntityManager`、`@InjectRepository`
- **位置**：`libs/infra/database/src/index.ts`
- **状态**：⚠️ **部分使用**
- **说明**：`infrastructure-kernel` 直接依赖 `@mikro-orm/nestjs`，不通过 `@hl8/database` 导入这些装饰器

---

## 总结

### 使用情况统计

| 功能模块          | 状态          | 说明                                    |
| ----------------- | ------------- | --------------------------------------- |
| 连接管理模块      | ❌ 完全未使用 | 5 个服务全部未使用                      |
| 事务管理模块      | ❌ 完全未使用 | 7 个组件全部未使用，使用自定义实现      |
| 数据库驱动模块    | ❌ 完全未使用 | 6 个组件全部未使用                      |
| 监控模块          | ❌ 完全未使用 | 2 个服务全部未使用                      |
| 实体映射模块      | ❌ 完全未使用 | 1 个组件未使用，有自定义实现            |
| 配置模块          | ❌ 完全未使用 | 1 个配置类未使用，有自定义接口          |
| 异常模块          | ❌ 完全未使用 | 4 个异常类全部未使用，有自定义异常处理  |
| 类型定义模块      | ❌ 完全未使用 | 4 个类型文件全部未使用                  |
| DatabaseModule    | ❌ 完全未使用 | NestJS 模块完全未使用                   |
| MikroORM 重新导出 | ⚠️ 部分未使用 | 直接使用 MikroORM，不通过 database 模块 |

### 结论

1. **完全未使用的功能**：`infrastructure-kernel` 完全没有使用 `@hl8/database` 模块提供的任何核心功能
2. **自定义实现**：`infrastructure-kernel` 使用自己的事务管理实现（`MikroORMTransactionManager`），基于 `AsyncLocalStorage` 而不是 `database` 模块的 CLS 方案
3. **直接依赖**：`infrastructure-kernel` 直接依赖 `@mikro-orm/core` 和 `@mikro-orm/nestjs`，不通过 `@hl8/database` 模块
4. **依赖声明冗余**：`package.json` 中的 `@hl8/database` 依赖是冗余的，可以移除

### 建议

1. **移除依赖**：从 `infrastructure-kernel` 的 `package.json` 中移除 `@hl8/database` 依赖
2. **文档更新**：更新 README，移除对 `DatabaseModule` 的引用
3. **架构决策**：明确 `infrastructure-kernel` 和 `database` 模块的职责边界，避免功能重叠

---

**生成时间**：2024年
**分析范围**：`libs/infra/database` 模块所有导出功能
**对比对象**：`libs/kernel/infrastructure-kernel` 源代码
