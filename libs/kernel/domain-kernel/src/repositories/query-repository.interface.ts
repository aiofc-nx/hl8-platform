/**
 * @fileoverview Query Repository Interface - 查询仓储接口
 * @description 提供复杂查询功能的数据访问抽象
 */

import { IRepository } from "./repository.interface.js";
import { ISpecification } from "../specifications/specification.interface.js";

/**
 * 查询仓储接口
 * @description 提供复杂查询功能的数据访问抽象
 * @template T 实体类型
 */
export interface IQueryRepository<T> extends IRepository<T> {
  /**
   * 根据规范查找实体列表
   * @param spec 查询规范
   * @returns 实体列表
   * @throws {RepositoryException} 当查询失败时抛出
   */
  findBySpecification(spec: ISpecification<T>): Promise<T[]>;

  /**
   * 根据规范查找单个实体
   * @param spec 查询规范
   * @returns 实体实例或null
   * @throws {RepositoryException} 当查询失败时抛出
   */
  findOneBySpecification(spec: ISpecification<T>): Promise<T | null>;

  /**
   * 根据规范统计实体数量
   * @param spec 查询规范
   * @returns 实体数量
   * @throws {RepositoryException} 当统计失败时抛出
   */
  countBySpecification(spec: ISpecification<T>): Promise<number>;
}
