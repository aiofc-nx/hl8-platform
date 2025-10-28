/**
 * @fileoverview Saga补偿异常类
 * @description Saga补偿操作相关的异常
 */

import { SagaExecutionException } from "./saga-execution-exception.js";
import { ExceptionCodes } from "../base/exception-codes.js";
import { EntityId } from "@hl8/domain-kernel";

/**
 * Saga补偿异常类
 * @description Saga补偿操作相关的异常
 */
export class SagaCompensationException extends SagaExecutionException {
  private readonly _compensationStep: string;
  private readonly _originalError: Error;

  /**
   * 创建Saga补偿异常
   * @param message 异常消息
   * @param sagaName Saga名称
   * @param stepName 步骤名称
   * @param sagaId Saga ID
   * @param compensationStep 补偿步骤名称
   * @param originalError 原始错误
   * @param context 异常上下文
   * @param cause 原始异常
   * @param exceptionId 异常标识符，可选，默认自动生成
   */
  constructor(
    message: string,
    sagaName: string,
    stepName: string,
    sagaId: EntityId,
    compensationStep: string,
    originalError: Error,
    context: Record<string, unknown> = {},
    cause?: Error,
    exceptionId?: EntityId,
  ) {
    super(
      message,
      ExceptionCodes.SAGA_COMPENSATION_FAILED,
      sagaName,
      stepName,
      sagaId,
      {
        ...context,
        compensationStep,
        originalError: originalError.message,
        operation: "compensate", // Override operation in context
      },
      cause,
      exceptionId,
    );

    this._compensationStep = compensationStep;
    this._originalError = originalError;
    // Override the operation to "compensate" for compensation exceptions
    (this as unknown as { _operation: string })._operation = "compensate";
    // Update the context to reflect the correct operation
    (
      this as unknown as { _context: Record<string, unknown> }
    )._context.operation = "compensate";
  }

  /**
   * 获取补偿步骤名称
   * @returns 补偿步骤名称
   */
  public getCompensationStep(): string {
    return this._compensationStep;
  }

  /**
   * 获取原始错误
   * @returns 原始错误
   */
  public getOriginalError(): Error {
    return this._originalError;
  }

  /**
   * 获取补偿错误摘要
   * @returns 补偿错误摘要
   */
  public getCompensationSummary(): string {
    return `Saga补偿失败: ${this.getSagaName()} -> ${this._compensationStep} (原始错误: ${this._originalError.message})`;
  }

  /**
   * 克隆异常
   * @returns 新的Saga补偿异常实例
   */
  public clone(): SagaCompensationException {
    return new SagaCompensationException(
      this.message,
      this.getSagaName(),
      this.getStepName(),
      this.getSagaId(),
      this._compensationStep,
      this._originalError,
      this.context,
      this.cause,
      this.exceptionId,
    );
  }
}
