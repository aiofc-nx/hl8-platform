/**
 * @fileoverview 操作处理程序接口定义
 * @description 定义业务操作处理程序的基础接口和实现类
 */

import {
  IOperationHandler,
  OperationHandlerType,
  BusinessOperationType,
  OperationHandlerMetadata,
  IBusinessOperation,
  OperationParameters,
  OperationContext,
  OperationResult,
} from "./business-operation.interface.js";

/**
 * 操作处理程序基类
 * @description 提供操作处理程序的基础实现
 * @template T 聚合根类型
 */
export abstract class BaseOperationHandler<T> implements IOperationHandler<T> {
  public readonly id: string;
  public readonly name: string;
  public readonly handlerType: OperationHandlerType;
  public readonly supportedOperationTypes: BusinessOperationType[];
  public readonly priority: number;

  constructor(
    id: string,
    name: string,
    handlerType: OperationHandlerType,
    supportedOperationTypes: BusinessOperationType[],
    priority: number = 0,
  ) {
    this.id = id;
    this.name = name;
    this.handlerType = handlerType;
    this.supportedOperationTypes = supportedOperationTypes;
    this.priority = priority;
  }

  /**
   * 处理操作
   * @param operation 业务操作
   * @param aggregate 聚合根实例
   * @param parameters 操作参数
   * @param context 操作上下文
   * @returns 操作结果
   */
  abstract handle(
    operation: IBusinessOperation<T>,
    aggregate: T,
    parameters: OperationParameters,
    context: OperationContext,
  ): Promise<OperationResult>;

  /**
   * 检查是否支持操作类型
   * @param operationType 操作类型
   * @returns 是否支持
   */
  supports(operationType: BusinessOperationType): boolean {
    return this.supportedOperationTypes.includes(operationType);
  }

  /**
   * 获取处理程序元数据
   * @returns 处理程序元数据
   */
  abstract getMetadata(): OperationHandlerMetadata;
}

/**
 * 同步操作处理程序抽象类
 * @description 提供同步操作处理的基础实现
 * @template T 聚合根类型
 */
export abstract class SynchronousOperationHandler<
  T,
> extends BaseOperationHandler<T> {
  constructor(
    id: string,
    name: string,
    supportedOperationTypes: BusinessOperationType[],
    priority: number = 0,
  ) {
    super(
      id,
      name,
      OperationHandlerType.SYNCHRONOUS,
      supportedOperationTypes,
      priority,
    );
  }

  /**
   * 处理操作（同步实现）
   * @param operation 业务操作
   * @param aggregate 聚合根实例
   * @param parameters 操作参数
   * @param context 操作上下文
   * @returns 操作结果
   */
  async handle(
    operation: IBusinessOperation<T>,
    aggregate: T,
    parameters: OperationParameters,
    context: OperationContext,
  ): Promise<OperationResult> {
    return this.handleSync(operation, aggregate, parameters, context);
  }

  /**
   * 同步处理操作（由子类实现）
   * @param operation 业务操作
   * @param aggregate 聚合根实例
   * @param parameters 操作参数
   * @param context 操作上下文
   * @returns 操作结果
   */
  protected abstract handleSync(
    operation: IBusinessOperation<T>,
    aggregate: T,
    parameters: OperationParameters,
    context: OperationContext,
  ): Promise<OperationResult>;
}

/**
 * 异步操作处理程序抽象类
 * @description 提供异步操作处理的基础实现
 * @template T 聚合根类型
 */
export abstract class AsynchronousOperationHandler<
  T,
> extends BaseOperationHandler<T> {
  constructor(
    id: string,
    name: string,
    supportedOperationTypes: BusinessOperationType[],
    priority: number = 0,
  ) {
    super(
      id,
      name,
      OperationHandlerType.ASYNCHRONOUS,
      supportedOperationTypes,
      priority,
    );
  }

  /**
   * 处理操作（异步实现）
   * @param operation 业务操作
   * @param aggregate 聚合根实例
   * @param parameters 操作参数
   * @param context 操作上下文
   * @returns 操作结果
   */
  async handle(
    operation: IBusinessOperation<T>,
    aggregate: T,
    parameters: OperationParameters,
    context: OperationContext,
  ): Promise<OperationResult> {
    return this.handleAsync(operation, aggregate, parameters, context);
  }

  /**
   * 异步处理操作（由子类实现）
   * @param operation 业务操作
   * @param aggregate 聚合根实例
   * @param parameters 操作参数
   * @param context 操作上下文
   * @returns 操作结果
   */
  protected abstract handleAsync(
    operation: IBusinessOperation<T>,
    aggregate: T,
    parameters: OperationParameters,
    context: OperationContext,
  ): Promise<OperationResult>;
}
