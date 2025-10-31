/**
 * @fileoverview Business Rule Validation Context - 业务规则验证上下文
 * @description 业务规则验证的上下文信息管理
 */

import { Entity } from "../entities/base/entity.base.js";
import { BusinessRuleSeverity } from "./business-rule-severity.enum.js";

/**
 * 业务规则验证上下文接口
 * @description 定义业务规则验证的上下文信息
 */
export interface IBusinessRuleValidationContext {
  /** 上下文ID */
  contextId: string;
  /** 验证开始时间 */
  startTime: Date;
  /** 验证结束时间 */
  endTime?: Date;
  /** 验证实体 */
  entity: Entity;
  /** 验证用户 */
  userId?: string;
  /** 验证会话ID */
  sessionId?: string;
  /** 验证原因 */
  reason?: string;
  /** 验证优先级 */
  priority: ValidationPriority;
  /** 验证模式 */
  mode: ValidationMode;
  /** 验证选项 */
  options: ValidationOptions;
  /** 自定义数据 */
  customData: Record<string, unknown>;
  /** 验证结果 */
  results: ValidationResult[];
  /** 验证统计信息 */
  statistics: ValidationStatistics;
}

/**
 * 验证优先级枚举
 * @description 定义验证的优先级
 */
export enum ValidationPriority {
  /** 低优先级 */
  LOW = "LOW",
  /** 普通优先级 */
  NORMAL = "NORMAL",
  /** 高优先级 */
  HIGH = "HIGH",
  /** 紧急优先级 */
  URGENT = "URGENT",
  /** 关键优先级 */
  CRITICAL = "CRITICAL",
}

/**
 * 验证模式枚举
 * @description 定义验证的模式
 */
export enum ValidationMode {
  /** 完整验证 - 验证所有规则 */
  FULL = "FULL",
  /** 快速验证 - 只验证关键规则 */
  QUICK = "QUICK",
  /** 增量验证 - 只验证变更的规则 */
  INCREMENTAL = "INCREMENTAL",
  /** 自定义验证 - 验证指定的规则 */
  CUSTOM = "CUSTOM",
}

/**
 * 验证选项接口
 * @description 定义验证的选项
 */
export interface ValidationOptions {
  /** 是否启用详细日志 */
  enableDetailedLogging: boolean;
  /** 是否启用性能监控 */
  enablePerformanceMonitoring: boolean;
  /** 是否启用缓存 */
  enableCaching: boolean;
  /** 是否启用并行验证 */
  enableParallelValidation: boolean;
  /** 最大验证时间（毫秒） */
  maxValidationTime: number;
  /** 最大违规数量 */
  maxViolationCount: number;
  /** 是否在第一个违规时停止 */
  stopOnFirstViolation: boolean;
  /** 是否包含警告级别违规 */
  includeWarnings: boolean;
  /** 是否包含信息级别违规 */
  includeInfo: boolean;
}

/**
 * 验证结果接口
 * @description 定义单个验证的结果
 */
export interface ValidationResult {
  /** 规则ID */
  ruleId: string;
  /** 规则名称 */
  ruleName: string;
  /** 验证是否通过 */
  isValid: boolean;
  /** 验证时间 */
  validationTime: number;
  /** 违规数量 */
  violationCount: number;
  /** 最严重违规级别 */
  mostSevereViolation: BusinessRuleSeverity;
  /** 验证消息 */
  message: string;
  /** 验证详情 */
  details: Record<string, unknown>;
}

/**
 * 验证统计信息接口
 * @description 定义验证的统计信息
 */
export interface ValidationStatistics {
  /** 总验证时间 */
  totalValidationTime: number;
  /** 验证的规则数量 */
  totalRulesValidated: number;
  /** 通过的规则数量 */
  passedRulesCount: number;
  /** 失败的规则数量 */
  failedRulesCount: number;
  /** 跳过的规则数量 */
  skippedRulesCount: number;
  /** 总违规数量 */
  totalViolations: number;
  /** 按严重性分组的违规数量 */
  violationsBySeverity: Record<string, number>;
  /** 平均规则验证时间 */
  averageRuleValidationTime: number;
  /** 最快规则验证时间 */
  fastestRuleValidationTime: number;
  /** 最慢规则验证时间 */
  slowestRuleValidationTime: number;
}

/**
 * 业务规则验证上下文构建器
 * @description 用于构建业务规则验证上下文
 */
export class BusinessRuleValidationContextBuilder {
  private context: Partial<IBusinessRuleValidationContext> = {
    contextId: `context_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    startTime: new Date(),
    priority: ValidationPriority.NORMAL,
    mode: ValidationMode.FULL,
    options: this.getDefaultOptions(),
    customData: {},
    results: [],
    statistics: this.getDefaultStatistics(),
  };

  /**
   * 设置实体
   * @param entity 实体
   * @returns 构建器实例
   */
  setEntity(entity: Entity): BusinessRuleValidationContextBuilder {
    this.context.entity = entity;
    return this;
  }

  /**
   * 设置用户ID
   * @param userId 用户ID
   * @returns 构建器实例
   */
  setUserId(userId: string): BusinessRuleValidationContextBuilder {
    this.context.userId = userId;
    return this;
  }

  /**
   * 设置会话ID
   * @param sessionId 会话ID
   * @returns 构建器实例
   */
  setSessionId(sessionId: string): BusinessRuleValidationContextBuilder {
    this.context.sessionId = sessionId;
    return this;
  }

  /**
   * 设置验证原因
   * @param reason 验证原因
   * @returns 构建器实例
   */
  setReason(reason: string): BusinessRuleValidationContextBuilder {
    this.context.reason = reason;
    return this;
  }

  /**
   * 设置验证优先级
   * @param priority 验证优先级
   * @returns 构建器实例
   */
  setPriority(
    priority: ValidationPriority,
  ): BusinessRuleValidationContextBuilder {
    this.context.priority = priority;
    return this;
  }

  /**
   * 设置验证模式
   * @param mode 验证模式
   * @returns 构建器实例
   */
  setMode(mode: ValidationMode): BusinessRuleValidationContextBuilder {
    this.context.mode = mode;
    return this;
  }

  /**
   * 设置验证选项
   * @param options 验证选项
   * @returns 构建器实例
   */
  setOptions(
    options: Partial<ValidationOptions>,
  ): BusinessRuleValidationContextBuilder {
    this.context.options = { ...this.context.options, ...options };
    return this;
  }

  /**
   * 添加自定义数据
   * @param key 键
   * @param value 值
   * @returns 构建器实例
   */
  addCustomData(
    key: string,
    value: unknown,
  ): BusinessRuleValidationContextBuilder {
    this.context.customData![key] = value;
    return this;
  }

  /**
   * 设置自定义数据
   * @param customData 自定义数据
   * @returns 构建器实例
   */
  setCustomData(
    customData: Record<string, unknown>,
  ): BusinessRuleValidationContextBuilder {
    this.context.customData = customData;
    return this;
  }

  /**
   * 构建验证上下文
   * @returns 验证上下文
   */
  build(): IBusinessRuleValidationContext {
    if (!this.context.entity) {
      throw new Error("Entity is required for validation context");
    }

    return this.context as IBusinessRuleValidationContext;
  }

  /**
   * 获取默认选项
   * @returns 默认选项
   */
  private getDefaultOptions(): ValidationOptions {
    return {
      enableDetailedLogging: false,
      enablePerformanceMonitoring: true,
      enableCaching: true,
      enableParallelValidation: false,
      maxValidationTime: 30000, // 30秒
      maxViolationCount: 100,
      stopOnFirstViolation: false,
      includeWarnings: true,
      includeInfo: false,
    };
  }

  /**
   * 获取默认统计信息
   * @returns 默认统计信息
   */
  private getDefaultStatistics(): ValidationStatistics {
    return {
      totalValidationTime: 0,
      totalRulesValidated: 0,
      passedRulesCount: 0,
      failedRulesCount: 0,
      skippedRulesCount: 0,
      totalViolations: 0,
      violationsBySeverity: {},
      averageRuleValidationTime: 0,
      fastestRuleValidationTime: 0,
      slowestRuleValidationTime: 0,
    };
  }
}

/**
 * 业务规则验证上下文管理器
 * @description 管理业务规则验证上下文
 */
export class BusinessRuleValidationContextManager {
  private contexts: Map<string, IBusinessRuleValidationContext> = new Map();
  private contextHistory: IBusinessRuleValidationContext[] = [];

  /**
   * 创建验证上下文
   * @param entity 实体
   * @param options 选项
   * @returns 验证上下文
   */
  createContext(
    entity: Entity,
    options?: Partial<ValidationOptions>,
  ): IBusinessRuleValidationContext {
    const builder = new BusinessRuleValidationContextBuilder().setEntity(
      entity,
    );

    if (options) {
      builder.setOptions(options);
    }

    const context = builder.build();
    this.contexts.set(context.contextId, context);
    return context;
  }

  /**
   * 获取验证上下文
   * @param contextId 上下文ID
   * @returns 验证上下文或undefined
   */
  getContext(contextId: string): IBusinessRuleValidationContext | undefined {
    return this.contexts.get(contextId);
  }

  /**
   * 更新验证上下文
   * @param contextId 上下文ID
   * @param updates 更新内容
   */
  updateContext(
    contextId: string,
    updates: Partial<IBusinessRuleValidationContext>,
  ): void {
    const context = this.contexts.get(contextId);
    if (context) {
      Object.assign(context, updates);
    }
  }

  /**
   * 完成验证上下文
   * @param contextId 上下文ID
   * @param results 验证结果
   * @param statistics 统计信息
   */
  completeContext(
    contextId: string,
    results: ValidationResult[],
    statistics: ValidationStatistics,
  ): void {
    const context = this.contexts.get(contextId);
    if (context) {
      context.endTime = new Date();
      context.results = results;
      context.statistics = statistics;

      // 移动到历史记录
      this.contextHistory.push(context);
      this.contexts.delete(contextId);
    }
  }

  /**
   * 获取上下文历史
   * @param limit 限制数量
   * @returns 上下文历史
   */
  getContextHistory(limit?: number): IBusinessRuleValidationContext[] {
    if (limit) {
      return this.contextHistory.slice(-limit);
    }
    return [...this.contextHistory];
  }

  /**
   * 清理过期的上下文
   * @param maxAge 最大年龄（毫秒）
   */
  cleanupExpiredContexts(maxAge: number = 24 * 60 * 60 * 1000): void {
    const now = Date.now();
    const expiredContexts: string[] = [];

    for (const [contextId, context] of this.contexts.entries()) {
      const age = now - context.startTime.getTime();
      if (age > maxAge) {
        expiredContexts.push(contextId);
      }
    }

    for (const contextId of expiredContexts) {
      this.contexts.delete(contextId);
    }
  }

  /**
   * 获取上下文统计信息
   * @returns 统计信息
   */
  getContextStatistics(): Record<string, unknown> {
    const activeContexts = this.contexts.size;
    const completedContexts = this.contextHistory.length;
    const totalContexts = activeContexts + completedContexts;

    return {
      activeContexts,
      completedContexts,
      totalContexts,
      averageValidationTime: this.calculateAverageValidationTime(),
      mostCommonValidationMode: this.getMostCommonValidationMode(),
      mostCommonValidationPriority: this.getMostCommonValidationPriority(),
    };
  }

  /**
   * 计算平均验证时间
   * @returns 平均验证时间
   */
  private calculateAverageValidationTime(): number {
    if (this.contextHistory.length === 0) {
      return 0;
    }

    const totalTime = this.contextHistory.reduce((sum, context) => {
      if (context.endTime) {
        return sum + (context.endTime.getTime() - context.startTime.getTime());
      }
      return sum;
    }, 0);

    return totalTime / this.contextHistory.length;
  }

  /**
   * 获取最常见的验证模式
   * @returns 最常见的验证模式
   */
  private getMostCommonValidationMode(): ValidationMode | undefined {
    const modeCounts = new Map<ValidationMode, number>();

    for (const context of this.contextHistory) {
      const count = modeCounts.get(context.mode) || 0;
      modeCounts.set(context.mode, count + 1);
    }

    let mostCommon: ValidationMode | undefined;
    let maxCount = 0;

    for (const [mode, count] of modeCounts.entries()) {
      if (count > maxCount) {
        mostCommon = mode;
        maxCount = count;
      }
    }

    return mostCommon;
  }

  /**
   * 获取最常见的验证优先级
   * @returns 最常见的验证优先级
   */
  private getMostCommonValidationPriority(): ValidationPriority | undefined {
    const priorityCounts = new Map<ValidationPriority, number>();

    for (const context of this.contextHistory) {
      const count = priorityCounts.get(context.priority) || 0;
      priorityCounts.set(context.priority, count + 1);
    }

    let mostCommon: ValidationPriority | undefined;
    let maxCount = 0;

    for (const [priority, count] of priorityCounts.entries()) {
      if (count > maxCount) {
        mostCommon = priority;
        maxCount = count;
      }
    }

    return mostCommon;
  }
}
