/**
 * @fileoverview 命令查询总线接口
 * @description 定义命令查询总线的核心接口，支持命令和查询的统一分发和处理
 */

import { BaseCommand } from "../commands/base/command.base.js";
import { BaseQuery } from "../queries/base/query.base.js";
import { CommandResult } from "../commands/base/command-result.js";
import { QueryResult } from "../queries/base/query-result.js";

/**
 * 命令查询总线接口
 * @description 提供命令和查询的统一分发、执行和结果处理功能
 */
export interface ICommandQueryBus {
  /**
   * 执行命令
   * @param command 命令对象
   * @returns 命令执行结果
   */
  executeCommand<TCommand extends BaseCommand>(
    command: TCommand,
  ): Promise<CommandResult>;

  /**
   * 执行查询
   * @param query 查询对象
   * @returns 查询执行结果
   */
  executeQuery<TQuery extends BaseQuery>(query: TQuery): Promise<QueryResult>;

  /**
   * 注册命令处理器
   * @param commandType 命令类型
   * @param handler 命令处理器
   * @returns 注册结果
   */
  registerCommandHandler(
    commandType: string,
    handler: CommandHandler,
  ): Promise<boolean>;

  /**
   * 注册查询处理器
   * @param queryType 查询类型
   * @param handler 查询处理器
   * @returns 注册结果
   */
  registerQueryHandler(
    queryType: string,
    handler: QueryHandler,
  ): Promise<boolean>;

  /**
   * 取消注册命令处理器
   * @param commandType 命令类型
   * @returns 取消注册结果
   */
  unregisterCommandHandler(commandType: string): Promise<boolean>;

  /**
   * 取消注册查询处理器
   * @param queryType 查询类型
   * @returns 取消注册结果
   */
  unregisterQueryHandler(queryType: string): Promise<boolean>;

  /**
   * 获取所有注册的命令处理器
   * @returns 命令处理器列表
   */
  getCommandHandlers(): Promise<CommandHandlerInfo[]>;

  /**
   * 获取所有注册的查询处理器
   * @returns 查询处理器列表
   */
  getQueryHandlers(): Promise<QueryHandlerInfo[]>;

  /**
   * 获取总线统计信息
   * @returns 统计信息
   */
  getStatistics(): Promise<BusStatistics>;

  /**
   * 启动总线
   * @returns 启动结果
   */
  start(): Promise<void>;

  /**
   * 停止总线
   * @returns 停止结果
   */
  stop(): Promise<void>;

  /**
   * 检查总线是否运行中
   * @returns 是否运行中
   */
  isRunning(): boolean;
}

/**
 * 命令处理器接口
 * @description 命令处理器的标准接口
 */
export interface CommandHandler {
  /**
   * 处理命令
   * @param command 命令对象
   * @returns 命令执行结果
   */
  handle(command: BaseCommand): Promise<CommandResult>;

  /**
   * 获取处理器名称
   * @returns 处理器名称
   */
  getHandlerName(): string;

  /**
   * 获取处理器描述
   * @returns 处理器描述
   */
  getDescription(): string;

  /**
   * 获取处理器版本
   * @returns 处理器版本
   */
  getVersion(): string;

  /**
   * 检查处理器是否可用
   * @returns 是否可用
   */
  isAvailable(): boolean;

  /**
   * 获取支持的命令类型
   * @returns 命令类型列表
   */
  getSupportedCommandTypes(): string[];
}

/**
 * 查询处理器接口
 * @description 查询处理器的标准接口
 */
export interface QueryHandler {
  /**
   * 处理查询
   * @param query 查询对象
   * @returns 查询执行结果
   */
  handle(query: BaseQuery): Promise<QueryResult>;

  /**
   * 获取处理器名称
   * @returns 处理器名称
   */
  getHandlerName(): string;

  /**
   * 获取处理器描述
   * @returns 处理器描述
   */
  getDescription(): string;

  /**
   * 获取处理器版本
   * @returns 处理器版本
   */
  getVersion(): string;

  /**
   * 检查处理器是否可用
   * @returns 是否可用
   */
  isAvailable(): boolean;

  /**
   * 获取支持的查询类型
   * @returns 查询类型列表
   */
  getSupportedQueryTypes(): string[];
}

/**
 * 命令处理器信息
 * @description 命令处理器的注册信息
 */
export interface CommandHandlerInfo {
  /** 处理器名称 */
  handlerName: string;
  /** 命令类型 */
  commandType: string;
  /** 处理器描述 */
  description: string;
  /** 处理器版本 */
  version: string;
  /** 是否可用 */
  available: boolean;
  /** 注册时间 */
  registeredAt: Date;
  /** 处理次数 */
  processCount: number;
  /** 成功次数 */
  successCount: number;
  /** 失败次数 */
  failureCount: number;
  /** 平均处理时间（毫秒） */
  averageProcessingTime: number;
}

/**
 * 查询处理器信息
 * @description 查询处理器的注册信息
 */
export interface QueryHandlerInfo {
  /** 处理器名称 */
  handlerName: string;
  /** 查询类型 */
  queryType: string;
  /** 处理器描述 */
  description: string;
  /** 处理器版本 */
  version: string;
  /** 是否可用 */
  available: boolean;
  /** 注册时间 */
  registeredAt: Date;
  /** 处理次数 */
  processCount: number;
  /** 成功次数 */
  successCount: number;
  /** 失败次数 */
  failureCount: number;
  /** 平均处理时间（毫秒） */
  averageProcessingTime: number;
}

/**
 * 总线统计信息
 * @description 命令查询总线的统计信息
 */
export interface BusStatistics {
  /** 总命令执行数 */
  totalCommandsExecuted: number;
  /** 总查询执行数 */
  totalQueriesExecuted: number;
  /** 总命令成功数 */
  totalCommandsSuccessful: number;
  /** 总查询成功数 */
  totalQueriesSuccessful: number;
  /** 总命令失败数 */
  totalCommandsFailed: number;
  /** 总查询失败数 */
  totalQueriesFailed: number;
  /** 平均命令处理时间（毫秒） */
  averageCommandProcessingTime: number;
  /** 平均查询处理时间（毫秒） */
  averageQueryProcessingTime: number;
  /** 命令成功率 */
  commandSuccessRate: number;
  /** 查询成功率 */
  querySuccessRate: number;
  /** 注册的命令处理器数 */
  registeredCommandHandlers: number;
  /** 注册的查询处理器数 */
  registeredQueryHandlers: number;
  /** 按命令类型分组的统计 */
  byCommandType: Record<string, CommandTypeStatistics>;
  /** 按查询类型分组的统计 */
  byQueryType: Record<string, QueryTypeStatistics>;
  /** 按处理器分组的统计 */
  byHandler: Record<string, HandlerStatistics>;
  /** 最后更新时间 */
  lastUpdated: Date;
}

/**
 * 命令类型统计
 * @description 特定命令类型的统计信息
 */
export interface CommandTypeStatistics {
  /** 执行次数 */
  executed: number;
  /** 成功次数 */
  successful: number;
  /** 失败次数 */
  failed: number;
  /** 平均处理时间 */
  averageProcessingTime: number;
  /** 最后执行时间 */
  lastExecuted?: Date;
}

/**
 * 查询类型统计
 * @description 特定查询类型的统计信息
 */
export interface QueryTypeStatistics {
  /** 执行次数 */
  executed: number;
  /** 成功次数 */
  successful: number;
  /** 失败次数 */
  failed: number;
  /** 平均处理时间 */
  averageProcessingTime: number;
  /** 最后执行时间 */
  lastExecuted?: Date;
}

/**
 * 处理器统计
 * @description 特定处理器的统计信息
 */
export interface HandlerStatistics {
  /** 处理次数 */
  processed: number;
  /** 成功次数 */
  successful: number;
  /** 失败次数 */
  failed: number;
  /** 平均处理时间 */
  averageProcessingTime: number;
  /** 最后处理时间 */
  lastProcessed?: Date;
}

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

/**
 * 总线中间件接口
 * @description 总线中间件的标准接口
 */
export interface BusMiddleware {
  /**
   * 中间件名称
   * @returns 中间件名称
   */
  getName(): string;

  /**
   * 中间件描述
   * @returns 中间件描述
   */
  getDescription(): string;

  /**
   * 中间件版本
   * @returns 中间件版本
   */
  getVersion(): string;

  /**
   * 中间件优先级（数值越小优先级越高）
   * @returns 优先级
   */
  getPriority(): number;

  /**
   * 处理命令前的中间件逻辑
   * @param command 命令对象
   * @param context 执行上下文
   * @returns 是否继续执行
   */
  beforeCommand?(
    command: BaseCommand,
    context: ExecutionContext,
  ): Promise<boolean>;

  /**
   * 处理命令后的中间件逻辑
   * @param command 命令对象
   * @param result 执行结果
   * @param context 执行上下文
   * @returns 处理后的结果
   */
  afterCommand?(
    command: BaseCommand,
    result: CommandResult,
    context: ExecutionContext,
  ): Promise<CommandResult>;

  /**
   * 处理查询前的中间件逻辑
   * @param query 查询对象
   * @param context 执行上下文
   * @returns 是否继续执行
   */
  beforeQuery?(query: BaseQuery, context: ExecutionContext): Promise<boolean>;

  /**
   * 处理查询后的中间件逻辑
   * @param query 查询对象
   * @param result 执行结果
   * @param context 执行上下文
   * @returns 处理后的结果
   */
  afterQuery?(
    query: BaseQuery,
    result: QueryResult,
    context: ExecutionContext,
  ): Promise<QueryResult>;

  /**
   * 错误处理中间件逻辑
   * @param error 错误对象
   * @param context 执行上下文
   * @returns 是否继续处理错误
   */
  onError?(error: Error, context: ExecutionContext): Promise<boolean>;
}

/**
 * 执行上下文
 * @description 命令或查询执行的上下文信息
 */
export interface ExecutionContext {
  /** 执行ID */
  executionId: string;
  /** 开始时间 */
  startTime: Date;
  /** 执行类型 */
  executionType: "command" | "query";
  /** 执行对象类型 */
  objectType: string;
  /** 用户ID */
  userId?: string;
  /** 关联ID */
  correlationId?: string;
  /** 元数据 */
  metadata: Record<string, unknown>;
  /** 中间件执行历史 */
  middlewareHistory: string[];
}
