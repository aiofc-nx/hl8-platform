/**
 * @fileoverview 操作管理器实现
 * @description 提供业务操作管理的具体实现，包括执行引擎、验证框架和依赖管理
 */

import {
  IBusinessOperation,
  IOperationHandler,
  OperationParameters,
  OperationContext,
  OperationResult,
  OperationStatus,
  BusinessOperationType,
  OperationHistoryType,
  OperationLogLevel,
} from "./business-operation.interface.js";

/**
 * 操作管理器类
 * @description 负责管理业务操作的注册、执行和验证
 */
export class OperationManager {
  private readonly operations = new Map<string, IBusinessOperation<unknown>>();
  private readonly handlers = new Map<string, IOperationHandler<unknown>>();
  private readonly operationDependencies = new Map<string, string[]>();
  private readonly executionHistory: OperationExecutionHistory[] = [];
  private readonly activeOperations = new Map<
    string,
    OperationExecutionContext
  >();

  /**
   * 注册业务操作
   * @param operation 业务操作
   * @throws {OperationManagerException} 当操作注册失败时抛出
   */
  registerOperation(operation: IBusinessOperation<unknown>): void {
    this.validateOperation(operation);

    if (this.operations.has(operation.id)) {
      throw new OperationManagerException(
        `Business operation '${operation.id}' is already registered`,
        "registerOperation",
        operation.id,
      );
    }

    this.operations.set(operation.id, operation);
    this.operationDependencies.set(
      operation.id,
      operation.getDependencies().map((d) => d.name),
    );
  }

  /**
   * 注销业务操作
   * @param operationId 操作ID
   * @returns 是否成功注销
   */
  unregisterOperation(operationId: string): boolean {
    const removed = this.operations.delete(operationId);
    this.operationDependencies.delete(operationId);
    return removed;
  }

  /**
   * 获取业务操作
   * @param operationId 操作ID
   * @returns 业务操作，如果未找到则返回 null
   */
  getOperation(operationId: string): IBusinessOperation<unknown> | null {
    return this.operations.get(operationId) || null;
  }

  /**
   * 获取所有业务操作
   * @returns 业务操作列表
   */
  getAllOperations(): IBusinessOperation<unknown>[] {
    return Array.from(this.operations.values());
  }

  /**
   * 注册操作处理程序
   * @param handler 操作处理程序
   * @throws {OperationManagerException} 当处理程序注册失败时抛出
   */
  registerHandler(handler: IOperationHandler<unknown>): void {
    if (this.handlers.has(handler.id)) {
      throw new OperationManagerException(
        `Operation handler '${handler.id}' is already registered`,
        "registerHandler",
        handler.id,
      );
    }

    this.handlers.set(handler.id, handler);
  }

  /**
   * 注销操作处理程序
   * @param handlerId 处理程序ID
   * @returns 是否成功注销
   */
  unregisterHandler(handlerId: string): boolean {
    return this.handlers.delete(handlerId);
  }

  /**
   * 获取操作处理程序
   * @param handlerId 处理程序ID
   * @returns 操作处理程序，如果未找到则返回 null
   */
  getHandler(handlerId: string): IOperationHandler<unknown> | null {
    return this.handlers.get(handlerId) || null;
  }

  /**
   * 获取支持指定操作类型的处理程序
   * @param operationType 操作类型
   * @returns 操作处理程序列表，按优先级排序
   */
  getHandlersForOperationType(
    operationType: BusinessOperationType,
  ): IOperationHandler<unknown>[] {
    return Array.from(this.handlers.values())
      .filter((handler) => handler.supports(operationType))
      .sort((a, b) => b.priority - a.priority);
  }

  /**
   * 执行业务操作
   * @param operationId 操作ID
   * @param aggregate 聚合根实例
   * @param parameters 操作参数
   * @param context 操作上下文
   * @returns 操作结果
   */
  async executeOperation<T>(
    operationId: string,
    aggregate: T,
    parameters: OperationParameters,
    context: OperationContext,
  ): Promise<OperationResult> {
    const operation = this.operations.get(operationId);
    if (!operation) {
      throw new OperationManagerException(
        `Business operation '${operationId}' not found`,
        "executeOperation",
        operationId,
      );
    }

    if (!operation.enabled) {
      throw new OperationManagerException(
        `Business operation '${operationId}' is disabled`,
        "executeOperation",
        operationId,
      );
    }

    // 检查操作是否适用于聚合根
    if (!operation.isApplicable(aggregate)) {
      throw new OperationManagerException(
        `Business operation '${operationId}' is not applicable to the aggregate`,
        "executeOperation",
        operationId,
      );
    }

    // 创建执行上下文
    const executionContext: OperationExecutionContext = {
      operationId,
      contextId: context.id,
      startTime: new Date(),
      status: OperationStatus.VALIDATING,
      aggregate,
      parameters,
      context,
    };

    this.activeOperations.set(context.id, executionContext);

    try {
      // 执行操作
      const result = await this.executeOperationWithValidation(
        operation,
        aggregate,
        parameters,
        context,
      );

      // 记录执行历史
      this.recordExecutionHistory(operation, context, result);

      return result;
    } finally {
      this.activeOperations.delete(context.id);
    }
  }

  /**
   * 创建操作上下文
   * @param initiator 操作发起者
   * @param reason 操作原因，可选
   * @returns 操作上下文构建器
   */
  createContext(initiator: string, reason?: string): OperationContextBuilder {
    return new OperationContextBuilder(initiator, reason);
  }

  /**
   * 获取活跃的操作执行上下文
   * @param contextId 上下文ID
   * @returns 操作执行上下文，如果未找到则返回 null
   */
  getActiveOperation(contextId: string): OperationExecutionContext | null {
    return this.activeOperations.get(contextId) || null;
  }

  /**
   * 获取所有活跃的操作执行上下文
   * @returns 操作执行上下文列表
   */
  getAllActiveOperations(): OperationExecutionContext[] {
    return Array.from(this.activeOperations.values());
  }

  /**
   * 获取执行历史
   * @param operationId 操作ID，可选
   * @returns 执行历史列表
   */
  getExecutionHistory(operationId?: string): OperationExecutionHistory[] {
    if (operationId) {
      return this.executionHistory.filter(
        (history) => history.operationId === operationId,
      );
    }
    return [...this.executionHistory];
  }

  /**
   * 获取操作统计信息
   * @returns 操作统计信息
   */
  getOperationStats(): OperationStats {
    const totalExecutions = this.executionHistory.length;
    const successfulExecutions = this.executionHistory.filter(
      (h) => h.success,
    ).length;
    const failedExecutions = totalExecutions - successfulExecutions;
    const activeOperations = this.activeOperations.size;

    return {
      totalOperations: this.operations.size,
      totalHandlers: this.handlers.size,
      activeOperations,
      totalExecutions,
      successfulExecutions,
      failedExecutions,
      successRate:
        totalExecutions > 0
          ? (successfulExecutions / totalExecutions) * 100
          : 0,
      averageExecutionTime: this.calculateAverageExecutionTime(),
      lastExecutionTime:
        this.executionHistory.length > 0
          ? this.executionHistory[this.executionHistory.length - 1].timestamp
          : null,
    };
  }

  /**
   * 验证业务操作
   * @param operation 业务操作
   * @throws {OperationManagerException} 当操作无效时抛出
   */
  private validateOperation(operation: IBusinessOperation<unknown>): void {
    if (!operation.id || !operation.name) {
      throw new OperationManagerException(
        "Business operation must have id and name",
        "validateOperation",
        operation.id,
      );
    }

    const validation = operation.validateParameters(
      { data: {} },
      null as unknown,
    );
    if (!validation.isValid) {
      throw new OperationManagerException(
        `Business operation '${operation.id}' validation failed: ${validation.getAllMessages().join(", ")}`,
        "validateOperation",
        operation.id,
      );
    }
  }

  /**
   * 执行操作并验证
   * @param operation 业务操作
   * @param aggregate 聚合根实例
   * @param parameters 操作参数
   * @param context 操作上下文
   * @returns 操作结果
   */
  private async executeOperationWithValidation<T>(
    operation: IBusinessOperation<T>,
    aggregate: T,
    parameters: OperationParameters,
    context: OperationContext,
  ): Promise<OperationResult> {
    const startTime = new Date();

    // 验证参数
    context.updateStatus(OperationStatus.VALIDATING);
    const parameterValidation = operation.validateParameters(
      parameters,
      aggregate,
    );
    if (!parameterValidation.isValid) {
      return this.createFailureResult(
        operation.id,
        context.id,
        startTime,
        new Error(
          `Parameter validation failed: ${parameterValidation.getAllMessages().join(", ")}`,
        ),
      );
    }

    // 检查前置条件
    const preconditionsCheck = operation.checkPreconditions(
      aggregate,
      parameters,
    );
    if (!preconditionsCheck.isValid) {
      return this.createFailureResult(
        operation.id,
        context.id,
        startTime,
        new Error(
          `Preconditions check failed: ${preconditionsCheck.getAllMessages().join(", ")}`,
        ),
      );
    }

    // 执行操作
    context.updateStatus(OperationStatus.EXECUTING);
    let result: OperationResult;
    try {
      result = await operation.execute(aggregate, parameters, context);
    } catch (error) {
      return this.createFailureResult(
        operation.id,
        context.id,
        startTime,
        error instanceof Error ? error : new Error(String(error)),
      );
    }

    // 检查后置条件
    const postconditionsCheck = operation.checkPostconditions(
      aggregate,
      result,
    );
    if (!postconditionsCheck.isValid) {
      return this.createFailureResult(
        operation.id,
        context.id,
        startTime,
        new Error(
          `Postconditions check failed: ${postconditionsCheck.getAllMessages().join(", ")}`,
        ),
      );
    }

    // 更新执行时间
    const endTime = new Date();
    result = {
      ...result,
      startTime,
      endTime,
      duration: endTime.getTime() - startTime.getTime(),
    } as OperationResult;

    context.updateStatus(OperationStatus.COMPLETED);
    return result;
  }

  /**
   * 创建失败结果
   * @param operationId 操作ID
   * @param contextId 上下文ID
   * @param startTime 开始时间
   * @param error 错误对象
   * @returns 失败的操作结果
   */
  private createFailureResult(
    operationId: string,
    contextId: string,
    startTime: Date,
    error: Error,
  ): OperationResult {
    const endTime = new Date();
    return {
      id: this.generateId(),
      operationId,
      contextId,
      success: false,
      data: null,
      message: error.message,
      events: [],
      startTime,
      endTime,
      duration: endTime.getTime() - startTime.getTime(),
      error,
      warnings: [],
      metadata: {},
      hasError: () => true,
      hasWarnings: () => false,
      hasEvents: () => false,
      getSummary: () => ({
        status: "failed",
        duration: endTime.getTime() - startTime.getTime(),
        errorCount: 1,
        warningCount: 0,
        eventCount: 0,
        operationType: "",
      }),
    };
  }

  /**
   * 记录执行历史
   * @param operation 业务操作
   * @param context 操作上下文
   * @param result 操作结果
   */
  private recordExecutionHistory(
    operation: IBusinessOperation<unknown>,
    context: OperationContext,
    result: OperationResult,
  ): void {
    const history: OperationExecutionHistory = {
      operationId: operation.id,
      operationName: operation.name,
      contextId: context.id,
      initiator: context.initiator,
      success: result.success,
      timestamp: new Date(),
      duration: result.duration,
      error: result.error?.message,
      eventCount: result.events.length,
      metadata: {
        operationType: operation.operationType,
        parameters: result.metadata,
      },
    };

    this.executionHistory.push(history);
  }

  /**
   * 计算平均执行时间
   * @returns 平均执行时间（毫秒）
   */
  private calculateAverageExecutionTime(): number {
    if (this.executionHistory.length === 0) {
      return 0;
    }

    const totalDuration = this.executionHistory.reduce(
      (sum, history) => sum + history.duration,
      0,
    );
    return totalDuration / this.executionHistory.length;
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
 * 操作管理器异常类
 * @description 操作管理器操作相关的异常
 */
export class OperationManagerException extends Error {
  constructor(
    message: string,
    public readonly operation: string,
    public readonly operationId?: string,
  ) {
    super(message);
    this.name = "OperationManagerException";
  }
}

/**
 * 操作执行上下文接口
 * @description 描述操作执行的上下文信息
 */
export interface OperationExecutionContext {
  /** 操作ID */
  operationId: string;
  /** 上下文ID */
  contextId: string;
  /** 开始时间 */
  startTime: Date;
  /** 执行状态 */
  status: OperationStatus;
  /** 聚合根实例 */
  aggregate: unknown;
  /** 操作参数 */
  parameters: OperationParameters;
  /** 操作上下文 */
  context: OperationContext;
}

/**
 * 操作执行历史接口
 * @description 描述操作执行的历史记录
 */
export interface OperationExecutionHistory {
  /** 操作ID */
  operationId: string;
  /** 操作名称 */
  operationName: string;
  /** 上下文ID */
  contextId: string;
  /** 操作发起者 */
  initiator: string;
  /** 是否成功 */
  success: boolean;
  /** 执行时间戳 */
  timestamp: Date;
  /** 执行耗时（毫秒） */
  duration: number;
  /** 错误消息 */
  error?: string;
  /** 生成事件数量 */
  eventCount: number;
  /** 元数据 */
  metadata: Record<string, unknown>;
}

/**
 * 操作统计信息接口
 * @description 描述操作管理的统计信息
 */
export interface OperationStats {
  /** 总操作数 */
  totalOperations: number;
  /** 总处理程序数 */
  totalHandlers: number;
  /** 活跃操作数 */
  activeOperations: number;
  /** 总执行次数 */
  totalExecutions: number;
  /** 成功执行次数 */
  successfulExecutions: number;
  /** 失败执行次数 */
  failedExecutions: number;
  /** 成功率（百分比） */
  successRate: number;
  /** 平均执行时间（毫秒） */
  averageExecutionTime: number;
  /** 最后执行时间 */
  lastExecutionTime: Date | null;
}

/**
 * 操作上下文构建器类
 * @description 提供链式API构建操作上下文
 */
export class OperationContextBuilder {
  private id: string;
  private initiator: string;
  private reason?: string;
  private tags: string[] = [];
  private metadata: Record<string, unknown> = {};

  constructor(initiator: string, reason?: string) {
    this.id = this.generateId();
    this.initiator = initiator;
    this.reason = reason;
  }

  /**
   * 添加标签
   * @param tag 标签
   * @returns 构建器实例
   */
  withTag(tag: string): OperationContextBuilder {
    if (!this.tags.includes(tag)) {
      this.tags.push(tag);
    }
    return this;
  }

  /**
   * 设置标签列表
   * @param tags 标签列表
   * @returns 构建器实例
   */
  withTags(tags: string[]): OperationContextBuilder {
    this.tags = [...tags];
    return this;
  }

  /**
   * 添加元数据
   * @param key 元数据键
   * @param value 元数据值
   * @returns 构建器实例
   */
  withMetadata(key: string, value: unknown): OperationContextBuilder {
    this.metadata[key] = value;
    return this;
  }

  /**
   * 设置元数据
   * @param metadata 元数据对象
   * @returns 构建器实例
   */
  withMetadataObject(
    metadata: Record<string, unknown>,
  ): OperationContextBuilder {
    this.metadata = { ...this.metadata, ...metadata };
    return this;
  }

  /**
   * 构建操作上下文
   * @returns 操作上下文实例
   */
  build(): OperationContext {
    return new OperationContextImpl(
      this.id,
      this.initiator,
      this.reason,
      this.tags,
      this.metadata,
    );
  }

  /**
   * 生成唯一ID
   * @returns 唯一ID
   */
  private generateId(): string {
    return `context_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * 操作上下文实现类
 * @description 提供操作上下文的具体实现
 */
class OperationContextImpl implements OperationContext {
  public readonly id: string;
  public readonly initiator: string;
  public readonly timestamp: Date;
  public readonly reason?: string;
  public readonly tags: string[];
  public readonly metadata: Record<string, unknown>;
  public readonly history: OperationHistoryEntry[];
  public status: OperationStatus;

  constructor(
    id: string,
    initiator: string,
    reason?: string,
    tags: string[] = [],
    metadata: Record<string, unknown> = {},
  ) {
    this.id = id;
    this.initiator = initiator;
    this.timestamp = new Date();
    this.reason = reason;
    this.tags = tags;
    this.metadata = metadata;
    this.history = [];
    this.status = OperationStatus.INITIALIZED;
  }

  addHistoryEntry(entry: OperationHistoryEntry): void {
    this.history.push(entry);
  }

  updateStatus(status: OperationStatus): void {
    this.status = status;
    this.addHistoryEntry({
      id: this.generateId(),
      timestamp: new Date(),
      type: OperationHistoryType.OPERATION_STARTED,
      message: `Status changed to ${status}`,
      data: { oldStatus: this.status, newStatus: status },
      source: "OperationContext",
      level: OperationLogLevel.INFO,
    });
  }

  private generateId(): string {
    return `entry_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * 操作历史记录条目类型定义
 */
import { OperationHistoryEntry } from "./business-operation.interface.js";
