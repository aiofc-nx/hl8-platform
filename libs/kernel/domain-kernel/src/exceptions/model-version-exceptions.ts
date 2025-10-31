/**
 * @fileoverview 模型版本异常类定义
 * @description 定义模型版本管理相关的异常类型
 */

import {
  DomainException,
  ExceptionSeverity,
} from "./base/domain-exception.base.js";
import { ExceptionType } from "./base/exception-type.enum.js";

/**
 * 模型版本异常基类
 * @description 所有模型版本相关异常的基类
 */
export abstract class ModelVersionException extends DomainException {
  constructor(
    message: string,
    public readonly modelType: string,
    public readonly version: string,
    public readonly originalError?: Error,
  ) {
    super(
      message,
      ExceptionType.SYSTEM,
      "MODEL_VERSION_ERROR",
      {
        modelType,
        version,
      },
      originalError,
    );
  }

  abstract clone(): ModelVersionException;

  getSeverity(): ExceptionSeverity {
    return ExceptionSeverity.HIGH;
  }

  isRecoverable(): boolean {
    return true;
  }

  getSuggestion(): string {
    return "请检查模型版本兼容性和迁移策略";
  }

  /**
   * 获取异常详情
   * @returns 异常详情对象
   */
  getDetails(): ModelVersionExceptionDetails {
    return {
      modelType: this.modelType,
      version: this.version,
      originalError: this.originalError?.message,
      stack: this.stack,
      timestamp: new Date(),
    };
  }
}

/**
 * 模型版本不兼容异常
 * @description 当模型版本不兼容时抛出
 */
export class ModelVersionIncompatibleException extends ModelVersionException {
  constructor(
    modelType: string,
    currentVersion: string,
    targetVersion: string,
    compatibilityIssues: string[],
    originalError?: Error,
  ) {
    super(
      `Model '${modelType}' version '${currentVersion}' is incompatible with version '${targetVersion}': ${compatibilityIssues.join(", ")}`,
      modelType,
      currentVersion,
      originalError,
    );
  }

  clone(): ModelVersionIncompatibleException {
    const match = this.message.match(
      /version '([^']+)' is incompatible with version '([^']+)': (.+)$/,
    );
    const currentVersion = match ? match[1] : this.version;
    const targetVersion = match ? match[2] : "";
    const compatibilityIssues = match && match[3] ? match[3].split(", ") : [];
    return new ModelVersionIncompatibleException(
      this.modelType,
      currentVersion,
      targetVersion,
      compatibilityIssues,
      this.originalError,
    );
  }
}

/**
 * 模型版本迁移失败异常
 * @description 当模型版本迁移失败时抛出
 */
export class ModelVersionMigrationFailedException extends ModelVersionException {
  constructor(
    modelType: string,
    fromVersion: string,
    toVersion: string,
    migrationError: string,
    originalError?: Error,
  ) {
    super(
      `Model '${modelType}' migration from version '${fromVersion}' to '${toVersion}' failed: ${migrationError}`,
      modelType,
      fromVersion,
      originalError,
    );
  }

  clone(): ModelVersionMigrationFailedException {
    const match = this.message.match(
      /migration from version '([^']+)' to '([^']+)' failed: (.+)$/,
    );
    const fromVersion = match ? match[1] : this.version;
    const toVersion = match ? match[2] : "";
    const migrationError = match ? match[3] : "";
    return new ModelVersionMigrationFailedException(
      this.modelType,
      fromVersion,
      toVersion,
      migrationError,
      this.originalError,
    );
  }
}

/**
 * 模型版本不存在异常
 * @description 当指定的模型版本不存在时抛出
 */
export class ModelVersionNotFoundException extends ModelVersionException {
  constructor(modelType: string, version: string, originalError?: Error) {
    super(
      `Model '${modelType}' version '${version}' not found`,
      modelType,
      version,
      originalError,
    );
  }

  clone(): ModelVersionNotFoundException {
    return new ModelVersionNotFoundException(
      this.modelType,
      this.version,
      this.originalError,
    );
  }
}

/**
 * 模型版本格式无效异常
 * @description 当模型版本格式无效时抛出
 */
export class ModelVersionInvalidFormatException extends ModelVersionException {
  constructor(
    modelType: string,
    invalidVersion: string,
    formatError: string,
    originalError?: Error,
  ) {
    super(
      `Model '${modelType}' version '${invalidVersion}' has invalid format: ${formatError}`,
      modelType,
      invalidVersion,
      originalError,
    );
  }

  clone(): ModelVersionInvalidFormatException {
    const match = this.message.match(
      /version '([^']+)' has invalid format: (.+)$/,
    );
    const invalidVersion = match ? match[1] : this.version;
    const formatError = match ? match[2] : "";
    return new ModelVersionInvalidFormatException(
      this.modelType,
      invalidVersion,
      formatError,
      this.originalError,
    );
  }
}

/**
 * 模型版本回滚失败异常
 * @description 当模型版本回滚失败时抛出
 */
export class ModelVersionRollbackFailedException extends ModelVersionException {
  constructor(
    modelType: string,
    fromVersion: string,
    toVersion: string,
    rollbackError: string,
    originalError?: Error,
  ) {
    super(
      `Model '${modelType}' rollback from version '${fromVersion}' to '${toVersion}' failed: ${rollbackError}`,
      modelType,
      fromVersion,
      originalError,
    );
  }

  clone(): ModelVersionRollbackFailedException {
    const match = this.message.match(
      /rollback from version '([^']+)' to '([^']+)' failed: (.+)$/,
    );
    const fromVersion = match ? match[1] : this.version;
    const toVersion = match ? match[2] : "";
    const rollbackError = match ? match[3] : "";
    return new ModelVersionRollbackFailedException(
      this.modelType,
      fromVersion,
      toVersion,
      rollbackError,
      this.originalError,
    );
  }
}

/**
 * 模型版本验证失败异常
 * @description 当模型版本验证失败时抛出
 */
export class ModelVersionValidationFailedException extends ModelVersionException {
  constructor(
    modelType: string,
    version: string,
    validationErrors: string[],
    originalError?: Error,
  ) {
    super(
      `Model '${modelType}' version '${version}' validation failed: ${validationErrors.join(", ")}`,
      modelType,
      version,
      originalError,
    );
  }

  clone(): ModelVersionValidationFailedException {
    const match = this.message.split(": ")[1];
    const validationErrors = match ? match.split(", ") : [];
    return new ModelVersionValidationFailedException(
      this.modelType,
      this.version,
      validationErrors,
      this.originalError,
    );
  }
}

/**
 * 模型版本冲突异常
 * @description 当模型版本冲突时抛出
 */
export class ModelVersionConflictException extends ModelVersionException {
  constructor(
    modelType: string,
    version: string,
    conflictReason: string,
    originalError?: Error,
  ) {
    super(
      `Model '${modelType}' version '${version}' conflict: ${conflictReason}`,
      modelType,
      version,
      originalError,
    );
  }

  clone(): ModelVersionConflictException {
    const conflictReason = this.message.split(": ")[1] || "";
    return new ModelVersionConflictException(
      this.modelType,
      this.version,
      conflictReason,
      this.originalError,
    );
  }
}

/**
 * 模型版本异常详情接口
 * @description 描述模型版本异常的详细信息
 */
export interface ModelVersionExceptionDetails {
  /** 模型类型 */
  modelType: string;
  /** 版本号 */
  version: string;
  /** 原始错误消息 */
  originalError?: string;
  /** 错误堆栈 */
  stack?: string;
  /** 异常时间戳 */
  timestamp: Date;
}
