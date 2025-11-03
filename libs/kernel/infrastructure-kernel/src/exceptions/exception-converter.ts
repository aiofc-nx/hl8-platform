/**
 * @fileoverview 异常转换器实现
 * @description 将 MikroORM 和数据库异常转换为 domain-kernel 定义的异常类型
 */

import {
  DomainException,
  RepositoryOperationFailedException,
  RepositoryConnectionException,
  RepositoryQueryException,
  RepositoryTransactionException,
  AggregateVersionConflictException,
  EntityNotFoundException,
} from "@hl8/domain-kernel";
import { IExceptionConverter } from "./exception-converter.interface.js";
import { OptimisticLockError } from "@mikro-orm/core";

/**
 * 异常转换器实现
 * @description 统一转换 MikroORM/数据库异常到 domain-kernel 异常，自动识别乐观锁、连接失败等场景
 */
export class ExceptionConverter implements IExceptionConverter {
  /**
   * 将错误转换为领域异常
   * @description 自动识别异常类型（乐观锁冲突、连接失败、查询错误等）并转换为对应的领域异常
   * @param error 原始错误对象
   * @param operation 操作名称（如 "save", "findById"）
   * @param entityType 实体类型名称
   * @param entityId 实体ID（可选）
   * @returns 领域异常实例
   */
  convertToDomainException(
    error: unknown,
    operation: string,
    entityType: string,
    entityId?: string,
  ): DomainException {
    const originalError =
      error instanceof Error ? error : new Error(String(error));

    // 1. 检查乐观锁冲突
    if (this.isOptimisticLockException(error)) {
      // 从 OptimisticLockError 中提取版本信息（如果可用）
      let expectedVersion = 0;
      let actualVersion = 0;

      if (error instanceof OptimisticLockError) {
        // OptimisticLockError 可能包含版本信息，但需要检查其属性
        // 暂时使用默认值
        expectedVersion = 0;
        actualVersion = 0;
      }

      return new AggregateVersionConflictException(
        entityType,
        entityId || "unknown",
        expectedVersion,
        actualVersion,
        originalError,
      );
    }

    // 2. 检查数据库连接失败
    if (this.isConnectionException(error)) {
      return new RepositoryConnectionException(entityType, originalError);
    }

    // 3. 检查查询错误
    if (this.isQueryException(error)) {
      const queryDescription = originalError.message || operation;
      return new RepositoryQueryException(
        queryDescription,
        entityType,
        originalError,
      );
    }

    // 4. 检查事务错误
    if (this.isTransactionException(error)) {
      return new RepositoryTransactionException(
        operation,
        entityType,
        originalError,
      );
    }

    // 5. 检查实体未找到（针对特定错误消息）
    if (this.isEntityNotFoundError(error, operation)) {
      return new EntityNotFoundException(
        entityType,
        entityId || "unknown",
        operation,
      );
    }

    // 6. 默认转换为 RepositoryOperationFailedException
    return new RepositoryOperationFailedException(
      operation,
      entityType,
      entityId,
      originalError,
    );
  }

  /**
   * 检查是否为乐观锁冲突异常
   * @param error 错误对象
   * @returns 是否为乐观锁冲突
   */
  isOptimisticLockException(error: unknown): boolean {
    if (!error) {
      return false;
    }

    // MikroORM 的 OptimisticLockError
    if (error instanceof OptimisticLockError) {
      return true;
    }

    // 检查错误消息中包含乐观锁相关关键词
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      const stack = error.stack?.toLowerCase() || "";
      return (
        message.includes("optimistic") ||
        message.includes("version conflict") ||
        message.includes("并发") ||
        stack.includes("optimistic") ||
        error.name === "OptimisticLockError"
      );
    }

    return false;
  }

  /**
   * 检查是否为数据库连接失败异常
   * @param error 错误对象
   * @returns 是否为连接失败
   */
  isConnectionException(error: unknown): boolean {
    if (!error) {
      return false;
    }

    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      const stack = error.stack?.toLowerCase() || "";
      const name = error.name.toLowerCase();

      // 检查连接相关的错误
      return (
        name.includes("connection") ||
        name.includes("connect") ||
        message.includes("connection") ||
        message.includes("connect") ||
        message.includes("econnrefused") ||
        message.includes("timeout") ||
        message.includes("连接") ||
        message.includes("无法连接到") ||
        message.includes("network") ||
        message.includes("host not found") ||
        message.includes("hostname") ||
        message.includes("refused") ||
        stack.includes("connection") ||
        stack.includes("connect")
      );
    }

    return false;
  }

  /**
   * 检查是否为查询错误异常
   * @param error 错误对象
   * @returns 是否为查询错误
   */
  isQueryException(error: unknown): boolean {
    if (!error) {
      return false;
    }

    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      const stack = error.stack?.toLowerCase() || "";
      const name = error.name.toLowerCase();

      // 检查查询相关的错误
      return (
        name.includes("query") ||
        name.includes("syntax") ||
        name.includes("sql") ||
        message.includes("query") ||
        message.includes("sql") ||
        message.includes("syntax") ||
        message.includes("invalid") ||
        message.includes("malformed") ||
        message.includes("查询") ||
        message.includes("sql错误") ||
        message.includes("语法错误") ||
        stack.includes("query") ||
        stack.includes("sql")
      );
    }

    return false;
  }

  /**
   * 检查是否为事务错误异常
   * @param error 错误对象
   * @returns 是否为事务错误
   */
  isTransactionException(error: unknown): boolean {
    if (!error) {
      return false;
    }

    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      const stack = error.stack?.toLowerCase() || "";
      const name = error.name.toLowerCase();

      // 检查事务相关的错误
      return (
        name.includes("transaction") ||
        name.includes("rollback") ||
        name.includes("commit") ||
        message.includes("transaction") ||
        message.includes("rollback") ||
        message.includes("commit") ||
        message.includes("事务") ||
        message.includes("回滚") ||
        message.includes("提交") ||
        message.includes("deadlock") ||
        message.includes("dead lock") ||
        message.includes("锁等待超时") ||
        stack.includes("transaction") ||
        stack.includes("rollback")
      );
    }

    return false;
  }

  /**
   * 检查是否为实体未找到错误
   * @private
   * @param error 错误对象
   * @param operation 操作名称
   * @returns 是否为实体未找到错误
   */
  private isEntityNotFoundError(error: unknown, operation: string): boolean {
    if (!error) {
      return false;
    }

    // 特定操作（如 findById）可能返回 null，这不是错误
    if (operation === "findById" || operation === "findOne") {
      return false;
    }

    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      return (
        message.includes("not found") ||
        message.includes("不存在") ||
        message.includes("未找到") ||
        message.includes("entity not found")
      );
    }

    return false;
  }
}
