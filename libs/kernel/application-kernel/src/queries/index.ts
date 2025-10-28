/**
 * @fileoverview 查询模块导出
 * @description 导出所有查询相关的类和装饰器
 */

// Base classes
export { BaseQuery } from "./base/query.base.js";
export { BaseQueryHandler } from "./base/query-handler.base.js";
export { QueryResult } from "./base/query-result.js";

// Decorators
export {
  Query as QueryDecorator,
  isQuery,
  getQueryConfig,
} from "./decorators/query.decorator.js";
export type { QueryConfig } from "./decorators/query.decorator.js";
