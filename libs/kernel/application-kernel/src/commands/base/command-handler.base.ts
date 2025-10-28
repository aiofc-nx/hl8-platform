/**
 * @fileoverview 命令处理器基类
 * @description 基于@nestjs/cqrs官方CommandHandler实现的命令处理器基类
 */

import { Injectable } from "@nestjs/common";
import { BaseCommand } from "./command.base.js";
import { CommandResult } from "./command-result.js";
import { CommandExecutionException } from "../../exceptions/command/command-execution-exception.js";
import { CommandValidationException } from "../../exceptions/command/command-validation-exception.js";
import { Logger as Hl8Logger } from "@hl8/logger";

/**
 * 命令处理器基类
 * @description 所有命令处理器都应该继承此类
 * @template TCommand 命令类型
 * @template TResult 结果类型
 */
@Injectable()
export abstract class BaseCommandHandler<
  TCommand extends BaseCommand,
  TResult = unknown,
> {
  protected readonly logger: Hl8Logger;
  protected readonly handlerName: string;

  constructor(logger: Hl8Logger) {
    this.logger = logger;
    this.handlerName = this.constructor.name;
  }

  /**
   * 执行命令
   * @param command 命令
   * @returns 命令结果
   */
  public async execute(command: TCommand): Promise<CommandResult<TResult>> {
    const startTime = Date.now();
    const correlationId = command.correlationId || this.generateCorrelationId();

    this.logger.log("命令开始执行", {
      handler: this.handlerName,
      command: command.getSummary(),
      correlationId,
    });

    try {
      // 验证命令
      await this.validateCommand(command);

      // 执行命令逻辑
      const result = await this.executeCommand(command);

      // 设置执行时间
      result.setExecutionTime(startTime);

      this.logger.log("命令执行成功", {
        handler: this.handlerName,
        command: command.getSummary(),
        correlationId,
        result: result.getSummary(),
      });

      return result;
    } catch (error) {
      const executionTime = Date.now() - startTime;

      this.logger.error("命令执行失败", {
        handler: this.handlerName,
        command: command.getSummary(),
        correlationId,
        executionTime,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });

      // 如果是已知的命令异常，直接重新抛出
      if (
        error instanceof CommandExecutionException ||
        error instanceof CommandValidationException
      ) {
        throw error;
      }

      // 包装未知异常
      throw new CommandExecutionException(
        `命令执行失败: ${error instanceof Error ? error.message : String(error)}`,
        "COMMAND_EXECUTION_FAILED" as any, // eslint-disable-line @typescript-eslint/no-explicit-any
        command.commandType,
        command.commandId as any, // eslint-disable-line @typescript-eslint/no-explicit-any
        this.handlerName,
        {
          originalError: error instanceof Error ? error.message : String(error),
          executionTime,
        },
        error instanceof Error ? error : undefined,
      );
    }
  }

  /**
   * 验证命令
   * @param command 命令
   * @throws CommandValidationException 验证失败时抛出
   */
  protected async validateCommand(command: TCommand): Promise<void> {
    try {
      // 这里可以添加命令特定的验证逻辑
      await this.performCommandValidation(command);
    } catch (error) {
      if (error instanceof CommandValidationException) {
        throw error;
      }

      throw new CommandValidationException(
        `命令验证失败: ${error instanceof Error ? error.message : String(error)}`,
        command.commandType,
        command.commandId as any, // eslint-disable-line @typescript-eslint/no-explicit-any
        this.handlerName,
        [error instanceof Error ? error.message : String(error)],
        {
          originalError: error instanceof Error ? error.message : String(error),
        },
        error instanceof Error ? error : undefined,
      );
    }
  }

  /**
   * 执行命令逻辑
   * @param command 命令
   * @returns 命令结果
   */
  protected abstract executeCommand(
    command: TCommand,
  ): Promise<CommandResult<TResult>>;

  /**
   * 执行命令验证
   * @param _command 命令
   * @throws Error 验证失败时抛出
   */
  protected async performCommandValidation(_command: TCommand): Promise<void> {
    // 子类可以重写此方法来实现特定的验证逻辑
    // 默认不进行额外验证
  }

  /**
   * 生成关联ID
   * @returns 关联ID
   */
  protected generateCorrelationId(): string {
    return `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 获取处理器名称
   * @returns 处理器名称
   */
  public getHandlerName(): string {
    return this.handlerName;
  }

  /**
   * 获取处理器描述
   * @returns 处理器描述
   */
  public abstract getDescription(): string;

  /**
   * 获取处理器版本
   * @returns 处理器版本
   */
  public getVersion(): string {
    return "1.0.0";
  }

  /**
   * 检查处理器是否可用
   * @returns 是否可用
   */
  public isAvailable(): boolean {
    return true;
  }

  /**
   * 获取处理器元数据
   * @returns 处理器元数据
   */
  public getMetadata(): Record<string, unknown> {
    return {
      name: this.handlerName,
      description: this.getDescription(),
      version: this.getVersion(),
      available: this.isAvailable(),
      commandType: this.getCommandTypeName(),
      resultType: this.getResultTypeName(),
    };
  }

  /**
   * 获取命令类型名称
   * @returns 命令类型名称
   */
  protected getCommandTypeName(): string {
    // 通过泛型推断获取命令类型名称
    return "BaseCommand";
  }

  /**
   * 获取结果类型名称
   * @returns 结果类型名称
   */
  protected getResultTypeName(): string {
    // 通过泛型推断获取结果类型名称
    return "CommandResult";
  }
}
