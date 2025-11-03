/**
 * @fileoverview 接口内核公共出口
 * @description 统一导出对外稳定契约，包括标识符、上下文、仓储、CQRS、事件、结果和模型
 */

// 错误模型
export { DomainException } from "./errors/domain-exception.js";
export { BusinessException } from "./errors/business-exception.js";

// 标识符类型
export {
  EntityId,
  TenantId,
  OrganizationId,
  DepartmentId,
} from "./identifiers/index.js";

// 租户上下文
export {
  TenantContext,
  type TenantContextOptions,
} from "./context/tenant-context.js";

// 仓储接口
export type {
  IRepository,
  ITenantIsolatedRepository,
  IQueryRepository,
} from "./repositories/index.js";

// CQRS基类接口
export type {
  IBaseCommand,
  IBaseQuery,
  SortDirection,
  SortRule,
} from "./cqrs/index.js";

// 事件契约
export type {
  IEventStore,
  EventStoreResult,
  DomainEvent,
} from "./events/index.js";

// 结果类型
export type {
  ICommandResult,
  IQueryResult,
  PaginationInfo,
} from "./results/index.js";

// 分页/排序/过滤模型
export type {
  Pagination,
  Sorting,
  SortingDirection,
  Filtering,
} from "./models/index.js";
