/**
 * @fileoverview Repository Interfaces - 仓储接口定义
 * @description 定义数据访问的抽象接口，支持标准CRUD操作、复杂查询和分页
 */

import { EntityId } from "../identifiers/entity-id.js";

/**
 * 基础仓储接口
 * @description 提供标准CRUD操作的数据访问抽象
 * @template T 实体类型
 */
export interface IRepository<T> {
  /**
   * 根据ID查找实体
   * @param id 实体标识符
   * @returns 实体实例或null
   * @throws {RepositoryException} 当查找失败时抛出
   */
  findById(id: EntityId): Promise<T | null>;

  /**
   * 保存实体
   * @param entity 要保存的实体
   * @returns Promise<void>
   * @throws {RepositoryException} 当保存失败时抛出
   */
  save(entity: T): Promise<void>;

  /**
   * 删除实体
   * @param id 实体标识符
   * @returns Promise<void>
   * @throws {RepositoryException} 当删除失败时抛出
   */
  delete(id: EntityId): Promise<void>;

  /**
   * 检查实体是否存在
   * @param id 实体标识符
   * @returns 是否存在
   * @throws {RepositoryException} 当检查失败时抛出
   */
  exists(id: EntityId): Promise<boolean>;
}
