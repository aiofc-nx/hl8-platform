/**
 * @fileoverview 组织创建事件 - 根部门投影器
 * @description 监听组织创建事件，自动创建根部门
 */

import { EventsHandler, IEventHandler } from "@nestjs/cqrs";
import { Injectable } from "@nestjs/common";
import type { Logger } from "@hl8/logger";
// OrganizationId and TenantId are not used in this file, removed to fix lint warning
import { OrganizationCreatedEvent } from "../../../domain/organization/events/organization-created.event.js";
import { Department } from "../../../domain/department/aggregates/department.aggregate.js";
import { DepartmentNameValueObject } from "../../../domain/department/value-objects/department-name.value-object.js";
import type { IDepartmentRepository } from "../../../domain/department/repositories/department.repository.interface.js";

/**
 * 组织创建事件 - 根部门投影器
 * @description 监听组织创建事件，自动创建根部门
 */
@Injectable()
@EventsHandler(OrganizationCreatedEvent)
export class OrganizationCreatedDepartmentProjector
  implements IEventHandler<OrganizationCreatedEvent>
{
  constructor(
    private readonly logger: Logger,
    private readonly departmentRepository: IDepartmentRepository,
  ) {}

  /**
   * 处理组织创建事件
   * @param event 组织创建事件
   */
  async handle(event: OrganizationCreatedEvent): Promise<void> {
    try {
      this.logger.debug("处理组织创建事件 - 创建根部门", {
        organizationId: event.eventData.organizationId.value,
        tenantId: event.eventData.tenantId.value,
      });

      // 检查是否已存在根部门
      const existingRootDepartment =
        await this.departmentRepository.findRootByOrganizationId(
          event.eventData.organizationId,
        );

      if (existingRootDepartment) {
        this.logger.debug("根部门已存在，跳过创建", {
          organizationId: event.eventData.organizationId.value,
          departmentId: existingRootDepartment.departmentId.value,
        });
        return;
      }

      // 创建根部门
      const departmentName = new DepartmentNameValueObject(
        `${event.eventData.name}（根部门）`,
      );
      const rootDepartment = Department.createRoot(
        event.eventData.organizationId,
        departmentName,
      );

      // 保存部门
      await this.departmentRepository.save(rootDepartment);

      // 获取并清理领域事件
      const deptEvents = rootDepartment.getDomainEvents();
      rootDepartment.clearDomainEvents();

      if (deptEvents.length > 0) {
        this.logger.debug("部门创建事件已生成", {
          departmentId: rootDepartment.departmentId.value,
          eventCount: deptEvents.length,
        });
        // TODO: 通过事件总线发布领域事件（T032任务）
      }

      this.logger.log("根部门创建完成", {
        organizationId: event.eventData.organizationId.value,
        departmentId: rootDepartment.departmentId.value,
      });
    } catch (error) {
      this.logger.error("创建根部门失败", {
        organizationId: event.eventData.organizationId.value,
        error: error instanceof Error ? error.message : String(error),
      });
      // 不抛出异常，避免影响事件处理流程
      // 可以考虑记录到死信队列或重试队列
    }
  }
}
