/**
 * @fileoverview 总线中间件
 * @description 提供总线中间件的基础实现和常用中间件
 */

import { Injectable } from "@nestjs/common";
import { Logger } from "@hl8/logger";
import {
  BusMiddleware,
  ExecutionContext,
} from "../command-query-bus.interface.js";
import type { BusConfig } from "../command-query-bus.impl.js";
import { BaseCommand } from "../../commands/base/command.base.js";
import { BaseQuery } from "../../queries/base/query.base.js";
import { CommandResult } from "../../commands/base/command-result.js";
import { QueryResult } from "../../queries/base/query-result.js";

/**
 * 基础中间件抽象类
 * @description 提供中间件的基础实现
 */
export abstract class BaseBusMiddleware implements BusMiddleware {
  protected readonly logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  abstract getName(): string;
  abstract getDescription(): string;
  abstract getVersion(): string;
  abstract getPriority(): number;

  async beforeCommand?(
    _command: BaseCommand,
    _context: ExecutionContext,
  ): Promise<boolean> {
    return true;
  }

  async afterCommand?(
    _command: BaseCommand,
    result: CommandResult,
    _context: ExecutionContext,
  ): Promise<CommandResult> {
    return result;
  }

  async beforeQuery?(
    _query: BaseQuery,
    _context: ExecutionContext,
  ): Promise<boolean> {
    return true;
  }

  async afterQuery?(
    _query: BaseQuery,
    result: QueryResult,
    _context: ExecutionContext,
  ): Promise<QueryResult> {
    return result;
  }

  async onError?(_error: Error, _context: ExecutionContext): Promise<boolean> {
    return true;
  }
}

/**
 * 日志中间件
 * @description 记录命令和查询的执行日志
 */
@Injectable()
export class LoggingMiddleware extends BaseBusMiddleware {
  constructor(logger: Logger) {
    super(logger);
  }

  getName(): string {
    return "LoggingMiddleware";
  }

  getDescription(): string {
    return "记录命令和查询的执行日志";
  }

  getVersion(): string {
    return "1.0.0";
  }

  getPriority(): number {
    return 100;
  }

  async beforeCommand(
    command: BaseCommand,
    context: ExecutionContext,
  ): Promise<boolean> {
    this.logger.debug("开始执行命令", {
      executionId: context.executionId,
      commandType: command.commandType,
      commandId: command.commandId.toString(),
      userId: context.userId,
      correlationId: context.correlationId,
    });

    return true;
  }

  async afterCommand(
    command: BaseCommand,
    result: CommandResult,
    context: ExecutionContext,
  ): Promise<CommandResult> {
    const processingTime = Date.now() - context.startTime.getTime();

    if (result.success) {
      this.logger.debug("命令执行成功", {
        executionId: context.executionId,
        commandType: command.commandType,
        commandId: command.commandId.toString(),
        processingTime,
        result: result.data,
      });
    } else {
      this.logger.error("命令执行失败", {
        executionId: context.executionId,
        commandType: command.commandType,
        commandId: command.commandId.toString(),
        processingTime,
        message: result.message,
        errorCode: result.errorCode,
      });
    }

    return result;
  }

  async beforeQuery(
    query: BaseQuery,
    context: ExecutionContext,
  ): Promise<boolean> {
    this.logger.debug("开始执行查询", {
      executionId: context.executionId,
      queryType: query.queryType,
      queryId: query.queryId.toString(),
      userId: context.userId,
      correlationId: context.correlationId,
    });

    return true;
  }

  async afterQuery(
    query: BaseQuery,
    result: QueryResult,
    context: ExecutionContext,
  ): Promise<QueryResult> {
    const processingTime = Date.now() - context.startTime.getTime();

    if (result.success) {
      this.logger.debug("查询执行成功", {
        executionId: context.executionId,
        queryType: query.queryType,
        queryId: query.queryId.toString(),
        processingTime,
        resultCount: Array.isArray(result.data) ? result.data.length : 1,
      });
    } else {
      this.logger.error("查询执行失败", {
        executionId: context.executionId,
        queryType: query.queryType,
        queryId: query.queryId.toString(),
        processingTime,
        message: result.message,
        errorCode: result.errorCode,
      });
    }

    return result;
  }

  async onError(error: Error, context: ExecutionContext): Promise<boolean> {
    this.logger.error("执行过程中发生错误", {
      executionId: context.executionId,
      executionType: context.executionType,
      objectType: context.objectType,
      error: error.message,
      stack: error.stack,
    });

    return true;
  }
}

/**
 * 性能监控中间件
 * @description 监控命令和查询的执行性能
 */
@Injectable()
export class PerformanceMonitoringMiddleware extends BaseBusMiddleware {
  private readonly performanceData = new Map<string, number[]>();

  constructor(
    logger: Logger,
    private readonly config: BusConfig,
  ) {
    super(logger);
  }

  getName(): string {
    return "PerformanceMonitoringMiddleware";
  }

  getDescription(): string {
    return "监控命令和查询的执行性能";
  }

  getVersion(): string {
    return "1.0.0";
  }

  getPriority(): number {
    return 200;
  }

  async afterCommand(
    command: BaseCommand,
    result: CommandResult,
    context: ExecutionContext,
  ): Promise<CommandResult> {
    if (this.config.enablePerformanceMonitoring) {
      const processingTime = Date.now() - context.startTime.getTime();
      this.recordPerformanceData(command.commandType, processingTime);
    }

    return result;
  }

  async afterQuery(
    query: BaseQuery,
    result: QueryResult,
    context: ExecutionContext,
  ): Promise<QueryResult> {
    if (this.config.enablePerformanceMonitoring) {
      const processingTime = Date.now() - context.startTime.getTime();
      this.recordPerformanceData(query.queryType, processingTime);
    }

    return result;
  }

  private recordPerformanceData(type: string, processingTime: number): void {
    if (!this.performanceData.has(type)) {
      this.performanceData.set(type, []);
    }

    const data = this.performanceData.get(type)!;
    data.push(processingTime);

    // 保持最近1000个数据点
    if (data.length > 1000) {
      data.shift();
    }

    // 记录慢查询/命令
    if (processingTime > 5000) {
      this.logger.warn("检测到慢执行", {
        type,
        processingTime,
        threshold: 5000,
      });
    }
  }

  /**
   * 获取性能统计
   * @param type 类型
   * @returns 性能统计
   */
  getPerformanceStats(type: string): {
    count: number;
    average: number;
    min: number;
    max: number;
    p95: number;
    p99: number;
  } | null {
    const data = this.performanceData.get(type);
    if (!data || data.length === 0) {
      return null;
    }

    const sorted = [...data].sort((a, b) => a - b);
    const count = sorted.length;
    const average = sorted.reduce((sum, time) => sum + time, 0) / count;
    const min = sorted[0];
    const max = sorted[count - 1];
    const p95Index = Math.floor(count * 0.95);
    const p99Index = Math.floor(count * 0.99);

    return {
      count,
      average,
      min,
      max,
      p95: sorted[p95Index],
      p99: sorted[p99Index],
    };
  }
}

/**
 * 验证中间件
 * @description 验证命令和查询的输入参数
 */
@Injectable()
export class ValidationMiddleware extends BaseBusMiddleware {
  constructor(logger: Logger) {
    super(logger);
  }

  getName(): string {
    return "ValidationMiddleware";
  }

  getDescription(): string {
    return "验证命令和查询的输入参数";
  }

  getVersion(): string {
    return "1.0.0";
  }

  getPriority(): number {
    return 50;
  }

  async beforeCommand(
    command: BaseCommand,
    context: ExecutionContext,
  ): Promise<boolean> {
    try {
      // 这里可以添加具体的验证逻辑
      // 例如使用class-validator进行验证
      this.validateCommand(command);
      return true;
    } catch (error) {
      this.logger.error("命令验证失败", {
        executionId: context.executionId,
        commandType: command.commandType,
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  async beforeQuery(
    query: BaseQuery,
    context: ExecutionContext,
  ): Promise<boolean> {
    try {
      // 这里可以添加具体的验证逻辑
      this.validateQuery(query);
      return true;
    } catch (error) {
      this.logger.error("查询验证失败", {
        executionId: context.executionId,
        queryType: query.queryType,
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  private validateCommand(command: BaseCommand): void {
    if (!command.commandId) {
      throw new Error("命令ID不能为空");
    }
    if (!command.commandType) {
      throw new Error("命令类型不能为空");
    }
    // 可以添加更多验证逻辑
  }

  private validateQuery(query: BaseQuery): void {
    if (!query.queryId) {
      throw new Error("查询ID不能为空");
    }
    if (!query.queryType) {
      throw new Error("查询类型不能为空");
    }
    // 可以添加更多验证逻辑
  }
}

/**
 * 重试中间件
 * @description 在失败时自动重试命令和查询
 */
@Injectable()
export class RetryMiddleware extends BaseBusMiddleware {
  constructor(
    logger: Logger,
    private readonly config: BusConfig,
  ) {
    super(logger);
  }

  getName(): string {
    return "RetryMiddleware";
  }

  getDescription(): string {
    return "在失败时自动重试命令和查询";
  }

  getVersion(): string {
    return "1.0.0";
  }

  getPriority(): number {
    return 300;
  }

  async onError(error: Error, context: ExecutionContext): Promise<boolean> {
    if (!this.config.enableRetry) {
      return true;
    }

    const retryCount = (context.metadata.retryCount as number) || 0;
    if (retryCount >= this.config.maxRetries) {
      this.logger.error("达到最大重试次数", {
        executionId: context.executionId,
        retryCount,
        maxRetries: this.config.maxRetries,
        error: error.message,
      });
      return true;
    }

    this.logger.warn("准备重试执行", {
      executionId: context.executionId,
      retryCount: retryCount + 1,
      maxRetries: this.config.maxRetries,
      error: error.message,
    });

    // 延迟后重试
    await new Promise((resolve) => setTimeout(resolve, this.config.retryDelay));
    context.metadata.retryCount = retryCount + 1;

    return false; // 不继续处理错误，让系统重试
  }
}

/**
 * 缓存中间件
 * @description 为查询结果提供缓存功能，使用 @hl8/cache 统一缓存库
 */
@Injectable()
export class CacheMiddleware extends BaseBusMiddleware {
  constructor(
    logger: Logger,
    private readonly config: BusConfig,
  ) {
    super(logger);
  }

  getName(): string {
    return "CacheMiddleware";
  }

  getDescription(): string {
    return "为查询结果提供缓存功能";
  }

  getVersion(): string {
    return "1.0.0";
  }

  getPriority(): number {
    return 150;
  }

  async beforeQuery(
    _query: BaseQuery,
    _context: ExecutionContext,
  ): Promise<boolean> {
    // 注意：缓存逻辑已迁移到 Application Kernel 的主缓存服务
    // 此中间件保留接口但不执行缓存逻辑，避免重复缓存
    // 缓存由共享的 ICache 实例统一管理
    return true;
  }

  async afterQuery(
    query: BaseQuery,
    result: QueryResult,
    _context: ExecutionContext,
  ): Promise<QueryResult> {
    // 缓存逻辑已在 CacheService 中统一处理
    return result;
  }

  /**
   * @deprecated 使用 @hl8/cache 的 CacheKeyBuilder 替代
   */
  public generateCacheKey(query: BaseQuery): string {
    // 基于查询类型和参数生成缓存键
    const params = JSON.stringify(query);
    return `query:${query.queryType}:${Buffer.from(params).toString("base64")}`;
  }

  /**
   * @deprecated 缓存已迁移到 ICache 服务
   */
  clearExpiredCache(): void {
    // 空实现：缓存清理由 ICache 服务自动处理
  }

  /**
   * @deprecated 缓存已迁移到 ICache 服务
   */
  clearAllCache(): void {
    // 空实现：使用 ICache.clear() 替代
  }
}
