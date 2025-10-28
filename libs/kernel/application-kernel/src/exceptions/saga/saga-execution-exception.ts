/**
 * @fileoverview Saga执行异常类
 * @description Saga执行相关的异常
 */

import { ApplicationException } from "../base/application-exception.base.js";
import { ExceptionCodes } from "../base/exception-codes.js";
import { EntityId } from "@hl8/domain-kernel";

/**
 * Saga执行异常类
 * @description Saga执行相关的异常
 */
export class SagaExecutionException extends ApplicationException {
  private readonly _sagaName: string;
  private readonly _stepName: string;
  private readonly _sagaId: EntityId;

  /**
   * 创建Saga执行异常
   * @param message 异常消息
   * @param errorCode 错误代码
   * @param sagaName Saga名称
   * @param stepName 步骤名称
   * @param sagaId Saga ID
   * @param context 异常上下文
   * @param cause 原始异常
   * @param exceptionId 异常标识符，可选，默认自动生成
   */
  constructor(
    message: string,
    errorCode: ExceptionCodes,
    sagaName: string,
    stepName: string,
    sagaId: EntityId,
    context: Record<string, unknown> = {},
    cause?: Error,
    exceptionId?: EntityId,
  ) {
    super(
      message,
      errorCode,
      "Saga",
      "execute",
      {
        ...context,
        sagaName,
        stepName,
        sagaId: sagaId.toString(),
      },
      cause,
      exceptionId,
    );

    this._sagaName = sagaName;
    this._stepName = stepName;
    this._sagaId = sagaId;
  }

  /**
   * 获取Saga名称
   * @returns Saga名称
   */
  public getSagaName(): string {
    return this._sagaName;
  }

  /**
   * 获取步骤名称
   * @returns 步骤名称
   */
  public getStepName(): string {
    return this._stepName;
  }

  /**
   * 获取Saga ID
   * @returns Saga ID
   */
  public getSagaId(): EntityId {
    return this._sagaId;
  }

  /**
   * 克隆异常
   * @returns 新的Saga执行异常实例
   */
  public clone(): SagaExecutionException {
    return new SagaExecutionException(
      this.message,
      this.errorCode as ExceptionCodes,
      this._sagaName,
      this._stepName,
      this._sagaId,
      this.context,
      this.cause,
      this.exceptionId,
    );
  }
}
