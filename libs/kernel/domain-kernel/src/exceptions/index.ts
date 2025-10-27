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
