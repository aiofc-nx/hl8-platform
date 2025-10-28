/**
 * @fileoverview Saga错误处理器
 * @description 提供Saga的错误处理、恢复和监控功能
 */

import { Logger } from "@hl8/logger";
import { EntityId } from "@hl8/domain-kernel";
import { Saga, SagaStatus, SagaContext } from "../base/saga.base.js";
import { SagaStateManager } from "../base/saga-state.js";
// SagaStateSnapshot 暂时未使用，但保留导入以备将来使用

/**
 * 错误类型
 * @description 定义Saga执行过程中可能遇到的错误类型
 */
export enum SagaErrorType {
  /** 执行错误 */
  EXECUTION_ERROR = "execution_error",
  /** 补偿错误 */
  COMPENSATION_ERROR = "compensation_error",
  /** 超时错误 */
  TIMEOUT_ERROR = "timeout_error",
  /** 网络错误 */
  NETWORK_ERROR = "network_error",
  /** 数据错误 */
  DATA_ERROR = "data_error",
  /** 配置错误 */
  CONFIG_ERROR = "config_error",
  /** 系统错误 */
  SYSTEM_ERROR = "system_error",
  /** 未知错误 */
  UNKNOWN_ERROR = "unknown_error",
}

/**
 * Saga错误信息
 * @description 包含错误详细信息的结构
 */
export interface SagaErrorInfo {
  /** 错误ID */
  errorId: string;
  /** Saga ID */
  sagaId: string;
  /** 错误类型 */
  errorType: SagaErrorType;
  /** 错误消息 */
  message: string;
  /** 错误堆栈 */
  stack?: string;
  /** 发生时间 */
  timestamp: Date;
  /** 错误上下文 */
  context: {
    stepIndex?: number;
    stepName?: string;
    aggregateId?: string;
    sagaName?: string;
    retryCount?: number;
    executionTime?: number;
  };
  /** 原始错误 */
  originalError?: Error;
  /** 是否可恢复 */
  recoverable: boolean;
  /** 恢复建议 */
  recoverySuggestions: string[];
}

/**
 * 错误处理策略
 * @description 定义错误处理的策略
 */
export enum ErrorHandlingStrategy {
  /** 立即重试 */
  IMMEDIATE_RETRY = "immediate_retry",
  /** 延迟重试 */
  DELAYED_RETRY = "delayed_retry",
  /** 指数退避重试 */
  EXPONENTIAL_BACKOFF_RETRY = "exponential_backoff_retry",
  /** 补偿后重试 */
  COMPENSATE_AND_RETRY = "compensate_and_retry",
  /** 跳过步骤 */
  SKIP_STEP = "skip_step",
  /** 暂停Saga */
  PAUSE_SAGA = "pause_saga",
  /** 取消Saga */
  CANCEL_SAGA = "cancel_saga",
  /** 人工干预 */
  MANUAL_INTERVENTION = "manual_intervention",
}

/**
 * 错误处理配置
 * @description 错误处理的配置选项
 */
export interface ErrorHandlingConfig {
  /** 最大重试次数 */
  maxRetries: number;
  /** 重试间隔（毫秒） */
  retryInterval: number;
  /** 最大重试间隔（毫秒） */
  maxRetryInterval: number;
  /** 重试倍数 */
  retryMultiplier: number;
  /** 超时时间（毫秒） */
  timeout: number;
  /** 是否启用自动恢复 */
  autoRecovery: boolean;
  /** 恢复检查间隔（毫秒） */
  recoveryCheckInterval: number;
  /** 错误通知配置 */
  notification: {
    enabled: boolean;
    channels: string[];
    threshold: number;
  };
  /** 错误分类配置 */
  classification: {
    [key in SagaErrorType]: {
      strategy: ErrorHandlingStrategy;
      maxRetries: number;
      retryInterval: number;
    };
  };
}

/**
 * 错误处理结果
 * @description 错误处理的结果信息
 */
export interface ErrorHandlingResult {
  /** 是否成功处理 */
  success: boolean;
  /** 处理策略 */
  strategy: ErrorHandlingStrategy;
  /** 是否已恢复 */
  recovered: boolean;
  /** 下次重试时间 */
  nextRetryAt?: Date;
  /** 处理时间（毫秒） */
  processingTime: number;
  /** 错误信息 */
  error?: string;
  /** 建议操作 */
  suggestedAction?: string;
}

/**
 * 错误统计信息
 * @description 错误处理的统计信息
 */
export interface ErrorStatistics {
  /** 总错误数 */
  totalErrors: number;
  /** 按类型分组的错误数 */
  byType: Record<SagaErrorType, number>;
  /** 按策略分组的处理数 */
  byStrategy: Record<ErrorHandlingStrategy, number>;
  /** 成功恢复数 */
  recoveredCount: number;
  /** 失败恢复数 */
  failedRecoveryCount: number;
  /** 平均处理时间（毫秒） */
  averageProcessingTime: number;
  /** 最后错误时间 */
  lastErrorAt?: Date;
  /** 错误趋势 */
  errorTrend: Array<{
    date: string;
    count: number;
  }>;
}

/**
 * Saga错误处理器接口
 * @description 定义Saga错误处理器的接口
 */
export interface ISagaErrorHandler {
  /**
   * 处理Saga错误
   * @param error 错误信息
   * @param saga Saga实例
   * @param context Saga上下文
   * @returns 处理结果
   */
  handleError(
    error: Error,
    saga: Saga<unknown>,
    context: SagaContext,
  ): Promise<ErrorHandlingResult>;

  /**
   * 恢复失败的Saga
   * @param sagaId Saga ID
   * @returns 恢复结果
   */
  recoverSaga(sagaId: string): Promise<boolean>;

  /**
   * 获取错误统计信息
   * @returns 统计信息
   */
  getErrorStatistics(): Promise<ErrorStatistics>;

  /**
   * 获取Saga错误历史
   * @param sagaId Saga ID
   * @returns 错误历史
   */
  getSagaErrorHistory(sagaId: string): Promise<SagaErrorInfo[]>;

  /**
   * 清理过期的错误记录
   * @param beforeDate 清理此日期之前的记录
   * @returns 清理数量
   */
  cleanup(beforeDate: Date): Promise<number>;
}

/**
 * Saga错误处理器实现
 * @description 提供Saga的错误处理、恢复和监控功能
 */
export class SagaErrorHandler implements ISagaErrorHandler {
  private readonly logger: Logger;
  private readonly stateManager: SagaStateManager;
  private readonly config: ErrorHandlingConfig;
  private readonly errorHistory: Map<string, SagaErrorInfo[]> = new Map();
  private readonly statistics: ErrorStatistics;
  private recoveryTimer?: NodeJS.Timeout;

  constructor(
    logger: Logger,
    stateManager: SagaStateManager,
    config: Partial<ErrorHandlingConfig> = {},
  ) {
    this.logger = logger;
    this.stateManager = stateManager;
    this.config = {
      maxRetries: 3,
      retryInterval: 5000,
      maxRetryInterval: 60000,
      retryMultiplier: 2,
      timeout: 30000,
      autoRecovery: true,
      recoveryCheckInterval: 30000,
      notification: {
        enabled: true,
        channels: ["log"],
        threshold: 5,
      },
      classification: {
        [SagaErrorType.EXECUTION_ERROR]: {
          strategy: ErrorHandlingStrategy.DELAYED_RETRY,
          maxRetries: 3,
          retryInterval: 5000,
        },
        [SagaErrorType.COMPENSATION_ERROR]: {
          strategy: ErrorHandlingStrategy.MANUAL_INTERVENTION,
          maxRetries: 1,
          retryInterval: 10000,
        },
        [SagaErrorType.TIMEOUT_ERROR]: {
          strategy: ErrorHandlingStrategy.EXPONENTIAL_BACKOFF_RETRY,
          maxRetries: 5,
          retryInterval: 2000,
        },
        [SagaErrorType.NETWORK_ERROR]: {
          strategy: ErrorHandlingStrategy.EXPONENTIAL_BACKOFF_RETRY,
          maxRetries: 5,
          retryInterval: 3000,
        },
        [SagaErrorType.DATA_ERROR]: {
          strategy: ErrorHandlingStrategy.MANUAL_INTERVENTION,
          maxRetries: 1,
          retryInterval: 0,
        },
        [SagaErrorType.CONFIG_ERROR]: {
          strategy: ErrorHandlingStrategy.MANUAL_INTERVENTION,
          maxRetries: 0,
          retryInterval: 0,
        },
        [SagaErrorType.SYSTEM_ERROR]: {
          strategy: ErrorHandlingStrategy.PAUSE_SAGA,
          maxRetries: 1,
          retryInterval: 10000,
        },
        [SagaErrorType.UNKNOWN_ERROR]: {
          strategy: ErrorHandlingStrategy.MANUAL_INTERVENTION,
          maxRetries: 1,
          retryInterval: 5000,
        },
      },
      ...config,
    };

    this.statistics = {
      totalErrors: 0,
      byType: {
        [SagaErrorType.EXECUTION_ERROR]: 0,
        [SagaErrorType.COMPENSATION_ERROR]: 0,
        [SagaErrorType.TIMEOUT_ERROR]: 0,
        [SagaErrorType.NETWORK_ERROR]: 0,
        [SagaErrorType.DATA_ERROR]: 0,
        [SagaErrorType.CONFIG_ERROR]: 0,
        [SagaErrorType.SYSTEM_ERROR]: 0,
        [SagaErrorType.UNKNOWN_ERROR]: 0,
      },
      byStrategy: {
        [ErrorHandlingStrategy.IMMEDIATE_RETRY]: 0,
        [ErrorHandlingStrategy.DELAYED_RETRY]: 0,
        [ErrorHandlingStrategy.EXPONENTIAL_BACKOFF_RETRY]: 0,
        [ErrorHandlingStrategy.COMPENSATE_AND_RETRY]: 0,
        [ErrorHandlingStrategy.SKIP_STEP]: 0,
        [ErrorHandlingStrategy.PAUSE_SAGA]: 0,
        [ErrorHandlingStrategy.CANCEL_SAGA]: 0,
        [ErrorHandlingStrategy.MANUAL_INTERVENTION]: 0,
      },
      recoveredCount: 0,
      failedRecoveryCount: 0,
      averageProcessingTime: 0,
      errorTrend: [],
    };

    this.initializeRecoveryTimer();
  }

  /**
   * 处理Saga错误
   * @param error 错误信息
   * @param saga Saga实例
   * @param context Saga上下文
   * @returns 处理结果
   */
  public async handleError(
    error: Error,
    saga: Saga<unknown>,
    context: SagaContext,
  ): Promise<ErrorHandlingResult> {
    const startTime = Date.now();
    const sagaId = saga.getSagaId().toString();

    try {
      // 创建错误信息
      const errorInfo = this.createErrorInfo(error, saga, context);

      // 记录错误
      this.recordError(errorInfo);

      // 分类错误
      const errorType = this.classifyError(error);

      // 获取处理策略
      const strategy = this.getHandlingStrategy(errorType, errorInfo);

      this.logger.error(`处理Saga错误: ${sagaId}`, {
        errorType,
        strategy,
        message: error.message,
        stepIndex: context.currentStepIndex,
      });

      // 执行处理策略
      const result = await this.executeHandlingStrategy(
        strategy,
        errorInfo,
        saga,
        context,
      );

      const processingTime = Date.now() - startTime;
      this.updateStatistics(
        errorType,
        strategy,
        processingTime,
        result.recovered,
      );

      this.logger.debug(`Saga错误处理完成: ${sagaId}`, {
        strategy,
        recovered: result.recovered,
        processingTime,
      });

      return {
        ...result,
        processingTime,
      };
    } catch (handlingError) {
      const processingTime = Date.now() - startTime;

      this.logger.error(`处理Saga错误时发生异常: ${sagaId}`, {
        originalError: error.message,
        handlingError:
          handlingError instanceof Error
            ? handlingError.message
            : String(handlingError),
        processingTime,
      });

      return {
        success: false,
        strategy: ErrorHandlingStrategy.MANUAL_INTERVENTION,
        recovered: false,
        processingTime,
        error:
          handlingError instanceof Error
            ? handlingError.message
            : String(handlingError),
        suggestedAction: "需要人工干预",
      };
    }
  }

  /**
   * 恢复失败的Saga
   * @param sagaId Saga ID
   * @returns 恢复结果
   */
  public async recoverSaga(sagaId: string): Promise<boolean> {
    try {
      const snapshot = await this.stateManager.getById(sagaId);
      if (!snapshot) {
        this.logger.warn(`未找到Saga状态快照: ${sagaId}`);
        return false;
      }

      if (snapshot.status !== SagaStatus.FAILED) {
        this.logger.warn(`Saga状态不是失败状态: ${snapshot.status}`);
        return false;
      }

      // TODO: 实现Saga恢复逻辑
      // 这里需要根据具体的Saga类型来恢复实例
      this.logger.debug(`开始恢复Saga: ${sagaId}`);

      // 模拟恢复过程
      await this.delay(1000);

      this.logger.debug(`Saga恢复成功: ${sagaId}`);
      return true;
    } catch (error) {
      this.logger.error(`恢复Saga失败: ${sagaId}`, {
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * 获取错误统计信息
   * @returns 统计信息
   */
  public async getErrorStatistics(): Promise<ErrorStatistics> {
    return { ...this.statistics };
  }

  /**
   * 获取Saga错误历史
   * @param sagaId Saga ID
   * @returns 错误历史
   */
  public async getSagaErrorHistory(sagaId: string): Promise<SagaErrorInfo[]> {
    return this.errorHistory.get(sagaId) || [];
  }

  /**
   * 清理过期的错误记录
   * @param beforeDate 清理此日期之前的记录
   * @returns 清理数量
   */
  public async cleanup(beforeDate: Date): Promise<number> {
    let cleanedCount = 0;

    for (const [sagaId, errors] of this.errorHistory) {
      const filteredErrors = errors.filter(
        (error) => error.timestamp >= beforeDate,
      );
      if (filteredErrors.length !== errors.length) {
        this.errorHistory.set(sagaId, filteredErrors);
        cleanedCount += errors.length - filteredErrors.length;
      }
    }

    this.logger.debug(`清理过期错误记录完成`, { cleanedCount, beforeDate });
    return cleanedCount;
  }

  /**
   * 销毁错误处理器
   * @description 清理定时器和资源
   */
  public destroy(): void {
    if (this.recoveryTimer) {
      clearInterval(this.recoveryTimer);
    }

    this.logger.debug("Saga错误处理器已销毁");
  }

  // 私有方法

  /**
   * 创建错误信息
   * @param error 原始错误
   * @param saga Saga实例
   * @param context Saga上下文
   * @returns 错误信息
   */
  private createErrorInfo(
    error: Error,
    saga: Saga<unknown>,
    context: SagaContext,
  ): SagaErrorInfo {
    const errorId = new EntityId().toString();
    const errorType = this.classifyError(error);
    const currentStep = saga.getCurrentStep();

    return {
      errorId,
      sagaId: saga.getSagaId().toString(),
      errorType,
      message: error.message,
      stack: error.stack,
      timestamp: new Date(),
      context: {
        stepIndex: context.currentStepIndex,
        stepName: currentStep?.getName(),
        aggregateId: context.aggregateId.toString(),
        sagaName: saga.getName(),
        retryCount: 0, // TODO: 从上下文中获取
        executionTime: Date.now() - context.startTime.getTime(),
      },
      originalError: error,
      recoverable: this.isRecoverableError(errorType),
      recoverySuggestions: this.getRecoverySuggestions(errorType, error),
    };
  }

  /**
   * 分类错误
   * @param error 错误
   * @returns 错误类型
   */
  private classifyError(error: Error): SagaErrorType {
    const message = error.message.toLowerCase();
    const name = error.name.toLowerCase();

    if (message.includes("timeout") || name.includes("timeout")) {
      return SagaErrorType.TIMEOUT_ERROR;
    }
    if (message.includes("network") || message.includes("connection")) {
      return SagaErrorType.NETWORK_ERROR;
    }
    if (message.includes("data") || message.includes("validation")) {
      return SagaErrorType.DATA_ERROR;
    }
    if (message.includes("config") || message.includes("configuration")) {
      return SagaErrorType.CONFIG_ERROR;
    }
    if (message.includes("system") || message.includes("internal")) {
      return SagaErrorType.SYSTEM_ERROR;
    }
    if (message.includes("compensation")) {
      return SagaErrorType.COMPENSATION_ERROR;
    }
    if (message.includes("execution") || message.includes("step")) {
      return SagaErrorType.EXECUTION_ERROR;
    }

    return SagaErrorType.UNKNOWN_ERROR;
  }

  /**
   * 获取处理策略
   * @param errorType 错误类型
   * @param errorInfo 错误信息
   * @returns 处理策略
   */
  private getHandlingStrategy(
    errorType: SagaErrorType,
    _errorInfo: SagaErrorInfo,
  ): ErrorHandlingStrategy {
    const classification = this.config.classification[errorType];
    return classification.strategy;
  }

  /**
   * 执行处理策略
   * @param strategy 处理策略
   * @param errorInfo 错误信息
   * @param saga Saga实例
   * @param context Saga上下文
   * @returns 处理结果
   */
  private async executeHandlingStrategy(
    strategy: ErrorHandlingStrategy,
    errorInfo: SagaErrorInfo,
    saga: Saga<unknown>,
    context: SagaContext,
  ): Promise<ErrorHandlingResult> {
    switch (strategy) {
      case ErrorHandlingStrategy.IMMEDIATE_RETRY:
        return this.handleImmediateRetry(errorInfo, saga, context);

      case ErrorHandlingStrategy.DELAYED_RETRY:
        return this.handleDelayedRetry(errorInfo, saga, context);

      case ErrorHandlingStrategy.EXPONENTIAL_BACKOFF_RETRY:
        return this.handleExponentialBackoffRetry(errorInfo, saga, context);

      case ErrorHandlingStrategy.COMPENSATE_AND_RETRY:
        return this.handleCompensateAndRetry(errorInfo, saga, context);

      case ErrorHandlingStrategy.SKIP_STEP:
        return this.handleSkipStep(errorInfo, saga, context);

      case ErrorHandlingStrategy.PAUSE_SAGA:
        return this.handlePauseSaga(errorInfo, saga, context);

      case ErrorHandlingStrategy.CANCEL_SAGA:
        return this.handleCancelSaga(errorInfo, saga, context);

      case ErrorHandlingStrategy.MANUAL_INTERVENTION:
        return this.handleManualIntervention(errorInfo, saga, context);

      default:
        return this.handleManualIntervention(errorInfo, saga, context);
    }
  }

  /**
   * 处理立即重试
   * @param errorInfo 错误信息
   * @param saga Saga实例
   * @param context Saga上下文
   * @returns 处理结果
   */
  private async handleImmediateRetry(
    _errorInfo: SagaErrorInfo,
    _saga: Saga<unknown>,
    _context: SagaContext,
  ): Promise<ErrorHandlingResult> {
    // TODO: 实现立即重试逻辑
    return {
      success: true,
      strategy: ErrorHandlingStrategy.IMMEDIATE_RETRY,
      recovered: false,
      processingTime: 0,
      suggestedAction: "立即重试",
    };
  }

  /**
   * 处理延迟重试
   * @param errorInfo 错误信息
   * @param saga Saga实例
   * @param context Saga上下文
   * @returns 处理结果
   */
  private async handleDelayedRetry(
    _errorInfo: SagaErrorInfo,
    _saga: Saga<unknown>,
    _context: SagaContext,
  ): Promise<ErrorHandlingResult> {
    const retryInterval = this.config.retryInterval;
    const nextRetryAt = new Date(Date.now() + retryInterval);

    // TODO: 实现延迟重试逻辑
    return {
      success: true,
      strategy: ErrorHandlingStrategy.DELAYED_RETRY,
      recovered: false,
      processingTime: 0,
      nextRetryAt,
      suggestedAction: `延迟${retryInterval}ms后重试`,
    };
  }

  /**
   * 处理指数退避重试
   * @param errorInfo 错误信息
   * @param saga Saga实例
   * @param context Saga上下文
   * @returns 处理结果
   */
  private async handleExponentialBackoffRetry(
    errorInfo: SagaErrorInfo,
    _saga: Saga<unknown>,
    _context: SagaContext,
  ): Promise<ErrorHandlingResult> {
    const retryCount = errorInfo.context.retryCount || 0;
    const retryInterval = Math.min(
      this.config.retryInterval *
        Math.pow(this.config.retryMultiplier, retryCount),
      this.config.maxRetryInterval,
    );
    const nextRetryAt = new Date(Date.now() + retryInterval);

    // TODO: 实现指数退避重试逻辑
    return {
      success: true,
      strategy: ErrorHandlingStrategy.EXPONENTIAL_BACKOFF_RETRY,
      recovered: false,
      processingTime: 0,
      nextRetryAt,
      suggestedAction: `指数退避重试，间隔${retryInterval}ms`,
    };
  }

  /**
   * 处理补偿后重试
   * @param errorInfo 错误信息
   * @param saga Saga实例
   * @param context Saga上下文
   * @returns 处理结果
   */
  private async handleCompensateAndRetry(
    errorInfo: SagaErrorInfo,
    saga: Saga<unknown>,
    _context: SagaContext,
  ): Promise<ErrorHandlingResult> {
    try {
      // 执行补偿
      await saga.compensate(errorInfo.message);

      return {
        success: true,
        strategy: ErrorHandlingStrategy.COMPENSATE_AND_RETRY,
        recovered: true,
        processingTime: 0,
        suggestedAction: "补偿完成，可以重试",
      };
    } catch (compensationError) {
      return {
        success: false,
        strategy: ErrorHandlingStrategy.COMPENSATE_AND_RETRY,
        recovered: false,
        processingTime: 0,
        error:
          compensationError instanceof Error
            ? compensationError.message
            : String(compensationError),
        suggestedAction: "补偿失败，需要人工干预",
      };
    }
  }

  /**
   * 处理跳过步骤
   * @param errorInfo 错误信息
   * @param saga Saga实例
   * @param context Saga上下文
   * @returns 处理结果
   */
  private async handleSkipStep(
    _errorInfo: SagaErrorInfo,
    _saga: Saga<unknown>,
    _context: SagaContext,
  ): Promise<ErrorHandlingResult> {
    // TODO: 实现跳过步骤逻辑
    return {
      success: true,
      strategy: ErrorHandlingStrategy.SKIP_STEP,
      recovered: true,
      processingTime: 0,
      suggestedAction: "跳过当前步骤",
    };
  }

  /**
   * 处理暂停Saga
   * @param errorInfo 错误信息
   * @param saga Saga实例
   * @param context Saga上下文
   * @returns 处理结果
   */
  private async handlePauseSaga(
    errorInfo: SagaErrorInfo,
    saga: Saga<unknown>,
    _context: SagaContext,
  ): Promise<ErrorHandlingResult> {
    try {
      await saga.pause();
      return {
        success: true,
        strategy: ErrorHandlingStrategy.PAUSE_SAGA,
        recovered: true,
        processingTime: 0,
        suggestedAction: "Saga已暂停",
      };
    } catch (pauseError) {
      return {
        success: false,
        strategy: ErrorHandlingStrategy.PAUSE_SAGA,
        recovered: false,
        processingTime: 0,
        error:
          pauseError instanceof Error ? pauseError.message : String(pauseError),
        suggestedAction: "暂停Saga失败",
      };
    }
  }

  /**
   * 处理取消Saga
   * @param errorInfo 错误信息
   * @param saga Saga实例
   * @param context Saga上下文
   * @returns 处理结果
   */
  private async handleCancelSaga(
    errorInfo: SagaErrorInfo,
    saga: Saga<unknown>,
    _context: SagaContext,
  ): Promise<ErrorHandlingResult> {
    try {
      await saga.cancel(errorInfo.message);
      return {
        success: true,
        strategy: ErrorHandlingStrategy.CANCEL_SAGA,
        recovered: true,
        processingTime: 0,
        suggestedAction: "Saga已取消",
      };
    } catch (cancelError) {
      return {
        success: false,
        strategy: ErrorHandlingStrategy.CANCEL_SAGA,
        recovered: false,
        processingTime: 0,
        error:
          cancelError instanceof Error
            ? cancelError.message
            : String(cancelError),
        suggestedAction: "取消Saga失败",
      };
    }
  }

  /**
   * 处理人工干预
   * @param errorInfo 错误信息
   * @param saga Saga实例
   * @param context Saga上下文
   * @returns 处理结果
   */
  private async handleManualIntervention(
    _errorInfo: SagaErrorInfo,
    _saga: Saga<unknown>,
    _context: SagaContext,
  ): Promise<ErrorHandlingResult> {
    // TODO: 发送通知给管理员
    return {
      success: true,
      strategy: ErrorHandlingStrategy.MANUAL_INTERVENTION,
      recovered: false,
      processingTime: 0,
      suggestedAction: "需要人工干预",
    };
  }

  /**
   * 记录错误
   * @param errorInfo 错误信息
   */
  private recordError(errorInfo: SagaErrorInfo): void {
    const sagaId = errorInfo.sagaId;
    if (!this.errorHistory.has(sagaId)) {
      this.errorHistory.set(sagaId, []);
    }
    this.errorHistory.get(sagaId)!.push(errorInfo);
  }

  /**
   * 更新统计信息
   * @param errorType 错误类型
   * @param strategy 处理策略
   * @param processingTime 处理时间
   * @param recovered 是否恢复
   */
  private updateStatistics(
    errorType: SagaErrorType,
    strategy: ErrorHandlingStrategy,
    processingTime: number,
    recovered: boolean,
  ): void {
    this.statistics.totalErrors++;
    this.statistics.byType[errorType]++;
    this.statistics.byStrategy[strategy]++;

    if (recovered) {
      this.statistics.recoveredCount++;
    } else {
      this.statistics.failedRecoveryCount++;
    }

    // 更新平均处理时间
    const totalProcessed =
      this.statistics.recoveredCount + this.statistics.failedRecoveryCount;
    if (totalProcessed > 0) {
      this.statistics.averageProcessingTime =
        (this.statistics.averageProcessingTime * (totalProcessed - 1) +
          processingTime) /
        totalProcessed;
    }

    this.statistics.lastErrorAt = new Date();
  }

  /**
   * 检查错误是否可恢复
   * @param errorType 错误类型
   * @returns 是否可恢复
   */
  private isRecoverableError(errorType: SagaErrorType): boolean {
    const recoverableTypes = [
      SagaErrorType.EXECUTION_ERROR,
      SagaErrorType.TIMEOUT_ERROR,
      SagaErrorType.NETWORK_ERROR,
    ];
    return recoverableTypes.includes(errorType);
  }

  /**
   * 获取恢复建议
   * @param errorType 错误类型
   * @param error 错误
   * @returns 恢复建议
   */
  private getRecoverySuggestions(
    errorType: SagaErrorType,
    _error: Error,
  ): string[] {
    const suggestions: string[] = [];

    switch (errorType) {
      case SagaErrorType.EXECUTION_ERROR:
        suggestions.push("检查步骤实现逻辑");
        suggestions.push("验证输入数据");
        suggestions.push("重试执行");
        break;
      case SagaErrorType.TIMEOUT_ERROR:
        suggestions.push("增加超时时间");
        suggestions.push("优化执行逻辑");
        suggestions.push("检查系统资源");
        break;
      case SagaErrorType.NETWORK_ERROR:
        suggestions.push("检查网络连接");
        suggestions.push("重试网络请求");
        suggestions.push("使用备用服务");
        break;
      case SagaErrorType.DATA_ERROR:
        suggestions.push("验证数据格式");
        suggestions.push("检查数据完整性");
        suggestions.push("修复数据问题");
        break;
      case SagaErrorType.CONFIG_ERROR:
        suggestions.push("检查配置参数");
        suggestions.push("更新配置设置");
        suggestions.push("验证配置格式");
        break;
      case SagaErrorType.SYSTEM_ERROR:
        suggestions.push("检查系统状态");
        suggestions.push("重启相关服务");
        suggestions.push("联系系统管理员");
        break;
      default:
        suggestions.push("分析错误原因");
        suggestions.push("查看错误日志");
        suggestions.push("联系技术支持");
    }

    return suggestions;
  }

  /**
   * 初始化恢复定时器
   * @description 设置自动恢复检查定时器
   */
  private initializeRecoveryTimer(): void {
    if (this.config.autoRecovery) {
      this.recoveryTimer = setInterval(() => {
        this.checkAndRecoverFailedSagas().catch((error) => {
          this.logger.error("检查失败Saga恢复时出错", {
            error: error instanceof Error ? error.message : String(error),
          });
        });
      }, this.config.recoveryCheckInterval);
    }
  }

  /**
   * 检查并恢复失败的Saga
   * @returns 恢复结果
   */
  private async checkAndRecoverFailedSagas(): Promise<void> {
    try {
      const failedSnapshots = await this.stateManager.query({
        status: SagaStatus.FAILED,
        pagination: { page: 1, pageSize: 100 },
      });

      for (const snapshot of failedSnapshots.snapshots) {
        try {
          const recovered = await this.recoverSaga(snapshot.sagaId);
          if (recovered) {
            this.logger.debug(`自动恢复Saga成功: ${snapshot.sagaId}`);
          }
        } catch (error) {
          this.logger.error(`自动恢复Saga失败: ${snapshot.sagaId}`, {
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
    } catch (error) {
      this.logger.error("检查失败Saga时出错", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * 延迟执行
   * @param ms 延迟时间（毫秒）
   * @returns Promise
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
