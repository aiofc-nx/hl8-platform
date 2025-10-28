/**
 * @fileoverview 命令查询总线实现
 * @description 基于@nestjs/cqrs的命令查询总线实现，支持命令和查询的统一分发和处理
 */

import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Optional,
} from "@nestjs/common";
import { CommandBus, QueryBus } from "@nestjs/cqrs";
import { Logger } from "@hl8/logger";
import { EntityId } from "@hl8/domain-kernel";
import {
  ICommandQueryBus,
  CommandHandler,
  QueryHandler,
  CommandHandlerInfo,
  QueryHandlerInfo,
  BusStatistics,
  BusMiddleware,
  ExecutionContext,
  CommandTypeStatistics as _CommandTypeStatistics,
  QueryTypeStatistics as _QueryTypeStatistics,
  HandlerStatistics as _HandlerStatistics,
} from "./command-query-bus.interface.js";

/**
 * 总线配置
 * @description 命令查询总线的配置选项
 */
export interface BusConfig {
  /** 最大并发执行数 */
  maxConcurrency: number;
  /** 执行超时时间（毫秒） */
  executionTimeout: number;
  /** 是否启用性能监控 */
  enablePerformanceMonitoring: boolean;
  /** 性能监控采样率 */
  performanceMonitoringSamplingRate: number;
  /** 是否启用中间件 */
  enableMiddleware: boolean;
  /** 中间件执行顺序 */
  middlewareOrder: string[];
  /** 是否启用重试机制 */
  enableRetry: boolean;
  /** 最大重试次数 */
  maxRetries: number;
  /** 重试延迟（毫秒） */
  retryDelay: number;
  /** 是否启用缓存 */
  enableCaching: boolean;
  /** 缓存过期时间（毫秒） */
  cacheExpirationTime: number;
}
import { BaseCommand } from "../commands/base/command.base.js";
import { BaseQuery } from "../queries/base/query.base.js";
import { CommandResult } from "../commands/base/command-result.js";
import { QueryResult } from "../queries/base/query-result.js";

/**
 * 命令查询总线实现
 * @description 基于@nestjs/cqrs的命令查询总线实现
 */
@Injectable()
export class CommandQueryBusImpl
  implements ICommandQueryBus, OnModuleInit, OnModuleDestroy
{
  private readonly logger: Logger;
  private readonly nestCommandBus: CommandBus;
  private readonly nestQueryBus: QueryBus;
  private readonly commandHandlers = new Map<string, CommandHandler>();
  private readonly queryHandlers = new Map<string, QueryHandler>();
  private readonly middlewares: BusMiddleware[] = [];
  private readonly statistics: BusStatistics;
  private readonly config: BusConfig;
  private _isRunning = false;

  constructor(
    logger: Logger,
    nestCommandBus: CommandBus,
    nestQueryBus: QueryBus,
    @Optional() config?: BusConfig,
  ) {
    this.logger = logger;
    this.nestCommandBus = nestCommandBus;
    this.nestQueryBus = nestQueryBus;
    this.config = config || {
      maxConcurrency: 10,
      executionTimeout: 30000,
      enablePerformanceMonitoring: true,
      performanceMonitoringSamplingRate: 0.1,
      enableMiddleware: true,
      middlewareOrder: [
        "ValidationMiddleware",
        "LoggingMiddleware",
        "CacheMiddleware",
        "PerformanceMonitoringMiddleware",
        "RetryMiddleware",
      ],
      enableRetry: true,
      maxRetries: 3,
      retryDelay: 1000,
      enableCaching: true,
      cacheExpirationTime: 300000, // 5分钟
    };
    this.statistics = {
      totalCommandsExecuted: 0,
      totalQueriesExecuted: 0,
      totalCommandsSuccessful: 0,
      totalQueriesSuccessful: 0,
      totalCommandsFailed: 0,
      totalQueriesFailed: 0,
      averageCommandProcessingTime: 0,
      averageQueryProcessingTime: 0,
      commandSuccessRate: 0,
      querySuccessRate: 0,
      registeredCommandHandlers: 0,
      registeredQueryHandlers: 0,
      byCommandType: {},
      byQueryType: {},
      byHandler: {},
      lastUpdated: new Date(),
    };
  }

  /**
   * 模块初始化
   */
  async onModuleInit(): Promise<void> {
    await this.start();
  }

  /**
   * 模块销毁
   */
  async onModuleDestroy(): Promise<void> {
    await this.stop();
  }

  /**
   * 执行命令
   * @param command 命令对象
   * @returns 命令执行结果
   */
  public async executeCommand<TCommand extends BaseCommand>(
    command: TCommand,
  ): Promise<CommandResult> {
    const executionId = new EntityId().toString();
    const context: ExecutionContext = {
      executionId,
      startTime: new Date(),
      executionType: "command",
      objectType: command.commandType,
      userId: command.userId,
      correlationId: command.correlationId,
      metadata: {},
      middlewareHistory: [],
    };

    try {
      this.logger.debug("开始执行命令", {
        executionId,
        commandType: command.commandType,
        commandId: command.commandId.toString(),
      });

      // 执行前置中间件
      const shouldContinue = await this.executeBeforeMiddlewares(
        command,
        context,
      );
      if (!shouldContinue) {
        return CommandResult.failure("命令被中间件阻止", "MIDDLEWARE_BLOCKED");
      }

      // 执行命令
      const result = await this.executeCommandInternal(command, context);

      // 执行后置中间件
      const finalResult = (await this.executeAfterMiddlewares(
        command,
        result,
        context,
      )) as CommandResult;

      // 更新统计信息
      this.updateCommandStatistics(command.commandType, finalResult, context);

      return finalResult;
    } catch (error) {
      this.logger.error("命令执行异常", {
        executionId,
        commandType: command.commandType,
        error: error instanceof Error ? error.message : String(error),
      });

      // 执行错误中间件
      const shouldContinue = await this.executeErrorMiddlewares(
        error as Error,
        context,
      );
      if (!shouldContinue) {
        // 重试逻辑
        return this.executeCommand(command);
      }

      const result = CommandResult.failure(
        "EXECUTION_ERROR",
        error instanceof Error ? error.message : String(error),
      );

      this.updateCommandStatistics(command.commandType, result, context);
      return result;
    }
  }

  /**
   * 执行查询
   * @param query 查询对象
   * @returns 查询执行结果
   */
  public async executeQuery<TQuery extends BaseQuery>(
    query: TQuery,
  ): Promise<QueryResult> {
    const executionId = new EntityId().toString();
    const context: ExecutionContext = {
      executionId,
      startTime: new Date(),
      executionType: "query",
      objectType: query.queryType,
      userId: query.userId,
      correlationId: query.correlationId,
      metadata: {},
      middlewareHistory: [],
    };

    try {
      this.logger.debug("开始执行查询", {
        executionId,
        queryType: query.queryType,
        queryId: query.queryId.toString(),
      });

      // 检查缓存
      if (context.metadata.cachedResult) {
        this.logger.debug("返回缓存结果", { executionId });
        return context.metadata.cachedResult as QueryResult;
      }

      // 执行前置中间件
      const shouldContinue = await this.executeBeforeMiddlewares(
        query,
        context,
      );
      if (!shouldContinue) {
        return QueryResult.failure("查询被中间件阻止", "MIDDLEWARE_BLOCKED");
      }

      // 执行查询
      const result = await this.executeQueryInternal(query, context);

      // 执行后置中间件
      const finalResult = (await this.executeAfterMiddlewares(
        query,
        result,
        context,
      )) as QueryResult;

      // 更新统计信息
      this.updateQueryStatistics(query.queryType, finalResult, context);

      return finalResult;
    } catch (error) {
      this.logger.error("查询执行异常", {
        executionId,
        queryType: query.queryType,
        error: error instanceof Error ? error.message : String(error),
      });

      // 执行错误中间件
      const shouldContinue = await this.executeErrorMiddlewares(
        error as Error,
        context,
      );
      if (!shouldContinue) {
        // 重试逻辑
        return this.executeQuery(query);
      }

      const result = QueryResult.failure(
        "EXECUTION_ERROR",
        error instanceof Error ? error.message : String(error),
      );

      this.updateQueryStatistics(query.queryType, result, context);
      return result;
    }
  }

  /**
   * 注册命令处理器
   * @param commandType 命令类型
   * @param handler 命令处理器
   * @returns 注册结果
   */
  public async registerCommandHandler(
    commandType: string,
    handler: CommandHandler,
  ): Promise<boolean> {
    try {
      this.commandHandlers.set(commandType, handler);
      this.logger.debug("注册命令处理器", {
        commandType,
        handlerName: handler.getHandlerName(),
      });
      return true;
    } catch (error) {
      this.logger.error("注册命令处理器失败", {
        commandType,
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * 注册查询处理器
   * @param queryType 查询类型
   * @param handler 查询处理器
   * @returns 注册结果
   */
  public async registerQueryHandler(
    queryType: string,
    handler: QueryHandler,
  ): Promise<boolean> {
    try {
      this.queryHandlers.set(queryType, handler);
      this.logger.debug("注册查询处理器", {
        queryType,
        handlerName: handler.getHandlerName(),
      });
      return true;
    } catch (error) {
      this.logger.error("注册查询处理器失败", {
        queryType,
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * 取消注册命令处理器
   * @param commandType 命令类型
   * @returns 取消注册结果
   */
  public async unregisterCommandHandler(commandType: string): Promise<boolean> {
    const removed = this.commandHandlers.delete(commandType);
    if (removed) {
      this.logger.debug("取消注册命令处理器", { commandType });
    }
    return removed;
  }

  /**
   * 取消注册查询处理器
   * @param queryType 查询类型
   * @returns 取消注册结果
   */
  public async unregisterQueryHandler(queryType: string): Promise<boolean> {
    const removed = this.queryHandlers.delete(queryType);
    if (removed) {
      this.logger.debug("取消注册查询处理器", { queryType });
    }
    return removed;
  }

  /**
   * 获取所有注册的命令处理器
   * @returns 命令处理器列表
   */
  public async getCommandHandlers(): Promise<CommandHandlerInfo[]> {
    const handlers: CommandHandlerInfo[] = [];
    for (const [commandType, handler] of this.commandHandlers.entries()) {
      handlers.push({
        handlerName: handler.getHandlerName(),
        commandType,
        description: handler.getDescription(),
        version: handler.getVersion(),
        available: handler.isAvailable(),
        registeredAt: new Date(),
        processCount: 0,
        successCount: 0,
        failureCount: 0,
        averageProcessingTime: 0,
      });
    }
    return handlers;
  }

  /**
   * 获取所有注册的查询处理器
   * @returns 查询处理器列表
   */
  public async getQueryHandlers(): Promise<QueryHandlerInfo[]> {
    const handlers: QueryHandlerInfo[] = [];
    for (const [queryType, handler] of this.queryHandlers.entries()) {
      handlers.push({
        handlerName: handler.getHandlerName(),
        queryType,
        description: handler.getDescription(),
        version: handler.getVersion(),
        available: handler.isAvailable(),
        registeredAt: new Date(),
        processCount: 0,
        successCount: 0,
        failureCount: 0,
        averageProcessingTime: 0,
      });
    }
    return handlers;
  }

  /**
   * 获取总线统计信息
   * @returns 统计信息
   */
  public async getStatistics(): Promise<BusStatistics> {
    this.updateStatisticsSummary();
    return { ...this.statistics };
  }

  /**
   * 启动总线
   * @returns 启动结果
   */
  public async start(): Promise<void> {
    if (this._isRunning) {
      return;
    }

    this._isRunning = true;
    this.logger.log("命令查询总线已启动");
  }

  /**
   * 停止总线
   * @returns 停止结果
   */
  public async stop(): Promise<void> {
    if (!this._isRunning) {
      return;
    }

    this._isRunning = false;
    this.logger.log("命令查询总线已停止");
  }

  /**
   * 检查总线是否运行中
   * @returns 是否运行中
   */
  public isRunning(): boolean {
    return this._isRunning;
  }

  /**
   * 添加中间件
   * @param middleware 中间件
   */
  public addMiddleware(middleware: BusMiddleware): void {
    this.middlewares.push(middleware);
    this.middlewares.sort((a, b) => a.getPriority() - b.getPriority());
    this.logger.debug("添加中间件", {
      name: middleware.getName(),
      priority: middleware.getPriority(),
    });
  }

  /**
   * 移除中间件
   * @param name 中间件名称
   */
  public removeMiddleware(name: string): void {
    const index = this.middlewares.findIndex((m) => m.getName() === name);
    if (index >= 0) {
      this.middlewares.splice(index, 1);
      this.logger.debug("移除中间件", { name });
    }
  }

  /**
   * 执行命令内部逻辑
   * @param command 命令对象
   * @param context 执行上下文
   * @returns 命令执行结果
   */
  private async executeCommandInternal(
    command: BaseCommand,
    _context: ExecutionContext,
  ): Promise<CommandResult> {
    try {
      // 使用 NestJS CommandBus 执行命令
      const result = await this.nestCommandBus.execute(command);

      // 将 NestJS 结果转换为我们的 CommandResult 格式
      if (result && typeof result === "object" && "success" in result) {
        return result as CommandResult;
      }

      // 如果没有返回 CommandResult 格式，创建一个成功的默认结果
      return CommandResult.success(result, "Command executed successfully");
    } catch (error) {
      // 检查是否是处理器未找到的错误
      if (
        error instanceof Error &&
        error.message.includes("No handler found")
      ) {
        return CommandResult.failure(
          "HANDLER_NOT_FOUND",
          `未找到命令处理器: ${command.commandType}`,
        );
      }

      return CommandResult.failure(
        "EXECUTION_ERROR",
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  /**
   * 执行查询内部逻辑
   * @param query 查询对象
   * @param context 执行上下文
   * @returns 查询执行结果
   */
  private async executeQueryInternal(
    query: BaseQuery,
    _context: ExecutionContext,
  ): Promise<QueryResult> {
    try {
      // 使用 NestJS QueryBus 执行查询
      const result = await this.nestQueryBus.execute(query);

      // 将 NestJS 结果转换为我们的 QueryResult 格式
      if (result && typeof result === "object" && "success" in result) {
        return result as QueryResult;
      }

      // 如果没有返回 QueryResult 格式，创建一个成功的默认结果
      return QueryResult.successItem(result, "Query executed successfully");
    } catch (error) {
      // 检查是否是处理器未找到的错误
      if (
        error instanceof Error &&
        error.message.includes("No handler found")
      ) {
        return QueryResult.failure(
          "HANDLER_NOT_FOUND",
          `未找到查询处理器: ${query.queryType}`,
        );
      }

      return QueryResult.failure(
        "EXECUTION_ERROR",
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  /**
   * 执行前置中间件
   * @param object 命令或查询对象
   * @param context 执行上下文
   * @returns 是否继续执行
   */
  private async executeBeforeMiddlewares(
    object: BaseCommand | BaseQuery,
    context: ExecutionContext,
  ): Promise<boolean> {
    for (const middleware of this.middlewares) {
      context.middlewareHistory.push(middleware.getName());

      let shouldContinue: boolean;
      if (context.executionType === "command") {
        shouldContinue =
          (await middleware.beforeCommand?.(object as BaseCommand, context)) ??
          true;
      } else {
        shouldContinue =
          (await middleware.beforeQuery?.(object as BaseQuery, context)) ??
          true;
      }

      if (!shouldContinue) {
        this.logger.debug("中间件阻止执行", {
          executionId: context.executionId,
          middleware: middleware.getName(),
        });
        return false;
      }
    }

    return true;
  }

  /**
   * 执行后置中间件
   * @param object 命令或查询对象
   * @param result 执行结果
   * @param context 执行上下文
   * @returns 处理后的结果
   */
  private async executeAfterMiddlewares(
    object: BaseCommand | BaseQuery,
    result: CommandResult | QueryResult,
    context: ExecutionContext,
  ): Promise<CommandResult | QueryResult> {
    let currentResult = result;

    for (const middleware of this.middlewares) {
      context.middlewareHistory.push(middleware.getName());

      if (context.executionType === "command") {
        currentResult =
          (await middleware.afterCommand?.(
            object as BaseCommand,
            currentResult as CommandResult,
            context,
          )) ?? currentResult;
      } else {
        currentResult =
          (await middleware.afterQuery?.(
            object as BaseQuery,
            currentResult as QueryResult,
            context,
          )) ?? currentResult;
      }
    }

    return currentResult;
  }

  /**
   * 执行错误中间件
   * @param error 错误对象
   * @param context 执行上下文
   * @returns 是否继续处理错误
   */
  private async executeErrorMiddlewares(
    error: Error,
    context: ExecutionContext,
  ): Promise<boolean> {
    for (const middleware of this.middlewares) {
      const shouldContinue =
        (await middleware.onError?.(error, context)) ?? true;
      if (!shouldContinue) {
        return false;
      }
    }

    return true;
  }

  /**
   * 更新命令统计信息
   * @param commandType 命令类型
   * @param result 执行结果
   * @param context 执行上下文
   */
  private updateCommandStatistics(
    commandType: string,
    result: CommandResult,
    context: ExecutionContext,
  ): void {
    const processingTime = Date.now() - context.startTime.getTime();

    this.statistics.totalCommandsExecuted++;
    if (result.success) {
      this.statistics.totalCommandsSuccessful++;
    } else {
      this.statistics.totalCommandsFailed++;
    }

    // 更新命令类型统计
    if (!this.statistics.byCommandType[commandType]) {
      this.statistics.byCommandType[commandType] = {
        executed: 0,
        successful: 0,
        failed: 0,
        averageProcessingTime: 0,
      };
    }

    const commandStats = this.statistics.byCommandType[commandType];
    commandStats.executed++;
    if (result.success) {
      commandStats.successful++;
    } else {
      commandStats.failed++;
    }

    // 更新平均处理时间
    const totalTime =
      commandStats.averageProcessingTime * (commandStats.executed - 1) +
      processingTime;
    commandStats.averageProcessingTime = totalTime / commandStats.executed;
    commandStats.lastExecuted = new Date();

    this.statistics.lastUpdated = new Date();
  }

  /**
   * 更新查询统计信息
   * @param queryType 查询类型
   * @param result 执行结果
   * @param context 执行上下文
   */
  private updateQueryStatistics(
    queryType: string,
    result: QueryResult,
    context: ExecutionContext,
  ): void {
    const processingTime = Date.now() - context.startTime.getTime();

    this.statistics.totalQueriesExecuted++;
    if (result.success) {
      this.statistics.totalQueriesSuccessful++;
    } else {
      this.statistics.totalQueriesFailed++;
    }

    // 更新查询类型统计
    if (!this.statistics.byQueryType[queryType]) {
      this.statistics.byQueryType[queryType] = {
        executed: 0,
        successful: 0,
        failed: 0,
        averageProcessingTime: 0,
      };
    }

    const queryStats = this.statistics.byQueryType[queryType];
    queryStats.executed++;
    if (result.success) {
      queryStats.successful++;
    } else {
      queryStats.failed++;
    }

    // 更新平均处理时间
    const totalTime =
      queryStats.averageProcessingTime * (queryStats.executed - 1) +
      processingTime;
    queryStats.averageProcessingTime = totalTime / queryStats.executed;
    queryStats.lastExecuted = new Date();

    this.statistics.lastUpdated = new Date();
  }

  /**
   * 更新统计信息摘要
   */
  private updateStatisticsSummary(): void {
    this.statistics.registeredCommandHandlers = this.commandHandlers.size;
    this.statistics.registeredQueryHandlers = this.queryHandlers.size;

    // 计算成功率
    this.statistics.commandSuccessRate =
      this.statistics.totalCommandsExecuted > 0
        ? this.statistics.totalCommandsSuccessful /
          this.statistics.totalCommandsExecuted
        : 0;

    this.statistics.querySuccessRate =
      this.statistics.totalQueriesExecuted > 0
        ? this.statistics.totalQueriesSuccessful /
          this.statistics.totalQueriesExecuted
        : 0;

    // 计算平均处理时间
    const totalCommandTime = Object.values(
      this.statistics.byCommandType,
    ).reduce(
      (sum, stats) => sum + stats.averageProcessingTime * stats.executed,
      0,
    );
    this.statistics.averageCommandProcessingTime =
      this.statistics.totalCommandsExecuted > 0
        ? totalCommandTime / this.statistics.totalCommandsExecuted
        : 0;

    const totalQueryTime = Object.values(this.statistics.byQueryType).reduce(
      (sum, stats) => sum + stats.averageProcessingTime * stats.executed,
      0,
    );
    this.statistics.averageQueryProcessingTime =
      this.statistics.totalQueriesExecuted > 0
        ? totalQueryTime / this.statistics.totalQueriesExecuted
        : 0;
  }
}

// 为向后兼容的别名，满足契约测试对 CommandQueryBus 的导入
export class CommandQueryBus extends CommandQueryBusImpl {}
