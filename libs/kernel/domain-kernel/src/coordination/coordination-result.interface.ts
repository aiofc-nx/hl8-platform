/**
 * @fileoverview 协调结果接口定义
 * @description 定义领域服务协调结果的数据结构和行为
 */

import {
  ICoordinationResult,
  CoordinationResultSummary,
} from "./coordination-rule.interface.js";

/**
 * 协调结果实现类
 * @description 提供协调规则执行结果的具体实现
 */
export class CoordinationResult implements ICoordinationResult {
  public readonly id: string;
  public readonly ruleId: string;
  public readonly contextId: string;
  public readonly success: boolean;
  public readonly data: unknown;
  public readonly message: string;
  public readonly startTime: Date;
  public readonly endTime: Date;
  public readonly duration: number;
  public readonly error?: Error;
  public readonly warnings: string[];
  public readonly metadata: Record<string, unknown>;

  constructor(
    ruleId: string,
    contextId: string,
    success: boolean,
    data: unknown = null,
    message: string = "",
    startTime: Date = new Date(),
    endTime: Date = new Date(),
    error?: Error,
    warnings: string[] = [],
    metadata: Record<string, unknown> = {},
  ) {
    this.id = this.generateId();
    this.ruleId = ruleId;
    this.contextId = contextId;
    this.success = success;
    this.data = data;
    this.message = message;
    this.startTime = startTime;
    this.endTime = endTime;
    this.duration = endTime.getTime() - startTime.getTime();
    this.error = error;
    this.warnings = warnings;
    this.metadata = metadata;
  }

  /**
   * 检查是否有错误
   * @returns 是否有错误
   */
  hasError(): boolean {
    return this.error !== undefined;
  }

  /**
   * 检查是否有警告
   * @returns 是否有警告
   */
  hasWarnings(): boolean {
    return this.warnings.length > 0;
  }

  /**
   * 获取执行摘要
   * @returns 执行摘要
   */
  getSummary(): CoordinationResultSummary {
    return {
      status: this.success ? "success" : "failed",
      duration: this.duration,
      errorCount: this.hasError() ? 1 : 0,
      warningCount: this.warnings.length,
      serviceCount: 0, // 需要从上下文获取
      ruleCount: 1,
      successRate: this.success ? 100 : 0,
    };
  }

  /**
   * 生成唯一ID
   * @returns 唯一ID
   */
  private generateId(): string {
    return `result_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * 协调结果构建器接口
 * @description 提供链式API构建协调结果
 */
export interface ICoordinationResultBuilder {
  /**
   * 设置规则ID
   * @param ruleId 规则ID
   * @returns 构建器实例
   */
  withRuleId(ruleId: string): ICoordinationResultBuilder;

  /**
   * 设置上下文ID
   * @param contextId 上下文ID
   * @returns 构建器实例
   */
  withContextId(contextId: string): ICoordinationResultBuilder;

  /**
   * 设置成功状态
   * @param success 是否成功
   * @returns 构建器实例
   */
  withSuccess(success: boolean): ICoordinationResultBuilder;

  /**
   * 设置结果数据
   * @param data 结果数据
   * @returns 构建器实例
   */
  withData(data: unknown): ICoordinationResultBuilder;

  /**
   * 设置结果消息
   * @param message 结果消息
   * @returns 构建器实例
   */
  withMessage(message: string): ICoordinationResultBuilder;

  /**
   * 设置执行时间
   * @param startTime 开始时间
   * @param endTime 结束时间
   * @returns 构建器实例
   */
  withExecutionTime(startTime: Date, endTime: Date): ICoordinationResultBuilder;

  /**
   * 设置错误
   * @param error 错误对象
   * @returns 构建器实例
   */
  withError(error: Error): ICoordinationResultBuilder;

  /**
   * 添加警告
   * @param warning 警告消息
   * @returns 构建器实例
   */
  withWarning(warning: string): ICoordinationResultBuilder;

  /**
   * 设置警告列表
   * @param warnings 警告列表
   * @returns 构建器实例
   */
  withWarnings(warnings: string[]): ICoordinationResultBuilder;

  /**
   * 添加元数据
   * @param key 元数据键
   * @param value 元数据值
   * @returns 构建器实例
   */
  withMetadata(key: string, value: unknown): ICoordinationResultBuilder;

  /**
   * 设置元数据
   * @param metadata 元数据对象
   * @returns 构建器实例
   */
  withMetadataObject(
    metadata: Record<string, unknown>,
  ): ICoordinationResultBuilder;

  /**
   * 构建协调结果
   * @returns 协调结果实例
   */
  build(): ICoordinationResult;
}

/**
 * 协调结果构建器实现类
 * @description 提供链式API构建协调结果的具体实现
 */
export class CoordinationResultBuilder implements ICoordinationResultBuilder {
  private ruleId: string = "";
  private contextId: string = "";
  private success: boolean = false;
  private data: unknown = null;
  private message: string = "";
  private startTime: Date = new Date();
  private endTime: Date = new Date();
  private error?: Error;
  private warnings: string[] = [];
  private metadata: Record<string, unknown> = {};

  withRuleId(ruleId: string): ICoordinationResultBuilder {
    this.ruleId = ruleId;
    return this;
  }

  withContextId(contextId: string): ICoordinationResultBuilder {
    this.contextId = contextId;
    return this;
  }

  withSuccess(success: boolean): ICoordinationResultBuilder {
    this.success = success;
    return this;
  }

  withData(data: unknown): ICoordinationResultBuilder {
    this.data = data;
    return this;
  }

  withMessage(message: string): ICoordinationResultBuilder {
    this.message = message;
    return this;
  }

  withExecutionTime(
    startTime: Date,
    endTime: Date,
  ): ICoordinationResultBuilder {
    this.startTime = startTime;
    this.endTime = endTime;
    return this;
  }

  withError(error: Error): ICoordinationResultBuilder {
    this.error = error;
    this.success = false;
    return this;
  }

  withWarning(warning: string): ICoordinationResultBuilder {
    if (!this.warnings.includes(warning)) {
      this.warnings.push(warning);
    }
    return this;
  }

  withWarnings(warnings: string[]): ICoordinationResultBuilder {
    this.warnings = [...warnings];
    return this;
  }

  withMetadata(key: string, value: unknown): ICoordinationResultBuilder {
    this.metadata[key] = value;
    return this;
  }

  withMetadataObject(
    metadata: Record<string, unknown>,
  ): ICoordinationResultBuilder {
    this.metadata = { ...this.metadata, ...metadata };
    return this;
  }

  build(): ICoordinationResult {
    return new CoordinationResult(
      this.ruleId,
      this.contextId,
      this.success,
      this.data,
      this.message,
      this.startTime,
      this.endTime,
      this.error,
      this.warnings,
      this.metadata,
    );
  }
}
