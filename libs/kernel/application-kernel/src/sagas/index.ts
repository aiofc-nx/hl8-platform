/**
 * @fileoverview Saga模块导出
 * @description 导出所有Saga相关的类和接口
 *
 * @beta 部分功能仍在完善中，特别是恢复和重试机制
 */

// Base classes
export {
  Saga,
  SagaStatus,
  SagaStepStatus,
  SagaStep,
} from "./base/saga.base.js";
export type {
  SagaConfig,
  SagaStatistics,
  SagaContext,
} from "./base/saga.base.js";
export { SagaStateManager } from "./base/saga-state.js";
export type { ISagaStateStore } from "./base/saga-state.js";
export type {
  SagaStateSnapshot,
  SagaStateQuery,
  SagaStateQueryResult,
} from "./base/saga-state.js";
export { BaseSagaStep, SimpleSagaStep } from "./base/saga-step.js";

// Decorators
export * from "./decorators/saga.decorator.js";

// Engine
export * from "./engine/saga-execution-engine.js";

// Compensation
export * from "./compensation/saga-compensation-manager.js";

// Recovery
export * from "./recovery/saga-error-handler.js";

// Persistence
export * from "./persistence/saga-state-store.impl.js";
