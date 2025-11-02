/**
 * HL8 SAAS平台数据库管理模块
 *
 * @description 提供完整的数据库管理功能
 * 包括连接管理、事务管理、多租户隔离等
 *
 * @packageDocumentation
 * @since 1.0.0
 */

// 常量定义导出
export * from "./constants/index.js";

// 类型定义导出
export * from "./types/connection.types.js";
export * from "./types/module.types.js";
export * from "./types/transaction.types.js";
// HealthCheckResult is exported from connection module to avoid conflicts

// 配置类导出
export * from "./config/index.js";

// 异常类导出
export * from "./exceptions/index.js";

// 连接管理导出
export * from "./connection/index.js";
// 为测试兼容性提供别名
export { ConnectionManager as DatabaseService } from "./connection/index.js";

// 事务管理导出
export * from "./transaction/index.js";

// 数据库驱动导出
export * from "./drivers/index.js";

// 监控服务导出
export * from "./monitoring/index.js";

// 模块导出
export * from "./database.module.js";

// ============================================================================
// MikroORM 类型和装饰器重新导出
// ============================================================================
// 注意：为了让业务模块不直接依赖 @mikro-orm/core，我们在这里重新导出
// 所有必需的 MikroORM 类型、装饰器和工具类

// 核心类型
export {
  EntityManager,
  EntityRepository,
  wrap,
  type EntityData,
  type FilterQuery,
  type FindOptions,
  type QueryOrderMap,
} from "@mikro-orm/core";

// 实体装饰器
export {
  Embedded,
  Entity,
  Enum,
  Formula,
  Index,
  ManyToMany,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryKey,
  Property,
  Unique,
} from "@mikro-orm/core";

// NestJS 集成
export { InjectEntityManager, InjectRepository } from "@mikro-orm/nestjs";
