/**
 * @fileoverview 仓储异常单元测试
 * @description 测试仓储异常类的功能和异常处理
 */

import { describe, it, expect } from "@jest/globals";
import {
  RepositoryException,
  RepositoryOperationFailedException,
  EntityNotFoundException,
  EntityAlreadyExistsException,
  RepositoryConnectionException,
  RepositoryTransactionException,
  RepositoryQueryException,
  RepositoryConfigurationException,
} from "./repository-exceptions.js";

describe("Repository Exceptions", () => {
  describe("RepositoryOperationFailedException", () => {
    it("应该正确创建异常实例", () => {
      const operation = "save";
      const entityType = "User";
      const entityId = "user-123";
      const originalError = new Error("Database connection failed");

      const exception = new RepositoryOperationFailedException(
        operation,
        entityType,
        entityId,
        originalError,
      );

      expect(exception.message).toContain("Repository operation");
      expect(exception.operation).toBe(operation);
      expect(exception.entityType).toBe(entityType);
      expect(exception.entityId).toBe(entityId);
      expect(exception.originalError).toBe(originalError);
      expect(exception.name).toBe("RepositoryOperationFailedException");
    });

    it("应该正确获取异常详情", () => {
      const exception = new RepositoryOperationFailedException(
        "save",
        "User",
        "user-123",
        new Error("Database error"),
      );

      const details = exception.getDetails();

      expect(details.operation).toBe("save");
      expect(details.entityType).toBe("User");
      expect(details.entityId).toBe("user-123");
      expect(details.originalError).toBe("Database error");
      expect(details.timestamp).toBeInstanceOf(Date);
    });
  });

  describe("EntityNotFoundException", () => {
    it("应该正确创建异常实例", () => {
      const entityType = "User";
      const entityId = "user-123";
      const operation = "find";

      const exception = new EntityNotFoundException(
        entityType,
        entityId,
        operation,
      );

      expect(exception.message).toContain("not found");
      expect(exception.entityType).toBe(entityType);
      expect(exception.entityId).toBe(entityId);
      expect(exception.operation).toBe(operation);
      expect(exception.name).toBe("EntityNotFoundException");
    });

    it("应该使用默认操作名称", () => {
      const exception = new EntityNotFoundException("User", "user-123");

      expect(exception.operation).toBe("find");
    });
  });

  describe("EntityAlreadyExistsException", () => {
    it("应该正确创建异常实例", () => {
      const entityType = "User";
      const entityId = "user-123";
      const operation = "create";

      const exception = new EntityAlreadyExistsException(
        entityType,
        entityId,
        operation,
      );

      expect(exception.message).toContain("already exists");
      expect(exception.entityType).toBe(entityType);
      expect(exception.entityId).toBe(entityId);
      expect(exception.operation).toBe(operation);
      expect(exception.name).toBe("EntityAlreadyExistsException");
    });

    it("应该使用默认操作名称", () => {
      const exception = new EntityAlreadyExistsException("User", "user-123");

      expect(exception.operation).toBe("create");
    });
  });

  describe("RepositoryConnectionException", () => {
    it("应该正确创建异常实例", () => {
      const entityType = "User";
      const originalError = new Error("Connection timeout");

      const exception = new RepositoryConnectionException(
        entityType,
        originalError,
      );

      expect(exception.message).toContain("Failed to connect");
      expect(exception.entityType).toBe(entityType);
      expect(exception.operation).toBe("connect");
      expect(exception.originalError).toBe(originalError);
      expect(exception.name).toBe("RepositoryConnectionException");
    });
  });

  describe("RepositoryTransactionException", () => {
    it("应该正确创建异常实例", () => {
      const operation = "commit";
      const entityType = "User";
      const originalError = new Error("Transaction rollback");

      const exception = new RepositoryTransactionException(
        operation,
        entityType,
        originalError,
      );

      expect(exception.message).toContain("transaction");
      expect(exception.operation).toBe(operation);
      expect(exception.entityType).toBe(entityType);
      expect(exception.originalError).toBe(originalError);
      expect(exception.name).toBe("RepositoryTransactionException");
    });
  });

  describe("RepositoryQueryException", () => {
    it("应该正确创建异常实例", () => {
      const query = "SELECT * FROM users WHERE id = ?";
      const entityType = "User";
      const originalError = new Error("SQL syntax error");

      const exception = new RepositoryQueryException(
        query,
        entityType,
        originalError,
      );

      expect(exception.message).toContain("Query failed");
      expect(exception.operation).toBe("query");
      expect(exception.entityType).toBe(entityType);
      expect(exception.originalError).toBe(originalError);
      expect(exception.name).toBe("RepositoryQueryException");
    });
  });

  describe("RepositoryConfigurationException", () => {
    it("应该正确创建异常实例", () => {
      const entityType = "User";
      const configurationError = "Invalid connection string";
      const originalError = new Error("Configuration validation failed");

      const exception = new RepositoryConfigurationException(
        entityType,
        configurationError,
        originalError,
      );

      expect(exception.message).toContain("configuration error");
      expect(exception.operation).toBe("configure");
      expect(exception.entityType).toBe(entityType);
      expect(exception.originalError).toBe(originalError);
      expect(exception.name).toBe("RepositoryConfigurationException");
    });
  });
});
