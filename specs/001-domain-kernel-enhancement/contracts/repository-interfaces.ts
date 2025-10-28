/**
 * @fileoverview Repository Interfaces - 仓储接口定义
 * @description 定义数据访问的抽象接口，支持标准CRUD操作、复杂查询和分页
 */

import { EntityId } from "@hl8/domain-kernel";
import { ISpecification } from "../specifications/specification.interface.js";
import { PaginatedResult } from "./paginated-result.interface.js";

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

/**
 * 分页仓储接口
 * @description 提供分页查询功能的数据访问抽象
 * @template T 实体类型
 */
export interface IPaginatedRepository<T> extends IQueryRepository<T> {
  /**
   * 分页查询实体
   * @param spec 查询规范
   * @param page 页码（从1开始）
   * @param limit 每页数量
   * @returns 分页结果
   * @throws {RepositoryException} 当查询失败时抛出
   */
  findPaginated(
    spec: ISpecification<T>,
    page: number,
    limit: number,
  ): Promise<PaginatedResult<T>>;
}

/**
 * 分页结果接口
 * @description 分页查询的结果容器
 * @template T 实体类型
 */
export interface PaginatedResult<T> {
  /** 实体列表 */
  items: T[];
  /** 总数量 */
  totalCount: number;
  /** 当前页码 */
  page: number;
  /** 每页数量 */
  limit: number;
  /** 是否有下一页 */
  hasNext: boolean;
  /** 是否有上一页 */
  hasPrevious: boolean;
  /** 总页数 */
  totalPages: number;
}
