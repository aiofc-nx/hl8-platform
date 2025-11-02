/**
 * @fileoverview 规范转换器接口
 * @description 定义将 domain-kernel 规范转换为 MikroORM 查询的接口
 */

import { EntityManager } from "@mikro-orm/core";
import { ISpecification } from "@hl8/domain-kernel";
import { QueryCriteria } from "@hl8/domain-kernel";

/**
 * MikroORM查询选项
 * @description 用于构建MikroORM查询的选项
 */
export interface MikroORMQueryOptions {
  /** 查询条件对象 */
  where?: Record<string, any>;
  /** 排序选项 */
  orderBy?: Record<string, "asc" | "desc"> | Array<Record<string, "asc" | "desc">>;
  /** 限制数量 */
  limit?: number;
  /** 偏移量 */
  offset?: number;
  /** 字段选择 */
  fields?: string[];
  /** 是否去重 */
  distinct?: boolean;
}

/**
 * 规范转换器接口
 * @description 将 domain-kernel 的规范转换为 MikroORM 查询条件
 */
export interface ISpecificationConverter {
  /**
   * 将规范转换为查询条件
   * @description 将 ISpecification 转换为 MikroORM 查询选项
   * @param spec 规范实例
   * @param entityName 实体名称
   * @returns MikroORM查询选项
   * @throws {Error} 当规范嵌套层级超过限制或转换失败时抛出
   */
  convertToQuery<T>(
    spec: ISpecification<T>,
    entityName: string,
  ): MikroORMQueryOptions;

  /**
   * 将QueryCriteria转换为查询条件
   * @description 将QueryCriteria转换为MikroORM查询选项
   * @param criteria 查询条件
   * @returns MikroORM查询选项
   */
  convertCriteriaToQuery(criteria: QueryCriteria): MikroORMQueryOptions;

  /**
   * 获取规范的嵌套深度
   * @description 计算规范的嵌套层级，用于验证是否超过限制
   * @param spec 规范实例
   * @returns 嵌套深度
   */
  getNestingDepth<T>(spec: ISpecification<T>): number;
}

