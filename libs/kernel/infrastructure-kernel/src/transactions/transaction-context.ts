/**
 * @fileoverview 事务上下文类
 * @description 封装事务的状态和层级信息，用于事务管理
 */

import { EntityManager } from "@mikro-orm/core";
import type { TransactionContext as ITransactionContext } from "./transaction-manager.interface.js";

/**
 * 事务上下文实现类
 * @description 记录事务的状态、层级和时间信息
 */
export class TransactionContext implements ITransactionContext {
  public readonly transactionId: string;
  public readonly level: number;
  public readonly startTime: Date;
  public isCommitted: boolean = false;
  public isRolledBack: boolean = false;
  public readonly entityManager: EntityManager;

  /**
   * 创建事务上下文
   * @param transactionId 事务ID
   * @param level 事务层级（嵌套深度）
   * @param entityManager EntityManager 实例
   */
  constructor(
    transactionId: string,
    level: number,
    entityManager: EntityManager,
  ) {
    this.transactionId = transactionId;
    this.level = level;
    this.startTime = new Date();
    this.entityManager = entityManager;
  }

  /**
   * 标记事务为已提交
   */
  markCommitted(): void {
    this.isCommitted = true;
  }

  /**
   * 标记事务为已回滚
   */
  markRolledBack(): void {
    this.isRolledBack = true;
  }

  /**
   * 检查事务是否已完成（已提交或已回滚）
   * @returns 是否已完成
   */
  isCompleted(): boolean {
    return this.isCommitted || this.isRolledBack;
  }

  /**
   * 获取事务持续时间（毫秒）
   * @returns 持续时间
   */
  getDuration(): number {
    return Date.now() - this.startTime.getTime();
  }
}
