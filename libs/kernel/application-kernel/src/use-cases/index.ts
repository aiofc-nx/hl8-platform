/**
 * @fileoverview 用例模块导出
 * @description 导出所有用例相关的类和装饰器
 */

// Base classes
export { UseCase } from "./base/use-case.base.js";
export { UseCaseInput } from "./base/use-case-input.base.js";
export { UseCaseOutput } from "./base/use-case-output.base.js";

// Decorators
export {
  UseCase as UseCaseDecorator,
  isUseCase,
  getUseCaseConfig,
} from "./decorators/use-case.decorator.js";
export type { UseCaseConfig } from "./decorators/use-case.decorator.js";
