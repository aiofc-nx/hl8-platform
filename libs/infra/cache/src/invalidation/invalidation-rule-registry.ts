/**
 * @fileoverview 失效规则注册表
 * @description 管理缓存失效规则的注册、查询和匹配
 */

import type { Logger } from "@hl8/logger";
import type {
  CacheInvalidationRule,
  GenericDomainEvent,
} from "./cache-invalidation-rule.interface.js";

/**
 * 失效规则注册表
 * @description 管理缓存失效规则的生命周期，支持规则注册、查询和事件匹配
 *
 * @example
 * ```typescript
 * const registry = new InvalidationRuleRegistry(logger);
 *
 * // 注册规则
 * registry.register({
 *   id: 'user-update-rule',
 *   eventType: 'UserUpdatedEvent',
 *   keyGenerator: (event) => [`repo:user:${event.data.userId}`],
 *   enabled: true,
 *   priority: 100
 * });
 *
 * // 匹配规则
 * const rules = registry.match(event);
 * ```
 */
export class InvalidationRuleRegistry {
  private readonly rules = new Map<string, CacheInvalidationRule>();
  private readonly eventTypeIndex = new Map<string, Set<string>>();
  private readonly logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * 注册失效规则
   * @description 注册一条缓存失效规则，支持通配符事件类型匹配
   *
   * @param rule 失效规则
   * @returns 是否注册成功
   *
   * @example
   * ```typescript
   * registry.register({
   *   id: 'rule-1',
   *   eventType: 'user.*',
   *   tags: ['entity:user'],
   *   enabled: true,
   *   priority: 100
   * });
   * ```
   */
  register(rule: CacheInvalidationRule): boolean {
    try {
      if (this.rules.has(rule.id)) {
        this.logger.warn("失效规则已存在，将被覆盖", {
          ruleId: rule.id,
          eventType: rule.eventType,
        });
      }

      this.rules.set(rule.id, rule);
      this.updateEventTypeIndex(rule);

      this.logger.debug("失效规则注册成功", {
        ruleId: rule.id,
        eventType: rule.eventType,
        priority: rule.priority,
        enabled: rule.enabled,
      });

      return true;
    } catch (error) {
      this.logger.error("失效规则注册失败", {
        ruleId: rule.id,
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * 批量注册失效规则
   * @param rules 失效规则列表
   */
  registerMany(rules: CacheInvalidationRule[]): void {
    for (const rule of rules) {
      this.register(rule);
    }

    this.logger.debug("批量注册失效规则完成", {
      count: rules.length,
    });
  }

  /**
   * 取消注册失效规则
   * @param ruleId 规则ID
   * @returns 是否取消注册成功
   */
  unregister(ruleId: string): boolean {
    const rule = this.rules.get(ruleId);
    if (!rule) {
      this.logger.warn("失效规则不存在", { ruleId });
      return false;
    }

    this.rules.delete(ruleId);
    this.removeFromEventTypeIndex(rule);

    this.logger.debug("失效规则已取消注册", {
      ruleId,
      eventType: rule.eventType,
    });

    return true;
  }

  /**
   * 获取所有规则
   * @returns 规则列表
   */
  getAllRules(): CacheInvalidationRule[] {
    return Array.from(this.rules.values());
  }

  /**
   * 获取启用的规则
   * @returns 启用的规则列表
   */
  getEnabledRules(): CacheInvalidationRule[] {
    return this.getAllRules().filter((rule) => rule.enabled);
  }

  /**
   * 获取指定规则
   * @param ruleId 规则ID
   * @returns 规则或 undefined
   */
  getRule(ruleId: string): CacheInvalidationRule | undefined {
    return this.rules.get(ruleId);
  }

  /**
   * 清空所有规则
   */
  clear(): void {
    const count = this.rules.size;
    this.rules.clear();
    this.eventTypeIndex.clear();

    this.logger.debug("所有失效规则已清空", {
      clearedCount: count,
    });
  }

  /**
   * 获取规则数量
   * @returns 规则数量
   */
  size(): number {
    return this.rules.size;
  }

  /**
   * 根据事件匹配规则
   * @description 返回所有匹配该事件的规则，按优先级排序
   *
   * @param event 领域事件
   * @returns 匹配的规则列表（已按优先级降序排序）
   */
  match(event: GenericDomainEvent): CacheInvalidationRule[] {
    const matchedRules: CacheInvalidationRule[] = [];

    for (const rule of this.rules.values()) {
      if (!rule.enabled) {
        continue;
      }

      // 检查事件类型匹配
      if (!this.matchesEventType(rule.eventType, event.eventType)) {
        continue;
      }

      // 检查附加条件
      if (rule.condition && !rule.condition(event)) {
        continue;
      }

      matchedRules.push(rule);
    }

    // 按优先级降序排序
    matchedRules.sort((a, b) => b.priority - a.priority);

    if (matchedRules.length > 0) {
      this.logger.debug("匹配到失效规则", {
        eventType: event.eventType,
        matchedCount: matchedRules.length,
        ruleIds: matchedRules.map((r) => r.id),
      });
    }

    return matchedRules;
  }

  /**
   * 检查事件类型是否匹配
   * @description 支持通配符匹配（如 "user.*" 匹配 "user.updated", "user.deleted" 等）
   *
   * @param pattern 匹配模式（支持 * 通配符）
   * @param eventType 事件类型
   * @returns 是否匹配
   *
   * @private
   */
  private matchesEventType(pattern: string, eventType: string): boolean {
    // 完全匹配
    if (pattern === eventType) {
      return true;
    }

    // 通配符匹配
    if (pattern.includes("*")) {
      const regexPattern = pattern.replace(/\./g, "\\.").replace(/\*/g, ".*");

      const regex = new RegExp(`^${regexPattern}$`);
      return regex.test(eventType);
    }

    return false;
  }

  /**
   * 更新事件类型索引
   * @description 维护事件类型到规则的映射，加速规则匹配
   *
   * @param rule 失效规则
   *
   * @private
   */
  private updateEventTypeIndex(rule: CacheInvalidationRule): void {
    const eventTypes = this.extractEventTypes(rule.eventType);

    for (const eventType of eventTypes) {
      if (!this.eventTypeIndex.has(eventType)) {
        this.eventTypeIndex.set(eventType, new Set());
      }

      this.eventTypeIndex.get(eventType)!.add(rule.id);
    }
  }

  /**
   * 从事件类型索引中移除规则
   *
   * @param rule 失效规则
   *
   * @private
   */
  private removeFromEventTypeIndex(rule: CacheInvalidationRule): void {
    const eventTypes = this.extractEventTypes(rule.eventType);

    for (const eventType of eventTypes) {
      const ruleIds = this.eventTypeIndex.get(eventType);
      if (ruleIds) {
        ruleIds.delete(rule.id);
        if (ruleIds.size === 0) {
          this.eventTypeIndex.delete(eventType);
        }
      }
    }
  }

  /**
   * 提取事件类型
   * @description 对于通配符模式，提取可能匹配的所有事件类型模式
   *
   * @param pattern 匹配模式
   * @returns 事件类型列表
   *
   * @private
   */
  private extractEventTypes(pattern: string): string[] {
    // 如果包含通配符，为每个通配符生成索引键
    if (pattern.includes("*")) {
      // 例如 "user.*" -> ["user."]
      // "*.created" -> [".created"]
      const parts = pattern.split("*");
      return parts.filter((p) => p.length > 0).map((p) => p.replace(/\./g, ""));
    }

    return [pattern];
  }
}
