/**
 * @fileoverview 实体模块
 * @description 导出所有实体相关的类和枚举
 */

export {
  EntityLifecycle,
  ENTITY_LIFECYCLE_TRANSITIONS,
  isValidLifecycleTransition,
} from "./base/entity-lifecycle.enum.js";

export { Entity } from "./base/entity.base.js";
export { InternalEntity } from "./internal/internal-entity.base.js";
