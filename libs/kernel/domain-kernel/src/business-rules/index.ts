/**
 * @fileoverview 业务规则模块导出
 * @description 导出业务规则相关的所有接口和类
 */

// 核心接口
export type { BusinessRule } from "./business-rule.interface.js";
export type { BusinessRuleValidationResult } from "./business-rule-validation-result.interface.js";
export type { BusinessRuleViolation } from "./business-rule-violation.interface.js";
export type { BusinessRuleManager } from "./business-rule-manager.interface.js";

// 核心实现
export { BusinessRule as BusinessRuleImpl } from "./business-rule.js";
export { BusinessRuleValidationResult as BusinessRuleValidationResultImpl } from "./business-rule-validation-result.js";
export { BusinessRuleViolation as BusinessRuleViolationImpl } from "./business-rule-violation.js";
export { BusinessRuleManager as BusinessRuleManagerImpl } from "./business-rule-manager.js";

// 工厂和构建器
export type {
  BusinessRuleFactory,
  BusinessRuleConfig,
  BusinessRuleValidationResultConfig,
  BusinessRuleViolationConfig,
  BusinessRuleCreator,
  BusinessRuleCondition,
  BusinessRuleAction,
} from "./factories/business-rule-factory.interface.js";

export {
  BusinessRuleFactory as BusinessRuleFactoryImpl,
  BusinessRuleConfigImpl,
  BusinessRuleConditionImpl,
  BusinessRuleActionImpl,
} from "./factories/business-rule-factory.js";
