/**
 * @fileoverview Factory Exceptions - 工厂异常
 * @description 对象创建操作相关的异常
 */

import {
  DomainException,
  ExceptionSeverity,
} from "./base/domain-exception.base.js";
import { ExceptionType } from "./base/exception-type.enum.js";

/**
 * 工厂异常
 * @description 对象创建操作相关的异常
 */
export class FactoryException extends DomainException {
  constructor(
    message: string,
    public readonly factoryType: string,
    public readonly creationParams: unknown,
    originalError?: Error,
  ) {
    super(
      message,
      ExceptionType.SYSTEM,
      "FACTORY_ERROR",
      { factoryType, creationParams },
      originalError,
    );
  }

  clone(): FactoryException {
    return new FactoryException(
      this.message,
      this.factoryType,
      this.creationParams,
      this.cause,
    );
  }

  getSeverity(): ExceptionSeverity {
    return ExceptionSeverity.MEDIUM;
  }

  isRecoverable(): boolean {
    return true;
  }

  getSuggestion(): string {
    return `请检查${this.factoryType}的创建参数是否正确，或联系系统管理员`;
  }
}
