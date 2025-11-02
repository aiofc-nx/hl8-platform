/**
 * @fileoverview 规范转换器实现
 * @description 将 domain-kernel 的规范转换为 MikroORM 查询条件
 */

import {
  ISpecification,
  IQuerySpecification,
  QueryCriteria,
  QueryCondition,
  QueryOperator,
} from "@hl8/domain-kernel";
import {
  ISpecificationConverter,
  MikroORMQueryOptions,
} from "./specification-converter.interface.js";
import { AndSpecification } from "@hl8/domain-kernel";
import { OrSpecification } from "@hl8/domain-kernel";
import { NotSpecification } from "@hl8/domain-kernel";

/**
 * 最大嵌套深度
 */
const MAX_NESTING_DEPTH = 5;

/**
 * 规范转换器实现
 * @description 将 domain-kernel 的规范转换为 MikroORM 查询条件
 */
export class SpecificationConverter implements ISpecificationConverter {
  /**
   * 将规范转换为查询条件
   * @description 将 ISpecification 转换为 MikroORM 查询选项
   * @param spec 规范实例
   * @param _entityName 实体名称（保留用于未来扩展）
   * @returns MikroORM查询选项
   * @throws {Error} 当规范嵌套层级超过限制或转换失败时抛出
   */
  convertToQuery<T>(
    spec: ISpecification<T>,
    _entityName: string,
  ): MikroORMQueryOptions {
    // 检查嵌套深度
    const depth = this.getNestingDepth(spec);
    if (depth > MAX_NESTING_DEPTH) {
      throw new Error(
        `规范嵌套深度 ${depth} 超过最大限制 ${MAX_NESTING_DEPTH}`,
      );
    }

    // 如果规范实现了 IQuerySpecification，使用其 getQueryCriteria 方法
    if (this.isQuerySpecification(spec)) {
      return this.convertCriteriaToQuery(spec.getQueryCriteria());
    }

    // 否则，将规范组合转换为查询条件
    return this.convertSpecificationToQuery(spec, 0);
  }

  /**
   * 将QueryCriteria转换为查询条件
   * @description 将QueryCriteria转换为MikroORM查询选项
   * @param criteria 查询条件
   * @returns MikroORM查询选项
   */
  convertCriteriaToQuery(criteria: QueryCriteria): MikroORMQueryOptions {
    const options: MikroORMQueryOptions = {};

    // 转换查询条件
    if (criteria.conditions && criteria.conditions.length > 0) {
      options.where = this.convertConditionsToWhere(criteria.conditions);
    }

    // 转换排序条件
    if (criteria.sortBy) {
      options.orderBy = {
        [criteria.sortBy.field]: criteria.sortBy.direction,
      };
    }

    // 转换分页条件
    if (criteria.pagination) {
      options.limit = criteria.pagination.pageSize;
      options.offset =
        (criteria.pagination.page - 1) * criteria.pagination.pageSize;
    }

    // 转换字段选择
    if (criteria.selectFields && criteria.selectFields.length > 0) {
      options.fields = [...criteria.selectFields];
    }

    // 转换去重选项
    if (criteria.distinct !== undefined) {
      options.distinct = criteria.distinct;
    }

    return options;
  }

  /**
   * 获取规范的嵌套深度
   * @description 计算规范的嵌套层级，用于验证是否超过限制
   * @param spec 规范实例
   * @returns 嵌套深度
   */
  getNestingDepth<T>(spec: ISpecification<T>): number {
    if (spec instanceof AndSpecification) {
      return (
        1 +
        Math.max(
          this.getNestingDepth(spec.getLeft()),
          this.getNestingDepth(spec.getRight()),
        )
      );
    }

    if (spec instanceof OrSpecification) {
      return (
        1 +
        Math.max(
          this.getNestingDepth(spec.getLeft()),
          this.getNestingDepth(spec.getRight()),
        )
      );
    }

    if (spec instanceof NotSpecification) {
      return 1 + this.getNestingDepth(spec.getSpecification());
    }

    // 基础规范（叶子节点）
    return 0;
  }

  /**
   * 将规范组合转换为查询条件
   * @private
   * @param spec 规范实例
   * @param depth 当前嵌套深度
   * @returns MikroORM查询选项
   */
  private convertSpecificationToQuery<T>(
    spec: ISpecification<T>,
    depth: number,
  ): MikroORMQueryOptions {
    if (depth > MAX_NESTING_DEPTH) {
      throw new Error(`规范嵌套深度超过最大限制 ${MAX_NESTING_DEPTH}`);
    }

    // 处理 AndSpecification
    if (spec instanceof AndSpecification) {
      const leftQuery = this.convertSpecificationToQuery(
        spec.getLeft(),
        depth + 1,
      );
      const rightQuery = this.convertSpecificationToQuery(
        spec.getRight(),
        depth + 1,
      );

      // 合并 AND 条件
      const leftWhere = leftQuery.where || {};
      const rightWhere = rightQuery.where || {};

      // 如果已经有 $and，合并；否则创建新的 $and
      let mergedWhere: any;
      if (leftWhere.$and || rightWhere.$and) {
        const andConditions: any[] = [];
        if (leftWhere.$and) {
          andConditions.push(...leftWhere.$and);
        } else {
          andConditions.push(leftWhere);
        }
        if (rightWhere.$and) {
          andConditions.push(...rightWhere.$and);
        } else {
          andConditions.push(rightWhere);
        }
        mergedWhere = { $and: andConditions };
      } else {
        // 合并两个 where 对象
        mergedWhere = { ...leftWhere, ...rightWhere };
      }

      return {
        orderBy: leftQuery.orderBy || rightQuery.orderBy,
        limit: leftQuery.limit || rightQuery.limit,
        offset: leftQuery.offset || rightQuery.offset,
        fields: leftQuery.fields || rightQuery.fields,
        distinct: leftQuery.distinct || rightQuery.distinct,
        where: mergedWhere,
      };
    }

    // 处理 OrSpecification
    if (spec instanceof OrSpecification) {
      const leftQuery = this.convertSpecificationToQuery(
        spec.getLeft(),
        depth + 1,
      );
      const rightQuery = this.convertSpecificationToQuery(
        spec.getRight(),
        depth + 1,
      );

      // 合并 OR 条件
      const leftWhere = leftQuery.where || {};
      const rightWhere = rightQuery.where || {};

      let mergedWhere: any;
      if (leftWhere.$or || rightWhere.$or) {
        const orConditions: any[] = [];
        if (leftWhere.$or) {
          orConditions.push(...leftWhere.$or);
        } else {
          orConditions.push(leftWhere);
        }
        if (rightWhere.$or) {
          orConditions.push(...rightWhere.$or);
        } else {
          orConditions.push(rightWhere);
        }
        mergedWhere = { $or: orConditions };
      } else {
        mergedWhere = { $or: [leftWhere, rightWhere] };
      }

      return {
        orderBy: leftQuery.orderBy || rightQuery.orderBy,
        limit: leftQuery.limit || rightQuery.limit,
        offset: leftQuery.offset || rightQuery.offset,
        fields: leftQuery.fields || rightQuery.fields,
        distinct: leftQuery.distinct || rightQuery.distinct,
        where: mergedWhere,
      };
    }

    // 处理 NotSpecification
    if (spec instanceof NotSpecification) {
      const innerQuery = this.convertSpecificationToQuery(
        spec.getSpecification(),
        depth + 1,
      );

      // NOT 条件 - MikroORM 使用 $not 包裹条件
      const innerWhere = innerQuery.where || {};
      const notWhere = Object.keys(innerWhere).reduce(
        (acc, key) => {
          acc[key] = { $ne: innerWhere[key] };
          return acc;
        },
        {} as Record<string, any>,
      );

      return {
        ...innerQuery,
        where: notWhere,
      };
    }

    // 如果规范实现了 IQuerySpecification，使用其查询条件
    if (this.isQuerySpecification(spec)) {
      return this.convertCriteriaToQuery(spec.getQueryCriteria());
    }

    // 无法转换的规范（叶子节点，但没有 QueryCriteria）
    // 返回空查询，在实际查询时会使用 isSatisfiedBy 进行内存过滤
    return {};
  }

  /**
   * 将查询条件列表转换为 MikroORM where 条件
   * @private
   * @param conditions 查询条件列表
   * @returns MikroORM where 条件对象
   */
  private convertConditionsToWhere(
    conditions: readonly QueryCondition[],
  ): Record<string, any> {
    const where: Record<string, any> = {};

    for (const condition of conditions) {
      const fieldCondition = this.convertConditionToFieldCondition(condition);
      if (fieldCondition !== undefined) {
        // 如果字段已存在，需要合并（使用 $and）
        if (where[condition.field] !== undefined) {
          const existing = where[condition.field];
          // 如果现有条件已经是对象，合并
          if (
            typeof existing === "object" &&
            existing !== null &&
            !Array.isArray(existing)
          ) {
            where[condition.field] = { ...existing, ...fieldCondition };
          } else {
            where[condition.field] = { $and: [existing, fieldCondition] };
          }
        } else {
          where[condition.field] = fieldCondition;
        }
      }
    }

    return where;
  }

  /**
   * 将单个查询条件转换为 MikroORM 字段条件
   * @private
   * @param condition 查询条件
   * @returns MikroORM 字段条件
   */
  private convertConditionToFieldCondition(condition: QueryCondition): any {
    switch (condition.operator) {
      case QueryOperator.EQUALS:
        return condition.value;

      case QueryOperator.NOT_EQUALS:
        return { $ne: condition.value };

      case QueryOperator.GREATER_THAN:
        return { $gt: condition.value };

      case QueryOperator.GREATER_THAN_OR_EQUAL:
        return { $gte: condition.value };

      case QueryOperator.LESS_THAN:
        return { $lt: condition.value };

      case QueryOperator.LESS_THAN_OR_EQUAL:
        return { $lte: condition.value };

      case QueryOperator.CONTAINS:
        // MikroORM 使用 $like 进行模糊匹配，需要手动添加通配符
        if (typeof condition.value === "string") {
          return { $like: `%${condition.value}%` };
        }
        return condition.value;

      case QueryOperator.NOT_CONTAINS:
        if (typeof condition.value === "string") {
          return { $notLike: `%${condition.value}%` };
        }
        return { $ne: condition.value };

      case QueryOperator.STARTS_WITH:
        if (typeof condition.value === "string") {
          return { $like: `${condition.value}%` };
        }
        return condition.value;

      case QueryOperator.ENDS_WITH:
        if (typeof condition.value === "string") {
          return { $like: `%${condition.value}` };
        }
        return condition.value;

      case QueryOperator.IN:
        return {
          $in: Array.isArray(condition.value)
            ? condition.value
            : [condition.value],
        };

      case QueryOperator.NOT_IN:
        return {
          $nin: Array.isArray(condition.value)
            ? condition.value
            : [condition.value],
        };

      case QueryOperator.IS_NULL:
        return null;

      case QueryOperator.IS_NOT_NULL:
        return { $ne: null };

      case QueryOperator.IS_EMPTY:
        return "";

      case QueryOperator.IS_NOT_EMPTY:
        return { $ne: "" };

      default:
        // 未知操作符，返回原始值
        return condition.value;
    }
  }

  /**
   * 检查规范是否为查询规范
   * @private
   * @param spec 规范实例
   * @returns 是否为查询规范
   */
  private isQuerySpecification<T>(
    spec: ISpecification<T>,
  ): spec is IQuerySpecification<T> {
    return (
      typeof (spec as IQuerySpecification<T>).getQueryCriteria === "function"
    );
  }
}
