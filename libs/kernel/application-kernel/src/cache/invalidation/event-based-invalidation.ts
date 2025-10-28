/**
 * @fileoverview 事件驱动缓存失效
 * @description 基于领域事件的缓存失效机制，支持自动和手动失效
 */

import type { Logger } from "@hl8/logger";
import type { DomainEvent } from "../../events/types/domain-event.js";
import type { ICache, CacheInvalidationEvent } from "../cache.interface.js";
import { CacheInvalidationStrategy } from "../cache.interface.js";

/**
 * 缓存失效规则接口
 * @description 定义缓存失效的规则配置
 */
export interface CacheInvalidationRule {
  /** 规则ID */
  id: string;
  /** 事件类型 */
  eventType: string;
  /** 失效策略 */
  strategy: CacheInvalidationStrategy;
  /** 键模式 */
  keyPattern?: string;
  /** 标签列表 */
  tags?: string[];
  /** 条件函数 */
  condition?: (event: DomainEvent) => boolean;
  /** 键生成函数 */
  keyGenerator?: (event: DomainEvent) => string[];
  /** 是否启用 */
  enabled: boolean;
  /** 优先级 */
  priority: number;
}

/**
 * 事件驱动缓存失效器
 * @description 基于领域事件的缓存失效实现
 */
export class EventBasedCacheInvalidation {
  private readonly rules = new Map<string, CacheInvalidationRule>();
  private readonly eventTypeIndex = new Map<string, Set<string>>();
  private readonly logger: Logger;
  private readonly cache: ICache;

  constructor(cache: ICache, logger: Logger) {
    this.cache = cache;
    this.logger = logger;
  }

  /**
   * 添加失效规则
   * @param rule 失效规则
   * @returns 添加结果
   */
  addRule(rule: CacheInvalidationRule): boolean {
    try {
      this.rules.set(rule.id, rule);
      this.updateEventTypeIndex(rule);

      this.logger.debug("添加缓存失效规则", {
        ruleId: rule.id,
        eventType: rule.eventType,
        strategy: rule.strategy,
      });

      return true;
    } catch (error) {
      this.logger.error("添加缓存失效规则失败", {
        ruleId: rule.id,
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * 移除失效规则
   * @param ruleId 规则ID
   * @returns 移除结果
   */
  removeRule(ruleId: string): boolean {
    const rule = this.rules.get(ruleId);
    if (!rule) {
      return false;
    }

    this.rules.delete(ruleId);
    this.removeFromEventTypeIndex(rule);

    this.logger.debug("移除缓存失效规则", { ruleId });
    return true;
  }

  /**
   * 更新失效规则
   * @param rule 失效规则
   * @returns 更新结果
   */
  updateRule(rule: CacheInvalidationRule): boolean {
    const existingRule = this.rules.get(rule.id);
    if (!existingRule) {
      return false;
    }

    // 移除旧规则
    this.removeFromEventTypeIndex(existingRule);

    // 添加新规则
    this.rules.set(rule.id, rule);
    this.updateEventTypeIndex(rule);

    this.logger.debug("更新缓存失效规则", {
      ruleId: rule.id,
      eventType: rule.eventType,
      strategy: rule.strategy,
    });

    return true;
  }

  /**
   * 获取失效规则
   * @param ruleId 规则ID
   * @returns 失效规则
   */
  getRule(ruleId: string): CacheInvalidationRule | undefined {
    return this.rules.get(ruleId);
  }

  /**
   * 获取所有失效规则
   * @returns 失效规则列表
   */
  getAllRules(): CacheInvalidationRule[] {
    return Array.from(this.rules.values());
  }

  /**
   * 根据事件类型获取失效规则
   * @param eventType 事件类型
   * @returns 失效规则列表
   */
  getRulesByEventType(eventType: string): CacheInvalidationRule[] {
    const ruleIds = this.eventTypeIndex.get(eventType);
    if (!ruleIds) {
      return [];
    }

    return Array.from(ruleIds)
      .map((ruleId) => this.rules.get(ruleId))
      .filter((rule): rule is CacheInvalidationRule => rule !== undefined)
      .sort((a, b) => b.priority - a.priority);
  }

  /**
   * 处理领域事件
   * @param event 领域事件
   * @returns 处理结果
   */
  async handleDomainEvent(event: DomainEvent): Promise<boolean> {
    try {
      const rules = this.getRulesByEventType(event.eventType);
      if (rules.length === 0) {
        this.logger.debug("没有找到匹配的缓存失效规则", {
          eventType: event.eventType,
        });
        return true;
      }

      const invalidationPromises = rules
        .filter((rule) => rule.enabled)
        .map((rule) => this.processRule(rule, event));

      const results = await Promise.all(invalidationPromises);
      const successCount = results.filter((result) => result).length;

      this.logger.debug("处理领域事件完成", {
        eventType: event.eventType,
        totalRules: rules.length,
        successCount,
      });

      return successCount > 0;
    } catch (error) {
      this.logger.error("处理领域事件失败", {
        eventType: event.eventType,
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * 手动失效缓存
   * @param keys 缓存键列表
   * @param tags 标签列表
   * @param pattern 键模式
   * @param strategy 失效策略
   * @returns 失效结果
   */
  async manualInvalidation(
    keys: string[] = [],
    tags: string[] = [],
    pattern?: string,
    strategy: CacheInvalidationStrategy = CacheInvalidationStrategy.MANUAL,
  ): Promise<boolean> {
    try {
      let result = true;

      // 根据键失效
      if (keys.length > 0) {
        const deleteResult = await this.cache.deleteMany(keys);
        result = result && deleteResult;
      }

      // 根据标签失效
      if (tags.length > 0) {
        const tagResult = await this.cache.invalidateByTags(tags);
        result = result && tagResult;
      }

      // 根据模式失效
      if (pattern) {
        const patternResult = await this.cache.invalidateByPattern(pattern);
        result = result && patternResult;
      }

      // 发送失效事件
      await this.emitInvalidationEvent({
        type: "manual_invalidation",
        keys,
        tags,
        pattern,
        strategy,
        timestamp: new Date(),
        metadata: {},
      });

      this.logger.debug("手动失效缓存完成", {
        keys: keys.length,
        tags: tags.length,
        pattern,
        strategy,
      });

      return result;
    } catch (error) {
      this.logger.error("手动失效缓存失败", {
        keys,
        tags,
        pattern,
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * 清空所有失效规则
   * @returns 清空结果
   */
  clearRules(): boolean {
    this.rules.clear();
    this.eventTypeIndex.clear();

    this.logger.debug("清空所有缓存失效规则");
    return true;
  }

  /**
   * 获取失效规则统计信息
   * @returns 统计信息
   */
  getStats(): {
    totalRules: number;
    enabledRules: number;
    eventTypes: number;
    rulesByEventType: Record<string, number>;
  } {
    const enabledRules = Array.from(this.rules.values()).filter(
      (rule) => rule.enabled,
    ).length;

    const rulesByEventType: Record<string, number> = {};
    for (const [eventType, ruleIds] of this.eventTypeIndex.entries()) {
      rulesByEventType[eventType] = ruleIds.size;
    }

    return {
      totalRules: this.rules.size,
      enabledRules,
      eventTypes: this.eventTypeIndex.size,
      rulesByEventType,
    };
  }

  // 私有方法

  /**
   * 处理失效规则
   * @param rule 失效规则
   * @param event 领域事件
   * @returns 处理结果
   */
  private async processRule(
    rule: CacheInvalidationRule,
    event: DomainEvent,
  ): Promise<boolean> {
    try {
      // 检查条件
      if (rule.condition && !rule.condition(event)) {
        this.logger.debug("规则条件不满足", {
          ruleId: rule.id,
          eventType: event.eventType,
        });
        return true;
      }

      let result = true;

      switch (rule.strategy) {
        case CacheInvalidationStrategy.TAG_BASED:
          if (rule.tags && rule.tags.length > 0) {
            result = await this.cache.invalidateByTags(rule.tags);
          }
          break;

        case CacheInvalidationStrategy.PATTERN_BASED:
          if (rule.keyPattern) {
            result = await this.cache.invalidateByPattern(rule.keyPattern);
          }
          break;

        case CacheInvalidationStrategy.EVENT_BASED:
          if (rule.keyGenerator) {
            const keys = rule.keyGenerator(event);
            if (keys.length > 0) {
              result = await this.cache.deleteMany(keys);
            }
          }
          break;

        case CacheInvalidationStrategy.MANUAL:
          // 手动策略不自动处理
          result = true;
          break;

        default:
          this.logger.warn("未知的失效策略", {
            ruleId: rule.id,
            strategy: rule.strategy,
          });
          result = false;
      }

      if (result) {
        this.logger.debug("规则处理成功", {
          ruleId: rule.id,
          eventType: event.eventType,
          strategy: rule.strategy,
        });
      } else {
        this.logger.warn("规则处理失败", {
          ruleId: rule.id,
          eventType: event.eventType,
          strategy: rule.strategy,
        });
      }

      return result;
    } catch (error) {
      this.logger.error("处理失效规则失败", {
        ruleId: rule.id,
        eventType: event.eventType,
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * 更新事件类型索引
   * @param rule 失效规则
   */
  private updateEventTypeIndex(rule: CacheInvalidationRule): void {
    if (!this.eventTypeIndex.has(rule.eventType)) {
      this.eventTypeIndex.set(rule.eventType, new Set());
    }
    this.eventTypeIndex.get(rule.eventType)!.add(rule.id);
  }

  /**
   * 从事件类型索引中移除
   * @param rule 失效规则
   */
  private removeFromEventTypeIndex(rule: CacheInvalidationRule): void {
    const ruleIds = this.eventTypeIndex.get(rule.eventType);
    if (ruleIds) {
      ruleIds.delete(rule.id);
      if (ruleIds.size === 0) {
        this.eventTypeIndex.delete(rule.eventType);
      }
    }
  }

  /**
   * 发送失效事件
   * @param event 失效事件
   */
  private async emitInvalidationEvent(
    event: CacheInvalidationEvent,
  ): Promise<void> {
    // 这里可以集成事件总线来发送失效事件
    this.logger.debug("发送缓存失效事件", {
      type: event.type,
      keys: event.keys.length,
      tags: event.tags.length,
      strategy: event.strategy,
    });
  }
}
