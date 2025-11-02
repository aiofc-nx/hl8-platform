/**
 * @fileoverview 仓储工厂实现
 * @description 提供仓储实例创建和实体映射器管理功能
 */

import { Injectable } from "@nestjs/common";
import { EntityManager } from "@mikro-orm/core";
import {
  IRepository,
  ITenantIsolatedRepository,
  TenantIsolatedEntity,
} from "@hl8/domain-kernel";
import { IRepositoryFactory } from "./repository-factory.interface.js";
import { IEntityMapper } from "../../mappers/entity-mapper.interface.js";
import { MikroORMRepository } from "../base/repository.base.js";
import { MikroORMTenantIsolatedRepository } from "../tenant-isolated/tenant-isolated-repository.js";
import { BaseEntity } from "../../entities/base/base-entity.js";
import { TenantIsolatedPersistenceEntity } from "../../entities/base/tenant-isolated-persistence-entity.js";

/**
 * 仓储工厂实现
 * @description 提供仓储实例创建和实体映射器管理功能，支持 NestJS 依赖注入
 */
@Injectable()
export class RepositoryFactory implements IRepositoryFactory {
  /**
   * 实体映射器注册表
   * @description 存储实体类名称到映射器实例的映射
   */
  private readonly mapperRegistry = new Map<string, IEntityMapper<any, any>>();

  /**
   * 创建仓储工厂实例
   * @param em MikroORM EntityManager 实例
   */
  constructor(private readonly em: EntityManager) {
    if (!em) {
      throw new Error("EntityManager不能为空");
    }
  }

  /**
   * 创建基础仓储实例
   * @description 为普通实体创建基础仓储，实现 IRepository 接口
   * @template T 持久化实体类型，必须继承 BaseEntity
   * @param entityClass 实体类构造函数
   * @param entityName 实体类名称
   * @returns 仓储实例
   */
  createRepository<T extends BaseEntity>(
    entityClass: new (...args: any[]) => T,
    entityName: string,
  ): IRepository<T> {
    if (!entityClass) {
      throw new Error("实体类不能为空");
    }
    if (!entityName) {
      throw new Error("实体类名称不能为空");
    }

    // 验证实体类是否继承自 BaseEntity
    const prototype = Object.getPrototypeOf(entityClass.prototype);
    if (!prototype || prototype.constructor !== BaseEntity) {
      throw new Error(`实体类 ${entityName} 必须继承自 BaseEntity`);
    }

    return new MikroORMRepository<T>(this.em, entityName);
  }

  /**
   * 创建租户隔离仓储实例
   * @description 为租户隔离实体创建仓储，实现 ITenantIsolatedRepository 接口
   * @template T 持久化实体类型，必须继承 TenantIsolatedPersistenceEntity
   * @template TDomain 领域实体类型，必须实现 TenantIsolatedEntity 接口
   * @param entityClass 实体类构造函数
   * @param entityName 实体类名称
   * @returns 租户隔离仓储实例
   */
  createTenantIsolatedRepository<
    T extends TenantIsolatedPersistenceEntity,
    TDomain extends TenantIsolatedEntity = TenantIsolatedEntity,
  >(
    entityClass: new (...args: any[]) => T,
    entityName: string,
  ): ITenantIsolatedRepository<TDomain> {
    if (!entityClass) {
      throw new Error("实体类不能为空");
    }
    if (!entityName) {
      throw new Error("实体类名称不能为空");
    }

    // 验证实体类是否继承自 TenantIsolatedPersistenceEntity
    const prototype = Object.getPrototypeOf(entityClass.prototype);
    if (
      !prototype ||
      prototype.constructor !== TenantIsolatedPersistenceEntity
    ) {
      throw new Error(
        `实体类 ${entityName} 必须继承自 TenantIsolatedPersistenceEntity`,
      );
    }

    return new MikroORMTenantIsolatedRepository<T, TDomain>(
      this.em,
      entityName,
    ) as unknown as ITenantIsolatedRepository<TDomain>;
  }

  /**
   * 注册实体映射器
   * @description 注册领域实体和持久化实体之间的映射器
   * @template TDomain 领域实体类型
   * @template TPersistence 持久化实体类型
   * @param entityName 实体类名称
   * @param mapper 实体映射器实例
   */
  registerMapper<TDomain, TPersistence extends BaseEntity>(
    entityName: string,
    mapper: IEntityMapper<TDomain, TPersistence>,
  ): void {
    if (!entityName) {
      throw new Error("实体类名称不能为空");
    }
    if (!mapper) {
      throw new Error("映射器不能为空");
    }

    this.mapperRegistry.set(entityName, mapper);
  }

  /**
   * 获取实体映射器
   * @description 获取指定实体的映射器
   * @template TDomain 领域实体类型
   * @template TPersistence 持久化实体类型
   * @param entityName 实体类名称
   * @returns 实体映射器实例，如果不存在则返回 null
   */
  getMapper<TDomain, TPersistence extends BaseEntity>(
    entityName: string,
  ): IEntityMapper<TDomain, TPersistence> | null {
    if (!entityName) {
      return null;
    }

    const mapper = this.mapperRegistry.get(entityName);
    return mapper as IEntityMapper<TDomain, TPersistence> | null;
  }
}
