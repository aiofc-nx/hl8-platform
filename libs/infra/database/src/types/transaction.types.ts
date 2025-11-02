/**
 * 事务相关类型定义
 *
 * @description 数据库事务的类型定义
 *
 * @since 1.0.0
 */

import type { EntityManager } from "@mikro-orm/core";

/**
 * 事务选项接口
 *
 * @description 事务的配置选项
 */
export interface TransactionOptions {
  /** 是否只读事务 */
  readOnly?: boolean;

  /** 事务超时（毫秒） */
  timeout?: number;
}

/**
 * 事务上下文接口
 *
 * @description 存储在 CLS 中的事务上下文信息
 */
export interface TransactionContext {
  /** 事务 ID（用于追踪） */
  transactionId: string;

  /** 事务 EntityManager */
  entityManager: EntityManager;

  /** 事务开始时间 */
  startedAt: Date;

  /** 事务选项 */
  options?: TransactionOptions;

  /** 是否嵌套事务 */
  isNested: boolean;
}
