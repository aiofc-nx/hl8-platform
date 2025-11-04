/**
 * @fileoverview 用户分配仓储实现
 * @description 使用MikroORM实现用户分配聚合根的数据访问
 */

import { Injectable } from "@nestjs/common";
import { InjectEntityManager } from "@mikro-orm/nestjs";
import { EntityManager } from "@mikro-orm/core";
import { EntityId, TenantId } from "@hl8/domain-kernel";
import { IUserAssignmentRepository } from "../../../../domain/user/repositories/user-assignment.repository.interface.js";
import { UserAssignment } from "../../../../domain/user/aggregates/user-assignment.aggregate.js";
import { UserAssignmentPersistenceEntity } from "../entities/user-assignment.persistence-entity.js";
import { UserAssignmentMapper } from "../mappers/user-assignment.mapper.js";
import {
  MikroORMTenantIsolatedRepository,
  ExceptionConverter,
} from "@hl8/infrastructure-kernel";

/**
 * 用户分配仓储实现
 * @description 使用MikroORM实现IUserAssignmentRepository接口
 * @note 此仓储在内部使用持久化实体，对外暴露领域实体接口
 * @note 用户分配是租户隔离的实体，使用MikroORMTenantIsolatedRepository
 */
@Injectable()
export class UserAssignmentRepository implements IUserAssignmentRepository {
  private readonly persistenceRepository: MikroORMTenantIsolatedRepository<UserAssignmentPersistenceEntity>;
  protected readonly exceptionConverter: ExceptionConverter;
  protected readonly em: EntityManager;

  constructor(@InjectEntityManager("default") em: EntityManager) {
    this.em = em;
    // 创建 persistenceRepository
    // MikroORMTenantIsolatedRepository 构造函数只接受2个参数：em 和 entityName
    this.persistenceRepository =
      new MikroORMTenantIsolatedRepository<UserAssignmentPersistenceEntity>(
        em,
        UserAssignmentPersistenceEntity.name,
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
   * 根据ID查找用户分配
   * @param id 分配ID（EntityId）
   * @returns 用户分配聚合根或null
   */
  async findById(id: EntityId): Promise<UserAssignment | null> {
    try {
      const persistenceEntity = await this.persistenceRepository.findById(id);
      if (!persistenceEntity) {
        return null;
      }

      // 加载关联实体（租户分配、组织分配、部门分配、邀请）
      await this.em.populate(persistenceEntity, [
        "tenantAssignments",
        "organizationAssignments",
        "departmentAssignments",
        "invitations",
      ]);

      return UserAssignmentMapper.toDomain(persistenceEntity);
    } catch (error) {
      throw this.exceptionConverter.convertToDomainException(
        error,
        "findById",
        UserAssignmentPersistenceEntity.name,
        id.value,
      );
    }
  }

  /**
   * 保存用户分配
   * @param assignment 用户分配聚合根
   */
  async save(assignment: UserAssignment): Promise<void> {
    try {
      // 查找现有实体
      const existingEntity = await this.persistenceRepository.findById(
        assignment.id,
      );

      // 转换为持久化实体
      const persistenceEntity = UserAssignmentMapper.toPersistence(
        assignment,
        existingEntity || undefined,
      );

      // 保存（包括关联实体）
      await this.persistenceRepository.save(persistenceEntity);
    } catch (error) {
      throw this.exceptionConverter.convertToDomainException(
        error,
        "save",
        UserAssignmentPersistenceEntity.name,
        assignment.id.value,
      );
    }
  }

  /**
   * 删除用户分配
   * @param id 分配ID
   */
  async delete(id: EntityId): Promise<void> {
    try {
      await this.persistenceRepository.delete(id);
    } catch (error) {
      throw this.exceptionConverter.convertToDomainException(
        error,
        "delete",
        UserAssignmentPersistenceEntity.name,
        id.value,
      );
    }
  }

  /**
   * 检查用户分配是否存在
   * @param id 分配ID
   * @returns 是否存在
   */
  async exists(id: EntityId): Promise<boolean> {
    try {
      return this.persistenceRepository.exists(id);
    } catch (error) {
      throw this.exceptionConverter.convertToDomainException(
        error,
        "exists",
        UserAssignmentPersistenceEntity.name,
        id.value,
      );
    }
  }

  /**
   * 根据用户ID和租户ID查找用户分配
   * @param userId 用户ID
   * @param tenantId 租户ID
   * @returns 用户分配聚合根，如果不存在则返回null
   */
  async findByUserIdAndTenantId(
    userId: EntityId,
    tenantId: TenantId,
  ): Promise<UserAssignment | null> {
    try {
      const persistenceEntity = await this.em.findOne(
        UserAssignmentPersistenceEntity,
        {
          userId: userId.value,
          tenantId: tenantId.value,
        },
      );

      if (!persistenceEntity) {
        return null;
      }

      // 加载关联实体
      await this.em.populate(persistenceEntity, [
        "tenantAssignments",
        "organizationAssignments",
        "departmentAssignments",
        "invitations",
      ]);

      return UserAssignmentMapper.toDomain(persistenceEntity);
    } catch (error) {
      throw this.exceptionConverter.convertToDomainException(
        error,
        "findByUserIdAndTenantId",
        UserAssignmentPersistenceEntity.name,
        `${userId.value}, ${tenantId.value}`,
      );
    }
  }

  /**
   * 根据用户ID查找所有用户分配
   * @param userId 用户ID
   * @returns 用户分配聚合根数组
   */
  async findByUserId(userId: EntityId): Promise<UserAssignment[]> {
    try {
      const persistenceEntities = await this.em.find(
        UserAssignmentPersistenceEntity,
        {
          userId: userId.value,
        },
      );

      // 加载关联实体
      for (const entity of persistenceEntities) {
        await this.em.populate(entity, [
          "tenantAssignments",
          "organizationAssignments",
          "departmentAssignments",
          "invitations",
        ]);
      }

      return persistenceEntities.map((entity) =>
        UserAssignmentMapper.toDomain(entity),
      );
    } catch (error) {
      throw this.exceptionConverter.convertToDomainException(
        error,
        "findByUserId",
        UserAssignmentPersistenceEntity.name,
        userId.value,
      );
    }
  }

  /**
   * 根据租户ID查找所有用户分配
   * @param tenantId 租户ID
   * @returns 用户分配聚合根数组
   */
  async findByTenantId(tenantId: TenantId): Promise<UserAssignment[]> {
    try {
      const persistenceEntities = await this.em.find(
        UserAssignmentPersistenceEntity,
        {
          tenantId: tenantId.value,
        },
      );

      // 加载关联实体
      for (const entity of persistenceEntities) {
        await this.em.populate(entity, [
          "tenantAssignments",
          "organizationAssignments",
          "departmentAssignments",
          "invitations",
        ]);
      }

      return persistenceEntities.map((entity) =>
        UserAssignmentMapper.toDomain(entity),
      );
    } catch (error) {
      throw this.exceptionConverter.convertToDomainException(
        error,
        "findByTenantId",
        UserAssignmentPersistenceEntity.name,
        tenantId.value,
      );
    }
  }

  /**
   * 检查用户是否已分配到租户
   * @param userId 用户ID
   * @param tenantId 租户ID
   * @returns 是否已分配
   */
  async existsByUserIdAndTenantId(
    userId: EntityId,
    tenantId: TenantId,
  ): Promise<boolean> {
    try {
      const count = await this.em.count(UserAssignmentPersistenceEntity, {
        userId: userId.value,
        tenantId: tenantId.value,
      });
      return count > 0;
    } catch (error) {
      throw this.exceptionConverter.convertToDomainException(
        error,
        "existsByUserIdAndTenantId",
        UserAssignmentPersistenceEntity.name,
        `${userId.value}, ${tenantId.value}`,
      );
    }
  }
}
