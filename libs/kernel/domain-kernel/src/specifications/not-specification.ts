/**
 * @fileoverview Not Specification - 非规范
 * @description 实现逻辑非操作的规范组合
 */

import { ISpecification } from "./specification.interface.js";

/**
 * 非规范类
 * @description 实现逻辑非操作的规范组合，当子规范不满足时返回true
 * @template T 候选对象类型
 */
export class NotSpecification<T> implements ISpecification<T> {
  /**
   * 构造函数
   * @param specification 要取反的规范
   */
  constructor(private readonly specification: ISpecification<T>) {}

  /**
   * 检查候选对象是否满足规范
   * @param candidate 候选对象
   * @returns 是否满足规范
   */
  isSatisfiedBy(candidate: T): boolean {
    return !this.specification.isSatisfiedBy(candidate);
  }

  /**
   * 与另一个规范进行逻辑与操作
   * @param other 另一个规范
   * @returns 新的与规范
   */
  and(other: ISpecification<T>): ISpecification<T> {
    return new AndSpecification(this, other);
  }

  /**
   * 与另一个规范进行逻辑或操作
   * @param other 另一个规范
   * @returns 新的或规范
   */
  or(other: ISpecification<T>): ISpecification<T> {
    return new OrSpecification(this, other);
  }

  /**
   * 对当前规范进行逻辑非操作
   * @returns 新的非规范（双重否定）
   */
  not(): ISpecification<T> {
    return this.specification;
  }

  /**
   * 获取规范的描述
   * @returns 规范描述
   */
  getDescription(): string {
    return `NOT (${this.specification.getDescription()})`;
  }

  /**
   * 获取被取反的规范
   * @returns 被取反的规范
   */
  getSpecification(): ISpecification<T> {
    return this.specification;
  }

  /**
   * 检查规范是否相等
   * @param other 另一个规范
   * @returns 是否相等
   */
  equals(other: ISpecification<T>): boolean {
    if (!(other instanceof NotSpecification)) {
      return false;
    }
    return this.specification.equals(other.specification);
  }

  /**
   * 将规范转换为JSON表示
   * @returns JSON表示
   */
  toJSON(): Record<string, unknown> {
    return {
      type: "NotSpecification",
      specification: this.specification.toJSON(),
    };
  }

  /**
   * 从JSON创建非规范
   * @param json JSON表示
   * @param specificationFactory 规范工厂函数
   * @returns 非规范实例
   */
  static fromJSON<T>(
    json: Record<string, unknown>,
    specificationFactory: (json: Record<string, unknown>) => ISpecification<T>,
  ): NotSpecification<T> {
    if (json.type !== "NotSpecification") {
      throw new Error("Invalid JSON for NotSpecification");
    }

    const specificationJson = json.specification as Record<string, unknown>;
    const specification = specificationFactory(specificationJson);

    return new NotSpecification(specification);
  }
}

// 导入AndSpecification和OrSpecification以避免循环依赖
import { AndSpecification } from "./and-specification.js";
import { OrSpecification } from "./or-specification.js";
