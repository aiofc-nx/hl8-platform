/**
 * @fileoverview 实体生命周期枚举
 * @description 定义实体的生命周期状态
 */

/**
 * 实体生命周期状态枚举
 * @description 定义实体从创建到删除的完整生命周期状态
 */
export enum EntityLifecycle {
  /** 已创建 - 实体刚被创建，尚未激活 */
  CREATED = "CREATED",

  /** 活跃 - 实体处于正常使用状态 */
  ACTIVE = "ACTIVE",

  /** 非活跃 - 实体被停用，但可以重新激活 */
  INACTIVE = "INACTIVE",

  /** 已删除 - 实体被永久删除，不可恢复 */
  DELETED = "DELETED",
}

/**
 * 实体生命周期状态转换规则
 * @description 定义实体状态之间的有效转换
 */
export const ENTITY_LIFECYCLE_TRANSITIONS: Record<
  EntityLifecycle,
  EntityLifecycle[]
> = {
  [EntityLifecycle.CREATED]: [EntityLifecycle.ACTIVE, EntityLifecycle.DELETED],
  [EntityLifecycle.ACTIVE]: [EntityLifecycle.INACTIVE, EntityLifecycle.DELETED],
  [EntityLifecycle.INACTIVE]: [EntityLifecycle.ACTIVE, EntityLifecycle.DELETED],
  [EntityLifecycle.DELETED]: [],
};

/**
 * 验证实体生命周期状态转换是否有效
 * @param from 当前状态
 * @param to 目标状态
 * @returns 是否为有效转换
 */
export function isValidLifecycleTransition(
  from: EntityLifecycle,
  to: EntityLifecycle,
): boolean {
  return ENTITY_LIFECYCLE_TRANSITIONS[from].includes(to);
}
