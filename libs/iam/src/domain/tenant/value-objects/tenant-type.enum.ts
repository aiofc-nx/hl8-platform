/**
 * @fileoverview 租户类型枚举
 * @description 定义租户的类型分类
 */

/**
 * 租户类型枚举
 * @description 租户的类型，用于区分不同的租户类别
 */
export enum TenantType {
  /**
   * 免费试用
   * @description 免费试用租户，通常有功能和时间限制
   */
  TRIAL = "TRIAL",

  /**
   * 基础版
   * @description 基础版租户，提供基础功能
   */
  BASIC = "BASIC",

  /**
   * 专业版
   * @description 专业版租户，提供更多功能和资源
   */
  PROFESSIONAL = "PROFESSIONAL",

  /**
   * 企业版
   * @description 企业版租户，提供完整功能和定制化支持
   */
  ENTERPRISE = "ENTERPRISE",
}
