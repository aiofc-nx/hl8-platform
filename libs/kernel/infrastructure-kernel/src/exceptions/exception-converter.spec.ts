/**
 * @fileoverview ExceptionConverter 单元测试
 * @description 测试异常转换器的各种异常类型识别和转换功能
 */

import { describe, it, expect } from "@jest/globals";
import { ExceptionConverter } from "./exception-converter.js";
import { OptimisticLockError } from "@mikro-orm/core";
import {
  RepositoryOperationFailedException,
  RepositoryConnectionException,
  RepositoryQueryException,
  RepositoryTransactionException,
  AggregateVersionConflictException,
  EntityNotFoundException,
} from "@hl8/domain-kernel";

describe("ExceptionConverter", () => {
  let converter: ExceptionConverter;

  beforeEach(() => {
    converter = new ExceptionConverter();
  });

  describe("convertToDomainException", () => {
    it("应该将 OptimisticLockError 转换为 AggregateVersionConflictException", () => {
      const error = new OptimisticLockError({} as any, {} as any);
      const exception = converter.convertToDomainException(
        error,
        "save",
        "User",
        "user-123",
      );

      expect(exception).toBeInstanceOf(AggregateVersionConflictException);
      if (exception instanceof AggregateVersionConflictException) {
        expect(exception.aggregateType).toBe("User");
        expect(exception.aggregateId).toBe("user-123");
      }
    });

    it("应该将连接错误转换为 RepositoryConnectionException", () => {
      const error = new Error("Connection refused");
      error.name = "ConnectionError";
      const exception = converter.convertToDomainException(
        error,
        "findById",
        "User",
        "user-123",
      );

      expect(exception).toBeInstanceOf(RepositoryConnectionException);
      if (exception instanceof RepositoryConnectionException) {
        expect(exception.entityType).toBe("User");
      }
    });

    it("应该将查询错误转换为 RepositoryQueryException", () => {
      const error = new Error("SQL syntax error");
      error.name = "QueryError";
      const exception = converter.convertToDomainException(
        error,
        "findAll",
        "User",
      );

      expect(exception).toBeInstanceOf(RepositoryQueryException);
      if (exception instanceof RepositoryQueryException) {
        expect(exception.entityType).toBe("User");
      }
    });

    it("应该将事务错误转换为 RepositoryTransactionException", () => {
      const error = new Error("Transaction failed: deadlock");
      error.name = "TransactionError";
      const exception = converter.convertToDomainException(
        error,
        "save",
        "User",
        "user-123",
      );

      expect(exception).toBeInstanceOf(RepositoryTransactionException);
      if (exception instanceof RepositoryTransactionException) {
        expect(exception.operation).toBe("save");
        expect(exception.entityType).toBe("User");
      }
    });

    it("应该将实体未找到错误转换为 EntityNotFoundException", () => {
      const error = new Error("Entity not found");
      const exception = converter.convertToDomainException(
        error,
        "delete",
        "User",
        "user-123",
      );

      expect(exception).toBeInstanceOf(EntityNotFoundException);
      if (exception instanceof EntityNotFoundException) {
        expect(exception.entityType).toBe("User");
        expect(exception.entityId).toBe("user-123");
      }
    });

    it("应该将未知错误转换为 RepositoryOperationFailedException", () => {
      const error = new Error("Unknown error");
      const exception = converter.convertToDomainException(
        error,
        "save",
        "User",
        "user-123",
      );

      expect(exception).toBeInstanceOf(RepositoryOperationFailedException);
      if (exception instanceof RepositoryOperationFailedException) {
        expect(exception.operation).toBe("save");
        expect(exception.entityType).toBe("User");
        expect(exception.entityId).toBe("user-123");
      }
    });

    it("应该处理非 Error 类型的错误", () => {
      const error = "String error";
      const exception = converter.convertToDomainException(
        error,
        "findById",
        "User",
        "user-123",
      );

      expect(exception).toBeInstanceOf(RepositoryOperationFailedException);
    });

    it("应该在 findById 操作中不将 null 结果视为错误", () => {
      const error = new Error("Entity not found");
      // findById 操作应该不抛出 EntityNotFoundException
      // 因为返回 null 是正常情况
      const exception = converter.convertToDomainException(
        error,
        "findById",
        "User",
        "user-123",
      );

      // findById 不会将 "not found" 转换为 EntityNotFoundException
      expect(exception).toBeInstanceOf(RepositoryOperationFailedException);
    });
  });

  describe("isOptimisticLockException", () => {
    it("应该识别 OptimisticLockError 实例", () => {
      const error = new OptimisticLockError({} as any, {} as any);
      expect(converter.isOptimisticLockException(error)).toBe(true);
    });

    it("应该识别包含 'optimistic' 关键词的错误消息", () => {
      const error = new Error("Optimistic lock failed");
      expect(converter.isOptimisticLockException(error)).toBe(true);
    });

    it("应该识别包含 'version conflict' 关键词的错误消息", () => {
      const error = new Error("Version conflict detected");
      expect(converter.isOptimisticLockException(error)).toBe(true);
    });

    it("应该识别名称为 OptimisticLockError 的错误", () => {
      const error = new Error("Lock error");
      error.name = "OptimisticLockError";
      expect(converter.isOptimisticLockException(error)).toBe(true);
    });

    it("应该不识别普通错误", () => {
      const error = new Error("Regular error");
      expect(converter.isOptimisticLockException(error)).toBe(false);
    });
  });

  describe("isConnectionException", () => {
    it("应该识别包含 'connection' 的错误名称", () => {
      const error = new Error("Failed");
      error.name = "ConnectionError";
      expect(converter.isConnectionException(error)).toBe(true);
    });

    it("应该识别包含 'ECONNREFUSED' 的错误消息", () => {
      const error = new Error("ECONNREFUSED");
      expect(converter.isConnectionException(error)).toBe(true);
    });

    it("应该识别包含 'timeout' 的错误消息", () => {
      const error = new Error("Connection timeout");
      expect(converter.isConnectionException(error)).toBe(true);
    });

    it("应该识别包含 '连接' 关键词的错误消息", () => {
      const error = new Error("无法连接到数据库");
      expect(converter.isConnectionException(error)).toBe(true);
    });

    it("应该不识别普通错误", () => {
      const error = new Error("Regular error");
      expect(converter.isConnectionException(error)).toBe(false);
    });
  });

  describe("isQueryException", () => {
    it("应该识别包含 'query' 的错误名称", () => {
      const error = new Error("Failed");
      error.name = "QueryError";
      expect(converter.isQueryException(error)).toBe(true);
    });

    it("应该识别包含 'SQL' 的错误消息", () => {
      const error = new Error("SQL syntax error");
      expect(converter.isQueryException(error)).toBe(true);
    });

    it("应该识别包含 'syntax' 的错误消息", () => {
      const error = new Error("Syntax error");
      expect(converter.isQueryException(error)).toBe(true);
    });

    it("应该识别包含 '查询' 关键词的错误消息", () => {
      const error = new Error("查询失败");
      expect(converter.isQueryException(error)).toBe(true);
    });

    it("应该不识别普通错误", () => {
      const error = new Error("Regular error");
      expect(converter.isQueryException(error)).toBe(false);
    });
  });

  describe("isTransactionException", () => {
    it("应该识别包含 'transaction' 的错误名称", () => {
      const error = new Error("Failed");
      error.name = "TransactionError";
      expect(converter.isTransactionException(error)).toBe(true);
    });

    it("应该识别包含 'deadlock' 的错误消息", () => {
      const error = new Error("Deadlock detected");
      expect(converter.isTransactionException(error)).toBe(true);
    });

    it("应该识别包含 'rollback' 的错误消息", () => {
      const error = new Error("Transaction rollback failed");
      expect(converter.isTransactionException(error)).toBe(true);
    });

    it("应该识别包含 '事务' 关键词的错误消息", () => {
      const error = new Error("事务执行失败");
      expect(converter.isTransactionException(error)).toBe(true);
    });

    it("应该识别包含 '锁等待超时' 的错误消息", () => {
      const error = new Error("锁等待超时");
      expect(converter.isTransactionException(error)).toBe(true);
    });

    it("应该不识别普通错误", () => {
      const error = new Error("Regular error");
      expect(converter.isTransactionException(error)).toBe(false);
    });
  });
});
