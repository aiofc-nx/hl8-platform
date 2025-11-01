/**
 * @fileoverview 总线模块导出
 * @description 导出所有总线相关的类和接口
 */

// Bus - 接口（避免BusConfig冲突）
export type {
  ICommandQueryBus,
  CommandHandler,
  QueryHandler,
  CommandHandlerInfo,
  QueryHandlerInfo,
  BusStatistics,
  BusMiddleware,
  ExecutionContext,
  CommandTypeStatistics,
  QueryTypeStatistics,
  HandlerStatistics,
} from "./command-query-bus.interface.js";

// Bus - 实现（导出实现类和配置）
export {
  CommandQueryBusImpl,
  type BusConfig,
} from "./command-query-bus.impl.js";

// Middleware
export * from "./middleware/bus-middleware.js";
