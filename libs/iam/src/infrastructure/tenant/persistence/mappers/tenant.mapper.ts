/**
 * @fileoverview 租户实体映射器
 * @description 在领域实体Tenant和持久化实体TenantPersistenceEntity之间进行转换
 */

import { EntityId, TenantId } from "@hl8/domain-kernel";
import { Tenant } from "../../../../domain/tenant/aggregates/tenant.aggregate.js";
import { TenantCodeValueObject } from "../../../../domain/tenant/value-objects/tenant-code.value-object.js";
import { TenantNameValueObject } from "../../../../domain/tenant/value-objects/tenant-name.value-object.js";
import { TenantDomainValueObject } from "../../../../domain/tenant/value-objects/tenant-domain.value-object.js";
import { TenantType } from "../../../../domain/tenant/value-objects/tenant-type.enum.js";
import { TenantStatus } from "../../../../domain/tenant/value-objects/tenant-status.enum.js";
import {
  TenantPersistenceEntity,
  TenantTypeEnum,
  TenantStatusEnum,
  IsolationStrategyEnum,
} from "../entities/tenant.persistence-entity.js";

/**
 * 租户实体映射器
 * @description 负责领域实体和持久化实体之间的双向转换
 */
export class TenantMapper {
  /**
   * 将领域实体转换为持久化实体
   * @param domainEntity 领域实体（Tenant聚合根）
   * @param persistenceEntity 持久化实体（可选，如果提供则更新，否则创建新实例）
   * @returns 持久化实体
   */
  public static toPersistence(
    domainEntity: Tenant,
    persistenceEntity?: TenantPersistenceEntity,
  ): TenantPersistenceEntity {
    const entity = persistenceEntity || new TenantPersistenceEntity();

    entity.id = domainEntity.id.value;
    entity.code = domainEntity.code.value;
    entity.name = domainEntity.name.value;
    entity.domain = domainEntity.domain.value;
    entity.type = this.mapTypeToPersistence(domainEntity.type);
    entity.status = this.mapStatusToPersistence(domainEntity.status);
    entity.isolationStrategy = IsolationStrategyEnum.ROW_LEVEL_SECURITY; // 固定值，从领域层获取
    entity.createdBy = domainEntity.createdBy.value;
    entity.trialEndsAt = domainEntity.trialEndsAt
      ? new Date(domainEntity.trialEndsAt.getTime())
      : null;
    entity.createdAt = domainEntity.createdAt;
    entity.updatedAt = domainEntity.updatedAt;
    entity.version = domainEntity.version;

    return entity;
  }

  /**
   * 将持久化实体转换为领域实体
   * @param persistenceEntity 持久化实体
   * @returns 领域实体（Tenant聚合根）
   */
  public static toDomain(persistenceEntity: TenantPersistenceEntity): Tenant {
    // 创建值对象
    const code = new TenantCodeValueObject(persistenceEntity.code);
    const name = new TenantNameValueObject(persistenceEntity.name);
    const domain = new TenantDomainValueObject(persistenceEntity.domain);

    // 使用Tenant的fromPersistence静态方法重建实例
    const tenantId = TenantId.fromString(persistenceEntity.id);

    const tenant = Tenant.fromPersistence(
      tenantId,
      code,
      name,
      domain,
      this.mapTypeFromPersistence(persistenceEntity.type),
      this.mapStatusFromPersistence(persistenceEntity.status),
      EntityId.fromString(persistenceEntity.createdBy),
      persistenceEntity.createdAt,
      persistenceEntity.trialEndsAt,
      persistenceEntity.version,
    );

    return tenant;
  }

  /**
   * 将领域类型映射到持久化类型
   * @param domainType 领域类型
   * @returns 持久化类型
   */
  private static mapTypeToPersistence(domainType: TenantType): TenantTypeEnum {
    switch (domainType) {
      case TenantType.TRIAL:
        return TenantTypeEnum.TRIAL;
      case TenantType.BASIC:
        return TenantTypeEnum.BASIC;
      case TenantType.PROFESSIONAL:
        return TenantTypeEnum.PROFESSIONAL;
      case TenantType.ENTERPRISE:
        return TenantTypeEnum.ENTERPRISE;
      default:
        return TenantTypeEnum.TRIAL;
    }
  }

  /**
   * 将持久化类型映射到领域类型
   * @param persistenceType 持久化类型
   * @returns 领域类型
   */
  private static mapTypeFromPersistence(
    persistenceType: TenantTypeEnum,
  ): TenantType {
    switch (persistenceType) {
      case TenantTypeEnum.TRIAL:
        return TenantType.TRIAL;
      case TenantTypeEnum.BASIC:
        return TenantType.BASIC;
      case TenantTypeEnum.PROFESSIONAL:
        return TenantType.PROFESSIONAL;
      case TenantTypeEnum.ENTERPRISE:
        return TenantType.ENTERPRISE;
      default:
        return TenantType.TRIAL;
    }
  }

  /**
   * 将领域状态映射到持久化状态
   * @param domainStatus 领域状态
   * @returns 持久化状态
   */
  private static mapStatusToPersistence(
    domainStatus: TenantStatus,
  ): TenantStatusEnum {
    switch (domainStatus) {
      case TenantStatus.TRIAL:
        return TenantStatusEnum.TRIAL;
      case TenantStatus.ACTIVE:
        return TenantStatusEnum.ACTIVE;
      case TenantStatus.SUSPENDED:
        return TenantStatusEnum.SUSPENDED;
      case TenantStatus.EXPIRED:
        return TenantStatusEnum.EXPIRED;
      case TenantStatus.DISABLED:
        return TenantStatusEnum.DISABLED;
      case TenantStatus.DELETED:
        return TenantStatusEnum.DELETED;
      default:
        return TenantStatusEnum.TRIAL;
    }
  }

  /**
   * 将持久化状态映射到领域状态
   * @param persistenceStatus 持久化状态
   * @returns 领域状态
   */
  private static mapStatusFromPersistence(
    persistenceStatus: TenantStatusEnum,
  ): TenantStatus {
    switch (persistenceStatus) {
      case TenantStatusEnum.TRIAL:
        return TenantStatus.TRIAL;
      case TenantStatusEnum.ACTIVE:
        return TenantStatus.ACTIVE;
      case TenantStatusEnum.SUSPENDED:
        return TenantStatus.SUSPENDED;
      case TenantStatusEnum.EXPIRED:
        return TenantStatus.EXPIRED;
      case TenantStatusEnum.DISABLED:
        return TenantStatus.DISABLED;
      case TenantStatusEnum.DELETED:
        return TenantStatus.DELETED;
      default:
        return TenantStatus.TRIAL;
    }
  }
}
