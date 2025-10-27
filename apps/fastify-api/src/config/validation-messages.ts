/**
 * 配置验证错误消息
 *
 * @description 定义配置验证失败时的错误消息和提示信息
 */

/**
 * 配置验证错误消息映射
 */
export const CONFIG_VALIDATION_MESSAGES = {
  // 应用配置错误
  APP_NAME_REQUIRED: "应用程序名称是必需的",
  APP_NAME_EMPTY: "应用程序名称不能为空",
  APP_VERSION_REQUIRED: "应用程序版本是必需的",
  APP_VERSION_INVALID: "应用程序版本格式无效，应为语义版本格式 (如: 1.0.0)",
  APP_ENVIRONMENT_REQUIRED: "运行环境是必需的",
  APP_ENVIRONMENT_INVALID:
    "运行环境必须是 development、staging 或 production 之一",
  APP_DEBUG_INVALID: "调试模式必须是布尔值",

  // 数据库配置错误
  DATABASE_HOST_REQUIRED: "数据库主机是必需的",
  DATABASE_HOST_EMPTY: "数据库主机不能为空",
  DATABASE_PORT_REQUIRED: "数据库端口是必需的",
  DATABASE_PORT_INVALID: "数据库端口必须是 1-65535 之间的数字",
  DATABASE_USERNAME_REQUIRED: "数据库用户名是必需的",
  DATABASE_USERNAME_EMPTY: "数据库用户名不能为空",
  DATABASE_PASSWORD_REQUIRED: "数据库密码是必需的",
  DATABASE_PASSWORD_EMPTY: "数据库密码不能为空",
  DATABASE_NAME_REQUIRED: "数据库名称是必需的",
  DATABASE_NAME_EMPTY: "数据库名称不能为空",
  DATABASE_SSL_INVALID: "SSL 设置必须是布尔值",

  // 服务器配置错误
  SERVER_PORT_REQUIRED: "服务器端口是必需的",
  SERVER_PORT_INVALID: "服务器端口必须是 1-65535 之间的数字",
  SERVER_HOST_REQUIRED: "服务器主机是必需的",
  SERVER_HOST_EMPTY: "服务器主机不能为空",
  SERVER_CORS_REQUIRED: "CORS 配置是必需的",

  // CORS 配置错误
  CORS_ENABLED_REQUIRED: "CORS 启用状态是必需的",
  CORS_ENABLED_INVALID: "CORS 启用状态必须是布尔值",
  CORS_ORIGINS_REQUIRED: "CORS 允许的源是必需的",
  CORS_ORIGINS_EMPTY: "CORS 允许的源不能为空数组",
  CORS_ORIGINS_INVALID: "CORS 允许的源必须是有效的 URL 数组",
  CORS_METHODS_REQUIRED: "CORS 允许的方法是必需的",
  CORS_METHODS_EMPTY: "CORS 允许的方法不能为空数组",
  CORS_METHODS_INVALID: "CORS 允许的方法必须是有效的 HTTP 方法数组",
  CORS_CREDENTIALS_INVALID: "CORS 凭据设置必须是布尔值",

  // 日志配置错误
  LOGGING_LEVEL_REQUIRED: "日志级别是必需的",
  LOGGING_LEVEL_INVALID: "日志级别必须是 error、warn、info 或 debug 之一",
  LOGGING_FORMAT_REQUIRED: "日志格式是必需的",
  LOGGING_FORMAT_INVALID: "日志格式必须是 json 或 text 之一",
  LOGGING_OUTPUT_REQUIRED: "日志输出目标是必需的",
  LOGGING_OUTPUT_EMPTY: "日志输出目标不能为空数组",
  LOGGING_OUTPUT_INVALID: "日志输出目标必须是有效的目标数组",

  // 通用错误
  CONFIG_LOAD_FAILED: "配置加载失败",
  CONFIG_VALIDATION_FAILED: "配置验证失败",
  CONFIG_FILE_NOT_FOUND: "配置文件未找到",
  CONFIG_PARSE_ERROR: "配置文件解析错误",
  CONFIG_TYPE_ERROR: "配置类型错误",
  CONFIG_MISSING_SECTION: "配置节缺失",
  CONFIG_INVALID_VALUE: "配置值无效",
} as const;

/**
 * 配置验证错误类型
 */
export type ConfigValidationError = keyof typeof CONFIG_VALIDATION_MESSAGES;

/**
 * 获取配置验证错误消息
 * @param errorType 错误类型
 * @returns 错误消息
 */
export function getConfigValidationMessage(
  errorType: ConfigValidationError,
): string {
  return CONFIG_VALIDATION_MESSAGES[errorType];
}

/**
 * 格式化配置验证错误
 * @param field 字段名
 * @param errorType 错误类型
 * @param value 当前值
 * @returns 格式化的错误信息
 */
export function formatConfigValidationError(
  field: string,
  errorType: ConfigValidationError,
  value: unknown,
): string {
  const message = getConfigValidationMessage(errorType);
  return `${field}: ${message} (当前值: ${JSON.stringify(value)})`;
}

/**
 * 配置验证错误详情接口
 */
export interface ConfigValidationErrorDetail {
  field: string;
  errorType: ConfigValidationError;
  message: string;
  value: unknown;
  path?: string;
}

/**
 * 创建配置验证错误详情
 * @param field 字段名
 * @param errorType 错误类型
 * @param value 当前值
 * @param path 字段路径
 * @returns 错误详情
 */
export function createConfigValidationError(
  field: string,
  errorType: ConfigValidationError,
  value: unknown,
  path?: string,
): ConfigValidationErrorDetail {
  return {
    field,
    errorType,
    message: formatConfigValidationError(field, errorType, value),
    value,
    path,
  };
}

/**
 * 配置验证结果接口
 */
export interface ConfigValidationResult {
  isValid: boolean;
  errors: ConfigValidationErrorDetail[];
  warnings?: string[];
}

/**
 * 创建配置验证结果
 * @param isValid 是否有效
 * @param errors 错误列表
 * @param warnings 警告列表
 * @returns 验证结果
 */
export function createConfigValidationResult(
  isValid: boolean,
  errors: ConfigValidationErrorDetail[] = [],
  warnings: string[] = [],
): ConfigValidationResult {
  return {
    isValid,
    errors,
    warnings,
  };
}
