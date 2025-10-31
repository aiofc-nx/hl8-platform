/**
 * @fileoverview 聚合异常类定义
 * @description 定义聚合根操作相关的异常类型
 */

import {
  DomainException,
  ExceptionSeverity,
} from "./base/domain-exception.base.js";
import { ExceptionType } from "./base/exception-type.enum.js";

/**
 * 聚合异常基类
 * @description 所有聚合相关异常的基类
 */
export abstract class AggregateException extends DomainException {
  constructor(
    message: string,
    public readonly aggregateType: string,
    public readonly aggregateId: string,
    public readonly operation: string,
    public readonly originalError?: Error,
  ) {
    super(
      message,
      ExceptionType.BUSINESS,
      "AGGREGATE_ERROR",
      {
        aggregateType,
        aggregateId,
        operation,
      },
      originalError,
    );
  }

  abstract clone(): AggregateException;

  getSeverity(): ExceptionSeverity {
    return ExceptionSeverity.HIGH;
  }

  isRecoverable(): boolean {
    return false;
  }

  getSuggestion(): string {
    return "请检查聚合根状态和操作参数";
  }

  /**
   * 获取异常详情
   * @returns 异常详情对象
   */
  getDetails(): AggregateExceptionDetails {
    return {
      aggregateType: this.aggregateType,
      aggregateId: this.aggregateId,
      operation: this.operation,
      originalError: this.originalError?.message,
      stack: this.stack,
      timestamp: new Date(),
    };
  }
}

/**
 * 聚合操作失败异常
 * @description 当聚合操作失败时抛出
 */
export class AggregateOperationFailedException extends AggregateException {
  constructor(
    aggregateType: string,
    aggregateId: string,
    operation: string,
    reason: string,
    originalError?: Error,
  ) {
    super(
      `Aggregate '${aggregateType}' operation '${operation}' failed for ID '${aggregateId}': ${reason}`,
      aggregateType,
      aggregateId,
      operation,
      originalError,
    );
  }

  clone(): AggregateOperationFailedException {
    const reason = this.message.split(": ")[1] || "";
    return new AggregateOperationFailedException(
      this.aggregateType,
      this.aggregateId,
      this.operation,
      reason,
      this.originalError,
    );
  }
}

/**
 * 聚合状态无效异常
 * @description 当聚合状态无效时抛出
 */
export class AggregateInvalidStateException extends AggregateException {
  constructor(
    aggregateType: string,
    aggregateId: string,
    operation: string,
    currentState: string,
    expectedState: string,
    originalError?: Error,
  ) {
    super(
      `Aggregate '${aggregateType}' is in invalid state for operation '${operation}'. Current: ${currentState}, Expected: ${expectedState}`,
      aggregateType,
      aggregateId,
      operation,
      originalError,
    );
  }

  clone(): AggregateInvalidStateException {
    const match = this.message.match(/Current: ([^,]+), Expected: (.+)$/);
    return new AggregateInvalidStateException(
      this.aggregateType,
      this.aggregateId,
      this.operation,
      match ? match[1].trim() : "",
      match ? match[2].trim() : "",
      this.originalError,
    );
  }
}

/**
 * 聚合业务规则违反异常
 * @description 当聚合业务规则被违反时抛出
 */
export class AggregateBusinessRuleViolationException extends AggregateException {
  constructor(
    aggregateType: string,
    aggregateId: string,
    operation: string,
    violatedRule: string,
    originalError?: Error,
  ) {
    super(
      `Aggregate '${aggregateType}' business rule '${violatedRule}' violated during operation '${operation}'`,
      aggregateType,
      aggregateId,
      operation,
      originalError,
    );
  }

  clone(): AggregateBusinessRuleViolationException {
    const match = this.message.match(/business rule '([^']+)'/);
    return new AggregateBusinessRuleViolationException(
      this.aggregateType,
      this.aggregateId,
      this.operation,
      match ? match[1] : "",
      this.originalError,
    );
  }
}

/**
 * 聚合事件处理异常
 * @description 当聚合事件处理失败时抛出
 */
export class AggregateEventHandlingException extends AggregateException {
  constructor(
    aggregateType: string,
    aggregateId: string,
    eventType: string,
    eventHandlingError: string,
    originalError?: Error,
  ) {
    super(
      `Aggregate '${aggregateType}' failed to handle event '${eventType}': ${eventHandlingError}`,
      aggregateType,
      aggregateId,
      "handleEvent",
      originalError,
    );
  }

  clone(): AggregateEventHandlingException {
    const match = this.message.match(/failed to handle event '([^']+)': (.+)$/);
    return new AggregateEventHandlingException(
      this.aggregateType,
      this.aggregateId,
      match ? match[1] : "",
      match ? match[2] : "",
      this.originalError,
    );
  }
}

/**
 * 聚合重建异常
 * @description 当聚合重建失败时抛出
 */
export class AggregateReconstructionException extends AggregateException {
  constructor(
    aggregateType: string,
    aggregateId: string,
    reconstructionError: string,
    originalError?: Error,
  ) {
    super(
      `Aggregate '${aggregateType}' reconstruction failed for ID '${aggregateId}': ${reconstructionError}`,
      aggregateType,
      aggregateId,
      "reconstruct",
      originalError,
    );
  }

  clone(): AggregateReconstructionException {
    const match = this.message.match(
      /reconstruction failed for ID '[^']+': (.+)$/,
    );
    return new AggregateReconstructionException(
      this.aggregateType,
      this.aggregateId,
      match ? match[1] : "",
      this.originalError,
    );
  }
}

/**
 * 聚合版本冲突异常
 * @description 当聚合版本冲突时抛出
 */
export class AggregateVersionConflictException extends AggregateException {
  constructor(
    aggregateType: string,
    aggregateId: string,
    expectedVersion: number,
    actualVersion: number,
    originalError?: Error,
  ) {
    super(
      `Aggregate '${aggregateType}' version conflict for ID '${aggregateId}'. Expected: ${expectedVersion}, Actual: ${actualVersion}`,
      aggregateType,
      aggregateId,
      "versionCheck",
      originalError,
    );
  }

  clone(): AggregateVersionConflictException {
    const match = this.message.match(/Expected: (\d+), Actual: (\d+)/);
    return new AggregateVersionConflictException(
      this.aggregateType,
      this.aggregateId,
      match ? parseInt(match[1], 10) : 0,
      match ? parseInt(match[2], 10) : 0,
      this.originalError,
    );
  }
}

/**
 * 聚合并发异常
 * @description 当聚合并发操作冲突时抛出
 */
export class AggregateConcurrencyException extends AggregateException {
  constructor(
    aggregateType: string,
    aggregateId: string,
    operation: string,
    concurrencyError: string,
    originalError?: Error,
  ) {
    super(
      `Aggregate '${aggregateType}' concurrency conflict during operation '${operation}': ${concurrencyError}`,
      aggregateType,
      aggregateId,
      operation,
      originalError,
    );
  }

  clone(): AggregateConcurrencyException {
    const match = this.message.match(/during operation '([^']+)': (.+)$/);
    return new AggregateConcurrencyException(
      this.aggregateType,
      this.aggregateId,
      match ? match[1] : this.operation,
      match ? match[2] : "",
      this.originalError,
    );
  }
}

/**
 * 聚合异常详情接口
 * @description 描述聚合异常的详细信息
 */
export interface AggregateExceptionDetails {
  /** 聚合类型 */
  aggregateType: string;
  /** 聚合ID */
  aggregateId: string;
  /** 操作类型 */
  operation: string;
  /** 原始错误消息 */
  originalError?: string;
  /** 错误堆栈 */
  stack?: string;
  /** 异常时间戳 */
  timestamp: Date;
}
