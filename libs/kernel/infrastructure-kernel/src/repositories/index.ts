/**
 * @fileoverview 仓储模块导出
 * @description 导出所有仓储相关的类和接口
 */

export * from "./base/repository.base.js";
export * from "./tenant-isolated/tenant-isolated-repository.js";
export * from "./tenant-isolated/tenant-filter.js";

// 导出 domain-kernel 的接口类型，方便使用
export type { ITenantIsolatedRepository } from "@hl8/domain-kernel";
