/**
 * @fileoverview 命令基类接口（框架无关）
 * @description 定义命令的稳定契约，不依赖具体框架（如NestJS）
 */

import type { TenantContext } from "../index.js";

/**
 * 命令基类接口
 * @description 框架无关的命令契约，用于CQRS模式的命令处理
 * @template TResult 命令执行结果类型
 */
export interface IBaseCommand<_TResult = unknown> {
  /** 命令ID */
  readonly commandId: string;

  /** 聚合根ID */
  readonly aggregateId: string;

  /** 命令类型 */
  readonly commandType: string;

  /** 关联ID，用于追踪请求 */
  readonly correlationId?: string;

  /** 用户ID，用于权限控制 */
  readonly userId?: string;

  /** 命令时间戳 */
  readonly timestamp?: Date;

  /** 命令版本 */
  readonly version?: string;

  /** 命令元数据 */
  readonly metadata?: Record<string, unknown>;

  /** 租户上下文（自动注入） */
  readonly tenantContext?: TenantContext;
}
