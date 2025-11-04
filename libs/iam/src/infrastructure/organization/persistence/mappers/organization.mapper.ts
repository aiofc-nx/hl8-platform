/**
 * @fileoverview 组织实体映射器
 * @description 在领域实体Organization和持久化实体OrganizationPersistenceEntity之间进行转换
 */

import { TenantId, OrganizationId } from "@hl8/domain-kernel";
import { Organization } from "../../../../domain/organization/aggregates/organization.aggregate.js";
import { OrganizationNameValueObject } from "../../../../domain/organization/value-objects/organization-name.value-object.js";
import { OrganizationType } from "../../../../domain/organization/value-objects/organization-type.enum.js";
import {
  OrganizationPersistenceEntity,
  OrganizationTypeEnum,
} from "../entities/organization.persistence-entity.js";

/**
 * 组织实体映射器
 * @description 负责领域实体和持久化实体之间的双向转换
 */
export class OrganizationMapper {
  /**
   * 将领域实体转换为持久化实体
   * @param domainEntity 领域实体（Organization聚合根）
   * @param persistenceEntity 持久化实体（可选，如果提供则更新，否则创建新实例）
   * @returns 持久化实体
   */
  public static toPersistence(
    domainEntity: Organization,
    persistenceEntity?: OrganizationPersistenceEntity,
  ): OrganizationPersistenceEntity {
    const entity = persistenceEntity || new OrganizationPersistenceEntity();

    entity.id = domainEntity.id.value;
    entity.tenantId = domainEntity.tenantId.value;
    entity.name = domainEntity.name.value;
    entity.description = domainEntity.description;
    entity.type = this.mapTypeToPersistence(domainEntity.type);
    entity.isDefault = domainEntity.isDefault;
    entity.createdAt = domainEntity.createdAt;
    entity.updatedAt = domainEntity.updatedAt;
    entity.version = domainEntity.version;

    return entity;
  }

  /**
   * 将持久化实体转换为领域实体
   * @param persistenceEntity 持久化实体
   * @returns 领域实体（Organization聚合根）
   */
  public static toDomain(
    persistenceEntity: OrganizationPersistenceEntity,
  ): Organization {
    // 创建值对象
    const name = new OrganizationNameValueObject(persistenceEntity.name);

    // 创建ID值对象
    const tenantId = TenantId.fromString(persistenceEntity.tenantId);
    const organizationId = OrganizationId.fromString(
      tenantId,
      persistenceEntity.id,
    );

    // 使用Organization的fromPersistence静态方法重建实例
    const organization = Organization.fromPersistence(
      organizationId,
      tenantId,
      name,
      persistenceEntity.description,
      this.mapTypeFromPersistence(persistenceEntity.type),
      persistenceEntity.isDefault,
      persistenceEntity.createdAt,
      persistenceEntity.version,
    );

    return organization;
  }

  /**
   * 将领域类型映射到持久化类型
   * @param domainType 领域类型
   * @returns 持久化类型
   */
  private static mapTypeToPersistence(
    domainType: OrganizationType,
  ): OrganizationTypeEnum {
    switch (domainType) {
      case OrganizationType.COMMITTEE:
        return OrganizationTypeEnum.COMMITTEE;
      case OrganizationType.PROJECT_TEAM:
        return OrganizationTypeEnum.PROJECT_TEAM;
      case OrganizationType.FUNCTIONAL_DEPARTMENT:
        return OrganizationTypeEnum.FUNCTIONAL_DEPARTMENT;
      case OrganizationType.OTHER:
        return OrganizationTypeEnum.OTHER;
      default:
        return OrganizationTypeEnum.OTHER;
    }
  }

  /**
   * 将持久化类型映射到领域类型
   * @param persistenceType 持久化类型
   * @returns 领域类型
   */
  private static mapTypeFromPersistence(
    persistenceType: OrganizationTypeEnum,
  ): OrganizationType {
    switch (persistenceType) {
      case OrganizationTypeEnum.COMMITTEE:
        return OrganizationType.COMMITTEE;
      case OrganizationTypeEnum.PROJECT_TEAM:
        return OrganizationType.PROJECT_TEAM;
      case OrganizationTypeEnum.FUNCTIONAL_DEPARTMENT:
        return OrganizationType.FUNCTIONAL_DEPARTMENT;
      case OrganizationTypeEnum.OTHER:
        return OrganizationType.OTHER;
      default:
        return OrganizationType.OTHER;
    }
  }
}
