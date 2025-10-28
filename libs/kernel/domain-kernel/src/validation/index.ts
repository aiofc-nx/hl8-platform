/**
 * @fileoverview 验证模块索引
 * @description 导出验证模块的所有公共API
 */

// 核心接口
export type * from "./rules/validation-rule.interface.js";
export type * from "./rules/validation-result.interface.js";
export type * from "./rules/validation-error.interface.js";
export type * from "./value-object-validator.interface.js";

// 核心实现（避免与接口同名冲突，使用别名再导出）
export { ValidationRule as ValidationRuleImpl } from "./rules/validation-rule.js";
export { ValidationResult as ValidationResultImpl } from "./rules/validation-result.js";
export { ValidationError as ValidationErrorImpl } from "./rules/validation-error.js";
export { ValueObjectValidator as ValueObjectValidatorImpl } from "./value-object-validator.js";

// 工厂和构建器（仅导出实现，避免与接口命名冲突）
export {
  ValidationRuleFactory as ValidationRuleFactoryImpl,
  ValidationRuleFactoryBuilderImpl,
} from "./factories/validation-rule-factory.js";

// 通用验证规则
export type * from "./rules/common-validation-rules.interface.js";
export type { CommonValidationRules as CommonValidationRulesImpl } from "./rules/common-validation-rules.js";

// 异常类
export * from "../exceptions/validation-exceptions.js";

// 工具函数
export * from "./utils.js";
