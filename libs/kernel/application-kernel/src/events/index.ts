/**
 * @fileoverview 事件模块导出
 * @description 导出所有事件相关的类和接口
 */

// Types
export * from "./types/domain-event.js";
export * from "./types/integration-event.js";

// Store
export * from "./store/event-store.interface.js";
export * from "./store/event-store.impl.js";
export { EventSnapshot } from "./store/event-snapshot.js";

// Bus - 接口（避免EventBusConfig冲突）
export type {
  IEventBus,
  EventHandler,
  EventPublishResult,
  EventSubscription,
  EventBusStatistics,
} from "./bus/event-bus.interface.js";

// Bus - 实现（导出实现类，配置类型使用别名避免冲突）
export { EventBusImpl } from "./bus/event-bus.impl.js";
export type { EventBusConfig as EventBusConfigType } from "./bus/event-bus.impl.js";
