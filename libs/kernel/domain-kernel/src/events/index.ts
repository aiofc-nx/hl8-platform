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
