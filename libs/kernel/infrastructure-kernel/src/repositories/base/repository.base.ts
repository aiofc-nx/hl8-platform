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

  /**
   * 查找所有实体
   * @description 返回数据库中所有未删除的实体列表
   * @returns 实体列表
   * @throws {RepositoryOperationFailedException} 当查询失败时抛出
   */
  async findAll(): Promise<T[]> {
    try {
      const entities = await this.em.find(this.entityName, {
        deletedAt: null,
      });
      return entities as T[];
    } catch (error) {
      throw new RepositoryOperationFailedException(
        "findAll",
        this.entityName,
        undefined,
        error instanceof Error ? error : undefined,
      );
    }
  }

  /**
   * 统计实体数量
   * @description 返回数据库中未删除实体的总数
   * @returns 实体数量
   * @throws {RepositoryOperationFailedException} 当统计失败时抛出
   */
  async count(): Promise<number> {
    try {
      const totalCount = await this.em.count(this.entityName, {
        deletedAt: null,
      });
      return totalCount;
    } catch (error) {
      throw new RepositoryOperationFailedException(
        "count",
        this.entityName,
        undefined,
        error instanceof Error ? error : undefined,
      );
    }
  }

  /**
   * 分页查找实体
   * @description 根据页码和每页数量返回分页结果
   * @param page - 页码（从1开始）
   * @param limit - 每页数量
   * @returns 分页结果，包含实体列表和总数
   * @throws {RepositoryOperationFailedException} 当查询失败时抛出
   */
  async findAllPaginated(
    page: number,
    limit: number,
  ): Promise<{
    items: T[];
    totalCount: number;
    page: number;
    limit: number;
    hasNext: boolean;
    hasPrevious: boolean;
    totalPages: number;
  }> {
    // 参数验证：直接抛出错误，不被 catch 捕获
    if (page < 1) {
      throw new Error("页码必须大于等于1");
    }
    if (limit < 1) {
      throw new Error("每页数量必须大于等于1");
    }

    try {
      const offset = (page - 1) * limit;

      const [items, totalCount] = await this.em.findAndCount(
        this.entityName,
        { deletedAt: null },
        {
          limit,
          offset,
        },
      );

      const totalPages = Math.ceil(totalCount / limit);
      const hasNext = page < totalPages;
      const hasPrevious = page > 1;

      return {
        items: items as T[],
        totalCount,
        page,
        limit,
        hasNext,
        hasPrevious,
        totalPages,
      };
    } catch (error) {
      throw new RepositoryOperationFailedException(
        "findAllPaginated",
        this.entityName,
        undefined,
        error instanceof Error ? error : undefined,
      );
    }
  }

  /**
   * 批量保存实体
   * @description 高效地批量保存多个实体，使用单个事务
   * @param entities - 要保存的实体数组
   * @returns Promise<void>
   * @throws {RepositoryOperationFailedException} 当保存失败时抛出
   */
  async saveMany(entities: T[]): Promise<void> {
    try {
      if (!entities || entities.length === 0) {
        return;
      }

      for (const entity of entities) {
        this.em.persist(entity);
      }
      await this.em.flush();
    } catch (error) {
      throw new RepositoryOperationFailedException(
        "saveMany",
        this.entityName,
        undefined,
        error instanceof Error ? error : undefined,
      );
    }
  }

  /**
   * 批量删除实体
   * @description 根据ID数组批量删除实体，使用单个事务
   * @param ids - 要删除的实体ID数组
   * @returns Promise<void>
   * @throws {RepositoryOperationFailedException} 当删除失败时抛出
   */
  async deleteMany(ids: EntityId[]): Promise<void> {
    try {
      if (!ids || ids.length === 0) {
        return;
      }

      for (const id of ids) {
        const entity = await this.findById(id);
        if (entity) {
          await this.em.removeAndFlush(entity);
        }
      }
    } catch (error) {
      throw new RepositoryOperationFailedException(
        "deleteMany",
        this.entityName,
        undefined,
        error instanceof Error ? error : undefined,
      );
    }
  }
}
