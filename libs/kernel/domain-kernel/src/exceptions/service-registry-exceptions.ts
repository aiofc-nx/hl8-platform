/**
 * @fileoverview 服务注册表异常类定义
 * @description 定义服务注册表操作相关的异常类型
 */

import {
  DomainException,
  ExceptionSeverity,
} from "./base/domain-exception.base.js";
import { ExceptionType } from "./base/exception-type.enum.js";

/**
 * 服务注册表异常基类
 * @description 所有服务注册表相关异常的基类
 */
export abstract class ServiceRegistryException extends DomainException {
  constructor(
    message: string,
    public readonly serviceType: string,
    public readonly operation: string,
    public readonly originalError?: Error,
  ) {
    super(
      message,
      ExceptionType.SYSTEM,
      "SERVICE_REGISTRY_ERROR",
      {
        serviceType,
        operation,
      },
      originalError,
    );
  }

  abstract clone(): ServiceRegistryException;

  getSeverity(): ExceptionSeverity {
    return ExceptionSeverity.HIGH;
  }

  isRecoverable(): boolean {
    return false;
  }

  getSuggestion(): string {
    return "请检查服务注册表配置和服务依赖";
  }

  /**
   * 获取异常详情
   * @returns 异常详情对象
   */
  getDetails(): ServiceRegistryExceptionDetails {
    return {
      serviceType: this.serviceType,
      operation: this.operation,
      originalError: this.originalError?.message,
      stack: this.stack,
      timestamp: new Date(),
    };
  }
}

/**
 * 服务注册失败异常
 * @description 当服务注册失败时抛出
 */
export class ServiceRegistrationFailedException extends ServiceRegistryException {
  constructor(serviceType: string, reason: string, originalError?: Error) {
    super(
      `Service '${serviceType}' registration failed: ${reason}`,
      serviceType,
      "register",
      originalError,
    );
  }

  clone(): ServiceRegistrationFailedException {
    const reason = this.message.split(": ")[1] || "";
    return new ServiceRegistrationFailedException(
      this.serviceType,
      reason,
      this.originalError,
    );
  }
}

/**
 * 服务未找到异常
 * @description 当尝试获取未注册的服务时抛出
 */
export class ServiceNotFoundException extends ServiceRegistryException {
  constructor(serviceType: string, operation: string = "get") {
    super(`Service '${serviceType}' not found`, serviceType, operation);
  }

  clone(): ServiceNotFoundException {
    return new ServiceNotFoundException(this.serviceType, this.operation);
  }
}

/**
 * 服务已存在异常
 * @description 当尝试注册已存在的服务时抛出
 */
export class ServiceAlreadyExistsException extends ServiceRegistryException {
  constructor(serviceType: string, operation: string = "register") {
    super(`Service '${serviceType}' already exists`, serviceType, operation);
  }

  clone(): ServiceAlreadyExistsException {
    return new ServiceAlreadyExistsException(this.serviceType, this.operation);
  }
}

/**
 * 服务依赖缺失异常
 * @description 当服务缺少必要依赖时抛出
 */
export class ServiceMissingDependencyException extends ServiceRegistryException {
  constructor(
    serviceType: string,
    missingDependencies: string[],
    originalError?: Error,
  ) {
    super(
      `Service '${serviceType}' is missing required dependencies: ${missingDependencies.join(", ")}`,
      serviceType,
      "validateDependencies",
      originalError,
    );
  }

  clone(): ServiceMissingDependencyException {
    const match = this.message.split(": ")[1];
    const missingDependencies = match ? match.split(", ") : [];
    return new ServiceMissingDependencyException(
      this.serviceType,
      missingDependencies,
      this.originalError,
    );
  }
}

/**
 * 服务循环依赖异常
 * @description 当检测到服务循环依赖时抛出
 */
export class ServiceCircularDependencyException extends ServiceRegistryException {
  constructor(
    serviceType: string,
    dependencyCycle: string[],
    originalError?: Error,
  ) {
    super(
      `Service '${serviceType}' has circular dependency: ${dependencyCycle.join(" -> ")}`,
      serviceType,
      "validateDependencies",
      originalError,
    );
  }

  clone(): ServiceCircularDependencyException {
    const match = this.message.match(/circular dependency: (.+)$/);
    const dependencyCycle = match ? match[1].split(" -> ") : [];
    return new ServiceCircularDependencyException(
      this.serviceType,
      dependencyCycle,
      this.originalError,
    );
  }
}

/**
 * 服务配置异常
 * @description 当服务配置无效时抛出
 */
export class ServiceConfigurationException extends ServiceRegistryException {
  constructor(
    serviceType: string,
    configurationError: string,
    originalError?: Error,
  ) {
    super(
      `Service '${serviceType}' configuration error: ${configurationError}`,
      serviceType,
      "configure",
      originalError,
    );
  }

  clone(): ServiceConfigurationException {
    const configurationError = this.message.split(": ")[1] || "";
    return new ServiceConfigurationException(
      this.serviceType,
      configurationError,
      this.originalError,
    );
  }
}

/**
 * 服务生命周期异常
 * @description 当服务生命周期操作失败时抛出
 */
export class ServiceLifecycleException extends ServiceRegistryException {
  constructor(
    serviceType: string,
    lifecycleOperation: string,
    lifecycleError: string,
    originalError?: Error,
  ) {
    super(
      `Service '${serviceType}' lifecycle operation '${lifecycleOperation}' failed: ${lifecycleError}`,
      serviceType,
      lifecycleOperation,
      originalError,
    );
  }

  clone(): ServiceLifecycleException {
    const match = this.message.match(/lifecycle operation '([^']+)': (.+)$/);
    return new ServiceLifecycleException(
      this.serviceType,
      match ? match[1] : this.operation,
      match ? match[2] : "",
      this.originalError,
    );
  }
}

/**
 * 服务验证异常
 * @description 当服务验证失败时抛出
 */
export class ServiceValidationException extends ServiceRegistryException {
  constructor(
    serviceType: string,
    validationErrors: string[],
    originalError?: Error,
  ) {
    super(
      `Service '${serviceType}' validation failed: ${validationErrors.join(", ")}`,
      serviceType,
      "validate",
      originalError,
    );
  }

  clone(): ServiceValidationException {
    const match = this.message.split(": ")[1];
    const validationErrors = match ? match.split(", ") : [];
    return new ServiceValidationException(
      this.serviceType,
      validationErrors,
      this.originalError,
    );
  }
}

/**
 * 服务注册表异常详情接口
 * @description 描述服务注册表异常的详细信息
 */
export interface ServiceRegistryExceptionDetails {
  /** 服务类型 */
  serviceType: string;
  /** 操作类型 */
  operation: string;
  /** 原始错误消息 */
  originalError?: string;
  /** 错误堆栈 */
  stack?: string;
  /** 异常时间戳 */
  timestamp: Date;
}
