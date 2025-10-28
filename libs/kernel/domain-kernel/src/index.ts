/**
 * @fileoverview Domain Kernel Core Module - 领域核心模块
 * @description 基于Clean Architecture的领域核心模块，提供值对象、实体、聚合根等核心领域层组件
 * @author hl8-platform
 * @version 1.0.0
 */

// 值对象
export * from "./value-objects/index.js";

// 实体
export * from "./entities/index.js";

// 聚合根
export * from "./aggregates/index.js";

// 领域事件
export * from "./events/index.js";

// 领域服务
export * from "./services/index.js";

// 异常处理
export * from "./exceptions/index.js";

// 审计
export * from "./audit/index.js";

// 标识符
export * from "./identifiers/index.js";

// 验证
export * from "./validation/index.js";

// 业务规则
export * from "./business-rules/index.js";
