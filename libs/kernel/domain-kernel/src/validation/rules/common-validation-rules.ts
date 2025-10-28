import type { ValidationRule } from "./validation-rule.interface.js";
import { ValidationRule as BaseValidationRule } from "./validation-rule.js";
// import { ValidationLevel } from "./validation-rule.interface.js";
import { ValidationError } from "./validation-error.js";
import { ValidationResult } from "./validation-result.js";
import type { ValidationContext } from "./validation-rule.interface.js";

/**
 * 通用验证规则接口
 * @description 提供常用的验证规则实现
 */
export interface CommonValidationRules {
  /**
   * 创建非空验证规则
   * @returns 验证规则
   */
  notEmpty(): ValidationRule<unknown>;

  /**
   * 非空字符串验证规则
   * @description 验证字符串不为空
   */
  readonly notEmptyString: ValidationRule<string>;

  /**
   * 非空数组验证规则
   * @description 验证数组不为空
   */
  readonly notEmptyArray: ValidationRule<unknown[]>;

  /**
   * 非空对象验证规则
   * @description 验证对象不为空
   */
  readonly notEmptyObject: ValidationRule<Record<string, unknown>>;

  /**
   * 字符串长度验证规则
   * @description 验证字符串长度在指定范围内
   */
  readonly stringLength: ValidationRule<string>;

  /**
   * 创建字符串最小长度验证规则
   * @param minLength 最小长度
   * @returns 验证规则
   */
  stringMinLength(minLength: number): ValidationRule<string>;

  /**
   * 创建字符串最大长度验证规则
   * @param maxLength 最大长度
   * @returns 验证规则
   */
  stringMaxLength(maxLength: number): ValidationRule<string>;

  /**
   * 数字范围验证规则
   * @description 验证数字在指定范围内
   */
  readonly numberRange: ValidationRule<number>;

  /**
   * 数字最小值验证规则
   * @description 验证数字最小值
   */
  readonly numberMin: ValidationRule<number>;

  /**
   * 数字最大值验证规则
   * @description 验证数字最大值
   */
  readonly numberMax: ValidationRule<number>;

  /**
   * 数字正数验证规则
   * @description 验证数字为正数
   */
  readonly numberPositive: ValidationRule<number>;

  /**
   * 数字负数验证规则
   * @description 验证数字为负数
   */
  readonly numberNegative: ValidationRule<number>;

  /**
   * 数字整数验证规则
   * @description 验证数字为整数
   */
  readonly numberInteger: ValidationRule<number>;

  /**
   * 数字小数验证规则
   * @description 验证数字为小数
   */
  readonly numberDecimal: ValidationRule<number>;

  /**
   * 数组长度验证规则
   * @description 验证数组长度在指定范围内
   */
  readonly arrayLength: ValidationRule<unknown[]>;

  /**
   * 数组最小长度验证规则
   * @description 验证数组最小长度
   */
  readonly arrayMinLength: ValidationRule<unknown[]>;

  /**
   * 数组最大长度验证规则
   * @description 验证数组最大长度
   */
  readonly arrayMaxLength: ValidationRule<unknown[]>;

  /**
   * 数组包含验证规则
   * @description 验证数组包含指定元素
   */
  readonly arrayContains: ValidationRule<unknown[]>;

  /**
   * 数组唯一验证规则
   * @description 验证数组元素唯一
   */
  readonly arrayUnique: ValidationRule<unknown[]>;

  /**
   * 对象属性验证规则
   * @description 验证对象包含指定属性
   */
  readonly objectHasProperty: ValidationRule<Record<string, unknown>>;

  /**
   * 对象属性值验证规则
   * @description 验证对象属性值
   */
  readonly objectPropertyValue: ValidationRule<Record<string, unknown>>;

  /**
   * 日期范围验证规则
   * @description 验证日期在指定范围内
   */
  readonly dateRange: ValidationRule<string | Date>;

  /**
   * 日期最小值验证规则
   * @description 验证日期最小值
   */
  readonly dateMin: ValidationRule<string | Date>;

  /**
   * 日期最大值验证规则
   * @description 验证日期最大值
   */
  readonly dateMax: ValidationRule<string | Date>;

  /**
   * 布尔值验证规则
   * @description 验证布尔值
   */
  readonly booleanValue: ValidationRule<boolean>;

  /**
   * 自定义验证规则
   * @description 创建自定义验证规则
   */
  createCustomRule<T>(
    name: string,
    description: string,
    validator: (value: T, context?: ValidationContext) => boolean,
    errorMessage?: string,
  ): ValidationRule<T>;

  /**
   * 组合验证规则
   * @description 创建组合验证规则
   */
  createCompositeRule<T>(
    name: string,
    description: string,
    rules: ValidationRule<T>[],
    mode: "all" | "any" | "none",
  ): ValidationRule<T>;
}

/**
 * 通用验证规则实现
 * @description 提供常用的验证规则实现
 */
export class CommonValidationRulesImpl implements CommonValidationRules {
  public readonly notEmptyString: ValidationRule<string> =
    new (class extends BaseValidationRule<string> {
      constructor() {
        super("NotEmptyString", "验证字符串不为空", 100, true);
      }

      protected doValidate(
        value: string,
        context?: ValidationContext,
      ): ValidationResult {
        if (typeof value !== "string" || value.trim() === "") {
          return this.createFailureResult([
            this.createError("字符串不能为空", "NOT_EMPTY_STRING", {
              fieldName: context?.fieldName,
            }),
          ]);
        }
        return this.createSuccessResult();
      }
    })();

  public readonly notEmptyArray: ValidationRule<unknown[]> =
    new (class extends BaseValidationRule<unknown[]> {
      constructor() {
        super("NotEmptyArray", "验证数组不为空", 100, true);
      }

      protected doValidate(
        value: unknown[],
        context?: ValidationContext,
      ): ValidationResult {
        if (!Array.isArray(value) || value.length === 0) {
          return this.createFailureResult([
            this.createError("数组不能为空", "NOT_EMPTY_ARRAY", {
              fieldName: context?.fieldName,
            }),
          ]);
        }
        return this.createSuccessResult();
      }
    })();

  public readonly notEmptyObject: ValidationRule<Record<string, unknown>> =
    new (class extends BaseValidationRule<Record<string, unknown>> {
      constructor() {
        super("NotEmptyObject", "验证对象不为空", 100, true);
      }

      protected doValidate(
        value: Record<string, unknown>,
        context?: ValidationContext,
      ): ValidationResult {
        if (
          typeof value !== "object" ||
          value === null ||
          Object.keys(value).length === 0
        ) {
          return this.createFailureResult([
            this.createError("对象不能为空", "NOT_EMPTY_OBJECT", {
              fieldName: context?.fieldName,
            }),
          ]);
        }
        return this.createSuccessResult();
      }
    })();

  public readonly stringLength: ValidationRule<string> =
    new (class extends BaseValidationRule<string> {
      constructor() {
        super("StringLength", "验证字符串长度在指定范围内", 100, true);
      }

      protected doValidate(
        value: string,
        context?: ValidationContext,
      ): ValidationResult {
        const minLength = context?.options?.minLength as number;
        const maxLength = context?.options?.maxLength as number;

        if (typeof value !== "string") {
          return this.createFailureResult([
            this.createError("值必须是字符串", "INVALID_TYPE", {
              fieldName: context?.fieldName,
            }),
          ]);
        }

        if (minLength !== undefined && value.length < minLength) {
          return this.createFailureResult([
            this.createError(
              `字符串长度不能小于 ${minLength}`,
              "STRING_TOO_SHORT",
              { fieldName: context?.fieldName },
            ),
          ]);
        }

        if (maxLength !== undefined && value.length > maxLength) {
          return this.createFailureResult([
            this.createError(
              `字符串长度不能大于 ${maxLength}`,
              "STRING_TOO_LONG",
              { fieldName: context?.fieldName },
            ),
          ]);
        }

        return this.createSuccessResult();
      }
    })();

  public readonly numberRange: ValidationRule<number> =
    new (class extends BaseValidationRule<number> {
      constructor() {
        super("NumberRange", "验证数字在指定范围内", 100, true);
      }

      protected doValidate(
        value: number,
        context?: ValidationContext,
      ): ValidationResult {
        const min = context?.options?.min as number;
        const max = context?.options?.max as number;

        if (typeof value !== "number" || isNaN(value)) {
          return this.createFailureResult([
            this.createError("值必须是数字", "INVALID_TYPE", {
              fieldName: context?.fieldName,
            }),
          ]);
        }

        if (min !== undefined && value < min) {
          return this.createFailureResult([
            this.createError(`数字不能小于 ${min}`, "NUMBER_TOO_SMALL", {
              fieldName: context?.fieldName,
            }),
          ]);
        }

        if (max !== undefined && value > max) {
          return this.createFailureResult([
            this.createError(`数字不能大于 ${max}`, "NUMBER_TOO_LARGE", {
              fieldName: context?.fieldName,
            }),
          ]);
        }

        return this.createSuccessResult();
      }
    })();

  public readonly numberMin: ValidationRule<number> =
    new (class extends BaseValidationRule<number> {
      constructor() {
        super("NumberMin", "验证数字最小值", 100, true);
      }

      protected doValidate(
        value: number,
        context?: ValidationContext,
      ): ValidationResult {
        const min = context?.options?.min as number;

        if (typeof value !== "number" || isNaN(value)) {
          return this.createFailureResult([
            this.createError("值必须是数字", "INVALID_TYPE", {
              fieldName: context?.fieldName,
            }),
          ]);
        }

        if (min !== undefined && value < min) {
          return this.createFailureResult([
            this.createError(`数字不能小于 ${min}`, "NUMBER_TOO_SMALL", {
              fieldName: context?.fieldName,
            }),
          ]);
        }

        return this.createSuccessResult();
      }
    })();

  public readonly numberMax: ValidationRule<number> =
    new (class extends BaseValidationRule<number> {
      constructor() {
        super("NumberMax", "验证数字最大值", 100, true);
      }

      protected doValidate(
        value: number,
        context?: ValidationContext,
      ): ValidationResult {
        const max = context?.options?.max as number;

        if (typeof value !== "number" || isNaN(value)) {
          return this.createFailureResult([
            this.createError("值必须是数字", "INVALID_TYPE", {
              fieldName: context?.fieldName,
            }),
          ]);
        }

        if (max !== undefined && value > max) {
          return this.createFailureResult([
            this.createError(`数字不能大于 ${max}`, "NUMBER_TOO_LARGE", {
              fieldName: context?.fieldName,
            }),
          ]);
        }

        return this.createSuccessResult();
      }
    })();

  public readonly numberPositive: ValidationRule<number> =
    new (class extends BaseValidationRule<number> {
      constructor() {
        super("NumberPositive", "验证数字为正数", 100, true);
      }

      protected doValidate(
        value: number,
        context?: ValidationContext,
      ): ValidationResult {
        if (typeof value !== "number" || isNaN(value)) {
          return this.createFailureResult([
            this.createError("值必须是数字", "INVALID_TYPE", {
              fieldName: context?.fieldName,
            }),
          ]);
        }

        if (value <= 0) {
          return this.createFailureResult([
            this.createError("数字必须为正数", "NUMBER_NOT_POSITIVE", {
              fieldName: context?.fieldName,
            }),
          ]);
        }

        return this.createSuccessResult();
      }
    })();

  public readonly numberNegative: ValidationRule<number> =
    new (class extends BaseValidationRule<number> {
      constructor() {
        super("NumberNegative", "验证数字为负数", 100, true);
      }

      protected doValidate(
        value: number,
        context?: ValidationContext,
      ): ValidationResult {
        if (typeof value !== "number" || isNaN(value)) {
          return this.createFailureResult([
            this.createError("值必须是数字", "INVALID_TYPE", {
              fieldName: context?.fieldName,
            }),
          ]);
        }

        if (value >= 0) {
          return this.createFailureResult([
            this.createError("数字必须为负数", "NUMBER_NOT_NEGATIVE", {
              fieldName: context?.fieldName,
            }),
          ]);
        }

        return this.createSuccessResult();
      }
    })();

  public readonly numberInteger: ValidationRule<number> =
    new (class extends BaseValidationRule<number> {
      constructor() {
        super("NumberInteger", "验证数字为整数", 100, true);
      }

      protected doValidate(
        value: number,
        context?: ValidationContext,
      ): ValidationResult {
        if (typeof value !== "number" || isNaN(value)) {
          return this.createFailureResult([
            this.createError("值必须是数字", "INVALID_TYPE", {
              fieldName: context?.fieldName,
            }),
          ]);
        }

        if (!Number.isInteger(value)) {
          return this.createFailureResult([
            this.createError("数字必须为整数", "NUMBER_NOT_INTEGER", {
              fieldName: context?.fieldName,
            }),
          ]);
        }

        return this.createSuccessResult();
      }
    })();

  public readonly numberDecimal: ValidationRule<number> =
    new (class extends BaseValidationRule<number> {
      constructor() {
        super("NumberDecimal", "验证数字为小数", 100, true);
      }

      protected doValidate(
        value: number,
        context?: ValidationContext,
      ): ValidationResult {
        if (typeof value !== "number" || isNaN(value)) {
          return this.createFailureResult([
            this.createError("值必须是数字", "INVALID_TYPE", {
              fieldName: context?.fieldName,
            }),
          ]);
        }

        if (Number.isInteger(value)) {
          return this.createFailureResult([
            this.createError("数字必须为小数", "NUMBER_NOT_DECIMAL", {
              fieldName: context?.fieldName,
            }),
          ]);
        }

        return this.createSuccessResult();
      }
    })();

  public readonly arrayLength: ValidationRule<unknown[]> =
    new (class extends BaseValidationRule<unknown[]> {
      constructor() {
        super("ArrayLength", "验证数组长度在指定范围内", 100, true);
      }

      protected doValidate(
        value: unknown[],
        context?: ValidationContext,
      ): ValidationResult {
        const minLength = context?.options?.minLength as number;
        const maxLength = context?.options?.maxLength as number;

        if (!Array.isArray(value)) {
          return this.createFailureResult([
            this.createError("值必须是数组", "INVALID_TYPE", {
              fieldName: context?.fieldName,
            }),
          ]);
        }

        if (minLength !== undefined && value.length < minLength) {
          return this.createFailureResult([
            this.createError(
              `数组长度不能小于 ${minLength}`,
              "ARRAY_TOO_SHORT",
              { fieldName: context?.fieldName },
            ),
          ]);
        }

        if (maxLength !== undefined && value.length > maxLength) {
          return this.createFailureResult([
            this.createError(
              `数组长度不能大于 ${maxLength}`,
              "ARRAY_TOO_LONG",
              { fieldName: context?.fieldName },
            ),
          ]);
        }

        return this.createSuccessResult();
      }
    })();

  public readonly arrayMinLength: ValidationRule<unknown[]> =
    new (class extends BaseValidationRule<unknown[]> {
      constructor() {
        super("ArrayMinLength", "验证数组最小长度", 100, true);
      }

      protected doValidate(
        value: unknown[],
        context?: ValidationContext,
      ): ValidationResult {
        const minLength = context?.options?.minLength as number;

        if (!Array.isArray(value)) {
          return this.createFailureResult([
            this.createError("值必须是数组", "INVALID_TYPE", {
              fieldName: context?.fieldName,
            }),
          ]);
        }

        if (minLength !== undefined && value.length < minLength) {
          return this.createFailureResult([
            this.createError(
              `数组长度不能小于 ${minLength}`,
              "ARRAY_TOO_SHORT",
              { fieldName: context?.fieldName },
            ),
          ]);
        }

        return this.createSuccessResult();
      }
    })();

  public readonly arrayMaxLength: ValidationRule<unknown[]> =
    new (class extends BaseValidationRule<unknown[]> {
      constructor() {
        super("ArrayMaxLength", "验证数组最大长度", 100, true);
      }

      protected doValidate(
        value: unknown[],
        context?: ValidationContext,
      ): ValidationResult {
        const maxLength = context?.options?.maxLength as number;

        if (!Array.isArray(value)) {
          return this.createFailureResult([
            this.createError("值必须是数组", "INVALID_TYPE", {
              fieldName: context?.fieldName,
            }),
          ]);
        }

        if (maxLength !== undefined && value.length > maxLength) {
          return this.createFailureResult([
            this.createError(
              `数组长度不能大于 ${maxLength}`,
              "ARRAY_TOO_LONG",
              { fieldName: context?.fieldName },
            ),
          ]);
        }

        return this.createSuccessResult();
      }
    })();

  public readonly arrayContains: ValidationRule<unknown[]> =
    new (class extends BaseValidationRule<unknown[]> {
      constructor() {
        super("ArrayContains", "验证数组包含指定元素", 100, true);
      }

      protected doValidate(
        value: unknown[],
        context?: ValidationContext,
      ): ValidationResult {
        const target = context?.options?.target;

        if (!Array.isArray(value)) {
          return this.createFailureResult([
            this.createError("值必须是数组", "INVALID_TYPE", {
              fieldName: context?.fieldName,
            }),
          ]);
        }

        if (target !== undefined && !value.includes(target)) {
          return this.createFailureResult([
            this.createError(`数组必须包含 ${target}`, "ARRAY_NOT_CONTAINS", {
              fieldName: context?.fieldName,
            }),
          ]);
        }

        return this.createSuccessResult();
      }
    })();

  public readonly arrayUnique: ValidationRule<unknown[]> =
    new (class extends BaseValidationRule<unknown[]> {
      constructor() {
        super("ArrayUnique", "验证数组元素唯一", 100, true);
      }

      protected doValidate(
        value: unknown[],
        context?: ValidationContext,
      ): ValidationResult {
        if (!Array.isArray(value)) {
          return this.createFailureResult([
            this.createError("值必须是数组", "INVALID_TYPE", {
              fieldName: context?.fieldName,
            }),
          ]);
        }

        const uniqueValues = new Set(value);
        if (uniqueValues.size !== value.length) {
          return this.createFailureResult([
            this.createError("数组元素必须唯一", "ARRAY_NOT_UNIQUE", {
              fieldName: context?.fieldName,
            }),
          ]);
        }

        return this.createSuccessResult();
      }
    })();

  public readonly objectHasProperty: ValidationRule<Record<string, unknown>> =
    new (class extends BaseValidationRule<Record<string, unknown>> {
      constructor() {
        super("ObjectHasProperty", "验证对象包含指定属性", 100, true);
      }

      protected doValidate(
        value: Record<string, unknown>,
        context?: ValidationContext,
      ): ValidationResult {
        const property = context?.options?.property as string;

        if (typeof value !== "object" || value === null) {
          return this.createFailureResult([
            this.createError("值必须是对象", "INVALID_TYPE", {
              fieldName: context?.fieldName,
            }),
          ]);
        }

        if (property !== undefined && !(property in value)) {
          return this.createFailureResult([
            this.createError(
              `对象必须包含属性 ${property}`,
              "OBJECT_MISSING_PROPERTY",
              { fieldName: context?.fieldName },
            ),
          ]);
        }

        return this.createSuccessResult();
      }
    })();

  public readonly objectPropertyValue: ValidationRule<Record<string, unknown>> =
    new (class extends BaseValidationRule<Record<string, unknown>> {
      constructor() {
        super("ObjectPropertyValue", "验证对象属性值", 100, true);
      }

      protected doValidate(
        value: Record<string, unknown>,
        context?: ValidationContext,
      ): ValidationResult {
        const property = context?.options?.property as string;
        const expectedValue = context?.options?.expectedValue;

        if (typeof value !== "object" || value === null) {
          return this.createFailureResult([
            this.createError("值必须是对象", "INVALID_TYPE", {
              fieldName: context?.fieldName,
            }),
          ]);
        }

        if (
          property !== undefined &&
          expectedValue !== undefined &&
          value[property] !== expectedValue
        ) {
          return this.createFailureResult([
            this.createError(
              `对象属性 ${property} 的值必须为 ${expectedValue}`,
              "OBJECT_PROPERTY_VALUE_MISMATCH",
              { fieldName: context?.fieldName },
            ),
          ]);
        }

        return this.createSuccessResult();
      }
    })();

  public readonly dateRange: ValidationRule<string | Date> =
    new (class extends BaseValidationRule<string | Date> {
      constructor() {
        super("DateRange", "验证日期在指定范围内", 100, true);
      }

      protected doValidate(
        value: string | Date,
        context?: ValidationContext,
      ): ValidationResult {
        const minDate = context?.options?.minDate as string | Date;
        const maxDate = context?.options?.maxDate as string | Date;

        const date = value instanceof Date ? value : new Date(value);

        if (isNaN(date.getTime())) {
          return this.createFailureResult([
            this.createError("值必须是有效日期", "INVALID_DATE", {
              fieldName: context?.fieldName,
            }),
          ]);
        }

        if (minDate !== undefined) {
          const min = minDate instanceof Date ? minDate : new Date(minDate);
          if (date < min) {
            return this.createFailureResult([
              this.createError(`日期不能早于 ${minDate}`, "DATE_TOO_EARLY", {
                fieldName: context?.fieldName,
              }),
            ]);
          }
        }

        if (maxDate !== undefined) {
          const max = maxDate instanceof Date ? maxDate : new Date(maxDate);
          if (date > max) {
            return this.createFailureResult([
              this.createError(`日期不能晚于 ${maxDate}`, "DATE_TOO_LATE", {
                fieldName: context?.fieldName,
              }),
            ]);
          }
        }

        return this.createSuccessResult();
      }
    })();

  public readonly dateMin: ValidationRule<string | Date> =
    new (class extends BaseValidationRule<string | Date> {
      constructor() {
        super("DateMin", "验证日期最小值", 100, true);
      }

      protected doValidate(
        value: string | Date,
        context?: ValidationContext,
      ): ValidationResult {
        const minDate = context?.options?.minDate as string | Date;

        const date = value instanceof Date ? value : new Date(value);

        if (isNaN(date.getTime())) {
          return this.createFailureResult([
            this.createError("值必须是有效日期", "INVALID_DATE", {
              fieldName: context?.fieldName,
            }),
          ]);
        }

        if (minDate !== undefined) {
          const min = minDate instanceof Date ? minDate : new Date(minDate);
          if (date < min) {
            return this.createFailureResult([
              this.createError(`日期不能早于 ${minDate}`, "DATE_TOO_EARLY", {
                fieldName: context?.fieldName,
              }),
            ]);
          }
        }

        return this.createSuccessResult();
      }
    })();

  public readonly dateMax: ValidationRule<string | Date> =
    new (class extends BaseValidationRule<string | Date> {
      constructor() {
        super("DateMax", "验证日期最大值", 100, true);
      }

      protected doValidate(
        value: string | Date,
        context?: ValidationContext,
      ): ValidationResult {
        const maxDate = context?.options?.maxDate as string | Date;

        const date = value instanceof Date ? value : new Date(value);

        if (isNaN(date.getTime())) {
          return this.createFailureResult([
            this.createError("值必须是有效日期", "INVALID_DATE", {
              fieldName: context?.fieldName,
            }),
          ]);
        }

        if (maxDate !== undefined) {
          const max = maxDate instanceof Date ? maxDate : new Date(maxDate);
          if (date > max) {
            return this.createFailureResult([
              this.createError(`日期不能晚于 ${maxDate}`, "DATE_TOO_LATE", {
                fieldName: context?.fieldName,
              }),
            ]);
          }
        }

        return this.createSuccessResult();
      }
    })();

  public readonly booleanValue: ValidationRule<boolean> =
    new (class extends BaseValidationRule<boolean> {
      constructor() {
        super("BooleanValue", "验证布尔值", 100, true);
      }

      protected doValidate(
        value: boolean,
        context?: ValidationContext,
      ): ValidationResult {
        if (typeof value !== "boolean") {
          return this.createFailureResult([
            this.createError("值必须是布尔值", "INVALID_TYPE", {
              fieldName: context?.fieldName,
            }),
          ]);
        }

        return this.createSuccessResult();
      }
    })();

  public createCustomRule<T>(
    name: string,
    description: string,
    validator: (value: T, context?: ValidationContext) => boolean,
    errorMessage?: string,
  ): ValidationRule<T> {
    return new (class extends BaseValidationRule<T> {
      constructor() {
        super(name, description, 100, true);
      }

      protected doValidate(
        value: T,
        context?: ValidationContext,
      ): ValidationResult {
        if (!validator(value, context)) {
          return this.createFailureResult([
            this.createError(
              errorMessage || "验证失败",
              "CUSTOM_VALIDATION_FAILED",
              { fieldName: context?.fieldName },
            ),
          ]);
        }
        return this.createSuccessResult();
      }
    })();
  }

  public createCompositeRule<T>(
    name: string,
    description: string,
    rules: ValidationRule<T>[],
    mode: "all" | "any" | "none",
  ): ValidationRule<T> {
    return new (class extends BaseValidationRule<T> {
      constructor() {
        super(name, description, 100, true);
      }

      protected doValidate(
        value: T,
        context?: ValidationContext,
      ): ValidationResult {
        const results = rules.map((rule) => rule.validate(value, context));
        const errors: ValidationError[] = [];
        const warnings: ValidationError[] = [];
        const info: ValidationError[] = [];

        for (const result of results) {
          errors.push(...result.errors);
          warnings.push(...result.warnings);
          info.push(...result.info);
        }

        let isValid = false;
        if (mode === "all") {
          isValid = results.every((result) => result.isValid);
        } else if (mode === "any") {
          isValid = results.some((result) => result.isValid);
        } else if (mode === "none") {
          isValid = results.every((result) => !result.isValid);
        }

        if (isValid) {
          return this.createSuccessResult();
        } else {
          return this.createFailureResult(errors, warnings, info);
        }
      }
    })();
  }

  // 添加函数式方法实现
  public stringMinLength(minLength: number): ValidationRule<string> {
    return new (class extends BaseValidationRule<string> {
      constructor() {
        super("stringMinLength", `验证字符串最小长度 ${minLength}`, 100, true);
      }

      protected doValidate(
        value: string,
        context?: ValidationContext,
      ): ValidationResult {
        if (typeof value !== "string") {
          return this.createFailureResult([
            this.createError("值必须是字符串", "INVALID_TYPE", {
              fieldName: context?.fieldName,
            }),
          ]);
        }

        if (value.length < minLength) {
          return this.createFailureResult([
            this.createError(
              `String must be at least ${minLength} characters long`,
              "STRING_MIN_LENGTH_ERROR",
              { fieldName: context?.fieldName },
            ),
          ]);
        }

        return this.createSuccessResult();
      }
    })();
  }

  public stringMaxLength(maxLength: number): ValidationRule<string> {
    return new (class extends BaseValidationRule<string> {
      constructor() {
        super("stringMaxLength", `验证字符串最大长度 ${maxLength}`, 100, true);
      }

      protected doValidate(
        value: string,
        context?: ValidationContext,
      ): ValidationResult {
        if (typeof value !== "string") {
          return this.createFailureResult([
            this.createError("值必须是字符串", "INVALID_TYPE", {
              fieldName: context?.fieldName,
            }),
          ]);
        }

        if (value.length > maxLength) {
          return this.createFailureResult([
            this.createError(
              `String must be at most ${maxLength} characters long`,
              "STRING_TOO_LONG",
              { fieldName: context?.fieldName },
            ),
          ]);
        }

        return this.createSuccessResult();
      }
    })();
  }

  public notEmpty(): ValidationRule<unknown> {
    return new (class extends BaseValidationRule<unknown> {
      constructor() {
        super("notEmpty", "验证值不为空", 10, true);
      }

      protected doValidate(
        value: unknown,
        context?: ValidationContext,
      ): ValidationResult {
        if (value === null || value === undefined || value === "") {
          return this.createFailureResult([
            this.createError("Value cannot be empty", "NOT_EMPTY", {
              fieldName: context?.fieldName,
            }),
          ]);
        }
        return this.createSuccessResult();
      }
    })();
  }
}

/**
 * 默认通用验证规则实例
 */
export const commonValidationRules = new CommonValidationRulesImpl();
