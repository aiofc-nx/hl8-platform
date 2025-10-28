/**
 * @fileoverview 异常类型枚举
 * @description 定义领域异常的分类类型
 */

/**
 * 异常类型枚举
 * @description 将异常分为业务异常和系统异常两大类
 */
export enum ExceptionType {
  /** 业务异常 - 由业务规则违反或业务逻辑错误引起的异常 */
  BUSINESS = "BUSINESS",

  /** 系统异常 - 由系统错误、技术问题或外部依赖问题引起的异常 */
  SYSTEM = "SYSTEM",

  /** 业务规则异常 - 由业务规则违反引起的异常 */
  BUSINESS_RULE = "BUSINESS_RULE",

  /** 协调异常 - 由协调规则或协调逻辑错误引起的异常 */
  COORDINATION = "COORDINATION",

  /** 验证异常 - 由验证规则违反引起的异常 */
  VALIDATION = "VALIDATION",
}

/**
 * 异常严重程度枚举
 * @description 定义异常的严重程度级别
 */
export enum ExceptionSeverity {
  /** 低 - 不影响核心功能，可以优雅降级 */
  LOW = "LOW",

  /** 中 - 影响部分功能，需要用户干预 */
  MEDIUM = "MEDIUM",

  /** 高 - 影响核心功能，需要立即处理 */
  HIGH = "HIGH",

  /** 严重 - 系统不可用，需要紧急修复 */
  CRITICAL = "CRITICAL",
}

/**
 * 异常分类信息
 * @description 包含异常的类型和严重程度信息
 */
export interface ExceptionClassification {
  /** 异常类型 */
  type: ExceptionType;

  /** 异常严重程度 */
  severity: ExceptionSeverity;

  /** 是否可恢复 */
  recoverable: boolean;

  /** 是否需要用户干预 */
  requiresUserAction: boolean;
}
