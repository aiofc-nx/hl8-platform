/**
 * @fileoverview 查询处理器基类
 * @description 基于@nestjs/cqrs官方QueryHandler实现的查询处理器基类
 */

import { Injectable } from "@nestjs/common";
import { BaseQuery } from "./query.base.js";
import { QueryResult } from "./query-result.js";
import { QueryExecutionException } from "../../exceptions/query/query-execution-exception.js";
import { QueryValidationException } from "../../exceptions/query/query-validation-exception.js";
import { Logger as Hl8Logger } from "@hl8/logger";

/**
 * 查询处理器基类
 * @description 所有查询处理器都应该继承此类
 * @template TQuery 查询类型
 * @template TResult 结果类型
 */
@Injectable()
export abstract class BaseQueryHandler<
  TQuery extends BaseQuery,
  TResult = unknown,
> {
  protected readonly logger: Hl8Logger;
  protected readonly handlerName: string;

  constructor(logger: Hl8Logger) {
    this.logger = logger;
    this.handlerName = this.constructor.name;
  }

  /**
   * 执行查询
   * @param query 查询
   * @returns 查询结果
   */
  public async execute(query: TQuery): Promise<QueryResult<TResult>> {
    const startTime = Date.now();
    const correlationId = query.correlationId || this.generateCorrelationId();

    this.logger.log("查询开始执行", {
      handler: this.handlerName,
      query: query.getSummary(),
      correlationId,
    });

    try {
      // 验证查询
      await this.validateQuery(query);

      // 执行查询逻辑
      const result = await this.executeQuery(query);

      // 设置执行时间
      result.setExecutionTime(startTime);

      this.logger.log("查询执行成功", {
        handler: this.handlerName,
        query: query.getSummary(),
        correlationId,
        result: result.getSummary(),
      });

      return result;
    } catch (error) {
      const executionTime = Date.now() - startTime;

      this.logger.error("查询执行失败", {
        handler: this.handlerName,
        query: query.getSummary(),
        correlationId,
        executionTime,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });

      // 如果是已知的查询异常，直接重新抛出
      if (
        error instanceof QueryExecutionException ||
        error instanceof QueryValidationException
      ) {
        throw error;
      }

      // 包装未知异常
      throw new QueryExecutionException(
        `查询执行失败: ${error instanceof Error ? error.message : String(error)}`,
        "QUERY_EXECUTION_FAILED" as any, // eslint-disable-line @typescript-eslint/no-explicit-any
        query.queryType,
        query.queryId as any, // eslint-disable-line @typescript-eslint/no-explicit-any
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
   * 验证查询
   * @param query 查询
   * @throws QueryValidationException 验证失败时抛出
   */
  protected async validateQuery(query: TQuery): Promise<void> {
    try {
      // 这里可以添加查询特定的验证逻辑
      await this.performQueryValidation(query);
    } catch (error) {
      if (error instanceof QueryValidationException) {
        throw error;
      }

      throw new QueryValidationException(
        `查询验证失败: ${error instanceof Error ? error.message : String(error)}`,
        query.queryType,
        query.queryId as any, // eslint-disable-line @typescript-eslint/no-explicit-any
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
   * 执行查询逻辑
   * @param query 查询
   * @returns 查询结果
   */
  protected abstract executeQuery(query: TQuery): Promise<QueryResult<TResult>>;

  /**
   * 执行查询验证
   * @param _query 查询
   * @throws Error 验证失败时抛出
   */
  protected async performQueryValidation(_query: TQuery): Promise<void> {
    // 子类可以重写此方法来实现特定的验证逻辑
    // 默认不进行额外验证
  }

  /**
   * 生成关联ID
   * @returns 关联ID
   */
  protected generateCorrelationId(): string {
    return `qry_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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
      queryType: this.getQueryTypeName(),
      resultType: this.getResultTypeName(),
    };
  }

  /**
   * 获取查询类型名称
   * @returns 查询类型名称
   */
  protected getQueryTypeName(): string {
    // 通过泛型推断获取查询类型名称
    return "BaseQuery";
  }

  /**
   * 获取结果类型名称
   * @returns 结果类型名称
   */
  protected getResultTypeName(): string {
    // 通过泛型推断获取结果类型名称
    return "QueryResult";
  }
}
