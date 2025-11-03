/**
 * @fileoverview 事务管理器接口
 * @description 定义事务管理的标准接口，提供事务的开始、提交、回滚和嵌套事务支持
 */

import { EntityManager } from "@mikro-orm/core";

/**
 * 事务上下文信息
 * @description 记录事务的状态和层级信息
 */
export interface TransactionContext {
  /** 事务ID */
  transactionId: string;
  /** 事务层级（嵌套深度） */
  level: number;
  /** 事务开始时间 */
  startTime: Date;
  /** 事务是否已提交 */
  isCommitted: boolean;
  /** 事务是否已回滚 */
  isRolledBack: boolean;
  /** EntityManager 实例 */
  entityManager: EntityManager;
}

/**
 * 事务选项
 * @description 配置事务的行为
 */
export interface TransactionOptions {
  /** 事务超时时间（毫秒），默认 60000 */
  timeout?: number;
  /** 事务隔离级别 */
  isolationLevel?:
    | "READ UNCOMMITTED"
    | "READ COMMITTED"
    | "REPEATABLE READ"
    | "SERIALIZABLE";
  /** 是否只读事务，默认 false */
  readOnly?: boolean;
}

/**
 * 事务管理器接口
 * @description 提供完整的事务管理能力，支持事务的开始、提交、回滚和嵌套事务
 */
export interface ITransactionManager {
  /**
   * 开始事务
   * @description 开始一个新的事务，返回事务上下文
   * @param options 事务选项（可选）
   * @returns 事务上下文
   * @throws {Error} 当事务嵌套层级超过最大限制时抛出
   */
  begin(options?: TransactionOptions): Promise<TransactionContext>;

  /**
   * 提交事务
   * @description 提交当前事务的所有操作
   * @param context 事务上下文
   * @returns Promise<void>
   * @throws {Error} 当事务不存在或已提交/回滚时抛出
   */
  commit(context: TransactionContext): Promise<void>;

  /**
   * 回滚事务
   * @description 回滚当前事务的所有操作
   * @param context 事务上下文
   * @returns Promise<void>
   * @throws {Error} 当事务不存在时抛出
   */
  rollback(context: TransactionContext): Promise<void>;

  /**
   * 在事务中运行代码块
   * @description 自动管理事务的生命周期（开始、提交、回滚）
   * @param callback 事务回调函数，接收 EntityManager 作为参数
   * @param options 事务选项（可选）
   * @returns 回调函数的返回值
   * @throws {Error} 当事务执行失败时抛出，并自动回滚
   */
  runInTransaction<T>(
    callback: (em: EntityManager) => Promise<T>,
    options?: TransactionOptions,
  ): Promise<T>;

  /**
   * 获取当前事务上下文
   * @description 获取当前线程/请求的事务上下文（如果存在）
   * @returns 事务上下文，如果不在事务中则返回 undefined
   */
  getCurrentContext(): TransactionContext | undefined;

  /**
   * 检查是否在事务中
   * @description 检查当前是否在活跃事务中
   * @returns 是否在事务中
   */
  isInTransaction(): boolean;
}
