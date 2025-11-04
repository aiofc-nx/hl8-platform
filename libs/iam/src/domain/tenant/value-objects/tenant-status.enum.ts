/**
 * @fileoverview 租户状态枚举
 * @description 定义租户的生命周期状态
 */

/**
 * 租户状态枚举
 * @description 租户的状态，用于管理租户的生命周期
 */
export enum TenantStatus {
  /**
   * 试用中
   * @description 租户处于试用期，功能受限
   */
  TRIAL = "TRIAL",

  /**
   * 已激活
   * @description 租户已激活，可以正常使用
   */
  ACTIVE = "ACTIVE",

  /**
   * 已暂停
   * @description 租户被暂停，无法使用服务
   */
  SUSPENDED = "SUSPENDED",

  /**
   * 已过期
   * @description 租户试用期或订阅已过期
   */
  EXPIRED = "EXPIRED",

  /**
   * 已禁用
   * @description 租户被禁用，无法使用服务
   */
  DISABLED = "DISABLED",

  /**
   * 已删除
   * @description 租户已删除（软删除）
   */
  DELETED = "DELETED",
}
