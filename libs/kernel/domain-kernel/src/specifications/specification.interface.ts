/**
 * @fileoverview Specification Interface - 规范接口
 * @description 业务规则和查询的基础规范接口
 */

/**
 * 基础规范接口
 * @description 业务规则和查询的基础规范接口
 * @template T 候选对象类型
 */
export interface ISpecification<T> {
  /**
   * 检查候选对象是否满足规范
   * @param candidate 候选对象
   * @returns 是否满足规范
   */
  isSatisfiedBy(candidate: T): boolean;

  /**
   * 逻辑AND组合
   * @param other 另一个规范
   * @returns 组合后的规范
   */
  and(other: ISpecification<T>): ISpecification<T>;

  /**
   * 逻辑OR组合
   * @param other 另一个规范
   * @returns 组合后的规范
   */
  or(other: ISpecification<T>): ISpecification<T>;

  /**
   * 逻辑NOT组合
   * @returns 否定后的规范
   */
  not(): ISpecification<T>;

  /**
   * 获取规范描述
   * @returns 人类可读的描述
   */
  getDescription(): string;
}
