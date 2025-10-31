/**
 * @fileoverview 仓储异常类定义
 * @description 定义仓储操作相关的异常类型
 */

import {
  DomainException,
  ExceptionSeverity,
} from "./base/domain-exception.base.js";
import { ExceptionType } from "./base/exception-type.enum.js";

/**
 * 仓储异常基类
 * @description 所有仓储相关异常的基类
 */
export abstract class RepositoryException extends DomainException {
  constructor(
    message: string,
    public readonly operation: string,
    public readonly entityType: string,
    public readonly entityId?: string,
    public readonly originalError?: Error,
  ) {
    super(
      message,
      ExceptionType.SYSTEM,
      "REPOSITORY_ERROR",
      {
        operation,
        entityType,
        entityId,
      },
      originalError,
    );
  }

  abstract clone(): RepositoryException;

  getSeverity(): ExceptionSeverity {
    return ExceptionSeverity.HIGH;
  }

  isRecoverable(): boolean {
    return false;
  }

  getSuggestion(): string {
    return "请检查仓储操作和实体状态";
  }

  /**
   * 获取异常详情
   * @returns 异常详情对象
   */
  getDetails(): RepositoryExceptionDetails {
    return {
      operation: this.operation,
      entityType: this.entityType,
      entityId: this.entityId,
      originalError: this.originalError?.message,
      stack: this.stack,
      timestamp: new Date(),
    };
  }
}

/**
 * 仓储操作失败异常
 * @description 当仓储操作失败时抛出
 */
export class RepositoryOperationFailedException extends RepositoryException {
  constructor(
    operation: string,
    entityType: string,
    entityId?: string,
    originalError?: Error,
  ) {
    super(
      `Repository operation '${operation}' failed for entity '${entityType}'${entityId ? ` with ID '${entityId}'` : ""}`,
      operation,
      entityType,
      entityId,
      originalError,
    );
  }

  clone(): RepositoryOperationFailedException {
    return new RepositoryOperationFailedException(
      this.operation,
      this.entityType,
      this.entityId,
      this.originalError,
    );
  }
}

/**
 * 实体未找到异常
 * @description 当尝试获取不存在的实体时抛出
 */
export class EntityNotFoundException extends RepositoryException {
  constructor(
    entityType: string,
    entityId: string,
    operation: string = "find",
  ) {
    super(
      `Entity '${entityType}' with ID '${entityId}' not found`,
      operation,
      entityType,
      entityId,
    );
  }

  clone(): EntityNotFoundException {
    return new EntityNotFoundException(
      this.entityType,
      this.entityId!,
      this.operation,
    );
  }
}

/**
 * 实体已存在异常
 * @description 当尝试创建已存在的实体时抛出
 */
export class EntityAlreadyExistsException extends RepositoryException {
  constructor(
    entityType: string,
    entityId: string,
    operation: string = "create",
  ) {
    super(
      `Entity '${entityType}' with ID '${entityId}' already exists`,
      operation,
      entityType,
      entityId,
    );
  }

  clone(): EntityAlreadyExistsException {
    return new EntityAlreadyExistsException(
      this.entityType,
      this.entityId!,
      this.operation,
    );
  }
}

/**
 * 仓储连接异常
 * @description 当无法连接到数据存储时抛出
 */
export class RepositoryConnectionException extends RepositoryException {
  constructor(entityType: string, originalError?: Error) {
    super(
      `Failed to connect to repository for entity '${entityType}'`,
      "connect",
      entityType,
      undefined,
      originalError,
    );
  }

  clone(): RepositoryConnectionException {
    return new RepositoryConnectionException(
      this.entityType,
      this.originalError,
    );
  }
}

/**
 * 仓储事务异常
 * @description 当仓储事务操作失败时抛出
 */
export class RepositoryTransactionException extends RepositoryException {
  constructor(operation: string, entityType: string, originalError?: Error) {
    super(
      `Repository transaction '${operation}' failed for entity '${entityType}'`,
      operation,
      entityType,
      undefined,
      originalError,
    );
  }

  clone(): RepositoryTransactionException {
    return new RepositoryTransactionException(
      this.operation,
      this.entityType,
      this.originalError,
    );
  }
}

/**
 * 仓储查询异常
 * @description 当查询操作失败时抛出
 */
export class RepositoryQueryException extends RepositoryException {
  constructor(query: string, entityType: string, originalError?: Error) {
    super(
      `Query failed for entity '${entityType}': ${query}`,
      "query",
      entityType,
      undefined,
      originalError,
    );
  }

  clone(): RepositoryQueryException {
    return new RepositoryQueryException(
      this.message.replace("Query failed for entity ", "").split(":")[0],
      this.entityType,
      this.originalError,
    );
  }
}

/**
 * 仓储配置异常
 * @description 当仓储配置无效时抛出
 */
export class RepositoryConfigurationException extends RepositoryException {
  constructor(
    entityType: string,
    configurationError: string,
    originalError?: Error,
  ) {
    super(
      `Repository configuration error for entity '${entityType}': ${configurationError}`,
      "configure",
      entityType,
      undefined,
      originalError,
    );
  }

  clone(): RepositoryConfigurationException {
    return new RepositoryConfigurationException(
      this.entityType,
      this.message,
      this.originalError,
    );
  }
}

/**
 * 仓储异常详情接口
 * @description 描述仓储异常的详细信息
 */
export interface RepositoryExceptionDetails {
  /** 操作类型 */
  operation: string;
  /** 实体类型 */
  entityType: string;
  /** 实体ID */
  entityId?: string;
  /** 原始错误消息 */
  originalError?: string;
  /** 错误堆栈 */
  stack?: string;
  /** 异常时间戳 */
  timestamp: Date;
}
