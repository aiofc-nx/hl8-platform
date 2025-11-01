/**
 * @fileoverview 投影器模块导出
 * @description 导出所有投影器相关的类和接口
 */

// Base classes
export { Projector, ProjectorStatus } from "./base/projector.base.js";
export type {
  ProjectorConfig,
  ProjectorStatistics,
} from "./base/projector.base.js";
export { ProjectorHandler } from "./base/projector-handler.base.js";
export type {
  ProjectorHandlerConfig,
  ProjectorHandlerStatistics,
} from "./base/projector-handler.base.js";

// Decorators
export {
  Projector as ProjectorDecorator,
  ProjectorHandler as ProjectorHandlerDecorator,
  getProjectorMetadata,
  getProjectorHandlerMetadata,
  Retry as ProjectorRetry,
  Performance as ProjectorPerformance,
  getProjectorRetry,
  getProjectorPerformance,
} from "./decorators/projector.decorator.js";
export type {
  ProjectorMetadata,
  ProjectorHandlerMetadata,
  ProjectorOptions,
  ProjectorHandlerOptions,
} from "./decorators/projector.decorator.js";

// Registry
export * from "./registry/projector-registry.js";

// Pipeline
export * from "./pipeline/event-processing-pipeline.js";

// Read Model
export * from "./read-model/read-model-manager.js";
