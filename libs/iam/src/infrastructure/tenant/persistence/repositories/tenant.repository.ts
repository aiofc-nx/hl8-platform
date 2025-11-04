/**
 * @fileoverview 租户仓储实现
 * @description 使用MikroORM实现租户聚合根的数据访问
 */

import { Injectable } from "@nestjs/common";
import { InjectEntityManager } from "@mikro-orm/nestjs";
import { EntityManager } from "@mikro-orm/core";
import { EntityId, TenantId } from "@hl8/domain-kernel";
import { ITenantRepository } from "../../../../domain/tenant/repositories/tenant.repository.interface.js";
import { Tenant } from "../../../../domain/tenant/aggregates/tenant.aggregate.js";
import { TenantCodeValueObject } from "../../../../domain/tenant/value-objects/tenant-code.value-object.js";
import { TenantDomainValueObject } from "../../../../domain/tenant/value-objects/tenant-domain.value-object.js";
import { TenantPersistenceEntity } from "../entities/tenant.persistence-entity.js";
import { TenantMapper } from "../mappers/tenant.mapper.js";
import {
  MikroORMRepository,
  ExceptionConverter,
} from "@hl8/infrastructure-kernel";

/**
 * 租户仓储实现
 * @description 使用MikroORM实现ITenantRepository接口
 * @note 此仓储在内部使用持久化实体，对外暴露领域实体接口
 * @note 租户是平台级别的实体，不需要租户隔离，使用标准的MikroORMRepository
 */
@Injectable()
export class TenantRepository implements ITenantRepository {
  private readonly persistenceRepository: MikroORMRepository<TenantPersistenceEntity>;
  protected readonly exceptionConverter: ExceptionConverter;
  protected readonly em: EntityManager;

  constructor(@InjectEntityManager("default") em: EntityManager) {
    this.em = em;
    // 创建 persistenceRepository，不传递 exceptionConverter 参数
    // 让 MikroORMRepository 在内部创建（它会处理 new ExceptionConverter()）
    this.persistenceRepository =
      new MikroORMRepository<TenantPersistenceEntity>(
        em,
        TenantPersistenceEntity.name,
        undefined, // 显式传递 undefined，让基类创建默认实例
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
   * 根据ID查找租户
   * @param id 租户ID（EntityId）
   * @returns 租户聚合根或null
   */
  async findById(id: EntityId): Promise<Tenant | null> {
    const persistenceEntity = await this.persistenceRepository.findById(id);
    if (!persistenceEntity) {
      return null;
    }
    return TenantMapper.toDomain(persistenceEntity);
  }

  /**
   * 保存租户
   * @param tenant 租户聚合根
   */
  async save(tenant: Tenant): Promise<void> {
    // 查找现有实体
    const existingEntity = await this.persistenceRepository.findById(tenant.id);

    // 转换为持久化实体
    const persistenceEntity = TenantMapper.toPersistence(
      tenant,
      existingEntity || undefined,
    );

    // 保存
    await this.persistenceRepository.save(persistenceEntity);
  }

  /**
   * 删除租户
   * @param id 租户ID
   */
  async delete(id: EntityId): Promise<void> {
    await this.persistenceRepository.delete(id);
  }

  /**
   * 检查租户是否存在
   * @param id 租户ID
   * @returns 是否存在
   */
  async exists(id: EntityId): Promise<boolean> {
    return this.persistenceRepository.exists(id);
  }

  /**
   * 根据租户代码查找租户
   * @param code 租户代码值对象
   * @returns 租户聚合根或null
   */
  async findByCode(code: TenantCodeValueObject): Promise<Tenant | null> {
    try {
      const persistenceEntity = await this.em.findOne(TenantPersistenceEntity, {
        code: code.value,
      });
      if (!persistenceEntity) {
        return null;
      }
      return TenantMapper.toDomain(persistenceEntity);
    } catch (error) {
      throw this.exceptionConverter.convertToDomainException(
        error,
        "findByCode",
        TenantPersistenceEntity.name,
        code.value,
      );
    }
  }

  /**
   * 根据租户域名查找租户
   * @param domain 租户域名值对象
   * @returns 租户聚合根或null
   */
  async findByDomain(domain: TenantDomainValueObject): Promise<Tenant | null> {
    try {
      const persistenceEntity = await this.em.findOne(TenantPersistenceEntity, {
        domain: domain.value,
      });
      if (!persistenceEntity) {
        return null;
      }
      return TenantMapper.toDomain(persistenceEntity);
    } catch (error) {
      throw this.exceptionConverter.convertToDomainException(
        error,
        "findByDomain",
        TenantPersistenceEntity.name,
        domain.value,
      );
    }
  }

  /**
   * 根据租户ID查找租户
   * @param tenantId 租户ID值对象
   * @returns 租户聚合根或null
   */
  async findByTenantId(tenantId: TenantId): Promise<Tenant | null> {
    try {
      const entityId = EntityId.fromString(tenantId.value);
      return await this.findById(entityId);
    } catch (error) {
      throw this.exceptionConverter.convertToDomainException(
        error,
        "findByTenantId",
        TenantPersistenceEntity.name,
        tenantId.value,
      );
    }
  }

  /**
   * 检查租户代码是否已存在
   * @param code 租户代码值对象
   * @returns 是否存在
   */
  async existsByCode(code: TenantCodeValueObject): Promise<boolean> {
    try {
      const count = await this.em.count(TenantPersistenceEntity, {
        code: code.value,
      });
      return count > 0;
    } catch (error) {
      throw this.exceptionConverter.convertToDomainException(
        error,
        "existsByCode",
        TenantPersistenceEntity.name,
        code.value,
      );
    }
  }

  /**
   * 检查租户域名是否已存在
   * @param domain 租户域名值对象
   * @returns 是否存在
   */
  async existsByDomain(domain: TenantDomainValueObject): Promise<boolean> {
    try {
      const count = await this.em.count(TenantPersistenceEntity, {
        domain: domain.value,
      });
      return count > 0;
    } catch (error) {
      throw this.exceptionConverter.convertToDomainException(
        error,
        "existsByDomain",
        TenantPersistenceEntity.name,
        domain.value,
      );
    }
  }
}
