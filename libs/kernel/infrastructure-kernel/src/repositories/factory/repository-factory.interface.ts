/**
 * @fileoverview 仓储工厂接口
 * @description 定义仓储工厂的核心接口，支持创建不同类型的仓储实例
 */

import {
  IRepository,
  ITenantIsolatedRepository,
  TenantIsolatedEntity,
} from "@hl8/domain-kernel";
import { IEntityMapper } from "../../mappers/entity-mapper.interface.js";
import { BaseEntity } from "../../entities/base/base-entity.js";
import { TenantIsolatedPersistenceEntity } from "../../entities/base/tenant-isolated-persistence-entity.js";

/**
 * 仓储工厂接口
 * @description 提供创建仓储实例和获取实体映射器的功能
 */
export interface IRepositoryFactory {
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
  ): IRepository<T>;

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
  ): ITenantIsolatedRepository<TDomain>;

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
  ): void;

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
  ): IEntityMapper<TDomain, TPersistence> | null;
}
