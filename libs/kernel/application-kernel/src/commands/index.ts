/**
 * @fileoverview 命令模块导出
 * @description 导出所有命令相关的类和装饰器
 */

// Base classes
export { BaseCommand } from "./base/command.base.js";
export { BaseCommandHandler } from "./base/command-handler.base.js";
export { CommandResult } from "./base/command-result.js";

// Decorators
export {
  Command as CommandDecorator,
  isCommand,
  getCommandConfig,
} from "./decorators/command.decorator.js";
export type { CommandConfig } from "./decorators/command.decorator.js";
