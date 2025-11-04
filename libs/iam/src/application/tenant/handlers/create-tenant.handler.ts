/**
 * @fileoverview 创建租户命令处理器
 * @description 处理创建租户命令，创建租户聚合根并发布事件
 */

import { CommandHandler } from "@nestjs/cqrs";
import { Injectable } from "@nestjs/common";
import { BaseCommandHandler, CommandResult } from "@hl8/application-kernel";
import type { Logger } from "@hl8/logger";
import { EntityId } from "@hl8/domain-kernel";
import {
  CreateTenantCommand,
  CreateTenantCommandResult,
} from "../commands/create-tenant.command.js";
import { Tenant } from "../../../domain/tenant/aggregates/tenant.aggregate.js";
import { TenantCodeValueObject } from "../../../domain/tenant/value-objects/tenant-code.value-object.js";
import { TenantNameValueObject } from "../../../domain/tenant/value-objects/tenant-name.value-object.js";
import { TenantDomainValueObject } from "../../../domain/tenant/value-objects/tenant-domain.value-object.js";
import { TenantType } from "../../../domain/tenant/value-objects/tenant-type.enum.js";
import type { ITenantRepository } from "../../../domain/tenant/repositories/tenant.repository.interface.js";
import { TenantCreationService } from "../../shared/services/tenant-creation.service.js";

/**
 * 创建租户命令处理器
 * @description 处理创建租户命令，验证唯一性，创建租户聚合根
 */
@Injectable()
@CommandHandler(CreateTenantCommand)
export class CreateTenantHandler extends BaseCommandHandler<
  CreateTenantCommand,
  CreateTenantCommandResult
> {
  constructor(
    logger: Logger,
    private readonly tenantRepository: ITenantRepository,
    private readonly tenantCreationService: TenantCreationService,
  ) {
    super(logger);
  }

  /**
   * 执行命令逻辑
   * @param command 创建租户命令
   * @returns 命令结果
   */
  protected async executeCommand(
    command: CreateTenantCommand,
  ): Promise<CommandResult<CreateTenantCommandResult>> {
    // 创建值对象
    const code = new TenantCodeValueObject(command.code);
    const name = new TenantNameValueObject(command.name);
    const domain = new TenantDomainValueObject(command.domain);

    // 验证租户类型
    if (!Object.values(TenantType).includes(command.type as TenantType)) {
      return CommandResult.failure("INVALID_TENANT_TYPE", "租户类型无效");
    }
    const tenantType = command.type as TenantType;

    // 验证租户代码和域名唯一性
    const codeExists = await this.tenantRepository.existsByCode(code);
    if (codeExists) {
      return CommandResult.failure("CODE_ALREADY_EXISTS", "租户代码已被使用");
    }

    const domainExists = await this.tenantRepository.existsByDomain(domain);
    if (domainExists) {
      return CommandResult.failure("DOMAIN_ALREADY_EXISTS", "租户域名已被使用");
    }

    // 创建用户ID（创建者）
    // 注意：这里使用命令的 userId，如果不存在则使用临时ID
    const createdBy = command.userId
      ? EntityId.fromString(command.userId)
      : EntityId.generate();

    // 创建租户聚合根
    const tenant = Tenant.create(code, name, domain, tenantType, createdBy);

    // 保存租户
    await this.tenantRepository.save(tenant);

    // 初始化租户（创建默认组织和根部门）
    const initResult = await this.tenantCreationService.initializeTenant(
      tenant.tenantId,
    );

    // 获取领域事件（用于后续发布）
    // TODO: 通过事件总线发布领域事件（T032任务）
    const domainEvents = tenant.getDomainEvents();
    tenant.clearDomainEvents();

    if (domainEvents.length > 0) {
      this.logger.debug("租户创建事件已生成", {
        tenantId: tenant.tenantId.value,
        eventCount: domainEvents.length,
      });
      // TODO: 通过事件总线发布领域事件
    }

    // 返回结果，包含默认组织和根部门ID
    const result: CreateTenantCommandResult = {
      tenantId: tenant.tenantId.value,
      code: tenant.code.value,
      name: tenant.name.value,
      domain: tenant.domain.value,
      type: tenant.type,
      createdAt: tenant.createdAt,
      defaultOrganizationId: initResult.defaultOrganizationId.value,
      rootDepartmentId: initResult.rootDepartmentId.value,
    };

    return CommandResult.success<CreateTenantCommandResult>(
      result,
      "租户创建成功",
    );
  }

  /**
   * 获取处理器描述
   * @returns 处理器描述
   */
  public getDescription(): string {
    return "创建租户命令处理器，处理租户创建请求";
  }

  /**
   * 处理命令（NestJS CQRS接口实现）
   * @param command 创建租户命令
   * @returns 命令结果（适配NestJS期望的返回类型）
   */
  public async handle(
    command: CreateTenantCommand,
  ): Promise<CreateTenantCommandResult> {
    const result = await this.execute(command);
    if (!result.success) {
      throw new Error(result.message || "租户创建失败");
    }
    return result.data as CreateTenantCommandResult;
  }
}
