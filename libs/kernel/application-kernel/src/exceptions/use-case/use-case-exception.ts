/**
 * @fileoverview 用例异常类
 * @description 用例执行相关的异常
 */

import { ApplicationException } from "../base/application-exception.base.js";
import { ExceptionCodes } from "../base/exception-codes.js";
import { EntityId } from "@hl8/domain-kernel";

/**
 * 用例异常类
 * @description 用例执行相关的异常
 */
export class UseCaseException extends ApplicationException {
  private readonly _useCaseName: string;
  private readonly _inputData: unknown;

  /**
   * 创建用例异常
   * @param message 异常消息
   * @param errorCode 错误代码
   * @param useCaseName 用例名称
   * @param inputData 输入数据
   * @param context 异常上下文
   * @param cause 原始异常
   * @param exceptionId 异常标识符，可选，默认自动生成
   */
  constructor(
    message: string,
    errorCode: ExceptionCodes,
    useCaseName: string,
    inputData: unknown,
    context: Record<string, unknown> = {},
    cause?: Error,
    exceptionId?: EntityId,
  ) {
    super(
      message,
      errorCode,
      "UseCase",
      "execute",
      {
        ...context,
        useCaseName,
        inputData: UseCaseException.serializeInputDataStatic(inputData),
      },
      cause,
      exceptionId,
    );

    this._useCaseName = useCaseName;
    this._inputData = inputData;
  }

  /**
   * 获取用例名称
   * @returns 用例名称
   */
  public getUseCaseName(): string {
    return this._useCaseName;
  }

  /**
   * 获取输入数据
   * @returns 输入数据
   */
  public getInputData(): unknown {
    return this._inputData;
  }

  /**
   * 克隆异常
   * @returns 新的用例异常实例
   */
  public clone(): UseCaseException {
    return new UseCaseException(
      this.message,
      this.errorCode as ExceptionCodes,
      this._useCaseName,
      this._inputData,
      this.context,
      this.cause,
      this.exceptionId,
    );
  }

  /**
   * 序列化输入数据（静态方法）
   * @param data 输入数据
   * @returns 序列化后的数据
   */
  private static serializeInputDataStatic(data: unknown): unknown {
    try {
      // 尝试序列化，如果失败则返回字符串表示
      return JSON.parse(JSON.stringify(data));
    } catch {
      return String(data);
    }
  }
}
