/**
 * @fileoverview 协调管理器实现
 * @description 提供领域服务协调管理的具体实现
 */

import {
  ICoordinationRule,
  ICoordinationContext,
  ICoordinationResult,
  CoordinationStatus,
} from "./coordination-rule.interface.js";
import {
  CoordinationContextBuilder,
  ICoordinationContextBuilder,
} from "./coordination-context.interface.js";
import { CoordinationResultBuilder } from "./coordination-result.interface.js";

/**
 * 协调管理器类
 * @description 负责管理领域服务的协调规则和执行
 */
export class CoordinationManager {
  private readonly rules = new Map<string, ICoordinationRule>();
  private readonly activeContexts = new Map<string, ICoordinationContext>();
  private readonly executionHistory: CoordinationExecutionHistory[] = [];

  /**
   * 注册协调规则
   * @param rule 协调规则
   * @throws {CoordinationManagerException} 当规则注册失败时抛出
   */
  registerRule(rule: ICoordinationRule): void {
    this.validateRule(rule);

    if (this.rules.has(rule.id)) {
      throw new CoordinationManagerException(
        `Coordination rule '${rule.id}' is already registered`,
        "registerRule",
        rule.id,
      );
    }

    this.rules.set(rule.id, rule);
  }

  /**
   * 注销协调规则
   * @param ruleId 规则ID
   * @returns 是否成功注销
   */
  unregisterRule(ruleId: string): boolean {
    return this.rules.delete(ruleId);
  }

  /**
   * 获取协调规则
   * @param ruleId 规则ID
   * @returns 协调规则，如果未找到则返回 null
   */
  getRule(ruleId: string): ICoordinationRule | null {
    return this.rules.get(ruleId) || null;
  }

  /**
   * 获取所有协调规则
   * @returns 协调规则列表
   */
  getAllRules(): ICoordinationRule[] {
    return Array.from(this.rules.values());
  }

  /**
   * 执行协调
   * @param context 协调上下文
   * @returns 协调结果
   */
  async executeCoordination(
    context: ICoordinationContext,
  ): Promise<ICoordinationResult[]> {
    const applicableRules = this.getApplicableRules(context);
    const results: ICoordinationResult[] = [];

    this.activeContexts.set(context.id, context);

    try {
      for (const rule of applicableRules) {
        const result = await this.executeRule(rule, context);
        results.push(result);

        // 如果规则执行失败且规则不允许继续，则停止执行
        if (!result.success && !this.shouldContinueOnFailure(rule, result)) {
          break;
        }
      }
    } finally {
      this.activeContexts.delete(context.id);
    }

    // 记录执行历史
    this.recordExecutionHistory(context, results);

    return results;
  }

  /**
   * 创建协调上下文
   * @param operationType 操作类型
   * @param operationData 操作数据
   * @param participatingServices 参与服务列表
   * @returns 协调上下文构建器
   */
  createContext(
    operationType: string,
    operationData: unknown,
    participatingServices: string[] = [],
  ): ICoordinationContextBuilder {
    return new CoordinationContextBuilder()
      .withOperationType(operationType)
      .withOperationData(operationData)
      .withParticipatingServices(participatingServices);
  }

  /**
   * 获取活跃的协调上下文
   * @param contextId 上下文ID
   * @returns 协调上下文，如果未找到则返回 null
   */
  getActiveContext(contextId: string): ICoordinationContext | null {
    return this.activeContexts.get(contextId) || null;
  }

  /**
   * 获取所有活跃的协调上下文
   * @returns 协调上下文列表
   */
  getAllActiveContexts(): ICoordinationContext[] {
    return Array.from(this.activeContexts.values());
  }

  /**
   * 取消协调
   * @param contextId 上下文ID
   * @returns 是否成功取消
   */
  cancelCoordination(contextId: string): boolean {
    const context = this.activeContexts.get(contextId);
    if (context) {
      context.updateStatus(CoordinationStatus.CANCELLED);
      this.activeContexts.delete(contextId);
      return true;
    }
    return false;
  }

  /**
   * 获取执行历史
   * @param contextId 上下文ID，可选
   * @returns 执行历史列表
   */
  getExecutionHistory(contextId?: string): CoordinationExecutionHistory[] {
    if (contextId) {
      return this.executionHistory.filter(
        (history) => history.contextId === contextId,
      );
    }
    return [...this.executionHistory];
  }

  /**
   * 清理执行历史
   * @param olderThan 清理早于此时间的记录
   */
  cleanupExecutionHistory(olderThan: Date): void {
    const index = this.executionHistory.findIndex(
      (history) => history.timestamp > olderThan,
    );
    if (index > 0) {
      this.executionHistory.splice(0, index);
    }
  }

  /**
   * 获取协调统计信息
   * @returns 协调统计信息
   */
  getCoordinationStats(): CoordinationStats {
    const totalExecutions = this.executionHistory.length;
    const successfulExecutions = this.executionHistory.filter(
      (h) => h.success,
    ).length;
    const failedExecutions = totalExecutions - successfulExecutions;
    const activeExecutions = this.activeContexts.size;

    return {
      totalRules: this.rules.size,
      activeContexts: activeExecutions,
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
   * 验证协调规则
   * @param rule 协调规则
   * @throws {CoordinationManagerException} 当规则无效时抛出
   */
  private validateRule(rule: ICoordinationRule): void {
    const validation = rule.validate();
    if (!validation.isValid) {
      throw new CoordinationManagerException(
        `Coordination rule '${rule.id}' validation failed: ${validation.getAllMessages().join(", ")}`,
        "validateRule",
        rule.id,
      );
    }
  }

  /**
   * 获取适用的协调规则
   * @param context 协调上下文
   * @returns 适用的协调规则列表
   */
  private getApplicableRules(
    context: ICoordinationContext,
  ): ICoordinationRule[] {
    return Array.from(this.rules.values())
      .filter((rule) => rule.enabled && rule.isApplicable(context))
      .sort((a, b) => b.priority - a.priority);
  }

  /**
   * 执行单个协调规则
   * @param rule 协调规则
   * @param context 协调上下文
   * @returns 协调结果
   */
  private async executeRule(
    rule: ICoordinationRule,
    context: ICoordinationContext,
  ): Promise<ICoordinationResult> {
    const startTime = new Date();

    try {
      const result = await rule.execute(context);
      const endTime = new Date();

      const builder = new CoordinationResultBuilder()
        .withRuleId(rule.id)
        .withContextId(context.id)
        .withSuccess(result.success)
        .withData(result.data)
        .withMessage(result.message)
        .withExecutionTime(startTime, endTime)
        .withWarnings(result.warnings)
        .withMetadataObject(result.metadata);

      // 如果结果中包含错误，传递错误
      if (result.error) {
        builder.withError(result.error);
      }

      return builder.build();
    } catch (error) {
      const endTime = new Date();

      return new CoordinationResultBuilder()
        .withRuleId(rule.id)
        .withContextId(context.id)
        .withSuccess(false)
        .withMessage(
          `Rule execution failed: ${error instanceof Error ? error.message : String(error)}`,
        )
        .withExecutionTime(startTime, endTime)
        .withError(error instanceof Error ? error : new Error(String(error)))
        .build();
    }
  }

  /**
   * 检查是否应该在失败后继续执行
   * @param rule 协调规则
   * @param result 执行结果
   * @returns 是否应该继续
   */
  private shouldContinueOnFailure(
    _rule: ICoordinationRule,
    _result: ICoordinationResult,
  ): boolean {
    // 这里可以根据规则配置或结果类型来决定是否继续
    // 默认情况下，如果规则执行失败则停止执行
    return false;
  }

  /**
   * 记录执行历史
   * @param context 协调上下文
   * @param results 执行结果列表
   */
  private recordExecutionHistory(
    context: ICoordinationContext,
    results: ICoordinationResult[],
  ): void {
    const history: CoordinationExecutionHistory = {
      contextId: context.id,
      operationType: context.operationType,
      ruleCount: results.length,
      success: results.every((r) => r.success),
      timestamp: new Date(),
      duration: results.reduce((total, r) => total + r.duration, 0),
      results: results.map((r) => ({
        ruleId: r.ruleId,
        success: r.success,
        duration: r.duration,
        error: r.error?.message,
      })),
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
}

/**
 * 协调管理器异常类
 * @description 协调管理器操作相关的异常
 */
export class CoordinationManagerException extends Error {
  constructor(
    message: string,
    public readonly operation: string,
    public readonly ruleId?: string,
  ) {
    super(message);
    this.name = "CoordinationManagerException";
  }
}

/**
 * 协调执行历史接口
 * @description 描述协调执行的历史记录
 */
export interface CoordinationExecutionHistory {
  /** 上下文ID */
  contextId: string;
  /** 操作类型 */
  operationType: string;
  /** 规则数量 */
  ruleCount: number;
  /** 是否成功 */
  success: boolean;
  /** 执行时间戳 */
  timestamp: Date;
  /** 总执行时间（毫秒） */
  duration: number;
  /** 规则执行结果 */
  results: CoordinationRuleExecutionResult[];
}

/**
 * 协调规则执行结果接口
 * @description 描述单个协调规则的执行结果
 */
export interface CoordinationRuleExecutionResult {
  /** 规则ID */
  ruleId: string;
  /** 是否成功 */
  success: boolean;
  /** 执行时间（毫秒） */
  duration: number;
  /** 错误消息 */
  error?: string;
}

/**
 * 协调统计信息接口
 * @description 描述协调管理的统计信息
 */
export interface CoordinationStats {
  /** 总规则数 */
  totalRules: number;
  /** 活跃上下文数 */
  activeContexts: number;
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
