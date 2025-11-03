/**
 * @fileoverview 事件驱动缓存失效
 * @description 基于领域事件的缓存失效机制，支持规则配置和自动失效
 */

import type { Logger } from "@hl8/logger";
import type { ICache } from "../cache.interface.js";
import type {
  CacheInvalidationRule,
  GenericDomainEvent,
  InvalidationResult,
} from "./cache-invalidation-rule.interface.js";
import { InvalidationRuleRegistry } from "./invalidation-rule-registry.js";

/**
 * 事件驱动缓存失效器
 * @description 基于领域事件自动失效缓存，支持灵活的策略配置
 *
 * @example
 * ```typescript
 * const invalidation = new EventDrivenCacheInvalidation(cache, logger);
 *
 * // 注册失效规则
 * invalidation.registerRule({
 *   id: 'user-update-rule',
 *   eventType: 'UserUpdatedEvent',
 *   keyGenerator: (event) => [`repo:user:${event.data.userId}`],
 *   enabled: true,
 *   priority: 100
 * });
 *
 * // 处理事件
 * await invalidation.handleEvent(event);
 * ```
 */
export class EventDrivenCacheInvalidation {
  private readonly cache: ICache;
  private readonly registry: InvalidationRuleRegistry;
  private readonly logger: Logger;

  constructor(cache: ICache, logger: Logger) {
    this.cache = cache;
    this.logger = logger;
    this.registry = new InvalidationRuleRegistry(logger);
  }

  /**
   * 注册失效规则
   * @param rule 失效规则
   * @returns 是否注册成功
   */
  registerRule(rule: CacheInvalidationRule): boolean {
    return this.registry.register(rule);
  }

  /**
   * 批量注册失效规则
   * @param rules 失效规则列表
   */
  registerRules(rules: CacheInvalidationRule[]): void {
    this.registry.registerMany(rules);
  }

  /**
   * 取消注册失效规则
   * @param ruleId 规则ID
   * @returns 是否取消注册成功
   */
  unregisterRule(ruleId: string): boolean {
    return this.registry.unregister(ruleId);
  }

  /**
   * 获取规则注册表
   * @returns 规则注册表
   */
  getRegistry(): InvalidationRuleRegistry {
    return this.registry;
  }

  /**
   * 处理领域事件
   * @description 根据注册的规则自动失效相关缓存
   *
   * @param event 领域事件
   * @returns 失效结果列表
   *
   * @example
   * ```typescript
   * const results = await invalidation.handleEvent({
   *   eventType: 'UserUpdatedEvent',
   *   data: { userId: '123' }
   * });
   * ```
   */
  async handleEvent(event: GenericDomainEvent): Promise<InvalidationResult[]> {
    const startTime = Date.now();

    try {
      this.logger.debug("处理事件驱动缓存失效", {
        eventType: event.eventType,
      });

      // 匹配规则
      const matchedRules = this.registry.match(event);

      if (matchedRules.length === 0) {
        this.logger.debug("未找到匹配的失效规则", {
          eventType: event.eventType,
        });
        return [];
      }

      // 执行失效
      const results: InvalidationResult[] = [];

      for (const rule of matchedRules) {
        const result = await this.executeInvalidation(rule, event, startTime);
        results.push(result);
      }

      this.logger.debug("事件驱动缓存失效完成", {
        eventType: event.eventType,
        rulesExecuted: results.length,
        totalKeysInvalidated: results.reduce(
          (sum, r) => sum + r.keysInvalidated,
          0,
        ),
      });

      return results;
    } catch (error) {
      this.logger.error("事件驱动缓存失效处理失败", {
        eventType: event.eventType,
        error: error instanceof Error ? error.message : String(error),
      });

      throw error;
    }
  }

  /**
   * 执行缓存失效
   * @description 根据规则执行具体的缓存失效操作
   *
   * @param rule 失效规则
   * @param event 领域事件
   * @param startTime 开始时间
   * @returns 失效结果
   *
   * @private
   */
  private async executeInvalidation(
    rule: CacheInvalidationRule,
    event: GenericDomainEvent,
    startTime: number,
  ): Promise<InvalidationResult> {
    const result: InvalidationResult = {
      ruleId: rule.id,
      success: true,
      keysInvalidated: 0,
      tagsInvalidated: 0,
      patternsMatched: 0,
      executionTime: 0,
    };

    try {
      // 失效指定键
      if (rule.keyGenerator) {
        const keys = rule.keyGenerator(event);

        if (keys.length > 0) {
          await this.cache.deleteMany(keys);
          result.keysInvalidated = keys.length;

          this.logger.debug("按键失效缓存", {
            ruleId: rule.id,
            keys,
          });
        }
      }

      // 失效标签
      if (rule.tags && rule.tags.length > 0) {
        await this.cache.invalidateByTags(rule.tags);
        result.tagsInvalidated = rule.tags.length;

        this.logger.debug("按标签失效缓存", {
          ruleId: rule.id,
          tags: rule.tags,
        });
      }

      // 失效模式
      if (rule.patterns && rule.patterns.length > 0) {
        for (const pattern of rule.patterns) {
          await this.cache.invalidateByPattern(pattern);
          result.patternsMatched++;
        }

        this.logger.debug("按模式失效缓存", {
          ruleId: rule.id,
          patterns: rule.patterns,
        });
      }

      result.executionTime = Date.now() - startTime;

      this.logger.debug("失效规则执行成功", {
        ruleId: rule.id,
        result,
      });
    } catch (error) {
      result.success = false;
      result.error = error instanceof Error ? error.message : String(error);
      result.executionTime = Date.now() - startTime;

      this.logger.error("失效规则执行失败", {
        ruleId: rule.id,
        error: result.error,
      });
    }

    return result;
  }

  /**
   * 批量处理事件
   * @param events 事件列表
   * @returns 失效结果列表
   */
  async handleEvents(
    events: GenericDomainEvent[],
  ): Promise<InvalidationResult[]> {
    const results: InvalidationResult[] = [];

    for (const event of events) {
      const eventResults = await this.handleEvent(event);
      results.push(...eventResults);
    }

    return results;
  }

  /**
   * 获取统计信息
   * @returns 统计信息
   */
  getStats(): {
    totalRules: number;
    enabledRules: number;
    disabledRules: number;
  } {
    const totalRules = this.registry.size();
    const enabledRules = this.registry.getEnabledRules().length;

    return {
      totalRules,
      enabledRules,
      disabledRules: totalRules - enabledRules,
    };
  }
}
