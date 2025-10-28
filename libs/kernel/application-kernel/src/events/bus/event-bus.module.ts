/**
 * @fileoverview 事件总线模块
 * @description 事件总线的NestJS模块配置
 */

import { Module } from "@nestjs/common";
import { CqrsModule } from "@nestjs/cqrs";
import { EventBusImpl } from "./event-bus.impl.js";

/**
 * 事件总线模块
 * @description 提供事件总线的依赖注入和配置
 */
@Module({
  imports: [CqrsModule],
  providers: [
    {
      provide: "IEventBus",
      useClass: EventBusImpl,
    },
    EventBusImpl,
  ],
  exports: ["IEventBus", EventBusImpl],
})
export class EventBusModule {}
