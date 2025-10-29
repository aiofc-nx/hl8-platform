/**
 * @fileoverview Value Object Factory Interface - 值对象工厂接口
 * @description 值对象创建工厂的通用接口定义
 */

import { ValueObject } from "../value-objects/base/value-object.base.js";
import { ValidationResult } from "../validation/index.js";

/**
 * 值对象创建参数接口
 * @description 值对象创建时的参数
 */
export interface ValueObjectCreationParams {
  /** 值对象的值 */
  value: unknown;
  /** 创建选项 */
  options?: ValueObjectCreationOptions;
  /** 验证规则 */
  validationRules?: string[];
  /** 自定义数据 */
  customData?: Record<string, unknown>;
}

/**
 * 值对象创建选项接口
 * @description 值对象创建时的选项
 */
export interface ValueObjectCreationOptions {
  /** 是否严格验证 */
  strictValidation?: boolean;
  /** 是否允许空值 */
  allowNull?: boolean;
  /** 是否允许未定义值 */
  allowUndefined?: boolean;
  /** 是否自动转换类型 */
  autoConvert?: boolean;
  /** 转换函数 */
  converter?: (value: unknown) => unknown;
  /** 验证上下文 */
  validationContext?: Record<string, unknown>;
}

/**
 * 值对象工厂接口
 * @description 提供值对象创建和重构的工厂方法
 * @template T 值对象类型
 */
export interface IValueObjectFactory<T extends ValueObject<unknown>> {
  /**
   * 创建新值对象
   * @description 根据创建参数创建新的值对象实例
   * @param params 值对象创建参数
   * @returns 新创建的值对象实例
   * @throws {FactoryException} 当创建失败时抛出
   */
  create(params: ValueObjectCreationParams): T;

  /**
   * 重构值对象
   * @description 从持久化数据重构值对象实例
   * @param value 值对象的值
   * @param metadata 元数据
   * @returns 重构的值对象实例
   * @throws {FactoryException} 当重构失败时抛出
   */
  reconstitute(value: unknown, metadata?: ValueObjectMetadata): T;

  /**
   * 克隆值对象
   * @description 创建值对象的深拷贝
   * @param valueObject 要克隆的值对象
   * @returns 克隆的值对象实例
   * @throws {FactoryException} 当克隆失败时抛出
   */
  clone(valueObject: T): T;

  /**
   * 验证创建参数
   * @description 验证值对象创建参数的有效性
   * @param params 值对象创建参数
   * @returns 验证结果
   */
  validateCreationParams(params: ValueObjectCreationParams): ValidationResult;

  /**
   * 获取值对象类型名称
   * @description 获取工厂处理的值对象类型名称
   * @returns 值对象类型名称
   */
  getValueObjectTypeName(): string;

  /**
   * 检查是否支持值对象类型
   * @description 检查工厂是否支持指定的值对象类型
   * @param valueObjectType 值对象类型
   * @returns 是否支持
   */
  supportsValueObjectType(valueObjectType: string): boolean;

  /**
   * 获取支持的验证规则
   * @description 获取工厂支持的所有验证规则
   * @returns 验证规则列表
   */
  getSupportedValidationRules(): string[];

  /**
   * 检查是否支持验证规则
   * @description 检查工厂是否支持指定的验证规则
   * @param ruleName 验证规则名称
   * @returns 是否支持
   */
  supportsValidationRule(ruleName: string): boolean;
}

/**
 * 值对象元数据接口
 * @description 值对象的元数据信息
 */
export interface ValueObjectMetadata {
  /** 创建时间 */
  createdAt?: Date;
  /** 版本号 */
  version?: number;
  /** 创建者 */
  createdBy?: string;
  /** 标签 */
  tags?: string[];
  /** 自定义元数据 */
  customMetadata?: Record<string, unknown>;
}

/**
 * 值对象工厂构建器接口
 * @description 用于构建值对象工厂的构建器
 * @template T 值对象类型
 */
export interface IValueObjectFactoryBuilder<T extends ValueObject<unknown>> {
  /**
   * 设置值对象类型
   * @param valueObjectType 值对象类型
   * @returns 构建器实例
   */
  setValueObjectType(valueObjectType: string): IValueObjectFactoryBuilder<T>;

  /**
   * 设置创建函数
   * @param createFn 创建函数
   * @returns 构建器实例
   */
  setCreateFunction(
    createFn: (params: ValueObjectCreationParams) => T,
  ): IValueObjectFactoryBuilder<T>;

  /**
   * 设置重构函数
   * @param reconstituteFn 重构函数
   * @returns 构建器实例
   */
  setReconstituteFunction(
    reconstituteFn: (value: unknown, metadata?: ValueObjectMetadata) => T,
  ): IValueObjectFactoryBuilder<T>;

  /**
   * 设置克隆函数
   * @param cloneFn 克隆函数
   * @returns 构建器实例
   */
  setCloneFunction(
    cloneFn: (valueObject: T) => T,
  ): IValueObjectFactoryBuilder<T>;

  /**
   * 设置验证函数
   * @param validateFn 验证函数
   * @returns 构建器实例
   */
  setValidationFunction(
    validateFn: (params: ValueObjectCreationParams) => ValidationResult,
  ): IValueObjectFactoryBuilder<T>;

  /**
   * 添加支持的验证规则
   * @param ruleName 验证规则名称
   * @returns 构建器实例
   */
  addSupportedValidationRule(ruleName: string): IValueObjectFactoryBuilder<T>;

  /**
   * 构建值对象工厂
   * @returns 值对象工厂实例
   */
  build(): IValueObjectFactory<T>;
}

/**
 * 值对象工厂注册表接口
 * @description 管理多个值对象工厂的注册表
 */
export interface IValueObjectFactoryRegistry {
  /**
   * 注册值对象工厂
   * @param valueObjectType 值对象类型
   * @param factory 值对象工厂
   */
  registerFactory<T extends ValueObject<unknown>>(
    valueObjectType: string,
    factory: IValueObjectFactory<T>,
  ): void;

  /**
   * 获取值对象工厂
   * @param valueObjectType 值对象类型
   * @returns 值对象工厂或undefined
   */
  getFactory<T extends ValueObject<unknown>>(
    valueObjectType: string,
  ): IValueObjectFactory<T> | undefined;

  /**
   * 检查是否已注册
   * @param valueObjectType 值对象类型
   * @returns 是否已注册
   */
  isRegistered(valueObjectType: string): boolean;

  /**
   * 注销值对象工厂
   * @param valueObjectType 值对象类型
   */
  unregisterFactory(valueObjectType: string): void;

  /**
   * 获取所有已注册的值对象类型
   * @returns 值对象类型列表
   */
  getRegisteredValueObjectTypes(): string[];

  /**
   * 清空所有注册
   */
  clear(): void;
}
