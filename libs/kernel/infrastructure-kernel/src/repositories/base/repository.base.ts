/**
 * @fileoverview MikroORM基础仓储实现
 * @description 提供标准化的PostgreSQL和MongoDB仓储实现，实现IRepository接口
 */

import { EntityManager } from "@mikro-orm/core";
import {
  IRepository,
  EntityId,
  RepositoryOperationFailedException,
} from "@hl8/domain-kernel";
import { BaseEntity } from "../../entities/base/base-entity.js";

/**
 * MikroORM基础仓储实现
 * @description 使用MikroORM EntityManager实现IRepository接口，支持PostgreSQL和MongoDB
 * @template T 实体类型，必须继承BaseEntity
 */
export class MikroORMRepository<T extends BaseEntity>
  implements IRepository<T>
{
  /**
   * 创建仓储实例
   * @param em - MikroORM EntityManager实例
   * @param entityName - 实体类名称
   */
  constructor(
    protected readonly em: EntityManager,
    protected readonly entityName: string,
  ) {
    if (!em) {
      throw new Error("EntityManager不能为空");
    }
    if (!entityName) {
      throw new Error("实体类名称不能为空");
    }
  }

  /**
   * 根据ID查找实体
   * @param id - 实体标识符
   * @returns 实体实例或null
   * @throws {RepositoryOperationFailedException} 当查找失败时抛出
   */
  async findById(id: EntityId): Promise<T | null> {
    try {
      const entity = await this.em.findOne(this.entityName, { id: id.value });
      return entity as T | null;
    } catch (error) {
      throw new RepositoryOperationFailedException(
        "findById",
        this.entityName,
        id.value,
        error instanceof Error ? error : undefined,
      );
    }
  }

  /**
   * 保存实体
   * @param entity - 要保存的实体
   * @returns Promise<void>
   * @throws {RepositoryOperationFailedException} 当保存失败时抛出
   */
  async save(entity: T): Promise<void> {
    try {
      this.em.persist(entity);
      await this.em.flush();
    } catch (error) {
      throw new RepositoryOperationFailedException(
        "save",
        this.entityName,
        entity.id,
        error instanceof Error ? error : undefined,
      );
    }
  }

  /**
   * 删除实体
   * @param id - 实体标识符
   * @returns Promise<void>
   * @throws {RepositoryOperationFailedException} 当删除失败时抛出
   */
  async delete(id: EntityId): Promise<void> {
    try {
      const entity = await this.findById(id);
      if (!entity) {
        return;
      }
      await this.em.removeAndFlush(entity);
    } catch (error) {
      throw new RepositoryOperationFailedException(
        "delete",
        this.entityName,
        id.value,
        error instanceof Error ? error : undefined,
      );
    }
  }

  /**
   * 检查实体是否存在
   * @param id - 实体标识符
   * @returns 是否存在
   * @throws {RepositoryOperationFailedException} 当检查失败时抛出
   */
  async exists(id: EntityId): Promise<boolean> {
    try {
      const count = await this.em.count(this.entityName, { id: id.value });
      return count > 0;
    } catch (error) {
      throw new RepositoryOperationFailedException(
        "exists",
        this.entityName,
        id.value,
        error instanceof Error ? error : undefined,
      );
    }
  }
}
