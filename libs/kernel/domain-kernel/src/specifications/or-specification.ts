/**
 * @fileoverview Or Specification - 或规范
 * @description 实现逻辑或操作的规范组合
 */

import { ISpecification } from "./specification.interface.js";
import { AndSpecification } from "./and-specification.js";
import { NotSpecification } from "./not-specification.js";

/**
 * 或规范类
 * @description 实现逻辑或操作的规范组合，当任一子规范满足时返回true
 * @template T 候选对象类型
 */
export class OrSpecification<T> implements ISpecification<T> {
  /**
   * 构造函数
   * @param left 左侧规范
   * @param right 右侧规范
   */
  constructor(
    private readonly left: ISpecification<T>,
    private readonly right: ISpecification<T>,
  ) {}

  /**
   * 检查候选对象是否满足规范
   * @param candidate 候选对象
   * @returns 是否满足规范
   */
  isSatisfiedBy(candidate: T): boolean {
    return (
      this.left.isSatisfiedBy(candidate) || this.right.isSatisfiedBy(candidate)
    );
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
   * @returns 新的非规范
   */
  not(): ISpecification<T> {
    return new NotSpecification(this);
  }

  /**
   * 获取规范的描述
   * @returns 规范描述
   */
  getDescription(): string {
    return `(${this.left.getDescription()}) OR (${this.right.getDescription()})`;
  }

  /**
   * 获取左侧规范
   * @returns 左侧规范
   */
  getLeft(): ISpecification<T> {
    return this.left;
  }

  /**
   * 获取右侧规范
   * @returns 右侧规范
   */
  getRight(): ISpecification<T> {
    return this.right;
  }

  /**
   * 检查规范是否相等
   * @param other 另一个规范
   * @returns 是否相等
   */
  equals(other: ISpecification<T>): boolean {
    if (!(other instanceof OrSpecification)) {
      return false;
    }
    return this.left.equals(other.left) && this.right.equals(other.right);
  }

  /**
   * 将规范转换为JSON表示
   * @returns JSON表示
   */
  toJSON(): Record<string, unknown> {
    return {
      type: "OrSpecification",
      left: this.left.toJSON(),
      right: this.right.toJSON(),
    };
  }

  /**
   * 从JSON创建或规范
   * @param json JSON表示
   * @param leftFactory 左侧规范工厂函数
   * @param rightFactory 右侧规范工厂函数
   * @returns 或规范实例
   */
  static fromJSON<T>(
    json: Record<string, unknown>,
    leftFactory: (json: Record<string, unknown>) => ISpecification<T>,
    rightFactory: (json: Record<string, unknown>) => ISpecification<T>,
  ): OrSpecification<T> {
    if (json.type !== "OrSpecification") {
      throw new Error("Invalid JSON for OrSpecification");
    }

    const leftJson = json.left as Record<string, unknown>;
    const rightJson = json.right as Record<string, unknown>;

    const left = leftFactory(leftJson);
    const right = rightFactory(rightJson);

    return new OrSpecification(left, right);
  }
}
