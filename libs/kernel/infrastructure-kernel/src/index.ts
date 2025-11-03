/**
 * @fileoverview Infrastructure Kernel - Core Module
 * @description Infrastructure layer kernel for HL8 platform
 */

// 实体
export * from "./entities/index.js";

// 仓储
export * from "./repositories/index.js";

// 异常处理
export * from "./exceptions/index.js";

// 查询构建器和规范模式
export * from "./queries/index.js";

// 事务管理
export * from "./transactions/index.js";

// 事件存储
export * from "./events/index.js";

// NestJS 模块
export * from "./module/index.js";

// 查询缓存
export * from "./cache/cached-repository.js";
export * from "./cache/cached-repository.factory.js";
export * from "./cache/repository-cache.interface.js";
export * from "./cache/repository-cache.config.js";
export * from "./cache/cache-invalidation.service.js";
export * from "./cache/cache-tag.util.js";
