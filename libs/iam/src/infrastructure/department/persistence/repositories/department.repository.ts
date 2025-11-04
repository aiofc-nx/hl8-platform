/**
 * @fileoverview 部门仓储实现
 * @description 使用MikroORM实现部门聚合根的数据访问
 */

import { Injectable } from "@nestjs/common";
import { InjectEntityManager } from "@mikro-orm/nestjs";
import { EntityManager } from "@mikro-orm/core";
import { EntityId, OrganizationId, DepartmentId } from "@hl8/domain-kernel";
import { IDepartmentRepository } from "../../../../domain/department/repositories/department.repository.interface.js";
import { Department } from "../../../../domain/department/aggregates/department.aggregate.js";
import { DepartmentNameValueObject } from "../../../../domain/department/value-objects/department-name.value-object.js";
import { DepartmentPersistenceEntity } from "../entities/department.persistence-entity.js";
import { DepartmentMapper } from "../mappers/department.mapper.js";
import {
  MikroORMTenantIsolatedRepository,
  ExceptionConverter,
} from "@hl8/infrastructure-kernel";

/**
 * 部门仓储实现
 * @description 使用MikroORM实现IDepartmentRepository接口
 * @note 此仓储在内部使用持久化实体，对外暴露领域实体接口
 * @note 部门是租户隔离的实体，使用MikroORMTenantIsolatedRepository
 */
@Injectable()
export class DepartmentRepository implements IDepartmentRepository {
  private readonly persistenceRepository: MikroORMTenantIsolatedRepository<DepartmentPersistenceEntity>;
  protected readonly exceptionConverter: ExceptionConverter;
  protected readonly em: EntityManager;

  constructor(@InjectEntityManager("default") em: EntityManager) {
    this.em = em;
    // 创建 persistenceRepository
    // MikroORMTenantIsolatedRepository 构造函数只接受2个参数：em 和 entityName
    this.persistenceRepository =
      new MikroORMTenantIsolatedRepository<DepartmentPersistenceEntity>(
        em,
        DepartmentPersistenceEntity.name,
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
   * 根据ID查找部门
   * @param id 部门ID（EntityId）
   * @returns 部门聚合根或null
   */
  async findById(id: EntityId): Promise<Department | null> {
    const persistenceEntity = await this.persistenceRepository.findById(id);
    if (!persistenceEntity) {
      return null;
    }
    return DepartmentMapper.toDomain(persistenceEntity);
  }

  /**
   * 保存部门
   * @param department 部门聚合根
   */
  async save(department: Department): Promise<void> {
    // 查找现有实体
    const existingEntity = await this.persistenceRepository.findById(
      department.id,
    );

    // 转换为持久化实体
    const persistenceEntity = DepartmentMapper.toPersistence(
      department,
      existingEntity || undefined,
    );

    // 保存
    await this.persistenceRepository.save(persistenceEntity);
  }

  /**
   * 删除部门
   * @param id 部门ID
   */
  async delete(id: EntityId): Promise<void> {
    await this.persistenceRepository.delete(id);
  }

  /**
   * 检查部门是否存在
   * @param id 部门ID
   * @returns 是否存在
   */
  async exists(id: EntityId): Promise<boolean> {
    return this.persistenceRepository.exists(id);
  }

  /**
   * 根据部门ID查找部门
   * @param departmentId 部门ID值对象
   * @returns 部门聚合根或null
   */
  async findByDepartmentId(
    departmentId: DepartmentId,
  ): Promise<Department | null> {
    try {
      const entityId = EntityId.fromString(departmentId.value);
      return await this.findById(entityId);
    } catch (error) {
      throw this.exceptionConverter.convertToDomainException(
        error,
        "findByDepartmentId",
        DepartmentPersistenceEntity.name,
        departmentId.value,
      );
    }
  }

  /**
   * 根据组织ID和部门名称查找部门
   * @param organizationId 组织ID
   * @param name 部门名称值对象
   * @returns 部门聚合根或null
   */
  async findByOrganizationIdAndName(
    organizationId: OrganizationId,
    name: DepartmentNameValueObject,
  ): Promise<Department | null> {
    try {
      const persistenceEntity = await this.em.findOne(
        DepartmentPersistenceEntity,
        {
          organizationId: organizationId.value,
          name: name.value,
        },
      );
      if (!persistenceEntity) {
        return null;
      }
      return DepartmentMapper.toDomain(persistenceEntity);
    } catch (error) {
      throw this.exceptionConverter.convertToDomainException(
        error,
        "findByOrganizationIdAndName",
        DepartmentPersistenceEntity.name,
        `${organizationId.value}, ${name.value}`,
      );
    }
  }

  /**
   * 根据组织ID查找所有部门
   * @param organizationId 组织ID
   * @returns 部门聚合根数组
   */
  async findByOrganizationId(
    organizationId: OrganizationId,
  ): Promise<Department[]> {
    try {
      const persistenceEntities = await this.em.find(
        DepartmentPersistenceEntity,
        {
          organizationId: organizationId.value,
        },
      );
      return persistenceEntities.map((entity) =>
        DepartmentMapper.toDomain(entity),
      );
    } catch (error) {
      throw this.exceptionConverter.convertToDomainException(
        error,
        "findByOrganizationId",
        DepartmentPersistenceEntity.name,
        organizationId.value,
      );
    }
  }

  /**
   * 根据组织ID查找根部门
   * @param organizationId 组织ID
   * @returns 根部门聚合根或null
   */
  async findRootByOrganizationId(
    organizationId: OrganizationId,
  ): Promise<Department | null> {
    try {
      const persistenceEntity = await this.em.findOne(
        DepartmentPersistenceEntity,
        {
          organizationId: organizationId.value,
          isRoot: true,
        },
      );
      if (!persistenceEntity) {
        return null;
      }
      return DepartmentMapper.toDomain(persistenceEntity);
    } catch (error) {
      throw this.exceptionConverter.convertToDomainException(
        error,
        "findRootByOrganizationId",
        DepartmentPersistenceEntity.name,
        organizationId.value,
      );
    }
  }

  /**
   * 检查部门名称在组织内是否已存在
   * @param organizationId 组织ID
   * @param name 部门名称值对象
   * @returns 是否存在
   */
  async existsByOrganizationIdAndName(
    organizationId: OrganizationId,
    name: DepartmentNameValueObject,
  ): Promise<boolean> {
    try {
      const count = await this.em.count(DepartmentPersistenceEntity, {
        organizationId: organizationId.value,
        name: name.value,
      });
      return count > 0;
    } catch (error) {
      throw this.exceptionConverter.convertToDomainException(
        error,
        "existsByOrganizationIdAndName",
        DepartmentPersistenceEntity.name,
        `${organizationId.value}, ${name.value}`,
      );
    }
  }
}
