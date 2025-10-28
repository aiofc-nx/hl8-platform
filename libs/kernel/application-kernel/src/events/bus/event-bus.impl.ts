/**
 * @fileoverview 事件总线实现
 * @description 基于@nestjs/cqrs的事件总线实现，支持事件的发布、订阅、路由和异步处理
 */

import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Optional,
} from "@nestjs/common";
import { EventBus as NestEventBus } from "@nestjs/cqrs";
import { Logger } from "@hl8/logger";
import {
  IEventBus,
  EventHandler,
  EventPublishResult,
  EventSubscription,
  EventBusStatistics,
} from "./event-bus.interface.js";

/**
 * 事件总线配置
 * @description 事件总线的配置选项
 */
export interface EventBusConfig {
  /** 最大重试次数 */
  maxRetries: number;
  /** 重试延迟（毫秒） */
  retryDelay: number;
  /** 最大并发处理数 */
  maxConcurrency: number;
  /** 处理超时时间（毫秒） */
  processingTimeout: number;
  /** 是否启用死信队列 */
  enableDeadLetterQueue: boolean;
  /** 死信队列最大大小 */
  deadLetterQueueMaxSize: number;
  /** 是否启用性能监控 */
  enablePerformanceMonitoring: boolean;
  /** 性能监控采样率 */
  performanceMonitoringSamplingRate: number;
}
import { DomainEvent } from "../types/domain-event.js";
import { IntegrationEvent } from "../types/integration-event.js";

/**
 * 事件总线实现
 * @description 基于@nestjs/cqrs的事件总线实现
 */
@Injectable()
export class EventBusImpl implements IEventBus, OnModuleInit, OnModuleDestroy {
  private readonly logger: Logger;
  private readonly nestEventBus: NestEventBus;
  private readonly subscriptions = new Map<string, EventSubscription>();
  private readonly handlers = new Map<string, EventHandler>();
  private readonly statistics: EventBusStatistics;
  private readonly config: EventBusConfig;
  private _isRunning = false;
  private readonly deadLetterQueue: (DomainEvent | IntegrationEvent)[] = [];

  constructor(
    logger: Logger,
    nestEventBus: NestEventBus,
    @Optional() config?: EventBusConfig,
  ) {
    this.logger = logger;
    this.nestEventBus = nestEventBus;
    this.config = config || {
      maxRetries: 3,
      retryDelay: 1000,
      maxConcurrency: 10,
      processingTimeout: 30000,
      enableDeadLetterQueue: true,
      deadLetterQueueMaxSize: 1000,
      enablePerformanceMonitoring: true,
      performanceMonitoringSamplingRate: 0.1,
    };
    this.statistics = {
      totalPublished: 0,
      totalProcessed: 0,
      totalSubscriptions: 0,
      activeSubscriptions: 0,
      averageProcessingTime: 0,
      successRate: 0,
      byEventType: {},
      byHandler: {},
      lastUpdated: new Date(),
    };
  }

  /**
   * 模块初始化
   */
  async onModuleInit(): Promise<void> {
    await this.start();
  }

  /**
   * 模块销毁
   */
  async onModuleDestroy(): Promise<void> {
    await this.stop();
  }

  /**
   * 发布领域事件
   * @param event 领域事件
   * @returns 发布结果
   */
  public async publishDomainEvent(
    event: DomainEvent,
  ): Promise<EventPublishResult> {
    const startTime = Date.now();
    const eventId = event.eventId.toString();

    try {
      this.logger.debug("发布领域事件", {
        eventId,
        eventType: event.eventType,
        aggregateId: event.aggregateRootId.toString(),
      });

      // 使用NestJS事件总线发布事件
      this.nestEventBus.publish(event);

      // 更新统计信息
      this.updateStatistics(
        event.eventType,
        "published",
        Date.now() - startTime,
      );

      const result: EventPublishResult = {
        success: true,
        eventId,
        timestamp: new Date(),
        processingTime: Date.now() - startTime,
        subscriberCount: this.getSubscriberCount(event.eventType),
        successCount: this.getSubscriberCount(event.eventType),
        failureCount: 0,
      };

      this.logger.debug("领域事件发布成功", {
        eventId,
        processingTime: result.processingTime,
        subscriberCount: result.subscriberCount,
      });

      return result;
    } catch (error) {
      this.logger.error("领域事件发布失败", {
        eventId,
        error: error instanceof Error ? error.message : String(error),
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        eventId,
        timestamp: new Date(),
        processingTime: Date.now() - startTime,
        subscriberCount: 0,
        successCount: 0,
        failureCount: 0,
      };
    }
  }

  /**
   * 发布集成事件
   * @param event 集成事件
   * @returns 发布结果
   */
  public async publishIntegrationEvent(
    event: IntegrationEvent,
  ): Promise<EventPublishResult> {
    const startTime = Date.now();
    const eventId = event.eventId.toString();

    try {
      this.logger.debug("发布集成事件", {
        eventId,
        eventType: event.eventType,
        source: event.source,
        target: event.target,
      });

      // 使用NestJS事件总线发布事件
      this.nestEventBus.publish(event);

      // 更新统计信息
      this.updateStatistics(
        event.eventType,
        "published",
        Date.now() - startTime,
      );

      const result: EventPublishResult = {
        success: true,
        eventId,
        timestamp: new Date(),
        processingTime: Date.now() - startTime,
        subscriberCount: this.getSubscriberCount(event.eventType),
        successCount: this.getSubscriberCount(event.eventType),
        failureCount: 0,
      };

      this.logger.debug("集成事件发布成功", {
        eventId,
        processingTime: result.processingTime,
        subscriberCount: result.subscriberCount,
      });

      return result;
    } catch (error) {
      this.logger.error("集成事件发布失败", {
        eventId,
        error: error instanceof Error ? error.message : String(error),
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        eventId,
        timestamp: new Date(),
        processingTime: Date.now() - startTime,
        subscriberCount: 0,
        successCount: 0,
        failureCount: 0,
      };
    }
  }

  /**
   * 批量发布事件
   * @param events 事件列表
   * @returns 发布结果
   */
  public async publishEvents(
    events: (DomainEvent | IntegrationEvent)[],
  ): Promise<EventPublishResult[]> {
    const results: EventPublishResult[] = [];

    for (const event of events) {
      if (event instanceof DomainEvent) {
        results.push(await this.publishDomainEvent(event));
      } else if (event instanceof IntegrationEvent) {
        results.push(await this.publishIntegrationEvent(event));
      }
    }

    return results;
  }

  /**
   * 订阅领域事件
   * @param eventType 事件类型
   * @param handler 事件处理器
   * @returns 订阅ID
   */
  public async subscribeToDomainEvent(
    eventType: string,
    handler: EventHandler<DomainEvent>,
  ): Promise<string> {
    const subscriptionId = this.generateSubscriptionId();
    const subscription: EventSubscription = {
      id: subscriptionId,
      eventType,
      subscriptionType: "domain",
      handlerName: handler.getHandlerName(),
      createdAt: new Date(),
      active: true,
      processCount: 0,
      successCount: 0,
      failureCount: 0,
    };

    this.subscriptions.set(subscriptionId, subscription);
    this.handlers.set(subscriptionId, handler);

    this.logger.debug("订阅领域事件", {
      subscriptionId,
      eventType,
      handlerName: handler.getHandlerName(),
    });

    return subscriptionId;
  }

  /**
   * 订阅集成事件
   * @param eventType 事件类型
   * @param handler 事件处理器
   * @returns 订阅ID
   */
  public async subscribeToIntegrationEvent(
    eventType: string,
    handler: EventHandler<IntegrationEvent>,
  ): Promise<string> {
    const subscriptionId = this.generateSubscriptionId();
    const subscription: EventSubscription = {
      id: subscriptionId,
      eventType,
      subscriptionType: "integration",
      handlerName: handler.getHandlerName(),
      createdAt: new Date(),
      active: true,
      processCount: 0,
      successCount: 0,
      failureCount: 0,
    };

    this.subscriptions.set(subscriptionId, subscription);
    this.handlers.set(subscriptionId, handler);

    this.logger.debug("订阅集成事件", {
      subscriptionId,
      eventType,
      handlerName: handler.getHandlerName(),
    });

    return subscriptionId;
  }

  /**
   * 取消订阅
   * @param subscriptionId 订阅ID
   * @returns 取消结果
   */
  public async unsubscribe(subscriptionId: string): Promise<boolean> {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) {
      return false;
    }

    subscription.active = false;
    this.handlers.delete(subscriptionId);

    this.logger.debug("取消订阅", {
      subscriptionId,
      eventType: subscription.eventType,
    });

    return true;
  }

  /**
   * 获取所有订阅
   * @returns 订阅列表
   */
  public async getSubscriptions(): Promise<EventSubscription[]> {
    return Array.from(this.subscriptions.values());
  }

  /**
   * 获取事件统计信息
   * @returns 统计信息
   */
  public async getStatistics(): Promise<EventBusStatistics> {
    this.updateStatisticsSummary();
    return { ...this.statistics };
  }

  /**
   * 启动事件总线
   * @returns 启动结果
   */
  public async start(): Promise<void> {
    if (this._isRunning) {
      return;
    }

    this._isRunning = true;
    this.logger.log("事件总线已启动");
  }

  /**
   * 停止事件总线
   * @returns 停止结果
   */
  public async stop(): Promise<void> {
    if (!this._isRunning) {
      return;
    }

    this._isRunning = false;
    this.logger.log("事件总线已停止");
  }

  /**
   * 检查事件总线是否运行中
   * @returns 是否运行中
   */
  public isRunning(): boolean {
    return this._isRunning;
  }

  /**
   * 生成订阅ID
   * @returns 订阅ID
   */
  private generateSubscriptionId(): string {
    return `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 获取订阅者数量
   * @param eventType 事件类型
   * @returns 订阅者数量
   */
  private getSubscriberCount(eventType: string): number {
    return Array.from(this.subscriptions.values()).filter(
      (sub) => sub.eventType === eventType && sub.active,
    ).length;
  }

  /**
   * 更新统计信息
   * @param eventType 事件类型
   * @param action 操作类型
   * @param processingTime 处理时间
   */
  private updateStatistics(
    eventType: string,
    action: "published" | "processed" | "success" | "failure",
    processingTime: number,
  ): void {
    if (action === "published") {
      this.statistics.totalPublished++;
    } else if (action === "processed") {
      this.statistics.totalProcessed++;
    }

    // 更新事件类型统计
    if (!this.statistics.byEventType[eventType]) {
      this.statistics.byEventType[eventType] = {
        published: 0,
        processed: 0,
        success: 0,
        failure: 0,
        averageProcessingTime: 0,
      };
    }

    const eventStats = this.statistics.byEventType[eventType];
    if (action === "published") {
      eventStats.published++;
    } else if (action === "processed") {
      eventStats.processed++;
    } else if (action === "success") {
      eventStats.success++;
    } else if (action === "failure") {
      eventStats.failure++;
    }

    // 更新平均处理时间
    const totalTime =
      eventStats.averageProcessingTime * (eventStats.processed - 1) +
      processingTime;
    eventStats.averageProcessingTime = totalTime / eventStats.processed;

    this.statistics.lastUpdated = new Date();
  }

  /**
   * 更新统计信息摘要
   */
  private updateStatisticsSummary(): void {
    this.statistics.totalSubscriptions = this.subscriptions.size;
    this.statistics.activeSubscriptions = Array.from(
      this.subscriptions.values(),
    ).filter((sub) => sub.active).length;

    // 计算总体成功率
    const totalProcessed = this.statistics.totalProcessed;
    const totalSuccess = Object.values(this.statistics.byEventType).reduce(
      (sum, stats) => sum + stats.success,
      0,
    );
    this.statistics.successRate =
      totalProcessed > 0 ? totalSuccess / totalProcessed : 0;

    // 计算平均处理时间
    const totalProcessingTime = Object.values(
      this.statistics.byEventType,
    ).reduce(
      (sum, stats) => sum + stats.averageProcessingTime * stats.processed,
      0,
    );
    this.statistics.averageProcessingTime =
      totalProcessed > 0 ? totalProcessingTime / totalProcessed : 0;
  }
}
