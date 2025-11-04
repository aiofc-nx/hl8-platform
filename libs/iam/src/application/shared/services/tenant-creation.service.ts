/**
 * @fileoverview 租户创建服务
 * @description 处理租户创建后的初始化工作，包括创建默认组织和根部门
 */

import { Injectable } from "@nestjs/common";
import type { Logger } from "@hl8/logger";
import { TenantId, OrganizationId, DepartmentId } from "@hl8/domain-kernel";
import { Tenant } from "../../../domain/tenant/aggregates/tenant.aggregate.js";
import { Organization } from "../../../domain/organization/aggregates/organization.aggregate.js";
import { OrganizationNameValueObject } from "../../../domain/organization/value-objects/organization-name.value-object.js";
import { OrganizationType } from "../../../domain/organization/value-objects/organization-type.enum.js";
import { Department } from "../../../domain/department/aggregates/department.aggregate.js";
import { DepartmentNameValueObject } from "../../../domain/department/value-objects/department-name.value-object.js";
import type { ITenantRepository } from "../../../domain/tenant/repositories/tenant.repository.interface.js";
import type { IOrganizationRepository } from "../../../domain/organization/repositories/organization.repository.interface.js";
import type { IDepartmentRepository } from "../../../domain/department/repositories/department.repository.interface.js";

/**
 * 租户创建初始化结果
 */
export interface TenantCreationInitResult {
  /** 默认组织ID */
  defaultOrganizationId: OrganizationId;
  /** 根部门ID */
  rootDepartmentId: DepartmentId;
}

/**
 * 租户创建服务
 * @description 处理租户创建后的初始化工作，包括创建默认组织和根部门
 */
@Injectable()
export class TenantCreationService {
  constructor(
    private readonly logger: Logger,
    private readonly tenantRepository: ITenantRepository,
    private readonly organizationRepository: IOrganizationRepository,
    private readonly departmentRepository: IDepartmentRepository,
  ) {}

  /**
   * 初始化租户（创建默认组织和根部门）
   * @param tenantId 租户ID
   * @returns 初始化结果，包含默认组织ID和根部门ID
   */
  public async initializeTenant(
    tenantId: TenantId,
  ): Promise<TenantCreationInitResult> {
    // 查找租户
    const tenant = await this.tenantRepository.findByTenantId(tenantId);
    if (!tenant) {
      throw new Error(`租户不存在: ${tenantId.value}`);
    }

    // 创建默认组织
    const defaultOrganization = await this.createDefaultOrganization(tenant);

    // 创建根部门
    const rootDepartment = await this.createRootDepartment(
      tenant,
      defaultOrganization,
    );

    this.logger.log("租户初始化完成", {
      tenantId: tenantId.value,
      organizationId: defaultOrganization.organizationId.value,
      departmentId: rootDepartment.departmentId.value,
    });

    return {
      defaultOrganizationId: defaultOrganization.organizationId,
      rootDepartmentId: rootDepartment.departmentId,
    };
  }

  /**
   * 创建默认组织
   * @param tenant 租户聚合根
   * @returns 默认组织聚合根
   */
  private async createDefaultOrganization(
    tenant: Tenant,
  ): Promise<Organization> {
    // 检查是否已存在默认组织
    const existingOrganizations =
      await this.organizationRepository.findByTenantId(tenant.tenantId);
    const defaultOrg = existingOrganizations.find((org) => org.isDefault);
    if (defaultOrg) {
      this.logger.debug("默认组织已存在", {
        tenantId: tenant.tenantId.value,
        organizationId: defaultOrg.organizationId.value,
      });
      return defaultOrg;
    }

    // 创建默认组织
    const organizationName = new OrganizationNameValueObject(
      `${tenant.name.value}（默认组织）`,
    );
    const defaultOrganization = Organization.create(
      tenant.tenantId,
      organizationName,
      "系统自动创建的默认组织",
      OrganizationType.OTHER,
      true, // isDefault = true
    );

    // 保存组织
    await this.organizationRepository.save(defaultOrganization);

    // 获取并清理领域事件
    const orgEvents = defaultOrganization.getDomainEvents();
    defaultOrganization.clearDomainEvents();

    if (orgEvents.length > 0) {
      this.logger.debug("组织创建事件已生成", {
        organizationId: defaultOrganization.organizationId.value,
        eventCount: orgEvents.length,
      });
      // TODO: 通过事件总线发布领域事件（T032任务）
    }

    return defaultOrganization;
  }

  /**
   * 创建根部门
   * @param tenant 租户聚合根
   * @param organization 组织聚合根
   * @returns 根部门聚合根
   */
  private async createRootDepartment(
    tenant: Tenant,
    organization: Organization,
  ): Promise<Department> {
    // 检查是否已存在根部门
    const existingRootDepartment =
      await this.departmentRepository.findRootByOrganizationId(
        organization.organizationId,
      );
    if (existingRootDepartment) {
      this.logger.debug("根部门已存在", {
        organizationId: organization.organizationId.value,
        departmentId: existingRootDepartment.departmentId.value,
      });
      return existingRootDepartment;
    }

    // 创建根部门
    const departmentName = new DepartmentNameValueObject(
      `${organization.name.value}（根部门）`,
    );
    const rootDepartment = Department.createRoot(
      organization.organizationId,
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

    return rootDepartment;
  }
}
