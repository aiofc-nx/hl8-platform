/**
 * @fileoverview Business Rule Execution Engine - 业务规则执行引擎
 * @description 业务规则的执行引擎实现
 */

import { BusinessRule } from "./business-rule.interface.js";
import { BusinessRuleValidationResult } from "./business-rule-validation-result.interface.js";
import { BusinessRuleViolation } from "./business-rule-violation.interface.js";
import {
  BusinessRuleSeverity,
  BusinessRuleSeverityUtils,
} from "./business-rule-severity.enum.js";
import { Entity } from "../entities/base/entity.base.js";
import { IBusinessRuleValidationContext } from "./business-rule-validation-context.js";

/**
 * 业务规则执行策略枚举
 * @description 定义业务规则执行的策略
 */
export enum BusinessRuleExecutionStrategy {
  /** 顺序执行 - 按顺序执行规则 */
  SEQUENTIAL = "SEQUENTIAL",
  /** 并行执行 - 并行执行规则 */
  PARALLEL = "PARALLEL",
  /** 优先级执行 - 按优先级执行规则 */
  PRIORITY = "PRIORITY",
  /** 依赖执行 - 按依赖关系执行规则 */
  DEPENDENCY = "DEPENDENCY",
  /** 混合执行 - 结合多种策略 */
  HYBRID = "HYBRID",
}

/**
 * 业务规则执行配置接口
 * @description 定义业务规则执行的配置
 */
export interface BusinessRuleExecutionConfig {
  /** 执行策略 */
  strategy: BusinessRuleExecutionStrategy;
  /** 最大并发数 */
  maxConcurrency: number;
  /** 超时时间（毫秒） */
  timeout: number;
  /** 重试次数 */
  retryCount: number;
  /** 重试延迟（毫秒） */
  retryDelay: number;
  /** 是否启用缓存 */
  enableCaching: boolean;
  /** 是否启用性能监控 */
  enablePerformanceMonitoring: boolean;
  /** 是否启用详细日志 */
  enableDetailedLogging: boolean;
}

/**
 * 业务规则执行结果接口
 * @description 定义业务规则执行的结果
 */
export interface BusinessRuleExecutionResult {
  /** 执行是否成功 */
  success: boolean;
  /** 执行时间 */
  executionTime: number;
  /** 执行的规则数量 */
  rulesExecuted: number;
  /** 跳过的规则数量 */
  rulesSkipped: number;
  /** 失败的规则数量 */
  rulesFailed: number;
  /** 验证结果 */
  validationResult: BusinessRuleValidationResult;
  /** 执行统计信息 */
  statistics: ExecutionStatistics;
  /** 错误信息 */
  errors: string[];
}

/**
 * 执行统计信息接口
 * @description 定义执行的统计信息
 */
export interface ExecutionStatistics {
  /** 总执行时间 */
  totalExecutionTime: number;
  /** 平均规则执行时间 */
  averageRuleExecutionTime: number;
  /** 最快规则执行时间 */
  fastestRuleExecutionTime: number;
  /** 最慢规则执行时间 */
  slowestRuleExecutionTime: number;
  /** 并行执行时间 */
  parallelExecutionTime: number;
  /** 顺序执行时间 */
  sequentialExecutionTime: number;
  /** 缓存命中率 */
  cacheHitRate: number;
  /** 重试次数 */
  retryCount: number;
  /** 超时次数 */
  timeoutCount: number;
}

/**
 * 业务规则执行引擎类
 * @description 实现业务规则的执行引擎
 * @template T 实体类型
 */
export class BusinessRuleExecutionEngine<T extends Entity> {
  private config: BusinessRuleExecutionConfig;
  private ruleCache: Map<string, BusinessRuleValidationResult> = new Map();
  private executionHistory: BusinessRuleExecutionResult[] = [];

  constructor(config?: Partial<BusinessRuleExecutionConfig>) {
    this.config = {
      strategy: BusinessRuleExecutionStrategy.SEQUENTIAL,
      maxConcurrency: 4,
      timeout: 30000,
      retryCount: 3,
      retryDelay: 1000,
      enableCaching: true,
      enablePerformanceMonitoring: true,
      enableDetailedLogging: false,
      ...config,
    };
  }

  /**
   * 执行业务规则
   * @param rules 业务规则列表
   * @param entity 实体
   * @param context 验证上下文
   * @returns 执行结果
   */
  async executeRules(
    rules: BusinessRule<T>[],
    entity: T,
    context: IBusinessRuleValidationContext,
  ): Promise<BusinessRuleExecutionResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    let rulesExecuted = 0;
    let rulesSkipped = 0;
    let rulesFailed = 0;

    try {
      // 根据策略执行规则
      const executionResult = await this.executeRulesByStrategy(
        rules,
        entity,
        context,
      );
      rulesExecuted = executionResult.rulesExecuted;
      rulesSkipped = executionResult.rulesSkipped;
      rulesFailed = executionResult.rulesFailed;

      const endTime = Date.now();
      const executionTime = endTime - startTime;

      // 检查是否有执行失败或错误违规
      // 注意：业务规则违规（violations）不代表执行失败，只有当规则执行抛出异常时才认为失败
      const hasErrorViolations =
        executionResult.validationResult.violations.some(
          (v) => v.severity === BusinessRuleSeverity.ERROR,
        );

      // 收集所有错误消息（只有规则执行失败时才添加）
      const allErrors: string[] = [...errors];
      if (rulesFailed > 0 && hasErrorViolations) {
        // 只添加执行失败的错误违规（RULE_EXECUTION_ERROR），而不是业务违规
        const executionErrors = executionResult.validationResult.violations
          .filter(
            (v) =>
              v.severity === BusinessRuleSeverity.ERROR &&
              (v as unknown as { code?: string }).code ===
                "RULE_EXECUTION_ERROR",
          )
          .map((v) => v.message);
        allErrors.push(...executionErrors);
      }

      // success 表示规则执行是否成功（没有抛出异常），而不是验证是否通过
      // 即使有业务违规，只要规则执行没有异常，success 就是 true
      const result: BusinessRuleExecutionResult = {
        success: rulesFailed === 0,
        executionTime,
        rulesExecuted,
        rulesSkipped,
        rulesFailed,
        validationResult: executionResult.validationResult,
        statistics: this.calculateStatistics(executionResult),
        errors: allErrors,
      };

      this.executionHistory.push(result);
      return result;
    } catch (error) {
      const endTime = Date.now();
      const executionTime = endTime - startTime;

      const result: BusinessRuleExecutionResult = {
        success: false,
        executionTime,
        rulesExecuted,
        rulesSkipped,
        rulesFailed,
        validationResult: this.createEmptyValidationResult(),
        statistics: this.getDefaultStatistics(),
        errors: [error instanceof Error ? error.message : String(error)],
      };

      this.executionHistory.push(result);
      return result;
    }
  }

  /**
   * 根据策略执行规则
   * @param rules 业务规则列表
   * @param entity 实体
   * @param context 验证上下文
   * @returns 执行结果
   */
  private async executeRulesByStrategy(
    rules: BusinessRule<T>[],
    entity: T,
    context: IBusinessRuleValidationContext,
  ): Promise<{
    rulesExecuted: number;
    rulesSkipped: number;
    rulesFailed: number;
    validationResult: BusinessRuleValidationResult;
  }> {
    switch (this.config.strategy) {
      case BusinessRuleExecutionStrategy.SEQUENTIAL:
        return this.executeSequentially(rules, entity, context);
      case BusinessRuleExecutionStrategy.PARALLEL:
        return this.executeInParallel(rules, entity, context);
      case BusinessRuleExecutionStrategy.PRIORITY:
        return this.executeByPriority(rules, entity, context);
      case BusinessRuleExecutionStrategy.DEPENDENCY:
        return this.executeByDependency(rules, entity, context);
      case BusinessRuleExecutionStrategy.HYBRID:
        return this.executeHybrid(rules, entity, context);
      default:
        throw new Error(
          `Unsupported execution strategy: ${this.config.strategy}`,
        );
    }
  }

  /**
   * 顺序执行规则
   * @param rules 业务规则列表
   * @param entity 实体
   * @param context 验证上下文
   * @returns 执行结果
   */
  private async executeSequentially(
    rules: BusinessRule<T>[],
    entity: T,
    context: IBusinessRuleValidationContext,
  ): Promise<{
    rulesExecuted: number;
    rulesSkipped: number;
    rulesFailed: number;
    validationResult: BusinessRuleValidationResult;
  }> {
    const violations: BusinessRuleViolation[] = [];
    const executedRules: string[] = [];
    const skippedRules: string[] = [];
    let rulesExecuted = 0;
    let rulesSkipped = 0;
    let rulesFailed = 0;

    for (const rule of rules) {
      if (!rule.enabled) {
        skippedRules.push(rule.name);
        rulesSkipped++;
        continue;
      }

      try {
        const result = await this.executeRuleWithRetry(rule, entity, context);
        if (result.isValid) {
          executedRules.push(rule.name);
          rulesExecuted++;
        } else {
          violations.push(...result.violations);
          executedRules.push(rule.name);
          rulesExecuted++;
        }
      } catch (error) {
        rulesFailed++;
        // 创建错误违规
        const errorViolation = {
          message: `Rule execution failed: ${error instanceof Error ? error.message : "Unknown error"}`,
          code: "RULE_EXECUTION_ERROR",
          ruleName: rule.name,
          severity: BusinessRuleSeverity.ERROR,
          entityId: entity.id.toString(),
          timestamp: new Date(),
          details: {
            error: error instanceof Error ? error.stack : String(error),
          },
        } as unknown as BusinessRuleViolation;
        violations.push(errorViolation);
        executedRules.push(rule.name);
        rulesExecuted++;
      }
    }

    return {
      rulesExecuted,
      rulesSkipped,
      rulesFailed,
      validationResult: {
        isValid: violations.length === 0,
        entityType: entity.constructor.name,
        entityId: entity.id.toString(),
        violations,
        warnings: [],
        info: [],
        rulesExecuted: executedRules.length,
        entitiesValidated: 1,
        context: {
          startTime: Date.now(),
          endTime: Date.now(),
          validatedEntities: [entity.id.toString()],
          executedRules,
          operationType: "VALIDATION",
        },
        executionTime: 0, // 将在上层计算
      } as unknown as BusinessRuleValidationResult,
    };
  }

  /**
   * 并行执行规则
   * @param rules 业务规则列表
   * @param entity 实体
   * @param context 验证上下文
   * @returns 执行结果
   */
  private async executeInParallel(
    rules: BusinessRule<T>[],
    entity: T,
    context: IBusinessRuleValidationContext,
  ): Promise<{
    rulesExecuted: number;
    rulesSkipped: number;
    rulesFailed: number;
    validationResult: BusinessRuleValidationResult;
  }> {
    const enabledRules = rules.filter((rule) => rule.enabled);
    const skippedRules = rules
      .filter((rule) => !rule.enabled)
      .map((rule) => rule.name);

    // 限制并发数
    const chunks = this.chunkArray(enabledRules, this.config.maxConcurrency);
    const violations: BusinessRuleViolation[] = [];
    const executedRules: string[] = [];
    let rulesExecuted = 0;
    const rulesSkipped = skippedRules.length;
    let rulesFailed = 0;

    for (const chunk of chunks) {
      const promises = chunk.map((rule) =>
        this.executeRuleWithRetry(rule, entity, context),
      );
      const results = await Promise.allSettled(promises);

      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        const rule = chunk[i];

        if (result.status === "fulfilled") {
          if (result.value.isValid) {
            executedRules.push(rule.name);
            rulesExecuted++;
          } else {
            violations.push(...result.value.violations);
            executedRules.push(rule.name);
            rulesExecuted++;
          }
        } else {
          rulesFailed++;
          // 创建错误违规
          const errorViolation = {
            message: `Rule execution failed: ${result.reason}`,
            code: "RULE_EXECUTION_ERROR",
            ruleName: rule.name,
            severity: BusinessRuleSeverity.ERROR,
            entityId: entity.id.toString(),
            timestamp: new Date(),
            details: { error: result.reason },
          } as unknown as BusinessRuleViolation;
          violations.push(errorViolation);
          executedRules.push(rule.name);
          rulesExecuted++;
        }
      }
    }

    return {
      rulesExecuted,
      rulesSkipped,
      rulesFailed,
      validationResult: {
        isValid: violations.length === 0,
        entityType: entity.constructor.name,
        entityId: entity.id.toString(),
        violations,
        warnings: [],
        info: [],
        rulesExecuted: executedRules.length,
        entitiesValidated: 1,
        context: {
          startTime: Date.now(),
          endTime: Date.now(),
          validatedEntities: [entity.id.toString()],
          executedRules,
          operationType: "VALIDATION",
        },
        executionTime: 0, // 将在上层计算
      } as unknown as BusinessRuleValidationResult,
    };
  }

  /**
   * 按优先级执行规则
   * @param rules 业务规则列表
   * @param entity 实体
   * @param context 验证上下文
   * @returns 执行结果
   */
  private async executeByPriority(
    rules: BusinessRule<T>[],
    entity: T,
    context: IBusinessRuleValidationContext,
  ): Promise<{
    rulesExecuted: number;
    rulesSkipped: number;
    rulesFailed: number;
    validationResult: BusinessRuleValidationResult;
  }> {
    // 按严重性排序规则（严重性越高，优先级越高）
    const sortedRules = [...rules].sort((a, b) => {
      const severityA = a.severity;
      const severityB = b.severity;
      return BusinessRuleSeverityUtils.compare(
        severityB as BusinessRuleSeverity,
        severityA as BusinessRuleSeverity,
      );
    });

    return this.executeSequentially(sortedRules, entity, context);
  }

  /**
   * 按依赖关系执行规则
   * @param rules 业务规则列表
   * @param entity 实体
   * @param context 验证上下文
   * @returns 执行结果
   */
  private async executeByDependency(
    rules: BusinessRule<T>[],
    entity: T,
    _context: IBusinessRuleValidationContext,
  ): Promise<{
    rulesExecuted: number;
    rulesSkipped: number;
    rulesFailed: number;
    validationResult: BusinessRuleValidationResult;
  }> {
    // 这里简化实现，实际应用中需要更复杂的依赖关系处理
    return this.executeSequentially(rules, entity, _context);
  }

  /**
   * 混合执行规则
   * @param rules 业务规则列表
   * @param entity 实体
   * @param context 验证上下文
   * @returns 执行结果
   */
  private async executeHybrid(
    rules: BusinessRule<T>[],
    entity: T,
    _context: IBusinessRuleValidationContext,
  ): Promise<{
    rulesExecuted: number;
    rulesSkipped: number;
    rulesFailed: number;
    validationResult: BusinessRuleValidationResult;
  }> {
    // 混合策略：关键规则顺序执行，其他规则并行执行
    const criticalRules = rules.filter((rule) =>
      BusinessRuleSeverityUtils.requiresImmediateAction(
        rule.severity as BusinessRuleSeverity,
      ),
    );
    const normalRules = rules.filter(
      (rule) =>
        !BusinessRuleSeverityUtils.requiresImmediateAction(
          rule.severity as BusinessRuleSeverity,
        ),
    );

    // 先执行关键规则
    const criticalResult = await this.executeSequentially(
      criticalRules,
      entity,
      _context,
    );

    // 如果关键规则有严重违规，停止执行
    if (criticalResult.validationResult.violations.length > 0) {
      return criticalResult;
    }

    // 执行普通规则
    const normalResult = await this.executeInParallel(
      normalRules,
      entity,
      _context,
    );

    // 合并结果
    return {
      rulesExecuted: criticalResult.rulesExecuted + normalResult.rulesExecuted,
      rulesSkipped: criticalResult.rulesSkipped + normalResult.rulesSkipped,
      rulesFailed: criticalResult.rulesFailed + normalResult.rulesFailed,
      validationResult: {
        isValid:
          criticalResult.validationResult.isValid &&
          normalResult.validationResult.isValid,
        entityType: entity.constructor.name,
        entityId: entity.id.toString(),
        violations: [
          ...criticalResult.validationResult.violations,
          ...normalResult.validationResult.violations,
        ],
        warnings: [
          ...criticalResult.validationResult.warnings,
          ...normalResult.validationResult.warnings,
        ],
        info: [
          ...criticalResult.validationResult.info,
          ...normalResult.validationResult.info,
        ],
        executionTime:
          criticalResult.validationResult.executionTime +
          normalResult.validationResult.executionTime,
        rulesExecuted:
          criticalResult.rulesExecuted + normalResult.rulesExecuted,
        entitiesValidated: 1,
        context: {
          startTime: Date.now(),
          endTime: Date.now(),
          validatedEntities: [entity.id.toString()],
          executedRules: [
            ...(criticalResult.validationResult.context?.executedRules || []),
            ...(normalResult.validationResult.context?.executedRules || []),
          ],
          operationType: "VALIDATION",
        },
      } as unknown as BusinessRuleValidationResult,
    };
  }

  /**
   * 执行规则并重试
   * @param rule 业务规则
   * @param entity 实体
   * @param context 验证上下文
   * @returns 验证结果
   */
  private async executeRuleWithRetry(
    rule: BusinessRule<T>,
    entity: T,
    context: IBusinessRuleValidationContext,
  ): Promise<BusinessRuleValidationResult> {
    // 检查缓存
    if (this.config.enableCaching) {
      const cacheKey = this.generateCacheKey(rule, entity);
      const cachedResult = this.ruleCache.get(cacheKey);
      if (cachedResult) {
        return cachedResult;
      }
    }

    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= this.config.retryCount; attempt++) {
      try {
        const result = await this.executeRuleWithTimeout(rule, entity, context);

        // 缓存结果
        if (this.config.enableCaching) {
          const cacheKey = this.generateCacheKey(rule, entity);
          this.ruleCache.set(cacheKey, result);
        }

        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt < this.config.retryCount) {
          await this.delay(this.config.retryDelay);
        }
      }
    }

    throw lastError || new Error("Rule execution failed after retries");
  }

  /**
   * 执行规则并设置超时
   * @param rule 业务规则
   * @param entity 实体
   * @param context 验证上下文
   * @returns 验证结果
   */
  private async executeRuleWithTimeout(
    rule: BusinessRule<T>,
    entity: T,
    _context: IBusinessRuleValidationContext,
  ): Promise<BusinessRuleValidationResult> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Rule execution timeout: ${rule.name}`));
      }, this.config.timeout);

      try {
        const result = rule.validate(entity);
        clearTimeout(timeout);
        resolve(result);
      } catch (error) {
        clearTimeout(timeout);
        reject(error);
      }
    });
  }

  /**
   * 生成缓存键
   * @param rule 业务规则
   * @param entity 实体
   * @returns 缓存键
   */
  private generateCacheKey(rule: BusinessRule<T>, entity: T): string {
    return `${rule.name}_${entity.id.toString()}_${entity.version}`;
  }

  /**
   * 延迟执行
   * @param ms 延迟时间（毫秒）
   * @returns Promise
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * 将数组分块
   * @param array 数组
   * @param chunkSize 块大小
   * @returns 分块后的数组
   */
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  /**
   * 获取最严重的违规
   * @param violations 违规列表
   * @returns 最严重的违规或undefined
   */
  private getMostSevereViolation(
    violations: BusinessRuleViolation[],
  ): BusinessRuleViolation | undefined {
    if (violations.length === 0) {
      return undefined;
    }

    return violations.reduce((mostSevere, current) => {
      const currentSeverity = BusinessRuleSeverityUtils.compare(
        current.severity,
        mostSevere.severity,
      );
      return currentSeverity > 0 ? current : mostSevere;
    });
  }

  /**
   * 创建执行摘要
   * @param violations 违规列表
   * @param executedRules 已执行的规则列表
   * @param skippedRules 跳过的规则列表
   * @returns 执行摘要
   */
  private createExecutionSummary(
    violations: BusinessRuleViolation[],
    executedRules: string[],
    skippedRules: string[],
  ): Record<string, unknown> {
    return {
      totalViolations: violations.length,
      totalRulesExecuted: executedRules.length,
      totalRulesSkipped: skippedRules.length,
      executionStrategy: this.config.strategy,
      maxConcurrency: this.config.maxConcurrency,
      timeout: this.config.timeout,
      retryCount: this.config.retryCount,
    };
  }

  /**
   * 计算统计信息
   * @param executionResult 执行结果
   * @returns 统计信息
   */
  private calculateStatistics(_executionResult: unknown): ExecutionStatistics {
    // 这里简化实现，实际应用中需要更复杂的统计计算
    return this.getDefaultStatistics();
  }

  /**
   * 获取默认统计信息
   * @returns 默认统计信息
   */
  private getDefaultStatistics(): ExecutionStatistics {
    return {
      totalExecutionTime: 0,
      averageRuleExecutionTime: 0,
      fastestRuleExecutionTime: 0,
      slowestRuleExecutionTime: 0,
      parallelExecutionTime: 0,
      sequentialExecutionTime: 0,
      cacheHitRate: 0,
      retryCount: 0,
      timeoutCount: 0,
    };
  }

  /**
   * 创建空的验证结果
   * @returns 空的验证结果
   */
  private createEmptyValidationResult(): BusinessRuleValidationResult {
    return {
      isValid: true,
      entityType: "Unknown",
      entityId: "unknown",
      violations: [],
      warnings: [],
      info: [],
      executionTime: 0,
      rulesExecuted: 0,
      entitiesValidated: 0,
    } as unknown as BusinessRuleValidationResult;
  }

  /**
   * 获取执行历史
   * @param limit 限制数量
   * @returns 执行历史
   */
  getExecutionHistory(limit?: number): BusinessRuleExecutionResult[] {
    if (limit) {
      return this.executionHistory.slice(-limit);
    }
    return [...this.executionHistory];
  }

  /**
   * 清空缓存
   */
  clearCache(): void {
    this.ruleCache.clear();
  }

  /**
   * 获取引擎统计信息
   * @returns 引擎统计信息
   */
  getEngineStatistics(): Record<string, unknown> {
    return {
      totalExecutions: this.executionHistory.length,
      successfulExecutions: this.executionHistory.filter((r) => r.success)
        .length,
      failedExecutions: this.executionHistory.filter((r) => !r.success).length,
      averageExecutionTime: this.calculateAverageExecutionTime(),
      cacheSize: this.ruleCache.size,
      config: this.config,
    };
  }

  /**
   * 计算平均执行时间
   * @returns 平均执行时间
   */
  private calculateAverageExecutionTime(): number {
    if (this.executionHistory.length === 0) {
      return 0;
    }

    const totalTime = this.executionHistory.reduce(
      (sum, result) => sum + result.executionTime,
      0,
    );
    return totalTime / this.executionHistory.length;
  }
}
