/**
 * @fileoverview 事件注册表类
 * @description 管理领域事件处理器的注册和查找
 */

import {
  IDomainEventHandler,
  EventHandlerMetadata,
} from "./domain-event-handler.interface.js";
import { EventRegistryException } from "./event-registry-exceptions.js";

/**
 * 事件注册表类
 * @description 管理领域事件处理器的注册和查找
 */
export class EventRegistry {
  private readonly _handlers: Map<string, IDomainEventHandler[]> = new Map();
  private readonly _handlerMetadata: Map<string, EventHandlerMetadata> =
    new Map();

  /**
   * 注册事件处理器
   * @param handler 事件处理器
   * @throws {EventRegistryException} 当处理器无效或已存在时抛出异常
   */
  public async registerHandler(handler: IDomainEventHandler): Promise<void> {
    if (!handler) {
      throw new EventRegistryException("事件处理器不能为空");
    }

    const metadata = handler.getMetadata();
    const handlerId = metadata.handlerId;

    // 检查处理器是否已注册
    if (this._handlerMetadata.has(handlerId)) {
      throw new EventRegistryException(
        `事件处理器 "${handlerId}" 已注册`,
        handlerId,
      );
    }

    // 验证处理器元数据
    this.validateHandlerMetadata(metadata);

    // 初始化处理器（如果实现了 initialize 方法）
    if (handler.initialize) {
      try {
        await handler.initialize();
      } catch (error) {
        throw new EventRegistryException(
          `事件处理器 "${handlerId}" 初始化失败: ${(error as Error).message}`,
          handlerId,
        );
      }
    }

    // 注册处理器元数据
    this._handlerMetadata.set(handlerId, metadata);

    // 为每个支持的事件类型注册处理器
    for (const eventType of metadata.supportedEventTypes) {
      if (!this._handlers.has(eventType)) {
        this._handlers.set(eventType, []);
      }

      const handlers = this._handlers.get(eventType)!;
      handlers.push(handler);
    }
  }

  /**
   * 注销事件处理器
   * @param handlerId 处理器标识符
   * @returns 是否成功注销
   */
  public async unregisterHandler(handlerId: string): Promise<boolean> {
    const metadata = this._handlerMetadata.get(handlerId);
    if (!metadata) {
      return false;
    }

    // 查找处理器实例
    let handler: IDomainEventHandler | undefined;
    for (const handlers of this._handlers.values()) {
      const found = handlers.find(
        (h) => h.getMetadata().handlerId === handlerId,
      );
      if (found) {
        handler = found;
        break;
      }
    }

    // 销毁处理器（如果实现了 dispose 方法）
    if (handler && handler.dispose) {
      try {
        await handler.dispose();
      } catch (error) {
        // 记录错误但不阻止注销
        console.error(
          `事件处理器 "${handlerId}" 销毁失败: ${(error as Error).message}`,
        );
      }
    }

    // 从所有相关的事件类型中移除处理器
    for (const eventType of metadata.supportedEventTypes) {
      const handlers = this._handlers.get(eventType);
      if (handlers) {
        const index = handlers.findIndex(
          (h) => h.getMetadata().handlerId === handlerId,
        );
        if (index >= 0) {
          handlers.splice(index, 1);
        }

        // 如果该事件类型没有处理器了，移除映射
        if (handlers.length === 0) {
          this._handlers.delete(eventType);
        }
      }
    }

    // 移除处理器元数据
    this._handlerMetadata.delete(handlerId);

    return true;
  }

  /**
   * 获取处理指定事件类型的处理器列表
   * @param eventType 事件类型
   * @returns 处理器列表
   */
  public getHandlersForEvent(eventType: string): IDomainEventHandler[] {
    const handlers = this._handlers.get(eventType);
    if (!handlers) {
      return [];
    }

    // 只返回启用的处理器
    return handlers.filter((handler) => {
      const metadata = handler.getMetadata();
      return metadata.enabled && handler.canHandle(eventType);
    });
  }

  /**
   * 获取所有已注册的事件类型
   * @returns 事件类型数组
   */
  public getRegisteredEventTypes(): string[] {
    return Array.from(this._handlers.keys());
  }

  /**
   * 获取指定处理器的元数据
   * @param handlerId 处理器标识符
   * @returns 处理器元数据，如果不存在则返回undefined
   */
  public getHandlerMetadata(
    handlerId: string,
  ): EventHandlerMetadata | undefined {
    return this._handlerMetadata.get(handlerId);
  }

  /**
   * 获取所有已注册的处理器
   * @returns 处理器列表
   */
  public getAllHandlers(): IDomainEventHandler[] {
    const handlerSet = new Set<IDomainEventHandler>();
    for (const handlers of this._handlers.values()) {
      for (const handler of handlers) {
        handlerSet.add(handler);
      }
    }
    return Array.from(handlerSet);
  }

  /**
   * 获取所有处理器元数据
   * @returns 处理器元数据数组
   */
  public getAllHandlerMetadata(): EventHandlerMetadata[] {
    return Array.from(this._handlerMetadata.values());
  }

  /**
   * 检查处理器是否已注册
   * @param handlerId 处理器标识符
   * @returns 是否已注册
   */
  public isHandlerRegistered(handlerId: string): boolean {
    return this._handlerMetadata.has(handlerId);
  }

  /**
   * 检查事件类型是否有处理器
   * @param eventType 事件类型
   * @returns 是否有处理器
   */
  public hasHandlersForEvent(eventType: string): boolean {
    const handlers = this.getHandlersForEvent(eventType);
    return handlers.length > 0;
  }

  /**
   * 清除所有注册的处理器
   */
  public async clear(): Promise<void> {
    // 销毁所有处理器
    const allHandlers = this.getAllHandlers();
    for (const handler of allHandlers) {
      if (handler.dispose) {
        try {
          await handler.dispose();
        } catch (error) {
          // 记录错误但不阻止清除
          const metadata = handler.getMetadata();
          console.error(
            `事件处理器 "${metadata.handlerId}" 销毁失败: ${(error as Error).message}`,
          );
        }
      }
    }

    this._handlers.clear();
    this._handlerMetadata.clear();
  }

  /**
   * 获取注册表统计信息
   * @returns 统计信息
   */
  public getStatistics(): {
    totalHandlers: number;
    totalEventTypes: number;
    handlersByEventType: Map<string, number>;
  } {
    const handlersByEventType = new Map<string, number>();
    for (const [eventType, handlers] of this._handlers.entries()) {
      handlersByEventType.set(eventType, handlers.length);
    }

    return {
      totalHandlers: this._handlerMetadata.size,
      totalEventTypes: this._handlers.size,
      handlersByEventType,
    };
  }

  /**
   * 验证处理器元数据
   * @param metadata 处理器元数据
   * @throws {EventRegistryException} 当元数据无效时抛出异常
   */
  private validateHandlerMetadata(metadata: EventHandlerMetadata): void {
    if (!metadata.handlerId || metadata.handlerId.trim() === "") {
      throw new EventRegistryException("处理器标识符不能为空");
    }

    if (!metadata.handlerName || metadata.handlerName.trim() === "") {
      throw new EventRegistryException("处理器名称不能为空");
    }

    if (
      !metadata.supportedEventTypes ||
      metadata.supportedEventTypes.length === 0
    ) {
      throw new EventRegistryException("处理器必须支持至少一种事件类型");
    }

    if (metadata.priority < 0) {
      throw new EventRegistryException("处理器优先级不能为负数");
    }
  }
}
