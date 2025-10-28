/**
 * @fileoverview 异常模块导出
 * @description 导出所有异常相关的类和枚举
 */

// Base exceptions
export { ApplicationException } from "./base/application-exception.base.js";
export {
  ExceptionCodes,
  ExceptionCodeDescriptions,
  getExceptionCodeDescription,
} from "./base/exception-codes.js";

// Use case exceptions
export { UseCaseException } from "./use-case/use-case-exception.js";
export { UseCaseValidationException } from "./use-case/use-case-validation-exception.js";

// Command exceptions
export { CommandExecutionException } from "./command/command-execution-exception.js";
export { CommandValidationException } from "./command/command-validation-exception.js";

// Query exceptions
export { QueryExecutionException } from "./query/query-execution-exception.js";
export { QueryValidationException } from "./query/query-validation-exception.js";

// Event exceptions
export { EventProcessingException } from "./event/event-processing-exception.js";
export { EventStoreException } from "./event/event-store-exception.js";

// Saga exceptions
export { SagaExecutionException } from "./saga/saga-execution-exception.js";
export { SagaCompensationException } from "./saga/saga-compensation-exception.js";
