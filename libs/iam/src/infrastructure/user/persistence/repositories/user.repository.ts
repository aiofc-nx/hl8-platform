/**
 * @fileoverview 用户仓储实现
 * @description 使用MikroORM实现用户聚合根的数据访问
 */

import { Injectable } from "@nestjs/common";
import { InjectEntityManager } from "@mikro-orm/nestjs";
import { EntityManager } from "@mikro-orm/core";
import { EntityId } from "@hl8/domain-kernel";
import { IUserRepository } from "../../../../domain/user/repositories/user.repository.interface.js";
import { User } from "../../../../domain/user/aggregates/user.aggregate.js";
import { EmailValueObject } from "../../../../domain/user/value-objects/email.value-object.js";
import { PhoneNumberValueObject } from "../../../../domain/user/value-objects/phone-number.value-object.js";
import { UserPersistenceEntity } from "../entities/user.persistence-entity.js";
import { UserMapper } from "../mappers/user.mapper.js";
import {
  MikroORMRepository,
  ExceptionConverter,
} from "@hl8/infrastructure-kernel";

/**
 * 用户仓储实现
 * @description 使用MikroORM实现IUserRepository接口
 * @note 此仓储在内部使用持久化实体，对外暴露领域实体接口
 */
@Injectable()
export class UserRepository implements IUserRepository {
  private readonly persistenceRepository: MikroORMRepository<UserPersistenceEntity>;
  protected readonly exceptionConverter: ExceptionConverter;
  protected readonly em: EntityManager;

  constructor(@InjectEntityManager("default") em: EntityManager) {
    this.em = em;
    // 创建 persistenceRepository，不传递 exceptionConverter 参数
    // 让 MikroORMRepository 在内部创建（它会处理 new ExceptionConverter()）
    this.persistenceRepository = new MikroORMRepository<UserPersistenceEntity>(
      em,
      UserPersistenceEntity.name,
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
   * 根据ID查找用户
   * @param id 用户ID
   * @returns 用户聚合根或null
   */
  async findById(id: EntityId): Promise<User | null> {
    const persistenceEntity = await this.persistenceRepository.findById(id);
    if (!persistenceEntity) {
      return null;
    }
    return UserMapper.toDomain(persistenceEntity);
  }

  /**
   * 保存用户
   * @param user 用户聚合根
   */
  async save(user: User): Promise<void> {
    // 查找现有实体
    const existingEntity = await this.persistenceRepository.findById(user.id);

    // 转换为持久化实体
    const persistenceEntity = UserMapper.toPersistence(
      user,
      existingEntity || undefined,
    );

    // 保存
    await this.persistenceRepository.save(persistenceEntity);
  }

  /**
   * 删除用户
   * @param id 用户ID
   */
  async delete(id: EntityId): Promise<void> {
    await this.persistenceRepository.delete(id);
  }

  /**
   * 检查用户是否存在
   * @param id 用户ID
   * @returns 是否存在
   */
  async exists(id: EntityId): Promise<boolean> {
    return this.persistenceRepository.exists(id);
  }

  /**
   * 根据邮箱查找用户
   * @param email 邮箱值对象
   * @returns 用户聚合根或null
   */
  async findByEmail(email: EmailValueObject): Promise<User | null> {
    try {
      const persistenceEntity = await this.em.findOne(UserPersistenceEntity, {
        email: email.value,
      });
      if (!persistenceEntity) {
        return null;
      }
      return UserMapper.toDomain(persistenceEntity);
    } catch (error) {
      throw this.exceptionConverter.convertToDomainException(
        error,
        "findByEmail",
        UserPersistenceEntity.name,
        email.value,
      );
    }
  }

  /**
   * 根据手机号查找用户
   * @param phoneNumber 手机号值对象
   * @returns 用户聚合根或null
   */
  async findByPhoneNumber(
    phoneNumber: PhoneNumberValueObject,
  ): Promise<User | null> {
    try {
      const persistenceEntity = await this.em.findOne(UserPersistenceEntity, {
        phoneNumber: phoneNumber.value,
      });
      if (!persistenceEntity) {
        return null;
      }
      return UserMapper.toDomain(persistenceEntity);
    } catch (error) {
      throw this.exceptionConverter.convertToDomainException(
        error,
        "findByPhoneNumber",
        UserPersistenceEntity.name,
        phoneNumber.value,
      );
    }
  }

  /**
   * 检查邮箱是否已存在
   * @param email 邮箱值对象
   * @returns 是否存在
   */
  async existsByEmail(email: EmailValueObject): Promise<boolean> {
    try {
      const count = await this.em.count(UserPersistenceEntity, {
        email: email.value,
      });
      return count > 0;
    } catch (error) {
      throw this.exceptionConverter.convertToDomainException(
        error,
        "existsByEmail",
        UserPersistenceEntity.name,
        email.value,
      );
    }
  }

  /**
   * 检查手机号是否已存在
   * @param phoneNumber 手机号值对象
   * @returns 是否存在
   */
  async existsByPhoneNumber(
    phoneNumber: PhoneNumberValueObject,
  ): Promise<boolean> {
    try {
      const count = await this.em.count(UserPersistenceEntity, {
        phoneNumber: phoneNumber.value,
      });
      return count > 0;
    } catch (error) {
      throw this.exceptionConverter.convertToDomainException(
        error,
        "existsByPhoneNumber",
        UserPersistenceEntity.name,
        phoneNumber.value,
      );
    }
  }
}
