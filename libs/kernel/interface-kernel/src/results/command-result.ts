/**
 * @fileoverview 命令结果接口
 * @description 定义命令执行结果的稳定契约
 */

import type { DomainEvent } from "../events/index.js";

/**
 * 命令结果接口
 * @description 命令执行结果的标准格式
 * @template TData 结果数据类型
 */
export interface ICommandResult<TData = unknown> {
  /** 执行是否成功 */
  success: boolean;

  /** 结果数据 */
  data?: TData;

  /** 结果消息 */
  message?: string;

  /** 错误代码，仅在失败时使用 */
  errorCode?: string;

  /** 产生的事件列表 */
  events?: DomainEvent[];

  /** 执行时间（毫秒） */
  executionTime?: number;

  /** 结果时间戳 */
  timestamp?: Date;

  /** 结果元数据 */
  metadata?: Record<string, unknown>;
}
