/**
 * @fileoverview 验证错误实现
 * @description 提供验证错误的具体实现和功能
 */

import type {
  ValidationError as IValidationError,
  ValidationErrorData,
  ValidationErrorJSON,
  ValidationErrorPosition,
} from "./validation-error.interface.js";
import { ValidationErrorLevel } from "./validation-result.interface.js";

/**
 * 验证错误实现类
 * @description 提供验证错误的完整实现
 */
export class ValidationError implements IValidationError {
  /**
   * 错误消息
   */
  public readonly message: string;

  /**
   * 错误代码
   */
  public readonly code: string;

  /**
   * 字段名称
   */
  public readonly fieldName?: string;

  /**
   * 规则名称
   */
  public readonly ruleName?: string;

  /**
   * 错误级别
   */
  public readonly level: ValidationErrorLevel;

  /**
   * 错误详情
   */
  public readonly details?: Record<string, unknown>;

  /**
   * 错误时间戳
   */
  public readonly timestamp: number;

  /**
   * 错误路径
   */
  public readonly path?: string[];

  /**
   * 错误值
   */
  public readonly value?: unknown;

  /**
   * 错误位置
   */
  public readonly position?: ValidationErrorPosition;

  /**
   * 创建验证错误
   * @param data 错误数据
   */
  constructor(data: ValidationErrorData) {
    this.message = data.message;
    this.code = data.code;
    this.fieldName = data.fieldName;
    this.ruleName = data.ruleName;
    this.level = data.level;
    this.details = data.details;
    this.timestamp = data.timestamp ?? Date.now();
    this.path = data.path;
    this.value = data.value;
    this.position = data.position;
  }

  /**
   * 检查是否为错误级别
   * @returns 是否为错误级别
   */
  public isError(): boolean {
    return this.level === ValidationErrorLevel.ERROR;
  }

  /**
   * 检查是否为警告级别
   * @returns 是否为警告级别
   */
  public isWarning(): boolean {
    return this.level === ValidationErrorLevel.WARNING;
  }

  /**
   * 检查是否为信息级别
   * @returns 是否为信息级别
   */
  public isInfo(): boolean {
    return this.level === ValidationErrorLevel.INFO;
  }

  /**
   * 获取完整路径
   * @returns 完整的错误路径
   */
  public getFullPath(): string {
    const path = this.path ? [...this.path] : [];
    if (this.fieldName) {
      path.push(this.fieldName);
    }
    return path.join(".");
  }

  /**
   * 获取格式化消息
   * @returns 格式化的错误消息
   */
  public getFormattedMessage(): string {
    const path = this.getFullPath();
    return path ? `${path}: ${this.message}` : this.message;
  }

  /**
   * 转换为JSON格式
   * @returns JSON格式的错误信息
   */
  public toJSON(): ValidationErrorJSON {
    return {
      message: this.message,
      code: this.code,
      fieldName: this.fieldName,
      ruleName: this.ruleName,
      level: this.level,
      details: this.details,
      timestamp: this.timestamp,
      path: this.path,
      value: this.value,
      position: this.position,
    };
  }

  /**
   * 转换为字符串格式
   * @returns 字符串格式的错误信息
   */
  public toString(): string {
    return this.getFormattedMessage();
  }

  /**
   * 克隆错误
   * @param overrides 要覆盖的属性
   * @returns 克隆的错误实例
   */
  public clone(overrides?: Partial<ValidationErrorData>): ValidationError {
    return new ValidationError({
      message: this.message,
      code: this.code,
      fieldName: this.fieldName,
      ruleName: this.ruleName,
      level: this.level,
      details: this.details,
      timestamp: this.timestamp,
      path: this.path,
      value: this.value,
      position: this.position,
      ...overrides,
    });
  }

  /**
   * 创建错误级别的验证错误
   * @param message 错误消息
   * @param code 错误代码
   * @param options 其他选项
   * @returns 验证错误实例
   */
  public static error(
    message: string,
    code: string = "VALIDATION_ERROR",
    options?: {
      fieldName?: string;
      ruleName?: string;
      details?: Record<string, unknown>;
      path?: string[];
      value?: unknown;
      position?: ValidationErrorPosition;
    },
  ): ValidationError {
    return new ValidationError({
      message,
      code,
      level: ValidationErrorLevel.ERROR,
      fieldName: options?.fieldName,
      ruleName: options?.ruleName,
      details: options?.details,
      path: options?.path,
      value: options?.value,
      position: options?.position,
    });
  }

  /**
   * 创建警告级别的验证错误
   * @param message 警告消息
   * @param code 警告代码
   * @param options 其他选项
   * @returns 验证错误实例
   */
  public static warning(
    message: string,
    code: string = "VALIDATION_WARNING",
    options?: {
      fieldName?: string;
      ruleName?: string;
      details?: Record<string, unknown>;
      path?: string[];
      value?: unknown;
      position?: ValidationErrorPosition;
    },
  ): ValidationError {
    return new ValidationError({
      message,
      code,
      level: ValidationErrorLevel.WARNING,
      fieldName: options?.fieldName,
      ruleName: options?.ruleName,
      details: options?.details,
      path: options?.path,
      value: options?.value,
      position: options?.position,
    });
  }

  /**
   * 创建信息级别的验证错误
   * @param message 信息消息
   * @param code 信息代码
   * @param options 其他选项
   * @returns 验证错误实例
   */
  public static info(
    message: string,
    code: string = "VALIDATION_INFO",
    options?: {
      fieldName?: string;
      ruleName?: string;
      details?: Record<string, unknown>;
      path?: string[];
      value?: unknown;
      position?: ValidationErrorPosition;
    },
  ): ValidationError {
    return new ValidationError({
      message,
      code,
      level: ValidationErrorLevel.INFO,
      fieldName: options?.fieldName,
      ruleName: options?.ruleName,
      details: options?.details,
      path: options?.path,
      value: options?.value,
      position: options?.position,
    });
  }

  /**
   * 从JSON创建验证错误
   * @param json JSON数据
   * @returns 验证错误实例
   */
  public static fromJSON(json: ValidationErrorJSON): ValidationError {
    return new ValidationError({
      message: json.message,
      code: json.code,
      fieldName: json.fieldName,
      ruleName: json.ruleName,
      level: json.level as ValidationErrorLevel,
      details: json.details,
      timestamp: json.timestamp,
      path: json.path,
      value: json.value,
      position: json.position,
    });
  }

  /**
   * 创建验证错误构建器
   * @returns 验证错误构建器实例
   */
  public static builder(): ValidationErrorBuilder {
    return new ValidationErrorBuilder();
  }
}

/**
 * 验证错误构建器
 * @description 用于构建验证错误的构建器类
 */
export class ValidationErrorBuilder {
  private data: Partial<ValidationErrorData> = {};

  /**
   * 设置消息
   * @param message 错误消息
   * @returns 构建器实例
   */
  public setMessage(message: string): ValidationErrorBuilder {
    this.data.message = message;
    return this;
  }

  /**
   * 设置代码
   * @param code 错误代码
   * @returns 构建器实例
   */
  public setCode(code: string): ValidationErrorBuilder {
    this.data.code = code;
    return this;
  }

  /**
   * 设置字段名称
   * @param fieldName 字段名称
   * @returns 构建器实例
   */
  public setFieldName(fieldName: string): ValidationErrorBuilder {
    this.data.fieldName = fieldName;
    return this;
  }

  /**
   * 设置规则名称
   * @param ruleName 规则名称
   * @returns 构建器实例
   */
  public setRuleName(ruleName: string): ValidationErrorBuilder {
    this.data.ruleName = ruleName;
    return this;
  }

  /**
   * 设置级别
   * @param level 错误级别
   * @returns 构建器实例
   */
  public setLevel(level: ValidationErrorLevel): ValidationErrorBuilder {
    this.data.level = level;
    return this;
  }

  /**
   * 设置详情
   * @param details 错误详情
   * @returns 构建器实例
   */
  public setDetails(details: Record<string, unknown>): ValidationErrorBuilder {
    this.data.details = details;
    return this;
  }

  /**
   * 设置时间戳
   * @param timestamp 错误时间戳
   * @returns 构建器实例
   */
  public setTimestamp(timestamp: number): ValidationErrorBuilder {
    this.data.timestamp = timestamp;
    return this;
  }

  /**
   * 设置路径
   * @param path 错误路径
   * @returns 构建器实例
   */
  public setPath(path: string[]): ValidationErrorBuilder {
    this.data.path = path;
    return this;
  }

  /**
   * 设置值
   * @param value 错误值
   * @returns 构建器实例
   */
  public setValue(value: unknown): ValidationErrorBuilder {
    this.data.value = value;
    return this;
  }

  /**
   * 设置位置
   * @param position 错误位置
   * @returns 构建器实例
   */
  public setPosition(
    position: ValidationErrorPosition,
  ): ValidationErrorBuilder {
    this.data.position = position;
    return this;
  }

  /**
   * 构建验证错误
   * @returns 验证错误实例
   */
  public build(): ValidationError {
    if (!this.data.message) {
      throw new Error("ValidationError message is required");
    }
    if (!this.data.code) {
      throw new Error("ValidationError code is required");
    }
    if (!this.data.level) {
      throw new Error("ValidationError level is required");
    }

    return new ValidationError(this.data as ValidationErrorData);
  }

  /**
   * 重置构建器
   * @returns 构建器实例
   */
  public reset(): ValidationErrorBuilder {
    this.data = {};
    return this;
  }
}
