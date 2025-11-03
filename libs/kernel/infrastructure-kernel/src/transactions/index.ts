/**
 * @fileoverview 事务管理模块导出
 * @description 导出所有事务管理相关的接口和类
 */

export type {
  TransactionContext as ITransactionContext,
  TransactionOptions,
  ITransactionManager,
} from "./transaction-manager.interface.js";
export { TransactionContext } from "./transaction-context.js";
export type { TransactionContext as TransactionContextInterface } from "./transaction-manager.interface.js";
export { MikroORMTransactionManager } from "./transaction-manager.js";
