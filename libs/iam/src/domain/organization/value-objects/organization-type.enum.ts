/**
 * @fileoverview 组织类型枚举
 * @description 定义组织的类型分类
 */

/**
 * 组织类型枚举
 * @description 组织的类型，用于区分不同的组织类别
 */
export enum OrganizationType {
  /**
   * 专业委员会
   * @description 专业委员会类型的组织
   */
  COMMITTEE = "COMMITTEE",

  /**
   * 项目团队
   * @description 项目团队类型的组织
   */
  PROJECT_TEAM = "PROJECT_TEAM",

  /**
   * 职能部门
   * @description 职能部门类型的组织
   */
  FUNCTIONAL_DEPARTMENT = "FUNCTIONAL_DEPARTMENT",

  /**
   * 其他
   * @description 其他类型的组织
   */
  OTHER = "OTHER",
}
