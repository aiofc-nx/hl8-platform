/**
 * @fileoverview 组织仓储实现
 * @description 使用MikroORM实现组织聚合根的数据访问
 */

import { Injectable } from "@nestjs/common";
import { InjectEntityManager } from "@mikro-orm/nestjs";
import { EntityManager } from "@mikro-orm/core";
import { EntityId, TenantId, OrganizationId } from "@hl8/domain-kernel";
import { IOrganizationRepository } from "../../../../domain/organization/repositories/organization.repository.interface.js";
import { Organization } from "../../../../domain/organization/aggregates/organization.aggregate.js";
import { OrganizationNameValueObject } from "../../../../domain/organization/value-objects/organization-name.value-object.js";
import { OrganizationPersistenceEntity } from "../entities/organization.persistence-entity.js";
import { OrganizationMapper } from "../mappers/organization.mapper.js";
import {
  MikroORMTenantIsolatedRepository,
  ExceptionConverter,
} from "@hl8/infrastructure-kernel";

/**
 * 组织仓储实现
 * @description 使用MikroORM实现IOrganizationRepository接口
 * @note 此仓储在内部使用持久化实体，对外暴露领域实体接口
 * @note 组织是租户隔离的实体，使用MikroORMTenantIsolatedRepository
 */
@Injectable()
export class OrganizationRepository implements IOrganizationRepository {
  private readonly persistenceRepository: MikroORMTenantIsolatedRepository<OrganizationPersistenceEntity>;
  protected readonly exceptionConverter: ExceptionConverter;
  protected readonly em: EntityManager;

  constructor(@InjectEntityManager("default") em: EntityManager) {
    this.em = em;
    // 创建 persistenceRepository
    // MikroORMTenantIsolatedRepository 构造函数只接受2个参数：em 和 entityName
    this.persistenceRepository =
      new MikroORMTenantIsolatedRepository<OrganizationPersistenceEntity>(
        em,
        OrganizationPersistenceEntity.name,
      );
    // 从 persistenceRepository 获取已创建的 exceptionConverter
    // 使用类型断言访问 protected 属性
    this.exceptionConverter = (
      this.persistenceRepository as unknown as {
        exceptionConverter: ExceptionConverter;
      }
    ).exceptionConverter;
  }

  /**
   * 根据ID查找组织
   * @param id 组织ID（EntityId）
   * @returns 组织聚合根或null
   */
  async findById(id: EntityId): Promise<Organization | null> {
    const persistenceEntity = await this.persistenceRepository.findById(id);
    if (!persistenceEntity) {
      return null;
    }
    return OrganizationMapper.toDomain(persistenceEntity);
  }

  /**
   * 保存组织
   * @param organization 组织聚合根
   */
  async save(organization: Organization): Promise<void> {
    // 查找现有实体
    const existingEntity = await this.persistenceRepository.findById(
      organization.id,
    );

    // 转换为持久化实体
    const persistenceEntity = OrganizationMapper.toPersistence(
      organization,
      existingEntity || undefined,
    );

    // 保存
    await this.persistenceRepository.save(persistenceEntity);
  }

  /**
   * 删除组织
   * @param id 组织ID
   */
  async delete(id: EntityId): Promise<void> {
    await this.persistenceRepository.delete(id);
  }

  /**
   * 检查组织是否存在
   * @param id 组织ID
   * @returns 是否存在
   */
  async exists(id: EntityId): Promise<boolean> {
    return this.persistenceRepository.exists(id);
  }

  /**
   * 根据组织ID查找组织
   * @param organizationId 组织ID值对象
   * @returns 组织聚合根或null
   */
  async findByOrganizationId(
    organizationId: OrganizationId,
  ): Promise<Organization | null> {
    try {
      const entityId = EntityId.fromString(organizationId.value);
      return await this.findById(entityId);
    } catch (error) {
      throw this.exceptionConverter.convertToDomainException(
        error,
        "findByOrganizationId",
        OrganizationPersistenceEntity.name,
        organizationId.value,
      );
    }
  }

  /**
   * 根据租户ID和组织名称查找组织
   * @param tenantId 租户ID
   * @param name 组织名称值对象
   * @returns 组织聚合根或null
   */
  async findByTenantIdAndName(
    tenantId: TenantId,
    name: OrganizationNameValueObject,
  ): Promise<Organization | null> {
    try {
      const persistenceEntity = await this.em.findOne(
        OrganizationPersistenceEntity,
        {
          tenantId: tenantId.value,
          name: name.value,
        },
      );
      if (!persistenceEntity) {
        return null;
      }
      return OrganizationMapper.toDomain(persistenceEntity);
    } catch (error) {
      throw this.exceptionConverter.convertToDomainException(
        error,
        "findByTenantIdAndName",
        OrganizationPersistenceEntity.name,
        `${tenantId.value}, ${name.value}`,
      );
    }
  }

  /**
   * 根据租户ID查找所有组织
   * @param tenantId 租户ID
   * @returns 组织聚合根数组
   */
  async findByTenantId(tenantId: TenantId): Promise<Organization[]> {
    try {
      const persistenceEntities = await this.em.find(
        OrganizationPersistenceEntity,
        {
          tenantId: tenantId.value,
        },
      );
      return persistenceEntities.map((entity) =>
        OrganizationMapper.toDomain(entity),
      );
    } catch (error) {
      throw this.exceptionConverter.convertToDomainException(
        error,
        "findByTenantId",
        OrganizationPersistenceEntity.name,
        tenantId.value,
      );
    }
  }

  /**
   * 检查组织名称在租户内是否已存在
   * @param tenantId 租户ID
   * @param name 组织名称值对象
   * @returns 是否存在
   */
  async existsByTenantIdAndName(
    tenantId: TenantId,
    name: OrganizationNameValueObject,
  ): Promise<boolean> {
    try {
      const count = await this.em.count(OrganizationPersistenceEntity, {
        tenantId: tenantId.value,
        name: name.value,
      });
      return count > 0;
    } catch (error) {
      throw this.exceptionConverter.convertToDomainException(
        error,
        "existsByTenantIdAndName",
        OrganizationPersistenceEntity.name,
        `${tenantId.value}, ${name.value}`,
      );
    }
  }

  /**
   * 统计租户内的组织数量
   * @param tenantId 租户ID
   * @returns 组织数量
   */
  async countByTenantId(tenantId: TenantId): Promise<number> {
    try {
      return await this.em.count(OrganizationPersistenceEntity, {
        tenantId: tenantId.value,
      });
    } catch (error) {
      throw this.exceptionConverter.convertToDomainException(
        error,
        "countByTenantId",
        OrganizationPersistenceEntity.name,
        tenantId.value,
      );
    }
  }
}
