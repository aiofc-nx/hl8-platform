/**
 * @fileoverview 用例基类
 * @description 提供用例的基础功能和执行框架
 */

import { Injectable } from "@nestjs/common";
import { UseCaseInput } from "./use-case-input.base.js";
import { UseCaseOutput } from "./use-case-output.base.js";
import { UseCaseException } from "../../exceptions/use-case/use-case-exception.js";
import { UseCaseValidationException } from "../../exceptions/use-case/use-case-validation-exception.js";
import { Logger as Hl8Logger } from "@hl8/logger";

/**
 * 用例基类
 * @description 所有用例都应该继承此类
 * @template TInput 输入类型
 * @template TOutput 输出类型
 */
@Injectable()
export abstract class UseCase<
  TInput extends UseCaseInput,
  TOutput extends UseCaseOutput,
> {
  protected readonly logger: Hl8Logger;
  protected readonly useCaseName: string;

  constructor(logger: Hl8Logger) {
    this.logger = logger;
    this.useCaseName = this.constructor.name;
  }

  /**
   * 执行用例
   * @param input 输入数据
   * @returns 输出结果
   */
  public async execute(input: TInput): Promise<TOutput> {
    const startTime = Date.now();
    const correlationId = input.correlationId || this.generateCorrelationId();

    this.logger.log("用例开始执行", {
      useCase: this.useCaseName,
      correlationId,
      input: input.getSummary(),
    });

    try {
      // 验证输入
      await this.validateInput(input);

      // 执行业务逻辑
      const result = await this.executeBusinessLogic(input);

      // 设置执行时间
      result.setExecutionTime(startTime);

      this.logger.log("用例执行成功", {
        useCase: this.useCaseName,
        correlationId,
        executionTime: result.executionTime,
        result: result.getSummary(),
      });

      return result;
    } catch (error) {
      const executionTime = Date.now() - startTime;

      this.logger.error("用例执行失败", {
        useCase: this.useCaseName,
        correlationId,
        executionTime,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });

      // 如果是已知的用例异常，直接重新抛出
      if (
        error instanceof UseCaseException ||
        error instanceof UseCaseValidationException
      ) {
        throw error;
      }

      // 包装未知异常
      throw new UseCaseException(
        `用例执行失败: ${error instanceof Error ? error.message : String(error)}`,
        "USE_CASE_EXECUTION_FAILED" as any, // eslint-disable-line @typescript-eslint/no-explicit-any
        this.useCaseName,
        input,
        {
          originalError: error instanceof Error ? error.message : String(error),
          executionTime,
        },
        error instanceof Error ? error : undefined,
      );
    }
  }

  /**
   * 验证输入数据
   * @param input 输入数据
   * @throws UseCaseValidationException 验证失败时抛出
   */
  protected async validateInput(input: TInput): Promise<void> {
    try {
      await input.validate();
    } catch (error) {
      if (error instanceof UseCaseValidationException) {
        throw error;
      }

      throw new UseCaseValidationException(
        `输入验证失败: ${error instanceof Error ? error.message : String(error)}`,
        this.useCaseName,
        input,
        [error instanceof Error ? error.message : String(error)],
        {
          originalError: error instanceof Error ? error.message : String(error),
        },
        error instanceof Error ? error : undefined,
      );
    }
  }

  /**
   * 执行业务逻辑
   * @param input 输入数据
   * @returns 输出结果
   */
  protected abstract executeBusinessLogic(input: TInput): Promise<TOutput>;

  /**
   * 生成关联ID
   * @returns 关联ID
   */
  protected generateCorrelationId(): string {
    return `uc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 获取用例名称
   * @returns 用例名称
   */
  public getUseCaseName(): string {
    return this.useCaseName;
  }

  /**
   * 获取用例描述
   * @returns 用例描述
   */
  public abstract getDescription(): string;

  /**
   * 获取用例版本
   * @returns 用例版本
   */
  public getVersion(): string {
    return "1.0.0";
  }

  /**
   * 检查用例是否可用
   * @returns 是否可用
   */
  public isAvailable(): boolean {
    return true;
  }

  /**
   * 获取用例元数据
   * @returns 用例元数据
   */
  public getMetadata(): Record<string, unknown> {
    return {
      name: this.useCaseName,
      description: this.getDescription(),
      version: this.getVersion(),
      available: this.isAvailable(),
      inputType: this.getInputTypeName(),
      outputType: this.getOutputTypeName(),
    };
  }

  /**
   * 获取输入类型名称
   * @returns 输入类型名称
   */
  protected getInputTypeName(): string {
    // 通过泛型推断获取输入类型名称
    return "UseCaseInput";
  }

  /**
   * 获取输出类型名称
   * @returns 输出类型名称
   */
  protected getOutputTypeName(): string {
    // 通过泛型推断获取输出类型名称
    return "UseCaseOutput";
  }
}
