/**
 * @fileoverview 仓储接口重新导出
 * @description 从domain-kernel重新导出仓储接口，作为interface-kernel的稳定契约
 */

export type {
  IRepository,
  ITenantIsolatedRepository,
  IQueryRepository,
} from "@hl8/domain-kernel";
