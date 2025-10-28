/**
 * @fileoverview 命令查询总线模块
 * @description 命令查询总线的NestJS模块配置
 */

import { Module } from "@nestjs/common";
import { CqrsModule } from "@nestjs/cqrs";
import { CommandQueryBusImpl } from "./command-query-bus.impl.js";
import {
  LoggingMiddleware,
  PerformanceMonitoringMiddleware,
  ValidationMiddleware,
  RetryMiddleware,
  CacheMiddleware,
} from "./middleware/bus-middleware.js";

/**
 * 命令查询总线模块
 * @description 提供命令查询总线的依赖注入和配置
 */
@Module({
  imports: [CqrsModule],
  providers: [
    {
      provide: "ICommandQueryBus",
      useClass: CommandQueryBusImpl,
    },
    CommandQueryBusImpl,
    LoggingMiddleware,
    ValidationMiddleware,
    CacheMiddleware,
    PerformanceMonitoringMiddleware,
    RetryMiddleware,
  ],
  exports: ["ICommandQueryBus", CommandQueryBusImpl],
})
export class CommandQueryBusModule {}
