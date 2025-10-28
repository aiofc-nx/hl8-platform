/**
 * @fileoverview 异常代码定义
 * @description 定义应用层核心模块的所有异常代码
 */

/**
 * 异常代码枚举
 * @description 应用层核心模块的异常代码分类
 */
export enum ExceptionCodes {
  // 通用异常代码 (1000-1999)
  GENERAL_ERROR = "APP_1000",
  VALIDATION_ERROR = "APP_1001",
  CONFIGURATION_ERROR = "APP_1002",
  DEPENDENCY_ERROR = "APP_1003",

  // 用例异常代码 (2000-2999)
  USE_CASE_EXECUTION_FAILED = "APP_2000",
  USE_CASE_VALIDATION_FAILED = "APP_2001",
  USE_CASE_NOT_FOUND = "APP_2002",
  USE_CASE_INVALID_INPUT = "APP_2003",
  USE_CASE_BUSINESS_RULE_VIOLATION = "APP_2004",

  // 命令异常代码 (3000-3999)
  COMMAND_EXECUTION_FAILED = "APP_3000",
  COMMAND_VALIDATION_FAILED = "APP_3001",
  COMMAND_NOT_FOUND = "APP_3002",
  COMMAND_HANDLER_NOT_FOUND = "APP_3003",
  COMMAND_IDEMPOTENCY_VIOLATION = "APP_3004",
  COMMAND_TIMEOUT = "APP_3005",

  // 查询异常代码 (4000-4999)
  QUERY_EXECUTION_FAILED = "APP_4000",
  QUERY_VALIDATION_FAILED = "APP_4001",
  QUERY_NOT_FOUND = "APP_4002",
  QUERY_HANDLER_NOT_FOUND = "APP_4003",
  QUERY_TIMEOUT = "APP_4004",
  QUERY_CACHE_ERROR = "APP_4005",

  // 事件异常代码 (5000-5999)
  EVENT_PROCESSING_FAILED = "APP_5000",
  EVENT_VALIDATION_FAILED = "APP_5001",
  EVENT_STORE_ERROR = "APP_5002",
  EVENT_BUS_ERROR = "APP_5003",
  EVENT_SERIALIZATION_ERROR = "APP_5004",
  EVENT_DESERIALIZATION_ERROR = "APP_5005",
  EVENT_VERSION_CONFLICT = "APP_5006",

  // 投影器异常代码 (6000-6999)
  PROJECTOR_EXECUTION_FAILED = "APP_6000",
  PROJECTOR_VALIDATION_FAILED = "APP_6001",
  PROJECTOR_NOT_FOUND = "APP_6002",
  PROJECTOR_READ_MODEL_ERROR = "APP_6003",
  PROJECTOR_TRANSACTION_ERROR = "APP_6004",

  // Saga异常代码 (7000-7999)
  SAGA_EXECUTION_FAILED = "APP_7000",
  SAGA_VALIDATION_FAILED = "APP_7001",
  SAGA_NOT_FOUND = "APP_7002",
  SAGA_STEP_FAILED = "APP_7003",
  SAGA_COMPENSATION_FAILED = "APP_7004",
  SAGA_STATE_ERROR = "APP_7005",
  SAGA_TIMEOUT = "APP_7006",

  // 总线异常代码 (8000-8999)
  BUS_EXECUTION_FAILED = "APP_8000",
  BUS_VALIDATION_FAILED = "APP_8001",
  BUS_HANDLER_NOT_FOUND = "APP_8002",
  BUS_MIDDLEWARE_ERROR = "APP_8003",
  BUS_TIMEOUT = "APP_8004",

  // 缓存异常代码 (9000-9999)
  CACHE_ERROR = "APP_9000",
  CACHE_INVALIDATION_ERROR = "APP_9001",
  CACHE_SERIALIZATION_ERROR = "APP_9002",
  CACHE_DESERIALIZATION_ERROR = "APP_9003",

  // 监控异常代码 (10000-10999)
  MONITORING_ERROR = "APP_10000",
  METRICS_COLLECTION_ERROR = "APP_10001",
  PERFORMANCE_MONITORING_ERROR = "APP_10002",
}

/**
 * 异常代码描述映射
 * @description 异常代码对应的中文描述
 */
export const ExceptionCodeDescriptions: Record<ExceptionCodes, string> = {
  // 通用异常代码
  [ExceptionCodes.GENERAL_ERROR]: "通用错误",
  [ExceptionCodes.VALIDATION_ERROR]: "验证错误",
  [ExceptionCodes.CONFIGURATION_ERROR]: "配置错误",
  [ExceptionCodes.DEPENDENCY_ERROR]: "依赖错误",

  // 用例异常代码
  [ExceptionCodes.USE_CASE_EXECUTION_FAILED]: "用例执行失败",
  [ExceptionCodes.USE_CASE_VALIDATION_FAILED]: "用例验证失败",
  [ExceptionCodes.USE_CASE_NOT_FOUND]: "用例未找到",
  [ExceptionCodes.USE_CASE_INVALID_INPUT]: "用例输入无效",
  [ExceptionCodes.USE_CASE_BUSINESS_RULE_VIOLATION]: "用例业务规则违反",

  // 命令异常代码
  [ExceptionCodes.COMMAND_EXECUTION_FAILED]: "命令执行失败",
  [ExceptionCodes.COMMAND_VALIDATION_FAILED]: "命令验证失败",
  [ExceptionCodes.COMMAND_NOT_FOUND]: "命令未找到",
  [ExceptionCodes.COMMAND_HANDLER_NOT_FOUND]: "命令处理器未找到",
  [ExceptionCodes.COMMAND_IDEMPOTENCY_VIOLATION]: "命令幂等性违反",
  [ExceptionCodes.COMMAND_TIMEOUT]: "命令执行超时",

  // 查询异常代码
  [ExceptionCodes.QUERY_EXECUTION_FAILED]: "查询执行失败",
  [ExceptionCodes.QUERY_VALIDATION_FAILED]: "查询验证失败",
  [ExceptionCodes.QUERY_NOT_FOUND]: "查询未找到",
  [ExceptionCodes.QUERY_HANDLER_NOT_FOUND]: "查询处理器未找到",
  [ExceptionCodes.QUERY_TIMEOUT]: "查询执行超时",
  [ExceptionCodes.QUERY_CACHE_ERROR]: "查询缓存错误",

  // 事件异常代码
  [ExceptionCodes.EVENT_PROCESSING_FAILED]: "事件处理失败",
  [ExceptionCodes.EVENT_VALIDATION_FAILED]: "事件验证失败",
  [ExceptionCodes.EVENT_STORE_ERROR]: "事件存储错误",
  [ExceptionCodes.EVENT_BUS_ERROR]: "事件总线错误",
  [ExceptionCodes.EVENT_SERIALIZATION_ERROR]: "事件序列化错误",
  [ExceptionCodes.EVENT_DESERIALIZATION_ERROR]: "事件反序列化错误",
  [ExceptionCodes.EVENT_VERSION_CONFLICT]: "事件版本冲突",

  // 投影器异常代码
  [ExceptionCodes.PROJECTOR_EXECUTION_FAILED]: "投影器执行失败",
  [ExceptionCodes.PROJECTOR_VALIDATION_FAILED]: "投影器验证失败",
  [ExceptionCodes.PROJECTOR_NOT_FOUND]: "投影器未找到",
  [ExceptionCodes.PROJECTOR_READ_MODEL_ERROR]: "投影器读模型错误",
  [ExceptionCodes.PROJECTOR_TRANSACTION_ERROR]: "投影器事务错误",

  // Saga异常代码
  [ExceptionCodes.SAGA_EXECUTION_FAILED]: "Saga执行失败",
  [ExceptionCodes.SAGA_VALIDATION_FAILED]: "Saga验证失败",
  [ExceptionCodes.SAGA_NOT_FOUND]: "Saga未找到",
  [ExceptionCodes.SAGA_STEP_FAILED]: "Saga步骤失败",
  [ExceptionCodes.SAGA_COMPENSATION_FAILED]: "Saga补偿失败",
  [ExceptionCodes.SAGA_STATE_ERROR]: "Saga状态错误",
  [ExceptionCodes.SAGA_TIMEOUT]: "Saga执行超时",

  // 总线异常代码
  [ExceptionCodes.BUS_EXECUTION_FAILED]: "总线执行失败",
  [ExceptionCodes.BUS_VALIDATION_FAILED]: "总线验证失败",
  [ExceptionCodes.BUS_HANDLER_NOT_FOUND]: "总线处理器未找到",
  [ExceptionCodes.BUS_MIDDLEWARE_ERROR]: "总线中间件错误",
  [ExceptionCodes.BUS_TIMEOUT]: "总线执行超时",

  // 缓存异常代码
  [ExceptionCodes.CACHE_ERROR]: "缓存错误",
  [ExceptionCodes.CACHE_INVALIDATION_ERROR]: "缓存失效错误",
  [ExceptionCodes.CACHE_SERIALIZATION_ERROR]: "缓存序列化错误",
  [ExceptionCodes.CACHE_DESERIALIZATION_ERROR]: "缓存反序列化错误",

  // 监控异常代码
  [ExceptionCodes.MONITORING_ERROR]: "监控错误",
  [ExceptionCodes.METRICS_COLLECTION_ERROR]: "指标收集错误",
  [ExceptionCodes.PERFORMANCE_MONITORING_ERROR]: "性能监控错误",
};

/**
 * 获取异常代码描述
 * @param code 异常代码
 * @returns 异常代码描述
 */
export function getExceptionCodeDescription(code: ExceptionCodes): string {
  return ExceptionCodeDescriptions[code] || "未知错误";
}
