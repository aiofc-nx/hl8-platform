/**
 * @fileoverview Command Repository Interface - 命令仓储接口
 * @description 提供命令操作的数据访问抽象，支持CQRS模式
 */

import { IRepository } from "./repository.interface.js";
import { EntityId } from "../identifiers/entity-id.js";

/**
 * 命令仓储接口
 * @description 提供命令操作的数据访问抽象，支持CQRS模式
 * @template T 实体类型
 */
export interface ICommandRepository<T> extends IRepository<T> {
  /**
   * 保存实体并发布领域事件
   * @param entity 要保存的实体
   * @returns Promise<void>
   * @throws {RepositoryException} 当保存失败时抛出
   */
  saveAndPublishEvents(entity: T): Promise<void>;

  /**
   * 删除实体并发布领域事件
   * @param id 实体标识符
   * @returns Promise<void>
   * @throws {RepositoryException} 当删除失败时抛出
   */
  deleteAndPublishEvents(id: EntityId): Promise<void>;
}
