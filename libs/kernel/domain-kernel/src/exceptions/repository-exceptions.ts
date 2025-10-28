/**
 * @fileoverview Repository Exceptions - 仓储异常
 * @description 数据访问操作相关的异常
 */

import {
  DomainException,
  ExceptionSeverity,
} from "./base/domain-exception.base.js";
import { EntityId } from "../identifiers/entity-id.js";
import { ExceptionType } from "./base/exception-type.enum.js";

/**
 * 仓储异常
 * @description 数据访问操作相关的异常
 */
export class RepositoryException extends DomainException {
  constructor(
    message: string,
    public readonly operation: string,
    public readonly entityType: string,
    public readonly entityId?: EntityId,
    originalError?: Error,
  ) {
    super(
      message,
      ExceptionType.SYSTEM,
      "REPOSITORY_ERROR",
      { operation, entityType, entityId: entityId?.toString() },
      originalError,
    );
  }

  clone(): RepositoryException {
    return new RepositoryException(
      this.message,
      this.operation,
      this.entityType,
      this.entityId,
      this.cause,
    );
  }

  getSeverity(): ExceptionSeverity {
    return ExceptionSeverity.HIGH;
  }

  isRecoverable(): boolean {
    return true;
  }

  getSuggestion(): string {
    return `请检查${this.entityType}的${this.operation}操作是否正确，或联系系统管理员`;
  }
}
