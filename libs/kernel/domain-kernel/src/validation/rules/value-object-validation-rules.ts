/**
 * @fileoverview Value Object Validation Rules - 值对象验证规则
 * @description 常用的值对象验证规则实现
 */

import { ValueObject } from "../../value-objects/base/value-object.base.js";
import { SimpleValidationResult } from "./simple-validation-result.js";
import { IValueObjectValidationRule } from "../value-object-validator.interface.js";

/**
 * 非空验证规则
 * @description 验证值对象不为空
 * @template T 值对象类型
 */
export class NotEmptyRule<T extends ValueObject<unknown>>
  implements IValueObjectValidationRule<T>
{
  name = "notEmpty";
  description = "Value must not be empty";
  priority = 100;
  enabled = true;
  tags = ["basic", "required"];
  metadata = {};

  validate(value: T): SimpleValidationResult {
    const isEmpty =
      value.value === null ||
      value.value === undefined ||
      value.value === "" ||
      (Array.isArray(value.value) && value.value.length === 0) ||
      (typeof value.value === "object" &&
        Object.keys(value.value).length === 0);

    return new SimpleValidationResult(
      !isEmpty,
      isEmpty ? ["Value cannot be empty"] : [],
      [],
      [],
    );
  }
}

/**
 * 字符串长度验证规则
 * @description 验证字符串长度在指定范围内
 * @template T 值对象类型
 */
export class StringLengthRule<T extends ValueObject<unknown>>
  implements IValueObjectValidationRule<T>
{
  name = "stringLength";
  description = "String length must be within specified range";
  priority = 90;
  enabled = true;
  tags = ["string", "length"];
  metadata = {};

  constructor(
    private readonly minLength: number = 0,
    private readonly maxLength: number = Number.MAX_SAFE_INTEGER,
  ) {}

  validate(value: T): SimpleValidationResult {
    if (typeof value.value !== "string") {
      return new SimpleValidationResult(
        false,
        ["Value must be a string for length validation"],
        [],
        [],
      );
    }

    const length = value.value.length;
    const isValid = length >= this.minLength && length <= this.maxLength;

    return new SimpleValidationResult(
      isValid,
      isValid
        ? []
        : [
            `String length must be between ${this.minLength} and ${this.maxLength}, got ${length}`,
          ],
      [],
      [],
    );
  }
}

/**
 * 正则表达式验证规则
 * @description 验证值匹配指定的正则表达式
 * @template T 值对象类型
 */
export class RegexRule<T extends ValueObject<unknown>>
  implements IValueObjectValidationRule<T>
{
  name = "regex";
  description = "Value must match specified pattern";
  priority = 80;
  enabled = true;
  tags = ["pattern", "regex"];
  metadata = {};

  constructor(
    private readonly pattern: RegExp,
    private readonly errorMessage?: string,
  ) {}

  validate(value: T): SimpleValidationResult {
    if (typeof value.value !== "string") {
      return new SimpleValidationResult(
        false,
        ["Value must be a string for regex validation"],
        [],
        [],
      );
    }

    const isValid = this.pattern.test(value.value);

    return new SimpleValidationResult(
      isValid,
      isValid
        ? []
        : [
            this.errorMessage ||
              `Value must match pattern: ${this.pattern.source}`,
          ],
      [],
      [],
    );
  }
}

/**
 * 数值范围验证规则
 * @description 验证数值在指定范围内
 * @template T 值对象类型
 */
export class NumberRangeRule<T extends ValueObject<unknown>>
  implements IValueObjectValidationRule<T>
{
  name = "numberRange";
  description = "Number must be within specified range";
  priority = 85;
  enabled = true;
  tags = ["number", "range"];
  metadata = {};

  constructor(
    private readonly min: number = Number.MIN_SAFE_INTEGER,
    private readonly max: number = Number.MAX_SAFE_INTEGER,
  ) {}

  validate(value: T): SimpleValidationResult {
    if (typeof value.value !== "number") {
      return new SimpleValidationResult(
        false,
        ["Value must be a number for range validation"],
        [],
        [],
      );
    }

    const isValid = value.value >= this.min && value.value <= this.max;

    return new SimpleValidationResult(
      isValid,
      isValid
        ? []
        : [
            `Number must be between ${this.min} and ${this.max}, got ${value.value}`,
          ],
      [],
      [],
    );
  }
}

/**
 * 邮箱验证规则
 * @description 验证邮箱格式
 * @template T 值对象类型
 */
export class EmailRule<T extends ValueObject<unknown>>
  implements IValueObjectValidationRule<T>
{
  name = "email";
  description = "Value must be a valid email address";
  priority = 95;
  enabled = true;
  tags = ["email", "format"];
  metadata = {};

  private readonly emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  validate(value: T): SimpleValidationResult {
    if (typeof value.value !== "string") {
      return new SimpleValidationResult(
        false,
        ["Value must be a string for email validation"],
        [],
        [],
      );
    }

    const isValid = this.emailRegex.test(value.value);

    return new SimpleValidationResult(
      isValid,
      isValid ? [] : ["Value must be a valid email address"],
      [],
      [],
    );
  }
}

/**
 * 自定义验证规则
 * @description 允许自定义验证逻辑
 * @template T 值对象类型
 */
export class CustomRule<T extends ValueObject<unknown>>
  implements IValueObjectValidationRule<T>
{
  name: string;
  description: string;
  priority: number;
  enabled: boolean;
  tags: string[];
  metadata: Record<string, unknown>;

  constructor(
    name: string,
    description: string,
    private readonly validateFn: (value: T) => SimpleValidationResult,
    priority: number = 50,
    enabled: boolean = true,
    tags: string[] = ["custom"],
    metadata: Record<string, unknown> = {},
  ) {
    this.name = name;
    this.description = description;
    this.priority = priority;
    this.enabled = enabled;
    this.tags = tags;
    this.metadata = metadata;
  }

  validate(value: T): SimpleValidationResult {
    return this.validateFn(value);
  }
}
