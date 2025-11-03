/**
 * @fileoverview 缓存失效规则接口
 * @description 定义缓存失效规则的配置和匹配逻辑
 */

/**
 * 缓存失效规则
 * @description 定义何时以及如何失效缓存
 *
 * @example
 * ```typescript
 * const rule: CacheInvalidationRule = {
 *   id: 'user-update-rule',
 *   eventType: 'UserUpdatedEvent',
 *   keyGenerator: (event) => [`repo:user:${event.data.userId}`],
 *   tags: ['entity:user'],
 *   condition: (event) => event.data.requiresCacheInvalidation === true,
 *   enabled: true,
 *   priority: 100
 * };
 * ```
 */
export interface CacheInvalidationRule {
  /** 规则唯一标识符 */
  id: string;

  /** 匹配的事件类型（支持通配符，如 "user.*"） */
  eventType: string;

  /**
   * 生成需要失效的缓存键列表
   * @param event 领域事件
   * @returns 缓存键列表
   */
  keyGenerator?: (event: GenericDomainEvent) => string[];

  /**
   * 需要失效的标签列表
   * @description 使用标签批量失效相关缓存
   */
  tags?: string[];

  /**
   * 匹配模式
   * @description 使用 glob 模式匹配缓存键（如 "repo:user:*"）
   */
  patterns?: string[];

  /**
   * 附加条件函数
   * @description 只有当条件返回 true 时才执行失效
   */
  condition?: (event: GenericDomainEvent) => boolean;

  /**
   * 是否启用该规则
   */
  enabled: boolean;

  /**
   * 优先级
   * @description 数字越大优先级越高，同时匹配多条规则时按优先级排序执行
   */
  priority: number;

  /**
   * 规则描述
   * @description 用于日志和监控
   */
  description?: string;
}

/**
 * 通用领域事件接口
 * @description 用于事件驱动失效的最小事件接口
 * 允许 @hl8/cache 独立工作，不依赖具体的领域事件实现
 */
export interface GenericDomainEvent {
  /** 事件类型 */
  eventType: string;

  /** 事件数据（任意类型） */
  data: unknown;

  /** 聚合根ID（可选） */
  aggregateRootId?: string;

  /** 事件时间戳 */
  timestamp?: Date;

  /** 事件元数据 */
  metadata?: Record<string, unknown>;
}

/**
 * 失效规则执行结果
 */
export interface InvalidationResult {
  /** 规则ID */
  ruleId: string;

  /** 是否执行成功 */
  success: boolean;

  /** 失效的缓存键数量 */
  keysInvalidated: number;

  /** 失效的标签数量 */
  tagsInvalidated: number;

  /** 匹配的模式数量 */
  patternsMatched: number;

  /** 错误信息（如果失败） */
  error?: string;

  /** 执行时间（毫秒） */
  executionTime: number;
}
