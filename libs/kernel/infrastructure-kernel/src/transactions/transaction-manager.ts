/**
 * @fileoverview MikroORM事务管理器实现
 * @description 提供完整的事务管理能力，支持事务的开始、提交、回滚和嵌套事务（最多5层）
 */

import { EntityManager, MikroORM } from "@mikro-orm/core";
import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";
import {
  ITransactionManager,
  TransactionContext,
  TransactionOptions,
} from "./transaction-manager.interface.js";
import { TransactionContext as TransactionContextImpl } from "./transaction-context.js";

/**
 * 事务管理器存储键
 */
const TRANSACTION_CONTEXT_KEY = "transactionContext";

/**
 * 最大嵌套事务层级
 */
const MAX_NESTED_LEVEL = 5;

/**
 * 默认事务超时时间（毫秒）
 */
const DEFAULT_TIMEOUT = 60000;

/**
 * MikroORM事务管理器实现
 * @description 使用 AsyncLocalStorage 管理事务上下文，支持嵌套事务
 */
export class MikroORMTransactionManager implements ITransactionManager {
  private readonly storage = new AsyncLocalStorage<{
    [TRANSACTION_CONTEXT_KEY]: TransactionContext[];
  }>();

  /**
   * 创建事务管理器实例
   * @param orm MikroORM 实例
   */
  constructor(private readonly orm: MikroORM) {
    if (!orm) {
      throw new Error("MikroORM 实例不能为空");
    }
  }

  /**
   * 开始事务
   * @description 开始一个新的事务，返回事务上下文
   * @param options 事务选项（可选）
   * @returns 事务上下文
   * @throws {Error} 当事务嵌套层级超过最大限制时抛出
   */
  async begin(options?: TransactionOptions): Promise<TransactionContext> {
    const currentContexts = this.getContextStack();
    const level = currentContexts.length;

    // 检查嵌套层级限制
    if (level >= MAX_NESTED_LEVEL) {
      throw new Error(
        `事务嵌套层级超过最大限制 ${MAX_NESTED_LEVEL}。当前层级: ${level + 1}`,
      );
    }

    const transactionId = randomUUID();
    const timeout = options?.timeout || DEFAULT_TIMEOUT;

    // 如果已在事务中，复用现有的 EntityManager
    if (level > 0) {
      const parentContext = currentContexts[level - 1];
      const context = new TransactionContextImpl(
        transactionId,
        level,
        parentContext.entityManager,
      );

      // 将新上下文添加到栈中
      const newContexts = [...currentContexts, context];
      this.storage.enterWith({ [TRANSACTION_CONTEXT_KEY]: newContexts });

      return context;
    }

    // 创建新的事务 EntityManager
    const em = this.orm.em.fork();

    // 设置事务选项（如果需要）
    if (options?.isolationLevel) {
      // 注意：MikroORM 的事务隔离级别需要通过数据库特定方法设置
      // 这里只记录选项，实际设置在 runInTransaction 中处理
    }

    const context = new TransactionContextImpl(transactionId, level, em);

    // 存储到 AsyncLocalStorage
    this.storage.enterWith({ [TRANSACTION_CONTEXT_KEY]: [context] });

    // 设置超时（仅用于手动 begin 的场景）
    // 注意：runInTransaction 使用 MikroORM 的 transactional 自带超时机制
    const timeoutHandle = setTimeout(() => {
      if (!context.isCompleted()) {
        this.rollback(context).catch(() => {
          // 忽略超时回滚的错误
        });
      }
    }, timeout);

    // 将超时句柄附加到上下文中以便清理
    (context as any)._timeoutHandle = timeoutHandle;

    return context;
  }

  /**
   * 提交事务
   * @description 提交当前事务的所有操作
   * @param context 事务上下文
   * @returns Promise<void>
   * @throws {Error} 当事务不存在或已提交/回滚时抛出
   */
  async commit(context: TransactionContext): Promise<void> {
    // 类型转换：TransactionContext 接口转换为实现类
    const contextImpl = context as TransactionContextImpl;

    if (contextImpl.isCompleted()) {
      throw new Error(
        `事务 ${context.transactionId} 已经完成（已提交或已回滚）`,
      );
    }

    const currentContexts = this.getContextStack();
    const contextIndex = currentContexts.findIndex(
      (c) => c.transactionId === context.transactionId,
    );

    if (contextIndex === -1) {
      throw new Error(`事务 ${context.transactionId} 不存在`);
    }

    // 清除超时句柄
    if ((contextImpl as any)._timeoutHandle) {
      clearTimeout((contextImpl as any)._timeoutHandle);
    }

    // 标记为已提交
    contextImpl.markCommitted();

    // 如果是顶层事务，执行实际的提交（flush）
    if (context.level === 0) {
      try {
        // 检查 EntityManager 是否在事务中
        // 如果使用 transactional()，提交由 MikroORM 自动处理
        // 这里只执行 flush（如果还没 flush）
        if (!(context.entityManager as any)._transactionContext) {
          await context.entityManager.flush();
        }
      } catch (error) {
        contextImpl.markRolledBack();
        throw new Error(
          `提交事务失败: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    // 从栈中移除上下文
    const newContexts = currentContexts.slice(0, contextIndex);
    if (newContexts.length > 0) {
      this.storage.enterWith({ [TRANSACTION_CONTEXT_KEY]: newContexts });
    } else {
      this.storage.enterWith({ [TRANSACTION_CONTEXT_KEY]: [] });
    }
  }

  /**
   * 回滚事务
   * @description 回滚当前事务的所有操作
   * @param context 事务上下文
   * @returns Promise<void>
   * @throws {Error} 当事务不存在时抛出
   */
  async rollback(context: TransactionContext): Promise<void> {
    // 类型转换：TransactionContext 接口转换为实现类
    const contextImpl = context as TransactionContextImpl;

    const currentContexts = this.getContextStack();
    const contextIndex = currentContexts.findIndex(
      (c) => c.transactionId === context.transactionId,
    );

    if (contextIndex === -1) {
      throw new Error(`事务 ${context.transactionId} 不存在`);
    }

    // 清除超时句柄
    if ((contextImpl as any)._timeoutHandle) {
      clearTimeout((contextImpl as any)._timeoutHandle);
    }

    // 标记为已回滚
    contextImpl.markRolledBack();

    // 如果是顶层事务，执行实际的回滚
    if (context.level === 0) {
      try {
        // MikroORM 使用 transactional 的回滚机制
        // 如果不在 transactional 中，需要手动回滚
        context.entityManager.clear();
      } catch (error) {
        throw new Error(
          `回滚事务失败: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    } else {
      // 嵌套事务：标记所有父事务也需要回滚
      for (let i = 0; i < contextIndex; i++) {
        (currentContexts[i] as TransactionContextImpl).markRolledBack();
      }
    }

    // 从栈中移除上下文
    const newContexts = currentContexts.slice(0, contextIndex);
    if (newContexts.length > 0) {
      this.storage.enterWith({ [TRANSACTION_CONTEXT_KEY]: newContexts });
    } else {
      this.storage.enterWith({ [TRANSACTION_CONTEXT_KEY]: [] });
    }
  }

  /**
   * 在事务中运行代码块
   * @description 自动管理事务的生命周期（开始、提交、回滚）
   * @param callback 事务回调函数，接收 EntityManager 作为参数
   * @param options 事务选项（可选）
   * @returns 回调函数的返回值
   * @throws {Error} 当事务执行失败时抛出，并自动回滚
   */
  async runInTransaction<T>(
    callback: (em: EntityManager) => Promise<T>,
    options?: TransactionOptions,
  ): Promise<T> {
    // 检查是否已在事务中
    const currentContexts = this.getContextStack();
    if (currentContexts.length > 0) {
      // 嵌套事务：复用现有的 EntityManager
      const parentContext = currentContexts[currentContexts.length - 1];
      return callback(parentContext.entityManager);
    }

    // 创建新的事务 EntityManager
    const em = this.orm.em.fork();
    const transactionId = randomUUID();

    // 创建上下文
    const context = new TransactionContextImpl(transactionId, 0, em);

    try {
      // 使用 MikroORM 的 transactional 方法执行事务
      const result = await this.storage.run(
        { [TRANSACTION_CONTEXT_KEY]: [context] },
        async () => {
          return await em.transactional(
            async (transactionEm) => {
              // 更新上下文中的 EntityManager 为事务EM
              (context as any).entityManager = transactionEm;

              // 更新存储中的上下文
              const currentStore = this.storage.getStore();
              if (currentStore) {
                currentStore[TRANSACTION_CONTEXT_KEY] = [context];
              }

              // 在事务上下文中执行回调
              return await callback(transactionEm);
            },
            {
              // MikroORM transactional 方法的选项
              isolationLevel: options?.isolationLevel as any,
              readOnly: options?.readOnly,
            },
          );
        },
      );

      // 标记为已提交
      (context as TransactionContextImpl).markCommitted();

      return result as T;
    } catch (error) {
      // 标记为已回滚
      (context as TransactionContextImpl).markRolledBack();

      throw error;
    } finally {
      // 清理上下文
      this.storage.enterWith({ [TRANSACTION_CONTEXT_KEY]: [] });
    }
  }

  /**
   * 获取当前事务上下文
   * @description 获取当前线程/请求的事务上下文（如果存在）
   * @returns 事务上下文，如果不在事务中则返回 undefined
   */
  getCurrentContext(): TransactionContext | undefined {
    const contexts = this.getContextStack();
    return contexts.length > 0 ? contexts[contexts.length - 1] : undefined;
  }

  /**
   * 检查是否在事务中
   * @description 检查当前是否在活跃事务中
   * @returns 是否在事务中
   */
  isInTransaction(): boolean {
    return this.getContextStack().length > 0;
  }

  /**
   * 获取当前上下文栈
   * @private
   */
  private getContextStack(): TransactionContext[] {
    const store = this.storage.getStore();
    return store?.[TRANSACTION_CONTEXT_KEY] || [];
  }
}
