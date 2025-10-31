/**
 * @fileoverview 事件模块
 * @description 导出所有事件相关的类和接口
 */

export { DomainEvent } from "./base/domain-event.base.js";
export type {
  IEventStore,
  IEventStoreFactory,
  EventStoreStats,
  EventStoreConfig,
  EventStoreException,
} from "./store/event-store.interface.js";

// 事件处理
export {
  EventProcessor,
  type EventProcessingConfig,
} from "./event-processor.js";
export { EventRegistry } from "./event-registry.js";
export { EventHandlerResult } from "./domain-event-handler.interface.js";
export type {
  IDomainEventHandler,
  EventProcessingResult,
  EventHandlerMetadata,
  EventHandlerContext,
} from "./domain-event-handler.interface.js";

// 事件处理异常
export {
  EventProcessingException,
  EventHandlerNotFoundException,
  EventProcessingTimeoutException,
  EventHandlerValidationException,
  EventHandlerExecutionException,
} from "./event-processing-exceptions.js";
export { EventRegistryException } from "./event-registry-exceptions.js";
