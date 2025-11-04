/**
 * @fileoverview 租户创建事件 - 默认组织投影器
 * @description 监听租户创建事件，自动创建默认组织
 */

import { EventsHandler, IEventHandler } from "@nestjs/cqrs";
import { Injectable } from "@nestjs/common";
import type { Logger } from "@hl8/logger";
// TenantId is not used in this file, removed to fix lint warning
import { TenantCreatedEvent } from "../../../domain/tenant/events/tenant-created.event.js";
import { TenantCreationService } from "../../shared/services/tenant-creation.service.js";

/**
 * 租户创建事件 - 默认组织投影器
 * @description 监听租户创建事件，自动创建默认组织
 */
@Injectable()
@EventsHandler(TenantCreatedEvent)
export class TenantCreatedOrganizationProjector
  implements IEventHandler<TenantCreatedEvent>
{
  constructor(
    private readonly logger: Logger,
    private readonly tenantCreationService: TenantCreationService,
  ) {}

  /**
   * 处理租户创建事件
   * @param event 租户创建事件
   */
  async handle(event: TenantCreatedEvent): Promise<void> {
    try {
      this.logger.debug("处理租户创建事件 - 创建默认组织", {
        tenantId: event.eventData.tenantId.value,
      });

      const tenantId = event.eventData.tenantId;
      await this.tenantCreationService.initializeTenant(tenantId);

      this.logger.log("默认组织创建完成", {
        tenantId: tenantId.value,
      });
    } catch (error) {
      this.logger.error("创建默认组织失败", {
        tenantId: event.eventData.tenantId.value,
        error: error instanceof Error ? error.message : String(error),
      });
      // 不抛出异常，避免影响事件处理流程
      // 可以考虑记录到死信队列或重试队列
    }
  }
}
