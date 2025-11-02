/**
 * 依赖注入令牌
 *
 * @description Database 模块使用的依赖注入令牌常量
 *
 * ## 业务规则
 *
 * - 所有令牌使用字符串常量，避免循环依赖
 * - 令牌命名使用大写蛇形命名法
 * - 令牌必须在模块内唯一
 *
 * @example
 * ```typescript
 * @Inject(DI_TOKENS.MODULE_OPTIONS)
 * private readonly options: DatabaseModuleOptions
 * ```
 *
 * @since 1.0.0
 */

/**
 * 依赖注入令牌常量
 */
export const DI_TOKENS = {
  /**
   * 数据库模块配置选项令牌
   *
   * @description 用于注入模块配置
   */
  MODULE_OPTIONS: "DATABASE_MODULE_OPTIONS",

  /**
   * 连接管理器令牌
   *
   * @description 用于注入连接管理器实例
   */
  CONNECTION_MANAGER: "DATABASE_CONNECTION_MANAGER",

  /**
   * 事务服务令牌
   *
   * @description 用于注入事务服务实例
   */
  TRANSACTION_SERVICE: "DATABASE_TRANSACTION_SERVICE",

  /**
   * 健康检查服务令牌
   *
   * @description 用于注入健康检查服务实例
   */
  HEALTH_CHECK_SERVICE: "DATABASE_HEALTH_CHECK_SERVICE",

  /**
   * 性能指标服务令牌
   *
   * @description 用于注入性能指标服务实例
   */
  METRICS_SERVICE: "DATABASE_METRICS_SERVICE",
} as const;

/**
 * 依赖注入令牌类型
 */
export type DiToken = (typeof DI_TOKENS)[keyof typeof DI_TOKENS];
