/**
 * @fileoverview 业务规则接口
 * @description 定义业务规则的基本契约和结构
 */

import type { BusinessRuleValidationResult } from "./business-rule-validation-result.interface.js";
import type { BusinessRuleViolation } from "./business-rule-violation.interface.js";

/**
 * 业务规则接口
 * @description 定义业务规则的基本契约，所有业务规则都必须实现此接口
 */
export interface BusinessRule<T = unknown> {
  /**
   * 规则名称
   * @description 用于标识和调试的唯一名称
   */
  readonly name: string;

  /**
   * 规则描述
   * @description 规则的详细描述，用于文档和错误消息
   */
  readonly description: string;

  /**
   * 规则优先级
   * @description 数值越小优先级越高，用于确定规则执行顺序
   */
  readonly priority: number;

  /**
   * 规则是否启用
   * @description 用于动态启用/禁用规则
   */
  readonly enabled: boolean;

  /**
   * 启用规则
   * @description 动态启用规则
   */
  enable(): void;

  /**
   * 禁用规则
   * @description 动态禁用规则
   */
  disable(): void;

  /**
   * 规则类型
   * @description 业务规则的类型分类
   */
  readonly type: BusinessRuleType;

  /**
   * 规则严重程度
   * @description 规则违反时的严重程度
   */
  readonly severity: BusinessRuleSeverity;

  /**
   * 执行业务规则验证
   * @description 对给定实体执行业务规则验证
   * @param entity 要验证的实体
   * @param context 业务规则上下文，包含额外的验证信息
   * @returns 业务规则验证结果
   */
  validate(
    entity: T,
    context?: BusinessRuleContext,
  ): BusinessRuleValidationResult;

  /**
   * 创建业务规则违反
   * @description 创建标准化的业务规则违反对象
   * @param message 违反消息
   * @param code 违反代码
   * @param details 违反详情
   * @returns 业务规则违反对象
   */
  createViolation(
    message: string,
    code?: string,
    details?: Record<string, unknown>,
  ): BusinessRuleViolation;

  /**
   * 检查规则是否适用于给定实体
   * @description 用于优化验证流程，跳过不适用的规则
   * @param entity 要检查的实体
   * @param context 业务规则上下文
   * @returns 是否适用此规则
   */
  isApplicable(entity: T, context?: BusinessRuleContext): boolean;

  /**
   * 获取规则依赖
   * @description 获取此规则依赖的其他规则
   * @returns 依赖的规则名称列表
   */
  getDependencies(): string[];

  /**
   * 检查规则是否与给定规则冲突
   * @description 检查是否存在规则冲突
   * @param other 其他规则
   * @returns 是否冲突
   */
  conflictsWith(other: BusinessRule<T>): boolean;
}

/**
 * 业务规则上下文接口
 * @description 提供业务规则验证过程中需要的上下文信息
 */
export interface BusinessRuleContext {
  /**
   * 实体类型
   * @description 被验证实体的类型
   */
  entityType?: string;

  /**
   * 实体ID
   * @description 被验证实体的ID
   */
  entityId?: string;

  /**
   * 操作类型
   * @description 触发验证的操作类型
   */
  operationType?: BusinessRuleOperationType | string;

  /**
   * 验证选项
   * @description 验证过程中的配置选项
   */
  options?: BusinessRuleOptions;

  /**
   * 自定义数据
   * @description 验证过程中需要的自定义数据
   */
  customData?: Record<string, unknown>;

  /**
   * 验证路径
   * @description 在嵌套对象中的验证路径
   */
  path?: string[];

  /**
   * 验证级别
   * @description 验证的严格程度级别
   */
  level?: BusinessRuleLevel;

  /**
   * 属性名称
   * @description 被验证的属性名称（用于定位字段）
   */
  fieldName?: string;

  /**
   * 父实体
   * @description 包含被验证实体的父实体
   */
  parentEntity?: unknown;

  /**
   * 相关实体
   * @description 与当前验证相关的其他实体
   */
  relatedEntities?: Record<string, unknown>;
}

/**
 * 业务规则选项接口
 * @description 定义业务规则验证过程中的配置选项
 */
export interface BusinessRuleOptions {
  /**
   * 是否在第一个违反时停止
   * @description 当为true时，遇到第一个规则违反就停止验证
   */
  stopOnFirstViolation?: boolean;

  /**
   * 是否包含警告
   * @description 当为true时，包含警告级别的验证结果
   */
  includeWarnings?: boolean;

  /**
   * 是否包含详细信息
   * @description 当为true时，包含详细的验证信息
   */
  includeDetails?: boolean;

  /**
   * 最大违反数量
   * @description 验证过程中允许的最大违反数量
   */
  maxViolations?: number;

  /**
   * 是否验证嵌套实体
   * @description 当为true时，验证嵌套的实体和集合
   */
  validateNested?: boolean;

  /**
   * 是否忽略未知属性
   * @description 当为true时，忽略实体中的未知属性
   */
  ignoreUnknownProperties?: boolean;

  /**
   * 是否启用规则缓存
   * @description 当为true时，缓存规则验证结果
   */
  enableCaching?: boolean;

  /**
   * 缓存过期时间（毫秒）
   * @description 规则验证结果的缓存过期时间
   */
  cacheExpiration?: number;
}

/**
 * 业务规则类型枚举
 * @description 定义业务规则的类型分类
 */
export enum BusinessRuleType {
  /**
   * 数据完整性规则
   * @description 确保数据完整性和一致性的规则
   */
  DATA_INTEGRITY = "DATA_INTEGRITY",

  /**
   * 业务逻辑规则
   * @description 执行业务逻辑和业务约束的规则
   */
  BUSINESS_LOGIC = "BUSINESS_LOGIC",

  /**
   * 状态转换规则
   * @description 控制实体状态转换的规则
   */
  STATE_TRANSITION = "STATE_TRANSITION",

  /**
   * 权限规则
   * @description 控制访问权限和操作权限的规则
   */
  AUTHORIZATION = "AUTHORIZATION",

  /**
   * 审计规则
   * @description 确保审计跟踪和合规性的规则
   */
  AUDIT = "AUDIT",

  /**
   * 性能规则
   * @description 确保性能和资源使用的规则
   */
  PERFORMANCE = "PERFORMANCE",

  /**
   * 安全规则
   * @description 确保数据安全和隐私的规则
   */
  SECURITY = "SECURITY",

  /**
   * 自定义规则
   * @description 用户自定义的业务规则
   */
  CUSTOM = "CUSTOM",
}

/**
 * 业务规则严重程度枚举
 * @description 定义业务规则违反的严重程度级别
 */
export enum BusinessRuleSeverity {
  /**
   * 信息级别
   * @description 提供信息的规则违反，不影响业务操作
   */
  INFO = "INFO",

  /**
   * 警告级别
   * @description 警告级别的规则违反，建议修正但不阻止操作
   */
  WARNING = "WARNING",

  /**
   * 错误级别
   * @description 错误级别的规则违反，阻止业务操作
   */
  ERROR = "ERROR",

  /**
   * 严重级别
   * @description 严重级别的规则违反，可能导致系统不稳定
   */
  CRITICAL = "CRITICAL",
}

/**
 * 业务规则操作类型枚举
 * @description 定义触发业务规则验证的操作类型
 */
export enum BusinessRuleOperationType {
  /**
   * 创建操作
   * @description 创建新实体时的验证
   */
  CREATE = "CREATE",

  /**
   * 更新操作
   * @description 更新现有实体时的验证
   */
  UPDATE = "UPDATE",

  /**
   * 删除操作
   * @description 删除实体时的验证
   */
  DELETE = "DELETE",

  /**
   * 查询操作
   * @description 查询实体时的验证
   */
  QUERY = "QUERY",

  /**
   * 状态变更操作
   * @description 变更实体状态时的验证
   */
  STATE_CHANGE = "STATE_CHANGE",

  /**
   * 业务操作
   * @description 执行业务操作时的验证
   */
  BUSINESS_OPERATION = "BUSINESS_OPERATION",
}

/**
 * 业务规则级别枚举
 * @description 定义业务规则验证的严格程度级别
 */
export enum BusinessRuleLevel {
  /**
   * 基础验证
   * @description 只进行基本的业务规则验证
   */
  BASIC = "BASIC",

  /**
   * 标准验证
   * @description 进行标准的业务规则验证
   */
  STANDARD = "STANDARD",

  /**
   * 严格验证
   * @description 进行严格的业务规则验证，包括所有约束
   */
  STRICT = "STRICT",

  /**
   * 完整验证
   * @description 进行完整的验证，包括所有可能的检查
   */
  COMPLETE = "COMPLETE",
}

/**
 * 业务规则工厂接口
 * @description 用于创建业务规则的工厂接口
 */
export interface BusinessRuleFactory<T = unknown> {
  /**
   * 创建业务规则
   * @param config 规则配置
   * @returns 业务规则实例
   */
  createRule(config: BusinessRuleConfig): BusinessRule<T>;

  /**
   * 创建多个业务规则
   * @param configs 规则配置数组
   * @returns 业务规则实例数组
   */
  createRules(configs: BusinessRuleConfig[]): BusinessRule<T>[];

  /**
   * 注册规则类型
   * @param type 规则类型
   * @param creator 规则创建函数
   */
  registerRuleType(type: string, creator: RuleCreator<T>): void;

  /**
   * 获取支持的规则类型
   * @returns 支持的规则类型列表
   */
  getSupportedRuleTypes(): string[];

  /**
   * 检查是否支持规则类型
   * @param type 规则类型
   * @returns 是否支持该类型
   */
  supportsRuleType(type: string): boolean;

  /**
   * 获取规则创建函数
   * @param type 规则类型
   * @returns 规则创建函数，如果不存在则返回undefined
   */
  getRuleCreator(type: string): RuleCreator<T> | undefined;
}

/**
 * 业务规则配置接口
 * @description 定义创建业务规则所需的配置
 */
export interface BusinessRuleConfig {
  /**
   * 规则类型
   * @description 规则的类型标识符
   */
  type: string;

  /**
   * 规则名称
   * @description 规则的唯一名称
   */
  name: string;

  /**
   * 规则描述
   * @description 规则的描述信息
   */
  description?: string;

  /**
   * 规则优先级
   * @description 规则的执行优先级
   */
  priority?: number;

  /**
   * 规则是否启用
   * @description 规则是否默认启用
   */
  enabled?: boolean;

  /**
   * 规则类型分类
   * @description 规则的类型分类
   */
  ruleType?: BusinessRuleType;

  /**
   * 规则严重程度
   * @description 规则违反时的严重程度
   */
  severity?: BusinessRuleSeverity;

  /**
   * 规则参数
   * @description 规则执行所需的参数
   */
  parameters?: Record<string, unknown>;

  /**
   * 规则选项
   * @description 规则的特定选项
   */
  options?: Record<string, unknown>;

  /**
   * 规则依赖
   * @description 规则依赖的其他规则
   */
  dependencies?: string[];
}

/**
 * 规则创建函数类型
 * @description 用于创建业务规则的函数类型
 */
export type RuleCreator<T = unknown> = (
  config: BusinessRuleConfig,
) => BusinessRule<T>;

/**
 * 业务规则简化接口（用于适配测试用轻量规则）
 */
export interface BusinessRuleLike<T = unknown> {
  readonly name: string;
  readonly description: string;
  readonly priority: number;
  readonly enabled: boolean;
  validate(
    entity: T,
    context?: BusinessRuleContext,
  ): BusinessRuleValidationResult;
}
