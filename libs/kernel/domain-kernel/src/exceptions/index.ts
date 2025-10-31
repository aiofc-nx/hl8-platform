/**
 * @fileoverview 异常模块
 * @description 导出所有异常相关的类和枚举
 */

export { ExceptionType } from "./base/exception-type.enum.js";
export {
  DomainException,
  ExceptionSeverity,
} from "./base/domain-exception.base.js";
export { BusinessException } from "./business-exception.js";
export { SystemException } from "./system-exception.js";
export { ExceptionHandler } from "./exception-handler.js";

// 操作异常
export * from "./operation-exceptions.js";

// 协调异常
export * from "./coordination-exceptions.js";

// 服务注册表异常
export * from "./service-registry-exceptions.js";

// 业务规则异常
export * from "./business-rule-exceptions.js";

// 事件处理异常
export * from "../events/event-processing-exceptions.js";
export * from "../events/event-registry-exceptions.js";
