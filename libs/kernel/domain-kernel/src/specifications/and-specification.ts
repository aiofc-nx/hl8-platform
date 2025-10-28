/**
 * @fileoverview AND Specification - AND规范实现
 * @description 逻辑AND组合的规范实现
 */

import { ISpecification } from "./specification.interface.js";

/**
 * AND规范实现
 * @description 逻辑AND组合的规范实现
 * @template T 候选对象类型
 */
export class AndSpecification<T> implements ISpecification<T> {
  constructor(
    private readonly left: ISpecification<T>,
    private readonly right: ISpecification<T>,
  ) {}

  isSatisfiedBy(candidate: T): boolean {
    return (
      this.left.isSatisfiedBy(candidate) && this.right.isSatisfiedBy(candidate)
    );
  }

  and(other: ISpecification<T>): ISpecification<T> {
    return new AndSpecification(this, other);
  }

  or(other: ISpecification<T>): ISpecification<T> {
    return new OrSpecification(this, other);
  }

  not(): ISpecification<T> {
    return new NotSpecification(this);
  }

  getDescription(): string {
    return `(${this.left.getDescription()} AND ${this.right.getDescription()})`;
  }
}

/**
 * OR规范实现
 * @description 逻辑OR组合的规范实现
 * @template T 候选对象类型
 */
export class OrSpecification<T> implements ISpecification<T> {
  constructor(
    private readonly left: ISpecification<T>,
    private readonly right: ISpecification<T>,
  ) {}

  isSatisfiedBy(candidate: T): boolean {
    return (
      this.left.isSatisfiedBy(candidate) || this.right.isSatisfiedBy(candidate)
    );
  }

  and(other: ISpecification<T>): ISpecification<T> {
    return new AndSpecification(this, other);
  }

  or(other: ISpecification<T>): ISpecification<T> {
    return new OrSpecification(this, other);
  }

  not(): ISpecification<T> {
    return new NotSpecification(this);
  }

  getDescription(): string {
    return `(${this.left.getDescription()} OR ${this.right.getDescription()})`;
  }
}

/**
 * NOT规范实现
 * @description 逻辑NOT组合的规范实现
 * @template T 候选对象类型
 */
export class NotSpecification<T> implements ISpecification<T> {
  constructor(private readonly specification: ISpecification<T>) {}

  isSatisfiedBy(candidate: T): boolean {
    return !this.specification.isSatisfiedBy(candidate);
  }

  and(other: ISpecification<T>): ISpecification<T> {
    return new AndSpecification(this, other);
  }

  or(other: ISpecification<T>): ISpecification<T> {
    return new OrSpecification(this, other);
  }

  not(): ISpecification<T> {
    return this.specification;
  }

  getDescription(): string {
    return `NOT (${this.specification.getDescription()})`;
  }
}
