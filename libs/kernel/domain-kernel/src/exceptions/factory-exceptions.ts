/**
 * @fileoverview 工厂异常类定义
 * @description 定义工厂操作相关的异常类型
 */

import {
  DomainException,
  ExceptionSeverity,
} from "./base/domain-exception.base.js";
import { ExceptionType } from "./base/exception-type.enum.js";

/**
 * 工厂异常基类
 * @description 所有工厂相关异常的基类
 */
export abstract class FactoryException extends DomainException {
  constructor(
    message: string,
    public readonly factoryType: string,
    public readonly creationParams: unknown,
    public readonly originalError?: Error,
  ) {
    super(
      message,
      ExceptionType.SYSTEM,
      "FACTORY_ERROR",
      {
        factoryType,
        creationParams,
      },
      originalError,
    );
  }

  abstract clone(): FactoryException;

  getSeverity(): ExceptionSeverity {
    return ExceptionSeverity.HIGH;
  }

  isRecoverable(): boolean {
    return false;
  }

  getSuggestion(): string {
    return "请检查工厂配置和创建参数";
  }

  /**
   * 获取异常详情
   * @returns 异常详情对象
   */
  getDetails(): FactoryExceptionDetails {
    return {
      factoryType: this.factoryType,
      creationParams: this.creationParams,
      originalError: this.originalError?.message,
      stack: this.stack,
      timestamp: new Date(),
    };
  }
}

/**
 * 工厂创建失败异常
 * @description 当工厂无法创建对象时抛出
 */
export class FactoryCreationFailedException extends FactoryException {
  constructor(
    factoryType: string,
    creationParams: unknown,
    reason: string,
    originalError?: Error,
  ) {
    super(
      `Factory '${factoryType}' failed to create object: ${reason}`,
      factoryType,
      creationParams,
      originalError,
    );
  }

  clone(): FactoryCreationFailedException {
    return new FactoryCreationFailedException(
      this.factoryType,
      this.creationParams,
      this.message.split(": ")[1] || "",
      this.originalError,
    );
  }
}

/**
 * 工厂参数无效异常
 * @description 当工厂参数无效时抛出
 */
export class FactoryInvalidParametersException extends FactoryException {
  constructor(
    factoryType: string,
    creationParams: unknown,
    validationErrors: string[],
    originalError?: Error,
  ) {
    super(
      `Factory '${factoryType}' received invalid parameters: ${validationErrors.join(", ")}`,
      factoryType,
      creationParams,
      originalError,
    );
  }

  clone(): FactoryInvalidParametersException {
    const msg = this.message.split(": ")[1] || "";
    const parsed = msg ? msg.split(", ") : [];
    return new FactoryInvalidParametersException(
      this.factoryType,
      this.creationParams,
      parsed,
      this.originalError,
    );
  }
}

/**
 * 工厂依赖缺失异常
 * @description 当工厂缺少必要依赖时抛出
 */
export class FactoryMissingDependencyException extends FactoryException {
  constructor(
    factoryType: string,
    creationParams: unknown,
    missingDependencies: string[],
    originalError?: Error,
  ) {
    super(
      `Factory '${factoryType}' is missing required dependencies: ${missingDependencies.join(", ")}`,
      factoryType,
      creationParams,
      originalError,
    );
  }

  clone(): FactoryMissingDependencyException {
    const msg = this.message.split(": ")[1] || "";
    const parsed = msg ? msg.split(", ") : [];
    return new FactoryMissingDependencyException(
      this.factoryType,
      this.creationParams,
      parsed,
      this.originalError,
    );
  }
}

/**
 * 工厂配置异常
 * @description 当工厂配置无效时抛出
 */
export class FactoryConfigurationException extends FactoryException {
  constructor(
    factoryType: string,
    configurationError: string,
    originalError?: Error,
  ) {
    super(
      `Factory '${factoryType}' configuration error: ${configurationError}`,
      factoryType,
      {},
      originalError,
    );
  }

  clone(): FactoryConfigurationException {
    const msg = this.message.split(": ")[1] || "";
    return new FactoryConfigurationException(
      this.factoryType,
      msg,
      this.originalError,
    );
  }
}

/**
 * 工厂类型不支持异常
 * @description 当工厂不支持指定类型时抛出
 */
export class FactoryUnsupportedTypeException extends FactoryException {
  constructor(
    factoryType: string,
    requestedType: string,
    supportedTypes: string[],
    originalError?: Error,
  ) {
    super(
      `Factory '${factoryType}' does not support type '${requestedType}'. Supported types: ${supportedTypes.join(", ")}`,
      factoryType,
      { requestedType, supportedTypes },
      originalError,
    );
  }

  clone(): FactoryUnsupportedTypeException {
    // 从 message 解析 requestedType 与 supportedTypes
    // 形如: "does not support type 'X'. Supported types: A, B"
    const m = this.message;
    const reqMatch = m.match(/does not support type '([^']+)'/);
    const requested = reqMatch ? reqMatch[1] : "";
    const supMatch = m.match(/Supported types: (.*)$/);
    const supported = supMatch && supMatch[1] ? supMatch[1].split(", ") : [];
    return new FactoryUnsupportedTypeException(
      this.factoryType,
      requested,
      supported,
      this.originalError,
    );
  }
}

/**
 * 工厂初始化异常
 * @description 当工厂初始化失败时抛出
 */
export class FactoryInitializationException extends FactoryException {
  constructor(
    factoryType: string,
    initializationError: string,
    originalError?: Error,
  ) {
    super(
      `Factory '${factoryType}' initialization failed: ${initializationError}`,
      factoryType,
      {},
      originalError,
    );
  }

  clone(): FactoryInitializationException {
    const msg = this.message.split(": ")[1] || "";
    return new FactoryInitializationException(
      this.factoryType,
      msg,
      this.originalError,
    );
  }
}

/**
 * 工厂异常详情接口
 * @description 描述工厂异常的详细信息
 */
export interface FactoryExceptionDetails {
  /** 工厂类型 */
  factoryType: string;
  /** 创建参数 */
  creationParams: unknown;
  /** 原始错误消息 */
  originalError?: string;
  /** 错误堆栈 */
  stack?: string;
  /** 异常时间戳 */
  timestamp: Date;
}
